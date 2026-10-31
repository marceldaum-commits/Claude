// Flags werden aus dem persönlichen Lab-Token abgeleitet – identisch zu labs/kly-target/server.py:
//   KLY{ sha256("<token>:<raum>:<name>")[:16] }
// Dadurch hat jede Person eigene Flags; Abschreiben fremder Lösungen funktioniert nicht.
// Ehrliche Grenze: Wer den Quelltext liest, könnte die Formel nachrechnen. Die Flags sind ein Lern-,
// kein Sicherheitsmechanismus.

const cache = new Map();

async function sha256hex(text) {
  const d = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function flagFor(token, room, name) {
  const key = `${token}:${room}:${name}`;
  if (!cache.has(key)) cache.set(key, 'KLY{' + (await sha256hex(key)).slice(0, 16) + '}');
  return cache.get(key);
}

export async function secretFor(token, room, name, n = 10) {
  return (await sha256hex(`${token}:${room}:${name}`)).slice(0, n);
}

export function normFlag(s) {
  return String(s || '').trim().replace(/^flag=/i, '');
}
