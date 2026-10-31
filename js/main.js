// Kali Level Up – App
import { Shell, baseFS, HOME } from './shell.js';
import { mountTerminal } from './terminal-ui.js';
import { verifyEvidence, normAnswer } from './verify.js';
import {
  loadState, saveState, defaultState, today, pushBackup, listBackups, mergeStates,
  scoreAttempt, examPassed, computeXp, PASS_RATIO, streak, markActivity,
} from './state.js';
import { flagFor, normFlag } from './flags.js';
import { ROOMS, BADGES } from './content/rooms.js';
import { PORTSWIGGER } from './content/web.js';
import { NETZ_PFAD } from './content/netz.js';
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
const ROOM = Object.fromEntries(ROOMS.map(r => [r.id, r]));

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

// Bestätigung ohne confirm(): erster Tipp fragt nach, zweiter Tipp (innerhalb 6 s) führt aus.
function twoTap(btn, msg) {
  if (btn.dataset.armed === '1') { btn.dataset.armed = ''; btn.textContent = btn.dataset.label; return true; }
  btn.dataset.label = btn.textContent; btn.dataset.armed = '1'; btn.textContent = msg + ' – nochmal tippen';
  setTimeout(() => { if (btn.dataset.armed === '1') { btn.dataset.armed = ''; btn.textContent = btn.dataset.label; } }, 6000);
  return false;
}
const PREVIEW = !!self.KLY_PREVIEW;

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

// Ab 1.2.0: Nichts ist hinter Prüfungen gesperrt. Lernen durch Tun – Prüfungen sind freiwillig (Abzeichen).
function levelUnlocked() { return true; }

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
  // Erst hacken: offene Räume zuerst. Lektionen sind Nachschlagewerk, wenn du feststeckst.
  for (const r of ROOMS) if (!roomDone(r.id) && !roomLock(r).length) return { kind: 'room', title: 'Raum: ' + r.title, href: `#/raum/${r.id}` };
  for (const l of LESSONS) {
    if (!lessonDone(l.id)) return { kind: 'lesson', id: l.id, title: l.title, href: `#/lektion/${l.id}` };
    for (const eid of l.exercises) {
      const e = EX[eid];
      if (e.required && !isPassed(eid)) return { kind: 'ex', id: eid, title: e.title, href: `#/uebung/${eid}`, e };
    }
  }
  const s = STORY.s1;
  if (!state.story.s1?.done) return { kind: 'story', title: s.title, href: '#/story/s1' };
  return { kind: 'done', title: 'Alle Räume geknackt – trainiere extern weiter, neue Räume folgen', href: '#/pfad' };
}


// Empfohlene externe Übungsplattformen (alle legal, ausdrücklich zum Üben gedacht)
const EXTERNAL = [
  { name: 'OverTheWire – Bandit', url: 'https://overthewire.org/wargames/bandit/', why: 'Linux als Spiel: per SSH aus deinem Kali-Terminal von Level zu Level. Perfekter Start.', free: true },
  { name: 'TryHackMe', url: 'https://tryhackme.com/', why: 'Geführte Räume im Browser oder per VPN aus Kali – z. B. „Pre Security“, dann „Jr Penetration Tester“.', free: false },
  { name: 'PortSwigger Web Security Academy', url: 'https://portswigger.net/web-security', why: 'Die beste kostenlose Web-Hacking-Schule, mit Labs für Burp Suite (passt zu Level 3).', free: true },
  { name: 'Hack The Box – Starting Point', url: 'https://www.hackthebox.com/', why: 'Echte Übungsmaschinen per VPN aus Kali – wenn TryHackMe zu leicht wird.', free: false },
];

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
  const items = [['heute', '⌂', 'Start'], ['pfad', '◆', 'Lernen'], ['terminal', '>_', 'Terminal'], ['mehr', '≡', 'Mehr']];
  const map = { lektion: 'pfad', uebung: 'pfad', level: 'pfad', pruefung: 'pfad', archiv: 'mehr', werkzeuge: 'mehr', profil: 'mehr', raum: 'pfad', raeume: 'pfad', story: 'pfad' };
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
  main.classList.toggle('wide', !!r.wide);
  if (r.mount) cleanup = r.mount(main) || null;
  if (!r.keepScroll) window.scrollTo(0, 0);
}

// ---------------------------------------------------------------- Heute
// Gesamtpunkte: eine einzige Währung (Räume/Wargames + Übungen + Story)
function totalPoints() { return roomPointsTotal() + computeXp(state, EX) + (state.story.s1?.done ? STORY.s1.points : 0); }
// Wo spielbar? sandbox = überall (Browser), target = PC (Docker) oder Handy (Termux), ssh/ext = nur PC
const onPhone = (r) => r.machine.kind === 'sandbox' || r.machine.kind === 'target';
const onPC = (r) => r.machine.kind !== 'sandbox';
function lastActivity(r) {
  const rs = state.rooms[r.id]; if (!rs) return 0;
  return Math.max(rs.startedAt || 0, ...Object.values(rs.answers || {}).map(a => a.at || 0), ...Object.values(rs.answers || {}).map(a => (a.attempts ? 1 : 0)));
}
function continueRoom() {
  const open = ROOMS.filter(r => !roomDone(r.id) && lastActivity(r) > 0);
  open.sort((a, b) => lastActivity(b) - lastActivity(a));
  return open[0] || null;
}
function miniRoom(r, phone = false) {
  const pct = roomPct(r.id);
  return `<li><a href="#/raum/${r.id}"><span class="state ${roomDone(r.id) ? 'done' : ''}">${roomDone(r.id) ? '✓' : pct ? pct + '%' : '▶'}</span>
    <span class="grow"><span class="t">${esc(r.title)}</span><span class="s">${r.type === 'wargame' ? '🎮 Wargame' : 'Level ' + LEVELS.find(l => l.id === r.level).n + ' · ' + esc(LEVELS.find(l => l.id === r.level).title)}${phone && r.machine.kind === 'target' ? ' · mit Termux' : ''}</span></span></a></li>`;
}

