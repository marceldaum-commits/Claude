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
];

// Noch geplante Module dieses Strangs (werden nach und nach gebaut).
export const KALIPRAXIS_GEPLANT = [
  { icon: '💉', titel: 'SQL-Injection in echt (DVWA)' },
  { icon: '🔑', titel: 'Passwörter in echt: Hydra & John/Hashcat (lokal)' },
  { icon: '🧨', titel: 'Exploitation in echt: Metasploit gegen eine Übungs-VM' },
];
