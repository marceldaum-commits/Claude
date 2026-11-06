// Nachtfalter Hacklab (früher „Kali Level Up“) – App
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
import { uebungsTipps } from './content/level1-tipps.js';
import { initLang, langNoteHTML, langPickerHTML, bindLangPicker, NAV, currentLang, codeify, protectCodes, hasHand, handDict, loadHand, makeT, translateTree, loadShellT, loadUI, U, UN, Ut, roomText, loadLevel1 } from './i18n.js';
import { EXTERN } from './content/extern.js';
import { KALIPRAXIS, KALIPRAXIS_GEPLANT } from './content/kalipraxis.js';
import { initSync, syncConfigured, syncStatus, onSyncStatus, signIn, signUp, signOut, syncNow, schedulePush, meinStatus, arenaFortschritt, meldungSenden, taeglich, advent, profilAktion } from './sync.js';
import { exportStateJSON, readStateFile, exportApp, download } from './export.js';
import { LEVELS, LOCATIONS, PFADE } from './content/curriculum.js';
import { LEVEL1 } from './content/level1.js';
import { STORIES } from './content/story1.js';
import { LERNPFAD } from './content/lernpfad.js';
import { TOOLS } from './content/tools.js';

// ---------------------------------------------------------------- Daten
const LESSONS = LEVEL1.lessons;
const EXERCISES = LEVEL1.exercises;
const EX = Object.fromEntries(EXERCISES.map(e => [e.id, e]));
// Tipp-Leitern der Spickzettel-Übungen (Anzahl für die Punkteberechnung)
for (const e of Object.values(EX)) e.tipCount = uebungsTipps(e, LESSONS.find(l => l.id === e.lesson)).length;
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
let L1 = makeT(null);
const L1h = (x, fmt = esc) => L1.h(x, fmt);
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
  for (const r of ROOMS) if (!roomDone(r.id) && !roomLock(r).length) return { kind: 'room', titleHTML: U('Raum: {title}', { title: r.title }), title: 'Raum: ' + r.title, href: `#/raum/${r.id}` };
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
    <a class="brand" href="#/heute" translate="no"><img src="icons/icon.svg" alt=""><span>Nachtfalter <b>Hacklab</b></span></a>
    <span class="spacer"></span>
    ${location.hostname.startsWith('vorschau.') ? `<span class="chip" style="background:var(--warn,#f5a524);color:#000" translate="no" title="Vorschau – noch nicht freigegeben"><span class="lbl">VORSCHAU </span>${esc(self.KLY_VERSION || '')}</span>` : ''}
    <button class="chip" id="locChip" title="Lernort ändern">${loc ? loc.icon + ' <span class="lbl">' + U(loc.short) + '</span>' : '📍 <span class="lbl">Lernort?</span>'}</button>
    ${syncConfigured() && !st.user ? `<a class="chip" href="konto.html" title="Anmelden oder kostenloses Konto anlegen" aria-label="Anmelden">👤 <span class="lbl">Anmelden</span></a>` :
    `<a class="chip" href="#/mehr" title="${esc(st.msg)}"><span class="dot ${st.state === 'ok' ? 'ok' : st.state === 'err' ? 'err' : st.state === 'warn' || st.state === 'busy' ? 'warn' : ''}"></span>${st.state === 'ok' ? 'Sync' : st.state === 'off' ? 'Lokal' : st.state === 'busy' ? '…' : 'Sync'}</a>`}
    ${st.user ? `<button class="chip" id="logoutChip" title="Abmelden (${esc(st.user.email || '')})" aria-label="Abmelden">🚪 <span class="lbl">Abmelden</span></button>` : ''}`;
  $('#locChip').onclick = () => locationModal(true);
  const lo = $('#logoutChip'); if (lo) lo.onclick = async () => { if (!confirm('Wirklich abmelden? Dein Fortschritt ist im Konto gespeichert.')) return; try { await signOut(); } catch { /* offline */ } try { localStorage.removeItem('kly.auth'); } catch { /* */ } zurAnmeldung(); };
}

function renderNav(route) {
  const L = NAV[currentLang()] || NAV.de;
  const items = [['heute', '⌂', L[0]], ['pfad', '◆', L[1]], ['terminal', '>_', L[2]], ['mehr', '≡', L[3]]];
  const map = { extern: 'pfad', kalipraxis: 'pfad', melden: 'mehr', 'handy-labs': 'mehr', lektion: 'pfad', uebung: 'pfad', level: 'pfad', pruefung: 'pfad', archiv: 'mehr', werkzeuge: 'mehr', profil: 'mehr', raum: 'pfad', raeume: 'pfad', story: 'pfad', lernpfad: 'pfad', lernstufe: 'pfad' };
  const on = map[route] || route;
  $('#nav').setAttribute('translate', 'no');
  $('#nav').innerHTML = items.map(([r, i, t]) => `<a href="#/${r}" class="${on === r ? 'on' : ''}"><span class="i">${i}</span>${t}</a>`).join('');
}

// Erfahrungsstufe (beim Erststart gefragt, im Profil änderbar). Anfänger ist die Voreinstellung.
const NIVEAUS = {
  anfaenger: { icon: '🌱', label: 'Anfänger', desc: 'Ganz neu – erklär mir alles in Ruhe.' },
  etwas: { icon: '⚡', label: 'Etwas Erfahrung', desc: 'Grundlagen sitzen, ich will tiefer rein.' },
  profi: { icon: '🎯', label: 'Profi', desc: 'Fordere mich – weniger an die Hand nehmen.' },
  experte: { icon: '🔥', label: 'Experte', desc: 'Ganz ohne Tipps – nur für Harte. Dafür immer volle Punkte.' },
};
const niveau = () => state.profile.level || 'anfaenger';
function nivButtons() {
  return Object.entries(NIVEAUS).map(([k, n]) => `<button class="loc-opt niv-opt ${niveau() === k ? 'on' : ''}" data-niv="${k}"><span class="ic">${n.icon}</span><span><b>${U(n.label)}</b><br><span class="small muted">${U(n.desc)}</span></span></button>`).join('');
}

function locationModal(force = false) {
  if (!force && state.location && state.locationDay === today()) return;
  const m = document.createElement('div');
  m.className = 'modal';
  m.innerHTML = `<div class="box" role="dialog" aria-label="${Ut('Lernort wählen')}">
    ${state.location ? '' : langPickerHTML()}
    ${state.location ? `<h2>${U('Wo lernst du heute?')}</h2>` : `<h2>${U('Willkommen! 👋')}</h2><p>${U('Hier lernst du Linux und Hacking Schritt für Schritt – mit Rätseln, Geschichten und Tipps, wenn du festhängst.')}</p><p class="small"><b>${U('Neu hier?')}</b> ${U('Nimm „Nur im Browser“ – du brauchst nichts zu installieren.')}</p><label class="small">${U('Wie sollen wir dich nennen? (freiwillig)')}</label><input type="text" id="wname" maxlength="30" placeholder="${esc(Ut('Name oder Spitzname'))}" style="margin-bottom:.6rem"><label class="small" style="display:block;margin:.2rem 0 .3rem"><b>${U('Wie viel Erfahrung hast du?')}</b></label>${nivButtons()}<p class="muted small" style="margin:.3rem 0 .2rem">${U('Du kannst das später im Profil ändern.')}</p>`}
    <p class="muted small">${U('Anleitungen, Befehle und Grenzen werden an deinen Lernort angepasst. Du kannst ihn oben jederzeit ändern.')}</p>
    ${Object.entries(LOCATIONS).map(([k, l]) => `<button class="loc-opt ${state.location === k ? 'on' : ''}" data-k="${k}"><span class="ic">${l.icon}</span><span><b>${U(l.label)}</b><br><span class="small muted">${U(l.desc)}</span></span></button>`).join('')}
  </div>`;
  document.body.appendChild(m);
  bindLangPicker(m);
  m.addEventListener('click', (e) => {
    const nb = e.target.closest('.niv-opt');
    if (nb) { state.profile.level = nb.dataset.niv; m.querySelectorAll('.niv-opt').forEach(x => x.classList.toggle('on', x === nb)); save(); return; }
    const b = e.target.closest('.loc-opt');
    if (b) {
      state.location = b.dataset.k; state.locationDay = today(); state.locationAt = Date.now();
      if (!state.profile.level) state.profile.level = 'anfaenger';
      const wn = m.querySelector('#wname'); if (wn && wn.value.trim()) state.profile.name = wn.value.trim().slice(0, 30);
      save(); m.remove(); render();
    } else if (e.target === m && state.location) { state.locationDay = today(); save(); m.remove(); }
  });
}

// ---------------------------------------------------------------- Router
const views = {};
let cleanup = null;

// Einheitlicher Punktestand (XP) + Streak über ALLES – inkl. „CTF des Tages" (serverseitig).
// ctfStand wird einmal pro Sitzung vom Server geholt; schlägt es fehl, zählt eben nur der lokale Stand.
let ctfStand = null; // null = noch nicht geladen, {} = lädt, {punkte,streak} = da
const gesamtPunkte = () => totalPoints() + ((ctfStand && ctfStand.punkte) || 0);
const gesamtStreak = () => Math.max(streak(state), (ctfStand && ctfStand.streak) || 0);
function ctfStandLaden() {
  if (ctfStand !== null || !syncStatus().user) return;
  ctfStand = {};
  taeglich('info').then(d => { ctfStand = { punkte: d.punkte || 0, streak: d.streak || 0 }; render(); }).catch(() => {});
}

// Meilensteine (für die Urkunde): klare, „verdiente" Stufen. Höchster erreichter wird oben auf der Urkunde gezeigt.
const MEILENSTEINE = [
  { id: 'start', icon: '🌱', titel: 'Erste Schritte', test: () => ROOMS.filter(r => roomDone(r.id)).length >= 1 },
  { id: 'grundlagen', icon: '📗', titel: 'Grundlagen abgeschlossen', test: () => ROOMS.filter(r => roomDone(r.id)).length >= 5 },
  { id: 'fortgeschritten', icon: '⚙️', titel: 'Fortgeschritten', test: () => ROOMS.filter(r => roomDone(r.id)).length >= 10 },
  { id: 'meister', icon: '🏆', titel: 'Alle Räume gemeistert', test: () => ROOMS.length > 0 && ROOMS.every(r => roomDone(r.id)) },
];
const erreichteMeilensteine = () => MEILENSTEINE.filter(m => { try { return m.test(); } catch { return false; } });
const hoechsterMeilenstein = () => { const e = erreichteMeilensteine(); return e[e.length - 1] || null; };

function render() {
  const hash = location.hash.replace(/^#\/?/, '') || 'heute';
  const [route, arg] = hash.split('/');
  if (cleanup) { try { cleanup(); } catch { /* */ } cleanup = null; }
  renderTop();
  renderNav(route);
  const main = $('#main');
  const v = views[route] || views.heute;
  const r = v(arg) || {};
  main.innerHTML = langNoteHTML() + (r.html || '');
  const lb = main.querySelector('#lang-banner'); if (lb) bindLangPicker(lb);
  main.classList.toggle('wide', !!r.wide);
  // Browser-Übersetzung (z. B. Google Translate): Befehle, Codes und Terminals NICHT übersetzen
  main.querySelectorAll('pre, code, .script, .syntax, input, textarea, [data-copy]').forEach(e => e.setAttribute('translate', 'no'));
  if (r.mount) cleanup = r.mount(main) || null;
  if (!r.keepScroll) window.scrollTo(0, 0);
}

// ---------------------------------------------------------------- Heute
// Gesamtpunkte: eine einzige Währung (Räume/Wargames + Übungen + Story)
const EXTERN_POINTS = 10;
function totalPoints() { return roomPointsTotal() + computeXp(state, EX) + (state.story.s1?.done ? STORY.s1.points : 0) + Object.keys(state.extern || {}).length * EXTERN_POINTS; }
// „Nur Browser“: Räume, die eine eigene Kali-VM/Termux brauchen, werden ausgeblendet (eingeklappt)
const browserOnly = () => state.location === 'browser';
const needsKali = (r) => r.machine.kind !== 'sandbox' && !(r.machine.kind === 'ssh' && arenaLink(r.machine));
const visible = (r) => !(browserOnly() && needsKali(r));
// Einstiegsreihenfolge für Neue ohne Kali: erst die Story, dann aufbauend
const BROWSER_ORDER = ['w1', 'r0', 'w4', 'h1', 'n1', 'w6', 'w3', 'w5', 'w7', 'b1', 'p5', 'w8', 'p6', 'w9', 'p7', 'p8', 'p10'];
// Räume passend zur Erfahrungsstufe: Anfänger → leichtere zuerst, Profi/Experte → fordernde zuerst.
const DIFFRANK = { leicht: 1, einfach: 1, mittel: 2, schwer: 3, schwierig: 3, extrem: 4 };
const nivPref = () => ({ anfaenger: 1, etwas: 2, profi: 3, experte: 3 }[niveau()] || 1);
const diffGap = (r) => Math.abs((DIFFRANK[(r.difficulty || '').toLowerCase()] || 2) - nivPref());
const ordBrowser = (r) => (BROWSER_ORDER.indexOf(r.id) + 1 || 99);
const browserPicks = () => { const adv = niveau() === 'profi' || niveau() === 'experte'; return ROOMS.filter(r => !needsKali(r) && !roomDone(r.id)).sort((a, b) => adv ? ((diffGap(a) - diffGap(b)) || (ordBrowser(a) - ordBrowser(b))) : ((ordBrowser(a) - ordBrowser(b)) || (diffGap(a) - diffGap(b)))); };
// Wo spielbar? sandbox = überall (Browser), target = PC (Docker) oder Handy (Termux), ssh/ext = nur PC
const onPhone = (r) => r.machine.kind === 'sandbox' || r.machine.kind === 'target';
const onPC = (r) => r.machine.kind !== 'sandbox';
function lastActivity(r) {
  const rs = state.rooms[r.id]; if (!rs) return 0;
  return Math.max(rs.startedAt || 0, ...Object.values(rs.answers || {}).map(a => a.at || 0), ...Object.values(rs.answers || {}).map(a => (a.attempts ? 1 : 0)));
}
function continueRoom() {
  const open = ROOMS.filter(r => !roomDone(r.id) && lastActivity(r) > 0 && visible(r)); // im Browser-Modus nur spielbare Räume
  open.sort((a, b) => lastActivity(b) - lastActivity(a));
  return open[0] || null;
}
function miniRoom(r, phone = false) {
  const pct = roomPct(r.id);
  return `<li><a href="#/raum/${r.id}"><span class="state ${roomDone(r.id) ? 'done' : ''}">${roomDone(r.id) ? '✓' : pct ? pct + '%' : '▶'}</span>
    <span class="grow"><span class="t">${roomText(r, 'title')}</span><span class="s">${r.type === 'wargame' ? '<span translate="no">🎮 Wargame</span>' : 'Level ' + LEVELS.find(l => l.id === r.level).n + ' · ' + esc(LEVELS.find(l => l.id === r.level).title)}${phone && r.machine.kind === 'target' ? ' · mit Termux' : ''}</span></span></a></li>`;
}

views.heute = () => {
  const loc = state.location || 'both';
  const cont = continueRoom();
  const nx = nextStep();
  const done = ROOMS.filter(r => roomDone(r.id)).length;
  const rank = { sandbox: 0, ssh: 1, ext: 1, target: 2 }; // zuerst, was ohne Zusatz-Installation läuft
  const pick = (pred, phone) => ROOMS.filter(r => pred(r) && !roomDone(r.id) && r !== cont)
    .sort((x, y) => (phone ? rank[x.machine.kind] - rank[y.machine.kind] : (x.machine.kind === 'target') - (y.machine.kind === 'target')) || (diffGap(x) - diffGap(y)))
    .slice(0, 3);
  const phoneList = pick(onPhone, true), pcList = pick(onPC, false);
  const section = (icon, title, list) => list.length ? `<div class="card"><h3 style="margin:0 0 .3rem">${icon} ${title}</h3><ul class="list">${list.map(r => miniRoom(r, icon === '📱')).join('')}</ul></div>` : '';
  return {
    html: `
    <section class="stack">
      ${PREVIEW ? `<div class="card warn small"><b>${U('Handy-Vorschau.')}</b> ${U('Lernstand bleibt in diesem Browser, Sync und Downloads sind hier aus.')}</div>` : ''}
      <div class="card violet">
        <div class="row between"><span class="badge real">${U('Ziel: eJPT')}</span><a class="btn small ghost" href="#/profil" style="min-height:36px">${U('{n} Abzeichen →', { n: earnedBadges().length })}</a></div>
        <h1 style="margin:.5rem 0 .3rem">${state.profile.name ? U('Hallo {name}!', { name: state.profile.name }) : U('Hallo!')}</h1>
        <div class="bar" aria-label="${esc(Ut('{done} von {all} geknackt', { done, all: ROOMS.length }))}"><i style="width:${Math.round(done / ROOMS.length * 100)}%"></i></div>
        <div class="kpis" style="grid-template-columns:repeat(3,1fr);margin-top:.6rem"><div class="kpi"><b>${gesamtPunkte()}</b><span>${U('Punkte')}</span></div><div class="kpi"><b>${done}/${ROOMS.length}</b><span>${U('geknackt')}</span></div><div class="kpi"><b>${gesamtStreak()}🔥</b><span>${U('Tage in Folge')}</span></div></div>
      </div>

      ${!cont && (loc === 'pc' ? pcList : loc === 'browser' ? browserPicks() : phoneList.filter(visible))[0] ? (() => { const f = (loc === 'pc' ? pcList : loc === 'browser' ? browserPicks() : phoneList.filter(visible))[0]; return `<a class="card lime" href="#/raum/${f.id}" style="display:block;text-decoration:none;color:inherit">
        <span class="badge real">${U('Los geht’s')}</span>
        <h2 style="margin:.4rem 0 .2rem">${roomText(f, 'title')}</h2>
        <span class="small muted">${roomText(f, 'desc')} →</span>
      </a>`; })() : cont ? `<a class="card lime" href="#/raum/${cont.id}" style="display:block;text-decoration:none;color:inherit">
        <span class="badge real">${U('Weitermachen')}</span>
        <h2 style="margin:.4rem 0 .2rem">${roomText(cont, 'title')}</h2>
        <div class="bar"><i style="width:${roomPct(cont.id)}%"></i></div>
        <span class="small muted">${U('{n} % geschafft', { n: roomPct(cont.id) })} · ${cont.machine.kind === 'sandbox' ? U('📱 geht überall') : U('🖥️ Kali-VM')} →</span>
      </a>` : `<a class="card lime" href="${nx.href}" style="display:block;text-decoration:none;color:inherit">
        <span class="badge real">${U('Los geht’s')}</span>
        <h2 style="margin:.4rem 0 .2rem">${nx.titleHTML || esc(nx.title)}</h2>
        <span class="small muted">${U('Feststecken ist normal – jede Frage hat Tipps →')}</span>
      </a>`}

      <a class="card" href="#/ctf" style="display:block;text-decoration:none;color:inherit"><div class="row between"><b>🏁 ${U('CTF des Tages')}</b><span class="badge plain">${U('neu')}</span></div><span class="small muted">${U('Jeden Tag 2 frische Rätsel · Streak &amp; Bestenliste')} →</span></a>

      ${[10, 11].includes(new Date().getMonth()) ? `<a class="card" href="#/advent" style="display:block;text-decoration:none;color:inherit;background:linear-gradient(160deg,#17233b,#1d2b47);border-color:#c9a24a55"><div class="row between"><b>🎄 ${U('Advent of Hacking')}</b><span class="badge plain">${new Date().getMonth() === 11 ? U('offen') : U('ab 1. Dez')}</span></div><span class="small muted">${U('24 Türchen, jeden Tag ein Rätsel · Advent-Zertifikat')} →</span></a>` : ''}

      ${loc === 'browser' ? section('🌐', U('Direkt hier im Browser'), browserPicks().filter(r => r !== (cont || browserPicks()[0])).slice(0, 3)) + `<div class="card tight small muted">${U('🖥️ Mit einer eigenen Kali-VM gibt es später noch echte Labs (Kellerserver, Juice Shop …) – einfach oben den Lernort wechseln.')}</div>` : loc === 'pc' ? section('🖥️', U('Jetzt am PC'), pcList) + section('📱', U('Für unterwegs'), phoneList) : loc === 'phone' ? section('📱', U('Jetzt am Handy'), phoneList) + section('🖥️', U('Wenn du am PC bist'), pcList) : section('📱', U('Am Handy'), phoneList) + section('🖥️', U('Am PC (Kali)'), pcList)}

      <a class="card" href="#/pfad" style="display:block;text-decoration:none;color:inherit"><b>${U('Alles ansehen →')}</b><br><span class="small muted">${U('Alle Wargames, Räume und Level bis zum eJPT')}</span></a>

      <p class="small muted" style="margin-top:.8rem">${U('Später, als Ergänzung:')} <a href="#/extern">${U('externe Übungsplattformen')} →</a></p>
    </section>`,
    mount() { ctfStandLaden(); },
  };
};

function exItem(id, showRepeat) {
  const e = EX[id]; if (!e) return '';
  const done = isPassed(id);
  const locked = false; // Spickzettel: nichts gesperrt
  return `<li><a href="#/uebung/${id}">
    <span class="state ${done ? 'done' : locked ? 'lock' : ''}">${done ? '✓' : locked ? '🔒' : ''}</span>
    <span class="grow"><span class="t">${esc(e.title)}</span><span class="s">${kindLabel(e)}${done && showRepeat ? ' · Wiederholung ohne Punkte' : ''}${locked ? ' · erst Lektion lesen' : ''}</span></span>
    ${e.kind === 'real' ? '<span class="badge real">echt</span>' : '<span class="badge sim">sim</span>'}
  </a></li>`;
}
function kindLabel(e) {
  return Ut({ sandbox: 'Sandbox-Übung', real: 'Echter Kali-Auftrag', review: 'Wiederholungsrunde', drill: 'Kurz-Drill (optional)' }[e.kind]) + (e.required ? '' : Ut(' · optional'));
}

// ---------------------------------------------------------------- Lernpfad
views.pfad = () => {
  const inLevel = (r, l) => r.level === l.id && r.type !== 'wargame'; // Leitern stehen oben
  const withRooms = LEVELS.filter(l => l.id === 'L1' || ROOMS.some(r => r.level === l.id));
  const later = LEVELS.filter(l => !withRooms.includes(l));
  return {
    html: `<h1>Lernen</h1>
    <p class="muted small">Vom Linux-Anfänger bis zum eJPT. Alles ist offen – fang an, wo du Lust hast. 📱 = geht am Handy, 🖥️ = Kali-VM.</p>
    <a class="card lime" href="#/kalipraxis" style="display:block;text-decoration:none;color:inherit;margin-top:.6rem">
      <b>🧰 Kali anwenden – Praxis</b> <span class="badge plain">neu</span><br>
      <span class="small muted">Echte Kali-Werkzeuge (nmap, gobuster …) gegen lokale Docker-Ziele. Vom Verstehen zum Können.</span>
    </a>
    <h2 style="margin-top:1rem">🎮 Leitern</h2>
    <p class="small muted">Rätsel-Ketten mit Story: Jede Lösung öffnet die nächste Stufe. Fang oben an und arbeite dich hoch.</p>
    ${[['linux', '🐧 Linux-Leitern', ['Einstieg', 'mittel', 'Skripte', 'schwerer', 'schwer']], ['hacking', '🏴 Hacking-Leitern (CTF)', ['leicht', 'mittel', 'schwer']], ['purple', '🟣 Purple-Team-Leitern (prüfen, finden, absichern)', ['Level 5', 'Level 6', 'Level 7', 'Level 8', 'Level 10']], ['kali', '🖥️ In deiner Kali-VM', ['echtes SSH']]].filter(([tr]) => ROOMS.some(r => r.track === tr && visible(r))).map(([tr, title, order]) => `
      <h3 style="margin:.9rem 0 .4rem">${title}</h3>
      ${ROOMS.filter(r => r.track === tr && visible(r)).sort((a, b) => order.indexOf(a.stufe) - order.indexOf(b.stufe)).map(roomCard).join('')}`).join('')}
    ${withRooms.map(l => `<h2 style="margin-top:1.2rem">Level ${l.n} · ${esc(l.title)}</h2>
      <p class="small muted" style="margin-top:-.2rem">${esc(l.goal)}</p>
      ${ROOMS.filter(r => inLevel(r, l) && visible(r)).map(roomCard).join('')}
      ${ROOMS.filter(r => r.level === l.id && r.type === 'wargame' && l.id !== 'L1').map(r => `<a class="btn small navbtn" href="#/raum/${r.id}">🎮 <span>Passende Leiter: <b>${esc(r.title)}</b></span><span class="pfeil">→</span></a>`).join('')}
      ${l.id === 'L1' ? `<div class="grid two">
        <a class="card tight" href="#/level/L1" style="display:block;text-decoration:none;color:inherit"><b>📖 Linux-Spickzettel</b><br><span class="small muted">${LESSONS.length} Kapitel zum Nachschlagen + Übungen</span></a>
        <a class="card tight ${state.story.s1?.done ? 'lime' : ''}" href="#/story/s1" style="display:block;text-decoration:none;color:inherit"><b>🎬 ${esc(STORY.s1.title)}</b><br><span class="small muted">Story-Mission${storyLocked(STORY.s1).length ? ' · braucht ein paar Übungen' : ''}</span></a>
      </div>` : ''}
      ${l.id === 'L2' ? `<a class="card tight" href="#/level/L2" style="display:block;text-decoration:none;color:inherit"><b>🎯 Lernpfad: echte Scans ohne Abo</b><br><span class="small muted">Eigene Zielmaschine + kostenlose Hack-The-Box-Maschinen</span></a>` : ''}
      ${l.id === 'L3' ? `<a class="card tight" href="#/level/L3" style="display:block;text-decoration:none;color:inherit"><b>🌐 Lernpfad PortSwigger</b><br><span class="small muted">Kostenlose Web-Hacking-Labs, in sinnvoller Reihenfolge</span></a>` : ''}`).join('')}
    ${browserOnly() ? `<details class="card" style="margin-top:1.2rem"><summary><b>🖥️ Braucht eine eigene Kali-VM (${ROOMS.filter(needsKali).length} Räume)</b></summary>
      <p class="small muted">Diese Räume arbeiten mit echten Programmen auf deinem eigenen Rechner. Wenn du so weit bist: Lernort auf „Kali am PC“ stellen.</p>
      ${ROOMS.filter(needsKali).map(roomCard).join('')}</details>` : ''}
    ${later.length ? `<h2 style="margin-top:1.2rem">Demnächst</h2>
    <p class="small muted">Für diese Level gibt es noch keine eigenen Räume – aber einen Lernpfad mit kostenlosen Übungsquellen.</p>
    <ul class="list card">${later.map(l => `<li><a href="#/level/${l.id}"><span class="state">${l.n}</span><span class="grow"><span class="t">${esc(l.title)}</span><span class="s">${esc(l.goal)}</span></span>${PFADE[l.id] ? '<span class="badge plain">Lernpfad</span>' : ''}</a></li>`).join('')}</ul>` : ''}
    <p class="small muted" style="margin-top:1.4rem">${U('Ergänzend, wenn du mehr üben willst:')} <a href="#/extern">${U('externe Übungsplattformen')} →</a></p>`,
  };
};
views.raeume = views.pfad;

// ---------------------------------------------------------------- CTF des Tages (täglich 2 Rätsel, Streak, Bestenliste)
function ctfCard(p, geloest) {
  const done = geloest.includes(p.nr);
  return `<div class="card">
    <div class="row between"><b>${p.nr === 0 ? '①' : '②'} ${esc(p.titel)}</b><span class="badge ${done ? 'real' : 'plain'}">${done ? '✓ gelöst' : esc(p.kategorie)}</span></div>
    <pre data-copy="${esc(p.aufgabe)}" style="white-space:pre-wrap;word-break:break-all">${esc(p.aufgabe)}</pre>
    <p class="small muted">💡 ${esc(p.hinweis)}</p>
    ${done ? `<p class="small" style="color:#9be28f">✓ ${U('Geschafft – +10 Punkte.')}</p>` : `
      <div class="row" style="gap:.4rem;align-items:center">
        <input type="text" id="ctf-in-${p.nr}" placeholder="KLY{…}" autocapitalize="off" autocorrect="off" spellcheck="false" style="flex:1">
        <button class="btn small" id="ctf-go-${p.nr}">${U('Prüfen')}</button>
      </div>
      <p class="small" id="ctf-fb-${p.nr}"></p>`}
  </div>`;
}
function ctfHTML(d) {
  return `
    <div class="card violet">
      <div class="kpis" style="grid-template-columns:repeat(3,1fr)">
        <div class="kpi"><b>${d.streak}🔥</b><span>${U('Tage in Folge')}</span></div>
        <div class="kpi"><b>${d.punkte}</b><span>${U('CTF-Punkte')}</span></div>
        <div class="kpi"><b>${d.geloest.length}/2</b><span>${U('heute')}</span></div>
      </div>
      <p class="small muted" style="margin:.5rem 0 0">${U('Datum')}: ${esc(d.tag)} · ${U('dekodiere die Zeichenkette zur Flag')} <code>KLY{…}</code> ${U('und trag sie ein.')}</p>
    </div>
    ${d.puzzles.map(p => ctfCard(p, d.geloest)).join('')}
    <div class="card">
      <h3 style="margin:0 0 .4rem">🏆 ${U('Bestenliste')}</h3>
      ${d.bestenliste && d.bestenliste.length ? `<ul class="list">${d.bestenliste.map(r => `<li><span class="state">${r.platz}</span><span class="grow"><span class="t">${esc(r.name)}</span></span><span class="badge plain">${r.punkte}</span></li>`).join('')}</ul>` : `<p class="small muted">${U('Noch keine Einträge – sei die oder der Erste!')}</p>`}
    </div>`;
}
views.ctf = () => ({
  title: 'CTF des Tages',
  html: `<a class="back" href="#/heute">← ${U('Start')}</a><h1 style="margin:.3rem 0 .6rem">🏁 ${U('CTF des Tages')}</h1><div id="ctfwrap"><p class="muted">${U('Lade …')}</p></div>`,
  mount(root) {
    const wrap = $('#ctfwrap', root);
    if (!syncStatus().user) {
      wrap.innerHTML = `<div class="card warn"><b>🔐 ${U('Anmelden nötig.')}</b><br><span class="small">${U('Die täglichen CTFs hängen an deinem Nachtfalter-Konto (für fairen Streak und Bestenliste).')} <a href="konto.html">${U('Jetzt anmelden oder registrieren')} →</a></span></div>`;
      return;
    }
    let daten = null;
    const bindCopy = () => $$('[data-copy]', wrap).forEach(b => b.onclick = async () => { try { await navigator.clipboard.writeText(b.getAttribute('data-copy')); } catch { /* */ } });
    const binde = () => {
      bindCopy();
      for (const p of daten.puzzles) {
        if (daten.geloest.includes(p.nr)) continue;
        const go = $(`#ctf-go-${p.nr}`, wrap), inp = $(`#ctf-in-${p.nr}`, wrap), fb = $(`#ctf-fb-${p.nr}`, wrap);
        if (!go) continue;
        const pruef = async () => {
          const versuch = (inp.value || '').trim();
          if (!versuch) return;
          go.disabled = true; fb.textContent = U('Prüfe …');
          try {
            const r = await taeglich('loesen', { nr: p.nr, versuch });
            if (r.ok) { daten.geloest = r.geloest; daten.punkte = r.punkte; daten.streak = r.streak; wrap.innerHTML = ctfHTML(daten); binde(); }
            else { fb.textContent = U('✗ Noch nicht richtig – prüf deine Dekodierung.'); go.disabled = false; }
          } catch (e) { fb.textContent = U('Fehler') + ': ' + (e.message || e); go.disabled = false; }
        };
        go.onclick = pruef;
        inp.onkeydown = (e) => { if (e.key === 'Enter') pruef(); };
      }
    };
    taeglich('info').then(d => { daten = d; wrap.innerHTML = ctfHTML(daten); binde(); })
      .catch(e => { wrap.innerHTML = `<div class="card warn">${U('Konnte nicht laden')}: ${esc(e.message || e)}<br><span class="small">${U('Bist du angemeldet?')} <a href="konto.html">${U('Hier anmelden')}</a>.</span></div>`; });
  },
});

