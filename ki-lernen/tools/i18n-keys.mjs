// Sammelt alle Texte, die übersetzt werden müssen, und schreibt public/i18n/de.json (Schlüssel = Wert = Deutsch).
// Aufruf: node tools/i18n-keys.mjs        (--check: nur prüfen, ob de.json aktuell ist)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const keys = new Set();

// 1) Inhalte: alle Texte in content.js (außer IDs und Emojis-Icons)
const content = await import(path.join(root, 'public/content.js'));
const SKIP = new Set(['id', 'icon']);
(function walk(v, key) {
  if (typeof v === 'string') { if (!SKIP.has(key) && /\p{L}/u.test(v)) keys.add(v); }
  else if (Array.isArray(v)) v.forEach((x) => walk(x, key));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, k);
})(content);

// 2) Oberfläche: t('…') in app.js, 3) Servermeldungen: msg('…') in server.js
const lit = (file, fn) => {
  const src = fs.readFileSync(path.join(root, file), 'utf8');
  for (const m of src.matchAll(new RegExp(`\\b${fn}\\('((?:[^'\\\\]|\\\\.)*)'`, 'g'))) keys.add(m[1].replace(/\\'/g, "'"));
};
lit('public/app.js', 't');
lit('server.js', 'msg');

const sorted = Object.fromEntries([...keys].sort((a, b) => a.localeCompare(b, 'de')).map((k) => [k, k]));
const out = JSON.stringify(sorted, null, 2) + '\n';
const file = path.join(root, 'public/i18n/de.json');
if (process.argv.includes('--check')) {
  const old = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (old !== out) { console.error('public/i18n/de.json ist veraltet: node tools/i18n-keys.mjs ausführen'); process.exit(1); }
  console.log(`de.json aktuell (${keys.size} Texte)`);
} else {
  fs.writeFileSync(file, out);
  console.log(`${keys.size} Texte → public/i18n/de.json`);
}
