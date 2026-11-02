// Lernstand: Laden, Speichern, konservatives Zusammenführen, abgeleitete Werte.
// Grundsätze: nichts stillschweigend löschen; Prüfungen nur aus nachvollziehbaren Versuchen als bestanden werten.

export const SCHEMA = 1;
export const STORAGE_KEY = 'kly.state.v1';
export const BACKUP_KEY = 'kly.state.backups';
export const PASS_RATIO = 0.85;

function rid(n = 6) {
  const a = new Uint8Array(n);
  globalThis.crypto.getRandomValues(a);
  return [...a].map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function defaultState() {
  return {
    schema: SCHEMA,
    profile: { name: '' },
    deviceId: 'dev-' + rid(4),
    labToken: 'KLY-' + rid(3),
    location: null,           // 'pc' | 'phone' | 'both' | 'windows'
    locationDay: null,        // YYYY-MM-DD
    locationAt: 0,
    lessons: {},              // id -> { doneAt }
    exercises: {},            // id -> { attempts, failed, passedAt, hintUsed, lastAt, evidence:{command, output}, knobelOk, repeats }
    exams: {},                // levelId -> { attempts: [ {id, at, items:[{id, ok, mandatory}], score, passed} ] }
    story: {},                // missionId -> { scene, sceneAt, done, doneAt, attempts:{sceneId:n}, hintUsed:{}, evidence:{sceneId:{command,output}}, answers:{}, report:{} }
    archive: {},              // exerciseId -> firstSeenAt
    daily: {},                // YYYY-MM-DD -> [exerciseIds]
    rooms: {},                // roomId -> { startedAt, answers:{ 'tX.qY': {ok, at, attempts} }, hints:{}, doneAt }
    activity: {},             // YYYY-MM-DD -> Anzahl erfolgreicher Lernaktionen (für Serien)
    extern: {},               // Schritt-ID externer Lernpfade -> erledigt am (Zeitstempel)
    settings: { sound: false },
    updatedAt: 0,
  };
}

export function today(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------- Persistenz
export function loadState(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return upgrade(JSON.parse(raw));
  } catch {
    return defaultState();
  }
}

export function upgrade(s) {
  const d = defaultState();
  const out = { ...d, ...s };
  for (const k of ['lessons', 'exercises', 'exams', 'story', 'archive', 'daily', 'settings', 'profile', 'rooms', 'activity', 'extern']) out[k] = { ...d[k], ...(s?.[k] || {}) };
  if (!out.labToken) out.labToken = d.labToken;
  if (!out.deviceId) out.deviceId = d.deviceId;
  out.schema = SCHEMA;
  return out;
}

export function saveState(state, storage = globalThis.localStorage) {
  state.updatedAt = Date.now();
  try { storage?.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* Speicher voll/privat */ }
}

// Lokale Sicherungen (max. 10) vor riskanten Aktionen (Import, Reset, Sync-Merge)
export function pushBackup(state, reason, storage = globalThis.localStorage) {
  try {
    const list = JSON.parse(storage.getItem(BACKUP_KEY) || '[]');
    list.unshift({ at: Date.now(), reason, state });
    storage.setItem(BACKUP_KEY, JSON.stringify(list.slice(0, 10)));
  } catch { /* ignorieren */ }
}
export function listBackups(storage = globalThis.localStorage) {
  try { return JSON.parse(storage.getItem(BACKUP_KEY) || '[]'); } catch { return []; }
}

// Tipps: Zahl der aufgedeckten Tipps je Frage (alt: true = 1). Beim Zusammenführen gilt das Maximum.
function mergeHints(a = {}, b = {}) {
  const n = (v) => (v === true ? 1 : +v || 0);
  const out = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const m = Math.max(n(a[k]), n(b[k])); if (m) out[k] = m; }
  return out;
}

// ---------------------------------------------------------------- Prüfungen
export function scoreAttempt(items) {
  const total = items.length;
  const correct = items.filter(i => i.ok).length;
  const mandatoryOk = items.filter(i => i.mandatory).every(i => i.ok);
  const score = total ? correct / total : 0;
  return { score, correct, total, mandatoryOk, passed: total > 0 && score >= PASS_RATIO && mandatoryOk };
}

