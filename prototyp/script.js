/* Prototyp Nachhilfe Online – nur das Nötigste an JavaScript:
   Handy-Menü, Dropdowns per Klick/Tastatur, Team-Filter, Demo-Formulare. */
(function () {
  "use strict";

  // Handy-Menü
  var toggle = document.querySelector(".menu-toggle");
  var mobile = document.getElementById("mobile-menu");
  if (toggle && mobile) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      mobile.hidden = open;
    });
    mobile.addEventListener("click", function (e) {
      if (e.target.closest("a")) { mobile.hidden = true; toggle.setAttribute("aria-expanded", "false"); }
    });
  }

  // Desktop-Dropdowns: Klick öffnet/schließt (Touch-Laptops), Hover macht CSS
  var items = document.querySelectorAll(".nav-item");
  function closeAll(except) {
    items.forEach(function (it) {
      if (it !== except) { it.classList.remove("open"); var b = it.querySelector(".nav-btn"); if (b) b.setAttribute("aria-expanded", "false"); }
    });
  }
  items.forEach(function (it) {
    var btn = it.querySelector(".nav-btn");
    btn.addEventListener("click", function () {
      var open = it.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
      closeAll(it);
    });
  });
  document.addEventListener("click", function (e) { if (!e.target.closest(".nav-item")) closeAll(null); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeAll(null);
      if (mobile && !mobile.hidden) { mobile.hidden = true; toggle.setAttribute("aria-expanded", "false"); toggle.focus(); }
    }
  });

  // Team-Filter nach Fach
  var chips = document.querySelectorAll("[data-filter]");
  var people = document.querySelectorAll("[data-subjects]");
  var count = document.getElementById("team-count");
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      var f = chip.getAttribute("data-filter");
      chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c === chip)); });
      var n = 0;
      people.forEach(function (p) {
        var show = f === "alle" || p.getAttribute("data-subjects").indexOf(f) !== -1;
        p.hidden = !show;
        if (show) n++;
      });
      if (count) count.textContent = n + (n === 1 ? " Lehrkraft" : " Lehrkräfte");
    });
  });

  // Demo-Formulare: nichts wird verschickt
  document.querySelectorAll("form[data-demo]").forEach(function (form) {
    var err = form.querySelector(".form-error");
    var counter = form.querySelector("[data-count]");
    var area = form.querySelector("textarea[maxlength]");
    if (counter && area) {
      area.addEventListener("input", function () { counter.textContent = area.value.length; });
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (form.querySelector(".hp input") && form.querySelector(".hp input").value) return; // Honeypot
      if (!form.checkValidity()) { if (err) err.hidden = false; form.reportValidity(); return; }
      if (err) err.hidden = true;
      var target = document.getElementById(form.getAttribute("data-demo"));
      var nameField = form.querySelector("[name=name]");
      var first = nameField ? nameField.value.trim().split(/\s+/)[0] : "";
      if (target) {
        target.querySelectorAll("[data-name]").forEach(function (el) { el.textContent = first || "dir"; });
        form.hidden = true;
        target.hidden = false;
        target.setAttribute("tabindex", "-1");
        target.focus();
        target.scrollIntoView({ block: "start" });
      }
    });
  });
})();
