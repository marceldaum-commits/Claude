#!/bin/bash
# „Web 3: Die Kette“ (extrem): Template-Injection (SSTI), unsichere Deserialisierung (eval), Race Condition,
# Blind-SQL-Injection (6-stellige PIN), SSRF mit umgangener Sperrliste, „XXE“ (Entity-Dateileseangriff).
# Codes: KLY{ sha256("<salz>:web3:lN")[:16] }. Alles erfunden.
set -euo pipefail
TOKEN="${KLY_TOKEN:-}"
[[ "$TOKEN" =~ ^KLY-[0-9A-F]{6}$ ]] || { echo "FEHLER: KLY_TOKEN fehlt oder ist ungültig." >&2; exit 2; }
SALZ="${KLY_SALZ:-}"; [[ "$SALZ" =~ ^[0-9a-f]{32}$ ]] || SALZ="$TOKEN"   # Arena: geheimes Salz vom Server; sonst (eigenes Kali) der Token
unset KLY_SALZ
passwd -l root >/dev/null
useradd -m -s /bin/bash angreifer; echo 'angreifer:angreifer' | chpasswd; chmod 700 /home/angreifer; rm -f /home/angreifer/.bash_logout
useradd -r -s /usr/sbin/nologin web; useradd -r -s /usr/sbin/nologin cache
install -d -o web -g web -m 700 /opt/web
install -d -o cache -g cache -m 700 /opt/cache
PIN=$(python3 -c "import hashlib,sys; print(f'{int(hashlib.sha256((sys.argv[1]+chr(58)+chr(112)+chr(105)+chr(110)).encode()).hexdigest(),16)%900000+100000:06d}')" "$SALZ")
python3 - "$SALZ" "$PIN" <<'PY'
import sys, sqlite3, hashlib
salz, pin = sys.argv[1], sys.argv[2]; code=lambda n:'KLY{'+hashlib.sha256(f'{salz}:web3:l{n}'.encode()).hexdigest()[:16]+'}'
open('/opt/web/.f1','w').write(f'SSTI geschafft. Code: {code(1)}\n')
open('/opt/web/.codes','w').write('\n'.join(f'{n}:{code(n)}' for n in (2,3,4,5)))
db=sqlite3.connect('/opt/web/app.db'); db.execute('create table geheim(pin text)'); db.execute('insert into geheim values(?)',(pin,)); db.commit(); db.close()
open('/opt/web/.import_geheim.txt','w').write(f'XXE-Dateileseangriff geschafft. Code: {code(6)}\n')
PY
printf 'CACHE-Dienst (intern).\nCode: %s\n' "$(python3 -c "import hashlib,sys;print('KLY{'+hashlib.sha256((sys.argv[1]+':web3:l5').encode()).hexdigest()[:16]+chr(125))" "$SALZ")" > /opt/cache/geheim.txt
chown web:web /opt/web/.f1 /opt/web/.codes /opt/web/app.db /opt/web/.import_geheim.txt; chmod 600 /opt/web/.f1 /opt/web/.codes /opt/web/app.db /opt/web/.import_geheim.txt
chown cache:cache /opt/cache/geheim.txt; chmod 600 /opt/cache/geheim.txt
cat > /opt/cache/dienst.py <<'PY'
import http.server
G=open('/opt/cache/geheim.txt').read()
class H(http.server.BaseHTTPRequestHandler):
    def log_message(self,*a): pass
    def do_GET(self):
        b=G.encode(); self.send_response(200); self.send_header('Content-Length',str(len(b))); self.end_headers(); self.wfile.write(b)
