// Sprache: Deutsch ist das Original. Englisch und Ukrainisch werden automatisch von Google Translate übersetzt
// (Website-Übersetzer). Befehle, Codes und Terminals sind translate="no" und bleiben im Original.
// Datenschutz: Bei EN/UK gehen die angezeigten Texte zur Übersetzung an Google.

export const LANGS = {
  de: { name: 'Deutsch', flag: '🇩🇪', note: '' },
  en: { name: 'English', flag: '🇬🇧', note: 'Partly translated by hand, the rest by Google. Commands and the terminal stay in the original – type them exactly as shown.' },
  uk: { name: 'Українська', flag: '🇺🇦', note: 'Частково перекладено вручну, решту – Google. Команди й термінал залишаються в оригіналі – вводь їх саме так, як показано.' },
};
const KEY = 'kly.lang';
// Wenige feste Begriffe übersetzen wir selbst (zuverlässiger als die Maschine)
export const NAV = { de: ['Start', 'Lernen', 'Terminal', 'Mehr'], en: ['Home', 'Learn', 'Terminal', 'More'], uk: ['Головна', 'Навчання', 'Термінал', 'Ще'] };
const FAIL = { en: 'Translation service not reachable right now – showing the German original.', uk: 'Сервіс перекладу зараз недоступний – показано німецький оригінал.' };

export function currentLang() {
  try { const l = localStorage.getItem(KEY); if (LANGS[l]) return l; } catch { /* */ }
  return geraeteSprache();
}

// Hat die Person selbst eine Sprache gewählt? Nur dann laden wir Google Übersetzer (Einwilligung, siehe Datenschutz).
export function selbstGewaehlt() {
  try { return !!LANGS[localStorage.getItem(KEY)]; } catch { return false; }
}

// Ohne eigene Wahl: Handy-Sprache nehmen (Deutsch, Ukrainisch, Englisch), sonst Englisch
export function geraeteSprache() {
  const liste = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''])
    .map(x => String(x).toLowerCase().slice(0, 2));
  const erste = liste[0];
  return LANGS[erste] ? erste : 'en';
}

function setCookie(v) {
  const host = location.hostname;
  const exp = v ? '' : '; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = `googtrans=${v}; path=/${exp}`;
  if (host.includes('.')) document.cookie = `googtrans=${v}; path=/; domain=.${host}${exp}`;
}

// Sprache wechseln: speichern und neu laden (Google übersetzt beim Laden zuverlässig)
export function setLang(l) {
  if (!LANGS[l]) l = 'de';
  try { localStorage.setItem(KEY, l); } catch { /* */ }
  setCookie(l === 'de' ? '' : `/de/${l}`);
  location.reload();
}

// Beim Start aufrufen
export function initLang() {
  const l = currentLang();
  document.documentElement.lang = l === 'de' ? 'de' : l;
  if (l === 'de') { setCookie(''); return; }
  if (!selbstGewaehlt()) { setCookie(''); return; } // nur eigene Übersetzungen, kein Google ohne aktive Wahl
  setCookie(`/de/${l}`);
  const holder = document.createElement('div'); holder.id = 'gt-el'; holder.hidden = true; document.body.appendChild(holder);
  window.klyGtInit = () => {
    try { new window.google.translate.TranslateElement({ pageLanguage: 'de', includedLanguages: 'en,uk', autoDisplay: false }, 'gt-el'); } catch { /* */ }
  };
  const s = document.createElement('script');
  s.src = 'https://translate.google.com/translate_a/element.js?cb=klyGtInit';
  s.onerror = () => { const n = document.getElementById('lang-note'); if (n) n.textContent = FAIL[l]; };
  document.head.appendChild(s);
  // Prüfen, ob Google wirklich übersetzt hat (setzt die Klasse translated-ltr am <html>)
  setTimeout(() => {
    if (!document.documentElement.className.includes('translated')) { const n = document.getElementById('lang-note'); if (n) n.textContent = FAIL[l]; }
  }, 12000);
}

