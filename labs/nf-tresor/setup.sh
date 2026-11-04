#!/bin/bash
# „Der Tresor“ – Experten-Arena: knacken, Spuren in Git und Logs, PATH-Falle, Pfad-Ausbruch, Verschlüsselung.
# Codes: KLY{ sha256("<token>:tresor:lN")[:16] }  (l1 … l6). Alle Daten sind erfunden.
set -euo pipefail
TOKEN="${KLY_TOKEN:-}"
[[ "$TOKEN" =~ ^KLY-[0-9A-F]{6}$ ]] || { echo "FEHLER: KLY_TOKEN fehlt oder ist ungültig." >&2; exit 2; }
h() { printf '%s' "$TOKEN:tresor:$1" | sha256sum | cut -c1-"$2"; }
code() { printf 'KLY{%s}' "$(h "$1" 16)"; }
L1=$(code l1); L2=$(code l2); L3=$(code l3); L4=$(code l4); L5=$(code l5); L6=$(code l6)

# Wortliste (erfunden) und das Passwort von „pruefer“ daraus
install -d -m 755 /usr/share/tresor
python3 - "$TOKEN" > /usr/share/tresor/woerter.txt <<'PY'
import sys, random, hashlib
r = random.Random(hashlib.sha256((sys.argv[1] + 'woerter').encode()).hexdigest())
silben = ['ka','lo','mi','ne','ru','sa','ti','bo','fe','gu','ha','ji','ke','la','mo','nu','pi','ra','se','to','va','we','zo','an','el','in','or','um']
w = set()
while len(w) < 3000: w.add(''.join(r.choice(silben) for _ in range(r.randrange(3, 5))) + str(r.randrange(10, 99)))
print('\n'.join(sorted(w)))
PY
WORT=$(python3 -c "import sys,hashlib; w=open('/usr/share/tresor/woerter.txt').read().split(); print(w[int(hashlib.sha256((sys.argv[1]+':tresor:wort').encode()).hexdigest(),16)%len(w)])" "$TOKEN")
PW_ENT=$(h pw:entwickler 12); PW_BET=$(h pw:betrieb 12); PW_WART=$(h pw:tresorwart 12); KOMBI=$(h kombi 4 | tr 'a-f' '1-6')-$(h kombi2 4 | tr 'a-f' '1-6')

mkuser() { useradd -m -s /bin/bash "$1"; echo "$1:$2" | chpasswd; chmod 700 "/home/$1"; rm -f "/home/$1/.bash_logout"; }
mkuser gast gast; mkuser pruefer "$WORT"; mkuser entwickler "$PW_ENT"; mkuser betrieb "$PW_BET"; mkuser tresorwart "$PW_WART"; mkuser tresormeister "$KOMBI"
passwd -l root >/dev/null
as() { local u=$1; shift; chown -R "$u:$u" "$@"; }
merke() { printf 'Code für die Arena: %s\n' "$2" > "/home/$1/code.txt"; chown "$1:$1" "/home/$1/code.txt"; chmod 600 "/home/$1/code.txt"; }

cat > /etc/motd <<'M'

  ╔══════════════════════════════════════════════════════════╗
  ║  BANKHAUS FALKENSTEIN · Tresor-Rechner (ÜBUNG)           ║
  ║  Nachtfalter Profi-Arena für Experten – alles erfunden.  ║
  ╚══════════════════════════════════════════════════════════╝
  Hier gibt es wenig Hilfe. Lies genau, probiere, denk wie ein Prüfer.
  Nächstes Konto: ssh NAME@localhost  ·  Codes: ~/code.txt

M

# ---------- Level 0 · gast: Passwort knacken (Wörterbuch)
H=/home/gast
printf '%s  pruefer\n' "$(printf '%s' "$WORT" | sha256sum | cut -c1-64)" > $H/pruefer.sha256
cat > $H/hinweis.txt <<'T'
Prüfauftrag 1: Der Prüfer hat ein „sicheres“ Passwort aus der hauseigenen Wortliste
(/usr/share/tresor/woerter.txt) gewählt. Von seinem Passwort kennst du nur den SHA-256-Wert.

