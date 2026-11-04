#!/bin/bash
# „Web 2: Umwege“ (mittel): SQL-Login umgehen, mit UNION fremde Tabelle lesen, SSRF auf einen internen Dienst,
# unsicheres Zusatzfeld (Mass Assignment), gefälschtes Token (JWT alg=none), SSRF per file:// auf eine Datei.
# Codes: KLY{ sha256("<salz>:web2:lN")[:16] }. Alles erfunden.
set -euo pipefail
TOKEN="${KLY_TOKEN:-}"
[[ "$TOKEN" =~ ^KLY-[0-9A-F]{6}$ ]] || { echo "FEHLER: KLY_TOKEN fehlt oder ist ungültig." >&2; exit 2; }
SALZ="${KLY_SALZ:-}"; [[ "$SALZ" =~ ^[0-9a-f]{32}$ ]] || SALZ="$TOKEN"   # Arena: geheimes Salz vom Server; sonst (eigenes Kali) der Token
unset KLY_SALZ
passwd -l root >/dev/null
useradd -m -s /bin/bash tester; echo 'tester:tester' | chpasswd; chmod 700 /home/tester; rm -f /home/tester/.bash_logout
useradd -r -s /usr/sbin/nologin web; useradd -r -s /usr/sbin/nologin intern
install -d -o web -g web -m 700 /opt/web
install -d -o intern -g intern -m 700 /opt/intern
GEHEIM=$(printf '%s' "$SALZ:web2:jwt" | sha256sum | cut -c1-32)
python3 - "$SALZ" <<'PY'
import sys, sqlite3, hashlib
salz = sys.argv[1]; code = lambda n: 'KLY{' + hashlib.sha256(f'{salz}:web2:l{n}'.encode()).hexdigest()[:16] + '}'
db = sqlite3.connect('/opt/web/shop.db')
db.executescript('create table nutzer(id integer, name text, pass text, rolle text); create table tresor(name text, wert text);')
db.execute("insert into nutzer values(1,'admin',?, 'admin')", (hashlib.sha256((salz+'adminpw').encode()).hexdigest(),))
db.execute("insert into tresor values('l2', ?)", (code(2),))
db.commit(); db.close()
open('/opt/web/.codes', 'w').write('\n'.join(f'{n}:{code(n)}' for n in (1,4,5)))
open('/opt/intern/geheim.txt','w').write(f'INTERN – Lieferantenportal\nCode: {code(3)}\n')
open('/opt/web/.nuronlokal.txt','w').write(f'file-Geheimnis (nur lokal lesbar).\nCode: {code(6)}\n')
PY
chown web:web /opt/web/shop.db /opt/web/.codes /opt/web/.nuronlokal.txt; chmod 600 /opt/web/shop.db /opt/web/.codes /opt/web/.nuronlokal.txt
chown intern:intern /opt/intern/geheim.txt; chmod 600 /opt/intern/geheim.txt
cat > /opt/intern/dienst.py <<'PY'
# Interner Dienst (nur 127.0.0.1:9000) – „von außen nicht erreichbar“, nur per SSRF.
import http.server
G = open('/opt/intern/geheim.txt').read()
class H(http.server.BaseHTTPRequestHandler):
    def log_message(self,*a): pass
    def do_GET(self):
        b=G.encode(); self.send_response(200); self.send_header('Content-Length',str(len(b))); self.end_headers(); self.wfile.write(b)
http.server.HTTPServer(('127.0.0.1',9000),H).serve_forever()
PY
chown intern:intern /opt/intern/dienst.py; chmod 600 /opt/intern/dienst.py
runuser -u intern -- env -i PATH=/usr/bin:/bin python3 /opt/intern/dienst.py >/dev/null 2>&1 &
cat > /opt/web/server.py <<'PY'
# Portal „Umwege“ – ABSICHTLICH verwundbar. JWT-Geheimnis nur zum Lernen; alg=none wird (falsch!) akzeptiert.
import http.server, urllib.parse, sqlite3, json, base64, hmac, hashlib, urllib.request
DB='/opt/web/shop.db'; GEHEIM=open('/opt/web/.jwtkey').read().strip().encode()
CODES=dict(z.split(':',1) for z in open('/opt/web/.codes').read().split())
def b64u(b): return base64.urlsafe_b64encode(b).rstrip(b'=').decode()
def d64u(s): return base64.urlsafe_b64decode(s + '='*(-len(s)%4))
def jwt_make(payload): 
    h=b64u(b'{"alg":"HS256","typ":"JWT"}'); p=b64u(json.dumps(payload).encode())
    sig=b64u(hmac.new(GEHEIM,f'{h}.{p}'.encode(),hashlib.sha256).digest()); return f'{h}.{p}.{sig}'
def jwt_read(t):
    try:
        h,p,s=t.split('.'); kopf=json.loads(d64u(h))
        if kopf.get('alg')=='none': return json.loads(d64u(p))            # FEHLER: alg=none wird akzeptiert
        soll=b64u(hmac.new(GEHEIM,f'{h}.{p}'.encode(),hashlib.sha256).digest())
        return json.loads(d64u(p)) if hmac.compare_digest(soll,s) else None
    except Exception: return None
