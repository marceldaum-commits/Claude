// Kali Level Up – App
import { Shell, baseFS, HOME } from './shell.js';
import { mountTerminal } from './terminal-ui.js';
import { verifyEvidence, normAnswer } from './verify.js';
import {
  loadState, saveState, defaultState, today, pushBackup, listBackups, mergeStates,
  scoreAttempt, examPassed, computeXp, PASS_RATIO,
} from './state.js';
import { initSync, syncConfigured, syncStatus, onSyncStatus, signIn, signUp, signOut, syncNow, schedulePush } from './sync.js';
import { exportStateJSON, readStateFile, exportApp, download } from './export.js';
import { LEVELS, LOCATIONS } from './content/curriculum.js';
import { LEVEL1 } from './content/level1.js';
import { STORIES } from './content/story1.js';
import { TOOLS } from './content/tools.js';

// ---------------------------------------------------------------- Daten
const LESSONS = LEVEL1.lessons;
const EXERCISES = LEVEL1.exercises;
const EX = Object.fromEntries(EXERCISES.map(e => [e.id, e]));
const LESSON = Object.fromEntries(LESSONS.map(l => [l.id, l]));
const STORY = Object.fromEntries(STORIES.map(s => [s.id, s]));
const EXAMS = { L1: LEVEL1.exam };

let state = loadState();
const getState = () => state;
function applyState(s) { state = s; saveState(state); render(); }
function save() { saveState(state); schedulePush(getState, applyState); }

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const tok = (s) => String(s || '').replaceAll('{{TOKEN}}', state.labToken);

function toast(msg, ms = 2600) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
}

