PROTOTYP "CATCHER" – Startseite, die anfragt statt erklärt
==========================================================
Stand: 01.11.2026 · Ideen-Entwurf, eine einzige Datei (index.html).

GRUNDIDEE
Die Startseite hat genau eine Aufgabe: dass Eltern die kostenlose
Probestunde anfragen. Darum IST der erste Bildschirm die Anfrage.

FÜNF ABSCHNITTE STATT ZEHN
1. Hero = Arbeitsblatt mit 4 Aufgaben zum Antippen:
   Fach (alle 13 + "Mehrere") → Klasse → Anliegen → Kontakt.
   - Antippen springt automatisch weiter; Antworten bleiben oben als
     Zettel stehen und lassen sich per Klick ändern.
   - Der gelbe Marker unter "Aha." ist der Fortschrittsbalken.
   - Vor dem Kontakt erscheint eine persönliche "Lösung" in Handschrift
     (Empfehlung + Anzahl Lehrkräfte im Fach; bei Prüfung der Hinweis
     "spätestens drei Monate vorher").
   - Klasse 1–4: "Abschlussprüfung" ist gesperrt.
   - Nur 2 Pflichtfelder: Vorname, Handy oder E-Mail.
2. Stimmen: 5,0 ★ · 623 · seit 2001 · 20 Lehrkräfte, zwei echte
   Bewertungen, Marcel in einem Satz.
3. "Kleingedrucktes? Hier ist es groß." – Preis, kein Vertrag, Stunden
   verfallen nicht, 14 Tage Geld zurück, Absage 24 h, Wechsel, online 1:1.
   (Ersetzt Preis-, FAQ- und Vorteile-Abschnitte.)
4. "So klingt Aha." – Tafelbild Mathe / Deutsch / Englisch.
5. Schluss-Zettel mit einem Button.

BEWUSST WEGGELASSEN (gehört auf Unterseiten)
Team-Raster, Fächer-Abschnitt, Preistabelle, FAQ-Liste, Angebotsfinder,
Heftetikett, kostenlose Materialien.

FÜR DEN EINBAU IN WORDPRESS
Das Formular entspricht [mmm_probestunde] im Theme (wordpress/):
Felder fach, klasse, ziel, name, kontakt, zeiten → admin-post.php.
Die Startseite des Themes kann durch diese Seite ersetzt werden.

PLATZHALTER: Tafelbilder sind Beispiele; Fotos fehlen; Antwortzeit
bewusst ohne Versprechen ("Marcel meldet sich persönlich").

GEPRÜFT (Playwright, 390 und 1440 px): kein seitliches Scrollen, eine H1,
keine JS-Fehler; ganzer Ablauf durchgeklickt inkl. Fehlermeldungen,
gesperrter Prüfung bei Klasse 3 und Danke-Ansicht. Am Handy liegen die
ersten Fach-Kacheln im ersten Bildschirm.
