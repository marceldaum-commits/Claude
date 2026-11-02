// QA „Sprache & Qualität“: Prüft i18n/<sprache>/shell.json (Terminal-Meldungen).
// Aufruf: node qa/check-i18n-shell.mjs
// Format: ganze Ausgabezeilen (ohne \n). {1}, {2} … stehen für variable Teile (Befehl, Pfad, Zahl);
// sie bleiben unübersetzt. Derselbe Platzhalter darf mehrfach vorkommen (muss dann gleich sein).
// Wichtig für den Loader: nur die ANZEIGE übersetzen, nie Daten in Pipes oder Dateien.
import { readFileSync } from 'node:fs';
import { Shell, baseFS } from '../js/shell.js';
import { ROOMS } from '../js/content/rooms.js';
import { flagFor } from '../js/flags.js';

let fehler = 0;
const err = (m) => { fehler++; console.log('  ✗ ' + m); };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Muster-Loader für eine Ausgabezeile
export function makeLineT(dict) {
  const tpl = [];
  for (const [k, v] of Object.entries(dict)) {
    if (!/\{\d\}/.test(k)) continue;
    const order = [];
    const src = esc(k).replace(/\\\{(\d)\\\}/g, (_, n) => {
      if (order.includes(n)) return `\\k<p${n}>`;
      order.push(n); return `(?<p${n}>.+?)`;
    });
    tpl.push({ re: new RegExp('^' + src + '$'), v, lit: k.replace(/\{\d\}/g, '').length });
  }
  tpl.sort((a, b) => b.lit - a.lit); // spezifischere Muster (mehr fester Text) zuerst
  return (line) => {
    if (line in dict) return dict[line];
    for (const { re, v } of tpl) { const m = line.match(re); if (m) return v.replace(/\{(\d)\}/g, (_, n) => m.groups['p' + n]); }
    return line;
  };
}
const germanish = (s) => /[äöüßÄÖÜ„]|\b(nicht|Keine|kein|fehlt|Datei|Verzeichnis|Befehl|Aufruf|Sandbox kennt|Richtig|Falscher|Tür|ist)\b/.test(s);

const CMDS = ['cat nix', 'cat /root', 'cd nix', 'cd a b', 'cd /etc/hosts', 'ls nix', 'mkdir', 'mkdir /home', 'mkdir x/y/z', 'rmdir nix',
  'rm', 'rm nix', 'rm -r /', 'cp a', 'cp nix x', 'mv a', 'chmod 777', 'chmod 777 nix', 'chmod zz .bashrc', 'stat nix', 'stat .bashrc', 'stat /home',
  'find /nix', 'find . -foo', 'find . -size x', 'find . -type q', 'grep', 'grep x nix', 'grep x /home', 'grep "(" .bashrc', 'cut', 'diff', 'sleep x', 'sleep 3',
  'kill', 'kill abc', 'kill 1', 'getent', 'curl --version', 'curl http://example.com', 'id', 'uname -a', 'exit', 'man', 'man foo', 'man ls', 'type ls', 'type foo',
  'command ls', 'help', 'nano x', 'sudo ls', 'foobar', './nix', 'for x', 'if x', 'echo "a', "echo 'a", 'echo a >', 'cat <', 'ls &&& ', 'seq', 'tr', 'sed', "sed 'q'",
  'awk', "awk 'xyz'", 'xxd -r', 'basename', 'dirname', 'read', 'bash', '[ 1 = 1', 'while true', 'ls / & ls'];

for (const lang of ['en', 'uk']) {
  console.log(`== ${lang}: i18n/${lang}/shell.json`);
  const dict = JSON.parse(readFileSync(new URL(`../i18n/${lang}/shell.json`, import.meta.url), 'utf8'));
  for (const [k, v] of Object.entries(dict)) {
    const a = [...new Set(k.match(/\{\d\}/g) || [])].sort().join(), b = [...new Set(v.match(/\{\d\}/g) || [])].sort().join();
    if (a !== b) err(`Platzhalter anders: ${JSON.stringify(k)} → ${JSON.stringify(v)}`);
    if (lang === 'uk' && /[ыэъё]/i.test(v)) err(`russische Buchstaben: ${v}`);
    for (const c of (k.match(/cd \.\.\/\S*|man [a-z{]\S*|entsperren|KLY\{…\}|(?<=[\s\[(|])--?[a-z][\w-]*/g) || [])) if (!v.includes(c)) err(`„${c}“ fehlt in ${JSON.stringify(v)}`);
  }
  const T = makeLineT(dict);
  const used = new Set();
  const look = (text) => {
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      const tr = T(line);
      if (tr !== line) used.add(line);
      else if (germanish(line)) err(`nicht übersetzt: ${JSON.stringify(line)}`);
    }
  };
  const s = new Shell({ fs: baseFS() });
  for (const c of CMDS) { const r = s.exec(c); look((r.out || '') + (r.err || '')); }
  // Entsperren in Nachtfalter, Kollektiv, Funkturm
  for (const id of ['w1', 'w3', 'w4']) {
    const r = ROOMS.find(x => x.id === id); if (!r) continue;
    const F = {}; for (const f of r.flags) F[f] = await flagFor('KLY-QA', id, f);
    const sh = new Shell({ fs: baseFS(), commands: r.commands({ F, solve() {} }) }); r.setup(sh, F, new Set());
    for (const c of ['entsperren', 'entsperren abc', 'entsperren KLY{0000000000000000}', ...r.flags.map(f => 'entsperren ' + F[f])]) {
      const x = sh.exec(c); look((x.out || '') + (x.err || ''));
    }
  }
  console.log(`  ${Object.keys(dict).length} Einträge, ${used.size} verschiedene echte Ausgabezeilen übersetzt.`);
  if (lang === 'uk') console.log('  Beispiele:\n' + [...used].slice(0, 6).map(l => `    ${l}\n    → ${T(l)}`).join('\n'));
}
console.log(fehler ? `\n${fehler} Problem(e).` : '\nAlles in Ordnung ✓');
process.exit(fehler ? 1 : 0);
