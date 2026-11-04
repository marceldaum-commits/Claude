#!/bin/bash
# „Die Werkstatt“ – Reverse Engineering: fünf kleine Programme (Crackmes) ohne Quelltext knacken.
# Codes: KLY{ sha256("<salz>:werkstatt:lN")[:16] } – stehen XOR-verschlüsselt in den Binärdateien.
set -euo pipefail
TOKEN="${KLY_TOKEN:-}"
[[ "$TOKEN" =~ ^KLY-[0-9A-F]{6}$ ]] || { echo "FEHLER: KLY_TOKEN fehlt oder ist ungültig." >&2; exit 2; }
SALZ="${KLY_SALZ:-}"; [[ "$SALZ" =~ ^[0-9a-f]{32}$ ]] || SALZ="$TOKEN"   # Arena: geheimes Salz vom Server; sonst (eigenes Kali) der Token
unset KLY_SALZ
passwd -l root >/dev/null
useradd -m -s /bin/bash knacker; echo 'knacker:knacker' | chpasswd; chmod 700 /home/knacker; rm -f /home/knacker/.bash_logout
install -d -m 755 /opt/werkstatt
python3 /opt/build/bau.py "$SALZ" >/dev/null
chmod 755 /opt/werkstatt/cm*; rm -f /opt/build/cm*.c
cat > /home/knacker/auftrag.txt <<'T'
DIE WERKSTATT – Reverse Engineering (alles erfunden)

In /opt/werkstatt liegen fünf Programme (cm1 … cm5). Jedes will eine Lösung und gibt bei Erfolg einen Code KLY{…}.
Du hast keinen Quelltext – nur das Programm. Finde heraus, was es erwartet.

  cm1  Das Passwort steht im Klartext in der Datei.      strings /opt/werkstatt/cm1
  cm2  Das Passwort wird beim Start zusammengebaut.      ltrace /opt/werkstatt/cm2 test   (sieh dir strcmp an)
  cm3  Seriennummer aus dem Namen (Keygen).              ./cm3            (zeigt den Namen; Formel per objdump finden)
  cm4  Passwort liegt XOR-verschlüsselt im Programm.     objdump -s -j .data /opt/werkstatt/cm4   (Bytes + Schlüssel)
  cm5  Seriennummer Zeichen für Zeichen aus dem Namen.   ./cm5            (Algorithmus per objdump/gdb nachbauen)

Aufruf jeweils:  /opt/werkstatt/cm1 DEINE-LOESUNG     (cm3/cm5:  cmN NAME SERIENNUMMER)
Werkzeuge: strings, ltrace, objdump -d, nm, gdb, xxd, python3.  hilfe · begriff reverse engineering
T
chown knacker:knacker /home/knacker/auftrag.txt
cat > /etc/motd <<'M'

  WERKSTATT · Reverse Engineering (Nachtfalter Arena – alles erfunden)
  Lies ~/auftrag.txt.  Programme: /opt/werkstatt/cm1 … cm5   ·   Hilfe: hilfe
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
echo "nf-werkstatt: Werkstatt bereit."
exec /usr/sbin/sshd -D -e
