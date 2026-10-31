// Purple-Team-Leitern für Level 5–8 und 10 (SIMULATION, erfundene Systeme).
// Blickwinkel: Prüfer/Purple Team – Fehlkonfigurationen finden, die ein Angreifer nutzen würde, verstehen und beheben.
// Keine Exploits, kein Passwort-Knacken: Es geht um Finden, Bewerten, Absichern.

import { makeLadder, T, p2, b64, hex } from './leiter.js';
import { sha256hexSync as sha } from '../shell.js';

const noise = (R, n) => Array.from({ length: n }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(R() * 36)]).join('');
const pick = (R, a) => a[Math.floor(R() * a.length)];
const first = (s) => String(s).trim().split(/\s+/)[0];

// ============================================================================ L5 – Linux von innen: Rechte & Root
const P5 = makeLadder({
  id: 'p5', title: 'Audit im Rechenzentrum', level: 'L5', dir: 'audit', prefix: 'pruefung', seed: 5505, minutes: 120,
  tools: ['/etc/passwd', 'Shadow-Felder', 'SUID-Liste', 'sudoers', 'Cron', 'PATH', 'sshd_config', 'awk', 'diff'],
  desc: 'Purple Team, Level 5: Ein Server im (erfundenen) Rechenzentrum Talheim wird geprüft. Du findest die Fehlkonfigurationen, über die ein Angreifer zu root käme – und weißt, wie man sie schließt.',
  ziel: 'Die typischen Linux-Schwachstellen für Rechteausweitung erkennen: zweite UID 0, leere Passwörter, ungewöhnliche SUID-Programme, zu weite sudo-Rechte, beschreibbare Cron-Skripte, unsicherer PATH, SSH-Einstellungen.',
  intro: T('AUDIT – Server rz-07, Rechenzentrum Talheim (erfunden)', '', 'Du bekommst Abzüge der wichtigsten Systemdateien (jede Prüfung hat ihren Ordner).',
    'Finde in jeder Prüfung die Fehlkonfiguration. Der Code liegt in befunde/NAME.txt – NAME findest du heraus.', 'Weiter wie immer mit  entsperren CODE.', '', 'Start:  cd pruefung00', ''),
  finale: T('Audit abgeschlossen. rz-07 bekommt: keine zweite UID 0, Passwörter für alle Konten, nur Standard-SUID,', 'sudo nur gezielt, Cron-Skripte nur root-beschreibbar, sauberer PATH und SSH ohne root-Login.', 'Genau diese Punkte prüft ein Angreifer nach dem ersten Zugang – jetzt findet er nichts mehr.', ''),
  nach: { beobachtung: 'UID 0, leere Passwörter, SUID, sudo, Cron, PATH, SSH.', schluss: 'Rechteausweitung nutzt fast immer Fehlkonfigurationen – wer sie findet und schließt, nimmt dem Angreifer den Weg zu root.', grenzen: 'Abzüge statt echtes System. In Kali kannst du dieselben Prüfungen auf deiner eigenen VM machen.', naechster: 'Der Passwort-Tresor (Level 6).' },
  floors: [
    { t: 'Zwei Könige', pts: 15, body: 'In passwd.txt (Abzug von /etc/passwd) hat neben root ein zweites Konto die UID 0 – also volle root-Rechte.',
      build(c) {
        const l = ['root:x:0:0:root:/root:/bin/bash', 'daemon:x:1:1::/usr/sbin:/usr/sbin/nologin', 'www-data:x:33:33::/var/www:/usr/sbin/nologin'];
        for (let i = 0; i < 25; i++) l.push(`${pick(c.R, ['anna', 'bert', 'cem', 'dora', 'emil'])}${i}:x:${1000 + i}:${1000 + i}::/home/u${i}:/bin/bash`);
        l.splice(14, 0, 'wartung:x:0:0:Wartung:/opt/wartung:/bin/bash');
        c.put('passwd.txt', l.join('\n') + '\n');
        c.put('befunde/wartung.txt', `Befund: zweites Konto mit UID 0. Fix: UID ändern oder Konto löschen. Code: ${c.code}\n`); c.put('befunde/root.txt', 'root darf UID 0 haben. Gesucht ist das ANDERE Konto.\n');
      },
      hints: ['Die Felder in /etc/passwd sind mit : getrennt. Feld 3 ist die UID.', "awk -F: '$3==0 {print $1}' passwd.txt zeigt alle Konten mit UID 0.", "Lösung: awk -F: '$3==0 {print $1}' passwd.txt → cat befunde/wartung.txt"],
      solve: (run) => run(`cat befunde/${run("awk -F: '$3==0 {print $1}' passwd.txt").trim().split('\n').find(x => x !== 'root')}.txt`) },
    { t: 'Ohne Passwort', pts: 15, body: 'shadow.txt (Abzug von /etc/shadow, Hashes gekürzt). Ein Konto hat ein LEERES Passwortfeld – Anmeldung ohne Passwort.',
      build(c) {
        const l = [];
        for (let i = 0; i < 20; i++) l.push(`user${i}:$6$${noise(c.R, 8)}$${noise(c.R, 20)}:19700:0:99999:7:::`);
        l.splice(7, 0, 'gast::19700:0:99999:7:::'); l.splice(3, 0, 'nobody:*:19700:0:99999:7:::');
        c.put('shadow.txt', l.join('\n') + '\n');
        c.put('befunde/gast.txt', `Befund: Konto ohne Passwort. Fix: passwd -l gast oder Passwort setzen. Code: ${c.code}\n`); c.put('befunde/nobody.txt', '* heißt: gesperrt. Das ist in Ordnung.\n');
      },
      hints: ['Feld 2 ist das Passwort-Feld. * oder ! heißt gesperrt – LEER heißt: kein Passwort.', "awk -F: '$2==\"\" {print $1}' shadow.txt", "Lösung: awk -F: '$2==\"\" {print $1}' shadow.txt → cat befunde/gast.txt"],
      solve: (run) => run(`cat befunde/${run("awk -F: '$2==\"\" {print $1}' shadow.txt").trim()}.txt`) },
    { t: 'Das fremde SUID-Programm', pts: 20, rep: 'Stellwerk Posten 3 (diff)',
      body: 'suid-ist.txt: alle Programme mit SUID-Bit auf rz-07. suid-soll.txt: was auf so einem Server normal ist. Eins gehört nicht dazu.',
      build(c) {
        const std = ['/usr/bin/passwd', '/usr/bin/su', '/usr/bin/sudo', '/usr/bin/mount', '/usr/bin/umount', '/usr/bin/chsh', '/usr/bin/chfn', '/usr/bin/newgrp', '/usr/bin/gpasswd', '/usr/lib/openssh/ssh-keysign'];
        c.put('suid-soll.txt', std.join('\n') + '\n');
        c.put('suid-ist.txt', [...std.slice(0, 6), '/opt/backup/sicherungstool', ...std.slice(6)].sort(() => c.R() - 0.5).join('\n') + '\n');
        c.put('befunde/sicherungstool.txt', `Befund: unbekanntes SUID-Programm läuft mit root-Rechten. Fix: chmod u-s, prüfen ob nötig. Code: ${c.code}\n`);
      },
      hints: ['SUID heißt: Das Programm läuft mit den Rechten des Besitzers – oft root. Unbekannte SUID-Programme sind ein Klassiker für Rechteausweitung.', 'Beide Listen sortieren und mit diff vergleichen.', 'Lösung: sort suid-soll.txt > a; sort suid-ist.txt > b; diff a b → cat befunde/sicherungstool.txt (basename)'],
      solve: (run) => { run('sort suid-soll.txt > a; sort suid-ist.txt > b'); return run(`cat befunde/$(basename ${run('diff a b').match(/> (\S+)/)[1]}).txt`); } },
    { t: 'Zu viel sudo', pts: 15, body: 'sudoers.txt: Wer darf was mit sudo? Ein Benutzer darf ALLES ohne Passwort.',
      build(c) {
        c.put('sudoers.txt', T('Defaults env_reset', 'root    ALL=(ALL:ALL) ALL', '%admin  ALL=(ALL) ALL', 'backup  ALL=(root) NOPASSWD: /usr/bin/rsync', 'monitor ALL=(root) NOPASSWD: /usr/bin/systemctl status *', 'praktikant ALL=(ALL) NOPASSWD: ALL', 'webadm  ALL=(www-data) /usr/bin/php', ''));
        c.put('befunde/praktikant.txt', `Befund: NOPASSWD: ALL – wer dieses Konto übernimmt, ist sofort root. Fix: Regel entfernen/einschränken. Code: ${c.code}\n`);
        c.put('befunde/backup.txt', 'Eingeschränkt auf rsync – trotzdem prüfen, aber nicht der gesuchte Befund.\n');
      },
      hints: ['NOPASSWD heißt: kein Passwort nötig. Gefährlich wird es, wenn dahinter ALL steht.', 'grep "NOPASSWD: ALL" sudoers.txt', 'Lösung: grep "NOPASSWD: ALL" sudoers.txt → cat befunde/praktikant.txt'],
      solve: (run) => run(`cat befunde/${first(run('grep "NOPASSWD: ALL" sudoers.txt'))}.txt`) },
    { t: 'Das beschreibbare Cron-Skript', pts: 20, rep: 'Kellerserver (Rechte)',
      body: 'crontab.txt zeigt, welche Skripte root regelmäßig startet. ls-l.txt zeigt ihre Rechte. Eins davon darf JEDER verändern.',
      build(c) {
        const scripts = ['/opt/jobs/aufraeumen.sh', '/opt/jobs/sicherung.sh', '/opt/jobs/bericht.sh', '/opt/jobs/logrotate.sh', '/opt/jobs/statistik.sh'];
        c.put('crontab.txt', scripts.map((s, i) => `${i * 10} 3 * * * root ${s}`).join('\n') + '\n');
        c.put('ls-l.txt', scripts.map(s => `${s.endsWith('bericht.sh') ? '-rwxrwxrwx' : '-rwxr-xr-x'} 1 root root 412 Okt 30 02:00 ${s}`).join('\n') + '\n');
        c.put('befunde/bericht.sh.txt', `Befund: root führt ein Skript aus, das jeder ändern darf. Fix: chmod 755 bzw. 700. Code: ${c.code}\n`);
      },
      hints: ['rwxrwxrwx heißt: Besitzer, Gruppe UND alle anderen dürfen schreiben.', 'grep rwxrwxrwx ls-l.txt – der Dateiname steht ganz hinten.', 'Lösung: grep rwxrwxrwx ls-l.txt → cat befunde/bericht.sh.txt'],
      solve: (run) => run(`cat befunde/$(basename ${run("grep rwxrwxrwx ls-l.txt | awk '{print $NF}'").trim()}).txt`) },
    { t: 'Der gefährliche Pfad', pts: 15, body: 'profile-root.txt ist das Startskript von root. Ein Eintrag im PATH steht ganz vorne, obwohl dort jeder Dateien ablegen kann.',
      build(c) {
        c.put('profile-root.txt', T('# ~/.profile von root', 'umask 022', 'export PATH=/tmp:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin', 'export EDITOR=nano', ''));
        c.put('befunde/tmp.txt', `Befund: /tmp vorne im PATH von root – ein Angreifer legt dort z. B. ein falsches „ls“ ab. Fix: /tmp entfernen. Code: ${c.code}\n`);
      },
      hints: ['PATH ist die Liste der Ordner, in denen die Shell Programme sucht – von links nach rechts.', 'grep PATH profile-root.txt. Welcher Ordner ist für alle beschreibbar?', 'Lösung: grep PATH profile-root.txt → /tmp → cat befunde/tmp.txt'],
      solve: (run) => run(`cat befunde/${run("grep PATH profile-root.txt | cut -d= -f2 | cut -d: -f1").trim().replace('/', '')}.txt`) },
    { t: 'SSH für root', pts: 15, body: 'sshd_config.txt: Eine aktive Einstellung erlaubt die direkte Anmeldung als root.',
      build(c) {
        c.put('sshd_config.txt', T('# Port 22', 'Port 22', '#PermitRootLogin prohibit-password', 'PermitRootLogin yes', 'PasswordAuthentication yes', 'X11Forwarding yes', 'PubkeyAuthentication yes', 'UsePAM yes', ''));
        c.put('befunde/PermitRootLogin.txt', `Befund: root darf sich direkt per SSH anmelden. Fix: PermitRootLogin no. Code: ${c.code}\n`);
        c.put('befunde/PasswordAuthentication.txt', 'Auch ein Risiko – aber gesucht ist die root-Einstellung.\n');
      },
      hints: ['Zeilen mit # am Anfang sind Kommentare und gelten nicht.', 'grep -v "^#" sshd_config.txt | grep -i root', 'Lösung: grep -v "^#" sshd_config.txt | grep -i root → cat befunde/PermitRootLogin.txt'],
      solve: (run) => run(`cat befunde/${first(run('grep -v "^#" sshd_config.txt | grep -i root'))}.txt`) },
    { t: 'Der Prüfbericht', pts: 25, rep: 'Tresorraum Kammer 8',
      body: 'Alle Befunde stehen in befunde.csv mit einer Punktzahl (1–10). Der Code liegt beim Befund mit der höchsten Punktzahl.',
      build(c) {
        const b = [['zweites_uid0', 10], ['leeres_passwort', 9], ['suid_fremd', 8], ['sudo_nopasswd_all', 10], ['cron_schreibbar', 9], ['path_tmp', 7], ['ssh_root', 6]];
        b[3][1] = 10; b[0][1] = 9.5;
        c.put('befunde.csv', 'befund;punkte;status\n' + b.map(([n, p]) => `${n};${p};offen`).join('\n') + '\n');
        for (const [n] of b) c.put(`berichte/${n}.txt`, n === 'sudo_nopasswd_all' ? `Höchste Priorität: zuerst beheben. Code: ${c.code}\n` : 'Wichtig, aber nicht ganz oben.\n');
      },
      hints: ["sort -t';' -k2 -nr befunde.csv sortiert nach Punkten absteigend.", 'head -n 1 nimmt die oberste Zeile, cut -d";" -f1 den Namen.', "Lösung: sort -t';' -k2 -nr befunde.csv | head -n 1 | cut -d';' -f1 → cat berichte/NAME.txt"],
      solve: (run) => run(`cat berichte/${run("sort -t';' -k2 -nr befunde.csv | head -n 1 | cut -d';' -f1").trim()}.txt`) },
  ],
});

