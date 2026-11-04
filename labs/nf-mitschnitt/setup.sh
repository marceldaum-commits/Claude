#!/bin/bash
# „Der Mitschnitt“ – Netzwerk-Forensik: einen aufgezeichneten Datenverkehr (pcap) mit tshark/tcpdump auswerten.
# Codes: KLY{ sha256("<salz>:mitschnitt:lN")[:16] }. Alles erfunden; RFC-5737-Adressen.
set -euo pipefail
TOKEN="${KLY_TOKEN:-}"
[[ "$TOKEN" =~ ^KLY-[0-9A-F]{6}$ ]] || { echo "FEHLER: KLY_TOKEN fehlt oder ist ungültig." >&2; exit 2; }
SALZ="${KLY_SALZ:-}"; [[ "$SALZ" =~ ^[0-9a-f]{32}$ ]] || SALZ="$TOKEN"   # Arena: geheimes Salz vom Server; sonst (eigenes Kali) der Token
unset KLY_SALZ
passwd -l root >/dev/null
useradd -m -s /bin/bash analyst; echo 'analyst:analyst' | chpasswd; chmod 700 /home/analyst; rm -f /home/analyst/.bash_logout
useradd -r -s /usr/sbin/nologin akte
install -d -m 755 /beweise
install -d -o akte -g akte -m 700 /opt/akte
python3 - "$SALZ" <<'PY'
import sys, hashlib, random
from scapy.all import Ether, IP, TCP, UDP, Raw, DNS, DNSQR, wrpcap
salz=sys.argv[1]; r=random.Random(hashlib.sha256((salz+':mitschnitt').encode()).hexdigest())
code=lambda n:'KLY{'+hashlib.sha256(f'{salz}:mitschnitt:l{n}'.encode()).hexdigest()[:16]+'}'
hexx=lambda n:''.join(r.choice('0123456789abcdef') for _ in range(n))
opfer=f'10.10.{r.randrange(1,9)}.{r.randrange(2,250)}'; server=f'203.0.113.{r.randrange(2,250)}'
angreifer=f'198.51.100.{r.randrange(2,250)}'; dns=f'10.10.0.{r.randrange(2,9)}'
nutzer=r.choice(['m.wagner','s.koch','a.braun','t.weber','l.fischer'])
passwort='Herbst'+str(r.randrange(2020,2027))+'!'
datei='kundenexport_'+hexx(4)+'.csv'
domain='exfil-'+hexx(6)+'.example.net'
geheim='uebergabe '+r.choice(['montag','dienstag','mittwoch'])+' '+str(r.randrange(10,22))+' uhr'
pkts=[]
def http(src,dst,sport,payload):
    pkts.append(Ether()/IP(src=src,dst=dst)/TCP(sport=sport,dport=80,flags='PA')/Raw(load=payload))
# Rauschen
for _ in range(60):
    s=f'10.10.{r.randrange(1,9)}.{r.randrange(2,250)}'
    http(s,server,r.randrange(1025,65000),f'GET /seite{r.randrange(1,9)} HTTP/1.1\r\nHost: portal.example\r\n\r\n'.encode())
# 1) Klartext-Login (HTTP POST)
http(opfer,server,r.randrange(1025,65000),f'POST /login HTTP/1.1\r\nHost: portal.example\r\nContent-Type: application/x-www-form-urlencoded\r\n\r\nuser={nutzer}&pass={passwort}'.encode())
# 2) Datei-Download / Exfil über HTTP GET
http(opfer,angreifer,r.randrange(1025,65000),f'GET /upload/{datei} HTTP/1.1\r\nHost: {angreifer}\r\n\r\n'.encode())
# 3) DNS-Anfragen (normale + Exfil-Domain)
for _ in range(40):
    pkts.append(Ether()/IP(src=f'10.10.{r.randrange(1,9)}.{r.randrange(2,250)}',dst=dns)/UDP(sport=r.randrange(1025,65000),dport=53)/DNS(rd=1,qd=DNSQR(qname=r.choice(['www.example.com','mail.example.org','cdn.example.net']))))
pkts.append(Ether()/IP(src=opfer,dst=dns)/UDP(sport=r.randrange(1025,65000),dport=53)/DNS(rd=1,qd=DNSQR(qname=domain)))
# 4) Verstecktes Kommando in einem TCP-Paket an hohen Port (base64)
import base64
http2=base64.b64encode(geheim.encode()).decode()
pkts.append(Ether()/IP(src=angreifer,dst=opfer)/TCP(sport=r.randrange(1025,65000),dport=4444,flags='PA')/Raw(load=f'CMD {http2}\n'.encode()))
r.shuffle(pkts)
wrpcap('/beweise/mitschnitt.pcap', pkts)
# Antworten
import json
akte={'fragen':{
 '1':'Von welcher internen IP-Adresse wurde ein Klartext-Login (HTTP) gesendet?',
 '2':'Welcher Benutzername und welches Passwort wurden dabei übertragen? Antwort: USER:PASSWORT',
 '3':'Welche Datei wurde anschließend von einer externen Adresse geladen? (Dateiname)',
 '4':'Über welche auffällige Domain lief eine DNS-Ausleitung?',
 '5':'Im Verkehr steckt ein verstecktes (base64-kodiertes) Kommando an Port 4444. Wie lautet der Klartext?'},
 'antworten':{'1':[opfer],'2':[f'{nutzer}:{passwort}'],'3':[datei],'4':[domain],'5':[geheim]},
 'codes':{str(n):code(n) for n in range(1,6)}}
