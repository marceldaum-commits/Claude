// Nachtfalter – „Wochen-Mission" (Supabase Edge Function „mission").
// Eine größere Aufgabe pro Kalenderwoche (ISO-Woche): ein 3-Schichten-Rätsel mit kleinem Szenario.
// Flag + Inhalt sind PRO KONTO aus einem Geheimnis (HMAC) erzeugt; die Schicht-Art ist pro Woche für alle gleich
// (fairer Vergleich). Prüfung serverseitig. Bonus-XP + Bestenliste. (Mechanik wie „taeglich"/„advent".)
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CTF_SECRET = Deno.env.get('CTF_SECRET') || SERVICE;
const PUNKTE_PRO = 50;
const ORIGINS = new Set(['https://app.nachtfalter.tech', 'https://vorschau.nachtfalter.tech']);
const db = createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

const cors = (o: string | null) => ({
  'Access-Control-Allow-Origin': o && ORIGINS.has(o) ? o : 'https://app.nachtfalter.tech',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin',
});
const antwort = (o: string | null, status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(o), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

async function hmacHex(msg: string): Promise<string> {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(CTF_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}
const flagFor = async (uid: string, woche: string) => 'KLY{' + (await hmacHex(`${uid}:missionflag:${woche}`)).slice(0, 16) + '}';

// ---- Kodierer
const toHex = (s: string) => [...s].map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
const rev = (s: string) => s.split('').reverse().join('');
const xorStr = (s: string, k: number) => [...s].map(c => String.fromCharCode(c.charCodeAt(0) ^ k)).join('');
function caesar(s: string, k: number): string {
  return [...s].map(c => { const u = c.charCodeAt(0);
    if (u >= 65 && u <= 90) return String.fromCharCode((u - 65 + k + 26 * 4) % 26 + 65);
    if (u >= 97 && u <= 122) return String.fromCharCode((u - 97 + k + 26 * 4) % 26 + 97);
    return c; }).join('');
}
const atbash = (s: string) => [...s].map(c => { const u = c.charCodeAt(0);
  if (u >= 65 && u <= 90) return String.fromCharCode(90 - (u - 65));
  if (u >= 97 && u <= 122) return String.fromCharCode(122 - (u - 97));
  return c; }).join('');
function vigenere(s: string, key: string): string {
  let ki = 0;
  return [...s].map(c => { const u = c.charCodeAt(0); const sh = (key.charCodeAt(ki % key.length) | 32) - 97;
    if (u >= 65 && u <= 90) { ki++; return String.fromCharCode((u - 65 + sh) % 26 + 65); }
    if (u >= 97 && u <= 122) { ki++; return String.fromCharCode((u - 97 + sh) % 26 + 97); }
    return c; }).join('');
}

// ---- Rezepte: Schritte werden in Reihenfolge angewandt; die Hinweise beschreiben das ENTschlüsseln (umgekehrt).
type Schritt = 'b64' | 'hex' | 'rev' | 'atbash' | { rot: number } | { caesar: number } | { vig: string } | { xor: number };
type Rezept = { titel: string; szenario: string; steps: Schritt[]; hinweise: string[] };

function rezepte(kk: number, key: string, cs: number): Rezept[] {
  const kkHex = '0x' + (kk & 0xff).toString(16).padStart(2, '0');
  return [
    { titel: 'Abgefangene Funknachricht', szenario: 'Dein Team hat einen Funkspruch abgefangen. Entschlüssle ihn bis zur Flag.',
      steps: [{ rot: 13 }, 'b64', 'hex'], hinweise: ['Hex → Text', 'Base64 dekodieren', 'ROT13 zurückdrehen'] },
    { titel: 'Verschlüsselte Datei', szenario: 'Auf einem Server liegt eine doppelt kodierte Datei. Pack sie aus.',
      steps: ['b64', 'rev', 'b64'], hinweise: ['Base64 dekodieren', 'Zeichen umdrehen', 'Base64 dekodieren'] },
    { titel: 'Alte Chiffre', szenario: 'Ein alter Agent nutzte eine klassische Verschiebe-Chiffre, dann modern verpackt.',
      steps: [{ caesar: cs }, 'b64', 'hex'], hinweise: ['Hex → Text', 'Base64 dekodieren', `Caesar um ${cs} Stellen zurückdrehen`] },
    { titel: 'Doppelt gesichert', szenario: 'Die Nachricht wurde mit einem Schlüsselwort und zweifach Base64 gesichert.',
      steps: [{ vig: key }, 'b64', 'b64'], hinweise: ['Base64 dekodieren', 'Base64 dekodieren', `Vigenère mit Schlüssel „${key}" (nur Buchstaben)`] },
    { titel: 'Spiegelkabinett', szenario: 'Gespiegelt, umgedreht, verpackt – finde den Weg zurück.',
      steps: ['atbash', 'rev', 'b64'], hinweise: ['Base64 dekodieren', 'Zeichen umdrehen', 'Atbash (A↔Z) anwenden'] },
    { titel: 'Der XOR-Tresor', szenario: 'Ein Byte-Schlüssel sichert den Tresor. Knack ihn.',
      steps: [{ xor: kk }, 'b64', 'hex'], hinweise: ['Hex → Text', 'Base64 dekodieren', `jedes Byte XOR ${kkHex}`] },
  ];
}

function anwenden(steps: Schritt[], flag: string): string {
  let s = flag;
  for (const st of steps) {
    if (st === 'b64') s = btoa(s);
    else if (st === 'hex') s = toHex(s);
    else if (st === 'rev') s = rev(s);
    else if (st === 'atbash') s = atbash(s);
    else if ('rot' in st) s = caesar(s, st.rot);
    else if ('caesar' in st) s = caesar(s, st.caesar);
    else if ('vig' in st) s = vigenere(s, st.vig);
    else if ('xor' in st) s = xorStr(s, st.xor);
  }
  return s;
}

// ---- ISO-Kalenderwoche (UTC), z. B. „2026-W45"
function isoWoche(d = new Date()): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const tag = (t.getUTCDay() + 6) % 7;          // Mo=0 … So=6
  t.setUTCDate(t.getUTCDate() - tag + 3);         // Donnerstag dieser Woche
  const jahr = t.getUTCFullYear();
  const ersterDo = new Date(Date.UTC(jahr, 0, 4));
  const w = 1 + Math.round(((t.getTime() - ersterDo.getTime()) / 86400000 - 3 + ((ersterDo.getUTCDay() + 6) % 7)) / 7);
  return `${jahr}-W${String(w).padStart(2, '0')}`;
}

const VIGKEYS = ['NACHTFALTER', 'KELLER', 'FUNKTURM', 'SPIEGEL', 'KATZE', 'KODEWORT'];

async function rezeptFuer(woche: string): Promise<Rezept> {
  const s = await hmacHex(`missionrezept:${woche}`);
  const kk = (parseInt(s.slice(0, 2), 16) % 254) + 1;
  const cs = (parseInt(s.slice(2, 4), 16) % 25) + 1;
  const key = VIGKEYS[parseInt(s.slice(4, 6), 16) % VIGKEYS.length];
  const liste = rezepte(kk, key, cs);
  return liste[parseInt(s.slice(6, 8), 16) % liste.length];
}

async function stand(uid: string) {
  const { data } = await db.from('wochen_mission').select('woche').eq('user_id', uid);
  const wochen = (data || []).map((r: any) => r.woche);
  return { anzahl: wochen.length, wochen, punkte: wochen.length * PUNKTE_PRO };
}
async function bestenliste() {
  const { data } = await db.from('wochen_mission').select('user_id');
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
  const woche = isoWoche();

  if (aktion === 'info') {
    const flag = await flagFor(uid, woche);
    const r = await rezeptFuer(woche);
    const st = await stand(uid);
    const geloest = st.wochen.includes(woche);
    return antwort(o, 200, {
      woche, punkte_pro: PUNKTE_PRO, geloest,
      titel: r.titel, szenario: r.szenario,
      aufgabe: anwenden(r.steps, flag), hinweise: r.hinweise,
      anzahl: st.anzahl, punkte: st.punkte, bestenliste: await bestenliste(),
    });
  }

  if (aktion === 'loesen') {
    const versuch = String(b?.versuch || '').trim().toLowerCase();
    const flag = (await flagFor(uid, woche)).toLowerCase();
    if (versuch !== flag) return antwort(o, 200, { ok: false });
    await db.from('wochen_mission').upsert({ user_id: uid, woche }, { onConflict: 'user_id,woche', ignoreDuplicates: true });
    const st = await stand(uid);
    return antwort(o, 200, { ok: true, punkte: st.punkte, anzahl: st.anzahl });
  }

  return antwort(o, 400, { fehler: 'Unbekannte Aktion.' });
});
