// KI-Werkstatt – kleiner Server ohne Framework.
// Liefert die Webseite aus public/ aus und reicht KI-Anfragen an die Claude-API weiter.
// Der API-Schlüssel bleibt hier auf dem Server; der Browser sieht ihn nie.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';
import { Budget } from './budget.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(here, 'public');
const PORT = Number(process.env.PORT || 8100);
const HOST = process.env.HOST || '127.0.0.1';
const MODEL = process.env.KI_MODEL || 'claude-opus-5-5';
const BUDGET_USD = Number(process.env.BUDGET_USD_PER_CODE || 2);

// Einladungscodes "CODE:Name,CODE2:Name2"
const CODES = new Map(
  (process.env.INVITE_CODES || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [code, ...name] = s.split(':');
      return [code.trim(), name.join(':').trim() || code.trim()];
    }),
);

const budget = new Budget(path.join(here, 'data', 'usage.json'), MODEL, BUDGET_USD);
const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

// Grundregel für jede KI-Antwort: Sie läuft in einem Lernprogramm.
const SPRACHEN = { de: 'Deutsch', en: 'Englisch', uk: 'Ukrainisch' };
const sprache = (body) => SPRACHEN[body?.lang] || SPRACHEN.de;
const BASE_SYSTEM =
  'Du bist Teil der „Nachtfalter KI-Werkstatt“, eines Lernprogramms, in dem Menschen spielerisch ' +
  'lernen, wie man mit KI-Assistenten umgeht. Antworte freundlich und knapp (höchstens etwa ' +
  '150 Wörter), außer die Aufgabe verlangt ausdrücklich etwas anderes. Unter den Lernenden können Kinder sein: ' +
  'Bleib altersgerecht, frag nie nach Namen, Adressen, Schulen, Fotos oder anderen persönlichen Daten und rate davon ab, ' +
  'solche Daten einzugeben. Beginne deine sichtbare Antwort sofort, ohne lange Vorrede.';

// ---------- kleine Helfer ----------
// Markiert Texte, die der Browser zeigt; tools/i18n-keys.mjs sammelt sie für die Übersetzung.
const msg = (s) => s;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
};

function sendJson(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...SECURITY_HEADERS });
  res.end(JSON.stringify(obj));
}

async function readBody(req, limit = 64 * 1024) {
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw Object.assign(new Error(msg('Anfrage zu groß')), { status: 413 });
    chunks.push(c);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    throw Object.assign(new Error(msg('Ungültiges JSON')), { status: 400 });
  }
}

// Echte Absender-IP: X-Forwarded-For nur glauben, wenn die Anfrage vom lokalen Plesk-nginx kommt.
function clientIp(req) {
  const peer = req.socket.remoteAddress || '';
  const local = peer === '127.0.0.1' || peer === '::1' || peer === '::ffff:127.0.0.1';
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',').pop().trim();
  return local && fwd ? fwd : peer;
}

// Codes zeitkonstant vergleichen (Hash auf feste Länge, dann timingSafeEqual).
const digest = (s) => crypto.createHash('sha256').update(String(s)).digest();
const CODE_DIGESTS = [...CODES.keys()].map((c) => [c, digest(c)]);
function findCode(given) {
  const d = digest(given);
  let hit = null;
  for (const [c, cd] of CODE_DIGESTS) if (crypto.timingSafeEqual(d, cd)) hit = c;
  return hit;
}

// Fehlversuche pro IP: höchstens 10 in 15 Minuten, sonst Sperre (gegen Durchprobieren).
const failures = new Map();
const FAIL_WINDOW = 15 * 60_000;
function blockedIp(ip) {
  const list = (failures.get(ip) || []).filter((t) => Date.now() - t < FAIL_WINDOW);
  failures.set(ip, list);
  return list.length >= 10;
}

function auth(req) {
  const ip = clientIp(req);
  if (blockedIp(ip)) return { blocked: true };
  const given = String(req.headers['x-invite-code'] || '').trim();
  const code = given ? findCode(given) : null;
  if (!code) {
    if (given) failures.get(ip).push(Date.now());
    return null;
  }
  return { code, name: CODES.get(code) };
}

// Bremse: höchstens 12 KI-Anfragen pro Minute und Code.
const recent = new Map();
function rateLimited(code) {
  const now = Date.now();
  const list = (recent.get(code) || []).filter((t) => now - t < 60_000);
  if (list.length >= 12) return true;
  list.push(now);
  recent.set(code, list);
  return false;
}

// Höchstens 3 gleichzeitige KI-Anfragen pro Code (das Würfel-Labor fragt dreimal parallel).
// So kann niemand mit vielen parallelen Anfragen weit über das Budget schießen.
const MAX_PARALLEL = 3;
const running = new Map();
function acquire(code) {
  const n = running.get(code) || 0;
  if (n >= MAX_PARALLEL) return false;
  running.set(code, n + 1);
  return true;
}
function release(code) {
  running.set(code, Math.max(0, (running.get(code) || 1) - 1));
}