// Ein Versuch gilt nur, wenn er aus seinen Einzelergebnissen nachvollziehbar ist.
export function attemptValid(a, minItems = 1) {
  if (!a || !Array.isArray(a.items) || a.items.length < minItems) return false;
  const r = scoreAttempt(a.items);
  return Math.abs(r.score - a.score) < 1e-9 && r.passed === a.passed;
}

export function examPassed(state, levelId, minItems = 1) {
  const ex = state.exams[levelId];
  return !!ex && ex.attempts.some(a => attemptValid(a, minItems) && a.passed);
}

// ---------------------------------------------------------------- Merge
function minPos(a, b) { if (!a) return b || 0; if (!b) return a; return Math.min(a, b); }

export function mergeStates(a, b) {
  a = upgrade(a); b = upgrade(b);
  const newer = (a.updatedAt || 0) >= (b.updatedAt || 0) ? a : b;
  const out = upgrade(structuredClone(newer));

  // Lektionen: Vereinigung, früheste Erledigung
  out.lessons = {};
  for (const id of new Set([...Object.keys(a.lessons), ...Object.keys(b.lessons)])) {
    out.lessons[id] = { doneAt: minPos(a.lessons[id]?.doneAt, b.lessons[id]?.doneAt) };
  }

  // Übungen: Bestanden bleibt bestanden; Zähler maximal; neuester Beleg
  out.exercises = {};
  for (const id of new Set([...Object.keys(a.exercises), ...Object.keys(b.exercises)])) {
    const x = a.exercises[id] || {}, y = b.exercises[id] || {};
    const latest = (x.lastAt || 0) >= (y.lastAt || 0) ? x : y;
    out.exercises[id] = {
      ...latest,
      attempts: Math.max(x.attempts || 0, y.attempts || 0),
      failed: Math.max(x.failed || 0, y.failed || 0),
      repeats: Math.max(x.repeats || 0, y.repeats || 0),
      passedAt: minPos(x.passedAt, y.passedAt),
      hintUsed: !!(x.hintUsed || y.hintUsed),
      tips: Math.max(x.tips || 0, y.tips || 0),
      knobelOk: !!(x.knobelOk || y.knobelOk),
      lastAt: Math.max(x.lastAt || 0, y.lastAt || 0),
    };
    if (!out.exercises[id].passedAt) delete out.exercises[id].passedAt;
  }

  // Prüfungen: alle Versuche vereinigen (per id), nur gültige behalten
  out.exams = {};
  for (const lv of new Set([...Object.keys(a.exams), ...Object.keys(b.exams)])) {
    const map = new Map();
    for (const at of [...(a.exams[lv]?.attempts || []), ...(b.exams[lv]?.attempts || [])]) {
      if (attemptValid(at)) map.set(at.id, at);
    }
    out.exams[lv] = { attempts: [...map.values()].sort((p, q) => p.at - q.at) };
  }

  // Externe Lernpfade: abgehakt bleibt abgehakt (frühestes Datum)
  out.extern = {};
  for (const id of new Set([...Object.keys(a.extern || {}), ...Object.keys(b.extern || {})])) {
    const v = minPos(a.extern?.[id], b.extern?.[id]);
    if (v) out.extern[id] = v;
  }

  // Story: weitester Fortschritt, Belege vereinigen
  out.story = {};
  for (const id of new Set([...Object.keys(a.story), ...Object.keys(b.story)])) {
    const x = a.story[id] || {}, y = b.story[id] || {};
    const further = (x.scene || 0) >= (y.scene || 0) ? x : y;
    const other = further === x ? y : x;
    out.story[id] = {
      ...other, ...further,
      evidence: { ...(other.evidence || {}), ...(further.evidence || {}) },
      answers: { ...(other.answers || {}), ...(further.answers || {}) },
      attempts: mergeMax(x.attempts, y.attempts),
      hintUsed: { ...(x.hintUsed || {}), ...(y.hintUsed || {}) },
      done: !!(x.done || y.done),
      doneAt: minPos(x.doneAt, y.doneAt),
    };
  }

  // Archiv, Tagesmissionen: Vereinigung
  out.archive = {};
  for (const id of new Set([...Object.keys(a.archive), ...Object.keys(b.archive)])) out.archive[id] = minPos(a.archive[id], b.archive[id]);
  out.daily = { ...b.daily, ...a.daily };
  for (const d of Object.keys(out.daily)) out.daily[d] = [...new Set([...(a.daily[d] || []), ...(b.daily[d] || [])])];

  // Räume: gelöste Fragen bleiben gelöst, Versuche maximal, Hinweise vereinigt
  out.rooms = {};
  for (const id of new Set([...Object.keys(a.rooms), ...Object.keys(b.rooms)])) {
    const x = a.rooms[id] || {}, y = b.rooms[id] || {};
    const answers = {};
    for (const q of new Set([...Object.keys(x.answers || {}), ...Object.keys(y.answers || {})])) {
      const p = x.answers?.[q] || {}, r = y.answers?.[q] || {};
      answers[q] = { ok: !!(p.ok || r.ok), at: minPos(p.ok ? p.at : 0, r.ok ? r.at : 0) || Math.max(p.at || 0, r.at || 0), attempts: Math.max(p.attempts || 0, r.attempts || 0) };
    }
    out.rooms[id] = { startedAt: minPos(x.startedAt, y.startedAt), answers, hints: mergeHints(x.hints, y.hints), doneAt: minPos(x.doneAt, y.doneAt) };
    if (!out.rooms[id].doneAt) delete out.rooms[id].doneAt;
  }
  out.activity = {};
  for (const d of new Set([...Object.keys(a.activity), ...Object.keys(b.activity)])) out.activity[d] = Math.max(a.activity[d] || 0, b.activity[d] || 0);

  // Lernort: zuletzt gewählter
  const loc = (a.locationAt || 0) >= (b.locationAt || 0) ? a : b;
  out.location = loc.location; out.locationDay = loc.locationDay; out.locationAt = loc.locationAt;

  // Lab-Token: der ältere (erste) bleibt stabil – beide Geräte sollen denselben nutzen
  out.labToken = a.labToken && b.labToken ? [a.labToken, b.labToken].sort()[0] : (a.labToken || b.labToken);
  out.updatedAt = Math.max(a.updatedAt || 0, b.updatedAt || 0);
  return out;
}

