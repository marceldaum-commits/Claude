// Level 9 – Die andere Seite: Spuren & Verteidigung
// b1 „Die Nacht im Kollektiv“: Logdateien eines (erfundenen) Einbruchs auswerten – Blue-Team-Sicht.
// Alle Adressen stammen aus den Dokumentations-Bereichen (RFC 5737: 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24).
// 🔁 Wiederholung: grep, sort | uniq -c, cut, awk, base64, Pipes.

import { HOME } from '../shell.js';
import { textTools } from './wargames.js';

const T = (...lines) => lines.join('\n');
const L = (...x) => x;
const b64 = (s) => (typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(s))) : Buffer.from(s, 'utf8').toString('base64'));
function rng(seed) { let x = seed >>> 0 || 1; return () => (x = (x * 1664525 + 1013904223) >>> 0) / 2 ** 32; }
const pad = (n) => String(n).padStart(2, '0');

const ANGREIFER = '203.0.113.77';
const ZWEITER = '198.51.100.23';

function setup(sh, F) {
  const R = rng(9090);
  const p = (path, c) => sh.fs.put(`${HOME}/spuren/${path}`, c);
  p('LIESMICH.txt', T(
    'Nachricht von Mara:',
    '',
    'Heute Nacht war jemand auf unserem Server „kollektiv“. Ich habe die Logs gesichert:',
    '  logs/auth.log     – Anmeldungen per SSH',
    '  logs/access.log   – Zugriffe auf unsere Webseite',
    '  logs/verlauf.txt  – Befehle, die im Konto „backup“ getippt wurden',
    '',
    'Finde heraus: Wer war es, wie kam er rein, was hat er getan – und wie verhindern wir das?',
    '(Alles erfunden. Die IP-Adressen stammen aus Bereichen, die nur für Beispiele reserviert sind.)', ''));

  // auth.log: Rauschen + Brute-Force + Erfolg
  const auth = [];
  let pid = 4100;
  const ts = (h, m, s) => `Nov  1 ${pad(h)}:${pad(m)}:${pad(s)}`;
  for (let i = 0; i < 12; i++) auth.push({ t: [1, 5 + i * 3, Math.floor(R() * 60)], l: `kollektiv sshd[${pid++}]: Accepted publickey for mara from 192.0.2.10 port ${40000 + i} ssh2` });
  for (let i = 0; i < 9; i++) auth.push({ t: [1, 50 + i, Math.floor(R() * 60)], l: `kollektiv sshd[${pid++}]: Failed password for invalid user test from ${ZWEITER} port ${50000 + i} ssh2` });
  const users = ['root', 'admin', 'mara', 'backup', 'pi', 'oracle'];
  for (let i = 0; i < 143; i++) {
    const sec = 2 * 3600 + 5 * 60 + i * 15;
    const u = users[i % users.length];
    auth.push({ t: [Math.floor(sec / 3600), Math.floor(sec / 60) % 60, sec % 60], l: `kollektiv sshd[${pid++}]: Failed password for ${u === 'admin' || u === 'pi' || u === 'oracle' ? 'invalid user ' : ''}${u} from ${ANGREIFER} port ${51000 + i} ssh2` });
  }
  auth.push({ t: [2, 41, 7], l: `kollektiv sshd[${pid}]: Accepted password for backup from ${ANGREIFER} port 52111 ssh2` });
  auth.push({ t: [2, 41, 7], l: `kollektiv sshd[${pid++}]: pam_unix(sshd:session): session opened for user backup(uid=1003) by (uid=0)` });
  auth.push({ t: [3, 2, 55], l: `kollektiv sshd[${pid - 1}]: pam_unix(sshd:session): session closed for user backup` });
  auth.sort((a, b) => (a.t[0] * 3600 + a.t[1] * 60 + a.t[2]) - (b.t[0] * 3600 + b.t[1] * 60 + b.t[2]));
  p('logs/auth.log', auth.map(x => `${ts(...x.t)} ${x.l}`).join('\n') + '\n');

  // access.log: normale Besucher + Scanner + Download der Sicherung
  const acc = [];
  const ua = 'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0';
  const pages = ['/', '/blog/', '/blog/linux-tipps', '/kontakt', '/style.css', '/logo.png'];
  for (let i = 0; i < 40; i++) acc.push({ s: 3600 + i * 70, l: (t) => `192.0.2.${20 + (i % 9)} - - [01/Nov/2026:${t} +0100] "GET ${pages[i % pages.length]} HTTP/1.1" 200 ${800 + Math.floor(R() * 9000)} "-" "${ua}"` });
  const probe = ['/admin/', '/wp-login.php', '/.env', '/phpmyadmin/', '/config.php', '/.git/HEAD', '/server-status', '/backup/', '/test/', '/old/', '/db.sql', '/login'];
  probe.forEach((u, i) => acc.push({ s: 2 * 3600 + 20 * 60 + i * 9, l: (t) => `${ANGREIFER} - - [01/Nov/2026:${t} +0100] "GET ${u} HTTP/1.1" ${u === '/backup/' ? 200 : 404} ${u === '/backup/' ? 512 : 196} "-" "Mozilla/5.00 (Nikto/2.5.0) (Evasions:None) (Test:${String(1000 + i).padStart(6, '0')})"` }));
  acc.push({ s: 2 * 3600 + 38 * 60 + 12, l: (t) => `${ANGREIFER} - - [01/Nov/2026:${t} +0100] "GET /backup/kollektiv-server.tar.gz HTTP/1.1" 200 4819302 "-" "Wget/1.21.4"` });
  acc.sort((a, b) => a.s - b.s);
  p('logs/access.log', acc.map(x => x.l(`${pad(Math.floor(x.s / 3600))}:${pad(Math.floor(x.s / 60) % 60)}:${pad(x.s % 60)}`)).join('\n') + '\n');

  // Verlauf des Eindringlings im Konto backup
  p('logs/verlauf.txt', T(
    'whoami', 'id', 'uname -a', 'ls -la', 'cat /etc/passwd', 'ls -la /home', 'ls /home/mara',
    'sudo -l', 'find / -perm -4000 2>/dev/null', 'crontab -l',
    `echo "${b64(`Gruss an das Kollektiv. Eure Sicherung lag offen im Netz. ${F.spur}`)}" > /tmp/.gruss`,
    'history -c', 'exit', ''));
  sh.cwd = `${HOME}/spuren`;
}