json.dump(akte, open('/opt/akte/fall.json','w'))
PY
chmod 644 /beweise/mitschnitt.pcap
# ---------- Ermittlungsakte: prüft Antworten (Dienst „akte“, Port 7000); Fragen/Antworten/Codes in /opt/akte/fall.json
chown akte:akte /opt/akte/fall.json; chmod 400 /opt/akte/fall.json
cat > /opt/akte/dienst.py <<'PY'
import socket, threading, json, time
F = json.load(open('/opt/akte/fall.json')); FRAGEN = F['fragen']
sperre = {}
norm = lambda s: ' '.join(s.strip().lower().split())
def kunde(c):
    f = c.makefile('rw', encoding='utf-8', errors='replace', newline='\n')
    f.write('ERMITTLUNGSAKTE bereit. FRAGEN | ANTWORT <nr> <text> | ENDE\n'); f.flush()
    for zeile in f:
        t = zeile.strip().split(' ', 2)
        if not t or not t[0]: continue
        b = t[0].upper()
        if b == 'ENDE': break
        if b == 'FRAGEN': f.write(''.join(f'{k}) {v}\n' for k, v in FRAGEN.items()))
        elif b == 'ANTWORT' and len(t) == 3 and t[1] in FRAGEN:
            n = t[1]; jetzt = time.time()
            if sperre.get(n, (0, 0))[1] > jetzt: f.write(f'GESPERRT – zu viele falsche Antworten, noch {int(sperre[n][1] - jetzt)} s warten.\n')
            elif norm(t[2]) in [norm(a) for a in F['antworten'][n]]:
                sperre.pop(n, None); f.write(f'RICHTIG! Code {n}: {F["codes"][n]}\n')
            else:
                fehl = sperre.get(n, (0, 0))[0] + 1
                sperre[n] = (0, jetzt + 60) if fehl >= 5 else (fehl, 0)   # nach 5 Fehlversuchen 60 s Pause
                f.write('FALSCH. Schau noch einmal genau in die Beweise.\n')
        else: f.write('Befehle: FRAGEN | ANTWORT <nr> <text> | ENDE\n')
        f.flush(); time.sleep(0.5)
    try: f.close()
    except Exception: pass
    c.close()
s = socket.socket(); s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1); s.bind(('127.0.0.1', 7000)); s.listen(8)
while True:
    c, _ = s.accept(); threading.Thread(target=kunde, args=(c,), daemon=True).start()
PY
chown akte:akte /opt/akte/dienst.py; chmod 400 /opt/akte/dienst.py
cat > /usr/local/bin/akte <<'A'
#!/bin/bash
# Ermittlungsakte:  akte fragen   |   akte <nr> <antwort>
if [ "${1:-fragen}" = fragen ]; then printf 'FRAGEN\nENDE\n' | nc -q 2 localhost 7000 | tail -n +2; exit; fi
n=$1; shift; printf 'ANTWORT %s %s\nENDE\n' "$n" "$*" | nc -q 2 localhost 7000 | tail -n +2
A
chmod 755 /usr/local/bin/akte
find /beweise -type f -exec chmod 644 {} +; find /beweise -type d -exec chmod 755 {} +
runuser -u akte -- env -i PATH=/usr/bin:/bin python3 /opt/akte/dienst.py >/dev/null 2>&1 &
cat > /etc/motd <<'M'

  ┌────────────────────────────────────────────────────────────┐
  │  SOC NORDSTADT · Verdächtiger Mitschnitt                   │
  │  Übungssystem (Nachtfalter Arena) – alles erfunden.        │
  └────────────────────────────────────────────────────────────┘
  Lies ~/fall.txt.  Beweis: /beweise/mitschnitt.pcap   Fragen: akte fragen

M
cat > /home/analyst/fall.txt <<'T'
FALL „MITSCHNITT“ – Netzwerk-Forensik

Das SOC hat einen verdächtigen Netzwerk-Mitschnitt gesichert: /beweise/mitschnitt.pcap
Werte ihn aus und beantworte die Fragen der Ermittlungsakte. Jede richtige Antwort gibt einen Code.

  akte fragen                      Fragen anzeigen            akte 1 10.10.1.2   Antwort abgeben

Werkzeuge (tshark = Wireshark für die Kommandozeile):
  tshark -r /beweise/mitschnitt.pcap -Y http                     nur HTTP-Pakete
  tshark -r … -Y 'http.request.method==POST' -T fields -e tcp.payload | xxd -r -p   POST-Inhalt (Klartext)
  tshark -r … -Y 'http.request' -T fields -e ip.src -e http.request.full_uri
  tshark -r … -Y 'dns' -T fields -e dns.qry.name | sort | uniq -c | sort -rn
  tshark -r … -Y 'tcp.dstport==4444' -T fields -e tcp.payload | xxd -r -p    ·    echo '…' | base64 -d
  Tipp im Terminal:  hilfe   und   begriff exfiltration
T
chown analyst:analyst /home/analyst/fall.txt
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
for _ in $(seq 1 30); do nc -z 127.0.0.1 7000 && break; sleep 0.2; done
echo "nf-mitschnitt: Mitschnitt bereit."
exec /usr/sbin/sshd -D -e
