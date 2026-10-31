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

export const LOCATIONS = {
  pc: { label: 'Kali am PC', short: 'PC', icon: '🖥️', desc: 'Kali-VM unter Windows – App und Terminal nebeneinander.' },
  phone: { label: 'Handy (Termux / NetHunter Rootless)', short: 'Handy', icon: '📱', desc: 'Galaxy S23, nicht gerootet. Manche Werkzeuge sind eingeschränkt.' },
  both: { label: 'PC und Handy', short: 'Beides', icon: '🔁', desc: 'App am Handy, Terminal am PC – oder umgekehrt.' },
  windows: { label: 'Windows / PowerShell', short: 'Windows', icon: '🪟', desc: 'Nur für Windows-Level sinnvoll. Linux-Aufgaben laufen dann nur in der Sandbox.' },
};
