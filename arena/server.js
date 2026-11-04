// Kali Level Up – Arena
// Startet pro Spieler einen eigenen, abgeschotteten Lab-Container (z. B. den Kellerserver) und verbindet ihn
// über WebSocket mit einem Terminal im Browser (xterm.js). Kein Port des Containers wird veröffentlicht.
//
// Sicherheit (Grundgerüst – vor öffentlichem Betrieb von einer Fachperson prüfen lassen):
//   * Netzwerk „none“: Container haben NUR localhost – kein Internet, kein Kontakt zu anderen Spielern.
//   * Capabilities stark reduziert, no-new-privileges, Speicher/CPU/Prozess-Grenzen.
//   * Automatisches Aufräumen nach Ablaufzeit und bei Leerlauf; Obergrenzen pro IP und insgesamt.
//   * Zugang: Nachtfalter-Konto (Supabase-Anmeldung + gültiger Zugang „arena“ oder „alles“, vergeben in der Zentrale
//     oder per Einladungscode). Übergangsweise geht auch noch der alte Einladungscode ARENA_CODE. Der Dienst selbst braucht Zugriff auf den Docker-Socket
//     (= root-ähnlich) – deshalb nur auf einem eigenen, dafür vorgesehenen Server betreiben.

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomBytes, createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Docker from 'dockerode';
import { WebSocketServer } from 'ws';

const DIR = dirname(fileURLToPath(import.meta.url));
const env = (k, d) => process.env[k] ?? d;
const CFG = {
  port: +env('PORT', 8090),
  host: env('HOST', '127.0.0.1'),            // hinter Caddy: nur lokal lauschen
  maxTotal: +env('MAX_SESSIONS', 20),
  maxPerIp: +env('MAX_PER_IP', 2),
  ttlMin: +env('SESSION_MINUTES', 120),
  idleMin: +env('IDLE_MINUTES', 20),
  memMb: +env('MEMORY_MB', 256),
  cpus: +env('CPUS', 0.5),
  pids: +env('PIDS', 128),
  trustProxy: env('TRUST_PROXY', '1') === '1',
  appOrigin: env('KONTO_APP', 'https://app.nachtfalter.tech'), // (alte Variable APP_ORIGIN zeigte noch auf Cloudflare)
  // Nachtfalter-Konto: öffentliche Adresse + öffentlicher Schlüssel (kein Geheimnis – steht auch in der App)
  konto: env('KONTO', '1') === '1',
  kontoUrl: env('KONTO_URL', 'https://sxapebxzxmathkvtuuvn.supabase.co'),
  kontoKey: env('KONTO_KEY', 'sb_publishable_04l6lOd2uIPsErdWDOMvew_U6vsFGbn'),
  maxPerUser: +env('MAX_PER_USER', 2),
  // Geheimnis für die Codes (nur auf dem Server, vom Deploy-Skript erzeugt). Ohne Geheimnis keine Code-Prüfung.
  geheimnis: env('ARENA_GEHEIMNIS', ''),
  origin: env('ARENA_ORIGIN', 'https://arena.nachtfalter.tech'), // eigene Adresse (für die WebSocket-Prüfung)
};

