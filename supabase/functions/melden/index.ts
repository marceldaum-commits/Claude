// Nachtfalter – Support/Problem melden (Supabase Edge Function „melden“).
// Speichert jede Meldung in support_meldungen (nur der Server schreibt, per Service-Role) und schickt
// – wenn ein Postfach-Passwort hinterlegt ist – eine E-Mail an das Team (eigener Mailserver, STARTTLS 587).
// Ohne SMTP_PASS wird nur gespeichert (nichts geht verloren; die Zentrale/der Betreiber sieht die Liste).
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SMTP_HOST = Deno.env.get('SMTP_HOST') || 'mail.nachtfalter.tech';
const SMTP_PORT = Number(Deno.env.get('SMTP_PORT') || '587');
const SMTP_USER = Deno.env.get('SMTP_USER') || 'info@nachtfalter.tech';
const SMTP_PASS = Deno.env.get('SMTP_PASS') || '';
const MELDE_AN = Deno.env.get('MELDE_AN') || 'info@nachtfalter.tech';
const ORIGINS = new Set(['https://app.nachtfalter.tech', 'https://arena.nachtfalter.tech']);
const db = createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

const cors = (o: string | null) => ({
  'Access-Control-Allow-Origin': o && ORIGINS.has(o) ? o : 'https://app.nachtfalter.tech',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin',
});
const antwort = (o: string | null, status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(o), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

async function mailen(m: { bereich: string; text: string; kontakt: string; kontext: any; uid: string }) {
  if (!SMTP_PASS) return false;
  const c = new SMTPClient({ connection: { hostname: SMTP_HOST, port: SMTP_PORT, tls: false, auth: { username: SMTP_USER, password: SMTP_PASS } } });
  try {
    await c.send({
      from: SMTP_USER, to: MELDE_AN,
      subject: `Nachtfalter: Problem – ${m.bereich}`.slice(0, 160),
      content: `Bereich: ${m.bereich}\nKontakt: ${m.kontakt || '(keiner)'}\nKonto: ${m.uid}\n\n${m.text}\n\n-- technisch --\nVersion: ${m.kontext?.version}\nLernort: ${m.kontext?.lernort}\nSprache: ${m.kontext?.sprache}\nGerät: ${m.kontext?.geraet}`,
    });
    await c.close();
    return true;
  } catch (e) { console.error('smtp', String(e)); try { await c.close(); } catch { /* */ } return false; }
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
  const bereich = String(b?.bereich || 'Sonstiges').slice(0, 120);
  const text = String(b?.text || '').slice(0, 4000).trim();
  const kontakt = String(b?.kontakt || '').slice(0, 160);
  const kontext = (b && typeof b.kontext === 'object') ? b.kontext : {};
  if (text.length < 5) return antwort(o, 400, { fehler: 'Bitte beschreib kurz das Problem.' });

  const { error: e2 } = await db.from('support_meldungen').insert({ user_id: uid, bereich, text, kontakt, kontext });
  if (e2) { console.error('insert', e2.message); return antwort(o, 500, { fehler: 'Konnte nicht gespeichert werden.' }); }
  const gemailt = await mailen({ bereich, text, kontakt, kontext, uid });
  return antwort(o, 200, { ok: true, gemailt });
});
