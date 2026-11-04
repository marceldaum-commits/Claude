// QA „Sprache & Qualität“: Prüft die Handübersetzung eines Raums.
// Aufruf (im Repo-Wurzelordner):  node qa/check-i18n.mjs w1   (oder w4 …)
// 1. Jeder Schlüssel in i18n/<sprache>/<raum>.json kommt im deutschen Original vor (Raumtexte, Tipps, Dateien).
// 2. Befehle aus dem deutschen Text (per codeify der App erkannt) stehen unverändert in der Übersetzung.
// 3. Der Raum wird mit dem echten Loader der App (makeT/translateTree aus js/i18n.js) übersetzt und mit den
//    Lösungswegen komplett durchgespielt. Hat der Raum noch kein translateFS, nutzt das Skript den Vorschlag unten.
// Platzhalter {code} = ein Code KLY{16 Zeichen}.
import { readFileSync } from 'node:fs';
import { Shell, baseFS, HOME } from '../js/shell.js';
import { ROOMS } from '../js/content/rooms.js';
import { flagFor } from '../js/flags.js';
import { makeT, translateTree, codeify } from '../js/i18n.js';

const ROOM = process.argv[2] || 'w1';
let fehler = 0;
const err = (m) => { fehler++; console.log('  ✗ ' + m); };
const CODE_RE = /KLY\{[0-9a-f]{16}\}/g;
const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');
const unb64 = (s) => Buffer.from(s.replace(/\s+/g, ''), 'base64').toString('utf8');
const rev = (s) => [...s].reverse().join('');
const rot13 = (s) => s.replace(/[A-Za-z]/g, c => String.fromCharCode((c <= 'Z' ? 65 : 97) + ((c.charCodeAt(0) - (c <= 'Z' ? 65 : 97) + 13) % 26)));