// Verfügbare Labs. user = als wer das Terminal startet; ready = Logzeile, wenn der Container bereit ist.
// produkt = welcher Zugang nötig ist („alles“ und Verwaltung dürfen immer; „arena-profi“ schließt „arena“ ein).
const hallo = (t, u, tipp = 'Nächstes Konto: ssh NAME@localhost') => `\x1b[32m${t} (Arena)\x1b[0m – du bist ${u}.\r\n${tipp}\r\nZurück: exit\r\n\r\n`;
const LABS = {
  keller: { image: env('KELLER_IMAGE', 'kly-keller'), user: 'azubi', ready: 'Kellerserver bereit', title: 'Der Kellerserver', host: 'keller',
    produkt: 'arena', stufe: 'Einsteiger', levels: 10, praefix: 'w2', codesInApp: true,
    kurz: 'Ein alter Firmenserver: Arbeite dich Konto für Konto bis zum Chef durch – versteckte Dateien, Verläufe, Rechte, Schlüssel.',
    hello: hallo('Kellerserver', 'azubi') },
  leitstelle: { image: env('LEITSTELLE_IMAGE', 'nf-leitstelle'), user: 'funker', ready: 'Leitstelle bereit', title: 'Die Leitstelle', host: 'leitstelle',
    produkt: 'arena-profi', stufe: 'Fortgeschritten', levels: 6, praefix: 'leitstelle', tmpfs: { '/opt/schichtwechsel': 'rw,exec,nosuid,size=4m' },
    kurz: 'Netzwerk & Dienste: offene Ports finden, mit Diensten sprechen, versteckte Web-Bereiche, eigenes Protokoll, Protokolle auswerten, unsichere Automatik.',
    hello: hallo('Leitstelle Nordhafen', 'funker') },
  tresor: { image: env('TRESOR_IMAGE', 'nf-tresor'), user: 'gast', ready: 'Tresor bereit', title: 'Der Tresor', host: 'tresor',
    produkt: 'arena-profi', stufe: 'Experte', levels: 6, praefix: 'tresor', tmpfs: { '/opt/tresor/werkzeuge': 'rw,exec,nosuid,size=4m', '/opt/tresor/pruefung': 'rw,exec,nosuid,size=1m' },
    kurz: 'Für Experten: Passwort-Hash knacken, Geheimnisse in Git und Logs, PATH-Falle, Pfad-Ausbruch in einer API, verschlüsselter Tresor.',
    hello: hallo('Bankhaus Falkenstein', 'gast') },
  webshop: { image: env('WEBSHOP_IMAGE', 'nf-webshop'), user: 'kunde', ready: 'Webshop bereit', title: 'Der Webshop', host: 'kontor',
    produkt: 'arena-profi', stufe: 'Fortgeschritten', levels: 6, praefix: 'webshop', tmpfs: { '/opt/shop': 'rw,nosuid,size=16m' },
    kurz: 'Web-Hacking mit curl: vergessener Testzugang, fremde Bestellungen, Rollen-Cookie fälschen, SQL-Injection, Befehle einschleusen, Signatur selbst bauen.',
    hello: hallo('Kräuterkontor-Shop', 'kunde', 'Dein Auftrag: cat ~/auftrag.txt   ·   Shop: curl http://localhost:8000/') },
  einbruch: { image: env('EINBRUCH_IMAGE', 'nf-einbruch'), user: 'ermittler', ready: 'Einbruch bereit', title: 'Der Einbruch', host: 'forensik',
    produkt: 'arena-profi', stufe: 'Experte', levels: 6, praefix: 'einbruch',
    kurz: 'Blue Team: Ein Server wurde gehackt. Finde in Protokollen, Verlauf, Cronjobs und verschleierter Schadsoftware heraus, wer, wie und was gestohlen hat.',
    hello: hallo('Ermittlung Kräuterkontor', 'ermittler', 'Dein Fall: cat ~/fall.txt   ·   Fragen: akte fragen') },
  spuren: { image: env('SPUREN_IMAGE', 'nf-spuren'), user: 'ermittler', ready: 'Spurensuche bereit', title: 'Die Spurensuche', host: 'gartenbau',
    produkt: 'arena', stufe: 'Einsteiger', levels: 5, praefix: 'spuren',
    kurz: 'Deine erste Ermittlung: Wer hat nachts die Firmen-Webseite verändert? Mit ls, grep, diff und base64 den Spuren folgen.',
    hello: hallo('Ermittlung Gartenbau Grün', 'ermittler', 'Dein Fall: cat ~/fall.txt   ·   Fragen: akte fragen') },
  maulwurf: { image: env('MAULWURF_IMAGE', 'nf-maulwurf'), user: 'ermittler', ready: 'Maulwurf bereit', title: 'Der Maulwurf', host: 'nordwerk',
    produkt: 'arena-profi', stufe: 'Extrem', levels: 6, praefix: 'maulwurf',
    kurz: 'Werksspionage von innen: Zeitzonen, wiederverwendete IP-Adressen, DNS-Ausleitung zusammensetzen, Prüfsummen, Zeitstempel, verschlüsseltes Archiv.',
    hello: hallo('Ermittlung Nordwerk', 'ermittler', 'Dein Fall: cat ~/fall.txt   ·   Fragen: akte fragen') },
  abwehr1: { image: env('ABWEHR1_IMAGE', 'nf-abwehr1'), user: 'verteidiger', ready: 'Abwehr bereit', title: 'Angriff! Offene Türen', host: 'mein-pc',
    produkt: 'arena', stufe: 'Einsteiger', levels: 5, praefix: 'abwehr1', tmpfs: { '/srv/app': 'rw,exec,nosuid,size=16m' },
    kurz: 'Ein Hacker-Bot greift deinen Rechner live an. Mach die Lücken dicht, bevor er Schaden anrichtet: Passwort, Rechte, Debug-Modus, Upload-Ordner, fremder Schlüssel.',
    hello: hallo('Angriff! Stufe 1', 'verteidiger', 'Lagebild: lage   ·   live: tail -f /var/log/angriff.log   ·   cat ~/LIESMICH.txt') },
  abwehr2: { image: env('ABWEHR2_IMAGE', 'nf-abwehr2'), user: 'verteidiger', ready: 'Abwehr bereit', title: 'Angriff! Die Hintertür', host: 'mein-server',
    produkt: 'arena-profi', stufe: 'Fortgeschritten', levels: 6, praefix: 'abwehr2', tmpfs: { '/srv/app': 'rw,exec,nosuid,size=16m' },
    kurz: 'Der Hacker wird frecher: PIN-Brute-Force, giftige Dateinamen, Hintertür mit Autostart, Schlüssel in der Git-Historie, PATH-Falle, zu weite Freigabe.',
    hello: hallo('Angriff! Stufe 2', 'verteidiger', 'Lagebild: lage   ·   live: tail -f /var/log/angriff.log   ·   cat ~/LIESMICH.txt') },
  abwehr3: { image: env('ABWEHR3_IMAGE', 'nf-abwehr3'), user: 'verteidiger', ready: 'Abwehr bereit', title: 'Angriff! Der Profi', host: 'mein-pc',
    produkt: 'arena-profi', stufe: 'Extrem', levels: 6, praefix: 'abwehr3',
    kurz: 'Der Profi ist längst drin: getarnte Prozesse, versteckte Autostarts, lügende Befehle, präparierter Schlüssel, Wanze, Zeitbombe, Git-Haken. Traue nichts.',
    hello: hallo('Angriff! Stufe 3', 'verteidiger', 'Lagebild: lage   ·   live: tail -f /var/log/angriff.log   ·   cat ~/LIESMICH.txt') },
  web1: { image: env('WEB1_IMAGE', 'nf-web1'), user: 'besucher', ready: 'Web1 bereit', title: 'Web 1: Das Kleingedruckte', host: 'katalog',
    produkt: 'arena', stufe: 'Fortgeschritten', levels: 6, praefix: 'web1', tmpfs: { '/opt/web/seiten': 'rw,nosuid,size=4m' },
    kurz: 'Web-Grundlagen mit curl: versteckte Pfade (robots.txt), HTTP-Methoden, versteckte Parameter, Pfad-Ausbruch, vergessene Backup-Datei, gefälschte Header.',
    hello: hallo('Katalog-Pentest', 'besucher', 'Auftrag: cat ~/auftrag.txt   ·   Hilfe: hilfe   ·   Begriffe: begriff WORT') },
  web2: { image: env('WEB2_IMAGE', 'nf-web2'), user: 'tester', ready: 'Web2 bereit', title: 'Web 2: Umwege', host: 'portal',
    produkt: 'arena-profi', stufe: 'Experte', levels: 6, praefix: 'web2',
    kurz: 'Web mittel: SQL-Login umgehen, mit UNION fremde Tabellen lesen, SSRF auf interne Dienste, unsicheres Zusatzfeld, Token fälschen (JWT alg=none), file://.',
    hello: hallo('Portal-Pentest', 'tester', 'Auftrag: cat ~/auftrag.txt   ·   Hilfe: hilfe   ·   begriff ssrf') },
  web3: { image: env('WEB3_IMAGE', 'nf-web3'), user: 'angreifer', ready: 'Web3 bereit', title: 'Web 3: Die Kette', host: 'kette',
    produkt: 'arena-profi', stufe: 'Extrem', levels: 6, praefix: 'web3',
    kurz: 'Web extrem: Template-Injection, unsichere Deserialisierung, Race Condition, Blind-SQL-Injection, SSRF mit umgangener Sperre, XXE.',
    hello: hallo('Die Kette', 'angreifer', 'Auftrag: cat ~/auftrag.txt   ·   Hilfe: hilfe   ·   begriff ssti') },
  meister: { image: env('MEISTER_IMAGE', 'nf-meister'), user: 'extern', ready: 'Meister bereit', title: 'Der Meister: Das Rechenzentrum', host: 'extern',
    produkt: 'arena-profi', stufe: 'Meister', levels: 6, praefix: 'meister', tmpfs: { '/opt/meister/aufgaben': 'rw,exec,nosuid,size=4m' },
    kurz: 'Die Königsklasse: durch ein simuliertes internes Netz (mehrere Konten = Maschinen) bis zum Kern pivotieren – Hash knacken, echter Buffer Overflow (ret2win), Rechteausweitung bis root.',
    hello: hallo('Rechenzentrum Nordstadt', 'extern', 'Auftrag: cat ~/auftrag.txt   ·   Hilfe: hilfe   ·   begriff pivoting') },
  duell: { image: env('DUELL_IMAGE', 'nf-duell'), user: 'verteidiger', ready: 'Duell bereit', title: 'Das Duell: Mann gegen Maschine', host: 'mein-pc',
    produkt: 'arena-profi', stufe: 'Extrem', levels: 6, praefix: 'duell', tmpfs: { '/srv/app': 'rw,exec,nosuid,size=16m' },
    kurz: 'Ein lebendiger Gegner: Der Hacker-Bot prüft live, welche Lücken offen sind, greift eine zufällige davon an und wird immer schneller. Mach alles dicht – jede geschlossene Lücke gibt einen Code.',
    hello: hallo('Das Duell', 'verteidiger', 'Lagebild: lage   ·   live: tail -f /var/log/duell.log   ·   cat ~/LIESMICH.txt') },
};
const STUFEN = ['Einsteiger', 'Fortgeschritten', 'Experte', 'Extrem', 'Meister'];
// Register: Reihe und Themen je Arena (für den Filter in der Übersicht)
const EINORDNUNG = {
  keller: ['Hacken', ['Linux', 'Rechte', 'Passwörter']], leitstelle: ['Hacken', ['Netzwerk', 'Dienste', 'Linux']],
  webshop: ['Hacken', ['Web', 'Injection']], tresor: ['Hacken', ['Krypto', 'Web', 'Linux']],
  spuren: ['Ermitteln', ['Forensik', 'Logs']], einbruch: ['Ermitteln', ['Forensik', 'Logs', 'Schadsoftware']],
  maulwurf: ['Ermitteln', ['Forensik', 'Netzwerk', 'Krypto']],
  abwehr1: ['Abwehren', ['Rechte', 'Passwörter']], abwehr2: ['Abwehren', ['Web', 'Injection', 'Linux']], abwehr3: ['Abwehren', ['Threat Hunting', 'Linux']],
  web1: ['Hacken', ['Web']], web2: ['Hacken', ['Web', 'Injection', 'Netzwerk']], web3: ['Hacken', ['Web', 'Injection']],
  meister: ['Hacken', ['Pivoting', 'Exploitation', 'Netzwerk', 'Linux']],
  duell: ['Abwehren', ['Threat Hunting', 'Rechte', 'Persistenz']],
};
// Ist das Image eines Labs gebaut? (Neue Labs erscheinen erst, wenn der Server sie gebaut hat.)
const vorhanden = {};
async function imagesPruefen() { for (const [id, L] of Object.entries(LABS)) vorhanden[id] = await docker.getImage(L.image).inspect().then(() => true, () => false); }
const labOeffentlich = () => Object.entries(LABS).sort((a, b) => STUFEN.indexOf(a[1].stufe) - STUFEN.indexOf(b[1].stufe)).map(([id, L]) => ({ id, titel: L.title, stufe: L.stufe, reihe: EINORDNUNG[id]?.[0] || 'Hacken', themen: EINORDNUNG[id]?.[1] || [], kurz: L.kurz, produkt: L.produkt, levels: L.levels, bereit: vorhanden[id] !== false }));
const istLab = (lab) => Object.hasOwn(LABS, lab);
function darf(k, lab) {
  if (!istLab(lab)) return false;
  const L = LABS[lab]; if (!k?.ok) return false;
  if (k.admin || k.produkte.includes('alles') || k.produkte.includes(L.produkt)) return true;
  return L.produkt === 'arena' && k.produkte.includes('arena-profi');
}

