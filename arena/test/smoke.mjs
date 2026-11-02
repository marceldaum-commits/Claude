// Rauchtest: Arena starten (muss laufen), Lab anfordern, Terminal bedienen, Abschottung prüfen.
// Aufruf: ARENA=http://127.0.0.1:8090 CODE=test node test/smoke.mjs
import WebSocket from 'ws';
import { createHash } from 'node:crypto';
const BASE = process.env.ARENA || 'http://127.0.0.1:8090', CODE = process.env.CODE || 'test', TOKEN = 'KLY-ABC123';
const flag = (n) => 'KLY{' + createHash('sha256').update(`${TOKEN}:w2:${n}`).digest('hex').slice(0, 16) + '}';
let fail = 0; const ok = (c, m) => { console.log(c ? '✓' : '✗', m); if (!c) fail++; };

const post = (body) => fetch(BASE + '/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
ok((await post({ lab: 'keller', token: TOKEN, code: 'falsch' })).status === 403, 'falscher Code abgewiesen');
ok((await post({ lab: 'keller', token: 'nix', code: CODE })).status === 400, 'ungültiger Token abgewiesen');
const r = await post({ lab: 'keller', token: TOKEN, code: CODE }); const j = await r.json();
ok(r.ok && /^[0-9a-f]{32}$/.test(j.id), 'Lab gestartet: ' + JSON.stringify(j).slice(0, 80));

const ws = new WebSocket(BASE.replace('http', 'ws') + '/api/term/' + j.id);
let out = '';
ws.on('message', (d) => { out += d.toString(); });
await new Promise(res => ws.on('open', res));
const wait = (ms) => new Promise(res => setTimeout(res, ms));
const run = async (cmd, ms = 1200) => { const before = out.length; ws.send(cmd + '\r'); await wait(ms); return out.slice(before); };
await wait(1500);
ok((await run('whoami')).includes('azubi'), 'Terminal läuft als azubi');
ok((await run('cat schreibtisch/.pinnwand/zettel.txt')).includes(flag('l1')), 'Level-1-Code mit dem Token des Spielers');
let o = await run('ssh -o StrictHostKeyChecking=no meier@localhost', 2500);
ok(/password/i.test(o), 'ssh fragt nach Passwort');
o = await run(flag('l1'), 2500);
ok((await run('whoami')).includes('meier'), 'Wechsel zu meier per ssh in der Arena');
await run('exit', 800);
ok(/NETZ=\[lo\]/.test(await run('echo "NETZ=[$(ls /sys/class/net | tr "\\n" " " | sed "s/ *$//")]"')), 'nur localhost-Netz (lo)');
ok(/RC=(6|7)/.test(await run('curl -s -m 4 http://1.1.1.1 -o /dev/null; echo RC=$?', 6000)), 'kein Internet aus dem Container (curl schlägt fehl)');
ok((await run('cat /proc/1/environ 2>&1 | head -c 40')).match(/Permission denied|Keine/i), 'Umgebung von PID 1 (Token) nicht lesbar');
ws.close();
const st = await (await fetch(BASE + '/api/status')).json(); ok(st.ok, 'Status: ' + JSON.stringify(st));
await fetch(BASE + '/api/session/' + j.id, { method: 'DELETE' });
await wait(1500);
console.log(fail ? `${fail} FEHLER` : 'alles ok');
process.exit(fail ? 1 : 0);
