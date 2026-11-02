// Level 2 – Netzwerk & Aufklärung
// n1 „Inventur bei den Stadtwerken“: SIMULIERTES Firmennetz im Browser-Terminal mit simuliertem nmap/nc.
//    Kein echter Netzwerkverkehr. Schwerpunkt: Aufklärung, Ergebnisse deuten, Scope einhalten, berichten.
// NETZ_PFAD: kostenlose Übungsmaschinen für echte Scans (ohne Abo).

import { HOME } from '../shell.js';
import { textTools } from './wargames.js';

const b64 = (x) => (typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(x))) : Buffer.from(x, 'utf8').toString('base64'));

const T = (...lines) => lines.join('\n');
const NET = '10.10.20';

// Das erfundene Netz. ports: [port, proto, service, version, top] – top=false heißt: nur mit -p- sichtbar
function hosts(F) {
  return [
    { ip: `${NET}.1`, name: 'gw.stadtwerke.sim', mac: 'Zyxel (sim)', ports: [[22, 'tcp', 'ssh', 'OpenSSH 8.9p1 Ubuntu', true], [80, 'tcp', 'http', 'lighttpd 1.4.63', true]] },
    { ip: `${NET}.10`, name: 'portal.stadtwerke.sim', mac: 'Dell (sim)', ports: [[80, 'tcp', 'http', 'nginx 1.18.0', true], [443, 'tcp', 'https', 'nginx 1.18.0', true], [8081, 'tcp', 'http', 'Python http.server 3.8', false]] },
    { ip: `${NET}.20`, name: 'files.stadtwerke.sim', mac: 'Dell (sim)', ports: [[139, 'tcp', 'netbios-ssn', 'Samba smbd 4.15', true], [445, 'tcp', 'microsoft-ds', 'Samba smbd 4.15', true]] },
    { ip: `${NET}.30`, name: 'db.stadtwerke.sim', mac: 'Dell (sim)', ports: [[5432, 'tcp', 'postgresql', 'PostgreSQL 13.4', true]] },
    { ip: `${NET}.42`, name: null, mac: 'Shenzhen Vision Tech (sim)', ports: [[23, 'tcp', 'telnet', 'IPCam-2000 telnetd', true], [554, 'tcp', 'rtsp', 'IPCam-2000 rtspd', true]], banner: { 23: `IPCam-2000 Firmware v1.2 (2017)\nWartungszugang aktiv.\nNotiz des Installateurs (base64): ${b64(F.kamera)}\nlogin: ` } },
    { ip: `${NET}.50`, name: 'drucker.stadtwerke.sim', mac: 'Brother (sim)', ports: [[80, 'tcp', 'http', 'Drucker-Webinterface', true], [9100, 'tcp', 'jetdirect', '', true], [161, 'udp', 'snmp', 'SNMPv1 (community public)', true]] },
  ];
}

function webFor(F) {
  const page = (title, body, server) => ({ server, routes: { '/': { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: `<html><head><title>${title}</title></head><body>${body}</body></html>\n` } } });
  return {
    [`${NET}.1:80`]: page('Router-Login', '<h1>Router</h1><form>Passwort: <input type="password"></form>', 'lighttpd/1.4.63'),
    [`${NET}.10:80`]: page('Stadtwerke Kundenportal', '<h1>Willkommen im Kundenportal</h1>', 'nginx/1.18.0'),
    [`${NET}.10:443`]: { ...page('Stadtwerke Kundenportal', '<h1>Willkommen im Kundenportal</h1>', 'nginx/1.18.0'), tls: true },
    [`${NET}.10:8081`]: { server: 'SimpleHTTP/0.6 Python/3.8.10', routes: { '/': { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: `Entwicklungsserver – NICHT ÖFFENTLICH\nStand: Testdaten vom Kundenportal\nflag=${F.devport}\n` } } },
    [`${NET}.50:80`]: page('Drucker – Status', '<h1>Druckerstatus</h1><p>Toner: 12 %</p>', 'Drucker-Webinterface'),
  };
}

