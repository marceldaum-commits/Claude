// KI-Werkstatt – kleiner Server ohne Framework.
// Liefert die Webseite aus public/ aus und reicht KI-Anfragen an die Claude-API weiter.
// Der API-Schlüssel bleibt hier auf dem Server; der Browser sieht ihn nie.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
const BASE_SYSTEM =
  'Du bist Teil der „KI-Werkstatt“, eines deutschsprachigen Lernprogramms, in dem Menschen spielerisch ' +
  'lernen, wie man mit KI-Assistenten umgeht. Antworte auf Deutsch, freundlich und knapp (höchstens etwa ' +
  '150 Wörter), außer die Aufgabe verlangt ausdrücklich etwas anderes. Latency-sensitive; begin your visible answer immediately.';

// ---------- kleine Helfer ----------
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
    if (size > limit) throw Object.assign(new Error('Anfrage zu groß'), { status: 413 });
    chunks.push(c);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    throw Object.assign(new Error('Ungültiges JSON'), { status: 400 });
  }
}

function auth(req) {
  const code = String(req.headers['x-invite-code'] || '').trim();
  if (!code || !CODES.has(code)) return null;
  return { code, name: CODES.get(code) };
}

// Einfache Bremse: höchstens 12 KI-Anfragen pro Minute und Code.
const recent = new Map();
function rateLimited(code) {
  const now = Date.now();
  const list = (recent.get(code) || []).filter((t) => now - t < 60_000);
  if (list.length >= 12) return true;
  list.push(now);
  recent.set(code, list);
  return false;
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
  if (err instanceof Anthropic.AuthenticationError) return 'Der API-Schlüssel auf dem Server ist ungültig.';
  if (err instanceof Anthropic.RateLimitError) return 'Die KI ist gerade überlastet. Bitte gleich nochmal versuchen.';
  if (err instanceof Anthropic.BadRequestError) return 'Die Anfrage wurde abgelehnt: ' + err.message;
  if (err instanceof Anthropic.APIError) return `KI-Fehler (${err.status ?? 'Netz'}).`;
  return err.message || 'Unbekannter Fehler';
}

function refusalText(msg) {
  if (msg.stop_reason !== 'refusal') return null;
  return 'Die KI hat diese Anfrage abgelehnt. Auch das gehört zum Lernen: KI-Assistenten haben Schutzregeln.';
}

// ---------- KI-Endpunkte ----------

// Chat mit Streaming (Server-Sent Events). Optional eigener System-Prompt (Persönlichkeits-Baukasten).
async function handleChat(req, res, user) {
  const body = await readBody(req);
  const messages = cleanMessages(body.messages);
  if (!messages) return sendJson(res, 400, { error: 'Ungültiger Gesprächsverlauf.' });
  const persona = String(body.system || '').slice(0, 3000).trim();
  const system = persona
    ? `${BASE_SYSTEM}\n\nDie lernende Person hat dir folgende Rolle gegeben. Spiele sie, solange sie harmlos ist:\n<rolle>\n${persona}\n</rolle>`
    : BASE_SYSTEM;

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
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low' },
    system,
    messages,
  });
  req.on('close', () => stream.abort());

  try {
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        send('text', event.delta.text);
      }
    }
    const final = await stream.finalMessage();
    const left = budget.record(user.code, final.usage, final.model);
    const refusal = refusalText(final);
    if (refusal) send('text', '\n\n' + refusal);
    send('done', { usage: final.usage, budgetLeft: left, stop: final.stop_reason });
  } catch (err) {
    if (!res.writableEnded) send('error', describeError(err));
  }
  res.end();
}

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
  if (!prompt) return sendJson(res, 400, { error: 'Bitte zuerst einen Prompt schreiben.' });

  const msg = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: { type: 'json_schema', schema: JUDGE_SCHEMA } },
    system:
      BASE_SYSTEM +
      '\n\nDu bist jetzt Prompt-Trainer. Bewerte den Prompt der lernenden Person für die gestellte Aufgabe. ' +
      'Sei ermutigend, aber ehrlich. Bewerte nur den Prompt, führe ihn nicht aus. Lob und Tipp je ein Satz, auf Deutsch.',
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
    return sendJson(res, 502, { error: 'Die Bewertung kam unvollständig zurück. Bitte nochmal.' });
  }
  sendJson(res, 200, { result, budgetLeft: left });
}

// Token-Schnipsler: zählt Tokens über die API (kostenlos, verbraucht kein Budget).
async function handleTokens(req, res) {
  const body = await readBody(req);
  const text = String(body.text || '').slice(0, 5000);
  if (!text.trim()) return sendJson(res, 400, { error: 'Bitte Text eingeben.' });
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
      if (!user) return sendJson(res, 401, { error: 'Bitte einen gültigen Einladungscode eingeben.' });
      if (url.pathname === '/api/me') {
        return sendJson(res, 200, { name: user.name, budgetLeft: budget.left(user.code), budget: BUDGET_USD });
      }
      if (req.method !== 'POST') return sendJson(res, 405, { error: 'Nur POST.' });
      if (!client) return sendJson(res, 503, { error: 'Auf dem Server ist noch kein API-Schlüssel eingetragen.' });
      if (url.pathname === '/api/tokens') return await handleTokens(req, res);
      if (budget.left(user.code) <= 0) {
        return sendJson(res, 402, { error: 'Das KI-Budget für diesen Monat ist aufgebraucht.' });
      }
      if (rateLimited(user.code)) return sendJson(res, 429, { error: 'Langsam! Höchstens 12 Anfragen pro Minute.' });
      if (url.pathname === '/api/chat') return await handleChat(req, res, user);
      if (url.pathname === '/api/judge') return await handleJudge(req, res, user);
      return sendJson(res, 404, { error: 'Unbekannt.' });
    }
    return serveStatic(url.pathname, res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) sendJson(res, err.status || 500, { error: describeError(err) });
    else res.end();
  }
});

function serveStatic(pathname, res) {
  const rel = pathname === '/' ? '/index.html' : decodeURIComponent(pathname);
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
    console.log(`KI-Werkstatt läuft auf http://${HOST}:${PORT} (Modell ${MODEL}, ${CODES.size} Codes)`);
    if (!client) console.log('Hinweis: ANTHROPIC_API_KEY fehlt – nur die Offline-Missionen funktionieren.');
  });
}

export { server };
