// Prüft den Lernpfad gegen die echten Arenen: jede erforderte/verlinkte Arena muss es wirklich geben.
// Aufruf (auch in npm run check): node tools/lernpfad-check.mjs
import { readFileSync } from 'node:fs';
import { LERNPFAD } from '../js/content/lernpfad.js';
const src = readFileSync('arena/server.js', 'utf8');
const labs = new Set([...src.matchAll(/^\s*(\w+): \{ image: env\(/gm)].map(m => m[1]));
let fehler = 0;
const melde = (m) => { console.error('Lernpfad:', m); fehler++; };
const ids = new Set();
for (const st of LERNPFAD) {
  if (ids.has(st.id)) melde(`doppelte id ${st.id}`); ids.add(st.id);
  if (!st.titel || !st.einleitung) melde(`${st.id}: Titel/Einleitung fehlt`);
  const u = st.uebung || {};
  for (const ref of [u.erfordert, u.auchArena].filter(Boolean)) {
    if (ref.arena && !labs.has(ref.arena)) melde(`${st.id}: Arena "${ref.arena}" gibt es nicht (${[...labs].join(', ')})`);
  }
  if (u.href && u.href.startsWith('arena:') && !labs.has(u.href.slice(6))) melde(`${st.id}: Link-Arena "${u.href.slice(6)}" gibt es nicht`);
}
if (fehler) process.exit(1);
console.log(`Lernpfad: ${LERNPFAD.length} Stufen, alle Arena-Verweise gültig ✓`);
