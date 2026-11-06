// Nachtfalter – „Teilbares öffentliches Profil" (Supabase Edge Function „profil").
// teilen/status/aus brauchen Anmeldung; oeffentlich ist frei lesbar (für die öffentliche Seite p.html).
// Es werden nur unkritische Werte gespeichert (Name, Punkte, Abzeichen-Zahl, Meilenstein, Serie) – kein Lernstand.
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ORIGINS = new Set(['https://app.nachtfalter.tech', 'https://vorschau.nachtfalter.tech']);
const db = createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

const cors = (o: string | null) => ({
  // Die öffentliche Seite kann von überall geladen werden – „oeffentlich" ist frei; daher *.
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin',
});
const antwort = (o: string | null, status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(o), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const ABC = 'abcdefghijkmnpqrstuvwxyz23456789'; // ohne verwechselbare Zeichen
function neueId(n = 9): string {
  const a = new Uint8Array(n); crypto.getRandomValues(a);
  return [...a].map(x => ABC[x % ABC.length]).join('');
}
const clampN = (v: unknown, max: number) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));
const clampS = (v: unknown, max: number) => String(v ?? '').slice(0, max);

async function freieId(): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const id = neueId();
    const { data } = await db.from('public_profiles').select('share_id').eq('share_id', id).maybeSingle();
    if (!data) return id;
  }
  return neueId(12);
}

Deno.serve(async (req) => {
  const o = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(o) });
  if (req.method !== 'POST') return antwort(o, 405, { fehler: 'Nur POST' });
  let b: any; try { b = await req.json(); } catch { return antwort(o, 400, { fehler: 'Ungültige Anfrage' }); }
  const aktion = String(b?.aktion || '');

  // --- Frei lesbar: ein öffentliches Profil holen (für p.html) ---
  if (aktion === 'oeffentlich') {
    const id = clampS(b?.id, 40).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!id) return antwort(o, 400, { fehler: 'Kein Profil angegeben.' });
    const { data } = await db.from('public_profiles').select('name, punkte, abzeichen, meilenstein, streak, updated_at').eq('share_id', id).maybeSingle();
    if (!data) return antwort(o, 404, { fehler: 'Profil nicht gefunden.' });
    return antwort(o, 200, { profil: data });
  }

  // --- Ab hier Anmeldung nötig ---
  const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!jwt) return antwort(o, 401, { fehler: 'Bitte anmelden.' });
  const { data: u, error } = await db.auth.getUser(jwt);
  if (error || !u?.user) return antwort(o, 401, { fehler: 'Deine Anmeldung ist abgelaufen – bitte neu anmelden.' });
  const uid = u.user.id;

  if (aktion === 'status') {
    const { data } = await db.from('public_profiles').select('share_id, updated_at').eq('user_id', uid).maybeSingle();
    return antwort(o, 200, { aktiv: !!data, share_id: data?.share_id || null });
  }

  if (aktion === 'teilen') {
    const werte = {
      name: clampS(b?.name, 40),
      punkte: clampN(b?.punkte, 10_000_000),
      abzeichen: clampN(b?.abzeichen, 10_000),
      meilenstein: clampS(b?.meilenstein, 60),
      streak: clampN(b?.streak, 100_000),
      updated_at: new Date().toISOString(),
    };
    const { data: vorhanden } = await db.from('public_profiles').select('share_id').eq('user_id', uid).maybeSingle();
    const share_id = vorhanden?.share_id || await freieId();
    const { error: e2 } = await db.from('public_profiles').upsert({ share_id, user_id: uid, ...werte }, { onConflict: 'user_id' });
    if (e2) return antwort(o, 500, { fehler: 'Konnte nicht speichern.' });
    return antwort(o, 200, { ok: true, share_id });
  }

  if (aktion === 'aus') {
    await db.from('public_profiles').delete().eq('user_id', uid);
    return antwort(o, 200, { ok: true });
  }

  return antwort(o, 400, { fehler: 'Unbekannte Aktion.' });
});
