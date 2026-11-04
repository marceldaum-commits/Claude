// Schreibt die Handbuch-Daten (arena/public/handbuch-daten.js) als Textdateien in jedes Lab:
//   labs/<lab>/nachtfalter-hilfe/{begriffe.txt, hilfe.txt, begriff, hilfe}
// Aufruf: node tools/handbuch-export.mjs        Prüfen ohne Schreiben: node tools/handbuch-export.mjs --pruefen
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
require('../arena/public/handbuch-daten.js');
const { BEGRIFFE, BEFEHLE, HANDOUTS } = globalThis.NF_HANDBUCH;
const ORDNER = { keller: 'kly-keller', leitstelle: 'nf-leitstelle', webshop: 'nf-webshop', tresor: 'nf-tresor', spuren: 'nf-spuren', einbruch: 'nf-einbruch', maulwurf: 'nf-maulwurf', meister: 'nf-meister', duell: 'nf-duell', mitschnitt: 'nf-mitschnitt', werkstatt: 'nf-werkstatt', chiffren: 'nf-chiffren', web1: 'nf-web1', web2: 'nf-web2', web3: 'nf-web3', abwehr1: 'nf-abwehr1', abwehr2: 'nf-abwehr2', abwehr3: 'nf-abwehr3' };
const TITEL = { keller: 'Der Kellerserver', leitstelle: 'Die Leitstelle', webshop: 'Der Webshop', tresor: 'Der Tresor', spuren: 'Die Spurensuche', einbruch: 'Der Einbruch', maulwurf: 'Der Maulwurf', meister: 'Der Meister: Das Rechenzentrum', duell: 'Das Duell: Mann gegen Maschine', mitschnitt: 'Der Mitschnitt', werkstatt: 'Die Werkstatt', chiffren: 'Der Chiffrensaal', web1: 'Web 1: Das Kleingedruckte', web2: 'Web 2: Umwege', web3: 'Web 3: Die Kette', abwehr1: 'Angriff! Offene Türen', abwehr2: 'Angriff! Die Hintertür', abwehr3: 'Angriff! Der Profi' };
const begriffe = BEGRIFFE.map(([t, e, b]) => `== ${t}\n${e}\n${b ? `Beispiel: ${b}\n` : ''}`).join('\n');
const BEGRIFF_SH = `#!/bin/bash
# begriff WORT – erklärt einen Begriff aus dem Nachtfalter-Handbuch (ohne WORT: alle Begriffe auflisten)
D=/usr/local/share/nachtfalter/begriffe.txt
if [ -z "\${1:-}" ]; then echo "Begriffe (begriff WORT zeigt die Erklärung):"; grep '^== ' "$D" | cut -c4- | column -c "\${COLUMNS:-80}" 2>/dev/null || grep '^== ' "$D" | cut -c4-; exit; fi
awk -v RS= -v q="$*" 'BEGIN{IGNORECASE=1} tolower($0) ~ tolower(q) {print; print ""; n++} END{if(!n) print "Nichts gefunden. Alle Begriffe: begriff"}' "$D"
`;
const HILFE_SH = `#!/bin/bash
# hilfe – Werkzeuge und Vorgehen für dieses Lab
LESSCHARSET=utf-8 less -FRX /usr/local/share/nachtfalter/hilfe.txt 2>/dev/null || cat /usr/local/share/nachtfalter/hilfe.txt
`;
const pruefen = process.argv.includes('--pruefen');
let fehler = 0;
for (const [id, ordner] of Object.entries(ORDNER)) {
  const h = HANDOUTS[id]; if (!h) { console.error('Kein Handout für', id); fehler++; continue; }
  const hilfe = [`HILFE · ${TITEL[id]}`, '', `Worum geht es? ${h.ziel}`, '', 'Werkzeuge:', ...h.werkzeuge.map(w => `  ${w}`), '',
    'So gehst du vor:', ...h.vorgehen.map(v => `  • ${v}`), '', 'Begriffe dazu (begriff WORT):', `  ${h.begriffe.join(' · ')}`, '',
    'Wichtige Befehle:', ...BEFEHLE.map(([c, w]) => `  ${c.padEnd(34)} ${w}`), '', 'Handbuch mit allem: https://arena.nachtfalter.tech/handbuch.html', ''].join('\n');
  const dir = `labs/${ordner}/nachtfalter-hilfe`;
  const dateien = { 'begriffe.txt': begriffe, 'hilfe.txt': hilfe, 'begriff': BEGRIFF_SH, 'hilfe': HILFE_SH };
  for (const [n, inhalt] of Object.entries(dateien)) {
    const p = `${dir}/${n}`;
    if (pruefen) { if (!existsSync(p) || readFileSync(p, 'utf8') !== inhalt) { console.error(`Veraltet: ${p} – bitte node tools/handbuch-export.mjs`); fehler++; } }
    else { mkdirSync(dir, { recursive: true }); writeFileSync(p, inhalt); }
  }
}
if (fehler) process.exit(1);
console.log(pruefen ? 'Handbuch in allen Labs aktuell ✓' : 'Handbuch in alle Labs geschrieben ✓');