Ein Hash lässt sich nicht zurückrechnen – aber man kann alle Kandidaten durchprobieren.
(Eine Schleife in der Shell oder ein paar Zeilen Python genügen.)
T
as gast $H

# ---------- Level 1 · pruefer: Geheimnis in der Git-Geschichte
H=/home/pruefer; merke pruefer "$L1"
mkdir -p $H/tresor-werkzeug && cd $H/tresor-werkzeug
git init -q -b main; git config user.email entwicklung@falkenstein.example; git config user.name "Entwicklung"
printf '# Tresor-Werkzeug\nPrüft Öffnungszeiten des Tresors.\n' > README.md
printf 'TRESOR_API=http://localhost:9000\nENTWICKLER_PASSWORT=%s\n' "$PW_ENT" > .env
git add -A; git commit -qm "Erste Version"
git rm -q --cached .env; rm .env; printf '.env\n' > .gitignore
git add -A; git commit -qm "Zugangsdaten entfernt (Sicherheit!)"
printf 'Version 1.1 – kleinere Verbesserungen\n' >> README.md; git add -A; git commit -qm "Doku"
cd /; as pruefer $H
cat > $H/hinweis.txt <<'T'
Prüfauftrag 2: Die Entwicklung schwört, dass keine Zugangsdaten im Werkzeug stecken –
„die haben wir doch gelöscht“. Prüf das nach (~/tresor-werkzeug).
T
chown pruefer:pruefer $H/hinweis.txt

# ---------- Level 2 · entwickler: Zugangsdaten im Protokoll
H=/home/entwickler; merke entwickler "$L2"
install -d -m 755 /var/log/tresor
python3 - "$TOKEN" "$PW_BET" > /var/log/tresor/sicherung.log <<'PY'
import sys, random, hashlib
r = random.Random(hashlib.sha256((sys.argv[1] + 'sich').encode()).hexdigest())
for d in range(1, 29):
    for t in ('02:00', '02:30'):
        print(f'2026-10-{d:02d} {t} sicherung start ziel=archiv{r.randrange(1,4)}.falkenstein.intern')
        print(f'2026-10-{d:02d} {t} sicherung ok dateien={r.randrange(800,1200)} dauer={r.randrange(40,90)}s')
print(f'2026-10-29 02:00 sicherung start ziel=https://betrieb:{sys.argv[2]}@archiv2.falkenstein.intern/upload')
print('2026-10-29 02:00 sicherung FEHLER verbindung abgelehnt (debug: volle URL protokolliert)')
PY
chown root:entwickler /var/log/tresor/sicherung.log; chmod 640 /var/log/tresor/sicherung.log   # nur für die Entwicklung lesbar
printf 'Prüfauftrag 3: Seit einem Fehler Ende Oktober läuft die Nacht-Sicherung (/var/log/tresor/) wieder.\nIst dabei etwas mitgeschrieben worden, das niemand sehen sollte?\n' > $H/hinweis.txt
as entwickler $H

# ---------- Level 3 · betrieb: PATH-Falle in einer automatischen Aufgabe
H=/home/betrieb; merke betrieb "$L3"
groupadd werkzeug; usermod -aG werkzeug betrieb
install -d -o tresorwart -g tresorwart -m 755 /opt/tresor/pruefung
install -d -o tresorwart -g werkzeug -m 2775 /opt/tresor/werkzeuge
cat > /opt/tresor/pruefung/nachtpruefung.sh <<'T'
#!/bin/bash
# Nachtprüfung – läuft alle 15 Sekunden als „tresorwart“
PATH=/opt/tresor/werkzeuge:/usr/local/bin:/usr/bin:/bin
bericht --kurz >> /tmp/nachtpruefung.log 2>&1 || true
T
chmod 755 /opt/tresor/pruefung/nachtpruefung.sh
printf 'Prüfauftrag 4: Lies /opt/tresor/pruefung/nachtpruefung.sh genau.\nWelches Programm wird dort aufgerufen – und WO sucht die Shell es zuerst?\nDas Passwort des Tresorwarts liegt in seinem Konto: ~/passwort.txt\n' > $H/hinweis.txt
as betrieb $H
H=/home/tresorwart; merke tresorwart "$L4"
printf 'tresorwart: %s\n' "$PW_WART" > $H/passwort.txt; chmod 600 $H/passwort.txt
printf 'Prüfauftrag 5: Die Tresor-API (Port 9000) liefert Dokumente aus ihrem Ordner aus.\nSie läuft als „tresormeister“. Ob sie wirklich nur DIESEN Ordner ausliefert?\nAnfang:  curl "http://localhost:9000/dokument?name=liesmich.txt"\n' > $H/hinweis.txt
as tresorwart $H

