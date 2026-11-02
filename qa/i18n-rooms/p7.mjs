// p7 „Schwachstellen-Sprechstunde“ – keine verpackten Dateien.
// Daten (Inventar, Scanner-/Scanbericht, Versionen, Paketlisten, Risiko-Tabelle) nie anfassen: grep/sort/cut/uniq arbeiten darauf.
// db.csv in fall01 zeilenweise (nur die Hinweis-Prosa der Kalendra-Zeile ist übersetzt; „suche kalendra 1.9“ trifft weiterhin).
export default {
  special(name, data, T, path) {
    if (/^(inventar\.txt|scanner\.txt|scanbericht\.csv|risiko\.csv|pakete-(vorher|nachher)\.txt)$/.test(name) || path.includes('/versionen/')) return data;
    if (name === 'db.csv' && path.startsWith('/fall00/')) return data;
    return null;
  },
};
