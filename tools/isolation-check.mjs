// Isolations-Garantie prüfen (läuft in npm run check): Arena-Labs sind vom Internet abgeschottet.
// 1) Der Arena-Server startet JEDEN Container mit NetworkMode 'none'.
// 2) Der Docker-Wächter lehnt alles außer 'none' ab.
// 3) Kein Lab-Setup führt beim Start einen echten Aufruf nach außen aus (Daten/Hinweise in Heredocs sind erlaubt).
import { readFileSync, readdirSync, existsSync } from 'node:fs';
let fehler = 0;
const melde = (m) => { console.error('Isolation:', m); fehler++; };

const srv = readFileSync('arena/server.js', 'utf8');
if (!/NetworkMode:\s*'none'/.test(srv)) melde('arena/server.js setzt NetworkMode nicht auf none');
const andere = [...srv.matchAll(/NetworkMode:\s*'([^']*)'/g)].map(m => m[1]).filter(v => v !== 'none');
if (andere.length) melde('arena/server.js hat einen anderen NetworkMode: ' + andere.join(', '));

const wae = readFileSync('arena/waechter.js', 'utf8');
if (!/NetworkMode\s*===\s*'none'/.test(wae)) melde('arena/waechter.js erzwingt NetworkMode none nicht');

// Lab-Setups: außerhalb von Heredocs (Daten) keine echten Netz-Aufrufe nach außen
const labs = readdirSync('labs').filter(d => existsSync(`labs/${d}/setup.sh`));
const EXTERN = /^\s*(curl|wget|nc|ncat|ssh|scp)\b.*\b(https?:\/\/|[a-z0-9.-]+\.(com|net|org|io|dev))/i;
const LOCAL = /127\.0\.0\.1|localhost|example\.(net|com|org)/;
for (const d of labs) {
  const zeilen = readFileSync(`labs/${d}/setup.sh`, 'utf8').split('\n');
  let heredoc = null;
  zeilen.forEach((z, i) => {
    if (heredoc) { if (z.trimEnd() === heredoc || z.trimEnd() === heredoc + ';') heredoc = null; return; }
    const m = z.match(/<<-?\s*['"]?([A-Za-z_][A-Za-z0-9_]*)['"]?/);
    if (m) { heredoc = m[1]; return; }               // Heredoc-Inhalt = Daten, überspringen
    if (z.trimStart().startsWith('#')) return;        // Kommentar
    if (EXTERN.test(z) && !LOCAL.test(z)) melde(`labs/${d}/setup.sh:${i + 1} könnte nach außen rufen: ${z.trim().slice(0, 80)}`);
  });
}
if (fehler) process.exit(1);
console.log(`Isolation: Server + Wächter erzwingen NetworkMode none; ${labs.length} Lab-Setups ohne externe Aufrufe ✓`);
