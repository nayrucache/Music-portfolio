/**
 * Theme toggle — light by default, with optional dark HUD mode.
 *
 * Initial value resolution: localStorage > prefers-color-scheme > "light".
 * Preference is saved on toggle and reapplied on every page load.
 */

const Theme = (() => {
  const STORAGE_KEY = "portfolio001_theme";
  const root = document.documentElement;
  let btn = null;
  let iconSun = null;
  let iconMoon = null;

  function resolveInitial() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "light" || saved === "dark") return saved;
    } catch (_) {
      // localStorage may be unavailable; fall through
    }
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  }

  function apply(value) {
    root.dataset.theme = value;
    if (btn) {
      const isDark = value === "dark";
      btn.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
      btn.setAttribute("title", isDark ? "Switch to light mode" : "Switch to dark mode");
      if (iconSun) iconSun.hidden = isDark;
      if (iconMoon) iconMoon.hidden = !isDark;
    }
  }

  function persist(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch (_) {
      // ignore
    }
  }

  function toggle() {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    apply(next);
    persist(next);
  }

  function init() {
    btn = document.getElementById("btn-theme");
    iconSun = document.getElementById("icon-sun");
    iconMoon = document.getElementById("icon-moon");
    apply(resolveInitial());
    if (btn) btn.addEventListener("click", toggle);
  }

  // Apply as early as possible to avoid a flash of the wrong theme.
  apply(resolveInitial());

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  return { apply, toggle, init };
})();