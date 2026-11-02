// Wargame w4 „Der Funkturm“ – 20 Etagen Linux-Rätsel auf Deutsch, im Sandbox-Terminal (SIMULATION).
// Jede Etage versteckt einen Code; „entsperren CODE“ öffnet die nächste. Schwierigkeit steigt langsam,
// Gelerntes kommt wieder (🔁). Läuft am Handy und am PC.

import { HOME } from '../shell.js';
import { textTools } from './wargames.js';

const T = (...lines) => lines.join('\n');
const B = HOME + '/turm';
const N = 20; // etage00 … etage19, danach dach
const b64 = (s) => (typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(s))) : Buffer.from(s, 'utf8').toString('base64'));
const rot13 = (s) => s.replace(/[A-Za-z]/g, c => String.fromCharCode((c <= 'Z' ? 65 : 97) + ((c.charCodeAt(0) - (c <= 'Z' ? 65 : 97) + 13) % 26)));
function rng(seed) { let x = seed >>> 0 || 1; return () => (x = (x * 1664525 + 1013904223) >>> 0) / 2 ** 32; }
const p2 = (n) => String(n).padStart(2, '0');
const dirOf = (n) => (n >= N ? `${B}/dach` : `${B}/etage${p2(n)}`);
function openFloor(sh, n) { const d = sh.fs.get(dirOf(n)); if (d) { d.owner = 'seppi'; d.mode = 0o755; } }
const words = ['Rauschen', 'Pegel', 'Antenne', 'Kabel', 'Relais', 'Sender', 'Frequenz', 'Welle', 'Masse', 'Schirm', 'Stecker', 'Verstärker'];

