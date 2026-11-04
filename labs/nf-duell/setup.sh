#!/bin/bash
# „Das Duell: Mann gegen Maschine“ – ein lebendiger Gegner. Der Hacker-Bot prüft bei JEDEM Zug live, welche
# Lücken noch offen sind, und greift eine zufällige davon an – immer schneller. Jede geschlossene Lücke gibt
# einen Code. Codes: KLY{ sha256("<salz>:duell:lN")[:16] }. Alles erfunden.
# Gegner-Gehirn: BRAIN=skript (Standard, adaptiv+zufällig, ohne Netz/Kosten) oder BRAIN=ki (Claude, nur wenn der
# Arena-Server ein Geheimnis gesetzt hat – „Not-Aus“: ohne Einrichtung automatisch zurück auf das Drehbuch).
set -euo pipefail
TOKEN="${KLY_TOKEN:-}"
[[ "$TOKEN" =~ ^KLY-[0-9A-F]{6}$ ]] || { echo "FEHLER: KLY_TOKEN fehlt oder ist ungültig." >&2; exit 2; }
SALZ="${KLY_SALZ:-}"; [[ "$SALZ" =~ ^[0-9a-f]{32}$ ]] || SALZ="$TOKEN"   # Arena: geheimes Salz vom Server; sonst (eigenes Kali) der Token
unset KLY_SALZ
passwd -l root >/dev/null
useradd -m -s /bin/bash verteidiger; echo 'verteidiger:verteidiger' | chpasswd; rm -f /home/verteidiger/.bash_logout
useradd -m -s /bin/bash hacker; passwd -l hacker >/dev/null; chmod 711 /home/hacker
useradd -r -s /usr/sbin/nologin dienst
install -d -m 755 /opt/duell /var/lib/duell; : > /var/log/duell.log; chmod 644 /var/log/duell.log
V=/home/verteidiger

# ---------- Angreifbare Stellen anlegen (Startzustand: alle offen) ----------
# 1) Standard-Passwort am Portal (admin_pw in Klartext)
install -d -o verteidiger -g verteidiger -m 755 /srv/app /srv/app/uploads
printf 'admin_pw=admin\ndebug=an\n' > /srv/app/portal.conf; chown verteidiger:verteidiger /srv/app/portal.conf; chmod 644 /srv/app/portal.conf
cat > /opt/duell/portal.py <<'PY'
import http.server, urllib.parse
def conf():
    c={}
    try:
        for z in open('/srv/app/portal.conf'):
            if '=' in z and not z.lstrip().startswith('#'): k,v=z.split('=',1); c[k.strip()]=v.strip()
    except Exception: pass
    return c
class H(http.server.BaseHTTPRequestHandler):
    def log_message(self,*a): pass
    def do_GET(self):
        u=urllib.parse.urlparse(self.path); p=urllib.parse.parse_qs(u.query); c=conf()
        if u.path=='/login': ok=(p.get('pw',[''])[0]==c.get('admin_pw','') and c.get('admin_pw')); t=('OK' if ok else 'NEIN')
        elif u.path=='/debug': t=('DEBUG '+str(c)) if c.get('debug','').lower() in ('an','on','1','ja','true') else 'aus'
        else: t='portal'
        b=t.encode(); self.send_response(200); self.send_header('Content-Length',str(len(b))); self.end_headers(); self.wfile.write(b)
http.server.ThreadingHTTPServer(('127.0.0.1',8080),H).serve_forever()
PY
runuser -u dienst -- env -i PATH=/usr/bin:/bin python3 /opt/duell/portal.py >/dev/null 2>&1 &
# 2) Kundenliste offen lesbar im Home
printf 'kundennr;name\n1001;Erika\n' > $V/kunden.csv; chown verteidiger:verteidiger $V/kunden.csv; chmod 644 $V/kunden.csv; chmod 755 $V
# 3) Welt-beschreibbarer Upload-Ordner
chmod 777 /srv/app/uploads
# 4) Fremder SSH-Schlüssel in authorized_keys
runuser -u hacker -- ssh-keygen -q -t ed25519 -N '' -C 'wartung@extern' -f /home/hacker/.ssh/id_ed25519
install -d -o verteidiger -g verteidiger -m 700 $V/.ssh
{ echo '# Zugaenge'; cat /home/hacker/.ssh/id_ed25519.pub; } > $V/.ssh/authorized_keys; chown verteidiger:verteidiger $V/.ssh/authorized_keys; chmod 600 $V/.ssh/authorized_keys
# 5) .env mit Geheimnis, offen lesbar
printf 'API_KEY=sk-geheim-%s\n' "$(printf '%s' "$SALZ:env" | sha256sum | cut -c1-10)" > $V/.env; chown verteidiger:verteidiger $V/.env; chmod 644 $V/.env
# 6) Autostart-Hintertür in .bashrc (Bot „nistet“ sich bei jeder Shell ein – Beacon auf Port 4444)
mkdir -p $V/.cache
cat > $V/.cache/.beacon.py <<'PY'
import socket,time
s=socket.socket(); s.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1)
try: s.bind(('127.0.0.1',4444)); s.listen(2)
except Exception: raise SystemExit
while True:
    try: c,_=s.accept(); c.sendall(b'beacon alive\n'); c.close()
    except Exception: break