function mergeMax(x = {}, y = {}) {
  const o = { ...x };
  for (const [k, v] of Object.entries(y)) o[k] = Math.max(o[k] || 0, v);
  return o;
}

// ---------------------------------------------------------------- XP (abgeleitet, nie gespeichert)
export function computeXp(state, exerciseIndex) {
  let xp = 0;
  for (const [id, e] of Object.entries(state.exercises)) {
    if (!e.passedAt || !exerciseIndex[id]) continue;
    const full = exerciseIndex[id].xp || 10, n = exerciseIndex[id].tipCount || 0, used = Math.min(e.tips || 0, n);
    xp += n && used ? Math.max(1, Math.round(full - used * full / n)) : full;
  }
  return xp;
}

// Lernserie: aufeinanderfolgende Tage mit Aktivität bis heute (oder gestern, wenn heute noch nichts war)
export function streak(state, now = new Date()) {
  const has = (d) => (state.activity?.[d] || 0) > 0;
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (!has(today(day))) day.setUTCDate(day.getUTCDate() - 1);
  let n = 0;
  while (has(today(day))) { n++; day.setUTCDate(day.getUTCDate() - 1); }
  return n;
}

export function markActivity(state, now = new Date()) {
  const d = today(now);
  state.activity[d] = (state.activity[d] || 0) + 1;
}

// Neutrale Kopie (für Export ohne persönliche Daten nicht nötig – dort wird kein Stand exportiert)
export function snapshotForExport(state) {
  const s = structuredClone(state);
  s.exportedAt = Date.now();
  s.kind = 'kali-level-up-lernstand';
  return s;
}

export function looksLikeState(obj) {
  return obj && typeof obj === 'object' && obj.schema && obj.lessons && obj.exercises && obj.exams;
}
