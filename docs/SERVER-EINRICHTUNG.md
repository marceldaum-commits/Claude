# Einrichtung des Nachtfalter-Servers (zweiter Server, ohne Kundendaten)

Stand 03.11.2026. Grundlage: Erfahrungsbericht aus einer früheren Server-Einrichtung, hier angepasst
an Nachtfalter (Arena, KI-Werkstatt, Konto).

## Grundregeln

- **Nur lesen, dann ändern.** Jeder ändernde Befehl wird vorher in einem Satz erklärt. Immer nur ein Schritt,
  Screenshot abwarten.
- **Keine Geheimnisse im Chat oder auf Screenshots** (API-Schlüssel, Supabase-Secret, Passwörter). Schlüssel trägt
  Marcel selbst in Dateien ein. Vor Screenshots prüfen, dass kein Schlüssel sichtbar ist.
- **Lab-Umgebungen nie auf einem Rechner mit Kundendaten** (Entscheidung 02.11.). Dieser Server ist nur für
  Nachtfalter.
- **Kein Plesk-Git** (hat am 01.11. den anderen Server zweimal lahmgelegt). Updates per kleinem Pull-Skript
  über die GitHub-API aus dem Branch `live`.
- Belastende Vorgänge (Docker-Images bauen, große Downloads) erst nach Stabilitätsprüfung.

## Reihenfolge

1. **Lesen** (Plesk SSH-Terminal, läuft als root): `cat /etc/os-release`, `df -h`, `free -h`, `nproc`,
   `command -v docker node tmux setfacl`, laufende Dienste, offene Ports (`ss -tlnp`).
2. **Backup prüfen** (Tools & Einstellungen → Backup-Manager): Serverebene, Zeitplan, Ziel, Passwortart
   „Angegebenes Passwort“ (in Bitwarden). Für diesen Server: Konfiguration und `.env`-Dateien wichtig,
   Lab-Container nicht (werden neu gebaut).
3. **Grundpakete** (als root, einmalig): `acl`, `tmux`, Docker Engine + Compose aus dem Docker-Repository,
   Node.js 22 LTS. Firewall: nach außen nur 22, 80, 443 (+ Plesk 8443).
4. **Benutzer und Rechte**
   - `claude`: Arbeitsbenutzer für Claude Code. Kein Root. Ob er `sudo` für eine Liste fester Befehle
     (z. B. `systemctl restart nachtfalter-*`) bekommt, entscheidet Marcel; jede Ausführung muss er ohnehin
     in der App freigeben.
   - `nachtfalter`: Dienstbenutzer für Arena und KI-Werkstatt (Ordner `/opt/nachtfalter`).
     Arena braucht Zugriff auf den Docker-Socket (= root-ähnlich) → nur dieser Dienstbenutzer, nicht `claude`.
   - ACLs nach dem Muster des Leitstands, Webspace-Benutzer per `stat -c %U` ermitteln, nicht abtippen.
5. **Claude Code** im Benutzer `claude`: `su - claude -c "curl -fsSL https://claude.ai/install.sh | bash"`,
   PATH in `~/.bashrc`, Arbeitsordner `~/arbeit` (nicht das Home selbst). Anmelden mit `su - claude`, dann
   `cd ~/arbeit && claude`, Ordner vertrauen per **Pfeiltaste** auf „Yes“ (Enter allein = „No, exit“).
6. **Remote Control:** `tmux new -s rc`, darin `cd ~/arbeit && claude remote-control`, Fragen mit `y`.
   Danach **Browserfenster schließen** (Strg+B, D geht im Plesk-Terminal nicht; kein Strg+C).
   Der Server erscheint als „Bridge environment“; beim ersten Zugriff bestätigt Marcel eine Vertrauens-Karte.
7. **Dienste:** Arena (Docker, Port 8090 lokal), KI-Werkstatt (systemd, Port 8100 lokal, `.env` chmod 600),
   Subdomains in Plesk mit Let's Encrypt und nginx-Proxy (WebSocket für Arena, `proxy_buffering off` für KI-SSE,
   `X-Forwarded-For $remote_addr`).
8. **Updates aus GitHub:** Pull-Skript (GitHub-Fine-grained-Token nur Lesen, nur dieses Repository, Datei mit
   Rechten 600 außerhalb von Webordnern), holt Branch `live`, prüft, startet Dienste neu, stellt bei Fehlern den
   alten Stand wieder her. Geplante Aufgabe alle 10 Minuten. Nachweis: kleine Änderung, nach ≤ 10 Min sichtbar.