// Hinweiszeile bei maschineller Übersetzung (wird selbst nicht übersetzt)
export function langNoteHTML() {
  const l = currentLang();
  if (l === 'de') return '';
  // Eigene Wahl getroffen → kleiner Hinweis (teils Hand-, teils Google-Übersetzung).
  if (selbstGewaehlt()) return `<div class="card tight small" id="lang-note" translate="no">${LANGS[l].flag} ${LANGS[l].note}</div>`;
  // Automatisch per Handy erkannt → auffälliges Banner mit Direkt-Umschalter.
  const txt = { en: 'This app is in German.', uk: 'Цей застосунок німецькою.' }[l];
  const go = { en: 'Switch to English', uk: 'Перейти українською' }[l];
  const zu = { en: 'Keep German', uk: 'Залишити німецькою' }[l];
  return `<div class="langbanner" id="lang-banner" translate="no">
    <span>🌐 ${txt}</span>
    <button class="btn small go" data-lang="${l}">${LANGS[l].flag} ${go} →</button>
    <button class="btn small ghost" data-lang="de">${zu}</button>
  </div>`;
}

// Auswahlknöpfe (nicht übersetzt, damit jede Sprache ihren eigenen Namen zeigt)
export function langPickerHTML() {
  const l = currentLang();
  return `<div class="row" translate="no" style="gap:.4rem;flex-wrap:wrap">${Object.entries(LANGS).map(([k, v]) => `<button class="btn small ${k === l ? 'primary' : 'ghost'}" data-lang="${k}">${v.flag} ${v.name}</button>`).join('')}</div>`;
}
export function bindLangPicker(root) {
  root.querySelectorAll('[data-lang]').forEach(b => b.onclick = () => { if (b.dataset.lang !== currentLang() || !selbstGewaehlt()) setLang(b.dataset.lang); });
}

// ---- Codes & Befehle vor der Übersetzung schützen -------------------------------------------
// codeify(text) → HTML: erkennt in deutschem Fließtext Befehle, Dateinamen, Optionen und Codes und setzt
// sie in <code translate="no">. So übersetzt Google nur die Erklärung, nie das, was man eintippen muss.
const CMDS = new Set(('cat ls cd pwd head tail sed awk wc sort uniq diff cut tr base64 rev chmod chown echo printf grep egrep find file ' +
  'strings xxd sha256sum md5sum seq test touch mkdir rmdir rm cp mv less more help whoami id su sudo ssh scp nmap curl wget nc ' +
  'ping ip ifconfig netstat ss entsperren unlock code xor suche for while if read export history clear tree basename dirname stat ' +
  'df ps kill top uname hostname env which type alias ln tar gzip gunzip zcat unzip openssl gobuster ffuf nikto searchsploit ' +
  'msfconsole smbclient enum4linux ftp telnet redis-cli mysql psql mongo openvpn rsync python3 python bash sh apt git docker ' +
  'tcpdump wireshark burpsuite whatweb dig whois host nslookup journalctl systemctl crontab sqlite3 jq exit logout').split(' '));
const STOP = new Set(('und oder zeigt gibt zählt ist sind scheitert liest mit für im in auf den die das der dem des dann nur bedeutet hilft ' +
  'findet sucht geht macht kann will braucht als aus an zu nicht auch sortiert filtert öffnet listet schreibt sagt wird werden ' +
  'hat haben einen eine ein einer reicht klappt funktioniert prüft vergleicht dreht entfernt zerlegt schneidet ändert startet ' +
  'verbindet läuft lassen lässt holt druckt ersetzt erzeugt liefert nimmt kommt bringt passt fehlt so wie wo was hier da noch schon ' +
  'immer jetzt mal bis vom zum zur beim nach vor über unter um bei ohne gegen durch alle alles jede jeder jedes ' +
  'weiter dafür damit dazu davon darauf daran darin dort selbst zuerst danach gern einfach auch nochmal wieder sofort ab her hin los zurück').split(' '));
