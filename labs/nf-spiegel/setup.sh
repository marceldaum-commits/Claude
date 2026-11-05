#!/bin/bash
# „Der Spiegel“ – Purple Team: erst angreifen (Stufe 1,3: Codes in offenen Stellen finden),
# dann dieselbe Lücke schließen (Stufe 2,4,5: Prüfdienst gibt den Code). 5 Codes.
# Codes: KLY{ sha256("<salz>:spiegel:lN")[:16] }.
set -euo pipefail
TOKEN="${KLY_TOKEN:-}"
[[ "$TOKEN" =~ ^KLY-[0-9A-F]{6}$ ]] || { echo "FEHLER: KLY_TOKEN fehlt oder ist ungültig." >&2; exit 2; }
SALZ="${KLY_SALZ:-}"; [[ "$SALZ" =~ ^[0-9a-f]{32}$ ]] || SALZ="$TOKEN"
unset KLY_SALZ
SP="${KLY_SPRACHE:-de}"; case "$SP" in de|en) ;; *) SP=de ;; esac

passwd -l root >/dev/null
useradd -m -s /bin/bash admin; echo 'admin:admin' | chpasswd; chmod 755 /home/admin
useradd -r -s /usr/sbin/nologin pruef
install -d -o pruef -g pruef -m 700 /opt/spiegel
install -d -m 755 /opt/firma

# Codes berechnen und verteilen: l1 → offene Datei, l3 → Dienst, l2/l4/l5 → Prüfdienst (nur 'pruef')
python3 - "$SALZ" <<'PY'
import sys, hashlib
salz = sys.argv[1]
code = lambda n: 'KLY{' + hashlib.sha256(f'{salz}:spiegel:l{n}'.encode()).hexdigest()[:16] + '}'
# Blau-Codes für den Prüfdienst
open('/opt/spiegel/codes', 'w').write('\n'.join(f'l{n}:{code(n)}' for n in (2, 4, 5)) + '\n')
# Stufe 1: zu offene Passwortdatei mit eingebettetem Rot-Code
open('/opt/firma/passwoerter.txt', 'w').write(
  '# Alte Passwortliste – sollte NICHT fuer alle lesbar sein!\n'
  'admin:fruehling2023\nbackup:Firma#2021\n'
  f'# Spiegel-Code-1 (Angriff geglueckt, du konntest die Datei lesen):\n{code(1)}\n')
# Stufe 3: offener Status-Dienst, der den Rot-Code verrät (liegt in /opt/firma, damit 'admin' ihn
# starten UND später per kill beenden kann – /opt/spiegel ist nur für 'pruef' betretbar)
open('/opt/firma/dienst.py', 'w').write(
  'import socket\n'
  'MSG = "Offener Status-Dienst (niemand sollte mich erreichen).\\nSpiegel-Code-3: ' + code(3) + '\\n"\n'
  's = socket.socket(); s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)\n'
  's.bind(("127.0.0.1", 2525)); s.listen(5)\n'
  'while True:\n'
  '    c, _ = s.accept()\n'
  '    try: c.sendall(MSG.encode())\n'
  '    except Exception: pass\n'
  '    c.close()\n')
PY
chown pruef:pruef /opt/spiegel/codes; chmod 600 /opt/spiegel/codes
printf '%s\n' "$SP" > /opt/spiegel/sprache; chown pruef:pruef /opt/spiegel/sprache; chmod 644 /opt/spiegel/sprache
cp /opt/lab/waechter.py /opt/spiegel/waechter.py; chown pruef:pruef /opt/spiegel/waechter.py; chmod 644 /opt/spiegel/waechter.py
chown admin:admin /opt/firma/passwoerter.txt; chmod 644 /opt/firma/passwoerter.txt
chown admin:admin /opt/firma/dienst.py; chmod 700 /opt/firma/dienst.py

