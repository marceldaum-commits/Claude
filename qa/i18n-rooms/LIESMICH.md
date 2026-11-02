# Steckbriefe für qa/check-i18n.mjs

Eine Datei je Raum: `qa/i18n-rooms/<raum>.mjs` mit `export default { … }`:
- `decode(name, data)` → Klartext einer verpackten Datei (Base64, Hex, ROT13 …) für den Abgleich der Schlüssel, sonst `null`.
- `special(name, data, T, path)` → Vorschlag für translateFS: übersetzter Inhalt, `data` (= nicht anfassen) oder `null` (= zeilenweise).
- `web(sh, T)` → optional: übersetzt simulierte Webseiten in `sh.web` (Vorschlag für die App).
- `solve(run, step)` → nur für Räume ohne `floors` (Leitern werden automatisch über `floors[].solve` gelöst).
