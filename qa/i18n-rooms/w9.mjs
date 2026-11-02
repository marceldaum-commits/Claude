// Steckbrief w9 „Das Phantom“ (Leiter, gelöst über floors[].solve).
// Verpackt → entpacken, übersetzen, wieder verpacken:
//   spur00/botschaft.txt = Base64url(Text) · spur06/geheim.hex = Hex(Text XOR 'nebelkrähe') · spur09/letzte.txt = Base64(rev(ROT13(Hex(Text))))
// Nie anfassen: configs/*.conf + hinweis.md5 (MD5 über Originalinhalt, darum auch kein Schlüssel "Code: {code}"),
//   fund.jwt, ftp-mitschnitt.txt, web.log, vpn.log, gedicht.txt (cut -c1 liest die Anfangsbuchstaben), tatort.jpg, schluessel-hinweis.txt.
// Webseiten (sh.web: phantom-dev.sim) bleiben deutsch – kein web()-Vorschlag.
const KEY = Buffer.from('nebelkrähe', 'utf8'); // wie in js/content/leitern.js (Spur 6)
const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');
const unb64 = (s) => Buffer.from(s.replace(/\s+/g, ''), 'base64').toString('utf8');
const b64url = (s) => b64(s).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const unb64url = (s) => unb64(s.trim().replace(/-/g, '+').replace(/_/g, '/'));
const rev = (s) => [...s].reverse().join('');
const rot13 = (s) => s.replace(/[A-Za-z]/g, c => String.fromCharCode((c <= 'Z' ? 65 : 97) + ((c.charCodeAt(0) - (c <= 'Z' ? 65 : 97) + 13) % 26)));
const hex = (s) => Buffer.from(s, 'utf8').toString('hex');
const unhex = (s) => Buffer.from(s.replace(/\s+/g, ''), 'hex').toString('utf8');
const xor = (buf) => Buffer.from([...buf].map((b, i) => b ^ KEY[i % KEY.length]));
const unxor = (h) => xor(Buffer.from(h.replace(/\s+/g, ''), 'hex')).toString('utf8');
const enxor = (s) => xor(Buffer.from(s, 'utf8')).toString('hex');
const unletzte = (d) => unhex(rot13(rev(unb64(d).trim())));
const DATA = /\.(conf|md5|jwt|log|jpg)$|^(ftp-mitschnitt|gedicht|schluessel-hinweis)\.txt$/;
export default {
  allow: ["cut -d' ' -f1 · aus vpn.log: das letzte Wort – awk '"], // codeify greift über zwei Befehle hinweg (Fehlerkennung)
  decode(name, data) {
    if (name === 'botschaft.txt') return unb64url(data);
    if (name === 'geheim.hex') return unxor(data);
    if (name === 'letzte.txt') return unletzte(data);
    if (name.endsWith('.jpg')) return '';
    return null;
  },
  special(name, data, T) {
    if (name === 'botschaft.txt') return b64url(T.t(unb64url(data))) + '\n';
    if (name === 'geheim.hex') return enxor(T.t(unxor(data))) + '\n';
    if (name === 'letzte.txt') return b64(rev(rot13(hex(T.t(unletzte(data)))))) + '\n';
    if (DATA.test(name)) return data;
    return null;
  },
};
