#!/bin/bash
# Richtet beim Start den Kellerserver ein (synthetische Daten) und startet SSH.
# Alle Passwörter/Codes werden aus deinem KLY_TOKEN berechnet – identisch zur App:
#   code(lN) = KLY{ sha256("<token>:w2:lN")[:16] }
set -euo pipefail

TOKEN="${KLY_TOKEN:-}"
if ! [[ "$TOKEN" =~ ^KLY-[0-9A-F]{6}$ ]]; then
  echo "FEHLER: KLY_TOKEN fehlt oder ist ungültig. Startbefehl aus der App kopieren (enthält deinen Token)." >&2
  exit 2
fi

code() { printf 'KLY{%s}' "$(printf '%s' "$TOKEN:w2:$1" | sha256sum | cut -c1-16)"; }
L1=$(code l1); L2=$(code l2); L3=$(code l3); L4=$(code l4); L5=$(code l5)
L6=$(code l6); L7=$(code l7); L8=$(code l8); L9=$(code l9); L10=$(code l10)

mkuser() { # name passwort
  useradd -m -s /bin/bash "$1"
  if [ -n "$2" ]; then echo "$1:$2" | chpasswd; else passwd -l "$1" >/dev/null; fi
  chmod 700 "/home/$1"
  rm -f "/home/$1/.bash_logout"
}
mkuser azubi azubi
mkuser meier "$L1"; mkuser lager "$L2"; mkuser sicherung "$L3"; mkuser druck "$L4"
mkuser nacht "$L5"; mkuser admin "$L6"; mkuser dev "$L7"; mkuser deploy "$L8"; mkuser chef ""
passwd -l root >/dev/null

cat > /etc/motd <<'M'

  ╔══════════════════════════════════════════════════════════╗
  ║  BRENNER & SÖHNE LOGISTIK · Server „keller“ (ÜBUNG)      ║
  ║  Absichtlich verwundbares Trainingsziel – Kali Level Up  ║
  ╚══════════════════════════════════════════════════════════╝
  Lies zuerst deine Post. Codes gibst du in der App ein.

M
as() { local u=$1; shift; chown -R "$u:$u" "$@"; }

# ---------- Level 0 · azubi: Post lesen, versteckte Pinnwand
H=/home/azubi; mkdir -p $H/post $H/schreibtisch/.pinnwand $H/schreibtisch/ablage
cat > $H/post/01-willkommen.txt <<T
Von: IT-Leitung (Frau Brenner)
Betreff: Willkommen im Team!

Hallo und herzlich willkommen!

Unser alter Server „keller“ soll nächsten Monat abgeschaltet werden. Vorher
musst du herausfinden, wie unsicher er wirklich ist. Arbeite dich Konto für
Konto durch – jedes Konto verrät (leider) den Zugang zum nächsten.

Am Ende will ich wissen, ob man bis zum Konto des Chefs kommt.

Jeder Zugang, den du findest, ist ein Code KLY{…}. Trag ihn in die App ein
und melde dich damit als nächster Benutzer an:  ssh BENUTZER@localhost

Viel Erfolg!
T
cat > $H/post/02-meier.txt <<T
Von: Heike Meier (Einkauf)
Betreff: dein Zugang zu meinem Konto

Hi! Damit du meine Unterlagen prüfen kannst: Mein Passwort hab ich dir an die
Pinnwand an deinem Schreibtisch geheftet. Die siehst du nicht sofort – die
hängt etwas versteckt. ;-)
Benutzername: meier
T
echo "Keine neuen Aufgaben." > $H/schreibtisch/ablage/todo.txt
printf 'Zettel von Heike:\nmeier / %s\n' "$L1" > $H/schreibtisch/.pinnwand/zettel.txt
as azubi $H

# ---------- Level 1 · meier: Verlauf verrät Passwort
H=/home/meier; mkdir -p $H/einkauf
printf 'Bestellung Paletten: 40 Stück\nBestellung Folie: 12 Rollen\n' > $H/einkauf/bestellungen.txt
cat > $H/einkauf/notiz.txt <<T
Notiz an mich: Ich hab gestern versehentlich das Lager-Passwort direkt in die
Befehlszeile getippt statt in die Passwortabfrage. Hoffentlich merkt sich die
Shell so was nicht...
T
cat > $H/.bash_history <<T
ls
cd einkauf
cat bestellungen.txt
cd
su lager
$L2
clear
ls -la
exit
T
as meier $H

# ---------- Level 2 · lager: die eine Zeile im Bestand
H=/home/lager
python3 - "$H/bestand.csv" "$L3" <<'P'
import random, sys
random.seed(7)
names = ['Palette', 'Karton S', 'Karton M', 'Karton L', 'Klebeband', 'Folie', 'Etikett', 'Gurt', 'Kantenschutz', 'Luftpolster']
rows = ['artikel;bezeichnung;bestand;notiz']
spec = random.randint(400, 1600)
for i in range(1, 2001):
    stock = -3 if i == spec else random.randint(0, 900)
    note = f'Zugang Sicherungskonto sicherung: {sys.argv[2]}' if i == spec else random.choice(['', '', 'ok', 'nachbestellen', 'geprüft'])
    rows.append(f'A{i:05d};{random.choice(names)};{stock};{note}')
