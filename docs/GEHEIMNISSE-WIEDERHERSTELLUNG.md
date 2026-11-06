# Geheimnisse & Wiederherstellung (Notfall-Checkliste)

Stand 06.11.2026. **Enthält bewusst KEINE Passwörter/Schlüssel** – nur, *was* es gibt, *wo* es liegt
und *wie* man es im Notfall wieder herstellt. Die echten Werte gehören in **Bitwarden** und in die
`.env`-Dateien auf dem Server (Rechte 600, nur root).

> Kurz gesagt: Der **Code** liegt sicher in GitHub, die **Nutzerdaten** in Supabase (+ nächtliche
> Kopie). Das größte Risiko sind die **Server-Geheimnisse unter `/etc/nachtfalter/`** – die sind
> **nicht** in der normalen Webseiten-Sicherung enthalten. Darum diese Liste.

---

## 1. Was ist gesichert – und was nicht?

| Bereich | Wo | In der Sicherung? |
|---|---|---|
| Quellcode (App, Arena, Labs, Deploy) | GitHub `marceldaum-commits/claude` | ✅ GitHub selbst |
| Nutzer-/Kontodaten | Supabase `sxapebxzxmathkvtuuvn` | ✅ nächtlicher `pg_dump` → Plesk → Google Drive |
| Arena-Container/Labs | werden neu gebaut | ➖ egal (reproduzierbar) |
| **Server-Geheimnisse** `/etc/nachtfalter/*.env` | nur auf dem Server | ⚠️ **NICHT** in der vhost-Sicherung |
| Plesk-/Mail-/DNS-Einstellungen | Plesk / Strato | teils (siehe unten) |

