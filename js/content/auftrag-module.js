// Auftrag-Engine – Schwachstellen-Baukasten (delivery-agnostisch, deklarativ).
// Jedes Modul beschreibt EINE realistische Lücke als DATEN, nicht als fertiges Dateisystem:
//   - params(rng): würfelt pro Anlauf Namen/Passwörter/Pfade (deterministisch über Seed)
//   - welt(p):     deklarative Weltteile (Dienste, Dateien, Zugangsdaten) – vom Adapter umgesetzt
//   - flag:        wo die serverseitige Flag landet (Edge pflanzt den HMAC-Wert pro Konto dort ein)
//   - docker:      kurze Notiz, wie es im echten Container gebaut wird (für den Docker-Adapter)
// So erzeugen SIM-Adapter (Sandbox: sh.fs.put …) und DOCKER-Adapter (Arena: Dockerfile/setup.sh)
// aus DENSELBEN Modulen zwei Welten. Flags bleiben serverseitig (HMAC pro Konto), nie im Browser.
//
// „stufe": 1 sehr einfach … 5 extrem. „kategorie": aufklaerung|zugang|web|privesc|pivot|beute.
// Technik-Katalog & Begründung: docs/AUFTRAG-ENGINE.md.

const NAMEN = ['admin', 'webadmin', 'deploy', 'backup', 'svc-web', 'tomcat', 'jenkins', 'dbuser', 'support', 'operator'];
const SCHWACH = ['Sommer2024', 'Passwort1', 'Firma2023!', 'Welcome1', 'changeme', 'admin123', 'Winter2024', 'Qwerty123', 'Hallo2023', 'root1234'];
const FIRMEN = ['Talheim Logistik', 'Nordstadt Werke', 'Brandt & Söhne', 'Kranich Reisen', 'Lumen Shop', 'Meierhof IT', 'Stadtwerke Au', 'Orbit GmbH'];
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

