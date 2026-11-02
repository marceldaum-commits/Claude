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

Prüfen: `node qa/check-i18n-w1.mjs` (Schlüssel gegen Original, geschützte Teile, Raum mit Muster-Loader komplett durchspielen).
