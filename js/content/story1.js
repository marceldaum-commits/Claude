// Story-Mission 1: „Der stille Alarm“
// Rolle: SOC-Analyst (Trainee) im fiktiven Team „Nordlicht SOC“.
// Mischung: SIMULIERTE Fallakte in der Sandbox + ECHTE Schritte in deiner eigenen Kali-VM/Termux (nur 127.0.0.1).
// Alle Personen, Systeme und Daten sind erfunden.

import { HOME } from '../shell.js';

const MONITOR_LOG = [
  '2026-10-31T07:30:00Z lab-vm-07 portwatch INFO baseline ok listeners=2',
  '2026-10-31T07:30:00Z lab-vm-07 portwatch INFO known proto=tcp addr=0.0.0.0 port=22 proc=sshd uid=0',
  '2026-10-31T07:30:00Z lab-vm-07 portwatch INFO known proto=tcp addr=127.0.0.1 port=631 proc=cupsd uid=0',
  '2026-10-31T07:35:00Z lab-vm-07 portwatch INFO baseline ok listeners=2',
  '2026-10-31T07:40:00Z lab-vm-07 portwatch INFO baseline ok listeners=2',
  '2026-10-31T07:42:10Z lab-vm-07 portwatch WARN NEW_LISTENER proto=tcp addr=0.0.0.0 port=8080 proc=python3 uid=1000',
  '2026-10-31T07:45:00Z lab-vm-07 portwatch INFO baseline changed listeners=3',
  '2026-10-31T07:50:00Z lab-vm-07 portwatch INFO baseline changed listeners=3',
  '2026-10-31T07:51:33Z lab-vm-07 webcheck INFO probe http://lab-vm-07:8080/ status=200 server="SimpleHTTP/0.6 Python/3.13"',
  '2026-10-31T07:55:00Z lab-vm-07 portwatch INFO baseline changed listeners=3',
].join('\n') + '\n';

const ALARM = `TICKET SOC-0417  ·  Priorität: mittel  ·  Status: neu
System:   lab-vm-07 (Trainings-VM, Team Plattform)
Quelle:   portwatch – siehe monitor.log in diesem Ordner
Meldung:  Auf lab-vm-07 lauscht seit heute Morgen ein neuer Dienst.
Auftrag:  Klären: Was lauscht da? Was liefert es aus? Ist es gewollt?
Hinweis:  Die VM ist ein Trainingssystem. Wir bauen ihren Zustand
          für die Analyse in deiner EIGENEN Lab-Umgebung nach.
`;

const NOTIZ_DEV = `Von: Jonas (Team Plattform)
Betreff: Vorschau Shop-Redesign
"Hab heute früh schnell einen Python-Server für die Vorschau gestartet,
damit Lea draufschauen kann. Mach ich nachher wieder aus."
`;

