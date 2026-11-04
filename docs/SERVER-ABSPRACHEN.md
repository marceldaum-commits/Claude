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
- Erledigt 04.11.: AVV (Supabase/Brevo in den AGB, Strato abgeschlossen), Log-Rotation 30 Tage, Plesk-Benachrichtigungen an info@, Plesk-2FA, Backups täglich nach Google Drive (verschlüsselt, Fehler-Mail an info@), Zentrale mit 2FA-Pflicht, alte Cloudflare-Seite leitet auf www um.
- Bewusst so gelassen: Port 2222 (Marcel), kein PTR-Eintrag (Server verschickt selbst keine Mails nach außen).
- Offen: info@ in der Mail-App (Postausgang über Brevo), Supabase-Datensicherung, Arena ans Konto anbinden, Übersetzung neuer Texte (Konto, Start, Zentrale nicht nötig).

## Stand 04.11.2026 abends (2.24.0)

- Mail komplett über den eigenen Server (Marcels Entscheidung): SPF `v=spf1 ip4:217.160.61.73 ~all`, DKIM (Selektor default),
  PTR nachtfalter.tech, smtp_helo_name, Supabase-SMTP → nachtfalter.tech:587 (noreply@). t-online sperrt neue Server
  (554 NOWL) → Freischaltung bei tobr@rx.t-online.de angefragt (Antwort abwarten). Brevo-Einträge noch nicht entfernt.
- Code-Review (13 Befunde) behoben, u. a. Deploy-Härtung (systemd-run, keine Symlinks), Zentrale-Vorschau abgeschaltet,
  Arena-Limits, robuste Auswertung. Arena läuft mit Konto-Anmeldung.
- Konto-Sicherung eingerichtet (konto-db.env, pg_dump nachts) – greift ab der nächsten Nacht.
- Offen (Marcel, am PC): Update-Skript neu einspielen (Prüfzahl c7e054d4) – enthält die Härtung;
  Port 587 in Plesk (Mail Server Settings) prüfen; Brevo-Schlüssel löschen; nach t-online-Freigabe Mailtest,
  dann Brevo-DNS-Einträge (brevo-code, brevo1/2._domainkey) und DMARC-rua anpassen.
- Hinweis 2FA: Wer zur „Verwaltung“ gemacht wird, richtet beim ersten Zentrale-Login den Code selbst ein → Rolle nur
  vergeben, wenn die Person direkt danach einrichtet (sonst könnte jemand mit ihrem Passwort zuvorkommen).

## Offene Punkte

- [ ] Domain festlegen (Marcel)
- [ ] Server-Zugang per Remote Control (Marcel)
- [ ] Grundeinrichtung (Kali-Sitzung)
- [ ] Arena installieren (Kali-Sitzung)
- [ ] KI-Dienst installieren (KI-Sitzung)
- [ ] Gegenseitige Links

## Stand 04.11.2026 spät (2.26.0)

- Brevo wird nicht mehr genutzt: aus Datenschutzerklärung, Zentrale und Doku entfernt. Marcel löscht die Brevo-Schlüssel
  bzw. das Konto; DNS (Plesk, Nameserver Strato): brevo-code-TXT und brevo1/2._domainkey entfernen, DMARC-rua → info@.
- Port 587 in Plesk aktiv, Strato-Firewall 587 offen (2222 bleibt).
- Deploy-Skript aktualisiert sich selbst aus „live“ (Funktion selbst); „claude“ darf per sudo nur nachtfalter-deploy
  (auch --force/status) ausführen (/etc/sudoers.d/nachtfalter-claude). Keine Neuinstallation von Hand mehr nötig.
- Arena: Leitstelle (Fortgeschritten) und Tresor (Experte) live, Zugangsanfragen in der Zentrale, Sicherheitsprüfung umgesetzt.
- App startet in der Handy-Sprache (de/en/uk, sonst en).
- Neue Arenen (2.27.0): Webshop (Fortgeschritten, Web-Hacking mit curl) und Einbruch (Experte, Forensik/Blue Team,
  Antworten über `akte`). Alle Arenen: Codes aus geheimem Salz pro Konto, Prüfung nur serverseitig; Docker-Wächter.
- 2.28.0: 10 Arenen in drei Reihen – Hacken (Keller, Leitstelle, Webshop, Tresor), Ermitteln (Spurensuche, Einbruch,
  Maulwurf; Antworten über `akte`), Abwehren (Angriff! 1–3; Spielleiter als root lässt Hacker-Bot in Wellen angreifen,
  Angriffe laufen als `hacker`/`verteidiger`, root führt keine Spielerdateien aus). Spurensuche + Angriff! 1 mit
  Grundzugang „arena“, alle anderen „arena-profi“. Spieler-beschreibbare Ordner als tmpfs.
