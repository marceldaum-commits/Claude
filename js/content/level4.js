// Level 4 – Bash & Python für Hacker
// w3 „Nachtfalter II: Das Kollektiv“: Wargame im Sandbox-Terminal (SIMULATION). Maras Geschichte geht weiter.
// Neu: Variablen, $(…), for, while read, if/[ ], $((…)), tr, sed, awk, eigene Skripte.
// 🔁 Wiederholung aus Nachtfalter: grep, sort | uniq -c, chmod, base64, Pipes.

import { HOME } from '../shell.js';
import { textTools } from './wargames.js';

const T = (...lines) => lines.join('\n');
const K = HOME + '/kollektiv';
const STUFEN = 9; // stufe0 … stufe8, danach finale
const b64 = (s) => (typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(s))) : Buffer.from(s, 'utf8').toString('base64'));
const rot13 = (s) => s.replace(/[A-Za-z]/g, c => String.fromCharCode((c <= 'Z' ? 65 : 97) + ((c.charCodeAt(0) - (c <= 'Z' ? 65 : 97) + 13) % 26)));
function rng(seed) { let x = seed >>> 0 || 1; return () => (x = (x * 1664525 + 1013904223) >>> 0) / 2 ** 32; }

const dirOf = (n) => (n >= STUFEN ? `${K}/finale` : `${K}/stufe${n}`);
function openStufe(sh, n) { const d = sh.fs.get(dirOf(n)); if (d) { d.owner = 'seppi'; d.mode = 0o755; } }