// ============================================================================ L6 – Passwörter & Hashes
const P6 = makeLadder({
  id: 'p6', title: 'Der Passwort-Tresor', level: 'L6', dir: 'passwort', prefix: 'fach', seed: 6606, minutes: 90,
  tools: ['Hash-Arten', 'grep -E', 'uniq -d', 'awk length', 'grep -r', 'Salt', 'sha256sum'],
  desc: 'Purple Team, Level 6: Die (erfundene) Stadtverwaltung Talheim lässt prüfen, wie sie Passwörter speichert. Du erkennst schwache Verfahren, fehlende Salts, Klartext im Code – und was man stattdessen tut.',
  ziel: 'Hash-Arten erkennen, verstehen warum Salt und langsame Verfahren wichtig sind, Klartext-Geheimnisse finden, Passwortregeln prüfen.',
  intro: T('PRÜFUNG – Passwortspeicherung der Stadtverwaltung (erfunden)', '', 'Acht Fächer im Tresor. In jedem: eine Frage zur Passwortsicherheit.',
    'Der Code liegt jeweils in einer Datei, deren Namen du herausfindest.', '', 'Start:  cd fach00', ''),
  finale: T('Empfehlung an die Stadtverwaltung:', '– Passwörter nur mit bcrypt oder Argon2 speichern (langsam, mit Salt).', '– Keine Geheimnisse im Code, keine Klartext-Passwörter in Dateien.', '– Lange Passwörter statt komplizierter Regeln, dazu Passwortmanager und Zwei-Faktor.', ''),
  nach: { beobachtung: 'Hash-Arten, fehlender Salt, Klartext im Code, Richtlinien, Kostenfaktor.', schluss: 'Ob ein gestohlener Passwort-Hash gefährlich ist, entscheidet sich beim Speichern – nicht beim Angriff.', grenzen: 'Erfundene Daten.', naechster: 'Schwachstellen-Sprechstunde (Level 7).' },
  floors: [
    { t: 'Welcher Hash ist das?', pts: 10, body: 'hashes.txt enthält Hashes verschiedener Verfahren, je mit Namen davor. Gesucht: der bcrypt-Hash. bcrypt beginnt immer mit $2a$, $2b$ oder $2y$.',
      build(c) {
        c.put('hashes.txt', T(`alt_md5:${noise(c.R, 32).replace(/[g-z]/g, 'a')}`, `alt_sha1:${noise(c.R, 40).replace(/[g-z]/g, 'b')}`, `linux_sha512:$6$${noise(c.R, 8)}$${noise(c.R, 30)}`, `neu_bcrypt:$2y$12$${noise(c.R, 50)}`, `linux_md5:$1$${noise(c.R, 8)}$${noise(c.R, 22)}`, ''));
        c.put('befunde/neu_bcrypt.txt', `Richtig: bcrypt ist langsam und hat einen Salt – gut für Passwörter. Code: ${c.code}\n`);
      },
      hints: ['Das $ ist in grep ein Sonderzeichen (Zeilenende). Mit \\$ in einfachen Anführungszeichen meinst du das Zeichen selbst.', "grep '\\$2[aby]\\$' hashes.txt", "Lösung: grep '\\$2[aby]\\$' hashes.txt | cut -d: -f1 → cat befunde/neu_bcrypt.txt"],
      solve: (run) => run(`cat befunde/${run("grep '\\$2[aby]\\$' hashes.txt | cut -d: -f1").trim()}.txt`) },
    { t: 'Zu kurz für SHA-256', pts: 15, body: 'Hashes ohne Kennung erkennt man an der Länge: MD5 = 32, SHA-1 = 40, SHA-256 = 64 Hex-Zeichen. Welche Zeile ist SHA-256?',
      build(c) {
        const hx = (n) => Array.from({ length: n }, () => '0123456789abcdef'[Math.floor(c.R() * 16)]).join('');
        const rows = []; for (let i = 0; i < 12; i++) rows.push(`h${p2(i)} ${hx(i % 2 ? 32 : 40)}`);
        rows.splice(8, 0, `h99 ${hx(64)}`);
        c.put('ohne-kennung.txt', rows.join('\n') + '\n');
        c.put('befunde/h99.txt', `Richtig erkannt: 64 Hex-Zeichen = SHA-256. Code: ${c.code}\n`);
      },
      hints: ["awk kann die Länge eines Feldes messen: length($2).", "awk 'length($2)==64 {print $1}' ohne-kennung.txt", "Lösung: awk 'length($2)==64 {print $1}' ohne-kennung.txt → cat befunde/h99.txt"],
      solve: (run) => run(`cat befunde/${run("awk 'length($2)==64 {print $1}' ohne-kennung.txt").trim()}.txt`) },
    { t: 'Ohne Salt verraten', pts: 20, rep: 'Funkturm Etage 6 (uniq)',
      body: 'alte-db.txt: Benutzer und ungesalzene SHA-256-Hashes. Zwei Personen haben DASSELBE Passwort – man sieht es am gleichen Hash. Genau das verhindert ein Salt.',
      build(c) {
        const hx = () => Array.from({ length: 64 }, () => '0123456789abcdef'[Math.floor(c.R() * 16)]).join('');
        const same = hx(); const rows = [];
        for (let i = 0; i < 30; i++) rows.push(`person${p2(i)};${hx()}`);
        rows[4] = `person04;${same}`; rows[22] = `person22;${same}`;
        c.put('alte-db.txt', rows.join('\n') + '\n');
        c.put(`befunde/${same.slice(0, 8)}.txt`, `Zwei Konten, ein Hash – ohne Salt verrät die Datenbank gleiche Passwörter. Code: ${c.code}\n`);
        c.put('hinweis.txt', 'Der Code liegt in befunde/ERSTE8ZEICHEN.txt – die ersten 8 Zeichen des doppelten Hashes.\n');
      },
      hints: ['Nur die Hash-Spalte: cut -d";" -f2', 'Doppelte finden: sort | uniq -d', 'Lösung: cut -d";" -f2 alte-db.txt | sort | uniq -d | cut -c1-8 → cat befunde/XXXXXXXX.txt'],
      solve: (run) => run(`cat befunde/${run('cut -d";" -f2 alte-db.txt | sort | uniq -d | cut -c1-8').trim()}.txt`) },
    { t: 'Die Regel', pts: 15, body: 'test-passwoerter.txt: Beispielpasswörter aus einer Schulung (erfunden). Wie viele sind KÜRZER als 12 Zeichen? Die Zahl ist der Dateiname.',
      build(c) {
        const pw = []; let kurz = 0;
        for (let i = 0; i < 40; i++) { const n = 6 + Math.floor(c.R() * 14); if (n < 12) kurz++; pw.push(noise(c.R, n)); }
        c.put('test-passwoerter.txt', pw.join('\n') + '\n');
        for (let v = 0; v <= 40; v++) c.put(`befunde/${v}.txt`, v === kurz ? `Richtig gezählt. Lange Passwörter schlagen komplizierte Regeln. Code: ${c.code}\n` : 'Falsch gezählt.\n');
      },
      hints: ["awk 'length($0)<12' zeigt Zeilen mit weniger als 12 Zeichen.", 'wc -l zählt sie.', "Lösung: awk 'length($0)<12' test-passwoerter.txt | wc -l → cat befunde/ZAHL.txt"],
      solve: (run) => run(`cat befunde/${run("awk 'length($0)<12' test-passwoerter.txt | wc -l").trim()}.txt`) },
    { t: 'Geheimnis im Code', pts: 20, rep: 'Bewerbung (.env) + Nebel (Git)',
      body: 'Der Quellcode des Bürgerportals liegt unter projekt/. Irgendwo steht ein Passwort im Klartext.',
      build(c) {
        const files = ['app.py', 'config/default.py', 'config/prod.py', 'lib/db.py', 'lib/mail.py', 'templates/index.html', 'README.md', 'tests/test_app.py'];
        for (const f of files) c.put(`projekt/${f}`, f === 'config/prod.py' ? `DEBUG = False\nDB_USER = "portal"\nDB_PASSWORD = "${c.code}"\n` : `# ${f}\nwert = ${Math.floor(c.R() * 99)}\n`);
      },
      hints: ['grep -r durchsucht alle Dateien. -i für Groß/Klein.', 'grep -ri "password" projekt', 'Lösung: grep -ri "password" projekt'],
      solve: (run) => run('grep -ri "password" projekt') },
    { t: 'Mit Salt', pts: 20, rep: 'Bewerbung Runde 7',
      body: 'neue-db.txt speichert SALT:HASH, wobei HASH = sha256(SALT + Passwort). Welches Wort aus der Schulungsliste woerter.txt gehört zu Konto „kasse“? So prüfen Admins schwache Standardpasswörter in der EIGENEN Datenbank.',
      build(c) {
        const ws = ['sommer2026', 'talheim', 'rathaus', 'passwort', 'willkommen', 'fruehling', 'buergeramt', 'herbst', 'hallo123', 'start'];
        const w = pick(c.R, ws); const salt = noise(c.R, 8);
        c.put('woerter.txt', ws.join('\n') + '\n');
        c.put('neue-db.txt', `kasse:${salt}:${sha(salt + w)}\nbuero:${noise(c.R, 8)}:${noise(c.R, 64)}\n`);
        c.put(`befunde/${w}.txt`, `Standardpasswort gefunden – sofort ändern lassen! Code: ${c.code}\n`);
      },
      hints: ['Salt und Hash von kasse: grep kasse neue-db.txt | cut -d: -f2 bzw. -f3', 'Für jedes Wort: echo -n "${SALT}$w" | sha256sum', 'Lösung: S=$(grep kasse neue-db.txt | cut -d: -f2); H=$(grep kasse neue-db.txt | cut -d: -f3); for w in $(cat woerter.txt); do echo -n "$S$w" | sha256sum | grep -q $H && echo $w; done → cat befunde/WORT.txt'],
      solve: (run) => run(`cat befunde/${run('S=$(grep kasse neue-db.txt | cut -d: -f2); H=$(grep kasse neue-db.txt | cut -d: -f3); for w in $(cat woerter.txt); do echo -n "$S$w" | sha256sum | grep -q $H && echo $w; done').trim()}.txt`) },
    { t: 'Im Leak?', pts: 15, body: 'Eine (erfundene) Liste geleakter E-Mail-Adressen und die Mitarbeiterliste. Wer aus der Verwaltung steht im Leak und muss sein Passwort ändern?',
      build(c) {
        const ma = Array.from({ length: 25 }, (_, i) => `ma${p2(i)}@talheim.example`); const hit = ma[17];
        const leak = Array.from({ length: 60 }, () => `${noise(c.R, 7)}@${pick(c.R, ['mail.example', 'post.example', 'web.example'])}`); leak.splice(31, 0, hit);
        c.put('mitarbeiter.txt', ma.join('\n') + '\n'); c.put('leak.txt', leak.join('\n') + '\n');
        c.put(`befunde/${hit.split('@')[0]}.txt`, `Im Leak gefunden: Passwort ändern, Zwei-Faktor einschalten. Code: ${c.code}\n`);
      },
      hints: ['Für jede Mitarbeiter-Adresse prüfen, ob sie im Leak steht: while read m; do …; done < mitarbeiter.txt', 'grep -q "$m" leak.txt && echo $m', 'Lösung: while read m; do grep -q "$m" leak.txt && echo $m; done < mitarbeiter.txt → cat befunde/maNN.txt'],
      solve: (run) => run(`cat befunde/${run('while read m; do grep -q "$m" leak.txt && echo $m; done < mitarbeiter.txt').trim().split('@')[0]}.txt`) },
    { t: 'Zu schnell', pts: 25, body: 'bcrypt hat einen Kostenfaktor ($2y$12$ = 12). Je höher, desto langsamer für Angreifer. Ein Konto in bcrypt.txt hat einen viel zu niedrigen Faktor (unter 10).',
      build(c) {
        const rows = []; for (let i = 0; i < 20; i++) rows.push(`konto${p2(i)}:$2y$${12 + (i % 3)}$${noise(c.R, 53)}`);
        rows[13] = `konto13:$2y$04$${noise(c.R, 53)}`;
        c.put('bcrypt.txt', rows.join('\n') + '\n');
        c.put('befunde/konto13.txt', `Kostenfaktor 4 ist viel zu schnell. Fix: neu hashen mit mindestens 12. Code: ${c.code}\n`);
      },
      hints: ['Mit -F\'$\' trennt awk an den Dollarzeichen. Dann ist Feld 3 der Kostenfaktor.', "awk -F'$' '$3<10' bcrypt.txt", "Lösung: awk -F'$' '$3<10' bcrypt.txt | cut -d: -f1 → cat befunde/konto13.txt"],
      solve: (run) => run(`cat befunde/${run("awk -F'$' '$3<10' bcrypt.txt | cut -d: -f1").trim()}.txt`) },
  ],
});

