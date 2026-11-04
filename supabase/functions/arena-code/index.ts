// Nachtfalter Arena – Code eintragen (Supabase Edge Function „arena-code“).
// Ablauf: Spieler schickt {lab, code} mit seiner Anmeldung → wir prüfen das Konto beim Auth-Server →
// die Arena (einziger Ort mit dem Code-Geheimnis) sagt, welches Level der Code ist → wir tragen den Fortschritt ein.
// Spieler können arena_fortschritt selbst nicht mehr beschreiben (keine INSERT-Regel), Codes lassen sich nicht ausrechnen.
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ARENA = Deno.env.get('ARENA_URL') || 'https://arena.nachtfalter.tech';
const ORIGINS = new Set(['https://arena.nachtfalter.tech', 'https://app.nachtfalter.tech']);
const LABS = new Set(['keller', 'leitstelle', 'tresor', 'webshop', 'einbruch']);
const db = createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

const cors = (o: string | null) => ({
  'Access-Control-Allow-Origin': o && ORIGINS.has(o) ? o : 'https://arena.nachtfalter.tech',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin',
});
const antwort = (o: string | null, status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(o), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

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
  const lab = String(b?.lab || ''), code = String(b?.code || '').trim();
  if (!LABS.has(lab)) return antwort(o, 400, { fehler: 'Unbekanntes Lab' });
  if (!/^KLY\{[0-9a-f]{16}\}$/.test(code)) return antwort(o, 200, { level: 0 });

  const { data: prof } = await db.from('profiles').select('gesperrt').eq('id', uid).maybeSingle();
  if (prof?.gesperrt) return antwort(o, 403, { fehler: 'Dein Konto ist gesperrt.' });

  let level = 0;
  try {
    const r = await fetch(`${ARENA}/api/pruefen`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user: uid, lab, code }), signal: AbortSignal.timeout(8000) });
    if (!r.ok) return antwort(o, 502, { fehler: r.status === 429 ? 'Zu viele Versuche – bitte kurz warten.' : 'Arena gerade nicht erreichbar – bitte gleich noch einmal.' });
    level = Number((await r.json())?.level) || 0;
  } catch { return antwort(o, 502, { fehler: 'Arena gerade nicht erreichbar – bitte gleich noch einmal.' }); }
  if (!Number.isInteger(level) || level < 1 || level > 20) return antwort(o, 200, { level: 0 });

  const { error: e2 } = await db.from('arena_fortschritt').upsert({ user_id: uid, lab, level }, { onConflict: 'user_id,lab,level', ignoreDuplicates: true });
  if (e2) { console.error('eintragen', e2.message); return antwort(o, 500, { fehler: 'Konnte nicht gespeichert werden.' }); }
  return antwort(o, 200, { level });
});
