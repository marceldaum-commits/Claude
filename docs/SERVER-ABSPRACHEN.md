# Server-Absprachen (Kali Level Up + KI-Lernprogramm)

Gemeinsames Dokument der beiden Claude-Sitzungen, die auf Marcels Plesk-Server arbeiten.
Gepflegt auf Branch `ccr-63912bdd-xpv8bk` (lesen: `git fetch origin ccr-63912bdd-xpv8bk && git show origin/ccr-63912bdd-xpv8bk:docs/SERVER-ABSPRACHEN.md`).
Änderungswünsche per Nachricht an die andere Sitzung. Jede Änderung am Server bestätigt Marcel selbst.

## Wer ist wer

| | Kali Level Up (Arena) | KI-Lernprogramm |
|---|---|---|
| Sitzung | session_015vg1TjHM7UdeuegoUkYE7j | session_015vg1TkDYBs7kSfEMSPudbC |
| Repo-Ordner | alles außer `ki-lernen/` | `ki-lernen/` |
| Branch | `ccr-63912bdd-xpv8bk` | `ccr-a14979d0-4fmgpv` |
| Server-Ordner | `~/kly-labs` | `~/ki-lernen` |
| Port (nur 127.0.0.1) | 8090 | 8100 |
| Subdomain | `arena.<domain>` | `ki.<domain>` |
| Docker-Label | `kly.arena` | `ki.lernen` (falls Docker) |
| Docker-Socket | ja (startet Lab-Container) | nein |
| Supabase | `unkmvjdvcehkweutzyqw` (nur Kali-App) | eigenes Projekt |
| Veröffentlichung Web-App | `.github/workflows/deploy.yml` → Pages `kali-level-up` | eigener Workflow, eigener paths-Filter |

### Rollen

| Sitzung | Rolle | Aufgaben |
|---|---|---|
| Kali (session_015vg1TjHM7UdeuegoUkYE7j) | Technik & Sicherheit | Server-Grundeinrichtung für beide, Docker/Plesk/nginx/Firewall/Backups, Sicherheits-Review beider Projekte, Kali-App, Arena, Deploys |
| KI (session_015vg1TkDYBs7kSfEMSPudbC) | Didaktik & Nutzererlebnis | KI-Werkstatt komplett, Verständlichkeits-Review beider Apps, gemeinsames Handy-Design, Inhalte Brücken-Raum |
| Sprache & Qualität (session_015vg1TkXMWLfRNriT3axK7q, Branch `ccr-sprache-qualitaet`) | Übersetzung & Test | Handübersetzung UK/EN in `i18n/<sprache>/<raum>.json` (Kali) und `ki-lernen/i18n/` (KI), Testspieler auf Handy/PC |

Weitere Mitarbeiter: Marcel hat erlaubt, bei Bedarf neue Sitzungen anzulegen. Vorher mit den anderen absprechen, Rolle und Grenzen (Ordner, Branch) festlegen und hier eintragen.

Übersetzungsformat Kali-App: `i18n/<sprache>/<raumid>.json` = `{ "<exakter deutscher Text>": "<Übersetzung>" }`. Befehle, Dateinamen, Pfade und Codes werden nie übersetzt.

## Gemeinsame Regeln

- Nach außen nur Plesk (80/443, SSH). Dienste lauschen nur auf 127.0.0.1. Keine Firewall-Ports öffnen.
- Geheimnisse (API-Schlüssel, Einladungscodes) nur in `.env` im jeweiligen Server-Ordner, nie im Repo oder im Chat.
- Ressourcen: Arena bis ca. 5 GB RAM / 20 Sitzungen. KI-Dienst festes Limit ca. 512 MB.
- Keine Dateien im Bereich der anderen Sitzung ändern. Gemeinsame Dateien (dieses Dokument) nur nach Absprache.

## Grundeinrichtung des Servers (einmalig, gemeinsam genutzt)

Übernimmt: **Kali-Sitzung** (sie braucht Docker ohnehin). Die KI-Sitzung bekommt Bescheid, wenn es fertig ist.

1. System-Updates, Zeitzone Europe/Berlin.
2. Plesk-Erweiterung „Docker“ bzw. Docker Engine + Compose.
3. Benutzer und Ordner `~/kly-labs`, `~/ki-lernen`.
4. Claude Code mit Remote Control (je Ordner eine Freigabe).
5. Subdomains `arena.` und `ki.` in Plesk, Let's Encrypt, nginx-Proxy auf 8090 bzw. 8100 (mit WebSocket-Upgrade).
6. Prüfung: von außen nur 80/443/SSH erreichbar.

## Zusammenarbeit der Apps

- Gegenseitige Verlinkung: Kali-App bekommt unter „Mehr“ einen Link zum KI-Lernprogramm und umgekehrt (Adresse in `config.js` → `kiUrl`).
- Idee (offen): KI-Kapitel „KI in der IT-Sicherheit“ (z. B. KI-Antworten prüfen, Phishing erkennen) – Inhalte stimmen beide Sitzungen ab.
- Beta-Tester: dieselben Einladungen/Tester-Liste. Marcel pflegt die Liste, beide Dienste nutzen eigene Codes.

## Gegenseitiges Prüfen & Brainstorming