// ============================================================================ L7 – Schwachstellen (Management, Prüfer-Sicht)
const P7 = makeLadder({
  id: 'p7', title: 'Schwachstellen-Sprechstunde', level: 'L7', dir: 'schwachstellen', prefix: 'fall', seed: 7707, minutes: 90,
  tools: ['Inventar', 'Schwachstellen-Datenbank', 'CVSS', 'sort -k', 'awk', 'diff', 'Gegenprobe'],
  desc: 'Purple Team, Level 7: Von der gefundenen Version zur bekannten Schwachstelle – und zur richtigen Reihenfolge beim Patchen. Erfundene Software, erfundene Kennungen.',
  ziel: 'Versionen mit einer Schwachstellen-Datenbank abgleichen, CVSS-Werte lesen, Fehlalarme per Gegenprobe erkennen, Risiken priorisieren.',
  intro: T('SPRECHSTUNDE – Schwachstellenmanagement (erfunden)', '', 'Die IT von Talheim hat Fragen. Du hast: Inventarlisten, Scannerberichte und eine kleine Schwachstellen-Datenbank.',
    'Alle Produkte und Kennungen (KLY-2026-…) sind erfunden.', '', 'Start:  cd fall00', ''),
  finale: T('Die IT patcht jetzt nach deiner Liste: erst kritisch UND aus dem Internet erreichbar, dann der Rest.', 'Und sie weiß: Ein Scanner-Treffer ist ein Hinweis, kein Beweis.', ''),
  nach: { beobachtung: 'Abgleich Inventar ↔ Datenbank, CVSS, Fehlalarme, Priorisierung.', schluss: 'Schwachstellen finden ist leicht – die richtige Reihenfolge beim Beheben ist die eigentliche Kunst.', grenzen: 'Erfundene Produkte. Echte Datenbanken: CVE, NVD, Exploit-DB (searchsploit).', naechster: 'Das Firmennetz (Level 8).' },
  extra: () => ({
    suche(args, { sh }) {
      const q = args.join(' ').toLowerCase();
      if (!q) return { out: '', err: 'Aufruf: suche BEGRIFF   (durchsucht die Schwachstellen-Datenbank, wie searchsploit)\n', code: 1 };
      const db = sh.read(`${sh.cwd}/db.csv`) || '';
      const terms = q.split(/\s+/); // wie searchsploit: alle Begriffe müssen vorkommen
      const hits = db.split('\n').filter(l => terms.every(t => l.toLowerCase().includes(t)));
      return { out: hits.length ? hits.join('\n') + '\n' : 'Keine Treffer.\n', code: hits.length ? 0 : 1 };
    },
  }),
  floors: [
    { t: 'Was läuft bei uns?', pts: 10, body: 'inventar.txt: installierte Software. db.csv: bekannte Schwachstellen (Produkt;Version;Kennung;CVSS). Welches Produkt aus dem Inventar steht in der Datenbank?',
      build(c) {
        const inv = ['Bildwerk 3.2', 'Kalendra 1.9', 'PortalPro 5.0', 'DruckDienst 2.4', 'MailFix 7.1'];
        c.put('inventar.txt', inv.join('\n') + '\n');
        c.put('db.csv', 'produkt;version;kennung;cvss\nFotoBox;2.1;KLY-2026-0101;6.5\nPortalPro;5.0;KLY-2026-0142;9.1\nWebDesk;4.4;KLY-2026-0150;7.2\n');
        c.put('befunde/PortalPro.txt', `Treffer: PortalPro 5.0 ist betroffen. Code: ${c.code}\n`);
      },
      hints: ['Für jede Zeile im Inventar: Produktname nehmen und in db.csv suchen.', 'while read p v; do grep -q "^$p;$v;" db.csv && echo $p; done < inventar.txt', 'Lösung: while read p v; do grep -q "^$p;$v;" db.csv && echo $p; done < inventar.txt → cat befunde/PortalPro.txt'],
      solve: (run) => run(`cat befunde/${run('while read p v; do grep -q "^$p;$v;" db.csv && echo $p; done < inventar.txt').trim()}.txt`) },
    { t: 'Die Datenbank fragen', pts: 10, body: 'In diesem Raum gibt es das Werkzeug suche – wie searchsploit in Kali, nur für unsere kleine Datenbank. Was ist zu „Kalendra“ bekannt?',
      build(c) { c.put('db.csv', `produkt;version;kennung;cvss;hinweis\nKalendra;1.9;KLY-2026-0077;8.8;Update auf 2.0 behebt das. Code: ${c.code}\nKalendra;1.2;KLY-2025-0011;5.0;alt\nNotizo;3.0;KLY-2026-0090;4.3;-\n`); },
      hints: ['suche BEGRIFF durchsucht db.csv in diesem Ordner.', 'In Kali heißt das echte Werkzeug searchsploit und durchsucht die Exploit-DB offline.', 'Lösung: suche kalendra 1.9'],
      solve: (run) => run('suche kalendra 1.9') },
    { t: 'Am gefährlichsten', pts: 15, rep: 'Stellwerk (sort -k)', body: 'scanbericht.csv listet Funde mit CVSS-Wert (0–10). Welcher Host hat den höchsten?',
      build(c) {
        const rows = ['host;kennung;cvss'];
        for (let i = 0; i < 25; i++) rows.push(`srv${p2(i)};KLY-2026-0${100 + i};${(Math.floor(c.R() * 85) / 10).toFixed(1)}`);
        rows.splice(9, 0, 'srv77;KLY-2026-0199;9.8');
        c.put('scanbericht.csv', rows.join('\n') + '\n');
        c.put('befunde/srv77.txt', `CVSS 9.8 = kritisch. Code: ${c.code}\n`);
      },
      hints: ["sort -t';' -k3 -nr sortiert nach der 3. Spalte, absteigend als Zahl.", 'head -n 1 und cut -d";" -f1.', "Lösung: sort -t';' -k3 -nr scanbericht.csv | head -n 1 | cut -d';' -f1 → cat befunde/srv77.txt"],
      solve: (run) => run(`cat befunde/${run("sort -t';' -k3 -nr scanbericht.csv | head -n 1 | cut -d';' -f1").trim()}.txt`) },
    { t: 'Ein Fehlalarm', pts: 20, rep: 'Ports & Dienste (Banner lügen)',
      body: 'Der Scanner meldet für drei Server „MailFix 7.1 – verwundbar“, nur anhand des Banners. versionen/ enthält die ECHTE Version jedes Servers. Einer ist längst gepatcht (7.3).',
      build(c) {
        c.put('scanner.txt', 'mx1 MailFix 7.1 verwundbar\nmx2 MailFix 7.1 verwundbar\nmx3 MailFix 7.1 verwundbar\n');
        c.put('versionen/mx1', '7.1\n'); c.put('versionen/mx2', '7.3\n'); c.put('versionen/mx3', '7.1\n');
        c.put('befunde/mx2.txt', `Fehlalarm: Banner zeigt 7.1, installiert ist 7.3. Gegenprobe macht den Unterschied. Code: ${c.code}\n`);
      },
      hints: ['Ein Banner ist eine Selbstauskunft – nicht zwingend die Wahrheit.', 'grep -L 7.1 versionen/* zeigt Dateien, die 7.1 NICHT enthalten. Oder: grep 7.3 versionen/*', 'Lösung: grep -l 7.3 versionen/* → cat befunde/mx2.txt'],
      solve: (run) => run(`cat befunde/$(basename ${run('grep -l 7.3 versionen/*').trim()}).txt`) },
    { t: 'Nicht aktualisiert', pts: 15, rep: 'Stellwerk Posten 3 (diff)', body: 'pakete-vorher.txt und pakete-nachher.txt: Paketlisten vor und nach dem Update-Tag. Ein Paket hat seine Version NICHT geändert.',
      build(c) {
        const p = ['bildwerk', 'kalendra', 'portalpro', 'druckdienst', 'mailfix', 'notizo', 'webdesk', 'zeitwerk'];
        c.put('pakete-vorher.txt', p.map(x => `${x} 1.${Math.floor(c.R() * 8)}`).join('\n') + '\n');
        c.put('pakete-nachher.txt', '__NACH__\n');
        c.put('befunde/druckdienst.txt', `Nicht aktualisiert – nachholen! Code: ${c.code}\n`);
      },
      hints: ['diff zeigt Zeilen, die sich unterscheiden. Hier interessiert die Zeile, die GLEICH geblieben ist.', 'Unveränderte Zeilen stehen in beiden Dateien identisch. cat beide | sort | uniq -d zeigt genau diese.', 'Lösung: cat pakete-vorher.txt pakete-nachher.txt | sort | uniq -d → cat befunde/druckdienst.txt'],
      solve: (run) => run(`cat befunde/${first(run('cat pakete-vorher.txt pakete-nachher.txt | sort | uniq -d'))}.txt`) },
    { t: 'Was zuerst?', pts: 25, body: 'risiko.csv: host;cvss;erreichbarkeit (internet=2, intern=1). Risiko = CVSS × Erreichbarkeit. Welcher Host hat das höchste Risiko?',
      build(c) {
        const rows = ['host;cvss;erreichbar'];
        rows.push('intranet;9.8;1', 'webshop;7.5;2', 'drucker;6.0;1', 'vpn;8.1;2', 'wiki;5.3;2', 'backup;9.0;1');
        c.put('risiko.csv', rows.join('\n') + '\n');
        c.put('befunde/vpn.txt', `8.1 × 2 = 16.2 – aus dem Internet erreichbar schlägt „nur intern kritisch“. Code: ${c.code}\n`);
      },
      hints: ['Die Bash rechnet nur mit ganzen Zahlen. Aus 8.1 wird mit tr -d . die Zahl 81 – das Verhältnis bleibt gleich.', 'Zeile für Zeile: grep -v host risiko.csv | while read z; do …; done – die Felder holst du mit cut.', "Lösung: grep -v host risiko.csv | while read z; do c=$(echo $z | cut -d';' -f2 | tr -d .); e=$(echo $z | cut -d';' -f3); echo \"$((c*e)) $(echo $z | cut -d';' -f1)\"; done | sort -nr | head -1 → cat befunde/vpn.txt"],
      solve: (run) => run(`cat befunde/${run("grep -v host risiko.csv | while read z; do c=$(echo $z | cut -d';' -f2 | tr -d .); e=$(echo $z | cut -d';' -f3); echo \"$((c*e)) $(echo $z | cut -d';' -f1)\"; done | sort -nr | head -1").trim().split(' ')[1]}.txt`) },
  ],
});
{
  const orig = P7.setup;
  P7.setup = (sh, F, solved) => {
    orig(sh, F, solved);
    const d = P7.dirOf(4);
    const vor = sh.read(`${d}/pakete-vorher.txt`).trim().split('\n');
    sh.fs.put(`${d}/pakete-nachher.txt`, vor.map(l => { const [n, v] = l.split(' '); return n === 'druckdienst' ? l : `${n} ${v.split('.')[0]}.${+v.split('.')[1] + 1}`; }).join('\n') + '\n');
  };
}