# nur auf 127.0.0.1 – aber über „localhost“/„127.0.0.1“ sperrt der Server; Umgehung nötig
http.server.HTTPServer(('127.0.0.1',7000),H).serve_forever()
PY
chown cache:cache /opt/cache/dienst.py; chmod 600 /opt/cache/dienst.py
runuser -u cache -- env -i PATH=/usr/bin:/bin python3 /opt/cache/dienst.py >/dev/null 2>&1 &
cat > /opt/web/server.py <<'PY'
# „Die Kette“ – ABSICHTLICH extrem verwundbar (Lernzweck). Niemals so bauen!
import http.server, urllib.parse, sqlite3, json, base64, ast, time, threading, urllib.request, re, socket, os
CODES=dict(z.split(':',1) for z in open('/opt/web/.codes').read().split())
GUTSCHEIN={'wert':1}; LOCK_FREI=True
def render(vorlage, name):
    # Mini-Template: {{ ausdruck }} wird als Python ausgewertet (SSTI!)
    def ers(m):
        try: return str(eval(m.group(1).strip(), {'__builtins__': __builtins__}, {'name': name}))
        except Exception as e: return f'[Fehler: {e}]'
    return re.sub(r'\{\{(.*?)\}\}', ers, vorlage)
class H(http.server.BaseHTTPRequestHandler):
    def log_message(self,*a): pass
    def s(self,c,t):
        b=t.encode() if isinstance(t,str) else t; self.send_response(c); self.send_header('Content-Type','text/plain; charset=utf-8'); self.send_header('Content-Length',str(len(b))); self.end_headers(); self.wfile.write(b)
    def keks(self,name):
        for teil in (self.headers.get('Cookie') or '').split(';'):
            if teil.strip().startswith(name+'='): return teil.strip()[len(name)+1:]
        return ''
    def do_GET(self):
        u=urllib.parse.urlparse(self.path); p=urllib.parse.parse_qs(u.query)
        if u.path=='/': return self.s(200,'Die Kette. /gruss?name= · /konto (Cookie sitzung) · /gutschein (POST) · /status?id= · /holen?url= · /tresor?pin=\n')
        if u.path=='/gruss':
            name=p.get('name',[''])[0]
            return self.s(200, render('Hallo '+name+', willkommen!\n', name))   # SSTI: Eingabe wird in die Vorlage eingebaut
        if u.path=='/konto':
            roh=self.keks('sitzung')
            if not roh: return self.s(200,'Nicht angemeldet. Setze Cookie sitzung=<base64 eines Python-dict>, z. B. {"rolle":"gast"}.\n')
            try: d=ast.literal_eval(base64.b64decode(roh+'==').decode())   # unsichere Deserialisierung (eval-artig)
            except Exception as e: return self.s(400,f'Sitzung kaputt: {e}\n')
            if isinstance(d,dict) and d.get('rolle')=='admin': return self.s(200,f'Admin. Code: {CODES["2"]}\n')
            return self.s(200,f'Rolle: {d.get("rolle") if isinstance(d,dict) else "?"}\n')
        if u.path=='/status':
            q="SELECT 1 FROM geheim WHERE "+p.get('id',['1=1'])[0]   # Blind-SQLi
            try: r=sqlite3.connect('/opt/web/app.db').execute(q).fetchall(); return self.s(200,'aktiv\n' if r else 'inaktiv\n')
            except Exception: return self.s(200,'inaktiv\n')
        if u.path=='/tresor':
            pin=p.get('pin',[''])[0]
            r=sqlite3.connect('/opt/web/app.db').execute('SELECT 1 FROM geheim WHERE pin=?',(pin,)).fetchall()
            return self.s(200,f'Tresor offen. Code: {CODES["4"]}\n' if r else 'Falsche PIN.\n')
        if u.path=='/holen':
            url=p.get('url',[''])[0]
            if re.search(r'127\.0\.0\.1|localhost|::1', url): return self.s(403,'Gesperrt: interne Adressen sind verboten.\n')  # Sperrliste – umgehbar
            try:
                with urllib.request.urlopen(url,timeout=4) as r: return self.s(200,'Inhalt:\n'+r.read(2000).decode('utf-8','replace'))
            except Exception as e: return self.s(502,f'Fehler: {e}\n')
        return self.s(404,'Nicht gefunden.\n')
    def do_POST(self):
        u=urllib.parse.urlparse(self.path); n=min(int(self.headers.get('Content-Length') or 0),4000); roh=self.rfile.read(n)
        if u.path=='/gutschein':
            # Race Condition: prüfen und abbuchen mit Lücke dazwischen
            global LOCK_FREI
            if GUTSCHEIN['wert']>0:
                time.sleep(0.4)                    # TOCTOU-Fenster
                GUTSCHEIN['wert']-=1
                if GUTSCHEIN['wert']<0: return self.s(200,f'Doppelt eingelöst! Code: {CODES["3"]}\n')
                return self.s(200,'Gutschein eingelöst (Wert jetzt %d).\n'%GUTSCHEIN['wert'])
            return self.s(200,'Gutschein schon aufgebraucht.\n')
        if u.path=='/import':
            # „XXE“: naive Entity-Auflösung von <!ENTITY x SYSTEM "file://…"> + &x;
            txt=roh.decode('utf-8','replace')
            m=re.search(r'<!ENTITY\s+(\w+)\s+SYSTEM\s+"file://([^"]+)"\s*>',txt)
            if m:
                try: inhalt=open(m.group(2)).read()
                except Exception as e: inhalt=f'[Fehler: {e}]'
                txt=re.sub(r'&'+m.group(1)+r';', inhalt, txt)
            return self.s(200,'Importiert:\n'+txt[:3000])
        return self.s(404,'Nicht gefunden.\n')
