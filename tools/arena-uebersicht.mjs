// Erzeugt docs/ARENA-LABS.md aus der Lab-Liste in arena/server.js (damit die Übersicht immer stimmt).
// Aufruf: node tools/arena-uebersicht.mjs   ·   Prüfen: node tools/arena-uebersicht.mjs --pruefen
import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync('arena/server.js', 'utf8');
const block = src.slice(src.indexOf('const LABS = {'), src.indexOf('\n};', src.indexOf('const LABS = {')));
const ein = {}; const mE = src.match(/const EINORDNUNG = \{([\s\S]*?)\n\};/)[1];
for (const m of mE.matchAll(/(\w+): \['([^']+)', \[([^\]]*)\]\]/g)) ein[m[1]] = [m[2], m[3].split(',').map(s => s.trim().replace(/'/g, '')).filter(Boolean)];
const labs = [];
for (const m of block.matchAll(/(\w+): \{ image:[\s\S]*?stufe: '([^']+)', levels: (\d+), praefix: '([^']+)'[\s\S]*?kurz: '([^']*)',/g)) {
  const id = m[1]; labs.push({ id, stufe: m[2], levels: +m[3], kurz: m[5].replace(/\\'/g, "'"), reihe: ein[id]?.[0] || '', themen: ein[id]?.[1] || [] });
}
const titel = {}; for (const m of block.matchAll(/(\w+): \{ image:[\s\S]*?title: '([^']+)'/g)) titel[m[1]] = m[2];
const prod = {}; for (const m of block.matchAll(/(\w+): \{ image:[\s\S]*?produkt: '([^']+)'/g)) prod[m[1]] = m[2];
const ORD = ['Einsteiger', 'Fortgeschritten', 'Experte', 'Extrem'];
labs.sort((a, b) => ORD.indexOf(a.stufe) - ORD.indexOf(b.stufe));
const reihen = ['Hacken', 'Ermitteln', 'Abwehren'];
let md = `# Arena – Übersicht aller Labs\n\n> Automatisch erzeugt aus \`arena/server.js\` mit \`node tools/arena-uebersicht.mjs\`. Nicht von Hand ändern.\n\n`;
md += `Insgesamt **${labs.length} Arenen** in drei Reihen. Zugang: **Arena-Zugang** (Grundstufe) oder **Profi-Arena-Zugang**.\n`;
for (const r of reihen) {
  const rl = labs.filter(l => l.reihe === r);
  md += `\n## ${({ Hacken: '🗝️ Hacken', Ermitteln: '🔍 Ermitteln', Abwehren: '🛡️ Abwehren' })[r]}\n\n`;
  md += `| Arena | Stufe | Codes | Zugang | Themen |\n|---|---|---|---|---|\n`;
  for (const l of rl) md += `| **${titel[l.id]}** | ${l.stufe} | ${l.levels} | ${prod[l.id] === 'arena' ? 'Arena' : 'Profi'} | ${l.themen.map(t => '#' + t).join(' ')} |\n`;
  for (const l of rl) md += `\n- **${titel[l.id]}** (${l.stufe}): ${l.kurz}`;
  md += '\n';
}
md += `\n## Hinweise\n- Jede Arena ist ein eigener, abgeschotteter Linux-Container (kein Netz, nach max. 2 Stunden gelöscht).\n- Codes \`KLY{…}\` entstehen aus einem geheimen Server-Salz pro Konto; Prüfung nur serverseitig.\n- Handbuch und Handouts: \`arena/public/handbuch.html\`. Im Lab: \`hilfe\` und \`begriff WORT\`.\n`;
const ziel = 'docs/ARENA-LABS.md';
if (process.argv.includes('--pruefen')) {
  const alt = (() => { try { return readFileSync(ziel, 'utf8'); } catch { return ''; } })();
  if (alt !== md) { console.error(`Veraltet: ${ziel} – bitte node tools/arena-uebersicht.mjs`); process.exit(1); }
  console.log('Arena-Übersicht aktuell ✓');
} else { writeFileSync(ziel, md); console.log(`${ziel} geschrieben (${labs.length} Arenen) ✓`); }