- 2.30.0: Web-Reihe (3 Arenen, Reihe „Hacken“): Web 1 Das Kleingedruckte (Fortgeschritten: robots, Methoden,
  versteckte Parameter, LFI, Backup, Header-Spoofing), Web 2 Umwege (Experte: SQLi-Login/UNION, SSRF, Mass Assignment,
  JWT alg=none, file://), Web 3 Die Kette (Extrem: SSTI, Deserialisierung, Race Condition, Blind-SQLi, SSRF-Bypass, XXE).
  Alle sechs Stufen je Lab durchgespielt. Jetzt 13 Arenen.
- 2.33.0: Meister-Stufe „Der Meister: Das Rechenzentrum“ (neue Stufe „Meister“, Reihe Hacken): Pivoting durch ein
  simuliertes internes Netz (ein abgeschotteter Container, Konten = Maschinen, KEIN Wächter-Eingriff), Hash knacken,
  echter Buffer Overflow (ret2win über 127.0.0.1:9099, Dienst läuft als eigener Benutzer pruef – kein Abkürzen),
  Rechteausweitung bis root über einen beschreibbaren Root-Skriptordner. 6 Codes, komplett durchgespielt.
  Lernpfad-Abschlussstufe s11 ergänzt. Jetzt 14 Arenen.
- 2.34.0: „Das Duell: Mann gegen Maschine“ (Reihe Abwehren, Extrem) – lebendiger, reagierender Gegner: prüft live,
  welche Lücken offen sind, greift eine zufällige an, wird schneller; jede geschlossene Lücke gibt sofort einen Code.
  Claude-Anbindung vorbereitet (BRAIN=ki + Not-Aus auf Drehbuch), siehe docs/ARENA-GEGNER.md – echter Claude-Gegner
  braucht noch Marcels Anthropic-Schlüssel + sicheren Steuerkanal. Lernpfad-Stufe s12. Jetzt 15 Arenen.
- 2.35.0: „Der Mitschnitt“ (Reihe Ermitteln, Experte) – NEUE Methode Netzwerk-Forensik: einen pcap mit tshark auswerten
  (Klartext-Login, Datei-Diebstahl, DNS-Ausleitung, verstecktes base64-Kommando). pcap wird aus dem Salz mit scapy
  erzeugt. 5 Codes, durchgespielt. Lernpfad-Stufe s13. Jetzt 16 Arenen.
- 2.36.0: Isolation nachgewiesen und als Dauerprüfung verankert: alle Labs laufen mit NetworkMode none (nur lo,
  kein Internet/DNS), doppelt erzwungen (Server + Wächter). tools/isolation-check.mjs prüft das in npm run check;
  docs/ISOLATION.md dokumentiert die Garantien. Zur Laufzeit an nf-meister/nf-duell/nf-mitschnitt verifiziert.
- 2.37.0: „Die Werkstatt“ (Reihe Hacken, Experte) – NEUE Methode Reverse Engineering: 5 Crackmes ohne Quelltext
  (strings, ltrace, objdump/gdb, Keygen, XOR-Dekodierung). Binaries werden zur Laufzeit aus dem Salz gebaut, Codes
  liegen XOR-verschlüsselt drin (kein strings-Shortcut). Durchgespielt. Lernpfad-Stufe s14. Jetzt 17 Arenen.
- 2.38.0: „Der Chiffrensaal“ (Reihe Hacken, Fortgeschritten) – NEUE Methode Kryptoanalyse: Caesar, XOR (Byte/Wort),
  Kodierungs-Kette (base64/base32/hex), Vigenère; jede Nachricht enthält ihren Code. Aus dem Salz erzeugt, 5 Codes,
  durchgespielt. Lernpfad-Stufe s15. Jetzt 18 Arenen.
- 2.39.0: „Das Versteck“ (Reihe Ermitteln, Fortgeschritten) – NEUE Methode Steganografie: Daten hinter einer PNG,
  ZIP-Polyglot, Whitespace-Stego, LSB in einem PPM-Bild, base64+umgedreht. Aus dem Salz erzeugt, 5 Codes,
  durchgespielt. Lernpfad-Stufe s16. Jetzt 19 Arenen, 17 Lernpfad-Stufen.
- 2.40.0: Didaktik-Verbesserung aus Wettbewerbs-Kritik (TryHackMe/HTB): „Verstanden-Check“ pro Lernpfad-Stufe –
  eigener Mini-Bericht (Lücke + Schutz), dann Profi-Zusammenfassung; Notizen werden gespeichert/synchronisiert.
  Begründung in docs/DIDAKTIK.md.
