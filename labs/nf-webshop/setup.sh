#!/bin/bash
# „Der Webshop“ – Profi-Arena: Web-Hacking mit curl. Vergessener Testzugang, fremde Bestellungen (IDOR),
# Cookie-Manipulation, SQL-Injection, Befehlseinschleusung und eine selbst gebaute Signatur.
# Codes: KLY{ sha256("<salz>:webshop:lN")[:16] } (l1 … l6). Alle Daten sind erfunden.
set -euo pipefail
TOKEN="${KLY_TOKEN:-}"
[[ "$TOKEN" =~ ^KLY-[0-9A-F]{6}$ ]] || { echo "FEHLER: KLY_TOKEN fehlt oder ist ungültig." >&2; exit 2; }
SALZ="${KLY_SALZ:-}"; [[ "$SALZ" =~ ^[0-9a-f]{32}$ ]] || SALZ="$TOKEN"   # Arena: geheimes Salz vom Server; sonst (eigenes Kali) der Token
unset KLY_SALZ
h() { printf '%s' "$SALZ:webshop:$1" | sha256sum | cut -c1-"$2"; }
code() { printf 'KLY{%s}' "$(h "$1" 16)"; }
L1=$(code l1); L2=$(code l2); L3=$(code l3); L4=$(code l4); L5=$(code l5); L6=$(code l6)
PW_TEST="sommer$(h test 4)"; PW_ADMIN=$(h admin 24); SCHLUESSEL=$(h schluessel 32)

useradd -m -s /bin/bash kunde; echo 'kunde:kunde' | chpasswd; chmod 700 /home/kunde; rm -f /home/kunde/.bash_logout
useradd -r -s /usr/sbin/nologin shop; useradd -r -s /usr/sbin/nologin chef
groupadd schluessel; usermod -aG schluessel shop; usermod -aG schluessel chef
passwd -l root >/dev/null

cat > /etc/motd <<'M'

  ┌────────────────────────────────────────────────────────────┐
  │  KRÄUTERKONTOR GmbH · Online-Shop „kontor“                 │
  │  Übungssystem (Nachtfalter Profi-Arena) – alles erfunden.  │
  └────────────────────────────────────────────────────────────┘
  Lies ~/auftrag.txt. Codes KLY{…} trägst du in der Arena ein.

M
cat > /home/kunde/auftrag.txt <<'T'
PENTEST-AUFTRAG – Kräuterkontor GmbH (schriftlich freigegeben, alles erfunden)

Ziel: der Online-Shop auf  http://localhost:8000  – du arbeitest nur mit curl.
Jede gefundene Schwachstelle liefert einen Code KLY{…}.

  1. Vergessene Spuren   Schau dir den Quelltext der Startseite an.      curl http://localhost:8000/
                         Anmelden:  curl -i -d 'user=NAME&pass=PASSWORT' http://localhost:8000/login
                         Cookies merken/mitschicken:  -c ~/keks.txt  bzw.  -b ~/keks.txt
  2. Fremde Bestellung   Deine Bestellung hat eine Nummer in der Adresse. Und die anderen?
  3. Rollen-Keks         Ein Cookie verrät deine Rolle. Ist er geschützt? (base64 -d / base64)
  4. Suche               Die Produktsuche baut ihre SQL-Abfrage aus deiner Eingabe. Fehlermeldungen helfen.
                         Leerzeichen & Co. in der Adresse: curl -G --data-urlencode "q=…" …
  5. Prüf-Werkzeug       Im Mitarbeiterbereich gibt es ein Werkzeug, das Befehle auf dem Server ausführt …
  6. Chef-Tresor         Port 8100 – braucht eine Signatur. Wie die gebaut wird, steht auf dem Server.

Am Ende: Für jede Lücke eine Gegenmaßnahme notieren. Das ist der eigentliche Pentest-Bericht.
T
chown kunde:kunde /home/kunde/auftrag.txt

# ---------- Shop-Daten (nur für den Dienst „shop“)
install -d -o shop -g shop -m 700 /opt/shop /opt/shop/daten
install -d -o root -g schluessel -m 750 /opt/schluessel
printf '%s\n' "$SCHLUESSEL" > /opt/schluessel/signatur.key; chown root:schluessel /opt/schluessel/signatur.key; chmod 440 /opt/schluessel/signatur.key
printf '%s\n' "$L3" > /opt/shop/daten/l3; printf 'Glückwunsch, Befehlseinschleusung geklappt!\nCode: %s\n' "$L5" > /opt/shop/daten/l5.txt
cat > /opt/shop/daten/LIESMICH-chef.txt <<'T'
Chef-Tresor (Port 8100, Pfad /tresor) – nur mit Signatur:
  Header  X-Signatur: <HMAC-SHA256 über das Wort  chef  mit dem Schlüssel aus /opt/schluessel/signatur.key, als Hex>
