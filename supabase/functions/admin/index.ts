// Nachtfalter-Verwaltung (Supabase Edge Function „admin“, Projekt nachtfalter-konto).
// Nur für Admins (Tabelle public.admins). Prüft bei JEDER Anfrage das Anmelde-Token beim Auth-Server
// und erst dann die Admin-Rolle. Der service_role-Schlüssel bleibt hier im Dienst, nie im Browser.
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ORIGINS = new Set([
  'https://kali-level-up.pages.dev', 'https://vorschau.kali-level-up.pages.dev',
  'https://konto.nachtfalter.tech', 'https://app.nachtfalter.tech', 'https://vorschau.nachtfalter.tech',
  'https://zentrale.nachtfalter.tech',
]);
const db = createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && ORIGINS.has(origin) ? origin : 'https://zentrale.nachtfalter.tech',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
});
const antwort = (origin: string | null, status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(origin), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const UUID = /^[0-9a-f-]{36}$/i;
const UNBEFRISTET = '9999-12-31T23:59:59Z'; // „ohne Ablauf“
// Fortschritt kommt aus Kundendaten (frei beschreibbar) → immer defensiv lesen
const obj = (v: unknown): Record<string, any> => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, any> : {});
const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []);
const zeit = (v: unknown) => {
  const t = typeof v === 'number' ? v : typeof v === 'string' ? Date.parse(v) : NaN;
  return Number.isFinite(t) && t > 0 && t < 4102444800000 ? new Date(t).toISOString() : null; // bis 2100
};
const anzahlFertig = (m: unknown) => Object.values(obj(m)).filter((x: any) => x && typeof x === 'object' && x.doneAt).length;
const bestanden = (m: unknown) => Object.values(obj(m)).filter((e: any) => arr(e?.attempts).some((a: any) => a?.passed === true)).length;
const zufallsCode = () => {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // ohne 0/O/1/I
  const b = crypto.getRandomValues(new Uint8Array(12));
  const s = [...b].map((x) => abc[x % abc.length]).join('');
  return `NF-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
};

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors(origin) });
  if (req.method !== 'POST') return antwort(origin, 405, { fehler: 'Nur POST' });

  // 1) Anmeldung prüfen (Token beim Auth-Server verifizieren)
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: u, error: ue } = await db.auth.getUser(token);
  if (ue && !(Number(ue.status) >= 400 && Number(ue.status) < 500)) return antwort(origin, 503, { fehler: 'Anmeldedienst gerade nicht erreichbar – bitte gleich noch einmal versuchen.' });
  if (ue || !u?.user) return antwort(origin, 401, { fehler: 'Bitte anmelden.' });
  // 2) Admin-Rolle prüfen
  const { data: adm } = await db.from('admins').select('user_id').eq('user_id', u.user.id).maybeSingle();
  if (!adm) return antwort(origin, 403, { fehler: 'Kein Zugriff.' });
  // 3) Zwei-Faktor-Pflicht: Die Zentrale braucht eine Anmeldung mit App-Code (Supabase AAL2)
  let aal = '';
  try {
    const b = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    aal = JSON.parse(atob(b + '='.repeat((4 - b.length % 4) % 4))).aal || '';
  } catch { /* */ }
  if (aal !== 'aal2') return antwort(origin, 403, { fehler: 'Bitte mit Zwei-Faktor-Code anmelden.', code: 'mfa' });

  // Jede ändernde Aktion wird protokolliert (Tabelle admin_log, nur für den Dienst lesbar)
  const protokoll = (aktion: string, ziel: string | null, details: Record<string, unknown> = {}) =>
    db.from('admin_log').insert({ admin_id: u.user.id, aktion, ziel: ziel && UUID.test(ziel) ? ziel : null, details }).then(() => {}, () => {});

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return antwort(origin, 400, { fehler: 'Ungültige Anfrage' }); }
  const aktion = String(body.aktion || '');
  const id = String(body.user_id || '');

  try {
    switch (aktion) {
      case 'uebersicht': {
        const alle: any[] = [];
        for (let seite = 1; seite <= 50; seite++) {
          const { data: lu, error } = await db.auth.admin.listUsers({ page: seite, perPage: 1000 });
          if (error) throw error;
          alle.push(...lu.users);
          if (lu.users.length < 1000) break;
        }
        const [{ data: profs }, { data: ents }, { data: prog }, { data: admins }, { data: notizen }] = await Promise.all([
          db.from('profiles').select('id, display_name, lang, birth_year, parent_consent, freigeschaltet, gesperrt, last_seen'),
          db.from('entitlements').select('id, user_id, produkt, gueltig_bis, quelle, notiz').order('gueltig_bis', { ascending: false }),
          db.from('progress').select('user_id, updated_at, state'),
          db.from('admins').select('user_id'),
          db.from('kunden_notizen').select('user_id, notiz'),
        ]);
        const N = new Map((notizen || []).map((n) => [n.user_id, n.notiz]));
        const P = new Map((profs || []).map((p) => [p.id, p]));
        const G = new Map((prog || []).map((p) => [p.user_id, p]));
        const A = new Set((admins || []).map((a) => a.user_id));
        const nutzer = alle.map((x) => {
          const p = P.get(x.id) || {};
          const g = G.get(x.id);
          const st = obj(g?.state);
          let geloest = 0, lektionen = 0, pruefungen = 0;
          try { geloest = anzahlFertig(st.rooms); lektionen = anzahlFertig(st.lessons); pruefungen = bestanden(st.exams); } catch { /* fehlerhafte Daten eines Kunden */ }
          return {
            id: x.id, email: x.email, bestaetigt: !!x.email_confirmed_at, erstellt: x.created_at, zuletzt: x.last_sign_in_at,
            name: p.display_name || '', lang: p.lang, jahrgang: p.birth_year, eltern: p.parent_consent,
            freigeschaltet: !!p.freigeschaltet, gesperrt: !!p.gesperrt, admin: A.has(x.id),
            fortschritt: g ? { geloest, lektionen, pruefungen, aktualisiert: g.updated_at } : null, zuletzt_gesehen: p.last_seen || null, notiz: N.get(x.id) || '', zwei_faktor: ((x as any).factors || []).some((f: any) => f.status === 'verified'), gesperrt_auth: !!(x as any).banned_until && new Date((x as any).banned_until) > new Date(),
            zugaenge: (ents || []).filter((e) => e.user_id === x.id),
          };
        });
        const { data: codes } = await db.from('invites').select('*').order('created_at', { ascending: false });
        const { count: offeneAnfragen } = await db.from('zugangsanfragen').select('id', { count: 'exact', head: true }).eq('status', 'offen');
        const { count: offeneMeldungen } = await db.from('support_meldungen').select('id', { count: 'exact', head: true }).eq('erledigt', false);
        return antwort(origin, 200, { nutzer, codes: codes || [], offeneAnfragen: offeneAnfragen || 0, offeneMeldungen: offeneMeldungen || 0 });
      }
      case 'code_erstellen': {
        const max = Math.min(1000, Math.max(1, Number(body.max_uses) || 1));
        const tage = body.tage ? Math.min(3650, Math.max(1, Number(body.tage))) : null;
        const produkt = ['arena', 'arena-profi', 'ki', 'alles'].includes(String(body.produkt)) ? String(body.produkt) : null;
        const gueltigTage = body.gueltig_tage ? Math.min(365, Math.max(1, Number(body.gueltig_tage))) : 30;
        const zeile = {
          code: zufallsCode(), notiz: String(body.notiz || '').slice(0, 200) || null, max_uses: max,
          produkt, tage: produkt ? (tage || 30) : null,
          gueltig_bis: new Date(Date.now() + gueltigTage * 864e5).toISOString(), created_by: u.user.id,
        };
        const { data, error } = await db.from('invites').insert(zeile).select().single();
        if (error) throw error;
        await protokoll('code_erstellt', null, { code: data.code, produkt, max });
        return antwort(origin, 200, { code: data });
      }
      case 'code_widerrufen': {
        const { error } = await db.from('invites').update({ widerrufen: true }).eq('code', String(body.code || ''));
        if (error) throw error;
        await protokoll('code_widerrufen', null, { code: String(body.code || '') });
        return antwort(origin, 200, { ok: true });
      }
      case 'nutzer_setzen': {
        if (!UUID.test(id)) return antwort(origin, 400, { fehler: 'Unbekannter Nutzer' });
        const upd: Record<string, boolean> = {};
        if (typeof body.freigeschaltet === 'boolean') upd.freigeschaltet = body.freigeschaltet;
        if (typeof body.gesperrt === 'boolean') upd.gesperrt = body.gesperrt;
        if (typeof body.eltern === 'boolean') (upd as any).parent_consent = body.eltern;
        if (!Object.keys(upd).length) return antwort(origin, 400, { fehler: 'Nichts zu ändern' });
        const { error } = await db.from('profiles').update(upd).eq('id', id);
        if (error) throw error;
        // Gesperrte Konten zusätzlich bei der Anmeldung sperren (bzw. wieder freigeben)
        if (typeof body.gesperrt === 'boolean') {
          const { error: be } = await db.auth.admin.updateUserById(id, { ban_duration: body.gesperrt ? '876000h' : 'none' });
          if (be) throw be;
        }
        await protokoll('nutzer_geaendert', id, upd);
        return antwort(origin, 200, { ok: true });
      }
      case 'zugang_geben': {
        if (!UUID.test(id)) return antwort(origin, 400, { fehler: 'Unbekannter Nutzer' });
        const produkt = String(body.produkt);
        if (!['arena', 'arena-profi', 'ki', 'alles'].includes(produkt)) return antwort(origin, 400, { fehler: 'Unbekanntes Produkt' });
        const unbefristet = body.tage === 'unbefristet';
        const tage = Math.min(3650, Math.max(1, Number(body.tage) || 30));
        const { error } = await db.from('entitlements').insert({
          user_id: id, produkt, gueltig_bis: unbefristet ? UNBEFRISTET : new Date(Date.now() + tage * 864e5).toISOString(),
          quelle: 'geschenk', notiz: String(body.notiz || 'Verwaltung').slice(0, 200),
        });
        if (error) throw error;
        await protokoll('zugang_gegeben', id, { produkt, tage: unbefristet ? 'unbefristet' : tage });
        return antwort(origin, 200, { ok: true });
      }
      case 'zugang_beenden': {
        const eid = Number(body.zugang_id);
        if (!Number.isInteger(eid)) return antwort(origin, 400, { fehler: 'Unbekannter Zugang' });
        const { error } = await db.from('entitlements').update({ gueltig_bis: new Date().toISOString() }).eq('id', eid);
        if (error) throw error;
        await protokoll('zugang_beendet', null, { zugang_id: eid });
        return antwort(origin, 200, { ok: true });
      }
      case 'nutzer_loeschen': {
        if (!UUID.test(id)) return antwort(origin, 400, { fehler: 'Unbekannter Nutzer' });
        if (id === u.user.id) return antwort(origin, 400, { fehler: 'Das eigene Konto kann hier nicht gelöscht werden.' });
        if (String(body.bestaetigung || '') !== 'LÖSCHEN') return antwort(origin, 400, { fehler: 'Bestätigung fehlt' });
        const { data: weg } = await db.auth.admin.getUserById(id);
        const { error } = await db.auth.admin.deleteUser(id); // löscht Profil, Fortschritt, Zugänge per Kaskade
        if (error) throw error;
        await protokoll('nutzer_geloescht', null, { email: weg?.user?.email || '' });
        return antwort(origin, 200, { ok: true });
      }
      case 'nutzer_detail': {
        if (!UUID.test(id)) return antwort(origin, 400, { fehler: 'Unbekannter Nutzer' });
        const { data: g } = await db.from('progress').select('updated_at, state').eq('user_id', id).maybeSingle();
        const st = obj(g?.state);
        const raeume = Object.entries(obj(st.rooms)).slice(0, 500).map(([rid, r0]) => { const r = obj(r0); return {
          id: String(rid).slice(0, 40), begonnen: zeit(r.startedAt), geloest: zeit(r.doneAt),
          antworten: Object.values(obj(r.answers)).filter((a: any) => a?.ok === true).length,
          tipps: Object.values(obj(r.hints)).reduce((n: number, h: any) => n + (typeof h === 'number' && Number.isFinite(h) ? Math.min(Math.max(h, 0), 99) : Array.isArray(h) ? h.length : h ? 1 : 0), 0),
        }; });
        const pruefungen = Object.entries(obj(st.exams)).slice(0, 50).map(([lv, e]) => {
          const at = arr(obj(e).attempts);
          return { level: String(lv).slice(0, 20), versuche: at.length, bestanden: at.some((a: any) => a?.passed === true), beste: at.reduce((m: number, a: any) => { const v = Number(a?.score); return Number.isFinite(v) ? Math.max(m, v) : m; }, 0) };
        });
        const geschichten = Object.entries(obj(st.story)).slice(0, 50).map(([sid, x]) => ({ id: String(sid).slice(0, 40), fertig: zeit(obj(x).doneAt) }));
        const [{ data: arena }, { data: anf }] = await Promise.all([
          db.from('arena_fortschritt').select('lab, level, geloest_am').eq('user_id', id).order('geloest_am'),
          db.from('zugangsanfragen').select('id, produkt, status, nachricht, antwort, erstellt, entschieden_am').eq('user_id', id).order('erstellt', { ascending: false }).limit(20),
        ]);
        return antwort(origin, 200, { aktualisiert: g?.updated_at || null, raeume, pruefungen, geschichten,
          lektionen: anzahlFertig(st.lessons), uebungen: Object.keys(obj(st.exercises)).length, arena: arena || [], anfragen: anf || [] });
      }
      case 'passwort_mail': {
        if (!UUID.test(id)) return antwort(origin, 400, { fehler: 'Unbekannter Nutzer' });
        const { data: x, error: ge } = await db.auth.admin.getUserById(id);
        if (ge || !x?.user?.email) return antwort(origin, 404, { fehler: 'Nutzer nicht gefunden' });
        const { error } = await db.auth.resetPasswordForEmail(x.user.email, { redirectTo: 'https://app.nachtfalter.tech/konto.html' });
        if (error) throw error;
        await protokoll('passwort_mail', id);
        return antwort(origin, 200, { ok: true });
      }
      case 'rolle_setzen': {
        if (!UUID.test(id)) return antwort(origin, 400, { fehler: 'Unbekannter Nutzer' });
        const rolle = String(body.rolle || '');
        if (rolle === 'verwaltung') {
          const { error } = await db.from('admins').upsert({ user_id: id });
          if (error) throw error;
        } else if (rolle === 'kunde') {
          if (id === u.user.id) return antwort(origin, 400, { fehler: 'Die eigene Verwaltungs-Rolle kannst du nicht selbst entfernen.' });
          const { error } = await db.from('admins').delete().eq('user_id', id);
          if (error) throw error;
        } else return antwort(origin, 400, { fehler: 'Unbekannte Rolle' });
        await protokoll('rolle_gesetzt', id, { rolle });
        return antwort(origin, 200, { ok: true });
      }
      case 'notiz_setzen': {
        if (!UUID.test(id)) return antwort(origin, 400, { fehler: 'Unbekannter Nutzer' });
        const notiz = String(body.notiz || '').slice(0, 2000);
        const { error } = await db.from('kunden_notizen').upsert({ user_id: id, notiz, updated_at: new Date().toISOString(), updated_by: u.user.id });
        if (error) throw error;
        await protokoll('notiz_geaendert', id);
        return antwort(origin, 200, { ok: true });
      }
      case 'email_bestaetigen': {
        if (!UUID.test(id)) return antwort(origin, 400, { fehler: 'Unbekannter Nutzer' });
        const { error } = await db.auth.admin.updateUserById(id, { email_confirm: true });
        if (error) throw error;
        await protokoll('email_bestaetigt', id);
        return antwort(origin, 200, { ok: true });
      }
      case 'bestaetigung_erneut': {
        if (!UUID.test(id)) return antwort(origin, 400, { fehler: 'Unbekannter Nutzer' });
        const { data: x } = await db.auth.admin.getUserById(id);
        if (!x?.user?.email) return antwort(origin, 404, { fehler: 'Nutzer nicht gefunden' });
        if (x.user.email_confirmed_at) return antwort(origin, 400, { fehler: 'Die E-Mail-Adresse ist schon bestätigt.' });
        const { error } = await db.auth.resend({ type: 'signup', email: x.user.email, options: { emailRedirectTo: 'https://app.nachtfalter.tech/konto.html' } });
        if (error) throw error;
        await protokoll('bestaetigung_erneut', id);
        return antwort(origin, 200, { ok: true });
      }
      case 'zwei_faktor_zuruecksetzen': {
        if (!UUID.test(id)) return antwort(origin, 400, { fehler: 'Unbekannter Nutzer' });
        if (id === u.user.id) return antwort(origin, 400, { fehler: 'Die eigene Zwei-Faktor-Anmeldung kann hier nicht entfernt werden – das macht eine andere Verwaltungs-Person bzw. Claude.' });
        const { data: fl, error: le } = await db.auth.admin.mfa.listFactors({ userId: id });
        if (le) throw le;
        let n = 0;
        for (const f of fl?.factors || []) { const { error: de } = await db.auth.admin.mfa.deleteFactor({ id: f.id, userId: id }); if (de) throw de; n++; }
        await protokoll('zwei_faktor_zurueckgesetzt', id, { anzahl: n });
        return antwort(origin, 200, { ok: true, anzahl: n });
      }
      case 'ki_reset': {
        // KI-Sicherheit-Fortschritt eines Kunden zurücksetzen (Boss-Bots, Verteidigung, Arena) + heutiges KI-Budget.
        if (!UUID.test(id)) return antwort(origin, 400, { fehler: 'Unbekannter Nutzer' });
        await db.from('ki_llm_fortschritt').delete().eq('user_id', id);
        await db.from('ki_llm_verteidigung').delete().eq('user_id', id);
        await db.from('ki_llm_nutzung').delete().eq('user_id', id);
        await db.from('ki_sec_fortschritt').delete().eq('user_id', id);
        await protokoll('ki_zurueckgesetzt', id);
        return antwort(origin, 200, { ok: true });
      }
      case 'ki_tokens': {
        // Dem Kunden KI-Nachrichten für HEUTE gutschreiben. voll=true: volles Tagesbudget wieder frei;
        // sonst tokens=N: N zusätzliche Nachrichten heute (senkt den verbrauchten Zähler).
        if (!UUID.test(id)) return antwort(origin, 400, { fehler: 'Unbekannter Nutzer' });
        const tag = new Date().toISOString().slice(0, 10);
        if (body.voll === true) {
          await db.from('ki_llm_nutzung').delete().eq('user_id', id).eq('tag', tag);
          await protokoll('ki_tokens', id, { voll: true });
        } else {
          const n = Math.max(1, Math.min(200, parseInt(String(body.tokens ?? '10'), 10) || 10));
          const { data: cur } = await db.from('ki_llm_nutzung').select('anzahl').eq('user_id', id).eq('tag', tag).maybeSingle();
          const neu = Math.max(0, ((cur?.anzahl as number) || 0) - n);
          await db.from('ki_llm_nutzung').upsert({ user_id: id, tag, anzahl: neu }, { onConflict: 'user_id,tag' });
          await protokoll('ki_tokens', id, { tokens: n });
        }
        return antwort(origin, 200, { ok: true });
      }
      case 'protokoll': {
        const { data, error } = await db.from('admin_log').select('id, at, admin_id, aktion, ziel, details').order('at', { ascending: false }).limit(200);
        if (error) throw error;
        return antwort(origin, 200, { eintraege: data || [] });
      }
      case 'status': {
        const pruefe = async (url: string) => {
          const t0 = Date.now();
          try { const r = await fetch(url, { signal: AbortSignal.timeout(5000) }); return { ok: r.ok, ms: Date.now() - t0, text: (await r.text()).slice(0, 400) }; }
          catch (e) { return { ok: false, ms: Date.now() - t0, text: String(e).slice(0, 200) }; }
        };
        const [app, vorschau, arena, www] = await Promise.all([
          pruefe('https://app.nachtfalter.tech/app-files.js'), pruefe('https://vorschau.nachtfalter.tech/app-files.js'),
          pruefe('https://arena.nachtfalter.tech/api/status'), pruefe('https://www.nachtfalter.tech/'),
        ]);
        const version = (r: { text: string }) => (r.text.match(/KLY_VERSION = '([^']+)'/) || [])[1] || null;
        let arenaInfo = null; try { arenaInfo = JSON.parse(arena.text); } catch { /* */ }
        return antwort(origin, 200, {
          app: { ok: app.ok, ms: app.ms, version: version(app) }, vorschau: { ok: vorschau.ok || vorschau.text.includes('401') , geschuetzt: !vorschau.ok, ms: vorschau.ms },
          arena: { ok: arena.ok, ms: arena.ms, info: arenaInfo }, www: { ok: www.ok, ms: www.ms },
        });
      }
      case 'anfragen': {
        const { data, error } = await db.from('zugangsanfragen').select('id, user_id, produkt, nachricht, status, antwort, erstellt, entschieden_am, entschieden_von')
          .order('status', { ascending: false }).order('erstellt', { ascending: false }).limit(300);
        if (error) throw error;
        return antwort(origin, 200, { anfragen: data || [] });
      }
      case 'anfrage_entscheiden': {
        const aid = Number(body.anfrage_id);
        if (!Number.isInteger(aid)) return antwort(origin, 400, { fehler: 'Unbekannte Anfrage' });
        const ja = body.entscheidung === 'ja';
        const text = String(body.antwort || '').slice(0, 500) || null;
        const { data: a, error: ge } = await db.from('zugangsanfragen').select('id, user_id, produkt, status').eq('id', aid).maybeSingle();
        if (ge) throw ge;
        if (!a) return antwort(origin, 404, { fehler: 'Anfrage nicht gefunden' });
        if (a.status !== 'offen') return antwort(origin, 400, { fehler: 'Diese Anfrage ist schon entschieden.' });
        let bis: string | null = null;
        if (ja) {
          const unbefristet = body.tage === 'unbefristet';
          const tage = Math.min(3650, Math.max(1, Number(body.tage) || 30));
          bis = unbefristet ? UNBEFRISTET : new Date(Date.now() + tage * 864e5).toISOString();
          const { error } = await db.from('entitlements').insert({ user_id: a.user_id, produkt: a.produkt, gueltig_bis: bis, quelle: 'anfrage', notiz: `Anfrage #${aid}` });
          if (error) throw error;
        }
        const { error } = await db.from('zugangsanfragen').update({ status: ja ? 'genehmigt' : 'abgelehnt', antwort: text, entschieden_am: new Date().toISOString(), entschieden_von: u.user.id }).eq('id', aid).eq('status', 'offen');
        if (error) throw error;
        await protokoll(ja ? 'anfrage_genehmigt' : 'anfrage_abgelehnt', a.user_id, { produkt: a.produkt, bis });
        return antwort(origin, 200, { ok: true });
      }
      case 'meldungen': {
        const { data, error } = await db.from('support_meldungen')
          .select('id, user_id, bereich, text, kontakt, kontext, erledigt, erstellt')
          .order('erledigt', { ascending: true }).order('erstellt', { ascending: false }).limit(300);
        if (error) throw error;
        return antwort(origin, 200, { meldungen: data || [] });
      }
      case 'meldung_erledigt': {
        const mid = String(body.meldung_id || '');
        if (!UUID.test(mid)) return antwort(origin, 400, { fehler: 'Unbekannte Meldung' });
        const erledigt = body.erledigt !== false; // Standard: als erledigt markieren
        const { data, error } = await db.from('support_meldungen').update({ erledigt }).eq('id', mid).select('id');
        if (error) throw error;
        if (!data || !data.length) return antwort(origin, 404, { fehler: 'Meldung nicht gefunden' });
        await protokoll('meldung_erledigt', null, { meldung_id: mid, erledigt });
        return antwort(origin, 200, { ok: true });
      }
      default:
        return antwort(origin, 400, { fehler: 'Unbekannte Aktion' });
    }
  } catch (e) {
    console.error('admin', aktion, e);
    return antwort(origin, 500, { fehler: 'Das hat nicht geklappt. Details im Supabase-Log.' });
  }
});