// ---------------------------------------------------------------- Advent-Kalender „Advent of Hacking" (24 Türchen ab 1. Dez)
function adventTile(t, aktivNr) {
  const zustand = t.geloest ? 'done' : t.offen ? 'offen' : 'zu';
  const sym = t.geloest ? '✓' : t.offen ? '🎁' : '🔒';
  const klick = t.offen && !t.geloest;
  return `<button type="button" class="adv-tile ${zustand}${t.nr === aktivNr ? ' aktiv' : ''}" data-nr="${t.nr}" ${klick ? '' : 'disabled'} aria-label="${esc(Ut('Türchen {n}', { n: t.nr }))}"><span class="adv-num">${t.nr}</span><span class="adv-sym">${sym}</span></button>`;
}
function adventPanel(t) {
  if (!t) return '';
  if (!t.offen) return `<div class="card warn"><b>🔒 ${U('Noch nicht offen.')}</b> ${Ut('Türchen {n} öffnet am {n}. Dezember.', { n: t.nr })}</div>`;
  if (t.geloest) return `<div class="card lime"><b>✓ ${Ut('Türchen {n} geschafft.', { n: t.nr })}</b> ${U('Wähle ein anderes Türchen.')}</div>`;
  return `<div class="card" id="adv-panel">
    <div class="row between"><b>🎁 ${esc(t.titel)}</b><span class="badge plain">${esc(t.kategorie)}</span></div>
    <pre data-copy="${esc(t.aufgabe)}" style="white-space:pre-wrap;word-break:break-all">${esc(t.aufgabe)}</pre>
    <p class="small muted">💡 ${esc(t.hinweis)}</p>
    <div class="row" style="gap:.4rem;align-items:center">
      <input type="text" id="adv-in" placeholder="KLY{…}" autocapitalize="off" autocorrect="off" spellcheck="false" style="flex:1">
      <button class="btn small" id="adv-go">${U('Prüfen')}</button>
    </div>
    <p class="small" id="adv-fb"></p>
  </div>`;
}
function adventHTML(d, aktivNr) {
  return `
    <div class="card violet">
      <div class="kpis" style="grid-template-columns:repeat(3,1fr)">
        <div class="kpi"><b>${d.anzahl}/24</b><span>${U('Türchen')}</span></div>
        <div class="kpi"><b>${d.punkte}</b><span>${U('Punkte')}</span></div>
        <div class="kpi"><b>${d.streak}🔥</b><span>${U('Serie')}</span></div>
      </div>
      <p class="small muted" style="margin:.5rem 0 0">${U('Jeden Tag im Dezember öffnet ein Türchen. Dekodiere die Zeichenkette zur Flag')} <code>KLY{…}</code> ${U('– verpasste Türchen kannst du nachholen.')}</p>
    </div>
    ${d.komplett ? `<a class="card lime" href="#/adventurkunde" style="display:block;text-decoration:none;color:inherit"><b>🎄 ${U('Alle 24 geschafft!')}</b><br><span class="small muted">${U('Hol dir dein Advent-Zertifikat')} →</span></a>` : ''}
    <div class="adv-grid">${d.tueren.map(t => adventTile(t, aktivNr)).join('')}</div>
    <div id="adv-panelwrap">${adventPanel(d.tueren.find(x => x.nr === aktivNr))}</div>
    <div class="card">
      <h3 style="margin:0 0 .4rem">🏆 ${U('Bestenliste')}</h3>
      ${d.bestenliste && d.bestenliste.length ? `<ul class="list">${d.bestenliste.map(r => `<li><span class="state">${r.platz}</span><span class="grow"><span class="t">${esc(r.name)}</span></span><span class="badge plain">${r.punkte}</span></li>`).join('')}</ul>` : `<p class="small muted">${U('Noch keine Einträge – sei die oder der Erste!')}</p>`}
    </div>`;
}
views.advent = () => ({
  title: 'Advent of Hacking',
  html: `<a class="back" href="#/heute">← ${U('Start')}</a><h1 style="margin:.3rem 0 .6rem">🎄 ${U('Advent of Hacking')}</h1><div id="advwrap"><p class="muted">${U('Lade …')}</p></div>`,
  mount(root) {
    const wrap = $('#advwrap', root);
    if (!syncStatus().user) {
      wrap.innerHTML = `<div class="card warn"><b>🔐 ${U('Anmelden nötig.')}</b><br><span class="small">${U('Der Advent-Kalender hängt an deinem Nachtfalter-Konto (für Fortschritt und Bestenliste).')} <a href="konto.html">${U('Jetzt anmelden oder registrieren')} →</a></span></div>`;
      return;
    }
    let daten = null, aktivNr = 0;
    const standardAktiv = (d) => { const o = d.tueren.find(t => t.offen && !t.geloest); return o ? o.nr : 0; };
    const bindCopy = () => $$('[data-copy]', wrap).forEach(b => b.onclick = async () => { try { await navigator.clipboard.writeText(b.getAttribute('data-copy')); } catch { /* */ } });
    const binde = () => {
      bindCopy();
      $$('.adv-tile[data-nr]', wrap).forEach(btn => { if (btn.disabled) return; btn.onclick = () => { aktivNr = parseInt(btn.getAttribute('data-nr'), 10); zeichne(); const p = $('#adv-panel', wrap); if (p) p.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }; });
      const go = $('#adv-go', wrap), inp = $('#adv-in', wrap), fb = $('#adv-fb', wrap);
      if (go && inp) {
        const pruef = async () => {
          const versuch = (inp.value || '').trim(); if (!versuch) return;
          go.disabled = true; fb.textContent = U('Prüfe …');
          try {
            const r = await advent('loesen', { nr: aktivNr, versuch });
            if (r.ok) {
              const t = daten.tueren.find(x => x.nr === aktivNr); if (t) { t.geloest = true; delete t.aufgabe; delete t.hinweis; }
              daten.anzahl = r.anzahl; daten.punkte = r.punkte; daten.streak = r.streak; daten.komplett = r.komplett;
              aktivNr = standardAktiv(daten); zeichne();
            } else { fb.textContent = U('✗ Noch nicht richtig – prüf deine Dekodierung.'); go.disabled = false; }
          } catch (e) { fb.textContent = U('Fehler') + ': ' + (e.message || e); go.disabled = false; }
        };
        go.onclick = pruef; inp.onkeydown = (e) => { if (e.key === 'Enter') pruef(); };
      }
    };
    const zeichne = () => { wrap.innerHTML = adventHTML(daten, aktivNr); binde(); };
    advent('info').then(d => { daten = d; aktivNr = standardAktiv(d); zeichne(); })
      .catch(e => { wrap.innerHTML = `<div class="card warn">${U('Konnte nicht laden')}: ${esc(e.message || e)}<br><span class="small">${U('Bist du angemeldet?')} <a href="konto.html">${U('Hier anmelden')}</a>.</span></div>`; });
  },
});
views.adventurkunde = () => {
  const name = (state.profile.name || '').trim() || 'Nachtfalter-Lernende(r)';
  const jahr = new Date().getFullYear();
  const datum = new Date().toLocaleDateString(currentLang() === 'en' ? 'en-GB' : 'de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
  const h = Math.abs([...(name + ':advent:' + jahr)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)).toString(36).toUpperCase().padStart(5, '0').slice(0, 5);
  const code = 'NF-ADV-' + jahr + '-' + h;
  const style = `<style>
.adz{max-width:820px;margin:0 auto;position:relative;background:linear-gradient(160deg,#0f1b2d,#17233b);color:#f3f6ff;border:2px solid #c9a24a;border-radius:16px;padding:40px 44px;text-align:center;font-family:Georgia,'Times New Roman',serif;overflow:hidden}
.adz:before{content:"";position:absolute;inset:10px;border:1px solid #c9a24a66;border-radius:10px;pointer-events:none}
.adz-mk{letter-spacing:.3em;font-size:.72rem;color:#c9a24a;text-transform:uppercase;font-family:system-ui,sans-serif}
.adz-tree{font-size:2.6rem}
.adz h2{font-size:2rem;margin:.3rem 0 .1rem;color:#fff}
.adz .name{font-size:1.5rem;color:#ffe9a8;margin:.6rem 0}
.adz .sub{color:#c7d2e8;font-size:.95rem}
.adz .meta{color:#9fb0cf;font-size:.8rem;margin-top:1rem;font-family:system-ui,sans-serif}
@media print{@page{size:A4 landscape;margin:14mm}body{background:#fff !important}.top,.nav,.meldfab,#lang-banner,.zert-noprint{display:none !important}#main{margin:0 !important;padding:0 !important;max-width:none !important}}
</style>`;
  return {
    title: 'Advent-Zertifikat', wide: true,
    html: `${style}
    <div class="zert-noprint" style="margin-bottom:.8rem"><a class="back" href="#/advent">← ${U('Advent-Kalender')}</a>
      <div class="row between" style="align-items:center;margin-top:.3rem"><h1 style="margin:0">🎄 ${U('Advent-Zertifikat')}</h1><button class="btn primary" id="advdruck" disabled>🖨️ ${U('Als PDF speichern')}</button></div></div>
    <div id="advzert"><p class="muted">${U('Lade …')}</p></div>`,
    mount(root) {
      const box = $('#advzert', root), db = $('#advdruck', root);
      if (!syncStatus().user) { box.innerHTML = `<div class="card warn"><b>🔐 ${U('Anmelden nötig.')}</b></div>`; return; }
      advent('info').then(d => {
        if (!d.komplett) { box.innerHTML = `<div class="card warn"><b>🎁 ${Ut('Erst {n}/24 Türchen.', { n: d.anzahl })}</b><br><span class="small">${U('Das Zertifikat gibt es, wenn du alle 24 geschafft hast.')} <a href="#/advent">${U('Weiter zum Kalender')} →</a></span></div>`; return; }
        box.innerHTML = `<div class="adz">
          <div class="adz-tree">🎄</div>
          <p class="adz-mk">Nachtfalter Hacklab</p>
          <h2>${U('Advent of Hacking')} ${jahr}</h2>
          <p class="sub">${U('Dieses Zertifikat bestätigt, dass')}</p>
          <p class="name">${esc(name)}</p>
          <p class="sub">${U('alle 24 Türchen des Advent-Kalenders gelöst hat. 🏆')}</p>
          <p class="meta">${esc(datum)} · ${U('Zertifikat-Nr.')} ${code}</p>
        </div>`;
        if (db) { db.disabled = false; db.onclick = () => window.print(); }
      }).catch(() => { box.innerHTML = `<div class="card warn">${U('Konnte nicht laden.')}</div>`; });
    },
  };
};

// ---------------------------------------------------------------- Lernpfad (geführte Lernstufen, Leiter)
let arenaProg = {}; let arenaProgGeladen = false;
async function ladeArenaProg() {
  try { arenaProg = await arenaFortschritt(); } catch { /* offline/kein Konto */ }
  arenaProgGeladen = true;
}
function reqErfuellt(req) {
  if (!req) return true;
  if (req.lektion) return lessonDone(req.lektion);
  if (req.raum) return roomDone(req.raum);
  if (req.arena) return (arenaProg[req.arena] || 0) >= (req.level || 1);
  return false;
}
// Eine Stufe gilt als geschafft, wenn ihre Übung erfüllt ist (inkl. Alternativen auchRaum/auchArena)
function stufeGeschafft(st) {
  const u = st.uebung || {};
  return reqErfuellt(u.erfordert) || (u.auchRaum && roomDone(u.auchRaum)) || (u.auchArena && reqErfuellt({ arena: u.auchArena.arena, level: u.auchArena.level }));
}
const stufeOffen = (i) => i === 0 || stufeGeschafft(LERNPFAD[i - 1]);
const pfadUebungLink = (href) => href && href.startsWith('arena:') ? `${(globalThis.KLY_CONFIG || {}).arenaUrl || ''}/?lab=${href.slice(6)}` : href;

views.lernpfad = () => {
  if (!arenaProgGeladen) ladeArenaProg().then(render);
  const geschafft = LERNPFAD.filter(stufeGeschafft).length;
  const naechste = LERNPFAD.findIndex((st, i) => stufeOffen(i) && !stufeGeschafft(st));
  return {
    title: 'Lernpfad',
    html: `<h1>📚 Lernpfad</h1>
    <p class="small muted">Schritt für Schritt: Theorie, Beispiel und eine eigene Übung. Die nächste Stufe öffnet sich, wenn du die Übung der vorigen geschafft hast.</p>
    ${syncConfigured() && !syncStatus().user ? '<div class="card warn small"><b>Tipp:</b> Melde dich mit deinem Konto an, damit dein Arena-Fortschritt hier zählt. <a href="konto.html">Anmelden</a></div>' : ''}
    <div class="balken" style="margin:.4rem 0"><i style="width:${Math.round(100 * geschafft / LERNPFAD.length)}%"></i></div>
    <p class="small muted">${geschafft} von ${LERNPFAD.length} Stufen geschafft</p>
    <ul class="list card">${LERNPFAD.map((st, i) => {
      const offen = stufeOffen(i), done = stufeGeschafft(st), ist = i === naechste;
      return `<li><a href="${offen ? '#/lernstufe/' + st.id : '#'}" ${offen ? '' : 'style="opacity:.6"'} ${offen ? '' : 'onclick="return false"'}>
        <span class="state ${done ? 'done' : ''}">${done ? '✓' : offen ? st.icon : '🔒'}</span>
        <span class="grow"><span class="t">${esc(st.titel)}${ist ? ' <span class="badge plain">hier weiter</span>' : ''}</span>
        <span class="s">${done ? 'geschafft' : offen ? 'offen' : 'erst die Übung der vorigen Stufe abschließen'}</span></span></a></li>`;
    }).join('')}</ul>`,
  };
};
views.lernstufe = (id) => {
  const i = LERNPFAD.findIndex(x => x.id === id); const st = LERNPFAD[i];
  if (!st) return views.lernpfad();
  if (!stufeOffen(i)) return { title: st.titel, html: `<a class="back" href="#/lernpfad">← Lernpfad</a><div class="card warn"><b>🔒 Noch gesperrt.</b> Schließe erst die Übung der vorigen Stufe ab.</div>` };
  if (!arenaProgGeladen) ladeArenaProg().then(render);
  const u = st.uebung || {}; const done = stufeGeschafft(st);
  const lp = (state.lernpfad = state.lernpfad || {}); const ref = (lp[id] = lp[id] || {});
  const offenbar = !!ref.offen; // Profi-Zusammenfassung schon aufgedeckt?
  return {
    title: st.titel,
    html: `<a class="back" href="#/lernpfad">← Lernpfad</a>
    <h1>${st.icon} ${esc(st.titel)}</h1>
    <p>${esc(st.einleitung)}</p>
    ${st.konzepte?.length ? `<div class="card"><h3 style="margin-top:0">Das solltest du kennen</h3><dl class="pfad-konzepte">${st.konzepte.map(([w, t]) => `<dt>${esc(w)}</dt><dd>${esc(t)}</dd>`).join('')}</dl></div>` : ''}
    ${st.beispiel ? `<div class="card"><h3 style="margin-top:0">🧪 Beispiel</h3><p class="small">${esc(st.beispiel.text)}</p><pre class="pfad-code" translate="no">${st.beispiel.befehle.map(esc).join('\n')}</pre></div>` : ''}
    ${st.selbst?.length ? `<div class="card"><h3 style="margin-top:0">✋ Jetzt du</h3><ol class="pfad-selbst">${st.selbst.map(x => `<li>${esc(x)}</li>`).join('')}</ol></div>` : ''}
    <div class="card ${done ? 'lime' : 'violet'}">
      <h3 style="margin-top:0">${done ? '✓ Übung geschafft' : '🎯 Deine Übung'}</h3>
      <p class="small">${esc(u.hinweis || '')}</p>
      ${u.href ? `<a class="btn primary" href="${esc(pfadUebungLink(u.href))}" ${u.href.startsWith('arena:') ? 'target="_blank" rel="noopener"' : ''}>${esc(u.label || 'Zur Übung')} →</a>` : ''}
      ${!done ? '<p class="small muted" style="margin:.5rem 0 0">Sobald du das geschafft hast, öffnet sich die nächste Stufe. (Arena-Fortschritt zählt, wenn du angemeldet bist.)</p>' : (LERNPFAD[i + 1] ? `<p style="margin:.5rem 0 0"><a class="btn" href="#/lernstufe/${LERNPFAD[i + 1].id}">Nächste Stufe →</a></p>` : '<p class="small">🏆 Das war die letzte Stufe – stark!</p>')}
    </div>
    <div class="card">
      <h3 style="margin-top:0">✍️ Verstanden-Check</h3>
      <p class="small muted">Das Wichtigste bleibt hängen, wenn du es selbst in Worte fasst – wie in einem kleinen Pentest-Bericht. (Freiwillig, schaltet nichts frei.)</p>
      <label class="small">Welche Technik/Lücke steckt hinter dieser Stufe?<textarea id="ref-was" rows="2" placeholder="In eigenen Worten …">${esc(ref.was || '')}</textarea></label>
      <label class="small">Wie würde man sich davor schützen?<textarea id="ref-schutz" rows="2" placeholder="Deine Gegenmaßnahme …">${esc(ref.schutz || '')}</textarea></label>
      <div class="row" style="margin-top:.4rem"><button class="btn small primary" id="ref-save">Speichern</button><button class="btn small ghost" id="ref-zeig">${offenbar ? 'Profi-Zusammenfassung' : 'Erst selbst versuchen, dann Profi-Lösung zeigen'}</button></div>
      <div id="ref-loesung" ${offenbar ? '' : 'hidden'}>${st.schutz ? `<div class="card lime tight" style="margin-top:.6rem"><b>So fasst es ein Profi zusammen:</b><br>${esc(st.schutz)}</div>` : ''}</div>
      <p id="ref-msg" class="small muted" style="margin:.3rem 0 0"></p>
    </div>`,
    mount(root) {
      const g = (x) => root.querySelector(x);
      g('#ref-save').onclick = () => { ref.was = g('#ref-was').value.trim().slice(0, 500); ref.schutz = g('#ref-schutz').value.trim().slice(0, 500); ref.at = Date.now(); save(); g('#ref-msg').textContent = '✓ Gespeichert.'; };
      g('#ref-zeig').onclick = () => { ref.offen = true; save(); g('#ref-loesung').hidden = false; g('#ref-zeig').textContent = 'Profi-Zusammenfassung'; };
    },
  };
};

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
        ${PFADE[l.id] ? `<h3>Lernpfad (kostenlos, ohne Abo)</h3><ol class="small" style="padding-left:1.2rem">${PFADE[l.id].map(x => `<li style="margin:.35rem 0"><a href="${x.url}" ${x.url.startsWith('http') ? 'target="_blank" rel="noopener noreferrer"' : ''}><b>${esc(x.t)}</b></a><br><span class="muted">${esc(x.why)}</span></li>`).join('')}</ol>` : ''}
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
          <span class="grow"><b>${L1h(ls.title)}</b><br><span class="small muted">Lektion · ca. ${ls.minutes} min</span></span>
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
    <h1 style="margin-top:.4rem">${L1h(l.title)}</h1>
    <p>${L1h(l.intro)}</p>
    <div class="stack">${l.concepts.map(c => `
      <div class="card concept">
        <h2>${L1h(c.name)}</h2>
        <dl><dt>Zweck</dt><dd>${L1h(c.zweck)}</dd><dt>Syntax</dt><dd><pre class="syntax">${esc(c.syntax)}</pre></dd>
        <dt>Argumente</dt><dd><table class="args">${c.args.map(([a, d]) => `<tr><td translate="no"><code>${esc(a)}</code></td><td>${L1h(d)}</td></tr>`).join('')}</table></dd>
        <dt>Wirkung</dt><dd>${L1h(c.wirkung)}</dd>
        <dt>Typische Fehler</dt><dd><ul style="margin:0;padding-left:1.1rem">${c.fehler.map(f => `<li>${L1h(f)}</li>`).join('')}</ul></dd></dl>
        <div class="rule">${L1h(c.regel)}</div>
      </div>`).join('')}
      <div class="card">
        <p class="small muted">Probier die Befehle frei im <a href="#/terminal">Terminal</a> aus – oder spring direkt in eine Übung. Jede Übung hat Tipps bis zur Lösung.</p>
        ${lessonDone(id) ? '<p class="small">✓ Als gelesen markiert</p>' : '<button class="btn block" id="read">✓ Als gelesen markieren</button>'}
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
  if (loc === 'pc' || loc === 'windows') html += `<p><b>🖥️ PC (Kali-VM):</b> ${L1h(v.pc)}</p>`;
  if (loc === 'phone') html += `<p><b>📱 Handy (Termux/NetHunter Rootless):</b> ${L1h(v.phone)}</p>`;
  if (loc === 'both') html += `<p><b>🖥️ PC:</b> ${L1h(v.pc)}</p><p><b>📱 Handy:</b> ${L1h(v.phone)}</p>`;
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
  return `<ul class="results">${res.results.map(r => `<li class="${r.ok ? 'ok' : 'no'}">${L1h(r.label)}${!r.ok && r.rueckfrage ? `<span class="q">${L1h(r.rueckfrage)}</span>` : ''}</li>`).join('')}</ul>`;
}

