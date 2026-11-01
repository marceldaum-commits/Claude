PROTOTYP: www.mathenachhilfe-online.com – so würde ich sie aufbauen
=================================================================
Stand: 01.11.2026 · Gedankenexperiment, die echte Website bleibt unberührt.

ÖFFNEN
------
index.html im Browser öffnen. Reines HTML/CSS, ein kleines script.js
(Handy-Menü, Dropdowns, Team-Filter, Demo-Formulare). Keine Build-Tools.
Formulare senden nichts. Alle Seiten tragen "noindex" (nur im Prototyp).

SEITEN (15)
-----------
index.html                 Startseite
nachhilfe.html             Nachhilfe-Übersicht (+ "Das ist dabei", "Für Eltern")
online-nachhilfe.html      Online-Nachhilfe – so läuft's (+ Gruppenunterricht)
luecken-schliessen.html    Lücken schließen
pruefungsvorbereitung.html Prüfungsvorbereitung
faecher-klassenstufen.html Fächer & Klassenstufen
preise.html                Preise (+ Erstes Paket, Weitere Angebote)
team.html                  Team mit Fach-Filter (+ "So unterrichten wir")
team-marcel-daum.html      Beispielprofil Marcel (+ "Unsere Geschichte")
kostenlos-lernen.html      Lernstand-Check, Textaufgaben-PDF, Arbeitsblätter,
                           Bücher, Lerntipps
faq.html                   Hilfe: häufige Fragen + Ablauf & wichtige Infos
kontakt.html               Kontakt
probestunde.html           Probestunde (vereinfachtes Formular, Demo)
impressum.html             Impressum-Platzhalter (+ Datenschutz/AGB/Widerruf)
kundenbereich.html         Anmelden / Aufbau "Mein Bereich" (Demo)

Jeder Menüpunkt führt auf eine Prototyp-Seite oder einen Abschnitt darin.
Tiefe Inhalte, die hier nicht nachgebaut sind (Shop-Produkte, Artikel,
PDF, Lesestudio, Arbeitsblätter), verlinken mit "↗" auf die echte Seite.

WAS ANDERS IST ALS AUF DER ECHTEN SEITE – UND WARUM
---------------------------------------------------
Menü
- 5 Hauptpunkte (Nachhilfe, Preise, Team, Kostenlos lernen, Hilfe) wie im
  Menüvorschlag. Am Desktop direkt sichtbar mit Dropdowns statt hinter
  "Menü" versteckt (M2).
- Handy: kleiner Button "Probestunde" neben "Menü" – der wichtigste Klick
  ist immer nur einen Fingertipp entfernt.
- Kundenbereich getrennt: Personen-Symbol oben rechts. Warenkorb, Kasse,
  Termin buchen und Kontaktdaten raus aus dem Hauptmenü (M3, M6).
- Angebotsseiten (Lücken, Prüfung, Online-Nachhilfe) jetzt im Menü (M1).
- Footer verwendet dieselben Namen wie das Menü.

Startseite
- Reihenfolge am Handy: Überschrift → ein Satz → Probestunden-Button →
  Vertrauen (5,0 ★ / 623 Bewertungen · 20 Lehrkräfte · seit 2001) →
  erst dann Preis (B3, B4).
- Gründer-Karte mit "Nachhilfe seit 2001" und "Dozent für Abschlusskurse".
- "Ein Blick in unseren Unterricht" ist sichtbar statt eingeklappt (B8);
  Platzhalter für ein echtes Tafelbild/Video.
- Lehrernamen als normaler Text, nicht als H3 (D7).
- Schema.org mit aggregateRating 5,0 / 623 (D8).

Weniger Kleingedrucktes (C9, B6)
- Unter Buttons und Preisen höchstens ein kurzer Satz.
- Absage-, Warte- und Rückerstattungsregeln einmal gebündelt auf
  faq.html#ablauf, überall sonst nur ein Link dorthin.
- PayPal-Zuschlag nirgends prominent (gehört nur in den Checkout).
- "Rechnerischer Stundenpreis gerundet", "Die Auswahl richtet sich nach
  dem verfügbaren Angebot" usw. gestrichen.

