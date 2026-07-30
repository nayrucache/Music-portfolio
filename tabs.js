/**
 * Tabs — switches between [data-panel] sections when a nav link with
 * [data-tab] is clicked. Does not affect playback.
 *
 * Renders PROJECTS as cards in the projects panel. Tracks are rendered
 * by player.js.
 */

(function () {
  "use strict";

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));
  }

  function padIndex(n) {
    return String(n).padStart(2, "0");
  }

 function switchTo(name) {
    const panels = document.querySelectorAll("[data-panel]");
    panels.forEach((panel) => {
      const match = panel.dataset.panel === name;
      panel.hidden = !match;
    });
    const links = document.querySelectorAll(".nav-link[data-tab]");
    links.forEach((link) => {
      if (link.dataset.tab === name) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    // Hide the hero/header when not on the tracks tab
    const hero = document.querySelector(".hero");
    if (hero) {
      hero.hidden = name !== "tracks";
    }
  }

  function renderProjects() {
    const grid = document.getElementById("project-grid");
    const empty = document.getElementById("project-empty");
    const count = document.getElementById("project-count");
    if (!grid) return;

    grid.innerHTML = "";

    if (!PROJECTS || PROJECTS.length === 0) {
      if (empty) empty.hidden = false;
      if (count) count.textContent = "00 entries";
      return;
    }

    if (empty) empty.hidden = true;
    if (count) count.textContent = `${padIndex(PROJECTS.length)} entries`;

    PROJECTS.forEach((project) => {
      const li = document.createElement("li");
      li.className = "project-card";

      const header = document.createElement("div");
      header.className = "project-card-header";
      const title = document.createElement("h3");
      title.className = "project-title";
      title.textContent = project.title || "Untitled";
      header.appendChild(title);
      if (project.year) {
        const year = document.createElement("span");
        year.className = "project-year";
        year.textContent = String(project.year);
        header.appendChild(year);
      }
      li.appendChild(header);

      if (project.kind) {
        const kind = document.createElement("span");
        kind.className = "project-kind";
        kind.textContent = project.kind;
        li.appendChild(kind);
      }

      if (project.image) {
        const img = document.createElement("img");
        img.className = "project-image";
        img.src = project.image;
        img.alt = project.title || "";
        img.loading = "lazy";
        img.onerror = () => { img.remove(); };
        li.appendChild(img);
      }

      if (project.summary) {
        const summary = document.createElement("p");
        summary.className = "project-summary";
        summary.textContent = project.summary;
        li.appendChild(summary);
      }

      if (project.description) {
        const desc = document.createElement("p");
        desc.className = "project-description";
        desc.textContent = project.description;
        li.appendChild(desc);
      }

      if (project.url) {
        const link = document.createElement("a");
        link.className = "project-link";
        link.href = project.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "View project";
        li.appendChild(link);
      }

      grid.appendChild(li);
    });
  }

  function init() {
    // Wire nav clicks
    document.querySelectorAll(".nav-link[data-tab]").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        switchTo(link.dataset.tab);
      });
    });

    renderProjects();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();