views.uebung = (id) => {
  const e = EX[id];
  if (!e) return views.pfad();
  const st = exState(id);
  if (!state.archive[id]) { state.archive[id] = Date.now(); save(); }
  const repeat = !!st.passedAt;
  const run = { taskOk: false, knobelOk: false, fails: 0 };
  const tips = niveau() === 'experte' ? [] : uebungsTipps(e, LESSON[e.lesson]);
  const tipCost = tips.length ? e.xp / tips.length : 0;
  const isReal = e.kind === 'real';
  return {
    html: `<a class="back" href="#/lektion/${e.lesson}">${U('← Spickzettel: {title}', { title: L1.t(LESSON[e.lesson].title) })}</a>
    <div class="row">${isReal ? `<span class="badge real">${U('Echter Auftrag · deine Kali-VM / Termux')}</span>` : `<span class="badge sim">${U('Sandbox-Simulation')}</span>`}<span class="badge plain">${esc(kindLabel(e))}</span>${repeat ? '<span class="badge ok">bestanden · Wiederholung ohne Punkte</span>' : `<span class="badge plain">${e.xp} Punkte</span>`}</div>
    <h1 style="margin-top:.5rem">${L1h(e.title)}</h1>
    <div class="stack">
      <div class="task-meta">
        <div><b>${U('Lernziel')}</b>${L1h(e.ziel)}</div>
        <div><b>${U('Arbeitsauftrag')}</b><span class="auftrag">${L1h(e.auftrag)}</span></div>
        <div><b>${U('Scope')}</b>${L1h(e.scope)}</div>
        <div><b>${U('Verlangter Beleg')}</b>${L1h(e.beleg)}</div>
      </div>
      ${isReal ? `
      <div class="card lime stack">
        <h3>${U('Im echten Terminal')}</h3>
        ${vorausHTML(e.real)}
        ${scriptBlock(Ut('Setup (vorbereitend – nicht die Lösung):'), e.real.setup)}
        <p class="small muted">${U('Dein persönlicher Lab-Token:')} <code>${esc(state.labToken)}</code></p>
        <div id="evbox">${evidenceForm('ev', st.evidence)}</div>
        <button class="btn go block" id="check">${U('Beleg prüfen')}</button>
        <div id="fb"></div>
        <details><summary>${U('Abbruch / Aufräumen')}</summary><pre class="syntax">${esc(tok(e.real.cleanup))}</pre></details>
      </div>` : `
      <div id="termwrap"></div>
      <div class="row"><button class="btn go" id="check">${U('Ergebnis prüfen')}</button><button class="btn ghost" id="reset">${U('Übung neu starten')}</button></div>
      <div id="fb"></div>`}
      ${tips.length ? `<div class="card" id="hintcard">
        <div class="row between"><b>${U('💡 Tipps')}</b><span class="small muted" id="hintstate"></span></div>
        <div class="tips" id="hinttext"></div>
      </div>` : `<div class="card tight small muted">🔥 ${U('Experten-Modus: ohne Tipps – dafür die vollen Punkte. Du kannst die Stufe im Profil ändern.')}</div>`}
      <div id="knobel"></div>
      <div id="debrief"></div>
    </div>`,
    mount(root) {
      let shell = null;
      let term = null;
      const fb = $('#fb', root);
      // Tipp-Leiter wie in den Leitern: sofort abrufbar, jeder Tipp kostet Punkte (Wiederholungen kosten nichts)
      let shownFree = 0;
      const used = () => (repeat ? shownFree : Math.min(st.tips || 0, tips.length));
      const left = (u) => Math.max(1, Math.round(e.xp - u * tipCost));
      const updateHint = () => {
        const u = used();
        const last = u === tips.length - 1 && /^Lösung/.test(tips[tips.length - 1]);
        $('#hintstate', root).textContent = repeat ? Ut('Wiederholung – Tipps kostenlos') : u ? Ut('noch {a} von {b} Punkten', { a: left(u), b: e.xp }) : Ut('{n} Punkte', { n: e.xp });
        $('#hinttext', root).innerHTML = tips.slice(0, u).map((h, i) => `<div class="feedback info small"><b>Tipp ${i + 1}/${tips.length}:</b> ${L1h(h, codeify)}</div>`).join('') +
          (u < tips.length && !run.taskOk ? `<button class="btn small ghost" id="hint">${repeat ? (last ? U('💡 Lösung zeigen') : U(u ? '💡 Nächster Tipp {i}/{n}' : '💡 Tipp {i}/{n}', { i: u + 1, n: tips.length })) : (last ? U('💡 Lösung zeigen · danach noch {p} P.', { p: left(u + 1) }) : U(u ? '💡 Nächster Tipp {i}/{n} · danach noch {p} P.' : '💡 Tipp {i}/{n} · danach noch {p} P.', { i: u + 1, n: tips.length, p: left(u + 1) }))}</button>` : '');
        const b = $('#hint', root);
        if (b) b.onclick = () => {
          if (last && !twoTap(b, Ut('Wirklich die Lösung zeigen?'))) return;
          if (repeat) shownFree++; else { st.tips = (st.tips || 0) + 1; st.hintUsed = true; save(); }
          updateHint();
        };
      };
      if (tips.length) updateHint();

      const start = () => {
        $('#termwrap', root).innerHTML = '';
        shell = new Shell({ fs: baseFS() });
        e.sandbox.setup(shell);
        if (L1.active) translateTree(shell.fs.get(HOME + '/lab'), L1);
        term = mountTerminal($('#termwrap', root), shell, { title: Ut('Sandbox · {title}', { title: L1.t(e.title) }), welcome: Ut('Übungsumgebung bereit. Tipp: help, man BEFEHL, Tab ergänzt Namen.') });
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
          html = `<div class="feedback ${ok ? 'ok' : 'no'}">${L1h(r.msg)}</div>`;
        }
        if (!ok) { run.fails++; st.failed = (st.failed || 0) + 1; }
        save();
        fb.innerHTML = (ok ? `<div class="feedback ok"><b>${U('Beleg geprüft.')}</b> ${U('Jetzt die Knobelfrage – sie prüft, ob du das Ergebnis richtig deutest.')}</div>` : '') + html;
        updateHint();
        if (ok) { run.taskOk = true; showKnobel(); }
      };

      const showKnobel = () => {
        const k = e.knobel;
        const opts = shuffle(k.options.map((o, i) => ({ ...o, i })));
        const box = $('#knobel', root);
        box.innerHTML = `<div class="card violet"><h3>${U('Knobelfrage')}</h3><p>${L1h(k.q)}</p>
          ${opts.map(o => `<button class="opt" data-i="${o.i}">${L1h(o.t)}</button>`).join('')}
          <div id="kfb"></div></div>`;
        box.scrollIntoView({ behavior: 'smooth', block: 'start' });
        $$('.opt', box).forEach(b => b.onclick = () => {
          if (run.knobelOk) return;
          const o = k.options[+b.dataset.i];
          if (o.ok) {
            b.classList.add('right'); run.knobelOk = true; finish();
          } else {
            b.classList.add('wrong');
            $('#kfb', box).innerHTML = `<div class="feedback no">${L1h(o.why || 'Prüfe deine Annahme noch einmal.')}</div>`;
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
        $('#debrief', root).innerHTML = `<div class="card lime debrief"><h3>${U('Nachbesprechung')}</h3><dl>
          <dt>Beobachtung</dt><dd>${L1h(n.beobachtung)}</dd><dt>Schlussfolgerung</dt><dd>${L1h(n.schluss)}</dd>
          <dt>${U('Grenzen')}</dt><dd>${L1h(n.grenzen)}</dd><dt>${U('Möglicher nächster Test')}</dt><dd>${L1h(n.naechster)}</dd></dl>
          <p class="small">${first ? (st.tips ? U('✓ Bestanden · +{p} Punkte ({n} Tipps genutzt)', { p: left(Math.min(st.tips, tips.length)), n: st.tips }) : U('✓ Bestanden · +{p} Punkte', { p: e.xp })) : U('✓ Wiederholung erfolgreich (ohne Punkte)')}</p>
          ${nextAfter(e)}</div>`;
        $('#debrief', root).scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
    },
  };
};

function nextAfter(e) {
  const l = LESSON[e.lesson];
  const i = l.exercises.indexOf(e.id);
  if (i < l.exercises.length - 1) return `<a class="btn primary" href="#/uebung/${l.exercises[i + 1]}">${U('Nächste Übung →')}</a>`;
  const li = LESSONS.indexOf(l);
  if (li < LESSONS.length - 1) return `<a class="btn primary" href="#/lektion/${LESSONS[li + 1].id}">${U('Nächste Lektion →')}</a>`;
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
      html: `<h1>${U('Story-Lab: {title}', { title: L1.t(s.title) })}</h1>
      <div class="card"><p>${L1h(s.teaser)}</p><p class="small muted">${U('Rolle:')} ${L1h(s.role)} · ${U('Werkzeuge:')} <span translate="no">${s.tools.map(esc).join(', ')}</span></p></div>
      <div class="card warn"><b>${U('🔒 Noch gesperrt.')}</b> ${U('Die Mission verlangt diese Grundlagen – sonst wird sie zum Raten:')}
      <ul class="list">${missing.map(m => exItem(m)).join('')}</ul></div>`,
    };
  }
  const ss = state.story[s.id] || (state.story[s.id] = { scene: 0, attempts: {}, hintUsed: {}, evidence: {}, answers: {}, report: {}, progress: {} });
  ss.progress = ss.progress || {};
  return {
    html: `<div class="row between"><h1 style="margin:0">${U('Story-Lab: {title}', { title: L1.t(s.title) })}</h1>${ss.done ? `<span class="badge ok">${U('abgeschlossen')}</span>` : ''}</div>
    <p class="small muted">${L1h(s.role)}</p>
    <div class="grid">
      <div class="card tight" id="scenecard"></div>
      <div id="tw"></div>
      <div class="card tight"><b class="small">${U('Fallverlauf')}</b><ul class="timeline" id="tl"></ul></div>
    </div>
    <p class="honest">${U('Die Fallakte im Terminal ist SIMULIERT; Szenen mit „echt“ führst du in deiner eigenen Kali-VM/Termux aus und belegst sie hier.')}</p>`,
    keepScroll: false,
    mount(root) {
      const sh = new Shell({ fs: baseFS() });
      s.sandbox.setup(sh);
      if (L1.active) translateTree(sh.fs.get(HOME + '/fall-0417'), L1);
      let term;
      const scene = () => s.scenes[Math.min(ss.scene, s.scenes.length - 1)];
      const prog = () => (ss.progress[scene().id] = ss.progress[scene().id] || {});
      // Antwort-Optionen pro Spieler stabil gemischt (Seed aus Lab-Token + Szene), angezeigt als a/b/c
      const shown = (sc) => shuffle(sc.options, [...(state.labToken + sc.id)].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7)).map((o, i) => ({ ...o, key: 'abc'[i] }));
      const needs = (sc) => ({ ev: sc.kind === 'real', ans: !!sc.answer, opt: !!sc.options, rep: sc.kind === 'report' });
      const complete = (sc) => { const n = needs(sc), p = ss.progress[sc.id] || {}; return (!n.ev || p.ev) && (!n.ans || p.ans) && (!n.opt || p.opt) && (!n.rep || p.rep); };
      const fail = (sc) => { ss.attempts[sc.id] = (ss.attempts[sc.id] || 0) + 1; save(); renderCard(); };

      const say = (who, text) => {
        if (who === 'sys') term.printHTML(`<span class="sys">${esc(text)}</span>`);
        else term.printHTML(`<span class="story"><b>[${esc(who)}]</b> ${esc(text)}</span>`);
      };
      const showScene = (resume) => {
        const sc = scene();
        term.printHTML(`<span class="good">${esc(Ut('━━ Szene {n}/{all}: {title} ━━', { n: ss.scene + 1, all: s.scenes.length, title: L1.t(sc.title) + (sc.kind === 'real' ? ' ' + Ut('· ECHTER AUFTRAG') : sc.kind === 'sim' ? ' ' + Ut('· SIMULATION') : '') }))}</span>`);
        if (resume) say('sys', Ut('(Fortsetzung – dein Fortschritt wurde gespeichert)'));
        sc.chat.forEach(([w, t]) => say(L1.t(w), L1.t(t)));
        term.printHTML(`<span class="warn">${esc(Ut('AUFTRAG: {text}', { text: L1.t(sc.auftrag) }))}</span>`);
        if (sc.options && (!needs(sc).ev || prog().ev) && (!needs(sc).rep || prog().rep)) printOptions(sc);
        term.printHTML(`<span class="sys">${esc(Ut('Befehle: auftrag · akte · beleg · antwort … · hinweis · scope · status · weiter · story-hilfe'))}</span>`);
      };
      const printOptions = (sc) => {
        term.printHTML(`<span class="story">${esc(L1.t(sc.optionsPrompt || sc.auftrag))}</span>`);
        shown(sc).forEach(o => term.printHTML(`<span class="story">  ${o.key}) ${esc(L1.t(o.t))}</span>`));
      };

      const stepDone = (sc) => {
        if (complete(sc)) {
          say('sys', Ut('✓ Szene abgeschlossen.'));
          say(L1.t('Mara (Schichtleitung)'), L1.t(sc.debrief).replace(/^Mara: /, '').replace(/^["„«]|["“»]$/g, ''));
          if (ss.scene < s.scenes.length - 1) term.printHTML(`<span class="good">${esc(Ut('Weiter mit: weiter'))}</span>`);
          else {
            if (!ss.done) { ss.done = true; ss.doneAt = Date.now(); }
            term.printHTML(`<span class="good">★ Mission abgeschlossen · +${s.points} Punkte</span>`);
            term.printHTML(`<span class="warn">${esc(tok(L1.t(s.finalCleanup)))}</span>`);
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
            term.printHTML(`<span class="good">${esc(Ut('✓ Beleg geprüft: {command}', { command: res.command }))}</span>`);
            if (sc.answer && !prog().ans) term.printHTML('<span class="story">Jetzt: antwort &lt;…&gt;</span>');
            stepDone(sc);
          } else {
            fail(sc);
            term.printHTML(`<span class="err">${esc(Ut('✗ Beleg reicht noch nicht.'))} ${esc(res.scopeViolation ? Ut('SCOPE-VERLETZUNG – sofort stoppen.') : Ut('Siehe Rückfragen im Belegfeld.'))}</span>`);
          }
        };
      };

      const openReport = () => {
        const sc = scene();
        if (sc.kind !== 'report') { term.print('Der Bericht kommt in der letzten Szene.', 'sys'); return; }
        const r = ss.report || {};
        term.slot.innerHTML = `<div class="term-paste"><b>Übergabebericht SOC-0417</b>
          ${sc.reportFields.map(([k, t, ph]) => `<label for="rp-${k}">${L1h(t)}</label><textarea id="rp-${k}" style="min-height:70px;font-family:var(--sans)" placeholder="${esc(L1.t(ph))}">${esc(r[k] || '')}</textarea>`).join('')}
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
          const grenzenOk = /(nicht|offen|unklar|nachbau|original|log|not|unknown|unclear|replica|open)/i.test(v.grenzen);
          if (short.length || !grenzenOk) {
            fail(sc);
            $('#rpfb', root).innerHTML = `<div class="feedback no">${short.length ? esc(Ut('Zu knapp: {fields}. Ein Kollege muss den Bericht ohne Rückfrage verstehen.', { fields: short.map(x => L1.t(x[1])).join(', ') })) : ''} ${!grenzenOk ? 'Grenzen: Was weißt du ausdrücklich NICHT? Und worin unterscheidet sich dein Nachbau vom Original?' : ''}</div>`;
            return;
          }
          prog().rep = true; save();
          term.slot.innerHTML = '';
          term.printHTML(`<span class="good">${esc(Ut('✓ Bericht abgegeben.'))}</span>`);
          stepDone(sc);
        };
      };

      const cmds = {
        auftrag: () => { const sc = scene(); term.printHTML(`<span class="warn">${esc(Ut('AUFTRAG: {text}', { text: L1.t(sc.auftrag) }))}</span>`); return { out: '', code: 0 }; },
        scope: () => ({ out: 'SCOPE: ' + L1.t(scene().scope) + '\n', code: 0 }),
        akte: (a, { sh: x }) => x.exec('ls -l ~/fall-0417'),
        status: () => {
          const sc = scene(), n = needs(sc), p = prog();
          const st = (x) => ({ state: x ? '✓' : Ut('offen') });
          const parts = [n.ev && Ut('Beleg {state}', st(p.ev)), n.ans && Ut('Antwort {state}', st(p.ans)), n.rep && Ut('Bericht {state}', st(p.rep)), n.opt && Ut('Entscheidung {state}', st(p.opt))].filter(Boolean);
          return { out: `Szene ${ss.scene + 1}/${s.scenes.length} „${L1.t(sc.title)}“: ${parts.join(' · ')}${complete(sc) ? ' → weiter' : ''}\n`, code: 0 };
        },
        hinweis: () => {
          const sc = scene();
          const a = ss.attempts[sc.id] || 0;
          if (ss.hintUsed[sc.id]) return { out: `HINWEIS (bereits genutzt): ${L1.t(sc.hinweis)}\n`, code: 0 };
          if (a < 2) return { out: '', err: `Noch kein Hinweis: erst nach 2 eigenen Versuchen in dieser Szene (${a}/2). Was hast du bisher geprüft?\n`, code: 1 };
          ss.hintUsed[sc.id] = true; save();
          return { out: `HINWEIS: ${L1.t(sc.hinweis)}\n`, code: 0 };
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
            if (!r.ok) { fail(sc); return { out: '', err: L1.t(r.msg || 'Noch nicht.') + '\n', code: 1 }; }
            p.ans = true; save();
            term.printHTML(`<span class="good">${esc(Ut('✓ Antwort belegt.'))}</span>`);
            stepDone(sc);
            return { out: '', code: 0 };
          }
          if (n.opt && !p.opt) {
            const o = shown(sc).find(x => x.key === ans);
            if (!o) return { out: '', err: `Antworte mit ${shown(sc).map(x => x.key).join(' / ')}\n`, code: 1 };
            if (!o.ok) { fail(sc); return { out: '', err: L1.t(o.why || 'Nicht ganz.') + '\n', code: 1 }; }
            p.opt = true; ss.answers[sc.id + '-opt'] = ans; save();
            term.printHTML(`<span class="good">${esc(Ut('✓ Entscheidung begründet.'))}</span>`);
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
          <div class="row between"><span>${sc.kind === 'real' ? `<span class="badge real">${U('Echter Auftrag')}</span>` : sc.kind === 'sim' ? `<span class="badge sim">${U('Simulation')}</span>` : sc.kind === 'report' ? `<span class="badge plain">${U('Bericht')}</span>` : '<span class="badge plain">Entscheidung</span>'} <b>Szene ${ss.scene + 1}/${s.scenes.length}: ${L1h(sc.title)}</b></span><span class="small muted">Versuche: ${a}</span></div>
          <div class="task-meta" style="margin-top:.6rem"><div><b>Lernziel</b>${L1h(sc.ziel)}</div><div><b>Auftrag</b>${L1h(sc.auftrag)}</div><div><b>Scope</b>${L1h(sc.scope)}</div></div>
          ${sc.kind === 'real' ? `<details ${p.ev ? '' : 'open'} style="margin-top:.6rem"><summary>Anleitung für dein echtes Terminal</summary>${vorausHTML(sc.real)}${scriptBlock('Setup (Lab-Nachbau):', sc.real.setup)}<p class="small muted">Lab-Token: <code>${esc(state.labToken)}</code> · ${L1h(sc.real.cleanup)}</p></details>
          <div class="row" style="margin-top:.5rem"><button class="btn go small" id="evbtn" ${p.ev ? 'disabled' : ''}>${p.ev ? U('✓ Beleg geprüft') : U('Beleg einfügen (= beleg)')}</button></div>` : ''}
          ${sc.kind === 'report' ? `<div class="row" style="margin-top:.5rem"><button class="btn go small" id="rpbtn">${p.rep ? U('✓ Bericht abgegeben – ansehen') : U('Bericht schreiben (= bericht)')}</button></div>` : ''}
          ${complete(sc) && ss.scene < s.scenes.length - 1 ? `<div class="row" style="margin-top:.5rem"><button class="btn primary small" id="nxbtn">${U('Nächste Szene (= weiter)')}</button></div>` : ''}`;
        bindCopy($('#scenecard', root));
        const evb = $('#evbtn', root); if (evb) evb.onclick = () => { openEvidence(); term.el.scrollIntoView({ behavior: 'smooth', block: 'end' }); };
        const rpb = $('#rpbtn', root); if (rpb) rpb.onclick = () => { openReport(); term.el.scrollIntoView({ behavior: 'smooth', block: 'end' }); };
        const nxb = $('#nxbtn', root); if (nxb) nxb.onclick = () => term.run('weiter');
      }
      function renderTL() {
        $('#tl', root).innerHTML = s.scenes.map((sc, i) => `<li><span class="state ${complete(sc) ? 'done' : i === ss.scene ? '' : 'lock'}">${complete(sc) ? '✓' : i + 1}</span>${L1h(sc.title)} ${sc.kind === 'real' ? '<span class="badge real">echt</span>' : ''}</li>`).join('');
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
  const intro = `<a class="back" href="#/level/${lv}">← Level 1</a><h1>${L1h(ex.title)}</h1>
    <div class="card"><p>${L1h(ex.rules)}</p><p class="small muted">${ex.items.length} Aufgaben · davon ${ex.items.filter(i => i.mandatory).length} Pflicht (★) · ${ex.items.filter(i => i.type === 'sandbox').length} Praxisaufgaben in der Sandbox</p>
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
      <p>${L1h(it.q)}</p>
      ${it.type === 'mc' ? it.order.map(i => `<button class="opt" data-q="${it.id}" data-i="${i}">${L1h(it.options[i])}</button>`).join('') : ''}
      ${it.type === 'input' ? `<input type="text" data-in="${it.id}" autocapitalize="off" autocorrect="off" spellcheck="false">` : ''}
      ${it.type === 'sandbox' ? `<div data-term="${it.id}"></div>` : ''}
    </div>`).join('')}
    <button class="btn go block" id="submit">Prüfung abgeben</button>
    <div id="result"></div></div>`;
  for (const it of items.filter(i => i.type === 'sandbox')) {
    const sh = new Shell({ fs: baseFS() });
    it.setup(sh);
    if (L1.active) translateTree(sh.fs.get(HOME + '/pruefung'), L1);
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
  <div class="card"><h3 style="margin-top:0">🧭 „Brauche ich das?" – Kurz-Checkliste</h3>
    <p class="small"><b>Für die Arena & die App-Übungen: nichts installieren.</b> Alles läuft im Browser (den Linux-Server stellen wir). Werkzeuge brauchst du nur für die <b>optionalen „echten Kali-Aufträge"</b>.</p>
    <p class="small"><b>✅ Standard-Kali bringt fast alles schon mit</b> – einfach benutzen, nichts tun:</p>
    <ul class="list"><li><span class="state done">✓</span><span class="grow"><span class="t"><code translate="no">curl</code>, <code translate="no">grep</code>/<code translate="no">find</code>, <code translate="no">ps</code>, <code translate="no">nmap</code>, <code translate="no">wireshark</code></span><span class="s">Grundlagen, Scannen, Pakete ansehen (Level 1–9)</span></span></li>
      <li><span class="state done">✓</span><span class="grow"><span class="t">Burp Suite, <code translate="no">gobuster</code>/<code translate="no">ffuf</code>, <code translate="no">whatweb</code>, <code translate="no">nikto</code></span><span class="s">Web-Hacking (Level 3) – im Standard-Kali enthalten</span></span></li>
      <li><span class="state done">✓</span><span class="grow"><span class="t">Metasploit, John, Hashcat, SearchSploit</span><span class="s">Exploits & Passwort-Tests (Level 6–7) – ebenfalls dabei</span></span></li></ul>
    <p class="small"><b>➕ Nur selten nachrüsten</b> (erst auf hohem Level, optional):</p>
    <pre class="syntax" translate="no">sudo apt update && sudo apt install -y yara dnsutils
pipx install sigma-cli   # optional, für Detection-Regeln</pre>
    <p class="small muted">Prüfen, ob etwas fehlt: <code translate="no">command -v nmap gobuster burpsuite</code>. Fehlt mal ein Standard-Tool: <code translate="no">sudo apt install -y &lt;name&gt;</code>.</p>
    <p class="small"><b>📱 Am Handy (Termux, kein Kali):</b> nur die Basics – der Rest läuft über die Arena im Browser:</p>
    <pre class="syntax" translate="no">pkg install nmap curl dnsutils</pre>
    <p class="small muted">Faustregel: Einsteiger brauchen <b>gar nichts</b> zu installieren. Fortgeschrittene auf echtem Kali meist auch nicht – Kali bringt den Werkzeugkasten schon mit. 🧰</p>
  </div>
  <h2 style="margin-top:1rem">Alle Werkzeuge im Lernpfad</h2>
  <p class="muted small">Geordnet nach Level. Verfügbarkeit immer selbst prüfen: <code>command -v NAME</code>, <code>NAME --version</code>, <code>NAME --help</code>. Nichts unbedacht installieren.</p>
  <div class="stack">${TOOLS.map(t => `<div class="card">
    <div class="row between"><h3 style="margin:0">${esc(t.name)}</h3><span><span class="badge plain">${esc(t.level)}</span> <span class="badge ${t.status.startsWith('aktiv') ? 'ok' : 'plain'}">${esc(t.status)}</span></span></div>
    <p>${esc(t.zweck)}</p>
    <div class="task-meta"><div><b>Voraussetzung</b>${esc(t.voraus)}</div><div><b>PC / Handy rootless</b>${esc(t.pc)} / ${esc(t.rootless)}</div><div><b>Scope-Regel</b>${esc(t.scope)}</div><div><b>Arbeitsablauf</b><code>${esc(t.workflow)}</code></div><div><b>Prüfbeleg</b>${esc(t.beleg)}</div></div>
  </div>`).join('')}</div>`,
});

