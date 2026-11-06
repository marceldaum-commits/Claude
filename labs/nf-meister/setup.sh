#!/bin/bash
# „Der Meister: Das Rechenzentrum“ – Pivoting durch ein simuliertes internes Netz (Konten = Maschinen) + Buffer Overflow.
# Codes: KLY{ sha256("<salz>:meister:lN")[:16] } (l1 … l6). Alles erfunden; nur localhost.
set -euo pipefail
TOKEN="${KLY_TOKEN:-}"
[[ "$TOKEN" =~ ^KLY-[0-9A-F]{6}$ ]] || { echo "FEHLER: KLY_TOKEN fehlt oder ist ungültig." >&2; exit 2; }
SALZ="${KLY_SALZ:-}"; [[ "$SALZ" =~ ^[0-9a-f]{32}$ ]] || SALZ="$TOKEN"
unset KLY_SALZ
code() { printf 'KLY{%s}' "$(printf '%s' "$SALZ:meister:$1" | sha256sum | cut -c1-16)"; }
L1=$(code l1); L2=$(code l2); L3=$(code l3); L4=$(code l4); L5=$(code l5); L6=$(code l6)
PW_WEB="rz-$(printf '%s' "$SALZ:web" | sha256sum | cut -c1-8)"
PW_DB="db-$(printf '%s' "$SALZ:db" | sha256sum | cut -c1-8)"
# kern-Passwort stammt aus einer Wortliste (knackbar)
KERN_WORT=$(python3 -c "import hashlib,sys; w=['herbstlaub','nordwind','blaumeise','kieselstein','ahornblatt','silberfuchs','morgentau','basaltstein']; print(w[int(hashlib.sha256((sys.argv[1]+':kern').encode()).hexdigest(),16)%len(w)])" "$SALZ")
PW_KERN="${KERN_WORT}$(printf '%s' "$SALZ:kernnum" | sha256sum | cut -c1-3 | tr -dc 0-9)0"

mkuser() { useradd -m -s /bin/bash "$1"; echo "$1:$2" | chpasswd; chmod 700 "/home/$1"; rm -f "/home/$1/.bash_logout"; }
mkuser extern extern; mkuser webadmin "$PW_WEB"; mkuser db "$PW_DB"; mkuser kern "$PW_KERN"
useradd -r -s /usr/sbin/nologin dienst; useradd -r -s /usr/sbin/nologin pruef; passwd -l pruef >/dev/null
groupadd rz; usermod -aG rz kern
passwd -l root >/dev/null

cat > /etc/motd <<'M'

  ┌────────────────────────────────────────────────────────────┐
  │  RECHENZENTRUM NORDSTADT · Meister-Prüfung                 │
  │  Übungssystem (Nachtfalter Arena) – alles erfunden.        │
  │  Simuliertes internes Netz: jedes Konto ist eine Maschine. │
  └────────────────────────────────────────────────────────────┘
  Lies ~/auftrag.txt.  Hilfe: hilfe   Begriffe: begriff pivoting

M

# ---------- L1 · extern: Foothold, Zugang zu „web“ in Spuren
H=/home/extern
cat > $H/auftrag.txt <<T
MEISTER-PRÜFUNG – Das Rechenzentrum (Pivoting + Exploitation)