// ---------------------------------------------------------------- Raum-Steckbriefe
// base: Ordner des Raums · decode: Datei → Klartextzeilen (für den Abgleich der Schlüssel)
// special: Vorschlag für translateFS (nur benutzt, wenn der Raum selbst keins hat) · solve: Lösungswege
const ROOMDEF = {
  w1: {
    base: HOME + '/nachtfalter',
    decode(name, data) {
      if (name.endsWith('.b64')) return unb64(data);
      if (name === 'spiegel.txt') return rev(data.trim());
      if (name === 'protokoll.log') return data.split('\n').filter(l => l.split(' ')[1] === 'GEHEIM').map(l => unb64(l.split(' ')[2])).join('\n');
      return null;
    },
    chats: true,
    solve(run, step) {
      step(0, 'cat stufe0/hallo.txt');
      step(1, 'cat stufe1/.tagebuch');
      const big = run('ls -l stufe2/fotos').split('\n').find(l => / [1-9]\d* \S+ +\d/.test(l));
      step(2, 'cat stufe2/fotos/' + (big || '').trim().split(/\s+/).pop());
      const hits = run('grep -r Treffpunkt stufe3/chats').split('\n').filter(Boolean);
      if (hits.length !== 1) err(`Stufe 3: grep -r Treffpunkt liefert ${hits.length} Treffer statt 1`);
      step(3, 'grep -r Treffpunkt stufe3/chats');
      const nr = run('sort stufe4/anrufe.log | uniq -c | sort -nr | head -1').trim().split(/\s+/)[1];
      step(4, `cat stufe4/kontakte/${nr}.vcf`);
      run('chmod u+rx stufe5/tresor'); run('chmod u+r stufe5/tresor/inhalt.txt'); step(5, 'cat stufe5/tresor/inhalt.txt');
      step(6, 'base64 -d stufe6/nachricht.b64');
      step(7, 'rev stufe7/spiegel.txt');
      step(8, 'cat ' + run('find stufe8/archiv -perm 600').trim());
      step(9, 'grep GEHEIM stufe9/.funk/protokoll.log | cut -d" " -f3 | base64 -d');
      if (!run('cat stufe10/finale.txt').includes('Kellerserver')) err('Finale erwähnt den Kellerserver nicht');
    },
  },
  w4: {
    base: HOME + '/turm',
    allow: ['cat "Name mit Leerzeichen.txt"'], // Beispiel mit erfundenem Namen darf übersetzt werden
    decode(name, data) {
      if (name === 'nachricht.b64') return unb64(unb64(data));
      if (name === 'spiegel.txt') return rot13(rev(data.trim()));
      return null;
    },
    special(name, data, T) {
      if (name === 'nachricht.b64') return b64(b64(T.t(unb64(unb64(data))))) + '\n';
      if (name === 'spiegel.txt') return rev(rot13(T.t(rot13(rev(data.trim()))))) + '\n';
      return null;
    },
    solve(run, step) {
      const go = (n) => run(`cd ~/turm/etage${String(n).padStart(2, '0')}`);
      go(0); step(0, 'cat "Willkommen im Turm.txt"');
      go(1); step(1, 'cat ./-funkzettel');
      go(2); step(2, "sed -n '777p' sendeprotokoll.log");
      go(3); step(3, 'cat ' + run('wc -l baender/* | grep " 42 "').trim().split(/\s+/)[1]);
      go(4); const f4 = run('find archiv -size 73c').trim();
      if (!f4 || f4.includes('\n')) err(`Etage 4: find -size 73c liefert ${JSON.stringify(f4)} (genau 1 Treffer erwartet)`); step(4, 'cat ' + f4.split('\n')[0]);
      go(5); step(5, 'grep -v "Signal stabil" messung.log');
      go(6); step(6, `cat kanaele/${run('sort frequenzen.txt | uniq -u').trim()}.txt`);
      go(7); step(7, 'diff sender-alt.cfg sender-neu.cfg');
      go(8); step(8, `cat raeume/${run("sort -t';' -k3 -nr temperaturen.csv | head -1").split(';')[0]}.txt`);
      go(9); step(9, 'grep "^TURM" zeichensalat.txt | cut -c20-40');
      go(10); step(10, 'base64 -d nachricht.b64 | base64 -d');
      go(11); step(11, "rev spiegel.txt | tr 'A-Za-z' 'N-ZA-Mn-za-m'");
      go(12); run('chmod u+rx .wartungsschacht'); run('chmod u+r .wartungsschacht/schalter.txt'); step(12, 'cat .wartungsschacht/schalter.txt');
      go(13); step(13, 'cat ' + run('find .anlagen -perm 600').trim());
      go(14); step(14, `cat schloss/${run("cat messungen/* | awk '{s+=$1} END {print s}'").trim()}.txt`);
      go(15); step(15, 'while read w; do [ -f $w ] && cat $w; done < wegbeschreibung.txt');
      go(16); if (!/Usage|Aufruf/.test(run('./tor.sh'))) err('Etage 16: tor.sh ohne Zahl zeigt keine Aufruf-Zeile');
      step(16, './tor.sh 43');
      go(17); const nums = run('grep -n GEHEIM tagebuch.txt').trim().split('\n').map(l => parseInt(l, 10));
      step(17, `sed -n '${nums[0] + 1},${nums[1] - 1}p' tagebuch.txt | tr -d "\\n"`);
      go(18); step(18, `cat spinde/${run('grep "^0[23]:" anmeldungen.log | cut -d= -f2 | sort | uniq -c | sort -nr | head -1').trim().split(/\s+/)[1]}.txt`);
      go(19); const k = run('for k in sender/*; do if [ "$(cat $k/status)" = "AKTIV" ] && [ $(cat $k/frequenz) -gt 1030 ]; then echo $k; fi; done').trim();
      step(19, `cat ${k}/schluessel`);
      if (!run('cat ~/turm/dach/sender.txt').includes('Albers')) err('Dach: Albers fehlt');
    },
  },
  w5: {
    base: HOME + '/stellwerk', ladder: 'posten',
    decode(name, data) { if (name === 'signal.hex') return Buffer.from(data.replace(/\s+/g, ''), 'hex').toString('utf8'); if (name.endsWith('.bin')) return ''; return null; },
    special(name, data, T) {
      if (name === 'signal.hex') return Buffer.from(T.t(Buffer.from(data.replace(/\s+/g, ''), 'hex').toString('utf8')), 'utf8').toString('hex').replace(/(.{40})/g, '$1\n') + '\n';
      if (name.endsWith('.bin') || name === 'pruefe.sh') return data; // Rohdaten und Skript nie anfassen
      return null;
    },
  },
  w3: {
    base: HOME + '/kollektiv',
    decode(name, data) { return name === 'abgefangen.txt' ? rot13(data.trim()) : null; },
    special(name, data, T) {
      if (name === 'abgefangen.txt') return rot13(T.t(rot13(data.trim()))) + '\n';
      if (name.endsWith('.log') || name.endsWith('.csv')) return data; // Daten nie anfassen (grep -c ALARM, CODE/XX)
      return null;
    },
    solve(run, step) {
      const st = (n, cmds) => { run(`cd ~/kollektiv/stufe${n}`); let out = ''; for (const c of cmds) out = run(c); step(n, null, out); };
      st(0, ['A=$(cat teil1); B=$(cat teil2); C=$(cat teil3); echo "$A$B$C"']);
      st(1, ['for f in funk/*; do tail -n 1 $f; done | tr -d "\\n"']);
      st(2, ["cat abgefangen.txt | tr 'A-Za-z' 'N-ZA-Mn-za-m'"]);
      st(3, ["grep CODE protokoll.log | sed 's/XX//g'"]);
      run('cd ~/kollektiv/stufe4'); const sum = run("awk -F';' '$1==\"falter\" {s+=$3} END {print s}' einsaetze.csv").trim();
      st(4, [`cat tresor/${sum}.txt`]);
      st(5, ['chmod +x entschluessler.sh', './entschluessler.sh']);
      st(6, ['while read n; do [ -f archiv/$n ] && cat archiv/$n; done < kandidaten.txt']);
      st(7, ['for d in knoten/*; do if [ "$(cat $d/version)" = "1.2" ]; then cat $d/teil; fi; done | tr -d "\\n"']);
      run('cd ~/kollektiv/stufe8'); run(`echo 'for f in wachen/*.log; do echo "$(grep -c ALARM $f) $f"; done | sort -nr' > wachbericht.sh`); run('chmod +x wachbericht.sh');
      const top = run('./wachbericht.sh | head -1').trim().split(' ')[1] || '';
      st(8, [`cat schluessel/${top.replace('wachen/', '').replace('.log', '')}.txt`]);
      if (!run('cat ~/kollektiv/finale/nachricht.txt').includes('Level 9')) err('Finale: „Level 9“ fehlt');
    },
  },
};