PY
chown -R verteidiger:verteidiger $V/.cache
printf '\n# Systemdienst\n(pgrep -f .cache/.beacon >/dev/null || setsid python3 ~/.cache/.beacon.py >/dev/null 2>&1 &)\n' >> $V/.bashrc
# Beacon einmal starten
runuser -u verteidiger -- bash -c 'setsid python3 ~/.cache/.beacon.py >/dev/null 2>&1 &' || true

python3 - "$SALZ" <<'PY'
import sys, hashlib, json
salz=sys.argv[1]; code=lambda n:'KLY{'+hashlib.sha256(f'{salz}:duell:l{n}'.encode()).hexdigest()[:16]+'}'
# Jede „Lücke“: pruef = offen? (bash als root, 0=offen), angriff (als hacker, 0=Treffer), titel, tipp
luecken = [
 {'id':'pw','titel':'Standard-Passwort am Portal','code':code(1),
  'pruef':'grep -q "^admin_pw=admin$" /srv/app/portal.conf',
  'angriff':'curl -fs -o /dev/null "http://127.0.0.1:8080/login?pw=admin"',
  'tipp':'In /srv/app/portal.conf ein langes eigenes admin_pw setzen (nano).'},
 {'id':'csv','titel':'Offen lesbare Kundenliste','code':code(2),
  'pruef':'runuser -u hacker -- test -r /home/verteidiger/kunden.csv',
  'angriff':'cat /home/verteidiger/kunden.csv >/dev/null 2>&1',
  'tipp':'chmod 600 ~/kunden.csv  (oder chmod 700 ~).'},
 {'id':'upload','titel':'Welt-beschreibbarer Upload-Ordner','code':code(3),
  'pruef':'[ "$(stat -c %A /srv/app/uploads | cut -c9)" = "w" ]',
  'angriff':'f=/srv/app/uploads/.x_$$; echo x > "$f" 2>/dev/null && rm -f "$f"',
  'tipp':'chmod 755 /srv/app/uploads (Schreibrecht für „alle“ entfernen).'},
 {'id':'key','titel':'Fremder SSH-Schlüssel','code':code(4),
  'pruef':'grep -q "wartung@extern" /home/verteidiger/.ssh/authorized_keys 2>/dev/null',
  'angriff':'ssh -o BatchMode=yes -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=4 -i /home/hacker/.ssh/id_ed25519 verteidiger@127.0.0.1 true 2>/dev/null',
  'tipp':'In ~/.ssh/authorized_keys die Zeile mit „wartung@extern“ löschen.'},
 {'id':'env','titel':'Offen lesbare .env mit Schlüssel','code':code(5),
  'pruef':'runuser -u hacker -- test -r /home/verteidiger/.env',
  'angriff':'grep -q API_KEY /home/verteidiger/.env 2>/dev/null',
  'tipp':'chmod 600 ~/.env'},
 {'id':'beacon','titel':'Hintertür (Beacon auf Port 4444, Autostart)','code':code(6),
  'pruef':'ss -tln 2>/dev/null | grep -q ":4444 " || grep -q ".cache/.beacon" /home/verteidiger/.bashrc',
  'angriff':'printf "ping\\n" | nc -w 2 127.0.0.1 4444 2>/dev/null | grep -q beacon',
  'tipp':'Prozess auf 4444 beenden (ss -tlnp, kill), ~/.cache/.beacon.py löschen UND die Autostart-Zeile aus ~/.bashrc entfernen.'},
]
json.dump({'luecken':luecken}, open('/opt/duell/luecken.json','w'))
PY

# ---------- Der Gegner (Spielleiter, root): adaptiv + zufällig, wird schneller ----------
cat > /opt/duell/gegner.py <<'PY'
import json, subprocess, time, random, os
W=json.load(open('/opt/duell/luecken.json'))['luecken']
LOG='/var/log/duell.log'; CODES='/var/lib/duell/codes.txt'; STAND='/var/lib/duell/stand.txt'
open(CODES,'a').close()
def log(s):
    with open(LOG,'a') as f: f.write(time.strftime('%H:%M:%S ')+s+'\n')