Rechnen z. B. mit Python:
  python3 -c "import hmac,hashlib; print(hmac.new(b'SCHLUESSEL', b'chef', hashlib.sha256).hexdigest())"
T
python3 - "$PW_TEST" "$PW_ADMIN" "$L1" "$L2" "$L4" <<'PY'
import sqlite3, sys
pw_test, pw_admin, l1, l2, l4 = sys.argv[1:]
db = sqlite3.connect('/opt/shop/daten/shop.db')
db.executescript('''
create table benutzer(id integer primary key, name text, pass text, rolle text);
create table produkte(id integer primary key, name text, preis text);
create table bestellungen(id integer primary key, benutzer integer, inhalt text, notiz text);
create table geheim(name text, wert text);
''')
db.executemany('insert into benutzer values(?,?,?,?)', [(1, 'admin', pw_admin, 'admin'), (7, 'test', pw_test, 'kunde')])
db.executemany('insert into produkte(name, preis) values(?,?)', [('Pfefferminztee', '3,90'), ('Kamillentee', '3,50'), ('Salbei', '4,20'), ('Rosmarin', '2,90'), ('Lavendel', '5,10'), ('Thymian', '2,70')])
db.executemany('insert into bestellungen values(?,?,?,?)', [
  (1001, 1, '50 × Lavendel (Lieferant)', f'Interne Notiz: Code {l2}. Mitarbeiterbereich unter /intern – nur Rolle „mitarbeiter“.'),
  (1042, 7, '2 × Pfefferminztee', f'Willkommen im Testkonto. Code {l1}'),
])
db.execute('insert into geheim values(?,?)', ('pruefcode', l4))
db.commit()
PY
chown shop:shop /opt/shop/daten/*; chmod 600 /opt/shop/daten/shop.db

cat > /opt/shop/app.py <<'PY'
# Kräuterkontor-Shop – ABSICHTLICH VERWUNDBAR (Übung). Nie so programmieren!
import http.server, urllib.parse, sqlite3, base64, secrets, subprocess, html
DB = '/opt/shop/daten/shop.db'; L3 = open('/opt/shop/daten/l3').read().strip()
SITZUNGEN = {}
def q(sql, a=()):
    c = sqlite3.connect(DB); c.row_factory = None
    try: return c.execute(sql, a).fetchall()
    finally: c.close()
SEITE = '''<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Kräuterkontor</title></head><body>
<h1>Kräuterkontor – frische Kräuter seit 1987</h1>
<p><a href="/suche?q=tee">Produkte suchen</a> · <a href="/login">Anmelden</a> · <a href="/konto">Mein Konto</a></p>
<!-- TODO vor Livegang entfernen!!! Testzugang: test / %s -->
</body></html>'''
class H(http.server.BaseHTTPRequestHandler):
    server_version = 'Kontor/1.0'; sys_version = ''
    def log_message(self, *a): pass
    def senden(self, code, text, kekse=(), typ='text/plain; charset=utf-8'):
        b = text.encode(); self.send_response(code); self.send_header('Content-Type', typ)
        for k in kekse: self.send_header('Set-Cookie', k)
        self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)
    def kekse(self):
        k = {}
        for teil in (self.headers.get('Cookie') or '').split(';'):
            if '=' in teil: a, b = teil.strip().split('=', 1); k[a] = b
        return k
    def wer(self):
        return SITZUNGEN.get(self.kekse().get('sitzung', ''))
    def rolle(self):
        try: return base64.b64decode(self.kekse().get('rolle', '') + '==').decode('utf-8', 'replace').strip()
        except Exception: return ''
    def do_GET(self):
        u = urllib.parse.urlparse(self.path); p = urllib.parse.parse_qs(u.query)
        if u.path == '/': return self.senden(200, SEITE % TESTPW, typ='text/html; charset=utf-8')
        if u.path == '/login': return self.senden(200, 'Anmelden per POST: user=…&pass=…\n')
        if u.path == '/suche':
            s = p.get('q', [''])[0]
            sql = "SELECT name, preis FROM produkte WHERE name LIKE '%" + s + "%'"   # SQL-Injection!
            try: rows = q(sql)
            except Exception as e: return self.senden(500, f'Datenbankfehler (SQLite): {e}\nAbfrage: {sql}\n')
            return self.senden(200, ''.join(f'{a} – {b} €\n' for a, b in rows) or 'Nichts gefunden.\n')
        w = self.wer()
        if not w: return self.senden(401, 'Bitte erst anmelden (Cookie „sitzung“ fehlt).\n')
        if u.path == '/konto':
            ids = [r[0] for r in q('SELECT id FROM bestellungen WHERE benutzer=?', (w[0],))]
            return self.senden(200, f'Hallo {w[1]}! Deine Rolle: {self.rolle() or "?"}\nDeine Bestellungen: ' + ', '.join(f'/bestellung?id={i}' for i in ids) + '\n')
        if u.path == '/bestellung':   # IDOR: keine Prüfung, wem die Bestellung gehört!
            try: r = q('SELECT id, inhalt, notiz FROM bestellungen WHERE id=?', (int(p.get('id', ['0'])[0]),))
            except ValueError: r = []
            if not r: return self.senden(404, 'Bestellung nicht gefunden.\n')
            return self.senden(200, f'Bestellung {r[0][0]}: {r[0][1]}\n{r[0][2]}\n')
        if u.path.startswith('/intern'):
            if self.rolle() != 'mitarbeiter': return self.senden(403, f'Nur für Mitarbeiter (deine Rolle: {self.rolle() or "?"}).\n')
            if u.path == '/intern': return self.senden(200, f'Mitarbeiterbereich. Code: {L3}\nWerkzeug: /intern/pruefen?host=localhost  – prüft, ob ein Rechner bekannt ist.\n')
            if u.path == '/intern/pruefen':
                host = p.get('host', [''])[0][:200]
                try: out = subprocess.run(f'getent hosts {host} && echo "→ bekannt" || echo "→ unbekannt"', shell=True, capture_output=True, text=True, timeout=5).stdout   # Befehlseinschleusung!
                except subprocess.TimeoutExpired: out = 'Zeitüberschreitung\n'
                return self.senden(200, out[:4000])
        return self.senden(404, 'Nicht gefunden.\n')
    def do_POST(self):
        if self.path != '/login': return self.senden(404, 'Nicht gefunden.\n')
        n = min(int(self.headers.get('Content-Length') or 0), 2000)
        f = urllib.parse.parse_qs(self.rfile.read(n).decode('utf-8', 'replace'))
        r = q('SELECT id, name, rolle FROM benutzer WHERE name=? AND pass=?', (f.get('user', [''])[0], f.get('pass', [''])[0]))
        if not r: return self.senden(403, 'Falscher Name oder falsches Passwort.\n')
        sid = secrets.token_hex(16); SITZUNGEN[sid] = (r[0][0], r[0][1])
        rolle = base64.b64encode(r[0][2].encode()).decode()
        return self.senden(200, f'Angemeldet als {r[0][1]}. Weiter: /konto\n', [f'sitzung={sid}; Path=/; HttpOnly', f'rolle={rolle}; Path=/'])
TESTPW = q("SELECT pass FROM benutzer WHERE name='test'")[0][0]
http.server.ThreadingHTTPServer(('127.0.0.1', 8000), H).serve_forever()
PY
chown shop:shop /opt/shop/app.py; chmod 600 /opt/shop/app.py

# ---------- Chef-Tresor (eigener Dienst, eigener Benutzer)
install -d -o chef -g chef -m 700 /opt/chef
printf '%s\n' "$L6" > /opt/chef/l6; chown chef:chef /opt/chef/l6; chmod 400 /opt/chef/l6
cat > /opt/chef/tresor.py <<'PY'
import http.server, hmac, hashlib
KEY = open('/opt/schluessel/signatur.key').read().strip().encode(); L6 = open('/opt/chef/l6').read().strip()
SOLL = hmac.new(KEY, b'chef', hashlib.sha256).hexdigest()
class H(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_GET(self):
        if self.path != '/tresor': t, c = 'Chef-Tresor: nur /tresor\n', 404
        elif not hmac.compare_digest(self.headers.get('X-Signatur', '').strip().lower(), SOLL): t, c = 'Signatur fehlt oder falsch (Header X-Signatur).\n', 403
        else: t, c = f'Tresor offen. Abschluss-Code: {L6}\nPrüfbericht: Für jede Lücke eine Gegenmaßnahme notieren!\n', 200
        b = t.encode(); self.send_response(c); self.send_header('Content-Type', 'text/plain; charset=utf-8'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)
http.server.ThreadingHTTPServer(('127.0.0.1', 8100), H).serve_forever()
PY
chown chef:chef /opt/chef/tresor.py; chmod 600 /opt/chef/tresor.py

runuser -u shop -- env -i PATH=/usr/bin:/bin HOME=/opt/shop python3 /opt/shop/app.py >/dev/null 2>&1 &
runuser -u chef -- env -i PATH=/usr/bin:/bin HOME=/opt/chef python3 /opt/chef/tresor.py >/dev/null 2>&1 &

cat > /etc/ssh/sshd_config.d/webshop.conf <<'C'
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
for _ in $(seq 1 30); do curl -fs -o /dev/null http://127.0.0.1:8000/ && break; sleep 0.2; done
echo "nf-webshop: Webshop bereit."
exec /usr/sbin/sshd -D -e