// ---------------------------------------------------------------- Originaltexte sammeln
const r = ROOMS.find(x => x.id === ROOM);
if (!r) { console.log(`Raum ${ROOM} gibt es nicht.`); process.exit(2); }
// Steckbrief: hier in ROOMDEF, sonst qa/i18n-rooms/<raum>.mjs (export default { decode, special, web, solve? }).
// Leitern (makeLadder) brauchen nur decode/special – gelöst wird automatisch über floors[].solve.
let def = ROOMDEF[ROOM];
if (!def) {
  const ext = await import(`./i18n-rooms/${ROOM}.mjs`).then(m => m.default).catch(() => ({}));
  if (!r.floors && !ext.solve) { console.log(`Für ${ROOM} fehlt ein Steckbrief (qa/i18n-rooms/${ROOM}.mjs).`); process.exit(2); }
  const first = r.dirOf ? r.dirOf(0) : '';
  def = { decode: () => null, ...ext, base: ext.base || first.replace(/\/[^/]+$/, ''), ladder: ext.ladder ?? (r.floors ? first.split('/').pop().replace(/\d+$/, '') : undefined) };
}
const F = {}; for (const f of r.flags) F[f] = await flagFor('KLY-QA-TEST', ROOM, f);

function roomStrings() {
  const out = [r.title, r.difficulty, r.desc, r.ziel, r.scope, r.stop, r.cleanup, r.welcome, ...Object.values(r.nach || {})];
  for (const task of r.tasks) { out.push(task.title, task.body); for (const q of task.questions) out.push(q.q, q.repeat, ...(q.hints || []), ...(q.options || []).filter(o => typeof o === 'string')); }
  return out.filter(Boolean);
}
const hintSet = new Set(r.tasks.flatMap(t => t.questions.flatMap(q => q.hints || [])));
function fileStrings(node, out, path = '') {
  for (const [n, kid] of Object.entries(node.kids || {})) {
    const p = path + '/' + n;
    if (kid.t === 'd') { fileStrings(kid, out, p); continue; }
    if (!kid.data) continue;
    const text = def.decode(n, kid.data) ?? kid.data;
    for (let l of text.split('\n')) {
      l = l.replace(CODE_RE, '{code}');
      const chat = def.chats && p.includes('/chats/') && l.match(/^([A-ZÄÖÜ][a-zäöüß]+): (.+)$/);
      out.add(chat ? chat[2] : l);
    }
  }
  return out;
}
const probe = new Shell({ fs: baseFS(), commands: r.commands({ F, solve() {} }) });
r.setup(probe, F, new Set());
const quelle = fileStrings(probe.fs.get(def.base), new Set(roomStrings()));
// Nur Sätze melden (mindestens 4 Wörter, keine Protokoll-/Datenzeilen)
const technisch = (s) => s.trim().split(/\s+/).filter(w => /[a-zäöüß]{2}/i.test(w)).length < 4 || /^\d|^[\w-]+ ?=|^(for|if|while|echo) /.test(s.trim());