// ---------------------------------------------------------------- simuliertes nmap
function ipList(spec) {
  const m = spec.match(/^10\.10\.20\.(\d+)(?:-(\d+))?$/);
  if (spec === `${NET}.0/24`) return Array.from({ length: 254 }, (_, i) => `${NET}.${i + 1}`);
  if (m) { const a = +m[1], b = m[2] ? +m[2] : a; if (a < 1 || b > 254 || a > b) return null; return Array.from({ length: b - a + 1 }, (_, i) => `${NET}.${a + i}`); }
  return null;
}
function portSpec(spec) {
  if (spec === '-') return 'all';
  const set = new Set();
  for (const part of spec.split(',')) {
    const m = part.match(/^(\d+)(?:-(\d+))?$/); if (!m) return null;
    const a = +m[1], b = m[2] ? +m[2] : a; for (let p = a; p <= b && p <= 65535; p++) set.add(p);
  }
  return set;
}

function nmapCmd(F) {
  return (args, { sh }) => {
    const H = hosts(F);
    const opts = { sn: false, sV: false, sU: false, all: false, ports: null, out: null, scripts: false };
    const targets = [];
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (a === '-sn') opts.sn = true;
      else if (a === '-sV') opts.sV = true;
      else if (a === '-sU') opts.sU = true;
      else if (a === '-sT' || a === '-sS' || a === '-Pn' || a === '-T4' || a === '-v' || a === '-n') { /* akzeptiert, ohne Wirkung in der Simulation */ }
      else if (a === '-sC' || a === '-A') { opts.sV = true; opts.scripts = true; }
      else if (a === '-p-') opts.all = true;
      else if (a === '-p') { const ps = portSpec(args[++i] || ''); if (!ps) return { out: '', err: 'nmap: Ungültige Portangabe. Beispiele: -p 80  ·  -p 1-1000  ·  -p 22,80,443  ·  -p-\n', code: 1 }; if (ps === 'all') opts.all = true; else opts.ports = ps; }
      else if (/^-p\d/.test(a)) { const ps = portSpec(a.slice(2)); if (!ps) return { out: '', err: 'nmap: Ungültige Portangabe.\n', code: 1 }; opts.ports = ps; }
      else if (a === '-oN') { opts.out = args[++i]; if (!opts.out) return { out: '', err: 'nmap: -oN braucht einen Dateinamen.\n', code: 1 }; }
      else if (a === '-h' || a === '--help') return { out: T('Nmap (SIMULATION) – unterstützt:', '  nmap -sn 10.10.20.0/24        Welche Rechner sind da? (Ping-Scan)', '  nmap ZIEL                     häufigste 1000 TCP-Ports', '  nmap -p- ZIEL                 alle 65535 TCP-Ports', '  nmap -p 22,80 ZIEL            bestimmte Ports', '  nmap -sV ZIEL                 Dienst-Versionen erkennen', '  nmap -sU ZIEL                 UDP-Ports (langsam!)', '  nmap -sC ZIEL / -A            Standard-Skripte (z. B. Webseitentitel)', '  -oN DATEI                     Ergebnis zusätzlich in Datei speichern', '') + '\n', code: 0 };
      else if (a.startsWith('-')) return { out: '', err: `nmap: Option ${a} kennt diese Simulation nicht. nmap --help zeigt, was geht.\n`, code: 1 };
      else targets.push(a);
    }
    if (!targets.length) return { out: '', err: 'nmap: Kein Ziel angegeben. Beispiel: nmap -sn 10.10.20.0/24\n', code: 1 };
    const ips = [];
    for (const t of targets) {
      const h = H.find(x => x.name === t);
      const list = h ? [h.ip] : ipList(t);
      if (!list) return { out: '', err: `SCOPE: ${t} gehört nicht zum Auftrag. Erlaubt ist nur 10.10.20.0/24. Es wurde nichts gescannt.\n`, code: 1 };
      ips.push(...list);
    }
    const head = `Starting Nmap 7.94 ( https://nmap.org ) – SIMULATION, kein echter Netzwerkverkehr\n`;
    let out = head;
    const up = ips.map(ip => H.find(h => h.ip === ip)).filter(Boolean);
    if (opts.sn) {
      for (const h of up) out += `Nmap scan report for ${h.name ? `${h.name} (${h.ip})` : h.ip}\nHost is up (0.0021s latency).\nMAC Address: 02:42:0A:0A:14:${h.ip.split('.')[3].padStart(2, '0')} (${h.mac})\n`;
      out += `Nmap done: ${ips.length} IP address${ips.length > 1 ? 'es' : ''} (${up.length} host${up.length === 1 ? '' : 's'} up) scanned in ${(ips.length * 0.012 + 1.2).toFixed(2)} seconds\n`;
    } else {
      if (ips.length > 16 && !opts.sn) out += 'Hinweis: Viele Ziele – erst mit -sn herausfinden, welche überhaupt da sind, spart Zeit.\n';
      for (const h of up) {
        const proto = opts.sU ? 'udp' : 'tcp';
        const shown = h.ports.filter(([p, pr, , , top]) => pr === proto && (opts.ports ? opts.ports.has(p) : opts.all || top));
        const total = opts.ports ? opts.ports.size : opts.all ? 65535 : 1000;
        out += `\nNmap scan report for ${h.name ? `${h.name} (${h.ip})` : h.ip}\nHost is up (0.0019s latency).\n`;
        if (!shown.length) { out += `All ${total} scanned ${proto} ports on ${h.ip} are in ignored states.\n`; continue; }
        if (total - shown.length > 0) out += `Not shown: ${total - shown.length} closed ${proto} ports (reset)\n`;
        out += `PORT${' '.repeat(6)}STATE SERVICE${opts.sV ? '      VERSION' : ''}\n`;
        for (const [p, pr, svc, ver] of shown) {
          const col = `${p}/${pr}`.padEnd(10);
          out += `${col}open  ${opts.sV ? svc.padEnd(12) + ' ' + ver : svc}\n`;
          if (opts.scripts) {
            const w = sh.web[`${h.ip}:${p}`];
            const title = w?.routes?.['/']?.body?.match?.(/<title>([^<]*)<\/title>/)?.[1];
            if (title) out += `|_http-title: ${title}\n`;
            if (svc === 'telnet') out += '|_banner: IPCam-2000 Firmware v1.2 (2017) …\n';
          }
        }
      }
      out += `\nNmap done: ${ips.length} IP address${ips.length > 1 ? 'es' : ''} (${up.length} host${up.length === 1 ? '' : 's'} up) scanned in ${(opts.all ? 38.4 : opts.sU ? 61.7 : 2.3).toFixed(2)} seconds\n`;
    }
    if (opts.out) { const w = sh._writeTo(opts.out, out, false); if (w) return { out, err: w, code: 1 }; }
    return { out, code: 0 };
  };
}

