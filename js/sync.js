// Geräteübergreifende Synchronisierung über Supabase (optional).
// Ablauf: Remote laden → konservativ mit lokal zusammenführen → speichern → hochladen.
// Prüfungen werden dabei nur aus nachvollziehbaren Versuchen als bestanden übernommen (siehe state.js).
import { mergeStates, upgrade, looksLikeState, pushBackup } from './state.js';

// Neuere Version zuerst (unterstützt das neue Key-Format sb_publishable_…), ältere als Rückfall.
const SUPABASE_ESM = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm',
];
let client = null;
let user = null;
let status = { state: 'off', msg: 'Nur lokal (keine Synchronisierung eingerichtet)' };
let listeners = [];
let pushTimer = null;
let busy = false;

export function syncConfigured() {
  const c = globalThis.KLY_CONFIG || {};
  return !!(c.supabaseUrl && c.supabaseAnonKey);
}
export function syncStatus() { return { ...status, user }; }
export function onSyncStatus(fn) { listeners.push(fn); }
function setStatus(state, msg) { status = { state, msg }; listeners.forEach(f => f(syncStatus())); }

async function getClient() {
  if (client) return client;
  if (!syncConfigured()) return null;
  let createClient, lastErr;
  for (const url of SUPABASE_ESM) {
    try { ({ createClient } = await import(url)); break; } catch (e) { lastErr = e; }
  }
  if (!createClient) throw lastErr || new Error('Supabase-Bibliothek nicht ladbar');
  const c = globalThis.KLY_CONFIG;
  client = createClient(c.supabaseUrl, c.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'kly.auth' } });
  return client;
}

export async function initSync(getState, applyState) {
  if (!syncConfigured()) { setStatus('off', 'Nur lokal – Sync nicht eingerichtet'); return; }
  // Projektwechsel (z. B. auf das Nachtfalter-Konto): alte Anmeldung passt nicht mehr → verwerfen.
  // Der Lernstand bleibt lokal erhalten und wird nach der neuen Anmeldung hochgeladen.
  try {
    const p = globalThis.KLY_CONFIG.supabaseUrl;
    if (localStorage.getItem('kly.auth.projekt') !== p) { localStorage.removeItem('kly.auth'); localStorage.setItem('kly.auth.projekt', p); }
  } catch { /* */ }
  try {
    setStatus('busy', 'Verbinde …');
    const c = await getClient();
    const { data } = await c.auth.getSession();
    user = data.session?.user || null;
    // Wichtig: Supabase-Aufrufe NICHT direkt im Auth-Callback ausführen (kann sich gegenseitig blockieren) – kurz verschieben.
    c.auth.onAuthStateChange((event, session) => {
      user = session?.user || null;
      if (!user) { setStatus('warn', 'Nicht angemeldet'); return; }
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') setTimeout(() => syncNow(getState, applyState), 0);
    });
    if (user) await syncNow(getState, applyState);
    else setStatus('warn', 'Nicht angemeldet');
    window.addEventListener('online', () => syncNow(getState, applyState));
  } catch (e) {
    setStatus('err', 'Sync nicht erreichbar (offline?) – lokal weiterarbeiten.');
  }
}