// ============================================================================ L8 – Netzwerkdienste & Windows/AD (Audit-Sicht)
const P8 = makeLadder({
  id: 'p8', title: 'Das Firmennetz', level: 'L8', dir: 'firmennetz', prefix: 'check', seed: 8808, minutes: 100,
  tools: ['SMB-Freigaben', 'AD-Export', 'Gruppen', 'Ereignis-IDs', 'grep', 'awk', 'while read'],
  desc: 'Purple Team, Level 8: Audit eines (erfundenen) Windows-Firmennetzes. Freigaben, Benutzerkonten, Gruppen, alte Dienste und Ereignisprotokolle – wo würde ein Angreifer ansetzen?',
  ziel: 'Typische Schwachstellen in Windows-Netzen erkennen: offene Freigaben, Dateien mit Geheimnissen, Konten mit Ablauf „nie“, verschachtelte Admin-Gruppen, alte Konten, Altprotokolle, auffällige Anmeldefehler.',
  intro: T('AUDIT – Windows-Netz der Talheimer Stadtwerke (erfunden)', '', 'Du bekommst Exporte: Freigabelisten, Active-Directory-Auszüge, Dienstlisten, Ereignisprotokolle.',
    'Begriffe: Active Directory (AD) = zentrale Benutzerverwaltung · Domänen-Admins = mächtigste Gruppe.', '', 'Start:  cd check00', ''),
  finale: T('Audit-Ergebnis: Freigaben eingeschränkt, Geheimnisse entfernt, Admin-Konten aufgeräumt,', 'SMBv1 abgeschaltet und eine Warnung bei vielen Fehlanmeldungen eingerichtet. Purple Team at its best.', ''),
  nach: { beobachtung: 'Freigaben, Dateien, AD-Konten, Gruppen, Altlasten, Ereignis 4625.', schluss: 'In Windows-Netzen sind Konten und Rechte das wichtigste Angriffsziel – und das wichtigste Prüffeld.', grenzen: 'Exporte statt echtem AD. Übung in echt: HTB Starting Point „Dancing“.', naechster: 'Abschlussprüfung (Level 10).' },
  floors: [
    { t: 'Offen für alle', pts: 10, body: 'freigaben.txt (wie die Ausgabe von smbclient -L). Eine Freigabe gibt „Jeder“ Vollzugriff.',
      build(c) {
        c.put('freigaben.txt', T('Freigabe       Typ    Rechte', 'ADMIN$         Disk   Administratoren:Voll', 'C$             Disk   Administratoren:Voll', 'Buchhaltung    Disk   Buchhaltung:Ändern', 'Austausch      Disk   Jeder:Voll', 'Scans          Disk   Drucker:Schreiben; Personal:Lesen', 'IPC$           IPC    -', ''));
        c.put('befunde/Austausch.txt', `Befund: „Jeder:Voll“ – jeder im Netz kann lesen, ändern, löschen. Code: ${c.code}\n`);
      },
      hints: ['„Jeder“ heißt in Windows: wirklich alle angemeldeten Benutzer.', 'grep "Jeder:Voll" freigaben.txt', 'Lösung: grep "Jeder:Voll" freigaben.txt → cat befunde/Austausch.txt'],
      solve: (run) => run(`cat befunde/${first(run('grep "Jeder:Voll" freigaben.txt'))}.txt`) },
    { t: 'Was liegt da?', pts: 15, rep: 'Passwort-Tresor Fach 4', body: 'austausch-liste.txt: alle Dateien auf der offenen Freigabe. Eine heißt verdächtig nach Zugangsdaten.',
      build(c) {
        const f = Array.from({ length: 40 }, (_, i) => `\\\\Austausch\\${pick(c.R, ['Projekte', 'Fotos', 'Vorlagen'])}\\datei-${i}.${pick(c.R, ['docx', 'pdf', 'jpg', 'xlsx'])}`);
        f.splice(23, 0, '\\\\Austausch\\IT\\alt\\Zugangsdaten_Server.xlsx');
        c.put('austausch-liste.txt', f.join('\n') + '\n');
        c.put('befunde/Zugangsdaten_Server.xlsx.txt', `Befund: Zugangsdaten auf offener Freigabe. Fix: löschen, Passwörter ändern. Code: ${c.code}\n`);
      },
      hints: ['grep -i sucht ohne Rücksicht auf Groß/Klein. Typische Wörter: passwort, zugang, kennwort.', 'grep -i zugang austausch-liste.txt', 'Lösung: grep -i zugang austausch-liste.txt → cat befunde/Zugangsdaten_Server.xlsx.txt'],
      solve: (run) => run(`cat befunde/${run('grep -i zugang austausch-liste.txt').trim().split('\\').pop()}.txt`) },
    { t: 'Läuft nie ab', pts: 20, rep: 'Tresorraum Kammer 6', body: 'ad-benutzer.csv: name;admin;pw_laeuft_nie_ab;aktiv. Gesucht: das AKTIVE Admin-Konto, dessen Passwort NIE abläuft.',
      build(c) {
        const r = ['name;admin;pw_laeuft_nie_ab;aktiv'];
        for (let i = 0; i < 30; i++) r.push(`u${p2(i)};${[3, 11, 19].includes(i) ? 'ja' : 'nein'};${[5, 11, 22].includes(i) ? 'ja' : 'nein'};${i === 11 ? 'nein' : 'ja'}`);
        r.push('svc-alt;ja;ja;ja');
        c.put('ad-benutzer.csv', r.join('\n') + '\n');
        c.put('befunde/svc-alt.txt', `Befund: Admin + Passwort läuft nie ab + aktiv. Fix: Ablauf setzen oder Konto als verwaltetes Dienstkonto. Code: ${c.code}\n`);
        c.put('befunde/u11.txt', 'Admin und läuft nie ab – aber inaktiv. Trotzdem aufräumen.\n');
      },
      hints: ['Drei Bedingungen: Feld 2 = ja, Feld 3 = ja, Feld 4 = ja.', 'grep ";ja;ja;ja$" ad-benutzer.csv', 'Lösung: grep ";ja;ja;ja$" ad-benutzer.csv | cut -d";" -f1 → cat befunde/NAME.txt'],
      solve: (run) => run(`cat befunde/${run('grep ";ja;ja;ja$" ad-benutzer.csv | cut -d";" -f1').trim()}.txt`) },
    { t: 'Admin über Umwege', pts: 25, body: 'gruppen.txt: GRUPPE:MITGLIEDER. Eine Gruppe ist selbst Mitglied der Domänen-Admins – damit sind auch ihre Mitglieder Admins. Wer ist in dieser Gruppe und steht NICHT auf der Liste bekannter Admins?',
      build(c) {
        c.put('gruppen.txt', T('Domänen-Admins:administrator,it-leitung,Helpdesk-Plus', 'Helpdesk-Plus:hd-anna,hd-tom,praktikant2', 'Buchhaltung:bh-eva,bh-lars', 'Druckerverwalter:hd-tom', ''));
        c.put('bekannte-admins.txt', 'administrator\nit-leitung\nhd-anna\nhd-tom\n');
        c.put('befunde/praktikant2.txt', `Befund: Praktikant ist über verschachtelte Gruppe Domänen-Admin. Fix: aus Helpdesk-Plus entfernen. Code: ${c.code}\n`);
      },
      hints: ['grep Domänen-Admins gruppen.txt zeigt: Helpdesk-Plus ist Mitglied.', 'Mitglieder von Helpdesk-Plus: grep "^Helpdesk-Plus" gruppen.txt | cut -d: -f2 | tr "," "\\n"', 'Lösung: for m in $(grep "^Helpdesk-Plus" gruppen.txt | cut -d: -f2 | tr "," " "); do grep -q "^$m$" bekannte-admins.txt || echo $m; done → cat befunde/praktikant2.txt'],
      solve: (run) => run(`cat befunde/${run('for m in $(grep "^Helpdesk-Plus" gruppen.txt | cut -d: -f2 | tr "," " "); do grep -q "^$m$" bekannte-admins.txt || echo $m; done').trim()}.txt`) },
    { t: 'Vergessene Konten', pts: 15, body: 'letzte-anmeldung.csv: name;datum (JJJJ-MM-TT). Welches aktive Konto war am längsten nicht mehr angemeldet?',
      build(c) {
        const r = []; for (let i = 0; i < 25; i++) r.push(`m${p2(i)};2026-${p2(1 + Math.floor(c.R() * 10))}-${p2(1 + Math.floor(c.R() * 27))}`);
        r.push('ex-mitarbeiter;2023-03-14');
        c.put('letzte-anmeldung.csv', r.sort(() => c.R() - 0.5).join('\n') + '\n');
        c.put('befunde/ex-mitarbeiter.txt', `Befund: seit 2023 nicht angemeldet, aber aktiv. Fix: deaktivieren. Code: ${c.code}\n`);
      },
      hints: ['Datum im Format JJJJ-MM-TT lässt sich einfach als Text sortieren.', "sort -t';' -k2 letzte-anmeldung.csv | head -1", "Lösung: sort -t';' -k2 letzte-anmeldung.csv | head -1 | cut -d';' -f1 → cat befunde/ex-mitarbeiter.txt"],
      solve: (run) => run(`cat befunde/${run("sort -t';' -k2 letzte-anmeldung.csv | head -1 | cut -d';' -f1").trim()}.txt`) },
    { t: 'Altlast', pts: 15, rep: 'Inventur bei den Stadtwerken', body: 'dienste.csv: host;dienst;version. Ein Server bietet noch SMB Version 1 an – ein uraltes, unsicheres Protokoll.',
      build(c) {
        const r = []; for (let i = 0; i < 15; i++) r.push(`dc${p2(i)};${pick(c.R, ['smb', 'rdp', 'ldap', 'dns'])};${pick(c.R, ['3.1.1', '10.0', '3', '2'])}`);
        r.splice(6, 0, 'fileserver-alt;smb;1');
        c.put('dienste.csv', r.join('\n') + '\n');
        c.put('befunde/fileserver-alt.txt', `Befund: SMBv1 aktiv. Fix: SMBv1 deaktivieren. Code: ${c.code}\n`);
      },
      hints: ['Gesucht: Dienst smb UND Version genau 1.', 'grep ";smb;1$" dienste.csv', 'Lösung: grep ";smb;1$" dienste.csv | cut -d";" -f1 → cat befunde/fileserver-alt.txt'],
      solve: (run) => run(`cat befunde/${run('grep ";smb;1$" dienste.csv | cut -d";" -f1').trim()}.txt`) },
    { t: 'Ereignis 4625', pts: 20, rep: 'Die Nacht im Kollektiv', body: 'ereignisse.csv: zeit;id;konto. ID 4625 heißt in Windows „Anmeldung fehlgeschlagen“. Welches Konto hat die meisten Fehlanmeldungen?',
      build(c) {
        const r = []; for (let i = 0; i < 150; i++) r.push(`2026-11-01 ${p2(Math.floor(c.R() * 24))}:${p2(Math.floor(c.R() * 60))};${pick(c.R, ['4624', '4624', '4634', '4625'])};${pick(c.R, ['m01', 'm02', 'm03', 'it-leitung'])}`);
        for (let i = 0; i < 40; i++) r.push(`2026-11-01 03:${p2(i)};4625;svc-alt`);
        c.put('ereignisse.csv', r.sort(() => c.R() - 0.5).join('\n') + '\n');
        c.put('befunde/svc-alt.txt', `40 Fehlanmeldungen in 40 Minuten – jemand probiert Passwörter. Detection-Idee: Alarm bei > 10× 4625 pro Konto und Stunde. Code: ${c.code}\n`);
      },
      hints: ['Nur Zeilen mit ID 4625: grep ";4625;"', 'Konto ausschneiden und zählen: cut -d";" -f3 | sort | uniq -c | sort -nr', 'Lösung: grep ";4625;" ereignisse.csv | cut -d";" -f3 | sort | uniq -c | sort -nr | head -1 → cat befunde/KONTO.txt'],
      solve: (run) => run(`cat befunde/${run('grep ";4625;" ereignisse.csv | cut -d";" -f3 | sort | uniq -c | sort -nr | head -1').trim().split(/\s+/)[1]}.txt`) },
    { t: 'Das Gesamtbild', pts: 25, body: 'Purple Team verbindet die Befunde: Welches Konto taucht in Check 2 (läuft nie ab), Check 6 (Fehlanmeldungen) UND in admins.txt auf?',
      build(c) {
        c.put('liste-nie-ab.txt', 'u00\nu04\nu08\nsvc-alt\nu12\n'); c.put('liste-fehlanmeldungen.txt', 'svc-alt\nm02\nit-leitung\n'); c.put('admins.txt', 'administrator\nit-leitung\nsvc-alt\nu00\n');
        c.put('befunde/svc-alt.txt', `Das Konto ist Admin, Passwort läuft nie ab – und jemand greift es gerade an. Sofort handeln! Code: ${c.code}\n`);
      },
      hints: ['Drei Listen, ein gemeinsamer Name. cat alle drei | sort | uniq -c zeigt, wie oft jeder Name vorkommt.', 'Gesucht ist der Name mit Anzahl 3.', 'Lösung: cat liste-nie-ab.txt liste-fehlanmeldungen.txt admins.txt | sort | uniq -c | sort -nr | head -1 → cat befunde/svc-alt.txt'],
      solve: (run) => run(`cat befunde/${run('cat liste-nie-ab.txt liste-fehlanmeldungen.txt admins.txt | sort | uniq -c | sort -nr | head -1').trim().split(/\s+/)[1]}.txt`) },
  ],
});