const PATTERNS = [
  /KLY\{[^}\n]{0,40}\}/y, /KLY-(?:[0-9A-F]{6}|X{6})/y, /entsperren\s+\S+/y,
  /(?:~|\.{1,2})?\/[\w.\-*/~]*/y,                      // Pfade: /etc/passwd, ./-datei, ~/turm
  /\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?/y,                 // IP (mit Port)
  /'[^'\n]+'/y,                                        // 'einfach' gequotet = Shell
  /--?[A-Za-z][\w-]*/y,                                // Optionen -n, --help
  /[\w-]{2,}\.[a-z0-9]{1,5}\b(?!\.\w)/y,               // dateiname.txt
];
const SUBCMD = new Set(['git', 'docker', 'apt', 'systemctl', 'ip', 'sudo']);
const end0 = (i, w) => i + w[0].length;
const isCodeTok = (t) => /[-/.'"|$*~{}=<>\\\d_:;&]/.test(t) || /^[A-ZÄÖÜ]{2,}$/.test(t) || CMDS.has(t);

function cmdSpan(s, i) {
  const m = /[a-z][\w-]*/y; m.lastIndex = i; const w = m.exec(s);
  if (!w || !CMDS.has(w[0])) return 0;
  const after = s[i + w[0].length];
  if (after !== undefined && !/[\s.,;:)?!“”]/.test(after)) return 0;
  if ((w[0] === 'for' || w[0] === 'while') && /^ \S/.test(s.slice(end0(i, w), end0(i, w) + 2))) {
    const d = s.indexOf('done', i); if (d > 0 && !/[.!?]\s+[A-ZÄÖÜ]/.test(s.slice(i, d))) return d + 4 - i;
  }
  let end = i + w[0].length, j = end, first = true, prevTok = w[0];
  const sub = SUBCMD.has(w[0]);
  while (j < s.length && s[j] === ' ') {
    let k = j + 1, tok = '';
    if (s[k] === "'" || s[k] === '"') { const q = s.indexOf(s[k], k + 1); if (q < 0 || / [·–—] /.test(s.slice(k, q))) break; tok = s.slice(k, q + 1); }
    else {
      const t = /[^\s]+/y; t.lastIndex = k; const r = t.exec(s); if (!r) break; tok = r[0];
      // -d' ' : offenes Anführungszeichen im Wort bis zum schließenden mitnehmen
      for (const qc of tok.includes("'") ? ["'"] : ['"']) if ((tok.split(qc).length - 1) % 2 === 1) { const q = s.indexOf(qc, k + tok.length); if (q > 0 && !/ [·–—] |: /.test(s.slice(k, q))) { const t2 = /[^\s]*/y; t2.lastIndex = q + 1; tok = s.slice(k, q + 1) + t2.exec(s)[0]; } break; }
    }
    let core = tok, trail = false;
    if (!/^['"]/.test(tok)) { const p = /[.,;:!?)“”]+$/.exec(tok); if (p && !/^\.+\/?$/.test(tok)) { core = tok.slice(0, p.index); trail = true; } }
    if (!core) break;
    const word = first && /^[a-zäöüß]+$/.test(core) && !STOP.has(core) && !isCodeTok(core) && !(core.length > 5 && /(en|st)$/.test(core));
    // Bloßes Wort vor Satzzeichen („Hier hilft help weiter.“) nur, wenn es nach Datei/Ordner aussieht
    if (word && trail && !sub && (core.length > 8 || /(ig|lich|bar|ung|heit)$/.test(core))) break;
    const ok = core === '|' || core === '&&' || core === ';' || isCodeTok(core) || word || (/^-/.test(prevTok) && /^[a-z]$/i.test(core));
    if (!ok || /^[„“]/.test(core)) break;
    // Ein bloßes Wort als Argument (cat notizen) nur, wenn danach Satzende oder weiterer Code folgt –
    // sonst ist es wohl deutscher Text („ls siehst du“).
    if (word && !sub && !trail && k + core.length < s.length) {
      const nx = /\s+(\S+)/y; nx.lastIndex = k + core.length; const r = nx.exec(s);
      if (!r || !(isCodeTok(r[1].replace(/[.,;:!?)]+$/, '')) || /^[|→–—\/]$/.test(r[1]))) break;
    }
    end = k + core.length; j = end; first = core === '|' || core === '&&'; prevTok = core;
    if (trail) break;
  }
  return end - i;
}

const escH = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function codeify(text) {
  const s = String(text ?? ''); let out = '', plain = '', i = 0;
  const flush = () => { out += escH(plain).replace(/ → /g, ' – danach: '); plain = ''; };
  while (i < s.length) {
    const prev = s[i - 1];
    const boundary = i === 0 || /[\s(„"“:,]/.test(prev);
    let len = 0;
    if (boundary) {
      len = cmdSpan(s, i);
      if (!len) for (const re of PATTERNS) { re.lastIndex = i; const m = re.exec(s); if (m && m[0].length > 1) { len = m[0].length; break; } }
    } else if (s.startsWith('KLY', i)) { const re = PATTERNS[0]; re.lastIndex = i; const m = re.exec(s); if (m) len = m[0].length; }
    if (len) { flush(); out += `<code translate="no">${escH(s.slice(i, i + len))}</code>`; i += len; }
    else plain += s[i++];
  }
  flush(); return out;
}

// Sicherheitsnetz für alles, was nachträglich eingefügt wird (Rückmeldungen, Tipps, Dialoge):
// Code-Elemente und Codes im Text werden markiert, bevor Google sie anfasst.
const CODE_TXT = /KLY\{[^}\n]{0,40}\}|KLY-(?:[0-9A-F]{6}|X{6})/g;
function protect(root) {
  if (root.nodeType !== 1) return;
  autoUI(root);
  root.querySelectorAll?.('pre, code, kbd, samp, .script, .syntax, input, textarea, [data-copy], .xterm').forEach(e => e.setAttribute('translate', 'no'));
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const hits = [];
  for (let n = w.nextNode(); n; n = w.nextNode()) { CODE_TXT.lastIndex = 0; if (CODE_TXT.test(n.data) && !n.parentElement?.closest('[translate="no"]')) hits.push(n); }
  for (const n of hits) {
    const frag = document.createDocumentFragment(); let last = 0; CODE_TXT.lastIndex = 0;
    for (const m of n.data.matchAll(CODE_TXT)) {
      frag.append(n.data.slice(last, m.index));
      const c = document.createElement('code'); c.setAttribute('translate', 'no'); c.textContent = m[0]; frag.append(c);
      last = m.index + m[0].length;
    }
    frag.append(n.data.slice(last)); n.replaceWith(frag);
  }
}
export function protectCodes() {
  if (currentLang() === 'de') return;
  protect(document.body);
  new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) { if (n.nodeType === 1) protect(n); else if (n.nodeType === 3 && n.parentElement) protect(n.parentElement); } })
    .observe(document.body, { childList: true, subtree: true });
}

