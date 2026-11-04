#!/bin/bash
# „Angriff! Stufe 1 – Offene Türen“ (Einsteiger): Ein Hacker-Bot greift deinen Rechner in Wellen an.
# Du bist „verteidiger“ und machst die Lücken dicht: Standard-Passwort, offene Dateien, Debug-Modus,
# beschreibbarer Upload-Ordner, fremder SSH-Schlüssel. Codes: KLY{ sha256("<salz>:abwehr1:lN")[:16] }.
set -euo pipefail
TOKEN="${KLY_TOKEN:-}"
[[ "$TOKEN" =~ ^KLY-[0-9A-F]{6}$ ]] || { echo "FEHLER: KLY_TOKEN fehlt oder ist ungültig." >&2; exit 2; }
SALZ="${KLY_SALZ:-}"; [[ "$SALZ" =~ ^[0-9a-f]{32}$ ]] || SALZ="$TOKEN"   # Arena: geheimes Salz vom Server; sonst (eigenes Kali) der Token
unset KLY_SALZ
passwd -l root >/dev/null
useradd -m -s /bin/bash verteidiger; echo 'verteidiger:verteidiger' | chpasswd; rm -f /home/verteidiger/.bash_logout
useradd -m -s /bin/bash hacker; passwd -l hacker >/dev/null; chmod 700 /home/hacker
useradd -r -s /usr/sbin/nologin dienst
install -d -m 755 /opt/abwehr
V=/home/verteidiger; chmod 755 $V   # absichtlich zu offen (Welle 2)
# ---------- Kundenportal (läuft als „dienst“, liest die Einstellungen bei jeder Anfrage neu)
install -d -o verteidiger -g verteidiger -m 755 /srv/app
install -d -o verteidiger -g verteidiger -m 777 /srv/app/uploads   # absichtlich für alle beschreibbar (Welle 4)
cat > /srv/app/portal.conf <<'C'
# Kundenportal – Einstellungen (werden bei jeder Anfrage neu gelesen)
admin_passwort=admin
debug=an
C
chown verteidiger:verteidiger /srv/app/portal.conf; chmod 644 /srv/app/portal.conf
cat > /opt/abwehr/portal.py <<'PY'
import http.server, urllib.parse
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
        if u.path == '/admin':
            return self.senden(200, 'Admin-Bereich: 1.204 Kundendatensätze\n') if p.get('passwort', [''])[0] == c.get('admin_passwort', '') and c.get('admin_passwort') else self.senden(403, 'Falsches Passwort\n')
        if u.path == '/debug':
            return self.senden(200, 'DEBUG\n' + ''.join(f'{k}={v}\n' for k, v in c.items())) if c.get('debug', '').lower() in ('an', 'ja', 'on', 'true', '1') else self.senden(404, 'Nicht gefunden\n')
        return self.senden(200, 'Kundenportal – Willkommen!\n')
http.server.ThreadingHTTPServer(('127.0.0.1', 8080), H).serve_forever()
PY
chmod 644 /opt/abwehr/portal.py
runuser -u dienst -- env -i PATH=/usr/bin:/bin python3 /opt/abwehr/portal.py >/dev/null 2>&1 &
# ---------- Kundenliste offen im Home (Welle 2)
printf 'kundennr;name;email\n1001;Erika Muster;erika@example.org\n1002;Max Beispiel;max@example.org\n' > $V/kunden.csv
chown verteidiger:verteidiger $V/kunden.csv; chmod 644 $V/kunden.csv
# ---------- Fremder SSH-Schlüssel (Welle 5)
runuser -u hacker -- ssh-keygen -q -t ed25519 -N '' -C 'wartung@extern' -f /home/hacker/.ssh/id_ed25519
install -d -o verteidiger -g verteidiger -m 700 $V/.ssh
{ echo '# Zugänge'; cat /home/hacker/.ssh/id_ed25519.pub; } > $V/.ssh/authorized_keys
chown verteidiger:verteidiger $V/.ssh/authorized_keys; chmod 600 $V/.ssh/authorized_keys

