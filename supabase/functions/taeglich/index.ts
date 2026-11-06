// Nachtfalter – „CTF des Tages“ (Supabase Edge Function „taeglich“).
// Jeden Tag 2 Rätsel pro Konto: Kategorie ist für alle gleich (fairer Vergleich), die Flag + der Inhalt
// sind PRO KONTO aus einem Geheimnis (HMAC) erzeugt – ein geteilter Lösungs-Code nützt niemand anderem.
// Lösung wird serverseitig geprüft. Streak (Tage in Folge), Punkte und eine Bestenliste inklusive.
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CTF_SECRET = Deno.env.get('CTF_SECRET') || SERVICE;   // für die deterministischen Flags/Rätsel
const PUNKTE_PRO = 10;
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
const flagFor = async (uid: string, tag: string, nr: number) => 'KLY{' + (await hmacHex(`${uid}:ctfflag:${tag}:${nr}`)).slice(0, 16) + '}';

// ---- Kodierer (arbeiten auf ASCII-Strings; die Flag ist reines ASCII)
const toHex = (s: string) => [...s].map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
const xorStr = (s: string, k: number) => [...s].map(c => String.fromCharCode(c.charCodeAt(0) ^ k)).join('');
const rev = (s: string) => s.split('').reverse().join('');
function base32(s: string): string {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = '', out = '';
  for (let i = 0; i < s.length; i++) bits += s.charCodeAt(i).toString(2).padStart(8, '0');
  for (let i = 0; i < bits.length; i += 5) { let ch = bits.slice(i, i + 5); if (ch.length < 5) ch = ch.padEnd(5, '0'); out += A[parseInt(ch, 2)]; }
  while (out.length % 8) out += '=';
  return out;
}

type Puzzle = { kategorie: string; titel: string; aufgabe: string; hinweis: string };
function baue(kat: string, flag: string, instSeed: string): Puzzle {
  switch (kat) {
    case 'base64': return { kategorie: kat, titel: 'Base64', aufgabe: btoa(flag), hinweis: 'Einmal Base64 dekodieren (z. B. `base64 -d` oder eine Online-Werkzeugkiste).' };
    case 'hex': return { kategorie: kat, titel: 'Hex', aufgabe: toHex(flag), hinweis: 'Hex zurück in Text (z. B. `echo … | xxd -r -p`).' };
    case 'base64x2': return { kategorie: kat, titel: 'Doppeltes Base64', aufgabe: btoa(btoa(flag)), hinweis: 'Zweimal hintereinander Base64 dekodieren.' };
    case 'xorhex': { const k = (parseInt(instSeed.slice(0, 2), 16) % 254) + 1; return { kategorie: kat, titel: 'XOR + Hex', aufgabe: toHex(xorStr(flag, k)), hinweis: `Erst Hex → Bytes, dann jedes Byte XOR 0x${k.toString(16).padStart(2, '0')}.` }; }
    case 'rev64': return { kategorie: kat, titel: 'Base64, rückwärts', aufgabe: rev(btoa(flag)), hinweis: 'Zuerst die Zeichen umdrehen, dann Base64 dekodieren.' };
    case 'base32': return { kategorie: kat, titel: 'Base32', aufgabe: base32(flag), hinweis: 'Base32 dekodieren (nicht Base64 – Alphabet A–Z, 2–7).' };
    default: return { kategorie: 'base64', titel: 'Base64', aufgabe: btoa(flag), hinweis: 'Einmal Base64 dekodieren.' };
  }
}
const EINFACH = ['base64', 'hex'];
const MITTEL = ['base64x2', 'xorhex', 'rev64', 'base32'];
async function kategorieFuer(tag: string, nr: number): Promise<string> {
  const s = await hmacHex(`ctfkat:${tag}:${nr}`);
  return nr === 0 ? EINFACH[parseInt(s.slice(0, 4), 16) % EINFACH.length] : MITTEL[parseInt(s.slice(0, 4), 16) % MITTEL.length];
}

const heute = () => new Date().toISOString().slice(0, 10);   // UTC-Datum
function streakAus(tage: string[]): number {
  const set = new Set(tage);
  let streak = 0;
  const d = new Date(heute() + 'T00:00:00Z');
  // Heute zählt, wenn gelöst; sonst darf gestern der Anker sein (Streak ist bis Tagesende „am Leben“).
  if (!set.has(d.toISOString().slice(0, 10))) d.setUTCDate(d.getUTCDate() - 1);
  while (set.has(d.toISOString().slice(0, 10))) { streak++; d.setUTCDate(d.getUTCDate() - 1); }
  return streak;
}
async function standFor(uid: string) {
  const { data } = await db.from('ctf_taeglich').select('tag, nr').eq('user_id', uid);
  const rows = data || [];
  const tage = [...new Set(rows.map((r: any) => r.tag))];
  const h = heute();
  return {
    punkte: rows.length * PUNKTE_PRO,
    streak: streakAus(tage),
    geloestHeute: rows.filter((r: any) => r.tag === h).map((r: any) => r.nr),
  };
}
async function bestenliste() {
  const { data } = await db.from('ctf_taeglich').select('user_id');
  const zahl: Record<string, number> = {};
  for (const r of (data || []) as any[]) zahl[r.user_id] = (zahl[r.user_id] || 0) + 1;
  const top = Object.entries(zahl).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const ids = top.map(([id]) => id);
  const namen: Record<string, string> = {};
  if (ids.length) {
    const { data: ps } = await db.from('profiles').select('id, display_name').in('id', ids);
    for (const p of (ps || []) as any[]) namen[p.id] = p.display_name || '';
  }
  return top.map(([id, n], i) => ({ platz: i + 1, name: namen[id] || 'Anonym', punkte: n * PUNKTE_PRO }));
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
  const tag = heute();

  if (aktion === 'info') {
    const puzzles = [];
    for (const nr of [0, 1]) {
      const kat = await kategorieFuer(tag, nr);
      const flag = await flagFor(uid, tag, nr);
      const inst = await hmacHex(`${uid}:ctfinst:${tag}:${nr}`);
      const p = baue(kat, flag, inst);
      puzzles.push({ nr, titel: p.titel, kategorie: p.kategorie, aufgabe: p.aufgabe, hinweis: p.hinweis });
    }
    const st = await standFor(uid);
    return antwort(o, 200, { tag, puzzles, geloest: st.geloestHeute, punkte: st.punkte, streak: st.streak, bestenliste: await bestenliste() });
  }

  if (aktion === 'loesen') {
    const nr = parseInt(b?.nr, 10);
    if (nr !== 0 && nr !== 1) return antwort(o, 400, { fehler: 'Ungültige Aufgabe.' });
    const versuch = String(b?.versuch || '').trim().toLowerCase();
    const flag = (await flagFor(uid, tag, nr)).toLowerCase();
    if (versuch !== flag) return antwort(o, 200, { ok: false });
    await db.from('ctf_taeglich').upsert({ user_id: uid, tag, nr }, { onConflict: 'user_id,tag,nr', ignoreDuplicates: true });
    const st = await standFor(uid);
    return antwort(o, 200, { ok: true, nr, punkte: st.punkte, streak: st.streak, geloest: st.geloestHeute });
  }

  return antwort(o, 400, { fehler: 'Unbekannte Aktion.' });
});
