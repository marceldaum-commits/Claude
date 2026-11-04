#!/bin/bash
# „Web 1: Das Kleingedruckte“ – Web-Grundlagen mit curl: versteckte Pfade (robots.txt), HTTP-Methoden,
# versteckte Parameter, Pfad-Ausbruch (LFI), vergessene Backup-Datei, gefälschte Header.
# Codes: KLY{ sha256("<salz>:web1:lN")[:16] }. Alles erfunden.
set -euo pipefail
TOKEN="${KLY_TOKEN:-}"
[[ "$TOKEN" =~ ^KLY-[0-9A-F]{6}$ ]] || { echo "FEHLER: KLY_TOKEN fehlt oder ist ungültig." >&2; exit 2; }
SALZ="${KLY_SALZ:-}"; [[ "$SALZ" =~ ^[0-9a-f]{32}$ ]] || SALZ="$TOKEN"   # Arena: geheimes Salz vom Server; sonst (eigenes Kali) der Token
unset KLY_SALZ
passwd -l root >/dev/null
useradd -m -s /bin/bash besucher; echo 'besucher:besucher' | chpasswd; chmod 700 /home/besucher; rm -f /home/besucher/.bash_logout
useradd -r -s /usr/sbin/nologin web
install -d -o web -g web -m 755 /opt/web /opt/web/oeffentlich /opt/web/intern-alt-3f9
printf 'Stadtbuecherei Lindenbach – Online-Katalog\n' > /opt/web/oeffentlich/info.txt
INTERN=/opt/web/intern-alt-3f9
python3 - "$SALZ" "$INTERN" <<'PY'
import sys, hashlib
salz, intern = sys.argv[1], sys.argv[2]
code = lambda n: 'KLY{' + hashlib.sha256(f'{salz}:web1:l{n}'.encode()).hexdigest()[:16] + '}'
open(f'{intern}/notiz.txt', 'w').write(f'Interne Notiz (alter Bereich, vergessen abzuschalten).\nCode: {code(1)}\n')
open('/opt/web/konto_geheim.txt', 'w').write(f'Kontobereich – nur per POST.\nCode: {code(2)}\n')
open('/opt/web/.besucherzaehler.txt', 'w').write('nichts Spannendes\n')
open('/opt/web/secret_backup.txt', 'w').write(f'Datenbank-Backup-Hinweis.\nCode: {code(5)}\n')
open('/etc/katalog_geheim', 'w').write(f'Systemweite Katalog-Konfiguration.\nCode: {code(4)}\n')
PY
chmod 644 /opt/web/konto_geheim.txt /opt/web/secret_backup.txt /opt/web/intern-alt-3f9/notiz.txt; chmod 644 /etc/katalog_geheim
cat > /opt/web/server.py <<'PY'
# Stadtbuecherei-Katalog – ABSICHTLICH mit Lehr-Schwachstellen. Nie so bauen!
import http.server, urllib.parse, os, hashlib
SALZ = open('/opt/web/.salz').read().strip()
code = lambda n: 'KLY{' + hashlib.sha256(f'{SALZ}:web1:l{n}'.encode()).hexdigest()[:16] + '}'
START = '''<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Stadtbuecherei Lindenbach</title></head><body>
<h1>Stadtbuecherei Lindenbach – Online-Katalog</h1>
<p><a href="/suche?q=roman">Suche</a> · <a href="/seite?datei=hilfe.txt">Hilfe</a> · <a href="/konto">Mein Konto</a></p>
</body></html>'''
HILFE = 'Hilfe: Suche mit /suche?q=... , Seiten mit /seite?datei=hilfe.txt\n'
class H(http.server.BaseHTTPRequestHandler):
    server_version = 'Katalog/2.1'; sys_version = ''
    def log_message(self, *a): pass
    def s(self, code_, t, typ='text/plain; charset=utf-8', extra=None):
        b = t.encode() if isinstance(t, str) else t; self.send_response(code_); self.send_header('Content-Type', typ)
        for k, v in (extra or {}).items(): self.send_header(k, v)
        self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)
    def lokal(self):
        xff = self.headers.get('X-Forwarded-For', '')
        return xff.split(',')[0].strip() in ('127.0.0.1', '::1')
    def do_GET(self):
        u = urllib.parse.urlparse(self.path); p = urllib.parse.parse_qs(u.query)
        if u.path == '/': return self.s(200, START, 'text/html; charset=utf-8')
        if u.path == '/robots.txt': return self.s(200, 'User-agent: *\nDisallow: /intern-alt-3f9/\nDisallow: /konto\n')
        if u.path.startswith('/intern-alt-3f9'):
            name = u.path[len('/intern-alt-3f9/'):] or 'notiz.txt'
            try: return self.s(200, open(os.path.join('/opt/web/intern-alt-3f9', os.path.basename(name))).read())
            except Exception: return self.s(404, 'nichts\n')
        if u.path == '/suche':
            ansicht = p.get('ansicht', [''])[0]   # versteckter Parameter
            if ansicht == 'debug': return self.s(200, f'DEBUG-Ansicht aktiv.\nInterner Hinweis – Code: {code(3)}\n')
            return self.s(200, f'Suche nach "{p.get("q", [""])[0][:40]}": 3 Treffer (Romane).\n')
        if u.path == '/seite':
            datei = p.get('datei', ['hilfe.txt'])[0]
            if datei == 'hilfe.txt': return self.s(200, HILFE)
            try: return self.s(200, open(os.path.join('/opt/web/seiten', datei)).read()[:4000])   # LFI: kein Schutz vor ../
            except Exception: return self.s(404, 'Seite nicht gefunden.\n')
        if u.path == '/konto': return self.s(405, 'Methode nicht erlaubt. Dieser Bereich antwortet nur auf POST.\n', extra={'Allow': 'POST'})
        if u.path == '/admin':
            if not self.lokal(): return self.s(403, 'Nur aus dem internen Netz (per X-Forwarded-For geprueft).\n')
            if self.headers.get('X-Intern', '') != 'ja': return self.s(403, 'Header X-Intern fehlt.\n')
            return self.s(200, f'Adminbereich.\nCode: {code(6)}\n')
        return self.s(404, 'Nicht gefunden.\n')
    def do_POST(self):
        if urllib.parse.urlparse(self.path).path == '/konto': return self.s(200, open('/opt/web/konto_geheim.txt').read())
        return self.s(404, 'Nicht gefunden.\n')
