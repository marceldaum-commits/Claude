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

// Zusätzliche Befehle nur in diesem Spiel
function nachtfalterCommands({ F, solve }) {
  const read = (sh, pos, stdin, name) => {
    const { parts, err } = sh._inputs(pos, stdin, name);
    return { text: parts.map(x => x.data).join(''), err };
  };
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
  return {
    entsperren,
    unlock: entsperren,
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

const flagQ = (n, hint, points = 10) => ({ id: 'q1', type: 'flag', flag: `l${n}`, q: `Code aus stufe${n}`, points, hint });
const kq = (n, hint, points = 10) => ({ id: 'q1', type: 'flag', flag: `l${n}`, q: 'Code', points, hint });

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
      { id: 's0', title: 'Stufe 0 – Das Handy', body: 'Sieh dich um. Wo bist du, was liegt hier? Lies, was da ist.', questions: [flagQ(0, 'ls zeigt Ordner, cd stufe0 wechselt hinein, cat zeigt Dateien.', 5)] },
      { id: 's1', title: 'Stufe 1 – Nichts zu sehen', body: 'Mara schreibt, hier sei nichts. Glaubst du ihr?', questions: [flagQ(1, 'ls hat eine Option, die auch Dateien mit Punkt am Anfang zeigt.')] },
      { id: 's2', title: 'Stufe 2 – Kaputte Fotos', body: 'Vierzig Fotos, alle kaputt. Fast alle.', questions: [flagQ(2, 'ls -l zeigt die Größe jeder Datei in Bytes.')] },
      { id: 's3', title: 'Stufe 3 – Der Treffpunkt', body: 'Zwanzig Chatverläufe. Einer davon erwähnt den „Treffpunkt“.', questions: [flagQ(3, 'grep kann mit -r ganze Ordner durchsuchen.')] },
      { id: 's4', title: 'Stufe 4 – Der Dauerrufer', body: 'Wer hat am häufigsten angerufen? Seine Kontaktkarte verrät mehr.', questions: [flagQ(4, 'sort anrufe.log | uniq -c | sort -nr | head -3', 15)] },
      { id: 's5', title: 'Stufe 5 – Der Tresor', body: 'Verschlossen. Aber wem gehört er eigentlich?', questions: [flagQ(5, 'chmod u+rx für den Ordner, chmod u+r für die Datei darin.', 15)] },
      { id: 's6', title: 'Stufe 6 – Geheimschrift', body: 'Eine Nachricht voller Buchstabensalat.', questions: [flagQ(6, 'base64 -d DATEI')] },
      { id: 's7', title: 'Stufe 7 – Spiegelschrift', body: 'Jemand hat rückwärts geschrieben.', questions: [flagQ(7, 'rev DATEI')] },
      { id: 's8', title: 'Stufe 8 – Das private Archiv', body: '36 Berichte, einer davon ist anders geschützt.', questions: [flagQ(8, 'find archiv -perm 600', 15)] },
      { id: 's9', title: 'Stufe 9 – Funkprotokoll', body: 'Der letzte Code – alles, was du gelernt hast, in einer Zeile.', questions: [flagQ(9, 'ls -a, dann: grep GEHEIM DATEI | cut -d" " -f3 | base64 -d', 20)] },
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
      { id: 'k0', title: 'azubi – Erster Arbeitstag', body: T('Melde dich an:  ssh azubi@127.0.0.1 -p 2220  (Passwort: azubi)', 'Lies deine Post. Frau Meier hat dir ihren Zugang hinterlassen.'), questions: [kq(1, 'ls -a im Schreibtisch – manche Ordner beginnen mit einem Punkt.', 5)] },
      { id: 'k1', title: 'meier – Was die Shell sich merkt', body: T('ssh meier@127.0.0.1 -p 2220', 'Frau Meier hat sich vertippt. Merkt sich die Shell so etwas?'), questions: [kq(2, 'Die Bash speichert alle Befehle in einer versteckten Datei im Home-Ordner: ~/.bash_history')] },
      { id: 'k2', title: 'lager – Inventur', body: 'Ein Artikel hat negativen Bestand. 2000 Zeilen.', questions: [kq(3, 'grep sucht Muster. Negative Zahlen stehen direkt nach einem Semikolon: ";-"')] },
      { id: 'k3', title: 'sicherung – Freitag, der 13.', body: 'Dreißig Sicherungen. Nur eine enthält den Druckerzugang.', questions: [kq(4, 'tar -tzf zeigt den Inhalt, tar -xzOf ARCHIV DATEI gibt eine Datei direkt aus.', 15)] },
      { id: 'k4', title: 'druck – Datenmüll', body: 'Vierzig Druckaufträge ohne Endung. Einer ist echt.', questions: [kq(5, 'file warteschlange/* verrät den Dateityp. Komprimiertes liest zcat.', 15)] },
      { id: 'k5', title: 'nacht – Die Nachtschicht', body: 'Ein Programm läuft gerade und meldet sich als Admin an.', questions: [kq(6, 'ps aux zeigt alle Prozesse MIT ihren Startparametern.', 15)] },
      { id: 'k6', title: 'admin – Die Gruppe', body: 'Du bist in einer besonderen Gruppe. Irgendwo im System liegt ihre Datei.', questions: [kq(7, 'id zeigt deine Gruppen. find / -group NAME 2>/dev/null durchsucht das ganze System ohne Fehlermeldungen.', 15)] },
      { id: 'k7', title: 'dev – Git vergisst nichts', body: 'Das Passwort wurde „gelöscht“. Wirklich?', questions: [kq(8, 'git log zeigt die Geschichte, git log -p auch alle Änderungen.', 15)] },
      { id: 'k8', title: 'deploy – Der Schlüssel des Chefs', body: 'Der Chef hat kein Passwort. Nur einen Schlüssel. Und eine Kopie davon liegt hier.', questions: [kq(9, 'ssh -i ~/.ssh/DATEI chef@localhost – angemeldet wird vom Server aus, nicht von Kali.', 20)] },
      { id: 'k9', title: 'chef – Der interne Dienst', body: 'Ein Dienst auf Port 7070, nur vom Server aus erreichbar. Er will ein Token sehen.', questions: [kq(10, 'Das Token steht in einer versteckten Konfigurationsdatei. curl -H "Name: Wert" localhost:7070', 25)] },
    ],
    nach: { beobachtung: 'Zehn Konten, jedes mit einer typischen Schwachstelle: Notizen, Verlauf, Datenlecks, Sicherungen, Prozessparameter, Gruppenrechte, Git-Historie, kopierte Schlüssel.', schluss: 'Genau so laufen echte Pentests nach dem ersten Zugang: Man sucht systematisch nach Zugangsdaten und Fehlkonfigurationen.', grenzen: 'Absichtlich verwundbares Übungsziel. Echte Systeme sind unordentlicher – die Denkweise ist dieselbe.', naechster: 'Level 2: Netzwerk & Aufklärung – wie man so einen Server überhaupt findet.' },
  },
];