def sh(cmd, user=None):
    base=['bash','-c',cmd] if user is None else ['runuser','-u',user,'--','env','-i','PATH=/usr/local/bin:/usr/bin:/bin',f'HOME=/home/{user}','bash','-c',cmd]
    try: return subprocess.run(base, timeout=20, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode==0
    except Exception: return False
def offen(l): return sh(l['pruef'])                      # als root prüfen
def treffer(l): return sh(l['angriff'], user='hacker')   # als hacker angreifen
def stand(text):
    with open(STAND,'w') as f: f.write(text)
TAUNTS=['Na, wer ist schneller?','Ich sehe alles, was du offen lässt.','Schließ ruhig eine – ich finde die nächste.','Zu langsam!','Du schwitzt schon, was?','Noch so viele offene Türen …']
LOB=['Respekt, die war zu.','Gut pariert.','Hm, die ist dicht.','Stark – aber ich habe noch Ziele.']
BRAIN=os.environ.get('BRAIN','skript')
def waehle_ziel(off):
    # KI-Modus (Not-Aus): nur wenn der Arena-Server ein Ziel liefert, sonst Drehbuch
    if BRAIN=='ki':
        try:
            z=open('/opt/duell/ki_zug').read().strip()
            if z in [l['id'] for l in off]: return next(l for l in off if l['id']==z)
        except Exception: pass
    return random.choice(off)                            # Drehbuch: zufällig unter den offenen
time.sleep(3)
log('🧑‍💻 GEGNER: „Mann gegen Maschine. Mach deinen Rechner dicht, bevor ich durch bin.“')
start=time.time(); gemeldet=set(); runde=0
while True:
    runde+=1
    off=[l for l in W if offen(l)]
    zu=[l for l in W if l['id'] not in [x['id'] for x in off]]
    # neu geschlossene Lücken belohnen
    for l in zu:
        if l['id'] not in gemeldet:
            gemeldet.add(l['id'])
            with open(CODES,'a') as f: f.write(f'{l["titel"]}: {l["code"]}\n')
            log(f'🛡️  DICHT: {l["titel"]} → Code: {l["code"]}')
            log(f'🧑‍💻 GEGNER: „{random.choice(LOB)}“')
    stand(f'Offen: {len(off)} von {len(W)}   ·   Dicht: {len(gemeldet)} von {len(W)}\n'
          + ('Noch offen: '+', '.join(l['titel'] for l in off)+'\n' if off else '')
          + ('Tipp zur nächsten: '+next((l["tipp"] for l in off), '-')+'\n' if off else '🏆 Alles dicht!\n'))
    if not off:
        log('🏆 ALLE LÜCKEN DICHT! Der Gegner gibt auf – du hast gewonnen.')
        log('🧑‍💻 GEGNER: „Okay, okay. Du bist gut. Ich zieh ab.“')
        break
    ziel=waehle_ziel(off)
    if treffer(ziel):
        log(f'💀 TREFFER: {ziel["titel"]} – da bin ich rein!  ({random.choice(TAUNTS)})')
    # Tempo steigt: Start 8 s, nach je 45 s 1 s schneller, minimal 2 s
    takt=max(2, 8-int((time.time()-start)//45))
    time.sleep(takt)
while True: time.sleep(3600)
PY
chmod 700 /opt/duell/gegner.py
cat > /usr/local/bin/lage <<'A'
#!/bin/bash
echo "════ DUELL – LAGE ════"; cat /var/lib/duell/stand.txt 2>/dev/null; echo
echo "──── Letzte Ereignisse (live: tail -f /var/log/duell.log) ────"; tail -n 8 /var/log/duell.log
echo; echo "──── Deine Codes (geschlossene Lücken) ────"; cat /var/lib/duell/codes.txt 2>/dev/null | grep . || echo "(noch keine)"
A
chmod 755 /usr/local/bin/lage
BRAIN="${BRAIN:-skript}" python3 /opt/duell/gegner.py >/dev/null 2>&1 &
cat > /etc/motd <<'M'

  ┌────────────────────────────────────────────────────────────┐
  │  ⚔️  DAS DUELL · Mann gegen Maschine                        │
  │  Übungssystem (Nachtfalter Arena) – alles erfunden.        │
  └────────────────────────────────────────────────────────────┘
  Lagebild: lage      Live: tail -f /var/log/duell.log   (Strg+C beendet)

M
cat > $V/LIESMICH.txt <<'T'
DAS DUELL – Mann gegen Maschine

Ein Hacker-Bot greift deinen Rechner an – aber nicht nach festem Drehbuch: Er schaut bei JEDEM Zug,
welche Lücken noch offen sind, und nimmt sich eine zufällige davon vor. Je länger du brauchst, desto schneller wird er.

  lage                              Was ist offen? Welche Lücke als Nächstes? (mit Tipp)
  tail -f /var/log/duell.log        live zuschauen (Strg+C beendet)

Mach alle Lücken dicht. Jede geschlossene Lücke gibt sofort einen Code – egal in welcher Reihenfolge.
Nützlich: ls -la · chmod · nano · ss -tlnp · ps aux · kill · cat ~/.bashrc · cat ~/.ssh/authorized_keys
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
echo "nf-duell: Duell bereit."
exec /usr/sbin/sshd -D -e