**Wichtigster Satz:** Fällt der Server komplett aus und die `/etc/nachtfalter/*.env` sind nirgends
sonst gespeichert, müssen die Schlüssel neu beschafft/erzeugt werden (siehe Spalte „Wiederherstellen").
Darum: **einmal in Bitwarden ablegen** (Abschnitt 4).

---

## 2. Die Geheimnisse im Einzelnen

### a) `/etc/nachtfalter/arena.env`  (Rechte 600, root)
| Variable | Zweck | Kritisch? | Wiederherstellen |
|---|---|---|---|
| `ARENA_GEHEIMNIS` | Hauptschlüssel für die Code-Berechnung (`KLY{…}`) pro Konto | 🔴 **sehr** | Nicht ableitbar. **Muss gesichert sein.** Verlust = neue Codes stimmen nicht mehr mit alten überein. → Bitwarden! |
| `SUPABASE_URL` | Adresse des Supabase-Projekts | 🟢 | Steht im Supabase-Dashboard (Project Settings → API) |
| `SUPABASE_SERVICE_ROLE_KEY` | Vollzugriff auf die DB (nur Server) | 🔴 | Supabase-Dashboard → Project Settings → API → „service_role" neu anzeigen/rotieren |
| `SMTP_PASS` | Passwort Postfach `info@` (Meldungs-Mails) | 🟡 | In Plesk → Mail → `info@` Passwort neu setzen |
| `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`MELDE_AN` | Mailversand-Einstellungen | 🟢 | Standard: `mail.nachtfalter.tech`, `587`, `info@…` |
| `EINLADUNGS…` (Arena-Einladungscode, falls genutzt) | Zugangscode Arena | 🟡 | Frei neu wählbar (dann neu verteilen) |

### b) `/etc/nachtfalter/konto-db.env`  (Rechte 600, root)
| `KONTO_DB_URL` | Postgres-Verbindung für die nächtliche Sicherung (enthält DB-Passwort) | 🟡 | Supabase → Connect → „Session pooler"; DB-Passwort unter Database → Settings neu setzen |

### c) `/etc/nachtfalter/github-token`  (Rechte 600, root)
| GitHub Fine-grained Token | Deploy liest den Branch `live` (nur Contents: Read-only, dieses Repo) | 🟡 | github.com → Settings → Developer settings → Fine-grained tokens → neu erzeugen, Datei ersetzen |

### d) `/etc/nachtfalter/ki.env`  → gehört der **KI-Werkstatt-Sitzung** (nicht anfassen)
API-Schlüssel + Supabase der KI-Werkstatt. Wiederherstellung macht die KI-Sitzung; hier nur erwähnt,
damit nichts vergessen wird.

### e) Supabase Edge Function Secrets (im Supabase-Dashboard, nicht auf dem Server)
`SMTP_*` u. a. für Edge Functions. Dashboard → Edge Functions → Secrets. Wiederherstellen = neu eintragen.

### f) Plesk / Server / Mail / DNS
| Sache | Wo | Wiederherstellen |
|---|---|---|
| Plesk-Admin-Login + 2FA | Plesk | Passwort-Reset über Strato/Server-Konsole; 2FA neu koppeln |
| SSH (Port 2222, Benutzer `marcel`) | Server | Strato-Konsole / Plesk → SSH-Key neu hinterlegen |
| Vorschau-Passwort | `/etc/nachtfalter-web/vorschau.htpasswd` | `htpasswd -c … marcel` als root neu setzen |
| DKIM-Privatschlüssel (Mail) | Plesk → Mail → DKIM | Neu erzeugen und DNS-TXT (default._domainkey) aktualisieren |
| **Google-Drive-Backup-Passwort** (Backup-Verschlüsselung) | Plesk Backup-Manager „Angegebenes Passwort" | 🔴 **Ohne dieses Passwort sind alle verschlüsselten Backups unbrauchbar!** → Bitwarden |

---

## 3. Im Notfall „Server neu" – Reihenfolge

1. **Code**: Repo ist in GitHub – nichts verloren.
2. **Server-Grundeinrichtung**: nach `docs/SERVER-EINRICHTUNG.md`.
3. **Geheimnisse zurückspielen**: `/etc/nachtfalter/arena.env`, `konto-db.env`, `github-token`
   aus Bitwarden wiederherstellen (Rechte 600!). Nicht-gesicherte Schlüssel neu beschaffen (Tabelle oben).
4. **Nutzerdaten**: letzten `pg_dump` aus Google Drive holen → mit `pg_restore` in Supabase einspielen
   (Schemas `auth` + `public`). Alternativ Supabase-eigenes Point-in-Time, falls Tarif das bietet.
5. **Deploy anstoßen**: `sudo nachtfalter-deploy --force`, dann `sudo nachtfalter-deploy status` prüfen.

---

## 4. „Morgen schnell" – einmalige Absicherung (To-do mit Marcel)

- [ ] **Nächtliche DB-Sicherung läuft?** `sudo nachtfalter-deploy status` → Zeile „Sicherung: konto-<Datum>.dump".
- [ ] **Plesk → Google Drive aktiv + verschlüsselt?** Backup-Manager: Zeitplan an, Ziel Google Drive,
      Passwortart „Angegebenes Passwort". Letzte Sicherung grün?
- [ ] **Backup-Verschlüsselungs-Passwort in Bitwarden?** (sonst sind die Backups im Ernstfall nutzlos)
- [ ] **`/etc/nachtfalter/arena.env` + `konto-db.env` + `github-token` in Bitwarden** (Werte 1:1 kopieren).
- [ ] Prüfen, ob die Plesk-Sicherung **Server-Ebene** (inkl. `/etc`) oder nur den vhost umfasst.
      Falls nur vhost: die drei `.env`-Werte zusätzlich in Bitwarden (Haken oben) genügt als Notnagel.
- [ ] Optional: kurzer Test-`pg_restore` einer Sicherung in ein leeres Supabase-Testprojekt (Vertrauen).

Wenn alle Haken sitzen, ist der Server gegen Totalausfall abgesichert: Code (GitHub) + Daten (Google Drive)
+ Geheimnisse (Bitwarden) lassen sich alle wieder zusammensetzen.