class H(http.server.BaseHTTPRequestHandler):
    def log_message(self,*a): pass
    def s(self,c,t,extra=None):
        b=t.encode() if isinstance(t,str) else t; self.send_response(c); self.send_header('Content-Type','text/plain; charset=utf-8')
        for k,v in (extra or {}).items(): self.send_header(k,v)
        self.send_header('Content-Length',str(len(b))); self.end_headers(); self.wfile.write(b)
    def keks(self):
        for teil in (self.headers.get('Cookie') or '').split(';'):
            if teil.strip().startswith('token='): return teil.strip()[6:]
        return ''
    def do_GET(self):
        u=urllib.parse.urlparse(self.path); p=urllib.parse.parse_qs(u.query)
        if u.path=='/': return self.s(200,'Portal Umwege. /login (POST user,pass) · /produkt?id=1 · /vorschau?url=… · /profil (POST) · /konto\n')
        if u.path=='/produkt':
            q="SELECT name FROM nutzer WHERE id="+p.get('id',['0'])[0]   # SQLi (numerisch, UNION möglich)
            try:
                r=sqlite3.connect(DB).execute(q).fetchall(); return self.s(200,'Treffer: '+', '.join(str(x[0]) for x in r)+'\n' if r else 'Kein Produkt.\n')
            except Exception as e: return self.s(500,f'DB-Fehler: {e}\nAbfrage: {q}\n')
        if u.path=='/vorschau':
            url=p.get('url',[''])[0]   # SSRF: holt beliebige URL, auch file:// und interne Dienste
            if not url: return self.s(400,'?url= fehlt. Beispiel: /vorschau?url=http://example.net/\n')
            try:
                with urllib.request.urlopen(url,timeout=4) as r: return self.s(200,'Vorschau:\n'+r.read(2000).decode('utf-8','replace'))
            except Exception as e: return self.s(502,f'Konnte nicht laden: {e}\n')
        if u.path=='/konto':
            d=jwt_read(self.keks())
            if not d: return self.s(401,'Kein gültiges Token. Melde dich an (/login).\n')
            if d.get('rolle')=='admin': return self.s(200,f'Admin-Konto. Code: {CODES["5"]}\n')
            return self.s(200,f'Hallo {d.get("name","?")} (Rolle: {d.get("rolle","?")}). Nur Admins sehen hier mehr.\n')
        return self.s(404,'Nicht gefunden.\n')
    def do_POST(self):
        u=urllib.parse.urlparse(self.path); n=min(int(self.headers.get('Content-Length') or 0),3000)
        f=urllib.parse.parse_qs(self.rfile.read(n).decode('utf-8','replace'))
        if u.path=='/login':
            user=f.get('user',[''])[0]; pw=f.get('pass',[''])[0]
            q=f"SELECT name,rolle FROM nutzer WHERE name='{user}' AND pass='{hashlib.sha256(pw.encode()).hexdigest()}'"  # SQLi: ' OR / --
            try: r=sqlite3.connect(DB).execute(q).fetchall()
            except Exception as e: return self.s(500,f'DB-Fehler: {e}\n')
            if not r: return self.s(403,'Login fehlgeschlagen.\n')
            tok=jwt_make({'name':r[0][0],'rolle':r[0][1]})
            extra=f'\n(Admin-Login per SQLi geschafft – Code: {CODES["1"]})' if r[0][1]=='admin' else ''
            return self.s(200,f'Angemeldet als {r[0][0]} (Rolle {r[0][1]}).{extra}\nDein Token (Cookie token=…): {tok}\n')
        if u.path=='/profil':
            d={}
            for k in f: d[k]=f[k][0]
            rolle=d.get('rolle','kunde')   # Mass Assignment: rolle wird aus der Eingabe übernommen
            if rolle=='admin': return self.s(200,f'Profil gespeichert. Rolle={rolle}. Code: {CODES["4"]}\n')
            return self.s(200,f'Profil gespeichert. Rolle={rolle}.\n')
        return self.s(404,'Nicht gefunden.\n')
import os
http.server.ThreadingHTTPServer(('127.0.0.1',8000),H).serve_forever()
PY
printf '%s' "$GEHEIM" > /opt/web/.jwtkey; chown web:web /opt/web/.jwtkey /opt/web/server.py; chmod 600 /opt/web/.jwtkey; chmod 644 /opt/web/server.py
runuser -u web -- env -i PATH=/usr/bin:/bin python3 /opt/web/server.py >/dev/null 2>&1 &
cat > /home/tester/auftrag.txt <<'T'
WEB 2 – „Umwege“ (alles erfunden). Server: http://localhost:8000 – nur curl.

  1. Login umgehen:   /login akzeptiert Name und Passwort. Was, wenn der Name selbst SQL enthält?  admin'--
  2. UNION:           /produkt?id=1 baut SQL aus der id. Häng ein UNION SELECT an und lies die Tabelle „tresor“.
                      Spaltenzahl zählt! Beispiel-Idee:  id=0 UNION SELECT wert FROM tresor
  3. SSRF:            /vorschau?url=… holt JEDE Adresse – auch interne. Es gibt einen Dienst auf 127.0.0.1:9000.
  4. Zusatzfeld:      /profil (POST) speichert alle Felder, die du schickst. Was, wenn du rolle=admin mitschickst?
  5. Token fälschen:  Das Login gibt ein JWT (drei Teile, mit . getrennt, base64url). Teil 2 ist die Rolle.
                      Der Server akzeptiert auch alg=none (ohne Signatur). Baue ein Token mit rolle=admin und ruf /konto.
  6. file:// :        Dieselbe /vorschau-Lücke liest auch Dateien:  url=file:///opt/web/.nuronlokal.txt

Werkzeuge: curl -i, -d, -b "token=…", -G --data-urlencode, base64, python3.  hilfe · begriff ssrf · begriff jwt
T
chown tester:tester /home/tester/auftrag.txt
cat > /etc/motd <<'M'

  STADTPORTAL „UMWEGE“ · Pentest (Nachtfalter Arena – alles erfunden)
  Lies ~/auftrag.txt.  Hilfe: hilfe   Begriffe: begriff WORT
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
echo "nf-web2: Web2 bereit."
exec /usr/sbin/sshd -D -e
