# Umzug & Portabilität (schnell auf einen neuen Server)

Stand 06.11.2026. Ziel: Wenn Nachtfalter wächst, können wir **schnell und ohne Datenverlust** auf einen
stärkeren/anderen Server umziehen. Grundsatz: **Der Server ist „wegwerfbar".** Alles Wichtige liegt woanders.

## Die drei Säulen (was liegt wo)

| Säule | Ort | Beim Umzug |
|---|---|---|
| **Code** (App, Arena, Labs, Deploy, Zentrale) | GitHub `marceldaum-commits/claude` | nichts zu tun – wird neu geklont |
| **Daten + Edge Functions + Auth** | Supabase (Frankfurt, verwaltet) | bleibt, wo es ist – **kein** Umzug nötig |
| **Server** (nginx/Plesk, Docker-Labs, Dienste) | der Plesk-Server | wird auf dem neuen Server **neu aufgebaut** |

Heißt: Ein Serverausfall oder -wechsel kostet **keine Nutzerdaten** (die sind in Supabase) und **keinen Code**
(der ist in GitHub). Nur die Laufzeit-Umgebung wird neu hochgezogen.

## Umzug in Kurzform (neuer Server)

1. **Grundeinrichtung** nach `docs/SERVER-EINRICHTUNG.md` (Pakete, Docker, Node, Benutzer `claude`/`nachtfalter`).
2. **Geheimnisse** aus Bitwarden zurückspielen (siehe `docs/GEHEIMNISSE-WIEDERHERSTELLUNG.md`):
   `/etc/nachtfalter/arena.env`, `konto-db.env`, `github-token` (Rechte 600).
3. **Deploy-Skript** einspielen und starten: `sudo nachtfalter-deploy --force`.
   Es klont `live`, baut App/Arena/Zentrale, erzeugt die nginx-Bausteine aus `_headers`, startet alles.
4. **Plesk-vhosts** anlegen (www/app/arena/ki/zentrale/vorschau), Let's Encrypt, die nginx-Includes
   `include /etc/nachtfalter-web/<seite>.conf;` eintragen (wie in SERVER-EINRICHTUNG.md beschrieben).
5. **DNS umstellen** (Cloudflare): A-Records `*.nachtfalter.tech` → neue Server-IP.
6. **Mail**: SPF-Record (`ip4:<neue IP>`), PTR beim Hoster, DKIM neu, 587 in der Firewall öffnen.
7. **Prüfen**: `sudo nachtfalter-deploy status`, `arena.nachtfalter.tech/api/gesundheit`, Testlogin.

Mit vorbereiteten Geheimnissen dauert das grob **1–2 Stunden**, nicht Tage.

## Die Umzugs-„Stolpersteine" (hier klebt Server-Spezifisches)

Nur an diesen Stellen steht etwas Hartverdrahtetes, das beim Umzug angefasst werden muss:
- **DNS** (Cloudflare): IP der Subdomains.
- **SPF-TXT** + **PTR**: enthalten die Server-IP (aktuell `217.160.61.73`).
- **Plesk**: vhosts, Zertifikate, Mailpostfach `info@`, Backup-Manager → Google Drive.
- **Secrets** unter `/etc/nachtfalter/` (nicht im Repo, nicht in Supabase).

Alles andere (Pfade `/opt/nachtfalter`, `/etc/nachtfalter-web`, Docker-Labs) ist generisch und wird vom
Deploy-Skript selbst erzeugt.

## Bau-Regeln, damit das so bleibt (beim Weiterbauen beachten)

1. **Keine Nutzerdaten lokal halten.** Alles, was bleiben muss, gehört in **Supabase**, nicht in eine Datei
   im Container oder auf die Server-Platte. Lab-Container sind **stateless** (werden neu gebaut).
2. **Keine Server-IP/absoluten Pfade im Code.** Adressen kommen aus `config.js` / `.env` / `_headers`,
   nicht fest in JS/HTML.
3. **Neue Dienste immer ins Deploy-Skript integrieren** (selbst-einrichtend), nie „von Hand auf dem Server".
   So zieht ein `nachtfalter-deploy --force` auf jedem Server denselben Stand hoch.
4. **Neue Geheimnisse** → in `docs/GEHEIMNISSE-WIEDERHERSTELLUNG.md` eintragen (Name/Ort), Wert nur in
   Bitwarden + `.env`.
5. **Neue Supabase-Tabellen/Functions** → als SQL-Datei/Function im Repo ablegen (wie `konto-schema.sql`,
   `ki-nutzung-schema.sql`), damit ein Nachbau reproduzierbar ist.
6. **DB-Sicherung muss laufen** (nächtlicher `pg_dump` → Google Drive). Vor jedem größeren Schritt:
   `sudo nachtfalter-deploy status` → Zeile „Sicherung".

## Noch offen / später (für echtes Wachstum)

- Regelmäßigen **Test-Restore** der DB-Sicherung in ein leeres Supabase-Testprojekt (Vertrauen schaffen).
- Optional **Infrastruktur-als-Code** (ein `einrichten.sh`, das SERVER-EINRICHTUNG.md Schritt 1–4 automatisiert).
- Bei viel Last: Arena-Container-Limits/Anzahl erhöhen, ggf. zweiter Arena-Host hinter demselben Konto.
