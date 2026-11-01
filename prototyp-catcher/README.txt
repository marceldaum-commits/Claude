PROTOTYP "CATCHER" – Startseite, die anfragt statt erklärt
==========================================================
Stand: 01.11.2026 · Ideen-Entwurf, eine einzige Datei (index.html).

GRUNDIDEE
Die Startseite hat genau eine Aufgabe: dass Eltern die kostenlose
Probestunde anfragen. Darum IST der erste Bildschirm die Anfrage.

VIER ABSCHNITTE STATT ZEHN
1. Hero: "Aus Hä? wird Aha.", ein Satz, Button "Kostenlose Probestunde
   anfragen" + WhatsApp, Bewertung. Rechts als Bild der Seite das
   Tafelbild (Mathe / Deutsch / Englisch), fertig gelöst; auf Wunsch
   Schritt für Schritt.
   (Erste Fassung hatte ein Quiz im Hero – verworfen: wirkte wie ein Test
   und fragte, bevor die Seite etwas erklärt hat.)
2. Stimmen: 5,0 ★ · 623 · seit 2001 · 20 Lehrkräfte, zwei echte
   Bewertungen, Marcel in einem Satz.
3. "Kleingedrucktes? Hier ist es groß." – Preis, kein Vertrag, Stunden
   verfallen nicht, 14 Tage Geld zurück, Absage 24 h, Wechsel, online 1:1.
   (Ersetzt Preis-, FAQ- und Vorteile-Abschnitte.)
4. Anfrage: ganz normales kurzes Formular – Vorname, Handy oder E-Mail,
   Fach, Klasse (Pflicht), Nachricht (optional). Ab Klasse 9 erscheint der
   Hinweis "Abschlussklassen: spätestens drei Monate vorher anfragen".
   Daneben: so geht es weiter, Telefon, WhatsApp.

BEWUSST WEGGELASSEN (gehört auf Unterseiten)
Team-Raster, Fächer-Abschnitt, Preistabelle, FAQ-Liste, Angebotsfinder,
Heftetikett, kostenlose Materialien.

FÜR DEN EINBAU IN WORDPRESS
Das Formular entspricht [mmm_probestunde] im Theme (wordpress/):
Felder name, kontakt, fach, klasse, nachricht → admin-post.php.
Die Startseite des Themes kann durch diese Seite ersetzt werden.

PLATZHALTER: Tafelbilder sind Beispiele; Fotos fehlen; Antwortzeit
bewusst ohne Versprechen ("Marcel meldet sich persönlich").

GEPRÜFT (Playwright, 390 und 1440 px): kein seitliches Scrollen, eine H1,
keine JS-Fehler; ganzer Ablauf durchgeklickt inkl. Fehlermeldungen,
Hinweis für Abschlussklassen und Danke-Ansicht. Am Handy ist der
Probestunden-Button im ersten Bildschirm sichtbar.