views.heute = () => {
  const loc = state.location || 'both';
  const cont = continueRoom();
  const nx = nextStep();
  const done = ROOMS.filter(r => roomDone(r.id)).length;
  const rank = { sandbox: 0, ssh: 1, ext: 1, target: 2 }; // zuerst, was ohne Zusatz-Installation läuft
  const pick = (pred, phone) => ROOMS.filter(r => pred(r) && !roomDone(r.id) && r !== cont)
    .sort((x, y) => (phone ? rank[x.machine.kind] - rank[y.machine.kind] : (x.machine.kind === 'target') - (y.machine.kind === 'target')))
    .slice(0, 3);
  const phoneList = pick(onPhone, true), pcList = pick(onPC, false);
  const section = (icon, title, list) => list.length ? `<div class="card"><h3 style="margin:0 0 .3rem">${icon} ${title}</h3><ul class="list">${list.map(r => miniRoom(r, icon === '📱')).join('')}</ul></div>` : '';
  return {
    html: `
    <section class="stack">
      ${PREVIEW ? `<div class="card warn small"><b>Handy-Vorschau.</b> Lernstand bleibt in diesem Browser, Sync und Downloads sind hier aus.</div>` : ''}
      <div class="card violet">
        <div class="row between"><span class="badge real">Ziel: eJPT</span><a class="small" href="#/profil" style="color:inherit">${earnedBadges().length} Abzeichen →</a></div>
        <h1 style="margin:.5rem 0 .3rem">Hallo ${esc(state.profile.name)}!</h1>
        <div class="bar" aria-label="${done} von ${ROOMS.length} geknackt"><i style="width:${Math.round(done / ROOMS.length * 100)}%"></i></div>
        <div class="kpis" style="grid-template-columns:repeat(3,1fr);margin-top:.6rem"><div class="kpi"><b>${totalPoints()}</b><span>Punkte</span></div><div class="kpi"><b>${done}/${ROOMS.length}</b><span>geknackt</span></div><div class="kpi"><b>${streak(state)}🔥</b><span>Tage in Folge</span></div></div>
      </div>

      ${!cont && (loc === 'pc' ? pcList : phoneList)[0] ? (() => { const f = (loc === 'pc' ? pcList : phoneList)[0]; return `<a class="card lime" href="#/raum/${f.id}" style="display:block;text-decoration:none;color:inherit">
        <span class="badge real">Los geht’s</span>
        <h2 style="margin:.4rem 0 .2rem">${esc(f.title)}</h2>
        <span class="small muted">${esc(f.desc)} →</span>
      </a>`; })() : cont ? `<a class="card lime" href="#/raum/${cont.id}" style="display:block;text-decoration:none;color:inherit">
        <span class="badge real">Weitermachen</span>
        <h2 style="margin:.4rem 0 .2rem">${esc(cont.title)}</h2>
        <div class="bar"><i style="width:${roomPct(cont.id)}%"></i></div>
        <span class="small muted">${roomPct(cont.id)} % geschafft · ${cont.machine.kind === 'sandbox' ? '📱 geht überall' : '🖥️ Kali-VM'} →</span>
      </a>` : `<a class="card lime" href="${nx.href}" style="display:block;text-decoration:none;color:inherit">
        <span class="badge real">Los geht’s</span>
        <h2 style="margin:.4rem 0 .2rem">${esc(nx.title)}</h2>
        <span class="small muted">Feststecken ist normal – jede Frage hat Tipps →</span>
      </a>`}

      ${loc === 'pc' ? section('🖥️', 'Jetzt am PC', pcList) + section('📱', 'Für unterwegs', phoneList) : loc === 'phone' ? section('📱', 'Jetzt am Handy', phoneList) + section('🖥️', 'Wenn du am PC bist', pcList) : section('📱', 'Am Handy', phoneList) + section('🖥️', 'Am PC (Kali)', pcList)}

      <a class="card" href="#/pfad" style="display:block;text-decoration:none;color:inherit"><b>Alles ansehen →</b><br><span class="small muted">Alle Wargames, Räume und Level bis zum eJPT</span></a>

      <details class="card">
        <summary><b>Außerhalb der App weitertrainieren</b></summary>
        <ul class="list" style="margin-top:.4rem">
          ${EXTERNAL.map(x => `<li><a href="${x.url}" target="_blank" rel="noopener noreferrer"><span class="state">↗</span><span class="grow"><span class="t">${esc(x.name)}</span><span class="s">${esc(x.why)}</span></span><span class="badge ${x.free ? 'ok' : 'plain'}">${x.free ? 'gratis' : 'teils gratis'}</span></a></li>`).join('')}
        </ul>
        <p class="small muted">Alles legale Übungsumgebungen. Hacke nur Ziele, die dir gehören oder für die du ausdrücklich eine Erlaubnis hast.</p>
      </details>
    </section>`,
  };
};

function exItem(id, showRepeat) {
  const e = EX[id]; if (!e) return '';
  const done = isPassed(id);
  const locked = !lessonDone(e.lesson);
  return `<li><a href="#/uebung/${id}">
    <span class="state ${done ? 'done' : locked ? 'lock' : ''}">${done ? '✓' : locked ? '🔒' : ''}</span>
    <span class="grow"><span class="t">${esc(e.title)}</span><span class="s">${kindLabel(e)}${done && showRepeat ? ' · Wiederholung ohne Punkte' : ''}${locked ? ' · erst Lektion lesen' : ''}</span></span>
    ${e.kind === 'real' ? '<span class="badge real">echt</span>' : '<span class="badge sim">sim</span>'}
  </a></li>`;
}
function kindLabel(e) {
  return { sandbox: 'Sandbox-Übung', real: 'Echter Kali-Auftrag', review: 'Wiederholungsrunde', drill: 'Kurz-Drill (optional)' }[e.kind] + (e.required ? '' : ' · optional');
}

// ---------------------------------------------------------------- Lernpfad
views.pfad = () => {
  const withRooms = LEVELS.filter(l => l.id === 'L1' || ROOMS.some(r => r.level === l.id && r.type !== 'wargame'));
  const later = LEVELS.filter(l => !withRooms.includes(l));
  return {
    html: `<h1>Lernen</h1>
    <p class="muted small">Vom Linux-Anfänger bis zum <b>eJPT</b>. Alles ist offen – fang an, wo du Lust hast. 📱 = geht am Handy, 🖥️ = Kali-VM.</p>
    <h2 style="margin-top:1rem">🎮 Wargames</h2>
    <p class="small muted">Linux als Spiel: Jede Lösung öffnet das nächste Level.</p>
    ${ROOMS.filter(r => r.type === 'wargame').map(roomCard).join('')}
    ${withRooms.map(l => `<h2 style="margin-top:1.2rem">Level ${l.n} · ${esc(l.title)}</h2>
      <p class="small muted" style="margin-top:-.2rem">${esc(l.goal)}</p>
      ${ROOMS.filter(r => r.level === l.id && r.type !== 'wargame').map(roomCard).join('')}
      ${l.id === 'L1' ? `<div class="grid two">
        <a class="card tight" href="#/level/L1" style="display:block;text-decoration:none;color:inherit"><b>📖 Linux-Spickzettel</b><br><span class="small muted">${LESSONS.length} Kapitel zum Nachschlagen + Übungen</span></a>
        <a class="card tight ${state.story.s1?.done ? 'lime' : ''}" href="#/story/s1" style="display:block;text-decoration:none;color:inherit"><b>🎬 ${esc(STORY.s1.title)}</b><br><span class="small muted">Story-Mission${storyLocked(STORY.s1).length ? ' · braucht ein paar Übungen' : ''}</span></a>
      </div>` : ''}
      ${l.id === 'L2' ? `<a class="card tight" href="#/level/L2" style="display:block;text-decoration:none;color:inherit"><b>🎯 Lernpfad: echte Scans ohne Abo</b><br><span class="small muted">Eigene Zielmaschine + kostenlose Hack-The-Box-Maschinen</span></a>` : ''}
      ${l.id === 'L3' ? `<a class="card tight" href="#/level/L3" style="display:block;text-decoration:none;color:inherit"><b>🌐 Lernpfad PortSwigger</b><br><span class="small muted">Kostenlose Web-Hacking-Labs, in sinnvoller Reihenfolge</span></a>` : ''}`).join('')}
    <h2 style="margin-top:1.2rem">Demnächst</h2>
    <ul class="list card">${later.map(l => `<li><a href="#/level/${l.id}"><span class="state">${l.n}</span><span class="grow"><span class="t">${esc(l.title)}</span><span class="s">${esc(l.goal)}</span></span></a></li>`).join('')}</ul>`,
  };
};
views.raeume = views.pfad;

