# Neue Website der Christian-Schad-Grundschule Nilkheim

Entwurf für einen Neuauftritt von https://www.christian-schad-volksschule.de (bisher WordPress / Colibri).

## Dateien
- **`index.html`** – die fertige Website (eine Datei, kein Server nötig). Wird erzeugt, nicht von Hand bearbeiten.
- **`vorlage.html`** – Gestaltung, Startseite, Menü, Termine.
- **`build.py`** – baut `index.html` aus Vorlage und Inhalten: `python3 schule/build.py`
- **`inhalte/*.md`** – von der alten Website gesicherte Inhalte, eine Datei pro Seite.
- **`inhalte/wortlaut/`** – Platz für den **Originalwortlaut**. Liegt hier eine Datei mit gleichem Namen (z. B. `ueber-uns.md`), nimmt `build.py` diese und der Entwurfs-Hinweis auf der Seite verschwindet.

## Grundsatz: nur Texte der alten Website
Alle sichtbaren Texte stammen von der bisherigen Website: Menüpunkte und Seitentitel, die Startseite
(Begrüßung, „Leben – Lernen – Wohlfühlen im Stadtteil Nilkheim“, Schnellzugriff, Über uns, Aktuelles,
Hier wachsen Talente, Ukraine-Hilfe), Termine, Galerie-Bildunterschriften und alle Unterseiten.
Dazu kommen nur Bedienelemente (Suche, Kopieren, Bild vergrößern).

**Wörtlich** sind: Startseite, Termine, Galerie-Bildunterschriften, Ansprechpartner, Team Lehrkräfte,
Elternbeirat, Schulhausordnung, Pausenordnung, Unsere Ganztagsangebote.

**Noch sinngemäß** (auf der Seite gelb als „Entwurf“ markiert): Über uns, Kooperation, Schulsozialpädagogin,
Von A bis Z, Informationen, Kindergärten, Filby, Pausenhelfer, Klassenrat, Singklasse, Schulchor,
Medienkonzept, Grüne Meilen, Bürgerfest, Schulkleidung, Impressum, Datenschutz.
Grund: Das Abrufwerkzeug gibt fremde Seiten nur in kurzen Zitaten wieder. Für den Originalwortlaut bitte
im WordPress-Admin **Werkzeuge → Daten exportieren** (XML) ausführen oder die Texte kopieren und als
`inhalte/wortlaut/<seite>.md` ablegen, dann `build.py` laufen lassen.

## Bilder
103 Originalbilder sind eingebunden (Startseite, Galerie mit 16 Alben, Klassenrat, Medienkonzept,
Schulkleidung, Elternbeirat, Leitbild …), jedes per Klick groß ansehbar. Sie werden derzeit direkt vom
alten Server (`wp-content/uploads`) geladen. Beim Umzug in einen Ordner kopieren und `UP` in
`vorlage.html` / `build.py` anpassen. Nicht erreichbar waren: Bürgerfest-Fotos, Grüne-Meilen-Fotos,
„Räuber Hotzenplotz“.

## Funktionen
- Aufklapp-Menü wie das Original (Schule, Bildungsangebote mit Untergruppen), am Handy als Akkordeon
- Suche über alle Seiten (Taste `/`), „Von A bis Z“ mit Filter, Termine mit „Als Nächstes“
- Galerie mit Großansicht und Blättern, Hell/Dunkel, mobil, Tastaturbedienung

## Unstimmigkeiten der alten Seite
- Schulcatering: Startseite nennt Mosaik Mehrgenerationenhaus, „Von A bis Z“ nennt Bantschow Kids.
- Fax: Impressum 06021/4561099, Datenschutz 06021/448049.
- E-Mail des Datenschutzbeauftragten ohne Domain-Endung.
- Leitbild nur als Bild vorhanden.
