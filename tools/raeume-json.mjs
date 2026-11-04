// Erzeugt eine kleine Namensliste (Räume, Geschichten, Level) für die Zentrale.
import { ROOMS } from '../js/content/rooms.js';
const out = { raeume: {}, reihenfolge: [] };
for (const r of ROOMS) { if (!r) continue; out.raeume[r.id] = { titel: r.title, level: r.level || '', art: r.type || '' }; out.reihenfolge.push(r.id); }
try { const s = await import('../js/content/story1.js'); for (const v of Object.values(s)) if (v && v.id && v.title) (out.geschichten ||= {})[v.id] = v.title; } catch { /* */ }
process.stdout.write(JSON.stringify(out));
