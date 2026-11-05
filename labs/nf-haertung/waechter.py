import socket, threading, os, re

# „Die Härtung“ (Blue Team): Der Prüfdienst läuft als Benutzer 'pruef' und kennt die Codes.
# Er prüft den Systemzustand (Rechte, Konfig, Ports, Autostart, Passwort). Für jede behobene
# Schwachstelle gibt er den zugehörigen Code KLY{…} aus. Der Spieler kann die Codes nicht
# selbst auslesen (Datei nur für 'pruef' lesbar).

CODES = {}
try:
    for z in open('/opt/haertung/codes'):
        if ':' in z:
            k, v = z.strip().split(':', 1); CODES[k] = v
except Exception:
    pass
try:
    SP = open('/opt/haertung/sprache').read().strip()
except Exception:
    SP = 'de'
if SP not in ('de', 'en'):
    SP = 'de'

# Pfade der absichtlich unsicheren Stellen
SECRET = '/home/admin/geheim.txt'
SCRIPT = '/opt/firma/backup.sh'
SSHCONF = '/home/admin/config/ssh.conf'
BASHRC = '/home/admin/.bashrc'
ENVF = '/home/admin/config/app.env'
PORT = 2323
MARKE = 'kly-autostart'   # Markierung der Hintertür-Zeile in ~/.bashrc
SCHWACH = {'1234', '12345', '123456', 'passwort', 'password', 'admin', 'root', 'geheim', 'qwertz', 'qwerty', '0000', 'firma123'}


def mode(path):
    try:
        return os.stat(path).st_mode & 0o777
    except Exception:
        return None


def c1():  # geheim.txt darf für Gruppe/andere nicht lesbar sein
    m = mode(SECRET)
    return m is not None and (m & 0o077) == 0


def c2():  # backup.sh darf nicht für „andere“ beschreibbar sein
    m = mode(SCRIPT)
    return m is not None and (m & 0o002) == 0


def c3():  # SSH: Root-Login muss aus sein
    try:
        t = open(SSHCONF, encoding='utf-8', errors='replace').read()
    except Exception:
        return False
    if re.search(r'(?mi)^\s*PermitRootLogin\s+yes\b', t):
        return False
    return bool(re.search(r'(?mi)^\s*PermitRootLogin\s+no\b', t))


def c4():  # unnötiger Dienst auf Port 2323 muss gestoppt sein
    hexport = f':{PORT:04X}'.encode()
    for f in ('/proc/net/tcp', '/proc/net/tcp6'):
        try:
            for line in open(f, 'rb').read().splitlines()[1:]:
                p = line.split()
                if len(p) > 3 and p[1].endswith(hexport) and p[3] == b'0A':  # 0A = LISTEN
                    return False
        except Exception:
            pass
    return True


def c5():  # Hintertür-Autostart aus ~/.bashrc entfernt (Markierung weg)
    try:
        t = open(BASHRC, encoding='utf-8', errors='replace').read()
    except Exception:
        return True
    return MARKE not in t


def c6():  # schwaches DB-Passwort ersetzt (>=12 Zeichen, nicht in der Schwachliste)
    try:
        t = open(ENVF, encoding='utf-8', errors='replace').read()
    except Exception:
        return False
    m = re.search(r'(?mi)^\s*DB_PASSWORT\s*=\s*"?([^"\n]*)"?\s*$', t)
    if not m:
        return False
    pw = m.group(1).strip()
    return len(pw) >= 12 and pw.lower() not in SCHWACH


PRUEF = [c1, c2, c3, c4, c5, c6]
TITEL = {
 'de': [
   'Rechte: geheim.txt ist für alle lesbar',
   'Rechte: /opt/firma/backup.sh ist für alle beschreibbar',
   'SSH: Root-Login ist erlaubt (~/config/ssh.conf)',
   'Dienst: unnötiger Dienst lauscht auf Port 2323',
   'Autostart: Hintertür-Zeile in ~/.bashrc',
   'Passwort: schwaches DB-Passwort in ~/config/app.env',
 ],
 'en': [
   'Permissions: geheim.txt is readable by everyone',
   'Permissions: /opt/firma/backup.sh is writable by everyone',
   'SSH: root login is allowed (~/config/ssh.conf)',
   'Service: an unnecessary service listens on port 2323',
   'Autostart: backdoor line in ~/.bashrc',
   'Password: weak DB password in ~/config/app.env',
 ],
}
KOPF = {'de': 'HÄRTUNG – Prüfbericht\n', 'en': 'HARDENING – audit report\n'}
GEL = {'de': '✓ behoben', 'en': '✓ fixed'}
OFF = {'de': '✗ offen', 'en': '✗ open'}
FERTIG = {'de': 'Alles gehärtet! Trag die Codes in der Arena ein.', 'en': 'All hardened! Enter the codes in the arena.'}


def bericht():
    t = TITEL.get(SP, TITEL['de'])
    out = [KOPF.get(SP, KOPF['de'])]
    offen = 0
    for i, fn in enumerate(PRUEF):
        n = i + 1
        try:
            ok = fn()
        except Exception:
            ok = False
        if ok:
            out.append(f'  Stufe {n}: {t[i]}\n    {GEL[SP]} → {CODES.get("l" + str(n), "KLY{????}")}')
        else:
            out.append(f'  Stufe {n}: {t[i]}\n    {OFF[SP]}')
            offen += 1
    if offen == 0:
        out.append('\n' + FERTIG[SP])
    return '\n'.join(out) + '\n'


def diener():
    srv = socket.socket(); srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind(('127.0.0.1', 8200)); srv.listen(8)
    def kunde(c):
        try:
            c.recv(64)
            c.sendall(bericht().encode())
        except Exception:
            pass
        try: c.close()
        except Exception: pass
    while True:
        c, _ = srv.accept(); threading.Thread(target=kunde, args=(c,), daemon=True).start()


if __name__ == '__main__':
    diener()
