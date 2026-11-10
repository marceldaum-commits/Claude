// Zweite Räume für Level 6–8 (SIMULATION, erfundene Systeme) – Angreifer-/Prüfer-Blick.
// Gleiche Technik wie leitern2.js (makeLadder), aber neue Themen, damit die höheren Level mehr Tiefe haben.
// Grundsatz wie immer: Finden, Verstehen, Absichern – kein echtes Knacken, kein echter Netzwerkverkehr.

import { makeLadder, T, p2 } from './leiter.js';
import { sha256hexSync as sha } from '../shell.js';

const noise = (R, n) => Array.from({ length: n }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(R() * 36)]).join('');
const pick = (R, a) => a[Math.floor(R() * a.length)];

// ============================================================================ L6 – Das Knack-Labor (Angreifer-Sicht auf Passwörter)
const P6B = makeLadder({
  id: 'p6b', title: 'Das Knack-Labor', level: 'L6', dir: 'knacklabor', prefix: 'versuch', seed: 6611, minutes: 80,
  tools: ['sort|uniq -c', 'sha256sum', 'Wörterbuch', 'grep -E', 'awk', 'Muster'],
  desc: 'Purple Team, Level 6 (zweiter Raum): Wie ein Angreifer Passwörter knackt – und was das für die Verteidigung heißt. Du siehst, warum schnelle, ungesalzene Hashes und wiederverwendete Passwörter so gefährlich sind.',
  ziel: 'Angriffe auf Passwörter nachvollziehen: häufige Passwörter, Wörterbuch-Angriff auf ungesalzene Hashes, Wiederverwendung über Leaks, vorhersagbare Muster, zu schnelle Verfahren, zu niedrige Kostenfaktoren.',
  intro: T('KNACK-LABOR – wie ein Angreifer denkt (erfunden)', '', 'Sechs Versuche. In jedem machst du nach, was ein Angreifer tut – damit du weißt, wovor du schützt.',
    'Der Code liegt jeweils in einer Datei, deren Namen du herausfindest.', '', 'Start:  cd versuch00', ''),
  finale: T('Gelernt: Angreifer probieren zuerst die häufigsten Passwörter, dann ganze Wörterbücher gegen schnelle Hashes,', 'und sie nutzen wiederverwendete Passwörter aus. Schutz: langsame, gesalzene Verfahren (bcrypt/Argon2),', 'lange einmalige Passwörter, Passwortmanager und Zwei-Faktor.', ''),
  nach: { beobachtung: 'Häufige Passwörter, Wörterbuch-Angriff, Wiederverwendung, Muster, Hash-Geschwindigkeit, Kostenfaktor.', schluss: 'Fast jeder erfolgreiche Passwort-Angriff nutzt menschliche Bequemlichkeit und schnelle Hashes – beides kann man abstellen.', grenzen: 'Erfundene Daten, kleine Wörterbücher. In Kali: hashcat & john gegen deine EIGENEN Test-Hashes.', naechster: 'Der Exploit-Checkup (Level 7).' },
  floors: [
    { t: 'Das Lieblingspasswort', pts: 10, body: 'leak.txt ist ein (erfundener) Passwort-Leak im Klartext – mit vielen Wiederholungen. Welches Passwort kommt am häufigsten vor? Genau das probiert ein Angreifer zuerst.',
      build(c) {
        const pool = ['sonne', 'hallo', 'qwertz', 'katze', 'sommer', 'fussball', 'schatz'];
        const rows = [];
        for (let i = 0; i < 55; i++) rows.push(pick(c.R, pool));
        for (let i = 0; i < 30; i++) rows.push('talheim2026');
        for (let i = rows.length - 1; i > 0; i--) { const j = Math.floor(c.R() * (i + 1)); [rows[i], rows[j]] = [rows[j], rows[i]]; }
        c.put('leak.txt', rows.join('\n') + '\n');
        c.put('befunde/talheim2026.txt', `Das häufigste Passwort steht ganz oben auf jeder Angreifer-Liste. Code: ${c.code}\n`);
      },
      hints: ['sort stellt gleiche Zeilen untereinander, uniq -c zählt sie.', 'sort leak.txt | uniq -c | sort -nr | head -1 zeigt das häufigste.', 'Lösung: sort leak.txt | uniq -c | sort -nr | head -1 → cat befunde/talheim2026.txt'],
      solve: (run) => run(`cat befunde/${run('sort leak.txt | uniq -c | sort -nr | head -1').trim().split(/\s+/)[1]}.txt`) },
    { t: 'Im Wörterbuch', pts: 15, body: 'ziel.txt enthält einen UNGESALZENEN SHA-256-Hash eines Passworts. woerter.txt ist ein kleines Wörterbuch. Welches Wort passt? Ohne Salt ist das in Sekunden erledigt.',
      build(c) {
        const ws = ['drache', 'winter', 'rathaus', 'geheim', 'kaffee', 'montag', 'freibad', 'zwiebel'];
        const w = pick(c.R, ws);
        c.put('woerter.txt', ws.join('\n') + '\n');
        c.put('ziel.txt', `ziel:${sha(w)}\n`);
        c.put(`befunde/${w}.txt`, `Geknackt. Deshalb nie schnelle, ungesalzene Hashes für Passwörter. Code: ${c.code}\n`);
      },
      hints: ['Hash holen: grep ziel ziel.txt | cut -d: -f2', 'Für jedes Wort: echo -n "$w" | sha256sum und mit dem Ziel-Hash vergleichen.', 'Lösung: H=$(grep ziel ziel.txt | cut -d: -f2); for w in $(cat woerter.txt); do echo -n "$w" | sha256sum | grep -q $H && echo $w; done → cat befunde/WORT.txt'],
      solve: (run) => run(`cat befunde/${run('H=$(grep ziel ziel.txt | cut -d: -f2); for w in $(cat woerter.txt); do echo -n "$w" | sha256sum | grep -q $H && echo $w; done').trim()}.txt`) },
    { t: 'Überall dasselbe', pts: 20, rep: 'Funkturm (uniq)', body: 'leak-a.txt und leak-b.txt stammen aus zwei verschiedenen (erfundenen) Hacks – je E-Mail;Hash. Eine Person benutzt bei beiden DASSELBE Passwort (gleiche E-Mail, gleicher Hash). Genau so übernimmt ein Angreifer von einem Leck auf das nächste.',
      build(c) {
        const hx = () => Array.from({ length: 64 }, () => '0123456789abcdef'[Math.floor(c.R() * 16)]).join('');
        const email = 'p.mueller@talheim.example'; const h = hx();
        const a = [], b = [];
        for (let i = 0; i < 20; i++) a.push(`u${p2(i)}@a.example;${hx()}`);
        for (let i = 0; i < 20; i++) b.push(`u${p2(i)}@b.example;${hx()}`);
        a.splice(8, 0, `${email};${h}`); b.splice(13, 0, `${email};${h}`);
        c.put('leak-a.txt', a.join('\n') + '\n'); c.put('leak-b.txt', b.join('\n') + '\n');
        c.put('befunde/p.mueller.txt', `Wiederverwendetes Passwort über zwei Lecks – ein Treffer öffnet beide Konten. Code: ${c.code}\n`);
      },
      hints: ['Hängt man beide Dateien aneinander, steht die doppelte Zeile zweimal da.', 'cat leak-a.txt leak-b.txt | sort | uniq -d zeigt genau diese Zeile.', 'Lösung: cat leak-a.txt leak-b.txt | sort | uniq -d (die E-Mail steht vorne) → cat befunde/NAME.txt (Teil vor dem @)'],
      solve: (run) => run(`cat befunde/${run('cat leak-a.txt leak-b.txt | sort | uniq -d').trim().split(';')[0].split('@')[0]}.txt`) },
    { t: 'Das Muster', pts: 15, body: 'passwoerter.txt: Beispielpasswörter. Angreifer testen zuerst das Muster „Großbuchstabe + Wort + Jahreszahl“ (z. B. Sommer2026). Wie viele Passwörter folgen genau diesem Muster? Die Zahl ist der Dateiname.',
      build(c) {
        const caps = 'ABCDEFGHJKLMNP'; const stems = ['sommer', 'winter', 'hallo', 'katze', 'blume', 'sonne', 'drache'];
        const rows = []; let k = 0;
        for (let i = 0; i < 28; i++) {
          if (c.R() < 0.45) { rows.push(caps[Math.floor(c.R() * caps.length)] + pick(c.R, stems) + String(2010 + Math.floor(c.R() * 19))); k++; }
          else rows.push(noise(c.R, 6 + Math.floor(c.R() * 6)));
        }
        for (let i = rows.length - 1; i > 0; i--) { const j = Math.floor(c.R() * (i + 1)); [rows[i], rows[j]] = [rows[j], rows[i]]; }
        c.put('passwoerter.txt', rows.join('\n') + '\n');
        for (let v = 0; v <= 28; v++) c.put(`befunde/${v}.txt`, v === k ? `Richtig gezählt – vorhersagbare Muster sind so gut wie kein Schutz. Code: ${c.code}\n` : 'Falsch gezählt.\n');
      },
      hints: ['grep -E nutzt erweiterte reguläre Ausdrücke. ^ und $ heißen Zeilenanfang/-ende.', "grep -E '^[A-Z][a-z]+[0-9]{4}$' passwoerter.txt findet das Muster, wc -l zählt.", "Lösung: grep -E '^[A-Z][a-z]+[0-9]{4}$' passwoerter.txt | wc -l → cat befunde/ZAHL.txt"],
      solve: (run) => run(`cat befunde/${run("grep -E '^[A-Z][a-z]+[0-9]{4}$' passwoerter.txt | wc -l").trim()}.txt`) },
    { t: 'Viel zu schnell', pts: 20, body: 'tempo.csv: verfahren;versuche_pro_sekunde (wie schnell ein Angreifer raten kann). Welches Verfahren ist am schnellsten – und damit am schlechtesten für Passwörter?',
      build(c) {
        c.put('tempo.csv', T('bcrypt12;24000', 'argon2;9000', 'sha256;7200000000', 'md5;18000000000', 'sha1;11000000000', 'pbkdf2;650000', ''));
        c.put('befunde/md5.txt', `Am schnellsten = am gefährlichsten: so viele Rateversuche pro Sekunde knacken fast jedes Passwort. Nimm langsame Verfahren. Code: ${c.code}\n`);
      },
      hints: ['sort -t";" -k2 -nr sortiert nach der 2. Spalte als Zahl, absteigend.', 'head -1 nimmt den schnellsten, cut -d";" -f1 den Namen.', 'Lösung: sort -t";" -k2 -nr tempo.csv | head -1 | cut -d";" -f1 → cat befunde/md5.txt'],
      solve: (run) => run(`cat befunde/${run('sort -t";" -k2 -nr tempo.csv | head -1 | cut -d";" -f1').trim()}.txt`) },
    { t: 'Zu billig gehasht', pts: 20, body: 'konfig.csv: dienst;bcrypt_runden. Mehr Runden = langsamer = sicherer. Ein Dienst hat viel zu wenige Runden (unter 10). Welcher?',
      build(c) {
        const r = []; for (let i = 0; i < 12; i++) r.push(`dienst${p2(i)};${10 + (i % 5)}`);
        r.splice(7, 0, 'altportal;6');
        c.put('konfig.csv', r.join('\n') + '\n');
        c.put('befunde/altportal.txt', `Kostenfaktor 6 ist zu niedrig – neu hashen mit mindestens 12. Code: ${c.code}\n`);
      },
      hints: ['awk -F";" trennt an den Semikolons; $2 ist die Rundenzahl.', "awk -F';' '$2<10 {print $1}' konfig.csv", "Lösung: awk -F';' '$2<10 {print $1}' konfig.csv → cat befunde/altportal.txt"],
      solve: (run) => run(`cat befunde/${run("awk -F';' '$2<10 {print $1}' konfig.csv").trim()}.txt`) },
  ],
});

