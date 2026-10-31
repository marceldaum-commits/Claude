// Externe Lernpfade: legale, kostenlose (oder freemium) Übungsplattformen, als Checklisten zum Abhaken.
// Die App verlinkt nur und zeigt, welche eigene Leiter vorbereitet. Lösungswege liefern die Plattformen selbst.
// Stand: Herbst 2026 nach bestem Wissen – Namen und Bedingungen der Anbieter können sich ändern.

export const EXTERN = [
  {
    id: 'htb', title: 'Hack The Box – Starting Point', icon: '📦', url: 'https://app.hackthebox.com/starting-point',
    was: 'Echte Übungsmaschinen per VPN aus deiner Kali-VM. Jede Maschine hat Fragen und eine offizielle Anleitung (Walkthrough). Hier lernst du das Ausnutzen – legal, auf Maschinen von Hack The Box.',
    kosten: 'Tier 0 mit Gratis-Konto. Tier 1 und 2 sind nach meinem Stand teilweise nur mit VIP-Abo spielbar – prüf es bei der Anmeldung.',
    start: ['Kostenloses Konto anlegen.', 'Starting Point → „Connect to Starting Point“ → OpenVPN-Datei herunterladen.', 'In Kali verbinden: sudo openvpn DATEI.ovpn (Fenster offen lassen).', 'Maschine starten („Spawn Machine“), IP notieren, mit nmap beginnen.'],
    gruppen: [
      { name: 'Tier 0 – Grundlagen (gratis)', schritte: [
        { id: 'meow', t: 'Meow', thema: 'Telnet, erste Anmeldung', prep: 'n1' },
        { id: 'fawn', t: 'Fawn', thema: 'FTP', prep: 'n1' },
        { id: 'dancing', t: 'Dancing', thema: 'SMB-Freigaben', prep: 'p8' },
        { id: 'redeemer', t: 'Redeemer', thema: 'Redis-Datenbank', prep: 'r2' },
        { id: 'explosion', t: 'Explosion', thema: 'RDP (Windows-Fernzugriff)', prep: 'p8' },
        { id: 'preignition', t: 'Preignition', thema: 'Verzeichnissuche im Web', prep: 'w7' },
        { id: 'mongod', t: 'Mongod', thema: 'MongoDB', prep: 'r2' },
        { id: 'synced', t: 'Synced', thema: 'rsync', prep: 'w2' },
      ] },
      { name: 'Tier 1 – Web & Dienste', schritte: [
        { id: 'appointment', t: 'Appointment', thema: 'SQL Injection (Einstieg)', prep: 'h1' },
        { id: 'sequel', t: 'Sequel', thema: 'MySQL', prep: 'p7' },
        { id: 'crocodile', t: 'Crocodile', thema: 'FTP + Web-Login', prep: 'w6' },
        { id: 'responder', t: 'Responder', thema: 'Windows, Dateieinbindung', prep: 'p8' },
        { id: 'three', t: 'Three', thema: 'Cloud-Speicher, Subdomains', prep: 'w7' },
        { id: 'ignition', t: 'Ignition', thema: 'Webshop, Standardpasswörter', prep: 'p6' },
        { id: 'bike', t: 'Bike', thema: 'Template-Injection', prep: 'j1' },
        { id: 'funnel', t: 'Funnel', thema: 'Port-Weiterleitung, PostgreSQL', prep: 'n1' },
        { id: 'pennyworth', t: 'Pennyworth', thema: 'Jenkins', prep: 'p7' },
        { id: 'tactics', t: 'Tactics', thema: 'SMB unter Windows', prep: 'p8' },
      ] },
      { name: 'Tier 2 – Komplette Maschinen', schritte: [
        { id: 'archetype', t: 'Archetype', thema: 'Windows + SQL Server', prep: 'p8' },
        { id: 'oopsie', t: 'Oopsie', thema: 'Web, Zugriffskontrolle, Rechte', prep: 'p5' },
        { id: 'vaccine', t: 'Vaccine', thema: 'FTP, Web, Datenbank, Rechte', prep: 'p5' },
        { id: 'unified', t: 'Unified', thema: 'bekannte Schwachstelle in Software', prep: 'p7' },
      ] },
    ],
  },
  {
    id: 'juice', title: 'OWASP Juice Shop – Sterne sammeln', icon: '🧃', url: 'https://pwning.owasp-juice.shop/',
    was: 'Der absichtlich unsichere Online-Shop läuft in deiner Kali-VM (Raum „Juice Shop – erste Schritte“). Über 100 Aufgaben mit offizieller Punktetafel und offiziellem Lösungsbuch.',
    kosten: 'Kostenlos, Open Source.',
    start: ['In der App: Raum „Juice Shop – erste Schritte“ (Start-Befehle).', 'Punktetafel finden (die erste Aufgabe).', 'Bei Bedarf: offizielles Begleitbuch „Pwning OWASP Juice Shop“ (Link oben).'],
    gruppen: [
      { name: 'Meilensteine', schritte: [
        { id: 'js-board', t: 'Punktetafel gefunden', thema: 'Erkunden, JavaScript lesen', prep: 'j1' },
        { id: 'js-1star', t: 'Alle ⭐ (1 Stern)', thema: 'Einstieg', prep: 'w6' },
        { id: 'js-2star', t: 'Alle ⭐⭐', thema: 'Zugriffskontrolle, Informationslecks', prep: 'h1' },
        { id: 'js-3star', t: '5× ⭐⭐⭐', thema: 'Injection, XSS, Anmeldung', prep: 'w7' },
        { id: 'js-4star', t: '3× ⭐⭐⭐⭐', thema: 'Fortgeschritten', prep: 'w9' },
      ] },
    ],
  },
  {
    id: 'portswigger', title: 'PortSwigger Web Security Academy', icon: '🌐', url: 'https://portswigger.net/web-security/all-topics',
    was: 'Die beste kostenlose Web-Hacking-Schule. Zu jedem Thema Erklärung und Online-Labs (bei PortSwigger, legal). Die „Apprentice“-Labs sind für Einsteiger.',
    kosten: 'Kostenlos (Konto nötig). Burp Suite Community reicht.',
    start: ['Konto anlegen.', 'Burp Suite in Kali starten (vorinstalliert).', 'Pro Thema: Text lesen, dann die Apprentice-Labs.'],
    gruppen: [
      { name: 'Themen in sinnvoller Reihenfolge (je Apprentice-Labs)', schritte: [
        { id: 'ps-access', t: 'Zugriffskontrolle', thema: 'Fremde Daten, fehlende Prüfung', prep: 'h1' },
        { id: 'ps-info', t: 'Informationslecks', thema: 'Fehlermeldungen, Kommentare, Header', prep: 'w6' },
        { id: 'ps-path', t: 'Path Traversal', thema: 'Dateien außerhalb des Webordners', prep: 'w4' },
        { id: 'ps-auth', t: 'Authentifizierung', thema: 'Schwache Anmeldungen', prep: 'p6' },
        { id: 'ps-sqli', t: 'SQL Injection', thema: 'Eingaben in Datenbankabfragen', prep: 'p7' },
        { id: 'ps-xss', t: 'Cross-Site Scripting', thema: 'Eingaben, die als Code zurückkommen', prep: 'h1' },
        { id: 'ps-cmd', t: 'OS Command Injection', thema: 'Eingaben, die als Befehl laufen', prep: 'w3' },
      ] },
    ],
  },
  {
    id: 'bandit', title: 'OverTheWire – Bandit', icon: '🐧', url: 'https://overthewire.org/wargames/bandit/',
    was: 'Das Original-Linux-Wargame per SSH aus Kali (englisch). Nach dem Funkturm und dem Stellwerk kennst du fast alle Werkzeuge schon – gute Gelegenheit, sie „draußen“ zu benutzen.',
    kosten: 'Kostenlos, kein Konto nötig.',
    start: ['In Kali: ssh bandit0@bandit.labs.overthewire.org -p 2220 (Passwort: bandit0).', 'Die Seite jedes Levels nennt das Ziel; Englisch-Tipp: Übersetzer neben dem Terminal offen lassen.'],
    gruppen: [
      { name: 'Etappen', schritte: [
        { id: 'bd-0-10', t: 'Level 0–10', thema: 'Dateien, Suchen, Kodierungen', prep: 'w4' },
        { id: 'bd-11-20', t: 'Level 11–20', thema: 'ROT13, Archive, SSH-Schlüssel, Ports', prep: 'w5' },
        { id: 'bd-21-25', t: 'Level 21–25', thema: 'Cronjobs, Skripte', prep: 'p5' },
        { id: 'bd-26-34', t: 'Level 26–34', thema: 'Spezialfälle, Git', prep: 'w8' },
      ] },
    ],
  },
  {
    id: 'pico', title: 'picoCTF – Einsteiger-CTF', icon: '🏁', url: 'https://play.picoctf.org/practice',
    was: 'Riesige Sammlung kostenloser CTF-Aufgaben für Einsteiger (Carnegie Mellon University). Viele Aufgaben laufen sogar im Browser. Perfekt nach den Hacking-Leitern der App.',
    kosten: 'Kostenlos (Konto nötig).',
    start: ['Konto anlegen.', 'Practice → nach Kategorie filtern, mit niedrigen Punktzahlen anfangen.'],
    gruppen: [
      { name: 'Kategorien (je 5 Aufgaben)', schritte: [
        { id: 'pc-general', t: 'General Skills', thema: 'Linux, Kodierungen', prep: 'w4' },
        { id: 'pc-forensics', t: 'Forensics', thema: 'Dateien, Metadaten, Mitschnitte', prep: 'w9' },
        { id: 'pc-crypto', t: 'Cryptography', thema: 'ROT13, XOR, Base64 & Co.', prep: 'w9' },
        { id: 'pc-web', t: 'Web Exploitation', thema: 'Webseiten untersuchen', prep: 'w6' },
      ] },
    ],
  },
  {
    id: 'meta', title: 'Metasploitable 2 – eigenes Labor', icon: '🧪', url: 'https://docs.rapid7.com/metasploit/metasploitable-2/',
    was: 'Absichtlich verwundbare Linux-VM von Rapid7 für Übungen mit Metasploit und Co. Läuft komplett bei dir – wenn das Netz richtig abgeschottet ist.',
    kosten: 'Kostenlos.',
    start: ['VM herunterladen (Link oben), in VirtualBox/VMware importieren.', 'WICHTIG: Netzwerk auf „Host-only“ stellen – NIE „Bridged“/„NAT“. Die VM darf weder ins Heimnetz noch ins Internet.', 'Kali ins selbe Host-only-Netz hängen (zweiter Netzwerkadapter).', 'Erst dann starten. Nach dem Üben ausschalten.'],
    gruppen: [
      { name: 'Schritte', schritte: [
        { id: 'ms-setup', t: 'Labor isoliert aufgebaut (Host-only geprüft)', thema: 'Sicherheit zuerst', prep: 'r2' },
        { id: 'ms-scan', t: 'Vollständiger nmap-Scan dokumentiert', thema: 'Aufklärung', prep: 'n1' },
        { id: 'ms-vuln', t: 'Gefundene Versionen in searchsploit nachgeschlagen', thema: 'Schwachstellen-Recherche', prep: 'p7' },
        { id: 'ms-report', t: 'Mini-Bericht: 3 Funde mit Behebung', thema: 'Berichten', prep: 'p10' },
      ] },
    ],
  },
];