function setup(sh, F, solved = new Set()) {
  const R = rng(4242);
  const pick = (a) => a[Math.floor(R() * a.length)];
  const p = (path, c, m) => sh.fs.put(`${B}/${path}`, c, m);
  const e = (n, path, c, m) => p(`etage${p2(n)}/${path}`, c, m);

  p('LIESMICH.txt', T(
    'RADIO TALHEIM – Praktikum, Tag 1 (alles erfunden)',
    '',
    'Seit Wochen sendet unser alter Funkturm jede Nacht um 03:00 ein fremdes Signal.',
    'Der Techniker, Herr Albers, ist letzten Monat in Rente gegangen. Niemand sonst kennt den Turmserver.',
    '',
    'Der Server ist wie der Turm aufgebaut: 20 Etagen, jede Tür verschlossen.',
    'In jeder Etage liegt ein Code KLY{…}. Mit   entsperren CODE   geht die nächste Tür auf.',
    'Ganz oben, auf dem Dach, steht der Sender. Finde heraus, wer da sendet.',
    '',
    'Fang unten an:  cd etage00',
    '(SIMULATION im Browser – nachgebaute Bash, kein echtes System.)', ''));

  // 00 – Leerzeichen im Namen
  e(0, 'Willkommen im Turm.txt', T('Willkommen, Praktikant.', 'Dateinamen mit Leerzeichen brauchen Anführungszeichen – oder die Tab-Taste.', `Code: ${F.l0}`, '– Albers', ''));
  e(0, 'hinweis.txt', 'Die Begrüßung liegt direkt neben mir. Ihr Name hat Leerzeichen.\n');

  // 01 – Datei beginnt mit Bindestrich
  e(1, '-funkzettel', T('Dateien, die mit - beginnen, hält die Shell für Optionen.', 'Mit ./ davor ist klar: Das ist ein Pfad.', `Code: ${F.l1}`, ''));
  e(1, 'hinweis.txt', 'Mein Zettel heißt -funkzettel. Probier mal cat -funkzettel – und dann überleg, warum das nicht geht.\n');

  // 02 – Zeile 777
  const log2 = Array.from({ length: 1000 }, (_, i) => `${p2(Math.floor(i / 60) % 24)}:${p2(i % 60)} ${pick(words)} ${Math.floor(R() * 999)}`);
  log2[776] = `03:00 SIGNAL ${F.l2}`;
  e(2, 'sendeprotokoll.log', log2.join('\n') + '\n');
  e(2, 'hinweis.txt', 'Albers schrieb: „Das Signal steht immer in Zeile 777 des Protokolls.“ 1000 Zeilen scrollen? Lieber nicht.\n');

  // 03 – wc -l: die Aufnahme mit genau 42 Zeilen
  const z42 = 1 + Math.floor(R() * 15);
  for (let i = 1; i <= 15; i++) {
    let n = 20 + Math.floor(R() * 60); if (n === 42) n = 43; if (i === z42) n = 42;
    const lines = Array.from({ length: n }, () => `${pick(words)} ${Math.floor(R() * 9999)}`);
    if (i === z42) lines[41] = `Code: ${F.l3}`;
    e(3, `baender/band-${p2(i)}.txt`, lines.join('\n') + '\n');
  }
  e(3, 'hinweis.txt', 'Nur die Bandaufnahme mit GENAU 42 Zeilen ist echt. wc zählt Zeilen – auch von vielen Dateien auf einmal.\n');

  // 04 – find -size: genau 73 Bytes
  const target = `Code: ${F.l4}\n`;
  const exact = target + 'x'.repeat(73 - target.length - 1) + '\n';
  const spots = ['a', 'b', 'c', 'd'].flatMap(x => [1, 2, 3].map(y => `archiv/${x}/${y}`));
  const hit4 = Math.floor(R() * 40);
  for (let i = 0; i < 40; i++) {
    let len = 30 + Math.floor(R() * 120); if (len === 73) len = 74;
    const c = i === hit4 ? exact : ('Alte Notiz. ' + 'y'.repeat(200)).slice(0, len - 1) + '\n';
    e(4, `${spots[i % spots.length]}/notiz-${p2(i)}.txt`, c);
  }
  e(4, 'hinweis.txt', 'Albers: „Die richtige Notiz ist genau 73 Bytes groß.“ find kann nach Größe suchen (c = Bytes).\n');

  // 05 – grep -v
  const l5 = Array.from({ length: 400 }, () => 'Signal stabil');
  l5[Math.floor(R() * 400)] = `Signal gestört – Code: ${F.l5}`;
  e(5, 'messung.log', l5.join('\n') + '\n');
  e(5, 'hinweis.txt', '400 Zeilen „Signal stabil“. Eine Zeile ist anders. Du suchst nicht, was DA ist – sondern was NICHT so ist.\n');

  // 06 – sort | uniq -u
  const freqs = Array.from({ length: 30 }, () => (870 + Math.floor(R() * 200)) / 10);
  const uniq6 = 107.7;
  const list6 = []; for (const f of freqs) { const k = 2 + Math.floor(R() * 4); for (let j = 0; j < k; j++) list6.push(f.toFixed(1)); }
  list6.push(uniq6.toFixed(1));
  e(6, 'frequenzen.txt', list6.sort(() => R() - 0.5).join('\n') + '\n');
  for (const f of new Set([...freqs.map(x => x.toFixed(1))])) e(6, `kanaele/${f}.txt`, 'Normaler Sender.\n');
  e(6, `kanaele/${uniq6.toFixed(1)}.txt`, `Diese Frequenz kam nur EINMAL vor. Code: ${F.l6}\n`);
  e(6, 'hinweis.txt', 'Jede Frequenz taucht mehrmals auf – bis auf eine. Zu der gibt es eine Datei in kanaele/.\n');

  // 07 – diff
  const cfg = Array.from({ length: 200 }, (_, i) => `param_${p2(i % 100)}_${i} = ${Math.floor(R() * 999)}`);
  const neu = [...cfg]; const ch = 50 + Math.floor(R() * 100); neu[ch] = `geheim = ${F.l7}`;
  e(7, 'sender-alt.cfg', cfg.join('\n') + '\n'); e(7, 'sender-neu.cfg', neu.join('\n') + '\n');
  e(7, 'hinweis.txt', 'Jemand hat die Senderkonfiguration verändert. Zwei Versionen, 200 Zeilen. Lass Linux die Unterschiede zeigen.\n');

  // 08 – sort -t -k (Spalte numerisch)
  const raeume = ['keller', 'technik', 'flur', 'archiv', 'kantine', 'sendesaal', 'buero', 'lager', 'dach-zugang', 'treppe'];
  const rows8 = ['raum;uhrzeit;temperatur'];
  for (let i = 0; i < 60; i++) rows8.push(`${pick(raeume.filter(r => r !== 'sendesaal'))};${p2(Math.floor(R() * 24))}:${p2(Math.floor(R() * 60))};${15 + Math.floor(R() * 12)}`);
  rows8.splice(30, 0, 'sendesaal;03:00;48');
  e(8, 'temperaturen.csv', rows8.join('\n') + '\n');
  for (const r of raeume) e(8, `raeume/${r}.txt`, r === 'sendesaal' ? `Hier lief der Sender heiß. Code: ${F.l8}\n` : 'Alles normal.\n');
  e(8, 'hinweis.txt', 'Wo ist es am heißesten? Sortiere die Tabelle nach der Temperatur-Spalte. Der Raum hat eine Datei in raeume/.\n');

  // 09 – cut -c
  const l9 = Array.from({ length: 50 }, () => Array.from({ length: 60 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(R() * 36)]).join(''));
  l9[Math.floor(R() * 50)] = 'TURM' + 'q'.repeat(15) + F.l9 + 'z'.repeat(60 - 19 - F.l9.length);
  e(9, 'zeichensalat.txt', l9.join('\n') + '\n');
  e(9, 'hinweis.txt', 'Die Zeile, die mit TURM beginnt, versteckt den Code an den Zeichen 20 bis 40. cut kann auch Zeichen statt Feldern ausschneiden.\n');

  // 10 – doppelt base64
  e(10, 'nachricht.b64', b64(b64(`Zweimal verpackt hält besser. Code: ${F.l10}`)) + '\n');
  e(10, 'hinweis.txt', 'Albers hat die Nachricht verpackt – und dann nochmal verpackt.\n');

  // 11 – rev + ROT13
  e(11, 'spiegel.txt', [...rot13(`Rueckwaerts UND verschoben. Code: ${F.l11}`)].reverse().join('') + '\n');
  e(11, 'hinweis.txt', 'Diese Nachricht ist gespiegelt UND um 13 Buchstaben verschoben. Zwei Werkzeuge, eine Pipe.\n');

  // 12 – versteckt + chmod
  p(`etage12/.wartungsschacht`, null, 0o000);
  p(`etage12/.wartungsschacht/schalter.txt`, `Den Schacht findet nur, wer genau hinsieht. Code: ${F.l12}\n`, 0o000);
  e(12, 'hinweis.txt', 'Albers: „Der Wartungsschacht ist versteckt und abgesperrt. Aber der Schlüssel gehört dir.“\n');

  // 13 – find -perm in versteckten Ordnern
  const z13 = Math.floor(R() * 30);
  for (let i = 0; i < 30; i++) e(13, `.anlagen/geraet-${p2(i)}/status`, i === z13 ? `Nur für den Besitzer lesbar. Code: ${F.l13}\n` : 'ok\n', i === z13 ? 0o600 : 0o644);
  e(13, 'hinweis.txt', 'Irgendwo unter einem versteckten Ordner liegt eine Statusdatei, die anders geschützt ist als alle anderen (600 statt 644).\n');

  // 14 – Summe über viele Dateien
  let sum14 = 0;
  for (let i = 1; i <= 30; i++) { const v = 1 + Math.floor(R() * 40); sum14 += v; e(14, `messungen/m${p2(i)}`, `${v}\n`); }
  for (let v = sum14 - 25; v <= sum14 + 25; v += 1 + Math.floor(R() * 4)) if (v !== sum14) e(14, `schloss/${v}.txt`, 'Falsche Summe.\n');
  e(14, `schloss/${sum14}.txt`, `Summe stimmt. Code: ${F.l14}\n`);
  e(14, 'hinweis.txt', 'Das Schloss öffnet die SUMME aller Werte in messungen/. Jede Datei enthält eine Zahl. Datei: schloss/SUMME.txt\n');

  // 15 – while read + [ -f ]
  const wege = Array.from({ length: 35 }, (_, i) => `gaenge/${pick(['nord', 'sued', 'ost', 'west'])}/${pick(['tuer', 'luke', 'gitter'])}-${i}`);
  const w15 = wege[Math.floor(R() * wege.length)];
  e(15, 'wegbeschreibung.txt', wege.join('\n') + '\n');
  e(15, w15, `Richtiger Weg. Code: ${F.l15}\n`);
  for (let i = 0; i < 6; i++) e(15, `gaenge/${['nord', 'sued', 'ost', 'west'][i % 4]}/sackgasse-${i}`, 'Sackgasse.\n');
  e(15, 'hinweis.txt', '35 Wege stehen in der Beschreibung. Nur einer existiert wirklich. Prüf jeden Eintrag – mit einer Schleife.\n');

  // 16 – Skript lesen und verstehen
  e(16, 'tor.sh', T('#!/bin/bash', '# Tor zur Etage 17 – Albers', 'if [ -z "$1" ]; then echo "Aufruf: ./tor.sh ZAHL"; exit; fi',
    'if [ $(( $1 * 3 + 7 )) -eq 136 ]; then', `  echo "Tor offen. $(echo ${b64(`Code: ${F.l16}`)} | base64 -d)"`, 'else', '  echo "Falsche Zahl."', 'fi', ''), 0o755);
  e(16, 'hinweis.txt', 'Das Tor will eine Zahl. Raten ist dumm. Lies das Skript – es verrät dir, welche Zahl es erwartet.\n');

  // 17 – grep -n + sed -n 'a,bp'
  const l17 = Array.from({ length: 300 }, () => `${pick(words)} ${pick(words)} ${Math.floor(R() * 999)}`);
  const at = 120 + Math.floor(R() * 100); const code17 = F.l17;
  const chunks = [code17.slice(0, 5), code17.slice(5, 10), code17.slice(10, 15), code17.slice(15)];
  l17.splice(at, 0, '=== ANFANG GEHEIM ===', ...chunks, '=== ENDE GEHEIM ===');
  e(17, 'tagebuch.txt', l17.join('\n') + '\n');
  e(17, 'hinweis.txt', 'In Albers’ Tagebuch steht der Code zwischen ANFANG GEHEIM und ENDE GEHEIM – auf mehrere Zeilen verteilt.\n');

  // 18 – nachts aktiv: grep ^0[23] | cut | sort | uniq -c
  const users = ['mueller', 'schmidt', 'yilmaz', 'albers', 'nowak', 'becker'];
  const night = 'albers';
  const l18 = [];
  for (let i = 0; i < 200; i++) { const u = pick(users.filter(x => x !== night)); const h = 7 + Math.floor(R() * 12); l18.push(`${p2(h)}:${p2(Math.floor(R() * 60))} login user=${u}`); }
  for (let i = 0; i < 25; i++) l18.push(`0${2 + (i % 2)}:${p2(Math.floor(R() * 60))} login user=${night}`);
  for (let i = 0; i < 9; i++) l18.push(`0${2 + (i % 2)}:${p2(Math.floor(R() * 60))} login user=${pick(['nowak', 'becker'])}`);
  e(18, 'anmeldungen.log', l18.sort(() => R() - 0.5).join('\n') + '\n');
  for (const u of users) e(18, `spinde/${u}.txt`, u === night ? `Der Spind von dem, der nachts kommt. Code: ${F.l18}\n` : 'Arbeitskleidung.\n');
  e(18, 'hinweis.txt', 'Wer meldet sich am häufigsten NACHTS (02:00–03:59) an? Dessen Spind (spinde/NAME.txt) verrät mehr.\n');

  // 19 – Finale: Schleife + Bedingungen
  const hot = 30 + Math.floor(R() * 9);
  for (let i = 1; i <= 40; i++) {
    const d = `sender/kanal${p2(i)}`;
    const aktiv = i === hot || R() < 0.35, freq = i === hot ? 1037 : (aktiv ? 870 + Math.floor(R() * 160) : 870 + Math.floor(R() * 200));
    e(19, `${d}/status`, (aktiv ? 'AKTIV' : 'AUS') + '\n');
    e(19, `${d}/frequenz`, `${i !== hot && aktiv && freq > 1030 ? 1029 : freq}\n`);
    e(19, `${d}/schluessel`, i === hot ? `Das ist der Kanal des nächtlichen Signals. Code: ${F.l19}\n` : '----\n');
  }
  e(19, 'hinweis.txt', T('Letzte Etage. Unter sender/ gibt es 40 Kanäle mit status und frequenz.',
    'Gesucht ist der Kanal, der AKTIV ist UND über 1030 sendet.',
    'Schreib dir eine Schleife. Du kannst das.', ''));

  p('dach/sender.txt', T('Du stehst auf dem Dach. Der Sender läuft. Daneben klebt ein Zettel:', '',
    '„Lieber Nachfolger,',
    ' wenn du das liest, hast du dich durch 20 Etagen gearbeitet – mit Dateien, Rechten, Suchen,',
    ' Pipes, Schleifen und Skripten. Das nächtliche Signal war ich: eine automatische Nachricht,',
    ' die nur jemand findet, der den Turm wirklich versteht.',
    ' Der Turm gehört jetzt dir. Pass gut auf ihn auf.',
    '                                                    – Albers“', '',
    'Herzlichen Glückwunsch. Du beherrschst die Linux-Grundlagen, die jeder Pentester braucht.', ''));

  for (let n = 1; n <= N; n++) { const d = sh.fs.get(dirOf(n)); d.owner = 'root'; d.mode = 0o700; }
  for (let n = 0; n < N; n++) if (solved.has(`l${n}`)) openFloor(sh, n + 1);
  sh.cwd = B;
}