// ---------------------------------------------------------------- Prüfen
const un = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
for (const lang of ['en']) {
  console.log(`\n== ${lang}: i18n/${lang}/${ROOM}.json`);
  const dict = JSON.parse(readFileSync(new URL(`../i18n/${lang}/${ROOM}.json`, import.meta.url), 'utf8'));
  for (const [k, v] of Object.entries(dict)) {
    if (!quelle.has(k)) err(`Schlüssel nicht im Original: ${JSON.stringify(k)}`);
    if (!v || !v.trim()) err(`leere Übersetzung: ${JSON.stringify(k)}`);
    if ((k.match(/\{code\}/g) || []).length !== (v.match(/\{code\}/g) || []).length) err(`{code} fehlt: ${JSON.stringify(v)}`);
    if (!hintSet.has(k)) continue;
    // Befehle (codeify) unverändert? Platzhalter in Großbuchstaben (DATEI, NUMMER …) dürfen übersetzt sein.
    for (const m of codeify(k).matchAll(/<code translate="no">(.*?)<\/code>/g)) {
      const c = un(m[1]);
      if (/[A-ZÄÖÜ]{3,}/.test(c.replace(/KLY|GEHEIM|LIESMICH|TURM|AKTIV|ANFANG|ENDE|TERM|README/g, ''))) continue;
      if ((def.allow || []).includes(c) || /<\S/.test(c)) continue; // <Platzhalter> darf übersetzt sein
      if (!v.includes(c)) err(`Befehl „${c}“ fehlt in: ${JSON.stringify(v)}`);
    }
  }
  [...quelle].filter(s => !(s in dict) && !technisch(s)).forEach(s => console.log(`  · bleibt deutsch: ${JSON.stringify(s.length > 90 ? s.slice(0, 90) + '…' : s)}`));

  // Durchspielen mit dem echten Loader
  const T = makeT(dict);
  const solved = [];
  const s = new Shell({ fs: baseFS(), commands: r.commands({ F, solve: (f) => solved.push(f) }) });
  r.setup(s, F, new Set());
  if (r.translateFS) r.translateFS(s, T, translateTree);
  else { console.log('  (Raum hat noch kein translateFS – nutze Vorschlag aus dem Steckbrief)'); translateTree(s.fs.get(def.base), T, def.special || (() => null)); if (def.web) def.web(s, T); }
  const run = (c) => { const x = s.exec(c); return (x.out || '') + (x.err || ''); };
  const step = (n, cmd, given) => {
    const out = given ?? run(cmd); const c = (out.match(/KLY\{[0-9a-f]{16}\}/) || [])[0];
    const want = typeof n === 'string' ? F[n] : F['l' + n]; // Leitern: l0, l1 …; andere Räume: Flag-Namen
    if (c !== want) return err(`Stufe/Flag ${n}: kein Code über „${cmd}“ → ${JSON.stringify(out.slice(0, 140))}`);
    if (typeof n === 'string') solved.push(n);
    if (typeof n !== 'string' && !/🔓/.test(run('entsperren ' + c))) err(`${n}: entsperren klappt nicht`);
  };
  if (def.ladder) r.floors.forEach((fl, n) => {
    run(`cd ${def.base}/${def.ladder}${String(n).padStart(2, '0')}`);
    const out = fl.solve(run); const c = (String(out).match(/KLY\{[0-9a-f]{16}\}/) || [])[0];
    if (c !== F['l' + n]) return err(`Stufe ${n}: Lösungsweg liefert keinen Code → ${JSON.stringify(String(out).slice(0, 140))}`);
    if (!/🔓/.test(run('entsperren ' + c))) err(`${n}: entsperren klappt nicht`);
  });
  else def.solve(run, step, { F, err });
  if (solved.length !== r.flags.length) err(`nur ${solved.length}/${r.flags.length} gelöst`);
  console.log(`  ${Object.keys(dict).length} Einträge, ${solved.length}/${r.flags.length} mit übersetzten Dateien gelöst.`);
}
console.log(fehler ? `\n${fehler} Problem(e) gefunden.` : '\nAlles in Ordnung ✓');
process.exit(fehler ? 1 : 0);