function shuffle(arr, seed) {
  const a = arr.slice();
  let s = seed || (Date.now() & 0xffffffff);
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------- Fortschritt
const exState = (id) => state.exercises[id] || (state.exercises[id] = { attempts: 0, failed: 0, repeats: 0 });
const isPassed = (id) => !!state.exercises[id]?.passedAt;
const lessonDone = (id) => !!state.lessons[id]?.doneAt;
const required = EXERCISES.filter(e => e.required);

function levelUnlocked(lv) {
  const idx = LEVELS.findIndex(l => l.id === lv);
  if (idx <= 0) return true;
  return examPassed(state, LEVELS[idx - 1].id, EXAMS[LEVELS[idx - 1].id]?.items.length || 1);
}

function examPrereqs(lv = 'L1') {
  const missLessons = LESSONS.filter(l => !lessonDone(l.id));
  const missEx = required.filter(e => !isPassed(e.id));
  return { ok: !missLessons.length && !missEx.length, missLessons, missEx };
}

function levelProgress() {
  const total = LESSONS.length + required.length;
  const done = LESSONS.filter(l => lessonDone(l.id)).length + required.filter(e => isPassed(e.id)).length;
  return { done, total, pct: Math.round(done / total * 100) };
}

function nextStep() {
  for (const l of LESSONS) {
    if (!lessonDone(l.id)) return { kind: 'lesson', id: l.id, title: l.title, href: `#/lektion/${l.id}` };
    for (const eid of l.exercises) {
      const e = EX[eid];
      if (e.required && !isPassed(eid)) return { kind: 'ex', id: eid, title: e.title, href: `#/uebung/${eid}`, e };
    }
  }
  const s = STORY.s1;
  if (!state.story.s1?.done) return { kind: 'story', title: s.title, href: '#/story/s1' };
  if (!examPassed(state, 'L1', EXAMS.L1.items.length)) return { kind: 'exam', title: EXAMS.L1.title, href: '#/pruefung/L1' };
  return { kind: 'done', title: 'Level 1 abgeschlossen – Level 2 ist in Vorbereitung', href: '#/pfad' };
}

function dailyMissions() {
  const d = today();
  if (!state.daily[d]) {
    const fresh = [];
    for (const l of LESSONS) for (const eid of l.exercises) if (!isPassed(eid) && fresh.length < 2 && EX[eid].kind !== 'drill') fresh.push(eid);
    const passed = EXERCISES.filter(e => isPassed(e.id)).map(e => e.id);
    const seed = parseInt(d.replace(/-/g, ''), 10);
    const reviews = shuffle(passed, seed).slice(0, 2);
    state.daily[d] = [...new Set([...fresh, ...reviews])];
    save();
  }
  return state.daily[d];
}

// ---------------------------------------------------------------- Kopf & Navigation
function renderTop() {
  const loc = LOCATIONS[state.location];
  const st = syncStatus();
  $('#top').innerHTML = `
    <a class="brand" href="#/heute"><img src="icons/icon.svg" alt=""><span>Kali <b>Level Up</b></span></a>
    <span class="spacer"></span>
    <button class="chip" id="locChip" title="Lernort ändern">${loc ? loc.icon + ' ' + esc(loc.short) : '📍 Lernort?'}</button>
    <a class="chip" href="#/mehr" title="${esc(st.msg)}"><span class="dot ${st.state === 'ok' ? 'ok' : st.state === 'err' ? 'err' : st.state === 'warn' || st.state === 'busy' ? 'warn' : ''}"></span>${st.state === 'ok' ? 'Sync' : st.state === 'off' ? 'Lokal' : st.state === 'busy' ? '…' : 'Sync'}</a>`;
  $('#locChip').onclick = () => locationModal(true);
}

function renderNav(route) {
  const items = [['heute', '⌂', 'Heute'], ['pfad', '◆', 'Lernpfad'], ['story', '▶', 'Story'], ['terminal', '>_', 'Terminal'], ['mehr', '≡', 'Mehr']];
  const map = { lektion: 'pfad', uebung: 'pfad', level: 'pfad', pruefung: 'pfad', archiv: 'mehr', werkzeuge: 'mehr' };
  const on = map[route] || route;
  $('#nav').innerHTML = items.map(([r, i, t]) => `<a href="#/${r}" class="${on === r ? 'on' : ''}"><span class="i">${i}</span>${t}</a>`).join('');
}

function locationModal(force = false) {
  if (!force && state.location && state.locationDay === today()) return;
  const m = document.createElement('div');
  m.className = 'modal';
  m.innerHTML = `<div class="box" role="dialog" aria-label="Lernort wählen">
    <h2>Wo lernst du heute?</h2>
    <p class="muted small">Anleitungen, Befehle und Grenzen werden an deinen Lernort angepasst. Du kannst ihn oben jederzeit ändern.</p>
    ${Object.entries(LOCATIONS).map(([k, l]) => `<button class="loc-opt ${state.location === k ? 'on' : ''}" data-k="${k}"><span class="ic">${l.icon}</span><span><b>${esc(l.label)}</b><br><span class="small muted">${esc(l.desc)}</span></span></button>`).join('')}
  </div>`;
  document.body.appendChild(m);
  m.addEventListener('click', (e) => {
    const b = e.target.closest('.loc-opt');
    if (b) {
      state.location = b.dataset.k; state.locationDay = today(); state.locationAt = Date.now();
      save(); m.remove(); render();
    } else if (e.target === m && state.location) { state.locationDay = today(); save(); m.remove(); }
  });
}

// ---------------------------------------------------------------- Router
const views = {};
let cleanup = null;

function render() {
  const hash = location.hash.replace(/^#\/?/, '') || 'heute';
  const [route, arg] = hash.split('/');
  if (cleanup) { try { cleanup(); } catch { /* */ } cleanup = null; }
  renderTop();
  renderNav(route);
  const main = $('#main');
  const v = views[route] || views.heute;
  const r = v(arg) || {};
  main.innerHTML = r.html || '';
  if (r.mount) cleanup = r.mount(main) || null;
  if (!r.keepScroll) window.scrollTo(0, 0);
}

// ---------------------------------------------------------------- Heute
views.heute = () => {
  const p = levelProgress();
  const nx = nextStep();
  const daily = dailyMissions();
  const xp = computeXp(state, EX);
  const loc = LOCATIONS[state.location];
  const pre = examPrereqs();
  const s1 = state.story.s1;
  return {
    html: `
    <section class="stack">
      <div class="card violet">
        <div class="row between">
          <div><span class="badge plain">Level 1</span> <span class="badge ${examPassed(state, 'L1', EXAMS.L1.items.length) ? 'ok' : 'plain'}">${examPassed(state, 'L1', EXAMS.L1.items.length) ? 'Prüfung bestanden' : 'Prüfung offen'}</span></div>
          <span class="small muted">${loc ? loc.icon + ' ' + esc(loc.label) : 'Lernort nicht gewählt'}</span>
        </div>
        <h1 style="margin-top:.5rem">Hallo ${esc(state.profile.name)} – Linux Grundlagen</h1>
        <div class="bar" aria-label="Fortschritt ${p.pct}%"><i style="width:${p.pct}%"></i></div>
        <p class="small muted">${p.done} von ${p.total} Pflichtschritten (Lektionen + Pflichtübungen)</p>
        <div class="kpis"><div class="kpi"><b>${xp}</b><span>Kurs-XP</span></div><div class="kpi"><b>${Object.values(state.exercises).filter(e => e.passedAt).length}</b><span>Übungen bestanden</span></div><div class="kpi"><b>${s1?.done ? STORY.s1.points : 0}</b><span>Story-Punkte</span></div></div>
      </div>

      <a class="card lime" href="${nx.href}" style="display:block;text-decoration:none;color:inherit">
        <span class="badge real">Nächster Schritt</span>
        <h2 style="margin:.4rem 0 .2rem">${esc(nx.title)}</h2>
        <span class="small muted">${nx.kind === 'lesson' ? 'Lektion – erst verstehen, dann üben' : nx.kind === 'ex' ? (nx.e.kind === 'real' ? 'Echter Auftrag in deiner Kali-Umgebung' : 'Übung in der Sandbox-Simulation') : nx.kind === 'story' ? 'Story-Mission' : nx.kind === 'exam' ? 'Kumulative Prüfung' : ''} →</span>
      </a>

      <div class="card">
        <h2>Tagesmission ${esc(new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }))}</h2>
        <p class="small muted">Neue Aufgaben nach deinem Stand plus Wiederholungen aus dem Archiv (ohne neue XP).</p>
        <ul class="list">${daily.map(id => exItem(id, true)).join('') || '<li class="item muted">Alles erledigt – wiederhole frei im Archiv.</li>'}</ul>
      </div>

      <div class="grid two">
        <a class="card" href="#/story/s1" style="text-decoration:none;color:inherit;display:block">
          <span class="badge sim">Story-Lab</span> <span class="badge real">+ echte Kali-Schritte</span>
          <h3 style="margin-top:.5rem">${esc(STORY.s1.title)}</h3>
          <p class="small muted">${esc(STORY.s1.teaser)}</p>
          <span class="small">${s1?.done ? '✓ abgeschlossen' : s1 ? `Szene ${(s1.scene || 0) + 1} von ${STORY.s1.scenes.length}` : storyLocked(STORY.s1) ? '🔒 Voraussetzungen offen' : 'Bereit →'}</span>
        </a>
        <a class="card" href="#/pruefung/L1" style="text-decoration:none;color:inherit;display:block">
          <span class="badge plain">Prüfung Level 1</span>
          <h3 style="margin-top:.5rem">Voraussetzungen</h3>
          <p class="small">${pre.ok ? '✓ Alle Lektionen und Pflichtübungen erledigt – Prüfung freigeschaltet.' : `Noch offen: ${pre.missLessons.length} Lektion(en), ${pre.missEx.length} Pflichtübung(en).`}</p>
          <p class="small muted">Bestehen: ≥ ${Math.round(PASS_RATIO * 100)} % und alle Pflichtaufgaben korrekt.</p>
        </a>
      </div>
    </section>`,
  };
};

function exItem(id, showRepeat) {
  const e = EX[id]; if (!e) return '';
  const done = isPassed(id);
  const locked = !lessonDone(e.lesson);
  return `<li><a href="#/uebung/${id}">
    <span class="state ${done ? 'done' : locked ? 'lock' : ''}">${done ? '✓' : locked ? '🔒' : ''}</span>
    <span class="grow"><span class="t">${esc(e.title)}</span><span class="s">${kindLabel(e)}${done && showRepeat ? ' · Wiederholung ohne XP' : ''}${locked ? ' · erst Lektion lesen' : ''}</span></span>
    ${e.kind === 'real' ? '<span class="badge real">echt</span>' : '<span class="badge sim">sim</span>'}
  </a></li>`;
}
function kindLabel(e) {
  return { sandbox: 'Sandbox-Übung', real: 'Echter Kali-Auftrag', review: 'Wiederholungsrunde', drill: 'Kurz-Drill (optional)' }[e.kind] + (e.required ? '' : ' · optional');
}

// ---------------------------------------------------------------- Lernpfad
views.pfad = () => ({
  html: `<h1>Lernpfad: vom Linux-Anfänger zum Purple Team</h1>
  <p class="muted">Jedes Level endet mit einer kumulativen Prüfung. Das nächste Level öffnet sich erst danach.</p>
  <ul class="list card">${LEVELS.map(l => {
    const unlocked = levelUnlocked(l.id);
    const passed = examPassed(state, l.id, EXAMS[l.id]?.items.length || 1);
    return `<li><a href="#/level/${l.id}">
      <span class="state ${passed ? 'done' : unlocked ? '' : 'lock'}">${passed ? '✓' : unlocked ? l.n : '🔒'}</span>
      <span class="grow"><span class="t">Level ${l.n} – ${esc(l.title)}</span><span class="s">${esc(l.goal)}</span></span>
      ${l.status === 'ready' ? '' : '<span class="badge plain">in Vorbereitung</span>'}
    </a></li>`;
  }).join('')}</ul>`,
});

views.level = (id) => {
  const l = LEVELS.find(x => x.id === id) || LEVELS[0];
  const unlocked = levelUnlocked(l.id);
  if (l.id !== 'L1') {
    return {
      html: `<a class="back" href="#/pfad">← Lernpfad</a>
      <h1>Level ${l.n} – ${esc(l.title)}</h1>
      <div class="card ${unlocked ? '' : 'warn'}"><b>${unlocked ? 'Freigeschaltet' : '🔒 Gesperrt'}</b> – ${unlocked ? 'Die Inhalte dieses Levels sind noch in Vorbereitung.' : `Öffnet sich nach bestandener Prüfung von Level ${l.n - 1}.`}</div>
      <div class="card stack"><p>${esc(l.goal)}</p>
        <h3>Geplante Themen</h3><ul>${l.topics.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
        <h3>Werkzeuge</h3><ul>${l.tools.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
        <p class="honest">Ehrlicher Stand: Für dieses Level steht der Lehrplan, Lektionen/Übungen/Prüfung sind noch nicht ausgearbeitet.</p></div>`,
    };
  }
  const pre = examPrereqs();
  return {
    html: `<a class="back" href="#/pfad">← Lernpfad</a>
    <h1>Level 1 – Linux Grundlagen</h1>
    <p class="muted">${esc(l.goal)}</p>
    <div class="stack">${LESSONS.map((ls, i) => `
      <div class="card tight">
        <a href="#/lektion/${ls.id}" class="row" style="text-decoration:none;color:inherit">
          <span class="state ${lessonDone(ls.id) ? 'done' : ''}">${lessonDone(ls.id) ? '✓' : i + 1}</span>
          <span class="grow"><b>${esc(ls.title)}</b><br><span class="small muted">Lektion · ca. ${ls.minutes} min</span></span>
        </a>
        <ul class="list" style="margin-left:2.2rem">${ls.exercises.map(id => exItem(id)).join('')}</ul>
      </div>`).join('')}
      <a class="card ${state.story.s1?.done ? 'lime' : ''}" href="#/story/s1" style="display:block;text-decoration:none;color:inherit"><span class="badge sim">Story</span> <b>${esc(STORY.s1.title)}</b><br><span class="small muted">Empfohlen vor der Prüfung · bringt Story-Punkte, keine Prüfungsfreigabe</span></a>
      <a class="card ${pre.ok ? 'violet' : ''}" href="#/pruefung/L1" style="display:block;text-decoration:none;color:inherit"><b>Prüfung Level 1</b><br><span class="small muted">${pre.ok ? 'Freigeschaltet' : '🔒 erst nach allen Lektionen und Pflichtübungen'}</span></a>
    </div>`,
  };
};

// ---------------------------------------------------------------- Lektion
views.lektion = (id) => {
  const l = LESSON[id];
  if (!l) return views.pfad();
  const idx = LESSONS.indexOf(l);
  return {
    html: `<a class="back" href="#/level/L1">← Level 1</a>
    <span class="badge plain">Lektion ${idx + 1} / ${LESSONS.length}</span>
    <h1 style="margin-top:.4rem">${esc(l.title)}</h1>
    <p>${esc(l.intro)}</p>
    <div class="stack">${l.concepts.map(c => `
      <div class="card concept">
        <h2>${esc(c.name)}</h2>
        <dl><dt>Zweck</dt><dd>${esc(c.zweck)}</dd><dt>Syntax</dt><dd><pre class="syntax">${esc(c.syntax)}</pre></dd>
        <dt>Argumente</dt><dd><table class="args">${c.args.map(([a, d]) => `<tr><td>${esc(a)}</td><td>${esc(d)}</td></tr>`).join('')}</table></dd>
        <dt>Wirkung</dt><dd>${esc(c.wirkung)}</dd>
        <dt>Typische Fehler</dt><dd><ul style="margin:0;padding-left:1.1rem">${c.fehler.map(f => `<li>${esc(f)}</li>`).join('')}</ul></dd></dl>
        <div class="rule">${esc(c.regel)}</div>
      </div>`).join('')}
      <div class="card">
        <p class="small muted">Probiere die Befehle gern frei im <a href="#/terminal">Sandbox-Terminal</a> aus, bevor du die Übungen startest.</p>
        ${lessonDone(id) ? '<p class="small">✓ Gelesen</p>' : '<button class="btn primary block" id="read">Verstanden – Übungen freischalten</button>'}
        <ul class="list">${l.exercises.map(eid => exItem(eid)).join('')}</ul>
      </div>
    </div>`,
    mount() {
      const b = $('#read');
      if (b) b.onclick = () => { state.lessons[id] = { doneAt: Date.now() }; save(); render(); };
    },
  };
};

// ---------------------------------------------------------------- Übung
function vorausHTML(real) {
  const loc = state.location || 'pc';
  const v = real.voraus || {};
  let html = '';
  if (loc === 'windows') html += `<div class="feedback no small">Heute ist „Windows/PowerShell“ gewählt. Dieser Auftrag braucht Kali (VM) oder Termux – wechsle den Lernort oder erledige ihn später.</div>`;
  if (loc === 'pc' || loc === 'windows') html += `<p><b>🖥️ PC (Kali-VM):</b> ${esc(v.pc)}</p>`;
  if (loc === 'phone') html += `<p><b>📱 Handy (Termux/NetHunter Rootless):</b> ${esc(v.phone)}</p>`;
  if (loc === 'both') html += `<p><b>🖥️ PC:</b> ${esc(v.pc)}</p><p><b>📱 Handy:</b> ${esc(v.phone)}</p>`;
  return html;
}

function scriptBlock(title, code) {
  if (!code) return '';
  return `<div class="script"><b class="small">${esc(title)}</b><pre>${esc(tok(code))}</pre><button class="btn small" data-copy="${esc(tok(code))}">Kopieren</button></div>`;
}

function bindCopy(root) {
  $$('[data-copy]', root).forEach(b => b.onclick = async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); toast('Kopiert – im echten Terminal einfügen.'); }
    catch { toast('Kopieren nicht möglich – bitte markieren und manuell kopieren.'); }
  });
}