// ---- Handübersetzungen von Räumen ------------------------------------------------------------
// Datei i18n/<sprache>/<raumid>.json = { "<deutscher Originaltext>": "<Übersetzung>" } (Team „Sprache & Qualität“).
// {code} steht für einen Code KLY{16 Zeichen}. Was nicht im Wörterbuch steht, bleibt original
// (und wird dann wie bisher von Google übersetzt). Handübersetzte Stellen sind translate="no".
export const HAND = { en: ['w1', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9', 'p5', 'p6', 'p7', 'p8', 'p10', 'h1', 'n1', 'b1'], uk: ['w1', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9', 'p5', 'p6', 'p7', 'p8', 'p10', 'h1', 'n1', 'b1'] };
const DICTS = {};
const CODE_IN = /KLY\{[0-9a-f]{16}\}/g;

export function hasHand(id) { return (HAND[currentLang()] || []).includes(id); }
export function handDict(id) { return DICTS[id]; }
export async function loadHand(id) {
  const l = currentLang();
  if (!hasHand(id)) return null;
  if (DICTS[id] !== undefined) return DICTS[id];
  try { const r = await fetch(`i18n/${l}/${id}.json`); DICTS[id] = r.ok ? await r.json() : null; } catch { DICTS[id] = null; }
  return DICTS[id];
}

