// p8 „Das Firmennetz“ – keine verpackten Dateien.
// Exporte/Daten nie anfassen (grep "Jeder:Voll", ";ja;ja;ja$", ";smb;1$", ";4625;", sort/uniq über Namen).
// Zeilenweise übersetzt werden nur LIESMICH.txt, befunde/*.txt und ziel/ZIEL.txt.
export default {
  special(name, data, T, path) {
    if (name === 'LIESMICH.txt' || path.includes('/befunde/') || path.startsWith('/ziel/')) return null;
    return data;
  },
};
