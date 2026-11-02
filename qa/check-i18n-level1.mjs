// QA „Sprache & Qualität“: Prüft i18n/<sprache>/level1.json.
// Aufruf: node qa/check-i18n-level1.mjs
// 1. Jeder Schlüssel kommt in Level 1 vor (qa/extract-level1.mjs sammelt die Texte).
// 2. Befehle in Tipps/Hinweisen (per codeify erkannt) stehen unverändert in der Übersetzung.
// 3. Jede Sandbox-Übung (und die Praxisaufgaben der Prüfung) wird mit ÜBERSETZTEN Dateien aufgebaut
//    und mit der Musterlösung gelöst – check() muss weiter „ok“ melden.
import { readFileSync } from 'node:fs';
import { Shell, baseFS, HOME } from '../js/shell.js';
import { LEVEL1 } from '../js/content/level1.js';
import { LOESUNGEN } from '../js/content/level1-tipps.js';
import { makeT, translateTree, codeify } from '../js/i18n.js';
import { level1Strings } from './extract-level1.mjs';

let fehler = 0;
const err = (m) => { fehler++; console.log('  ✗ ' + m); };
const quelle = level1Strings();
const TEMPLATES = new Set(['Schau im Spickzettel „{titel}“ nach – dort stehen die passenden Werkzeuge: {begriffe}.', 'Schau im Spickzettel „{titel}“ nach – dort stehen die passenden Werkzeuge.']);
const un = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const tippish = (w) => /\.(tipp|hinweis|check|real|knobel|auftrag)$/.test(w) || /^exam/.test(w);

for (const lang of ['en', 'uk']) {
  console.log(`\n== ${lang}: i18n/${lang}/level1.json`);
  const dict = JSON.parse(readFileSync(new URL(`../i18n/${lang}/level1.json`, import.meta.url), 'utf8'));
  for (const [k, v] of Object.entries(dict)) {
    if (!quelle.has(k) && !TEMPLATES.has(k)) err(`Schlüssel nicht im Original: ${JSON.stringify(k).slice(0, 120)}`);
    if (typeof v !== 'string' || !v.trim()) err(`leer: ${JSON.stringify(k).slice(0, 80)}`);
    if (lang === 'uk' && /[ыэъё]/i.test(v)) err(`russische Buchstaben: ${v.slice(0, 80)}`);
    if (lang === 'uk' && /[a-zäöüß]{5,} [a-zäöüß]{5,} [a-zäöüß]{5,}/i.test(v.replace(/`[^`]*`|„[^“]*“|"[^"]*"/g, '')) && v !== k) console.log(`  · viel Latein im UK-Text: ${v.slice(0, 100)}`);
    if (!tippish(quelle.get(k) || '')) continue;
    for (const m of codeify(k).matchAll(/<code translate="no">(.*?)<\/code>/g)) {
      const c = un(m[1]);
      if (/<\S/.test(c) || /[A-ZÄÖÜ]{3,}/.test(c.replace(/KLY|ERROR|INFO|WARN|HEAD|TERM|KILL|HUP|README|DNS|HTTP|URL|PID|PPID|IP/g, ''))) continue;
      if (!v.includes(c)) err(`Befehl „${c}“ fehlt in: ${JSON.stringify(v).slice(0, 160)}`);
    }
  }
  const fehlt = [...quelle.keys()].filter(k => !(k in dict));
  console.log(`  ${Object.keys(dict).length} Einträge, ${fehlt.length} Texte ohne Übersetzung (bleiben deutsch, z. B. Daten-/Logzeilen).`);

  // Sandbox-Übungen mit übersetzten Dateien lösen
  const T = makeT(dict);
  let ok = 0, n = 0;
  for (const e of LEVEL1.exercises.filter(x => x.sandbox)) {
    n++;
    const s = new Shell({ fs: baseFS() }); e.sandbox.setup(s);
    translateTree(s.fs.get(HOME + '/lab') || { kids: {} }, T);
    for (const c of LOESUNGEN[e.id] || []) s.exec(c);
    const r = e.sandbox.check(s);
    if (r.ok) ok++; else err(`${e.id}: mit übersetzten Dateien nicht lösbar – ${r.msg}`);
  }
  for (const it of LEVEL1.exam.items.filter(x => x.type === 'sandbox')) {
    const s = new Shell({ fs: baseFS() }); it.setup(s);
    translateTree(s.fs.get(HOME + '/pruefung') || { kids: {} }, T);
    if (it.id === 'x23') { s.exec('chmod 600 ~/pruefung/geheim.txt'); s.exec('chmod 700 ~/pruefung/akten'); }
    if (it.id === 'x24') s.exec('grep ERROR ~/pruefung/app.log | wc -l > ~/pruefung/fehler.txt');
    if (it.id === 'x25') s.exec('kill 4107');
    n++; if (it.check(s)) ok++; else err(`Prüfung ${it.id}: mit übersetzten Dateien nicht lösbar`);
  }
  console.log(`  ${ok}/${n} Sandbox-Aufgaben mit übersetzten Dateien gelöst.`);
}
console.log(fehler ? `\n${fehler} Problem(e).` : '\nAlles in Ordnung ✓');
process.exit(fehler ? 1 : 0);