open(sys.argv[1], 'w').write('\n'.join(rows) + '\n')
P
cat > $H/LIESMICH.txt <<T
Inventur-Hinweis: Irgendwo in bestand.csv ist ein Artikel mit NEGATIVEM Bestand.
Das kann eigentlich nicht sein. Der Kollege hat in die Notiz-Spalte geschrieben,
was los ist. 2000 Zeilen von Hand durchsehen? Lieber nicht.
T
as lager $H

# ---------- Level 3 · sicherung: Freitag, der 13.
H=/home/sicherung; mkdir -p /srv/sicherungen; W=$(mktemp -d)
for d in $(seq -w 1 31); do
  mkdir -p $W/daten
  if [ "$d" = "13" ]; then printf 'Druckerkonto druck: %s\n' "$L4" > $W/daten/zugang.txt
  else printf 'Druckerkonto druck: (kein Zugang hinterlegt)\n' > $W/daten/zugang.txt; fi
  printf 'Sicherung vom 2026-10-%s\n' "$d" > $W/daten/info.txt
  tar -czf /srv/sicherungen/sicherung-2026-10-$d.tar.gz -C $W daten; rm -rf $W/daten
done
rmdir $W
chown -R root:sicherung /srv/sicherungen; chmod 750 /srv/sicherungen; chmod 640 /srv/sicherungen/*
cat > $H/LIESMICH.txt <<T
Die täglichen Sicherungen liegen in /srv/sicherungen.
Der Drucker-Zugang wurde nur EINMAL gesichert – an einem Freitag, dem 13.
Tipp vom alten Admin: Archive nie im Sicherungsordner auspacken, sondern in
einem eigenen Arbeitsordner (z. B. mktemp -d).
T
as sicherung $H

# ---------- Level 4 · druck: Was ist das für eine Datei?
H=/home/druck; mkdir -p $H/warteschlange
SPECIAL=$(( (RANDOM % 40) + 1 ))
for i in $(seq -w 1 40); do
  if [ "$((10#$i))" = "$SPECIAL" ]; then
    printf 'Druckauftrag (Text, komprimiert)\nNachtschicht-Konto nacht: %s\n' "$L5" | gzip -c > $H/warteschlange/auftrag-$i
  else
    head -c $(( 300 + RANDOM % 900 )) /dev/urandom > $H/warteschlange/auftrag-$i
  fi
done
cat > $H/LIESMICH.txt <<T
Der Drucker spinnt: Die Warteschlange ist voller Datenmüll. Nur EIN Auftrag ist
echt – aber er wurde komprimiert abgelegt und hat keine Dateiendung.
Linux verrät dir, was in einer Datei steckt, auch ohne Endung.
T
as druck $H

# ---------- Level 5 · nacht: Passwort in der Prozessliste
H=/home/nacht
cat > $H/LIESMICH.txt <<T
Der Synchronisierungsjob der Nachtschicht läuft gerade auf diesem Server.
Er meldet sich als Admin an. Wie er das Passwort bekommt? Ich glaube, es wird
ihm beim Start einfach mitgegeben... Laufende Programme kann man sich ansehen.
T
as nacht $H
mkdir -p /opt/nachtjob
cat > /opt/nachtjob/sync.py <<'P'
import sys, time
while True:
    time.sleep(3600)
P
chmod 755 /opt/nachtjob /opt/nachtjob/sync.py

# ---------- Level 6 · admin: Gruppenrechte
groupadd wartung; usermod -aG wartung admin
H=/home/admin
cat > $H/LIESMICH.txt <<T
Admin-Übergabe: Ich bin jetzt zusätzlich in der Gruppe „wartung“. Irgendwo im
System liegt eine Datei, die nur diese Gruppe lesen darf – darin der Zugang
für den Entwickler (dev). Wo genau? Hab ich vergessen. Das ganze System ist groß.
T
as admin $H
mkdir -p /var/lib/.wartungsdienst/cfg
printf 'Wartungskonto Entwicklung\ndev / %s\n' "$L7" > /var/lib/.wartungsdienst/cfg/zugang.conf
chown -R root:wartung /var/lib/.wartungsdienst; chmod 750 /var/lib/.wartungsdienst /var/lib/.wartungsdienst/cfg
chmod 640 /var/lib/.wartungsdienst/cfg/zugang.conf

# ---------- Level 7 · dev: Git vergisst nichts
H=/home/dev; R=$H/lagerapp; mkdir -p $R
cd $R
git init -q -b main
git config user.name "Dev Brenner"; git config user.email "dev@brenner.example"
printf '# Lager-App\nInterne Anwendung (ÜBUNG).\n' > README.md
git add README.md; GIT_COMMITTER_DATE="2026-09-01T10:00:00" git commit -q --date="2026-09-01T10:00:00" -m "Projekt angelegt"
printf 'server=localhost\ndeploy_user=deploy\ndeploy_pass=%s\n' "$L8" > config.ini
git add config.ini; GIT_COMMITTER_DATE="2026-09-03T15:20:00" git commit -q --date="2026-09-03T15:20:00" -m "Konfiguration für Deployment"
printf 'server=localhost\ndeploy_user=deploy\ndeploy_pass=GEHEIM\n' > config.ini
git add config.ini; GIT_COMMITTER_DATE="2026-09-04T09:05:00" git commit -q --date="2026-09-04T09:05:00" -m "Ups – Passwort entfernt"
printf 'def main():\n    print("Lager-App")\n' > app.py
git add app.py; GIT_COMMITTER_DATE="2026-09-10T11:00:00" git commit -q --date="2026-09-10T11:00:00" -m "Startdatei"
cd /
cat > $H/LIESMICH.txt <<T
Der Kollege hat das Deployment-Passwort aus der config.ini gelöscht. Jetzt steht
da nur noch GEHEIM. Er meint, damit sei das Problem erledigt. Ist es das?
T
as dev $H

# ---------- Level 8 · deploy: SSH-Schlüssel
H=/home/deploy; mkdir -p $H/.ssh /home/chef/.ssh
ssh-keygen -q -t ed25519 -N "" -C "chef@keller" -f $H/.ssh/chef_schluessel
cp $H/.ssh/chef_schluessel.pub /home/chef/.ssh/authorized_keys
chmod 700 $H/.ssh /home/chef/.ssh; chmod 600 $H/.ssh/chef_schluessel /home/chef/.ssh/authorized_keys
cat > $H/LIESMICH.txt <<T
Der Chef hat kein Passwort – er meldet sich nur per Schlüssel an. Für die
automatische Verteilung liegt eine Kopie seines Schlüssels hier im Konto.
(Ob das eine gute Idee war?)
T
as deploy $H

# ---------- Level 9 · chef: interner Dienst
H=/home/chef; mkdir -p $H/.config
cat > $H/willkommen.txt <<T
Willkommen im Konto des Chefs. Du hast es bis ganz oben geschafft!
Code für die App: $L9

Eine Sache noch: Auf diesem Server läuft ein interner Dienst nur für den Chef,
auf Port 7070 (nur von diesem Server aus erreichbar). Er will ein Token sehen.
T
printf '# Zugang interner Dienst\nheader=X-Chef-Token\ntoken=%s\n' "$(printf '%s' "$TOKEN:w2:dienst" | sha256sum | cut -c1-24)" > $H/.config/dienst.conf
as chef $H

# Hintergrunddienste (unprivilegiert)
DIENST_TOKEN=$(printf '%s' "$TOKEN:w2:dienst" | sha256sum | cut -c1-24)
useradd -r -s /usr/sbin/nologin dienst
chmod 711 /opt/keller
# Token und Code liegen in einer Datei, die nur der Dienstbenutzer lesen kann (nicht in der Prozessliste).
install -o dienst -m 400 /dev/null /opt/keller/dienst.geheim
printf '%s\n%s\n' "$DIENST_TOKEN" "$L10" > /opt/keller/dienst.geheim
cat > /opt/keller/dienst.py <<'P'
import http.server
TOK, FLAG = open('/opt/keller/dienst.geheim').read().split()
class H(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_GET(self):
        ok = self.headers.get('X-Chef-Token') == TOK
        body = (f'Interner Dienst: Zugriff erlaubt.\nAbschluss-Code: {FLAG}\n' if ok else 'Interner Dienst: Token fehlt oder falsch (erwartet Header X-Chef-Token).\n').encode()
        self.send_response(200 if ok else 403); self.send_header('Content-Type', 'text/plain; charset=utf-8')
        self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)
    do_HEAD = do_GET
http.server.HTTPServer(('127.0.0.1', 7070), H).serve_forever()
P
chmod 644 /opt/keller/dienst.py
runuser -u dienst -- env -i PATH=/usr/bin:/bin python3 /opt/keller/dienst.py >/dev/null 2>&1 &
runuser -u admin -- env -i PATH=/usr/bin:/bin python3 /opt/nachtjob/sync.py --benutzer admin --passwort "$L6" >/dev/null 2>&1 &

# SSH absichern: nur Passwort/Schlüssel-Login, keine Weiterleitungen, kein root
cat > /etc/ssh/sshd_config.d/keller.conf <<C
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
echo "kly-keller: Kellerserver bereit. Anmelden: ssh azubi@127.0.0.1 -p 2220 (Passwort: azubi)"
exec /usr/sbin/sshd -D -e
