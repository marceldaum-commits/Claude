// Steckbrief w6 „Die Bewerbung“ (Leiter, gelöst über floors[].solve).
// Fast alles spielt auf der simulierten Webseite (sh.web) – die übersetzt die App nicht; die Seiten bleiben deutsch.
// Dateien: woerter.txt (Wörter = Pfade), wort.sha256 (Hash) und bewerbungsfoto.jpg (Rohdaten) nie anfassen.
export default {
  allow: ['curl ab'], // codeify erkennt „curl ab“ (aus „mit curl ab.“) fälschlich als Befehl
  decode(name) { if (name.endsWith('.jpg')) return ''; return null; },
  special(name, data) {
    if (name.endsWith('.jpg') || name === 'wort.sha256' || name === 'woerter.txt') return data;
    return null;
  },
};