views.level = (id) => {
  const l = LEVELS.find(x => x.id === id) || LEVELS[0];
  const unlocked = levelUnlocked(l.id);
  if (l.id !== 'L1') {
    return {
      html: `<a class="back" href="#/pfad">← Lernen</a>
      <h1>Level ${l.n} – ${esc(l.title)}</h1>
      <div class="card">${ROOMS.some(r => r.level === l.id) ? '<b>Los geht’s</b> – die Räume unten sind spielbar, weitere folgen.' : '<b>In Vorbereitung</b> – neue Räume für dieses Level kommen nach und nach. Bis dahin: passende Räume auf den Plattformen unter „Heute → Außerhalb der App“.'}</div>
      <div class="card stack"><p>${esc(l.goal)}</p>
        <h3>Geplante Themen</h3><ul>${l.topics.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
        <h3>Werkzeuge</h3><ul>${l.tools.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
        ${ROOMS.some(r => r.level === l.id) ? `<h3>Räume (bereits verfügbar)</h3>${ROOMS.filter(r => r.level === l.id).map(roomCard).join('')}` : ''}
        ${l.id === 'L2' ? `<h3>Lernpfad: echte Scans ohne Abo</h3><p class="small muted">Erst die Simulation, dann echt: deine eigene Zielmaschine und kostenlose Übungsmaschinen (Gratis-Konto, kein Abo).</p>
          <ol class="small" style="padding-left:1.2rem">${NETZ_PFAD.map(x => `<li style="margin:.35rem 0"><a href="${x.url}" ${x.url.startsWith('http') ? 'target="_blank" rel="noopener noreferrer"' : ''}><b>${esc(x.t)}</b></a><br><span class="muted">${esc(x.why)}</span></li>`).join('')}</ol>` : ''}
        ${l.id === 'L3' ? `<h3>Lernpfad: PortSwigger Web Security Academy</h3><p class="small muted">Kostenlos, mit Erklärungen und Online-Labs, die genau zum Üben gedacht sind. Kostenloses Konto nötig. Reihenfolge empfohlen:</p>
          <ol class="small" style="padding-left:1.2rem">${PORTSWIGGER.map(x => `<li style="margin:.35rem 0"><a href="${x.url}" target="_blank" rel="noopener noreferrer"><b>${esc(x.t)}</b></a><br><span class="muted">${esc(x.why)}</span></li>`).join('')}</ol>` : ''}
        <p class="honest">Ehrlicher Stand: ${ROOMS.some(r => r.level === l.id) ? 'Erste Räume sind da, weitere folgen.' : 'Für dieses Level steht der Lehrplan, Räume folgen.'}</p></div>`,
    };
  }
  const pre = examPrereqs();
  return {
    html: `<a class="back" href="#/pfad">← Lernen</a>
    <h1>📖 Linux-Spickzettel</h1>
    <p class="muted">${esc(l.goal)}</p>
    <div class="stack">${LESSONS.map((ls, i) => `
      <div class="card tight">
        <a href="#/lektion/${ls.id}" class="row" style="text-decoration:none;color:inherit">
          <span class="state ${lessonDone(ls.id) ? 'done' : ''}">${lessonDone(ls.id) ? '✓' : i + 1}</span>
          <span class="grow"><b>${esc(ls.title)}</b><br><span class="small muted">Lektion · ca. ${ls.minutes} min</span></span>
        </a>
        <ul class="list" style="margin-left:2.2rem">${ls.exercises.map(id => exItem(id)).join('')}</ul>
      </div>`).join('')}
      ${ROOMS.filter(r => r.level === 'L1').map(roomCard).join('')}
      <a class="card ${state.story.s1?.done ? 'lime' : ''}" href="#/story/s1" style="display:block;text-decoration:none;color:inherit"><span class="badge sim">Story</span> <b>${esc(STORY.s1.title)}</b><br><span class="small muted">Story-Mission mit echten Kali-Schritten</span></a>
      <a class="card ${pre.ok ? 'violet' : ''}" href="#/pruefung/L1" style="display:block;text-decoration:none;color:inherit"><b>Meisterprüfung Linux (freiwillig)</b><br><span class="small muted">${pre.ok ? 'Bereit' : 'Möglich nach allen Lektionen und Pflichtübungen'} · bringt ein Abzeichen, sperrt nichts</span></a>
    </div>`,
  };
};

// ---------------------------------------------------------------- Lektion
views.lektion = (id) => {
  const l = LESSON[id];
  if (!l) return views.pfad();
  const idx = LESSONS.indexOf(l);
  return {
    html: `<a class="back" href="#/level/L1">← Spickzettel</a>
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
    <div class="row">${isReal ? '<span class="badge real">Echter Auftrag · deine Kali-VM / Termux</span>' : '<span class="badge sim">Sandbox-Simulation</span>'}<span class="badge plain">${esc(kindLabel(e))}</span>${repeat ? '<span class="badge ok">bestanden · Wiederholung ohne Punkte</span>' : `<span class="badge plain">${e.xp} Punkte</span>`}</div>
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
        markActivity(state);
        if (first) { st.passedAt = Date.now(); st.knobelOk = true; }
        else st.repeats = (st.repeats || 0) + 1;
        save();
        const n = e.nach;
        $('#debrief', root).innerHTML = `<div class="card lime debrief"><h3>Nachbesprechung</h3><dl>
          <dt>Beobachtung</dt><dd>${esc(n.beobachtung)}</dd><dt>Schlussfolgerung</dt><dd>${esc(n.schluss)}</dd>
          <dt>Grenzen</dt><dd>${esc(n.grenzen)}</dd><dt>Möglicher nächster Test</dt><dd>${esc(n.naechster)}</dd></dl>
          <p class="small">${first ? `✓ Bestanden · +${e.xp} Punkte` : '✓ Wiederholung erfolgreich (ohne Punkte)'}${run.hintShown ? ' · mit Hinweis' : ''}</p>
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
    <p class="honest">Die Fallakte im Terminal ist SIMULIERT; Szenen mit „echt“ führst du in deiner eigenen Kali-VM/Termux aus und belegst sie hier.</p>`,
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
            term.printHTML(`<span class="good">★ Mission abgeschlossen · +${s.points} Punkte</span>`);
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
            prog().ev = true; markActivity(state); save();
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
  if (!ex) return { html: `<a class="back" href="#/pfad">← Lernen</a><div class="card warn">Für dieses Level gibt es noch keine Prüfung.</div>` };
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
    if (unanswered.length && !twoTap($('#submit', box), `${unanswered.length} unbeantwortet (zählt als falsch)`)) return;
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
    markActivity(state);
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
    <p class="muted small">Jede begonnene Aufgabe bleibt hier dauerhaft und kann ohne neue Punkte wiederholt werden.</p>
    ${LESSONS.map(l => {
      const xs = seen.filter(e => e.lesson === l.id);
      return xs.length ? `<div class="card tight" style="margin-bottom:.7rem"><b>${esc(l.title)}</b><ul class="list">${xs.map(e => exItem(e.id, true)).join('')}</ul></div>` : '';
    }).join('') || '<div class="card muted">Noch leer – starte deine erste Übung.</div>'}
    ${state.story.s1 ? `<div class="card tight"><b>Story</b><ul class="list"><li><a href="#/story/s1"><span class="state ${state.story.s1.done ? 'done' : ''}">${state.story.s1.done ? '✓' : '▶'}</span><span class="grow"><span class="t">${esc(STORY.s1.title)}</span><span class="s">Belege und Bericht bleiben gespeichert</span></span></a></li></ul></div>` : ''}`,
  };
};

