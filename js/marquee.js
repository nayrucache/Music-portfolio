/**
 * Now-playing marquee.
 *
 * Reads the current track + time from the player bar (and the shared
 * <audio> element) and renders a continuously scrolling banner.
 *
 * The player owns its own state in a private IIFE, so we observe the
 * DOM nodes it already updates (#player-title, #player-artist) and
 * listen for `timeupdate` / `loadedmetadata` on the audio element.
 * No coupling — player.js is untouched.
 */

(function () {
  "use strict";

  // ---------- DOM refs ----------
  const $ = (id) => document.getElementById(id);

  const bar = $("now-playing-bar");
  const trackEl = $("npb-track");
  const titleEl = $("npb-title");
  const artistEl = $("npb-artist");
  const timeEl = $("npb-time");
  const playerTitle = $("player-title");
  const playerArtist = $("player-artist");
  const playerTimeCurrent = $("time-current");
  const playerTimeTotal = $("time-total");

  // Bail out gracefully if the banner isn't on this page
  if (!bar || !trackEl || !titleEl || !artistEl || !timeEl) return;

  // ---------- Utilities ----------
  function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return "00:00";
    const total = Math.floor(seconds);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  // Strip the leading em-dashes the player uses as an empty-state marker
  function isEmpty(text) {
    const t = (text || "").trim().toLowerCase();
    return t === "" || t === "—" || t === "--" || t === "no track loaded" || t.indexOf("no track loaded") !== -1;
  }

  // ---------- Rendering ----------
  let lastTitle = null;
  let lastArtist = null;
  let hasDuplicated = false;

  function buildTrackHTML(title, artist, time) {
    const t = escapeHtml(title);
    const a = escapeHtml(artist);
    const tm = escapeHtml(time);
    return (
      '<span class="npb-title">' + t + '</span>' +
      '<span class="npb-sep" aria-hidden="true">◆</span>' +
      '<span class="npb-artist">' + a + '</span>' +
      '<span class="npb-sep" aria-hidden="true">◆</span>' +
      '<span class="npb-time">' + tm + '</span>'
    );
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));
  }

  // Re-render the scrolling content. Called when title/artist changes.
  function refreshContent() {
    const title = playerTitle ? playerTitle.textContent : "";
    const artist = playerArtist ? playerArtist.textContent : "";

    const empty = isEmpty(title);
    trackEl.setAttribute("data-empty", empty ? "true" : "false");

    // Always rebuild HTML — simplest and avoids stale separators.
    // This wipes any prior clones, so reset the duplication guard.
    const time = currentTimeText();
    trackEl.innerHTML = buildTrackHTML(title, artist, time);
    hasDuplicated = false;

    // Duplicate content for seamless looping. We do this only when there's
    // a track loaded — the empty state stays static.
    if (!empty) {
      duplicateTrack();
      updateDuration();
    } else {
      // Reset animation state so it doesn't resume mid-scroll
      trackEl.style.animationDuration = "";
    }

    lastTitle = title;
    lastArtist = artist;
  }

  // Clone the rendered children once so the track is [content][content]
  // and the keyframe can translate -50% for a seamless loop.
  function duplicateTrack() {
    if (hasDuplicated) return;
    const children = Array.from(trackEl.children);
    children.forEach((child) => {
      const clone = child.cloneNode(true);
      clone.setAttribute("data-clone", "true");
      clone.setAttribute("aria-hidden", "true");
      trackEl.appendChild(clone);
    });
    hasDuplicated = true;
  }

  // Set animation duration based on physical width so scroll speed is
  // consistent regardless of track-name length.
  function updateDuration() {
    // Measure the first half of the track (the original content) — that's
    // the distance we want to translate per loop.
    const halfWidth = trackEl.scrollWidth / 2;
    if (!halfWidth) return;
    // 60 px/sec = comfortable reading pace. Clamp to a sensible range.
    const seconds = Math.max(15, Math.min(90, halfWidth / 60));
    trackEl.style.animationDuration = seconds + "s";
  }

  // Pull the latest time from the audio element, falling back to the
  // displayed text in the player bar.
  function currentTimeText() {
    const audio = document.getElementById("audio-element");
    if (audio && isFinite(audio.currentTime) && isFinite(audio.duration)) {
      return formatTime(audio.currentTime) + " / " + formatTime(audio.duration);
    }
    const cur = playerTimeCurrent ? playerTimeCurrent.textContent : "00:00";
    const tot = playerTimeTotal ? playerTimeTotal.textContent : "00:00";
    return cur + " / " + tot;
  }

  // Update only the time span — cheaper than rebuilding the whole track.
  function refreshTime() {
    const time = currentTimeText();
    // Update both the original and the clone (if present)
    const nodes = trackEl.querySelectorAll(".npb-time");
    nodes.forEach((n) => { n.textContent = time; });
  }

  // ---------- Hooks ----------
  function wireObservers() {
    if (playerTitle) {
      new MutationObserver(refreshContent).observe(playerTitle, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    }
    if (playerArtist) {
      new MutationObserver(refreshContent).observe(playerArtist, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    }
    if (playerTimeCurrent) {
      new MutationObserver(refreshTime).observe(playerTimeCurrent, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    }

    // Also listen on the audio element directly — more reliable than
    // catching every visible DOM mutation.
    const audio = document.getElementById("audio-element");
    if (audio) {
      audio.addEventListener("timeupdate", refreshTime);
      audio.addEventListener("loadedmetadata", () => {
        refreshContent();
      });
    }
  }

  // ---------- Init ----------
  function init() {
    refreshContent();
    wireObservers();
    // Re-tune the duration after fonts have loaded — Inter/JetBrains
    // width shifts can change the track width noticeably.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(updateDuration);
    }
    window.addEventListener("resize", updateDuration);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
