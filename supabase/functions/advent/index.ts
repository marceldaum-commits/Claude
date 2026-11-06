// Nachtfalter – „Advent of Hacking" (Supabase Edge Function „advent").
// 24 Türchen ab 1. Dezember. Jedes Türchen hat EIN Rätsel; die Flag + der Inhalt sind PRO KONTO aus einem
// Geheimnis (HMAC) erzeugt – ein geteilter Lösungs-Code nützt niemand anderem. Prüfung serverseitig.
// Ein Türchen öffnet frühestens an seinem Tag; verpasste Türchen bleiben offen (Nachholen möglich).
// Punkte, Streak und eine Bestenliste inklusive. Wer alle 24 schafft, bekommt das Advent-Zertifikat.
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CTF_SECRET = Deno.env.get('CTF_SECRET') || SERVICE;        // gemeinsam mit „taeglich"
const ADVENT_JAHR = parseInt(Deno.env.get('ADVENT_JAHR') || '2026', 10);
const ADVENT_TEST = (Deno.env.get('ADVENT_TEST') || '') === '1'; // nur zum Testen: alle Türchen offen
const PUNKTE_PRO = 20;
const BONUS_KOMPLETT = 120;
const ORIGINS = new Set(['https://app.nachtfalter.tech', 'https://vorschau.nachtfalter.tech']);
const db = createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