function evidenceForm(prefix = 'ev', ex = {}) {
  return `
    <label for="${prefix}-cmd">Befehl(e), die du im echten Terminal ausgeführt hast</label>
    <input type="text" id="${prefix}-cmd" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="z. B. befehl -option ziel" value="${esc(ex.command || '')}">
    <label for="${prefix}-out">Unveränderte Ausgabe (einfügen)</label>
    <textarea id="${prefix}-out" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Ausgabe aus deinem Terminal hier einfügen">${esc(ex.output || '')}</textarea>
    <p class="honest">Die App prüft Form und Inhalt deiner Ausgabe – sie führt nichts auf deinem Gerät aus und kann nicht beweisen, dass die Ausgabe von dort stammt. Füge niemals echte Passwörter, Schlüssel oder private Logs ein.</p>`;
}

function resultsHTML(res) {
  return `<ul class="results">${res.results.map(r => `<li class="${r.ok ? 'ok' : 'no'}">${esc(r.label)}${!r.ok && r.rueckfrage ? `<span class="q">${esc(r.rueckfrage)}</span>` : ''}</li>`).join('')}</ul>`;
}

views.uebung = (id) => {
  const e = EX[id];
  if (!e) return views.pfad();
  const st = exState(id);
  if (!state.archive[id]) { state.archive[id] = Date.now(); save(); }
  if (!lessonDone(e.lesson)) {
    return { html: `<a class="back" href="#/lektion/${e.lesson}">← Lektion</a><h1>${esc(e.title)}</h1><div class="card warn">🔒 Erst die Lektion „${esc(LESSON[e.lesson].title)}“ lesen – neue Konzepte werden vor der ersten Übung erklärt.</div><a class="btn primary" href="#/lektion/${e.lesson}">Zur Lektion</a>` };
  }
  const repeat = !!st.passedAt;
  const run = { taskOk: false, knobelOk: false, fails: 0, hintShown: false };
  const isReal = e.kind === 'real';
  return {
    html: `<a class="back" href="#/lektion/${e.lesson}">← ${esc(LESSON[e.lesson].title)}</a>
    <div class="row">${isReal ? '<span class="badge real">Echter Auftrag · deine Kali-VM / Termux</span>' : '<span class="badge sim">Sandbox-Simulation</span>'}<span class="badge plain">${esc(kindLabel(e))}</span>${repeat ? '<span class="badge ok">bestanden · Wiederholung ohne XP</span>' : `<span class="badge plain">${e.xp} XP</span>`}</div>
    <h1 style="margin-top:.5rem">${esc(e.title)}</h1>
    <div class="stack">
      <div class="task-meta">
        <div><b>Lernziel</b>${esc(e.ziel)}</div>
        <div><b>Arbeitsauftrag</b><span class="auftrag">${esc(e.auftrag)}</span></div>
        <div><b>Scope</b>${esc(e.scope)}</div>
        <div><b>Verlangter Beleg</b>${esc(e.beleg)}</div>
      </div>
      ${isReal ? `
      <div class="card lime stack">
        <h3>Im echten Terminal</h3>
        ${vorausHTML(e.real)}
        ${scriptBlock('Setup (vorbereitend – nicht die Lösung):', e.real.setup)}
        <p class="small muted">Dein persönlicher Lab-Token: <code>${esc(state.labToken)}</code></p>
        <div id="evbox">${evidenceForm('ev', st.evidence)}</div>
        <button class="btn go block" id="check">Beleg prüfen</button>
        <div id="fb"></div>
        <details><summary>Abbruch / Aufräumen</summary><pre class="syntax">${esc(tok(e.real.cleanup))}</pre></details>
      </div>` : `
      <div id="termwrap"></div>
      <div class="row"><button class="btn go" id="check">Ergebnis prüfen</button><button class="btn ghost" id="reset">Übung neu starten</button></div>
      <div id="fb"></div>`}
      <div class="card" id="hintcard">
        <div class="row between"><b>Hinweis</b><span class="small muted" id="hintstate"></span></div>
        <button class="btn small" id="hint" disabled>Gestuften Hinweis anzeigen</button>
        <div id="hinttext"></div>
      </div>
      <div id="knobel"></div>
      <div id="debrief"></div>
    </div>`,
    mount(root) {
      let shell = null;
      let term = null;
      const fb = $('#fb', root);
      const updateHint = () => {
        const can = run.fails >= 2 && !run.hintShown;
        $('#hint', root).disabled = !can;
        $('#hintstate', root).textContent = run.hintShown ? 'genutzt' : run.fails >= 2 ? 'verfügbar (nur einer)' : `erst nach 2 eigenen Versuchen (${run.fails}/2)`;
      };
      $('#hint', root).onclick = () => {
        run.hintShown = true; st.hintUsed = true; save();
        $('#hinttext', root).innerHTML = `<div class="feedback info">${esc(e.hinweis)}</div>`;
        updateHint();
      };
      updateHint();

      const start = () => {
        $('#termwrap', root).innerHTML = '';
        shell = new Shell({ fs: baseFS() });
        e.sandbox.setup(shell);
        term = mountTerminal($('#termwrap', root), shell, { title: `Sandbox · ${e.title}`, welcome: 'Übungsumgebung bereit. Tipp: help, man BEFEHL, Tab ergänzt Namen.' });
      };
      if (!isReal) {
        start();
        $('#reset', root).onclick = () => { start(); fb.innerHTML = ''; run.taskOk = false; $('#knobel', root).innerHTML = ''; $('#debrief', root).innerHTML = ''; };
      }
      bindCopy(root);

      $('#check', root).onclick = () => {
        if (run.taskOk) return;
        st.attempts = (st.attempts || 0) + 1; st.lastAt = Date.now();
        let ok, html;
        if (isReal) {
          const input = { command: $('#ev-cmd', root).value, output: $('#ev-out', root).value, token: state.labToken };
          const res = verifyEvidence(e.real.spec, input);
          ok = res.ok;
          html = resultsHTML(res);
          if (res.scopeViolation) html = `<div class="feedback no"><b>STOPP.</b></div>` + html;
          if (ok) st.evidence = { command: res.command, output: res.output.slice(0, 4000), at: Date.now() };
        } else {
          const r = e.sandbox.check(shell);
          ok = r.ok;
          html = `<div class="feedback ${ok ? 'ok' : 'no'}">${esc(r.msg)}</div>`;
        }
        if (!ok) { run.fails++; st.failed = (st.failed || 0) + 1; }
        save();
        fb.innerHTML = (ok ? '<div class="feedback ok"><b>Beleg geprüft.</b> Jetzt die Knobelfrage – sie prüft, ob du das Ergebnis richtig deutest.</div>' : '') + html;
        updateHint();
        if (ok) { run.taskOk = true; showKnobel(); }
      };

      const showKnobel = () => {
        const k = e.knobel;
        const opts = shuffle(k.options.map((o, i) => ({ ...o, i })));
        const box = $('#knobel', root);
        box.innerHTML = `<div class="card violet"><h3>Knobelfrage</h3><p>${esc(k.q)}</p>
          ${opts.map(o => `<button class="opt" data-i="${o.i}">${esc(o.t)}</button>`).join('')}
          <div id="kfb"></div></div>`;
        box.scrollIntoView({ behavior: 'smooth', block: 'start' });
        $$('.opt', box).forEach(b => b.onclick = () => {
          if (run.knobelOk) return;
          const o = k.options[+b.dataset.i];
          if (o.ok) {
            b.classList.add('right'); run.knobelOk = true; finish();
          } else {
            b.classList.add('wrong');
            $('#kfb', box).innerHTML = `<div class="feedback no">${esc(o.why || 'Prüfe deine Annahme noch einmal.')}</div>`;
          }
        });
      };

      const finish = () => {
        const first = !st.passedAt;
        if (first) { st.passedAt = Date.now(); st.knobelOk = true; }
        else st.repeats = (st.repeats || 0) + 1;
        save();
        const n = e.nach;
        $('#debrief', root).innerHTML = `<div class="card lime debrief"><h3>Nachbesprechung</h3><dl>
          <dt>Beobachtung</dt><dd>${esc(n.beobachtung)}</dd><dt>Schlussfolgerung</dt><dd>${esc(n.schluss)}</dd>
          <dt>Grenzen</dt><dd>${esc(n.grenzen)}</dd><dt>Möglicher nächster Test</dt><dd>${esc(n.naechster)}</dd></dl>
          <p class="small">${first ? `✓ Bestanden · +${e.xp} Kurs-XP` : '✓ Wiederholung erfolgreich (ohne XP)'}${run.hintShown ? ' · mit Hinweis' : ''}</p>
          ${nextAfter(e)}</div>`;
        $('#debrief', root).scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
    },
  };
};

function nextAfter(e) {
  const l = LESSON[e.lesson];
  const i = l.exercises.indexOf(e.id);
  if (i < l.exercises.length - 1) return `<a class="btn primary" href="#/uebung/${l.exercises[i + 1]}">Nächste Übung →</a>`;
  const li = LESSONS.indexOf(l);
  if (li < LESSONS.length - 1) return `<a class="btn primary" href="#/lektion/${LESSONS[li + 1].id}">Nächste Lektion →</a>`;
  return `<a class="btn primary" href="#/story/s1">Zur Story-Mission →</a>`;
}

// ---------------------------------------------------------------- Sandbox-Terminal (frei)
views.terminal = () => ({
  html: `<h1>Übungs-Terminal</h1>
  <p class="muted small">Freies Ausprobieren in der <b>Sandbox-Simulation</b>. Für echte Aufträge nutzt du deine Kali-VM bzw. Termux – am PC am besten nebeneinander.</p>
  <div id="tw"></div>
  <p class="honest" style="margin-top:.8rem">Diese Konsole ist eine Simulation im Browser mit synthetischem Dateisystem. Sie führt keine echten Programme aus und hat keinen Netzwerkzugriff. curl erreicht hier nur simulierte Lab-Ziele auf 127.0.0.1.</p>`,
  mount(root) {
    const sh = new Shell({ fs: baseFS() });
    sh.fs.put(HOME + '/uebung/notiz.txt', 'Willkommen im Übungs-Terminal.\nAlles hier ist synthetisch.\n');
    sh.fs.put(HOME + '/uebung/logs/app.log', 'INFO start\nERROR db timeout\nWARN slow\nERROR auth failed\nINFO stop\n');
    sh.fs.put(HOME + '/uebung/rechte/offen.txt', 'x\n', 0o666);
    sh.web['127.0.0.1:8080'] = { server: 'SimHTTP/1.0 (SIMULIERT)', routes: { '/': { status: 200, headers: { 'Content-Type': 'text/html' }, body: '<h1>Sandbox-Lab</h1>\n' }, '/admin': { status: 403, headers: {}, body: 'Forbidden\n' } } };
    const t = mountTerminal($('#tw', root), sh, { tall: true, title: 'Sandbox · freies Üben', welcome: 'Tippe help für die Befehlsliste. Übungsdateien liegen in ~/uebung.' });
    if (matchMedia('(min-width: 760px)').matches) t.focus();
  },
});

// ---------------------------------------------------------------- Story
function storyLocked(s) { return s.prereq.filter(id => !isPassed(id)); }
const lockedList = (s) => storyLocked(s);

views.story = (id = 's1') => {
  const s = STORY[id] || STORY.s1;
  const missing = lockedList(s);
  if (missing.length) {
    return {
      html: `<h1>Story-Lab: ${esc(s.title)}</h1>
      <div class="card"><p>${esc(s.teaser)}</p><p class="small muted">Rolle: ${esc(s.role)} · Werkzeuge: ${s.tools.map(esc).join(', ')}</p></div>
      <div class="card warn"><b>🔒 Noch gesperrt.</b> Die Mission verlangt diese Grundlagen – sonst wird sie zum Raten:
      <ul class="list">${missing.map(m => exItem(m)).join('')}</ul></div>`,
    };
  }
  const ss = state.story[s.id] || (state.story[s.id] = { scene: 0, attempts: {}, hintUsed: {}, evidence: {}, answers: {}, report: {}, progress: {} });
  ss.progress = ss.progress || {};
  return {
    html: `<div class="row between"><h1 style="margin:0">Story-Lab: ${esc(s.title)}</h1>${ss.done ? '<span class="badge ok">abgeschlossen</span>' : ''}</div>
    <p class="small muted">${esc(s.role)}</p>
    <div class="grid">
      <div class="card tight" id="scenecard"></div>
      <div id="tw"></div>
      <div class="card tight"><b class="small">Fallverlauf</b><ul class="timeline" id="tl"></ul></div>
    </div>
    <p class="honest">Story-Punkte sind getrennt von Kurs-XP und schalten keine Prüfung frei. Die Fallakte im Terminal ist SIMULIERT; Szenen mit „echt“ führst du in deiner eigenen Kali-VM/Termux aus und belegst sie hier.</p>`,
    keepScroll: false,
    mount(root) {
      const sh = new Shell({ fs: baseFS() });
      s.sandbox.setup(sh);
      let term;
      const scene = () => s.scenes[Math.min(ss.scene, s.scenes.length - 1)];
      const prog = () => (ss.progress[scene().id] = ss.progress[scene().id] || {});
      const needs = (sc) => ({ ev: sc.kind === 'real', ans: !!sc.answer, opt: !!sc.options, rep: sc.kind === 'report' });
      const complete = (sc) => { const n = needs(sc), p = ss.progress[sc.id] || {}; return (!n.ev || p.ev) && (!n.ans || p.ans) && (!n.opt || p.opt) && (!n.rep || p.rep); };
      const fail = (sc) => { ss.attempts[sc.id] = (ss.attempts[sc.id] || 0) + 1; save(); renderCard(); };

      const say = (who, text) => {
        if (who === 'sys') term.printHTML(`<span class="sys">${esc(text)}</span>`);
        else term.printHTML(`<span class="story"><b>[${esc(who)}]</b> ${esc(text)}</span>`);
      };
      const showScene = (resume) => {
        const sc = scene();
        term.printHTML(`<span class="good">━━ Szene ${ss.scene + 1}/${s.scenes.length}: ${esc(sc.title)} ${sc.kind === 'real' ? '· ECHTER AUFTRAG' : sc.kind === 'sim' ? '· SIMULATION' : ''} ━━</span>`);
        if (resume) say('sys', '(Fortsetzung – dein Fortschritt wurde gespeichert)');
        sc.chat.forEach(([w, t]) => say(w, t));
        term.printHTML(`<span class="warn">AUFTRAG: ${esc(sc.auftrag)}</span>`);
        if (sc.options && (!needs(sc).ev || prog().ev) && (!needs(sc).rep || prog().rep)) printOptions(sc);
        term.printHTML('<span class="sys">Befehle: auftrag · akte · beleg · antwort … · hinweis · scope · status · weiter · story-hilfe</span>');
      };
      const printOptions = (sc) => {
        term.printHTML(`<span class="story">${esc(sc.optionsPrompt || sc.auftrag)}</span>`);
        sc.options.forEach(o => term.printHTML(`<span class="story">  ${o.key}) ${esc(o.t)}</span>`));
      };

      const stepDone = (sc) => {
        if (complete(sc)) {
          say('sys', '✓ Szene abgeschlossen.');
          say('Mara (Schichtleitung)', sc.debrief.replace(/^Mara: /, '').replace(/^„|“$/g, ''));
          if (ss.scene < s.scenes.length - 1) term.printHTML('<span class="good">Weiter mit: weiter</span>');
          else {
            if (!ss.done) { ss.done = true; ss.doneAt = Date.now(); }
            term.printHTML(`<span class="good">★ Mission abgeschlossen · +${s.points} Story-Punkte (keine Kurs-XP)</span>`);
            term.printHTML(`<span class="warn">${esc(tok(s.finalCleanup))}</span>`);
          }
          save(); renderCard(); renderTL();
        } else if (sc.options && !prog().opt) printOptions(sc);
      };

      const openEvidence = () => {
        const sc = scene();
        if (sc.kind !== 'real') { term.print('In dieser Szene gibt es keinen echten Beleg. Lies den Auftrag: auftrag', 'sys'); return; }
        if (prog().ev) { term.print('Beleg für diese Szene liegt bereits vor.', 'sys'); return; }
        term.slot.innerHTML = `<div class="term-paste"><b>Beleg aus deinem echten Terminal</b>${evidenceForm('sev', ss.evidence[sc.id])}<div class="row"><button class="btn go small" id="sevok">Beleg prüfen</button><button class="btn ghost small" id="sevx">Schließen</button></div><div id="sevfb"></div></div>`;
        $('#sev-cmd', root).focus();
        $('#sevx', root).onclick = () => { term.slot.innerHTML = ''; term.focus(); };
        $('#sevok', root).onclick = () => {
          const res = verifyEvidence(sc.real.spec, { command: $('#sev-cmd', root).value, output: $('#sev-out', root).value, token: state.labToken });
          $('#sevfb', root).innerHTML = resultsHTML(res);
          if (res.ok) {
            ss.evidence[sc.id] = { command: res.command, output: res.output.slice(0, 4000), at: Date.now() };
            prog().ev = true; save();
            term.slot.innerHTML = '';
            term.printHTML(`<span class="good">✓ Beleg geprüft: ${esc(res.command)}</span>`);
            if (sc.answer && !prog().ans) term.printHTML('<span class="story">Jetzt: antwort &lt;…&gt;</span>');
            stepDone(sc);
          } else {
            fail(sc);
            term.printHTML(`<span class="err">✗ Beleg reicht noch nicht. ${res.scopeViolation ? 'SCOPE-VERLETZUNG – sofort stoppen.' : 'Siehe Rückfragen im Belegfeld.'}</span>`);
          }
        };
      };

      const openReport = () => {
        const sc = scene();
        if (sc.kind !== 'report') { term.print('Der Bericht kommt in der letzten Szene.', 'sys'); return; }
        const r = ss.report || {};
        term.slot.innerHTML = `<div class="term-paste"><b>Übergabebericht SOC-0417</b>
          ${sc.reportFields.map(([k, t, ph]) => `<label for="rp-${k}">${esc(t)}</label><textarea id="rp-${k}" style="min-height:70px;font-family:var(--sans)" placeholder="${esc(ph)}">${esc(r[k] || '')}</textarea>`).join('')}
          <div class="row"><button class="btn go small" id="rpok">Bericht abgeben</button><button class="btn ghost small" id="rpx">Schließen</button><button class="btn ghost small" id="rpdl">Als Textdatei sichern</button></div><div id="rpfb"></div></div>`;
        const collect = () => Object.fromEntries(sc.reportFields.map(([k]) => [k, $('#rp-' + k, root).value.trim()]));
        $('#rpx', root).onclick = () => { ss.report = collect(); save(); term.slot.innerHTML = ''; };
        $('#rpdl', root).onclick = () => {
          const v = collect();
          const txt = `Übergabebericht SOC-0417 (Trainingsfall „${s.title}“, synthetisch)\n${new Date().toLocaleString('de-DE')}\n\n` + sc.reportFields.map(([k, t]) => `## ${t}\n${v[k]}\n`).join('\n') + '\n## Belege (aus deinem Terminal)\n' + Object.entries(ss.evidence).map(([k, e]) => `- ${k}: $ ${e.command}`).join('\n') + '\n';
          download('bericht-soc-0417.txt', new Blob([txt], { type: 'text/plain' }));
        };
        $('#rpok', root).onclick = () => {
          const v = collect(); ss.report = v;
          const short = sc.reportFields.filter(([k]) => v[k].length < 25);
          const grenzenOk = /(nicht|offen|unklar|nachbau|original|log)/i.test(v.grenzen);
          if (short.length || !grenzenOk) {
            fail(sc);
            $('#rpfb', root).innerHTML = `<div class="feedback no">${short.length ? 'Zu knapp: ' + short.map(x => x[1]).join(', ') + '. Ein Kollege muss den Bericht ohne Rückfrage verstehen.' : ''} ${!grenzenOk ? 'Grenzen: Was weißt du ausdrücklich NICHT? Und worin unterscheidet sich dein Nachbau vom Original?' : ''}</div>`;
            return;
          }
          prog().rep = true; save();
          term.slot.innerHTML = '';
          term.printHTML('<span class="good">✓ Bericht abgegeben.</span>');
          stepDone(sc);
        };
      };

      const cmds = {
        auftrag: () => { const sc = scene(); term.printHTML(`<span class="warn">AUFTRAG: ${esc(sc.auftrag)}</span>`); return { out: '', code: 0 }; },
        scope: () => ({ out: 'SCOPE: ' + scene().scope + '\n', code: 0 }),
        akte: (a, { sh: x }) => x.exec('ls -l ~/fall-0417'),
        status: () => {
          const sc = scene(), n = needs(sc), p = prog();
          const parts = [n.ev && `Beleg ${p.ev ? '✓' : 'offen'}`, n.ans && `Antwort ${p.ans ? '✓' : 'offen'}`, n.rep && `Bericht ${p.rep ? '✓' : 'offen'}`, n.opt && `Entscheidung ${p.opt ? '✓' : 'offen'}`].filter(Boolean);
          return { out: `Szene ${ss.scene + 1}/${s.scenes.length} „${sc.title}“: ${parts.join(' · ')}${complete(sc) ? ' → weiter' : ''}\n`, code: 0 };
        },
        hinweis: () => {
          const sc = scene();
          const a = ss.attempts[sc.id] || 0;
          if (ss.hintUsed[sc.id]) return { out: `HINWEIS (bereits genutzt): ${sc.hinweis}\n`, code: 0 };
          if (a < 2) return { out: '', err: `Noch kein Hinweis: erst nach 2 eigenen Versuchen in dieser Szene (${a}/2). Was hast du bisher geprüft?\n`, code: 1 };
          ss.hintUsed[sc.id] = true; save();
          return { out: `HINWEIS: ${sc.hinweis}\n`, code: 0 };
        },
        beleg: () => { openEvidence(); return { out: '', code: 0 }; },
        bericht: () => { openReport(); return { out: '', code: 0 }; },
        antwort: (args) => {
          const sc = scene(), p = prog(), n = needs(sc);
          const ans = normAnswer(args.join(' '));
          if (!ans) return { out: '', err: 'Aufruf: antwort <deine Antwort>\n', code: 1 };
          if (n.ev && !p.ev) return { out: '', err: 'Erst den Beleg aus deinem echten Terminal: beleg\n', code: 1 };
          if (n.rep && !p.rep) return { out: '', err: 'Erst den Bericht abgeben: bericht\n', code: 1 };
          if (n.ans && !p.ans) {
            const r = sc.answer.check(ans, sh, ss.evidence[sc.id]);
            ss.answers[sc.id] = ans;
            if (!r.ok) { fail(sc); return { out: '', err: (r.msg || 'Noch nicht.') + '\n', code: 1 }; }
            p.ans = true; save();
            term.printHTML('<span class="good">✓ Antwort belegt.</span>');
            stepDone(sc);
            return { out: '', code: 0 };
          }
          if (n.opt && !p.opt) {
            const o = sc.options.find(x => x.key === ans);
            if (!o) return { out: '', err: `Antworte mit ${sc.options.map(x => x.key).join(' / ')}\n`, code: 1 };
            if (!o.ok) { fail(sc); return { out: '', err: (o.why || 'Nicht ganz.') + '\n', code: 1 }; }
            p.opt = true; ss.answers[sc.id + '-opt'] = ans; save();
            term.printHTML('<span class="good">✓ Entscheidung begründet.</span>');
            stepDone(sc);
            return { out: '', code: 0 };
          }
          return { out: 'In dieser Szene ist nichts mehr zu beantworten. → weiter\n', code: 0 };
        },
        weiter: () => {
          const sc = scene();
          if (!complete(sc)) return { out: '', err: 'Die Szene ist noch nicht abgeschlossen (status zeigt, was fehlt). Mara wartet auf Belege, nicht auf Tempo.\n', code: 1 };
          if (ss.scene >= s.scenes.length - 1) return { out: 'Die Mission ist abgeschlossen. Du kannst sie jederzeit erneut lesen; Belege bleiben gespeichert.\n', code: 0 };
          ss.scene++; ss.sceneAt = Date.now(); save();
          renderCard(); renderTL(); showScene(false);
          return { out: '', code: 0 };
        },
        'story-hilfe': () => ({ out: 'Story-Befehle:\n  auftrag      aktuellen Auftrag zeigen\n  akte         Fallakte auflisten (Sandbox)\n  beleg        Ausgabe aus deinem ECHTEN Terminal einfügen und prüfen\n  antwort X    Maras Frage beantworten\n  bericht      Übergabebericht schreiben (letzte Szene)\n  hinweis      gestufter Hinweis (nach 2 Versuchen, einmal je Szene)\n  scope        erlaubtes Ziel\n  status       was fehlt noch?\n  weiter       nächste Szene (erst nach geprüftem Beleg)\nDazu alle Sandbox-Befehle (ls, cat, grep …) für die simulierte Fallakte.\n', code: 0 }),
      };
      Object.assign(sh.extra, cmds);

      function renderCard() {
        const sc = scene();
        const p = ss.progress[sc.id] || {};
        const a = ss.attempts[sc.id] || 0;
        $('#scenecard', root).innerHTML = `
          <div class="row between"><span>${sc.kind === 'real' ? '<span class="badge real">Echter Auftrag</span>' : sc.kind === 'sim' ? '<span class="badge sim">Simulation</span>' : sc.kind === 'report' ? '<span class="badge plain">Bericht</span>' : '<span class="badge plain">Entscheidung</span>'} <b>Szene ${ss.scene + 1}/${s.scenes.length}: ${esc(sc.title)}</b></span><span class="small muted">Versuche: ${a}</span></div>
          <div class="task-meta" style="margin-top:.6rem"><div><b>Lernziel</b>${esc(sc.ziel)}</div><div><b>Auftrag</b>${esc(sc.auftrag)}</div><div><b>Scope</b>${esc(sc.scope)}</div></div>
          ${sc.kind === 'real' ? `<details ${p.ev ? '' : 'open'} style="margin-top:.6rem"><summary>Anleitung für dein echtes Terminal</summary>${vorausHTML(sc.real)}${scriptBlock('Setup (Lab-Nachbau):', sc.real.setup)}<p class="small muted">Lab-Token: <code>${esc(state.labToken)}</code> · ${esc(sc.real.cleanup)}</p></details>
          <div class="row" style="margin-top:.5rem"><button class="btn go small" id="evbtn" ${p.ev ? 'disabled' : ''}>${p.ev ? '✓ Beleg geprüft' : 'Beleg einfügen (= beleg)'}</button></div>` : ''}
          ${sc.kind === 'report' ? `<div class="row" style="margin-top:.5rem"><button class="btn go small" id="rpbtn">${p.rep ? '✓ Bericht abgegeben – ansehen' : 'Bericht schreiben (= bericht)'}</button></div>` : ''}
          ${complete(sc) && ss.scene < s.scenes.length - 1 ? '<div class="row" style="margin-top:.5rem"><button class="btn primary small" id="nxbtn">Nächste Szene (= weiter)</button></div>' : ''}`;
        bindCopy($('#scenecard', root));
        const evb = $('#evbtn', root); if (evb) evb.onclick = () => { openEvidence(); term.el.scrollIntoView({ behavior: 'smooth', block: 'end' }); };
        const rpb = $('#rpbtn', root); if (rpb) rpb.onclick = () => { openReport(); term.el.scrollIntoView({ behavior: 'smooth', block: 'end' }); };
        const nxb = $('#nxbtn', root); if (nxb) nxb.onclick = () => term.run('weiter');
      }
      function renderTL() {
        $('#tl', root).innerHTML = s.scenes.map((sc, i) => `<li><span class="state ${complete(sc) ? 'done' : i === ss.scene ? '' : 'lock'}">${complete(sc) ? '✓' : i + 1}</span>${esc(sc.title)} ${sc.kind === 'real' ? '<span class="badge real">echt</span>' : ''}</li>`).join('');
      }

      term = mountTerminal($('#tw', root), sh, { tall: true, title: 'SOC-0417 · Fallakte (Sandbox) + Story', banner: 'SIMULIERTE Fallakte · echte Schritte machst du in deiner Kali-VM/Termux und belegst sie hier mit „beleg“' });
      renderCard(); renderTL();
      showScene(ss.scene > 0 || Object.keys(ss.progress).length > 0);
      if (complete(scene())) stepDone(scene());
    },
  };
};

// ---------------------------------------------------------------- Prüfung
views.pruefung = (lv = 'L1') => {
  const ex = EXAMS[lv];
  if (!ex) return { html: `<a class="back" href="#/pfad">← Lernpfad</a><div class="card warn">Für dieses Level gibt es noch keine Prüfung.</div>` };
  const pre = examPrereqs(lv);
  const attempts = state.exams[lv]?.attempts || [];
  const passed = examPassed(state, lv, ex.items.length);
  const intro = `<a class="back" href="#/level/${lv}">← Level 1</a><h1>${esc(ex.title)}</h1>
    <div class="card"><p>${esc(ex.rules)}</p><p class="small muted">${ex.items.length} Aufgaben · davon ${ex.items.filter(i => i.mandatory).length} Pflicht (★) · ${ex.items.filter(i => i.type === 'sandbox').length} Praxisaufgaben in der Sandbox</p>
    ${attempts.length ? `<p class="small">Bisherige Versuche: ${attempts.map(a => `${Math.round(a.score * 100)} % ${a.passed ? '✓' : '✗'}`).join(' · ')}</p>` : ''}</div>`;
  if (!pre.ok) {
    return { html: intro + `<div class="card warn"><b>🔒 Prüfung gesperrt.</b> Voraussetzungen: alle Lektionen gelesen und alle Pflichtübungen bestanden (inkl. echter Kali-Aufträge).
      ${pre.missLessons.length ? `<h3>Lektionen</h3><ul>${pre.missLessons.map(l => `<li><a href="#/lektion/${l.id}">${esc(l.title)}</a></li>`).join('')}</ul>` : ''}
      ${pre.missEx.length ? `<h3>Pflichtübungen</h3><ul class="list">${pre.missEx.map(e => exItem(e.id)).join('')}</ul>` : ''}</div>` };
  }
  return {
    html: intro + (passed ? `<div class="card lime"><b>✓ Bestanden.</b> Level 2 ist freigeschaltet (Inhalte in Vorbereitung). Du kannst die Prüfung zur Übung erneut ablegen – das Ergebnis „bestanden“ bleibt erhalten.</div>` : '') +
      `<button class="btn primary block" id="start">Prüfung ${attempts.length ? 'erneut ' : ''}starten</button><div id="exam"></div>`,
    mount(root) {
      $('#start', root).onclick = () => { $('#start', root).remove(); runExam(root, lv, ex); };
    },
  };
};

function runExam(root, lv, ex) {
  const seed = Date.now() & 0xffffffff;
  const items = shuffle(ex.items, seed).map((it, n) => ({ ...it, n, order: it.options ? shuffle(it.options.map((_, i) => i), seed + n) : null }));
  const answers = {};
  const shells = {};
  const box = $('#exam', root);
  box.innerHTML = `<div class="stack">${items.map((it, k) => `
    <div class="card" id="q-${it.id}">
      <div class="row between"><b>Aufgabe ${k + 1}/${items.length}${it.mandatory ? ' ★' : ''}</b><span class="badge ${it.type === 'sandbox' ? 'sim' : 'plain'}">${it.type === 'sandbox' ? 'Praxis · Sandbox' : it.type === 'input' ? 'Eingabe' : 'Auswahl'}</span></div>
      <p>${esc(it.q)}</p>
      ${it.type === 'mc' ? it.order.map(i => `<button class="opt" data-q="${it.id}" data-i="${i}">${esc(it.options[i])}</button>`).join('') : ''}
      ${it.type === 'input' ? `<input type="text" data-in="${it.id}" autocapitalize="off" autocorrect="off" spellcheck="false">` : ''}
      ${it.type === 'sandbox' ? `<div data-term="${it.id}"></div>` : ''}
    </div>`).join('')}
    <button class="btn go block" id="submit">Prüfung abgeben</button>
    <div id="result"></div></div>`;
  for (const it of items.filter(i => i.type === 'sandbox')) {
    const sh = new Shell({ fs: baseFS() });
    it.setup(sh);
    shells[it.id] = sh;
    mountTerminal($(`[data-term="${it.id}"]`, box), sh, { title: 'Prüfungs-Sandbox', banner: 'SANDBOX-SIMULATION · Prüfungsaufgabe · keine Hinweise' });
  }
  $$('.opt', box).forEach(b => b.onclick = () => {
    $$(`.opt[data-q="${b.dataset.q}"]`, box).forEach(x => x.classList.remove('sel'));
    b.classList.add('sel'); answers[b.dataset.q] = +b.dataset.i;
  });
  $('#submit', box).onclick = () => {
    $$('[data-in]', box).forEach(i => { answers[i.dataset.in] = i.value; });
    const unanswered = items.filter(it => it.type !== 'sandbox' && (answers[it.id] === undefined || answers[it.id] === ''));
    if (unanswered.length && !confirm(`${unanswered.length} Aufgabe(n) unbeantwortet. Trotzdem abgeben? Unbeantwortet zählt als falsch.`)) return;
    const results = items.map(it => {
      let ok = false;
      if (it.type === 'mc') ok = answers[it.id] === it.answer;
      else if (it.type === 'input') ok = it.accept.some(re => re.test(String(answers[it.id] || '').trim()));
      else { try { ok = !!it.check(shells[it.id]); } catch { ok = false; } }
      return { id: it.id, ok, mandatory: !!it.mandatory, topic: it.topic };
    });
    const sc = scoreAttempt(results);
    const attempt = { id: 'a-' + Date.now().toString(36) + '-' + state.deviceId, at: Date.now(), items: results, score: sc.score, passed: sc.passed };
    state.exams[lv] = state.exams[lv] || { attempts: [] };
    state.exams[lv].attempts.push(attempt);
    save();
    $$('button, input', box).forEach(x => { if (x.id !== 'submit') x.disabled = true; });
    $('#submit', box).remove();
    const wrong = results.filter(r => !r.ok);
    $('#result', box).innerHTML = `<div class="card ${sc.passed ? 'lime' : 'danger'}">
      <h2>${sc.passed ? '✓ Bestanden' : '✗ Nicht bestanden'}</h2>
      <p>${sc.correct}/${sc.total} richtig = ${Math.round(sc.score * 100)} % (nötig: ${Math.round(PASS_RATIO * 100)} %) · Pflichtaufgaben: ${sc.mandatoryOk ? 'alle korrekt' : 'nicht alle korrekt'}</p>
      ${wrong.length ? `<p>Wiederhole diese Themen (Lösungen werden nicht verraten):</p><ul>${[...new Set(wrong.map(w => w.topic + (w.mandatory ? ' ★' : '')))].map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
      ${sc.passed ? '<p>Level 2 ist damit freigeschaltet. Glückwunsch – du hast es dir erarbeitet.</p>' : '<p>Arbeite die Themen im Archiv nach und versuche es dann erneut. Die Prüfung mischt Reihenfolge und Antwortoptionen neu.</p>'}
      <a class="btn primary" href="#/${sc.passed ? 'pfad' : 'archiv'}">${sc.passed ? 'Zum Lernpfad' : 'Zum Archiv'}</a></div>`;
    $('#result', box).scrollIntoView({ behavior: 'smooth' });
  };
}

// ---------------------------------------------------------------- Archiv
views.archiv = () => {
  const seen = EXERCISES.filter(e => state.archive[e.id] || isPassed(e.id));
  return {
    html: `<a class="back" href="#/mehr">← Mehr</a><h1>Aufgabenarchiv</h1>
    <p class="muted small">Jede begonnene Aufgabe bleibt hier dauerhaft und kann ohne neue XP wiederholt werden.</p>
    ${LESSONS.map(l => {
      const xs = seen.filter(e => e.lesson === l.id);
      return xs.length ? `<div class="card tight" style="margin-bottom:.7rem"><b>${esc(l.title)}</b><ul class="list">${xs.map(e => exItem(e.id, true)).join('')}</ul></div>` : '';
    }).join('') || '<div class="card muted">Noch leer – starte deine erste Übung.</div>'}
    ${state.story.s1 ? `<div class="card tight"><b>Story</b><ul class="list"><li><a href="#/story/s1"><span class="state ${state.story.s1.done ? 'done' : ''}">${state.story.s1.done ? '✓' : '▶'}</span><span class="grow"><span class="t">${esc(STORY.s1.title)}</span><span class="s">Belege und Bericht bleiben gespeichert</span></span></a></li></ul></div>` : ''}`,
  };
};

// ---------------------------------------------------------------- Werkzeuge
views.werkzeuge = () => ({
  html: `<a class="back" href="#/mehr">← Mehr</a><h1>Kali-Werkzeuge im Lernpfad</h1>
  <p class="muted small">Geordnet nach Level. Verfügbarkeit immer selbst prüfen: <code>command -v NAME</code>, <code>NAME --version</code>, <code>NAME --help</code>. Nichts unbedacht installieren.</p>
  <div class="stack">${TOOLS.map(t => `<div class="card">
    <div class="row between"><h3 style="margin:0">${esc(t.name)}</h3><span><span class="badge plain">${esc(t.level)}</span> <span class="badge ${t.status.startsWith('aktiv') ? 'ok' : 'plain'}">${esc(t.status)}</span></span></div>
    <p>${esc(t.zweck)}</p>
    <div class="task-meta"><div><b>Voraussetzung</b>${esc(t.voraus)}</div><div><b>PC / Handy rootless</b>${esc(t.pc)} / ${esc(t.rootless)}</div><div><b>Scope-Regel</b>${esc(t.scope)}</div><div><b>Arbeitsablauf</b><code>${esc(t.workflow)}</code></div><div><b>Prüfbeleg</b>${esc(t.beleg)}</div></div>
  </div>`).join('')}</div>`,
});

// ---------------------------------------------------------------- Mehr / Konto / Daten
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; });

views.mehr = () => {
  const st = syncStatus();
  const backups = listBackups();
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  return {
    html: `<h1>Mehr</h1>
    <div class="stack">
      <div class="card"><ul class="list">
        <li><a href="#/archiv"><span class="state">≡</span><span class="grow"><span class="t">Aufgabenarchiv</span><span class="s">Alle Aufgaben wiederholen (ohne XP)</span></span></a></li>
        <li><a href="#/werkzeuge"><span class="state">⚒</span><span class="grow"><span class="t">Werkzeuge</span><span class="s">Kali-Tools: Zweck, Scope, Beleg</span></span></a></li>
        <li><a href="#/pruefung/L1"><span class="state">★</span><span class="grow"><span class="t">Prüfungen</span><span class="s">Level 1</span></span></a></li>
        <li><button class="item" id="loc" style="width:100%;background:none;border:0;text-align:left;cursor:pointer"><span class="state">📍</span><span class="grow"><span class="t">Lernort ändern</span><span class="s">${esc(LOCATIONS[state.location]?.label || 'nicht gewählt')}</span></span></button></li>
      </ul></div>

      <div class="card">
        <h2>Synchronisierung PC ↔ Handy</h2>
        <p class="small"><span class="dot ${st.state === 'ok' ? 'ok' : st.state === 'err' ? 'err' : 'warn'}"></span> ${esc(st.msg)}</p>
        ${!syncConfigured() ? `<p class="small muted">Noch nicht eingerichtet. Anleitung: <code>docs/SUPABASE-SETUP.md</code> im Projekt. Bis dahin: Lernstand per Export/Import übertragen.</p>` :
        st.user ? `<p class="small">Angemeldet als <b>${esc(st.user.email)}</b></p><div class="row"><button class="btn small" id="syncnow">Jetzt synchronisieren</button><button class="btn small ghost" id="logout">Abmelden</button></div>` :
          `<label for="em">E-Mail</label><input type="email" id="em" autocomplete="username"><label for="pw">Passwort</label><input type="password" id="pw" autocomplete="current-password">
           <div class="row" style="margin-top:.6rem"><button class="btn primary" id="login">Anmelden</button><button class="btn ghost" id="signup">Konto anlegen</button></div><div id="authfb"></div>`}
        <p class="honest">Beim Zusammenführen geht nichts verloren: Bestandenes bleibt bestanden, Archiv und Belege werden vereinigt. Prüfungen gelten nur aus vollständig nachvollziehbaren Versuchen. Vor jeder Zusammenführung wird lokal gesichert.</p>
      </div>

      <div class="card stack">
        <h2>Daten</h2>
        <div class="row"><button class="btn" id="exp">Lernstand sichern (JSON)</button><label class="btn" style="margin:0">Lernstand importieren<input type="file" id="imp" accept="application/json,.json" hidden></label></div>
        <p class="small muted">Import führt zusammen (nichts wird überschrieben). Vorher wird automatisch gesichert.</p>
        ${backups.length ? `<details><summary>Lokale Sicherungen (${backups.length})</summary><ul class="list">${backups.map((b, i) => `<li class="item"><span class="grow small">${new Date(b.at).toLocaleString('de-DE')} – ${esc(b.reason)}</span><button class="btn small" data-restore="${i}">Wiederherstellen</button></li>`).join('')}</ul></details>` : ''}
      </div>

      <div class="card stack">
        <h2>App installieren & weitergeben</h2>
        ${standalone ? '<p class="small">✓ Läuft als installierte App.</p>' : `<button class="btn primary" id="install">App installieren</button>
        <details><summary>Installation klappt nicht?</summary><ul class="small">
          <li><b>Chrome (Android):</b> Menü ⋮ → „App installieren“ bzw. „Zum Startbildschirm hinzufügen“.</li>
          <li><b>Samsung Internet:</b> Menü ≡ → „Seite hinzufügen zu“ → „Startbildschirm“.</li>
          <li><b>Chrome/Edge (PC):</b> Installieren-Symbol rechts in der Adressleiste.</li>
          <li>Voraussetzung: Die App wird über https (oder http://127.0.0.1) ausgeliefert.</li></ul></details>`}
        <hr>
        <b>Ganze App herunterladen (ZIP)</b>
        <label class="check"><input type="checkbox" id="withstate"> Meinen Lernstand als Momentaufnahme beifügen (persönlich – nicht öffentlich teilen)</label>
        <button class="btn" id="zip">App als ZIP herunterladen</button>
        <p class="small muted">Ohne Haken: neutrale Version ohne Lernstand und ohne Sync-Zugangsdaten. Version ${esc(self.KLY_VERSION || '')}.</p>
      </div>

      <div class="card">
        <h2>KI-Coach</h2>
        <p class="small muted">Noch nicht verbunden. Es werden keine Daten an eine KI übertragen. Hinweise in Übungen sind fest hinterlegt und gestuft (nach 2 eigenen Versuchen, höchstens einer).</p>
      </div>

      <div class="card">
        <h2>Ehrlich: Was ist echt, was simuliert?</h2>
        <ul class="small">
          <li><span class="badge sim">Simulation</span> Sandbox-Terminal, Fallakten und Prüfungs-Praxis: synthetische Dateien, keine echte Shell, kein Netzwerk.</li>
          <li><span class="badge real">Echt</span> Aufträge, die du in deiner Kali-VM bzw. Termux ausführst. Die App prüft die eingefügte Ausgabe nach festen Kriterien – sie startet selbst nichts auf deinem Gerät.</li>
          <li>Level 2–10: Lehrplan steht, Inhalte folgen.</li>
        </ul>
      </div>

      <div class="card danger">
        <h2>Zurücksetzen</h2>
        <p class="small">Löscht den lokalen Lernstand auf diesem Gerät. Vorher wird automatisch eine Sicherungsdatei heruntergeladen. Synchronisierte Daten im Konto bleiben erhalten und würden bei der nächsten Anmeldung wieder zusammengeführt.</p>
        <label for="rst">Zum Bestätigen ZURÜCKSETZEN eintippen</label><input type="text" id="rst" autocapitalize="characters">
        <button class="btn danger" id="reset" style="margin-top:.5rem">Lokalen Lernstand zurücksetzen</button>
      </div>
      <p class="small dim">Kali Level Up ${esc(self.KLY_VERSION || '')} · Geräte-ID ${esc(state.deviceId)} · Lab-Token ${esc(state.labToken)}</p>
    </div>`,
    mount(root) {
      $('#loc', root).onclick = () => locationModal(true);
      $('#exp', root).onclick = () => exportStateJSON(state);
      $('#imp', root).onchange = async (ev) => {
        const f = ev.target.files[0]; if (!f) return;
        try {
          const incoming = await readStateFile(f);
          pushBackup(state, 'vor Import');
          applyState(mergeStates(state, incoming));
          toast('Lernstand zusammengeführt.');
        } catch (e) { toast(e.message, 4000); }
      };
      $$('[data-restore]', root).forEach(b => b.onclick = () => {
        const bk = listBackups()[+b.dataset.restore];
        if (!bk || !confirm('Diese Sicherung mit dem aktuellen Stand zusammenführen?')) return;
        pushBackup(state, 'vor Wiederherstellung');
        applyState(mergeStates(state, bk.state));
        toast('Sicherung zusammengeführt.');
      });
      const ins = $('#install', root);
      if (ins) ins.onclick = async () => {
        if (deferredInstall) { deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; }
        else toast('Der Browser bietet die Installation gerade nicht direkt an – siehe „Installation klappt nicht?“.', 4500);
      };
      $('#zip', root).onclick = async () => {
        const withState = $('#withstate', root).checked;
        if (withState && !confirm('Der Download enthält deinen persönlichen Lernstand. Fortfahren?')) return;
        try { const r = await exportApp({ includeState: withState, state }); toast(r.missing.length ? 'ZIP erstellt (einige Dateien fehlten, siehe WEITERGABE.txt).' : 'ZIP erstellt.'); }
        catch (e) { toast(e.message, 4000); }
      };
      $('#reset', root).onclick = () => {
        if ($('#rst', root).value.trim() !== 'ZURÜCKSETZEN') { toast('Bitte ZURÜCKSETZEN exakt eintippen.'); return; }
        exportStateJSON(state);
        pushBackup(state, 'vor Zurücksetzen');
        const fresh = defaultState();
        fresh.labToken = state.labToken; fresh.deviceId = state.deviceId;
        applyState(fresh);
        toast('Zurückgesetzt. Sicherung wurde heruntergeladen und lokal abgelegt.');
      };
      const login = $('#login', root);
      if (login) {
        const doAuth = async (fn) => {
          const fb = $('#authfb', root);
          try { await fn($('#em', root).value.trim(), $('#pw', root).value); fb.innerHTML = '<div class="feedback ok">OK.</div>'; setTimeout(render, 600); }
          catch (e) { fb.innerHTML = `<div class="feedback no">${esc(e.message)}</div>`; }
        };
        login.onclick = () => doAuth(signIn);
        $('#signup', root).onclick = () => doAuth(signUp);
      }
      const sn = $('#syncnow', root); if (sn) sn.onclick = () => syncNow(getState, applyState);
      const lo = $('#logout', root); if (lo) lo.onclick = async () => { await signOut(); render(); };
    },
  };
};

// ---------------------------------------------------------------- Start
window.addEventListener('hashchange', render);
onSyncStatus(() => renderTop());
render();
locationModal(false);
initSync(getState, applyState);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => { /* offline-Modus nicht verfügbar */ });
}