// Übersetzer-Funktionen aus einem Wörterbuch (auch für Tests nutzbar)
export function makeT(dict) {
  const d = dict || {};
  const t = (s) => {
    if (typeof s !== 'string' || !s) return s;
    if (Object.hasOwn(d, s)) return d[s];
    const codes = s.match(CODE_IN) || [];
    if (codes.length) {
      const k = s.replace(CODE_IN, '{code}');
      if (Object.hasOwn(d, k)) { let i = 0; return d[k].replace(/\{code\}/g, () => codes[i++] ?? '{code}'); }
    }
    const chat = s.match(/^([A-ZÄÖÜ][a-zäöüß]+): (.+)$/); // Chat-Zeile „Name: Satz“
    if (chat) { const r = t(chat[2]); if (r !== chat[2]) return chat[1] + ': ' + r; }
    return s;
  };
  const lines = (text) => String(text).split('\n').map(t).join('\n');
  // HTML: übersetzt → translate="no"; sonst Original (Google darf übersetzen)
  const h = (s, fmt = codeify) => { const r = t(s); return r !== s ? `<span translate="no">${fmt(r)}</span>` : fmt(s); };
  return { t, lines, h, active: !!dict };
}

// Alle Textdateien unter einem Ordner zeilenweise übersetzen (Standard für Räume ohne Sonderfälle)
export function translateTree(node, T, special = () => null, path = '') {
  for (const [name, kid] of Object.entries(node?.kids || {})) {
    const p = path + '/' + name;
    if (kid.kids) { translateTree(kid, T, special, p); continue; }
    if (typeof kid.data !== 'string' || !kid.data) continue;
    const s = special(name, kid.data, T, p);
    kid.data = s ?? T.lines(kid.data);
  }
}

// ---- Terminal-Meldungen (i18n/<sprache>/shell.json) ----------------------------------------------
// Ganze Ausgabezeilen; {1}, {2} … = variable Teile. Übersetzt wird NUR die Anzeige im Terminal,
// nie Daten in Pipes oder Dateien (die Shell rechnet weiter mit dem Original).
export function makeLineT(dict) {
  const d = dict || {}, tpl = [];
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const [k, v] of Object.entries(d)) {
    if (!/\{\d\}/.test(k)) continue;
    const order = [];
    const src = reEsc(k).replace(/\\\{(\d)\\\}/g, (_, n) => { if (order.includes(n)) return `\\k<p${n}>`; order.push(n); return `(?<p${n}>.+?)`; });
    tpl.push({ re: new RegExp('^' + src + '$'), v, lit: k.replace(/\{\d\}/g, '').length });
  }
  tpl.sort((a, b) => b.lit - a.lit); // spezifischere Muster zuerst
  const line = (l) => {
    if (!l || !/[A-Za-zÄÖÜäöü]/.test(l)) return l;
    if (Object.hasOwn(d, l)) return d[l];
    for (const { re, v } of tpl) { const m = l.match(re); if (m) return v.replace(/\{(\d)\}/g, (_, n) => m.groups['p' + n]); }
    return l;
  };
  return Object.assign((text) => String(text ?? '').split('\n').map(line).join('\n'), { line });
}
let shellT = (s) => s;
export const termT = (s) => shellT(s);
export async function loadShellT() {
  const l = currentLang(); if (l === 'de') return;
  try { const r = await fetch(`i18n/${l}/shell.json`); if (r.ok) shellT = makeLineT(await r.json()); } catch { /* bleibt Deutsch */ }
}

