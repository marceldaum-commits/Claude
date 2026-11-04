// Docker-Wächter: sitzt zwischen Arena und Docker. Nur er hat den echten Docker-Socket.
// Die Arena spricht mit ihm über einen eigenen Socket und darf damit NUR:
//   * die erlaubten Lab-Images prüfen,
//   * abgeschottete Lab-Container anlegen (kein Netz, keine Host-Ordner, keine Sonderrechte),
//   * eigene Lab-Container starten, ansehen, Protokoll lesen, löschen,
//   * darin genau ein Terminal öffnen („runuser -l <name>“) und dessen Größe ändern.
// Alles andere (privilegierte Container, Host-Ordner einbinden, fremde Container, Images bauen …) wird abgelehnt.
// Zweck: Selbst wenn jemand die Arena übernimmt, bekommt er damit nicht den ganzen Server.

import http from 'node:http';
import net from 'node:net';
import { unlinkSync, chmodSync } from 'node:fs';

const DOCKER = process.env.DOCKER_SOCKET || '/var/run/docker.sock';
const HORCHEN = process.env.WAECHTER_SOCKET || '/run/waechter/docker.sock';
const IMAGE_RE = /^(kly-keller|nf-[a-z0-9-]{1,40})(:[a-z0-9._-]{1,40})?$/;
const NAME_RE = /^kly-arena-[a-z0-9-]{1,40}$/;
const CAPS = new Set(['CHOWN', 'DAC_OVERRIDE', 'FOWNER', 'SETUID', 'SETGID', 'KILL', 'AUDIT_WRITE', 'SYS_CHROOT', 'NET_BIND_SERVICE']);
const MB = 1024 * 1024;
const log = (...a) => console.log(new Date().toISOString(), 'wächter', ...a);

class Nein extends Error { constructor(m) { super(m); this.status = 403; } }
const pruef = (ok, warum) => { if (!ok) throw new Nein(warum); };
const nurSchluessel = (o, erlaubt, wo) => { for (const k of Object.keys(o || {})) pruef(erlaubt.includes(k), `${wo}: ${k} nicht erlaubt`); };
const istObj = (o) => o && typeof o === 'object' && !Array.isArray(o);

// ---------------------------------------------------------------- Docker direkt fragen
function docker(method, pfad, body) {
  return new Promise((ok, fehl) => {
    const r = http.request({ socketPath: DOCKER, method, path: pfad, headers: body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {} }, (res) => {
      const t = []; res.on('data', (d) => t.push(d)); res.on('end', () => ok({ status: res.statusCode, headers: res.headers, body: Buffer.concat(t) }));
    });
    r.on('error', fehl); r.setTimeout(30000, () => r.destroy(new Error('Zeitüberschreitung')));
    if (body) r.write(body); r.end();
  });
}

// Gehört ein Container zur Arena? (Label kly.arena=1, mit erlaubtem Image) – Ergebnis kurz merken
const arenaContainer = new Map(); // id/name -> ablauf
async function istArena(id) {
  pruef(/^[a-zA-Z0-9_.-]{1,128}$/.test(id), 'Container-ID ungültig');
  const m = arenaContainer.get(id); if (m && m > Date.now()) return true;
  const r = await docker('GET', `/containers/${encodeURIComponent(id)}/json`);
  if (r.status !== 200) return false;
  const j = JSON.parse(r.body.toString('utf8'));
  const ok = j?.Config?.Labels?.['kly.arena'] === '1' && IMAGE_RE.test(j?.Config?.Image || '') && j?.HostConfig?.NetworkMode === 'none' && !j?.HostConfig?.Privileged;
  if (ok) { arenaContainer.set(id, Date.now() + 60000); arenaContainer.set(j.Id, Date.now() + 60000); }
  if (arenaContainer.size > 5000) arenaContainer.clear();
  return ok;
}
const execs = new Map(); // exec-ID -> ablauf (nur über den Wächter angelegte Terminals)