Preise (B5, C7, A4)
- Eine Karte "Einzelnachhilfe ab 23,75 €" mit "Startvorteil: erstes Paket
  ab 23,50 €" statt zwei konkurrierender Karten.
- Gruppe: "ab 15,38 € pro Kind" (30,76 € / 2).
- Interner Satz "Preise stammen aus dem Shop" ersetzt.

Probestunde (B2)
- Zwei Schritte: Fach, Klasse (Pflicht), Schulform und Wunsch-Lehrkraft
  optional; dann Name + Handy ODER E-Mail.
- Honeypot statt reCAPTCHA-Checkbox, kein Umweg über WhatsApp/E-Mail.
- Bestätigungsseite mit "Danke, Vorname" und WhatsApp als Extra.
- Hinweistext auf einen Satz gekürzt.

Kontakt (C4, C5)
- 1500 statt 300 Zeichen, nur noch eine E-Mail-Adresse sichtbar.

Text & Marke (C1, C2, C3, A6)
- Durchgehend du/ihr (auch Termine ändern, Fächer, Marcel-Profil).
- Ein Name: "Nachhilfe Online" (ohne Gedankenstrich), Zusatz "by Mathe mit
  Marcel". Titel-Zusatz überall " | Nachhilfe Online".
  (Alternative aus der Analyse: "Mathe mit Marcel" als Hauptmarke –
  im Prototyp bewusst die breitere Variante, weil viele Fächer.)
- Marcel-Profil gekürzt: keine "Kontaktieren Sie uns noch heute"-Sätze,
  "seit 2001" nur dort, wo es hilft.
- "Stochastik & Analysis" statt "Analyse".

Keine Baustellen (A2, A3, B9, C6)
- Kein "im Aufbau", kein leerer Fortschrittsbalken (statisch gefüllt),
  keine Buchungsseite, keine "in Vorbereitung"-Hinweise, keine
  Garantie-Seite ohne Garantie.

SEO (D1–D6)
- Jede Seite: eigener Titel, Meta-Beschreibung, Canonical, Open-Graph-
  und Twitter-Tags, genau eine H1 (mit Playwright geprüft).
- og:image zeigt auf /og-bild-1200x630.png – das Bild muss noch erstellt
  werden (Logo + "5,0 ★ · 623 Google-Bewertungen").

Barrierefreiheit
- "Zum Inhalt springen", sichtbarer Tastatur-Fokus, Escape schließt
  Menüs, Dropdowns per Klick und Tastatur bedienbar.

PLATZHALTER [in eckigen Klammern] – bitte ergänzen oder bestätigen
------------------------------------------------------------------
- Antwortzeit "[24 Stunden]" – nur verwenden, wenn sie eingehalten wird.
- Persönlicher Satz für Aaron, Alisa, Hendrik, Lena, Lewin; Fächer für
  Sandra (stehen auf der echten Seite nicht).
- Fotos aller Lehrkräfte (Server offline → Initialen).
- Tafelbild/Video für "Ein Blick in unseren Unterricht".
- Marcel: Jahr der ersten Abschlusskurse, optional eine echte Geschichte.
- Preise für 5/10/15-Stunden-Pakete.
- Direkter Link zum Google-Profil (jetzt: Google-Suche).
- Impressum-Anschrift, Datenschutz, AGB, Widerruf.
- Einheitliche Kunden-E-Mail (z. B. kontakt@…); im Prototyp überall
  marcel.daum@mathenachhilfe-online.com.

QUELLE DER INHALTE
------------------
Alle Texte, Zahlen und Preise stammen aus website-sicherung-2026-10-31/
texte/ und den Analysen im Repo. Neu formuliert wurden nur Kürzungen und
die Vorschläge aus "SO GEHT ES BESSER". Nichts erfunden: Wo Fakten
fehlen, steht ein Platzhalter.

GEPRÜFT
-------
Playwright/Chromium bei 390 px und 1440 px: kein horizontales Scrollen,
genau eine H1 pro Seite, keine JavaScript-Fehler, alle internen Links und
Anker vorhanden, Menüs und Formulare durchgeklickt.