// ============================================================================ L7 – Der Exploit-Checkup (vom Fund zum Angriff)
const P7B = makeLadder({
  id: 'p7b', title: 'Der Exploit-Checkup', level: 'L7', dir: 'exploitcheck', prefix: 'punkt', seed: 7711, minutes: 90,
  tools: ['Scan-Berichte', 'Schwachstellen-DB', 'Standard-Zugänge', 'while read', 'awk', 'Priorisierung'],
  desc: 'Purple Team, Level 7 (zweiter Raum): Vom gefundenen Dienst zur Frage „lässt sich das wirklich ausnutzen – und wie dringend?“. Du verbindest Scans mit Schwachstellen, erkennst Standard-Zugänge und priorisierst nach Ausnutzbarkeit und Erreichbarkeit. Erfundene Produkte und Kennungen.',
  ziel: 'Scans mit einer Schwachstellen-Datenbank abgleichen, verfügbare Exploits und Standard-Passwörter erkennen, Fehlalarme per Gegenprobe ausschließen, nach Ausnutzbarkeit + Erreichbarkeit priorisieren.',
  intro: T('EXPLOIT-CHECKUP – ist das wirklich gefährlich? (erfunden)', '', 'Sechs Punkte. Du bekommst Scan-Berichte, eine kleine Schwachstellen-Datenbank und Listen bekannter Standard-Zugänge.',
    'Alle Produkte und Kennungen (KLY-2026-…) sind erfunden.', '', 'Start:  cd punkt00', ''),
  finale: T('Ergebnis: Zuerst gepatcht wird, was ausnutzbar UND aus dem Internet erreichbar ist –', 'Standard-Passwörter sofort geändert, Fehlalarme per Gegenprobe aussortiert.', 'Ein Scanner-Treffer ist ein Hinweis, kein Beweis.', ''),
  nach: { beobachtung: 'Abgleich Scan ↔ DB, Exploit-Verfügbarkeit, Standard-Zugänge, Gegenprobe, Erreichbarkeit, Priorisierung.', schluss: 'Nicht jede Schwachstelle ist gleich dringend – ausnutzbar und erreichbar schlägt „nur theoretisch kritisch“.', grenzen: 'Erfundene Produkte. Echt: CVE/NVD, Exploit-DB (searchsploit), eigene Labs.', naechster: 'Active Directory unter der Lupe (Level 8).' },
  floors: [
    { t: 'Treffer im Scan', pts: 10, body: 'scan.csv: host;dienst;version. db.csv: dienst;version;kennung;cvss (bekannte Schwachstellen). Welcher Host fährt einen Dienst, der genau so in der Datenbank steht?',
      build(c) {
        const rows = ['host;dienst;version'];
        const d = ['SecureFTP;1.1', 'WebDesk;4.4', 'MailFix;7.3', 'NetShare;2.2'];
        for (let i = 0; i < 4; i++) rows.push(`srv${p2(i)};${d[i]}`);
        rows.push('srv09;SecureFTP;2.0');
        c.put('scan.csv', rows.join('\n') + '\n');
        c.put('db.csv', 'dienst;version;kennung;cvss\nSecureFTP;2.0;KLY-2026-0210;9.4\nWebDesk;4.0;KLY-2026-0150;7.2\n');
        c.put('befunde/srv09.txt', `Treffer: srv09 fährt SecureFTP 2.0 – steht mit CVSS 9.4 in der Datenbank. Code: ${c.code}\n`);
      },
      hints: ['Kopfzeile überspringen: grep -v host scan.csv. Dann Zeile für Zeile Dienst und Version holen.', "grep -v host scan.csv | while read z; do d=$(echo $z|cut -d';' -f2); v=$(echo $z|cut -d';' -f3); grep -q \"^$d;$v;\" db.csv && echo $(echo $z|cut -d';' -f1); done", 'Lösung: grep -v host scan.csv | while read z; do d=$(echo $z|cut -d\";\" -f2); v=$(echo $z|cut -d\";\" -f3); grep -q \"^$d;$v;\" db.csv && echo $(echo $z|cut -d\";\" -f1); done → cat befunde/srv09.txt'],
      solve: (run) => run(`cat befunde/${run('grep -v host scan.csv | while read z; do d=$(echo $z|cut -d";" -f2); v=$(echo $z|cut -d";" -f3); grep -q "^$d;$v;" db.csv && echo $(echo $z|cut -d";" -f1); done').trim()}.txt`) },
    { t: 'Gibt es einen Exploit?', pts: 15, body: 'funde.csv: kennung;cvss;exploit (ja/nein – ob öffentlich ein Exploit existiert). Am dringendsten ist der Fund, für den es einen Exploit gibt UND der die höchste CVSS hat.',
      build(c) {
        const rows = ['kennung;cvss;exploit'];
        rows.push('KLY-2026-0301;9.8;nein', 'KLY-2026-0302;7.1;ja', 'KLY-2026-0303;8.6;ja', 'KLY-2026-0304;6.0;nein', 'KLY-2026-0305;5.2;ja');
        c.put('funde.csv', rows.join('\n') + '\n');
        c.put('befunde/KLY-2026-0303.txt', `Exploit vorhanden und CVSS 8.6 – das zuerst. Ein noch höherer CVSS-Fund ohne Exploit ist weniger dringend. Code: ${c.code}\n`);
      },
      hints: ['Erst die mit Exploit filtern: grep ";ja$" funde.csv', "Dann nach CVSS sortieren: sort -t';' -k2 -nr | head -1", 'Lösung: grep ";ja$" funde.csv | sort -t";" -k2 -nr | head -1 | cut -d";" -f1 → cat befunde/KENNUNG.txt'],
      solve: (run) => run(`cat befunde/${run('grep ";ja$" funde.csv | sort -t";" -k2 -nr | head -1 | cut -d";" -f1').trim()}.txt`) },
    { t: 'Kein Exploit nötig', pts: 20, rep: 'Passwort-Tresor (Standard-Zugänge)', body: 'geraete.csv: geraet;benutzer;passwort (ausgelesene Konfigurationen). standard.txt: bekannte Werks-Zugänge (benutzer:passwort). Welches Gerät nutzt noch einen Standard-Zugang?',
      build(c) {
        const rows = ['geraet;benutzer;passwort'];
        for (let i = 0; i < 6; i++) rows.push(`dev${p2(i)};${noise(c.R, 5)};${noise(c.R, 10)}`);
        rows.push('kamera-eingang;admin;admin');
        c.put('geraete.csv', rows.join('\n') + '\n');
        c.put('standard.txt', T('root:toor', 'admin:admin', 'admin:1234', 'user:password', ''));
        c.put('befunde/kamera-eingang.txt', `Standard-Zugang admin/admin – ein Angreifer braucht keinen Exploit, nur das Handbuch. Sofort ändern. Code: ${c.code}\n`);
      },
      hints: ['Für jede Zeile Benutzer und Passwort als benutzer:passwort bauen und in standard.txt suchen.', 'grep -v geraet geraete.csv | while read z; do u=$(echo $z|cut -d";" -f2); p=$(echo $z|cut -d";" -f3); grep -q "^$u:$p$" standard.txt && echo $(echo $z|cut -d";" -f1); done', 'Lösung: grep -v geraet geraete.csv | while read z; do u=$(echo $z|cut -d\";\" -f2); p=$(echo $z|cut -d\";\" -f3); grep -q \"^$u:$p$\" standard.txt && echo $(echo $z|cut -d\";\" -f1); done → cat befunde/kamera-eingang.txt'],
      solve: (run) => run(`cat befunde/${run('grep -v geraet geraete.csv | while read z; do u=$(echo $z|cut -d";" -f2); p=$(echo $z|cut -d";" -f3); grep -q "^$u:$p$" standard.txt && echo $(echo $z|cut -d";" -f1); done').trim()}.txt`) },
    { t: 'Nur ein Fehlalarm', pts: 15, rep: 'Ports & Dienste (Gegenprobe)', body: 'Der Scanner meldet drei Hosts als „WebDesk 4.0 – verwundbar“, nur am Banner. versionen/ enthält die ECHTE Version. Einer ist längst auf 4.5 gepatcht – ein Fehlalarm.',
      build(c) {
        c.put('scanner.txt', 'web1 WebDesk 4.0 verwundbar\nweb2 WebDesk 4.0 verwundbar\nweb3 WebDesk 4.0 verwundbar\n');
        c.put('versionen/web1', '4.0\n'); c.put('versionen/web2', '4.0\n'); c.put('versionen/web3', '4.5\n');
        c.put('befunde/web3.txt', `Fehlalarm: Banner sagt 4.0, installiert ist 4.5. Immer gegenprüfen. Code: ${c.code}\n`);
      },
      hints: ['Ein Banner ist nur eine Selbstauskunft.', 'grep -l 4.5 versionen/* zeigt, in welcher Datei die gepatchte Version steht (-l = nur Dateiname).', 'Lösung: grep -l 4.5 versionen/* → cat befunde/web3.txt (Dateiname ist der Hostname)'],
      solve: (run) => run(`cat befunde/$(basename ${run('grep -l 4.5 versionen/*').trim()}).txt`) },
    { t: 'Aus dem Internet erreichbar', pts: 15, body: 'hosts.csv: host;cvss;zone (dmz = aus dem Internet erreichbar, intern = nur im Haus). Welcher Host ist kritisch (CVSS 9 oder mehr) UND in der DMZ?',
      build(c) {
        const rows = ['host;cvss;zone'];
        rows.push('intranet;9.8;intern', 'webshop;7.5;dmz', 'vpngw;9.3;dmz', 'drucker;6.0;intern', 'wiki;5.1;dmz', 'backup;9.0;intern');
        c.put('hosts.csv', rows.join('\n') + '\n');
        c.put('befunde/vpngw.txt', `Kritisch und aus dem Internet erreichbar – das Patchen hat Vorrang vor „nur intern kritisch“. Code: ${c.code}\n`);
      },
      hints: ['Erst nur die aus dem Internet erreichbaren Zeilen: grep ";dmz$" hosts.csv', 'Davon die mit der höchsten CVSS: sort -t";" -k2 -nr | head -1', 'Lösung: grep ";dmz$" hosts.csv | sort -t";" -k2 -nr | head -1 | cut -d";" -f1 → cat befunde/vpngw.txt'],
      solve: (run) => run(`cat befunde/${run('grep ";dmz$" hosts.csv | sort -t";" -k2 -nr | head -1 | cut -d";" -f1').trim()}.txt`) },
    { t: 'Was zuerst patchen?', pts: 25, body: 'plan.csv: host;exploit;zone. Ganz oben auf die Patch-Liste gehört, was einen Exploit hat UND in der DMZ steht. Welcher Host ist das?',
      build(c) {
        const rows = ['host;exploit;zone'];
        rows.push('a-srv;ja;intern', 'b-srv;nein;dmz', 'c-srv;ja;dmz', 'd-srv;nein;intern', 'e-srv;ja;intern');
        c.put('plan.csv', rows.join('\n') + '\n');
        c.put('befunde/c-srv.txt', `Exploit vorhanden + aus dem Internet erreichbar = höchste Dringlichkeit. Code: ${c.code}\n`);
      },
      hints: ['Gesucht: exploit=ja UND zone=dmz in einer Zeile – das Muster ;ja;dmz am Zeilenende.', 'grep ";ja;dmz$" plan.csv', 'Lösung: grep ";ja;dmz$" plan.csv | cut -d";" -f1 → cat befunde/c-srv.txt'],
      solve: (run) => run(`cat befunde/${run('grep ";ja;dmz$" plan.csv | cut -d";" -f1').trim()}.txt`) },
  ],
});

