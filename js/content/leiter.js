// Vorlage für Rätsel-Leitern (Wargames im Sandbox-Terminal, SIMULATION).
// Jede Stufe liegt in einem eigenen Ordner, ist anfangs verschlossen und wird mit „entsperren CODE“ geöffnet.
// Stufen beschreiben: { t, body, build(ctx), hints[], pts, rep?, solve?(run) }  – solve wird nur in den Tests benutzt.

import { HOME } from '../shell.js';
import { textTools } from './wargames.js';

export const T = (...lines) => lines.join('\n');
export const p2 = (n) => String(n).padStart(2, '0');
export const b64 = (s) => (typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(s))) : Buffer.from(s, 'utf8').toString('base64'));
export const b64url = (s) => b64(s).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
export const hex = (s) => [...new TextEncoder().encode(s)].map(x => x.toString(16).padStart(2, '0')).join('');
export const rot13 = (s) => s.replace(/[A-Za-z]/g, c => String.fromCharCode((c <= 'Z' ? 65 : 97) + ((c.charCodeAt(0) - (c <= 'Z' ? 65 : 97) + 13) % 26)));
export const rev = (s) => [...s].reverse().join('');
export function rng(seed) { let x = seed >>> 0 || 1; return () => (x = (x * 1664525 + 1013904223) >>> 0) / 2 ** 32; }
export const page = (title, body) => `<!DOCTYPE html>\n<html><head><title>${title}</title></head>\n<body>\n${body}\n</body></html>\n`;

/**
 * @param o { id, title, level, dir, prefix, minutes, desc, ziel, tools, intro, finale, seed, floors, extra?(F) }
 */
export function makeLadder(o) {
  const N = o.floors.length;
  const base = `${HOME}/${o.dir}`;
  const dirOf = (n) => (n >= N ? `${base}/ziel` : `${base}/${o.prefix}${p2(n)}`);
  const open = (sh, n) => { const d = sh.fs.get(dirOf(n)); if (d) { d.owner = 'seppi'; d.mode = 0o755; } };

  function setup(sh, F, solved = new Set()) {
    const R = rng(o.seed);
    sh.web = sh.web || {};
    let hosts = '';
    sh.fs.put(`${base}/LIESMICH.txt`, o.intro + '\n');
    o.floors.forEach((fl, n) => {
      const dir = dirOf(n);
      sh.fs.put(dir, null);
      const ctx = {
        sh, R, code: F[`l${n}`], F, n, dir, base,
        pick: (a) => a[Math.floor(R() * a.length)],
        put: (rel, c, m) => sh.fs.put(`${dir}/${rel}`, c, m),
        abs: (path, c, m, owner) => sh.fs.put(path, c, m, owner),
        web: (name, ip, routes, server = 'nginx/1.24.0') => {
          hosts += `${ip}\t${name}\n`;
          const r = {};
          for (const [path, v] of Object.entries(routes)) r[path] = typeof v === 'string' ? { status: 200, headers: { 'Content-Type': path.endsWith('.js') ? 'application/javascript' : path.endsWith('.txt') || path.endsWith('.env') || path.endsWith('.bak') ? 'text/plain' : 'text/html; charset=utf-8' }, body: v } : v;
          sh.web[`${ip}:80`] = { server, routes: r };
        },
      };
      fl.build(ctx);
    });
    sh.fs.put(`${base}/ziel/ZIEL.txt`, o.finale + '\n');
    if (hosts) sh.fs.put('/etc/hosts', (sh.read('/etc/hosts') || '') + hosts, 0o644, 'root');
    for (let n = 1; n <= N; n++) { const d = sh.fs.get(dirOf(n)); d.owner = 'root'; d.mode = 0o700; }
    for (let n = 0; n < N; n++) if (solved.has(`l${n}`)) open(sh, n + 1);
    sh.cwd = base;
  }

  function commands({ F, solve }) {
    const entsperren = (args, { sh }) => {
      const code = String(args[0] || '').trim();
      if (!code) return { out: '', err: 'Aufruf: entsperren CODE\n', code: 2 };
      for (let n = 0; n < N; n++) if (F[`l${n}`] === code) {
        open(sh, n + 1); solve(`l${n}`, code);
        return { out: n + 1 === N ? '🔓 Geschafft – das Ziel ist offen.  →  cd ../ziel\n' : `🔓 Richtig! ${o.prefix}${p2(n + 1)} ist offen.  →  cd ../${o.prefix}${p2(n + 1)}\n`, code: 0 };
      }
      return { out: '', err: /^KLY\{[0-9a-f]{16}\}$/.test(code) ? '🔒 Falscher Code.\n' : '🔒 Falscher Code. Format: KLY{16 Zeichen 0-9/a-f}\n', code: 1 };
    };
    return { entsperren, unlock: entsperren, ...textTools(), ...(o.extra ? o.extra(F) : {}) };
  }

  return {
    id: o.id, title: o.title, type: 'wargame', level: o.level, minutes: o.minutes,
    tools: o.tools, desc: o.desc, ziel: o.ziel,
    scope: `Nur das Sandbox-Terminal in diesem Raum (~/${o.dir}). SIMULATION – erfundene Systeme, kein echter Netzwerkverkehr.`,
    stop: 'Keine nötig – die Sandbox ist isoliert.',
    cleanup: 'Nichts nötig. Dein Fortschritt bleibt gespeichert.',
    machine: { kind: 'sandbox' },
    welcome: `${o.title} · Sandbox bereit. Start: cat LIESMICH.txt · help zeigt Befehle.`,
    flags: Array.from({ length: N }, (_, n) => `l${n}`),
    setup, commands,
    onSolve(sh, flag) { open(sh, +flag.slice(1) + 1); },
    floors: o.floors, // für Tests (solve)
    dirOf,
    tasks: o.floors.map((fl, n) => ({
      id: `s${p2(n)}`, title: `${o.prefix[0].toUpperCase() + o.prefix.slice(1)} ${n} – ${fl.t}`, body: fl.body,
      questions: [{ id: 'q1', type: 'flag', flag: `l${n}`, q: 'Code', points: fl.pts, hints: fl.hints, ...(fl.rep ? { repeat: fl.rep } : {}) }],
    })),
    nach: o.nach,
  };
}