// simuliertes netcat: Banner lesen
function ncCmd(F) {
  return (args) => {
    const pos = args.filter(a => !a.startsWith('-'));
    if (pos.length < 2) return { out: '', err: 'Aufruf: nc ZIEL PORT   (Beispiel: nc 10.10.20.42 23)\n', code: 1 };
    const [t, port] = pos; const H = hosts(F);
    const h = H.find(x => x.ip === t || x.name === t);
    if (!h) return { out: '', err: ipList(t) ? `nc: ${t}: Keine Antwort (Rechner nicht erreichbar)\n` : `SCOPE: ${t} gehört nicht zum Auftrag. Es wurde nichts gesendet.\n`, code: 1 };
    const p = h.ports.find(x => x[0] === +port && x[1] === 'tcp');
    if (!p) return { out: '', err: `nc: connect to ${t} port ${port} (tcp) failed: Connection refused\n`, code: 1 };
    if (h.banner?.[p[0]]) return { out: h.banner[p[0]] + '\n(Verbindung beendet – SIMULATION)\n', code: 0 };
    if (p[2] === 'ssh') return { out: 'SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0.6\n', code: 0 };
    return { out: '(verbunden – der Dienst sendet nichts von sich aus. Für Webseiten: curl)\n', code: 0 };
  };
}