export const LEVEL9_ROOMS = [
  {
    id: 'b1', title: 'Die Nacht im Kollektiv', type: 'walkthrough', level: 'L9', minutes: 45,
    tools: ['grep', 'awk', 'sort | uniq -c', 'cut', 'base64', 'Zeitleiste'],
    desc: 'Jemand ist in Maras Server eingedrungen. Du liest die Logs wie ein Ermittler: Wer, wann, wie – und wie verhindert man es?',
    ziel: 'Spuren in Logdateien finden und zu einer Zeitleiste zusammensetzen. Als Pentester weißt du danach genau, was deine Angriffe hinterlassen.',
    scope: 'Nur die gesicherten Logs in der Sandbox (~/spuren). Erfundener Fall.',
    stop: 'Keine nötig – reine Auswertung.',
    cleanup: 'Nichts nötig.',
    machine: { kind: 'sandbox' },
    welcome: 'Spurensicherung · Sandbox bereit. Start: cat LIESMICH.txt',
    flags: ['spur'],
    setup,
    commands: () => textTools(),
    tasks: [
      {
        id: 't1', title: 'Wer hat es versucht?', body: 'Fang bei den Anmeldungen an. Fehlgeschlagene Anmeldungen heißen in auth.log „Failed password“.',
        questions: [
          { id: 'q1', type: 'text', q: 'Von welcher IP kamen die meisten fehlgeschlagenen Anmeldungen?', accept: [/^203\.0\.113\.77$/], points: 15, repeat: 'Nachtfalter Stufe 4 (sort | uniq -c)', hints: L(
            'grep "Failed password" logs/auth.log zeigt alle Fehlversuche. Die IP steht hinter „from“.',
            "Mit sed schneidest du alles bis „from “ weg: sed 's/.* from //'. Danach steht die IP vorne – cut -d' ' -f1 nimmt nur sie.",
            'Dann zählen: … | sort | uniq -c | sort -nr',
            "Lösung: grep Failed logs/auth.log | sed 's/.* from //' | cut -d' ' -f1 | sort | uniq -c | sort -nr → 203.0.113.77") },
          { id: 'q2', type: 'text', q: 'Wie viele Fehlversuche kamen von dieser IP?', accept: [/^143$/], points: 10, hints: L('grep kann mit -c zählen. Kombiniere zwei Bedingungen mit einer Pipe.', 'Lösung: grep Failed logs/auth.log | grep -c 203.0.113.77') },
          { id: 'q3', type: 'mc', q: 'Wie nennt man so einen Angriff?', points: 10, options: ['Brute-Force: sehr viele Passwörter für verschiedene Benutzer durchprobieren.', 'Phishing.', 'Ein normaler Login-Fehler.'], answer: 0, hints: L('143 Versuche in rund 35 Minuten, verschiedene Benutzernamen …') },
        ],
      },
      {
        id: 't2', title: 'Der Moment des Einbruchs', body: 'Irgendwann hat es geklappt. Erfolgreiche Anmeldungen heißen „Accepted“.',
        questions: [
          { id: 'q1', type: 'text', q: 'Mit welchem Benutzerkonto kam der Angreifer rein?', accept: [/^backup$/i], points: 10, hints: L('grep Accepted logs/auth.log – aber nur die Zeile mit der Angreifer-IP.', 'Lösung: grep Accepted logs/auth.log | grep 203.0.113.77 → backup') },
          { id: 'q2', type: 'text', q: 'Um wie viel Uhr? (HH:MM:SS)', accept: [/^0?2:41:07$/], points: 10, hints: L('Die Uhrzeit steht am Anfang derselben Zeile.', 'Lösung: 02:41:07') },
          { id: 'q3', type: 'mc', q: 'Mara meldet sich mit „publickey“ an, der Angreifer mit „password“. Was folgt daraus?', points: 10, options: ['Hätte der Server nur Schlüssel erlaubt (kein Passwort-Login), wäre das Passwort allein nutzlos gewesen.', 'publickey ist unsicherer.', 'Das spielt keine Rolle.'], answer: 0, hints: L('Kann man einen SSH-Schlüssel erraten wie ein Passwort?') },
        ],
      },
      {
        id: 't3', title: 'Die Webseite', body: 'Woher kannte der Angreifer das richtige Passwort? Vielleicht hat er vorher auf der Webseite gestöbert.',
        questions: [
          { id: 'q1', type: 'text', q: 'Welches Scan-Werkzeug verrät sich im User-Agent?', accept: [/^nikto$/i, /^nikto\/?2\.5\.0$/i], points: 10, repeat: 'Was die Webseite verrät', hints: L('grep 203.0.113.77 logs/access.log – der User-Agent steht ganz hinten in Anführungszeichen.', 'Lösung: Nikto') },
          { id: 'q2', type: 'text', q: 'Welche Datei hat er erfolgreich heruntergeladen? (Pfad)', accept: [/^\/?backup\/kollektiv-server\.tar\.gz$/i], points: 15, hints: L('Erfolgreich heißt Status 200. Der Status steht direkt hinter dem Teil in Anführungszeichen.', 'Große Downloads erkennst du an der Größe hinter dem Status.', 'Lösung: grep 203.0.113.77 logs/access.log | grep " 200 " → /backup/kollektiv-server.tar.gz') },
          { id: 'q3', type: 'mc', q: 'Wie passt das zusammen?', points: 15, options: ['Eine Sicherung lag offen auf der Webseite. Vermutlich stand darin das Passwort vom Konto backup – der Brute-Force kam vorher, der Treffer danach.', 'Der Angreifer hat das Passwort erraten, die Datei ist egal.', 'Nikto hat das Passwort geknackt.'], answer: 0, hints: L('Vergleiche die Uhrzeiten: Download um 02:38, Anmeldung um 02:41.') },
        ],
      },
      {
        id: 't4', title: 'Was hat er getan?', body: 'Der Verlauf im Konto backup zeigt die getippten Befehle.',
        questions: [
          { id: 'q1', type: 'mc', q: 'Was hat der Angreifer nach dem Login vor allem gemacht?', points: 10, options: ['Sich umgesehen: wer er ist, welche Benutzer es gibt, ob er mehr Rechte bekommen kann (sudo -l, Dateien mit Sonderrechten, Cronjobs).', 'Den Server sofort gelöscht.', 'Nur die Webseite verändert.'], answer: 0, hints: L('Lies logs/verlauf.txt Zeile für Zeile. Welche Befehle kennst du aus dem Kellerserver?') },
          { id: 'q2', type: 'flag', flag: 'spur', q: 'Er hat eine Nachricht hinterlassen. Flag daraus', points: 15, repeat: 'Nachtfalter Stufe 6 (base64)', hints: L('Eine Zeile im Verlauf schreibt etwas Codiertes nach /tmp/.gruss.', 'Der Text zwischen den Anführungszeichen ist base64.', 'Lösung: grep gruss logs/verlauf.txt | cut -d\'"\' -f2 | base64 -d') },
          { id: 'q3', type: 'mc', q: 'Die letzte Zeile ist „history -c“. Warum ist der Verlauf trotzdem da?', points: 10, options: ['Der Verlauf wurde vorher gesichert bzw. separat protokolliert – Spuren zu verwischen gelingt selten vollständig.', 'history -c löscht nichts.', 'Der Angreifer hat sich vertippt.'], answer: 0, hints: L('Wer hat die Datei gesichert, und wann?') },
        ],
      },
      {
        id: 't5', title: 'Zeitleiste & Maßnahmen', body: 'Setze alles zusammen und berate Mara.',
        questions: [
          { id: 'q1', type: 'mc', q: 'Welche Reihenfolge stimmt?', points: 15, options: ['Brute-Force startet (02:05) → Web-Scan mit Nikto (02:20) → Download der Sicherung (02:38) → Login als backup (02:41) → Umsehen → Abmelden (03:02)', 'Login → Brute-Force → Download', 'Download → Web-Scan → Brute-Force'], answer: 0, hints: L('Sortiere die Uhrzeiten aus beiden Logs.') },
          { id: 'q2', type: 'mc', q: 'Was sollte Mara ZUERST tun?', points: 15, options: ['Passwort von backup ändern und Passwort-Login per SSH abschalten, die Sicherung vom Webserver entfernen, prüfen ob weitere Konten betroffen sind.', 'Die IP 203.0.113.77 sperren – das reicht.', 'Nichts, er hat ja nichts gelöscht.'], answer: 0, hints: L('Eine einzelne IP zu sperren hilft wenig – der Angreifer kann eine andere nehmen. Was ist die eigentliche Lücke?') },
          { id: 'q3', type: 'mc', q: 'Was lernst du als Pentester daraus?', points: 10, options: ['Jeder Scan, jeder Login-Versuch und jeder Befehl hinterlässt Spuren – deshalb nur mit Auftrag arbeiten und alles dokumentieren.', 'Mit history -c ist man unsichtbar.', 'Logs liest sowieso niemand.'], answer: 0, hints: L('Du hast gerade selbst alles rekonstruiert.') },
        ],
      },
    ],
    nach: { beobachtung: 'Brute-Force, Web-Scan, offene Sicherung, Login als backup, Umsehen, Nachricht hinterlassen.', schluss: 'Ein Angriff ist eine Kette. Logs machen sie sichtbar – und jede Gegenmaßnahme sollte die eigentliche Lücke schließen, nicht nur ein Symptom.', grenzen: 'Echte Logs sind riesig und unordentlich; Profis nutzen dafür Werkzeuge wie SIEM-Systeme. Die Denkweise ist dieselbe.', naechster: 'Probier es in Kali: journalctl und /var/log zeigen dir die Spuren deiner eigenen Übungen (z. B. vom Kellerserver: docker logs kly-keller).' },
  },
];
