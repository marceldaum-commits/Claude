/* Mathe mit Marcel – Theme-JavaScript. Alles funktioniert auch ohne JS;
   hier nur Komfort: Menüs, Team-Filter, Angebotsfinder, Tafelbild,
   Handy-Leiste, Lehrkraft-Filter und Feldprüfung im Formular. */
(function () {
  "use strict";

  // ---------- Handy-Menü
  var toggle = document.querySelector(".menu-toggle");
  var mobile = document.getElementById("mobile-menu");
  function closeMobile() { if (mobile && toggle) { mobile.hidden = true; toggle.setAttribute("aria-expanded", "false"); } }
  if (toggle && mobile) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      mobile.hidden = open;
    });
    mobile.addEventListener("click", function (e) { if (e.target.closest("a")) closeMobile(); });
  }

  // ---------- Desktop-Dropdowns (Hover per CSS, Klick/Tastatur per JS)
  var items = document.querySelectorAll(".nav-item");
  function closeAll(except) {
    items.forEach(function (it) {
      if (it !== except) { it.classList.remove("open"); var b = it.querySelector("button.nav-btn"); if (b) b.setAttribute("aria-expanded", "false"); }
    });
  }
  items.forEach(function (it) {
    var btn = it.querySelector("button.nav-btn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var open = it.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
      closeAll(it);
    });
  });
  document.addEventListener("click", function (e) { if (!e.target.closest(".nav-item")) closeAll(null); });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    closeAll(null);
    if (mobile && !mobile.hidden) { closeMobile(); toggle.focus(); }
  });

  // ---------- Team-Filter
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

  // ---------- Angebotsfinder
  var finder = document.getElementById("finder-form");
  if (finder) {
    var counts = {}, links = {};
    try { counts = JSON.parse(finder.getAttribute("data-counts")) || {}; } catch (e) { /* leer */ }
    try { links = JSON.parse(finder.getAttribute("data-links")) || {}; } catch (e) { /* leer */ }
    var box = document.getElementById("finder-result");
    var R = function (k) { return box.querySelector('[data-r="' + k + '"]'); };
    var cta = box.querySelector("[data-finder-cta]");
    var base = cta.getAttribute("href");
    var WER = { grundschule: "Grundschule", mittel: "Klasse 5–10", oberstufe: "Klasse 11–13", studium: "Studium / Sonstiges" };
    var ZIEL = { luecken: "Lücken in den Grundlagen", arbeit: "Vorbereitung auf die nächste Klassenarbeit", pruefung: "Abschlussprüfung", fragen: "einzelne Fragen", ueben: "selbst üben" };
    var val = function (n) { var c = finder.querySelector('input[name="' + n + '"]:checked'); return c ? c.value : ""; };

    var update = function () {
      var wer = val("wer"), ziel = val("ziel"), fach = finder.fach.value;
      var key = fach.toLowerCase(), mathe = key === "mathematik", rec;
      if (ziel === "pruefung" && wer === "grundschule") ziel = "arbeit";
      if (ziel === "luecken") rec = ["Lücken schließen im 1:1", "Wir finden heraus, wo die Lücke beginnt, und bauen die Grundlagen Schritt für Schritt wieder auf – bis der aktuelle Stoff wieder anschließt.", "luecken", "So läuft's"];
      else if (ziel === "arbeit") rec = ["Einzelnachhilfe zum aktuellen Stoff", "Wir setzen beim aktuellen Thema an, üben typische Aufgaben und machen einen realistischen Plan bis zur Arbeit.", "arbeit", "So läuft's"];
      else if (ziel === "pruefung") rec = [wer === "oberstufe" ? "Abiturvorbereitung mit Plan" : (wer === "mittel" ? "Vorbereitung auf Mittlere Reife oder Mittelschulabschluss" : "Prüfungsvorbereitung mit Plan"), "Theorie auffrischen, echte Prüfungsaufgaben trainieren, zwei Probeläufe. Wichtig: Die Anfrage muss spätestens drei Monate vor der Prüfung bei uns sein.", "pruefung", "Zum Prüfungsplan"];
      else if (ziel === "fragen") rec = mathe
        ? ["Fragenpass für Mathe-Fragen", "Mathe-Fragen per WhatsApp oder E-Mail klären – ab 37 € pro Monat. Kostenlos testen mit dem Erkundungspass (zwei Fragen).", "fragen", "Zum Fragenpass"]
        : ["Einzelstunden nach Bedarf", "Den Fragenpass gibt es für Mathe. Für " + fach + " nutzt ihr einfach Stunden aus dem Paket, wenn eine Frage ansteht – die Stunden verfallen nicht.", "preise", "Zu den Preisen"];
      else if (ziel === "ueben") rec = mathe
        ? ["Kostenlos üben", "560 Arbeitsblätter, der Textaufgaben-Kompass und Mathe-Bücher mit Leseproben – ohne Anmeldung. Wenn es irgendwo hakt: Probestunde.", "ueben", "Zu den Materialien"]
        : ["Erst mal kennenlernen", "Unsere kostenlosen Materialien sind vor allem für Mathe. Für " + fach + " ist die kostenlose Probestunde der beste Start.", "ueben", "Kostenlos lernen"];
      else rec = ["Erst kostenlos kennenlernen", "Kreuze an, wer lernt und worum es geht – die Empfehlung passt sich sofort an.", "alle", "Alle Angebote"];

      R("title").textContent = rec[0];
      R("text").textContent = rec[1];
      var link = R("link"); if (links[rec[2]]) link.href = links[rec[2]]; link.textContent = rec[3];

      var note = [], n = counts[key];
      if (n) note.push(n + (n === 1 ? " Lehrkraft unterrichtet " : " Lehrkräfte unterrichten ") + fach + ".");
      else if (ziel || wer) note.push("Für " + (key === "anderes fach" ? "dein Fach" : fach) + " empfehlen wir dir persönlich eine passende Lehrkraft.");
      if (wer === "studium" && mathe) note.push("Mathe auf Uni-Niveau unterrichtet Marcel Daum.");
      if (ziel === "luecken" && mathe) note.push("Tipp: Vorher mit dem kostenlosen Lernstand-Check einordnen.");
      R("note").textContent = note.join(" ");

      var p = new URLSearchParams();
      p.set("mmm_fach", fach === "BWL" ? "BWL / Wirtschaft" : fach);
      if (wer === "studium") p.set("mmm_klasse", "Uni / Studium");
      var notiz = [WER[wer], ZIEL[val("ziel")] ? "Anliegen: " + ZIEL[val("ziel")] : ""].filter(Boolean).join(" · ");
      if (notiz) p.set("mmm_notiz", notiz);
      cta.href = base + (base.indexOf("?") === -1 ? "?" : "&") + p.toString();
    };
    finder.addEventListener("change", update);
    update();
  }

  // ---------- Tafelbild Schritt für Schritt (ohne JS: alle Schritte sichtbar)
  document.querySelectorAll("[data-board]").forEach(function (board) {
    var steps = board.querySelectorAll(".board-steps li");
    var next = board.querySelector("[data-board-next]");
    var info = board.querySelector("[data-board-count]");
    var aha = board.querySelector("[data-board-aha]");
    var shown = 1;
    var render = function (animate) {
      steps.forEach(function (li, i) { li.hidden = i >= shown; li.classList.toggle("new", animate && i === shown - 1); });
      var done = shown >= steps.length;
      aha.hidden = !done;
      next.textContent = done ? "Noch mal von vorn" : "Nächster Schritt";
      info.textContent = "Schritt " + shown + " von " + steps.length;
    };
    next.hidden = false;
    next.addEventListener("click", function () { shown = shown >= steps.length ? 1 : shown + 1; render(true); });
    render(false);
  });

  // ---------- Tafelbild: Fach-Reiter (ohne JS sind alle Beispiele untereinander sichtbar)
  document.querySelectorAll("[data-boards]").forEach(function (wrap) {
    var tabs = wrap.querySelectorAll("[data-board-tab]");
    var boards = wrap.querySelectorAll("[data-board-key]");
    if (!tabs.length) return;
    wrap.querySelector(".board-tabs").hidden = false;
    var pick = function (key) {
      tabs.forEach(function (t) { t.setAttribute("aria-selected", String(t.getAttribute("data-board-tab") === key)); });
      boards.forEach(function (b) { b.hidden = b.getAttribute("data-board-key") !== key; });
    };
    tabs.forEach(function (t) { t.addEventListener("click", function () { pick(t.getAttribute("data-board-tab")); }); });
    pick(tabs[0].getAttribute("data-board-tab"));
  });

  // ---------- Klebende Probestunden-Leiste (Handy)
  var bar = document.querySelector("[data-sticky]");
  if (bar && "IntersectionObserver" in window) {
    var hero = document.querySelector(".home-hero .wp-block-button__link, .page-hero .wp-block-button__link, .home-hero .btn-primary, .page-hero h1, .design-seite h1");
    var blockers = document.querySelectorAll(".cta-band, .site-footer, #finder-result, .label-form");
    var heroVisible = !!hero, seen = new Set();
    var set = function () {
      var show = !heroVisible && seen.size === 0;
      bar.classList.toggle("show", show);
      if (show) bar.removeAttribute("inert"); else bar.setAttribute("inert", "");
    };
    if (hero) new IntersectionObserver(function (es) { heroVisible = es[0].isIntersecting || es[0].boundingClientRect.top > 0; set(); }).observe(hero);
    var bo = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) seen.add(e.target); else seen.delete(e.target); });
      set();
    });
    blockers.forEach(function (b) { bo.observe(b); });
  }

  // ---------- Probestunde: Wunsch-Lehrkraft nach Fach
  var lehr = document.getElementById("p-lehr");
  var fachSel = document.getElementById("p-fach");
  if (lehr && fachSel) {
    var team = [];
    try { team = JSON.parse(lehr.getAttribute("data-team")) || []; } catch (e) { /* leer */ }
    var hint = document.getElementById("p-lehr-hint");
    var KEY = { "BWL / Wirtschaft": "bwl", "Anderes Fach": "" };
    var esc = function (s) { return s.replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
    var fill = function (keep) {
      var f = fachSel.value;
      var key = Object.prototype.hasOwnProperty.call(KEY, f) ? KEY[f] : f.toLowerCase();
      var list = team.filter(function (t) { return !f || !key || t.s.indexOf(key) !== -1; });
      if (keep && list.every(function (t) { return t.n !== keep; })) list = team.filter(function (t) { return t.n === keep; }).concat(list);
      lehr.innerHTML = '<option value="">Empfehlt mir jemanden</option>' + list.map(function (t) { return "<option>" + esc(t.n) + "</option>"; }).join("");
      if (keep) lehr.value = keep;
      if (!f) hint.textContent = "Wähle zuerst ein Fach – dann zeigen wir passende Lehrkräfte.";
      else if (!key) hint.textContent = "Wir empfehlen dir gern jemanden.";
      else if (list.length) hint.textContent = list.length + (list.length === 1 ? " Lehrkraft" : " Lehrkräfte") + " für " + f + ". Oder wir empfehlen dir jemanden.";
      else hint.textContent = "Für " + f + " suchen wir persönlich eine passende Lehrkraft für dich.";
    };
    fachSel.addEventListener("change", function () { fill(lehr.value); });
    fill(lehr.value);
  }

  // ---------- Formulare: Prüfung direkt am Feld, dann normal absenden
  document.querySelectorAll("form[data-validate]").forEach(function (form) {
    var err = form.querySelector(".form-error[hidden]");
    var counter = form.querySelector("[data-count]");
    var area = form.querySelector("textarea[maxlength]");
    if (counter && area) area.addEventListener("input", function () { counter.textContent = area.value.length; });
    var check = function (el) {
      var ok = el.checkValidity();
      el.setAttribute("aria-invalid", String(!ok));
      var m = document.getElementById(el.id + "-msg");
      if (m) m.hidden = ok;
      return ok;
    };
    form.querySelectorAll("[required]").forEach(function (el) {
      el.addEventListener("blur", function () { if (el.value) check(el); });
      el.addEventListener("input", function () { if (el.getAttribute("aria-invalid") === "true") check(el); });
      el.addEventListener("change", function () { if (el.getAttribute("aria-invalid") === "true") check(el); });
    });
    form.addEventListener("submit", function (e) {
      var bad = [].filter.call(form.querySelectorAll("[required]"), function (el) { return !check(el); });
      if (bad.length) {
        e.preventDefault();
        if (err) err.hidden = false;
        bad[0].focus();
        return;
      }
      var btn = form.querySelector("button[type=submit]");
      if (btn) { btn.disabled = true; btn.textContent = "Wird gesendet …"; }
    });
  });
})();
