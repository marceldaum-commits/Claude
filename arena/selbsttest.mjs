// Arena-Selbsttest: startet JEDES Lab-Image kurz und prüft, ob es sauber „bereit" meldet.
// Findet kaputte Räume (Build/Startfehler) früh. Schreibt einen Bericht nach public/selbsttest.json
// (öffentlich lesbar, ohne Geheimnisse) und schickt bei Fehlern best-effort eine Mail an das Team.
// Läuft auf dem Server (braucht Docker). Aufruf (als root, per nächtlichem Cron):  node selbsttest.mjs
import Docker from 'dockerode';
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const docker = new Docker({ socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock' });
const MAIL_AN = process.env.MELDE_AN || 'info@nachtfalter.tech';
const TOKEN = 'KLY-ABCDEF';
const TTL = Number(process.env.SELBSTTEST_TIMEOUT || 30000);
const wait = (ms) => new Promise(r => setTimeout(r, ms));

// Lab-Liste aus server.js lesen: image (Default-Tag) + ready-Marker + Titel.
function labs() {
  const src = readFileSync(new URL('./server.js', import.meta.url), 'utf8');
  const block = src.slice(src.indexOf('const LABS = {'), src.indexOf('\n};', src.indexOf('const LABS = {')));
  const out = [];
  for (const m of block.matchAll(/(\w+): \{ image: env\('[^']+', '([^']+)'\)[\s\S]*?ready: '([^']+)'[\s\S]*?title: '([^']+)'/g)) {
    out.push({ id: m[1], image: m[2], ready: m[3], titel: m[4] });
  }
  return out;
}

async function pruefeEines(L) {
  let c;
  try {
    c = await docker.createContainer({
      Image: L.image, name: `kly-selbsttest-${L.id}-${Date.now().toString(36)}`,
      Env: [`KLY_TOKEN=${TOKEN}`], Hostname: 'test',
      HostConfig: {
        NetworkMode: 'none', Memory: 256 * 1024 * 1024, MemorySwap: 256 * 1024 * 1024,
        NanoCpus: 1e9, PidsLimit: 256, CapDrop: ['ALL'],
        CapAdd: ['CHOWN', 'DAC_OVERRIDE', 'FOWNER', 'SETUID', 'SETGID', 'KILL', 'AUDIT_WRITE', 'SYS_CHROOT', 'NET_BIND_SERVICE'],
        SecurityOpt: ['no-new-privileges'], AutoRemove: false,
        Tmpfs: { '/tmp': 'rw,nosuid,size=16m', '/var/tmp': 'rw,nosuid,size=16m', '/run/lock': 'rw,nosuid,size=1m', '/home': 'rw,exec,nosuid,size=48m,mode=755' },
      },
    });
    await c.start();
    const ende = Date.now() + TTL;
    while (Date.now() < ende) {
      const log = (await c.logs({ stdout: true, stderr: true, tail: 60 })).toString('utf8');
      if (log.includes(L.ready)) return { ok: true };
      const st = await c.inspect();
      if (!st.State.Running) return { ok: false, grund: 'Container beendet sich beim Start', log: log.slice(-400) };
      await wait(500);
    }
    const log = (await c.logs({ stdout: true, stderr: true, tail: 60 })).toString('utf8');
    return { ok: false, grund: `nicht rechtzeitig „${L.ready}"`, log: log.slice(-400) };
  } catch (e) {
    return { ok: false, grund: 'Start-/Build-Fehler: ' + String(e.message || e).slice(0, 200) };
  } finally {
    if (c) { try { await c.remove({ force: true }); } catch { /* */ } }
  }
}

function mailen(fehler) {
  const text = `Arena-Selbsttest: ${fehler.length} Raum/Räume defekt.\n\n` +
    fehler.map(f => `• ${f.titel} (${f.id}): ${f.grund}\n${(f.log || '').split('\n').slice(-6).join('\n')}`).join('\n\n');
  try {
    const r = spawnSync('sendmail', ['-t'], { input: `To: ${MAIL_AN}\nSubject: [Nachtfalter] Arena-Selbsttest: ${fehler.length} defekt\nContent-Type: text/plain; charset=utf-8\n\n${text}\n`, timeout: 20000 });
    return r.status === 0;
  } catch { return false; }
}

const start = Date.now();
const L = labs();
const ergebnisse = [];
for (const lab of L) {
  const r = await pruefeEines(lab);
  ergebnisse.push({ id: lab.id, titel: lab.titel, image: lab.image, ...r });
  console.log((r.ok ? '✓' : '✗') + ' ' + lab.id + (r.ok ? '' : ' – ' + r.grund));
}
const fehler = ergebnisse.filter(r => !r.ok);
const bericht = {
  zeit: new Date().toISOString(), dauer_s: Math.round((Date.now() - start) / 1000),
  gesamt: L.length, ok: L.length - fehler.length, defekt: fehler.length,
  raeume: ergebnisse.map(({ id, titel, ok, grund }) => ({ id, titel, ok, grund: grund || '' })),
};
try { writeFileSync(new URL('./public/selbsttest.json', import.meta.url), JSON.stringify(bericht, null, 1)); } catch (e) { console.error('schreiben', String(e)); }
if (fehler.length) { const g = mailen(fehler); console.log(`${fehler.length} defekt – Mail an ${MAIL_AN}: ${g ? 'ok' : 'nicht möglich'}`); }
console.log(`Selbsttest fertig: ${bericht.ok}/${bericht.gesamt} ok, ${bericht.defekt} defekt.`);
process.exit(fehler.length ? 1 : 0);
