// QA „Sprache & Qualität“: Prüft ki-lernen/public/i18n/{en,uk}.json gegen die Vorlage de.json.
// Aufruf: node qa/check-i18n-ki.mjs [pfad/zu/de.json]
// (de.json liegt auf dem Branch der KI-Sitzung; Standard: ki-lernen/public/i18n/de.json)
import { readFileSync } from 'node:fs';
const dir = new URL('../ki-lernen/public/i18n/', import.meta.url);
const de = JSON.parse(readFileSync(process.argv[2] || new URL('de.json', dir), 'utf8'));
let fehler = 0;
const err = (m) => { fehler++; console.log('  ✗ ' + m); };
const ph = (s) => (s.match(/\{\w+\}/g) || []).sort().join(' ');
const lead = (s) => (s.match(/^\p{Extended_Pictographic}️?/u) || [''])[0];
// Zahlen/Namen, die in den Detektiv-Fällen gleich bleiben müssen (damit falsche Sätze falsch bleiben)
const KEEP = [/418/, /408/, /1972/, /Apollo 8|Аполлоном-8|Аполлон-8/, /1969/, /168/, /12 × 12/, /17 × 24/];
for (const lang of ['en', 'uk']) {
  console.log(`== ${lang}.json`);
  const t = JSON.parse(readFileSync(new URL(`${lang}.json`, dir), 'utf8'));
  for (const k of Object.keys(de)) if (!(k in t)) err(`fehlt: ${JSON.stringify(k)}`);
  for (const [k, v] of Object.entries(t)) {
    if (!(k in de)) { err(`veralteter Schlüssel: ${JSON.stringify(k)}`); continue; }
    if (!v.trim()) err(`leer: ${JSON.stringify(k)}`);
    if (ph(k) !== ph(v)) err(`Platzhalter anders: ${JSON.stringify(k)} → ${JSON.stringify(v)}`);
    if (lead(k) !== lead(v)) err(`Emoji am Anfang fehlt: ${JSON.stringify(v)}`);
    for (const re of KEEP) if (re.test(k) && !/Apollo 8/.test(re.source) && !re.test(v)) err(`Zahl ${re} fehlt: ${JSON.stringify(v)}`);
    if (/Apollo 8/.test(k) && !/Apollo 8|Аполлон\S*-8/.test(v)) err(`Apollo 8 fehlt: ${JSON.stringify(v)}`);
    if (lang === 'uk' && /[ыэъё]/i.test(v)) err(`russische Buchstaben: ${JSON.stringify(v)}`);
    if (lang === 'uk' && /[a-zäöüß]{4,}/i.test(v) && !/Claude|Anthropic|XP|JSON|POST|API|Donaudampf|\{/.test(v)) err(`lateinische Wörter? ${JSON.stringify(v)}`);
  }
  console.log(`  ${Object.keys(t).length}/${Object.keys(de).length} Texte`);
}
console.log(fehler ? `${fehler} Problem(e).` : 'Alles in Ordnung ✓');
process.exit(fehler ? 1 : 0);
