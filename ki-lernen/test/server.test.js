// Tests mit einer nachgebauten Claude-API (kein echter Schlüssel, keine Kosten).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const usage = { input_tokens: 1000, output_tokens: 500 };
const seen = [];
const mock = http.createServer(async (req, res) => {
  let body = '';
  for await (const c of req) body += c;
  const json = body ? JSON.parse(body) : {};
  seen.push({ url: req.url, json, headers: req.headers });
  if (req.url.startsWith('/v1/messages/count_tokens')) {
    const text = json.messages[0].content;
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ input_tokens: 7 + Math.ceil(text.length / 4) }));
  }
  const msg = { id: 'msg_1', type: 'message', role: 'assistant', model: json.model, stop_reason: 'end_turn', stop_sequence: null, usage };
  if (json.stream) {
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    const ev = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
    ev('message_start', { message: { ...msg, content: [], stop_reason: null, usage: { input_tokens: 1000, output_tokens: 1 } } });
    ev('content_block_start', { index: 0, content_block: { type: 'text', text: '' } });
    ev('content_block_delta', { index: 0, delta: { type: 'text_delta', text: 'Ahoi, ' } });
    ev('content_block_delta', { index: 0, delta: { type: 'text_delta', text: 'Landratte!' } });
    ev('content_block_stop', { index: 0 });
    ev('message_delta', { delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 500 } });
    ev('message_stop', {});
    return res.end();
  }
  const verdict = { punkte: 72, rolle: false, ziel: true, kontext: true, format: true, lob: 'Gut!', tipp: 'Rolle nennen.', verbessert: 'Du bist …' };
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ ...msg, content: [{ type: 'text', text: JSON.stringify(verdict) }] }));
});

let base;
let server;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kiw-'));

before(async () => {
  await new Promise((r) => mock.listen(0, '127.0.0.1', r));
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${mock.address().port}`;
  process.env.ANTHROPIC_API_KEY = 'test-key';
  process.env.INVITE_CODES = 'GUT:Tina';
  process.env.BUDGET_USD_PER_CODE = '0.05';
  process.env.KI_MODEL = 'claude-opus-5-5';
  // Budget-Datei in ein Temp-Verzeichnis umleiten
  fs.cpSync(path.resolve('server.js'), path.join(tmp, 'server.js'));
  fs.cpSync(path.resolve('package.json'), path.join(tmp, 'package.json'));
  fs.cpSync(path.resolve('budget.js'), path.join(tmp, 'budget.js'));
  fs.cpSync(path.resolve('public'), path.join(tmp, 'public'), { recursive: true });
  fs.symlinkSync(path.resolve('node_modules'), path.join(tmp, 'node_modules'));
  ({ server } = await import(path.join(tmp, 'server.js')));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); mock.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

const post = (p, body, code = 'GUT') =>
  fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json', 'x-invite-code': code }, body: JSON.stringify(body) });

test('liefert Startseite mit Sicherheits-Headern', async () => {
  const r = await fetch(base + '/');
  assert.equal(r.status, 200);
  assert.match(await r.text(), /KI-Werkstatt/);
  assert.match(r.headers.get('content-security-policy'), /default-src 'self'/);
});

test('verhindert Pfad-Ausbruch', async () => {
  const r = await fetch(base + '/..%2fserver.js');
  assert.notEqual(r.status, 200);
});

test('ohne Code keine KI', async () => {
  const r = await post('/api/chat', { messages: [{ role: 'user', content: 'hi' }] }, 'FALSCH');
  assert.equal(r.status, 401);
});

test('Status und Profil', async () => {
  assert.deepEqual(await (await fetch(base + '/api/status')).json(), { ok: true, ki: true, model: 'claude-opus-5-5' });
  const me = await (await fetch(base + '/api/me', { headers: { 'x-invite-code': 'GUT' } })).json();
  assert.equal(me.name, 'Tina');
});

test('Tokens zählen zieht Grundlast ab', async () => {
  const d = await (await post('/api/tokens', { text: 'abcdefgh' })).json();
  assert.equal(d.tokens, 2);
  assert.equal(d.zeichen, 8);
});

test('Chat streamt Text, nutzt Fallback und Persona', async () => {
  const r = await post('/api/chat', { messages: [{ role: 'user', content: 'Hallo' }], system: 'Du bist ein Pirat.' });
  assert.equal(r.status, 200);
  const text = await r.text();
  assert.match(text, /event: text\ndata: "Ahoi, "/);
  assert.match(text, /event: done/);
  const call = seen.findLast((s) => s.url.startsWith('/v1/messages') && s.json.stream);
  assert.equal(call.json.fallbacks, 'default');
  assert.match(call.headers['anthropic-beta'], /server-side-fallback-2026-07-01/);
  assert.match(call.json.system, /Pirat/);
  assert.equal(call.json.output_config.effort, 'low');
});

test('ungültiger Verlauf wird abgelehnt', async () => {
  const r = await post('/api/chat', { messages: [{ role: 'assistant', content: 'x' }] });
  assert.equal(r.status, 400);
});

test('Prompt-Trainer liefert Bewertung, Budget sperrt danach', async () => {
  const d = await (await post('/api/judge', { task: 'Einladung', prompt: 'schreib was' })).json();
  assert.equal(d.result.punkte, 72);
  const call = seen.findLast((s) => s.url.startsWith('/v1/messages') && !s.json.stream && s.json.output_config?.format);
  assert.equal(call.json.output_config.format.type, 'json_schema');
  // 2 Anfragen à (1000×4 + 500×20)/1e6 = 0,014 $ → bei 0,05 $ noch Rest; zwei weitere erschöpfen das Budget
  await post('/api/judge', { task: 'x', prompt: 'y' });
  await post('/api/judge', { task: 'x', prompt: 'y' });
  const r = await post('/api/judge', { task: 'x', prompt: 'y' });
  assert.equal(r.status, 402);
});
