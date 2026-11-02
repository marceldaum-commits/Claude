// QA „Sprache & Qualität“: Prüft die Handübersetzungen für Raum w1 (Nachtfalter).
// Aufruf (im Repo-Wurzelordner):  node qa/check-i18n-w1.mjs
// 1. Jeder Schlüssel in i18n/<sprache>/w1.json kommt wirklich im deutschen Original vor.
// 2. Geschützte Teile (Befehle, Dateinamen, Codes, Suchwörter) stehen auch in der Übersetzung.
// 3. Mit einem Muster-Loader (unten) wird der Raum übersetzt und komplett durchgespielt:
//    alle 10 Codes müssen sich mit den Lösungs-Befehlen aus den Tipps finden lassen.
// Platzhalter {code} in Schlüssel und Wert steht für einen Code KLY{16 Zeichen}.
import { readFileSync } from 'node:fs';
import { Shell, baseFS, HOME } from '../js/shell.js';
import { ROOMS } from '../js/content/rooms.js';
import { flagFor } from '../js/flags.js';

const ROOM = 'w1';
const NF = HOME + '/nachtfalter';
const CODE_RE = /KLY\{[0-9a-f]{16}\}/g;
let fehler = 0;
const err = (m) => { fehler++; console.log('  ✗ ' + m); };
const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');
const unb64 = (s) => Buffer.from(s, 'base64').toString('utf8');
const rev = (s) => [...s].reverse().join('');

// ---------------------------------------------------------------- Muster-Loader
function makeT(dict) {
  const t = (s) => {
    if (s in dict) return dict[s];
    const codes = s.match(CODE_RE) || [];
    if (codes.length) {
      const k = s.replace(CODE_RE, '{code}');
      if (k in dict) { let i = 0; return dict[k].replace(/\{code\}/g, () => codes[i++] ?? '{code}'); }
    }
    const chat = s.match(/^([A-ZÄÖÜ][a-zäöüß]+): (.+)$/); // Chat-Zeile "Name: Satz"
    if (chat) { const r = t(chat[2]); if (r !== chat[2]) return chat[1] + ': ' + r; }
    return s;
  };
  const lines = (text) => text.split('\n').map(t).join('\n');
  return { t, lines };
}

// Dateien im Raum übersetzen (inkl. Base64 und Spiegelschrift: erst entpacken, übersetzen, wieder einpacken)
function translateFiles(node, T, path = NF) {
  for (const [name, kid] of Object.entries(node.kids || {})) {
    const p = path + '/' + name;
    if (kid.t === 'd') { translateFiles(kid, T, p); continue; }
    if (!kid.data) continue;
    if (name.endsWith('.b64')) {
      kid.data = b64(T.lines(unb64(kid.data.replace(/\s+/g, '')))).replace(/(.{60})/g, '$1\n') + '\n';
    } else if (name === 'spiegel.txt') {
      kid.data = kid.data.split('\n').map(l => rev(T.t(rev(l)))).join('\n');
    } else if (name === 'protokoll.log') {
      kid.data = kid.data.split('\n').map(l => {
        const f = l.split(' ');
        return f[1] === 'GEHEIM' ? [f[0], f[1], b64(T.t(unb64(f[2])))].join(' ') : l;
      }).join('\n');
    } else kid.data = T.lines(kid.data);
  }
}

// ---------------------------------------------------------------- Originaltexte sammeln
function roomStrings(r) {
  const out = [r.title, r.difficulty, r.desc, r.ziel, r.scope, r.stop, r.cleanup, r.welcome, ...Object.values(r.nach || {})];
  for (const task of r.tasks) {
    out.push(task.title, task.body);
    for (const q of task.questions) out.push(q.q, ...(q.hints || []));
  }
  return out.filter(Boolean);
}
function fileStrings(node, out = new Set(), path = '') {
  for (const [n, kid] of Object.entries(node.kids || {})) {
    if (kid.t === 'd') { fileStrings(kid, out, path + '/' + n); continue; }
    if (!kid.data) continue;
    let text = kid.data;
    if (n.endsWith('.b64')) text = unb64(text.replace(/\s+/g, ''));
    if (n === 'spiegel.txt') text = rev(text.trim());
    for (let l of text.split('\n')) {
      if (n === 'protokoll.log') { const f = l.split(' '); if (f[1] !== 'GEHEIM') continue; l = unb64(f[2]); }
      l = l.replace(CODE_RE, '{code}');
      const chat = path.includes('/chats/') && l.match(/^([A-ZÄÖÜ][a-zäöüß]+): (.+)$/);
      out.add(chat ? chat[2] : l);
    }
  }
  return out;
}
// Zeilen ohne Text (Nummern, Protokoll, VCARD-Technik, Befehlszeile) brauchen keine Übersetzung
const technisch = (s) => !/[a-zäöüß]{3}/i.test(s) || /^(BEGIN|END):VCARD$|^TEL:|^ +entsperren CODE$|^Nachtfalter$/.test(s);