// ---- Oberfläche (i18n/<sprache>/ui.json) -------------------------------------------------------
// Feste Sätze von Startseite und Willkommen. {name}, {n} … = Platzhalter.
let UI = null;
export async function loadUI() {
  const l = currentLang(); if (l === 'de') return;
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  try {
    const r = await Promise.race([fetch(`i18n/${l}/ui.json`), wait(3000).then(() => null)]);
    if (r && r.ok) { UI = await r.json(); compileUI(); }
  } catch { /* bleibt Deutsch, Google übersetzt */ }
  await Promise.all((HAND[l] || []).map(loadHand)); // Raumtitel/-texte für die Karten
}
// Automatische Übersetzung sichtbarer Texte: Ein Textknoten, der genau einem ui.json-Satz entspricht
// (oder einem Muster wie „Level {n} · {title}“), wird ersetzt. Platzhalter-Werte werden selbst nachgeschlagen.
let UI_TPL = [];
function compileUI() {
  const reEsc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  UI_TPL = Object.entries(UI).filter(([k]) => /\{\w+\}/.test(k)).map(([k, v]) => {
    const names = [];
    const src = reEsc(k).replace(/\\\{(\w+)\\\}/g, (_, n) => { names.push(n); return '(.+?)'; });
    return { re: new RegExp('^' + src + '$', 's'), v, names, lit: k.replace(/\{\w+\}/g, '').length };
  }).filter(t => t.lit >= 2).sort((a, b) => b.lit - a.lit);
}
function uiAuto(text) {
  if (!UI) return null;
  if (Object.hasOwn(UI, text)) return UI[text]; // auch identische Werte (Eigennamen) vor Google schützen
  for (const t of UI_TPL) {
    const m = text.match(t.re); if (!m) continue;
    const vals = {}; t.names.forEach((n, i) => { const x = m[i + 1]; vals[n] = Object.hasOwn(UI, x) ? UI[x] : x; });
    return t.v.replace(/\{(\w+)\}/g, (mm, n) => (n in vals ? vals[n] : mm));
  }
  return null;
}
const SKIP = 'code, pre, kbd, samp, script, style, textarea, [translate="no"], .xterm, .term';
function autoUI(root) {
  if (!UI || root.nodeType !== 1 || root.closest?.(SKIP)) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement?.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
  const todo = [];
  for (let n = w.nextNode(); n; n = w.nextNode()) { const t = n.data.trim(); if (t.length > 1 && /[A-Za-zÄÖÜäöüß]/.test(t)) { const r = uiAuto(t); if (r) todo.push([n, t, r]); } }
  for (const [n, t, r] of todo) {
    const i = n.data.indexOf(t), sp = document.createElement('span'); sp.setAttribute('translate', 'no'); sp.textContent = r;
    n.replaceWith(n.data.slice(0, i), sp, n.data.slice(i + t.length));
  }
  for (const el of root.querySelectorAll('[placeholder], [title], [aria-label]')) for (const at of ['placeholder', 'title', 'aria-label']) {
    const v = el.getAttribute(at); if (v) { const r = uiAuto(v.trim()); if (r) el.setAttribute(at, r); }
  }
}
const fill = (s, v) => (v ? s.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m)) : s);
export const Ut = (s, v) => fill(UI && Object.hasOwn(UI, s) ? UI[s] : s, v);
// Eigenname: übersetzen, falls in ui.json, sonst unverändert und vor Google geschützt
export const UN = (s) => (UI && Object.hasOwn(UI, s) ? U(s) : `<span translate="no">${escH(s)}</span>`);
export const U = (s, v) => (UI && Object.hasOwn(UI, s) ? `<span translate="no">${escH(fill(UI[s], v))}</span>` : escH(fill(s, v)));
// Raumtitel und Kurzbeschreibung aus der Handübersetzung (für Karten außerhalb des Raums)
export const roomText = (r, field) => {
  const T = makeT(DICTS[r.id]); const out = T.h(r[field], escH);
  // Raumnamen sind Eigennamen: bei handübersetzten Räumen nie von Google übersetzen lassen
  return field === 'title' && DICTS[r.id] && !out.startsWith('<span translate') ? `<span translate="no">${out}</span>` : out;
};
// Level 1 (Spickzettel + Übungen): i18n/<sprache>/level1.json
export async function loadLevel1() {
  const l = currentLang(); if (l === 'de') return null;
  // Level 1 + Story „Der stille Alarm“ (s1) teilen sich die Ansichten (Belege, Anleitungen) → ein Wörterbuch
  const get = async (f) => { try { const r = await fetch(`i18n/${l}/${f}.json`); return r.ok ? await r.json() : {}; } catch { return {}; } };
  const [a, b] = await Promise.all([get('level1'), get('s1')]);
  return Object.keys(a).length || Object.keys(b).length ? { ...a, ...b } : null;
}
