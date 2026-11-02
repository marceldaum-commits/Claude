// Lernpfad: 10 Level vom Linux-Anfänger bis zur Pentest-Einstiegsprüfung (eJPT).
// status: 'ready' = ausgearbeitet; 'planned' = Lehrplan steht, Inhalte folgen (ehrlich markiert).

export const LEVELS = [
  {
    id: 'L1', n: 1, title: 'Linux Grundlagen', status: 'ready',
    goal: 'Sicher im Terminal arbeiten: wissen, wo du bist, was ein Befehl berührt und wie du Ergebnisse belegst.',
    topics: ['Terminal, Prompt, Benutzer', 'Pfade & Navigation', 'Dateien & Ordner', 'Ein-/Ausgabe & Umleitung', 'Sicherungen', 'Rechte: rwx, ls -l, chmod', 'Prozesse: PID/PPID, Jobs, kill', 'find & grep', 'Pipes & wc', 'curl & HTTP-Header', 'Erste DNS-Fehlersuche'],
    tools: ['bash', 'coreutils', 'find', 'grep', 'chmod/stat', 'ps/jobs/kill', 'curl', 'getent'],
  },
  {
    id: 'L2', n: 2, title: 'Netzwerk & Aufklärung', status: 'planned',
    goal: 'Herausfinden, was auf einem Ziel läuft: Ports, Dienste, Versionen – und was davon stimmt.',
    topics: ['IP, Ports, TCP/UDP', 'Nmap: Scan-Arten und Ausgabe lesen', 'Banner & Versionen kritisch prüfen', 'Netcat als Universalwerkzeug', 'DNS & HTTP von Hand', 'Notizen wie ein Pentester'],
    tools: ['nmap', 'nc (netcat)', 'curl', 'ip / ss', 'dig'],
  },
  {
    id: 'L3', n: 3, title: 'Web-Hacking Grundlagen', status: 'planned',
    goal: 'Webanwendungen auseinandernehmen: versteckte Pfade, Anfragen abfangen, typische Schwachstellen erkennen.',
    topics: ['HTTP im Detail, Cookies & Sessions', 'Verzeichnisse finden (Wortlisten)', 'Burp Suite: Proxy & Repeater', 'OWASP Top 10 im Überblick', 'Übungsziele: OWASP Juice Shop, DVWA (lokal)'],
    tools: ['gobuster / ffuf', 'Burp Suite Community', 'whatweb', 'nikto'],
  },
  {
    id: 'L4', n: 4, title: 'Bash & Python für Hacker', status: 'planned',
    goal: 'Eigene kleine Werkzeuge schreiben, statt alles von Hand zu tippen.',
    topics: ['Bash-Skripte & Schleifen', 'Ausgaben filtern (grep, cut, awk)', 'Python: Anfragen & Sockets', 'Eigener Mini-Portscanner', 'Git für eigene Notizen & Skripte'],
    tools: ['bash', 'python3', 'awk', 'jq', 'git'],
  },
  {
    id: 'L5', n: 5, title: 'Linux von innen: Rechte & Root', status: 'planned',
    goal: 'Linux so gut verstehen, dass du Fehlkonfigurationen siehst – die Grundlage jeder Rechteausweitung.',
    topics: ['Benutzer, Gruppen, sudo', 'SUID/SGID & Dateirechte', 'Cronjobs & Dienste', 'Umgebungsvariablen & PATH', 'Systemaufklärung nach dem Login', 'Übung auf TryHackMe/HTB-Maschinen'],
    tools: ['sudo -l', 'find (Rechte-Suche)', 'linpeas (nur Übungsmaschinen)', 'GTFOBins (Nachschlagen)'],
  },
  {
    id: 'L6', n: 6, title: 'Passwörter & Hashes', status: 'planned',
    goal: 'Verstehen, wie Passwörter gespeichert werden und warum schwache fallen – an selbst erzeugten Hashes.',
    topics: ['Hash vs. Verschlüsselung', 'Hash-Arten erkennen', 'Wörterbuch & Regeln', 'Online- vs. Offline-Angriffe', 'Gute Passwörter & Passwortmanager'],
    tools: ['john', 'hashcat', 'hydra (nur eigene Lab-Ziele)', 'rockyou.txt'],
  },
  {
    id: 'L7', n: 7, title: 'Schwachstellen & Exploits', status: 'planned',
    goal: 'Von der gefundenen Version zur bekannten Schwachstelle – und sie im Labor kontrolliert nachweisen.',
    topics: ['CVEs lesen und bewerten', 'Exploit-DB & searchsploit', 'Metasploit: Module, Optionen, Sessions', 'Shells verstehen', 'Übungsziel: Metasploitable (isolierte VM)'],
    tools: ['searchsploit', 'Metasploit', 'nc'],
  },
  {
    id: 'L8', n: 8, title: 'Netzwerkdienste & Windows-Grundlagen', status: 'planned',
    goal: 'Typische Firmen-Dienste aufklären: SMB, FTP, SSH, und wie Windows-Netze grundsätzlich funktionieren.',
    topics: ['SMB & Freigaben', 'FTP/SSH/Telnet', 'Windows-Benutzer & Gruppen', 'Active Directory – Begriffe', 'Pivoting – Grundidee'],
    tools: ['smbclient', 'enum4linux', 'ssh', 'crackmapexec/netexec (nur Lab)'],
  },
  {
    id: 'L9', n: 9, title: 'Die andere Seite: Spuren & Verteidigung', status: 'planned',
    goal: 'Sehen, was deine Angriffe hinterlassen – das macht dich zum besseren Pentester.',
    topics: ['Logs lesen', 'Wireshark: eigenen Verkehr mitschneiden', 'Was ein Admin sieht', 'Schwachstellen richtig beheben', 'Berichte schreiben'],
    tools: ['Wireshark / tshark', 'journalctl', 'docker logs'],
  },
  {
    id: 'L10', n: 10, title: 'Abschluss: bereit für das eJPT', status: 'planned',
    goal: 'Eine komplette Übungsumgebung selbstständig knacken: Aufklärung → Zugang → Root → Bericht. Danach: eJPT-Prüfung.',
    topics: ['Methodik von Anfang bis Ende', 'Zeitmanagement & Notizen', 'Probeprüfung', 'Bericht', 'Wie geht es weiter (PNPT/OSCP)'],
    tools: ['Alle bisherigen Werkzeuge'],
  },
];

