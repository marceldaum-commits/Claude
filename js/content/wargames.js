// Wargames: Linux lernen als Spiel – jedes Level ist ein Rätsel, die Lösung öffnet das nächste.
// w1 „Nachtfalter“: Handy/überall, im Sandbox-Terminal (SIMULATION).
// w2 „Der Kellerserver“: PC, echter Linux-Server per Docker + SSH (labs/kly-keller), nur 127.0.0.1.
// Codes = Flags aus dem persönlichen Lab-Token: KLY{ sha256("<token>:<raum>:lN")[:16] }

import { HOME } from '../shell.js';

const T = (...lines) => lines.join('\n');
const NF = HOME + '/nachtfalter';
const STUFEN = 10; // stufe0 … stufe9 mit Rätsel, stufe10 = Finale

// Kleiner deterministischer Zufall, damit das Rätsel bei jedem Neustart gleich aussieht
function rng(seed) { let x = seed >>> 0 || 1; return () => (x = (x * 1664525 + 1013904223) >>> 0) / 2 ** 32; }
const b64 = (s) => (typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(s))) : Buffer.from(s, 'utf8').toString('base64'));
const unb64 = (s) => (typeof atob === 'function' ? decodeURIComponent(escape(atob(s))) : Buffer.from(s, 'base64').toString('utf8'));

function openStufe(sh, n) {
  const d = sh.fs.get(`${NF}/stufe${n}`);
  if (d) { d.owner = 'seppi'; d.mode = 0o755; }
}

