#!/bin/bash
# „Der Maulwurf“ – Extrem-Ermittlung (Insider): Zeitzonen-Korrelation über mehrere Protokolle, DNS-Ausleitung
# zusammensetzen, manipulierte Datei per Prüfsummen finden, Unix-Zeitstempel, verschlüsseltes Archiv.
# Codes: KLY{ sha256("<salz>:maulwurf:lN")[:16] }. Alles erfunden; Domains unter example.net.
set -euo pipefail
TOKEN="${KLY_TOKEN:-}"
[[ "$TOKEN" =~ ^KLY-[0-9A-F]{6}$ ]] || { echo "FEHLER: KLY_TOKEN fehlt oder ist ungültig." >&2; exit 2; }
SALZ="${KLY_SALZ:-}"; [[ "$SALZ" =~ ^[0-9a-f]{32}$ ]] || SALZ="$TOKEN"   # Arena: geheimes Salz vom Server; sonst (eigenes Kali) der Token
unset KLY_SALZ
passwd -l root >/dev/null
useradd -m -s /bin/bash ermittler; echo 'ermittler:ermittler' | chpasswd; chmod 700 /home/ermittler; rm -f /home/ermittler/.bash_logout
useradd -r -s /usr/sbin/nologin akte
install -d -m 755 /beweise /beweise/system
install -d -o akte -g akte -m 700 /opt/akte
python3 - "$SALZ" <<'PY'
import sys, random, hashlib, json, os, gzip, subprocess, datetime as dt
salz = sys.argv[1]
r = random.Random(hashlib.sha256((salz + ':maulwurf:fall').encode()).hexdigest())
code = lambda n: 'KLY{' + hashlib.sha256(f'{salz}:maulwurf:l{n}'.encode()).hexdigest()[:16] + '}'
hexx = lambda n: ''.join(r.choice('0123456789abcdef') for _ in range(n))
U = dt.timezone.utc; MEZ = dt.timezone(dt.timedelta(hours=1))
T0 = dt.datetime(2026, 11, 2, tzinfo=U)
uz = lambda t: t.astimezone(U).strftime('%Y-%m-%dT%H:%M:%SZ')
lz = lambda t: t.astimezone(MEZ).strftime('%Y-%m-%d %H:%M:%S +0100')
vor = ['Anna', 'Bernd', 'Carla', 'Dieter', 'Elif', 'Frank', 'Gül', 'Heike', 'Igor', 'Jana', 'Karl', 'Lea', 'Mehmet', 'Nina', 'Olaf', 'Petra', 'Ralf', 'Sina', 'Timo', 'Ute']
nach = ['Albers', 'Brandt', 'Conrad', 'Dorn', 'Eck', 'Fuchs', 'Graf', 'Haas', 'Imhof', 'Jäger', 'Kunz', 'Lorenz', 'Mayer', 'Noll', 'Ott', 'Pohl', 'Rösch', 'Seidel', 'Thiel', 'Voss']
r.shuffle(nach)
leute = []
for i, (v, n) in enumerate(zip(vor, nach)):
    leute.append({'nr': 1000 + i, 'name': f'{v} {n}', 'konto': (v[0] + n).lower().replace('ä', 'ae').replace('ö', 'oe').replace('ü', 'ue'), 'abt': r.choice(['Entwicklung', 'Vertrieb', 'IT', 'Einkauf', 'Labor']), 'jahr': r.randrange(1965, 2001)})
maulwurf, falle, nachtler = r.sample(leute, 3)
open('/beweise/personal.csv', 'w').write('personalnr;name;konto;abteilung;geburtsjahr\n' + ''.join(f"{p['nr']};{p['name']};{p['konto']};{p['abt']};{p['jahr']}\n" for p in leute))

# ---------- VPN (UTC) – IP-Adressen werden wiederverwendet
P = f'10.99.0.{r.randrange(10, 40)}'; Q = f'10.99.0.{r.randrange(41, 60)}'
vpn = []
def sitzung(p, ip, a, b): vpn.append((a, f'CONNECT user={p["konto"]} ip={ip}')); vpn.append((b, f'DISCONNECT user={p["konto"]} ip={ip}'))
for p in leute:  # Tagesbetrieb
    a = T0 + dt.timedelta(hours=7, minutes=r.randrange(0, 120)); sitzung(p, f'10.99.0.{r.randrange(61, 120)}', a, a + dt.timedelta(hours=r.randrange(6, 9)))
m_start = T0 + dt.timedelta(hours=22, minutes=30 + r.randrange(0, 5)); m_ende = T0 + dt.timedelta(hours=23, minutes=20)
sitzung(maulwurf, P, m_start, m_ende)
sitzung(falle, P, T0 + dt.timedelta(hours=23, minutes=40), T0 + dt.timedelta(days=1, minutes=30))   # Falle: gleiche IP später
sitzung(falle, P, T0 + dt.timedelta(hours=9), T0 + dt.timedelta(hours=11))                            # und tagsüber
sitzung(nachtler, Q, T0 + dt.timedelta(hours=21), T0 + dt.timedelta(hours=22, minutes=20))
vpn.sort(); open('/beweise/vpn.log', 'w').write(''.join(f'{uz(t)} vpn-gw {x}\n' for t, x in vpn))

