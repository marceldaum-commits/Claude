// Kali Level Up – Arena
// Startet pro Spieler einen eigenen, abgeschotteten Lab-Container (z. B. den Kellerserver) und verbindet ihn
// über WebSocket mit einem Terminal im Browser (xterm.js). Kein Port des Containers wird veröffentlicht.
//
// Sicherheit (Grundgerüst – vor öffentlichem Betrieb von einer Fachperson prüfen lassen):
//   * Netzwerk „none“: Container haben NUR localhost – kein Internet, kein Kontakt zu anderen Spielern.
//   * Capabilities stark reduziert, no-new-privileges, Speicher/CPU/Prozess-Grenzen.
//   * Automatisches Aufräumen nach Ablaufzeit und bei Leerlauf; Obergrenzen pro IP und insgesamt.
//   * Zugang (Beta): Einladungscode ARENA_CODE. Der Dienst selbst braucht Zugriff auf den Docker-Socket
//     (= root-ähnlich) – deshalb nur auf einem eigenen, dafür vorgesehenen Server betreiben.

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Docker from 'dockerode';
import { WebSocketServer } from 'ws';

const DIR = dirname(fileURLToPath(import.meta.url));
const env = (k, d) => process.env[k] ?? d;
const CFG = {
  port: +env('PORT', 8090),
  host: env('HOST', '127.0.0.1'),            // hinter Caddy: nur lokal lauschen
  code: env('ARENA_CODE', ''),               // Einladungscode (leer = Arena gesperrt)
  maxTotal: +env('MAX_SESSIONS', 20),
  maxPerIp: +env('MAX_PER_IP', 2),
  ttlMin: +env('SESSION_MINUTES', 120),
  idleMin: +env('IDLE_MINUTES', 20),
  memMb: +env('MEMORY_MB', 256),
  cpus: +env('CPUS', 0.5),
  pids: +env('PIDS', 128),
  trustProxy: env('TRUST_PROXY', '1') === '1',
  appOrigin: env('APP_ORIGIN', 'https://kali-level-up.pages.dev'),
};

// Verfügbare Labs. user = als wer das Terminal startet; ready = Logzeile, wenn der Container bereit ist.
const LABS = {
  keller: { image: env('KELLER_IMAGE', 'kly-keller'), user: 'azubi', ready: 'Kellerserver bereit', title: 'Der Kellerserver',
    hello: '\x1b[32mKellerserver (Arena)\x1b[0m – du bist azubi.\r\nNächstes Konto: ssh NAME@localhost\r\nZurück: exit\r\n\r\n' },
};

const docker = new Docker({ socketPath: env('DOCKER_SOCKET', '/var/run/docker.sock') });
const sessions = new Map(); // id -> { id, lab, containerId, ip, created, lastSeen, token }
const log = (...a) => console.log(new Date().toISOString(), ...a);

function clientIp(req) {
  if (CFG.trustProxy && req.headers['x-forwarded-for']) return String(req.headers['x-forwarded-for']).split(',')[0].trim();
  return req.socket.remoteAddress || '?';
}
function codeOk(given) {
  if (!CFG.code) return false;
  const a = Buffer.from(String(given || '')), b = Buffer.from(CFG.code);
  return a.length === b.length && timingSafeEqual(a, b);
}
const json = (res, status, obj) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };

async function readBody(req, limit = 4096) {
  let size = 0; const chunks = [];
  for await (const c of req) { size += c.length; if (size > limit) throw new Error('zu groß'); chunks.push(c); }
  return Buffer.concat(chunks).toString('utf8');
}

async function waitReady(container, marker, ms = 20000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const logs = (await container.logs({ stdout: true, stderr: true, tail: 50 })).toString('utf8');
    if (logs.includes(marker)) return true;
    const st = await container.inspect();
    if (!st.State.Running) throw new Error('Lab beendet sich beim Start: ' + logs.slice(-300));
    await new Promise(r => setTimeout(r, 400));
  }
  throw new Error('Lab nicht rechtzeitig bereit');
}

async function createSession(lab, token, ip) {
  const L = LABS[lab];
  if (!L) throw Object.assign(new Error('Unbekanntes Lab'), { status: 400 });
  if (!/^KLY-[0-9A-F]{6}$/.test(token)) throw Object.assign(new Error('Ungültiger Lab-Token'), { status: 400 });
  if (sessions.size >= CFG.maxTotal) throw Object.assign(new Error('Die Arena ist gerade voll – bitte später noch einmal versuchen.'), { status: 503 });
  if ([...sessions.values()].filter(s => s.ip === ip).length >= CFG.maxPerIp) throw Object.assign(new Error('Du hast schon zu viele Labs offen. Schließe erst eins.'), { status: 429 });

  const id = randomBytes(16).toString('hex');
  const container = await docker.createContainer({
    Image: L.image,
    name: `kly-arena-${lab}-${id.slice(0, 10)}`,
    Env: [`KLY_TOKEN=${token}`],
    Labels: { 'kly.arena': '1', 'kly.session': id, 'kly.expires': String(Date.now() + CFG.ttlMin * 60000) },
    Hostname: 'keller',
    HostConfig: {
      NetworkMode: 'none',                       // nur localhost
      Memory: CFG.memMb * 1024 * 1024, MemorySwap: CFG.memMb * 1024 * 1024,
      NanoCpus: Math.round(CFG.cpus * 1e9),
      PidsLimit: CFG.pids,
      CapDrop: ['ALL'],
      CapAdd: ['CHOWN', 'DAC_OVERRIDE', 'FOWNER', 'SETUID', 'SETGID', 'KILL', 'AUDIT_WRITE', 'SYS_CHROOT', 'NET_BIND_SERVICE'],
      SecurityOpt: ['no-new-privileges'],
      AutoRemove: true,
      Tmpfs: { '/tmp': 'rw,noexec,nosuid,size=16m' },
    },
  });
  await container.start();
  try { await waitReady(container, L.ready); }
  catch (e) { await container.remove({ force: true }).catch(() => {}); throw e; }
  const s = { id, lab, containerId: container.id, ip, created: Date.now(), lastSeen: Date.now(), token };
  sessions.set(id, s);
  log('start', lab, id.slice(0, 8), ip);
  return s;
}