// ---------------------------------------------------------------- Werkzeuge
function myToolbox() {
  const used = new Map();
  for (const r of ROOMS) {
    const solved = allQs(r).filter(x => qOk(r.id, x.key) && x.q.type !== 'confirm' && x.q.type !== 'mc').length;
    if (!solved) continue;
    for (const t of r.tools) { const e = used.get(t) || []; e.push(r); used.set(t, e); }
  }
  return [...used.entries()];
}

views.werkzeuge = () => ({
  html: `<a class="back" href="#/mehr">← Mehr</a><h1>Kali-Werkzeuge</h1>
  <div class="card lime"><h3>Dein Werkzeugkasten</h3>
    ${myToolbox().length ? `<p class="small muted">Diese Werkzeuge hast du schon wirklich benutzt, um Flags oder Antworten zu finden:</p><ul class="list">${myToolbox().map(([t, rs]) => `<li><span class="state done">✓</span><span class="grow"><span class="t"><code>${esc(t)}</code></span><span class="s">in ${rs.map(r => `<a href="#/raum/${r.id}">${esc(r.title)}</a>`).join(', ')}</span></span></li>`).join('')}</ul>` : '<p class="small">Noch leer – knack deinen ersten Raum, dann füllt sich der Kasten.</p>'}
    <p class="small muted">Tipp: Lege dir in Kali eine eigene Notizdatei an (<code>nano ~/notizen/werkzeuge.md</code>) und schreib zu jedem Werkzeug den Befehl auf, der bei dir funktioniert hat. Eigene Notizen merkt man sich viel besser.</p>
  </div>
  <h2 style="margin-top:1rem">Alle Werkzeuge im Lernpfad</h2>
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
        <li><a href="#/profil"><span class="state">★</span><span class="grow"><span class="t">Profil & Abzeichen</span><span class="s">${earnedBadges().length} von ${BADGES.length} · Serie ${streak(state)} Tage</span></span></a></li>
        <li><a href="#/archiv"><span class="state">≡</span><span class="grow"><span class="t">Aufgabenarchiv</span><span class="s">Alle Aufgaben wiederholen (ohne Punkte)</span></span></a></li>
        <li><a href="#/werkzeuge"><span class="state">⚒</span><span class="grow"><span class="t">Werkzeuge</span><span class="s">Kali-Tools: Zweck, Scope, Beleg</span></span></a></li>
        <li><a href="#/pruefung/L1"><span class="state">★</span><span class="grow"><span class="t">Prüfungen (freiwillig)</span><span class="s">Meisterprüfung Linux</span></span></a></li>
        <li><button class="item" id="loc" style="width:100%;background:none;border:0;text-align:left;cursor:pointer"><span class="state">📍</span><span class="grow"><span class="t">Lernort ändern</span><span class="s">${esc(LOCATIONS[state.location]?.label || 'nicht gewählt')}</span></span></button></li>
      </ul></div>

      <div class="card">
        <h2>Synchronisierung PC ↔ Handy</h2>
        <p class="small" id="syncline">${syncLine(st)}</p>
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
        <div class="row"><button class="btn" id="copystate">Lernstand als Text kopieren</button></div>
        <details><summary>Lernstand aus Text übernehmen</summary>
          <textarea id="pastestate" placeholder="Kopierten Lernstand hier einfügen"></textarea>
          <button class="btn" id="importtext" style="margin-top:.5rem">Zusammenführen</button>
        </details>
        <p class="small muted">Damit nimmst du deinen Stand ohne Datei mit, z. B. von der Handy-Vorschau in die Cloudflare-Version: kopieren, dort einfügen.</p>
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
      $('#copystate', root).onclick = async () => {
        const txt = JSON.stringify({ ...state, kind: 'kali-level-up-lernstand', exportedAt: Date.now() });
        try { await navigator.clipboard.writeText(txt); toast('Lernstand kopiert. In der anderen Version unter „Lernstand aus Text übernehmen“ einfügen.', 4500); }
        catch { const t = $('#pastestate', root); t.closest('details').open = true; t.value = txt; t.select(); toast('Kopieren blockiert – Text ist markiert, bitte manuell kopieren.', 4500); }
      };
      $('#importtext', root).onclick = () => {
        try {
          const obj = JSON.parse($('#pastestate', root).value);
          if (!obj || !obj.schema || !obj.lessons || !obj.exercises) throw new Error('Das ist kein Kali-Level-Up-Lernstand.');
          pushBackup(state, 'vor Text-Import');
          applyState(mergeStates(state, obj));
          toast('Lernstand zusammengeführt.');
        } catch (e) { toast(e.message.startsWith('Das ist') ? e.message : 'Text ist kein gültiger Lernstand.', 4000); }
      };
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
        if (!bk || !twoTap(b, 'Zusammenführen?')) return;
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
        if (withState && !twoTap($('#zip', root), 'Enthält deinen Lernstand')) return;
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

// ---------------------------------------------------------------- Räume (TryHackMe-Prinzip)
const qKey = (t, q) => `${t.id}.${q.id}`;
const allQs = (r) => r.tasks.flatMap(t => t.questions.map(q => ({ t, q, key: qKey(t, q) })));
const roomState = (id) => state.rooms[id] || (state.rooms[id] = { answers: {}, hints: {} });
const qOk = (rid, key) => !!state.rooms[rid]?.answers?.[key]?.ok;
function roomDone(id) { return allQs(ROOM[id]).every(x => qOk(id, x.key)); }
function roomPct(id) { const qs = allQs(ROOM[id]); return Math.round(qs.filter(x => qOk(id, x.key)).length / qs.length * 100); }
// Tipp-Leiter: Jeder Tipp ist sofort abrufbar und kostet einen gleichen Anteil der Punkte (mind. 1 Punkt bleibt).
const hintsOf = (q) => q.hints || (q.hint ? [q.hint] : []);
const hintsUsed = (rid, key) => { const h = state.rooms[rid]?.hints?.[key]; return h === true ? 1 : (+h || 0); };
const hintCost = (q) => { const n = hintsOf(q).length; return n ? q.points / n : 0; };
function earned(rid, x) {
  if (!qOk(rid, x.key)) return 0;
  return Math.max(1, Math.round(x.q.points - hintsUsed(rid, x.key) * hintCost(x.q)));
}
function roomPoints(id) { return allQs(ROOM[id]).reduce((n, x) => n + earned(id, x), 0); }
function roomPointsTotal() { return ROOMS.reduce((n, r) => n + roomPoints(r.id), 0); }

function roomLock(r) {
  const why = [];
  for (const x of r.requires?.rooms || []) if (!roomDone(x)) why.push(`Raum „${ROOM[x].title}“ abschließen`);
  return why;
}

function typeBadge(r) {
  return r.type === 'wargame' ? '<span class="badge real">Wargame</span>' : r.type === 'challenge' ? '<span class="badge warn">Challenge</span>' : '<span class="badge plain">Walkthrough</span>';
}
function machineBadge(r) {
  return r.machine.kind === 'ssh' ? '<span class="badge real">🖥️ Kali · echtes SSH</span>' : r.machine.kind === 'ext' ? '<span class="badge real">🖥️ Kali · Übungs-App</span>' : r.machine.kind === 'target' ? '<span class="badge real">Zielmaschine</span>' : '<span class="badge sim">📱 Sandbox</span>';
}

function roomCard(r) {
  const lock = roomLock(r), pct = roomPct(r.id);
  return `<a class="card tight ${roomDone(r.id) ? 'lime' : ''}" href="#/raum/${r.id}" style="display:block;text-decoration:none;color:inherit;margin-bottom:.6rem">
    <div class="row between"><span>${typeBadge(r)} ${machineBadge(r)}</span><span class="small muted">~${r.minutes} min</span></div>
    <b style="display:block;margin-top:.4rem">${lock.length ? '🔒 ' : ''}${esc(r.title)}</b>
    <span class="small muted">${esc(r.desc)}</span>
    <div class="bar" style="margin-top:.5rem"><i style="width:${pct}%"></i></div>
    <span class="small muted">${pct} % · ${roomPoints(r.id)} Punkte${lock.length ? ' · gesperrt: ' + esc(lock[0]) : ''}</span>
  </a>`;
}

function earnedBadges() {
  const anyAns = (pred) => ROOMS.some(r => allQs(r).some(x => qOk(r.id, x.key) && pred(r, x.q)));
  const done = ROOMS.filter(r => roomDone(r.id));
  const s = streak(state);
  const map = {
    'erste-flag': anyAns((r, q) => q.type === 'flag'),
    'echter-beleg': EXERCISES.some(e => e.kind === 'real' && isPassed(e.id)),
    'zielmaschine': anyAns((r, q) => r.machine.kind !== 'sandbox' && q.type !== 'confirm'),
    'nachtfalter': roomDone('w1'),
    'kellerserver': roomDone('w2'),
    'erster-raum': done.length > 0,
    'ohne-hinweis': done.some(r => !Object.keys(state.rooms[r.id]?.hints || {}).length),
    'challenge': done.some(r => r.type === 'challenge'),
    'story-1': !!state.story.s1?.done,
    'level-1': examPassed(state, 'L1', EXAMS.L1.items.length),
    'streak-3': s >= 3,
    'streak-7': s >= 7,
  };
  return BADGES.filter(b => map[b.id]);
}

function sshMachineHTML(r) {
  const m = r.machine;
  const base = location.origin + location.pathname.replace(/[^/]*$/, '') + `labs/${m.lab}/`;
  const httpsApp = location.protocol === 'https:' && !PREVIEW;
  const dir = `~/kly-labs/${m.lab}`;
  return `<div class="card lime stack" id="machine">
    <div class="row between"><h3 style="margin:0">Server ${esc(m.name)}</h3><span class="badge real">echt · nur 127.0.0.1</span></div>
    <p class="small">SSH-Port <code>127.0.0.1:${m.port}</code> · Token: <code>${esc(state.labToken)}</code> · Nur am PC (Kali-VM mit Docker).</p>
    ${state.location === 'phone' ? '<div class="feedback info small">Du bist gerade am Handy. Dieses Spiel läuft in der Kali-VM – am Handy wartet „Nachtfalter“ auf dich.</div>' : ''}
    ${roomState(r.id).startedAt ? '' : '<button class="btn go" id="startm">▶ Server starten – Anleitung anzeigen</button>'}
    <div id="mhow" ${roomState(r.id).startedAt ? '' : 'hidden'}>
      <details><summary>Einmalig: Docker prüfen / einrichten</summary>
        ${scriptBlock('Prüfen:', 'command -v docker && docker info --format "Docker {{.ServerVersion}} läuft"')}
        ${scriptBlock('Einrichten (Kali):', 'sudo apt update && sudo apt install -y docker.io\nsudo systemctl enable --now docker\nsudo usermod -aG docker $USER')}
        <p class="small muted">Danach einmal ab- und wieder anmelden.</p>
      </details>
      ${httpsApp ? scriptBlock('1. Dateien holen:', `mkdir -p ${dir} && cd ${dir}\ncurl -fsSL ${m.files.map(f => '-O ' + base + f).join(' ')}`) : `<p class="small"><b>1. Dateien holen:</b> ${m.files.map(f => `<a href="labs/${m.lab}/${f}" download>${f}</a>`).join(' · ')} nach <code>${dir}</code></p>`}
      ${scriptBlock('2. Einmalig bauen (dauert beim ersten Mal 1–2 Minuten):', `cd ${dir} && docker build -t ${m.name} .`)}
      ${scriptBlock('3. Server starten:', `docker run -d --rm --name ${m.name} -e KLY_TOKEN={{TOKEN}} -p 127.0.0.1:${m.port}:22 ${m.name}`)}
      ${scriptBlock('4. Anmelden (Passwort: ' + m.pass + '):', `ssh ${m.user}@127.0.0.1 -p ${m.port}`)}
      <p class="small muted">Nächste Level: <code>exit</code>, dann <code>ssh BENUTZER@127.0.0.1 -p ${m.port}</code> mit dem gefundenen Code als Passwort. Meldet ssh beim Neustart „REMOTE HOST IDENTIFICATION HAS CHANGED“: <code>ssh-keygen -R "[127.0.0.1]:${m.port}"</code></p>
      ${scriptBlock('Stoppen:', `docker stop ${m.name}`)}
    </div>
    <p class="honest">Absichtlich verwundbarer Übungsserver mit erfundenen Daten. Er ist nur auf deinem PC erreichbar. Bei jedem Start wird er neu aufgebaut – deine Codes bleiben gleich.</p>
  </div>`;
}

function extMachineHTML(r) {
  const m = r.machine;
  return `<div class="card lime stack" id="machine">
    <div class="row between"><h3 style="margin:0">Übungs-App ${esc(m.name)}</h3><span class="badge real">echt · nur 127.0.0.1</span></div>
    <p class="small">Adresse: <code>http://127.0.0.1:${m.port}</code> · Nur am PC (Kali-VM mit Docker).</p>
    ${state.location === 'phone' ? '<div class="feedback info small">Du bist gerade am Handy. Am Handy wartet „Was die Webseite verrät“.</div>' : ''}
    ${roomState(r.id).startedAt ? '' : '<button class="btn go" id="startm">▶ App starten – Anleitung anzeigen</button>'}
    <div id="mhow" ${roomState(r.id).startedAt ? '' : 'hidden'}>
      <details><summary>Einmalig: Docker prüfen / einrichten</summary>
        ${scriptBlock('Prüfen:', 'command -v docker && docker info --format "Docker {{.ServerVersion}} läuft"')}
        ${scriptBlock('Einrichten (Kali):', 'sudo apt update && sudo apt install -y docker.io\nsudo systemctl enable --now docker\nsudo usermod -aG docker $USER')}
      </details>
      ${scriptBlock('1. Starten (beim ersten Mal wird das Abbild geladen, ca. 1–3 Minuten):', `docker run -d --rm --name ${m.name} -p 127.0.0.1:${m.port}:${m.inner} ${m.image}`)}
      ${scriptBlock('2. Läuft er?', `docker ps --filter name=${m.name}\ncurl -s -o /dev/null -w "%{http_code}\\n" http://127.0.0.1:${m.port}/`)}
      <p class="small">3. Im Browser der VM öffnen: <code>http://127.0.0.1:${m.port}</code></p>
      ${scriptBlock('Stoppen:', `docker stop ${m.name}`)}
    </div>
    <p class="honest">${esc(m.name)} ist ein offizielles, absichtlich unsicheres Übungsprojekt der OWASP-Stiftung. Er läuft nur auf deinem PC. Die offiziellen Tipps und Lösungen: <a href="https://pwning.owasp-juice.shop/" target="_blank" rel="noopener noreferrer">pwning.owasp-juice.shop</a></p>
  </div>`;
}

function machineHTML(r) {
  const m = r.machine;
  if (m.kind === 'ssh') return sshMachineHTML(r);
  if (m.kind === 'ext') return extMachineHTML(r);
  if (m.kind !== 'target') return '';
  const name = `kly-${m.room}`;
  const ports = m.ports.map(p => `-p 127.0.0.1:${p}:${p}`).join(' ');
  const base = location.origin + location.pathname.replace(/[^/]*$/, '') + 'labs/kly-target/';
  const httpsApp = location.protocol === 'https:' && !PREVIEW; // Vorschau-Seite ist privat: curl käme nicht durch
  const fetchCmd = `mkdir -p ~/kly-labs/kly-target && cd ~/kly-labs/kly-target\ncurl -fsSL -O ${base}server.py -O ${base}Dockerfile`;
  const loc = state.location || 'pc';
  const pc = `
    <h4>🖥️ PC: Kali-VM mit Docker</h4>
    <details><summary>Einmalig: Docker prüfen / einrichten</summary>
      <p class="small">Erst prüfen, nicht blind installieren:</p>${scriptBlock('Prüfen:', 'command -v docker && docker info --format "Docker {{.ServerVersion}} läuft"')}
      <p class="small">Fehlt Docker, bewusst einmalig einrichten (danach ab- und wieder anmelden):</p>${scriptBlock('Einrichten (Kali):', 'sudo apt update && sudo apt install -y docker.io\nsudo systemctl enable --now docker\nsudo usermod -aG docker $USER')}
    </details>
    <p class="small"><b>1. Lab-Dateien holen</b> – ${httpsApp ? 'per curl direkt aus der App:' : 'Download-Links unten in der VM öffnen oder die App-ZIP (Mehr → App herunterladen) entpacken. Ordner: ~/kly-labs/kly-target'}</p>
    ${httpsApp ? scriptBlock('Holen:', fetchCmd) : ''}
    ${PREVIEW ? `<p class="small">In der Vorschau per Zwischenablage: <button class="btn small" data-copyfile="labs/kly-target/server.py">server.py kopieren</button> <button class="btn small" data-copyfile="labs/kly-target/Dockerfile">Dockerfile kopieren</button> – jeweils in der VM mit <code>cat &gt; DATEINAME</code> einfügen, Enter, Strg+D.</p>` : `<p class="small"><a href="labs/kly-target/server.py" download>server.py</a> · <a href="labs/kly-target/Dockerfile" download>Dockerfile</a> · <a href="labs/kly-target/README.md" download>README</a></p>`}
    ${scriptBlock('2. Einmalig bauen:', 'cd ~/kly-labs/kly-target && docker build -t kly-target .')}
    ${scriptBlock('3. Maschine starten:', `docker run -d --rm --name ${name} -e KLY_TOKEN={{TOKEN}} ${ports} kly-target ${m.room}`)}
    ${scriptBlock('4. Prüfen:', `docker ps --filter name=${name}\ndocker logs ${name}`)}
    ${scriptBlock('Stoppen:', `docker stop ${name}`)}`;
  const phone = `
    <h4>📱 Handy: Termux (ohne Docker, ohne Root)</h4>
    ${scriptBlock('Einmalig prüfen:', 'command -v python || pkg install python')}
    ${httpsApp ? scriptBlock('Lab-Datei holen:', `mkdir -p ~/kly-labs && cd ~/kly-labs\ncurl -fsSL -O ${base}server.py`) : '<p class="small">server.py herunterladen (<a href="labs/kly-target/server.py" download>Link</a>) und nach ~/kly-labs kopieren.</p>'}
    ${httpsApp && !PREVIEW ? '' : `<p class="small">Oder ohne Download: <button class="btn small" data-copyfile="labs/kly-target/server.py">server.py-Inhalt kopieren</button>, dann in Termux:</p>${scriptBlock('Datei anlegen:', 'mkdir -p ~/kly-labs && cat > ~/kly-labs/server.py')}<p class="small muted">Nach dem Befehl den kopierten Inhalt einfügen, Enter, dann Strg+D (in Termux: Lautstärke-leiser + D).</p>`}
    ${scriptBlock('Maschine starten (läuft im Vordergrund):', `cd ~/kly-labs && KLY_TOKEN={{TOKEN}} python server.py ${m.room}`)}
    <p class="small muted">Für deine Befehle eine zweite Termux-Sitzung öffnen (vom linken Rand wischen → „New session“). Stoppen: Strg+C im Server-Fenster.</p>`;
  return `<div class="card lime stack" id="machine">
    <div class="row between"><h3 style="margin:0">Zielmaschine ${esc(name)}</h3><span class="badge real">echt · nur 127.0.0.1</span></div>
    <p class="small">Ports: ${m.ports.map(p => `<code>127.0.0.1:${p}</code>`).join(' ')} · Token: <code>${esc(state.labToken)}</code></p>
    ${loc === 'windows' ? '<div class="feedback no small">Heute ist Windows gewählt. Die Zielmaschine läuft in deiner Kali-VM oder in Termux.</div>' : ''}
    ${roomState(r.id).startedAt ? '' : '<button class="btn go" id="startm">▶ Maschine starten – Anleitung anzeigen</button>'}
    <div id="mhow" ${roomState(r.id).startedAt ? '' : 'hidden'}>${loc === 'phone' ? phone + '<details><summary>PC-Anleitung</summary>' + pc + '</details>' : pc + `<details ${loc === 'both' ? 'open' : ''}><summary>Handy-Anleitung</summary>${phone}</details>`}</div>
    <p class="honest">Die App startet nichts selbst – sie zeigt dir die Befehle. Die Maschine ist ein absichtlich verwundbares Trainingsziel mit synthetischen Daten und ist nur auf deinem Gerät erreichbar.</p>
  </div>`;
}

function questionHTML(r, t, q) {
  const key = qKey(t, q), a = state.rooms[r.id]?.answers?.[key], ok = !!a?.ok;
  const id = `${t.id}-${q.id}`;
  let input = '';
  if (q.type === 'mc') {
    input = shuffle(q.options.map((o, i) => ({ o, i })), [...key].reduce((n, c) => n + c.charCodeAt(0), 7)).map(({ o, i }) => `<button class="opt ${ok && i === q.answer ? 'right' : ''}" data-k="${key}" data-i="${i}" ${ok ? 'disabled' : ''}>${esc(o)}</button>`).join('');
  } else if (q.type === 'confirm') {
    input = `<button class="btn small ${ok ? '' : 'go'}" data-k="${key}" data-confirm ${ok ? 'disabled' : ''}>${ok ? '✓ Erledigt' : 'Erledigt'}</button>`;
  } else {
    input = `<div class="row" style="flex-wrap:nowrap"><input type="text" id="in-${id}" data-k="${key}" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="${q.type === 'flag' ? 'KLY{…}' : 'Antwort'}" ${ok ? 'disabled value="✓ gelöst"' : ''}><button class="btn small primary" data-k="${key}" data-send ${ok ? 'disabled' : ''}>Senden</button></div>`;
  }
  return `<div class="q" id="q-${id}" style="margin:.7rem 0">
    <div class="row between"><b class="small">${ok ? '✓ ' : ''}${esc(q.q)}</b><span class="small muted" data-pts="${key}">${pointsLabel(r, t, q)}</span></div>
    ${input}<div class="qfb small" data-fb="${key}"></div><div class="tips" data-tips="${key}">${tipsHTML(r, q, key)}</div></div>`;
}

function pointsLabel(r, t, q) {
  const key = qKey(t, q), used = hintsUsed(r.id, key);
  if (qOk(r.id, key)) return `${earned(r.id, { q, key })} P.`;
  return used ? `noch ${Math.max(1, Math.round(q.points - used * hintCost(q)))} von ${q.points} P.` : `${q.points} P.`;
}

function tipsHTML(r, q, key) {
  const all = hintsOf(q); if (!all.length) return '';
  const used = Math.min(hintsUsed(r.id, key), all.length);
  const shown = all.slice(0, used).map((h, i) => `<div class="feedback info small"><b>Tipp ${i + 1}/${all.length}:</b> ${esc(h)}</div>`).join('');
  const ok = qOk(r.id, key);
  const after = Math.max(1, Math.round(q.points - (used + 1) * hintCost(q)));
  const last = used === all.length - 1 && /^Lösung/i.test(all[all.length - 1]);
  const btn = !ok && used < all.length ? `<button class="btn small ghost" data-tip="${key}">💡 ${last ? 'Lösung zeigen' : (used ? 'Nächster Tipp' : 'Tipp') + ` ${used + 1}/${all.length}`} · danach noch ${after} P.</button>` : '';
  return shown + btn;
}

views.raum = (id) => {
  const r = ROOM[id];
  if (!r) return views.raeume();
  const lock = roomLock(r);
  const head = `<a class="back" href="#/pfad">← Lernen</a>
    <div class="row">${typeBadge(r)}<span class="badge plain">Level ${LEVELS.find(l => l.id === r.level).n}</span>${machineBadge(r)}<span class="small muted">~${r.minutes} min</span></div>
    <h1 style="margin-top:.5rem">${esc(r.title)}</h1><p>${esc(r.desc)}</p>`;
  if (lock.length) return { html: head + `<div class="card warn"><b>🔒 Gesperrt</b><ul>${lock.map(w => `<li>${esc(w)}</li>`).join('')}</ul></div>` };
  const rs = roomState(r.id);
  return {
    html: head + `
    <div class="card tight"><div class="bar"><i style="width:${roomPct(r.id)}%" id="rbar"></i></div><span class="small muted" id="rstat">${roomPct(r.id)} % · ${roomPoints(r.id)} Punkte</span>
      <p class="small" style="margin:.4rem 0 0">🎯 <b>Erlaubt:</b> ${esc(r.scope)}</p>
      <details class="small" style="margin-top:.3rem"><summary class="muted">Mehr Infos: Lernziel, Regeln, Werkzeuge</summary>
        <div class="task-meta" style="margin-top:.5rem">
          <div><b>Lernziel</b>${esc(r.ziel)}</div><div><b>Stopp-Regel</b>${esc(r.stop)}</div><div><b>Aufräumen</b>${esc(r.cleanup)}</div>
          <div><b>Werkzeuge</b>${r.tools.map(esc).join(', ')}</div>
        </div>
      </details>
    </div>
    <div class="room-grid">
    <div class="room-side">
    ${machineHTML(r)}
    ${r.machine.kind === 'sandbox' ? '<div id="rterm"></div><button class="btn ghost small" id="rreset" style="margin-top:.4rem">Raum-Terminal neu starten</button>' : ''}
    </div>
    <div class="room-tasks">
    <div class="stack">${r.tasks.map((t, i) => {
      const done = t.questions.every(q => qOk(r.id, qKey(t, q)));
      return `<details class="card" ${done ? '' : (i === r.tasks.findIndex(tt => !tt.questions.every(q => qOk(r.id, qKey(tt, q)))) ? 'open' : '')}>
        <summary><span class="state ${done ? 'done' : ''}" style="display:inline-grid;margin-right:.5rem;vertical-align:middle">${done ? '✓' : i + 1}</span>Task ${i + 1}: ${esc(t.title)}</summary>
        <p style="white-space:pre-line">${esc(t.body)}</p>
        ${t.questions.map(q => questionHTML(r, t, q)).join('')}
      </details>`;
    }).join('')}</div>
    <div id="rdone"></div>
    </div></div>`,
    wide: true,
    mount(root) {
      bindCopy(root);
      $$('[data-copyfile]', root).forEach(b => b.onclick = async () => {
        try { const txt = await (await fetch(b.dataset.copyfile)).text(); await navigator.clipboard.writeText(txt); toast('server.py kopiert (' + txt.split('\n').length + ' Zeilen).'); }
        catch { toast('Kopieren nicht möglich – bitte am PC holen.', 4000); }
      });
      const sm = $('#startm', root);
      if (sm) sm.onclick = () => { rs.startedAt = Date.now(); save(); sm.remove(); $('#mhow', root).hidden = false; };
      let sh = null;
      const startSandbox = async () => {
        const F = {};
        for (const f of r.flags || []) F[f] = await flagFor(state.labToken, r.id, f);
        $('#rterm', root).innerHTML = '';
        const solved = new Set(allQs(r).filter(x => x.q.type === 'flag' && qOk(r.id, x.key)).map(x => x.q.flag));
        const solve = (flag, value) => { const x = allQs(r).find(y => y.q.flag === flag); if (x) verdict(x.key, value); };
        sh = new Shell({ fs: baseFS(), commands: r.commands ? r.commands({ F, solve }) : {} });
        r.setup(sh, F, solved);
        mountTerminal($('#rterm', root), sh, { title: `Raum · ${r.title}`, welcome: r.welcome || 'Raum-Sandbox bereit. Arbeitsordner: ~/raum0 · help zeigt Befehle.' });
      };
      if (r.machine.kind === 'sandbox') { startSandbox(); $('#rreset', root).onclick = startSandbox; }

      const find = (key) => { for (const t of r.tasks) for (const q of t.questions) if (qKey(t, q) === key) return { t, q }; };
      const fbOf = (key) => root.querySelector(`[data-fb="${CSS.escape(key)}"]`);
      const showDone = () => {
        $('#rbar', root).style.width = roomPct(r.id) + '%';
        $('#rstat', root).textContent = `${roomPct(r.id)} % · ${roomPoints(r.id)} Punkte`;
        if (roomDone(r.id)) {
          if (!rs.doneAt) { rs.doneAt = Date.now(); save(); toast(`Raum „${r.title}“ gemeistert!`); }
          const n = r.nach;
          $('#rdone', root).innerHTML = `<div class="card lime debrief"><h3>✓ Raum abgeschlossen · ${roomPoints(r.id)} Punkte</h3><dl><dt>Beobachtung</dt><dd>${esc(n.beobachtung)}</dd><dt>Schlussfolgerung</dt><dd>${esc(n.schluss)}</dd><dt>Grenzen</dt><dd>${esc(n.grenzen)}</dd><dt>Nächster Schritt</dt><dd>${esc(n.naechster)}</dd></dl><p class="small">Aufräumen nicht vergessen: <code>${esc(r.cleanup)}</code></p></div>`;
        }
      };
      const verdict = async (key, value) => {
        const { q } = find(key);
        const ans = rs.answers[key] || (rs.answers[key] = { attempts: 0 });
        if (ans.ok) return;
        let ok = false;
        if (q.type === 'flag') ok = normFlag(value) === await flagFor(state.labToken, r.id, q.flag);
        else if (q.type === 'text') ok = q.accept.some(re => re.test(String(value).trim()));
        else if (q.type === 'mc') ok = +value === q.answer;
        else if (q.type === 'confirm') ok = true;
        ans.attempts++;
        const fb = fbOf(key);
        if (ok) {
          ans.ok = true; ans.at = Date.now(); markActivity(state); save();
          if (r.onSolve && sh && q.type === 'flag') r.onSolve(sh, q.flag);
          const got = earned(r.id, { q, key });
          fb.innerHTML = `<span style="color:var(--lime)">✓ Richtig · +${got} Punkte${got < q.points ? ` (von ${q.points}, Tipps genutzt)` : ''}</span>`;
          refreshQ(key);
          const det = fb.closest('details');
          if (det && [...det.querySelectorAll('[data-fb]')].every(x => qOk(r.id, x.dataset.fb))) {
            const next = det.nextElementSibling;
            if (next && next.tagName === 'DETAILS') { next.open = true; setTimeout(() => next.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 300); }
          }
          $$(`[data-k="${CSS.escape(key)}"]`, root).forEach(x => { x.disabled = true; if (x.tagName === 'BUTTON' && x.dataset.i == q.answer) x.classList.add('right'); });
          showDone();
        } else {
          save();
          fb.innerHTML = `<span style="color:var(--red)">✗ Nicht korrekt (${ans.attempts}. Versuch).</span> ${q.type === 'flag' && !/^KLY\{[0-9a-f]{16}\}$/.test(normFlag(value)) ? 'Flags haben das Format KLY{16 Hex-Zeichen}. ' : ''}${hintsOf(q).length && hintsUsed(r.id, key) < hintsOf(q).length ? '<span class="muted">Feststecken ist normal – hol dir unten einen Tipp.</span>' : ''}`;
          if (q.type === 'mc') { const b = root.querySelector(`[data-k="${CSS.escape(key)}"][data-i="${value}"]`); b && b.classList.add('wrong'); }
        }
      };
      function refreshQ(key) {
        const { t, q } = find(key);
        const tips = root.querySelector(`[data-tips="${CSS.escape(key)}"]`); if (tips) tips.innerHTML = tipsHTML(r, q, key);
        const pts = root.querySelector(`[data-pts="${CSS.escape(key)}"]`); if (pts) pts.textContent = pointsLabel(r, t, q);
      }
      root.addEventListener('click', (e) => {
        const b = e.target.closest('[data-tip]'); if (!b) return;
        const key = b.dataset.tip, { q } = find(key), all = hintsOf(q), used = hintsUsed(r.id, key);
        if (used >= all.length) return;
        if (used === all.length - 1 && /^Lösung/i.test(all[used]) && !twoTap(b, 'Wirklich die Lösung zeigen?')) return;
        rs.hints[key] = used + 1; save(); refreshQ(key);
      });
      $$('[data-send]', root).forEach(b => b.onclick = () => verdict(b.dataset.k, root.querySelector(`input[data-k="${CSS.escape(b.dataset.k)}"]`).value));
      $$('input[data-k]', root).forEach(i => i.onkeydown = (e) => { if (e.key === 'Enter') verdict(i.dataset.k, i.value); });
      $$('.opt[data-k]', root).forEach(b => b.onclick = () => verdict(b.dataset.k, b.dataset.i));
      $$('[data-confirm]', root).forEach(b => b.onclick = () => verdict(b.dataset.k, ''));
      if (roomDone(r.id)) showDone();
    },
  };
};

views.profil = () => {
  const got = new Set(earnedBadges().map(b => b.id));
  const days = [...Array(28)].map((_, i) => { const d = new Date(); d.setUTCDate(d.getUTCDate() - 27 + i); return today(d); });
  return {
    html: `<a class="back" href="#/mehr">← Mehr</a><h1>${esc(state.profile.name)}s Profil</h1>
    <div class="kpis" style="grid-template-columns:repeat(3,1fr)"><div class="kpi"><b>${totalPoints()}</b><span>Punkte</span></div><div class="kpi"><b>${ROOMS.filter(r => roomDone(r.id)).length}/${ROOMS.length}</b><span>geknackt</span></div><div class="kpi"><b>${streak(state)} 🔥</b><span>Tage in Folge</span></div></div>
    <div class="card" style="margin-top:.8rem"><h3>Letzte 4 Wochen</h3>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">${days.map(d => `<span title="${d}" style="aspect-ratio:1;border-radius:4px;background:${state.activity[d] ? (state.activity[d] > 4 ? 'var(--lime)' : 'var(--lime-d)') : 'var(--card2)'}"></span>`).join('')}</div></div>
    <div class="card"><h3>Abzeichen</h3><div class="grid two">${BADGES.map(b => `<div class="row" style="opacity:${got.has(b.id) ? 1 : .4}"><span style="font-size:1.6rem;width:2.2rem;text-align:center">${b.icon}</span><span><b>${esc(b.title)}</b>${got.has(b.id) ? ' ✓' : ''}<br><span class="small muted">${esc(b.desc)}</span></span></div>`).join('')}</div></div>
    <p class="honest">Punkte, Abzeichen und Serien sind Motivation – sie schalten keine Prüfung und kein Level frei.</p>`,
  };
};

// ---------------------------------------------------------------- Start
window.addEventListener('hashchange', render);
function syncLine(st) { return `<span class="dot ${st.state === 'ok' ? 'ok' : st.state === 'err' ? 'err' : 'warn'}"></span> ${esc(st.msg)}`; }
onSyncStatus((st) => { renderTop(); const el = document.getElementById('syncline'); if (el) el.innerHTML = syncLine(st); });
render();
locationModal(false);
initSync(getState, applyState);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => { /* offline-Modus nicht verfügbar */ });
}