function setup(sh, F, solved = new Set()) {
  const p = (path, c, m) => sh.fs.put(`${K}/${path}`, c, m);
  const R = rng(1337);
  p('LIESMICH.txt', T(
    'Nachricht von Mara „Nachtfalter“ Falk:',
    '',
    'Du hast meinen Test bestanden. Willkommen im Kollektiv.',
    'Wir sind wenige, aber wir arbeiten schlau: Was du zweimal tippst, lässt du ab dem dritten Mal die Maschine machen.',
    '',
    'Jede Stufe hat wieder einen Code. Mit   entsperren CODE   öffnest du die nächste.',
    'Neu hier: Variablen, Schleifen, Bedingungen, tr, sed, awk – und deine eigenen Skripte.',
    '',
    '(SIMULATION im Browser – die Shell ist eine nachgebaute Bash. Was hier klappt, klappt auch in Kali.)', ''));

  // Stufe 0 – Variablen und $(…)
  const c0 = F.l0;
  p('stufe0/teil1', c0.slice(0, 7) + '\n'); p('stufe0/teil2', c0.slice(7, 14) + '\n'); p('stufe0/teil3', c0.slice(14) + '\n');
  p('stufe0/aufgabe.txt', T('Der Code ist in drei Teile zerlegt: teil1, teil2, teil3.',
    'Speichere jeden Teil in einer Variablen und gib sie zusammen aus. Ja, es ginge auch anders –',
    'aber Variablen brauchst du ab jetzt ständig.', '',
    'Beispiel:  WORT=$(cat datei)   speichert den Inhalt einer Datei in WORT.',
    '           echo "$A$B"          gibt zwei Variablen direkt hintereinander aus.', ''));

  // Stufe 1 – for-Schleife + tr
  const c1 = F.l1;
  [...c1].forEach((ch, i) => {
    const noise = Array.from({ length: 3 + Math.floor(R() * 4) }, () => `rauschen ${Math.floor(R() * 99999)}`);
    p(`stufe1/funk/kanal-${String(i + 1).padStart(2, '0')}.txt`, [...noise, ch].join('\n') + '\n');
  });
  p('stufe1/aufgabe.txt', T(`${c1.length} Funkkanäle. Von jedem Kanal zählt nur die LETZTE Zeile – ein Zeichen.`,
    'Hintereinander gelesen ergeben sie den Code.', '',
    'Eine for-Schleife macht dasselbe mit jeder Datei:',
    '    for f in funk/*; do BEFEHL $f; done',
    'Und tr -d "\\n" entfernt die Zeilenumbrüche aus einer Ausgabe.', ''));

  // Stufe 2 – tr (ROT13)
  p('stufe2/abgefangen.txt', rot13(`Achtung, die Gegenseite liest mit. Der naechste Code lautet ${F.l2} – gut aufpassen.`) + '\n');
  p('stufe2/aufgabe.txt', T('Wir haben eine Nachricht abgefangen. Jeder Buchstabe ist um 13 Stellen im Alphabet verschoben (ROT13).',
    'Aus A wird N, aus B wird O … und umgekehrt.', '',
    'tr ersetzt Zeichen durch andere:  tr ALT NEU', 'Bereiche gehen auch:  tr a-z A-Z  macht alles groß.', ''));

  // Stufe 3 – sed (+ 🔁 grep)
  const lines3 = Array.from({ length: 60 }, (_, i) => `${String(i).padStart(3, '0')} STATUS ok`);
  lines3.splice(41, 0, `041b CODE ${[...F.l3].join('XX')}`);
  p('stufe3/protokoll.log', lines3.join('\n') + '\n');
  p('stufe3/aufgabe.txt', T('Im Protokoll versteckt sich eine CODE-Zeile. Jemand hat zwischen jedes Zeichen „XX“ geschmuggelt.',
    'Finde die Zeile (das kennst du) und entferne alle XX.', '',
    "sed 's/ALT/NEU/g' ersetzt ALT überall durch NEU. Ist NEU leer, wird ALT gelöscht.", ''));

  // Stufe 4 – awk (Summe einer Spalte)
  const agenten = ['falter', 'motte', 'spinner', 'eule'];
  const rows = ['agent;ort;stunden']; let sum = 0;
  for (let i = 0; i < 40; i++) {
    const a = agenten[Math.floor(R() * agenten.length)], h = 1 + Math.floor(R() * 9);
    if (a === 'falter') sum += h;
    rows.push(`${a};${['Hafen', 'Bahnhof', 'Markt', 'Uni'][Math.floor(R() * 4)]};${h}`);
  }
  p('stufe4/einsaetze.csv', rows.join('\n') + '\n');
  for (let n = 10; n <= 250; n += 1 + Math.floor(R() * 7)) if (n !== sum) p(`stufe4/tresor/${n}.txt`, 'Falsche Kombination.\n');
  p(`stufe4/tresor/${sum}.txt`, `Kombination stimmt.\nCode: ${F.l4}\n`);
  p('stufe4/aufgabe.txt', T('Der Tresor öffnet sich mit der Summe aller Einsatzstunden von Agent „falter“.',
    'Die Datei tresor/SUMME.txt enthält dann den Code.', '',
    "awk zerlegt jede Zeile in Felder ($1, $2, $3 …). -F';' legt das Trennzeichen fest.",
    "awk kann auch rechnen:  awk '{s+=$2} END {print s}'  addiert Spalte 2.", ''));

  // Stufe 5 – eigenes Skript ausführen (🔁 chmod, base64)
  p('stufe5/entschluessler.sh', T('#!/bin/bash', '# Entschlüsselt die Nachricht des Kollektivs', `GEHEIM="${b64(F.l5)}"`, 'echo "Entschlüsselt: $(echo $GEHEIM | base64 -d)"', ''), 0o644);
  p('stufe5/aufgabe.txt', T('Mara hat dir ein Skript dagelassen: entschluessler.sh. Starte es mit ./entschluessler.sh',
    'Klappt nicht? Erinnere dich an den Tresor aus Nachtfalter.', '',
    'Lies das Skript auch mit cat – so sieht ein Bash-Skript aus: eine Zeile pro Befehl.', ''));

  // Stufe 6 – while read + [ -f ]
  const namen = Array.from({ length: 40 }, (_, i) => `akte-${(1000 + Math.floor(R() * 8999)).toString(36)}${i}`);
  const echt = namen[Math.floor(R() * namen.length)];
  p('stufe6/kandidaten.txt', namen.join('\n') + '\n');
  p(`stufe6/archiv/${echt}`, `Die richtige Akte.\nCode: ${F.l6}\n`);
  for (let i = 0; i < 8; i++) p(`stufe6/archiv/alt-${i}`, 'Veraltet.\n');
  p('stufe6/aufgabe.txt', T('kandidaten.txt nennt 40 Akten. Nur EINE davon liegt wirklich in archiv/.',
    'Lass ein Skript jede Zeile prüfen.', '',
    'Zeile für Zeile lesen:   while read NAME; do BEFEHL; done < DATEI',
    'Gibt es die Datei?       [ -f PFAD ]   (Leerzeichen innen sind Pflicht!)',
    'Nur wenn …:              [ -f PFAD ] && cat PFAD', ''));

  // Stufe 7 – for + if + $(cat …)
  const code7 = F.l7; const teile = [code7.slice(0, 6), code7.slice(6, 11), code7.slice(11, 16), code7.slice(16)];
  let ti = 0;
  for (let n = 1; n <= 20; n++) {
    const d = `stufe7/knoten/k${String(n).padStart(2, '0')}`;
    const hot = [3, 8, 14, 19].includes(n);
    p(`${d}/version`, (hot ? '1.2' : ['1.0', '1.1', '2.0', '1.3'][n % 4]) + '\n');
    p(`${d}/teil`, (hot ? teile[ti++] : `----${n}`) + '\n');
  }
  p('stufe7/aufgabe.txt', T('20 Knoten im Netz des Kollektivs. Nur die Knoten mit Version 1.2 tragen ein Stück des Codes (Datei teil).',
    'Der Reihe nach zusammengesetzt ergibt sich der Code.', '',
    'Bedingung:   if [ "$(cat DATEI)" = "1.2" ]; then BEFEHL; fi', ''));

  // Stufe 8 – eigenes Skript schreiben (🔁 grep -c, sort -nr)
  const wachen = ['nord', 'sued', 'ost', 'west', 'hafen', 'turm', 'bruecke', 'tunnel', 'markt', 'park', 'tor', 'dach'];
  const maxW = wachen[Math.floor(R() * wachen.length)];
  wachen.forEach((w, i) => {
    const n = w === maxW ? 17 : 2 + ((i * 5) % 13);
    const ls = []; for (let k = 0; k < 40; k++) ls.push(k < n ? `02:${String(k).padStart(2, '0')} ALARM Bewegung` : `03:${String(k).padStart(2, '0')} ruhig`);
    p(`stufe8/wachen/${w}.log`, ls.sort(() => R() - 0.5).join('\n') + '\n');
    p(`stufe8/schluessel/${w}.txt`, w === maxW ? `Richtig erkannt.\nCode: ${F.l8}\n` : 'Diese Wache war ruhig genug.\n');
  });
  p('stufe8/aufgabe.txt', T('Deine Prüfung: Schreib ein Skript wachbericht.sh.',
    'Es soll für jede Datei in wachen/ ausgeben:  ANZAHL_ALARME DATEINAME',
    'Die Wache mit den meisten Alarmen verrät dir, welche Datei in schluessel/ den Code hat.', '',
    'So legst du ein Skript an (eine Zeile reicht):',
    "    echo 'for f in wachen/*.log; do …; done' > wachbericht.sh",
    'Dann ausführbar machen und starten.', ''));

  p('finale/nachricht.txt', T('Geschafft. Du denkst jetzt wie wir: Wiederholung ist Arbeit für Maschinen.',
    '',
    'Aber es gibt schlechte Nachrichten. Heute Nacht ist jemand in unseren Server eingedrungen.',
    'Die Logdateien liegen schon bereit. Ich brauche jemanden, der die Spuren liest.',
    '',
    '→ Lernen → Level 9: „Die Nacht im Kollektiv“', '', '– Mara', ''));

  for (let n = 1; n <= STUFEN; n++) { const d = sh.fs.get(dirOf(n)); d.owner = 'root'; d.mode = 0o700; }
  for (let n = 0; n < STUFEN; n++) if (solved.has(`l${n}`)) openStufe(sh, n + 1);
  sh.cwd = K;
}

