#!/bin/bash
# „Der Chiffrensaal“ – Kryptoanalyse: klassische Chiffren brechen (Caesar, XOR, Vigenère, Kodierungs-Ketten).
# Jede Nachricht enthält ihren Code KLY{…}. Codes: KLY{ sha256("<salz>:chiffren:lN")[:16] }.
set -euo pipefail
TOKEN="${KLY_TOKEN:-}"
[[ "$TOKEN" =~ ^KLY-[0-9A-F]{6}$ ]] || { echo "FEHLER: KLY_TOKEN fehlt oder ist ungültig." >&2; exit 2; }
SALZ="${KLY_SALZ:-}"; [[ "$SALZ" =~ ^[0-9a-f]{32}$ ]] || SALZ="$TOKEN"   # Arena: geheimes Salz vom Server; sonst (eigenes Kali) der Token
unset KLY_SALZ
passwd -l root >/dev/null
useradd -m -s /bin/bash krypto; echo 'krypto:krypto' | chpasswd; chmod 700 /home/krypto; rm -f /home/krypto/.bash_logout
install -d -o krypto -g krypto -m 700 /home/krypto/raetsel
python3 - "$SALZ" <<'PY'
import sys, hashlib, base64, random
salz=sys.argv[1]; r=random.Random(hashlib.sha256((salz+':chiffren').encode()).hexdigest())
code=lambda n:'KLY{'+hashlib.sha256(f'{salz}:chiffren:l{n}'.encode()).hexdigest()[:16]+'}'
D='/home/krypto/raetsel'
def klar(n): return f'Glueckwunsch, entschluesselt! Code: {code(n)}'
# L1 Caesar (nur Buchstaben verschieben)
sh=r.randrange(3,24)
def caesar(t,s):
    o=''
    for c in t:
        if 'a'<=c<='z': o+=chr((ord(c)-97+s)%26+97)
        elif 'A'<=c<='Z': o+=chr((ord(c)-65+s)%26+65)
        else: o+=c
    return o
open(f'{D}/01_caesar.txt','w').write('Caesar-Chiffre (Buchstaben um einen festen Wert verschoben). Probiere alle 25 Verschiebungen.\n\n'+caesar(klar(1),sh)+'\n')
# L2 XOR Einzelbyte (hex)
k2=r.randrange(1,255)
enc2=''.join(f'{b^k2:02x}' for b in klar(2).encode())
open(f'{D}/02_xor_einzel.hex','w').write('XOR mit EINEM unbekannten Byte (als Hex). Probiere alle 256 Schluessel; der richtige ergibt lesbaren Text.\n\n'+enc2+'\n')
# L3 XOR mit Schluesselwort (hex)
w3=r.choice(['nacht','falter','kobold','zenit','magma'])
pt3=klar(3).encode(); enc3=''.join(f'{pt3[i]^ord(w3[i%len(w3)]):02x}' for i in range(len(pt3)))
open(f'{D}/03_xor_wort.hex','w').write(f'XOR mit einem SchluesselWORT (als Hex). Das Wort ist kurz und klein geschrieben. Tipp: Laenge raten, Muster suchen.\n(Uebung: Schluessel hat {len(w3)} Buchstaben.)\n\n'+enc3+'\n')
# L4 Kodierungs-Kette: base64(base32(hex(text)))
pt4=klar(4).encode()
schicht=base64.b64encode(base64.b32encode(pt4.hex().encode())).decode()
open(f'{D}/04_kette.txt','w').write('Mehrfach kodiert (KEINE Verschluesselung!). Schicht fuer Schicht auspacken: zuerst base64, dann base32, dann Hex.\n\n'+schicht+'\n')
# L5 Vigenère (nur Buchstaben), Schlussel als Hinweis
key5=r.choice(['KOBOLD','ZENITH','FALTER','BASALT'])
def vig(t,k,dec=False):
    o=''; j=0
    for c in t:
        if c.isalpha():
            s=(ord(k[j%len(k)].upper())-65)*(-1 if dec else 1)
            base=97 if c.islower() else 65
            o+=chr((ord(c)-base+s)%26+base); j+=1
        else: o+=c
    return o
open(f'{D}/05_vigenere.txt','w').write(f'Vigenère-Chiffre. Schluessel: {key5}\n\n'+vig(klar(5),key5)+'\n')
PY
chown -R krypto:krypto /home/krypto/raetsel
cat > /home/krypto/auftrag.txt <<'T'
DER CHIFFRENSAAL – Kryptoanalyse (alles erfunden)

In ~/raetsel liegen fünf verschlüsselte Nachrichten. Jede enthält (entschlüsselt) ihren Code KLY{…}.

  01_caesar.txt       Caesar – alle 25 Verschiebungen durchprobieren
  02_xor_einzel.hex   XOR mit einem Byte – alle 256 Schlüssel
  03_xor_wort.hex     XOR mit einem kurzen Schlüsselwort
  04_kette.txt        mehrfach kodiert (base64 → base32 → Hex)
  05_vigenere.txt     Vigenère (Schlüssel steht in der Datei)

Werkzeuge: python3 (ideal für Schleifen), xxd, base64, base32, tr.  hilfe · begriff verschluesselung
Tipp: In python3 ist jede Chiffre ein Dreizeiler – probier Schlüssel durch und schau, was lesbar wird.
T
chown krypto:krypto /home/krypto/auftrag.txt
cat > /etc/motd <<'M'

  DER CHIFFRENSAAL · Kryptoanalyse (Nachtfalter Arena – alles erfunden)
  Lies ~/auftrag.txt.  Rätsel: ~/raetsel/   ·   Hilfe: hilfe
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
echo "nf-chiffren: Chiffrensaal bereit."
exec /usr/sbin/sshd -D -e
