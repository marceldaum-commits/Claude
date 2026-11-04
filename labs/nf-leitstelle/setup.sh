#!/bin/bash
# „Die Leitstelle“ – Profi-Arena: Dienste finden, mit ihnen sprechen, Daten entschlüsseln, Fehlkonfiguration ausnutzen.
# Codes: KLY{ sha256("<token>:leitstelle:lN")[:16] }  (l1 … l6). Alle Daten sind erfunden.
set -euo pipefail
TOKEN="${KLY_TOKEN:-}"
[[ "$TOKEN" =~ ^KLY-[0-9A-F]{6}$ ]] || { echo "FEHLER: KLY_TOKEN fehlt oder ist ungültig." >&2; exit 2; }
code() { printf 'KLY{%s}' "$(printf '%s' "$TOKEN:leitstelle:$1" | sha256sum | cut -c1-16)"; }
L1=$(code l1); L2=$(code l2); L3=$(code l3); L4=$(code l4); L5=$(code l5); L6=$(code l6)

mkuser() { useradd -m -s /bin/bash "$1"; echo "$1:$2" | chpasswd; chmod 700 "/home/$1"; rm -f "/home/$1/.bash_logout"; }
mkuser funker funker; mkuser technik "$L1"; mkuser netz "$L2"; mkuser archiv "$L3"; mkuser wache "$L4"; mkuser leitung "$L5"
useradd -r -s /usr/sbin/nologin dienst
passwd -l root >/dev/null
as() { local u=$1; shift; chown -R "$u:$u" "$@"; }
install -d -m 711 /opt/leitstelle/dienste
geheim() { install -o dienst -m 400 /dev/null "/opt/leitstelle/dienste/$1"; printf '%s\n' "$2" > "/opt/leitstelle/dienste/$1"; }

cat > /etc/motd <<'M'

  ┌────────────────────────────────────────────────────────────┐
  │  INTEGRIERTE LEITSTELLE NORDHAFEN · System „leitstelle“    │
  │  Übungssystem (Nachtfalter Profi-Arena) – alles erfunden.  │
  └────────────────────────────────────────────────────────────┘
  Lies deine Einweisung. Codes KLY{…} trägst du in der Arena ein.
  Nächstes Konto: ssh NAME@localhost

M

# ---------- Level 0 · funker: lauschende Dienste finden
H=/home/funker
cat > $H/einweisung.txt <<'T'
EINWEISUNG – Nachtschicht Leitstelle

Willkommen, Funker. Die Kollegen der Technik haben vor Feierabend einen
„Auskunftsdienst“ auf diesem Rechner gestartet, der dir den Zugang zum
Konto „technik“ verrät. Leider weiß keiner mehr, auf welchem Port er lauscht.

Tipps:
  * Welche Ports sind auf diesem Rechner offen?     ss -tln
  * Mit einem Dienst „sprechen“:                    nc localhost PORT
  * Nicht jeder Dienst sagt die Wahrheit.

Wenn du den Zugang hast:   ssh technik@localhost
T
geheim auskunft "$L1"
as funker $H

# ---------- Level 1 · technik: Web-Dienst mit verstecktem Bereich
H=/home/technik
cat > $H/notiz.txt <<'T'
Wartungsnotiz (Technik):
Auf Port 8080 läuft das Leitstellen-Portal. Der Wartungsbereich ist versteckt
und nur mit dem richtigen Ausweis (HTTP-Header) erreichbar.
Was Suchmaschinen NICHT anschauen sollen, verrät oft genau, wo man suchen muss.

Werkzeug:  curl -i http://localhost:8080/
Header mitschicken:  curl -H "Name: Wert" …
T
printf 'Ausweis-Header für die Wartung:\n  X-Leitstelle-Ausweis: %s\n' "$(printf '%s' "$TOKEN:leitstelle:ausweis" | sha256sum | cut -c1-12)" > $H/.ausweis
geheim portal "$(printf '%s' "$TOKEN:leitstelle:ausweis" | sha256sum | cut -c1-12) $L2"
as technik $H

# ---------- Level 2 · netz: eigenes Protokoll + verpackte Daten
H=/home/netz
cat > $H/protokoll.txt <<'T'
Funk-Gateway (Port 4444) – Kurzanleitung

Das Gateway spricht ein einfaches Textprotokoll. Jede Zeile ist ein Befehl:
  HALLO <dein-benutzername>
  LISTE
  HOLE <name>
  TSCHUESS

Was HOLE liefert, ist für den Funk „verpackt“ (erst Base64, darin gzip).
Auspacken:  echo 'TEXT' | base64 -d | gunzip
T
geheim gateway "$L3"
as netz $H