// ---------------------------------------------------------------- Container anlegen: strenge Prüfung
function containerPruefen(b, name) {
  pruef(istObj(b), 'Ungültige Angaben');
  pruef(b.name === undefined || b.name === name, 'Name passt nicht');
  nurSchluessel(b, ['name', 'Image', 'Env', 'Labels', 'Hostname', 'HostConfig'], 'Container');
  pruef(typeof b.Image === 'string' && IMAGE_RE.test(b.Image), 'Image nicht erlaubt');
  pruef(Array.isArray(b.Env) && b.Env.length <= 8 && b.Env.every(e => typeof e === 'string' && /^KLY_[A-Z_]{1,20}=[A-Za-z0-9-]{0,80}$/.test(e)), 'Umgebung nicht erlaubt');
  pruef(istObj(b.Labels) && b.Labels['kly.arena'] === '1' && Object.keys(b.Labels).every(k => /^kly\.[a-z]{1,20}$/.test(k)) && Object.values(b.Labels).every(v => typeof v === 'string' && v.length <= 80), 'Labels nicht erlaubt');
  pruef(b.Hostname === undefined || (typeof b.Hostname === 'string' && /^[a-z0-9-]{1,30}$/.test(b.Hostname)), 'Hostname ungültig');
  const h = b.HostConfig; pruef(istObj(h), 'HostConfig fehlt');
  nurSchluessel(h, ['NetworkMode', 'Memory', 'MemorySwap', 'NanoCpus', 'PidsLimit', 'CapDrop', 'CapAdd', 'SecurityOpt', 'AutoRemove', 'Tmpfs', 'LogConfig', 'Ulimits'], 'HostConfig');
  pruef(h.NetworkMode === 'none', 'Nur ohne Netzwerk');
  pruef(Number.isInteger(h.Memory) && h.Memory > 0 && h.Memory <= 512 * MB, 'Speichergrenze fehlt');
  pruef(h.MemorySwap === h.Memory, 'Swap nicht erlaubt');
  pruef(Number.isInteger(h.NanoCpus) && h.NanoCpus > 0 && h.NanoCpus <= 1e9, 'CPU-Grenze fehlt');
  pruef(Number.isInteger(h.PidsLimit) && h.PidsLimit > 0 && h.PidsLimit <= 256, 'Prozessgrenze fehlt');
  pruef(Array.isArray(h.CapDrop) && h.CapDrop.includes('ALL'), 'CapDrop ALL fehlt');
  pruef(Array.isArray(h.CapAdd) && h.CapAdd.every(c => CAPS.has(c)), 'Capability nicht erlaubt');
  pruef(Array.isArray(h.SecurityOpt) && h.SecurityOpt.length === 1 && h.SecurityOpt[0] === 'no-new-privileges', 'no-new-privileges fehlt');
  pruef(h.AutoRemove === true, 'AutoRemove fehlt');
  pruef(istObj(h.Tmpfs) && Object.entries(h.Tmpfs).length <= 10 && Object.entries(h.Tmpfs).every(([p, o]) =>
    /^\/[a-z0-9/_.-]{1,60}$/.test(p) && !p.includes('..') && !/^\/(proc|sys|dev)(\/|$)/.test(p)
    && typeof o === 'string' && /^[a-z0-9=,]{1,80}$/.test(o) && /(^|,)size=\d{1,3}m(,|$)/.test(o) && +o.match(/size=(\d+)m/)[1] <= 64), 'tmpfs nicht erlaubt');
  pruef(istObj(h.LogConfig) && h.LogConfig.Type === 'json-file', 'LogConfig nicht erlaubt');
  pruef(Array.isArray(h.Ulimits) && h.Ulimits.every(u => istObj(u) && ['fsize', 'nofile', 'nproc'].includes(u.Name)), 'Ulimits nicht erlaubt');
}

function execPruefen(b) {
  pruef(istObj(b), 'Ungültige Angaben');
  nurSchluessel(b, ['Cmd', 'AttachStdin', 'AttachStdout', 'AttachStderr', 'Tty', 'Env'], 'Exec');
  pruef(Array.isArray(b.Cmd) && b.Cmd.length === 3 && b.Cmd[0] === 'runuser' && b.Cmd[1] === '-l' && /^[a-z][a-z0-9]{0,20}$/.test(b.Cmd[2]) && b.Cmd[2] !== 'root', 'Nur ein Terminal als Lab-Benutzer');
  pruef(b.Env === undefined || (Array.isArray(b.Env) && b.Env.every(e => /^(TERM|LANG)=[A-Za-z0-9._-]{1,30}$/.test(e))), 'Umgebung nicht erlaubt');
}

