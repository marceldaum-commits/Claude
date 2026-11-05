#!/bin/bash
# „Die Härtung“ – Blue Team: einen absichtlich unsicheren Server härten. Sechs Schwachstellen,
# je eine Stufe/ein Code. Prüfdienst (waechter.py) läuft als 'pruef' und gibt Codes pro behobener
# Lücke. Codes: KLY{ sha256("<salz>:haertung:lN")[:16] }.
set -euo pipefail
TOKEN="${KLY_TOKEN:-}"
[[ "$TOKEN" =~ ^KLY-[0-9A-F]{6}$ ]] || { echo "FEHLER: KLY_TOKEN fehlt oder ist ungültig." >&2; exit 2; }
SALZ="${KLY_SALZ:-}"; [[ "$SALZ" =~ ^[0-9a-f]{32}$ ]] || SALZ="$TOKEN"
unset KLY_SALZ
SP="${KLY_SPRACHE:-de}"; case "$SP" in de|en) ;; *) SP=de ;; esac

passwd -l root >/dev/null
useradd -m -s /bin/bash admin; echo 'admin:admin' | chpasswd; chmod 755 /home/admin
useradd -r -s /usr/sbin/nologin pruef
install -d -o pruef -g pruef -m 700 /opt/haertung

# Codes berechnen (nur für 'pruef' lesbar)
python3 - "$SALZ" <<'PY'
import sys, hashlib
salz=sys.argv[1]; code=lambda n:'KLY{'+hashlib.sha256(f'{salz}:haertung:l{n}'.encode()).hexdigest()[:16]+'}'
open('/opt/haertung/codes','w').write('\n'.join(f'l{n}:{code(n)}' for n in range(1,7))+'\n')
PY
chown pruef:pruef /opt/haertung/codes; chmod 600 /opt/haertung/codes
printf '%s\n' "$SP" > /opt/haertung/sprache; chown pruef:pruef /opt/haertung/sprache; chmod 644 /opt/haertung/sprache
cp /opt/lab/waechter.py /opt/haertung/waechter.py; chown pruef:pruef /opt/haertung/waechter.py; chmod 644 /opt/haertung/waechter.py

# ---- Die sechs absichtlichen Schwachstellen ---------------------------------------------------
install -d -o admin -g admin -m 755 /home/admin/config
# 1) geheim.txt für alle lesbar
printf 'Zugangsdaten (vertraulich): api_key=FIRMA-9f3a-2210\n' > /home/admin/geheim.txt
chown admin:admin /home/admin/geheim.txt; chmod 644 /home/admin/geheim.txt
# 2) backup.sh für alle beschreibbar
install -d -m 755 /opt/firma
printf '#!/bin/bash\n# taeglich: sichert /var/www\ntar czf /tmp/backup.tgz /var/www 2>/dev/null\n' > /opt/firma/backup.sh
chown admin:admin /opt/firma/backup.sh; chmod 666 /opt/firma/backup.sh
# 3) SSH-Konfig mit erlaubtem Root-Login
printf 'Port 22\nPasswordAuthentication yes\nPermitRootLogin yes\nX11Forwarding no\n' > /home/admin/config/ssh.conf
chown admin:admin /home/admin/config/ssh.conf; chmod 644 /home/admin/config/ssh.conf
# 4) unnötiger Dienst auf Port 2323 (vom Spieler zu beenden) – deterministischer Listener
runuser -u admin -- bash -c "setsid python3 -c 'import socket,signal; s=socket.socket(); s.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1); s.bind((\"127.0.0.1\",2323)); s.listen(1); signal.pause()' >/dev/null 2>&1 &" || true
# 5) Hintertür-Autostart in ~/.bashrc
printf '\n# kly-autostart: HINTERTUER – diese Zeilen gehoeren hier nicht hin, entferne sie!\n(command -v nc >/dev/null && nc -w1 10.0.0.9 4444 </dev/null >/dev/null 2>&1 &)  # kly-autostart\n' >> /home/admin/.bashrc
chown admin:admin /home/admin/.bashrc
# 6) schwaches DB-Passwort
printf 'DB_HOST=127.0.0.1\nDB_USER=app\nDB_PASSWORT=1234\n' > /home/admin/config/app.env
chown admin:admin /home/admin/config/app.env; chmod 644 /home/admin/config/app.env