// Codes: pro Konto und Lab ein eigenes „Salz“ aus dem Server-Geheimnis. Der Container bekommt nur das Salz,
// niemand außerhalb des Servers kann Codes ausrechnen. Geprüft wird nur hier (über die Edge Function arena-code).
const salz = (userId, lab) => createHmac('sha256', CFG.geheimnis).update(`nachtfalter-arena:${userId}:${lab}`).digest('hex').slice(0, 32);
const labCode = (s, praefix, n) => `KLY{${createHash('sha256').update(`${s}:${praefix}:l${n}`).digest('hex').slice(0, 16)}}`;
function codeLevel(userId, lab, code) {
  const L = LABS[lab], s = salz(userId, lab), c = Buffer.from(String(code));
  for (let n = 1; n <= L.levels; n++) { const soll = Buffer.from(labCode(s, L.praefix, n)); if (soll.length === c.length && timingSafeEqual(soll, c)) return n; }
  return 0;
}
const pruefZaehler = new Map(); // ip -> [zeitfenster, anzahl]
function pruefBremse(ip) {
  const fenster = Math.floor(Date.now() / 60000), e = pruefZaehler.get(ip);
  if (!e || e[0] !== fenster) { pruefZaehler.set(ip, [fenster, 1]); if (pruefZaehler.size > 5000) pruefZaehler.clear(); return true; }
  return ++e[1] <= 300; // alle Prüfungen kommen über die Edge Function (wenige IPs)
}