// ---------------------------------------------------------------- Weiterleiten
function weiter(req, res, body) {
  const r = http.request({ socketPath: DOCKER, method: req.method, path: req.url, headers: { ...req.headers, host: 'docker' } }, (dr) => {
    res.writeHead(dr.statusCode, dr.headers); dr.pipe(res);
  });
  r.on('error', (e) => { log('docker', e.message); if (!res.headersSent) res.writeHead(502); res.end(); });
  if (body) r.end(body); else req.pipe(r); // ungeprüfter Inhalt (z. B. Größe) – kleine Anfragen, Docker erwartet ihn
}
async function lesen(req, max = 64 * 1024) {
  const t = []; let n = 0;
  for await (const d of req) { n += d.length; if (n > max) throw new Nein('Anfrage zu groß'); t.push(d); }
  return Buffer.concat(t);
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://w');
    const p = u.pathname.replace(/^\/v1\.\d{1,3}(?=\/)/, '');
    const m = req.method;
    let x;
    if (m === 'GET' && (x = p.match(/^\/images\/(.+)\/json$/))) { pruef(IMAGE_RE.test(decodeURIComponent(x[1])), 'Image nicht erlaubt'); return weiter(req, res); }
    if (m === 'GET' && p === '/containers/json') {
      const f = JSON.parse(u.searchParams.get('filters') || '{}');
      pruef(Array.isArray(f.label) && f.label.includes('kly.arena=1'), 'Nur Arena-Container auflisten');
      return weiter(req, res);
    }
    if (m === 'POST' && p === '/containers/create') {
      const name = u.searchParams.get('name') || '';
      pruef(NAME_RE.test(name), 'Containername nicht erlaubt');
      const b = await lesen(req); containerPruefen(JSON.parse(b.toString('utf8')), name);
      // Docker liest aus der Adresse nur „name“ (und „platform“) – wir geben ausschließlich den geprüften Namen weiter
      req.url = `/containers/create?name=${encodeURIComponent(name)}`;
      return weiter(req, res, b);
    }
    if ((x = p.match(/^\/containers\/([^/]+)(\/(start|json|logs|exec))?$/))) {
      const id = decodeURIComponent(x[1]), was = x[3] || '';
      const passt = (m === 'POST' && (was === 'start' || was === 'exec')) || (m === 'GET' && (was === 'json' || was === 'logs')) || (m === 'DELETE' && was === '');
      pruef(passt, 'Aktion nicht erlaubt');
      pruef(await istArena(id), 'Kein Arena-Container');
      if (was === 'exec') {
        const b = await lesen(req); execPruefen(JSON.parse(b.toString('utf8')));
        const r = await docker('POST', `/containers/${encodeURIComponent(id)}/exec`, b.toString('utf8'));
        if (r.status === 201) { try { execs.set(JSON.parse(r.body.toString('utf8')).Id, Date.now() + 10 * 60000); } catch { /* */ } }
        res.writeHead(r.status, { 'Content-Type': 'application/json' }); return res.end(r.body);
      }
      if (m === 'GET' && was === 'logs') pruef([...u.searchParams.keys()].every(k => ['stdout', 'stderr', 'tail', 'follow', 'timestamps'].includes(k)) && u.searchParams.get('follow') !== 'true' && u.searchParams.get('follow') !== '1', 'Parameter nicht erlaubt');
      return weiter(req, res);
    }
    if (m === 'POST' && (x = p.match(/^\/exec\/([0-9a-f]{64})\/resize$/))) { pruef((execs.get(x[1]) || 0) > Date.now(), 'Unbekanntes Terminal'); return weiter(req, res); }
    if (m === 'POST' && p.match(/^\/exec\/([0-9a-f]{64})\/start$/)) throw new Nein('Terminal nur per Upgrade');
    throw new Nein(`${m} ${p} nicht erlaubt`);
  } catch (e) {
    const st = e.status || 400; if (st === 403) log('abgelehnt:', req.method, req.url.slice(0, 120), '–', e.message);
    if (!res.headersSent) res.writeHead(st, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: `Wächter: ${e.message}` }));
  }
});

// Terminal starten: Docker „hijackt“ die Verbindung (Upgrade: tcp) – hier roh durchreichen, aber nur für eigene Terminals
server.on('upgrade', (req, sock, head) => {
  const p = new URL(req.url, 'http://w').pathname.replace(/^\/v1\.\d{1,3}(?=\/)/, '');
  const x = req.method === 'POST' && p.match(/^\/exec\/([0-9a-f]{64})\/start$/);
  const ablauf = x && execs.get(x[1]);
  if (!x || !ablauf || ablauf < Date.now()) { log('abgelehnt: Upgrade', req.method, p.slice(0, 80)); sock.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return; }
  execs.delete(x[1]); execs.set(x[1], Date.now() + 24 * 3600000); // ab jetzt nur noch Größe ändern
  const d = net.connect(DOCKER, () => {
    let kopf = `${req.method} ${req.url} HTTP/1.1\r\n`;
    for (let i = 0; i < req.rawHeaders.length; i += 2) kopf += `${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`;
    d.write(kopf + '\r\n'); if (head?.length) d.write(head);
    d.pipe(sock); sock.pipe(d);
  });
  const zu = () => { d.destroy(); sock.destroy(); };
  d.on('error', zu); sock.on('error', zu); d.on('close', zu); sock.on('close', zu);
});
server.on('clientError', (e, s) => s.destroy());

setInterval(() => { const t = Date.now(); for (const [k, v] of execs) if (v < t) execs.delete(k); }, 60000).unref();
try { unlinkSync(HORCHEN); } catch { /* */ }
server.listen(HORCHEN, () => { chmodSync(HORCHEN, 0o666); log(`lauscht auf ${HORCHEN}, Docker: ${DOCKER}`); });
process.on('SIGTERM', () => process.exit(0));
