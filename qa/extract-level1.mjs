// QA „Sprache & Qualität“: sammelt alle übersetzbaren Texte aus Level 1 (für i18n/<sprache>/level1.json).
// Aufruf: node qa/extract-level1.mjs > liste.json
// Nicht übersetzt werden: syntax, args[][0], ids, accept/answer, Befehle in LOESUNGEN.
import { LEVEL1 } from '../js/content/level1.js';
import { LOESUNGEN, REAL_LOESUNGEN, uebungsTipps } from '../js/content/level1-tipps.js';
import { Shell, baseFS } from '../js/shell.js';

export function level1Strings() {
  const out = new Map(); // text → Herkunft
  const add = (s, where) => { if (typeof s === 'string' && s.trim() && /[A-Za-zÄÖÜäöüß]{2}/.test(s) && !out.has(s)) out.set(s, where); };
  for (const l of LEVEL1.lessons) {
    add(l.title, l.id); add(l.intro, l.id);
    for (const c of l.concepts || []) {
      for (const k of ['name', 'zweck', 'wirkung', 'regel']) add(c[k], `${l.id}.${k}`);
      for (const a of c.args || []) add(a[1], `${l.id}.args`);
      for (const f of c.fehler || []) add(f, `${l.id}.fehler`);
    }
  }
  const lessonOf = (id) => LEVEL1.lessons.find(l => l.id === id);
  const base = new Set();
  (function walk(n, p) { for (const [k, v] of Object.entries(n.kids || {})) { const q = p + '/' + k; if (v.t === 'd') walk(v, q); else base.add(q + '\0' + v.data); } })(baseFS().root, '');
  for (const e of LEVEL1.exercises) {
    for (const k of ['title', 'ziel', 'auftrag', 'scope', 'beleg', 'hinweis']) add(e[k], `${e.id}.${k}`);
    if (e.knobel) { add(e.knobel.q, `${e.id}.knobel`); for (const o of e.knobel.options || []) { add(o.t, `${e.id}.knobel`); add(o.why, `${e.id}.knobel`); } }
    for (const v of Object.values(e.nach || {})) add(v, `${e.id}.nach`);
    if (e.real) (function rec(o) { for (const v of Object.values(o)) typeof v === 'string' ? add(v, `${e.id}.real`) : Array.isArray(v) ? v.forEach(x => typeof x === 'string' ? add(x, `${e.id}.real`) : x && typeof x === 'object' && rec(x)) : v && typeof v === 'object' && rec(v); })(Object.fromEntries(Object.entries(e.real).filter(([k]) => !/^(check|accept|cmd|setup|befehl)/.test(k))));
    // Rückmeldungen aus check(): msg-Strings im Quelltext
    const src = String(e.sandbox?.check || '') + String(e.real?.check || '');
    for (const m of src.matchAll(/(['"`])((?:\\.|(?!\1).)*?)\1/g)) if (/[a-zäöüß]{3,} [a-zäöüß]{3,}/i.test(m[2]) && !m[2].includes('${')) add(m[2].replace(/\\'/g, "'"), `${e.id}.check`);
    // Tipps
    for (const t of uebungsTipps(e, lessonOf(e.lesson))) add(t, `${e.id}.tipp`);
    // Sandbox-Dateien (nur neue/geänderte gegenüber baseFS)
    if (e.sandbox?.setup) {
      const sh = new Shell({ fs: baseFS() }); try { e.sandbox.setup(sh); } catch { /* */ }
      (function walk(n, p) { for (const [k, v] of Object.entries(n.kids || {})) { const q = p + '/' + k; if (v.t === 'd') walk(v, q); else if (v.data && !base.has(q + '\0' + v.data)) v.data.split('\n').forEach(line => add(line, `${e.id}.datei ${q}`)); } })(sh.fs.root, '');
    }
  }
  const x = LEVEL1.exam; add(x.title, 'exam'); add(x.rules, 'exam');
  for (const i of x.items) { add(i.topic, 'exam.topic'); add(i.q, `exam.${i.id}`); for (const o of i.options || []) add(o, `exam.${i.id}`); }
  return out;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const m = level1Strings();
  console.log(JSON.stringify([...m].map(([t, w]) => ({ t, w })), null, 1));
}
