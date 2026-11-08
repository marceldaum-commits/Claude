// Nachtfalter – „Übungs-Scoring" (Supabase Edge Function „uebung").
// Server-seitige, schummelsichere Wertung der Browser-Labs (Web-Hacking / Forensik / Monats-Rätsel).
// Prinzip wie bei den KI-Bots/CTF: per-Konto-Flag (HMAC), Prüfung NUR serverseitig, Fortschritt in DB.
// Kein LLM, kein Budget – reine Prüf-/Erzeugungslogik + globale Bestenliste.
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CTF_SECRET = Deno.env.get('CTF_SECRET') || SERVICE;
const db = createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
const ORIGINS = new Set(['https://app.nachtfalter.tech', 'https://vorschau.nachtfalter.tech']);

const cors = (o: string | null) => ({
  'Access-Control-Allow-Origin': o && ORIGINS.has(o) ? o : 'https://app.nachtfalter.tech',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin',
});
const antwort = (o: string | null, s: number, b: unknown) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors(o), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

async function hmacHex(msg: string): Promise<string> {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(CTF_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}
const flagHex = async (uid: string, level: number) => (await hmacHex(`${uid}:uebung:${level}`)).slice(0, 16);
const flagFor = async (uid: string, level: number) => 'KLY{' + (await flagHex(uid, level)) + '}';
const norm = (s: unknown) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

// --- Kodierer (für die Monats-Challenge, per Konto frisch erzeugt) ---
const b64 = (s: string) => btoa(unescape(encodeURIComponent(s)));
const toHex = (s: string) => [...new TextEncoder().encode(s)].map(b => b.toString(16).padStart(2, '0')).join('');
const toBin = (s: string) => [...new TextEncoder().encode(s)].map(b => b.toString(2).padStart(8, '0')).join(' ');
const rot13 = (s: string) => s.replace(/[a-z]/gi, c => { const base = c <= 'Z' ? 65 : 97; return String.fromCharCode((c.charCodeAt(0) - base + 13) % 26 + base); });
const rev = (s: string) => [...s].reverse().join('');
const CIPHERS: [string, (s: string) => string][] = [
  ['Base64', b64], ['ROT13', rot13], ['Hexadezimal', toHex], ['Rückwärts', rev], ['Binär', toBin], ['Base64 ×2', (s) => b64(b64(s))],
];
const DATEIEN = ['kunden.csv', 'gehaelter.xlsx', 'vertraege.zip', 'backup.sql', 'mitarbeiter.db'];

// --- Forensik: pro Konto frisches Log (Angreifer-IP, Datei, Base64-Token mit der Konto-Flag) ---
async function forensik(uid: string) {
  const flag = await flagFor(uid, 4001);
  const h = await hmacHex(uid + ':forensik');
  const ip = '203.0.113.' + (20 + parseInt(h.slice(0, 4), 16) % 200);
  const datei = DATEIEN[parseInt(h.slice(4, 6), 16) % DATEIEN.length];
  const tok = b64(flag);
  const log = [
    '10.0.0.5     [10/Nov/2026:09:01:12] "POST /login" 200',
    `${ip} [10/Nov/2026:09:03:01] "POST /login" 401`,
    `${ip} [10/Nov/2026:09:03:03] "POST /login" 401`,
    `${ip} [10/Nov/2026:09:03:05] "POST /login" 401`,
    `${ip} [10/Nov/2026:09:03:07] "POST /login" 401`,
    '10.0.0.5     [10/Nov/2026:09:04:00] "GET /start" 200',
    `${ip} [10/Nov/2026:09:03:09] "POST /login" 401`,
    `${ip} [10/Nov/2026:09:05:22] "POST /login" 200   <== erfolgreich`,
    `${ip} [10/Nov/2026:09:06:10] "GET /admin/export?file=${datei}" 200`,
    `${ip} [10/Nov/2026:09:06:11] "GET /admin/note?token=${tok}" 200`,
    '10.0.0.7     [10/Nov/2026:09:10:00] "GET /" 200',
  ];
  return { flag, ip, datei, log };
}
function monatMeta() { const d = new Date(); return { idx: (d.getUTCFullYear() * 12 + d.getUTCMonth()) % CIPHERS.length, ym: d.getUTCFullYear() + '-' + (d.getUTCMonth() + 1), monthNum: d.getUTCFullYear() * 12 + d.getUTCMonth() }; }
async function monat(uid: string) { const m = monatMeta(); const [art, fn] = CIPHERS[m.idx]; const flag = await flagFor(uid, 4100 + (m.monthNum % 1000)); return { art, enc: fn(flag), flag, ym: m.ym }; }

const WEB = ['login', 'daten', 'xss'];
const webCheck = (station: string, payload: string) => {
  const v = String(payload || '');
  if (station === 'login') return /'\s*(or|oder)\s+('?\s*1'?\s*=\s*'?\s*1|[0-9]+\s*=\s*[0-9]+|'[^']*'\s*=\s*'[^']*')/i.test(v) || /'\s*(--|#|\/\*)/.test(v);
  if (station === 'daten') return /union\s+select/i.test(v) && /(nutzer|users|pw|passwort|pass)/i.test(v);
  if (station === 'xss') return /<\s*script|on\w+\s*=|<\s*svg|<\s*img[^>]*=|javascript:/i.test(v);
  return false;
};