Du hast Fuß auf dem Randserver „extern“ gefasst. Von hier musst du dich durch das interne Netz
bis zum Kern vorarbeiten. Jede Maschine ist ein eigenes Konto (ssh NAME@localhost).

  Maschinen (so weit bekannt):  extern → web → db → kern
  Dienste:  die „Inventar-API“ und der „Prüfdienst“ laufen nur intern.

  1. Verschaff dir den Zugang zur Maschine „web“. Schau in deine eigene Vergangenheit.
     Tipp: Automatische Skripte speichern Zugangsdaten gern im Klartext.  cat ~/.config/*  ·  history

Werkzeuge: ssh, curl, nc, python3, objdump, nm, gdb, grep, sha256sum, xxd.  hilfe · begriff pivoting
T
install -d -m 700 -o extern -g extern $H/.config
cat > $H/.config/sync.conf <<T
# Automatische Datensicherung zur Maschine web (Altlast, Klartext!)
ziel=web
benutzer=webadmin
passwort=$PW_WEB
# Prüf-Notiz: $L1
T
chown extern:extern $H/.config/sync.conf; chmod 600 $H/.config/sync.conf
cat > $H/.bash_history <<T
ls -la
cat ~/.config/sync.conf
ssh webadmin@localhost
clear
T
chown extern:extern $H/.bash_history $H/auftrag.txt

# ---------- L2 · webadmin: Inventar-API nur für webadmin (über /proc/net/tcp geprüft)
H=/home/webadmin
cat > $H/notiz.txt <<T
Von hier (web) erreichst du die interne Inventar-API:  curl http://127.0.0.1:8099/inventar
Sie antwortet nur, wenn die Anfrage von der Maschine „web“ kommt.
Der Datenbankserver „db“ hat ein eigenes Konto – die API kennt die Zugangsdaten.

Außerdem läuft der „Prüfdienst“ auf 127.0.0.1:9099 (als eigener Dienst). Die Binärdatei und der
Quelltext liegen offen in /opt/meister/ – analysiere sie (objdump, nm) und bring den Dienst dazu,
dir den Code zu verraten. Tipp: Rücksprungadresse überschreiben (ret2win). Stürzt gewinn() ab,
hilft ein zusätzliches ret-Gadget (16-Byte-Stack-Ausrichtung auf 64-Bit).
T
chown webadmin:webadmin $H/notiz.txt
cat > /opt/meister/inventar.py <<PY
import http.server
ERLAUBT='webadmin'
import pwd
def wer(sock):
    try:
        port=sock.getpeername()[1]; mein=sock.getsockname()[1]
        for fn in ('/proc/net/tcp','/proc/net/tcp6'):
            for z in open(fn).readlines()[1:]:
                p=z.split()
                if int(p[1].rsplit(':',1)[1],16)==port and int(p[2].rsplit(':',1)[1],16)==mein:
                    return pwd.getpwuid(int(p[7])).pw_name
    except Exception: pass
    return None
INHALT="Inventar Rechenzentrum\nDB-Zugang: db / $PW_DB\nPruef-Notiz: $L2\n"
class Hd(http.server.BaseHTTPRequestHandler):
    def log_message(self,*a): pass
    def do_GET(self):
        if wer(self.connection)!=ERLAUBT:
            b=b'Nur von der Maschine web erreichbar.\n'; self.send_response(403)
        elif self.path!='/inventar':
            b=b'Inventar-API: /inventar\n'; self.send_response(404)
        else:
            b=INHALT.encode(); self.send_response(200)
        self.send_header('Content-Length',str(len(b))); self.end_headers(); self.wfile.write(b)
http.server.ThreadingHTTPServer(('127.0.0.1',8099),Hd).serve_forever()
PY
# Quelltext enthaelt das DB-Passwort + L2 (wird nur ueber die API an 'webadmin' ausgeliefert):
# darf NICHT vom Spieler (extern) lesbar sein -> nur 'dienst' (startet die API) darf ihn lesen.
chown dienst:dienst /opt/meister/inventar.py; chmod 400 /opt/meister/inventar.py
runuser -u dienst -- env -i PATH=/usr/bin:/bin python3 /opt/meister/inventar.py >/dev/null 2>&1 &

# ---------- L3 · db: knackbarer Passwort-Hash für kern + Wortliste
H=/home/db
printf 'Prüf-Notiz db: %s\n' "$L3" > $H/notiz.txt
printf 'kern:%s\n' "$(printf '%s' "$PW_KERN" | sha256sum | cut -d' ' -f1)" > $H/schatten.txt
python3 - "$KERN_WORT" > $H/woerter.txt <<'PY'
import sys
basis=['herbstlaub','nordwind','blaumeise','kieselstein','ahornblatt','silberfuchs','morgentau','basaltstein','abendrot','tannenzapfen','steinadler','wintermond']
w=set(basis)
for b in basis:
    for n in range(0,1000,1):
        w.add(f'{b}{n}0')
print('\n'.join(sorted(w)))
PY
cat > $H/hinweis.txt <<T
Aus einem alten Backup: schatten.txt (Benutzer:SHA256 des Passworts) und eine Wortliste woerter.txt.
Knacke das Passwort von „kern“: für jedes Wort den sha256 bilden und mit dem Hash vergleichen.
Tipp: eine kleine Schleife in bash oder python3. Dann:  ssh kern@localhost
T
chown db:db $H/notiz.txt $H/schatten.txt $H/woerter.txt $H/hinweis.txt; chmod 640 $H/schatten.txt

# ---------- L4 · Prüfdienst (Buffer Overflow, läuft als kern) auf 127.0.0.1:9099
# L4-Code NICHT als Datei ablegen (root koennte sie sonst einfach lesen und den Buffer-Overflow ueberspringen).
# Er wird dem Dienst nur ueber die Umgebung mitgegeben (siehe pwnserver-Start unten); gewinn() liest ihn per getenv.
install -m 755 /opt/build/pruefdienst /opt/meister/pruefdienst
cp /opt/build/pruefdienst.c /opt/meister/pruefdienst.c; chmod 644 /opt/meister/pruefdienst.c
# Netzdienst: pro Verbindung den verwundbaren Prozess mit Socket als stdin/stdout starten (als kern)
cat > /opt/meister/pwnserver.py <<'PY'
import socket, subprocess, threading, os
CODE=os.environ.get('PRUEF_CODE','')   # Abschluss-Code L4, kam ueber die Umgebung (keine Datei auf der Platte)
s=socket.socket(); s.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1); s.bind(('127.0.0.1',9099)); s.listen(16)
def kunde(c):
    try: subprocess.run(['/opt/meister/pruefdienst'], stdin=c.fileno(), stdout=c.fileno(), stderr=c.fileno(), timeout=20, env={'PRUEF_CODE':CODE,'PATH':'/usr/bin:/bin'})
    except Exception: pass
    try: c.close()
    except Exception: pass
while True:
    c,_=s.accept(); threading.Thread(target=kunde,args=(c,),daemon=True).start()
PY
chmod 644 /opt/meister/pwnserver.py
runuser -u pruef -- env -i PATH=/usr/bin:/bin PRUEF_CODE="$L4" python3 /opt/meister/pwnserver.py >/dev/null 2>&1 &

# ---------- L5 · kern: Abschluss-Hinweis + Weg zu root (schreibbares Root-Skriptverzeichnis)
H=/home/kern
printf 'Prüf-Notiz kern: %s\n' "$L5" > $H/notiz.txt
cat > $H/auftrag-final.txt <<T
Fast am Ziel. Der Kern-Dienst (als root) führt alle 10 Sekunden die Skripte in /opt/meister/aufgaben/ aus.
Dieses Verzeichnis darf die Gruppe „rz“ beschreiben (du bist drin). Was root ausführt, läuft mit Root-Rechten …
Das letzte Geheimnis liegt in /root/abschluss.txt (nur root darf es lesen).
T
chown kern:kern $H/notiz.txt $H/auftrag-final.txt
install -d -o root -g rz -m 2775 /opt/meister/aufgaben
printf 'MEISTER BESTANDEN – Abschluss-Code: %s\nRespekt. Du hast dich vom Rand bis zum Kern durchgearbeitet.\n' "$L6" > /root/abschluss.txt; chmod 600 /root/abschluss.txt
# Root-Runner (wie ein Cronjob): führt Skripte aus /opt/meister/aufgaben aus
( while true; do for f in /opt/meister/aufgaben/*.sh; do [ -f "$f" ] && [ -x "$f" ] && timeout 8 bash "$f" >/dev/null 2>&1; done; sleep 10; done ) &

cat > /etc/ssh/sshd_config.d/meister.conf <<'C'
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
for _ in $(seq 1 30); do nc -z 127.0.0.1 9099 && nc -z 127.0.0.1 8099 && break; sleep 0.2; done
echo "nf-meister: Meister bereit."
exec /usr/sbin/sshd -D -e