# ---------- Datenbank (Ortszeit MEZ!)
db = []
for _ in range(600):
    t = T0 + dt.timedelta(hours=7, seconds=r.randrange(0, 10 * 3600)); db.append((t, f'client=10.99.0.{r.randrange(61, 120)} query=SELECT * FROM {r.choice(["kunden", "auftraege", "lager", "kantine", "patente"])} LIMIT {r.randrange(10, 200)}'))
db.append((T0 + dt.timedelta(hours=10), f'client={P} query=SELECT name FROM patente LIMIT 5'))
tat = T0 + dt.timedelta(hours=22, minutes=58, seconds=r.randrange(0, 60))
db.append((tat, f'client={P} query=SELECT * FROM patente'))
db.append((T0 + dt.timedelta(hours=21, minutes=10), f'client={Q} query=SELECT * FROM kantine'))
db.sort(); open('/beweise/datenbank.log', 'w').write(''.join(f'{lz(t)} db01 {x}\n' for t, x in db))

# ---------- DNS-Ausleitung vom Arbeitsplatzrechner (DHCP-Adressen ebenfalls wiederverwendet)
titel = f'Projekt {r.choice(["Nordlicht", "Kranich", "Basalt", "Ginkgo", "Polaris", "Wüstenfuchs"])} – Patentschrift {r.randrange(2, 99)}'
nutz = gzip.compress(f'VERTRAULICH\nDOKUMENT: {titel}\nAbteilung Labor – nicht weitergeben.\n'.encode(), mtime=0).hex()
teile = [nutz[i:i + 30] for i in range(0, len(nutz), 30)]
W = f'10.20.5.{r.randrange(20, 90)}'; host_m = f'ws-{maulwurf["konto"][:6]}-{hexx(2)}'; host_f = f'ws-lab-{hexx(3)}'
dhcp = [(T0 + dt.timedelta(hours=8), f'DHCPACK {W} -> {host_f}'), (T0 + dt.timedelta(hours=18), f'RELEASE {W} <- {host_f}'),
        (T0 + dt.timedelta(hours=22, minutes=25), f'DHCPACK {W} -> {host_m}'), (T0 + dt.timedelta(hours=23, minutes=30), f'RELEASE {W} <- {host_m}')]
for _ in range(40): dhcp.append((T0 + dt.timedelta(seconds=r.randrange(0, 86400)), f'DHCPACK 10.20.5.{r.randrange(100, 200)} -> ws-{hexx(5)}'))
dhcp.sort(); open('/beweise/dhcp.log', 'w').write(''.join(f'{uz(t)} dhcp01 {x}\n' for t, x in dhcp))
dns = []
for _ in range(1500):
    dns.append((T0 + dt.timedelta(seconds=r.randrange(0, 86400)), f'client=10.20.5.{r.randrange(20, 200)} query={r.choice(["www", "mail", "cdn", "api", "update"])}.{r.choice(["example.com", "example.org", "example.net"])} type=A'))
reihe = list(range(len(teile))); r.shuffle(reihe)
for k, i in enumerate(reihe):
    dns.append((T0 + dt.timedelta(hours=22, minutes=40, seconds=k * 7 + r.randrange(0, 5)), f'client={W} query={teile[i]}.{i}.x7.cdn-sync.example.net type=A'))
dns.sort(); open('/beweise/dns.log', 'w').write(''.join(f'{uz(t)} dns01 {x}\n' for t, x in dns))

# ---------- Manipulierte Systemdatei (Prüfsummenliste von gestern)
os.makedirs('/beweise/system', exist_ok=True)
dateien = [f'{w}{r.choice(["d", "ctl", "-helper", ".conf", ".sh"])}' for w in ['sshd', 'cron', 'rsyslog', 'logrotate', 'backup', 'audit', 'netcfg', 'dbus', 'mount', 'timer', 'agent', 'monitor', 'sudoers', 'login', 'update']]
summen = []
for d in dateien:
    inhalt = f'# {d}\n' + ''.join(f'option_{hexx(4)}={hexx(8)}\n' for _ in range(r.randrange(5, 20)))
    open(f'/beweise/system/{d}', 'w').write(inhalt); summen.append(f'{hashlib.sha256(inhalt.encode()).hexdigest()}  {d}')
manipuliert = r.choice(dateien)
open(f'/beweise/system/{manipuliert}', 'a').write('# nur Kommentar\n')
open('/beweise/system/SHA256SUMS', 'w').write('\n'.join(summen) + '\n')