const cors = (o: string | null) => ({
  'Access-Control-Allow-Origin': o && ORIGINS.has(o) ? o : 'https://app.nachtfalter.tech',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin',
});
const antwort = (o: string | null, status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(o), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

// ---- Krypto-Helfer
async function hmacHex(msg: string): Promise<string> {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(CTF_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}
const flagFor = async (uid: string, tuer: number) => 'KLY{' + (await hmacHex(`${uid}:adventflag:${ADVENT_JAHR}:${tuer}`)).slice(0, 16) + '}';
const seedFor = (uid: string, tuer: number) => hmacHex(`${uid}:adventseed:${ADVENT_JAHR}:${tuer}`);

// ---- Kodierer (arbeiten auf ASCII-Strings; die Flag ist reines ASCII)
const toHex = (s: string) => [...s].map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
const rev = (s: string) => s.split('').reverse().join('');
const xorStr = (s: string, k: number) => [...s].map(c => String.fromCharCode(c.charCodeAt(0) ^ k)).join('');
const bin8 = (s: string) => [...s].map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
const decAscii = (s: string) => [...s].map(c => c.charCodeAt(0)).join(' ');
const urlenc = (s: string) => [...s].map(c => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')).join('');
function base32(s: string): string {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = '', out = '';
  for (let i = 0; i < s.length; i++) bits += s.charCodeAt(i).toString(2).padStart(8, '0');
  for (let i = 0; i < bits.length; i += 5) { let ch = bits.slice(i, i + 5); if (ch.length < 5) ch = ch.padEnd(5, '0'); out += A[parseInt(ch, 2)]; }
  while (out.length % 8) out += '=';
  return out;
}
function caesar(s: string, k: number): string {
  return [...s].map(c => {
    const u = c.charCodeAt(0);
    if (u >= 65 && u <= 90) return String.fromCharCode((u - 65 + k + 26 * 4) % 26 + 65);
    if (u >= 97 && u <= 122) return String.fromCharCode((u - 97 + k + 26 * 4) % 26 + 97);
    return c;
  }).join('');
}
const atbash = (s: string) => [...s].map(c => {
  const u = c.charCodeAt(0);
  if (u >= 65 && u <= 90) return String.fromCharCode(90 - (u - 65));
  if (u >= 97 && u <= 122) return String.fromCharCode(122 - (u - 97));
  return c;
}).join('');
const rot47 = (s: string) => [...s].map(c => {
  const u = c.charCodeAt(0);
  return (u >= 33 && u <= 126) ? String.fromCharCode(33 + ((u - 33 + 47) % 94)) : c;
}).join('');
function vigenere(s: string, key: string): string {
  let ki = 0;
  return [...s].map(c => {
    const u = c.charCodeAt(0);
    const sh = (key.charCodeAt(ki % key.length) | 32) - 97;
    if (u >= 65 && u <= 90) { ki++; return String.fromCharCode((u - 65 + sh) % 26 + 65); }
    if (u >= 97 && u <= 122) { ki++; return String.fromCharCode((u - 97 + sh) % 26 + 97); }
    return c;
  }).join('');
}

type Puzzle = { titel: string; aufgabe: string; hinweis: string; kategorie: string };

// Baut das Rätsel für ein Türchen. Schwierigkeit steigt über den Monat.
function baue(tuer: number, flag: string, seed: string): Puzzle {
  const b = (n: number) => parseInt(seed.slice(n, n + 2), 16);
  switch (tuer) {
    case 1: return { kategorie: 'base64', titel: '1 · Base64', aufgabe: btoa(flag), hinweis: 'Einmal Base64 dekodieren (z. B. `base64 -d`).' };
    case 2: return { kategorie: 'hex', titel: '2 · Hex', aufgabe: toHex(flag), hinweis: 'Hex zurück in Text (`echo … | xxd -r -p`).' };
    case 3: return { kategorie: 'rot13', titel: '3 · ROT13', aufgabe: caesar(flag, 13), hinweis: 'Buchstaben um 13 Stellen zurückdrehen (ROT13).' };
    case 4: return { kategorie: 'base32', titel: '4 · Base32', aufgabe: base32(flag), hinweis: 'Base32 dekodieren (Alphabet A–Z und 2–7, nicht Base64).' };
    case 5: return { kategorie: 'reverse', titel: '5 · Rückwärts', aufgabe: rev(flag), hinweis: 'Die Zeichenkette ist nur umgedreht – rückwärts lesen.' };
    case 6: return { kategorie: 'binaer', titel: '6 · Binär', aufgabe: bin8(flag), hinweis: 'Je 8 Bit sind ein ASCII-Zeichen.' };
    case 7: return { kategorie: 'dezimal', titel: '7 · Dezimal-ASCII', aufgabe: decAscii(flag), hinweis: 'Jede Zahl ist ein ASCII-Code (z. B. 75 = K).' };
    case 8: return { kategorie: 'base64x2', titel: '8 · Doppeltes Base64', aufgabe: btoa(btoa(flag)), hinweis: 'Zweimal hintereinander Base64 dekodieren.' };
    case 9: return { kategorie: 'rev64', titel: '9 · Base64, rückwärts', aufgabe: rev(btoa(flag)), hinweis: 'Zuerst die Zeichen umdrehen, dann Base64 dekodieren.' };
    case 10: return { kategorie: 'url', titel: '10 · URL-Encoding', aufgabe: urlenc(flag), hinweis: 'Prozent-Kodierung (%XX) auflösen (URL-Decode).' };
    case 11: { const k = (b(0) % 254) + 1; return { kategorie: 'xorhex', titel: '11 · XOR + Hex', aufgabe: toHex(xorStr(flag, k)), hinweis: `Erst Hex → Bytes, dann jedes Byte XOR 0x${k.toString(16).padStart(2, '0')}.` }; }
    case 12: return { kategorie: 'rot47', titel: '12 · ROT47', aufgabe: rot47(flag), hinweis: 'ROT47 ist sein eigener Gegenspieler – einfach nochmal ROT47 anwenden.' };
    case 13: { const k = (b(2) % 25) + 1; return { kategorie: 'caesar', titel: '13 · Caesar', aufgabe: caesar(flag, k), hinweis: `Caesar-Verschiebung: Buchstaben um ${k} Stellen zurückdrehen.` }; }
    case 14: return { kategorie: 'atbash', titel: '14 · Atbash', aufgabe: atbash(flag), hinweis: 'Atbash: A↔Z, B↔Y … spiegeln (nochmal Atbash entschlüsselt es).' };
    case 15: return { kategorie: 'hex64', titel: '15 · Hex über Base64', aufgabe: toHex(btoa(flag)), hinweis: 'Erst Hex → Text, dann das Ergebnis Base64 dekodieren.' };
    case 16: return { kategorie: 'base64x3', titel: '16 · Base64 ×3', aufgabe: btoa(btoa(btoa(flag))), hinweis: 'Dreimal hintereinander Base64 dekodieren.' };
    case 17: return { kategorie: 'rev32', titel: '17 · Base32, rückwärts', aufgabe: rev(base32(flag)), hinweis: 'Zuerst umdrehen, dann Base32 dekodieren.' };
    case 18: return { kategorie: 'rot13_64', titel: '18 · Base64 + ROT13', aufgabe: btoa(caesar(flag, 13)), hinweis: 'Erst Base64 dekodieren, dann das Ergebnis mit ROT13 zurückdrehen.' };
    case 19: { const keys = ['KATZE', 'NACHT', 'FALTER', 'KODE']; const key = keys[b(4) % keys.length]; return { kategorie: 'vigenere', titel: '19 · Vigenère', aufgabe: vigenere(flag, key), hinweis: `Vigenère mit Schlüssel „${key}" entschlüsseln (nur Buchstaben werden verschoben).` }; }
    case 20: { const k = (b(6) % 254) + 1; return { kategorie: 'xor64', titel: '20 · XOR + Base64', aufgabe: btoa(xorStr(flag, k)), hinweis: `Erst Base64 dekodieren, dann jedes Byte XOR 0x${k.toString(16).padStart(2, '0')}.` }; }
    case 21: return { kategorie: 'hexx2', titel: '21 · Hex ×2', aufgabe: toHex(toHex(flag)), hinweis: 'Zweimal hintereinander von Hex in Text wandeln.' };
    case 22: return { kategorie: 'url64', titel: '22 · Base64 + URL', aufgabe: urlenc(btoa(flag)), hinweis: 'Erst URL-Decode (%XX), dann Base64 dekodieren.' };
    case 23: { const keys = ['SPIEGEL', 'KELLER', 'FUNKTURM']; const key = keys[b(8) % keys.length]; return { kategorie: 'vig64', titel: '23 · Vigenère + Base64', aufgabe: btoa(vigenere(flag, key)), hinweis: `Erst Base64 dekodieren, dann Vigenère mit Schlüssel „${key}".` }; }
    case 24: return { kategorie: 'finale', titel: '24 · Finale: 3 Schichten 🎄', aufgabe: toHex(btoa(caesar(flag, 13))), hinweis: 'Drei Schichten: erst Hex → Text, dann Base64, dann ROT13. Frohe Weihnachten!' };
    default: return { kategorie: 'base64', titel: `${tuer} · Base64`, aufgabe: btoa(flag), hinweis: 'Einmal Base64 dekodieren.' };
  }
}

// ---- Datums-Logik (UTC)
const heuteStr = () => new Date().toISOString().slice(0, 10);
// Ein Türchen ist offen, wenn das heutige UTC-Datum >= 1. … 24. Dezember des Advent-Jahres ist.
function tuerOffen(tuer: number): boolean {
  if (ADVENT_TEST) return true;
  const jetzt = new Date();
  const start = new Date(Date.UTC(ADVENT_JAHR, 11, tuer, 0, 0, 0)); // Monat 11 = Dezember
  return jetzt.getTime() >= start.getTime();
}

function streakAus(tueren: number[]): number {
  // „Serie" = längste lückenlose Kette gelöster Türchen vom 1. Türchen aufwärts bis zum höchsten offenen Türchen.
  const set = new Set(tueren);
  let s = 0;
  for (let d = 1; d <= 24; d++) { if (set.has(d)) s++; else break; }
  return s;
}

async function standFor(uid: string) {
  const { data } = await db.from('advent_fortschritt').select('tuer').eq('user_id', uid);
  const tueren = (data || []).map((r: any) => r.tuer);
  const anzahl = tueren.length;
  const komplett = anzahl >= 24;
  return {
    geloest: tueren.sort((a: number, b: number) => a - b),
    anzahl,
    komplett,
    streak: streakAus(tueren),
    punkte: anzahl * PUNKTE_PRO + (komplett ? BONUS_KOMPLETT : 0),
  };
}

async function bestenliste() {
  const { data } = await db.from('advent_fortschritt').select('user_id');
  const zahl: Record<string, number> = {};
  for (const r of (data || []) as any[]) zahl[r.user_id] = (zahl[r.user_id] || 0) + 1;
  const top = Object.entries(zahl).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const ids = top.map(([id]) => id);
  const namen: Record<string, string> = {};
  if (ids.length) {
    const { data: ps } = await db.from('profiles').select('id, display_name').in('id', ids);
    for (const p of (ps || []) as any[]) namen[p.id] = p.display_name || '';
  }
  return top.map(([id, n], i) => ({ platz: i + 1, name: namen[id] || 'Anonym', punkte: (n as number) * PUNKTE_PRO }));
}

Deno.serve(async (req) => {
  const o = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(o) });
  if (req.method !== 'POST') return antwort(o, 405, { fehler: 'Nur POST' });
  const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!jwt) return antwort(o, 401, { fehler: 'Bitte anmelden.' });
  const { data: u, error } = await db.auth.getUser(jwt);
  if (error || !u?.user) return antwort(o, 401, { fehler: 'Deine Anmeldung ist abgelaufen – bitte neu anmelden.' });
  const uid = u.user.id;
  let b: any; try { b = await req.json(); } catch { return antwort(o, 400, { fehler: 'Ungültige Anfrage' }); }
  const aktion = String(b?.aktion || '');

  if (aktion === 'info') {
    const st = await standFor(uid);
    const geloest = new Set(st.geloest);
    const tueren = [];
    for (let t = 1; t <= 24; t++) {
      const offen = tuerOffen(t);
      const done = geloest.has(t);
      const eintrag: any = { nr: t, offen, geloest: done };
      // Inhalt nur für offene, noch nicht gelöste Türchen senden.
      if (offen && !done) {
        const flag = await flagFor(uid, t);
        const seed = await seedFor(uid, t);
        const p = baue(t, flag, seed);
        eintrag.titel = p.titel; eintrag.kategorie = p.kategorie; eintrag.aufgabe = p.aufgabe; eintrag.hinweis = p.hinweis;
      }
      tueren.push(eintrag);
    }
    return antwort(o, 200, {
      jahr: ADVENT_JAHR, heute: heuteStr(), tueren,
      anzahl: st.anzahl, komplett: st.komplett, punkte: st.punkte, streak: st.streak,
      bestenliste: await bestenliste(),
    });
  }

  if (aktion === 'loesen') {
    const nr = parseInt(b?.nr, 10);
    if (!(nr >= 1 && nr <= 24)) return antwort(o, 400, { fehler: 'Ungültiges Türchen.' });
    if (!tuerOffen(nr)) return antwort(o, 403, { fehler: 'Dieses Türchen ist noch nicht offen.' });
    const versuch = String(b?.versuch || '').trim().toLowerCase();
    const flag = (await flagFor(uid, nr)).toLowerCase();
    if (versuch !== flag) return antwort(o, 200, { ok: false });
    await db.from('advent_fortschritt').upsert({ user_id: uid, tuer: nr }, { onConflict: 'user_id,tuer', ignoreDuplicates: true });
    const st = await standFor(uid);
    return antwort(o, 200, { ok: true, nr, punkte: st.punkte, streak: st.streak, anzahl: st.anzahl, komplett: st.komplett });
  }

  return antwort(o, 400, { fehler: 'Unbekannte Aktion.' });
});