function nachtfalterSetup(sh, F, solved = new Set()) {
  const p = (path, c, m, o) => sh.fs.put(`${NF}/${path}`, c, m, o);
  const R = rng(4711);

  p('LIESMICH.txt', T(
    'Dieses Handy hast du im Zug gefunden. Der Sperrbildschirm zeigt nur einen Namen: Mara Falk.',
    'Auf dem Telefon: ein Ordner „nachtfalter“ mit verschlossenen Stufen.',
    '',
    'Jede Stufe versteckt einen Code KLY{…}. Mit',
    '    entsperren CODE',
    'öffnest du die nächste Stufe. Fang bei stufe0 an.',
    '',
    'Hinweis: Das ist eine SIMULATION im Browser – echte Befehle, aber kein echtes System.', ''));

  // Stufe 0 – ls, cd, cat
  p('stufe0/hallo.txt', T('Hallo, wer auch immer du bist.', 'Wenn du das liest, hast du mein Handy. Gut.', 'Ich brauche jemanden, der hinschaut, wo andere wegschauen.', '', `Dein erster Code: ${F.l0}`, '', '– Mara', ''));

  // Stufe 1 – versteckte Dateien
  p('stufe1/notizen.txt', 'Hier ist nichts. Wirklich nicht. Jedenfalls nichts, was man auf den ersten Blick sieht.\n');
  p('stufe1/.tagebuch', T('Tagebuch, 3. Oktober:', 'Sie beobachten mich. Ich verstecke meine Spuren wie Linux seine Konfigurationsdateien:', 'mit einem Punkt am Anfang.', '', `Code: ${F.l1}`, ''));

  // Stufe 2 – Dateigrößen (ls -l)
  const leer = 1 + Math.floor(R() * 40);
  for (let i = 1; i <= 40; i++) {
    const name = `stufe2/fotos/IMG_${String(2000 + i)}.jpg`;
    p(name, i === leer ? `Kein Foto. Eine Nachricht.\nCode: ${F.l2}\n` : '');
  }
  p('stufe2/hinweis.txt', 'Die Fotos sind alle kaputt – leer, 0 Bytes. Fast alle.\n');

  // Stufe 3 – grep -r
  const kontakte = ['Jonas', 'Ayse', 'Paul', 'Lena', 'Mehmet', 'Sophie', 'Tim', 'Nina', 'Kai', 'Elif', 'Ben', 'Mia', 'Luca', 'Hanna', 'Noah', 'Emma', 'Finn', 'Lea', 'Max', 'Zoe'];
  const saetze = ['Kommst du morgen?', 'Hab die Unterlagen.', 'Lol', 'Ruf mich an.', 'Bin gleich da.', 'Danke dir!', 'Wann genau?', 'Ok.', 'Kaffee später?', 'Passt.'];
  const wer = Math.floor(R() * kontakte.length);
  kontakte.forEach((k, i) => {
    const lines = Array.from({ length: 12 }, () => `${k}: ${saetze[Math.floor(R() * saetze.length)]}`);
    if (i === wer) lines.splice(7, 0, `${k}: Der Treffpunkt ist geheim. Code: ${F.l3}`);
    p(`stufe3/chats/${k.toLowerCase()}/verlauf.txt`, lines.join('\n') + '\n');
  });
  p('stufe3/hinweis.txt', 'Irgendwer hat mir den „Treffpunkt“ geschrieben. 20 Chats durchklicken? Es gibt Werkzeuge, die ganze Ordner durchsuchen.\n');

  // Stufe 4 – sort | uniq -c | sort -nr
  const nummern = Array.from({ length: 15 }, (_, i) => `0151-${String(4400000 + Math.floor(R() * 99999)).padStart(7, '0')}`);
  const top = nummern[Math.floor(R() * nummern.length)];
  const anrufe = [];
  for (let i = 0; i < 300; i++) anrufe.push(nummern[Math.floor(R() * nummern.length)]);
  for (let i = 0; i < 45; i++) anrufe.splice(Math.floor(R() * anrufe.length), 0, top);
  p('stufe4/anrufe.log', anrufe.join('\n') + '\n');
  nummern.forEach(n => p(`stufe4/kontakte/${n}.vcf`, n === top ? `BEGIN:VCARD\nFN:Unbekannt\nTEL:${n}\nNOTE:Code ${F.l4}\nEND:VCARD\n` : `BEGIN:VCARD\nFN:Kontakt\nTEL:${n}\nEND:VCARD\n`));
  p('stufe4/hinweis.txt', 'Eine Nummer hat mich ständig angerufen. Welche am häufigsten? Ihre Kontaktkarte liegt in kontakte/.\n');

  // Stufe 5 – chmod
  p('stufe5/tresor', null, 0o000);
  p('stufe5/tresor/inhalt.txt', `Du hast den Tresor geöffnet. Rechte sind nur Einstellungen – wenn sie DIR gehören.\nCode: ${F.l5}\n`, 0o000);
  p('stufe5/hinweis.txt', 'Mein Tresor: verschlossen. Aber er gehört dir (sieh dir ls -l an). Und was dir gehört, darfst du ändern.\n');

  // Stufe 6 – base64
  p('stufe6/nachricht.b64', b64(`Gut gemacht. base64 ist keine Verschlüsselung – nur eine andere Schreibweise.\nCode: ${F.l6}\n`).replace(/(.{60})/g, '$1\n') + '\n');
  p('stufe6/hinweis.txt', 'Diese Nachricht sieht verschlüsselt aus. Ist sie aber nicht. Die Endung verrät die Schreibweise.\n');

  // Stufe 7 – rev
  const spiegel = `Spiegelschrift hält nur Menschen auf, keine Maschinen. Code: ${F.l7}`;
  p('stufe7/spiegel.txt', [...spiegel].reverse().join('') + '\n');
  p('stufe7/hinweis.txt', 'Ich habe die Nachricht rückwärts geschrieben. Es gibt ein Werkzeug, das Zeilen umdreht.\n');

  // Stufe 8 – find -perm
  const ordner = ['2024', '2025', '2026'];
  const ziel = Math.floor(R() * 36);
  let k = 0;
  for (const j of ordner) for (let m = 1; m <= 12; m++, k++) {
    const path = `stufe8/archiv/${j}/${String(m).padStart(2, '0')}/bericht.txt`;
    if (k === ziel) p(path, `Privat. Nur für mich lesbar.\nCode: ${F.l8}\n`, 0o600);
    else p(path, 'Monatsbericht: nichts Besonderes.\n', 0o644);
  }
  p('stufe8/hinweis.txt', '36 Berichte. Alle für jeden lesbar (644) – bis auf EINEN, den ich nur für mich gesperrt habe (600). Lass dir die Suche abnehmen.\n');

  // Stufe 9 – Pipeline: versteckter Ordner, grep, cut, base64
  const log = [];
  for (let i = 0; i < 120; i++) log.push(`2026-10-${String(1 + (i % 28)).padStart(2, '0')} INFO ping ${Math.floor(R() * 9999)}`);
  log.splice(77, 0, `2026-10-21 GEHEIM ${b64(`Letzter Code: ${F.l9}`)}`);
  p('stufe9/.funk/protokoll.log', log.join('\n') + '\n');
  p('stufe9/hinweis.txt', 'Mein Funkprotokoll liegt hier irgendwo, gut versteckt. Eine Zeile ist als GEHEIM markiert. Das zweite… nein, das DRITTE Feld ist codiert. Du weißt inzwischen, wie man so etwas liest.\n');

  // Finale
  p('stufe10/finale.txt', T('Du hast es geschafft.',
    '',
    'Ich bin nicht verschwunden. Dieses Handy WAR der Test.',
    'Wer Dateien, Rechte, Suchen und Pipes so sicher beherrscht wie du, ist bereit für den nächsten Schritt.',
    '',
    'Der Kellerserver wartet auf dich – am PC, mit echtem SSH. (Räume → „Der Kellerserver“)',
    '',
    '– Mara „Nachtfalter“ Falk', ''));

  // Alle Stufen ab 1 verschließen; gelöste wieder öffnen
  for (let n = 1; n <= STUFEN; n++) { const d = sh.fs.get(`${NF}/stufe${n}`); d.owner = 'root'; d.mode = 0o700; }
  for (let n = 0; n < STUFEN; n++) if (solved.has(`l${n}`)) openStufe(sh, n + 1);
  sh.cwd = NF;
}