// ---- MODUL-BAUKASTEN -------------------------------------------------------------------------
export const MODULE = [
  // --- A · Aufklärung ---------------------------------------------------------------------
  {
    id: 'scan-basis', kategorie: 'aufklaerung', stufe: 1,
    titel: 'Offene Dienste', beschreibung: 'Ein Portscan zeigt, welche Türen offen stehen.',
    ziel: 'Verschaffe dir einen Überblick: welche Dienste laufen?',
    params: () => ({}),
    welt: () => ({ dienste: [{ port: 22, name: 'ssh', version: 'OpenSSH 8.9' }, { port: 80, name: 'http', version: 'nginx 1.18' }] }),
    flag: null, // reines Enumerations-Modul, liefert selbst keine Flag
    docker: 'Dienste laufen echt (sshd + nginx); nmap zeigt sie.',
  },

  // --- B · Erst-Zugang --------------------------------------------------------------------
  {
    id: 'ssh-schwach', kategorie: 'zugang', stufe: 1,
    titel: 'Schwaches Dienst-Passwort', beschreibung: 'Ein Dienstkonto hat ein ratbares Passwort – klassischer Erst-Zugang.',
    ziel: 'Finde gültige Zugangsdaten und verschaffe dir Zugang zum Host.',
    params: (rng) => ({ user: pick(rng, NAMEN), pass: pick(rng, SCHWACH) }),
    welt: (p) => ({
      dienste: [{ port: 22, name: 'ssh' }],
      creds: [{ user: p.user, pass: p.pass, dienst: 'ssh' }],
      // SIM-Spur: eine Notiz/History verrät das schwache Passwort (im Docker: echt per hydra ratbar)
      dateien: [{ pfad: '/var/backups/.notiz.txt', inhalt: `Memo: Test-Zugang ${p.user} / ${p.pass} – vor Go-Live ändern!\n`, modus: 0o644, leak: 'cred' }],
    }),
    flag: { wo: 'datei', pfad: '/home/{user}/zugang.txt', hinweis: 'Nach dem Login im Home-Verzeichnis.' },
    docker: 'Nutzer mit schwachem Passwort; per hydra/ssh ratbar. Flag in ~/zugang.txt.',
  },
  {
    id: 'git-expo', kategorie: 'zugang', stufe: 2,
    titel: 'Exponiertes .git / .env', beschreibung: 'Ein offenes Verzeichnis gibt Quellcode und Secrets preis.',
    ziel: 'Durchsuche die Web-Wurzel nach vergessenen Dateien mit Geheimnissen.',
    params: (rng) => ({ dbpass: pick(rng, SCHWACH), dbuser: pick(rng, NAMEN) }),
    welt: (p) => ({
      dienste: [{ port: 80, name: 'http' }],
      dateien: [
        { pfad: '/var/www/html/.env', inhalt: `APP_ENV=production\nDB_USER=${p.dbuser}\nDB_PASS=${p.dbpass}\nAPI_FLAG_HINT=siehe config\n`, modus: 0o644, leak: 'cred' },
        { pfad: '/var/www/html/.git/config', inhalt: '[core]\n\trepositoryformatversion = 0\n', modus: 0o644 },
      ],
    }),
    flag: { wo: 'datei', pfad: '/var/www/html/config/secret.php', hinweis: 'Mit den DB-Daten aus .env wird die Config lesbar.' },
    docker: 'Apache liefert /.git und /.env aus; Flag in config/secret.php (nach DB-Login erreichbar).',
  },
  {
    id: 'sqli-login', kategorie: 'web', stufe: 2,
    titel: 'SQL-Injection im Login', beschreibung: 'Ein Login prüft Eingaben nicht – man kommt ohne Passwort rein.',
    ziel: 'Umgehe das Login der Web-App ohne gültiges Passwort.',
    params: (rng) => ({ pfad: pick(rng, ['/admin', '/portal', '/intern', '/verwaltung']) }),
    welt: (p) => ({
      dienste: [{ port: 80, name: 'http' }],
      app: { typ: 'login', pfad: p.pfad, schwaeche: 'sqli', nutzer: 'admin' },
    }),
    flag: { wo: 'app', pfad: '{pfad}/dashboard', hinweis: "Klassischer Bypass: ' OR '1'='1 – dann steht die Flag im Dashboard." },
    docker: 'PHP/MySQL-Login mit String-Konkatenation; Bypass per \' OR \'1\'=\'1. Flag im Dashboard.',
  },

  // --- C · Rechte-Ausweitung (Linux) ------------------------------------------------------
  {
    id: 'creds-datei', kategorie: 'privesc', stufe: 2,
    titel: 'Passwort in Datei', beschreibung: 'Ein Klartext-Passwort in Config/History öffnet das nächste Konto.',
    ziel: 'Finde wiederverwendete Zugangsdaten für ein höheres Konto.',
    params: (rng) => ({ user: pick(rng, ['root', 'deploy', 'dbadmin']), pass: pick(rng, SCHWACH) }),
    welt: (p) => ({
      dateien: [
        { pfad: '/home/{user}/.bash_history', inhalt: `ls -la\nmysql -u${p.user} -p'${p.pass}'\ncat /etc/passwd\nsudo -l\n`, modus: 0o600, leak: 'cred' },
      ],
      creds: [{ user: p.user, pass: p.pass, dienst: 'lokal' }],
    }),
    flag: { wo: 'datei', pfad: '/root/beute.txt', hinweis: 'Mit dem gefundenen Passwort als höheres Konto lesbar.' },
    docker: 'Klartext-Passwort in History; su/sudo zum Zielkonto; Flag in /root/beute.txt.',
  },
  {
    id: 'sudo-nopass', kategorie: 'privesc', stufe: 3,
    titel: 'sudo-Fehlkonfiguration', beschreibung: 'Ein erlaubter sudo-Befehl lässt sich zur Root-Shell zweckentfremden (GTFOBins).',
    ziel: 'Nutze eine sudo-Regel, um Root zu werden.',
    params: (rng) => ({ bin: pick(rng, ['find', 'vim', 'awk', 'less', 'tar']) }),
    welt: (p) => ({
      dateien: [
        { pfad: '/etc/sudoers.d/90-dienst', inhalt: `svc-web ALL=(root) NOPASSWD: /usr/bin/${p.bin}\n`, modus: 0o440, leak: 'hinweis' },
      ],
      sudo: [{ user: 'svc-web', bin: `/usr/bin/${p.bin}`, nopass: true }],
    }),
    flag: { wo: 'datei', pfad: '/root/root-flag.txt', hinweis: 'sudo -l zeigt die Regel; der Befehl wird per GTFOBins zur Root-Shell.' },
    docker: 'Echte sudoers-Regel (NOPASSWD auf ein GTFOBins-Binary); Root-Shell → /root/root-flag.txt. Hinweis: braucht ein Lab-Profil OHNE no-new-privileges-Härtung (eigener Wächter-Freigabe-Typ).',
  },
];

export const MODUL = Object.fromEntries(MODULE.map(m => [m.id, m]));
export const AUFTRAG_LISTEN = { NAMEN, SCHWACH, FIRMEN };

// Stufen-Rezept: welche Kategorien/Wie viele Module pro Schwierigkeitsgrad kombiniert werden.
// Der Generator (Edge `auftrag`) wählt daraus pro Anlauf + Konto-Seed eine konkrete Kiste.
export const STUFEN = [
  { stufe: 1, titel: 'Sehr unsicher', beschreibung: 'Ein offensichtliches Leck → direkter Zugang. Eine Flag.',
    rezept: ['scan-basis', 'ssh-schwach'] },
  { stufe: 2, titel: 'Unsicher', beschreibung: 'Zugang + eine Hürde. Zwei Flags.',
    rezept: ['scan-basis', 'git-expo', 'creds-datei'] },
  { stufe: 3, titel: 'Mittel', beschreibung: 'Web-Einbruch + Rechte-Ausweitung. Mehrere Flags.',
    rezept: ['scan-basis', 'sqli-login', 'sudo-nopass'] },
  // Stufen 4–5 (Mehr-Host, Verkettung, AD) folgen, sobald die Module stehen.
];
