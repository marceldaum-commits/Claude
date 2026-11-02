# Handübersetzungen (Sprache & Qualität)

Je Sprache und Raum eine Datei: `i18n/<sprache>/<raumid>.json`, z. B. `i18n/uk/w1.json`.
Inhalt: `{ "<exakter deutscher Originaltext>": "<Übersetzung>" }` – ganze Zeilen bzw. ganze Strings wie im Quelltext.

Regeln für den Loader:
- `{code}` im Schlüssel und im Wert steht für einen Code `KLY{16 Zeichen}` (im Quelltext `${F.lN}`).
  Beispiel: `"Dein erster Code: {code}": "Your first code: {code}"`.
- Chat-Zeilen in Stufe 3 haben die Form `Name: Satz`. Übersetzt wird nur der Satz, der Name bleibt.
- Base64- und Spiegeltexte (Stufe 6, 7, 9) müssen VOR dem Codieren bzw. Umdrehen übersetzt werden.
  Die Protokollzeile `… GEHEIM <base64>` bleibt im Aufbau gleich (grep GEHEIM, cut -f3).
- Zeilen ohne Eintrag bleiben deutsch bzw. original (z. B. `    entsperren CODE`, VCARD-Technik, Nummern).
- Nie übersetzt: Befehle, Optionen, Datei-/Ordnernamen, Pfade, Codes, Benutzernamen, Suchwörter
  (z. B. `Treffpunkt`, `GEHEIM` – in Texten steht dann eine Erklärung in Klammern).

Prüfen: `node qa/check-i18n.mjs <raum>` (z. B. w1, w4): Schlüssel gegen Original, Befehle unverändert, Raum mit dem echten Loader (js/i18n.js) komplett durchspielen.

## shell.json (Terminal-Meldungen, gilt in allen Räumen)

`i18n/<sprache>/shell.json`: ganze Ausgabezeilen (ohne `\n`) aus js/shell.js, js/terminal-ui.js und den
entsperren-Befehlen (Nachtfalter, Kollektiv, Funkturm, Leitern).
- `{1}`, `{2}` … = variable Teile (Befehl, Pfad, Zahl). Sie bleiben unübersetzt und dürfen im Wert umgestellt werden.
  Kommt derselbe Platzhalter zweimal vor (z. B. `cd ../{1}`), muss er beide Male gleich sein.
- Reihenfolge beim Vergleichen: erst exakte Zeile, dann Muster – spezifische Muster (mehr fester Text) zuerst,
  sonst schluckt z. B. `{1}: {2}: Datei oder Verzeichnis nicht gefunden` die ls-Meldung.
- Nur die Anzeige übersetzen, nie Daten in Pipes, Umleitungen oder Dateien (sonst brechen grep/cut-Rätsel).
- Absichtlich nicht enthalten: Monatsnamen in `ls -l` (Okt …), Job-Zustände (Läuft/Fertig), `stat -c %F`,
  raumeigene Werkzeuge (nmap, nc, xor, suche …) – kommen mit den jeweiligen Räumen.
- Englisch und Ukrainisch folgen den echten Linux-Meldungen (z. B. „No such file or directory“ /
  „Немає такого файла або каталогу“), damit man sie später im echten Kali wiedererkennt.

Prüfen: `node qa/check-i18n-shell.mjs` (löst ca. 70 echte Fehler aus und prüft, dass jede deutsche Zeile übersetzt wird).

## w4 Funkturm – Besonderheiten

- Absichtlich NICHT übersetzt: `Code: {code}` (Etage 4: die Notiz muss genau 73 Bytes bleiben, `find -size 73c`),
  `Signal stabil` (`grep -v`), `AKTIV`/`AUS` (Vergleich in der Schleife), `=== ANFANG/ENDE GEHEIM ===` (`grep GEHEIM`),
  Protokoll-, Tabellen- und Zeichensalat-Zeilen, die Zeile `echo "Tor offen. …"` in tor.sh.
- translateFS nötig für: `etage10/nachricht.b64` (zweimal Base64: zweimal entpacken, übersetzen, zweimal einpacken)
  und `etage11/spiegel.txt` (erst umdrehen, dann ROT13 zurück, übersetzen, wieder ROT13 und umdrehen).
  ROT13 verschiebt nur A–Z/a–z, kyrillischer Text bleibt dabei lesbar; der Code wird trotzdem korrekt verschoben.

## ui.json (Willkommens-Dialog, Lernort, Startseite)

Reine Sätze und Beschriftungen ohne HTML aus js/main.js (locationModal, views.heute, EXTERNAL[].why) und
js/content/curriculum.js (LOCATIONS label/short/desc). Zusammengesetzte Stellen als Muster mit benannten Platzhaltern:
`Hallo {name}!` (ohne Namen: `Hallo!`), `{n} Abzeichen →`, `{done} von {all} geknackt`, `{n} % geschafft`, `Raum: {title}`.

## level1.json (Lektionen, Übungen, Tipps, Prüfung)

Gesammelt mit `node qa/extract-level1.mjs` (title/intro, concepts name/zweck/wirkung/regel, args[][1], fehler[],
Übungen title/ziel/auftrag/scope/beleg/hinweis, knobel q/options t+why, nach, real-Texte, Rückmeldungen aus check(),
uebungsTipps(), Prosa-Zeilen der Sandbox-Dateien, EXAM title/rules/topic/q/options).
- Original bleibt alles, was check() vergleicht oder was man exakt eintippen soll (z. B. die drei Zeilen
  „08:00 Alarm eingegangen …“, „Nicht löschen: Übergabe von der Frühschicht.“, „Failed password“, ERROR, debug=true,
  das Präfix „ALT“), außerdem Config-/Log-/hosts-Zeilen.
- Spickzettel-Tipps sind aus den übersetzten Lektionstiteln und Konzeptnamen zusammengesetzt; zusätzlich gibt es das Muster
  `Schau im Spickzettel „{titel}“ nach – dort stehen die passenden Werkzeuge: {begriffe}.`
- Shell-Meldungen in Fragen („Keine Berechtigung“ …) stehen so, wie das übersetzte Terminal sie zeigt (shell.json).

Prüfen: `node qa/check-i18n-level1.mjs` (Schlüssel, Befehle per codeify, alle 16 Sandbox-Übungen + 3 Praxisaufgaben der Prüfung
mit übersetzten Dateien und Musterlösung lösbar).

ui.json enthält außerdem die Bedienelemente der Raumseite und der Übungsseite (Tipp-Knopf, Punkte, Rückmeldungen,
Feldnamen), weil Google dort falsch übersetzte („Tipp“ → „Чайові“ = Trinkgeld, „5 P.“ → „5 с.“, „Beleg“ → „Dokument“).
Muster mit Platzhaltern wie `💡 Tipp {i}/{n} · danach noch {p} P.`, `noch {a} von {b} P.`, `Task {n}: {title}`, `Raum · {title}`.