function netzSetup(sh, F) {
  sh.web = webFor(F);
  const etc = sh.read('/etc/hosts') || '';
  sh.fs.put('/etc/hosts', etc + hosts(F).filter(h => h.name).map(h => `${h.ip}\t${h.name}`).join('\n') + '\n', 0o644, 'root');
  const p = (path, c) => sh.fs.put(`${HOME}/auftrag/${path}`, c);
  p('AUFTRAG.txt', T(
    'AUFTRAG – Stadtwerke Talheim (erfunden)',
    '',
    'Auftraggeber: Herr Kern, IT-Leitung',
    'Erlaubt:      Aufklärung im Büronetz 10.10.20.0/24 (Scans, Banner, Webseiten ansehen)',
    'NICHT erlaubt: Anmelden, Passwörter raten, Daten verändern, andere Netze',
    'Zeitraum:     heute',
    '',
    'Ziel: eine Inventur. Welche Geräte gibt es, welche Dienste laufen dort,',
    'und was davon ist ein Risiko? Ergebnisse bitte in ~/auftrag/notizen ablegen.',
    '',
    'Hinweis: Das ist eine SIMULATION im Browser. nmap und nc sind nachgebaut,',
    'es wird kein echter Netzwerkverkehr erzeugt.', ''));
  // Wiederholung (Nachtfalter): versteckte Übergabe-Notiz und Inventarliste zum Durchsuchen
  p('.uebergabe', T('Übergabe vom Kollegen, der den Auftrag vorher hatte:',
    '- Die Inventarliste der Stadtwerke liegt in inventar.csv (IP;Name;Gerät).',
    '- Herr Kern sagt, die Liste sei „vollständig“. Ich glaube ihm nicht.',
    '- Speichere deine Scans mit -oN in notizen/, dann kannst du sie später mit grep durchsuchen.', ''));
  p('inventar.csv', T('ip;name;geraet', `${NET}.1;gw;Router`, `${NET}.10;portal;Webserver`, `${NET}.20;files;Dateiserver`, `${NET}.30;db;Datenbank`, `${NET}.50;drucker;Drucker`, ''));
  sh.fs.put(`${HOME}/auftrag/notizen`, null);
  sh.cwd = `${HOME}/auftrag`;
}

const L = (...x) => x;

