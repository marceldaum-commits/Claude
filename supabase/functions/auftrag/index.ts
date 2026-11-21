// Edge `auftrag` – „Der Auftrag" (Engagement-Engine), serverseitig.
// Aufgaben: (1) KI-Briefing (lebendiger Auftraggeber), (2) geräteübergreifender Fortschritt/Report,
// (3) serverseitige Antwort-Prüfung. Die Kiste wird aus einem Seed deterministisch erzeugt – Client und
// Server teilen denselben Generator, daher kennt der Server die richtigen Antworten, ohne sie dem Client zu geben.
// (Perfekt schummelsicher ist nur die Docker-Variante; die Browser-Kiste liegt naturgemäß im Browser.)

import { createClient } from 'jsr:@supabase/supabase-js@2';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SECRET = Deno.env.get('CTF_SECRET') || SERVICE;
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') || '';
const MODELL = Deno.env.get('LLM_MODELL') || 'claude-haiku-5-5';
const ORIGINS = new Set(['https://app.nachtfalter.tech', 'https://vorschau.nachtfalter.tech']);
const db = createClient(URL_, SERVICE, { auth: { persistSession: false } });

// ---- Generator (muss zeichengenau zum Client passen: js/content/auftrag-gen.js + auftrag-module.js) ----
const NAMEN = ['admin', 'webadmin', 'deploy', 'backup', 'svc-web', 'tomcat', 'jenkins', 'dbuser', 'support', 'operator'];
const SCHWACH = ['Sommer2024', 'Passwort1', 'Firma2023!', 'Welcome1', 'changeme', 'admin123', 'Winter2024', 'Qwerty123', 'Hallo2023', 'root1234'];
const FIRMEN = ['Talheim Logistik', 'Nordstadt Werke', 'Brandt & Söhne', 'Kranich Reisen', 'Lumen Shop', 'Meierhof IT', 'Stadtwerke Au', 'Orbit GmbH'];
function rng(seed: number) { let x = (seed >>> 0) || 1; return () => (x = (x * 1664525 + 1013904223) >>> 0) / 2 ** 32; }
const pick = <T>(R: () => number, a: T[]): T => a[Math.floor(R() * a.length)];

type Flag = { id: string; ziel: string; unlock: string };
// Module: params verbrauchen R in GENAU dieser Reihenfolge wie im Client.
const MOD: Record<string, { ziel?: string; params: (R: () => number) => any; unlock?: (p: any) => string }> = {
  'scan-basis': { params: () => ({}) },
  'ssh-schwach': { ziel: 'Finde gültige Zugangsdaten und verschaffe dir Zugang zum Host.', params: (R) => ({ user: pick(R, NAMEN), pass: pick(R, SCHWACH) }), unlock: (p) => p.pass },
  'git-expo': { ziel: 'Durchsuche die Web-Wurzel nach vergessenen Dateien mit Geheimnissen.', params: (R) => ({ dbpass: pick(R, SCHWACH), dbuser: pick(R, NAMEN) }), unlock: (p) => p.dbpass },
  'sqli-login': { ziel: 'Umgehe das Login der Web-App ohne gültiges Passwort.', params: (R) => ({ pfad: pick(R, ['/admin', '/portal', '/intern', '/verwaltung']) }), unlock: () => "' OR '1'='1" },
  'creds-datei': { ziel: 'Finde wiederverwendete Zugangsdaten für ein höheres Konto.', params: (R) => ({ user: pick(R, ['root', 'deploy', 'dbadmin']), pass: pick(R, SCHWACH) }), unlock: (p) => p.pass },
  'sudo-nopass': { ziel: 'Nutze eine sudo-Regel, um Root zu werden.', params: (R) => ({ bin: pick(R, ['find', 'vim', 'awk', 'less', 'tar']) }), unlock: (p) => p.bin },
};
const REZEPT: Record<number, string[]> = {
  1: ['scan-basis', 'ssh-schwach'],
  2: ['scan-basis', 'git-expo', 'creds-datei'],
  3: ['scan-basis', 'sqli-login', 'sudo-nopass'],
};
const STUFE_TITEL: Record<number, string> = { 1: 'Sehr unsicher', 2: 'Unsicher', 3: 'Mittel' };

function bau(stufe: number, seed: number): { firma: string; host: string; flags: Flag[] } {
  const R = rng(seed);
  const firma = pick(R, FIRMEN);
  const host = 'srv-' + String(10 + Math.floor(R() * 89));
  const flags: Flag[] = [];
  for (const id of (REZEPT[stufe] || REZEPT[1])) {
    const m = MOD[id]; const p = m.params ? m.params(R) : {};
    if (m.unlock) flags.push({ id, ziel: m.ziel || '', unlock: String(m.unlock(p)) });
  }
  return { firma, host, flags };
}
const sqliNorm = (s: string) => s.toLowerCase().replace(/[^a-z0-9=]/g, '');
const trifft = (input: string, unlock: string) => (/'/.test(unlock) && /=/.test(unlock)) ? sqliNorm(input).includes('or1=1') : input.trim() === unlock.trim();

// Deterministischer Seed aus Konto+Stufe+Versuch (stabil, serverseitig).
async function seedVon(uid: string, stufe: number, versuch: number): Promise<number> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`auftrag:${uid}:${stufe}:${versuch}`)));
  return ((sig[0] << 24) | (sig[1] << 16) | (sig[2] << 8) | sig[3]) >>> 0;
}