async function endSession(id, why) {
  const s = sessions.get(id); if (!s) return;
  sessions.delete(id);
  await docker.getContainer(s.containerId).remove({ force: true }).catch(() => {});
  log('ende', s.lab, id.slice(0, 8), why);
}

// Aufräumen: abgelaufene/leerlaufende Sitzungen und verwaiste Container (z. B. nach Neustart des Dienstes)
async function reap() {
  const now = Date.now();
  for (const s of sessions.values()) {
    if (now - s.created > CFG.ttlMin * 60000) await endSession(s.id, 'Zeit abgelaufen');
    else if (now - s.lastSeen > CFG.idleMin * 60000) await endSession(s.id, 'Leerlauf');
  }
  const list = await docker.listContainers({ all: true, filters: { label: ['kly.arena=1'] } }).catch(() => []);
  for (const c of list) if (!sessions.has(c.Labels['kly.session'])) await docker.getContainer(c.Id).remove({ force: true }).catch(() => {});
}
setInterval(() => reap().catch(e => log('reap', e.message)), 60000).unref();

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css' };
const SEC_HEADERS = {
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'",
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (req.method === 'GET' && url.pathname === '/api/status') return json(res, 200, { ok: true, labs: Object.keys(LABS), frei: CFG.maxTotal - sessions.size, offen: !!CFG.code });
    if (req.method === 'POST' && url.pathname === '/api/session') {
      const ip = clientIp(req);
      let body; try { body = JSON.parse(await readBody(req)); } catch { return json(res, 400, { fehler: 'Ungültige Anfrage' }); }
      if (!codeOk(body.code)) return json(res, 403, { fehler: 'Einladungscode falsch oder Arena geschlossen.' });
      try { const s = await createSession(String(body.lab || ''), String(body.token || ''), ip); return json(res, 200, { id: s.id, ablauf: s.created + CFG.ttlMin * 60000 }); }
      catch (e) { log('fehler', e.message); return json(res, e.status || 500, { fehler: e.status ? e.message : 'Lab konnte nicht gestartet werden.' }); }
    }
    if (req.method === 'DELETE' && url.pathname.startsWith('/api/session/')) { await endSession(url.pathname.split('/').pop(), 'beendet'); return json(res, 200, { ok: true }); }
    if (req.method === 'GET') {
      const p = url.pathname === '/' ? '/index.html' : url.pathname;
      if (!/^\/[a-z0-9._-]+$/i.test(p)) { res.writeHead(404); return res.end(); }
      const data = await readFile(join(DIR, 'public', p)).catch(() => null);
      if (!data) { res.writeHead(404); return res.end('Nicht gefunden'); }
      res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream', ...SEC_HEADERS });
      return res.end(data);
    }
    res.writeHead(405); res.end();
  } catch (e) { log('http', e.message); res.writeHead(500); res.end(); }
});

// Terminal: /api/term/<id> – verbindet WebSocket mit einer TTY im Container
const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
server.on('upgrade', (req, socket, head) => {
  const m = req.url.match(/^\/api\/term\/([0-9a-f]{32})$/);
  const s = m && sessions.get(m[1]);
  if (!s) { socket.destroy(); return; }
  wss.handleUpgrade(req, socket, head, (ws) => attach(ws, s));
});

async function attach(ws, s) {
  const L = LABS[s.lab];
  try {
    const c = docker.getContainer(s.containerId);
    const exec = await c.exec({ Cmd: ['runuser', '-l', L.user], AttachStdin: true, AttachStdout: true, AttachStderr: true, Tty: true, Env: ['TERM=xterm-256color', 'LANG=C.UTF-8'] });
    const stream = await exec.start({ hijack: true, stdin: true, Tty: true });
    ws.send(L.hello);
    stream.on('data', (d) => { s.lastSeen = Date.now(); if (ws.readyState === 1) ws.send(d.toString('utf8')); });
    stream.on('end', () => { if (ws.readyState === 1) ws.close(1000, 'Sitzung beendet'); });
    ws.on('message', async (raw) => {
      s.lastSeen = Date.now();
      const msg = raw.toString();
      if (msg.startsWith('\u0000resize:')) { const [w, h] = msg.slice(8).split('x').map(Number); if (w > 0 && h > 0 && w < 500 && h < 300) exec.resize({ w, h }).catch(() => {}); return; }
      stream.write(msg);
    });
    ws.on('close', () => { try { stream.end(); } catch { /* */ } });
  } catch (e) { log('attach', e.message); ws.close(1011, 'Terminal-Fehler'); }
}

process.on('SIGTERM', async () => { for (const id of [...sessions.keys()]) await endSession(id, 'Dienst stoppt'); process.exit(0); });
reap().catch(() => {});
server.listen(CFG.port, CFG.host, () => log(`Arena lauscht auf ${CFG.host}:${CFG.port} · Labs: ${Object.keys(LABS).join(', ')} · Code ${CFG.code ? 'gesetzt' : 'FEHLT (Arena gesperrt)'}`));