os.makedirs('/opt/web/seiten', exist_ok=True); open('/opt/web/seiten/hilfe.txt', 'w').write(HILFE)
http.server.ThreadingHTTPServer(('127.0.0.1', 8000), H).serve_forever()
PY
printf '%s' "$SALZ" > /opt/web/.salz; chmod 600 /opt/web/.salz; chown web:web /opt/web/.salz /opt/web/server.py; chmod 644 /opt/web/server.py
# Backup-Datei im Web-Wurzelverzeichnis erreichbar (Welle 5) – über /seite?datei=../secret_backup.txt
runuser -u web -- env -i PATH=/usr/bin:/bin python3 /opt/web/server.py >/dev/null 2>&1 &
cat > /home/besucher/auftrag.txt <<'T'
WEB 1 – „Das Kleingedruckte“ (Pentest-Auftrag, alles erfunden)

Ziel: der Katalog auf  http://localhost:8000  – arbeite nur mit curl. Jede Lücke gibt einen Code KLY{…}.

  1. Was Suchmaschinen nicht sehen sollen:   curl http://localhost:8000/robots.txt
  2. Mein Konto antwortet „nur POST“:         curl -i http://localhost:8000/konto    (POST: curl -X POST …)
  3. Die Suche kann mehr als sie zeigt:       probiere andere Parameter – ein „Ansicht“-Modus für Entwickler.
  4. /seite?datei=… liest Dateien:            was passiert mit  ../../../etc/katalog_geheim ?
  5. Jemand hat eine *_backup.txt vergessen:  erreichbar über dieselbe /seite-Lücke.
  6. /admin ist „nur aus dem internen Netz“:  es glaubt dem Header X-Forwarded-For. Und es braucht X-Intern: ja.

Werkzeuge: curl -i (Kopf sehen), -X METHODE, -H "Name: Wert", -G --data-urlencode "x=y", --path-as-is
Tipp im Terminal:  hilfe   und   begriff path-traversal
T
chown besucher:besucher /home/besucher/auftrag.txt
cat > /etc/motd <<'M'

  ┌────────────────────────────────────────────────────────────┐
  │  STADTBUECHEREI LINDENBACH · Katalog-Pentest               │
  │  Übungssystem (Nachtfalter Arena) – alles erfunden.        │
  └────────────────────────────────────────────────────────────┘
  Lies ~/auftrag.txt.  Hilfe: hilfe    Begriffe: begriff WORT

M
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
for _ in $(seq 1 30); do curl -fs -o /dev/null http://127.0.0.1:8000/ && break; sleep 0.2; done
echo "nf-web1: Web1 bereit."
exec /usr/sbin/sshd -D -e