python3 - "$SALZ" <<'PY'
import sys, hashlib, json
salz = sys.argv[1]; code = lambda n: 'KLY{' + hashlib.sha256(f'{salz}:abwehr1:l{n}'.encode()).hexdigest()[:16] + '}'
PWL = 'admin 123456 passwort password 12345678 qwertz admin123 root letmein willkommen geheim test 1234 hallo sommer2026'
wellen = [
 {'titel': 'Das Standard-Passwort', 'ansage': 'Ich probiere am Admin-Login die beliebtesten Passwörter durch … admin, 123456, passwort …',
  'tipp': 'Das Admin-Passwort steht in /srv/app/portal.conf. Ändere es in ein langes, eigenes Passwort (nano /srv/app/portal.conf).',
  'angriff_als': 'hacker', 'angriff': f'for p in {PWL}; do curl -fs -o /dev/null "http://127.0.0.1:8080/admin?passwort=$p" && exit 0; done; exit 1',
  'treffer': 'Der Hacker ist mit einem Standard-Passwort im Admin-Bereich und sieht 1.204 Kundendaten!', 'frust': 'Hm, kein Standard-Passwort mehr. Dann schau ich mich eben auf deinem Rechner um …'},
 {'titel': 'Offene Dateien', 'ansage': 'Ich bin ein normaler Benutzer auf deinem Rechner. Mal sehen, was in deinem Home-Ordner für alle lesbar ist …',
  'tipp': 'ls -la ~  zeigt die Rechte. chmod 700 ~  (Home nur für dich) oder chmod 600 ~/kunden.csv',
  'angriff_als': 'hacker', 'angriff': 'cat /home/verteidiger/kunden.csv >/dev/null 2>&1',
  'treffer': 'Der Hacker hat deine Kundenliste kopiert!', 'frust': 'Zugesperrt? Na gut. Vielleicht plaudert dein Portal ja etwas aus …'},
 {'titel': 'Der Plauder-Modus', 'ansage': 'Viele vergessen den Debug-Modus. Ich frage mal http://localhost:8080/debug …',
  'tipp': 'Im Debug-Modus zeigt das Portal alle Einstellungen (auch Passwörter!). In portal.conf: debug=aus',
  'angriff_als': 'hacker', 'angriff': 'curl -fs -o /dev/null http://127.0.0.1:8080/debug',
  'treffer': 'Der Debug-Modus verrät dem Hacker alle Einstellungen – samt Admin-Passwort!', 'frust': 'Debug aus, schade. Dann lege ich eben selbst etwas ab …'},
 {'titel': 'Der offene Upload-Ordner', 'ansage': 'In /srv/app/uploads darf ja anscheinend JEDER schreiben. Ich lege da mal mein Werkzeug ab …',
  'tipp': 'ls -ld /srv/app/uploads – „rwxrwxrwx“ heißt: alle dürfen schreiben. chmod 755 /srv/app/uploads  und  ls -la hinein: fremde Dateien löschen!',
  'angriff_als': 'hacker', 'angriff': 'f=/srv/app/uploads/.werkzeug_$$; echo boese > $f 2>/dev/null && rm -f $f',
  'treffer': 'Der Hacker kann Dateien in deinen Upload-Ordner legen!', 'frust': 'Kein Schreibrecht mehr … aber ich habe ja noch meinen Schlüssel!'},
 {'titel': 'Der fremde Schlüssel', 'ansage': 'Hehe – ich habe mir schon vor Wochen einen SSH-Schlüssel bei dir hinterlegt. Ich logge mich einfach ein …',
  'tipp': 'cat ~/.ssh/authorized_keys – jeder Schlüssel darin darf sich ohne Passwort als du anmelden. Gehört „wartung@extern“ dir? nano ~/.ssh/authorized_keys',
  'angriff_als': 'hacker', 'angriff': 'ssh -o BatchMode=yes -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=5 -i ~/.ssh/id_ed25519 verteidiger@127.0.0.1 true',
  'treffer': 'Der Hacker ist per SSH-Schlüssel als „verteidiger“ eingeloggt!', 'frust': 'Rausgeworfen?! Okay … du bist gut. Ich gebe auf.'},
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
  │  ⚠️  ANGRIFF! Ein Hacker ist hinter deinem Rechner her.     │
  │  Übungssystem (Nachtfalter Arena) – alles erfunden.        │
  └────────────────────────────────────────────────────────────┘
  Lagebild: lage      Live mitlesen: tail -f /var/log/angriff.log   (Strg+C beendet)

M
cat > $V/LIESMICH.txt <<'T'
ANGRIFF! – Stufe 1: Offene Türen

Du bist „verteidiger“, und das hier ist dein Rechner. Ein Hacker-Bot greift ihn in Wellen an.
Jede Welle nutzt eine andere Schwachstelle. Mach sie dicht, bevor er Schaden anrichtet –
ist eine Welle abgewehrt, bekommst du einen Code.

  lage                              Was passiert gerade? (Welle, Tipp, deine Codes)
  tail -f /var/log/angriff.log      live zuschauen (Strg+C beendet)
  nano DATEI                        Datei bearbeiten (Strg+O speichern, Strg+X beenden)
  ls -la  /  chmod                  Rechte ansehen / ändern
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
echo "nf-abwehr1: Abwehr bereit."
exec /usr/sbin/sshd -D -e
