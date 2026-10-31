# Private Veröffentlichung mit Cloudflare Pages + Cloudflare Access

Ziel: Die App läuft unter einer festen **https-Adresse** (z. B. `https://kali-level-up.pages.dev`),
ist auf PC und Handy installierbar, synchronisiert über Supabase – und **nur du** kommst hinein.

Dauer: ca. 20 Minuten. Kosten: 0 € (Free-Pläne).

---

## Per API eingerichtet (Stand 31.10.2026)

- **Adresse:** <https://kali-level-up.pages.dev>
- Pages-Projekt `kali-level-up` per *Direct Upload* (wrangler), Produktions-Branch `main`.
  Hochgeladen werden nur die App-Dateien (`KLY_FILES` + `KLY_EXTRA` aus `app-files.js` plus `_headers`) –
  **kein** automatisches Deploy bei `git push`. Neue Version: Ordner mit diesen Dateien bauen und
  `npx wrangler@3 pages deploy <ordner> --project-name=kali-level-up --branch=main`.
- Access-App **„Kali Level Up“** (Teil B2) für `kali-level-up.pages.dev` und `*.kali-level-up.pages.dev`,
  Sitzung 720 h, Policy „Nur ich“ (Allow, eine E-Mail-Adresse).
- Access-App **„Kali Level Up – öffentliche Dateien“** (Teil B3): `kali-level-up.pages.dev/labs` und `/icons`,
  Policy „Öffentlich“ (Bypass, Everyone) – geprüft: `labs/kly-target/server.py` lädt ohne Anmeldung.
- Login-Methode *One-time PIN* musste **im Dashboard** ergänzt werden
  (Integrations → Identity providers, bzw. Settings → Authentication → Login methods).

---

## Teil A – App veröffentlichen (Cloudflare Pages)

1. Auf <https://dash.cloudflare.com> ein Konto anlegen bzw. anmelden.
2. Links **Compute (Workers) → Workers & Pages** → **Create** (Erstellen) → Reiter **Pages** →
   **Connect to Git** (Mit Git verbinden).
   *Wenn Cloudflare nur „Worker erstellen“ anbietet: unten auf „Looking to deploy Pages? Get started“ klicken.*
3. GitHub verbinden und dem Zugriff auf das Repository **`marceldaum-commits/claude`** zustimmen
   (nur dieses Repo auswählen reicht).
4. Repository auswählen → **Begin setup**:
   | Feld | Wert |
   |---|---|
   | Project name | `kali-level-up` (wird Teil der Adresse) |
   | Production branch | `ccr-63912bdd-xpv8bk` (oder `main`, sobald dorthin gemergt) |
   | Framework preset | **None** |
   | Build command | *leer lassen* |
   | Build output directory | `/` |
5. **Save and Deploy**. Nach ca. 1 Minute steht die Adresse da, z. B. `https://kali-level-up.pages.dev`.
   Ist der Name vergeben, hängt Cloudflare etwas an – **merke dir die genaue Adresse**.

> ⚠️ Ab jetzt ist die App kurz öffentlich erreichbar. Direkt mit Teil B weitermachen.
> (Sie enthält keine Lernstände – die liegen im Browser bzw. geschützt in Supabase.)

Jeder spätere `git push` auf den Branch veröffentlicht automatisch eine neue Version.

---

## Teil B – Nur dich hineinlassen (Cloudflare Access)

### B1. Zero Trust einmalig aktivieren

1. Im Cloudflare-Dashboard links **Zero Trust** öffnen.
2. Einen **Team-Namen** wählen (beliebig, z. B. `seppi-lab`).
3. **Free**-Plan wählen (bis 50 Nutzer kostenlos). Cloudflare fragt dabei evtl. nach einer
   Zahlungsmethode zur Verifizierung – beim Free-Plan wird nichts berechnet.

### B2. Die App schützen