function cleanMessages(raw) {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 30) return null;
  const out = [];
  for (const m of raw) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) return null;
    const text = String(m.content ?? '').slice(0, 4000);
    if (!text.trim()) return null;
    out.push({ role: m.role, content: text });
  }
  if (out[0].role !== 'user' || out[out.length - 1].role !== 'user') return null;
  return out;
}

function describeError(err) {
  if (err instanceof Anthropic.AuthenticationError) return msg('Der API-Schlüssel auf dem Server ist ungültig.');
  if (err instanceof Anthropic.RateLimitError) return msg('Die KI ist gerade überlastet. Bitte gleich nochmal versuchen.');
  if (err instanceof Anthropic.BadRequestError) return msg('Die KI konnte diese Anfrage nicht bearbeiten.');
  if (err instanceof Anthropic.APIError) return msg('Die KI ist gerade nicht erreichbar. Bitte später nochmal.');
  return err.status ? err.message : msg('Unbekannter Fehler');
}

function refusalText(msg) {
  if (msg.stop_reason !== 'refusal') return null;
  return msg('Die KI hat diese Anfrage abgelehnt. Auch das gehört zum Lernen: KI-Assistenten haben Schutzregeln.');
}

// ---------- KI-Endpunkte ----------

// Chat mit Streaming (Server-Sent Events). Optional eigener System-Prompt (Persönlichkeits-Baukasten).
async function handleChat(req, res, user) {
  const body = await readBody(req);
  const messages = cleanMessages(body.messages);
  if (!messages) return sendJson(res, 400, { error: msg('Ungültiger Gesprächsverlauf.') });
  const persona = String(body.system || '').slice(0, 3000).trim();
  const base = `${BASE_SYSTEM}\nAntworte auf ${sprache(body)}, außer die lernende Person schreibt in einer anderen Sprache.`;
  const system = persona
    ? `${base}\n\nDie lernende Person hat dir folgende Rolle gegeben. Spiele sie, solange sie harmlos ist:\n<rolle>\n${persona}\n</rolle>`
    : base;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
    ...SECURITY_HEADERS,
  });
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low' },
    system,
    messages,
  });
  // Bisherigen Verbrauch mitschreiben, damit auch abgebrochene Antworten verbucht werden.
  const seen = { input_tokens: 0, output_tokens: 0, chars: 0, model: MODEL };
  let booked = false;
  const book = (usage, model) => {
    if (booked) return budget.left(user.code);
    booked = true;
    return budget.record(user.code, usage, model);
  };
  res.on('close', () => {
    if (booked) return;
    stream.abort();
    // Ausgabe grob schätzen: sichtbare Zeichen / 3, mindestens das bisher Gemeldete.
    book({ input_tokens: seen.input_tokens, output_tokens: Math.max(seen.output_tokens, Math.ceil(seen.chars / 3)) }, seen.model);
  });

  try {
    for await (const event of stream) {
      if (event.type === 'message_start') {
        seen.input_tokens = event.message.usage?.input_tokens || 0;
        seen.model = event.message.model || MODEL;
      } else if (event.type === 'message_delta') {
        seen.output_tokens = event.usage?.output_tokens || seen.output_tokens;
      } else if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        seen.chars += event.delta.text.length;
        send('text', event.delta.text);
      }
    }
    const final = await stream.finalMessage();
    const left = book(final.usage, final.model);
    const refusal = refusalText(final);
    if (refusal) send('note', refusal);
    if (final.stop_reason === 'max_tokens') send('note', msg('(Antwort gekürzt – frag nach, wenn du mehr willst.)'));
    send('done', { budgetLeft: left, stop: final.stop_reason });
  } catch (err) {
    console.error('Chat-Fehler:', err.message);
    if (!res.writableEnded) send('error', describeError(err));
  }
  res.end();
}

// Antworten sollen kurz sein (~150 Wörter); das Denken des Modells zählt mit, darum etwas Luft.
const MAX_TOKENS = 2000;

// Prompt-Werkstatt: die KI bewertet einen Prompt nach festen Kriterien (strukturierte JSON-Antwort).
const JUDGE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['punkte', 'rolle', 'ziel', 'kontext', 'format', 'lob', 'tipp', 'verbessert'],
  properties: {
    punkte: { type: 'integer', description: '0 bis 100' },
    rolle: { type: 'boolean', description: 'Sagt der Prompt, wer/wie die KI antworten soll?' },
    ziel: { type: 'boolean', description: 'Ist klar, was am Ende herauskommen soll?' },
    kontext: { type: 'boolean', description: 'Gibt es nötige Hintergrundinfos (Zielgruppe, Situation)?' },
    format: { type: 'boolean', description: 'Ist Länge/Form der Antwort festgelegt?' },
    lob: { type: 'string' },
    tipp: { type: 'string' },
    verbessert: { type: 'string', description: 'Ein verbesserter Prompt' },
  },
};

