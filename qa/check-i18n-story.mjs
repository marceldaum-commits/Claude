// QA „Sprache & Qualität“: Prüft die Handübersetzung einer Story-Mission.
// Aufruf (im Repo-Wurzelordner):  node qa/check-i18n-story.mjs s1
// a) sammelt alle Texte der Story rekursiv (ohne ids/keys, Befehls-/Regex-Felder, real.setup) + Rückmeldungen aus
//    answer.check() + Zeilen der Sandbox-Dateien (monitor.log ist Daten und bleibt original)
// b) jeder Schlüssel in i18n/<sprache>/<story>.json kommt darin vor; jeder Text hat eine Übersetzung
// c) Befehle (codeify), Story-Befehle (antwort/beleg/bericht/jobs), Zahlen, IPs, Pfade, Dateinamen bleiben unverändert
// d) Ukrainisch: keine russischen Buchstaben, Apostroph ’, Anführungszeichen «…»; Englisch: "…"
// e) Antworten bleiben gleich: Sim-Szene mit übersetzten Dateien lösbar, Optionen nicht an Länge erkennbar,
//    keine Zahl (Port/PID) taucht neu auf, die eine andere Antwort nahelegt
import { readFileSync } from 'node:fs';
import { Shell, baseFS, HOME } from '../js/shell.js';
import { STORIES } from '../js/content/story1.js';
import { makeT, translateTree, codeify } from '../js/i18n.js';

const ID = process.argv[2] || 's1';
const STORY = STORIES.find(s => s.id === ID);
if (!STORY) { console.log(`Story ${ID} gibt es nicht.`); process.exit(2); }
let fehler = 0;
const err = (m) => { fehler++; console.log('  ✗ ' + m); };
const short = (s, n = 110) => JSON.stringify(s.length > n ? s.slice(0, n) + '…' : s);