// ============================================================================ L8 – Active Directory unter der Lupe
const P8B = makeLadder({
  id: 'p8b', title: 'Active Directory unter der Lupe', level: 'L8', dir: 'adlupe', prefix: 'pruef', seed: 8811, minutes: 100,
  tools: ['Portlisten', 'Logon-Skripte', 'Dienstkonten/SPN', 'OS-Inventar', 'Ereignisse 4625', 'awk', 'uniq -c'],
  desc: 'Purple Team, Level 8 (zweiter Raum): Noch tiefer ins (erfundene) Windows-Netz – offene Fernzugänge, Passwörter in Anmelde-Skripten, angreifbare Dienstkonten, Alt-Betriebssysteme und ein Passwort-Spray im Protokoll.',
  ziel: 'Weitere typische AD-Schwächen erkennen: RDP aus dem Internet, Klartext-Passwörter in Logon-Skripten, Dienstkonten mit SPN und Admin-Rechten (Kerberoasting), veraltete Betriebssysteme, Passwort-Spraying.',
  intro: T('AD UNTER DER LUPE – Stadtwerke Talheim (erfunden)', '', 'Sechs Prüfpunkte mit Exporten: Portlisten, Logon-Skripte, Dienstkonten, OS-Inventar, Ereignisprotokolle.',
    'Begriffe: RDP = Fernwartung (Port 3389) · SPN = Kennung eines Dienstkontos · Ereignis 4625 = fehlgeschlagene Anmeldung.', '', 'Start:  cd pruef00', ''),
  finale: T('Ergebnis: RDP nicht mehr offen im Internet, keine Passwörter in Skripten, Dienstkonten entschärft,', 'Alt-Systeme ersetzt und ein Alarm für Passwort-Spraying eingerichtet. Sauberes Netz.', ''),
  nach: { beobachtung: 'Offene Fernzugänge, Geheimnisse in Skripten, Kerberoasting-Ziele, Alt-OS, Passwort-Spray.', schluss: 'In Windows-Netzen entscheiden Konten, Dienste und alte Software – wer sie im Blick hat, nimmt dem Angreifer die einfachen Wege.', grenzen: 'Exporte statt echtem AD. In echt: HTB Starting Point, eigene Test-Domäne.', naechster: 'Abschlussprüfung (Level 10).' },
  floors: [
    { t: 'Fernwartung offen', pts: 10, body: 'ports.csv: host;port;zone. Port 3389 ist RDP (Windows-Fernwartung). Welcher Host bietet RDP direkt aus dem Internet (zone=internet) an?',
      build(c) {
        const rows = ['host;port;zone'];
        const ps = [445, 139, 80, 443, 53];
        for (let i = 0; i < 8; i++) rows.push(`host${p2(i)};${pick(c.R, ps)};${pick(c.R, ['intern', 'dmz'])}`);
        rows.push('ts-gateway;3389;internet');
        c.put('ports.csv', rows.join('\n') + '\n');
        c.put('befunde/ts-gateway.txt', `RDP offen im Internet – ein Hauptziel für Angreifer. Hinter VPN legen oder sperren. Code: ${c.code}\n`);
      },
      hints: ['Gesucht: Port 3389 und Zone internet in einer Zeile. Das Muster ;3389;internet am Zeilenende trifft genau das.', 'grep ";3389;internet$" ports.csv', 'Lösung: grep ";3389;internet$" ports.csv | cut -d";" -f1 → cat befunde/ts-gateway.txt'],
      solve: (run) => run(`cat befunde/${run('grep ";3389;internet$" ports.csv | cut -d";" -f1').trim()}.txt`) },
    { t: 'Passwort im Anmelde-Skript', pts: 15, rep: 'Bewerbung (.env)', body: 'Im Ordner skripte/ liegen Windows-Anmelde-Skripte. In einem steht ein Passwort im Klartext (z. B. net use … /user:… PASS). Finde es.',
      build(c) {
        c.put('skripte/anmeldung.bat', '@echo off\nmap z: \\\\srv\\daten\n');
        c.put('skripte/drucker.bat', 'rundll32 printui.dll\n');
        c.put('skripte/laufwerk.bat', 'net use L: \\\\fileserver\\lohn /user:svc-backup Sommer2026! /persistent:yes\n');
        c.put('skripte/start.bat', 'echo Willkommen\n');
        c.put('befunde/laufwerk.bat.txt', `Passwort im Logon-Skript – jeder, der das Skript liest, kennt das Dienstkonto. Code: ${c.code}\n`);
      },
      hints: ['grep -ri durchsucht alle Dateien im Ordner, Groß/Klein egal. net use mit /user ist typisch.', 'grep -ril "/user" skripte', 'Lösung: grep -ril "/user" skripte → cat befunde/laufwerk.bat.txt'],
      solve: (run) => run(`cat befunde/$(basename ${run('grep -ril "/user" skripte').trim()}).txt`) },
    { t: 'Angreifbares Dienstkonto', pts: 20, rep: 'Tresorraum (Kerberoasting)', body: 'dienstkonten.csv: konto;spn;admin. Konten mit SPN kann ein Angreifer offline angreifen (Kerberoasting). Besonders schlimm, wenn das Konto auch Admin ist. Welches Konto hat SPN=ja UND admin=ja?',
      build(c) {
        const rows = ['konto;spn;admin'];
        for (let i = 0; i < 10; i++) rows.push(`svc-${noise(c.R, 4)};${pick(c.R, ['ja', 'nein'])};nein`);
        rows.push('svc-sql;ja;ja');
        c.put('dienstkonten.csv', rows.join('\n') + '\n');
        c.put('befunde/svc-sql.txt', `SPN + Admin = Kerberoasting-Volltreffer. Fix: langes Passwort/gMSA, Admin-Rechte entziehen. Code: ${c.code}\n`);
      },
      hints: ['Gesucht sind beide Male „ja“ in Feld 2 und Feld 3.', 'grep ";ja;ja$" dienstkonten.csv', 'Lösung: grep ";ja;ja$" dienstkonten.csv | cut -d";" -f1 → cat befunde/svc-sql.txt'],
      solve: (run) => run(`cat befunde/${run('grep ";ja;ja$" dienstkonten.csv | cut -d";" -f1').trim()}.txt`) },
    { t: 'Uraltes System', pts: 15, body: 'inventar.csv: host;os. Ein Rechner läuft noch mit „Windows 7“ – seit Jahren ohne Sicherheitsupdates. Welcher?',
      build(c) {
        const rows = ['host;os']; const oss = ['Windows 10', 'Windows 11', 'Windows Server 2019', 'Windows Server 2022'];
        for (let i = 0; i < 12; i++) rows.push(`pc${p2(i)};${pick(c.R, oss)}`);
        rows.splice(5, 0, 'pc-werkstatt;Windows 7');
        c.put('inventar.csv', rows.join('\n') + '\n');
        c.put('befunde/pc-werkstatt.txt', `Windows 7 bekommt keine Updates mehr – ein offenes Tor. Ersetzen oder isolieren. Code: ${c.code}\n`);
      },
      hints: ['grep sucht Text. Der Doppelpunkt-Trick ist hier nicht nötig.', 'grep "Windows 7" inventar.csv | cut -d";" -f1', 'Lösung: grep "Windows 7" inventar.csv | cut -d";" -f1 → cat befunde/pc-werkstatt.txt'],
      solve: (run) => run(`cat befunde/${run('grep "Windows 7" inventar.csv | cut -d";" -f1').trim()}.txt`) },
    { t: 'Passwort-Spray', pts: 20, rep: 'Ereignis 4625', body: 'anmeldungen.csv: quelle_ip;konto;id. ID 4625 = fehlgeschlagene Anmeldung. Bei einem Passwort-Spray probiert EINE Quelle dasselbe Passwort gegen VIELE Konten. Welche Quell-IP hat die meisten Fehlanmeldungen?',
      build(c) {
        const rows = ['quelle_ip;konto;id'];
        for (let i = 0; i < 80; i++) rows.push(`10.0.${Math.floor(c.R() * 3)}.${Math.floor(c.R() * 200)};m${p2(Math.floor(c.R() * 20))};${pick(c.R, ['4624', '4624', '4634'])}`);
        for (let i = 0; i < 35; i++) rows.push(`10.0.9.66;m${p2(i % 30)};4625`);
        for (let i = rows.length - 1; i > 1; i--) { const j = 1 + Math.floor(c.R() * i); [rows[i], rows[j]] = [rows[j], rows[i]]; }
        c.put('anmeldungen.csv', rows.join('\n') + '\n');
        c.put('befunde/10.0.9.66.txt', `Eine Quelle, viele Konten, lauter 4625 – klassisches Passwort-Spray. Alarm bei vielen 4625 je Quelle einrichten. Code: ${c.code}\n`);
      },
      hints: ['Nur die Fehlanmeldungen: grep ";4625$"', 'Quell-IP zählen: cut -d";" -f1 | sort | uniq -c | sort -nr | head -1', 'Lösung: grep ";4625$" anmeldungen.csv | cut -d";" -f1 | sort | uniq -c | sort -nr | head -1 → cat befunde/IP.txt'],
      solve: (run) => run(`cat befunde/${run('grep ";4625$" anmeldungen.csv | cut -d";" -f1 | sort | uniq -c | sort -nr | head -1').trim().split(/\s+/)[1]}.txt`) },
    { t: 'Das Gesamtbild', pts: 25, body: 'Purple Team verbindet die Funde. Drei Listen: admins.txt, spn-konten.txt, angegriffen.txt. Welches Konto steht auf ALLEN dreien – ist also Admin, per SPN angreifbar und wird gerade attackiert?',
      build(c) {
        c.put('admins.txt', 'administrator\nit-leitung\nsvc-sql\nu004\n');
        c.put('spn-konten.txt', 'svc-web\nsvc-sql\nsvc-druck\n');
        c.put('angegriffen.txt', 'svc-sql\nm07\nit-leitung\n');
        c.put('befunde/svc-sql.txt', `Admin + SPN + wird angegriffen = sofort handeln (Passwort rotieren, Rechte entziehen, überwachen). Code: ${c.code}\n`);
      },
      hints: ['Alle drei Listen aneinanderhängen und zählen, welcher Name dreimal vorkommt.', 'cat admins.txt spn-konten.txt angegriffen.txt | sort | uniq -c | sort -nr | head -1', 'Lösung: cat admins.txt spn-konten.txt angegriffen.txt | sort | uniq -c | sort -nr | head -1 → cat befunde/svc-sql.txt'],
      solve: (run) => run(`cat befunde/${run('cat admins.txt spn-konten.txt angegriffen.txt | sort | uniq -c | sort -nr | head -1').trim().split(/\s+/)[1]}.txt`) },
  ],
});

export const PURPLE2 = [P6B, P7B, P8B];
