# KI-Werkstatt

Spielerisches Lernprogramm: Wie funktionieren KI-Assistenten, wie schreibe ich gute Prompts, wo liegt KI daneben?
Läuft auf demselben Server wie die Kali-Arena, aber völlig getrennt (eigener Port, eigene Subdomain, eigener Ordner).

## Missionen

| Mission | KI nötig? | Was man lernt |
|---|---|---|
| 🧠 Wahr oder Mythos? | nein | 12 Behauptungen über KI mit Erklärungen |
| ✂️ Token-Schnipsler | ja (Zählen ist kostenlos) | Wie KI Text in Tokens zerlegt |
| ✍️ Prompt-Werkstatt | ja | 4 Aufgaben, ein KI-Trainer bewertet Rolle, Ziel, Kontext, Format |
| 🎲 Würfel-Labor | ja | Gleiche Frage dreimal – Zufall in KI-Antworten |
| 🕵️ Halluzinations-Detektiv | nein | Erfundene Fakten, Quellen und Rechenfehler finden |
| 🎭 Persönlichkeits-Baukasten | ja | Eigenen System-Prompt schreiben und mit dem Bot chatten |

XP und Rang werden nur im Browser gespeichert.

## Absprachen mit der Kali-Arena (gleicher Server)

| | KI-Werkstatt | Kali-Arena |
|---|---|---|
| Port (nur 127.0.0.1) | **8100** | 8090 |
| Subdomain | `ki.<domain>` | `arena.<domain>` |
| Ordner | `~/ki-lernen` | `~/kly-labs` |
| Docker | nicht nötig | Container mit Label `kly.arena` |
| Last | nur API-Aufrufe, < 512 MB RAM | bis ~5 GB bei 20 Spielern |

## Kosten und Schutz

- Der API-Schlüssel steht **nur** in `~/ki-lernen/.env` auf dem Server, nie im Browser oder im Repo.
- Ohne **Einladungscode** keine KI-Anfragen.
- **Monatsbudget pro Code** (`BUDGET_USD_PER_CODE`, Standard 2 $). Verbrauch steht in `data/usage.json`.
- Höchstens 12 KI-Anfragen pro Minute und 3 gleichzeitige Anfragen pro Code; Antworten auf 2000 Tokens begrenzt.
- Abgebrochene Antworten werden geschätzt verbucht, damit Abbrechen das Budget nicht umgeht.
- Nach 10 falschen Codes sperrt die App die IP für 15 Minuten (echte IP über `X-Forwarded-For`, nur vom lokalen Proxy).
- Prompts werden nicht gespeichert oder geloggt; Fehlermeldungen an den Browser sind allgemein gehalten.

## Kinder und Datenschutz

- Die App zeigt vor der ersten KI-Mission einen Hinweis: Eingaben gehen an Anthropic (Claude-API), keine echten Namen,
  Adressen, Schulen oder Fotos eingeben.
- Der System-Prompt verlangt altersgerechte Antworten und fragt nie nach persönlichen Daten.
- **Vor dem Einsatz mit Minderjährigen:** Die Nutzungsrichtlinien von Anthropic stellen zusätzliche Anforderungen an
  Angebote für Minderjährige. Bitte die aktuelle Fassung lesen (anthropic.com/legal/aup) und prüfen, ob eine Begleitung
  durch Erwachsene und ggf. Einwilligung der Eltern nötig ist.
- Standardmodell `claude-opus-5-5` mit niedrigem Aufwand (`effort: low`). Für viele Tester ist `claude-haiku-5-5`
  etwa 40-mal günstiger – einfach `KI_MODEL` in `.env` ändern.
- Lehnt die KI eine Anfrage aus Sicherheitsgründen ab, springt automatisch ein Ersatzmodell ein (`fallbacks: "default"`).

## Einrichten auf dem Plesk-Server

1. **Node.js 22 LTS** (mindestens 20.6 wegen `--env-file`) installieren (Plesk: Erweiterung „Node.js“ oder per Paketverwaltung).
2. Code nach `~/ki-lernen` bringen (nur dieser Ordner aus dem Repo) und `npm ci --omit=dev` ausführen.
3. `cp .env.example .env`, API-Schlüssel und Einladungscodes eintragen (Codes mit `openssl rand -hex 8` erzeugen), `chmod 600 .env`.
4. Test: `npm start` → `curl http://127.0.0.1:8100/api/status` muss `"ki":true` zeigen.
5. Dauerbetrieb: `ki-werkstatt.service` anpassen und als systemd-Dienst einrichten (Anleitung in der Datei).
6. In Plesk die **Subdomain `ki.<domain>`** anlegen, **Let's Encrypt** einschalten.
7. Unter *Apache & nginx-Einstellungen* der Subdomain bei „Zusätzliche nginx-Anweisungen“ eintragen:

   ```nginx
   location / {
       proxy_pass http://127.0.0.1:8100;
       proxy_http_version 1.1;
       proxy_set_header Host $host;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_buffering off;          # Live-Text der KI nicht puffern
       proxy_read_timeout 120s;
   }
   ```

   (Falls Plesk meldet, dass `location /` schon existiert: „Proxy-Modus“ deaktivieren bzw. nur nginx verwenden.)

## Entwickeln

```bash
npm install
npm test        # Tests mit nachgebauter API – kein Schlüssel, keine Kosten
npm start       # http://127.0.0.1:8100 (liest .env, falls vorhanden)
```