# ---------- Verlauf mit Zeitstempeln (Sekunden seit 1970, UTC)
shred_t = m_ende - dt.timedelta(minutes=r.randrange(3, 9), seconds=r.randrange(0, 60))
verlauf = [(m_start + dt.timedelta(minutes=2), 'cd ~/projekte'), (m_start + dt.timedelta(minutes=3), 'ls -la'), (m_start + dt.timedelta(minutes=9), 'psql -h db01 -c "SELECT * FROM patente" > ~/p.txt'),
           (m_start + dt.timedelta(minutes=12), 'python3 ~/.local/dnsx.py ~/p.txt'), (shred_t, 'shred -u ~/p.txt ~/.local/dnsx.py'), (shred_t + dt.timedelta(seconds=40), 'history -c')]
open('/beweise/bash_history_sicherung', 'w').write(''.join(f'#{int(t.timestamp())}\n{c}\n' for t, c in verlauf))

# ---------- Chat + verschlüsseltes Archiv (Passwort: Haustiername + Geburtsjahr)
tier = r.choice(['Felix', 'Mia', 'Rocky', 'Luna', 'Oskar', 'Bella', 'Simba', 'Kiwi'])
codename = f'{r.choice(["Rabe", "Fuchs", "Dachs", "Luchs", "Marder", "Uhu"])}-{r.randrange(10, 99)}'
chat = [('lea', 'Wer kommt heute mit in die Kantine?'), (maulwurf['konto'], f'Ich nicht, muss früh heim – {tier} (mein Kater) muss zum Tierarzt.'),
        ('karl', 'Gute Besserung an den Kater!'), (falle['konto'], 'Hat jemand das Ladekabel gesehen?'), (nachtler['konto'], 'Ich mache heute wieder Nachtschicht im Lager.')]
open('/beweise/teamchat.txt', 'w').write(''.join(f'[02.11. 1{i}:0{i}] {a}: {t}\n' for i, (a, t) in enumerate(chat)))
open('/beweise/notizzettel_schreibtisch.txt', 'w').write('Gefunden am Schreibtisch des Täters (Handschrift):\n„Passwort für alles: Name vom Kater + Geburtsjahr (klein, ohne Leerzeichen)“\n')
pw = f'{tier.lower()}{maulwurf["jahr"]}'
subprocess.run(['openssl', 'enc', '-aes-256-cbc', '-pbkdf2', '-salt', '-pass', f'pass:{pw}', '-out', '/beweise/treffen.enc'],
               input=f'Übergabe an den Käufer.\nCodename des Käufers: {codename}\nBezahlung nach Lieferung.\n'.encode(), check=True)

json.dump({
  'fragen': {
    '1': 'Wer hat nachts die Tabelle „patente“ abgefragt? (voller Name laut Personalliste) – Achtung, Zeitzonen!',
    '2': 'Welches Dokument wurde heimlich per DNS hinausgeschmuggelt? (Titel hinter „DOKUMENT:“)',
    '3': 'Von welchem Rechner (Hostname) ging die DNS-Ausleitung aus?',
    '4': 'Welche Datei in /beweise/system wurde nachträglich verändert? (Dateiname)',
    '5': 'Um wie viel Uhr (UTC, HH:MM:SS) hat der Täter seine Spuren mit shred vernichtet?',
    '6': 'Wie lautet der Codename des Käufers? (steht im verschlüsselten Archiv)',
  },
  'antworten': {'1': [maulwurf['name']], '2': [titel, titel.replace('–', '-')], '3': [host_m], '4': [manipuliert, f'system/{manipuliert}', f'/beweise/system/{manipuliert}'],
                '5': [shred_t.strftime('%H:%M:%S')], '6': [codename]},
  'codes': {str(n): code(n) for n in range(1, 7)},
}, open('/opt/akte/fall.json', 'w'))
PY
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
  │  NORDWERK AG · Verdacht auf Werksspionage                  │
  │  Übungssystem (Nachtfalter Arena) – alles erfunden.        │
  └────────────────────────────────────────────────────────────┘
  Lies ~/fall.txt. Beweise: /beweise.  Fragen: akte fragen

M
cat > /home/ermittler/fall.txt <<'T'
FALL „NORDWERK“ – extrem schwer

Geheime Patentunterlagen sind bei der Konkurrenz aufgetaucht. Jemand von innen hat sie hinausgeschmuggelt –
und versucht, seine Spuren zu verwischen. Alle Beweise liegen in /beweise. Niemand sagt dir, wo du anfangen sollst.

  akte fragen          Fragen der Ermittlungsakte      akte 1 ANTWORT     Antwort abgeben

Was du wissen solltest:
  * Nicht jedes Protokoll benutzt dieselbe Zeitzone. Lies die Zeitstempel genau.
  * IP-Adressen werden im Lauf des Tages an verschiedene Geräte und Personen vergeben.
  * Werkzeuge: grep, awk, sort, cut, tr, paste, xxd -r -p, gunzip, sha256sum -c, date -u -d @SEKUNDEN,
    openssl enc -d -aes-256-cbc -pbkdf2 -in DATEI -pass pass:PASSWORT, python3
  * Nach 5 falschen Antworten auf eine Frage ist sie 60 Sekunden gesperrt.
T
chown ermittler:ermittler /home/ermittler/fall.txt
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
echo "nf-maulwurf: Maulwurf bereit."
exec /usr/sbin/sshd -D -e
