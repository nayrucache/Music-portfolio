/**
 * Contact form — client-side validation + mailto: submit.
 *
 * No backend. On submit, builds a `mailto:` URL with the form contents
 * and navigates to it, opening the visitor's default mail client. All
 * delivery happens there.
 */
(function () {
  "use strict";

  // Destination address. Keep in sync with the <a href="mailto:..."> in
  // the contact card on index.html and about.html.
  const TO = "watshamsam@gmail.com";

  function setStatus(msg, kind) {
    const el = document.getElementById("form-status");
    if (!el) return;
    el.textContent = msg;
    el.dataset.kind = kind || ""; // "" | "ok" | "err"
  }

  function validate(form) {
    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.name || !data.email || !data.message) {
      setStatus("All fields required.", "err");
      return null;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      setStatus("Email format invalid.", "err");
      return null;
    }
    return data;
  }

  function buildMailto(data) {
    const subject = `Portfolio message from ${data.name}`;
    const body = `From: ${data.name} <${data.email}>\n\n${data.message}`;
    return `mailto:${TO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function init() {
    const form = document.getElementById("contact-form");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = validate(form);
      if (!data) return;
      window.location.href = buildMailto(data);
      setStatus("Opening mail client…", "ok");
    });

    // Live-clear the status as the user types so stale errors don't linger.
    form.addEventListener("input", () => setStatus("", ""));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
