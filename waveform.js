/**
 * Waveform renderer.
 *
 * On demand, fetches the audio file, decodes it with the Web Audio API,
 * downsamples channel data into peak values, and renders an SVG bar chart
 * behind the scrub bar. Clicking the waveform seeks.
 *
 * Public API:
 *   Waveform.load(track, onProgress) → Promise<void>
 *   Waveform.clear()
 *   Waveform.setProgress(currentTime)  // 0..1
 */

const Waveform = (() => {
  const PEAK_COUNT = 200;
  const SVG_NS = "http://www.w3.org/2000/svg";

  let svg = null;
  let container = null;
  let cursor = null;
  let placeholder = null;
  let audioCtx = null;
  const cache = new Map(); // src → peaks
  let currentSrc = null;
  let duration = 0;

  function ensure() {
    if (svg) return;
    container = document.getElementById("waveform");
    svg = document.getElementById("waveform-svg");
    cursor = document.getElementById("waveform-cursor");
    placeholder = document.getElementById("waveform-placeholder");
  }

  function getAudioContext() {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      audioCtx = new AudioCtx();
    }
    return audioCtx;
  }

  function downsample(channelData, peakCount) {
    const samplesPerPeak = Math.floor(channelData.length / peakCount);
    const peaks = new Float32Array(peakCount * 2); // min, max interleaved
    for (let i = 0; i < peakCount; i++) {
      let min = 1.0;
      let max = -1.0;
      const start = i * samplesPerPeak;
      const end = Math.min(start + samplesPerPeak, channelData.length);
      for (let j = start; j < end; j++) {
        const v = channelData[j];
        if (v < min) min = v;
        if (v > max) max = v;
      }
      peaks[i * 2] = min;
      peaks[i * 2 + 1] = max;
    }
    return peaks;
  }

  function renderPeaks(peaks) {
    if (!svg) return;
    // Clear existing
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.setAttribute("width", w);
    svg.setAttribute("height", h);

    const peakCount = peaks.length / 2;
    const barGap = 1;
    const barWidth = Math.max(1, w / peakCount - barGap);

    const halfH = h / 2;

    // Two groups: played (cyan) and unplayed (dim), separated by progress
    // For simplicity we render all bars in one color and overlay progress via
    // a translucent rect on top.
    const gAll = document.createElementNS(SVG_NS, "g");
    gAll.setAttribute("fill", "#1a4a6e");
    for (let i = 0; i < peakCount; i++) {
      const min = peaks[i * 2];
      const max = peaks[i * 2 + 1];
      const yTop = halfH - max * (halfH - 1);
      const yBottom = halfH - min * (halfH - 1);
      const barHeight = Math.max(1, yBottom - yTop);
      const x = i * (barWidth + barGap);
      const rect = document.createElementNS(SVG_NS, "rect");
      rect.setAttribute("x", x);
      rect.setAttribute("y", yTop);
      rect.setAttribute("width", barWidth);
      rect.setAttribute("height", barHeight);
      rect.setAttribute("rx", 0.5);
      gAll.appendChild(rect);
    }
    svg.appendChild(gAll);

    // Progress overlay
    const progress = document.createElementNS(SVG_NS, "rect");
    progress.setAttribute("id", "waveform-progress");
    progress.setAttribute("x", 0);
    progress.setAttribute("y", 0);
    progress.setAttribute("width", 0);
    progress.setAttribute("height", h);
    progress.setAttribute("fill", "rgba(0, 229, 255, 0.85)");
    progress.setAttribute("style", "mix-blend-mode: screen;");
    // Use clip-path via mask: define a clipPath rect the width of progress
    const defs = document.createElementNS(SVG_NS, "defs");
    const clip = document.createElementNS(SVG_NS, "clipPath");
    clip.setAttribute("id", "waveform-clip");
    const clipRect = document.createElementNS(SVG_NS, "rect");
    clipRect.setAttribute("x", 0);
    clipRect.setAttribute("y", 0);
    clipRect.setAttribute("width", 0);
    clipRect.setAttribute("height", h);
    clipRect.setAttribute("id", "waveform-clip-rect");
    clip.appendChild(clipRect);
    defs.appendChild(clip);
    svg.appendChild(defs);

    const gPlayed = document.createElementNS(SVG_NS, "g");
    gPlayed.setAttribute("clip-path", "url(#waveform-clip)");
    gPlayed.setAttribute("fill", "#00e5ff");
    for (let i = 0; i < peakCount; i++) {
      const min = peaks[i * 2];
      const max = peaks[i * 2 + 1];
      const yTop = halfH - max * (halfH - 1);
      const yBottom = halfH - min * (halfH - 1);
      const barHeight = Math.max(1, yBottom - yTop);
      const x = i * (barWidth + barGap);
      const rect = document.createElementNS(SVG_NS, "rect");
      rect.setAttribute("x", x);
      rect.setAttribute("y", yTop);
      rect.setAttribute("width", barWidth);
      rect.setAttribute("height", barHeight);
      rect.setAttribute("rx", 0.5);
      gPlayed.appendChild(rect);
    }
    svg.appendChild(gPlayed);
    svg.appendChild(progress); // unused visual element; mask handles the rest

    if (placeholder) placeholder.hidden = true;
    container.dataset.ready = "true";
  }

  async function load(track, onProgress) {
    ensure();
    if (!svg) return;

    if (cache.has(track.src)) {
      currentSrc = track.src;
      duration = track.duration || 0;
      renderPeaks(cache.get(track.src));
      setProgress(0);
      return;
    }

    // Reset state
    container.dataset.ready = "false";
    if (placeholder) {
      placeholder.hidden = false;
      placeholder.textContent = "decoding waveform…";
    }
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    if (cursor) cursor.style.left = "0";

    try {
      if (onProgress) onProgress("fetch");
      const res = await fetch(track.src);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      if (onProgress) onProgress("decode");
      const ctx = getAudioContext();
      if (!ctx) throw new Error("Web Audio API unavailable");
      const audioBuffer = await ctx.decodeAudioData(buf);
      // Use first channel (mix if multi-channel)
      let channelData;
      if (audioBuffer.numberOfChannels === 1) {
        channelData = audioBuffer.getChannelData(0);
      } else {
        // Mix to mono for consistent display
        const len = audioBuffer.length;
        channelData = new Float32Array(len);
        const ch0 = audioBuffer.getChannelData(0);
        const ch1 = audioBuffer.getChannelData(1);
        for (let i = 0; i < len; i++) {
          channelData[i] = (ch0[i] + ch1[i]) * 0.5;
        }
      }
      const peaks = downsample(channelData, PEAK_COUNT);
      cache.set(track.src, peaks);
      currentSrc = track.src;
      duration = audioBuffer.duration;
      if (onProgress) onProgress("render");
      renderPeaks(peaks);
      setProgress(0);
    } catch (err) {
      console.warn("[Waveform] failed to decode", track.src, err);
      if (placeholder) {
        placeholder.textContent = "waveform unavailable (file://? serve via http)";
      }
    }
  }

  function setProgress(ratio) {
    ensure();
    if (!svg || !container) return;
    const w = container.clientWidth || 0;
    const x = Math.max(0, Math.min(1, ratio)) * w;
    if (cursor) cursor.style.left = `${x}px`;
    const clipRect = svg.querySelector("#waveform-clip-rect");
    if (clipRect) clipRect.setAttribute("width", x);
  }

  function clear() {
    ensure();
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    if (placeholder) {
      placeholder.hidden = false;
      placeholder.textContent = "load track to display waveform";
    }
    container.dataset.ready = "false";
    currentSrc = null;
    duration = 0;
    if (cursor) cursor.style.left = "0";
  }

  function getDuration() {
    return duration;
  }

  // Redraw on resize
  window.addEventListener("resize", () => {
    if (currentSrc && cache.has(currentSrc)) {
      renderPeaks(cache.get(currentSrc));
    }
  });

  return { load, clear, setProgress, getDuration };
})();
