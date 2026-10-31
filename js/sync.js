// Geräteübergreifende Synchronisierung über Supabase (optional).
// Ablauf: Remote laden → konservativ mit lokal zusammenführen → speichern → hochladen.
// Prüfungen werden dabei nur aus nachvollziehbaren Versuchen als bestanden übernommen (siehe state.js).
import { mergeStates, upgrade, looksLikeState, pushBackup } from './state.js';

const SUPABASE_ESM = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
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
  const { createClient } = await import(SUPABASE_ESM);
  const c = globalThis.KLY_CONFIG;
  client = createClient(c.supabaseUrl, c.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'kly.auth' } });
  return client;
}

export async function initSync(getState, applyState) {
  if (!syncConfigured()) { setStatus('off', 'Nur lokal – Sync nicht eingerichtet'); return; }
  try {
    setStatus('busy', 'Verbinde …');
    const c = await getClient();
    const { data } = await c.auth.getSession();
    user = data.session?.user || null;
    c.auth.onAuthStateChange((_e, session) => { user = session?.user || null; if (user) syncNow(getState, applyState); else setStatus('warn', 'Nicht angemeldet'); });
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
    const { data, error } = await c.from('progress').select('state, updated_at').eq('user_id', user.id).maybeSingle();
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
    const { error: e2 } = await c.from('progress').upsert({ user_id: user.id, state: merged, updated_at: new Date().toISOString() });
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