export const STORY1 = {
  id: 's1',
  title: 'Der stille Alarm',
  level: 'L1',
  role: 'SOC-Analyst (Trainee), Team „Nordlicht SOC“',
  teaser: 'Ein Monitoring-Alarm um 07:42: Auf einer Trainings-VM lauscht plötzlich ein neuer Dienst. Niemand weiß, warum. Du übernimmst das Ticket.',
  tools: ['grep', 'curl', 'ps', 'kill', 'chmod', 'ls -l'],
  prereq: ['e1-07s', 'e1-08s', 'e1-10r'],
  points: 100,
  sandbox: {
    setup(sh) {
      sh.fs.put(HOME + '/fall-0417/alarm.txt', ALARM);
      sh.fs.put(HOME + '/fall-0417/monitor.log', MONITOR_LOG);
      sh.fs.put(HOME + '/fall-0417/mail-jonas.txt', NOTIZ_DEV);
      sh.fs.put(HOME + '/fall-0417/notizen', null);
      sh.cwd = HOME + '/fall-0417';
    },
  },
  scenes: [
    {
      id: 'sz0', kind: 'sim', title: 'Briefing',
      chat: [
        ['sys', '── 07:58 · Nordlicht SOC · Schichtbeginn ──'],
        ['Mara (Schichtleitung)', 'Morgen! Du übernimmst SOC-0417. Die Akte liegt in ~/fall-0417. Lies sie, bevor du irgendwas anfasst.'],
        ['Mara (Schichtleitung)', 'Erste Frage, die ich von dir hören will: Auf welchem PORT lauscht der neue Dienst? Und belege es aus dem Log, nicht aus dem Ticket.'],
      ],
      ziel: 'Eine Meldung aus Rohdaten belegen statt aus der Zusammenfassung.',
      auftrag: 'Finde im monitor.log die Warnung zum neuen Dienst und antworte Mara mit dem Port:  antwort <port>',
      scope: 'SIMULIERTE Fallakte in der Sandbox (~/fall-0417). Synthetische Daten.',
      answer: {
        check(ans, sh) {
          const usedLog = sh.log.some(l => /(grep|cat|tail|head)\b.*monitor\.log/.test(l.line));
          if (ans !== '8080') return { ok: false, msg: 'Mara: „Woher hast du die Zahl? Zeig mir die Zeile im Log, die den NEUEN Dienst meldet.“' };
          if (!usedLog) return { ok: false, msg: 'Mara: „Die Zahl stimmt vielleicht – aber du hast das Log nicht angesehen. Beleg zuerst, dann antworten.“' };
          return { ok: true };
        },
      },
      hinweis: 'Die Warnung hat ein anderes Level als die vielen INFO-Zeilen. Suche danach.',
      debrief: 'Mara: „Gut. 8080, Prozess python3, uid 1000 – also ein normaler Benutzer. Und achte auf addr=0.0.0.0: Der Dienst lauscht auf ALLEN Schnittstellen, nicht nur lokal.“',
    },
    {
      id: 'sz1', kind: 'decision', title: 'Scope festlegen',
      chat: [
        ['Mara (Schichtleitung)', 'Bevor du testest: Was ist dein Ziel? Ich will es schriftlich – Scope zuerst, dann Werkzeuge.'],
        ['sys', 'Das Team hat ein Nachbau-Setup vorbereitet: Es bildet lab-vm-07 in deiner EIGENEN Kali-VM bzw. Termux nach – aus Sicherheitsgründen nur auf 127.0.0.1:8080.'],
      ],
      ziel: 'Scope vor dem ersten Werkzeug festlegen.',
      auftrag: 'Welches Ziel ist für deine Untersuchung freigegeben?  antwort a | b | c',
      scope: 'Entscheidung.',
      options: [
        { key: 'a', t: 'Nur der Nachbau auf 127.0.0.1:8080 in meiner eigenen Lab-Umgebung.', ok: true },
        { key: 'b', t: 'Das ganze Netz 10.13.37.0/24 – vielleicht gibt es noch mehr solcher Dienste.', why: 'Mara: „Wer hat dir das Netz freigegeben? Steht das im Ticket?“' },
        { key: 'c', t: 'Die echte lab-vm-07 direkt – das ist schneller.', why: 'Mara: „Du hast keinen Zugang zu lab-vm-07 und keinen Auftrag dafür. Was sagt die Akte, wo du arbeitest?“' },
      ],
      hinweis: 'Lies den letzten Absatz von alarm.txt.',
      debrief: 'Mara: „Genau. Scope: 127.0.0.1:8080 auf deinem Gerät. Alles andere ist tabu – auch wenn es verlockend ist.“',
    },
    {
      id: 'sz2', kind: 'real', title: 'Nachbau starten & erste Antwort',
      chat: [
        ['Mara (Schichtleitung)', 'Starte den Nachbau in deinem Terminal. Danach will ich wissen: Antwortet da wirklich ein Webdienst – und was behauptet er über sich?'],
      ],
      ziel: 'Den Dienst mit curl erreichen und seine Selbstauskunft belegen.',
      auftrag: 'Führe das Setup in deiner echten Umgebung aus. Belege anschließend mit curl Statuscode und Server-Header von 127.0.0.1:8080 – ohne Inhalt. Dann im Terminal hier: beleg',
      scope: 'Echt: ausschließlich http://127.0.0.1:8080 auf deinem eigenen Gerät.',
      real: {
        voraus: { pc: 'Kali-Terminal. command -v python3 curl muss beide Pfade zeigen.', phone: 'Termux. command -v python curl – fehlt python: pkg install python. Im Termux-Home arbeiten, nicht in ~/storage.' },
        setup: 'command -v python3 curl\nmkdir -p ~/kly-lab/story1/www/backup && cd ~/kly-lab/story1/www\necho "<h1>Dev-Vorschau Shop (Lab)</h1>" > index.html\necho "-- SYNTHETISCHER Testexport, keine echten Daten" > backup/db-backup.sql\necho "-- lab_token={{TOKEN}}" >> backup/db-backup.sql\necho "INSERT INTO kunden VALUES (1, demo, demo@example.invalid);" >> backup/db-backup.sql\nchmod 644 backup/db-backup.sql\npython3 -m http.server 8080 --bind 127.0.0.1 &',
        cleanup: 'Kommt am Ende der Mission. Server bis dahin laufen lassen. Notfall-Abbruch: kill %1 und rm -r ~/kly-lab/story1',
        spec: {
          commandRe: [/\bcurl\b/, /(\s-\w*I\b|\s--head\b)/, /(127\.0\.0\.1|localhost):8080/],
          commandHint: 'Fragt dein curl nur Header ab und zielt genau auf 127.0.0.1:8080?',
          criteria: [
            { re: /^HTTP\/1\.[01] 200\b/m, label: 'Statuszeile 200', rueckfrage: 'Was steht in der ersten Zeile? Läuft der Server (jobs)?' },
            { re: /^Server:\s*SimpleHTTP\//mi, label: 'Server-Header vorhanden', rueckfrage: 'Welche Zeile beginnt mit „Server:“? Ist sie in deinem Beleg?' },
          ],
        },
      },
      hinweis: 'Gleiche Technik wie in Übung „Echter Header-Beleg mit curl“.',
      debrief: 'Mara: „Er behauptet, SimpleHTTP von Python zu sein. Behauptet – merk dir das Wort.“',
    },
    {
      id: 'sz3', kind: 'real', title: 'Wer steckt dahinter?',
      chat: [
        ['Mara (Schichtleitung)', 'Header kann jeder schreiben. Ich will den PROZESS sehen: PID und vollständige Befehlszeile. Und dann sag mir die PID.'],
      ],
      ziel: 'Die Selbstauskunft mit einer unabhängigen Gegenprobe (Prozessliste) prüfen.',
      auftrag: 'Belege mit ps den Prozess, der den Dienst bereitstellt (PID + vollständige Befehlszeile). Danach: beleg – und anschließend antwort <PID>',
      scope: 'Echt: nur lesen. Nichts beenden.',
      real: {
        voraus: { pc: 'Gleiches Terminal wie der Server.', phone: 'Gleiche Termux-Sitzung. ps -o pid,ppid,args (ggf. pkg install procps).' },
        setup: null,
        cleanup: '—',
        spec: {
          commandRe: /\bps\b/,
          commandHint: 'Zeigt dein ps-Befehl die vollständige Befehlszeile – nicht nur den Programmnamen?',
          criteria: [
            { re: /^\s*\S*\s*\d+.*python3?\s+-m\s+http\.server\s+8080/m, label: 'Prozesszeile mit python3 -m http.server 8080', rueckfrage: 'Siehst du in deiner Ausgabe die Zeile mit http.server und 8080? Falls nur „python3“ dasteht: Welche Spalte zeigt die ganze Befehlszeile?' },
          ],
        },
      },
      answer: {
        check(ans, sh, ev) {
          const out = ev?.output || '';
          const line = out.split('\n').find(l => /python3?\s+-m\s+http\.server\s+8080/.test(l) && !/\bgrep\b/.test(l));
          if (!line) return { ok: false, msg: 'Erst den Beleg (beleg), dann die PID.' };
          const nums = line.trim().split(/\s+/).filter(x => /^\d+$/.test(x));
          // ps -ef: UID PID PPID … ; ps -o pid,…: PID zuerst
          const candidates = /^\s*\d/.test(line) ? [nums[0]] : [nums[0]];
          if (candidates.includes(ans)) return { ok: true };
          if (nums.includes(ans)) return { ok: false, msg: 'Mara: „Diese Zahl steht in der Zeile – aber in welcher Spalte? PID oder PPID?“' };
          if (/grep/.test(out) && out.split('\n').some(l => /\bgrep\b/.test(l) && l.includes(ans))) return { ok: false, msg: 'Mara: „Das ist dein grep-Prozess, nicht der Server.“' };
          return { ok: false, msg: 'Mara: „Die Zahl finde ich in deinem Beleg nicht in der Server-Zeile. Lies die PID-Spalte.“' };
        },
      },
      hinweis: 'ps -o mit den Spalten pid, ppid und args – oder ps -ef. Achtung: Bei „| grep“ taucht grep selbst auch auf.',
      debrief: 'Mara: „Header und Prozessliste passen zusammen. Das ist jetzt ein Beleg, kein Bauchgefühl.“',
    },
    {
      id: 'sz4', kind: 'real', title: 'Was liegt da offen?',
      chat: [
        ['Mara (Schichtleitung)', 'Jonas sagt, es sei nur eine Vorschau. Prüf, was der Server ALLES ausliefert. Python-Server zeigen Ordnerinhalte gerne einfach an.'],
        ['sys', 'In ~/fall-0417/mail-jonas.txt (Sandbox) liegt seine Nachricht.'],
      ],
      ziel: 'Ausgelieferte Inhalte systematisch prüfen und einen kritischen Fund belegen.',
      auftrag: 'Finde mit curl heraus, welche Datei unter /backup/ ausgeliefert wird, und lade sie über den Server ab (Inhalt anzeigen). Belege den Inhalt: beleg – danach beantworte Maras Frage.',
      scope: 'Echt: nur http://127.0.0.1:8080. Daten sind synthetisch.',
      real: {
        voraus: { pc: 'Kali-Terminal.', phone: 'Termux.' },
        setup: null,
        cleanup: '—',
        spec: {
          commandRe: [/\bcurl\b/, /(127\.0\.0\.1|localhost):8080\/backup\/db-backup\.sql/],
          commandHint: 'Hast du die Datei über den SERVER abgerufen (curl auf die URL) – nicht mit cat aus dem Ordner gelesen?',
          needToken: true,
          criteria: [
            { re: /INSERT INTO kunden/, label: 'Inhalt der Sicherung ausgeliefert', rueckfrage: 'Zeigt deine Ausgabe den Inhalt der Datei – oder nur Header/Fehlerseite?' },
          ],
        },
      },
      options: [
        { key: 'a', t: 'Der Dienst liefert eine DB-Sicherung ohne Anmeldung an jeden aus, der ihn erreicht.', ok: true },
        { key: 'b', t: 'Ein Angreifer hat die DB-Sicherung über /backup/ heruntergeladen und besitzt die Daten jetzt.', why: 'Mara: „Zeigt dein Beleg einen FREMDEN Zugriff? Oder nur, dass es möglich wäre?“' },
        { key: 'c', t: 'Jemand ist in den Server eingebrochen und hat die Sicherung dort im Ordner /backup/ abgelegt.', why: 'Mara: „Jonas hat ihn selbst gestartet. Was spricht für einen Angriff – was dagegen?“' },
      ],
      optionsPrompt: 'Maras Frage: Was genau belegt dein Fund?  antwort a | b | c',
      hinweis: 'Erst die Ordneransicht /backup/ abrufen, dann den Dateinamen an die URL hängen.',
      debrief: 'Mara: „Exponierte Sicherung – ohne Authentifizierung. Ob jemand zugegriffen hat, wissen wir noch NICHT.“',
    },
    {
      id: 'sz5', kind: 'real', title: 'Gab es Zugriffe?',
      chat: [
        ['Mara (Schichtleitung)', 'Der Python-Server schreibt jeden Zugriff in sein Terminal. Zeig mir die Zugriffe auf die Sicherung – und dann reden wir darüber, was sie beweisen.'],
      ],
      ziel: 'Eine Datenquelle (Zugriffslog) lesen und ihre Aussagekraft bewerten.',
      auftrag: 'Kopiere aus dem Terminal, in dem der Server läuft, die Logzeilen zu Zugriffen auf /backup/db-backup.sql. Als „Befehl“ trägst du die Quelle ein (den Server-Startbefehl). beleg',
      scope: 'Echt: nur lesen/kopieren.',
      real: {
        voraus: { pc: 'Terminal mit dem laufenden Server (ggf. hochscrollen).', phone: 'Termux-Sitzung des Servers (lange tippen → Text markieren/kopieren).' },
        setup: null,
        cleanup: '—',
        spec: {
          commandRe: /http\.server/,
          commandLabel: 'Quelle angegeben',
          commandHint: 'Woher stammen die Zeilen? Trage den Befehl ein, mit dem der Server läuft.',
          criteria: [
            { re: /^127\.0\.0\.1 - - \[[^\]]+\] "(GET|HEAD) \/backup\/db-backup\.sql HTTP\/1\.[01]" 200\b/m, label: 'Zugriffszeile auf die Sicherung (127.0.0.1, 200)', rueckfrage: 'Findest du eine Zeile mit "GET /backup/db-backup.sql"? Hast du die ganze Zeile inklusive IP und Zeitstempel kopiert?' },
          ],
        },
      },
      options: [
        { key: 'a', t: 'Nein. Der Nachbau zeigt nur MEINE Zugriffe seit dem Start. Für die echte lab-vm-07 (0.0.0.0!) brauchen wir deren eigene Logs.', ok: true },
        { key: 'b', t: 'Ja. Alle Zeilen im Log kommen von 127.0.0.1, also hat niemand von außen die Sicherung auf lab-vm-07 geladen.', why: 'Mara: „Das sind die Logs DEINES Nachbaus. Lauschte das Original auch nur lokal?“' },
        { key: 'c', t: 'Ja. Das Log zeigt nur Status 200 und keinen einzigen Fehler, also gab es keine fremden Zugriffe auf die Sicherung.', why: 'Mara: „Was haben Fehler mit fremden Zugriffen zu tun?“' },
      ],
      optionsPrompt: 'Mara: „Beweist das, dass auf lab-vm-07 niemand Fremdes die Sicherung geladen hat?“  antwort a | b | c',
      hinweis: 'Die Zeilen haben das Format: IP - - [Zeit] "METHODE PFAD PROTOKOLL" STATUS -',
      debrief: 'Mara: „Genau das ist der wichtigste Satz im Bericht: Was wir NICHT wissen. Ich eskaliere an Plattform, dass sie die Logs der echten VM sichern.“',
    },
    {
      id: 'sz6', kind: 'real', title: 'Eindämmen und Retest',
      chat: [
        ['Mara (Schichtleitung)', 'Jonas bestätigt: nicht mehr gebraucht. Im Nachbau übst du die Eindämmung – Server sauber beenden, Sicherung nur noch für den Besitzer lesbar. Und dann: Retest. Ohne Retest ist nichts erledigt.'],
      ],
      ziel: 'Eine Maßnahme umsetzen und ihre Wirkung mit einem Retest belegen.',
      auftrag: 'Beende den Server-Prozess gezielt, setze db-backup.sql auf „nur Besitzer lesen+schreiben“ und belege beides: curl-Retest auf 127.0.0.1:8080 UND ls-Langformat der Sicherung. beleg',
      scope: 'Echt: nur dein eigener Lab-Prozess und ~/kly-lab/story1.',
      real: {
        voraus: { pc: 'Kali-Terminal.', phone: 'Termux.' },
        setup: null,
        cleanup: '—',
        spec: {
          commandRe: [/\bkill\b/, /\bchmod\b/, /\bcurl\b.*(127\.0\.0\.1|localhost):8080/, /\bls\b[^;|&]*\s-\w*l/],
          commandHint: 'Trage alle Befehle ein: Beenden, Rechte setzen, curl-Retest und ls -l.',
          criteria: [
            { re: /curl: \(7\)|Couldn't connect|Connection refused|Failed to connect/i, label: 'Retest: keine Verbindung mehr', rueckfrage: 'Was meldet curl jetzt? Läuft der Server womöglich noch (jobs, ps)?' },
            { re: /^-rw-------\S*\s+\d+\s+\S+\s+\S+\s+\d+\s.*db-backup\.sql\s*$/m, label: 'db-backup.sql hat -rw-------', rueckfrage: 'Welche Rechte zeigt ls -l für db-backup.sql? Entspricht das „nur Besitzer lesen+schreiben“?' },
          ],
        },
      },
      options: [
        { key: 'a', t: 'Weil erst der Retest belegt, dass die Maßnahme wirkt – nicht nur, dass ich sie ausgeführt habe.', ok: true },
        { key: 'b', t: 'Weil die Schichtleitung jede Maßnahme abzeichnen muss und den Retest dafür als Nachweis in der Akte braucht.', why: 'Mara: „Und wenn ich es nicht verlangen würde – woran würdest du sehen, dass kill funktioniert hat?“' },
        { key: 'c', t: 'Weil man so sieht, ob kill eine Fehlermeldung ausgegeben hat – ohne Meldung ist der Server sicher beendet.', why: 'Mara: „Und wenn kill KEINEN Fehler ausgibt – ist der Prozess dann sicher weg?“' },
      ],
      optionsPrompt: 'Mara: „Warum bestehe ich auf dem Retest?“  antwort a | b | c',
      hinweis: 'PID aus Szene 4 (prüfe sie neu mit ps!). chmod numerisch: 6-0-0.',
      debrief: 'Mara: „Dienst weg, Sicherung geschützt, beides belegt. Jetzt der Bericht.“',
    },
    {
      id: 'sz7', kind: 'report', title: 'Bericht und Übergabe',
      chat: [
        ['Mara (Schichtleitung)', 'Schreib den Bericht für die Übergabe. Kurz, belegbar, ehrlich. Was wissen wir, was nicht, was ist der nächste sichere Schritt?'],
      ],
      ziel: 'Ergebnisse nachvollziehbar und knapp dokumentieren.',
      auftrag: 'Fülle den Bericht aus (Befehl: bericht) und beantworte die Abschlussfrage.',
      scope: 'Dokumentation.',
      reportFields: [
        ['beobachtung', 'Beobachtung', 'Was wurde gemeldet und was hast du festgestellt?'],
        ['belege', 'Belege', 'Welche Ausgaben belegen das? (Werkzeug + Kernaussage)'],
        ['schluss', 'Schlussfolgerung', 'Was folgt daraus – vorsichtig formuliert?'],
        ['grenzen', 'Grenzen / offen', 'Was weißt du NICHT? Was konnte nicht geprüft werden?'],
        ['naechster', 'Nächster sicherer Schritt', 'Wer macht was als Nächstes?'],
      ],
      options: [
        { key: 'a', t: 'Plattform-Team: Logs der echten lab-vm-07 sichern und auf Fremdzugriffe prüfen; Dev-Server nur lokal gebunden und ohne Backups starten.', ok: true },
        { key: 'b', t: 'Die IP-Adressen aus dem Log mit nmap zurückscannen, um die Angreifer zu finden und ihre Rechner genauer zu prüfen.', why: 'Mara: „Welche IPs? Und wer hat das freigegeben?“' },
        { key: 'c', t: 'Ticket schließen: Der Dienst ist beendet, die Sicherung geschützt, und der Retest zeigt, dass nichts mehr erreichbar ist.', why: 'Mara: „Und die offene Frage, ob jemand die Sicherung geladen hat?“' },
      ],
      optionsPrompt: 'Abschluss: Was ist der nächste sichere Schritt?  antwort a | b | c',
      hinweis: 'Grenzen: Nachbau ≠ Original; Logs nur seit Start; addr=0.0.0.0 im Original.',
      debrief: 'Mara: „Saubere Arbeit. Belegt: Ein Dev-Server lieferte ohne Anmeldung eine (synthetische) DB-Sicherung aus. Offen: ob im Original jemand zugegriffen hat. Nächster Schritt: Plattform sichert und prüft die Original-Logs. Willkommen im Team.“',
    },
  ],
  finalCleanup: 'Aufräumen in deiner echten Umgebung:\njobs   # sollte leer sein; sonst kill %1\nrm -r ~/kly-lab/story1',
};

export const STORIES = [STORY1];