export async function signIn(email, password) {
  const c = await getClient();
  if (!c) throw new Error('Sync ist nicht eingerichtet.');
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}
export async function signUp(email, password) {
  const c = await getClient();
  if (!c) throw new Error('Sync ist nicht eingerichtet.');
  const { error } = await c.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
}
// Status des eigenen Kontos (freigeschaltet/gesperrt/admin) – nur wenn angemeldet
// Arena-Fortschritt lesen (für den Lernpfad): pro Lab die Anzahl geschaffter Level.
export async function arenaFortschritt() {
  if (!user) return {};
  const c = await getClient();
  const { data, error } = await c.from('arena_fortschritt').select('lab, level');
  if (error) throw new Error(error.message);
  const m = {};
  for (const r of (data || [])) m[r.lab] = (m[r.lab] || 0) + 1;
  return m;
}
export async function meldungSenden(payload) {
  const c = await getClient();
  if (!c) throw new Error('Senden nicht möglich – keine Verbindung.');
  // Anmeldung ist freiwillig: Wer angemeldet ist, wird mitgeschickt (für Zuordnung); sonst anonym.
  const { data: s } = await c.auth.getSession().catch(() => ({ data: null }));
  const token = s?.session?.access_token;
  const opts = token ? { body: payload, headers: { Authorization: `Bearer ${token}` } } : { body: payload };
  const res = await c.functions.invoke('melden', opts);
  if (res.error) throw new Error(res.error.message || 'Senden fehlgeschlagen');
  return res.data;
}
// CTF des Tages: Rätsel holen / Lösung prüfen (serverseitig, braucht Anmeldung).
export async function taeglich(aktion, payload = {}) {
  const c = await getClient();
  if (!c) throw new Error('Keine Verbindung.');
  const { data: s } = await c.auth.getSession().catch(() => ({ data: null }));
  const token = s?.session?.access_token;
  if (!token) throw new Error('Bitte zuerst anmelden.');
  const res = await c.functions.invoke('taeglich', { body: { aktion, ...payload }, headers: { Authorization: `Bearer ${token}` } });
  if (res.error) throw new Error(res.error.message || 'Konnte nicht laden');
  return res.data;
}
// KI-Sicherheit – echter LLM (Boss-Bots + Mentor, serverseitig, braucht Anmeldung).
export async function kiLlm(aktion, payload = {}) {
  const c = await getClient();
  if (!c) throw new Error('Keine Verbindung.');
  const { data: s } = await c.auth.getSession().catch(() => ({ data: null }));
  const token = s?.session?.access_token;
  if (!token) throw new Error('Bitte zuerst anmelden.');
  const res = await c.functions.invoke('ki-llm', { body: { aktion, ...payload }, headers: { Authorization: `Bearer ${token}` } });
  if (res.error) throw new Error(res.error.message || 'Konnte nicht laden');
  return res.data;
}
// Browser-Labs serverseitig werten (Web-Hacking / Forensik / Monats-Rätsel) – fair & schummelsicher.
export async function uebung(aktion, payload = {}) {
  const c = await getClient();
  if (!c) throw new Error('Keine Verbindung.');
  const { data: s } = await c.auth.getSession().catch(() => ({ data: null }));
  const token = s?.session?.access_token;
  if (!token) throw new Error('Bitte zuerst anmelden.');
  const res = await c.functions.invoke('uebung', { body: { aktion, ...payload }, headers: { Authorization: `Bearer ${token}` } });
  if (res.error) throw new Error(res.error.message || 'Konnte nicht laden');
  return res.data;
}
// KI-Sicherheit – Angriffs-Labor (lebende KI im Browser, serverseitig, braucht Anmeldung).
export async function kiSec(aktion, payload = {}) {
  const c = await getClient();
  if (!c) throw new Error('Keine Verbindung.');
  const { data: s } = await c.auth.getSession().catch(() => ({ data: null }));
  const token = s?.session?.access_token;
  if (!token) throw new Error('Bitte zuerst anmelden.');
  const res = await c.functions.invoke('ki-sec', { body: { aktion, ...payload }, headers: { Authorization: `Bearer ${token}` } });
  if (res.error) throw new Error(res.error.message || 'Konnte nicht laden');
  return res.data;
}
// Wochen-Mission: Aufgabe holen / Lösung prüfen (serverseitig, braucht Anmeldung).
export async function mission(aktion, payload = {}) {
  const c = await getClient();
  if (!c) throw new Error('Keine Verbindung.');
  const { data: s } = await c.auth.getSession().catch(() => ({ data: null }));
  const token = s?.session?.access_token;
  if (!token) throw new Error('Bitte zuerst anmelden.');
  const res = await c.functions.invoke('mission', { body: { aktion, ...payload }, headers: { Authorization: `Bearer ${token}` } });
  if (res.error) throw new Error(res.error.message || 'Konnte nicht laden');
  return res.data;
}
// Advent-Kalender „Advent of Hacking": Türchen holen / Lösung prüfen (serverseitig, braucht Anmeldung).
export async function advent(aktion, payload = {}) {
  const c = await getClient();
  if (!c) throw new Error('Keine Verbindung.');
  const { data: s } = await c.auth.getSession().catch(() => ({ data: null }));
  const token = s?.session?.access_token;
  if (!token) throw new Error('Bitte zuerst anmelden.');
  const res = await c.functions.invoke('advent', { body: { aktion, ...payload }, headers: { Authorization: `Bearer ${token}` } });
  if (res.error) throw new Error(res.error.message || 'Konnte nicht laden');
  return res.data;
}
// Teilbares öffentliches Profil: teilen/status/aus (serverseitig, braucht Anmeldung).
export async function profilAktion(aktion, payload = {}) {
  const c = await getClient();
  if (!c) throw new Error('Keine Verbindung.');
  const { data: s } = await c.auth.getSession().catch(() => ({ data: null }));
  const token = s?.session?.access_token;
  if (!token) throw new Error('Bitte zuerst anmelden.');
  const res = await c.functions.invoke('profil', { body: { aktion, ...payload }, headers: { Authorization: `Bearer ${token}` } });
  if (res.error) throw new Error(res.error.message || 'Konnte nicht laden');
  return res.data;
}
export async function meinStatus() {
  if (!user) return null;
  const c = await getClient();
  const { data, error } = await c.rpc('mein_status');
  if (error) throw new Error(error.message);
  return data;
}
export async function signOut() {
  const c = await getClient();
  if (c) await c.auth.signOut();
  user = null; setStatus('warn', 'Abgemeldet');
}

export async function syncNow(getState, applyState) {
  if (!syncConfigured() || !user || busy) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) { setStatus('warn', 'Offline – wird nachgeholt'); return; }
  busy = true;
  try {
    setStatus('busy', 'Synchronisiere …');
    const c = await getClient();
    const timeout = (pr) => Promise.race([pr, new Promise((_, rej) => setTimeout(() => rej(new Error('Zeitüberschreitung')), 15000))]);
    const { data, error } = await timeout(c.from('progress').select('state, updated_at').eq('user_id', user.id).maybeSingle());
    if (error) throw error;
    const local = getState();
    let merged = local;
    if (data && looksLikeState(data.state)) {
      merged = mergeStates(local, upgrade(data.state));
      if (JSON.stringify(merged) !== JSON.stringify(local)) {
        pushBackup(local, 'vor Sync-Zusammenführung');
        applyState(merged);
      }
    }
    const { error: e2 } = await timeout(c.from('progress').upsert({ user_id: user.id, state: merged, updated_at: new Date().toISOString() }));
    if (e2) throw e2;
    setStatus('ok', 'Synchronisiert ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }));
  } catch (e) {
    setStatus('err', 'Sync-Fehler: ' + (e.message || e) + ' – Lernstand bleibt lokal erhalten.');
  } finally { busy = false; }
}

export function schedulePush(getState, applyState) {
  if (!syncConfigured() || !user) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => syncNow(getState, applyState), 2500);
}
