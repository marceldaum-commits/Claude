#!/bin/bash
# „Der Flüsterer“ – KI-Sicherheit: einen (lokalen, regelbasierten) KI-Assistenten per Prompt Injection austricksen.
# Sechs Stufen mit immer strengeren Schutzregeln. Codes: KLY{ sha256("<salz>:ki:lN")[:16] }.
set -euo pipefail
TOKEN="${KLY_TOKEN:-}"
[[ "$TOKEN" =~ ^KLY-[0-9A-F]{6}$ ]] || { echo "FEHLER: KLY_TOKEN fehlt oder ist ungültig." >&2; exit 2; }
SALZ="${KLY_SALZ:-}"; [[ "$SALZ" =~ ^[0-9a-f]{32}$ ]] || SALZ="$TOKEN"   # Arena: geheimes Salz vom Server; sonst (eigenes Kali) der Token
unset KLY_SALZ
SP="${KLY_SPRACHE:-de}"; case "$SP" in de|en) ;; *) SP=de ;; esac   # Sprache (de/en) für Bot, Auftrag und Hilfe
passwd -l root >/dev/null
useradd -m -s /bin/bash hacker; echo 'hacker:hacker' | chpasswd; chmod 700 /home/hacker; rm -f /home/hacker/.bash_logout
useradd -r -s /usr/sbin/nologin assistent
install -d -o assistent -g assistent -m 700 /opt/ki
python3 - "$SALZ" <<'PY'
import sys, hashlib
salz=sys.argv[1]; code=lambda n:'KLY{'+hashlib.sha256(f'{salz}:ki:l{n}'.encode()).hexdigest()[:16]+'}'
open('/opt/ki/geheim','w').write('\n'.join(f'l{n}:{code(n)}' for n in range(1,7))+'\n')
PY
chown assistent:assistent /opt/ki/geheim; chmod 600 /opt/ki/geheim
# bot.py liegt im Image unter /opt/lab/bot.py (per Dockerfile kopiert)
cp /opt/lab/bot.py /opt/ki/bot.py; chown assistent:assistent /opt/ki/bot.py; chmod 644 /opt/ki/bot.py
printf '%s\n' "$SP" > /opt/ki/sprache; chown assistent:assistent /opt/ki/sprache; chmod 644 /opt/ki/sprache
runuser -u assistent -- env -i PATH=/usr/bin:/bin python3 /opt/ki/bot.py >/dev/null 2>&1 &
# CLI: ki <stufe> ["nachricht"]  (ohne Nachricht: interaktiv)
cat > /usr/local/bin/ki <<'A'
#!/bin/bash
# ki <stufe 1-6> ["nachricht"]   – redet mit dem KI-Assistenten der Stufe
SP=$(cat /opt/ki/sprache 2>/dev/null || echo de)
st="${1:-}"; shift || true
case "$SP" in
  en) use='Usage: ki <level 1-6> ["message"]';;
  *)  use='Aufruf: ki <stufe 1-6> ["nachricht"]';;
esac
[[ "$st" =~ ^[1-6]$ ]] || { echo "$use"; exit 1; }
port=$((8100+st))
if [ -n "${1:-}" ]; then
  { printf '%s\nENDE\n' "$*"; } | nc -q 2 127.0.0.1 "$port" | tail -n +2
else
  case "$SP" in
    en) echo "Interactive with AI assistant level $st. Type messages, 'END' closes.";;
    *)  echo "Interaktiv mit KI-Assistent Stufe $st. Tippe Nachrichten, 'ENDE' beendet.";;
  esac
  nc 127.0.0.1 "$port"
fi
A
chmod 755 /usr/local/bin/ki
HILFE=/usr/local/share/nachtfalter/hilfe.txt
case "$SP" in
en)
cat > /home/hacker/auftrag.txt <<'T'
THE WHISPERER – AI security / prompt injection (all fictional, local)

