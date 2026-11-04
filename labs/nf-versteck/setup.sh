#!/bin/bash
# „Das Versteck“ – Steganografie: Daten, die in Dateien versteckt sind, finden und herausholen.
# Codes: KLY{ sha256("<salz>:versteck:lN")[:16] } – stecken in den versteckten Daten.
set -euo pipefail
TOKEN="${KLY_TOKEN:-}"
[[ "$TOKEN" =~ ^KLY-[0-9A-F]{6}$ ]] || { echo "FEHLER: KLY_TOKEN fehlt oder ist ungültig." >&2; exit 2; }
SALZ="${KLY_SALZ:-}"; [[ "$SALZ" =~ ^[0-9a-f]{32}$ ]] || SALZ="$TOKEN"   # Arena: geheimes Salz vom Server; sonst (eigenes Kali) der Token
unset KLY_SALZ
passwd -l root >/dev/null
useradd -m -s /bin/bash sucher; echo 'sucher:sucher' | chpasswd; chmod 700 /home/sucher; rm -f /home/sucher/.bash_logout
install -d -o sucher -g sucher -m 700 /home/sucher/fundstuecke
python3 - "$SALZ" <<'PY'
import sys, hashlib, base64, zipfile, io, os
salz=sys.argv[1]; code=lambda n:'KLY{'+hashlib.sha256(f'{salz}:versteck:l{n}'.encode()).hexdigest()[:16]+'}'
D='/home/sucher/fundstuecke'
# L1: Daten an eine „PNG“ angehängt (hinter dem Dateiende). strings/tail finden sie.
png=bytes.fromhex('89504e470d0a1a0a')+b'\x00'*40+b'IEND\xaeB`\x82'
open(f'{D}/bild1.png','wb').write(png+f'\nversteckt hinter dem Bild -> {code(1)}\n'.encode())
# L2: ZIP an eine Datei angehängt (Polyglot). unzip holt es raus.
buf=io.BytesIO()
with zipfile.ZipFile(buf,'w') as z: z.writestr('geheim.txt', f'Im Archiv versteckt: {code(2)}\n')
open(f'{D}/notiz2.jpg','wb').write(b'\xff\xd8\xff\xe0 (sieht aus wie ein Foto)\n'+buf.getvalue())
# L3: Whitespace-Stego – Bits als Leerzeichen(0)/Tab(1) am Zeilenende
msg=code(3); bits=''.join(f'{b:08b}' for b in msg.encode())
zeilen=['Das ist ein voellig normaler Text.','Nichts zu sehen hier.','Wirklich nichts.','Weitergehen.']
out=[]; bi=0
for i,z in enumerate(zeilen*999):
    if bi>=len(bits): out.append(z); break
    tail=''.join(' ' if bits[bi+j]=='0' else '\t' for j in range(min(8,len(bits)-bi)))
    out.append(z+tail); bi+=8
open(f'{D}/text3.txt','w').write('\n'.join(out)+'\n')
# L4: LSB in einem PPM-Bild (niederwertigstes Bit der Pixelbytes = Nachricht)
msg=code(4)+'\x00'; bits=''.join(f'{b:08b}' for b in msg.encode())
w,h=32,32; px=bytearray()
import random as _r; rng=_r.Random(hashlib.sha256((salz+':ppm').encode()).hexdigest())
for i in range(w*h*3):
    v=rng.randrange(0,256)
    if i<len(bits): v=(v & 0xFE) | int(bits[i])
    px.append(v)
open(f'{D}/bild4.ppm','wb').write(f'P6\n{w} {h}\n255\n'.encode()+bytes(px))
# L5: Mehrschichtig: base64 der umgekehrten Bytes
inner=f'Tief versteckt: {code(5)}'.encode()
open(f'{D}/daten5.b64','w').write('Erst base64 auspacken, dann die Bytes umdrehen.\n'+base64.b64encode(inner[::-1]).decode()+'\n')
PY
chown -R sucher:sucher /home/sucher/fundstuecke
cat > /home/sucher/auftrag.txt <<'T'
DAS VERSTECK – Steganografie (alles erfunden)

In ~/fundstuecke sind fünf Codes KLY{…} in Dateien versteckt. Hol sie heraus.

  bild1.png     Etwas wurde hinter das Bild gehängt.     strings bild1.png   ·   tail -c 60 bild1.png
  notiz2.jpg    In der Datei steckt ein Archiv.           unzip notiz2.jpg   (oder: binwalk/file)
  text3.txt     Leerzeichen und Tabs am Zeilenende = Bits (Leer=0, Tab=1). 8 Bit = 1 Zeichen.
  bild4.ppm     Nachricht im niederwertigsten Bit der Pixel (LSB). Mit python3 die letzten Bits sammeln.
  daten5.b64    Erst base64 auspacken (base64 -d), dann die Bytes umdrehen (rev / python [::-1]).

Werkzeuge: strings, tail, xxd, file, unzip, base64, python3, cat -A (zeigt Tabs).  hilfe · begriff steganografie
T
chown sucher:sucher /home/sucher/auftrag.txt
cat > /etc/motd <<'M'

  DAS VERSTECK · Steganografie (Nachtfalter Arena – alles erfunden)
  Lies ~/auftrag.txt.  Dateien: ~/fundstuecke/   ·   Hilfe: hilfe
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
echo "nf-versteck: Versteck bereit."
exec /usr/sbin/sshd -D -e
