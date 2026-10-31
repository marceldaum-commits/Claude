// Tipp-Leitern für die Spickzettel-Übungen (Level 1): Denkanstoß → Hinweis → Lösung.
// LOESUNGEN sind die Musterlösungen der Sandbox-Übungen – die Tests prüfen damit die Lösbarkeit,
// die App zeigt sie als letzten (teuersten) Tipp.

export const LOESUNGEN = {
  'e1-01s': ['pwd', 'whoami'],
  'e1-02s': ['cd ~/lab', 'ls', 'cd archiv/2026/oktober', 'ls'],
  'd1-pfade': ['cd ../../c/d'],
  'e1-03s': ['ls -la ~/lab/fall-01', 'mkdir -p ~/lab/fall-01/notizen ~/lab/fall-01/belege', 'touch ~/lab/fall-01/belege/README', 'ls ~/lab/fall-01/temp.tmp', 'rm ~/lab/fall-01/temp.tmp'],
  'e1-04s': ['cd ~/lab/fall-01/notizen', 'echo "08:00 Alarm eingegangen" > zeitlinie.txt', 'echo "08:05 Scope geklärt" >> zeitlinie.txt', 'echo "08:10 Analyse gestartet" >> zeitlinie.txt'],
  'e1-05s': ['cd ~/lab/config', 'cp -p app.conf app.conf.bak', 'echo "debug=false" >> app.conf'],
  'w1-01': ['cd ~/lab/w1', 'mkdir sicherung', 'cp -p eingang/*.txt sicherung/', 'ls sicherung | wc -l > anzahl.txt', 'mv anzahl.txt sicherung/'],
  'e1-06s': ['cd ~/lab/rechte', 'chmod 640 bericht.txt', 'chmod u+x skript.sh', 'chmod 700 privat'],
  'd1-chmod': ['chmod 400 ~/lab/drill/a.txt', 'chmod 664 ~/lab/drill/b.txt', 'chmod 750 ~/lab/drill/c.sh'],
  'e1-07s': ['ps -o pid,ppid,args', 'kill 3188', 'ps'],
  'e1-08s': ['find ~/lab/sammlung -type f -name "*.conf"', 'grep -l "debug=true" ~/lab/sammlung/web/site.conf ~/lab/sammlung/api/dienst.conf ~/lab/sammlung/db/db.conf > ~/lab/fund.txt'],
  'e1-09s': ['grep "Failed password" ~/lab/logs/auth.log | wc -l > ~/lab/antwort.txt'],
  'd1-pipes': ['grep "Failed password" ~/lab/logs/auth.log | cut -d" " -f11 | sort | uniq -c | sort -nr | head -1', 'echo 10.13.37.21 > ~/lab/top.txt'],
  'e1-10s': ['curl -I http://127.0.0.1:8080/admin', 'echo 403 > ~/lab/status.txt'],
  'e1-11s': ['curl http://intranet.lab.sim:8080/', 'curl http://127.0.0.1:8080/', 'getent hosts intranet.lab.sim', 'grep intranet /etc/hosts > ~/lab/dns-befund.txt'],
  'w1-02': ['find ~/lab/w2 -type f -perm -o=w', 'chmod 640 ~/lab/w2/a/b/token.cfg'],
};

// Echte Aufträge (Kali/Termux): Lösungsweg als Text
export const REAL_LOESUNGEN = {
  'e1-01r': 'pwd; whoami → beide Befehle und beide Ausgabezeilen einfügen',
  'e1-06r': 'Setup ausführen → chmod 640 notiz.txt → ls -l notiz.txt → Befehl und Ausgabe einfügen',
  'e1-07r': 'sleep 300 & → ps -o pid,ppid,args → Ausgabe einfügen → danach kill %1',
  'e1-08r': 'Setup ausführen → grep -rn lab_token ~/kly-lab/suche → Befehl und Ausgabe einfügen',
  'e1-10r': 'Setup ausführen → curl -I http://127.0.0.1:8080/ → Befehl und Ausgabe einfügen (danach Server mit kill %1 stoppen)',
  'e1-11r': 'command -v getent → getent hosts localhost (Handy: cat $PREFIX/etc/hosts) → Befehl und Ausgabe einfügen',
};

// Tipp-Leiter einer Übung aufbauen
export function uebungsTipps(e, lesson) {
  const begriffe = (lesson?.concepts || []).map(c => c.name).join(', ');
  const anstoss = `Schau im Spickzettel „${lesson?.title || ''}“ nach – dort stehen die passenden Werkzeuge${begriffe ? `: ${begriffe}` : ''}.`;
  const loesung = e.kind === 'real' ? REAL_LOESUNGEN[e.id] : (LOESUNGEN[e.id] || []).join(' → ');
  return [anstoss, e.hinweis, ...(loesung ? [`Lösung: ${loesung}`] : [])].filter(Boolean);
}