const docker = new Docker({ socketPath: env('DOCKER_SOCKET', '/var/run/docker.sock') });
const sessions = new Map(); // id -> { id, lab, containerId, ip, created, lastSeen, token }
const log = (...a) => console.log(new Date().toISOString(), ...a);

function clientIp(req) {
  // Hinter nginx: X-Real-IP bzw. der LETZTE Eintrag von X-Forwarded-For stammt von nginx selbst (der erste kann gefälscht sein)
  if (CFG.trustProxy && req.headers['x-real-ip']) return String(req.headers['x-real-ip']).trim();
  if (CFG.trustProxy && req.headers['x-forwarded-for']) return String(req.headers['x-forwarded-for']).split(',').pop().trim();
  return req.socket.remoteAddress || '?';
}
// Nachtfalter-Konto prüfen: Token beim Auth-Server verifizieren, dann (mit dem Token des Spielers, RLS)
// eigene Zugänge und Sperre lesen. Ergebnis 60 s zwischenspeichern, damit nicht jeder Klick nachfragt.
const kontoCache = new Map();
async function kontoPruefen(token, frisch = false) {
  if (!CFG.konto) return { status: 403, fehler: 'Anmeldung mit dem Nachtfalter-Konto ist hier abgeschaltet.' };
  if (!/^[A-Za-z0-9._-]{20,4096}$/.test(token)) return { status: 401, fehler: 'Bitte neu anmelden.' };
  const key = createHash('sha256').update(token).digest('hex');
  const c = kontoCache.get(key);
  if (c && c.t > Date.now() - (frisch ? 10000 : 30000)) return c.r; // auch „frisch“ höchstens alle 10 s
  const h = { apikey: CFG.kontoKey, Authorization: `Bearer ${token}` };
  const holen = (pfad) => fetch(CFG.kontoUrl + pfad, { headers: h, signal: AbortSignal.timeout(6000) });
  let r;
  const u = await holen('/auth/v1/user');
  if (u.status === 401 || u.status === 403) return { status: 401, fehler: 'Deine Anmeldung ist abgelaufen – bitte neu anmelden.' };
  if (!u.ok) throw new Error(`Auth-Dienst antwortet mit ${u.status}`);
  else {
    const user = await u.json();
    const jetzt = new Date().toISOString();
    const [z, p, m] = await Promise.all([
      holen(`/rest/v1/entitlements?select=produkt,gueltig_bis&produkt=in.(arena,arena-profi,alles)&gueltig_bis=gt.${encodeURIComponent(jetzt)}`),
      holen(`/rest/v1/profiles?select=gesperrt&id=eq.${encodeURIComponent(user.id)}`),
      fetch(CFG.kontoUrl + '/rest/v1/rpc/mein_status', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(6000) }),
    ]);
    if (!z.ok || !p.ok) throw new Error(`Konto-Abfrage fehlgeschlagen (${z.status}/${p.status})`);
    const zug = await z.json(), prof = (await p.json())[0] || {}, st = m.ok ? await m.json().catch(() => ({})) : {};
    if (prof.gesperrt) r = { status: 403, fehler: 'Dein Konto ist gesperrt.' };
    else r = { ok: true, userId: user.id, admin: !!st?.admin, produkte: [...new Set(zug.map(x => x.produkt))] };
  }
  if (r.ok) kontoCache.set(key, { t: Date.now(), r }); // nur Erfolge merken – nach Code-Einlösung sofort neu prüfen
  if (kontoCache.size > 2000) kontoCache.clear();
  return r;
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

