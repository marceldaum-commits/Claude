# Arena – Online-Labs für Kali Level Up

Startet für jeden Spieler einen **eigenen, abgeschotteten Lab-Container** (zuerst: der Kellerserver) und verbindet
ihn mit einem **Terminal im Browser** (xterm.js über WebSocket). Spieler brauchen kein Kali und keine Installation.

```
Browser ──HTTPS──▶ Caddy ──▶ Arena (Node.js) ──Docker-API──▶ Container pro Spieler (Netzwerk „none“)
```

## Sicherheit (Stand: Gerüst – vor öffentlichem Betrieb fachlich prüfen lassen)
- **Kein Netzwerk** im Lab-Container (`NetworkMode: none`): nur localhost – kein Internet, kein Kontakt zu anderen Spielern.
- Capabilities auf das Nötigste reduziert, `no-new-privileges`, Grenzen für RAM (256 MB), CPU (0,5) und Prozesse (128),
  `/tmp` als kleines tmpfs ohne Ausführung.
- Automatisches Löschen nach 120 Minuten bzw. 20 Minuten ohne Eingabe, verwaiste Container werden aufgeräumt.
- Obergrenzen: gleichzeitige Labs insgesamt und pro IP. Zugang in der Beta nur mit Einladungscode.
- **Wichtig:** Die Arena braucht den Docker-Socket – das ist root-ähnlicher Zugriff auf den Server. Deshalb nur auf
  einem **eigenen Lab-Server** betreiben (nie neben Webseite/Plesk). Nächste Ausbaustufe: Socket-Proxy mit
  eingeschränkter API oder rootless Docker.

Gemessen: ein Kellerserver braucht im Leerlauf ca. 16 MB RAM – ein Server mit 16 GB trägt weit über 100 gleichzeitige Labs.

## Einrichtung auf dem Server (Debian/Ubuntu)
```bash
# 1. Docker
sudo apt update && sudo apt install -y docker.io docker-compose-v2 git
sudo usermod -aG docker $USER   # danach neu anmelden

# 2. Firewall: nur SSH, HTTP, HTTPS
sudo apt install -y ufw && sudo ufw allow OpenSSH && sudo ufw allow 80,443/tcp && sudo ufw enable

# 3. Code holen und Lab-Abbild bauen
git clone <REPO-URL> kly && cd kly
docker build -t kly-keller labs/kly-keller

# 4. Arena konfigurieren und starten
cd arena && cp .env.example .env && nano .env      # Domain + Einladungscode eintragen
docker compose up -d --build
docker compose logs -f arena                        # „Arena lauscht …“
```
Vorher bei deinem DNS-Anbieter einen A-Eintrag `labs.deine-domain.de → IP des Servers` anlegen – Caddy holt dann
automatisch ein HTTPS-Zertifikat.

Zum Schluss in der App `config.js` → `arenaUrl: 'https://labs.deine-domain.de'` eintragen. Dann zeigt der
Kellerserver-Raum den Knopf **„Online spielen“** (und er erscheint auch im Modus „Nur im Browser“).

## Lokal testen
```bash
npm install
docker build -t kly-keller ../labs/kly-keller
ARENA_CODE=test node server.js        # http://127.0.0.1:8090/?lab=keller&token=KLY-ABC123
ARENA=http://127.0.0.1:8090 CODE=test node test/smoke.mjs
```
Der Rauchtest prüft: falscher Code/Token abgewiesen, Lab startet, Terminal als azubi, Codes passen zum Token,
`ssh` zwischen Konten, nur localhost-Netz, kein Internet, Token in der Umgebung von PID 1 nicht lesbar.

## Zugang über das Nachtfalter-Konto (ab 2.23.0)

Spieler melden sich in der Arena mit ihrem Nachtfalter-Konto an. Ein Lab startet nur, wenn das Konto einen gültigen
Zugang `arena` oder `alles` hat (vergeben in der Zentrale oder per Einladungscode, der direkt in der Arena eingelöst
werden kann). Der Server prüft das Token beim Supabase-Auth-Server und liest Zugänge/Sperre mit dem Token des Spielers
(RLS) – er braucht dafür **kein Geheimnis**, nur die öffentliche Adresse und den öffentlichen Schlüssel.

Umgebungsvariablen: `KONTO=1` (Standard), `KONTO_URL`, `KONTO_KEY`, `MAX_PER_USER` (Standard 2).
Der alte Einladungscode `ARENA_CODE` funktioniert übergangsweise weiter, solange er gesetzt ist.
