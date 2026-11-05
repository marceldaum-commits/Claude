// Nachtfalter – Support/Problem melden (Supabase Edge Function „melden“).
// Speichert jede Meldung in support_meldungen (nur der Server schreibt, per Service-Role).
// Der E-Mail-Versand an das Team übernimmt der ARENA-SERVER (meldungenMailen in arena/server.js),
// weil die Supabase-Edge-Umgebung ausgehenden SMTP blockiert. Hier wird bewusst NICHT gemailt.
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ORIGINS = new Set([
  'https://app.nachtfalter.tech', 'https://vorschau.nachtfalter.tech', 'https://arena.nachtfalter.tech',
]);
const db = createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

const cors = (o: string | null) => ({
  'Access-Control-Allow-Origin': o && ORIGINS.has(o) ? o : 'https://app.nachtfalter.tech',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin',
});
const antwort = (o: string | null, status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(o), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

Deno.serve(async (req) => {
  const o = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(o) });
  if (req.method !== 'POST') return antwort(o, 405, { fehler: 'Nur POST' });
  // Anmeldung ist freiwillig: Wer angemeldet ist, wird zugeordnet; sonst wird die Meldung anonym gespeichert.
  // (Gerade wenn etwas kaputt ist, ist man oft nicht angemeldet – die Meldung soll trotzdem ankommen.)
  const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  let uid: string | null = null;
  if (jwt) { try { const { data: u } = await db.auth.getUser(jwt); uid = u?.user?.id ?? null; } catch { /* anonym */ } }
  let b: any; try { b = await req.json(); } catch { return antwort(o, 400, { fehler: 'Ungültige Anfrage' }); }
  const bereich = String(b?.bereich || 'Sonstiges').slice(0, 120);
  const text = String(b?.text || '').slice(0, 4000).trim();
  const kontakt = String(b?.kontakt || '').slice(0, 160);
  // kontext: nur die vier bekannten Felder übernehmen und jeweils begrenzen (kein ungebremstes jsonb-Fluten).
  const ko = (b && typeof b.kontext === 'object' && !Array.isArray(b.kontext)) ? b.kontext : {};
  const kontext = {
    version: String(ko.version ?? '').slice(0, 40),
    lernort: String(ko.lernort ?? '').slice(0, 80),
    sprache: String(ko.sprache ?? '').slice(0, 16),
    geraet: String(ko.geraet ?? '').slice(0, 200),
  };
  if (text.length < 5) return antwort(o, 400, { fehler: 'Bitte beschreib kurz das Problem.' });

  const { error } = await db.from('support_meldungen').insert({ user_id: uid, bereich, text, kontakt, kontext });
  if (error) { console.error('insert', error.message); return antwort(o, 500, { fehler: 'Konnte nicht gespeichert werden.' }); }
  // Gespeichert reicht: in der Zentrale sofort sichtbar, die E-Mail holt der Arena-Server im Hintergrund.
  return antwort(o, 200, { ok: true });
});
