// Auftrag-Engine – Generator: würfelt aus (Stufe + Seed) eine konkrete Kiste aus dem Modul-Baukasten.
// Deterministisch über den Seed (gleicher Seed → gleiche Kiste), damit der Server die Flags reproduzieren
// und serverseitig prüfen kann. Delivery-agnostisch: das Ergebnis (welt) speist Sandbox UND Docker.
// Flags bekommen hier NUR ihren Platz/Hinweis – den geheimen WERT pflanzt die Edge pro Konto (HMAC) ein.

import { MODUL, STUFEN, AUFTRAG_LISTEN } from './auftrag-module.js';

// kleiner, deterministischer PRNG (wie js/content/leiter.js), lokal, ohne Import-Kette
function rng(seed) { let x = (seed >>> 0) || 1; return () => (x = (x * 1664525 + 1013904223) >>> 0) / 2 ** 32; }
const pick = (R, a) => a[Math.floor(R() * a.length)];
const resolve = (str, p) => String(str).replace(/\{(\w+)\}/g, (_, k) => (k in p ? p[k] : `{${k}}`));

/**
 * Erzeugt eine Engagement-Kiste.
 * @param {number} stufe 1..n
 * @param {number} seed  ganzzahliger Seed (Server: aus Konto+Stufe+Versuch)
 * @returns {{stufe,titel,beschreibung,firma,host,dienste,dateien,creds,sudo,apps,flags,scope}}
 */
export function generiere(stufe, seed) {
  const S = STUFEN.find(s => s.stufe === stufe) || STUFEN[0];
  const R = rng(seed);
  const firma = pick(R, AUFTRAG_LISTEN.FIRMEN);
  const host = 'srv-' + String(10 + Math.floor(R() * 89));
  const module = S.rezept.map(id => MODUL[id]).filter(Boolean);

  const dienste = [], dateien = [], creds = [], sudo = [], apps = [], flags = [];
  const portSeen = new Set();
  for (const m of module) {
    const p = m.params ? m.params(R) : {};
    const w = m.welt ? m.welt(p) : {};
    for (const d of (w.dienste || [])) { if (!portSeen.has(d.port)) { portSeen.add(d.port); dienste.push(d); } }
    for (const f of (w.dateien || [])) dateien.push({ ...f, pfad: resolve(f.pfad, p) });
    for (const c of (w.creds || [])) creds.push(c);
    for (const s of (w.sudo || [])) sudo.push(s);
    if (w.app) apps.push({ ...w.app, pfad: resolve(w.app.pfad, p) });
    if (m.flag) flags.push({ id: m.id, titel: m.titel, wo: m.flag.wo, pfad: resolve(m.flag.pfad, p), hinweis: resolve(m.flag.hinweis || '', p) });
  }

  const scope = `In-Scope ist ausschließlich der Host ${host} (${firma}). Erlaubt: Testen, Ausnutzen, Zugriff nachweisen. Verboten: Datenzerstörung, DoS, alles außerhalb dieses Hosts.`;
  return { stufe: S.stufe, titel: S.titel, beschreibung: S.beschreibung, firma, host, dienste, dateien, creds, sudo, apps, flags, scope };
}

// Reproduzierbarer Seed aus Konto + Stufe + Versuch (die Edge nutzt zusätzlich HMAC für den Flag-Wert).
export function seedVon(str) { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
