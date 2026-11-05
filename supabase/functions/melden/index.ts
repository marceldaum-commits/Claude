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

async function mailen(m: { bereich: string; text: string; kontakt: string; kontext: any; uid: string | null }) {
  if (!SMTP_PASS) return false;
  // WICHTIG: Darf die Antwort nie blockieren. Die Supabase-Edge-Umgebung blockiert oft ausgehende
  // SMTP-Ports – dann hängt der Verbindungsaufbau. Darum mit hartem Zeitlimit und im Hintergrund.
  const versuch = (async () => {
    const c = new SMTPClient({ connection: { hostname: SMTP_HOST, port: SMTP_PORT, tls: false, auth: { username: SMTP_USER, password: SMTP_PASS } } });
    try {
      await c.send({
        from: SMTP_USER, to: MELDE_AN,
        subject: `Nachtfalter: Problem – ${m.bereich}`.slice(0, 160),
        content: `Bereich: ${m.bereich}\nKontakt: ${m.kontakt || '(keiner)'}\nKonto: ${m.uid || '(nicht angemeldet)'}\n\n${m.text}\n\n-- technisch --\nVersion: ${m.kontext?.version}\nLernort: ${m.kontext?.lernort}\nSprache: ${m.kontext?.sprache}\nGerät: ${m.kontext?.geraet}`,
      });
      await c.close();
      return true;
    } catch (e) { console.error('smtp', String(e)); try { await c.close(); } catch { /* */ } return false; }
  })();
  const timeout = new Promise<boolean>((res) => setTimeout(() => res(false), 8000));
  return await Promise.race([versuch, timeout]);
}

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
  const kontext = (b && typeof b.kontext === 'object') ? b.kontext : {};
  if (text.length < 5) return antwort(o, 400, { fehler: 'Bitte beschreib kurz das Problem.' });

  const { error: e2 } = await db.from('support_meldungen').insert({ user_id: uid, bereich, text, kontakt, kontext });
  if (e2) { console.error('insert', e2.message); return antwort(o, 500, { fehler: 'Konnte nicht gespeichert werden.' }); }
  // Gespeichert ist das Wichtigste (in der Zentrale sofort sichtbar). Die E-Mail läuft best-effort im
  // Hintergrund und darf die Antwort nie aufhalten – sonst bekäme der Nutzer einen Fehler, obwohl alles passt.
  const mail = mailen({ bereich, text, kontakt, kontext, uid }).catch(() => false);
  try { (globalThis as any).EdgeRuntime?.waitUntil?.(mail); } catch { /* */ }
  return antwort(o, 200, { ok: true });
});