// Kostenlose, legale Übungsquellen je Level (kein Abo nötig). Ergänzt die Räume der App.
export const PFADE = {
  L4: [
    { t: 'App: „Nachtfalter II: Das Kollektiv“', url: '#/raum/w3', why: 'Variablen, Schleifen, Bedingungen und eigene Skripte – mit Maras Geschichte.' },
    { t: 'Deine Skripte in Kali', url: '#/raum/w3', why: 'Alles aus dem Kollektiv funktioniert 1:1 in Kali. Schreib die Skripte mit nano wachbericht.sh nach und führe sie echt aus.' },
    { t: 'OverTheWire Bandit, Level 0–15', url: 'https://overthewire.org/wargames/bandit/', why: 'Viele Level lassen sich mit einer Schleife oder Pipe in einer Zeile lösen – perfektes Training.' },
  ],
  L5: [
    { t: 'App: Der Kellerserver', url: '#/raum/w2', why: 'Benutzer, Gruppen, Rechte, Prozesse, SSH-Schlüssel – die Grundlage für alles in diesem Level.' },
    { t: 'OverTheWire Bandit, Level 16–25', url: 'https://overthewire.org/wargames/bandit/', why: 'Programme mit Sonderrechten (setuid) und Cronjobs – genau die Themen dieses Levels, legal und kostenlos.' },
    { t: 'GTFOBins (Nachschlagewerk)', url: 'https://gtfobins.github.io/', why: 'Zeigt, wie normale Linux-Programme missbraucht werden können, wenn Rechte falsch gesetzt sind. Zum Verstehen und Nachschlagen.' },
  ],
  L6: [
    { t: 'OWASP: Passwörter richtig speichern', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html', why: 'Warum Hashes, Salt und langsame Verfahren wichtig sind – erst die Verteidigung verstehen.' },
    { t: 'PortSwigger: Authentifizierung', url: 'https://portswigger.net/web-security/authentication', why: 'Online-Labs zu schwachen Logins – im erlaubten Rahmen bei PortSwigger.' },
    { t: 'Juice Shop: Login-Aufgaben', url: '#/raum/j1', why: 'Mehrere Aufgaben rund um schwache Passwörter – auf deinem eigenen Juice Shop.' },
  ],
  L7: [
    { t: 'Exploit-DB (Recherche)', url: 'https://www.exploit-db.com/', why: 'Von der gefundenen Version zur bekannten Schwachstelle. In Kali offline: searchsploit.' },
    { t: 'Metasploitable 2 (offizielle Übungs-VM)', url: 'https://docs.rapid7.com/metasploit/metasploitable-2/', why: 'Absichtlich verwundbare VM von Rapid7. Nur im „Host-only“-Netz deiner Virtualisierung betreiben – nie im Heimnetz oder Internet.' },
    { t: 'Hack The Box – Starting Point', url: 'https://app.hackthebox.com/starting-point', why: 'Geführte Übungsmaschinen; die ersten Stufen sind mit Gratis-Konto spielbar.' },
  ],
  L8: [
    { t: 'App: Inventur bei den Stadtwerken', url: '#/raum/n1', why: 'Dateiserver (SMB) und andere Dienste im Netz erkennen.' },
    { t: 'Hack The Box – „Dancing“ (Starting Point)', url: 'https://app.hackthebox.com/starting-point', why: 'Windows-Dateifreigaben (SMB) aufklären – mit Gratis-Konto.' },
  ],
  L10: [
    { t: 'eJPT – Infos beim Anbieter INE', url: 'https://ine.com/', why: 'Praktische Einstiegsprüfung für Pentester. Prüfe dort Inhalte, Preis und Ablauf.' },
    { t: 'Alles wiederholen', url: '#/pfad', why: 'Wenn du alle Räume und Wargames der App ohne Lösungstipps schaffst, bist du auf einem sehr guten Weg.' },
  ],
};

export const LOCATIONS = {
  browser: { label: 'Nur im Browser (kein Kali)', short: 'Browser', icon: '🌐', desc: 'Zum Reinschnuppern: Alles läuft hier in der App – nichts installieren. Über 130 Stufen warten.' },
  pc: { label: 'Kali am PC', short: 'PC', icon: '🖥️', desc: 'Eigene Kali-VM – App und Terminal nebeneinander, dazu echte Labs.' },
  phone: { label: 'Handy mit Termux', short: 'Handy', icon: '📱', desc: 'Android mit Termux oder NetHunter Rootless (ohne Root). Manche Werkzeuge sind eingeschränkt.' },
  both: { label: 'PC und Handy', short: 'Beides', icon: '🔁', desc: 'App am Handy, Terminal am PC – oder umgekehrt.' },
  windows: { label: 'Windows / PowerShell', short: 'Windows', icon: '🪟', desc: 'Nur für Windows-Level sinnvoll. Linux-Aufgaben laufen dann nur in der Sandbox.' },
};
