#!/bin/bash
# „Die Spurensuche“ – Einsteiger-Ermittlung: Jemand hat nachts die Firmen-Webseite verändert. Mit ls, cat, grep,
# diff und base64 findest du heraus, wer, was und wie. Antworten prüft die Ermittlungsakte (Befehl: akte).
# Codes: KLY{ sha256("<salz>:spuren:lN")[:16] }. Alle Daten sind erfunden.
set -euo pipefail
TOKEN="${KLY_TOKEN:-}"
[[ "$TOKEN" =~ ^KLY-[0-9A-F]{6}$ ]] || { echo "FEHLER: KLY_TOKEN fehlt oder ist ungültig." >&2; exit 2; }
SALZ="${KLY_SALZ:-}"; [[ "$SALZ" =~ ^[0-9a-f]{32}$ ]] || SALZ="$TOKEN"   # Arena: geheimes Salz vom Server; sonst (eigenes Kali) der Token
unset KLY_SALZ
passwd -l root >/dev/null
useradd -m -s /bin/bash ermittler; echo 'ermittler:ermittler' | chpasswd; chmod 700 /home/ermittler; rm -f /home/ermittler/.bash_logout
useradd -r -s /usr/sbin/nologin akte
install -d -m 755 /beweise /beweise/webseite
install -d -o akte -g akte -m 700 /opt/akte
python3 - "$SALZ" <<'PY'
import sys, random, hashlib, base64, json, os, time
salz = sys.argv[1]
r = random.Random(hashlib.sha256((salz + ':spuren:fall').encode()).hexdigest())
code = lambda n: 'KLY{' + hashlib.sha256(f'{salz}:spuren:l{n}'.encode()).hexdigest()[:16] + '}'
namen = ['anna', 'ben', 'clara', 'david', 'emma', 'felix', 'greta', 'hannes', 'ida', 'jonas', 'kim', 'lena', 'max', 'nora', 'oskar', 'paula']
taeter = r.choice(namen)
# 1) Anmeldungen der Nacht: alle tagsüber – nur eine Person um 3 Uhr nachts
z = []
for _ in range(60):
    n = r.choice([x for x in namen if x != taeter]); z.append((r.randrange(8, 18), r.randrange(60), n))
z.append((3, r.randrange(60), taeter)); z.sort()
open('/beweise/anmeldungen.log', 'w').write(''.join(f'03.11.2026 {h:02d}:{m:02d}  Anmeldung erfolgreich: {n}\n' for h, m, n in z))
# 2) Webseite: eine Datei wurde nachts verändert
seiten = ['index.html', 'kontakt.html', 'ueber-uns.html', 'preise.html', 'team.html', 'impressum.html', 'karriere.html', 'blog.html']
geaendert = r.choice(seiten)
for s in seiten:
    open(f'/beweise/webseite/{s}', 'w').write(f'<h1>{s[:-5]}</h1>\n<p>Willkommen bei Gartenbau Grün.</p>\n')
open(f'/beweise/webseite/{geaendert}', 'a').write('<p style="color:red">GEHACKT!!! 😈</p>\n')
basis = time.mktime((2026, 10, 1, 10, 0, 0, 0, 0, -1))
for i, s in enumerate(seiten): os.utime(f'/beweise/webseite/{s}', (basis + i * 86400, basis + i * 86400))
nacht = time.mktime((2026, 11, 3, 3, 12, 0, 0, 0, -1)); os.utime(f'/beweise/webseite/{geaendert}', (nacht, nacht))
# 3+4) Versteckte Datei mit verschlüsselter (base64) Nachricht
versteckt = '.' + r.choice(['notiz', 'merker', 'gruss', 'zettel']) + str(r.randrange(10, 99))
ort = r.choice(['Bahnhof', 'Stadtpark', 'Brücke', 'Marktplatz', 'Bibliothek', 'Schwimmbad']) + ' ' + str(r.randrange(10, 99))
open(f'/beweise/webseite/{versteckt}', 'w').write(base64.b64encode(f'Auftrag erledigt. Treffpunkt: {ort}\n'.encode()).decode() + '\n')
os.utime(f'/beweise/webseite/{versteckt}', (basis - 86400, basis - 86400))
# 5) Neues Konto: Liste vorher/nachher
neu = r.choice(['support2', 'backup_adm', 'wartung', 'sysdienst', 'gast2', 'helper'])
vorher = sorted(namen + ['root', 'www-data', 'backup'])
open('/beweise/konten_vorher.txt', 'w').write('\n'.join(vorher) + '\n')
nachher = vorher[:]; nachher.insert(r.randrange(len(nachher)), neu)
open('/beweise/konten_nachher.txt', 'w').write('\n'.join(nachher) + '\n')
json.dump({
  'fragen': {
    '1': 'Wer hat sich mitten in der Nacht angemeldet? (Name)',
    '2': 'Welche Datei der Webseite wurde in dieser Nacht verändert? (Dateiname)',
    '3': 'Im Webseiten-Ordner liegt eine versteckte Datei. Wie heißt sie? (mit Punkt)',
    '4': 'Die versteckte Datei enthält eine verschlüsselte Nachricht. Wo ist der Treffpunkt?',
    '5': 'Welches Benutzerkonto wurde neu angelegt?',
  },
  'antworten': {'1': [taeter], '2': [geaendert], '3': [versteckt], '4': [ort, f'Treffpunkt: {ort}'], '5': [neu]},
  'codes': {str(n): code(n) for n in range(1, 6)},
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
  │  GARTENBAU GRÜN · Wer hat die Webseite verändert?          │
  │  Übungssystem (Nachtfalter Arena) – alles erfunden.        │
  └────────────────────────────────────────────────────────────┘
  Lies ~/fall.txt. Beweise: /beweise.  Fragen: akte fragen

M
cat > /home/ermittler/fall.txt <<'T'
FALL „GARTENBAU GRÜN“ – deine erste Ermittlung

Heute Morgen stand auf der Firmen-Webseite plötzlich „GEHACKT!!!“. Die Beweise liegen in /beweise.
Beantworte die Fragen der Ermittlungsakte – jede richtige Antwort gibt einen Code.

  akte fragen          alle Fragen anzeigen
  akte 1 NAME          Antwort auf Frage 1 abgeben

Werkzeuge:
  ls -l /beweise                    was liegt da?
  cat /beweise/anmeldungen.log      Datei anzeigen     (less: blättern, q = beenden)
  grep " 0[0-5]:" DATEI             Zeilen mit Uhrzeit 00:xx bis 05:xx
  ls -lt /beweise/webseite          nach Änderungszeit sortiert (neueste oben)
  ls -la                            zeigt auch versteckte Dateien (Name beginnt mit .)
  base64 -d DATEI                   base64 entschlüsseln
  diff DATEI1 DATEI2                Unterschiede zweier Dateien
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
echo "nf-spuren: Spurensuche bereit."
exec /usr/sbin/sshd -D -e