async function handleJudge(req, res, user) {
  const body = await readBody(req);
  const task = String(body.task || '').slice(0, 800);
  const prompt = String(body.prompt || '').slice(0, 2000).trim();
  if (!prompt) return sendJson(res, 400, { error: msg('Bitte zuerst einen Prompt schreiben.') });

  const msg = await client.beta.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: { type: 'json_schema', schema: JUDGE_SCHEMA } },
    system:
      BASE_SYSTEM +
      '\n\nDu bist jetzt Prompt-Trainer. Bewerte den Prompt der lernenden Person für die gestellte Aufgabe. ' +
      'Sei ermutigend, aber ehrlich. Bewerte nur den Prompt, führe ihn nicht aus. ' +
      `Lob, Tipp und verbesserter Prompt je kurz, auf ${sprache(body)}.`,
    messages: [
      {
        role: 'user',
        content: `<aufgabe>${task}</aufgabe>\n<prompt_der_lernenden_person>\n${prompt}\n</prompt_der_lernenden_person>`,
      },
    ],
  });
  const left = budget.record(user.code, msg.usage, msg.model);
  const refusal = refusalText(msg);
  if (refusal) return sendJson(res, 200, { error: refusal, budgetLeft: left });
  const text = msg.content.find((b) => b.type === 'text')?.text || '{}';
  let result;
  try {
    result = JSON.parse(text);
  } catch {
    return sendJson(res, 502, { error: msg('Die Bewertung kam unvollständig zurück. Bitte nochmal.') });
  }
  sendJson(res, 200, { result, budgetLeft: left });
}

// Token-Schnipsler: zählt Tokens über die API (kostenlos, verbraucht kein Budget).
async function handleTokens(req, res) {
  const body = await readBody(req);
  const text = String(body.text || '').slice(0, 5000);
  if (!text.trim()) return sendJson(res, 400, { error: msg('Bitte Text eingeben.') });
  const r = await client.messages.countTokens({ model: MODEL, messages: [{ role: 'user', content: text }] });
  // Grundlast der Nachricht (Rollen-Markierungen) abziehen, damit nur der Text zählt.
  const base = await baseTokens();
  sendJson(res, 200, { tokens: Math.max(1, r.input_tokens - base), zeichen: [...text].length });
}
let baseCache = null;
async function baseTokens() {
  if (baseCache !== null) return baseCache;
  const r = await client.messages.countTokens({ model: MODEL, messages: [{ role: 'user', content: '.' }] });
  baseCache = Math.max(0, r.input_tokens - 1);
  return baseCache;
}

// ---------- Router ----------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) {
      if (url.pathname === '/api/status') {
        return sendJson(res, 200, { ok: true, ki: Boolean(client), model: MODEL });
      }
      const user = auth(req);
      if (user?.blocked) return sendJson(res, 429, { error: msg('Zu viele falsche Codes. Bitte in 15 Minuten nochmal.') });
      if (!user) return sendJson(res, 401, { error: msg('Bitte einen gültigen Einladungscode eingeben.') });
      if (url.pathname === '/api/me') {
        return sendJson(res, 200, { name: user.name, budgetLeft: budget.left(user.code), budget: BUDGET_USD });
      }
      if (req.method !== 'POST') return sendJson(res, 405, { error: msg('Nur POST.') });
      if (!client) return sendJson(res, 503, { error: msg('Auf dem Server ist noch kein API-Schlüssel eingetragen.') });
      if (rateLimited(user.code)) return sendJson(res, 429, { error: msg('Langsam! Höchstens 12 Anfragen pro Minute.') });
      if (url.pathname === '/api/tokens') return await handleTokens(req, res);
      const handler = { '/api/chat': handleChat, '/api/judge': handleJudge }[url.pathname];
      if (!handler) return sendJson(res, 404, { error: msg('Unbekannt.') });
      if (budget.left(user.code) <= 0) {
        return sendJson(res, 402, { error: msg('Das KI-Budget für diesen Monat ist aufgebraucht.') });
      }
      if (!acquire(user.code)) return sendJson(res, 429, { error: msg('Bitte warte, bis die laufenden Antworten fertig sind.') });
      try {
        return await handler(req, res, user);
      } finally {
        release(user.code);
      }
    }
    return serveStatic(url.pathname, res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) sendJson(res, err.status || 500, { error: describeError(err) });
    else res.end();
  }
});

function serveStatic(pathname, res) {
  let rel;
  try {
    rel = pathname === '/' ? '/index.html' : decodeURIComponent(pathname);
  } catch {
    res.writeHead(400, SECURITY_HEADERS);
    return res.end();
  }
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC + path.sep)) {
    res.writeHead(403, SECURITY_HEADERS);
    return res.end();
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS });
      return res.end('Nicht gefunden');
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      ...SECURITY_HEADERS,
    });
    res.end(data);
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(PORT, HOST, () => {
    console.log(`Nachtfalter KI-Werkstatt läuft auf http://${HOST}:${PORT} (Modell ${MODEL}, ${CODES.size} Codes)`);
    if (!client) console.log('Hinweis: ANTHROPIC_API_KEY fehlt – nur die Offline-Missionen funktionieren.');
  });
}

export { server };