// Geschützte Teile, die in der Übersetzung unverändert vorkommen müssen
const PROTECT = /KLY\{…\}|\{code\}|~?\/?[a-z0-9_.\/-]*[a-z0-9_]\.(txt|log|vcf|b64|jpg)\b|\.tagebuch|\.funk|\bstufe\d+\b|\bentsperren\b|\bTreffpunkt\b|\bGEHEIM\b|\bseppi\b|\bchmod u\+r ?x? [\w\/.]+|\bgrep( -r)? (Treffpunkt|GEHEIM)\b|\bfind archiv -perm 600\b|\bsort -nr\b|\buniq -c\b|\bls -[al]\b|\bcut -d" " -f3\b|\bbase64 -d\b|\b(600|644)\b/g;

// ---------------------------------------------------------------- Prüfen
const r = ROOMS.find(x => x.id === ROOM);
const F = {};
for (const f of r.flags) F[f] = await flagFor('KLY-QA-TEST', ROOM, f);

const probe = new Shell({ fs: baseFS(), commands: r.commands({ F, solve() {} }) });
r.setup(probe, F, new Set());
const quelle = new Set([...roomStrings(r), ...fileStrings(probe.fs.get(NF))]);

for (const lang of ['en', 'uk']) {
  console.log(`\n== ${lang}: i18n/${lang}/${ROOM}.json`);
  const dict = JSON.parse(readFileSync(new URL(`../i18n/${lang}/${ROOM}.json`, import.meta.url), 'utf8'));
  const T = makeT(dict);

  for (const [k, v] of Object.entries(dict)) {
    if (!quelle.has(k)) err(`Schlüssel nicht im Original: ${JSON.stringify(k)}`);
    if (!v || !v.trim()) err(`leere Übersetzung: ${JSON.stringify(k)}`);
    for (const m of k.match(PROTECT) || []) if (!v.includes(m.trim())) err(`geschützter Teil „${m}“ fehlt in: ${JSON.stringify(v)}`);
  }
  const fehlt = [...quelle].filter(s => !(s in dict) && !technisch(s));
  if (fehlt.length) fehlt.forEach(s => err(`noch nicht übersetzt: ${JSON.stringify(s)}`));
  if (lang === 'uk') {
    for (const [k, v] of Object.entries(dict)) if (/[ыэъё]/i.test(v)) err(`russische Buchstaben in: ${JSON.stringify(v)}`);
  }

  // Durchspielen mit übersetzten Dateien
  const solved = [];
  const s = new Shell({ fs: baseFS(), commands: r.commands({ F, solve: (f) => solved.push(f) }) });
  r.setup(s, F, new Set());
  translateFiles(s.fs.get(NF), T);
  const run = (c) => s.exec(c);
  const code = (txt) => (txt.match(/KLY\{[0-9a-f]{16}\}/) || [])[0];
  const step = (n, cmd) => {
    const res = run(cmd); const c = code(res.out);
    if (c !== F['l' + n]) return err(`Stufe ${n}: kein Code über „${cmd}“ (Ausgabe: ${JSON.stringify((res.out + res.err).slice(0, 120))})`);
    if (!/Richtig|Letzte/.test(run('entsperren ' + c).out)) err(`Stufe ${n}: entsperren klappt nicht`);
  };
  step(0, 'cat stufe0/hallo.txt');
  step(1, 'cat stufe1/.tagebuch');
  const big = run('ls -l stufe2/fotos').out.split('\n').find(l => / [1-9]\d* \w+ +\d/.test(l));
  if (!big) err('Stufe 2: keine nicht-leere Datei'); else step(2, 'cat stufe2/fotos/' + big.trim().split(/\s+/).pop());
  const hits = run('grep -r Treffpunkt stufe3/chats').out.split('\n').filter(Boolean);
  if (hits.length !== 1) err(`Stufe 3: grep -r Treffpunkt liefert ${hits.length} Treffer statt 1`);
  step(3, 'grep -r Treffpunkt stufe3/chats');
  const nr = run('sort stufe4/anrufe.log | uniq -c | sort -nr | head -1').out.trim().split(/\s+/)[1];
  step(4, `cat stufe4/kontakte/${nr}.vcf`);
  run('chmod u+rx stufe5/tresor'); run('chmod u+r stufe5/tresor/inhalt.txt'); step(5, 'cat stufe5/tresor/inhalt.txt');
  step(6, 'base64 -d stufe6/nachricht.b64');
  step(7, 'rev stufe7/spiegel.txt');
  step(8, 'cat ' + run('find stufe8/archiv -perm 600').out.trim());
  step(9, 'grep GEHEIM stufe9/.funk/protokoll.log | cut -d" " -f3 | base64 -d');
  const fin = run('cat stufe10/finale.txt').out;
  if (!fin.includes('Kellerserver')) err('Finale erwähnt den Kellerserver nicht');
  if (solved.length !== 10) err(`nur ${solved.length}/10 Stufen gelöst`);
  // Stichprobe zeigen
  console.log('  Beispiel LIESMICH.txt:\n' + run('cat LIESMICH.txt').out.replace(/^/gm, '    | '));
  console.log(`  ${Object.keys(dict).length} Einträge, ${solved.length}/10 Stufen mit übersetzten Dateien gelöst.`);
}
console.log(fehler ? `\n${fehler} Problem(e) gefunden.` : '\nAlles in Ordnung ✓');
process.exit(fehler ? 1 : 0);