// ---------------------------------------------------------------- Externe Lernpfade (Checklisten)
views.extern = () => {
  const done = (id) => !!state.extern?.[id];
  const allSteps = (pf) => pf.gruppen.flatMap(g => g.schritte);
  return {
    html: `<a class="back" href="#/pfad">← Lernen</a>
    <h1>🌍 Externe Lernpfade</h1>
    <p class="muted small">Legale Übungsplattformen, auf denen du auch das <b>Ausnutzen</b> von Schwachstellen übst – an Zielen, die genau dafür gebaut sind. Hak ab, was du geschafft hast (+${EXTERN_POINTS} Punkte je Schritt, auf Ehrenwort). Bei jedem Schritt steht, welche Leiter der App dich vorbereitet.</p>
    <div class="stack">${EXTERN.map(pf => {
      const st = allSteps(pf), n = st.filter(x => done(`${pf.id}.${x.id}`)).length;
      return `<details class="card" ${n && n < st.length ? 'open' : ''}>
        <summary><b>${pf.icon} ${esc(pf.title)}</b> <span class="badge ${n === st.length ? 'ok' : 'plain'}">${n}/${st.length}</span></summary>
        <div class="bar" style="margin:.5rem 0"><i style="width:${Math.round(n / st.length * 100)}%"></i></div>
        <p class="small">${esc(pf.was)}</p>
        <p class="small muted">💶 ${esc(pf.kosten)}</p>
        <p><a class="btn small" href="${pf.url}" target="_blank" rel="noopener noreferrer">↗ Zur Plattform</a></p>
        <details class="small"><summary>So startest du</summary><ol style="padding-left:1.2rem;margin:.4rem 0">${pf.start.map(x => `<li>${codeify(x)}</li>`).join('')}</ol></details>
        ${pf.gruppen.map(g => `<h4 style="margin:.8rem 0 .3rem">${esc(g.name)}</h4>
          <ul class="list">${g.schritte.map(x => {
            const key = `${pf.id}.${x.id}`, ok = done(key), prep = ROOM[x.prep];
            return `<li><a href="#" data-ext="${key}" role="checkbox" aria-checked="${ok}">
              <span class="state ${ok ? 'done' : ''}">${ok ? '✓' : ''}</span>
              <span class="grow"><span class="t">${esc(x.t)}</span><span class="s">${esc(x.thema)}${prep ? ` · Vorbereitung: ${esc(prep.title)}${roomDone(prep.id) ? ' ✓' : ''}` : ''}</span></span>
            </a>${prep && !roomDone(prep.id) ? `<a class="btn small ghost navbtn" href="#/raum/${prep.id}" style="margin:-.2rem 0 .5rem 2.6rem;width:auto">→ erst ${esc(prep.title)} üben</a>` : ''}</li>`;
          }).join('')}</ul>`).join('')}
      </details>`;
    }).join('')}</div>
    <p class="honest">Die App verlinkt nur. Inhalte, Kosten und Namen bestimmen die Anbieter – Stand nach bestem Wissen, kann sich ändern. Übe nur auf diesen Plattformen bzw. in deinem eigenen, abgeschotteten Labor.</p>`,
    keepScroll: false,
    mount(root) {
      root.addEventListener('click', (e) => {
        const a = e.target.closest('[data-ext]'); if (!a) return;
        e.preventDefault();
        const key = a.dataset.ext;
        state.extern = state.extern || {};
        if (state.extern[key]) delete state.extern[key]; else { state.extern[key] = Date.now(); markActivity(state); }
        save();
        const y = window.scrollY; render(); window.scrollTo(0, y);
      });
    },
  };
};

