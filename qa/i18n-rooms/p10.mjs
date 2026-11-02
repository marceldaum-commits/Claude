// p10 „Die Abschlussprüfung“.
// notiz.txt = Hex(Base64(Text)): entpacken, übersetzen, wieder verpacken (eine Zeile, wie im Original).
// Daten nie anfassen: woerter.txt, bewertung.csv (grep personenbezogen → Kategorie = Dateiname), passwd.txt, erlaubt.txt,
// access.log, massnahmen.csv. auftrag.txt zeilenweise (Domains und „IN SCOPE:“ haben keinen Schlüssel, letzte Zeile bleibt die Domain).
const unpack = (data) => Buffer.from(Buffer.from(data.trim(), 'hex').toString('utf8'), 'base64').toString('utf8');
const pack = (s) => Buffer.from(Buffer.from(s, 'utf8').toString('base64'), 'utf8').toString('hex');
export default {
  decode(name, data) { return name === 'notiz.txt' ? unpack(data) : null; },
  special(name, data, T) {
    if (name === 'notiz.txt') return pack(T.t(unpack(data))) + '\n';
    if (/^(woerter\.txt|bewertung\.csv|passwd\.txt|erlaubt\.txt|access\.log|massnahmen\.csv)$/.test(name)) return data;
    return null;
  },
  // Vorschlag für die App: die simulierte Webseite bleibt original (X-Powered-By, Pfade, kunden.csv werden per grep/curl gesucht).
};