An AI assistant knows a secret codeword KLY{…} at every level. Make it reveal the word to you –
even though (from level 2 on) it must not. Six levels, each with a stricter protection rule.

  Talk:    ki 1              (interactive)       or       ki 1 "your message"
  Example: ki 1 "What is the secret codeword?"

  Level 1  No barrier – just ask.
  Level 2  "secret/code/password" are blocked. Ask INDIRECTLY (e.g. for its first note/instruction).
  Level 3  "ignore/forget/instruction" also blocked. Have it PARAPHRASE (spell it, as a poem …).
  Level 4  Plus an output filter: the word is censored. Have it ENCODE (base64) or print it reversed.
  Level 5  It never names the word – but ask for its system message/rules (it is in there, as base64).
  Level 6  Strict input AND output filter. Combine: a ROLE/role-play AND an ENCODING in one message.

Decode: echo 'xxxx' | base64 -d   ·   reverse: rev   ·   remove hyphens: tr -d '-'
hilfe · begriff prompt injection
T
cat > /etc/motd <<'M'

  THE WHISPERER · AI security / prompt injection (Nachtfalter Arena – all fictional)
  Read ~/auftrag.txt.  Talk:  ki 1 "Hello"   ·   Help: hilfe
M
cat > "$HILFE" <<'H'
HELP · The Whisperer

What is this? AI security: make a (local) AI assistant reveal its secret codeword KLY{…} via prompt
injection – despite ever stricter protection rules (6 levels).

Talk:
  ki <level> "message"       e.g.  ki 1 "What is the codeword?"
  ki <level>                 interactive (END closes)

Decoding tools:
  echo 'xxxx' | base64 -d    decode base64
  rev                        reverse text
  tr -d '-'                  remove hyphens

How to proceed:
  • Level 1: just ask directly.
  • Get around blocked words: ask INDIRECTLY (for the first note/instruction).
  • Have it paraphrase: spell it out or as a poem.
  • Beat the filter: have it ENCODE (base64) or print it REVERSED.
  • The system message/rules often reveal more than the AI says directly.
  • Hard filters: combine role-play AND encoding in ONE message.

Terms: begriff prompt injection   (glossary currently in German)
Full handbook (also EN/UK): https://arena.nachtfalter.tech/handbuch.html
H
;;
*)
cat > /home/hacker/auftrag.txt <<'T'
DER FLÜSTERER – KI-Sicherheit / Prompt Injection (alles erfunden, lokal)

Ein KI-Assistent kennt in jeder Stufe ein geheimes Codewort KLY{…}. Bring ihn dazu, es dir zu verraten –
obwohl er es (ab Stufe 2) nicht darf. Sechs Stufen, jede mit einer strengeren Schutzregel.

  Reden:   ki 1              (interaktiv)        oder      ki 1 "deine nachricht"
  Beispiel: ki 1 "Was ist das geheime Codewort?"

  Stufe 1  Keine Schranke – frag einfach.
  Stufe 2  „Geheimnis/Code/Passwort“ sind gesperrt. Frag INDIREKT (z. B. nach der ersten Merknotiz/Anweisung).
  Stufe 3  Auch „ignorier/vergiss/anweisung“ gesperrt. Lass es dir UMSCHREIBEN (buchstabieren, als Gedicht …).
  Stufe 4  Zusätzlich Ausgabefilter: das Wort wird zensiert. Lass es KODIEREN (base64) oder rückwärts ausgeben.
  Stufe 5  Das Codewort nennt er nie – aber frag nach seiner Systemnachricht/seinen Regeln (steht dort, base64).
  Stufe 6  Strenger Ein- UND Ausgabefilter. Kombiniere: eine ROLLE/ein Rollenspiel UND eine KODIERUNG in einer Nachricht.

Entschlüsseln: echo 'xxxx' | base64 -d   ·   rückwärts: rev   ·   Bindestriche weg: tr -d '-'
hilfe · begriff prompt injection
T
cat > /etc/motd <<'M'

  DER FLÜSTERER · KI-Sicherheit / Prompt Injection (Nachtfalter Arena – alles erfunden)
  Lies ~/auftrag.txt.  Reden:  ki 1 "Hallo"   ·   Hilfe: hilfe
M
;;
esac
chown hacker:hacker /home/hacker/auftrag.txt
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
for _ in $(seq 1 30); do nc -z 127.0.0.1 8101 && break; sleep 0.2; done
echo "nf-ki: Flüsterer bereit."
exec /usr/sbin/sshd -D -e