async function claudeBrief(firma: string, host: string, stufe: number, lang: string): Promise<string> {
  const fallbackDe = `Die ${firma} beauftragt dich mit einem Sicherheitstest von Host ${host}. Verschaff dir Zugang und dokumentiere jeden Fund.`;
  const fallbackEn = `${firma} hires you to run a security test of host ${host}. Gain access and document every finding.`;
  if (!ANTHROPIC_API_KEY) return lang === 'en' ? fallbackEn : fallbackDe;
  const sys = lang === 'en'
    ? `Write a short, realistic engagement brief (3-4 sentences, first person from the client "${firma}") hiring a penetration tester to test host ${host}. Serious business tone, no hints or solutions, no hacking instructions. English only.`
    : `Schreibe ein kurzes, realistisches Auftrags-Briefing (3-4 Sätze, Ich-Form als Auftraggeber „${firma}"), das einen Pentester beauftragt, den Host ${host} zu testen. Seriöser Geschäftston, keine Tipps/Lösungen, keine Hacking-Anleitung. Nur Deutsch.`;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODELL, max_tokens: 200, system: sys, messages: [{ role: 'user', content: 'Schreib das Briefing.' }] }),
    });
    if (!r.ok) return lang === 'en' ? fallbackEn : fallbackDe;
    const j = await r.json();
    const t = (j?.content?.[0]?.text || '').trim();
    return t || (lang === 'en' ? fallbackEn : fallbackDe);
  } catch { return lang === 'en' ? fallbackEn : fallbackDe; }
}

const cors = (o: string | null) => ({ 'Access-Control-Allow-Origin': o && ORIGINS.has(o) ? o : 'https://app.nachtfalter.tech', 'Access-Control-Allow-Headers': 'authorization, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json' });
const antwort = (o: string | null, status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: cors(o) });

async function lade(uid: string, stufe: number) {
  const { data } = await db.from('auftrag_fortschritt').select('*').eq('user_id', uid).eq('stufe', stufe).maybeSingle();
  return data as any;
}

Deno.serve(async (req) => {
  const o = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(o) });
  if (req.method !== 'POST') return antwort(o, 405, { fehler: 'Nur POST' });
  const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: u, error } = await db.auth.getUser(jwt);
  if (error || !u?.user) return antwort(o, 401, { fehler: 'Bitte anmelden.' });
  const uid = u.user.id;
  let b: any; try { b = await req.json(); } catch { return antwort(o, 400, { fehler: 'Ungültige Anfrage' }); }
  const aktion = String(b?.aktion || '');
  const lang = String(b?.lang || 'de') === 'en' ? 'en' : 'de';
  const stufe = Math.max(1, Math.min(3, parseInt(b?.stufe, 10) || 1));

  if (aktion === 'start' || aktion === 'neu') {
    let row = await lade(uid, stufe);
    let versuch = row?.versuch || 1;
    if (aktion === 'neu') { versuch += 1; row = null; }
    const seed = await seedVon(uid, stufe, versuch);
    const kiste = bau(stufe, seed);
    const geloest: string[] = (aktion === 'neu' ? [] : (row?.geloest || []));
    let brief = row?.brief;
    if (!brief || aktion === 'neu') { brief = await claudeBrief(kiste.firma, kiste.host, stufe, lang); }
    await db.from('auftrag_fortschritt').upsert({ user_id: uid, stufe, versuch, geloest, brief, updated_at: new Date().toISOString() }, { onConflict: 'user_id,stufe' });
    return antwort(o, 200, { stufe, titel: STUFE_TITEL[stufe], versuch, seed, firma: kiste.firma, host: kiste.host, brief, geloest, gesamt: kiste.flags.length, ziele: kiste.flags.map(f => ({ id: f.id, ziel: f.ziel })) });
  }

  if (aktion === 'flag') {
    const flagId = String(b?.flag || '');
    const antw = String(b?.antwort || '');
    const row = await lade(uid, stufe);
    if (!row) return antwort(o, 400, { fehler: 'Kein laufender Auftrag – starte ihn zuerst.' });
    const seed = await seedVon(uid, stufe, row.versuch);
    const kiste = bau(stufe, seed);
    const flag = kiste.flags.find(f => f.id === flagId);
    if (!flag) return antwort(o, 400, { fehler: 'Unbekanntes Ziel.' });
    if (!trifft(antw, flag.unlock)) return antwort(o, 200, { ok: false, geloest: row.geloest || [] });
    const geloest = Array.from(new Set([...(row.geloest || []), flagId]));
    const fertig = geloest.length >= kiste.flags.length;
    await db.from('auftrag_fortschritt').upsert({ user_id: uid, stufe, versuch: row.versuch, geloest, abgeschlossen: fertig, updated_at: new Date().toISOString() }, { onConflict: 'user_id,stufe' });
    return antwort(o, 200, { ok: true, geloest, fertig });
  }

  if (aktion === 'report') {
    const text = String(b?.text || '').slice(0, 8000);
    await db.from('auftrag_fortschritt').update({ report: text, updated_at: new Date().toISOString() }).eq('user_id', uid).eq('stufe', stufe);
    return antwort(o, 200, { ok: true }); // KI-Benotung folgt (Feature #2)
  }

  return antwort(o, 400, { fehler: 'Unbekannte Aktion.' });
});