1. **Zero Trust → Access → Applications → Add an application → Self-hosted**.
2. **Application name:** `Kali Level Up`
3. **Session duration:** z. B. `1 month` (dann musst du dich selten neu anmelden).
4. **Public hostname / Application domain** – zwei Einträge anlegen:
   - `kali-level-up.pages.dev` (Pfad leer)
   - `*.kali-level-up.pages.dev` (schützt auch Vorschau-Versionen)
5. **Policy hinzufügen:**
   - Name: `Nur ich` · Action: **Allow**
   - Include → Selector **Emails** → **deine E-Mail-Adresse**
6. **Login methods:** **One-time PIN** reicht (Code per E-Mail).
7. Speichern.

### B3. Ausnahme für Lab-Dateien und Icons

Deine Kali-VM holt die Zielmaschinen-Dateien per `curl` – curl kann sich nicht bei Access anmelden.
Die Dateien enthalten nichts Persönliches (deine Flags entstehen erst durch deinen Token beim Start).

1. **Add an application → Self-hosted**, Name: `Kali Level Up – öffentliche Dateien`
2. Domains:
   - `kali-level-up.pages.dev` mit **Path** `labs/`
   - `kali-level-up.pages.dev` mit **Path** `icons/`
3. Policy: Name `Öffentlich`, Action **Bypass**, Include → **Everyone**.
4. Speichern. (Der spezifischere Pfad hat Vorrang vor der Haupt-App.)

### B4. Prüfen

- In einem **privaten Browserfenster** `https://kali-level-up.pages.dev` öffnen →
  Cloudflare-Anmeldeseite muss erscheinen. Code per E-Mail → App öffnet sich. ✅
- `https://kali-level-up.pages.dev/labs/kly-target/README.md` → lädt **ohne** Anmeldung. ✅
- Mit einer anderen E-Mail anmelden → muss **abgelehnt** werden. ✅

---

## Teil C – Supabase auf die neue Adresse einstellen

1. Supabase → **Authentication → URL Configuration**
2. **Site URL:** `https://kali-level-up.pages.dev`
3. **Redirect URLs:** `https://kali-level-up.pages.dev/**` hinzufügen.
4. Speichern.

Danach funktionieren die Links in Bestätigungsmails.

---

## Teil D – Auf den Geräten einrichten

**Handy (Galaxy S23, Chrome oder Samsung Internet):**
1. Adresse öffnen → Access-Code eingeben.
2. **Mehr → Synchronisierung → Anmelden** (bzw. einmalig *Konto anlegen* und Mail bestätigen).
3. Installieren: Chrome-Menü ⋮ → **App installieren** · Samsung Internet: ≡ → **Seite hinzufügen zu → Startbildschirm**.

**PC:** Gleiche Adresse in Chrome/Edge öffnen → anmelden → Installieren-Symbol in der Adressleiste.

**Danach in Supabase:** *Authentication → Sign In / Providers →* „Allow new users to sign up“ **aus**.

---

## Was schützt was?

| Ebene | Schutz |
|---|---|
| Cloudflare Access | Nur deine E-Mail sieht die App überhaupt. |
| Supabase Row Level Security | Selbst mit dem öffentlichen Key liest/schreibt jedes Konto nur seine eigene Zeile. |
| Supabase „Sign-ups aus“ | Niemand kann ein zweites Konto anlegen. |
| `_headers` | Sicherheits-Header (CSP, noindex, kein Einbetten in fremde Seiten). |

## Fehlersuche

| Problem | Lösung |
|---|---|
| Installieren-Knopf fehlt | Seite einmal neu laden, nachdem du bei Access angemeldet bist. Notfalls Menü → „Zum Startbildschirm hinzufügen“. |
| curl in Kali bekommt HTML-Anmeldeseite statt `server.py` | Teil B3 fehlt oder Pfad falsch (`labs/` ohne führenden Schrägstrich). |
| Bestätigungsmail führt zu `localhost` | Teil C fehlt. |
| App zeigt alte Version | Seite schließen und neu öffnen (Service Worker aktualisiert sich beim nächsten Start). |
