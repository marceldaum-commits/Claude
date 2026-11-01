# Neue Website der Christian-Schad-Grundschule Nilkheim

Entwurf für einen Neuauftritt von https://www.christian-schad-volksschule.de (bisher WordPress / Colibri).

- **`index.html`** – die komplette neue Website in einer Datei (HTML, CSS, JS, alle Inhalte). Kein Build, kein CMS nötig: Datei öffnen oder auf jeden Webspace hochladen.
- **`inhalte/`** – gesicherte Inhalte der alten Website, eine Markdown-Datei pro Seite (mit Quell-URL). Viele Texte liegen nur sinngemäß vor, weil das Abrufwerkzeug lange Passagen nicht wörtlich ausgibt; Namen, Zeiten, Nummern sind exakt.

## Was neu ist
- Startseite mit **„Der Schultag“**: Uhrzeit, Hinweis je nach Tageszeit (z. B. „Krankmeldung noch bis 7:40 Uhr“), Tagesband 7:30–16:00 (Frühbetreuung, Unterricht, OGT, GGT) und nächster Termin.
- **Krankmelden** immer sichtbar oben rechts.
- **Suche über alles** (Taste `/` oder Strg+K): Seiten, Eltern-ABC, Termine.
- **Eltern-ABC** mit Sofortfilter und Buchstaben-Sprung.
- **Termine** mit automatischer Markierung „Als Nächstes“, vergangene werden ausgeblendet.
- Ganztag OGT/GGT als Gegenüberstellung, Team als Übersicht, Kopieren-Knöpfe für Telefon/E-Mail.
- Hell/Dunkel, voll mobil, barrierearm (große, gut lesbare Schrift Atkinson Hyperlegible, Tastaturbedienung, Sprunglink).
- 25 Unterseiten über `#anker` (z. B. `index.html#ganztag`).

## Pflege
Termine, Eltern-ABC, Schulleben und alle Seitentexte stehen oben im `<script>` als Daten (`TERMINE`, `ABC`, `LEBEN`, `P[...]`). Ein Termin = eine Zeile.

## Offene Punkte / Unstimmigkeiten der alten Seite
- Mittagessen: Startseite nennt Mosaik Mehrgenerationenhaus (Elternbrief 2022), das Eltern-ABC Bantschow Kids – übernommen wurde Bantschow Kids. Bitte prüfen.
- Fax: Impressum 06021 4561099, Datenschutz 06021 448049. E-Mail des Datenschutzbeauftragten ist auf der alten Seite unvollständig und wurde weggelassen.
- Leitbild liegt nur als Bild vor – Text sollte nachgereicht werden.
- Fotos werden derzeit direkt vom alten Server geladen (`wp-content/uploads`). Für den Umzug Bilder in einen Ordner `bilder/` kopieren und die Konstante `IMG` anpassen. Ohne Bild erscheint ein farbiges Platzhalterfeld.
