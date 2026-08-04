/**
 * Audio player.
 *
 * Owns a single <audio> element, renders the track grid, wires up
 * transport controls, keyboard shortcuts, and the waveform scrub.
 * Coordinates with Visualizer for live frequency bars.
 */

(function () {
  "use strict";

  // ---------- State ----------
  const state = {
    currentIndex: -1,   // index into TRACKS, or -1
    isPlaying: false,
    volume: 0.8,
    isMuted: false,
    lastVolume: 0.8,
  };

  // ---------- DOM refs ----------
  const $ = (id) => document.getElementById(id);

  let audio = null;
  let dom = {};

  function cacheDom() {
    dom = {
      trackGrid: $("track-grid"),
      trackEmpty: $("track-empty"),
      trackCount: $("track-count"),
      playerBar: $("player-bar"),
      playerArt: $("player-art"),
      playerTitle: $("player-title"),
      playerArtist: $("player-artist"),
      timeCurrent: $("time-current"),
      timeTotal: $("time-total"),
      btnPlay: $("btn-play"),
      btnPrev: $("btn-prev"),
      btnNext: $("btn-next"),
      btnMute: $("btn-mute"),
      iconPlay: $("icon-play"),
      iconPause: $("icon-pause"),
      iconVol: $("icon-vol"),
      iconMute: $("icon-mute"),
      volume: $("volume"),
      waveform: $("waveform"),
    };
  }

  // ---------- Utilities ----------
  function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return "00:00";
    const total = Math.floor(seconds);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function padIndex(n) {
    return String(n).padStart(2, "0");
  }

  // ---------- Track grid ----------
  function renderTrackGrid() {
    if (!dom.trackGrid) return;
    dom.trackGrid.innerHTML = "";
    if (!TRACKS || TRACKS.length === 0) {
      if (dom.trackEmpty) dom.trackEmpty.hidden = false;
      if (dom.trackCount) dom.trackCount.textContent = "00 entries";
      return;
    }
    if (dom.trackEmpty) dom.trackEmpty.hidden = true;
    if (dom.trackCount) {
      dom.trackCount.textContent = `${padIndex(TRACKS.length)} entries`;
    }
    TRACKS.forEach((track, idx) => {
      const li = document.createElement("li");
      li.className = "track-card";
      li.dataset.index = String(idx);
      li.setAttribute("role", "button");
      li.setAttribute("tabindex", "0");
      li.setAttribute(
        "aria-label",
        `Play ${track.title} by ${track.artist}`
      );
      li.innerHTML = `
        <span class="track-index">${padIndex(idx + 1)}</span>
        <div class="track-info">
          <p class="track-title">${escapeHtml(track.title)}</p>
          <p class="track-artist">${escapeHtml(track.artist)}</p>
        </div>
        <span class="track-duration" data-duration>${formatTime(track.duration)}</span>
        <span class="track-play" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="14" height="14">
            <path d="M7 5v14l12-7L7 5z" fill="currentColor"/>
          </svg>
        </span>
      `;
      li.addEventListener("click", () => playTrack(idx));
      li.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          playTrack(idx);
        }
      });
      dom.trackGrid.appendChild(li);
    });
  }

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));
  }

  function highlightActiveCard() {
    if (!dom.trackGrid) return;
    dom.trackGrid.querySelectorAll(".track-card").forEach((el) => {
      const idx = parseInt(el.dataset.index, 10);
      el.dataset.active = idx === state.currentIndex ? "true" : "false";
    });
  }

  // ---------- Playback ----------
  function ensureAudio() {
    if (audio) return;
    audio = $("audio-element");
    audio.preload = "metadata";
    audio.volume = state.volume;
    audio.muted = false;
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("error", onError);
    audio.addEventListener("volumechange", () => {
      // Keep state in sync if anything (system volume, etc.) changes the element
      if (Math.abs(audio.volume - state.volume) > 0.001) {
        state.volume = audio.volume;
        state.isMuted = audio.volume === 0;
        updateMuteUI();
      }
    });
    // Create the AudioContext + analyser up front, but DEFER creating the
    // MediaElementAudioSource until the element has src loaded. Creating
    // the source against a sourceless element can leave the graph
    // disconnected on Chromium, which is what was causing intermittent
    // silent playback.
    Visualizer.attach(audio);
  }

  function loadAudio(track) {
    ensureAudio();
    audio.src = track.src;
    audio.load();
    // Now that src is set and load() called, wire the source into the
    // graph. Done synchronously so the connection is in place before
    // the user gesture triggers play().
    Visualizer.wireSource();
    Waveform.clear();
    dom.timeCurrent.textContent = "00:00";
    dom.timeTotal.textContent = "00:00";
  }

  async function playTrack(index) {
    if (index < 0 || index >= TRACKS.length) return;
    state.currentIndex = index;
    const track = TRACKS[index];
    loadAudio(track);
    updateMeta(track);
    highlightActiveCard();

    // Browsers require resume() to be called synchronously within a real
    // user-gesture handler chain. The `await` below is fine because we are
    // still inside the click handler's microtask continuation.
    try {
      await Visualizer.resumeContext();
    } catch (_) { /* will retry */ }

    // Also resume the element itself in case it was paused by autoplay rules.
    audio.muted = false;
    audio.volume = Math.max(state.volume, 0.8);

    try {
      await audio.play();
    } catch (err) {
      console.warn("[Player] play() rejected:", err);
      // The audio element may not be ready yet for a large file over file://.
      // Wait for canplay, then retry once.
      const retry = new Promise((resolve) => {
        const onReady = () => {
          audio.removeEventListener("canplay", onReady);
          audio.play().then(resolve).catch((e) => {
            console.warn("[Player] deferred play() failed:", e);
            resolve();
          });
        };
        audio.addEventListener("canplay", onReady, { once: true });
        setTimeout(() => {
          audio.removeEventListener("canplay", onReady);
          resolve();
        }, 3000);
      });
      await retry;
      setPlayingUI(!audio.paused);
    }
  }

  function updateMeta(track) {
    dom.playerTitle.textContent = track.title;
    dom.playerArtist.textContent = track.artist.toLowerCase();
  }

  function setPlayingUI(isPlaying) {
    state.isPlaying = isPlaying;
    dom.iconPlay.hidden = isPlaying;
    dom.iconPause.hidden = !isPlaying;
    dom.btnPlay.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
    if (isPlaying) {
      Visualizer.start();
    } else {
      Visualizer.stop();
    }
  }

  function togglePlay() {
    if (state.currentIndex === -1) {
      // Nothing loaded — load the first track and play
      if (TRACKS.length > 0) playTrack(0);
      return;
    }
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  }

  function next() {
    if (TRACKS.length === 0) return;
    const nextIdx = state.currentIndex < TRACKS.length - 1 ? state.currentIndex + 1 : 0;
    playTrack(nextIdx);
  }

  function prev() {
    if (!audio || audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    if (TRACKS.length === 0) return;
    const prevIdx = state.currentIndex > 0 ? state.currentIndex - 1 : TRACKS.length - 1;
    playTrack(prevIdx);
  }

  function seekFromEvent(e) {
    if (!audio || !dom.waveform) return;
    const rect = dom.waveform.getBoundingClientRect();
    const x = (e.clientX ?? (e.touches && e.touches[0].clientX)) - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    if (!isFinite(audio.duration) || audio.duration <= 0) return;
    audio.currentTime = ratio * audio.duration;
  }

  // ---------- Event handlers ----------
  function onLoadedMetadata() {
    dom.timeTotal.textContent = formatTime(audio.duration);
    dom.waveform.setAttribute("aria-valuemax", String(Math.floor(audio.duration)));
    // Backfill the duration on the card too if it was 0
    const card = dom.trackGrid.querySelector(
      `.track-card[data-index="${state.currentIndex}"] [data-duration]`
    );
    if (card) card.textContent = formatTime(audio.duration);
    // Trigger waveform render
    const track = TRACKS[state.currentIndex];
    if (track) Waveform.load(track);
  }

  function onTimeUpdate() {
    if (!audio) return;
    dom.timeCurrent.textContent = formatTime(audio.currentTime);
    dom.waveform.setAttribute("aria-valuenow", String(Math.floor(audio.currentTime)));
    if (isFinite(audio.duration) && audio.duration > 0) {
      Waveform.setProgress(audio.currentTime / audio.duration);
    }
  }

  function onEnded() {
    next();
  }

  function onPlay() {
    setPlayingUI(true);
  }

  function onPause() {
    setPlayingUI(false);
  }

  function onError() {
    console.error("[Player] audio error", audio.error);
    setPlayingUI(false);
  }

  // ---------- Mute / volume ----------
  function setVolume(v) {
    state.volume = Math.max(0, Math.min(1, v));
    if (audio) audio.volume = state.volume;
    if (dom.volume) {
      dom.volume.value = String(state.volume);
      dom.volume.style.setProperty("--vol", String(state.volume));
    }
    if (state.volume === 0) {
      state.isMuted = true;
    } else {
      state.lastVolume = state.volume;
      state.isMuted = false;
    }
    updateMuteUI();
  }

  function toggleMute() {
    if (state.isMuted) {
      // Unmute
      state.isMuted = false;
      const restore = state.lastVolume > 0 ? state.lastVolume : 0.8;
      setVolume(restore);
    } else {
      state.lastVolume = state.volume;
      state.isMuted = true;
      if (audio) audio.volume = 0;
      if (dom.volume) {
        dom.volume.value = "0";
        dom.volume.style.setProperty("--vol", "0");
      }
      updateMuteUI();
    }
  }

  function updateMuteUI() {
    const muted = state.isMuted || state.volume === 0;
    dom.iconVol.hidden = muted;
    dom.iconMute.hidden = !muted;
    dom.btnMute.setAttribute("aria-label", muted ? "Unmute" : "Mute");
  }

  // ---------- Wiring ----------
  function wireEvents() {
    dom.btnPlay.addEventListener("click", togglePlay);
    dom.btnPrev.addEventListener("click", prev);
    dom.btnNext.addEventListener("click", next);
    dom.btnMute.addEventListener("click", toggleMute);

    dom.volume.addEventListener("input", (e) => {
      setVolume(parseFloat(e.target.value));
    });

    // Waveform scrub
    let dragging = false;
    const onDown = (e) => {
      dragging = true;
      seekFromEvent(e);
      e.preventDefault();
    };
    const onMove = (e) => {
      if (!dragging) return;
      seekFromEvent(e);
    };
    const onUp = () => {
      dragging = false;
    };
    dom.waveform.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    dom.waveform.addEventListener("touchstart", onDown, { passive: false });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onUp);

    // Keyboard shortcuts (skip if user is typing in an input)
    document.addEventListener("keydown", (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || e.target.isContentEditable) return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowRight") {
        if (audio) audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5);
      } else if (e.key === "ArrowLeft") {
        if (audio) audio.currentTime = Math.max(0, audio.currentTime - 5);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setVolume(state.volume + 0.05);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setVolume(state.volume - 0.05);
      }
    });
  }

  // ---------- Init ----------
  function init() {
    cacheDom();
    renderTrackGrid();
    wireEvents();
    setVolume(state.volume);
    updateMuteUI();
    if (TRACKS.length === 0) {
      // Nothing to do — visualizer remains in idle state.
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