// ============================================================================ L10 – Abschlussprüfung
const KS = ['portal.kantor.sim', '10.110.0.10'];
const P10 = makeLadder({
  id: 'p10', title: 'Die Abschlussprüfung', level: 'L10', dir: 'abschluss', prefix: 'aufgabe', seed: 1010, minutes: 120,
  tools: ['Alles'],
  desc: 'Level 10: Ein vollständiger (erfundener) Prüfauftrag – Auftrag lesen, aufklären, Lecks finden, Linux prüfen, Logs auswerten, priorisieren. Keine neuen Werkzeuge: alles, was du kannst.',
  ziel: 'Selbstständig einen ganzen Prüffall durcharbeiten – Methodik vor Werkzeug.',
  intro: T('ABSCHLUSSPRÜFUNG – Prüfauftrag „Kantor Logistik“ (erfunden)', '', 'Acht Aufgaben, wie in einer echten Prüfung: Scope, Aufklärung, Funde, Bewertung.',
    `Ziel-Webseite: http://${KS[0]}/ – nur in der Simulation.`, '', 'Start:  cd aufgabe00', ''),
  finale: T('Bestanden.', '', 'Du hast einen kompletten Prüffall gelöst – von der Aufklärung bis zur Empfehlung.',
    'Nächste echte Schritte: Juice Shop vollständig, Hack The Box Starting Point, dann die eJPT-Vorbereitung.', 'Herzlichen Glückwunsch!', ''),
  nach: { beobachtung: 'Scope, Web-Aufklärung, Lecks, Linux-Audit, Logs, Priorisierung.', schluss: 'Methodik ist das, was eine Prüfung besteht: erst verstehen, dann suchen, dann belegen.', grenzen: 'Simulation – für die eJPT brauchst du zusätzlich echte Labs (Juice Shop, HTB).', naechster: 'eJPT-Vorbereitung mit echten Labs.' },
  floors: [
    { t: 'Der Auftrag', pts: 10, body: 'Lies auftrag.txt. Welche Domain gehört NICHT zum Auftrag? Ihr Name (ohne Endung) ist der Dateiname.',
      build(c) {
        c.put('auftrag.txt', T('Auftraggeber: Kantor Logistik (erfunden)', 'IN SCOPE:', `  ${KS[0]}`, '  intranet.kantor.sim', 'OUT OF SCOPE (nicht anfassen!):', '  partner.spedition.sim', ''));
        c.put('befunde/partner.txt', `Richtig: Partnersysteme sind tabu, auch wenn man sie „leicht“ erreicht. Code: ${c.code}\n`);
      },
      hints: ['Der Teil unter „OUT OF SCOPE“ ist verboten.', 'Die verbotene Domain steht ganz unten: tail -n 1 auftrag.txt', 'Lösung: tail -n 1 auftrag.txt → partner.spedition.sim → cat befunde/partner.txt'],
      solve: (run) => run(`cat befunde/${run('tail -n 1 auftrag.txt').trim().split('.')[0]}.txt`) },
    { t: 'Erster Blick', pts: 10, rep: 'Bewerbung Runde 0–2', body: 'Was verrät die Startseite des Portals über die eingesetzte Software? Ein Header nennt sie.',
      build(c) {
        c.web(...KS, { '/': { status: 200, headers: { 'Content-Type': 'text/html', 'X-Powered-By': 'Kantor-CMS 2.4' }, body: '<h1>Kantor Logistik</h1>\n' } });
        c.put('befunde/Kantor-CMS.txt', `Software erkannt – jetzt kann man nach bekannten Schwachstellen suchen. Code: ${c.code}\n`);
      },
      hints: ['curl -I zeigt die Header.', 'X-Powered-By verrät oft die Software.', "Lösung: curl -I http://portal.kantor.sim/ | grep Powered | cut -d' ' -f2 → cat befunde/Kantor-CMS.txt"],
      solve: (run) => run(`cat befunde/${run(`curl -s -I http://${KS[0]}/ | grep Powered | cut -d' ' -f2`).trim()}.txt`) },
    { t: 'Versteckte Pfade', pts: 15, rep: 'Operation Nebel Phase 1', body: 'Auf dem Portal gibt es einen nicht verlinkten Pfad aus der Wortliste woerter.txt.',
      build(c) {
        const ws = ['admin', 'old', 'backup', 'test', 'dev', 'export', 'intern', 'staging', 'tmp', 'archiv'];
        c.put('woerter.txt', ws.join('\n') + '\n');
        c.sh.web[`${KS[1]}:80`].routes['/export/'] = { status: 200, headers: {}, body: '<a href="kunden.csv">kunden.csv</a>\n' };
        c.sh.web[`${KS[1]}:80`].routes['/export/kunden.csv'] = { status: 200, headers: { 'Content-Type': 'text/plain' }, body: `id;name\n1;Testkunde\n# Exportschlüssel: ${c.code}\n` };
      },
      hints: ['Nicht verlinkte Pfade findet man mit einer Wortliste – wie in Operation Nebel.', 'Schleife über die Wortliste mit curl -s -I … | head -1 | grep -q 200', 'Lösung: for w in $(cat woerter.txt); do curl -s -I http://portal.kantor.sim/$w/ | head -1 | grep -q 200 && echo $w; done → curl http://portal.kantor.sim/export/kunden.csv'],
      solve: (run) => run(`curl -s http://${KS[0]}/${run(`for w in $(cat woerter.txt); do curl -s -I http://${KS[0]}/$w/ | head -1 | grep -q 200 && echo $w; done`).trim()}/kunden.csv`) },
    { t: 'Das Leck bewerten', pts: 10, body: 'Der Kundenexport war ohne Anmeldung abrufbar. Wie schwer wiegt das? bewertung.csv nennt Kategorien – die passende steht für „personenbezogene Daten öffentlich“.',
      build(c) {
        c.put('bewertung.csv', 'kategorie;beschreibung\nniedrig;Versionsangabe sichtbar\nmittel;interne Pfade sichtbar\nhoch;personenbezogene Daten öffentlich\nkritisch;Fernsteuerung des Servers möglich\n');
        c.put('befunde/hoch.txt', `Richtig: Kundendaten öffentlich = hoch (Datenschutz!). Code: ${c.code}\n`);
      },
      hints: ['Kundennamen und Adressen sind personenbezogene Daten – hier greift auch der Datenschutz (DSGVO).', 'grep personenbezogen bewertung.csv', 'Lösung: grep personenbezogen bewertung.csv | cut -d";" -f1 → cat befunde/hoch.txt'],
      solve: (run) => run(`cat befunde/${run('grep personenbezogen bewertung.csv | cut -d";" -f1').trim()}.txt`) },
    { t: 'Der Server von innen', pts: 15, rep: 'Audit im Rechenzentrum', body: 'Kantor gibt dir einen Abzug von /etc/passwd des Portalservers. Welches Konto mit Login-Shell gehört dort nicht hin (nicht in erlaubt.txt)?',
      build(c) {
        c.put('passwd.txt', T('root:x:0:0::/root:/bin/bash', 'www-data:x:33:33::/var/www:/usr/sbin/nologin', 'deploy:x:1000:1000::/home/deploy:/bin/bash', 'monitor:x:1001:1001::/home/monitor:/bin/bash', 'tester:x:1002:1002::/home/tester:/bin/bash', 'sshd:x:110:65534::/run/sshd:/usr/sbin/nologin', ''));
        c.put('erlaubt.txt', 'root\ndeploy\nmonitor\n');
        c.put('befunde/tester.txt', `Testkonto auf Produktivserver – entfernen. Code: ${c.code}\n`);
      },
      hints: ['Konten mit Login-Shell: grep "/bin/bash$" passwd.txt | cut -d: -f1', 'Für jedes prüfen, ob es in erlaubt.txt steht.', 'Lösung: for u in $(grep "/bin/bash$" passwd.txt | cut -d: -f1); do grep -q "^$u$" erlaubt.txt || echo $u; done → cat befunde/tester.txt'],
      solve: (run) => run(`cat befunde/${run('for u in $(grep "/bin/bash$" passwd.txt | cut -d: -f1); do grep -q "^$u$" erlaubt.txt || echo $u; done').trim()}.txt`) },
    { t: 'Wer war schon da?', pts: 15, rep: 'Die Nacht im Kollektiv', body: 'access.log des Portals: Hat schon jemand vor dir den Export abgerufen? Welche IP (nicht deine 10.110.9.9)?',
      build(c) {
        const l = []; for (let i = 0; i < 60; i++) l.push(`10.110.${Math.floor(c.R() * 5)}.${Math.floor(c.R() * 250)} "GET /${pick(c.R, ['', 'kontakt', 'jobs'])} HTTP/1.1" 200`);
        l.push('10.110.9.9 "GET /export/kunden.csv HTTP/1.1" 200'); l.splice(20, 0, '10.110.66.6 "GET /export/kunden.csv HTTP/1.1" 200');
        c.put('access.log', l.join('\n') + '\n');
        c.put('befunde/10.110.66.6.txt', `Jemand war schneller – Datenschutzvorfall melden! Code: ${c.code}\n`);
      },
      hints: ['grep kunden.csv access.log', 'Deine eigene IP mit grep -v herausfiltern.', "Lösung: grep kunden.csv access.log | grep -v 10.110.9.9 | cut -d' ' -f1 → cat befunde/IP.txt"],
      solve: (run) => run(`cat befunde/${run("grep kunden.csv access.log | grep -v 10.110.9.9 | cut -d' ' -f1").trim()}.txt`) },
    { t: 'Verschlüsselte Notiz', pts: 15, rep: 'Phantom (Kodierungen)', body: 'Im Export lag noch eine Notiz der Entwickler – Hex, darin Base64.',
      build(c) { c.put('notiz.txt', hex(b64(`Entwicklernotiz: Export sollte nur intern sein. Code: ${c.code}`)) + '\n'); },
      hints: ['Nur 0–9 und a–f: das ist Hex.', 'Erst Hex zurückwandeln (xxd -r -p), dann Base64 (base64 -d).', 'Lösung: xxd -r -p notiz.txt | base64 -d'],
      solve: (run) => run('xxd -r -p notiz.txt | base64 -d') },
    { t: 'Die Empfehlung', pts: 25, rep: 'Schwachstellen-Sprechstunde Fall 5', body: 'massnahmen.csv: massnahme;wirkung (1–10);aufwand (1–10). Empfohlen wird zuerst die Maßnahme mit dem höchsten Wert wirkung − aufwand.',
      build(c) {
        c.put('massnahmen.csv', 'massnahme;wirkung;aufwand\nexport_schuetzen;10;2\nwaf_kaufen;6;8\nalles_neu;9;10\nheader_entfernen;2;1\ntestkonto_loeschen;7;1\n');
        c.put('befunde/export_schuetzen.txt', `10 − 2 = 8: höchste Wirkung bei kleinem Aufwand. Bericht fertig! Code: ${c.code}\n`);
      },
      hints: ['Für jede Zeile rechnen: $((wirkung - aufwand)).', 'Wie in der Sprechstunde: grep -v massnahme … | while read z; do …; done | sort -nr | head -1', "Lösung: grep -v massnahme massnahmen.csv | while read z; do w=$(echo $z | cut -d';' -f2); a=$(echo $z | cut -d';' -f3); echo \"$((w-a)) $(echo $z | cut -d';' -f1)\"; done | sort -nr | head -1 → cat befunde/NAME.txt"],
      solve: (run) => run(`cat befunde/${run("grep -v massnahme massnahmen.csv | while read z; do w=$(echo $z | cut -d';' -f2); a=$(echo $z | cut -d';' -f3); echo \"$((w-a)) $(echo $z | cut -d';' -f1)\"; done | sort -nr | head -1").trim().split(' ')[1]}.txt`) },
  ],
});

export const PURPLE = [P5, P6, P7, P8, P10];
