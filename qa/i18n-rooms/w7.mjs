// Steckbrief w7 „Operation Nebel“ (Leiter, gelöst über floors[].solve).
// phase06/nachricht.txt = Base64(ROT13(Hex(Text))) → entpacken, übersetzen, wieder verpacken.
// Daten nie anfassen: zone.txt, token.txt, woerter.txt, nginx-*.conf, mitschnitt.txt, zugriffe.log.
// git-log.txt zeilenweise: nur die Commit-Nachrichten haben Schlüssel (grep "^-.*passwort" bleibt intakt).
// Webseiten (sh.web: dev/api/portal/bericht.nebelwerk.sim) bleiben deutsch – kein web()-Vorschlag.
const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');
const unb64 = (s) => Buffer.from(s.replace(/\s+/g, ''), 'base64').toString('utf8');
const rot13 = (s) => s.replace(/[A-Za-z]/g, c => String.fromCharCode((c <= 'Z' ? 65 : 97) + ((c.charCodeAt(0) - (c <= 'Z' ? 65 : 97) + 13) % 26)));
const hex = (s) => Buffer.from(s, 'utf8').toString('hex');
const unhex = (s) => Buffer.from(s.replace(/\s+/g, ''), 'hex').toString('utf8');
const DATA = new Set(['zone.txt', 'token.txt', 'woerter.txt', 'nginx-alt.conf', 'nginx-neu.conf', 'mitschnitt.txt', 'zugriffe.log']);
export default {
  decode(name, data) { return name === 'nachricht.txt' ? unhex(rot13(unb64(data))) : null; },
  special(name, data, T) {
    if (name === 'nachricht.txt') return b64(rot13(hex(T.t(unhex(rot13(unb64(data))))))) + '\n';
    if (DATA.has(name)) return data;
    return null;
  },
};