# ---------- Level 3 · archiv: Protokolle auswerten, Hex dekodieren
H=/home/archiv
install -d -m 755 /var/log/leitstelle
python3 - "$TOKEN" "$L4" > /var/log/leitstelle/zugriffe.log <<'PY'
import sys, random, hashlib
tok, pw = sys.argv[1], sys.argv[2]
r = random.Random(hashlib.sha256((tok + 'log').encode()).hexdigest())
namen = ['funker', 'technik', 'netz', 'archiv', 'leitung', 'disponent', 'gast']
zeilen = []
for i in range(4000):
    h, m, s = r.randrange(6, 22), r.randrange(60), r.randrange(60)
    n = r.choice(namen)
    ok = r.random() < 0.8
    zeilen.append((h, m, s, f'login user={n} result={"OK" if ok else "FAIL"} src=10.0.{r.randrange(1,9)}.{r.randrange(2,250)}'))
zeilen.append((3, 17, 42, 'login user=wache result=OK src=10.0.9.66'))
zeilen.append((3, 17, 43, 'debug auth wache pass_hex=' + pw.encode().hex()))
zeilen.sort()
for h, m, s, t in zeilen: print(f'2026-11-03 {h:02d}:{m:02d}:{s:02d} {t}')
PY
chown root:archiv /var/log/leitstelle/zugriffe.log; chmod 640 /var/log/leitstelle/zugriffe.log   # nur das Archiv darf das Protokoll lesen
cat > $H/auftrag.txt <<'T'
AUFTRAG Archiv

In /var/log/leitstelle/zugriffe.log stehen alle Anmeldungen der letzten Nacht.
Ein Konto hat sich zu einer Uhrzeit angemeldet, zu der eigentlich niemand da ist.
Finde es – und schau, was die Software direkt danach „zum Debuggen“ mitgeschrieben hat.

Hilfreich:  grep, sort, uniq -c, cut, less   und für Hex:  xxd -r -p
T
as archiv $H

# ---------- Level 4 · wache: falsch konfigurierter Schichtwechsel (Cron-Ersatz)
H=/home/wache
groupadd schicht; usermod -aG schicht wache
install -d -o leitung -g schicht -m 2775 /opt/schichtwechsel
cat > /opt/schichtwechsel/00-uebergabe.sh <<'T'
#!/bin/bash
# Schichtübergabe – wird alle 15 Sekunden vom Konto „leitung“ ausgeführt
date '+%F %T Übergabe ok' >> /tmp/uebergabe.log
T
chown leitung:schicht /opt/schichtwechsel/00-uebergabe.sh; chmod 775 /opt/schichtwechsel/00-uebergabe.sh
cat > $H/dienstanweisung.txt <<'T'
Dienstanweisung Wache

Alle 15 Sekunden führt das Konto „leitung“ automatisch jedes Skript in
/opt/schichtwechsel/ aus (sortiert nach Name). Die Wache darf dort Skripte ablegen,
„damit die Übergabe flexibler ist“.

Die Leitung bewahrt ihr Passwort in ~/geheim.txt auf (nur für sie lesbar).
Was könnte da schiefgehen?

Tipps:  ls -l /opt/schichtwechsel   ·   ein Skript braucht  #!/bin/bash  und  chmod +x
        Was du nach /tmp kopierst, kannst du mit chmod für alle lesbar machen.
T
as wache $H
H=/home/leitung
printf 'Passwort leitung: %s\n' "$L5" > $H/geheim.txt; chmod 600 $H/geheim.txt
cat > $H/abschluss.txt <<T
ABSCHLUSSBERICHT – Leitstelle Nordhafen

Du bist im Konto der Leitung. Damit hast du gezeigt:
  * offene Dienste gefunden und mit ihnen gesprochen
  * versteckte Web-Bereiche und Header genutzt
  * ein fremdes Protokoll bedient und Daten ausgepackt
  * Protokolle ausgewertet und Hex dekodiert
  * eine falsch eingerichtete automatische Aufgabe ausgenutzt

Abschluss-Code: $L6

Für den echten Bericht: Was müsste die Leitstelle reparieren? Schreib es dir auf.
T
as leitung $H

# ---------- Dienste (als unprivilegierter Benutzer „dienst“; Geheimnisse nur für ihn lesbar)
cat > /opt/leitstelle/dienste.py <<'PY'
import socket, threading, http.server, base64, gzip, os
D = '/opt/leitstelle/dienste/'
lies = lambda n: open(D + n).read().strip()
AUSKUNFT, (AUSWEIS, PORTAL), GATEWAY = lies('auskunft'), lies('portal').split(), lies('gateway')

