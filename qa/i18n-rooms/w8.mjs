// Steckbrief w8 – Der Tresorraum (makeLadder, gelöst über floors[].solve)
// Keine verpackten Dateien, die übersetzt werden. tresor.sh enthält Base64 – bleibt unverändert (nur die echo-Zeile „Falscher Modus“ hat einen Schlüssel).
export default {
  decode(name, data) {
    if (name === 'tresor.sh') return null; // Base64 im echo bleibt verpackt (code-abhängig, kein Schlüssel)
    return null;
  },
  // Vorschlag translateFS: zeilenweise, aber Daten, nach denen der Lösungsweg sucht/zählt, nie anfassen.
  special(name, data, T, path = '') {
    if (['datensaetze.txt', 'liste.txt', 'bericht.txt', 'a.log', 'b.log'].includes(name)) return data; // awk NF, Aktennamen, grep -o TR-, wc
    if (name.endsWith('.csv')) return data;                    // konten-a/b.csv: OFFEN/AKTIV
    if (path.includes('/reihen/') || path.includes('/tief/')) return path.includes('/tief/') && /KLY\{/.test(data) ? null : data; // Zahlen; tief/: nur die Code-Datei (TRESOR bleibt im Text)
    return null; // alles andere zeilenweise (Code-Dateien, LIESMICH, ZIEL, archiv/, tresor.sh nur echo-Zeile)
  },
};