async function stand(uid: string): Promise<Set<string>> {
  const { data } = await db.from('uebung_fortschritt').select('aufgabe').eq('user_id', uid);
  return new Set((data || []).map((r: any) => r.aufgabe as string));
}
const GESAMT = 7; // web 3 + forensik 3 + aktuelles Monats-Rätsel 1

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
    const g = await stand(uid); const f = await forensik(uid); const m = await monat(uid);
    const aktuell = ['web:login', 'web:daten', 'web:xss', 'forensik:ip', 'forensik:datei', 'forensik:token', 'monat:' + m.ym];
    return antwort(o, 200, {
      web: { stationen: WEB.map(s => ({ id: s, geloest: g.has('web:' + s) })) },
      forensik: { log: f.log.join('\n'), geloest: { ip: g.has('forensik:ip'), datei: g.has('forensik:datei'), token: g.has('forensik:token') } },
      monat: { art: m.art, enc: m.enc, ym: m.ym, geloest: g.has('monat:' + m.ym) },
      anzahl: aktuell.filter(a => g.has(a)).length, gesamt: GESAMT,
    });
  }

  if (aktion === 'check') {
    const auf = String(b?.aufgabe || ''); const ant = String(b?.antwort ?? '');
    let ok = false, flag: string | null = null;
    if (auf.startsWith('web:')) { const st = auf.slice(4); if (!WEB.includes(st)) return antwort(o, 400, { fehler: 'Unbekannte Aufgabe.' }); ok = webCheck(st, ant); if (ok) flag = await flagFor(uid, 4200 + WEB.indexOf(st)); }
    else if (auf === 'forensik:ip') { const f = await forensik(uid); ok = ant.trim() === f.ip; }
    else if (auf === 'forensik:datei') { const f = await forensik(uid); ok = norm(ant) === norm(f.datei); }
    else if (auf === 'forensik:token') { const f = await forensik(uid); ok = norm(ant) === norm(f.flag); if (ok) flag = f.flag; }
    else if (auf.startsWith('monat:')) { const m = await monat(uid); if (auf !== 'monat:' + m.ym) return antwort(o, 400, { fehler: 'Das ist ein altes Monats-Rätsel.' }); ok = norm(ant) === norm(m.flag); if (ok) flag = m.flag; }
    else return antwort(o, 400, { fehler: 'Unbekannte Aufgabe.' });
    if (ok) await db.from('uebung_fortschritt').upsert({ user_id: uid, aufgabe: auf }, { onConflict: 'user_id,aufgabe', ignoreDuplicates: true });
    const g = await stand(uid);
    const m = monatMeta();
    const aktuell = ['web:login', 'web:daten', 'web:xss', 'forensik:ip', 'forensik:datei', 'forensik:token', 'monat:' + m.ym];
    return antwort(o, 200, { ok, flag, anzahl: aktuell.filter(a => g.has(a)).length, gesamt: GESAMT });
  }

  if (aktion === 'bestenliste') {
    const { data } = await db.from('uebung_fortschritt').select('user_id');
    const zahl: Record<string, number> = {};
    for (const r of (data || [])) zahl[(r as any).user_id] = (zahl[(r as any).user_id] || 0) + 1;
    const top = Object.entries(zahl).sort((a, b) => b[1] - a[1]).slice(0, 20);
    const ids = top.map(t => t[0]);
    let namen = new Map<string, string>();
    if (ids.length) {
      const { data: pp } = await db.from('public_profiles').select('user_id, name').in('user_id', ids);
      namen = new Map((pp || []).filter((p: any) => p.name).map((p: any) => [p.user_id, String(p.name).slice(0, 40)]));
    }
    const liste = top.map(([id, n], i) => ({ platz: i + 1, name: namen.get(id) || 'Anonym', anzahl: n, ich: id === uid }));
    return antwort(o, 200, { liste });
  }

  return antwort(o, 400, { fehler: 'Unbekannte Aktion.' });
});