function commands({ F, solve }) {
  const entsperren = (args, { sh }) => {
    const code = String(args[0] || '').trim();
    if (!code) return { out: '', err: 'Aufruf: entsperren CODE\n', code: 2 };
    for (let n = 0; n < N; n++) if (F[`l${n}`] === code) {
      openFloor(sh, n + 1); solve(`l${n}`, code);
      return { out: n + 1 === N ? '🔓 Die Dachluke ist offen.  →  cd ../dach\n' : `🔓 Tür offen! Etage ${n + 1}.  →  cd ../etage${p2(n + 1)}\n`, code: 0 };
    }
    return { out: '', err: /^KLY\{[0-9a-f]{16}\}$/.test(code) ? '🔒 Falscher Code.\n' : '🔒 Falscher Code. Format: KLY{16 Zeichen 0-9/a-f}\n', code: 1 };
  };
  return { entsperren, unlock: entsperren, ...textTools() };
}

const fq = (n, hints, points, repeat) => ({ id: 'q1', type: 'flag', flag: `l${n}`, q: 'Code', points, hints, ...(repeat ? { repeat } : {}) });
const tk = (n, title, body, hints, points, repeat) => ({ id: `e${p2(n)}`, title: `Etage ${n} – ${title}`, body, questions: [fq(n, hints, points, repeat)] });

