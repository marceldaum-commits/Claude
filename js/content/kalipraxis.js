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
];

// Noch geplante Module dieses Strangs (werden nach und nach gebaut).
export const KALIPRAXIS_GEPLANT = [
  { icon: '🌐', titel: 'Web-Angriff in echt: Login umgehen & IDOR (Juice Shop)' },
  { icon: '💉', titel: 'SQL-Injection in echt (DVWA)' },
  { icon: '🔑', titel: 'Passwörter in echt: Hydra & John/Hashcat (lokal)' },
  { icon: '🧨', titel: 'Exploitation in echt: Metasploit gegen eine Übungs-VM' },
];
