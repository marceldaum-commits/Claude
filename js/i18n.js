// Sprache: Deutsch ist das Original. Englisch und Ukrainisch werden automatisch von Google Translate übersetzt
// (Website-Übersetzer). Befehle, Codes und Terminals sind translate="no" und bleiben im Original.
// Datenschutz: Bei EN/UK gehen die angezeigten Texte zur Übersetzung an Google.

export const LANGS = {
  de: { name: 'Deutsch', flag: '🇩🇪', note: '' },
  en: { name: 'English', flag: '🇬🇧', note: 'Machine-translated (Google). Commands and terminals stay in the original – type them exactly as shown.' },
  uk: { name: 'Українська', flag: '🇺🇦', note: 'Машинний переклад (Google). Команди й термінал залишаються в оригіналі – вводьте їх саме так, як показано.' },
};
const KEY = 'kly.lang';
// Wenige feste Begriffe übersetzen wir selbst (zuverlässiger als die Maschine)
export const NAV = { de: ['Start', 'Lernen', 'Terminal', 'Mehr'], en: ['Home', 'Learn', 'Terminal', 'More'], uk: ['Головна', 'Навчання', 'Термінал', 'Ще'] };
const FAIL = { en: 'Translation service not reachable right now – showing the German original.', uk: 'Сервіс перекладу зараз недоступний – показано німецький оригінал.' };

export function currentLang() {
  try { const l = localStorage.getItem(KEY); return LANGS[l] ? l : 'de'; } catch { return 'de'; }
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
  return l === 'de' ? '' : `<div class="card tight small" id="lang-note" translate="no">${LANGS[l].flag} ${LANGS[l].note}</div>`;
}

// Auswahlknöpfe (nicht übersetzt, damit jede Sprache ihren eigenen Namen zeigt)
export function langPickerHTML() {
  const l = currentLang();
  return `<div class="row" translate="no" style="gap:.4rem;flex-wrap:wrap">${Object.entries(LANGS).map(([k, v]) => `<button class="btn small ${k === l ? 'primary' : 'ghost'}" data-lang="${k}">${v.flag} ${v.name}</button>`).join('')}</div>`;
}
export function bindLangPicker(root) {
  root.querySelectorAll('[data-lang]').forEach(b => b.onclick = () => { if (b.dataset.lang !== currentLang()) setLang(b.dataset.lang); });
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
  'weiter dafür damit dazu davon darauf daran darin dort selbst zuerst danach gern einfach auch nochmal wieder sofort').split(' '));
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
    if (s[k] === "'" || s[k] === '"') { const q = s.indexOf(s[k], k + 1); if (q < 0) break; tok = s.slice(k, q + 1); }
    else { const t = /[^\s]+/y; t.lastIndex = k; const r = t.exec(s); if (!r) break; tok = r[0]; }
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
export const HAND = { en: ['w1'], uk: ['w1'] };
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
