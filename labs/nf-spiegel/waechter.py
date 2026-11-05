import socket, threading, os, re

# „Der Spiegel“ (Purple Team): erst angreifen, dann dieselbe Lücke schließen.
# Rot-Codes (Stufe 1, 3) findet der Spieler, indem er die Lücke AUSNUTZT (offene Datei lesen,
# offenen Dienst ansprechen). Blau-Codes (Stufe 2, 4, 5) gibt dieser Prüfdienst, wenn die Lücke
# GESCHLOSSEN ist. Der Dienst läuft als 'pruef' und kennt nur die Blau-Codes.

CODES = {}
try:
    for z in open('/opt/spiegel/codes'):
        if ':' in z:
            k, v = z.strip().split(':', 1); CODES[k] = v
except Exception:
    pass
try:
    SP = open('/opt/spiegel/sprache').read().strip()
except Exception:
    SP = 'de'
if SP not in ('de', 'en'):
    SP = 'de'

PASS = '/opt/firma/passwoerter.txt'   # Stufe 1/2: zu offene Datei
BASHRC = '/home/admin/.bashrc'        # Stufe 5: Hintertür
PORT = 2525                           # Stufe 3/4: offener Dienst
MARKE = 'kly-autostart'


def mode(path):
    try:
        return os.stat(path).st_mode & 0o777
    except Exception:
        return None


def c_perm():   # Stufe 2: passwoerter.txt für Gruppe/andere nicht mehr lesbar
    m = mode(PASS)
    return m is not None and (m & 0o077) == 0


def c_port():   # Stufe 4: offener Dienst auf 2525 gestoppt
    hexport = f':{PORT:04X}'.encode()
    for f in ('/proc/net/tcp', '/proc/net/tcp6'):
        try:
            for line in open(f, 'rb').read().splitlines()[1:]:
                p = line.split()
                if len(p) > 3 and p[1].endswith(hexport) and p[3] == b'0A':
                    return False
        except Exception:
            pass
    return True


def c_door():   # Stufe 5: Hintertür-Autostart aus ~/.bashrc entfernt
    try:
        return MARKE not in open(BASHRC, encoding='utf-8', errors='replace').read()
    except Exception:
        return True


ROT = {
 'de': ['🔴 Angriff: lies die zu offene Datei /opt/firma/passwoerter.txt (dort steht dein Code).',
        '🔴 Angriff: sprich den offenen Dienst an → nc 127.0.0.1 2525 (er verrät dir den Code).'],
 'en': ['🔴 Attack: read the too-open file /opt/firma/passwoerter.txt (your code is inside).',
        '🔴 Attack: talk to the open service → nc 127.0.0.1 2525 (it reveals the code).'],
}
BLAU = {
 'de': [('🔵 Abwehr: mach die Passwortdatei dicht (chmod 600).', c_perm),
        ('🔵 Abwehr: stoppe den unnötigen Dienst auf Port 2525 (kill).', c_port),
        ('🔵 Abwehr: entferne die Hintertür-Zeilen („kly-autostart") aus ~/.bashrc.', c_door)],
 'en': [('🔵 Defense: lock down the password file (chmod 600).', c_perm),
        ('🔵 Defense: stop the unnecessary service on port 2525 (kill).', c_port),
        ('🔵 Defense: remove the backdoor lines ("kly-autostart") from ~/.bashrc.', c_door)],
}
KOPF = {'de': 'DER SPIEGEL – Stand\n', 'en': 'THE MIRROR – status\n'}
GEL = {'de': '✓ geschlossen', 'en': '✓ closed'}
OFF = {'de': '✗ noch offen', 'en': '✗ still open'}
HOL = {'de': '→ selbst holen (siehe oben)', 'en': '→ get it yourself (see above)'}


def bericht():
    rot = ROT.get(SP, ROT['de']); blau = BLAU.get(SP, BLAU['de'])
    out = [KOPF.get(SP, KOPF['de'])]
    # Stufe 1 (rot), 2 (blau), 3 (rot), 4 (blau), 5 (blau)
    out.append(f'  Stufe 1  {rot[0]}\n    {HOL[SP]}')
    ok2 = safe(blau[0][1]); out.append(f'  Stufe 2  {blau[0][0]}\n    ' + (f'{GEL[SP]} → {CODES.get("l2","KLY{????}")}' if ok2 else OFF[SP]))
    out.append(f'  Stufe 3  {rot[1]}\n    {HOL[SP]}')
    ok4 = safe(blau[1][1]); out.append(f'  Stufe 4  {blau[1][0]}\n    ' + (f'{GEL[SP]} → {CODES.get("l4","KLY{????}")}' if ok4 else OFF[SP]))
    ok5 = safe(blau[2][1]); out.append(f'  Stufe 5  {blau[2][0]}\n    ' + (f'{GEL[SP]} → {CODES.get("l5","KLY{????}")}' if ok5 else OFF[SP]))
    return '\n'.join(out) + '\n'


def safe(fn):
    try:
        return fn()
    except Exception:
        return False


def diener():
    srv = socket.socket(); srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind(('127.0.0.1', 8200)); srv.listen(8)
    def kunde(c):
        try:
            c.recv(64); c.sendall(bericht().encode())
        except Exception:
            pass
        try: c.close()
        except Exception: pass
    while True:
        c, _ = srv.accept(); threading.Thread(target=kunde, args=(c,), daemon=True).start()


if __name__ == '__main__':
    diener()