# ---------- Level 5 · tresormeister: Pfad-Ausbruch + verschlüsselter Tresor
H=/home/tresormeister; merke tresormeister "$L5"
mkdir -p $H/.tresor $H/api-dokumente
printf 'Kombination für den Tresor (zugleich Anmeldung): %s\n' "$KOMBI" > $H/.tresor/kombination
printf 'Willkommen bei der Tresor-API. Dokumente: liesmich.txt, oeffnungszeiten.txt\n' > $H/api-dokumente/liesmich.txt
printf 'Mo–Fr 08:00–18:00\n' > $H/api-dokumente/oeffnungszeiten.txt
printf 'TRESORINHALT\n\nGlückwunsch – du hast den Tresor geöffnet.\nAbschluss-Code: %s\n\nPrüfbericht: Was müsste das Bankhaus an jedem Schritt verbessern?\n' "$L6" \
  | openssl enc -aes-256-cbc -pbkdf2 -salt -pass "pass:$KOMBI" -out $H/tresor.enc 2>/dev/null
printf 'Letzter Schritt: ~/tresor.enc ist mit der Kombination verschlüsselt (AES-256-CBC, PBKDF2).\nopenssl kann das wieder öffnen.\n' > $H/hinweis.txt
as tresormeister $H

# ---------- Dienste
cat > /opt/tresor/api.py <<'PY'
import http.server, urllib.parse, os
BASIS = '/home/tresormeister/api-dokumente/'
import pwd as _pwd
def wer(sock):
    """Welcher Linux-Benutzer hat diese localhost-Verbindung geöffnet? (über /proc/net/tcp)"""
    try:
        port = sock.getpeername()[1]; mein = sock.getsockname()[1]
        for fn in ('/proc/net/tcp', '/proc/net/tcp6'):
            for z in open(fn).readlines()[1:]:
                p = z.split()
                if int(p[1].rsplit(':', 1)[1], 16) == port and int(p[2].rsplit(':', 1)[1], 16) == mein:
                    return _pwd.getpwuid(int(p[7])).pw_name
    except Exception: pass
    return None
class H(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def senden(self, c, t):
        b = t.encode(); self.send_response(c); self.send_header('Content-Type', 'text/plain; charset=utf-8')
        self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)
    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        if wer(self.connection) != 'tresorwart': return self.senden(403, 'Tresor-API: nur für den Tresorwart.\n')
        if u.path != '/dokument': return self.senden(404, 'Tresor-API: /dokument?name=…\n')
        name = urllib.parse.parse_qs(u.query).get('name', [''])[0]
        try:   # ABSICHTLICHE SCHWACHSTELLE: Pfad wird nicht geprüft (Übung „Path Traversal“)
            return self.senden(200, open(BASIS + name).read())
        except Exception: return self.senden(404, 'Dokument nicht gefunden.\n')
http.server.ThreadingHTTPServer(('127.0.0.1', 9000), H).serve_forever()
PY
chmod 644 /opt/tresor/api.py
runuser -u tresormeister -- env -i PATH=/usr/bin:/bin python3 /opt/tresor/api.py >/dev/null 2>&1 &
runuser -u tresorwart -- env -i PATH=/usr/bin:/bin HOME=/home/tresorwart bash -c 'while true; do timeout 10 /opt/tresor/pruefung/nachtpruefung.sh >/dev/null 2>&1; sleep 15; done' >/dev/null 2>&1 &

cat > /etc/ssh/sshd_config.d/tresor.conf <<'C'
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
echo "nf-tresor: Tresor bereit."
exec /usr/sbin/sshd -D -e