// ---------------------------------------------------------------- Problem melden / Support
views.melden = (vor = '') => {
  return {
    html: `<a class="back" href="#/mehr">← Mehr</a>
    <h1>🐞 Problem melden</h1>
    <p class="muted small">Etwas kaputt, verwirrend oder falsch? Sag es uns – wir kümmern uns darum. Je genauer, desto schneller gefixt.</p>
    <div class="card stack">
      <label>Wo tritt das Problem auf?
        <select id="m-bereich"><option value="">Lädt …</option></select></label>
      <label>Was ist passiert? Was hast du erwartet?
        <textarea id="m-text" rows="5" placeholder="z. B. In „Die Härtung“ springt der Cursor beim Tippen, und „txt“ wird zu „tut“."></textarea></label>
      <label>Deine E-Mail für Rückfragen (freiwillig)
        <input id="m-mail" type="email" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="nur, wenn wir dich erreichen dürfen"></label>
      <div class="row"><button class="btn primary" id="m-send">Absenden</button><a class="btn ghost" id="m-mailto" href="#" hidden>Stattdessen per E-Mail</a></div>
      <p class="small" id="m-fb"></p>
    </div>
    <p class="small muted">Geht an das Nachtfalter-Team. Zur Fehlersuche hängen wir automatisch technische Infos an (App-Version, Gerät, Sprache) – keine Inhalte, die du nicht hier eingibst.</p>`,
    keepScroll: false,
    mount(root) {
      const sel = $('#m-bereich', root);
      // Live-Liste: App-Bereiche + App-Räume + (nachgeladen) Arena-Räume. Aktualisiert sich automatisch.
      const bereiche = ['Startseite', 'Lernpfad', 'Leitern & Räume', 'Terminal', 'Kali-Praxis', 'Prüfung', 'Konto & Anmeldung', 'Übersetzung/Sprache', 'Sonstiges / weiß nicht'];
      const opt = (v, t) => `<option value="${esc(v)}" ${v === vor ? 'selected' : ''}>${esc(t)}</option>`;
      const bau = (arena) => {
        sel.innerHTML = `<optgroup label="App-Bereiche">${bereiche.map(b => opt(b, b)).join('')}</optgroup>`
          + `<optgroup label="Räume (App)">${ROOMS.map(r => opt('Raum: ' + r.title, r.title)).join('')}</optgroup>`
          + (arena && arena.length ? `<optgroup label="Arena-Räume">${arena.map(a => opt('Arena: ' + a.titel, a.titel)).join('')}</optgroup>` : '');
      };
      bau(null);
      const base = (globalThis.KLY_CONFIG || {}).arenaUrl;
      if (base) fetch(`${base}/api/labs`).then(r => r.ok ? r.json() : null).then(j => { if (j && j.labs) bau(j.labs); }).catch(() => { /* Arena offline → nur App-Räume */ });

      const fb = $('#m-fb', root);
      const kontext = () => ({ version: globalThis.KLY_VERSION || '?', lernort: state.location || '-', sprache: currentLang(), geraet: (navigator.userAgent || '').slice(0, 200) });
      const mailtoFallback = (bereich, text) => {
        const body = `${text}\n\n--\nBereich: ${bereich}\nVersion: ${kontext().version} · Gerät: ${kontext().geraet}`;
        return `mailto:info@nachtfalter.tech?subject=${encodeURIComponent('Nachtfalter: Problem – ' + bereich)}&body=${encodeURIComponent(body)}`;
      };
      $('#m-send', root).onclick = async () => {
        const bereich = sel.value || 'Sonstiges', text = $('#m-text', root).value.trim(), mail = $('#m-mail', root).value.trim();
        if (text.length < 5) { fb.className = 'small rot'; fb.textContent = 'Bitte beschreib kurz, was los ist.'; return; }
        const btn = $('#m-send', root); btn.disabled = true; fb.className = 'small muted'; fb.textContent = 'Wird gesendet …';
        try {
          await meldungSenden({ bereich, text, kontakt: mail, kontext: kontext() });
          fb.className = 'small ok'; fb.textContent = '✓ Danke! Deine Meldung ist angekommen – wir kümmern uns.';
          toast('✓ Meldung abgeschickt – danke!');
          $('#m-text', root).value = '';
        } catch (e) {
          fb.className = 'small rot'; fb.textContent = 'Senden klappt gerade nicht. Nutz bitte den Knopf „Stattdessen per E-Mail“.';
          toast('Senden klappt gerade nicht – nimm den E-Mail-Knopf.');
          const mt = $('#m-mailto', root); mt.href = mailtoFallback(bereich, text); mt.hidden = false;
        }
        btn.disabled = false;
      };
    },
  };
};

