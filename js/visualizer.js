/**
 * Frequency-bar visualizer.
 *
 * Connects an AnalyserNode to the shared <audio> element managed by player.js
 * and renders 32 vertical bars on a canvas. Pauses rendering when audio is
 * paused; respects prefers-reduced-motion by showing a static indicator.
 *
 * Public API:
 *   Visualizer.attach(audioElement)   — wire up to the audio element
 *   Visualizer.start()                — begin animation (call on play)
 *   Visualizer.stop()                 — halt animation (call on pause/end)
 */

const Visualizer = (() => {
  const BAR_COUNT = 32;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let canvas = null;
  let ctx = null;
  let analyser = null;
  let audioSource = null;
  let audioCtx = null;
  let rafId = null;
  let dataArray = null;
  let attached = false;
  let lastDrawn = 0;
  let idleAnimationId = null;

  function ensureCanvas() {
    if (canvas) return;
    canvas = document.getElementById("visualizer");
    if (!canvas) return;
    ctx = canvas.getContext("2d");
  }

  function attach(audioElement) {
    if (attached) return;
    ensureCanvas();
    if (!canvas) return;
    attached = true;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      drawIdle("N/A");
      return;
    }
    audioCtx = new AudioCtx();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64; // 32 frequency bins
    analyser.smoothingTimeConstant = 0.78;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
  }

  /**
   * Creates the MediaElementAudioSourceNode and routes it through the
   * analyser to the destination. MUST be called after the audio element
   * has had src set and load() called. Calling before src/load can leave
   * the source disconnected on Chromium.
   */
  function wireSource() {
    if (!attached || !audioCtx || !analyser || audioSource) return;
    const audioElement = document.getElementById("audio-element");
    if (!audioElement) return;
    try {
      audioSource = audioCtx.createMediaElementSource(audioElement);
      audioSource.connect(analyser);
      analyser.connect(audioCtx.destination);
    } catch (e) {
      console.warn("[Visualizer] wireSource failed:", e);
    }
  }

  /**
   * Resumes the AudioContext if suspended. Returns a Promise that resolves
   * once the context is running. MUST be called from within a user gesture
   * handler — otherwise the resume() call will be silently ignored.
   */
  function resumeContext() {
    if (audioCtx && audioCtx.state === "suspended") {
      return audioCtx.resume();
    }
    return Promise.resolve();
  }

  function getState() {
    return audioCtx ? audioCtx.state : "none";
  }

  function draw() {
    rafId = null;
    if (!ctx || !analyser) return;
    analyser.getByteFrequencyData(dataArray);

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const gap = 2;
    const barWidth = (w - gap * (BAR_COUNT - 1)) / BAR_COUNT;

    for (let i = 0; i < BAR_COUNT; i++) {
      // Map 32 bins to 32 bars (visually compress low-end for nicer look)
      const value = dataArray[i] / 255;
      const barHeight = Math.max(2, value * h);

      const x = i * (barWidth + gap);
      const y = h - barHeight;

      // Gradient: dim cyan at bottom, brighter at top
      const grad = ctx.createLinearGradient(0, h, 0, y);
      grad.addColorStop(0, "rgba(26, 74, 110, 0.9)"); // dim
      grad.addColorStop(0.6, "rgba(0, 229, 255, 0.95)"); // accent
      grad.addColorStop(1, "rgba(230, 244, 255, 0.95)"); // highlight

      ctx.fillStyle = grad;
      ctx.fillRect(x, y, barWidth, barHeight);
    }

    lastDrawn = performance.now();
    rafId = requestAnimationFrame(draw);
  }

  function drawIdle(label) {
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    // Faint baseline
    ctx.fillStyle = "rgba(26, 74, 110, 0.5)";
    ctx.fillRect(0, h - 1, w, 1);
    if (label) {
      ctx.fillStyle = "rgba(122, 166, 194, 0.6)";
      ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, w / 2, h / 2);
    }
  }

  function startIdle() {
    if (reducedMotion) {
      drawIdle("LIVE");
      return;
    }
    let frame = 0;
    const tick = () => {
      frame++;
      if (!ctx) return;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      // Subtle horizontal sweep
      const t = (frame % 120) / 120;
      ctx.fillStyle = `rgba(0, 229, 255, ${0.05 + Math.sin(t * Math.PI) * 0.1})`;
      ctx.fillRect(t * w, 0, w / 12, h);
      idleAnimationId = requestAnimationFrame(tick);
    };
    cancelIdle();
    idleAnimationId = requestAnimationFrame(tick);
  }

  function cancelIdle() {
    if (idleAnimationId !== null) {
      cancelAnimationFrame(idleAnimationId);
      idleAnimationId = null;
    }
  }

  function start() {
    cancelIdle();
    if (!ctx) ensureCanvas();
    if (!ctx) return;

    if (reducedMotion) {
      drawIdle("LIVE");
      return;
    }
    // Always try to resume; cheap if already running.
    resumeContext();
    if (rafId !== null) return;
    rafId = requestAnimationFrame(draw);
  }

  function stop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    drawIdle("PAUSED");
  }

  // Initialize idle state once DOM is ready
  document.addEventListener("DOMContentLoaded", () => {
    ensureCanvas();
    drawIdle("READY");
  });

  return { attach, wireSource, start, stop, resumeContext, getState };
})();