// base64 und rev für Sandbox-Räume (die Grund-Shell kennt sie nicht)
export function textTools() {
  const read = (sh, pos, stdin, name) => {
    const { parts, err } = sh._inputs(pos, stdin, name);
    return { text: parts.map(x => x.data).join(''), err };
  };
  return {
    base64(args, { sh, stdin }) {
      const decode = args.includes('-d') || args.includes('--decode');
      const { text, err } = read(sh, args.filter(a => !a.startsWith('-')), stdin, 'base64');
      if (err) return { out: '', err, code: 1 };
      try {
        return decode ? { out: unb64(text.replace(/\s+/g, '')), code: 0 } : { out: b64(text).replace(/(.{76})/g, '$1\n') + '\n', code: 0 };
      } catch { return { out: '', err: 'base64: ungültige Eingabe\n', code: 1 }; }
    },
    rev(args, { sh, stdin }) {
      const { text, err } = read(sh, args, stdin, 'rev');
      if (err) return { out: '', err, code: 1 };
      return { out: text.replace(/\n$/, '').split('\n').map(l => [...l].reverse().join('')).join('\n') + '\n', code: 0 };
    },
  };
}

// Zusätzliche Befehle nur in diesem Spiel
function nachtfalterCommands({ F, solve }) {
  const entsperren = (args, { sh }) => {
    const code = String(args[0] || '').trim();
    if (!code) return { out: '', err: 'Aufruf: entsperren CODE   (z. B. entsperren KLY{…})\n', code: 2 };
    for (let n = 0; n < STUFEN; n++) {
      if (F[`l${n}`] === code) {
        openStufe(sh, n + 1);
        solve(`l${n}`, code);
        return { out: n + 1 === STUFEN ? '🔓 Letzte Tür offen: stufe10. Lies das Finale.\n' : `🔓 Richtig! stufe${n + 1} ist jetzt offen.  →  cd ../stufe${n + 1}\n`, code: 0 };
      }
    }
    return { out: '', err: /^KLY\{[0-9a-f]{16}\}$/.test(code) ? '🔒 Falscher Code.\n' : '🔒 Falscher Code. Format: KLY{16 Zeichen 0-9/a-f}\n', code: 1 };
  };
  return { entsperren, unlock: entsperren, ...textTools() };
}

// hints: Tipp-Leiter vom Denkanstoß bis zur Lösung – jeder Tipp kostet Punkte
const flagQ = (n, hints, points = 10) => ({ id: 'q1', type: 'flag', flag: `l${n}`, q: `Code aus stufe${n}`, points, hints });
const kq = (n, hints, points = 10) => ({ id: 'q1', type: 'flag', flag: `l${n}`, q: 'Code', points, hints });