// ---------------------------------------------------------------- Kali anwenden (Praxis-Strang mit Docker-Zielen)
views.kalipraxis = () => {
  const done = (k) => !!state.kalipraxis?.[k];
  return {
    html: `<a class="back" href="#/pfad">← Lernen</a>
    <h1>🧰 Kali anwenden</h1>
    <p class="muted small">Hier übst du mit den <b>echten Kali-Werkzeugen</b> gegen sichere Übungsziele, die du per Docker auf deinem eigenen Rechner startest. Vom Verstehen zum Können.</p>
    <div class="card warn small"><b>Nur auf deinem eigenen Rechner.</b> Alle Ziele laufen lokal (127.0.0.1). Scanne oder greife niemals fremde Systeme an – das ist illegal. Diese Ziele sind ausdrücklich zum Üben gebaut.</div>
    <div class="stack">${KALIPRAXIS.map(m => {
      const st = m.schritte, n = st.filter(x => done(`${m.id}.${x.id}`)).length;
      return `<details class="card" open>
        <summary><b>${m.icon} ${esc(m.titel)}</b> <span class="badge ${n === st.length ? 'ok' : 'plain'}">${n}/${st.length}</span></summary>
        <div class="bar" style="margin:.5rem 0"><i style="width:${Math.round(n / st.length * 100)}%"></i></div>
        <p class="small">${esc(m.einleitung)}</p>
        <div class="card tight"><b>🎯 Ziel starten: <span translate="no">${esc(m.ziel.name)}</span></b>
          <pre class="syntax" translate="no">${esc(m.ziel.start)}</pre>
          <p class="small muted">${codeify(m.ziel.hinweis)}</p>
          <p class="small muted">✅ ${codeify(m.ziel.pruef)}</p>
        </div>
        ${st.map((x, i) => { const key = `${m.id}.${x.id}`, ok = done(key);
          return `<div class="card tight" style="margin-top:.5rem">
            <div class="row between"><b>${i + 1}. <span translate="no">${esc(x.werkzeug)}</span></b><span class="badge ${ok ? 'ok' : 'plain'}">${ok ? '✓ erledigt' : 'offen'}</span></div>
            <p class="small">${esc(x.aufgabe)}</p>
            <pre class="syntax" translate="no">${esc(x.befehl)}</pre>
            <p class="small muted">Erwartet: ${esc(x.erwartet)}</p>
            ${ok ? '' : x.frage_art === 'antwort'
              ? `<label class="small">${esc(x.frage)}</label><div class="row"><input data-kp-in="${esc(key)}" placeholder="Antwort …" autocomplete="off" spellcheck="false" style="max-width:12rem"><button class="btn small" data-kp-check="${esc(key)}">Prüfen</button></div><p class="small muted">💡 ${esc(x.tipp)}</p><p class="small rot" data-kp-fb="${esc(key)}"></p>`
              : `<button class="btn small" data-kp-hak="${esc(key)}">✓ ${esc(x.frage)}</button>`}
          </div>`;
        }).join('')}
        ${n === st.length ? `<p class="hinweis gruen small" style="margin-top:.6rem">🎉 ${esc(m.abschluss)}</p>` : ''}
      </details>`;
    }).join('')}</div>
    ${KALIPRAXIS_GEPLANT.length ? `<div class="card"><h3 style="margin-top:0">Als Nächstes in diesem Strang</h3>
      <ul class="list">${KALIPRAXIS_GEPLANT.map(g => `<li><span class="state">🔜</span><span class="grow"><span class="t">${g.icon} ${esc(g.titel)}</span><span class="s">in Arbeit</span></span></li>`).join('')}</ul></div>` : ''}
    <p class="honest">Übe nur in deinem eigenen, abgeschotteten Labor (localhost / eigene VMs). Die Docker-Ziele sind absichtlich verwundbare Trainings-Apps.</p>`,
    keepScroll: false,
    mount(root) {
      const mark = (key) => { state.kalipraxis = state.kalipraxis || {}; state.kalipraxis[key] = Date.now(); markActivity(state); save(); const y = window.scrollY; render(); window.scrollTo(0, y); };
      root.addEventListener('click', (e) => {
        const hak = e.target.closest('[data-kp-hak]'); if (hak) { e.preventDefault(); mark(hak.dataset.kpHak); return; }
        const chk = e.target.closest('[data-kp-check]'); if (!chk) return;
        e.preventDefault();
        const key = chk.dataset.kpCheck;
        const m = KALIPRAXIS.find(mm => mm.schritte.some(s => `${mm.id}.${s.id}` === key));
        const step = m && m.schritte.find(s => `${m.id}.${s.id}` === key);
        if (!step) return;
        const inp = root.querySelector(`[data-kp-in="${key}"]`), fb = root.querySelector(`[data-kp-fb="${key}"]`);
        const val = (inp?.value || '').trim().toLowerCase().replace(/^\//, '');
        const ok = (step.antwort || []).some(a => a.toLowerCase().replace(/^\//, '') === val);
        if (ok) mark(key); else if (fb) fb.textContent = 'Noch nicht ganz – schau in die Ausgabe und probier es nochmal.';
      });
    },
  };
};

// ---------------------------------------------------------------- Labs vom Handy (Variante A: Tailscale + SSH in die Kali-VM)
views['handy-labs'] = () => {
  const ip = state.settings.tsip || '';
  const host = ip || '100.x.y.z';
  const user = state.settings.kaliUser || 'kali';
  const step = (n, t, body) => `<div class="card stack"><h3 style="margin:0"><span class="state" style="display:inline-grid;margin-right:.4rem;vertical-align:middle">${n}</span>${t}</h3>${body}</div>`;
  return {
    html: `<a class="back" href="#/mehr">← Mehr</a>
    <h1>📱 Labs vom Handy spielen</h1>
    <p class="muted">Die Labs (Kellerserver, Juice Shop, Zielmaschinen) laufen weiter in deiner Kali-VM. Das Handy verbindet sich über ein privates VPN (<b>Tailscale</b>, kostenlos) mit der VM. Nichts davon ist im Internet offen.</p>
    <div class="card warn small"><b>Voraussetzung:</b> Der PC mit der Kali-VM läuft (und geht nicht in den Ruhezustand).</div>
    <div class="stack">
    ${step(1, 'Kali-VM: Tailscale installieren', `
      <p class="small">Einmalig im Kali-Terminal. Der zweite Befehl zeigt einen Link – im Browser öffnen und mit deinem Konto anmelden (Google, Microsoft oder E-Mail).</p>
      ${scriptBlock('Installieren:', 'curl -fsSL https://tailscale.com/install.sh | sh')}
      ${scriptBlock('Anmelden:', 'sudo tailscale up')}
      ${scriptBlock('Deine Tailscale-Adresse anzeigen:', 'tailscale ip -4')}
      <label class="small"><b>Adresse hier eintragen</b> (beginnt mit 100.) – dann stimmen alle Befehle unten:</label>
      <div class="row" style="flex-wrap:nowrap"><input type="text" id="tsip" inputmode="decimal" placeholder="100.x.y.z" value="${esc(ip)}" autocapitalize="off"><button class="btn small primary" id="tssave">Speichern</button></div>`)}
    ${step(2, 'Kali-VM: SSH einschalten und Passwort ändern', `
      <p class="small">Damit das Handy sich anmelden kann. <b>Wichtig:</b> Wenn dein Kali noch das Standardpasswort <code>kali</code> hat, ändere es jetzt.</p>
      ${scriptBlock('SSH-Dienst starten (auch nach Neustart):', 'sudo apt install -y openssh-server\nsudo systemctl enable --now ssh')}
      ${scriptBlock('Eigenes Passwort setzen:', 'passwd')}
      <label class="small">Dein Benutzername in Kali (meist <code>kali</code>):</label>
      <div class="row" style="flex-wrap:nowrap"><input type="text" id="kuser" value="${esc(user)}" autocapitalize="off"><button class="btn small" id="kusave">Speichern</button></div>`)}
    ${step(3, 'Handy: Tailscale-App', `
      <p class="small">Im Play Store <b>„Tailscale“</b> installieren und mit <b>demselben Konto</b> anmelden. In der App siehst du danach deine Kali-VM in der Geräteliste.</p>`)}
    ${step(4, 'Handy: Termux verbinden', `
      <p class="small">Termux aus F-Droid (die Play-Store-Version ist veraltet). Einmalig SSH installieren, dann verbinden:</p>
      ${scriptBlock('Einmalig:', 'pkg update && pkg install openssh')}
      ${scriptBlock('Verbinden:', `ssh ${user}@${host}`)}
      <p class="small muted">Beim ersten Mal fragt SSH „Are you sure…?“ → <code>yes</code>. Dann dein Kali-Passwort. Du bist jetzt im Kali-Terminal – vom Handy aus.</p>`)}
    ${step(5, 'Spielen', `
      <p class="small"><b>Kellerserver:</b> In der Handy-SSH-Sitzung den Server starten (Befehle aus dem Raum) und von dort anmelden:</p>
      ${scriptBlock('In der Kali-Sitzung:', 'ssh azubi@127.0.0.1 -p 2220')}
      <p class="small"><b>Webseiten (Juice Shop, Zielmaschinen r1/r3) im Handy-Browser:</b> Mit einem SSH-Tunnel leitest du den Port der VM aufs Handy um. Das läuft in einer eigenen Termux-Sitzung (vom linken Rand wischen → New session):</p>
      ${scriptBlock('Tunnel für den Juice Shop:', `ssh -N -L 3000:127.0.0.1:3000 ${user}@${host}`)}
      <p class="small">Dann im Handy-Browser: <code>http://127.0.0.1:3000</code>. Für andere Labs die Zahl tauschen (z. B. 10080 für r1).</p>`)}
    ${step(6, 'Danach', `
      <ul class="small" style="margin:0;padding-left:1.1rem">
        <li>Labs stoppen: <code>docker stop kly-keller</code> bzw. <code>docker stop juice-shop</code></li>
        <li>Unterwegs ohne Bedarf: Tailscale am Handy ausschalten.</li>
        <li>Tipp für lange Sitzungen: <code>tmux</code> in Kali – die Sitzung läuft weiter, auch wenn das Handy die Verbindung verliert (<code>tmux attach</code>).</li>
      </ul>`)}
    </div>
    <p class="honest">Warum ist das sicher? Die Labs lauschen nur auf 127.0.0.1 in der VM. Das Handy kommt nur über das verschlüsselte, private Tailscale-Netz an die VM – und nur mit deinem Kali-Passwort.</p>`,
    mount(root) {
      bindCopy(root);
      $('#tssave', root).onclick = () => {
        const v = $('#tsip', root).value.trim();
        if (v && !/^100\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(v)) { toast('Tailscale-Adressen beginnen mit 100. – z. B. 100.101.102.103'); return; }
        state.settings.tsip = v; save(); render(); toast('Gespeichert – die Befehle sind angepasst.');
      };
      $('#kusave', root).onclick = () => {
        const v = $('#kuser', root).value.trim();
        if (!/^[a-z_][a-z0-9_-]{0,31}$/.test(v)) { toast('Benutzernamen bestehen aus Kleinbuchstaben, Ziffern, - und _.'); return; }
        state.settings.kaliUser = v; save(); render(); toast('Gespeichert.');
      };
    },
  };
};

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
      <div class="card"><h3 style="margin-top:0" translate="no">🌍 Sprache · Language</h3>${langPickerHTML()}
        <p class="small muted" style="margin-bottom:0">Englisch: Die meisten Texte sind von Hand übersetzt. Was noch fehlt, übersetzt Google automatisch (diese Texte gehen dazu an Google). Befehle und Terminals bleiben im Original.</p></div>
      <div class="card"><h3 class="gruppe" style="margin-top:0">📚 Lernen & Üben</h3><ul class="list">
        <li><a href="#/lernpfad"><span class="state">📚</span><span class="grow"><span class="t">Lernpfad</span><span class="s">Geführt lernen: Theorie, Beispiel, eigene Übung – Stufe für Stufe</span></span></a></li>
        <li><a href="#/kalipraxis"><span class="state">🧰</span><span class="grow"><span class="t">Kali anwenden – Praxis</span><span class="s">Echte Kali-Werkzeuge gegen lokale Docker-Ziele</span></span></a></li>
        ${(globalThis.KLY_CONFIG || {}).arenaUrl ? `<li><a href="${esc(KLY_CONFIG.arenaUrl)}" target="_blank" rel="noopener"><span class="state">🖥️</span><span class="grow"><span class="t">Arena – Online-Labs</span><span class="s">Echte Übungs-Server im Browser: 🔴 Rot (Angriff), 🔵 Blau (Verteidigung), 🟣 Lila (beides)</span></span></a></li>` : ''}
        <li><a href="#/extern"><span class="state">🌍</span><span class="grow"><span class="t">Externe Lernpfade</span><span class="s">Hack The Box, Juice Shop, PortSwigger, Bandit, picoCTF – zum Abhaken</span></span></a></li>
        <li><a href="#/pruefung/L1"><span class="state">★</span><span class="grow"><span class="t">Prüfungen (freiwillig)</span><span class="s">Meisterprüfung Linux</span></span></a></li>
        <li><a href="#/archiv"><span class="state">≡</span><span class="grow"><span class="t">Aufgabenarchiv</span><span class="s">Alle Aufgaben wiederholen (ohne Punkte)</span></span></a></li>
      </ul></div>
      <div class="card"><h3 class="gruppe" style="margin-top:0">👤 Konto & Profil</h3><ul class="list">
        <li><a href="konto.html"><span class="state">👤</span><span class="grow"><span class="t">Nachtfalter-Konto</span><span class="s">Registrieren, anmelden, deine Zugänge (Beta)</span></span></a></li>
        <li><a href="#/profil"><span class="state">★</span><span class="grow"><span class="t">Profil & Abzeichen</span><span class="s">${earnedBadges().length} von ${BADGES.length} · Serie ${streak(state)} Tage</span></span></a></li>
      </ul></div>
      <div class="card"><h3 class="gruppe" style="margin-top:0">⚙️ Sonstiges</h3><ul class="list">
        <li><a href="#/handy-labs"><span class="state">📱</span><span class="grow"><span class="t">Labs vom Handy spielen</span><span class="s">Kellerserver & Co. über deine Kali-VM – mit Tailscale, gratis</span></span></a></li>
        <li><a href="#/werkzeuge"><span class="state">⚒</span><span class="grow"><span class="t">Werkzeuge</span><span class="s">Kali-Tools: Zweck, Scope, Beleg</span></span></a></li>
        <li><a href="#/melden"><span class="state">🐞</span><span class="grow"><span class="t">Problem melden</span><span class="s">Fehler oder etwas Verwirrendes? Sag es uns – wir fixen es</span></span></a></li>
        <li><button class="item" id="loc" style="width:100%;background:none;border:0;text-align:left;cursor:pointer"><span class="state">📍</span><span class="grow"><span class="t">Lernort ändern</span><span class="s">${esc(LOCATIONS[state.location]?.label || 'nicht gewählt')}</span></span></button></li>
        <li><a href="impressum.html"><span class="state">§</span><span class="grow"><span class="t">Impressum & Datenschutz</span><span class="s">Wer hinter Nachtfalter steht, was mit deinen Daten passiert</span></span></a></li>
      </ul></div>

      <div class="card">
        <h2>Nachtfalter-Konto · Fortschritt auf allen Geräten</h2>
        <p class="small" id="syncline">${syncLine(st)}</p>
        ${!syncConfigured() ? `<p class="small muted">Noch nicht eingerichtet. Anleitung: <code>docs/SUPABASE-SETUP.md</code> im Projekt. Bis dahin: Lernstand per Export/Import übertragen.</p>` :
        st.user ? `<p class="small">Angemeldet als <b>${esc(st.user.email)}</b></p><div class="row"><button class="btn small" id="syncnow">Jetzt synchronisieren</button><button class="btn small ghost" id="logout">Abmelden</button><a class="btn small ghost" href="konto.html">Mein Konto</a><a class="btn small ghost" href="${(location.hostname.startsWith('vorschau.') ? '/zentrale/' : 'https://zentrale.nachtfalter.tech/')}" id="adminlink" hidden>🛠 Zentrale</a></div>` :
          `<label for="em">E-Mail</label><input type="email" id="em" autocomplete="username"><label for="pw">Passwort</label><input type="password" id="pw" autocomplete="current-password">
           <div class="row" style="margin-top:.6rem"><button class="btn primary" id="login">Anmelden</button><a class="btn ghost" href="konto.html?neu=1">Konto anlegen</a></div><div id="authfb"></div>`}
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
      <p class="small dim">Nachtfalter Hacklab ${esc(self.KLY_VERSION || '')} · Geräte-ID ${esc(state.deviceId)} · Lab-Token ${esc(state.labToken)}</p>
    </div>`,
    mount(root) {
      bindLangPicker(root);
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
      }
      const sn = $('#syncnow', root); if (sn) sn.onclick = () => syncNow(getState, applyState);
      const al = $('#adminlink', root); if (al) meinStatus().then(s => { if (s?.admin) al.hidden = false; }).catch(() => {});
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
// Experten-Modus: gar keine Tipps (→ keine Tipp-Knöpfe, keine Punktabzüge, also immer volle Punkte).
const hintsOf = (q) => niveau() === 'experte' ? [] : (q.hints || (q.hint ? [q.hint] : []));
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
  return r.type === 'wargame' ? '<span class="badge real" translate="no">Wargame</span>' : r.type === 'challenge' ? '<span class="badge warn">Challenge</span>' : '<span class="badge plain">Walkthrough</span>';
}
function machineBadge(r) {
  return r.machine.kind === 'ssh' ? '<span class="badge real">🖥️ Kali · echtes SSH</span>' : r.machine.kind === 'ext' ? '<span class="badge real">🖥️ Kali · Übungs-App</span>' : r.machine.kind === 'target' ? '<span class="badge real">Zielmaschine</span>' : `<span class="badge sim">${U('📱 Sandbox')}</span>`;
}

function roomCard(r) {
  const lock = roomLock(r), pct = roomPct(r.id);
  return `<a class="card tight ${roomDone(r.id) ? 'lime' : ''}" href="#/raum/${r.id}" style="display:block;text-decoration:none;color:inherit;margin-bottom:.6rem">
    <div class="row between"><span>${typeBadge(r)} ${r.stufe ? `<span class="badge plain">${esc(r.stufe)}</span>` : ''} ${machineBadge(r)}</span><span class="small muted">~${r.minutes} min</span></div>
    <b style="display:block;margin-top:.4rem">${lock.length ? '🔒 ' : ''}${roomText(r, 'title')}</b>
    <span class="small muted">${roomText(r, 'desc')}</span>
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
    'kollektiv': roomDone('w3'),
    'funkturm': roomDone('w4'),
    'leitern-linux': roomDone('w5') && roomDone('w8'),
    'leitern-ctf': roomDone('w6') && roomDone('w7') && roomDone('w9'),
    'purple': ['p5', 'p6', 'p7', 'p8', 'p10'].every(roomDone),
    'ermittler': roomDone('b1'),
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

// Online-Arena (eigener Lab-Server): Link mit Lab-Name und persönlichem Token
const ARENA_LABS = { 'kly-keller': 'keller' };
function arenaLink(m) {
  const base = (globalThis.KLY_CONFIG || {}).arenaUrl;
  const lab = ARENA_LABS[m.lab];
  return base && lab ? `${base.replace(/\/$/, '')}/?lab=${lab}&token=${encodeURIComponent(state.labToken)}` : '';
}

function sshMachineHTML(r) {
  const m = r.machine;
  const base = location.origin + location.pathname.replace(/[^/]*$/, '') + `labs/${m.lab}/`;
  const httpsApp = location.protocol === 'https:' && !PREVIEW;
  const dir = `~/kly-labs/${m.lab}`;
  return `<div class="card lime stack" id="machine">
    <div class="row between"><h3 style="margin:0">Server ${esc(m.name)}</h3><span class="badge real">echt · nur 127.0.0.1</span></div>
    <p class="small">SSH-Port <code>127.0.0.1:${m.port}</code> · Token: <code>${esc(state.labToken)}</code> · Nur am PC (Kali-VM mit Docker).</p>
    ${arenaLink(m) ? `<a class="btn go" href="${arenaLink(m)}" target="_blank" rel="noopener">🌐 Online spielen – ohne Kali (Beta)</a><p class="small muted" style="margin:-.3rem 0 0">Ein eigener Server nur für dich, direkt im Browser – Anmeldung mit deinem Nachtfalter-Konto (Arena-Zugang nötig). Oder klassisch in deiner Kali-VM:</p>` : ''}
    <a class="btn small" href="#/handy-labs" style="align-self:flex-start">📱 Vom Handy spielen (über deine Kali-VM)</a>
    ${roomState(r.id).startedAt ? '' : '<button class="btn ghost" id="startm">▶ In Kali starten – Anleitung anzeigen</button>'}
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
    <a class="btn small" href="#/handy-labs" style="align-self:flex-start">📱 Vom Handy spielen (über deine Kali-VM)</a>
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
    input = shuffle(q.options.map((o, i) => ({ o, i })), [...key].reduce((n, c) => n + c.charCodeAt(0), 7)).map(({ o, i }) => `<button class="opt ${ok && i === q.answer ? 'right' : ''}" data-k="${key}" data-i="${i}" ${ok ? 'disabled' : ''}>${makeT(handDict(r.id)).h(o, esc)}</button>`).join('');
  } else if (q.type === 'confirm') {
    input = `<button class="btn small ${ok ? '' : 'go'}" data-k="${key}" data-confirm ${ok ? 'disabled' : ''}>${ok ? U('✓ Erledigt') : U('Erledigt')}</button>`;
  } else {
    input = `<div class="row" style="flex-wrap:nowrap"><input type="text" id="in-${id}" data-k="${key}" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="${q.type === 'flag' ? 'KLY{…}' : esc(Ut('Antwort'))}" ${ok ? `disabled value="${esc(Ut('✓ gelöst'))}"` : ''}><button class="btn small primary" data-k="${key}" data-send ${ok ? 'disabled' : ''}>${U('Senden')}</button></div>`;
  }
  return `<div class="q" id="q-${id}" style="margin:.7rem 0">
    ${q.repeat ? `<span class="badge plain" title="${esc(Ut('Wiederholung'))}">${U('🔁 Wiederholung · {text}', { text: makeT(handDict(r.id)).t(q.repeat) })}</span>` : ''}
    <div class="row between"><b class="small">${ok ? '✓ ' : ''}${makeT(handDict(r.id)).h(q.q)}</b><span class="small muted" data-pts="${key}">${pointsLabel(r, t, q)}</span></div>
    ${input}<div class="qfb small" data-fb="${key}"></div><div class="tips" data-tips="${key}">${tipsHTML(r, q, key)}</div></div>`;
}

function pointsLabel(r, t, q) {
  const key = qKey(t, q), used = hintsUsed(r.id, key);
  if (qOk(r.id, key)) return Ut('{n} P.', { n: earned(r.id, { q, key }) });
  return used ? Ut('noch {a} von {b} P.', { a: Math.max(1, Math.round(q.points - used * hintCost(q))), b: q.points }) : Ut('{n} P.', { n: q.points });
}

function tipsHTML(r, q, key) {
  const all = hintsOf(q); if (!all.length) return '';
  const used = Math.min(hintsUsed(r.id, key), all.length);
  const T = makeT(handDict(r.id));
  const shown = all.slice(0, used).map((h, i) => `<div class="feedback info small"><b>${U('Tipp {i}/{n}:', { i: i + 1, n: all.length })}</b> ${T.h(h)}</div>`).join('');
  const ok = qOk(r.id, key);
  const after = Math.max(1, Math.round(q.points - (used + 1) * hintCost(q)));
  const last = used === all.length - 1 && /^Lösung/i.test(all[all.length - 1]);
  const btn = !ok && used < all.length ? `<button class="btn small ghost" data-tip="${key}">${last ? U('💡 Lösung zeigen · danach noch {p} P.', { p: after }) : U(used ? '💡 Nächster Tipp {i}/{n} · danach noch {p} P.' : '💡 Tipp {i}/{n} · danach noch {p} P.', { i: used + 1, n: all.length, p: after })}</button>` : '';
  return shown + btn;
}

views.raum = (id) => {
  const r = ROOM[id];
  if (!r) return views.raeume();
  // Handübersetzung zuerst laden (nur EN/UK und nur, wenn es eine gibt)
  if (hasHand(id) && handDict(id) === undefined) { loadHand(id).then(() => { if (location.hash.includes(id)) render(); }); return { html: '<p class="muted">…</p>' }; }
  const T = makeT(handDict(id));
  const lock = roomLock(r);
  const head = `<a class="back" href="#/pfad">${U('← Lernen')}</a>
    <div class="row">${typeBadge(r)}<span class="badge plain">${U('Level {n}', { n: LEVELS.find(l => l.id === r.level).n })}</span>${machineBadge(r)}<span class="small muted">~${r.minutes} min</span></div>
    <h1 style="margin-top:.5rem">${roomText(r, 'title')}</h1><p>${T.h(r.desc)}</p>`;
  if (lock.length) return { html: head + `<div class="card warn"><b>${U('🔒 Gesperrt')}</b><ul>${lock.map(w => `<li>${esc(w)}</li>`).join('')}</ul></div>` };
  const rs = roomState(r.id);
  return {
    html: head + `
    <div class="card tight"><div class="bar"><i style="width:${roomPct(r.id)}%" id="rbar"></i></div><span class="small muted" id="rstat">${U('{pct} % · {p} Punkte', { pct: roomPct(r.id), p: roomPoints(r.id) })}</span>
      <p class="small" style="margin:.4rem 0 0">🎯 <b>${U('Erlaubt:')}</b> ${T.h(r.scope)}</p>
      <details class="small" style="margin-top:.3rem"><summary class="muted">${U('Mehr Infos: Lernziel, Regeln, Werkzeuge')}</summary>
        <div class="task-meta" style="margin-top:.5rem">
          <div><b>${U('Lernziel')}</b>${T.h(r.ziel)}</div><div><b>${U('Stopp-Regel')}</b>${T.h(r.stop)}</div><div><b>${U('Aufräumen')}</b>${T.h(r.cleanup)}</div>
          <div><b>${U('Werkzeuge')}</b><span translate="no">${r.tools.map(esc).join(', ')}</span></div>
        </div>
      </details>
    </div>
    <div class="room-grid">
    <div class="room-side">
    ${machineHTML(r)}
    ${r.machine.kind === 'sandbox' ? `<div id="rterm"></div><button class="btn ghost small" id="rreset" style="margin-top:.4rem">${U('Raum-Terminal neu starten')}</button>` : ''}
    </div>
    <div class="room-tasks">
    <div class="stack">${r.tasks.map((t, i) => {
      const done = t.questions.every(q => qOk(r.id, qKey(t, q)));
      return `<details class="card" ${done ? '' : (i === r.tasks.findIndex(tt => !tt.questions.every(q => qOk(r.id, qKey(tt, q)))) ? 'open' : '')}>
        <summary><span class="state ${done ? 'done' : ''}" style="display:inline-grid;margin-right:.5rem;vertical-align:middle">${done ? '✓' : i + 1}</span>${U('Task {n}: {title}', { n: i + 1, title: T.t(t.title) })}</summary>
        <p style="white-space:pre-line">${T.h(t.body)}</p>
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
        if (T.active && r.translateFS) r.translateFS(sh, T, translateTree);
        mountTerminal($('#rterm', root), sh, { title: Ut('Raum · {title}', { title: T.t(r.title) }), welcome: T.t(r.welcome) || Ut('Raum-Sandbox bereit. Arbeitsordner: ~/raum0 · help zeigt Befehle.') });
      };
      if (r.machine.kind === 'sandbox') { startSandbox(); $('#rreset', root).onclick = startSandbox; }

      const find = (key) => { for (const t of r.tasks) for (const q of t.questions) if (qKey(t, q) === key) return { t, q }; };
      const fbOf = (key) => root.querySelector(`[data-fb="${CSS.escape(key)}"]`);
      const showDone = () => {
        $('#rbar', root).style.width = roomPct(r.id) + '%';
        $('#rstat', root).textContent = Ut('{pct} % · {p} Punkte', { pct: roomPct(r.id), p: roomPoints(r.id) });
        if (roomDone(r.id)) {
          if (!rs.doneAt) { rs.doneAt = Date.now(); save(); toast(Ut('Raum „{title}“ gemeistert!', { title: T.t(r.title) })); }
          const n = r.nach;
          $('#rdone', root).innerHTML = `<div class="card lime debrief"><h3>${U('✓ Raum abgeschlossen · {p} Punkte', { p: roomPoints(r.id) })}</h3><dl><dt>${U('Beobachtung')}</dt><dd>${T.h(n.beobachtung)}</dd><dt>${U('Schlussfolgerung')}</dt><dd>${T.h(n.schluss)}</dd><dt>${U('Grenzen')}</dt><dd>${T.h(n.grenzen)}</dd><dt>${U('Nächster Schritt')}</dt><dd>${T.h(n.naechster)}</dd></dl><p class="small">${U('Aufräumen nicht vergessen:')} <code>${esc(r.cleanup)}</code></p></div>`;
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
          fb.innerHTML = `<span style="color:var(--lime)">${got < q.points ? U('✓ Richtig · +{p} Punkte (von {q}, Tipps genutzt)', { p: got, q: q.points }) : U('✓ Richtig · +{p} Punkte', { p: got })}</span>`;
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
          fb.innerHTML = `<span style="color:var(--red)">${U('✗ Nicht korrekt ({n}. Versuch).', { n: ans.attempts })}</span> ${q.type === 'flag' && !/^KLY\{[0-9a-f]{16}\}$/.test(normFlag(value)) ? U('Flags haben das Format KLY{16 Hex-Zeichen}.') + ' ' : ''}${hintsOf(q).length && hintsUsed(r.id, key) < hintsOf(q).length ? `<span class="muted">${U('Feststecken ist normal – hol dir unten einen Tipp.')}</span>` : ''}`;
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
        if (used === all.length - 1 && /^Lösung/i.test(all[used]) && !twoTap(b, Ut('Wirklich die Lösung zeigen?'))) return;
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

// Teilbares öffentliches Profil – UI im Profil
function profilLink(share_id) { return `${location.origin}/p.html?id=${encodeURIComponent(share_id)}`; }
function profilWerte() {
  const hm = hoechsterMeilenstein();
  return { name: (state.profile.name || '').trim().slice(0, 40), punkte: gesamtPunkte(), abzeichen: earnedBadges().length, meilenstein: hm ? hm.titel : '', streak: gesamtStreak() };
}
function profilTeilenMount(box) {
  if (!box) return;
  if (!syncConfigured() || !syncStatus().user) {
    box.innerHTML = `<p class="small">🔐 ${U('Zum Teilen brauchst du ein Konto.')} <a href="konto.html">${U('Jetzt anmelden')} →</a></p>`;
    return;
  }
  const zeigeAktiv = (share_id) => {
    const link = profilLink(share_id);
    box.innerHTML = `
      <div class="row" style="gap:.4rem;align-items:center">
        <input type="text" id="tl-link" readonly value="${esc(link)}" style="flex:1" onclick="this.select()">
        <button class="btn small" id="tl-copy">${U('Kopieren')}</button>
      </div>
      <div class="row" style="gap:.4rem;margin-top:.5rem;flex-wrap:wrap">
        ${navigator.share ? `<button class="btn small primary" id="tl-share">📤 ${U('Teilen')}</button>` : ''}
        <button class="btn small ghost" id="tl-upd">↻ ${U('Werte aktualisieren')}</button>
        <button class="btn small ghost" id="tl-off">${U('Nicht mehr teilen')}</button>
      </div>
      <p class="small muted" style="margin:.5rem 0 0">${U('Der Link zeigt nur Name, Punkte, Abzeichen-Zahl, Serie und Meilenstein – keinen Lernstand.')}</p>
      <p class="small" id="tl-msg"></p>`;
    const msg = $('#tl-msg', box);
    $('#tl-copy', box).onclick = async () => { try { await navigator.clipboard.writeText(link); msg.textContent = U('✓ Link kopiert.'); } catch { $('#tl-link', box).select(); } };
    const sh = $('#tl-share', box); if (sh) sh.onclick = () => navigator.share({ title: 'Nachtfalter Hacklab', text: U('Mein Lern-Profil im Nachtfalter Hacklab:'), url: link }).catch(() => {});
    $('#tl-upd', box).onclick = async () => { msg.textContent = U('Aktualisiere …'); try { await profilAktion('teilen', profilWerte()); msg.textContent = U('✓ Aktualisiert.'); } catch (e) { msg.textContent = U('Fehler') + ': ' + (e.message || e); } };
    $('#tl-off', box).onclick = async () => { if (!confirm(U('Öffentliches Profil wirklich abschalten? Der Link funktioniert dann nicht mehr.'))) return; try { await profilAktion('aus'); zeigeAus(); } catch (e) { msg.textContent = U('Fehler') + ': ' + (e.message || e); } };
  };
  const zeigeAus = () => {
    box.innerHTML = `<button class="btn primary" id="tl-create">🔗 ${U('Profil-Link erstellen')}</button><p class="small" id="tl-msg2"></p>`;
    $('#tl-create', box).onclick = async () => {
      const m = $('#tl-msg2', box); m.textContent = U('Erstelle …');
      try { const r = await profilAktion('teilen', profilWerte()); zeigeAktiv(r.share_id); } catch (e) { m.textContent = U('Fehler') + ': ' + (e.message || e); }
    };
  };
  profilAktion('status').then(s => { if (s.aktiv && s.share_id) zeigeAktiv(s.share_id); else zeigeAus(); })
    .catch(() => { box.innerHTML = `<p class="small muted">${U('Konnte nicht laden – bist du angemeldet?')}</p>`; });
}

views.profil = () => {
  const got = new Set(earnedBadges().map(b => b.id));
  const days = [...Array(28)].map((_, i) => { const d = new Date(); d.setUTCDate(d.getUTCDate() - 27 + i); return today(d); });
  return {
    html: `<a class="back" href="#/mehr">← Mehr</a><h1>${state.profile.name ? esc(state.profile.name) + 's Profil' : 'Dein Profil'}</h1>
    <div class="kpis" style="grid-template-columns:repeat(3,1fr)"><div class="kpi"><b>${gesamtPunkte()}</b><span>${U('Punkte')}</span></div><div class="kpi"><b>${ROOMS.filter(r => roomDone(r.id)).length}/${ROOMS.length}</b><span>${U('geknackt')}</span></div><div class="kpi"><b>${gesamtStreak()} 🔥</b><span>${U('Tage in Folge')}</span></div></div>
    <div class="card" style="margin-top:.8rem"><h3>Letzte 4 Wochen</h3>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">${days.map(d => `<span title="${d}" style="aspect-ratio:1;border-radius:4px;background:${state.activity[d] ? (state.activity[d] > 4 ? 'var(--lime)' : 'var(--lime-d)') : 'var(--card2)'}"></span>`).join('')}</div></div>
    <div class="card"><h3>Abzeichen</h3><div class="grid two">${BADGES.map(b => `<div class="row" style="opacity:${got.has(b.id) ? 1 : .4}"><span style="font-size:1.6rem;width:2.2rem;text-align:center">${b.icon}</span><span><b>${UN(b.title)}</b>${got.has(b.id) ? ' ✓' : ''}<br><span class="small muted">${esc(b.desc)}</span></span></div>`).join('')}</div></div>
    <div class="card"><h3>Name</h3><div class="row" style="flex-wrap:nowrap"><input type="text" id="pname" maxlength="30" value="${esc(state.profile.name)}" placeholder="Name oder Spitzname"><button class="btn small primary" id="psave">Speichern</button></div></div>
    <div class="card"><h3>${U('Erfahrungsstufe')}</h3><p class="small muted" style="margin:0 0 .5rem">${U('Beeinflusst, wie ausführlich erklärt wird.')}</p><div class="stack">${nivButtons()}</div></div>
    <a class="card" href="#/zertifikat" style="display:block;text-decoration:none;color:inherit"><b>📜 ${U('Urkunde / Leistungsnachweis')}</b><br><span class="small muted">${U('Dein Fortschritt als PDF zum Speichern oder Drucken')} →</span></a>
    <div class="card"><h3 style="margin-top:0">🔗 ${U('Öffentliches Profil teilen')}</h3>
      <p class="small muted" style="margin:0 0 .5rem">${U('Zeig deinen Fortschritt (Punkte, Abzeichen, Serie) mit einem Link – z. B. in Social Media. Du bestimmst, ob er sichtbar ist.')}</p>
      <div id="teilbox"><p class="small muted">${U('Lade …')}</p></div>
    </div>
    <p class="honest">Punkte, Abzeichen und Serien sind Motivation – sie schalten keine Prüfung und kein Level frei.</p>`,
    mount(root) {
      ctfStandLaden();
      $('#psave', root).onclick = () => { state.profile.name = $('#pname', root).value.trim().slice(0, 30); save(); render(); toast('Gespeichert.'); };
      $$('.niv-opt', root).forEach(btn => btn.onclick = () => { state.profile.level = btn.dataset.niv; save(); $$('.niv-opt', root).forEach(x => x.classList.toggle('on', x === btn)); toast(U('Erfahrungsstufe gespeichert.')); });
      profilTeilenMount($('#teilbox', root));
    },
  };
};

// ---------------------------------------------------------------- Urkunde / Leistungsnachweis (PDF über Drucken)
views.zertifikat = (arg) => {
  const voll = arg === 'voll';
  const geknackt = ROOMS.filter(r => roomDone(r.id)).length;
  const punkte = gesamtPunkte();
  if (punkte < 1 && geknackt < 1) {
    return { title: 'Urkunde', html: `<a class="back" href="#/profil">← ${U('Profil')}</a><div class="card warn"><b>📜 ${U('Noch keine Urkunde.')}</b><br><span class="small">${U('Löse zuerst ein paar Aufgaben oder einen Raum – dann gibt es hier deinen Leistungsnachweis.')}</span></div>` };
  }
  const name = (state.profile.name || '').trim() || 'Nachtfalter-Lernende(r)';
  const abz = earnedBadges().length;
  const serie = gesamtStreak();
  const datum = new Date().toLocaleDateString(currentLang() === 'en' ? 'en-GB' : 'de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
  const h = Math.abs([...(name + ':' + punkte + ':' + geknackt)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)).toString(36).toUpperCase().padStart(5, '0').slice(0, 5);
  const code = 'NF-' + new Date().getFullYear() + '-' + h;
  const ms = erreichteMeilensteine();
  const hm = ms[ms.length - 1] || null;

  if (voll) {
    const raeumeDone = ROOMS.filter(r => roomDone(r.id));
    const ueb = Object.entries(state.exercises || {}).filter(([id, e]) => e.passedAt && EX[id]).map(([id]) => String(EX[id].title || id));
    const badges = earnedBadges();
    const dstyle = `<style>
.dz{max-width:1040px;margin:0 auto;background:#fff;color:#1c1830;border:1px solid #d7d1ef;border-radius:12px;padding:30px 34px;font-family:system-ui,sans-serif}
.dz-head{text-align:center;border-bottom:2px solid #2a2350;padding-bottom:14px;margin-bottom:16px}
.dz-em{width:48px;height:48px;border-radius:50%;background:#15122b;display:flex;align-items:center;justify-content:center;margin:0 auto}.dz-em img{width:30px;height:30px}
.dz-mk{letter-spacing:.24em;font-size:.68rem;color:#5b5280;text-transform:uppercase;margin:.4rem 0 0}
.dz-head h2{font-family:Georgia,'Times New Roman',serif;color:#241d4a;margin:.3rem 0 .1rem;font-size:1.5rem}
.dz-meta{color:#6a6192;font-size:.85rem}
.dz-kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:0 0 16px}
.dz-kpi div{text-align:center;background:#f1eefb;border:1px solid #e0dbf4;border-radius:8px;padding:.5rem .2rem}
.dz-kpi b{display:block;font-size:1.2rem;color:#3a2f8f}.dz-kpi span{font-size:.68rem;color:#6a6192}
.dz h3{color:#241d4a;font-size:1rem;margin:1.1rem 0 .4rem;border-bottom:1px solid #eee;padding-bottom:.2rem}
.dz ul{margin:.2rem 0;padding-left:1.1rem}.dz li{margin:.18rem 0;font-size:.9rem;color:#2c2648}
.dz .leer{color:#8a82ad;font-size:.85rem}
.dz-cols{column-count:4;column-gap:24px}
.dz-sec{break-inside:avoid;-webkit-column-break-inside:avoid;margin-bottom:.5rem}.dz-sec h3{margin-top:.2rem}
@media (max-width:980px){.dz-cols{column-count:3}}
@media (max-width:680px){.dz-cols{column-count:2}}
@media (max-width:440px){.dz-cols{column-count:1}}
@media print{@page{size:A4 landscape;margin:12mm}body{background:#fff !important}.top,.nav,.meldfab,#lang-banner,.zert-noprint{display:none !important}#main{margin:0 !important;padding:0 !important;max-width:none !important}.dz{border:none;max-width:none;padding:0}.dz-cols{column-count:4}}
</style>`;
    const liste = (arr, leer) => arr.length ? `<ul>${arr.map(x => `<li>${x}</li>`).join('')}</ul>` : `<p class="leer">${leer}</p>`;
    return {
      title: 'Ausführlicher Nachweis', wide: true,
      html: `${dstyle}
      <div class="zert-noprint" style="margin-bottom:.8rem"><a class="back" href="#/zertifikat">← ${U('Kompakte Urkunde')}</a>
        <div class="row between" style="align-items:center;margin-top:.3rem"><h1 style="margin:0">📋 ${U('Ausführlicher Nachweis')}</h1><button class="btn primary" id="zertdruck">🖨️ ${U('Als PDF speichern')}</button></div></div>
      <div class="dz">
        <div class="dz-head"><div class="dz-em"><img src="icons/icon.svg" alt=""></div><p class="dz-mk">Nachtfalter Hacklab</p><h2>${U('Ausführlicher Leistungsnachweis')}</h2><div class="dz-meta">${esc(name)} · ${esc(datum)} · ${U('Nachweis-Nr.')} ${code}</div></div>
        <div class="dz-kpi"><div><b>${punkte}</b><span>${U('Punkte')}</span></div><div><b>${geknackt}/${ROOMS.length}</b><span>${U('Räume')}</span></div><div><b>${abz}</b><span>${U('Abzeichen')}</span></div><div><b>${serie}🔥</b><span>${U('Serie')}</span></div></div>
        <div class="dz-cols">
          <section class="dz-sec"><h3>🏅 ${U('Meilensteine')}</h3>${liste(ms.map(m => `${m.icon} ${esc(m.titel)}`), U('Noch keine Meilensteine.'))}</section>
          <section class="dz-sec"><h3>🧩 ${U('Gelöste Räume')}</h3>${liste(raeumeDone.map(r => `${esc(roomText(r, 'title'))} <span class="leer">· ${roomPoints(r.id)} P.</span>`), U('Noch keine Räume vollständig gelöst.'))}</section>
          <section class="dz-sec"><h3>📒 ${U('Bestandene Übungen')}</h3>${liste(ueb.map(t => esc(t)), U('Noch keine Übungen bestanden.'))}</section>
          <section class="dz-sec"><h3>🏅 ${U('Abzeichen')}</h3>${liste(badges.map(b => `${b.icon || '🏅'} ${esc(UN(b.title))}`), U('Noch keine Abzeichen.'))}</section>
          <section class="dz-sec"><h3>🎯 ${U('Arena-Labs')}</h3><div id="arenabox"><p class="leer">${U('Lade …')}</p></div></section>
          <section class="dz-sec"><h3>🏁 ${U('CTF des Tages')}</h3><p style="font-size:.9rem;color:#2c2648">${U('Punkte')}: ${(ctfStand && ctfStand.punkte) || 0} · ${U('Serie')}: ${(ctfStand && ctfStand.streak) || 0}🔥</p></section>
        </div>
        <p class="leer" style="margin-top:1rem">${U('Persönlicher Nachweis über den Fortschritt in dieser App – kein externes Zertifikat.')}</p>
      </div>`,
      mount(root) {
        const db = $('#zertdruck', root); if (db) db.onclick = () => window.print();
        ctfStandLaden();
        arenaFortschritt().then(m => {
          const box = $('#arenabox', root); if (!box) return;
          const e2 = Object.entries(m || {});
          box.innerHTML = e2.length ? `<ul>${e2.map(([lab, n]) => `<li>${esc(lab)} <span class="leer">· ${n} ${U('Level')}</span></li>`).join('')}</ul>` : `<p class="leer">${U('Noch keine Arena-Labs gelöst.')}</p>`;
        }).catch(() => { const box = $('#arenabox', root); if (box) box.innerHTML = `<p class="leer">${U('Arena-Stand nicht geladen.')}</p>`; });
      },
    };
  }

  const style = `<style>
.zert-wrap{max-width:900px;margin:0 auto}
.zert-blatt{position:relative;background:#fbfaff;color:#1c1830;border-radius:14px;padding:38px 40px;aspect-ratio:1.414/1;border:2px solid #2a2350;box-shadow:0 10px 40px rgba(0,0,0,.25);overflow:hidden;font-family:Georgia,'Times New Roman',serif}
.zert-blatt:before{content:"";position:absolute;inset:10px;border:1px solid #7c6fd6;border-radius:8px;pointer-events:none}
.zert-emblem{width:54px;height:54px;border-radius:50%;background:#15122b;display:flex;align-items:center;justify-content:center;margin:0 auto}
.zert-emblem img{width:34px;height:34px}
.zert-marke{text-align:center;letter-spacing:.28em;font-size:.72rem;color:#5b5280;margin:.5rem 0 0;font-family:system-ui,sans-serif;text-transform:uppercase}
.zert-titel{text-align:center;font-size:2.1rem;margin:.6rem 0 .1rem;color:#241d4a}
.zert-sub{text-align:center;color:#6a6192;font-size:.9rem;margin:0}
.zert-ms{text-align:center;color:#3a2f8f;font-weight:600;font-size:.95rem;margin:.4rem 0 0;font-family:system-ui,sans-serif}
.zert-namewrap{text-align:center;margin:.9rem 0 .2rem}
.zert-name{display:inline-block;font-size:2rem;color:#0e0b1e;border-bottom:1px solid #d7d1ef;padding:0 1.2rem .25rem}
.zert-text{text-align:center;max-width:640px;margin:.5rem auto 0;color:#2c2648;font-size:1rem;line-height:1.5}
.zert-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:1.4rem auto 0;max-width:660px}
.zert-stat{text-align:center;background:#f1eefb;border:1px solid #e0dbf4;border-radius:8px;padding:.6rem .2rem}
.zert-stat b{display:block;font-size:1.4rem;color:#3a2f8f;font-family:system-ui,sans-serif}
.zert-stat span{font-size:.72rem;color:#6a6192;font-family:system-ui,sans-serif}
.zert-foot{display:flex;justify-content:space-between;align-items:flex-end;margin-top:1.6rem;font-family:system-ui,sans-serif;font-size:.78rem;color:#5b5280;gap:1rem}
.zert-sig{text-align:center;flex:0 0 auto}
.zert-line{border-top:1px solid #b9b2db;width:170px;margin:0 auto .2rem}
.zert-sig b{color:#241d4a;font-size:.9rem}
@media (max-width:640px){.zert-blatt{aspect-ratio:auto;padding:24px 18px}.zert-titel{font-size:1.5rem}.zert-name{font-size:1.4rem}.zert-stats{grid-template-columns:repeat(2,1fr)}.zert-foot{flex-direction:column;align-items:center;gap:.6rem;text-align:center}}
@media print{@page{size:A4 landscape;margin:10mm}body{background:#fff !important}.top,.nav,.meldfab,#lang-banner,.zert-noprint{display:none !important}#main{margin:0 !important;padding:0 !important;max-width:none !important}.zert-blatt{box-shadow:none !important;border-radius:0}}
</style>`;
  return {
    title: 'Urkunde',
    wide: true,
    html: `${style}
    <div class="zert-noprint" style="margin-bottom:.8rem"><a class="back" href="#/profil">← ${U('Profil')}</a>
      <div class="row between" style="align-items:center;margin-top:.3rem;gap:.4rem"><h1 style="margin:0">📜 ${U('Urkunde')}</h1><div class="row" style="gap:.4rem"><a class="btn small ghost" href="#/zertifikat/voll">📋 ${U('Ausführlich')}</a><button class="btn primary" id="zertdruck">🖨️ ${U('Als PDF speichern')}</button></div></div>
      <p class="small muted" style="margin:.3rem 0 0">${U('Persönlicher Leistungsnachweis über deinen Lernfortschritt. „Als PDF speichern" → im Druckdialog „Als PDF sichern" wählen (Querformat).')}</p>
    </div>
    <div class="zert-wrap"><div class="zert-blatt" id="zertblatt">
      <div class="zert-emblem"><img src="icons/icon.svg" alt=""></div>
      <p class="zert-marke">Nachtfalter Hacklab</p>
      <h2 class="zert-titel">${U('Leistungsnachweis')}</h2>
      <p class="zert-sub">${U('für ethisches Hacken & IT-Sicherheit')}</p>
      ${hm ? `<p class="zert-ms">${hm.icon} ${esc(hm.titel)}</p>` : ''}
      <div class="zert-namewrap"><span class="zert-name">${esc(name)}</span></div>
      <p class="zert-text">${U('hat sich im Nachtfalter Hacklab eigenständig und praxisnah in Linux, Netzwerken und ethischem Hacken weitergebildet und dabei folgende Leistung erbracht:')}</p>
      <div class="zert-stats">
        <div class="zert-stat"><b>${punkte}</b><span>${U('Punkte')}</span></div>
        <div class="zert-stat"><b>${geknackt}/${ROOMS.length}</b><span>${U('Räume geknackt')}</span></div>
        <div class="zert-stat"><b>${abz}</b><span>${U('Abzeichen')}</span></div>
        <div class="zert-stat"><b>${serie}🔥</b><span>${U('Tage in Folge')}</span></div>
      </div>
      <div class="zert-foot">
        <div><div>${esc(datum)}</div><div style="color:#8a82ad">${U('Nachweis-Nr.')} ${code}</div></div>
        <div class="zert-sig"><div class="zert-line"></div><b>Nachtfalter Hacklab</b><div>nachtfalter.tech</div></div>
      </div>
    </div></div>
    <p class="honest zert-noprint" style="margin-top:1rem">${U('Hinweis: Dies ist eine persönliche Urkunde über deinen Fortschritt in dieser App – kein staatlich oder extern anerkanntes Zertifikat.')}</p>`,
    mount(root) { const b = $('#zertdruck', root); if (b) b.onclick = () => window.print(); },
  };
};

// ---------------------------------------------------------------- Start
// Anmeldung ist Pflicht: ohne gespeicherte Sitzung geht es zuerst zum Nachtfalter-Konto.
function hatSitzung() {
  try {
    const a = JSON.parse(localStorage.getItem('kly.auth') || 'null');
    return !!(a && a.refresh_token) && localStorage.getItem('kly.auth.projekt') === globalThis.KLY_CONFIG?.supabaseUrl;
  } catch { return false; }
}
const zurAnmeldung = () => location.replace('konto.html?app=1');
if (syncConfigured() && !hatSitzung()) { zurAnmeldung(); await new Promise(() => {}); }
initLang(); protectCodes(); loadShellT(); await loadUI(); L1 = makeT(await loadLevel1());
window.addEventListener('hashchange', render);
function syncLine(st) { return `<span class="dot ${st.state === 'ok' ? 'ok' : st.state === 'err' ? 'err' : 'warn'}"></span> ${esc(st.msg)}`; }
onSyncStatus((st) => { if (syncConfigured() && !st.user && st.state === 'warn' && navigator.onLine && !hatSitzung()) return zurAnmeldung(); renderTop(); const el = document.getElementById('syncline'); if (el) el.innerHTML = syncLine(st); });
render();
locationModal(false);
initSync(getState, applyState);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => { /* offline-Modus nicht verfügbar */ });
}