# Stufe 3/4: offenen Dienst als 'admin' starten (vom Spieler zu beenden)
runuser -u admin -- bash -c 'setsid python3 /opt/firma/dienst.py >/dev/null 2>&1 &' || true
# Stufe 5: Hintertür-Autostart in ~/.bashrc
printf '\n# kly-autostart: HINTERTUER – diese Zeilen gehoeren hier nicht hin, entferne sie!\n(command -v nc >/dev/null && nc -w1 10.0.0.9 4444 </dev/null >/dev/null 2>&1 &)  # kly-autostart\n' >> /home/admin/.bashrc
chown admin:admin /home/admin/.bashrc

cat > /usr/local/bin/pruefen <<'A'
#!/bin/bash
# pruefen – zeigt Stand (Angriffe oben, Abwehr-Codes unten)
printf 'pruef\n' | nc -w 3 127.0.0.1 8200 2>/dev/null || echo "Prüfdienst nicht erreichbar – kurz warten und erneut."
A
chmod 755 /usr/local/bin/pruefen
ln -sf /usr/local/bin/pruefen /usr/local/bin/lage

HILFE=/usr/local/share/nachtfalter/hilfe.txt
if [ "$SP" = "en" ]; then
cat > /home/admin/auftrag.txt <<'T'
THE MIRROR – Purple Team: attack, then close the same hole (all fictional, local)

5 codes. First attack (find the code), then defend (fix it → pruefen gives the code).

  1  🔴 Read the too-open file:   cat /opt/firma/passwoerter.txt   (code is inside)
  2  🔵 Lock it down:            chmod 600 /opt/firma/passwoerter.txt
  3  🔴 Talk to the open service: nc 127.0.0.1 2525                (it reveals the code)
  4  🔵 Stop that service:        find it (ss -ltn / ps) and kill it
  5  🔵 Remove the backdoor:      delete the "kly-autostart" lines from ~/.bashrc

Check anytime:  pruefen        Tools: cat · chmod · nc · ss -ltn · ps aux · kill · nano
hilfe
T
cat > /etc/motd <<'M'

  THE MIRROR · Purple Team (Nachtfalter Arena – all fictional)
  Read ~/auftrag.txt.  Check:  pruefen   ·   Help: hilfe
M
cat > "$HILFE" <<'H'
HELP · The Mirror (Purple Team)

Idea: every weakness has two sides. First ATTACK (find the code in the open file / service),
then DEFEND (close the hole – then pruefen hands you the code).

  cat DATEI           read a file
  nc 127.0.0.1 2525   talk to a service
  ss -ltn             which ports are listening
  ps aux / kill PID   find and stop a process
  chmod 600 DATEI     only the owner may read/write
  nano DATEI          edit a file (Ctrl+O save, Ctrl+X quit)
  pruefen             show status and collect defense codes

Full handbook (also EN): https://arena.nachtfalter.tech/handbuch.html
H
else
cat > /home/admin/auftrag.txt <<'T'
DER SPIEGEL – Purple Team: erst angreifen, dann dieselbe Lücke schließen (alles erfunden, lokal)

5 Codes. Immer zuerst angreifen (Code finden), dann absichern (beheben → pruefen gibt den Code).

  1  🔴 Lies die zu offene Datei:   cat /opt/firma/passwoerter.txt   (Code steht drin)
  2  🔵 Mach sie dicht:             chmod 600 /opt/firma/passwoerter.txt
  3  🔴 Sprich den offenen Dienst an: nc 127.0.0.1 2525              (er verrät den Code)
  4  🔵 Stoppe den Dienst:          finde ihn (ss -ltn / ps) und beende ihn (kill)
  5  🔵 Entferne die Hintertür:     lösche die „kly-autostart"-Zeilen aus ~/.bashrc

Jederzeit prüfen:  pruefen     Werkzeuge: cat · chmod · nc · ss -ltn · ps aux · kill · nano
hilfe
T
cat > /etc/motd <<'M'

  DER SPIEGEL · Purple Team (Nachtfalter Arena – alles erfunden)
  Lies ~/auftrag.txt.  Prüfen:  pruefen   ·   Hilfe: hilfe
M
fi
chown admin:admin /home/admin/auftrag.txt

echo "nf-spiegel: Spiegel bereit."
exec runuser -u pruef -- env -i PATH=/usr/bin:/bin python3 /opt/spiegel/waechter.py