// ---------------------------------------------------------------- a) Originaltexte sammeln
// Felder, die nie übersetzt werden: ids, Schlüssel, Befehle, Regex, Skripte zum Abtippen.
const SKIP = new Set(['id', 'kind', 'level', 'key', 'tools', 'prereq', 'points', 'setup', 'commandRe', 're', 'ok', 'needToken', 'allowTargets']);
const DATA_FILES = new Set(['monitor.log']);
const quelle = new Map(); // text → Herkunft
const add = (s, where) => { if (typeof s === 'string' && /[A-Za-zÄÖÜäöüß]{2}/.test(s) && s !== 'sys' && !quelle.has(s)) quelle.set(s, where); };
function walk(v, where) {
  if (typeof v === 'string') return add(v, where);
  if (typeof v === 'function') { // Rückmeldungen aus check(): msg-Strings im Quelltext
    for (const m of String(v).matchAll(/msg:\s*(['"`])((?:\\.|(?!\1).)*?)\1/g)) add(m[2].replace(/\\'/g, "'"), where + '.msg');
    return;
  }
  if (v instanceof RegExp || !v || typeof v !== 'object') return;
  if (Array.isArray(v)) return v.forEach((x, i) => walk(x, `${where}[${i}]`));
  for (const [k, x] of Object.entries(v)) {
    if (SKIP.has(k) && typeof x !== 'function') continue;
    if (k === 'reportFields') { x.forEach(([, label, ph], i) => { add(label, `${where}.reportFields[${i}]`); add(ph, `${where}.reportFields[${i}]`); }); continue; }
    walk(x, where ? `${where}.${k}` : k);
  }
}
walk(Object.fromEntries(Object.entries(STORY).filter(([k]) => k !== 'sandbox')), '');
STORY.scenes.forEach(sc => sc.chat.forEach(([who]) => add(who, `${sc.id}.chat.sprecher`)));
add('Mara (Schichtleitung)', 'main.js stepDone'); // Sprecher der Debriefs (fest in main.js)

const probe = new Shell({ fs: baseFS() });
STORY.sandbox.setup(probe);
const base = probe.cwd;
(function files(node, p) {
  for (const [n, kid] of Object.entries(node?.kids || {})) {
    if (kid.kids) { files(kid, p + '/' + n); continue; }
    if (typeof kid.data !== 'string' || DATA_FILES.has(n)) continue;
    for (const l of kid.data.split('\n')) add(l, `datei ${p}/${n}`);
  }
})(probe.fs.get(base), base.replace(HOME, '~'));

// ---------------------------------------------------------------- Hilfen
const un = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const ALLOW_CODE = new Set(['curl heraus']); // codeify-Fehlgriff: deutsches Wort hinter dem Befehl
// Technische Bestandteile, die 1:1 im übersetzten Text stehen müssen
const TECH = [
  /\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?(?:\/\d+)?/g,        // IPs, mit Port/CIDR
  /(?<![\wäöüß])(?:https?:\/\/)?(?:~|\.)?\/[\w.\-~/]*[\w/]/g, // Pfade, URLs (nicht „lesen/kopieren“)
  /\b[\w-]+\.(?:txt|log|sql|html)\b/g,               // Dateinamen
  /\b(?:SOC-\d+|lab-vm-\d+|addr=[\d.]+|uid \d+|-rw-+|6-0-0|SimpleHTTP|http\.server|python3?|PID|PPID|INFO|WARN|GET|IP|URL)\b/g,
  /\b(?:antwort a \| b \| c|antwort <[^>]+>|beleg|bericht|jobs)\b/g, // Story-Befehle (exakt eintippen)
  /%1/g,
];
const nums = (s) => (s.match(/\d+/g) || []).sort().join(',');

// ---------------------------------------------------------------- Prüfen
for (const lang of ['en']) {
  console.log(`\n== ${lang}: i18n/${lang}/${ID}.json`);
  const dict = JSON.parse(readFileSync(new URL(`../i18n/${lang}/${ID}.json`, import.meta.url), 'utf8'));
  for (const [k, v] of Object.entries(dict)) {
    // b) Schlüssel im Original?
    if (!quelle.has(k)) err(`Schlüssel nicht im Original: ${short(k)}`);
    if (typeof v !== 'string' || !v.trim()) { err(`leere Übersetzung: ${short(k)}`); continue; }
    if (k.split('\n').length !== v.split('\n').length) err(`Zeilenzahl anders: ${short(v)}`);
    // c) Befehle (codeify) unverändert – Platzhalter in Großbuchstaben und <…> dürfen übersetzt sein
    for (const m of codeify(k).matchAll(/<code translate="no">(.*?)<\/code>/g)) {
      const c = un(m[1]).replace(/[.,:;]$/, '');
      if (ALLOW_CODE.has(c) || /<\S/.test(c)) continue;
      if (/[A-ZÄÖÜ]{3,}/.test(c.replace(/KLY|ERROR|INFO|WARN|HEAD|TERM|KILL|HUP|README|DNS|HTTP|URL|GET|PID|PPID/g, ''))) continue;
      if (/(^|-)[A-ZÄÖÜ][a-zäöüß]{2,}|^[A-ZÄÖÜ][a-zäöüß]+-/.test(c)) continue; // deutsche Wortteile („-Zeilen“)
      if (!v.includes(c)) err(`Befehl „${c}“ fehlt in: ${short(v, 160)}`);
    }
    for (const re of TECH) for (const t of k.match(re) || []) if (!v.includes(t)) err(`„${t}“ fehlt/verändert in: ${short(v, 160)}`);
    // e) keine neuen oder verschwundenen Zahlen (Port, PID, Uhrzeit, Ticket …)
    if (nums(k) !== nums(v)) err(`Zahlen anders (${nums(k)} → ${nums(v)}): ${short(v)}`);
    if (k.startsWith('Mara: „') && !/^Mara: ".*"(  antwort a \| b \| c)?$/s.test(v)) err(`Mara-Zitat nicht im Format „Mara: …“: ${short(v)}`);
    // d) Sprache/Typografie (nur noch Englisch)
    if (/[„“«»]/.test(v)) err(`deutsche Anführungszeichen im Englischen: ${short(v)}`);
    if (/[äöüßÄÖÜ]/.test(v) && v !== k) err(`Umlaut im Englischen: ${short(v)}`);
  }
  const fehlt = [...quelle.keys()].filter(k => !(k in dict));
  fehlt.forEach(k => err(`ohne Übersetzung (${quelle.get(k)}): ${short(k)}`));

  // e) Antworten: Optionen dürfen nicht durch die Länge auffallen
  for (const sc of STORY.scenes.filter(x => x.options)) {
    const len = (o, f) => f(o.t).length;
    const longest = (f) => { const m = Math.max(...sc.options.map(o => len(o, f))); return sc.options.filter(o => len(o, f) === m); };
    const ok = sc.options.find(o => o.ok);
    const deL = longest(s => s), trL = longest(s => dict[s] ?? s);
    if (!deL.includes(ok) && trL.length === 1 && trL[0] === ok) err(`${sc.id}: richtige Option ist nur in der Übersetzung die längste`);
    else if (deL.includes(ok)) console.log(`  · ${sc.id}: richtige Option (${ok.key}) ist schon im Original die längste (Autorenhinweis)`);
    const prompt = dict[sc.optionsPrompt || sc.auftrag] || '';
    const keys = sc.options.map(o => o.key).join(' | ');
    if (!prompt.includes('antwort ' + keys)) err(`${sc.id}: Aufforderung „antwort ${keys}“ fehlt in der Übersetzung`);
  }

  // e) Sim-Szene mit übersetzten Sandbox-Dateien lösen (monitor.log muss original bleiben)
  const T = makeT(dict);
  const sh = new Shell({ fs: baseFS() });
  STORY.sandbox.setup(sh);
  const before = sh.fs.get(base + '/monitor.log').data;
  translateTree(sh.fs.get(base), T, (name, data) => (DATA_FILES.has(name) ? data : null));
  if (sh.fs.get(base + '/monitor.log').data !== before) err('monitor.log wurde verändert');
  for (const sc of STORY.scenes.filter(x => x.kind === 'sim' && x.answer)) {
    const warn = sh.exec('grep WARN monitor.log').out || '';
    if (warn.trim().split('\n').length !== 1 || !/port=8080/.test(warn)) err(`${sc.id}: grep WARN liefert nicht genau die 8080-Zeile`);
    if (!sc.answer.check('8080', sh).ok) err(`${sc.id}: mit übersetzten Dateien nicht lösbar`);
    if (sc.answer.check('22', sh).ok) err(`${sc.id}: falsche Antwort wird akzeptiert`);
    for (const f of ['alarm.txt', 'mail-jonas.txt']) {
      const d = sh.fs.get(base + '/' + f)?.data || '';
      if (/8080|port=/.test(d)) err(`${f}: Übersetzung verrät den Port`);
    }
  }
  const files = ['alarm.txt', 'mail-jonas.txt'].map(f => sh.fs.get(base + '/' + f).data);
  files.forEach(d => d.split('\n').filter(l => quelle.has(l)).forEach(l => err(`Dateizeile bleibt deutsch: ${short(l)}`)));
  console.log(`  ${Object.keys(dict).length} Einträge, ${quelle.size} Texte im Original, ${fehlt.length} ohne Übersetzung.`);
}
console.log(fehler ? `\n${fehler} Problem(e) gefunden.` : '\nAlles in Ordnung ✓');
process.exit(fehler ? 1 : 0);