9. **Domain** `nachtfalter.tech`: DNS zu Cloudflare (Nameserver bei Strato eintragen), `app.` → Cloudflare Pages,
   `arena.`/`ki.`/`ki-vorschau.` → Server-IP, `konto.` → Pages. Access nur noch für Vorschau/Admin.
10. **Prüfen von außen:** nur 22/80/443/8443 offen, HTTPS überall, Dienste nur über Plesk erreichbar.

## Stolpersteine aus dem ersten Server

- Mehrere Zeilen auf einmal einfügen kann `su - claude` doppelt ausführen → Passwortabfrage → Strg+C.
- Dokumentstamm nicht raten: `/var/www/vhosts/system/<domain>/conf/httpd.conf` (DocumentRoot) prüfen.
- Dateien mit Geheimnissen nach dem Anlegen auf 600 setzen (Plesk legt oft 644 an).
- Nach jedem Push Remote prüfen (`git ls-remote`).

## Web-App auf dem eigenen Server (ab 04.11.2026)

- `nachtfalter-deploy` baut die statische App (Hacklab, Konto, Verwaltung) mit `tools/build-deploy.sh`:
  Branch `live` → `/opt/nachtfalter/web/live` (**app.nachtfalter.tech**), Arbeits-Branch → `/opt/nachtfalter/web/vorschau`
  (**vorschau.nachtfalter.tech**). DNS: Platzhalter `*.nachtfalter.tech` zeigt schon auf den Server.
- Sicherheits-Header kommen aus `_headers` und werden als nginx-Baustein `/etc/nachtfalter-web/<seite>.conf` erzeugt
  (streng geprüft, `nginx -t`, bei Fehler alter Baustein zurück). Plesk → Subdomain → Apache & nginx:
  Proxy-Modus aus, zusätzliche nginx-Anweisung: `location ~ ^/ { include /etc/nachtfalter-web/live.conf; }`
  (bzw. `vorschau.conf`).
- Vorschau-Passwort: `htpasswd -c /etc/nachtfalter-web/vorschau.htpasswd marcel` (als root; Passwort nur dort tippen,
  in Bitwarden ablegen). Das Skript setzt die Rechte so, dass nginx die Datei lesen kann.

## Zentrale (ab 04.11.2026)

- **zentrale.nachtfalter.tech**: Kundenverwaltung (`zentrale/`, gebaut mit `tools/build-zentrale.sh`, eigene strenge Header in
  `zentrale/_headers`). Plesk-Anweisung: `location ~ ^/ { include /etc/nachtfalter-web/zentrale.con[f]; }`
  (`[f]` = Muster, damit Plesk nicht meckert, solange die Datei noch fehlt).
- Vorschau der Zentrale: `vorschau.nachtfalter.tech/zentrale/` (aus dem Arbeits-Branch, im Vorschau-Baustein eingebunden).
- Rechte: Edge Function `admin` prüft Anmeldung + Tabelle `admins` („Verwaltung“); jede Änderung landet in `admin_log`,
  Notizen in `kunden_notizen` (beide ohne Policies, nur für den Dienst).

## Konto-Daten (Supabase, kostenloser Tarif)

- Kostenlose Projekte werden nach 7 Tagen ohne Nutzung pausiert → `nachtfalter-deploy` ruft einmal täglich Auth und
  Datenbank auf (Stand in `nachtfalter-deploy status` unter „Konto-Ping“).
- Supabase sichert im kostenlosen Tarif nichts zum Herunterladen → nächtliche Sicherung per `pg_dump` (Schemas `auth`
  und `public`) nach `/var/www/vhosts/nachtfalter.tech/private/konto-sicherung/` (14 Tage, nur root lesbar); von dort
  nimmt sie das Plesk-Backup verschlüsselt mit nach Google Drive. Einrichtung (einmalig, als root):
  1. `apt install -y postgresql-client`
  2. Supabase → Projekt → **Connect** → „Session pooler“ → URI kopieren (Datenbank-Passwort ggf. unter
     Database → Settings neu setzen, in Bitwarden ablegen).
  3. `install -m 600 /dev/null /etc/nachtfalter/konto-db.env && nano /etc/nachtfalter/konto-db.env` →
     eine Zeile `KONTO_DB_URL=postgresql://…` eintragen, speichern.
  4. Die Sicherung läuft dann zwischen 2 und 5 Uhr; Ergebnis in `nachtfalter-deploy status` („Sicherung“).
