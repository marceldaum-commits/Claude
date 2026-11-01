# Übergabe: Neubau Website „Nachhilfe Online“

Stand: 01.11.2026 · Branch `website-prototyp` in `marceldaum-commits/Claude`

> **Achtung:** Dieses Repository ist **öffentlich**. Hier stehen nur Entwürfe und
> Entscheidungen – keine Zugangsdaten, keine Serverdaten, keine Kundendaten.
> Interne Unterlagen liegen im Google Drive („Projektwissen“) und in den privaten
> Repositories.

---

## 1. Ziel

Die bisherige Website www.mathenachhilfe-online.com wird durch eine neue,
hochwertige Fassung ersetzt – **im bestehenden WordPress-System**, damit Shop,
Bücher-Reader, Kundenbereich, LehrerApp, Verwaltung und Anfrage-Ablage weiter
funktionieren. Danach: eigener Kalender für App, Verwaltung und Website.

## 2. Was es schon gibt (in diesem Repo)

| Ordner | Was | Status |
|---|---|---|
| `website-analyse-…txt`, `menue-vorschlag-…txt` | Analyse aller 80 Seiten, neuer Menüaufbau | Grundlage |
| `website-sicherung-2026-10-31/` | Texte, HTML, Screenshots der alten Seite | Grundlage |
| `prototyp/` | Erster Prototyp, nah am alten Design | überholt |
| `prototyp-neu/` | Design „Das Heft“ (Karopapier) | überholt |
| `prototyp-catcher/` | Fokussierte Startseite | überholt |
| **`prototyp-premium/`** | **Gewähltes Design** (siehe 3.) | **Vorlage** |
| `wordpress/nachhilfe-online/` | Eigenständiges Theme (Heft-Design) mit Formularen, SEO, SMTP, Einrichtungs-Assistent | **Baukasten** – Teile übernehmen, nicht als Ganzes einspielen |

Artifacts (privat, nur für Marcel):
- Premium: https://claude.ai/artifact/HJRjpyoXgHXq9DVSSZVRdQ

## 3. Entschiedenes Design („Premium“)

- **Hell als Grundton**, Nachtblau `#0a0f24` nur als Akzent (Stunden-Fenster,
  große Kachel, Preis-Karte, Anfrage-Block, Fuß). **Orange `#ff7418`** = einzige
  Akzentfarbe (aus der bisherigen Marke).
- **Hell/Dunkel automatisch** nach Geräte-Einstellung; Sonne/Mond-Knopf in der
  Kopfzeile überstimmt das, Wahl wird gespeichert (ohne Aufblitzen).
- Schriften: **Geist** (Text), **Instrument Serif** kursiv (Akzentwörter),
  **Caveat** (Tafel). Später lokal einbinden (DSGVO), nicht von Google laden.
- Hero: „Aus Fragen wird *Klarheit.*“, ein Satz, Button „Kostenlose
  Probestunde“, WhatsApp, Bewertung. **Ein** Wow-Moment: Fenster einer
  Online-Stunde, Lösung schreibt sich an die Tafel (Mathe/Deutsch/Englisch).
- Danach nur: Zahlen · Bento „Warum Familien bleiben“ · Stimmen · Start &
  Preise mit kurzer FAQ · Anfrage-Formular.
- **Verworfen** (nicht wiederholen): Quiz im Hero, Karopapier-Look, ganz dunkle
  Seite, große blaue Farbflächen, überladene Startseite mit 10 Abschnitten.

## 4. Feste Entscheidungen (von Marcel)

- **Alle Fächer**, nicht nur Mathe. Marke: **„Nachhilfe Online“** (kein
  Markenwechsel beauftragt).
- **So wenige Plugins wie möglich** (Kosten, Abhängigkeit, Anpassbarkeit).
  Lieber eigener Code im Theme / mu-plugin.
- **Eigener Kalender**, keine Google-Synchronisation.
- **PayPal-Gebühr bleibt.** Keine Preisänderungen.
- Preis: **Stundenpreis groß** mit **Sternchen-Fußnote** (Paketumfang +
  echter Gesamtpreis) direkt an der Karte.
- **Keine Antwortzeit-Zusage** („24 Stunden“) – nur „Marcel meldet sich persönlich“.
- Durchgehend **du/ihr**. Menü: Nachhilfe · Preise · Team ·
  **Lernen & Materialien** · Hilfe + Button „Kostenlose Probestunde“.
- Captcha-/Spam-Schutz bleibt; Probestunden-Formular **direkt absenden** in die
  **vorhandene** geschützte Anfrage-Ablage, wenige Pflichtfelder
  (Name, Handy oder E-Mail, Fach, Klasse), Lehrkraft optional.
- Nichts erfinden: keine ausgedachten Bewertungen, Zahlen, Zusagen.
  Fehlende Fakten als `[Platzhalter]`.

## 5. Offene Platzhalter

Porträtfoto Marcel · echte Fotos/Aufnahmen aus dem Unterricht (statt
Beispiel-Tafelbilder) · Fotos der Lehrkräfte · persönliche Sätze für 5
Lehrkräfte · Preise der 5/10/15-Stunden-Pakete · direkter Link zum
Google-Profil · Teilen-Bild 1200×630 (laut Projektwissen schon vorbereitet).

## 6. Nächste Schritte (Reihenfolge)

1. **Bestand verstehen** – im privaten Repo `Website_Backup` das aktive Theme,
   mu-plugins (u. a. Anfrage-Ablage), Reader/Shop-Anbindung und die
   vorbereiteten Pakete (Probestunde, Menü, Social, Preis-Fußnote) lesen;
   Projektwissen im Drive (Website-Auftrag, Funktionsleitfaden, Richtlinie).
2. **Premium-Design ins bestehende Theme** einbauen – als eigene CSS-/Template-
   Schicht, bestehende Funktionen unangetastet. Startseite zuerst, dann
   Unterseiten. Vorlage: `prototyp-premium/index.html`.
3. **Probestunden-Formular** im neuen Design an die vorhandene Anfrage-Ablage
   anbinden (vorbereitetes Paket aus dem Projektwissen nutzen, nicht neu erfinden).
4. **Kalender-Konzept** und Bau (eine Datenbank als einzige Wahrheit,
   Doppelbuchung per DB-Regel verhindern, Zeiten intern UTC, iCal-Abo nur
   lesend statt Google-Sync); Anforderungen im Funktionsleitfaden.
5. **Betrieb absichern** – ohne Plugins: Staging + Rückweg über Plesk
   WordPress Toolkit, Plesk-Datensicherung zusätzlich an einen zweiten,
   unabhängigen Ort, externer Ausfallalarm.

Bereitstellung auf dem Server macht weiterhin Marcel bzw. der festgelegte
Operator über Plesk (Staging zuerst). Die neue Sitzung baut und testet im Code.

## 7. Arbeitsweise

- Deutsch, du/ihr, kurze klare Texte.
- Jede Änderung im Browser prüfen (Playwright, 390 px und 1440 px):
  kein seitliches Scrollen, eine H1, keine JS-Fehler.
- Kleine Schritte, die man sieht und zurücknehmen kann.
- Geheimnisse nie in Code oder Repo – Bitwarden / `wp-config.php` auf dem Server.
