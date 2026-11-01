/* Prototyp Nachhilfe Online – wenig JavaScript, alles funktioniert auch ohne:
   Handy-Menü, Dropdowns, Team-Filter, Angebotsfinder, Tafelbild,
   klebende Probestunden-Leiste, Formular-Vorbelegung und -Prüfung. */
(function () {
  "use strict";
  var PREFILL = "nho-prefill";
  function store(obj) { try { sessionStorage.setItem(PREFILL, JSON.stringify(obj)); } catch (e) { /* ohne Speicher geht es auch */ } }
  function load() { try { return JSON.parse(sessionStorage.getItem(PREFILL) || "null"); } catch (e) { return null; } }
  function clear() { try { sessionStorage.removeItem(PREFILL); } catch (e) { /* egal */ } }

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
      if (mobile && !mobile.hidden) { closeMobile(); toggle.focus(); }
    }
  });

  // ---------- Team-Filter nach Fach
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

  // ---------- "Probestunde mit …" auf Team-Karten merkt sich die Wahl
  document.querySelectorAll("[data-prefill-lehrkraft]").forEach(function (a) {
    a.addEventListener("click", function () {
      store({ lehrkraft: a.getAttribute("data-prefill-lehrkraft"), fach: a.getAttribute("data-prefill-fach") || "" });
    });
  });

  // ---------- Angebotsfinder
  var finder = document.getElementById("finder-form");
  if (finder) {
    var counts = {};
    try { counts = JSON.parse(finder.getAttribute("data-counts")); } catch (e) { counts = {}; }
    var box = document.getElementById("finder-result");
    var R = function (k) { return box.querySelector('[data-r="' + k + '"]'); };
    var cta = box.querySelector("[data-finder-cta]");
    var WER = { grundschule: "Grundschule", mittel: "Klasse 5–10", oberstufe: "Klasse 11–13", studium: "Studium / Sonstiges" };
    var ZIEL = { luecken: "Lücken in den Grundlagen", arbeit: "Vorbereitung auf die nächste Klassenarbeit", pruefung: "Abschlussprüfung", fragen: "einzelne Fragen", ueben: "selbst üben" };
    var val = function (n) { var c = finder.querySelector('input[name="' + n + '"]:checked'); return c ? c.value : ""; };

    var update = function () {
      var wer = val("wer"), ziel = val("ziel"), fach = finder.fach.value;
      var key = fach.toLowerCase();
      var mathe = key === "mathematik";
      var rec;
      if (ziel === "pruefung" && wer === "grundschule") ziel = "arbeit";
      if (ziel === "luecken") rec = ["Lücken schließen im 1:1", "Wir finden heraus, wo die Lücke beginnt, und bauen die Grundlagen Schritt für Schritt wieder auf – bis der aktuelle Stoff wieder anschließt.", "luecken-schliessen.html", "So läuft's"];
      else if (ziel === "arbeit") rec = ["Einzelnachhilfe zum aktuellen Stoff", "Wir setzen beim aktuellen Thema an, üben typische Aufgaben und machen einen realistischen Plan bis zur Arbeit.", "online-nachhilfe.html", "So läuft's"];
      else if (ziel === "pruefung") rec = [wer === "oberstufe" ? "Abiturvorbereitung mit Plan" : (wer === "mittel" ? "Vorbereitung auf Mittlere Reife oder Mittelschulabschluss" : "Prüfungsvorbereitung mit Plan"), "Theorie auffrischen, echte Prüfungsaufgaben trainieren, zwei Probeläufe. Wichtig: Die Anfrage muss spätestens drei Monate vor der Prüfung bei uns sein.", "pruefungsvorbereitung.html", "Zum Prüfungsplan"];
      else if (ziel === "fragen") rec = mathe
        ? ["Fragenpass für Mathe-Fragen", "Mathe-Fragen per WhatsApp oder E-Mail klären – ab 37 € pro Monat. Kostenlos testen mit dem Erkundungspass (zwei Fragen).", "preise.html#weitere", "Zum Fragenpass"]
        : ["Einzelstunden nach Bedarf", "Den Fragenpass gibt es für Mathe. Für " + fach + " nutzt ihr einfach Stunden aus dem Paket, wenn eine Frage ansteht – die Stunden verfallen nicht.", "preise.html", "Zu den Preisen"];
      else if (ziel === "ueben") rec = mathe
        ? ["Kostenlos üben", "560 Arbeitsblätter, der Textaufgaben-Kompass und Mathe-Bücher mit Leseproben – ohne Anmeldung. Wenn es irgendwo hakt: Probestunde.", "kostenlos-lernen.html", "Zu den Materialien"]
        : ["Erst mal kennenlernen", "Unsere kostenlosen Materialien sind vor allem für Mathe. Für " + fach + " ist die kostenlose Probestunde der beste Start.", "kostenlos-lernen.html", "Kostenlos lernen"];
      else rec = ["Erst kostenlos kennenlernen", "Wähle aus, wer lernt und worum es geht – die Empfehlung passt sich sofort an. Der sichere Start ist immer die kostenlose Probestunde.", "nachhilfe.html", "Alle Angebote"];

      R("title").textContent = rec[0];
      R("text").textContent = rec[1];
      var link = R("link"); link.href = rec[2]; link.textContent = rec[3];

      var note = [];
      var n = counts[key];
      if (n) note.push(n + (n === 1 ? " Lehrkraft unterrichtet " : " Lehrkräfte unterrichten ") + fach + ".");
      else if (ziel || wer) note.push("Für " + (key === "anderes fach" ? "dein Fach" : fach) + " empfehlen wir dir persönlich eine passende Lehrkraft.");
      if (wer === "studium" && mathe) note.push("Mathe auf Uni-Niveau unterrichtet Marcel Daum.");
      if (ziel === "luecken" && mathe) note.push("Tipp: Vorher mit dem kostenlosen Lernstand-Check einordnen.");
      R("note").textContent = note.join(" ");

      var notiz = [WER[wer], ZIEL[val("ziel")] ? "Anliegen: " + ZIEL[val("ziel")] : ""].filter(Boolean).join(" · ");
      cta.onclick = function () { store({ fach: fach === "BWL" ? "BWL / Wirtschaft" : (fach === "Anderes Fach" ? "Anderes Fach" : fach), notiz: notiz, klasse: wer === "studium" ? "Uni / Studium" : "" }); };
    };
    finder.addEventListener("change", update);
    update();
  }

  // ---------- Tafelbild: Schritt für Schritt (ohne JS sind alle Schritte sichtbar)
  document.querySelectorAll("[data-board]").forEach(function (board) {
    var steps = board.querySelectorAll(".board-steps li");
    var next = board.querySelector("[data-board-next]");
    var info = board.querySelector("[data-board-count]");
    var aha = board.querySelector("[data-board-aha]");
    var shown = 1;
    var render = function (animate) {
      steps.forEach(function (li, i) {
        li.hidden = i >= shown;
        li.classList.toggle("new", animate && i === shown - 1);
      });
      var done = shown >= steps.length;
      aha.hidden = !done;
      next.textContent = done ? "Noch mal von vorn" : "Nächster Schritt";
      info.textContent = "Schritt " + shown + " von " + steps.length;
    };
    next.hidden = false;
    next.addEventListener("click", function () { shown = shown >= steps.length ? 1 : shown + 1; render(true); });
    render(false);
  });

  // ---------- Klebende Probestunden-Leiste (Handy)
  var bar = document.querySelector("[data-sticky]");
  if (bar && "IntersectionObserver" in window) {
    document.body.classList.add("has-sticky");
    var hero = document.querySelector(".hero .btn-primary, .page-hero .btn-primary, .page-hero h1");
    var blockers = document.querySelectorAll(".cta-band, .site-footer, #finder-result");
    var heroVisible = true, blocked = 0;
    var set = function () {
      var show = !heroVisible && blocked === 0;
      bar.classList.toggle("show", show);
      if (show) bar.removeAttribute("inert"); else bar.setAttribute("inert", "");
    };
    if (hero) new IntersectionObserver(function (es) { heroVisible = es[0].isIntersecting || es[0].boundingClientRect.top > 0; set(); }).observe(hero);
    else heroVisible = false;
    var seen = new Set();
    var bo = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) seen.add(e.target); else seen.delete(e.target); });
      blocked = seen.size; set();
    });
    blockers.forEach(function (b) { bo.observe(b); });
  }

  // ---------- Probestunde: Lehrkräfte nach Fach, Vorbelegung
  var lehr = document.getElementById("p-lehr");
  var fachSel = document.getElementById("p-fach");
  if (lehr && fachSel) {
    var team = [];
    try { team = JSON.parse(lehr.getAttribute("data-team")); } catch (e) { team = []; }
    var hint = document.getElementById("p-lehr-hint");
    var KEY = { "BWL / Wirtschaft": "bwl", "Anderes Fach": "" };
    var fill = function (keep) {
      var f = fachSel.value;
      var key = f in KEY ? KEY[f] : f.toLowerCase();
      var list = team.filter(function (t) { return !f || !key || t.s.indexOf(key) !== -1; });
      if (keep && list.every(function (t) { return t.n !== keep; })) {
        var extra = team.filter(function (t) { return t.n === keep; });
        list = extra.concat(list);
      }
      lehr.innerHTML = '<option value="">Empfehlt mir jemanden</option>' + list.map(function (t) { return "<option>" + t.n + "</option>"; }).join("");
      if (keep) lehr.value = keep;
      if (!f) hint.textContent = "Wähle zuerst ein Fach – dann zeigen wir passende Lehrkräfte.";
      else if (!key) hint.textContent = "Wir empfehlen dir gern jemanden.";
      else if (list.length) hint.textContent = list.length + (list.length === 1 ? " Lehrkraft" : " Lehrkräfte") + " für " + f + ". Oder wir empfehlen dir jemanden.";
      else hint.textContent = "Für " + f + " suchen wir persönlich eine passende Lehrkraft für dich.";
    };
    fachSel.addEventListener("change", function () { fill(lehr.value); });
    var pre = load();
    if (pre) {
      if (pre.fach && [].some.call(fachSel.options, function (o) { return o.value === pre.fach || o.text === pre.fach; })) fachSel.value = pre.fach;
      var kl = document.getElementById("p-klasse");
      if (pre.klasse && kl) kl.value = pre.klasse;
      var msgField = document.getElementById("p-msg");
      if (pre.notiz && msgField && !msgField.value) msgField.value = pre.notiz;
      fill(pre.lehrkraft || "");
      var note = document.querySelector("[data-prefill-note]");
      if (note) note.hidden = false;
      clear();
    } else {
      fill("");
    }
  }

  // ---------- Demo-Formulare: Prüfung pro Feld, nichts wird verschickt
  document.querySelectorAll("form[data-demo]").forEach(function (form) {
    var err = form.querySelector(".form-error");
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
      el.addEventListener("change", function () { if (el.getAttribute("aria-invalid") === "true") check(el); });
      el.addEventListener("input", function () { if (el.getAttribute("aria-invalid") === "true") check(el); });
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var hp = form.querySelector(".hp input");
      if (hp && hp.value) return; // Honeypot: Bots füllen das unsichtbare Feld
      var bad = [].filter.call(form.querySelectorAll("[required]"), function (el) { return !check(el); });
      if (bad.length) { if (err) err.hidden = false; bad[0].focus(); return; }
      if (err) err.hidden = true;
      var target = document.getElementById(form.getAttribute("data-demo"));
      var nameField = form.querySelector("[name=name]");
      var first = nameField ? nameField.value.trim().split(/[\s@]+/)[0] : "";
      if (target) {
        target.querySelectorAll("[data-name]").forEach(function (el) { el.textContent = first || "dir"; });
        form.hidden = true;
        var note = document.querySelector("[data-prefill-note]");
        if (note) note.hidden = true;
        target.hidden = false;
        target.setAttribute("tabindex", "-1");
        target.focus();
        target.scrollIntoView({ block: "start" });
      }
    });
  });
})();
