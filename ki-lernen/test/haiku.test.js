// Standardmodell Haiku 5.5: keine serverseitigen Ersatzmodelle (würden mit 400 abgelehnt).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const seen = [];
const mock = http.createServer(async (req, res) => {
  let body = '';
  for await (const c of req) body += c;
  seen.push({ json: JSON.parse(body || '{}'), headers: req.headers });
  const json = JSON.parse(body || '{}');
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ id: 'm', type: 'message', role: 'assistant', model: json.model, stop_reason: 'end_turn', stop_sequence: null,
    usage: { input_tokens: 1000, output_tokens: 1000 },
    content: [{ type: 'text', text: JSON.stringify({ punkte: 50, rolle: false, ziel: true, kontext: false, format: false, lob: 'a', tipp: 'b', verbessert: 'c' }) }] }));
});
let server, base;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kiw-h-'));
before(async () => {
  await new Promise((r) => mock.listen(0, '127.0.0.1', r));
  delete process.env.KI_MODEL; // Standard verwenden
  Object.assign(process.env, { ANTHROPIC_BASE_URL: `http://127.0.0.1:${mock.address().port}`, ANTHROPIC_API_KEY: 'x', INVITE_CODES: 'H:Hanna', AUTH_MODE: 'codes' });
  for (const f of ['server.js', 'budget.js', 'auth.js', 'package.json']) fs.cpSync(path.resolve(f), path.join(tmp, f));
  fs.cpSync(path.resolve('public'), path.join(tmp, 'public'), { recursive: true });
  fs.symlinkSync(path.resolve('node_modules'), path.join(tmp, 'node_modules'));
  ({ server } = await import(path.join(tmp, 'server.js')));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); mock.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

test('Standard ist Haiku 5.5 – ohne fallbacks und ohne Fallback-Beta, Kosten mit Haiku-Preisen', async () => {
  assert.equal((await (await fetch(base + '/api/status')).json()).model, 'claude-haiku-5-5');
  const r = await fetch(base + '/api/judge', { method: 'POST', headers: { 'content-type': 'application/json', 'x-invite-code': 'H' }, body: JSON.stringify({ task: 't', prompt: 'p' }) });
  const d = await r.json();
  assert.equal(r.status, 200);
  const call = seen.at(-1);
  assert.equal(call.json.model, 'claude-haiku-5-5');
  assert.equal(call.json.fallbacks, undefined);
  assert.doesNotMatch(String(call.headers['anthropic-beta'] || ''), /fallback/);
  // 1000×0,10 + 1000×0,50 = 0,0006 $ → von 2 $ bleiben 1,9994 $
  assert.equal(d.budgetLeft, 1.9994);
});