http.server.ThreadingHTTPServer(('127.0.0.1',8000),H).serve_forever()
PY
chown web:web /opt/web/server.py; chmod 644 /opt/web/server.py
runuser -u web -- env -i PATH=/usr/bin:/bin python3 /opt/web/server.py >/dev/null 2>&1 &
cat > /home/angreifer/auftrag.txt <<'T'
WEB 3 – „Die Kette“ (extrem, alles erfunden). Server: http://localhost:8000 – curl + python3.

  1. SSTI:          /gruss?name=... baut die Antwort aus deinem Namen. Teste {{ 7*7 }}. Dann lies die Datei
                    /opt/web/.f1 — z. B. {{ open('/opt/web/.f1').read() }}  (URL-kodieren: -G --data-urlencode)
  2. Deserialisieren:/konto liest das Cookie „sitzung“ als base64 eines Python-dict (unsicher!). Baue
                    base64 von {"rolle":"admin"} und schick es als Cookie.
  3. Race Condition:/gutschein (POST) hat genau 1 Guthaben, prüft und bucht aber mit Verzögerung. Schick viele
                    Anfragen GLEICHZEITIG (curl … & im Hintergrund), bis der Wert negativ wird.
  4. Blind-SQLi:    /status?id=... sagt nur „aktiv“/„inaktiv“. In der Tabelle geheim steht eine 6-stellige PIN.
                    Finde sie Ziffer für Ziffer (substr), dann: /tresor?pin=DIEPIN
  5. SSRF-Sperre:   /holen?url=… verbietet 127.0.0.1/localhost. Umgeh die Sperre (z. B. 0.0.0.0, 0177.0.0.1,
                    dezimale IP 2130706433, [::]) und erreiche den Cache-Dienst auf Port 7000.
  6. XXE:           /import (POST) löst <!ENTITY x SYSTEM "file://PFAD"> und &x; auf. Lies /opt/web/.import_geheim.txt

Werkzeuge: curl -i -G --data-urlencode, -b, -d, --data-binary @-, python3, base64, seq, & (Hintergrund).
hilfe · begriff ssti · begriff race condition · begriff deserialisierung
T
chown angreifer:angreifer /home/angreifer/auftrag.txt
cat > /etc/motd <<'M'

  „DIE KETTE“ · Extrem-Pentest (Nachtfalter Arena – alles erfunden)
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
for _ in $(seq 1 30); do curl -fs -o /dev/null "http://127.0.0.1:8000/" && break; sleep 0.2; done
echo "nf-web3: Web3 bereit."
exec /usr/sbin/sshd -D -e