- Nach jedem fertigen Stück schickt der Autor Branch + Commit + Prüfauftrag an die andere Sitzung.
- Befunde sortiert nach: inhaltlich falsch / didaktisch unklar / Sicherheit & Datenschutz / Handy-Bedienung / Kleinkram.
- Der Autor entscheidet und setzt um. Niemand ändert Dateien des anderen.
- Ideen für die jeweils andere App sind ausdrücklich erwünscht (per Nachricht, hier unter „Ideen“ festgehalten).

### Ideen

- KI-App: Prompt-Werkstatt, Lügendetektor (Halluzinationen finden), Geheimnis-Wächter (was gehört nicht in einen Prompt), Rollen & Kontext, KI oder Mensch?, Story-Rahmen Praktikum, Tokens als Spielwährung.
- Brücke „KI & Sicherheit“: Prompt-Injection verstehen und sich schützen (KI-App). Raum „Analyse mit KI-Hilfe“ mit fehlerhafter, vorgefertigter KI-Erklärung, die im Sandbox-Terminal nachgeprüft wird (Kali-App).

## Plan: Nachtfalter-Konto (Registrierung, später bezahlter Zugang)

Wunsch von Marcel (03.11.2026). Noch nicht gebaut – erst nach Server-Einrichtung.

- **Ein Konto für alle Nachtfalter-Apps** (Hacklab, Arena, KI-Werkstatt): zentral über Supabase Auth (E-Mail + Passwort bzw. Magic Link), Login-Seite `konto.nachtfalter.tech`. Hacklab nutzt Supabase bereits für den Sync.
- **Tabellen** (mit Row Level Security): `profiles` (Anzeigename, Sprache, Geburtsjahr/Elternfreigabe), `entitlements` (user, produkt `arena|ki|alles`, gueltig_bis, quelle `beta|kauf|geschenk`).
- **Dienste prüfen den Zugang serverseitig**: Arena und KI-Werkstatt verlangen ein gültiges Supabase-Token + passendes Entitlement statt Einladungscode. Kostenlos bleibt alles, was im Browser läuft.
- **Cloudflare Access** schützt dann nur noch Vorschau/Admin; die öffentlichen Apps gehen ohne Access online.
- **Bezahlen (später)**: zeitliche Pässe (z. B. 1 Monat / 3 Monate), Abwicklung über einen „Merchant of Record“ (z. B. Paddle oder Lemon Squeezy – übernimmt Umsatzsteuer/EU-Rechnungen), Webhook schreibt `entitlements`. Kein Abo-Zwang.
- **Vorher rechtlich klären (Marcel)**: Impressum, Datenschutzerklärung, AGB/Widerruf für digitale Inhalte, ggf. Gewerbe/Kleinunternehmerregelung, Minderjährige (Einwilligung der Eltern, keine Käufe durch Kinder). Keine Rechtsberatung durch uns – im Zweifel Fachperson.
- Schema-Wünsche der KI-Sitzung (eingeplant): `entitlements` nur serverseitig per service_role lesen (Dienste), RLS: Nutzer sehen nur eigene Zeilen; optionales Feld `ki_budget_usd` pro Entitlement (sonst Standard `BUDGET_USD_PER_CODE`). KI-Werkstatt hat dafür `ki-lernen/auth.js` mit `AUTH_MODE=codes|supabase` vorbereitet (0.4.0).
- **Stand 03.11.2026:** Supabase-Projekt „nachtfalter-konto“ angelegt (Ref `sxapebxzxmathkvtuuvn`, Frankfurt), Schema `supabase/konto-schema.sql` angewendet, Sicherheits-Prüfung ohne Befund. Schlüssel (service_role) holt Marcel im Supabase-Dashboard und trägt ihn nur in die `.env` auf dem Server ein – nie in Chat oder Repo.
- Zuständig: Kali-Sitzung (Konto, Datenbank, Sicherheit, Zahlungs-Webhook), KI-Sitzung (Anbindung KI-Werkstatt, Texte/Ablauf aus Nutzersicht), Sprache & Qualität (Übersetzung, Test).

## Stand 04.11.2026

- Web-App läuft vom eigenen Server: **www.nachtfalter.tech** (Startseite, Impressum, Datenschutz), **app.nachtfalter.tech** (Hacklab, Konto, Verwaltung, Anmeldung Pflicht), **vorschau.nachtfalter.tech** (Arbeits-Branch, Passwortschutz). Cloudflare Pages ist stillgelegt.
- Konto: offene Registrierung mit E-Mail-Bestätigung; Mails über Brevo (`noreply@nachtfalter.tech`, Domain authentifiziert). Postfach `info@nachtfalter.tech` in Plesk (MX → nachtfalter.tech, Strato-Firewall 25/993 offen, Fail2Ban aktiv).
- Offen: AVV mit Supabase/Brevo/Strato (Marcel), Log-Rotation ≤ 30 Tage, Port 2222 prüfen/schließen, PTR-Eintrag der Server-IP, Plesk-Benachrichtigungen über Brevo, Übersetzung neuer Konto-/Start-Texte.

## Offene Punkte

- [ ] Domain festlegen (Marcel)
- [ ] Server-Zugang per Remote Control (Marcel)
- [ ] Grundeinrichtung (Kali-Sitzung)
- [ ] Arena installieren (Kali-Sitzung)
- [ ] KI-Dienst installieren (KI-Sitzung)
- [ ] Gegenseitige Links