def banner(port, text):
    s = socket.socket(); s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1); s.bind(('127.0.0.1', port)); s.listen(8)
    def run():
        while True:
            c, _ = s.accept()
            try: c.sendall(text.encode())
            finally: c.close()
    threading.Thread(target=run, daemon=True).start()
banner(2101, 'Leitstelle Zeitdienst – 03:17 Uhr. Keine Auskunft.\n')
banner(2525, '220 leitstelle Post-Relay (deaktiviert)\n')
banner(5150, 'Auskunftsdienst? Nein, hier ist die Kantine. Heute: Eintopf.\n')
banner(31337, f'Auskunftsdienst der Technik.\nZugang Konto technik: {AUSKUNFT}\n')

class Portal(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def senden(self, code, text, typ='text/plain; charset=utf-8'):
        b = text.encode(); self.send_response(code); self.send_header('Content-Type', typ)
        self.send_header('Server', 'Leitstellen-Portal/2.3'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)
    def do_GET(self):
        p = self.path.split('?')[0]
        if p == '/': return self.senden(200, '<h1>Leitstellen-Portal</h1><p>Willkommen. Öffentlich gibt es hier nichts Spannendes.</p>\n', 'text/html; charset=utf-8')
        if p == '/robots.txt': return self.senden(200, 'User-agent: *\nDisallow: /wartung/\n')
        if p.startswith('/wartung'):
            if self.headers.get('X-Leitstelle-Ausweis') != AUSWEIS:
                return self.senden(403, 'Wartungsbereich: Ausweis fehlt (Header X-Leitstelle-Ausweis). Wer Wartung macht, hat ihn irgendwo in seinem Konto.\n')
            return self.senden(200, f'Wartungsbereich – willkommen, Technik.\nZugang Konto netz: {PORTAL}\n')
        return self.senden(404, 'Nicht gefunden.\n')
threading.Thread(target=http.server.ThreadingHTTPServer(('127.0.0.1', 8080), Portal).serve_forever, daemon=True).start()

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

def gateway():
    s = socket.socket(); s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1); s.bind(('127.0.0.1', 4444)); s.listen(8)
    paket = base64.b64encode(gzip.compress(f'Zugang Konto archiv: {GATEWAY}\n'.encode(), mtime=0)).decode()
    def kunde(c):
        r = c.makefile('r', encoding='utf-8', errors='replace', newline='\n'); f = c.makefile('w', encoding='utf-8', newline='\n'); hallo = False
        f.write('FUNK-GATEWAY bereit. Befehle: HALLO, LISTE, HOLE, TSCHUESS\n'); f.flush()
        for zeile in r:
            t = zeile.strip().split()
            if not t: continue
            b = t[0].upper()
            if b == 'HALLO' and len(t) > 1:
                echt = wer(c)
                if echt != 'netz': f.write(f'FEHLER Zugang nur für das Konto netz (du bist {echt or "unbekannt"})\n'); f.flush(); break
                hallo = True; f.write(f'OK hallo {t[1][:20]}\n')
            elif b == 'TSCHUESS': f.write('OK tschüss\n'); f.flush(); break
            elif not hallo: f.write('FEHLER erst HALLO <name>\n')
            elif b == 'LISTE': f.write('OK wetter.txt dienstplan.txt zugang-archiv\n')
            elif b == 'HOLE' and len(t) > 1:
                if t[1] == 'zugang-archiv': f.write(f'OK {paket}\n')
                elif t[1] in ('wetter.txt', 'dienstplan.txt'): f.write('OK ' + base64.b64encode(gzip.compress(b'Nichts Besonderes.\n', mtime=0)).decode() + '\n')
                else: f.write('FEHLER unbekannt\n')
            else: f.write('FEHLER unbekannter Befehl\n')
            f.flush()
        try: r.close(); f.close()
        except Exception: pass
        c.close()
    while True:
        c, _ = s.accept(); threading.Thread(target=kunde, args=(c,), daemon=True).start()
gateway()
PY
chmod 644 /opt/leitstelle/dienste.py
runuser -u dienst -- env -i PATH=/usr/bin:/bin python3 /opt/leitstelle/dienste.py >/dev/null 2>&1 &
# Schichtwechsel: „leitung“ führt alle 15 s die Skripte aus (absichtlich unsicher)
runuser -u leitung -- env -i PATH=/usr/bin:/bin HOME=/home/leitung bash -c 'while true; do for f in /opt/schichtwechsel/*; do [ -x "$f" ] && timeout 10 "$f" >/dev/null 2>&1; done; sleep 15; done' >/dev/null 2>&1 &

cat > /etc/ssh/sshd_config.d/leitstelle.conf <<'C'
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
echo "nf-leitstelle: Leitstelle bereit."
exec /usr/sbin/sshd -D -e