# ---- Befehle: pruefen ------------------------------------------------------------------------
cat > /usr/local/bin/pruefen <<'A'
#!/bin/bash
# pruefen – fragt den Prüfdienst, welche Lücken behoben sind, und zeigt die Codes
printf 'pruef\n' | nc -w 3 127.0.0.1 8200 2>/dev/null || echo "Prüfdienst nicht erreichbar – kurz warten und erneut."
A
chmod 755 /usr/local/bin/pruefen
ln -sf /usr/local/bin/pruefen /usr/local/bin/lage

# ---- Auftrag / Begrüßung / Hilfe je Sprache --------------------------------------------------
HILFE=/usr/local/share/nachtfalter/hilfe.txt
if [ "$SP" = "en" ]; then
cat > /home/admin/auftrag.txt <<'T'
THE HARDENING – Blue Team: secure a server (all fictional, local)

The server goes live tomorrow – but it has 6 security holes. Find and fix them.
After each fix you get a code. Check anytime:  pruefen

  1  ~/geheim.txt is readable by everyone.        Only you:  chmod 600 ~/geheim.txt
  2  /opt/firma/backup.sh is writable by everyone.           chmod o-w /opt/firma/backup.sh
  3  SSH allows root login (~/config/ssh.conf).   Set:       PermitRootLogin no
  4  An unnecessary service listens on port 2323. Find (ss -ltn / ps) and stop it (kill).
  5  ~/.bashrc contains a backdoor (autostart).   Remove the lines with "kly-autostart".
  6  ~/config/app.env has a weak DB password.     Set a strong one (>=12 characters).

Tools:  pruefen · ls -l · stat · chmod · nano · ss -ltn · ps aux · kill · grep
hilfe
T
cat > /etc/motd <<'M'

  THE HARDENING · Blue Team (Nachtfalter Arena – all fictional)
  Read ~/auftrag.txt.  Check:  pruefen   ·   Help: hilfe
M
cat > "$HILFE" <<'H'
HELP · The Hardening (Blue Team)

Goal: secure a misconfigured server. 6 weaknesses, one code each. Run  pruefen  to see
what is still open and to collect the codes of what you fixed.

Useful commands:
  ls -l / stat DATEI     show owner and permissions (rwx for owner, group, others)
  chmod 600 DATEI        only the owner may read/write
  chmod o-w DATEI        remove write permission for "others"
  nano DATEI             edit a file (Ctrl+O save, Ctrl+X quit)
  ss -ltn                which ports are listening
  ps aux                 running processes (find the PID)
  kill PID               stop a process
  grep -n WORT DATEI     find a line

Full handbook (also EN): https://arena.nachtfalter.tech/handbuch.html
H
else
cat > /home/admin/auftrag.txt <<'T'
DIE HÄRTUNG – Blue Team: einen Server absichern (alles erfunden, lokal)

Der Server geht morgen online – aber er hat 6 Sicherheitslücken. Finde und behebe sie.
Nach jeder behobenen Lücke bekommst du einen Code. Jederzeit prüfen:  pruefen

  1  ~/geheim.txt ist für alle lesbar.              Nur du:  chmod 600 ~/geheim.txt
  2  /opt/firma/backup.sh ist für alle beschreibbar.         chmod o-w /opt/firma/backup.sh
  3  SSH erlaubt Root-Login (~/config/ssh.conf).    Setze:   PermitRootLogin no
  4  Ein unnötiger Dienst lauscht auf Port 2323.    Finde (ss -ltn / ps) und beende ihn (kill).
  5  In ~/.bashrc steckt eine Hintertür (Autostart). Entferne die Zeilen mit „kly-autostart".
  6  ~/config/app.env hat ein schwaches DB-Passwort. Setze ein starkes (>=12 Zeichen).

Werkzeuge:  pruefen · ls -l · stat · chmod · nano · ss -ltn · ps aux · kill · grep
hilfe
T
cat > /etc/motd <<'M'

  DIE HÄRTUNG · Blue Team (Nachtfalter Arena – alles erfunden)
  Lies ~/auftrag.txt.  Prüfen:  pruefen   ·   Hilfe: hilfe
M
fi
chown admin:admin /home/admin/auftrag.txt

echo "nf-haertung: Haertung bereit."
# Prüfdienst als 'pruef' im Vordergrund – hält den Container am Leben
exec runuser -u pruef -- env -i PATH=/usr/bin:/bin python3 /opt/haertung/waechter.py