export const NETZ_ROOMS = [
  {
    id: 'n1', title: 'Inventur bei den Stadtwerken', type: 'walkthrough', level: 'L2', minutes: 45,
    tools: ['nmap -sn', 'nmap -p-', 'nmap -sV', 'nmap -sU', 'nc', 'curl', '-oN', '🔁 ls -a, grep, base64'],
    desc: 'Simuliertes Firmennetz mit sechs Geräten. Du machst die Inventur mit nmap: Wer ist da, was läuft, was ist gefährlich?',
    ziel: 'Ein Netz methodisch aufklären: erst Rechner finden, dann Ports, dann Versionen – und die Ergebnisse richtig deuten.',
    scope: 'Nur das simulierte Netz 10.10.20.0/24 im App-Terminal. Kein echter Netzwerkverkehr.',
    stop: 'Die Simulation verweigert Ziele außerhalb des Auftrags – genau wie du es im echten Leben tun musst.',
    cleanup: 'Nichts nötig.',
    machine: { kind: 'sandbox' },
    welcome: 'Netzwerk-Simulation bereit. Start: cat AUFTRAG.txt · nmap --help',
    flags: ['devport', 'kamera'],
    setup: netzSetup,
    // Handübersetzung: Auftrag und Übergabe-Notiz; inventar.csv bleibt original (grep auf IPs)
    translateFS(sh, T, translateTree) { translateTree(sh.fs.get(`${HOME}/auftrag`), T, (name, data) => (name.endsWith('.csv') ? data : null)); },
    commands: ({ F }) => ({ nmap: nmapCmd(F), nc: ncCmd(F), netcat: ncCmd(F), ...textTools() }),
    tasks: [
      {
        id: 't1', title: 'Der Auftrag', body: 'Lies zuerst den Auftrag. Ohne Auftrag kein Scan – das ist im echten Leben die wichtigste Regel.',
        questions: [
          { id: 'q1', type: 'text', q: 'Welches Netz darfst du untersuchen? (z. B. 192.168.1.0/24)', accept: [/^10\.10\.20\.0\/24$/], points: 5, hints: L('cat AUFTRAG.txt', 'Lösung: 10.10.20.0/24') },
          { id: 'q3', type: 'text', repeat: 'Nachtfalter Stufe 1', q: 'Dein Vorgänger hat dir eine versteckte Notiz hinterlassen. In welcher Datei liegt die Inventarliste?', accept: [/^(\.\/)?inventar\.csv$/i], points: 5, hints: L('Versteckt heißt bei Linux: Der Name beginnt mit einem Punkt.', 'ls -a zeigt auch versteckte Dateien. Dann cat .uebergabe', 'Lösung: inventar.csv') },
          { id: 'q2', type: 'mc', q: 'Im Router siehst du ein Login-Formular. Darfst du dort Passwörter ausprobieren?', points: 10, options: ['Nein – der Auftrag erlaubt nur Aufklärung, kein Anmelden oder Raten.', 'Ja, solange nichts kaputtgeht.', 'Ja, aber nur drei Versuche.'], answer: 0, hints: L('Was steht unter „NICHT erlaubt“?') },
        ],
      },
      {
        id: 't2', title: 'Wer ist da?', body: 'Bevor du Ports scannst: Finde heraus, welche Rechner überhaupt antworten. Das spart Zeit und Lärm.',
        questions: [
          { id: 'q1', type: 'text', q: 'Wie viele Geräte sind im Netz erreichbar?', accept: [/^6$/], points: 10, hints: L('nmap hat einen „Ping-Scan“, der nur prüft, wer da ist – ohne Ports.', 'Die Option heißt -sn. Ziel ist das ganze Netz aus dem Auftrag.', 'Lösung: nmap -sn 10.10.20.0/24 → die Zahl bei „hosts up“') },
          { id: 'q2', type: 'text', q: 'Ein Gerät hat keinen Namen, nur eine IP. Welche?', accept: [/^10\.10\.20\.42$/], points: 10, hints: L('Bei den anderen steht ein Name vor der IP in Klammern.', 'Lösung: 10.10.20.42') },
        ],
      },
      {
        id: 't3', title: 'Was läuft wo?', body: 'Jetzt die Ports. Scanne die Geräte einzeln oder alle auf einmal und speichere das Ergebnis mit -oN in notizen/.',
        questions: [
          { id: 'q1', type: 'text', q: 'Auf welchem Gerät läuft eine Datenbank? (IP)', accept: [/^10\.10\.20\.30$/], points: 10, hints: L('nmap ZIEL zeigt die offenen Ports. Du kannst auch mehrere Ziele angeben: nmap 10.10.20.1-50', 'Datenbanken erkennst du an Dienstnamen wie mysql, postgresql, mssql.', 'Lösung: nmap 10.10.20.30 → 5432/tcp postgresql') },
          { id: 'q2', type: 'text', q: 'Welche nginx-Version läuft auf dem Kundenportal?', accept: [/^(nginx\s*)?1\.18\.0$/i], points: 10, hints: L('Ohne Zusatzoption zeigt nmap nur den Dienstnamen, keine Version.', 'Die Option für Versionserkennung ist -sV.', 'Lösung: nmap -sV 10.10.20.10') },
          { id: 'q3', type: 'confirm', q: 'Ergebnisse gespeichert, z. B. nmap -sV 10.10.20.1-50 -oN notizen/tcp.txt', points: 5 },
          { id: 'q4', type: 'text', repeat: 'Nachtfalter Stufe 3/4', q: 'Wie viele offene TCP-Ports stehen in deinem gespeicherten Scan (nmap -sV 10.10.20.1-50, ohne -p-)?', accept: [/^11$/], points: 10, hints: L('Jeder offene Port ist eine Zeile mit „/tcp“ und „open“. Zählen lassen statt zählen!', 'grep kann mit -c die Treffer zählen.', 'Lösung: grep -c "/tcp *open" notizen/tcp.txt → 11') },
        ],
      },
      {
        id: 't4', title: 'Der versteckte Port', body: 'Standardmäßig prüft nmap nur die 1000 häufigsten Ports. Entwickler starten Testserver aber gern auf ungewöhnlichen Ports.',
        questions: [
          { id: 'q1', type: 'text', q: 'Welcher zusätzliche Port ist auf dem Kundenportal offen?', accept: [/^8081$/], points: 15, hints: L('Es gibt eine Option, die alle 65535 Ports prüft.', 'nmap -p- ZIEL', 'Lösung: nmap -p- 10.10.20.10 → 8081/tcp') },
          { id: 'q2', type: 'flag', flag: 'devport', q: 'Flag vom Entwicklungsserver', points: 15, hints: L('Der Dienst auf dem Port ist ein Webserver. Womit rufst du Webseiten im Terminal ab?', 'curl http://IP:PORT/', 'Lösung: curl http://10.10.20.10:8081/') },
        ],
      },
      {
        id: 't5', title: 'Das Gerät ohne Namen', body: 'Das namenlose Gerät steht in keiner Inventarliste. Finde heraus, was es ist.',
        questions: [
          { id: 'q0', type: 'mc', repeat: 'Nachtfalter Stufe 3', q: 'Steht 10.10.20.42 in der Inventarliste der Stadtwerke?', points: 5, options: ['Nein – das Gerät ist der IT nicht bekannt.', 'Ja, als Drucker.', 'Ja, als Webserver.'], answer: 0, hints: L('grep 10.10.20.42 inventar.csv – keine Ausgabe heißt: nicht gefunden.') },
          { id: 'q1', type: 'text', q: 'Welcher alte, unverschlüsselte Fernzugang ist dort offen? (Dienstname)', accept: [/^telnet$/i], points: 10, hints: L('Scanne die IP aus Task 2.', 'Lösung: nmap 10.10.20.42 → 23/tcp telnet') },
          { id: 'q2', type: 'flag', flag: 'kamera', repeat: 'Nachtfalter Stufe 6/9', q: 'Flag aus der Notiz im Banner', points: 15, hints: L('Viele Dienste begrüßen dich direkt nach dem Verbindungsaufbau mit einem Text (Banner).', 'Mit nc (netcat) baust du eine einfache Verbindung auf: nc ZIEL PORT', 'Die Notiz ist base64-codiert. Wie in Nachtfalter: Zeile finden, Feld ausschneiden, dekodieren.', 'Lösung: nc 10.10.20.42 23 | grep Notiz | cut -d" " -f5 | base64 -d') },
          { id: 'q3', type: 'mc', q: 'Was ist das Gerät, und warum ist das ein Risiko?', points: 15, options: ['Eine alte Überwachungskamera (Firmware 2017) mit offenem Telnet-Wartungszugang – unverschlüsselt und vermutlich nie aktualisiert.', 'Ein normaler Webserver.', 'Ein Drucker – völlig harmlos.'], answer: 0, hints: L('Lies das Banner genau: Name, Version, Jahr.', 'Auch der Hersteller bei „MAC Address“ im Ping-Scan ist ein Hinweis.') },
        ],
      },
      {
        id: 't6', title: 'Auch UDP zählt', body: 'Manche Dienste sprechen kein TCP, sondern UDP. Ein normaler Scan sieht sie nicht.',
        questions: [
          { id: 'q1', type: 'text', q: 'Welcher UDP-Dienst läuft auf dem Drucker?', accept: [/^snmp$/i], points: 10, hints: L('nmap hat eine eigene Option für UDP-Scans.', 'nmap -sU ZIEL (echte UDP-Scans sind langsam – gezielt einsetzen)', 'Lösung: nmap -sU 10.10.20.50 → 161/udp snmp') },
        ],
      },
      {
        id: 't7', title: 'Der Bericht', body: 'Herr Kern will wissen, was zuerst zu tun ist.',
        questions: [
          { id: 'q1', type: 'mc', q: 'Was empfiehlst du als Erstes?', points: 15, options: ['Die unbekannte Kamera (.42) vom Netz nehmen bzw. Telnet abschalten und Firmware prüfen; danach den offenen Entwicklungsserver (:8081) schließen.', 'Den Router neu starten.', 'Alle Rechner mit nmap -A scannen, bis man sicher ist.'], answer: 0, hints: L('Was ist unbekannt, alt UND unverschlüsselt erreichbar?') },
          { id: 'q2', type: 'mc', q: 'Was ist an deinem Ergebnis NICHT sicher?', points: 10, options: ['Versionen aus Bannern sind Selbstauskünfte – sie können falsch sein und brauchen eine Gegenprobe.', 'Die IP-Adressen.', 'Nichts, nmap irrt sich nie.'], answer: 0, hints: L('Erinnerst du dich an den lügenden Dienst im Raum „Ports & Dienste“?') },
        ],
      },
    ],
    nach: { beobachtung: 'Sechs Geräte, darunter eine unbekannte Kamera mit Telnet, ein versteckter Entwicklungsserver und SNMP auf dem Drucker.', schluss: 'Gute Aufklärung ist methodisch: wer ist da → welche Ports → welche Versionen → was bedeutet das. Und immer im Auftrag bleiben.', grenzen: 'Simulation: echtes nmap hat viel mehr Optionen, echte Netze sind langsamer und unordentlicher.', naechster: 'Echt üben: Raum „Ports & Dienste“ in Kali und die Gratis-Maschinen von Hack The Box (Lernpfad Level 2).' },
  },
];

// Kostenlose Übungsmaschinen für echte Scans – ohne Abo (nur Gratis-Konto)
export const NETZ_PFAD = [
  { t: 'App: „Ports & Dienste“ (r2)', url: '#/raum/r2', why: 'Echtes nmap in deiner Kali-VM gegen deine eigene Zielmaschine – ohne Konto.' },
  { t: 'Hack The Box – Starting Point „Meow“', url: 'https://app.hackthebox.com/starting-point', why: 'Gratis (Tier 0). nmap findet einen alten Fernzugang – passt perfekt zu „Inventur bei den Stadtwerken“.' },
  { t: 'Hack The Box – Starting Point „Fawn“', url: 'https://app.hackthebox.com/starting-point', why: 'Gratis (Tier 0). nmap -sV und ein Dateidienst.' },
  { t: 'Hack The Box – Starting Point „Dancing“', url: 'https://app.hackthebox.com/starting-point', why: 'Gratis (Tier 0). Windows-Dateifreigaben aufklären.' },
  { t: 'TryHackMe – kostenlose Räume', url: 'https://tryhackme.com/', why: 'Nur Räume ohne Schloss-Symbol sind gratis – die anderen einfach überspringen.' },
];