export const WARGAMES = [
  // ================================================================ W1 – Handy
  {
    id: 'w1', title: 'Nachtfalter', type: 'wargame', level: 'L1', difficulty: 'leicht → mittel', minutes: 60,
    tools: ['ls -a / ls -l', 'cat', 'grep -r', 'sort | uniq -c', 'chmod', 'find -perm', 'base64', 'rev', 'Pipes'],
    desc: 'Wargame fürs Handy: Du findest das Telefon einer Hackerin. Zehn verschlossene Stufen – jede Lösung öffnet die nächste.',
    ziel: 'Linux-Grundbefehle so oft und so kombiniert anwenden, dass sie sitzen – ohne Auswendiglernen.',
    scope: 'Nur das Sandbox-Terminal in diesem Raum (~/nachtfalter). SIMULATION – kein echtes System.',
    stop: 'Keine nötig – die Sandbox ist isoliert.',
    cleanup: 'Nichts nötig. Dein Fortschritt bleibt gespeichert, auch nach „Neu starten“.',
    machine: { kind: 'sandbox' },
    welcome: 'Nachtfalter · Sandbox bereit. Start: cat LIESMICH.txt · help zeigt Befehle.',
    flags: Array.from({ length: STUFEN }, (_, n) => `l${n}`),
    setup: nachtfalterSetup,
    commands: nachtfalterCommands,
    onSolve(sh, flag) { const n = +flag.slice(1); openStufe(sh, n + 1); },
    tasks: [
      { id: 's0', title: 'Stufe 0 – Das Handy', body: 'Sieh dich um. Wo bist du, was liegt hier? Lies, was da ist.', questions: [flagQ(0, ["Du bist im Ordner ~/nachtfalter. Was liegt hier eigentlich?", "ls zeigt den Inhalt des aktuellen Ordners. Lies zuerst LIESMICH.txt.", "Mit cd stufe0 wechselst du in den ersten Ordner, mit ls siehst du, was drin ist.", "Lösung: cd stufe0 → cat hallo.txt → den Code KLY{…} kopieren → entsperren KLY{…}"], 5)] },
      { id: 's1', title: 'Stufe 1 – Nichts zu sehen', body: 'Mara schreibt, hier sei nichts. Glaubst du ihr?', questions: [flagQ(1, ["Mara sagt, hier sei nichts. Aber Linux versteckt manche Dateien absichtlich.", "Dateien, deren Name mit einem Punkt beginnt, zeigt ls normalerweise nicht an.", "ls hat eine Option für „all“: ls -a", "Lösung: cd ../stufe1 → ls -a → cat .tagebuch"])] },
      { id: 's2', title: 'Stufe 2 – Kaputte Fotos', body: 'Vierzig Fotos, alle kaputt. Fast alle.', questions: [flagQ(2, ["Leere Dateien enthalten nichts. Wie erkennst du, welche Datei NICHT leer ist?", "ls kann mehr zeigen als Namen – auch Rechte, Besitzer und Größe.", "ls -l fotos zeigt die Größe in Bytes (die Zahl vor dem Datum). Fast alle haben 0.", "Lösung: ls -l fotos → die Datei mit Größe > 0 suchen → cat fotos/IMG_…jpg"])] },
      { id: 's3', title: 'Stufe 3 – Der Treffpunkt', body: 'Zwanzig Chatverläufe. Einer davon erwähnt den „Treffpunkt“.', questions: [flagQ(3, ["20 Ordner von Hand öffnen dauert ewig. Gibt es ein Werkzeug, das Text sucht?", "grep findet Zeilen, die ein Wort enthalten. Gesucht ist das Wort „Treffpunkt“.", "grep kann mit -r (rekursiv) einen ganzen Ordner samt Unterordnern durchsuchen.", "Lösung: grep -r Treffpunkt chats"])] },
      { id: 's4', title: 'Stufe 4 – Der Dauerrufer', body: 'Wer hat am häufigsten angerufen? Seine Kontaktkarte verrät mehr.', questions: [flagQ(4, ["Du musst zählen, wie oft jede Nummer in anrufe.log vorkommt.", "uniq fasst gleiche Zeilen zusammen – aber nur, wenn sie direkt untereinander stehen. Also vorher sortieren.", "uniq -c schreibt die Anzahl vor jede Zeile. Danach mit sort -nr nach Zahl absteigend sortieren.", "Die Nummer ganz oben ist die gesuchte. Ihre Karte: cat kontakte/NUMMER.vcf", "Lösung: sort anrufe.log | uniq -c | sort -nr | head -1 → cat kontakte/<Nummer>.vcf"], 15)] },
      { id: 's5', title: 'Stufe 5 – Der Tresor', body: 'Verschlossen. Aber wem gehört er eigentlich?', questions: [flagQ(5, ["Der Tresor ist ein Ordner ohne jegliche Rechte. Sieh ihn dir mit ls -l genau an.", "Spalte 3 zeigt den Besitzer: du selbst (seppi). Der Besitzer darf Rechte ändern.", "chmod ändert Rechte. u = Besitzer, r = lesen, x = Ordner betreten.", "Erst den Ordner öffnen (chmod u+rx tresor), dann die Datei darin lesbar machen (chmod u+r tresor/inhalt.txt).", "Lösung: chmod u+rx tresor → chmod u+r tresor/inhalt.txt → cat tresor/inhalt.txt"], 15)] },
      { id: 's6', title: 'Stufe 6 – Geheimschrift', body: 'Eine Nachricht voller Buchstabensalat.', questions: [flagQ(6, ["Die Dateiendung .b64 ist ein Hinweis auf die Schreibweise.", "Base64 macht aus beliebigen Daten Buchstaben und Ziffern. Das ist keine Verschlüsselung, man kann es einfach zurückwandeln.", "Das Programm base64 kann mit -d (decode) zurückwandeln.", "Lösung: base64 -d nachricht.b64"])] },
      { id: 's7', title: 'Stufe 7 – Spiegelschrift', body: 'Jemand hat rückwärts geschrieben.', questions: [flagQ(7, ["Lies die Datei einmal. Fällt dir etwas am Ende der Zeile auf?", "Der Text steht rückwärts. Es gibt ein kleines Werkzeug, das jede Zeile umdreht (englisch „reverse“).", "Lösung: rev spiegel.txt"])] },
      { id: 's8', title: 'Stufe 8 – Das private Archiv', body: '36 Berichte, einer davon ist anders geschützt.', questions: [flagQ(8, ["36 Dateien einzeln mit ls -l prüfen? Lieber suchen lassen.", "find kann nach Eigenschaften suchen, nicht nur nach Namen – auch nach Rechten.", "Rechte als Zahl: 644 = alle dürfen lesen, 600 = nur der Besitzer. Gesucht ist 600.", "Lösung: find archiv -perm 600 → cat <gefundener Pfad>"], 15)] },
      { id: 's9', title: 'Stufe 9 – Funkprotokoll', body: 'Der letzte Code – alles, was du gelernt hast, in einer Zeile.', questions: [flagQ(9, ["Erst finden: Wo ist das Funkprotokoll? Es ist gut versteckt (Punkt!).", "ls -a zeigt den Ordner .funk. Darin: protokoll.log mit vielen Zeilen.", "grep GEHEIM findet die eine Zeile. cut -d\" \" -f3 schneidet das dritte Feld (Leerzeichen als Trenner) heraus.", "Das dritte Feld ist Base64. Hänge mit | base64 -d die Entschlüsselung an.", "Lösung: grep GEHEIM .funk/protokoll.log | cut -d\" \" -f3 | base64 -d"], 20)] },
    ],
    nach: { beobachtung: 'Zehn Stufen: versteckte Dateien, Größen, Suchen, Zählen, Rechte, Codierungen und Pipelines.', schluss: 'Diese Befehle wirst du beim Hacken ständig brauchen – jetzt sitzen sie, weil du sie benutzt hast.', grenzen: 'Simulation: Viele Optionen fehlen, und es gibt nur einen Benutzer. Das echte Erlebnis gibt es im Kellerserver.', naechster: 'Am PC: „Der Kellerserver“ – echtes SSH, echte Benutzer, echte Rechte.' },
  },

  // ================================================================ W2 – PC
  {
    id: 'w2', title: 'Der Kellerserver', type: 'wargame', level: 'L1', difficulty: 'leicht → mittel', minutes: 120,
    tools: ['ssh', 'ls -a', 'cat', 'grep', 'tar', 'file / zcat', 'ps aux', 'id / find -group', 'git log -p', 'ssh -i', 'curl -H'],
    desc: 'Wargame für die Kali-VM: Ein echter Linux-Server per SSH. Du arbeitest dich Konto für Konto bis zum Chef durch.',
    ziel: 'Echtes Linux mit mehreren Benutzern: Rechte, Prozesse, Archive, Git und SSH-Schlüssel – so, wie du es beim Pentest brauchst.',
    scope: 'Nur der eigene Kellerserver auf 127.0.0.1:2220 (Docker). Gefundene Zugänge nur dort verwenden.',
    stop: 'Container nie ohne „127.0.0.1:“ vor dem Port starten. Keine anderen Ziele.',
    cleanup: 'docker stop kly-keller',
    machine: { kind: 'ssh', lab: 'kly-keller', name: 'kly-keller', port: 2220, files: ['Dockerfile', 'setup.sh'], user: 'azubi', pass: 'azubi' },
    tasks: [
      { id: 'k0', title: 'azubi – Erster Arbeitstag', body: T('Melde dich an:  ssh azubi@127.0.0.1 -p 2220  (Passwort: azubi)', 'Lies deine Post. Frau Meier hat dir ihren Zugang hinterlassen.'), questions: [kq(1, ["Lies deine Post: ls post, dann cat post/DATEI.", "Frau Meier schreibt, der Zettel hängt „versteckt“ an der Pinnwand an deinem Schreibtisch.", "Versteckte Ordner beginnen mit einem Punkt: ls -a schreibtisch", "Lösung: cat schreibtisch/.pinnwand/zettel.txt → dann ssh meier@127.0.0.1 -p 2220"], 5)] },
      { id: 'k1', title: 'meier – Was die Shell sich merkt', body: T('ssh meier@127.0.0.1 -p 2220', 'Frau Meier hat sich vertippt. Merkt sich die Shell so etwas?'), questions: [kq(2, ["Lies ihre Notiz im Ordner einkauf. Was ist ihr passiert?", "Sie hat ein Passwort in die Befehlszeile getippt. Die Bash merkt sich jeden Befehl.", "Der Verlauf liegt in einer versteckten Datei im Home-Ordner. ls -a zeigt sie.", "Lösung: cat ~/.bash_history → die Zeile direkt nach „su lager“ ist das Passwort für lager"])] },
      { id: 'k2', title: 'lager – Inventur', body: 'Ein Artikel hat negativen Bestand. 2000 Zeilen.', questions: [kq(3, ["Lies LIESMICH.txt. Gesucht: eine Zeile mit NEGATIVEM Bestand.", "Die Spalten sind mit ; getrennt. Eine negative Zahl beginnt mit einem Minus direkt nach dem Trenner.", "grep findet Muster in Dateien. Setze das Muster in Anführungszeichen, weil ; für die Shell ein Sonderzeichen ist.", "Lösung: grep ';-' bestand.csv → Zugang steht in der Notiz-Spalte (Benutzer: sicherung)"])] },
      { id: 'k3', title: 'sicherung – Freitag, der 13.', body: 'Dreißig Sicherungen. Nur eine enthält den Druckerzugang.', questions: [kq(4, ["In /srv/sicherungen liegen 31 Archive. Welches Datum ist gemeint?", "Gesucht ist der 13. – sicherung-2026-10-13.tar.gz. Was steckt darin?", "tar -tzf ARCHIV listet den Inhalt (t = auflisten, z = gzip, f = Datei).", "Mit tar -xzOf ARCHIV PFAD gibst du eine einzelne Datei direkt aus (O = auf den Bildschirm), ohne etwas auszupacken.", "Lösung: tar -xzOf /srv/sicherungen/sicherung-2026-10-13.tar.gz daten/zugang.txt"], 15)] },
      { id: 'k4', title: 'druck – Datenmüll', body: 'Vierzig Druckaufträge ohne Endung. Einer ist echt.', questions: [kq(5, ["Die Dateien haben keine Endung. Wie findet Linux heraus, was in einer Datei steckt?", "Das Programm file schaut in die Datei hinein und rät den Typ – auch für viele auf einmal: file warteschlange/*", "Eine Datei ist „gzip compressed data“. zcat gibt komprimierten Text direkt aus.", "Lösung: file warteschlange/* | grep gzip → zcat warteschlange/auftrag-NN"], 15)] },
      { id: 'k5', title: 'nacht – Die Nachtschicht', body: 'Ein Programm läuft gerade und meldet sich als Admin an.', questions: [kq(6, ["Lies LIESMICH.txt: Ein Programm läuft gerade und bekommt sein Passwort beim Start mit.", "Alle laufenden Prozesse siehst du mit ps. Mit aux zeigt ps alle Benutzer und den vollständigen Befehl.", "Die Liste ist lang. Filtere sie mit grep nach dem Namen des Jobs (sync).", "Lösung: ps aux | grep sync → hinter --passwort steht das Admin-Passwort (Benutzer: admin)"], 15)] },
      { id: 'k6', title: 'admin – Die Gruppe', body: 'Du bist in einer besonderen Gruppe. Irgendwo im System liegt ihre Datei.', questions: [kq(7, ["Wer bist du und in welchen Gruppen? Dafür gibt es einen ganz kurzen Befehl.", "id zeigt deine Gruppen – darunter „wartung“. Gesucht ist eine Datei, die dieser Gruppe gehört.", "find kann das ganze System (/) nach Gruppenbesitz durchsuchen: find / -group wartung", "Viele „Permission denied“-Meldungen? Leite Fehlermeldungen mit 2>/dev/null ins Nichts um.", "Lösung: find / -group wartung 2>/dev/null → cat /var/lib/.wartungsdienst/cfg/zugang.conf"], 15)] },
      { id: 'k7', title: 'dev – Git vergisst nichts', body: 'Das Passwort wurde „gelöscht“. Wirklich?', questions: [kq(8, ["Im Ordner lagerapp liegt ein Git-Projekt. Git speichert jede Version – auch alte.", "git log zeigt alle Commits. Ein Commit heißt „Ups – Passwort entfernt“. Was stand VORHER da?", "git log -p zeigt bei jedem Commit auch die Änderungen (rot/− = entfernt, grün/+ = hinzugefügt).", "Lösung: cd lagerapp → git log -p | grep deploy_pass → die Zeile mit KLY{…} (Benutzer: deploy)"], 15)] },
      { id: 'k8', title: 'deploy – Der Schlüssel des Chefs', body: 'Der Chef hat kein Passwort. Nur einen Schlüssel. Und eine Kopie davon liegt hier.', questions: [kq(9, ["Sieh dir den Ordner ~/.ssh an. Was liegt da?", "chef_schluessel ist ein privater SSH-Schlüssel. Wer ihn hat, kann sich ohne Passwort als chef anmelden.", "ssh -i DATEI nutzt einen Schlüssel. Melde dich VOM Server aus an: chef@localhost (nicht von Kali, der Schlüssel liegt ja hier).", "Lösung: ssh -i ~/.ssh/chef_schluessel chef@localhost → cat willkommen.txt"], 20)] },
      { id: 'k9', title: 'chef – Der interne Dienst', body: 'Ein Dienst auf Port 7070, nur vom Server aus erreichbar. Er will ein Token sehen.', questions: [kq(10, ["Als chef: Lies willkommen.txt. Gesucht ist ein Token für den Dienst auf Port 7070.", "Das Token liegt in einer versteckten Konfiguration: ls -a, dann der Ordner .config", "curl localhost:7070 fragt den Dienst. Er verlangt den Header X-Chef-Token.", "Einen Header schickst du mit curl -H \"Name: Wert\" mit.", "Lösung: cat ~/.config/dienst.conf → curl -H \"X-Chef-Token: <token>\" localhost:7070"], 25)] },
    ],
    nach: { beobachtung: 'Zehn Konten, jedes mit einer typischen Schwachstelle: Notizen, Verlauf, Datenlecks, Sicherungen, Prozessparameter, Gruppenrechte, Git-Historie, kopierte Schlüssel.', schluss: 'Genau so laufen echte Pentests nach dem ersten Zugang: Man sucht systematisch nach Zugangsdaten und Fehlkonfigurationen.', grenzen: 'Absichtlich verwundbares Übungsziel. Echte Systeme sind unordentlicher – die Denkweise ist dieselbe.', naechster: 'Level 2: Netzwerk & Aufklärung – wie man so einen Server überhaupt findet.' },
  },
];