function commands({ F, solve }) {
  const entsperren = (args, { sh }) => {
    const code = String(args[0] || '').trim();
    if (!code) return { out: '', err: 'Aufruf: entsperren CODE\n', code: 2 };
    for (let n = 0; n < STUFEN; n++) if (F[`l${n}`] === code) {
      openStufe(sh, n + 1); solve(`l${n}`, code);
      return { out: n + 1 === STUFEN ? '🔓 Letzte Tür offen: finale. Lies die Nachricht.\n' : `🔓 Richtig! stufe${n + 1} ist offen.  →  cd ../stufe${n + 1}\n`, code: 0 };
    }
    return { out: '', err: /^KLY\{[0-9a-f]{16}\}$/.test(code) ? '🔒 Falscher Code.\n' : '🔒 Falscher Code. Format: KLY{16 Zeichen 0-9/a-f}\n', code: 1 };
  };
  return { entsperren, unlock: entsperren, ...textTools() };
}

const q = (n, hints, points = 15, repeat) => ({ id: 'q1', type: 'flag', flag: `l${n}`, q: `Code aus stufe${n}`, points, hints, ...(repeat ? { repeat } : {}) });

export const LEVEL4_ROOMS = [
  {
    id: 'w3', title: 'Nachtfalter II: Das Kollektiv', type: 'wargame', level: 'L4', minutes: 75,
    tools: ['Variablen', '$(…)', 'for', 'while read', 'if [ ]', 'tr', 'sed', 'awk', './skript.sh', '🔁 grep, sort, chmod, base64'],
    desc: 'Maras Geschichte geht weiter: Du bist im Kollektiv. Neun Stufen, in denen du die Maschine für dich arbeiten lässt – Variablen, Schleifen, Bedingungen und eigene Skripte.',
    ziel: 'Kleine Bash-Skripte schreiben, die dir wiederholte Arbeit abnehmen – die wichtigste Fähigkeit für schnelle Pentests.',
    scope: 'Nur das Sandbox-Terminal in diesem Raum (~/kollektiv). SIMULATION einer Bash.',
    stop: 'Keine nötig – die Sandbox ist isoliert.',
    cleanup: 'Nichts nötig. Dein Fortschritt bleibt gespeichert.',
    machine: { kind: 'sandbox' },
    welcome: 'Kollektiv · Sandbox bereit. Start: cat LIESMICH.txt · help zeigt Befehle.',
    flags: Array.from({ length: STUFEN }, (_, n) => `l${n}`),
    setup, commands,
    // Handübersetzung: ROT13-Text erst entschlüsseln, übersetzen, wieder verschieben; Logs/Tabellen bleiben original
    translateFS(sh, T, translateTree) {
      translateTree(sh.fs.get(K), T, (name, data) => {
        if (name === 'abgefangen.txt') return rot13(T.t(rot13(data.trim()))) + '\n';
        if (name.endsWith('.log') || name.endsWith('.csv')) return data;
        return null;
      });
    },
    onSolve(sh, flag) { openStufe(sh, +flag.slice(1) + 1); },
    tasks: [
      { id: 's0', title: 'Stufe 0 – Drei Teile', body: 'Willkommen im Kollektiv. Erste Lektion: Variablen.', questions: [q(0, [
        'Lies stufe0/aufgabe.txt. Variablen speichern Text: NAME=wert (ohne Leerzeichen um das =).',
        'Mit $(cat datei) holst du den Inhalt einer Datei in eine Variable.',
        'A=$(cat teil1); B=$(cat teil2); C=$(cat teil3)',
        'Lösung: cd stufe0 → A=$(cat teil1); B=$(cat teil2); C=$(cat teil3); echo "$A$B$C"'], 10)] },
      { id: 's1', title: 'Stufe 1 – Funkkanäle', body: 'Von jeder Datei zählt nur die letzte Zeile.', questions: [q(1, [
        'Die letzte Zeile einer Datei zeigt tail -n 1 DATEI. Aber für 21 Dateien?',
        'Eine for-Schleife wiederholt einen Befehl für jede Datei: for f in funk/*; do …; done – in der Schleife ist $f der Dateiname.',
        'for f in funk/*; do tail -n 1 $f; done',
        'Die Zeichen stehen untereinander. Hänge | tr -d "\\n" an, um die Zeilenumbrüche zu entfernen.',
        'Lösung: for f in funk/*; do tail -n 1 $f; done | tr -d "\\n"'])] },
      { id: 's2', title: 'Stufe 2 – ROT13', body: 'Eine abgefangene Nachricht mit verschobenen Buchstaben.', questions: [q(2, [
        'ROT13: Jeder Buchstabe wird um 13 verschoben. Zweimal ROT13 ergibt wieder den Ursprungstext.',
        'tr kann ganze Bereiche ersetzen: A-Z durch N-ZA-M (für Großbuchstaben).',
        "Für Groß- und Kleinbuchstaben auf einmal: tr 'A-Za-z' 'N-ZA-Mn-za-m'",
        "Lösung: cat abgefangen.txt | tr 'A-Za-z' 'N-ZA-Mn-za-m'"])] },
      { id: 's3', title: 'Stufe 3 – Störsignal', body: 'Zwischen den Zeichen steckt Müll.', questions: [q(3, [
        'Erst die richtige Zeile finden: Sie enthält das Wort CODE.',
        'grep CODE protokoll.log – dann siehst du die XX zwischen den Zeichen.',
        "sed 's/XX//g' löscht alle XX (g = global, also jedes Vorkommen).",
        "Lösung: grep CODE protokoll.log | sed 's/XX//g'"], 15, 'Nachtfalter Stufe 3 (grep)')] },
      { id: 's4', title: 'Stufe 4 – Der Tresor', body: 'Die Kombination ist eine Summe.', questions: [q(4, [
        "Die Datei hat drei Spalten, getrennt durch ;. awk -F';' '{print $1}' einsaetze.csv zeigt Spalte 1.",
        "Nur Zeilen von falter: awk -F';' '$1==\"falter\"' einsaetze.csv",
        "Summieren: {s+=$3} für jede Zeile, END {print s} am Schluss.",
        "Lösung: awk -F';' '$1==\"falter\" {s+=$3} END {print s}' einsaetze.csv → cat tresor/SUMME.txt"], 20)] },
      { id: 's5', title: 'Stufe 5 – Der Entschlüssler', body: 'Ein Skript, das nicht starten will.', questions: [q(5, [
        './entschluessler.sh sagt „Keine Berechtigung“. Sieh dir die Rechte mit ls -l an.',
        'Zum Ausführen braucht eine Datei das x-Recht.',
        'Lösung: chmod +x entschluessler.sh → ./entschluessler.sh'], 10, 'Nachtfalter Stufe 5 (chmod)')] },
      { id: 's6', title: 'Stufe 6 – Die echte Akte', body: '40 Namen, eine echte Datei.', questions: [q(6, [
        'Du musst jede Zeile aus kandidaten.txt prüfen. Das macht while read.',
        'while read NAME; do echo $NAME; done < kandidaten.txt gibt jede Zeile aus. Ersetze echo durch eine Prüfung.',
        '[ -f archiv/$NAME ] ist wahr, wenn die Datei existiert. Mit && cat archiv/$NAME zeigst du sie nur dann.',
        'Lösung: while read n; do [ -f archiv/$n ] && cat archiv/$n; done < kandidaten.txt'], 20)] },
      { id: 's7', title: 'Stufe 7 – Die richtigen Knoten', body: 'Nur Version 1.2 zählt.', questions: [q(7, [
        'Schleife über alle Ordner: for d in knoten/*; do …; done',
        'In der Schleife: Inhalt von $d/version vergleichen – mit if [ "$(cat $d/version)" = "1.2" ]; then …; fi',
        'Wenn ja: cat $d/teil. Am Ende alle Zeilenumbrüche mit tr -d "\\n" entfernen.',
        'Lösung: for d in knoten/*; do if [ "$(cat $d/version)" = "1.2" ]; then cat $d/teil; fi; done | tr -d "\\n"'], 20)] },
      { id: 's8', title: 'Stufe 8 – Dein erstes Werkzeug', body: 'Diesmal schreibst du das Skript selbst.', questions: [q(8, [
        'Erst ohne Skript ausprobieren: grep -c ALARM wachen/nord.log zählt die Alarme einer Datei.',
        'In einer Schleife für alle: for f in wachen/*.log; do echo "$(grep -c ALARM $f) $f"; done',
        'Sortieren: | sort -nr | head -1 zeigt die Wache mit den meisten Alarmen.',
        "Als Skript: echo 'for f in wachen/*.log; do echo \"$(grep -c ALARM $f) $f\"; done | sort -nr' > wachbericht.sh → chmod +x wachbericht.sh → ./wachbericht.sh",
        'Lösung: Die oberste Zeile nennt die Wache, z. B. wachen/turm.log → cat schluessel/turm.txt'], 25, 'Nachtfalter Stufe 4 (sort -nr)')] },
    ],
    nach: { beobachtung: 'Variablen, Schleifen, Bedingungen, tr, sed, awk und ein eigenes Skript.', schluss: 'Was du zweimal tippst, schreibst du beim dritten Mal als Skript. Genau so arbeiten Pentester – Aufklärung und Auswertung sind zu 80 % Automatisierung.', grenzen: 'Die Bash ist nachgebaut: viele Feinheiten (Funktionen, Arrays, case) fehlen. In Kali funktioniert alles hier genauso – und noch mehr.', naechster: 'Level 9: „Die Nacht im Kollektiv“ – lies die Spuren des Eindringlings. Und probier deine Skripte in Kali aus!' },
  },
];