export const FUNKTURM = [
  {
    id: 'w4', title: 'Der Funkturm', type: 'wargame', level: 'L1', minutes: 180,
    tools: ['Anführungszeichen', './-datei', 'sed -n', 'wc -l', 'find -size', 'grep -v', 'uniq -u', 'diff', 'sort -k', 'cut -c', 'base64', 'rev', 'tr', 'chmod', 'find -perm', 'Schleifen', 'Skripte lesen', 'grep -n'],
    desc: 'Wargame mit 20 Etagen: Jede Nacht sendet der alte Funkturm ein fremdes Signal. Klettere Etage für Etage nach oben – jede Tür ist ein Linux-Rätsel.',
    ziel: 'Linux wirklich beherrschen: Dateien, Suchen, Vergleichen, Sortieren, Rechte, Pipes, Schleifen und Skripte – Schritt für Schritt schwerer.',
    scope: 'Nur das Sandbox-Terminal in diesem Raum (~/turm). SIMULATION einer Bash.',
    stop: 'Keine nötig – die Sandbox ist isoliert.',
    cleanup: 'Nichts nötig. Dein Fortschritt bleibt gespeichert.',
    machine: { kind: 'sandbox' },
    welcome: 'Funkturm · Sandbox bereit. Start: cat LIESMICH.txt · help zeigt Befehle.',
    flags: Array.from({ length: N }, (_, n) => `l${n}`),
    setup, commands,
    // Handübersetzung: doppelt verpackte Texte (Etage 10, 11) erst auspacken, übersetzen, wieder einpacken
    translateFS(sh, T, translateTree) {
      const unb64 = (x) => (typeof atob === 'function' ? decodeURIComponent(escape(atob(x))) : Buffer.from(x, 'base64').toString('utf8'));
      const rev = (x) => [...x].reverse().join('');
      translateTree(sh.fs.get(B), T, (name, data) => {
        if (name === 'nachricht.b64') return b64(b64(T.t(unb64(unb64(data.trim()))))) + '\n';
        if (name === 'spiegel.txt') return rev(rot13(T.t(rot13(rev(data.trim()))))) + '\n';
        return null;
      });
    },
    onSolve(sh, flag) { openFloor(sh, +flag.slice(1) + 1); },
    tasks: [
      tk(0, 'Der Eingang', 'Willkommen im Turm. Die Begrüßung hat einen Namen mit Leerzeichen.', [
        'cd etage00 und ls. Der Dateiname enthält Leerzeichen – die Shell würde ihn als mehrere Wörter lesen.',
        'Setz den ganzen Namen in Anführungszeichen: cat "Name mit Leerzeichen.txt" – oder tippe die ersten Buchstaben und drück Tab.',
        'Lösung: cat "Willkommen im Turm.txt"'], 5),
      tk(1, 'Der Zettel mit Bindestrich', 'Ein Zettel, den cat nicht lesen will.', [
        'cat -funkzettel scheitert, weil cat „-funkzettel“ für Optionen hält.',
        'Sag der Shell, dass es ein Pfad ist: ./ davor bedeutet „im aktuellen Ordner“.',
        'Lösung: cat ./-funkzettel'], 5),
      tk(2, 'Zeile 777', '1000 Zeilen Protokoll – aber nur eine zählt.', [
        'Du brauchst nur Zeile 777. Kannst du erst die ersten 777 Zeilen nehmen – und davon nur die letzte?',
        'head -n 777 zeigt die ersten 777 Zeilen, tail -n 1 davon nur die letzte. Verbinde beide mit | (die Ausgabe fließt in den nächsten Befehl): head -n 777 sendeprotokoll.log | tail -n 1',
        "Kürzer mit sed: sed -n '777p' gibt genau Zeile 777 aus.",
        "Lösung: sed -n '777p' sendeprotokoll.log"], 10),
      tk(3, 'Das richtige Band', '15 Bandaufnahmen. Eine hat genau 42 Zeilen.', [
        'wc -l DATEI zählt Zeilen (-l wie „lines“, Zeilen). Das * in baender/* heißt „alle Dateien im Ordner“ – so zählt wc alle auf einmal.',
        'In der Ausgabe nach „ 42 “ suchen: wc -l baender/* | grep " 42 "',
        'Lösung: wc -l baender/* | grep " 42 " – danach: cat baender/band-NN.txt (der Code steht in der letzten Zeile)'], 10),
      tk(4, 'Genau 73 Bytes', '40 alte Notizen, über viele Ordner verteilt.', [
        'find kann nach Größe suchen: -size. Die Einheit c steht für Bytes.',
        'find archiv -size 73c',
        'Lösung: find archiv -size 73c → cat auf den gefundenen Pfad'], 10, 'Nachtfalter Stufe 8 (find)'),
      tk(5, 'Die Störung', '400 Mal dasselbe – fast.', [
        'grep zeigt Zeilen, die passen. Du willst die Zeile, die NICHT passt.',
        'grep hat eine Option zum Umkehren: -v',
        'Lösung: grep -v "Signal stabil" messung.log'], 10, 'Nachtfalter Stufe 3 (grep)'),
      tk(6, 'Die einmalige Frequenz', 'Alle Frequenzen kommen mehrfach vor. Bis auf eine.', [
        'uniq fasst gleiche Zeilen zusammen – aber nur, wenn sie direkt untereinander stehen. Also vorher sortieren.',
        'uniq -u zeigt nur Zeilen, die genau einmal vorkommen.',
        'Lösung: sort frequenzen.txt | uniq -u → cat kanaele/FREQUENZ.txt'], 15, 'Nachtfalter Stufe 4 (sort | uniq)'),
      tk(7, 'Die veränderte Konfiguration', 'Zwei fast gleiche Dateien.', [
        'Zwei Dateien vergleichen – dafür gibt es ein eigenes Werkzeug.',
        'diff DATEI1 DATEI2 zeigt nur die Zeilen, die sich unterscheiden (< alt, > neu).',
        'Lösung: diff sender-alt.cfg sender-neu.cfg'], 15),
      tk(8, 'Der heißeste Raum', 'Eine Temperaturtabelle mit 60 Messungen.', [
        "Die Tabelle hat Spalten, getrennt durch ;. sort kann nach einer bestimmten Spalte sortieren: -t';' heißt „das Trennzeichen ist ;“, -k3 heißt „nimm Spalte 3“ (die Temperatur).",
        "Dazu -n (als Zahl) und -r (absteigend): sort -t';' -k3 -nr",
        "Lösung: sort -t';' -k3 -nr temperaturen.csv | head -1 → cat raeume/RAUM.txt"], 15),
      tk(9, 'Zeichensalat', 'Der Code steckt mitten in einer Zeile.', [
        'Erst die Zeile finden: Sie beginnt mit TURM. grep "^TURM" – das ^ heißt „am Zeilenanfang“.',
        'cut -c20-40 schneidet die Zeichen 20 bis 40 aus.',
        'Lösung: grep "^TURM" zeichensalat.txt | cut -c20-40'], 15),
      tk(10, 'Doppelt verpackt', 'Base64 – zweimal.', [
        'Einmal dekodieren: base64 -d DATEI. Das Ergebnis sieht wieder wie Base64 aus …',
        'Hänge ein zweites base64 -d per Pipe an.',
        'Lösung: base64 -d nachricht.b64 | base64 -d'], 15, 'Nachtfalter Stufe 6 (base64)'),
      tk(11, 'Spiegel und Verschiebung', 'Zwei Tricks auf einmal.', [
        'rev dreht jede Zeile um. Danach ist der Text noch ROT13-verschoben.',
        "ROT13 schiebt jeden Buchstaben 13 Stellen weiter (A wird N, B wird O …). Das Alphabet hat 26 Buchstaben, also macht nochmal 13 Schieben alles rückgängig. tr tauscht Zeichen aus: tr 'A-Za-z' 'N-ZA-Mn-za-m'",
        "Lösung: rev spiegel.txt | tr 'A-Za-z' 'N-ZA-Mn-za-m'"], 15, 'Nachtfalter Stufe 7 + Kollektiv Stufe 2'),
      tk(12, 'Der Wartungsschacht', 'Versteckt und abgesperrt.', [
        'Versteckte Dinge beginnen mit einem Punkt: ls -la',
        'Der Schacht gehört dir, hat aber keine Rechte (d--------- : d heißt Ordner, die Striche heißen „nichts erlaubt“). Um in einen Ordner hineinzuschauen, brauchst du r (lesen) und x (betreten) – wie in Nachtfalter Stufe 5.',
        'Lösung: chmod u+rx .wartungsschacht → chmod u+r .wartungsschacht/schalter.txt → cat .wartungsschacht/schalter.txt'], 15, 'Nachtfalter Stufe 1 + 5 (ls -a, chmod)'),
      tk(13, 'Die geschützte Statusdatei', '30 Geräte, eins ist anders geschützt.', [
        'Der Ordner .anlagen ist versteckt – ls -a zeigt ihn.',
        'find kann nach Rechten suchen: -perm 600',
        'Lösung: find .anlagen -perm 600 → cat auf den Pfad'], 15, 'Nachtfalter Stufe 8 (find -perm)'),
      tk(14, 'Das Zahlenschloss', '30 Messwerte, eine Summe.', [
        'Alle Zahlen auf einmal ausgeben: cat messungen/*',
        "Summieren mit awk: awk '{s+=$1} END {print s}' – für jede Zeile wird die Zahl ($1 = erstes Wort der Zeile) auf s draufgezählt, am Ende (END) wird s ausgegeben.",
        'Oder mit Schleife: s=0; for f in messungen/*; do s=$((s + $(cat $f))); done; echo $s',
        "Lösung: cat messungen/* | awk '{s+=$1} END {print s}' → cat schloss/SUMME.txt"], 20, 'Kollektiv Stufe 4 (awk)'),
      tk(15, 'Der richtige Weg', '35 Wege, nur einer existiert.', [
        'Lies wegbeschreibung.txt Zeile für Zeile: while read w; do …; done < wegbeschreibung.txt – jede Zeile landet nacheinander in der Variablen w, das < füttert die Datei in die Schleife.',
        '[ -f $w ] prüft, ob es die Datei gibt. && heißt „nur wenn das geklappt hat“: && cat $w zeigt sie dann.',
        'Lösung: while read w; do [ -f $w ] && cat $w; done < wegbeschreibung.txt'], 20, 'Kollektiv Stufe 6 (while read)'),
      tk(16, 'Das Tor', 'Ein Skript will eine Zahl.', [
        'Lies das Skript mit cat tor.sh. Wichtig ist die Zeile mit if.',
        'Die Bedingung lautet: ZAHL * 3 + 7 muss 136 ergeben. Rechne rückwärts.',
        '(136 − 7) / 3 = 43. Prüfen kannst du so: echo $((43 * 3 + 7))',
        'Lösung: ./tor.sh 43'], 20),
      tk(17, 'Albers’ Tagebuch', 'Der Code steht zwischen zwei Markierungen.', [
        'grep -n zeigt die Zeilennummern: grep -n GEHEIM tagebuch.txt',
        "sed -n 'VON,BISp' gibt einen Bereich von Zeilen aus. Du willst nur die Zeilen ZWISCHEN den Markierungen: VON = Nummer der ersten Markierung + 1, BIS = Nummer der zweiten Markierung − 1.",
        'Die Zeilen zwischen den Markierungen ergeben zusammen den Code. \\n ist das Zeichen für „neue Zeile“; tr -d "\\n" löscht diese Umbrüche und klebt die Stücke zusammen.',
        "Lösung: grep -n GEHEIM tagebuch.txt → z. B. 150 und 155 → sed -n '151,154p' tagebuch.txt | tr -d \"\\n\""], 20),
      tk(18, 'Wer kommt nachts?', 'Ein Anmeldeprotokoll mit 234 Einträgen.', [
        'Nachts heißt hier 02:00 bis 03:59. Solche Zeilen beginnen mit 02 oder 03: grep "^0[23]:" – ^ heißt „am Zeilenanfang“, [23] heißt „eine 2 oder eine 3“.',
        'Den Benutzernamen ausschneiden: Er steht hinter dem = (z. B. user=albers). cut -d= -f2 trennt die Zeile am = und nimmt das zweite Stück.',
        'Zählen: sort | uniq -c | sort -nr',
        'Lösung: grep "^0[23]:" anmeldungen.log | cut -d= -f2 | sort | uniq -c | sort -nr | head -1 → cat spinde/NAME.txt'], 25, 'Nachtfalter Stufe 4 + Kollektiv'),
      tk(19, 'Der Sender', 'Die letzte Etage. Alles, was du gelernt hast.', [
        'Schleife über alle Kanäle: for k in sender/*; do …; done',
        'Zwei Bedingungen: [ "$(cat $k/status)" = "AKTIV" ] und [ $(cat $k/frequenz) -gt 1030 ]. Verbinde sie mit &&.',
        'for k in sender/*; do if [ "$(cat $k/status)" = "AKTIV" ] && [ $(cat $k/frequenz) -gt 1030 ]; then echo $k; fi; done',
        'Lösung: obige Schleife → cat sender/kanalNN/schluessel → entsperren → cd ../dach → cat sender.txt'], 30, 'Kollektiv Stufe 7 (for + if)'),
    ],
    nach: { beobachtung: '20 Etagen: Namen, Zeilen, Größen, Unterschiede, Sortieren, Ausschneiden, Codierungen, Rechte, Schleifen und Skripte.', schluss: 'Das ist das Linux-Handwerkszeug, das du bei jedem Pentest brauchst – und du hast es benutzt, nicht auswendig gelernt.', grenzen: 'Simulation: Die Bash ist nachgebaut. In Kali funktionieren alle Befehle genauso – probier deine Lieblingslösungen dort aus.', naechster: 'Am PC: der Kellerserver mit echtem SSH. Und dann: Level 2 – Netzwerk & Aufklärung.' },
  },
];