async function createSession(lab, token, ip, userId = null) {
  if (!istLab(lab)) throw Object.assign(new Error('Unbekanntes Lab'), { status: 400 });
  const L = LABS[lab];
  if (vorhanden[lab] === false) throw Object.assign(new Error('Diese Arena wird gerade noch aufgebaut – bitte später noch einmal.'), { status: 503 });
  if (!/^KLY-[0-9A-F]{6}$/.test(token)) throw Object.assign(new Error('Ungültiger Lab-Token'), { status: 400 });
  if (sessions.size >= CFG.maxTotal) throw Object.assign(new Error('Die Arena ist gerade voll – bitte später noch einmal versuchen.'), { status: 503 });
  if ([...sessions.values()].filter(s => s.ip === ip).length >= CFG.maxPerIp) throw Object.assign(new Error('Du hast schon zu viele Labs offen. Schließe erst eins.'), { status: 429 });
  if (userId && [...sessions.values()].filter(s => s.userId === userId).length >= CFG.maxPerUser) throw Object.assign(new Error('Du hast schon zu viele Labs offen. Schließe erst eins.'), { status: 429 });

  const id = randomBytes(16).toString('hex');
  // Platz sofort (vor dem ersten await) reservieren, damit parallele Anfragen die Grenzen nicht umgehen
  sessions.set(id, { id, lab, containerId: null, ip, userId, created: Date.now(), lastSeen: Date.now(), token, startet: true });
  try {
  const container = await docker.createContainer({
    Image: L.image,
    name: `kly-arena-${lab}-${id.slice(0, 10)}`,
    Env: [`KLY_TOKEN=${token}`, ...(CFG.geheimnis && userId ? [`KLY_SALZ=${salz(userId, lab)}`] : [])],
    Labels: { 'kly.arena': '1', 'kly.session': id, 'kly.expires': String(Date.now() + CFG.ttlMin * 60000) },
    Hostname: L.host,
    HostConfig: {
      NetworkMode: 'none',                       // nur localhost
      Memory: CFG.memMb * 1024 * 1024, MemorySwap: CFG.memMb * 1024 * 1024,
      NanoCpus: Math.round(CFG.cpus * 1e9),
      PidsLimit: CFG.pids,
      CapDrop: ['ALL'],
      CapAdd: ['CHOWN', 'DAC_OVERRIDE', 'FOWNER', 'SETUID', 'SETGID', 'KILL', 'AUDIT_WRITE', 'SYS_CHROOT', 'NET_BIND_SERVICE'],
      SecurityOpt: ['no-new-privileges'],
      AutoRemove: true,
      // Alles, wo Spieler schreiben dürfen, liegt im Arbeitsspeicher (zählt zur Speichergrenze) – so kann
      // niemand die Festplatte des Servers volllaufen lassen.
      Tmpfs: { '/tmp': 'rw,noexec,nosuid,size=16m', '/var/tmp': 'rw,nosuid,size=16m', '/run/lock': 'rw,noexec,nosuid,size=1m', '/home': 'rw,exec,nosuid,size=48m,mode=755', ...(L.tmpfs || {}) },
      LogConfig: { Type: 'json-file', Config: { 'max-size': '1m', 'max-file': '1' } },
      Ulimits: [{ Name: 'fsize', Soft: 64 * 1024 * 1024, Hard: 64 * 1024 * 1024 }],
    },
  });
  sessions.get(id).containerId = container.id;
  await container.start();
  try { await waitReady(container, L.ready); }
  catch (e) { await container.remove({ force: true }).catch(() => {}); throw e; }
  const s = { id, lab, containerId: container.id, ip, userId, created: Date.now(), lastSeen: Date.now(), token };
  sessions.set(id, s);
  log('start', lab, id.slice(0, 8), ip);
  return s;
  } catch (e) { sessions.delete(id); throw e; }
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
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY', 'Strict-Transport-Security': 'max-age=31536000',
  'Content-Security-Policy': `default-src 'self'; script-src 'self' https://cdn.jsdelivr.net/npm/@xterm/ https://translate.google.com https://translate.googleapis.com https://www.gstatic.com 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net/npm/@xterm/ https://www.gstatic.com https://fonts.googleapis.com; connect-src 'self' ${CFG.kontoUrl} https://translate.googleapis.com; img-src 'self' data: https://www.google.com https://www.gstatic.com https://translate.googleapis.com; font-src 'self' https://fonts.gstatic.com; frame-ancestors 'none'; base-uri 'none'`,
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (req.method === 'GET' && url.pathname === '/api/status') return json(res, 200, { ok: true, labs: Object.keys(LABS), frei: CFG.maxTotal - sessions.size, offen: CFG.konto, konto: CFG.konto ? { url: CFG.kontoUrl, key: CFG.kontoKey, app: CFG.appOrigin } : null });
    if (req.method === 'GET' && url.pathname === '/api/labs') return json(res, 200, { labs: labOeffentlich() });
    if (req.method === 'GET' && url.pathname === '/api/zugang') {
      const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      if (!bearer) return json(res, 401, { fehler: 'Bitte anmelden.' });
      let k; try { k = await kontoPruefen(bearer, url.searchParams.has('frisch')); } catch (e) { log('konto', e.message); return json(res, 502, { fehler: 'Konto gerade nicht erreichbar.' }); }
      if (!k.ok) return json(res, k.status, { fehler: k.fehler });
      return json(res, 200, { admin: k.admin, labs: Object.fromEntries(Object.keys(LABS).map(id => [id, darf(k, id)])) });
    }
    if (req.method === 'POST' && url.pathname === '/api/session') {
      const ip = clientIp(req);
      let body; try { body = JSON.parse(await readBody(req)); } catch { return json(res, 400, { fehler: 'Ungültige Anfrage' }); }
      let userId = null;
      const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      if (bearer) {
        let k; try { k = await kontoPruefen(bearer); } catch (e) { log('konto', e.message); return json(res, 502, { fehler: 'Konto gerade nicht erreichbar – bitte gleich noch einmal versuchen.' }); }
        if (!k.ok) return json(res, k.status, { fehler: k.fehler, code: k.code });
        const lab = String(body.lab || '');
        if (!istLab(lab)) return json(res, 400, { fehler: 'Unbekanntes Lab' });
        if (!darf(k, lab)) { // vielleicht gerade erst freigeschaltet → einmal frisch nachfragen
          let k2; try { k2 = await kontoPruefen(bearer, true); } catch { k2 = k; }
          if (!darf(k2, lab)) return json(res, 403, { code: 'kein_zugang', produkt: LABS[lab].produkt, fehler: `Für „${LABS[lab].title}“ brauchst du einen Zugang. Du kannst ihn anfragen oder einen Einladungscode einlösen.` });
        }
        userId = k.userId;
      } else return json(res, 401, { fehler: 'Bitte mit deinem Nachtfalter-Konto anmelden.' }); // alter Einladungscode abgeschaltet (umging die Zugangsprüfung)
      try { const s = await createSession(String(body.lab || ''), String(body.token || ''), ip, userId); return json(res, 200, { id: s.id, ablauf: s.created + CFG.ttlMin * 60000 }); }
      catch (e) { log('fehler', e.message); return json(res, e.status || 500, { fehler: e.status ? e.message : 'Lab konnte nicht gestartet werden.' }); }
    }
    // Code prüfen – wird von der Edge Function „arena-code“ aufgerufen (die kennt das Konto aus der Anmeldung).
    // Antwortet nur „welches Level“ – ohne den Code selbst zu kennen, lässt sich daraus nichts gewinnen.
    if (req.method === 'POST' && url.pathname === '/api/pruefen') {
      if (!CFG.geheimnis) return json(res, 503, { fehler: 'Code-Prüfung nicht eingerichtet' });
      if (!pruefBremse(clientIp(req))) return json(res, 429, { fehler: 'Zu viele Versuche' });
      let b; try { b = JSON.parse(await readBody(req, 1024)); } catch { return json(res, 400, { fehler: 'Ungültige Anfrage' }); }
      const lab = String(b.lab || ''), uid = String(b.user || ''), code = String(b.code || '').trim();
      if (!istLab(lab) || !/^[0-9a-f-]{36}$/.test(uid) || !/^KLY\{[0-9a-f]{16}\}$/.test(code)) return json(res, 200, { level: 0 });
      return json(res, 200, { level: codeLevel(uid, lab, code) });
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
  if (!s || s.startet) { socket.destroy(); return; }
  const origin = String(req.headers.origin || '');
  const erlaubt = [CFG.origin, `https://${req.headers.host}`, `http://${req.headers.host}`];
  if (origin && !erlaubt.includes(origin)) { log('ws', 'fremde Herkunft', origin); socket.destroy(); return; }
  wss.handleUpgrade(req, socket, head, (ws) => attach(ws, s));
});

async function attach(ws, s) {
  const L = LABS[s.lab];
  try {
    const c = docker.getContainer(s.containerId);
    const exec = await c.exec({ Cmd: ['runuser', '-l', L.user], AttachStdin: true, AttachStdout: true, AttachStderr: true, Tty: true, Env: ['TERM=xterm-256color', 'LANG=C.UTF-8'] });
    const stream = await exec.start({ hijack: true, stdin: true, Tty: true });
    ws.send(L.hello);
    stream.on('data', (d) => { if (ws.readyState === 1) ws.send(d.toString('utf8')); });
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
imagesPruefen().catch(() => {}); setInterval(() => imagesPruefen().catch(() => {}), 300000).unref();
server.listen(CFG.port, CFG.host, () => log(`Arena lauscht auf ${CFG.host}:${CFG.port} · Labs: ${Object.keys(LABS).join(', ')} · Konto ${CFG.konto ? 'an' : 'aus'}`));
