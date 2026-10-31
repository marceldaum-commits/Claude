// Lernpfad: 10 Level vom Linux-Anfänger bis zum Purple-Team-Abschlussprojekt.
// status: 'ready' = ausgearbeitet; 'planned' = Lehrplan steht, Inhalte folgen (ehrlich markiert).

export const LEVELS = [
  {
    id: 'L1', n: 1, title: 'Linux Grundlagen', status: 'ready',
    goal: 'Sicher im Terminal arbeiten: wissen, wo du bist, was ein Befehl berührt und wie du Ergebnisse belegst.',
    topics: ['Terminal, Prompt, Benutzer', 'Pfade & Navigation', 'Dateien & Ordner', 'Ein-/Ausgabe & Umleitung', 'Sicherungen', 'Rechte: rwx, ls -l, chmod', 'Prozesse: PID/PPID, Jobs, kill', 'find & grep', 'Pipes & wc', 'curl & HTTP-Header', 'Erste DNS-Fehlersuche'],
    tools: ['bash', 'coreutils', 'find', 'grep', 'chmod/stat', 'ps/jobs/kill', 'curl', 'getent'],
  },
  {
    id: 'L2', n: 2, title: 'Netzwerke & Protokolle', status: 'planned',
    goal: 'Verstehen, wie Daten fließen, und Verbindungen sauber und im Scope diagnostizieren.',
    topics: ['IP & MAC', 'Subnetze (Grundlagen)', 'Ports & Dienste', 'DNS im Detail', 'TCP vs. UDP', 'HTTP/HTTPS/TLS', 'Verbindungsdiagnose mit ss/ip', 'Grenzen von Portscans'],
    tools: ['iproute2 (ip, ss)', 'getent/dig', 'curl', 'Nmap (nur 127.0.0.1 / isoliertes VM-Lab)'],
  },
  {
    id: 'L3', n: 3, title: 'Bash, Python & Git', status: 'planned',
    goal: 'Wiederholbare Arbeit automatisieren und Belege reproduzierbar machen.',
    topics: ['Variablen & Bedingungen', 'Schleifen', 'Sichere Skripte (set -euo pipefail)', 'Python-Grundlagen', 'JSON & jq', 'Git: Versionen & Nachvollziehbarkeit'],
    tools: ['bash', 'python3', 'jq', 'git'],
  },
  {
    id: 'L4', n: 4, title: 'Windows & PowerShell', status: 'planned',
    goal: 'Windows-Systeme und deren Telemetrie lesen können – Grundlage für Blue-Team-Arbeit.',
    topics: ['Dateisystem & Pfade', 'Prozesse', 'Konten & Gruppen', 'Ereignisprotokolle', 'PowerShell-Objekte & Pipeline', 'Grundlegende Telemetrie'],
    tools: ['PowerShell', 'Get-Process', 'Get-WinEvent'],
  },
  {
    id: 'L5', n: 5, title: 'Web & sichere Anwendungen', status: 'planned',
    goal: 'Webanwendungen verstehen und typische Schwachstellen in lokalen Trainings-Apps nachweisen.',
    topics: ['HTTP-Anfragen im Detail', 'Sessions & Cookies', 'Authentifizierung', 'Eingabevalidierung', 'OWASP Top 10', 'Sichere Testgrenzen'],
    tools: ['curl', 'Burp Suite Community oder OWASP ZAP (nur lokale Trainings-Apps)'],
  },
  {
    id: 'L6', n: 6, title: 'SOC & Loganalyse', status: 'planned',
    goal: 'Vorfälle aus Logs und Paketen triagieren, Belege bewerten und berichten.',
    topics: ['Logquellen', 'Zeitstempel & Zeitzonen', 'Normalisierung', 'Incident-Triage', 'Belegqualität & Fehlalarme', 'Paketgrundlagen', 'Bericht'],
    tools: ['Wireshark/TShark (eigene Loopback-Aufnahmen, synthetische PCAPs)'],
  },
  {
    id: 'L7', n: 7, title: 'Red-Team-Grundlagen (autorisiertes Labor)', status: 'planned',
    goal: 'Offensive Techniken verstehen – ausschließlich mit Autorisierung, Scope und selbst erzeugten Testdaten.',
    topics: ['Autorisierung & Rules of Engagement', 'Scope', 'Sichere Validierung', 'Schwachstellenrecherche', 'Testkonten', 'Offline-Passworthashes'],
    tools: ['SearchSploit', 'Metasploit (lokales Lab)', 'John the Ripper', 'Hashcat (selbst erzeugte Hashes)'],
  },
  {
    id: 'L8', n: 8, title: 'Detection Engineering', status: 'planned',
    goal: 'Erkennungen formulieren, testen und ihre Grenzen dokumentieren.',
    topics: ['Erkennungsziele', 'Logquelle wählen', 'Regeln schreiben', 'Positiv- & Negativtests', 'Fehlalarme untersuchen', 'Grenzen dokumentieren'],
    tools: ['YARA', 'Sigma CLI (synthetische Samples/Logs)'],
  },
  {
    id: 'L9', n: 9, title: 'Purple-Team-Zyklus', status: 'planned',
    goal: 'Red und Blue gemeinsam: Hypothese, kontrollierte Emulation, Detection prüfen, tunen, retesten.',
    topics: ['Gemeinsame Hypothese', 'Kontrollierte Emulation', 'Telemetrie prüfen', 'Lückenanalyse', 'Tuning', 'Retest'],
    tools: ['MITRE ATT&CK Navigator', 'Werkzeuge aus L5–L8'],
  },
  {
    id: 'L10', n: 10, title: 'Abschlussprojekt', status: 'planned',
    goal: 'Ein vollständiger autorisierter Purple-Team-Fall – selbstständig, reproduzierbar, begründet.',
    topics: ['Ziel & Scope', 'Hypothese', 'Testplanung', 'Werkzeuganwendung', 'Red- & Blue-Belege', 'Detection + Negativfall', 'Tuning & Retest', 'Abschlussbericht'],
    tools: ['Alle bisherigen Werkzeuge'],
  },
];

export const LOCATIONS = {
  pc: { label: 'Kali am PC', short: 'PC', icon: '🖥️', desc: 'Kali-VM unter Windows – App und Terminal nebeneinander.' },
  phone: { label: 'Handy (Termux / NetHunter Rootless)', short: 'Handy', icon: '📱', desc: 'Galaxy S23, nicht gerootet. Manche Werkzeuge sind eingeschränkt.' },
  both: { label: 'PC und Handy', short: 'Beides', icon: '🔁', desc: 'App am Handy, Terminal am PC – oder umgekehrt.' },
  windows: { label: 'Windows / PowerShell', short: 'Windows', icon: '🪟', desc: 'Nur für Windows-Level sinnvoll. Linux-Aufgaben laufen dann nur in der Sandbox.' },
};
