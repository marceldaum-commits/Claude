// Kali Level Up – Sandbox-Shell
// WICHTIG: Dies ist eine Browser-SIMULATION mit synthetischem Dateisystem.
// Es wird kein echter Befehl auf dem Gerät ausgeführt. Keine Netzwerkzugriffe.
// DOM-frei, damit die Engine in Node getestet werden kann.

export const USER = 'seppi';
export const HOME = '/home/seppi';
const UID = 1000;
const BASE_TIME = Date.UTC(2026, 9, 31, 8, 0, 0);

// ---------------------------------------------------------------- Dateisystem

function dirNode(mode = 0o755, owner = USER) {
  return { t: 'd', mode, owner, kids: {}, mtime: BASE_TIME };
}
function fileNode(data = '', mode = 0o644, owner = USER) {
  return { t: 'f', mode, owner, data, mtime: BASE_TIME };
}

export class VFS {
  constructor() {
    this.root = dirNode(0o755, 'root');
  }

  static normalize(path, cwd = HOME) {
    if (path === '~' || path.startsWith('~/')) path = HOME + path.slice(1);
    const abs = path.startsWith('/') ? path : (cwd.replace(/\/$/, '') + '/' + path);
    const out = [];
    for (const part of abs.split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') out.pop();
      else out.push(part);
    }
    return '/' + out.join('/');
  }

  get(abs) {
    if (abs === '/') return this.root;
    let node = this.root;
    for (const part of abs.split('/').filter(Boolean)) {
      if (!node || node.t !== 'd') return null;
      node = node.kids[part];
    }
    return node || null;
  }

  parent(abs) {
    const idx = abs.lastIndexOf('/');
    const p = idx <= 0 ? '/' : abs.slice(0, idx);
    return { dir: this.get(p), name: abs.slice(idx + 1), path: p };
  }

  // Hilfsfunktion zum Aufbau (ohne Rechteprüfung)
  put(path, content = null, mode, owner = USER) {
    const abs = VFS.normalize(path, '/');
    const parts = abs.split('/').filter(Boolean);
    let node = this.root;
    for (let i = 0; i < parts.length - 1; i++) {
      const name = parts[i];
      if (!node.kids[name]) {
        const own = abs.startsWith(HOME) && ('/' + parts.slice(0, i + 1).join('/')).startsWith(HOME) ? USER : 'root';
        node.kids[name] = dirNode(name === 'tmp' && i === 0 ? 0o1777 : 0o755, own);
      }
      node = node.kids[name];
    }
    const last = parts[parts.length - 1];
    if (content === null) {
      node.kids[last] = node.kids[last] || dirNode(mode ?? 0o755, owner);
      if (mode !== undefined) node.kids[last].mode = mode;
      node.kids[last].owner = owner;
    } else {
      node.kids[last] = fileNode(content, mode ?? 0o644, owner);
    }
    return node.kids[last];
  }

  clone() {
    const c = new VFS();
    c.root = structuredClone(this.root);
    return c;
  }
}

export function canDo(node, bit) {
  // bit: 4=r 2=w 1=x  – der Sandbox-Benutzer ist immer "seppi" (uid 1000)
  if (!node) return false;
  const shift = node.owner === USER ? 6 : 0;
  return ((node.mode >> shift) & bit) === bit;
}

export function modeString(node) {
  const chars = 'rwxrwxrwx';
  let s = node.t === 'd' ? 'd' : '-';
  for (let i = 0; i < 9; i++) s += (node.mode & (1 << (8 - i))) ? chars[i] : '-';
  if (node.mode & 0o1000) s = s.slice(0, 9) + (s[9] === 'x' ? 't' : 'T');
  return s;
}

export function baseFS() {
  const fs = new VFS();
  fs.put('/etc', null, 0o755, 'root');
  fs.put('/etc/hostname', 'kali-sandbox\n', 0o644, 'root');
  fs.put('/etc/hosts', '127.0.0.1\tlocalhost\n127.0.1.1\tkali-sandbox\n::1\tlocalhost ip6-localhost ip6-loopback\n', 0o644, 'root');
  fs.put('/etc/resolv.conf', '# SANDBOX – synthetisch\nnameserver 10.0.2.3\n', 0o644, 'root');
  fs.put('/etc/passwd', 'root:x:0:0:root:/root:/usr/bin/zsh\nseppi:x:1000:1000:Seppi,,,:/home/seppi:/bin/bash\n', 0o644, 'root');
  fs.put('/etc/shadow', 'root:*:20000:0:99999:7:::\n', 0o640, 'root');
  fs.put('/root', null, 0o700, 'root');
  fs.put('/tmp', null, 0o1777, 'root');
  fs.put('/var/log', null, 0o755, 'root');
  fs.put('/usr/bin', null, 0o755, 'root');
  fs.put(HOME, null, 0o755, USER);
  fs.put(HOME + '/.bashrc', '# ~/.bashrc (Sandbox)\nexport PS1="seppi@kali-sandbox"\n', 0o644, USER);
  return fs;
}

// ---------------------------------------------------------------- Tokenizer

function tokenize(line) {
  const toks = [];
  let cur = '', quoted = false, i = 0, has = false;
  const push = () => { if (has) toks.push({ w: cur, q: quoted }); cur = ''; quoted = false; has = false; };
  while (i < line.length) {
    const c = line[i];
    if (c === "'") {
      const end = line.indexOf("'", i + 1);
      if (end < 0) throw new Error("Syntaxfehler: schließendes ' fehlt");
      cur += line.slice(i + 1, end); quoted = true; has = true; i = end + 1; continue;
    }
    if (c === '"') {
      let j = i + 1, s = '';
      while (j < line.length && line[j] !== '"') {
        if (line[j] === '\\' && j + 1 < line.length && '"\\$'.includes(line[j + 1])) { s += line[j + 1]; j += 2; continue; }
        if (line[j] === '$') { s += '\u0000$'; j++; continue; } // Variable in "" später expandieren
        s += line[j]; j++;
      }
      if (j >= line.length) throw new Error('Syntaxfehler: schließendes " fehlt');
      cur += s; quoted = true; has = true; i = j + 1; continue;
    }
    if (c === '\\' && i + 1 < line.length) { cur += line[i + 1]; has = true; quoted = true; i += 2; continue; }
    if (c === ' ' || c === '\t') { push(); i++; continue; }
    if (c === '#' && !has) break;
    const two = line.slice(i, i + 2);
    if (two === '&&' || two === '||' || two === '>>' || two === '2>') {
      push();
      if (two === '2>' && line[i + 2] === '&' && line[i + 3] === '1') { toks.push({ op: '2>&1' }); i += 4; continue; }
      toks.push({ op: two }); i += 2; continue;
    }
    if ('|;&><'.includes(c)) { push(); toks.push({ op: c }); i++; continue; }
    cur += c; has = true; i++;
  }
  push();
  return toks;
}

function globToRe(g) {
  return new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
}

// ---------------------------------------------------------------- Shell

const KNOWN = ['pwd', 'whoami', 'id', 'hostname', 'date', 'ls', 'cd', 'mkdir', 'rmdir', 'touch', 'echo', 'cat', 'cp', 'mv', 'rm',
  'chmod', 'stat', 'find', 'grep', 'wc', 'head', 'tail', 'sort', 'uniq', 'cut', 'ps', 'jobs', 'sleep', 'kill', 'curl', 'getent',
  'clear', 'history', 'help', 'man', 'command', 'which', 'type', 'true', 'false', 'exit', 'uname', 'file'];

const MAN = {
  pwd: 'pwd – zeigt das aktuelle Arbeitsverzeichnis als absoluten Pfad.',
  whoami: 'whoami – zeigt den Namen des aktuell angemeldeten Benutzers.',
  ls: 'ls [-l] [-a] [PFAD…] – listet Verzeichnisinhalte. -l: Langformat mit Rechten, Besitzer, Größe. -a: auch versteckte Dateien (mit Punkt).',
  cd: 'cd [PFAD] – wechselt das Arbeitsverzeichnis. Ohne Argument oder ~ → Home. ".." → eine Ebene höher. "-" → vorheriges Verzeichnis.',
  mkdir: 'mkdir [-p] ORDNER… – legt Ordner an. -p: fehlende Elternordner mit anlegen, kein Fehler wenn vorhanden.',
  touch: 'touch DATEI… – legt leere Datei an oder aktualisiert die Änderungszeit.',
  echo: 'echo [-n] TEXT… – gibt Text aus. Mit > DATEI überschreiben, mit >> DATEI anhängen.',
  cat: 'cat [-n] DATEI… – gibt Dateiinhalte aus. -n: Zeilennummern.',
  cp: 'cp [-r] [-p|-a] QUELLE ZIEL – kopiert. -r: Ordner rekursiv. -p/-a: Rechte und Zeitstempel erhalten.',
  mv: 'mv QUELLE ZIEL – verschiebt oder benennt um. Überschreibt ein vorhandenes Ziel ohne Rückfrage!',
  rm: 'rm [-r] [-f] PFAD… – löscht. Kein Papierkorb! -r: rekursiv, -f: ohne Fehlermeldung.',
  chmod: 'chmod MODUS DATEI… – ändert Rechte. Numerisch (z. B. 640) oder symbolisch (u+x, g-w, o=, a+r).',
  stat: 'stat [-c FORMAT] DATEI – zeigt Metadaten. Formate: %a (oktal), %A (rwx), %n (Name), %U (Besitzer), %s (Größe).',
  find: 'find [START…] [-maxdepth N] [-name MUSTER] [-iname MUSTER] [-type f|d] – sucht Dateien nach Eigenschaften.',
  grep: 'grep [-i] [-n] [-c] [-v] [-r] [-l] [-w] MUSTER [DATEI…] – sucht Textzeilen. -i: ohne Groß/Klein, -n: Zeilennr., -c: Anzahl, -v: invertiert, -r: rekursiv, -l: nur Dateinamen.',
  wc: 'wc [-l] [-w] [-c] [DATEI…] – zählt Zeilen, Wörter, Bytes.',
  head: 'head [-n N] [DATEI] – erste N Zeilen (Standard 10).',
  tail: 'tail [-n N] [DATEI] – letzte N Zeilen (Standard 10).',
  sort: 'sort [-r] [-n] – sortiert Zeilen. -n numerisch, -r umgekehrt.',
  uniq: 'uniq [-c] – entfernt direkt aufeinanderfolgende Duplikate. -c zählt. Vorher meist sort.',
  cut: 'cut -d TRENNER -f FELD – schneidet Spalten aus Zeilen.',
  ps: 'ps [-ef | aux | -o pid,ppid,cmd] – zeigt Prozesse. PID = Prozess-ID, PPID = ID des Elternprozesses.',
  jobs: 'jobs [-l] – zeigt Hintergrundjobs dieser Shell.',
  sleep: 'sleep N – wartet N Sekunden. Mit & am Ende läuft es im Hintergrund.',
  kill: 'kill [-15|-9] PID | %JOB – sendet ein Signal. Standard ist 15 (TERM, höflich beenden).',
  curl: 'curl [-I] [-i] [-s] [-o DATEI] URL – HTTP-Anfrage. -I: nur Header (HEAD), -i: Header + Body. In der Sandbox nur simulierte Lab-Ziele.',
  getent: 'getent hosts NAME – löst einen Namen über die Systemquellen (z. B. /etc/hosts, DNS) auf.',
  history: 'history – zeigt die bisherigen Befehle.',
  clear: 'clear – leert die Anzeige.',
  command: 'command -v NAME – prüft, ob ein Befehl verfügbar ist, und zeigt dessen Pfad.',
};

export class Shell {
  constructor(opts = {}) {
    this.fs = opts.fs || baseFS();
    this.cwd = opts.cwd || HOME;
    this.oldpwd = this.cwd;
    this.history = [];
    this.lastCode = 0;
    this.nextPid = 2400;
    this.bashPid = 2301;
    this.procs = [
      { pid: 1, ppid: 0, user: 'root', cmd: '/sbin/init', sys: true },
      { pid: 612, ppid: 1, user: 'root', cmd: '/usr/sbin/cron -f', sys: true },
      { pid: 2290, ppid: 1, user: USER, cmd: 'sandbox-terminal', sys: true },
      { pid: this.bashPid, ppid: 2290, user: USER, cmd: 'bash' },
      ...(opts.procs || []),
    ];
    this.jobs = [];
    this.web = opts.web || {};     // { 'host:port': { routes: { '/path': {status, headers, body} } } }
    this.dns = opts.dns || {};     // zusätzliche simulierte Namen
    this.extra = opts.commands || {};
    this.log = [];                 // [{line, cmd, args, code, out}]
    this.now = opts.now || (() => Date.now());
  }

  // ------------------------------------------------ öffentliche API
  exec(line) {
    line = String(line ?? '');
    const trimmed = line.trim();
    if (!trimmed) return { out: '', code: 0 };
    this.history.push(trimmed);
    let toks;
    try { toks = tokenize(trimmed); } catch (e) { return this._done(trimmed, { out: '', err: 'bash: ' + e.message, code: 2 }); }

    // In Listen (; && ||) und Pipelines zerlegen
    const lists = []; let cur = []; let conn = null;
    for (const t of toks) {
      if (t.op === ';' || t.op === '&&' || t.op === '||') { lists.push({ toks: cur, conn }); cur = []; conn = t.op; }
      else cur.push(t);
    }
    lists.push({ toks: cur, conn });

    let out = '', err = '', code = 0, clear = false;
    for (const part of lists) {
      if (!part.toks.length) continue;
      if (part.conn === '&&' && code !== 0) continue;
      if (part.conn === '||' && code === 0) continue;
      const r = this._runPipeline(part.toks);
      if (r.clear) { clear = true; out = ''; err = ''; }
      out += r.out || ''; err += r.err || ''; code = r.code;
      this.lastCode = code;
    }
    this._reap();
    return this._done(trimmed, { out, err, code, clear });
  }

  _done(line, r) {
    this.lastCode = r.code;
    this.log.push({ line, code: r.code, out: (r.out || '') + (r.err || '') });
    if (this.log.length > 300) this.log.shift();
    return r;
  }

  prompt() {
    const p = this.cwd === HOME ? '~' : this.cwd.startsWith(HOME + '/') ? '~' + this.cwd.slice(HOME.length) : this.cwd;
    return `${USER}@kali-sandbox:${p}$`;
  }

  // Hilfen für Prüfungen
  path(p) { return VFS.normalize(p, this.cwd); }
  node(p) { return this.fs.get(VFS.normalize(p, this.cwd)); }
  read(p) { const n = this.node(p); return n && n.t === 'f' ? n.data : null; }
  usedCommand(name) { return this.log.some(l => new RegExp('(^|[|;&]\\s*)' + name + '(\\s|$)').test(l.line)); }
  liveProcs() { this._reap(); return this.procs; }

  // ------------------------------------------------ intern
  _reap() {
    const now = this.now();
    this.procs = this.procs.filter(p => !(p.until && p.until <= now));
    for (const j of this.jobs) {
      if (j.state === 'Running' && !this.procs.find(p => p.pid === j.pid)) j.state = 'Done';
    }
  }

  _expandWord(t) {
    let w = t.w;
    const vars = { HOME, USER, PWD: this.cwd, '?': String(this.lastCode), SHELL: '/bin/bash', OLDPWD: this.oldpwd };
    const rep = (s) => s.replace(/\$(\?|[A-Za-z_][A-Za-z0-9_]*|\{[A-Za-z_][A-Za-z0-9_]*\})/g, (_, n) => {
      n = n.replace(/[{}]/g, '');
      return vars[n] ?? '';
    });
    if (t.q) {
      // Nur in "…" markierte $ expandieren
      w = w.split('\u0000').map((seg, i) => (i === 0 ? seg : rep(seg))).join('');
      return [w];
    }
    if (w === '~' || w.startsWith('~/')) w = HOME + w.slice(1);
    w = rep(w);
    if (/[*?]/.test(w)) {
      const abs = VFS.normalize(w, this.cwd);
      const { dir, name, path } = this.fs.parent(abs);
      if (dir && dir.t === 'd' && !/[*?]/.test(path)) {
        const re = globToRe(name);
        const hits = Object.keys(dir.kids).filter(k => re.test(k) && (!k.startsWith('.') || name.startsWith('.'))).sort();
        if (hits.length) {
          const prefix = w.includes('/') ? w.slice(0, w.lastIndexOf('/') + 1) : '';
          return hits.map(h => prefix + h);
        }
      }
    }
    return [w];
  }

  _runPipeline(toks) {
    // Hintergrund?
    let bg = false;
    if (toks.length && toks[toks.length - 1].op === '&') { bg = true; toks = toks.slice(0, -1); }
    if (toks.some(t => t.op === '&')) return { out: '', err: 'bash: & ist in der Sandbox nur am Zeilenende erlaubt\n', code: 2 };
    if (toks.some(t => t.op === '<')) return { out: '', err: 'bash: Eingabeumleitung < wird in der Sandbox nicht unterstützt – nutze cat DATEI | …\n', code: 2 };

    const cmds = []; let cur = [];
    for (const t of toks) { if (t.op === '|') { cmds.push(cur); cur = []; } else cur.push(t); }
    cmds.push(cur);
    if (cmds.some(c => !c.length)) return { out: '', err: "bash: Syntaxfehler beim unerwarteten Wort '|'\n", code: 2 };

    let stdin = null, err = '', last = { out: '', code: 0 };
    for (let i = 0; i < cmds.length; i++) {
      const parsed = this._parseRedirects(cmds[i]);
      if (parsed.error) return { out: '', err: parsed.error, code: 2 };
      const { args, redirOut, append, redirErr, errToOut } = parsed;
      if (!args.length) continue;
      const [name, ...rest] = args;
      if (bg && i === cmds.length - 1) {
        return this._background(args);
      }
      this._piped = i < cmds.length - 1 || !!redirOut; // wie echtes ls: eine Zeile pro Eintrag, wenn nicht ans Terminal
      let r = this._call(name, rest, stdin);
      this._piped = false;
      if (r.clear) return r;
      if (errToOut && r.err) { r = { ...r, out: (r.out || '') + r.err, err: '' }; }
      if (redirErr) {
        if (redirErr !== '/dev/null') this._writeTo(redirErr, r.err || '', false);
        r = { ...r, err: '' };
      }
      if (redirOut) {
        const w = redirOut === '/dev/null' ? null : this._writeTo(redirOut, r.out || '', append);
        if (w) { err += w; r = { ...r, code: 1 }; }
        r = { ...r, out: '' };
      }
      err += r.err || '';
      stdin = r.out || '';
      last = r;
    }
    return { out: last.out || '', err, code: last.code };
  }

  _parseRedirects(toks) {
    const args = []; let redirOut = null, append = false, redirErr = null, errToOut = false;
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      if (t.op === '>' || t.op === '>>') {
        const nx = toks[i + 1];
        if (!nx || nx.op) return { error: "bash: Syntaxfehler: Ziel nach '" + t.op + "' fehlt\n" };
        redirOut = this._expandWord(nx)[0]; append = t.op === '>>'; i++; continue;
      }
      if (t.op === '2>') {
        const nx = toks[i + 1];
        if (!nx || nx.op) return { error: "bash: Syntaxfehler: Ziel nach '2>' fehlt\n" };
        redirErr = this._expandWord(nx)[0]; i++; continue;
      }
      if (t.op === '2>&1') { errToOut = true; continue; }
      if (t.op) return { error: `bash: Syntaxfehler beim unerwarteten Wort '${t.op}'\n` };
      args.push(...this._expandWord(t));
    }
    return { args, redirOut, append, redirErr, errToOut };
  }

  _writeTo(path, data, append) {
    const abs = this.path(path);
    const existing = this.fs.get(abs);
    if (existing && existing.t === 'd') return `bash: ${path}: Ist ein Verzeichnis\n`;
    if (existing) {
      if (!canDo(existing, 2)) return `bash: ${path}: Keine Berechtigung\n`;
      existing.data = append ? existing.data + data : data;
      existing.mtime = this.now();
      return null;
    }
    const { dir } = this.fs.parent(abs);
    if (!dir || dir.t !== 'd') return `bash: ${path}: Datei oder Verzeichnis nicht gefunden\n`;
    if (!canDo(dir, 2)) return `bash: ${path}: Keine Berechtigung\n`;
    const { name } = this.fs.parent(abs);
    dir.kids[name] = fileNode(data, 0o644, USER);
    dir.kids[name].mtime = this.now();
    return null;
  }

  _background(args) {
    const pid = this.nextPid++;
    const cmdline = args.join(' ');
    const jobNo = (this.jobs.filter(j => j.state === 'Running').reduce((m, j) => Math.max(m, j.no), 0)) + 1;
    this.jobs = this.jobs.filter(j => j.state === 'Running');
    if (args[0] === 'sleep') {
      const secs = parseFloat(args[1]);
      if (!(secs >= 0)) return { out: '', err: `sleep: ungültiges Zeitintervall „${args[1] ?? ''}“\n`, code: 1 };
      this.procs.push({ pid, ppid: this.bashPid, user: USER, cmd: cmdline, until: this.now() + secs * 1000 });
      this.jobs.push({ no: jobNo, pid, cmd: cmdline + ' &', state: 'Running' });
      return { out: `[${jobNo}] ${pid}\n`, code: 0 };
    }
    const r = this._call(args[0], args.slice(1), null);
    return { out: `[${jobNo}] ${pid}\n` + (r.out || '') + `[${jobNo}]+  Fertig                  ${cmdline}\n`, err: r.err, code: 0 };
  }

  _call(name, args, stdin) {
    if (this.extra[name]) return this.extra[name](args, { sh: this, stdin }) || { out: '', code: 0 };
    if (args.includes('--help') && MAN[name]) return { out: MAN[name] + '\n', code: 0 };
    const fn = this['c_' + name];
    if (!fn) {
      if (name === 'sudo') return { out: '', err: 'sudo: in der Sandbox deaktiviert – für diese Übungen brauchst du keine Root-Rechte.\n', code: 1 };
      if (['nano', 'vim', 'vi', 'emacs'].includes(name)) return { out: '', err: `${name}: Editoren gibt es in der Sandbox nicht. Nutze echo "…" > DATEI bzw. >>.\n`, code: 127 };
      return { out: '', err: `bash: ${name}: Befehl nicht gefunden\n`, code: 127 };
    }
    try { return fn.call(this, args, stdin) || { out: '', code: 0 }; }
    catch (e) { return { out: '', err: `${name}: interner Sandbox-Fehler: ${e.message}\n`, code: 1 }; }
  }

  _opts(args, flagsWithValue = []) {
    const flags = new Set(); const vals = {}; const pos = [];
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (a === '--') { pos.push(...args.slice(i + 1)); break; }
      if (a.startsWith('--')) { flags.add(a); continue; }
      if (a.startsWith('-') && a.length > 1 && !/^-\d+$/.test(a)) {
        const letters = a.slice(1);
        for (let k = 0; k < letters.length; k++) {
          const f = letters[k];
          if (flagsWithValue.includes(f)) {
            vals[f] = letters.slice(k + 1) || args[++i];
            break;
          }
          flags.add(f);
        }
        continue;
      }
      pos.push(a);
    }
    return { flags, vals, pos };
  }

  _readable(p, cmd) {
    const n = this.node(p);
    if (!n) return { err: `${cmd}: ${p}: Datei oder Verzeichnis nicht gefunden\n` };
    if (n.t === 'd') return { err: `${cmd}: ${p}: Ist ein Verzeichnis\n` };
    if (!canDo(n, 4)) return { err: `${cmd}: ${p}: Keine Berechtigung\n` };
    return { data: n.data };
  }

  _inputs(files, stdin, cmd) {
    if (!files.length) return { parts: [{ name: null, data: stdin ?? '' }], err: '' };
    const parts = []; let err = '';
    for (const f of files) {
      const r = this._readable(f, cmd);
      if (r.err) err += r.err; else parts.push({ name: f, data: r.data });
    }
    return { parts, err };
  }

  // ------------------------------------------------ Befehle
  c_pwd() { return { out: this.cwd + '\n', code: 0 }; }
  c_whoami() { return { out: USER + '\n', code: 0 }; }
  c_id() { return { out: `uid=${UID}(${USER}) gid=${UID}(${USER}) Gruppen=${UID}(${USER}),27(sudo)\n`, code: 0 }; }
  c_hostname() { return { out: 'kali-sandbox\n', code: 0 }; }
  c_uname(args) { return { out: args.includes('-a') ? 'Linux kali-sandbox 6.x-sandbox #1 SMP x86_64 GNU/Linux (SIMULIERT)\n' : 'Linux\n', code: 0 }; }
  c_date() { return { out: new Date(this.now()).toString() + '\n', code: 0 }; }
  c_true() { return { out: '', code: 0 }; }
  c_false() { return { out: '', code: 1 }; }
  c_exit() { return { out: 'Die Sandbox-Shell läuft weiter – „exit“ hat hier keine Wirkung.\n', code: 0 }; }
  c_clear() { return { out: '', code: 0, clear: true }; }

  c_history() {
    return { out: this.history.map((h, i) => `${String(i + 1).padStart(5)}  ${h}`).join('\n') + '\n', code: 0 };
  }

  c_help() {
    return {
      out: 'SANDBOX-SIMULATION – verfügbare Befehle:\n' + KNOWN.join(' ') +
        '\nMehr: man BEFEHL oder BEFEHL --help. Pipes |, Umleitungen > >> 2>, ; && || und & am Zeilenende werden unterstützt.\n',
      code: 0,
    };
  }

  c_man(args) {
    if (!args[0]) return { out: '', err: 'Welche Handbuchseite? z. B. man ls\n', code: 1 };
    const m = MAN[args[0]];
    return m ? { out: m + '\n(Sandbox-Kurzfassung. Auf echtem Kali: man ' + args[0] + ')\n', code: 0 } : { out: '', err: `Kein Handbucheintrag für ${args[0]}\n`, code: 16 };
  }

  c_command(args) {
    if (args[0] !== '-v') return { out: '', err: 'command: in der Sandbox nur „command -v NAME“\n', code: 2 };
    return this.c_which(args.slice(1));
  }
  c_which(args) {
    let out = '', code = 0;
    for (const a of args) {
      if (KNOWN.includes(a) || this.extra[a]) out += (['cd', 'history', 'jobs', 'command', 'type', 'help', 'exit'].includes(a) ? a : '/usr/bin/' + a) + '\n';
      else code = 1;
    }
    return { out, code };
  }
  c_type(args) {
    return { out: args.map(a => KNOWN.includes(a) ? `${a} ist /usr/bin/${a}` : `bash: type: ${a}: nicht gefunden`).join('\n') + '\n', code: 0 };
  }

  c_file(args) {
    let out = '';
    for (const a of args) {
      const n = this.node(a);
      if (!n) out += `${a}: cannot open (No such file or directory)\n`;
      else if (n.t === 'd') out += `${a}: directory\n`;
      else out += `${a}: ${n.data.length ? 'ASCII text' : 'empty'}\n`;
    }
    return { out, code: 0 };
  }

  c_cd(args) {
    let target = args[0];
    if (args.length > 1) return { out: '', err: 'bash: cd: zu viele Argumente\n', code: 1 };
    if (target === undefined || target === '~') target = HOME;
    if (target === '-') target = this.oldpwd;
    const abs = this.path(target);
    const n = this.fs.get(abs);
    if (!n) return { out: '', err: `bash: cd: ${args[0]}: Datei oder Verzeichnis nicht gefunden\n`, code: 1 };
    if (n.t !== 'd') return { out: '', err: `bash: cd: ${args[0]}: Ist kein Verzeichnis\n`, code: 1 };
    if (!canDo(n, 1)) return { out: '', err: `bash: cd: ${args[0]}: Keine Berechtigung\n`, code: 1 };
    this.oldpwd = this.cwd; this.cwd = abs;
    return { out: args[0] === '-' ? abs + '\n' : '', code: 0 };
  }

  _lsLine(name, n) {
    const d = new Date(n.mtime);
    const mon = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'][d.getUTCMonth()];
    const time = `${mon} ${String(d.getUTCDate()).padStart(2)} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
    const size = n.t === 'd' ? 4096 : new TextEncoder().encode(n.data).length;
    const links = n.t === 'd' ? 2 + Object.values(n.kids).filter(k => k.t === 'd').length : 1;
    return `${modeString(n)} ${links} ${n.owner.padEnd(5)} ${n.owner.padEnd(5)} ${String(size).padStart(5)} ${time} ${name}`;
  }

  c_ls(args) {
    const { flags, pos } = this._opts(args);
    const long = flags.has('l'), all = flags.has('a') || flags.has('A');
    const targets = pos.length ? pos : ['.'];
    let out = '', err = '', code = 0;
    const files = [], dirs = [];
    for (const t of targets) {
      const n = this.node(t);
      if (!n) { err += `ls: Zugriff auf '${t}' nicht möglich: Datei oder Verzeichnis nicht gefunden\n`; code = 2; continue; }
      (n.t === 'd' && !flags.has('d') ? dirs : files).push([t, n]);
    }
    const sep = long || this._piped || flags.has('1') ? '\n' : '  ';
    if (files.length) out += files.map(([t, n]) => long ? this._lsLine(t, n) : t).join(sep) + '\n';
    for (const [t, n] of dirs) {
      if (targets.length > 1) out += (out ? '\n' : '') + t + ':\n';
      if (!canDo(n, 4)) { err += `ls: '${t}' kann nicht geöffnet werden: Keine Berechtigung\n`; code = 2; continue; }
      let names = Object.keys(n.kids).sort((a, b) => a.replace(/^\./, '').localeCompare(b.replace(/^\./, '')));
      if (!all) names = names.filter(k => !k.startsWith('.'));
      if (long) {
        const entries = names.map(k => this._lsLine(k, n.kids[k]));
        if (flags.has('a')) entries.unshift(this._lsLine('.', n), this._lsLine('..', n));
        out += `insgesamt ${names.length * 4}\n` + (entries.length ? entries.join('\n') + '\n' : '');
      } else {
        const shown = flags.has('a') ? ['.', '..', ...names] : names;
        if (shown.length) out += shown.join(sep) + '\n';
      }
    }
    return { out, err, code };
  }

  c_mkdir(args) {
    const { flags, pos } = this._opts(args);
    if (!pos.length) return { out: '', err: 'mkdir: Operand fehlt\n', code: 1 };
    let err = '', code = 0;
    for (const p of pos) {
      const abs = this.path(p);
      if (this.fs.get(abs)) { if (!flags.has('p')) { err += `mkdir: das Verzeichnis „${p}“ kann nicht angelegt werden: Die Datei existiert bereits\n`; code = 1; } continue; }
      const parts = abs.split('/').filter(Boolean);
      let node = this.fs.root, built = '';
      for (let i = 0; i < parts.length; i++) {
        built += '/' + parts[i];
        let kid = node.kids[parts[i]];
        if (!kid) {
          if (i < parts.length - 1 && !flags.has('p')) { err += `mkdir: das Verzeichnis „${p}“ kann nicht angelegt werden: Datei oder Verzeichnis nicht gefunden\n`; code = 1; break; }
          if (!canDo(node, 2)) { err += `mkdir: das Verzeichnis „${p}“ kann nicht angelegt werden: Keine Berechtigung\n`; code = 1; break; }
          kid = node.kids[parts[i]] = dirNode(0o755, USER); kid.mtime = this.now();
        } else if (kid.t !== 'd') { err += `mkdir: „${p}“: Ist kein Verzeichnis\n`; code = 1; break; }
        node = kid;
      }
    }
    return { out: '', err, code };
  }

  c_rmdir(args) {
    let err = '', code = 0;
    for (const p of args) {
      const abs = this.path(p); const n = this.fs.get(abs);
      if (!n) { err += `rmdir: „${p}“ konnte nicht entfernt werden: Datei oder Verzeichnis nicht gefunden\n`; code = 1; continue; }
      if (n.t !== 'd') { err += `rmdir: „${p}“ konnte nicht entfernt werden: Ist kein Verzeichnis\n`; code = 1; continue; }
      if (Object.keys(n.kids).length) { err += `rmdir: „${p}“ konnte nicht entfernt werden: Das Verzeichnis ist nicht leer\n`; code = 1; continue; }
      const { dir, name } = this.fs.parent(abs); delete dir.kids[name];
    }
    return { out: '', err, code };
  }

  c_touch(args) {
    let err = '', code = 0;
    for (const p of args.filter(a => !a.startsWith('-'))) {
      const abs = this.path(p); const n = this.fs.get(abs);
      if (n) { n.mtime = this.now(); continue; }
      const w = this._writeTo(p, '', false);
      if (w) { err += w.replace('bash:', 'touch:'); code = 1; }
    }
    return { out: '', err, code };
  }

  c_echo(args) {
    let nl = '\n';
    if (args[0] === '-n') { nl = ''; args = args.slice(1); }
    if (args[0] === '-e') args = args.slice(1);
    return { out: args.join(' ') + nl, code: 0 };
  }

  c_cat(args, stdin) {
    const { flags, pos } = this._opts(args);
    const { parts, err } = this._inputs(pos, stdin, 'cat');
    let data = parts.map(p => p.data).join('');
    if (flags.has('n')) {
      const lines = data.replace(/\n$/, '').split('\n');
      data = lines.map((l, i) => `${String(i + 1).padStart(6)}\t${l}`).join('\n') + (data ? '\n' : '');
    }
    return { out: data, err, code: err ? 1 : 0 };
  }

  _copyNode(n, keep) {
    const c = structuredClone(n);
    if (!keep) { const t = this.now(); const walk = (x) => { x.mtime = t; if (x.t === 'd') Object.values(x.kids).forEach(walk); }; walk(c); }
    const own = (x) => { x.owner = USER; if (x.t === 'd') Object.values(x.kids).forEach(own); };
    own(c);
    return c;
  }

  _place(srcPath, dstPath, cmd, flags, move) {
    const sAbs = this.path(srcPath); const s = this.fs.get(sAbs);
    if (!s) return `${cmd}: der Aufruf von stat für '${srcPath}' ist nicht möglich: Datei oder Verzeichnis nicht gefunden\n`;
    if (s.t === 'd' && !move && !flags.has('r') && !flags.has('R') && !flags.has('a')) return `${cmd}: -r nicht angegeben; Verzeichnis '${srcPath}' wird ausgelassen\n`;
    if (!move && s.t === 'f' && !canDo(s, 4)) return `${cmd}: '${srcPath}' kann nicht zum Lesen geöffnet werden: Keine Berechtigung\n`;
    let dAbs = this.path(dstPath); let d = this.fs.get(dAbs);
    if (d && d.t === 'd') { dAbs = dAbs.replace(/\/$/, '') + '/' + sAbs.split('/').pop(); d = this.fs.get(dAbs); }
    if (dAbs === sAbs) return `${cmd}: '${srcPath}' und '${dstPath}' sind dieselbe Datei\n`;
    if (s.t === 'd' && (dAbs + '/').startsWith(sAbs + '/')) return `${cmd}: Ein Verzeichnis kann nicht in sich selbst kopiert werden\n`;
    if (d && d.t === 'd' && s.t === 'f') return `${cmd}: Verzeichnis '${dstPath}' kann nicht mit Nicht-Verzeichnis überschrieben werden\n`;
    const { dir, name } = this.fs.parent(dAbs);
    if (!dir || dir.t !== 'd') return `${cmd}: reguläre Datei '${dstPath}' kann nicht angelegt werden: Datei oder Verzeichnis nicht gefunden\n`;
    if (!canDo(dir, 2)) return `${cmd}: '${dstPath}' kann nicht angelegt werden: Keine Berechtigung\n`;
    if (move) {
      const sp = this.fs.parent(sAbs);
      if (!canDo(sp.dir, 2)) return `${cmd}: '${srcPath}' kann nicht verschoben werden: Keine Berechtigung\n`;
      dir.kids[name] = s; delete sp.dir.kids[sp.name];
    } else {
      const keep = flags.has('p') || flags.has('a');
      dir.kids[name] = this._copyNode(s, keep);
    }
    return '';
  }

  c_cp(args) {
    const { flags, pos } = this._opts(args);
    if (pos.length < 2) return { out: '', err: `cp: Zieldatei fehlt nach '${pos[0] ?? ''}'\n`, code: 1 };
    const dst = pos.pop(); let err = '';
    const dn = this.node(dst);
    if (pos.length > 1 && (!dn || dn.t !== 'd')) return { out: '', err: `cp: Ziel '${dst}' ist kein Verzeichnis\n`, code: 1 };
    for (const s of pos) err += this._place(s, dst, 'cp', flags, false);
    return { out: '', err, code: err ? 1 : 0 };
  }

  c_mv(args) {
    const { flags, pos } = this._opts(args);
    if (pos.length < 2) return { out: '', err: `mv: Zieldatei fehlt nach '${pos[0] ?? ''}'\n`, code: 1 };
    const dst = pos.pop(); let err = '';
    for (const s of pos) err += this._place(s, dst, 'mv', flags, true);
    return { out: '', err, code: err ? 1 : 0 };
  }

  c_rm(args) {
    const { flags, pos } = this._opts(args);
    const rec = flags.has('r') || flags.has('R'), force = flags.has('f');
    if (!pos.length) return { out: '', err: force ? '' : 'rm: Operand fehlt\n', code: force ? 0 : 1 };
    let err = '';
    for (const p of pos) {
      const abs = this.path(p);
      if (abs === '/' || abs === HOME || abs === '/home') { err += `rm: SANDBOX-SCHUTZ: '${p}' wird nicht gelöscht. Auf einem echten System wäre das katastrophal – prüfe Pfade vor rm -r!\n`; continue; }
      const n = this.fs.get(abs);
      if (!n) { if (!force) err += `rm: das Entfernen von '${p}' ist nicht möglich: Datei oder Verzeichnis nicht gefunden\n`; continue; }
      if (n.t === 'd' && !rec) { err += `rm: das Entfernen von '${p}' ist nicht möglich: Ist ein Verzeichnis\n`; continue; }
      const { dir, name } = this.fs.parent(abs);
      if (!canDo(dir, 2)) { err += `rm: das Entfernen von '${p}' ist nicht möglich: Keine Berechtigung\n`; continue; }
      delete dir.kids[name];
    }
    return { out: '', err, code: err ? 1 : 0 };
  }

  static applyMode(mode, spec) {
    if (/^[0-7]{3,4}$/.test(spec)) return parseInt(spec, 8);
    let m = mode;
    for (const clause of spec.split(',')) {
      const mt = clause.match(/^([ugoa]*)([+\-=])([rwxt]*)$/);
      if (!mt) return null;
      const who = mt[1] || 'a';
      let bits = 0;
      for (const p of mt[3]) bits |= p === 'r' ? 4 : p === 'w' ? 2 : p === 'x' ? 1 : 0;
      const shifts = [];
      if (who.includes('u') || who.includes('a')) shifts.push(6);
      if (who.includes('g') || who.includes('a')) shifts.push(3);
      if (who.includes('o') || who.includes('a')) shifts.push(0);
      for (const s of shifts) {
        if (mt[2] === '+') m |= bits << s;
        else if (mt[2] === '-') m &= ~(bits << s);
        else m = (m & ~(7 << s)) | (bits << s);
      }
    }
    return m;
  }

  c_chmod(args) {
    const { flags, pos } = this._opts(args.map(a => /^-[rwx]+$/.test(a) ? '\u0001' + a : a));
    const real = pos.map(a => a.replace(/^\u0001/, ''));
    if (real.length < 2) return { out: '', err: `chmod: Operand fehlt nach „${real[0] ?? ''}“\n`, code: 1 };
    const spec = real[0]; let err = '';
    for (const p of real.slice(1)) {
      const n = this.node(p);
      if (!n) { err += `chmod: Zugriff auf '${p}' nicht möglich: Datei oder Verzeichnis nicht gefunden\n`; continue; }
      if (n.owner !== USER) { err += `chmod: Ändern der Zugriffsrechte von '${p}': Die Operation ist nicht erlaubt\n`; continue; }
      const apply = (x) => {
        const m = Shell.applyMode(x.mode, spec);
        if (m === null) return false;
        x.mode = m; if (flags.has('R') && x.t === 'd') Object.values(x.kids).forEach(apply);
        return true;
      };
      if (!apply(n)) return { out: '', err: `chmod: ungültiger Modus: „${spec}“\n`, code: 1 };
    }
    return { out: '', err, code: err ? 1 : 0 };
  }

  c_stat(args) {
    const { vals, pos } = this._opts(args, ['c']);
    let out = '', err = '';
    for (const p of pos) {
      const n = this.node(p);
      if (!n) { err += `stat: Aufruf von stat für '${p}' nicht möglich: Datei oder Verzeichnis nicht gefunden\n`; continue; }
      const size = n.t === 'd' ? 4096 : new TextEncoder().encode(n.data).length;
      const octal = (n.mode & 0o7777).toString(8);
      if (vals.c) {
        out += vals.c.replace(/%a/g, octal).replace(/%A/g, modeString(n)).replace(/%n/g, p).replace(/%U/g, n.owner).replace(/%s/g, size).replace(/%F/g, n.t === 'd' ? 'Verzeichnis' : 'reguläre Datei') + '\n';
      } else {
        out += `  Datei: ${p}\n  Größe: ${size}\t\tBlöcke: 8\tEA Block: 4096   ${n.t === 'd' ? 'Verzeichnis' : 'reguläre Datei'}\n` +
          `Zugriff: (${octal.padStart(4, '0')}/${modeString(n)})  Uid: (${n.owner === USER ? UID : 0}/${n.owner.padStart(7)})   Gid: (${n.owner === USER ? UID : 0}/${n.owner.padStart(7)})\n`;
      }
    }
    return { out, err, code: err ? 1 : 0 };
  }

  c_find(args) {
    const starts = []; let i = 0;
    while (i < args.length && !args[i].startsWith('-')) starts.push(args[i++]);
    if (!starts.length) starts.push('.');
    const tests = []; let maxdepth = Infinity;
    for (; i < args.length; i++) {
      const a = args[i], v = args[i + 1];
      if (a === '-name' || a === '-iname') { if (v === undefined) return { out: '', err: `find: Fehlendes Argument für „${a}“\n`, code: 1 }; const re = globToRe(a === '-iname' ? v.toLowerCase() : v); tests.push((n, name) => re.test(a === '-iname' ? name.toLowerCase() : name)); i++; }
      else if (a === '-type') { if (!['f', 'd'].includes(v)) return { out: '', err: `find: Unbekanntes Argument für -type: ${v}\n`, code: 1 }; tests.push((n) => n.t === v); i++; }
      else if (a === '-maxdepth') { maxdepth = parseInt(v, 10); i++; }
      else if (a === '-perm') { const want = v.replace(/^[-/]/, ''); const m = Shell.applyMode(0, want); const any = v.startsWith('/'); const all = v.startsWith('-'); tests.push((n) => { const mm = n.mode & 0o777; return all ? (mm & m) === m : any ? (mm & m) !== 0 : mm === m; }); i++; }
      else return { out: '', err: `find: Unbekannte Bedingung „${a}“ (Sandbox kennt -name, -iname, -type, -maxdepth, -perm)\n`, code: 1 };
    }
    let out = '', err = '';
    const walk = (path, n, depth) => {
      const name = path.split('/').filter(Boolean).pop() || path;
      if (tests.every(t => t(n, name))) out += path + '\n';
      if (n.t === 'd' && depth < maxdepth) {
        if (!canDo(n, 4) || !canDo(n, 1)) { err += `find: '${path}': Keine Berechtigung\n`; return; }
        for (const k of Object.keys(n.kids).sort()) walk(path.replace(/\/$/, '') + '/' + k, n.kids[k], depth + 1);
      }
    };
    for (const s of starts) {
      const n = this.node(s);
      if (!n) { err += `find: '${s}': Datei oder Verzeichnis nicht gefunden\n`; continue; }
      walk(s, n, 0);
    }
    return { out, err, code: err ? 1 : 0 };
  }

  c_grep(args, stdin) {
    const { flags, pos } = this._opts(args, ['e']);
    if (!pos.length) return { out: '', err: 'Aufruf: grep [OPTION]… MUSTER [DATEI]…\n', code: 2 };
    const pat = pos.shift();
    let re;
    try {
      let src = flags.has('F') ? pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : pat.replace(/\\\|/g, '|');
      if (flags.has('w')) src = `\\b(?:${src})\\b`;
      re = new RegExp(src, flags.has('i') ? 'i' : '');
    } catch { return { out: '', err: `grep: ungültiger regulärer Ausdruck: ${pat}\n`, code: 2 }; }
    let files = pos.map(p => ({ p }));
    let err = '';
    if (flags.has('r') || flags.has('R')) {
      const all = []; const starts = pos.length ? pos : ['.'];
      const walk = (path, n) => {
        if (n.t === 'f') { all.push({ p: path }); return; }
        if (!canDo(n, 4)) { err += `grep: ${path}: Keine Berechtigung\n`; return; }
        for (const k of Object.keys(n.kids).sort()) walk(path.replace(/\/$/, '') + '/' + k, n.kids[k]);
      };
      for (const s of starts) { const n = this.node(s); if (!n) err += `grep: ${s}: Datei oder Verzeichnis nicht gefunden\n`; else walk(s, n); }
      files = all;
    }
    const multi = files.length > 1 || flags.has('r') || flags.has('R');
    let out = '', found = false;
    const sources = files.length ? files : [{ p: null }];
    for (const f of sources) {
      let data;
      if (f.p === null) data = stdin ?? '';
      else {
        const n = this.node(f.p);
        if (!n) { err += `grep: ${f.p}: Datei oder Verzeichnis nicht gefunden\n`; continue; }
        if (n.t === 'd') { err += `grep: ${f.p}: Ist ein Verzeichnis\n`; continue; }
        if (!canDo(n, 4)) { err += `grep: ${f.p}: Keine Berechtigung\n`; continue; }
        data = n.data;
      }
      const lines = data.replace(/\n$/, '').split('\n');
      if (data === '') lines.length = 0;
      let count = 0;
      lines.forEach((l, idx) => {
        const hit = re.test(l) !== flags.has('v');
        if (!hit) return;
        count++; found = true;
        if (flags.has('c') || flags.has('l')) return;
        out += (multi ? f.p + ':' : '') + (flags.has('n') ? (idx + 1) + ':' : '') + l + '\n';
      });
      if (flags.has('c')) out += (multi ? f.p + ':' : '') + count + '\n';
      if (flags.has('l') && count) out += f.p + '\n';
    }
    return { out, err, code: err && !found ? 2 : found ? 0 : 1 };
  }

  c_wc(args, stdin) {
    const { flags, pos } = this._opts(args);
    const { parts, err } = this._inputs(pos, stdin, 'wc');
    const sel = flags.size ? flags : new Set(['l', 'w', 'c']);
    let out = '';
    const tot = [0, 0, 0];
    for (const p of parts) {
      const l = (p.data.match(/\n/g) || []).length;
      const w = p.data.split(/\s+/).filter(Boolean).length;
      const c = new TextEncoder().encode(p.data).length;
      tot[0] += l; tot[1] += w; tot[2] += c;
      const cols = []; if (sel.has('l')) cols.push(l); if (sel.has('w')) cols.push(w); if (sel.has('c')) cols.push(c);
      out += (p.name === null && cols.length === 1 ? String(cols[0]) : cols.map(x => String(x).padStart(sel.size > 1 ? 7 : 1)).join(' ')) + (p.name ? ' ' + p.name : '') + '\n';
    }
    if (parts.length > 1) { const cols = []; if (sel.has('l')) cols.push(tot[0]); if (sel.has('w')) cols.push(tot[1]); if (sel.has('c')) cols.push(tot[2]); out += cols.join(' ') + ' insgesamt\n'; }
    return { out, err, code: err ? 1 : 0 };
  }

  _headTail(args, stdin, tail) {
    const norm = args.map(a => /^-\d+$/.test(a) ? ['-n', a.slice(1)] : [a]).flat();
    const { vals, pos } = this._opts(norm, ['n']);
    const n = vals.n !== undefined ? parseInt(vals.n, 10) : 10;
    const { parts, err } = this._inputs(pos, stdin, tail ? 'tail' : 'head');
    let out = '';
    for (const p of parts) {
      if (parts.length > 1) out += `==> ${p.name} <==\n`;
      const lines = p.data.replace(/\n$/, '').split('\n');
      if (!p.data) continue;
      out += (tail ? lines.slice(-n) : lines.slice(0, n)).join('\n') + '\n';
    }
    return { out, err, code: err ? 1 : 0 };
  }
  c_head(a, s) { return this._headTail(a, s, false); }
  c_tail(a, s) { return this._headTail(a, s, true); }

  c_sort(args, stdin) {
    const { flags, pos } = this._opts(args);
    const { parts, err } = this._inputs(pos, stdin, 'sort');
    let lines = parts.map(p => p.data).join('').replace(/\n$/, '').split('\n').filter((l, i, a) => !(a.length === 1 && l === ''));
    lines.sort(flags.has('n') ? (a, b) => parseFloat(a) - parseFloat(b) : (a, b) => a.localeCompare(b));
    if (flags.has('r')) lines.reverse();
    if (flags.has('u')) lines = lines.filter((l, i) => i === 0 || l !== lines[i - 1]);
    return { out: lines.length ? lines.join('\n') + '\n' : '', err, code: err ? 2 : 0 };
  }

  c_uniq(args, stdin) {
    const { flags, pos } = this._opts(args);
    const { parts, err } = this._inputs(pos, stdin, 'uniq');
    const lines = parts.map(p => p.data).join('').replace(/\n$/, '').split('\n');
    const res = [];
    for (const l of lines) { if (res.length && res[res.length - 1][0] === l) res[res.length - 1][1]++; else res.push([l, 1]); }
    const out = res.filter(([l]) => l !== '' || lines.length > 1).map(([l, c]) => flags.has('c') ? `${String(c).padStart(7)} ${l}` : l).join('\n');
    return { out: out ? out + '\n' : '', err, code: err ? 1 : 0 };
  }

  c_cut(args, stdin) {
    const { vals, pos } = this._opts(args, ['d', 'f']);
    if (!vals.f) return { out: '', err: 'cut: Sie müssen eine Liste von Feldern angeben (-f)\n', code: 1 };
    const d = vals.d ?? '\t';
    const fields = vals.f.split(',').map(x => parseInt(x, 10) - 1);
    const { parts, err } = this._inputs(pos, stdin, 'cut');
    const lines = parts.map(p => p.data).join('').replace(/\n$/, '').split('\n');
    return { out: lines.map(l => { const s = l.split(d); return s.length === 1 ? l : fields.map(f => s[f] ?? '').join(d); }).join('\n') + '\n', err, code: 0 };
  }

  c_ps(args) {
    this._reap();
    const a = args.join(' ');
    const mine = this.procs.filter(p => !p.sys || p.user === USER).filter(p => p.cmd !== 'sandbox-terminal');
    const psPid = this.nextPid++;
    const self = { pid: psPid, ppid: this.bashPid, user: USER, cmd: 'ps ' + a };
    const list = (/-e|aux|ax|-A/.test(a) ? [...this.procs] : mine).concat(self);
    const comm = (c) => c.split(' ')[0].split('/').pop();
    const o = a.match(/-o\s*(\S+)/);
    if (o) {
      const cols = o[1].split(',');
      const head = { pid: '    PID', ppid: '   PPID', cmd: 'CMD', args: 'COMMAND', comm: 'COMMAND', user: 'USER    ', stat: 'STAT', tty: 'TT' };
      const bad = cols.find(c => !head[c]);
      if (bad) return { out: '', err: `error: unknown user-defined format specifier "${bad}"\n`, code: 1 };
      const row = (p) => cols.map(c => c === 'pid' ? String(p.pid).padStart(7) : c === 'ppid' ? String(p.ppid).padStart(7) : c === 'user' ? p.user.padEnd(8) : c === 'stat' ? (p.pid === psPid ? 'R+' : 'S') : c === 'tty' ? 'pts/0' : c === 'comm' ? comm(p.cmd) : p.cmd).join(' ');
      return { out: cols.map(c => head[c]).join(' ') + '\n' + list.map(row).join('\n') + '\n', code: 0 };
    }
    if (/-ef|-f/.test(a)) {
      return { out: 'UID          PID    PPID  C STIME TTY          TIME CMD\n' + list.map(p => `${p.user.padEnd(8)} ${String(p.pid).padStart(7)} ${String(p.ppid).padStart(7)}  0 08:00 ${p.sys && p.user === 'root' ? '?      ' : 'pts/0  '}  00:00:00 ${p.cmd}`).join('\n') + '\n', code: 0 };
    }
    if (/aux/.test(a)) {
      return { out: 'USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\n' + list.map(p => `${p.user.padEnd(8)} ${String(p.pid).padStart(7)}  0.0  0.1  12345  4321 ${p.sys && p.user === 'root' ? '?       ' : 'pts/0   '} S    08:00   0:00 ${p.cmd}`).join('\n') + '\n', code: 0 };
    }
    return { out: '    PID TTY          TIME CMD\n' + list.map(p => `${String(p.pid).padStart(7)} pts/0    00:00:00 ${comm(p.cmd)}`).join('\n') + '\n', code: 0 };
  }

  c_jobs(args) {
    this._reap();
    const out = this.jobs.map((j, i) => `[${j.no}]${i === this.jobs.length - 1 ? '+' : '-'}  ${args.includes('-l') ? j.pid + ' ' : ''}${(j.state === 'Running' ? 'Läuft' : j.state === 'Done' ? 'Fertig' : 'Beendet').padEnd(22)}${j.cmd}`).join('\n');
    this.jobs = this.jobs.filter(j => j.state === 'Running');
    return { out: out ? out + '\n' : '', code: 0 };
  }

  c_sleep(args) {
    const secs = parseFloat(args[0]);
    if (!(secs >= 0)) return { out: '', err: `sleep: Operand fehlt oder ungültig\n`, code: 1 };
    return { out: `(Sandbox: ${secs} s Vordergrund-Warten übersprungen. Mit „&“ am Ende läuft sleep als Hintergrundjob.)\n`, code: 0 };
  }

  c_kill(args) {
    let sig = 15; const targets = [];
    for (const a of args) {
      if (a === '-l') return { out: ' 1) SIGHUP   2) SIGINT   9) SIGKILL  15) SIGTERM  18) SIGCONT  19) SIGSTOP\n', code: 0 };
      if (/^-(\d+|KILL|TERM|SIGKILL|SIGTERM)$/.test(a)) { sig = /9|KILL/.test(a) ? 9 : 15; continue; }
      targets.push(a);
    }
    if (!targets.length) return { out: '', err: 'kill: Aufruf: kill [-s Signal | -n Signum | -Signal] PID | %JOB …\n', code: 2 };
    let err = '';
    for (const t of targets) {
      this._reap();
      let pid;
      if (t.startsWith('%')) {
        const j = this.jobs.find(x => x.no === parseInt(t.slice(1), 10) && x.state === 'Running');
        if (!j) { err += `bash: kill: ${t}: Kein solcher Job\n`; continue; }
        pid = j.pid;
      } else pid = parseInt(t, 10);
      if (!Number.isFinite(pid)) { err += `bash: kill: ${t}: Argumente müssen Prozess- oder Job-IDs sein\n`; continue; }
      const p = this.procs.find(x => x.pid === pid);
      if (!p) { err += `bash: kill: (${t}) - Kein passender Prozess gefunden\n`; continue; }
      if (p.user !== USER) { err += `bash: kill: (${pid}) - Die Operation ist nicht erlaubt\n`; continue; }
      if (pid === this.bashPid) { err += `SANDBOX: Die eigene Shell (PID ${pid}) wird hier nicht beendet. Auf echtem Kali würde dein Terminal sich schließen.\n`; continue; }
      if (p.cmd === 'sandbox-terminal') { err += `bash: kill: (${pid}) - Die Operation ist nicht erlaubt\n`; continue; }
      this.procs = this.procs.filter(x => x.pid !== pid);
      if (p.onKill) p.onKill(this);
      const j = this.jobs.find(x => x.pid === pid);
      if (j) j.state = sig === 9 ? 'Getötet' : 'Beendet';
    }
    return { out: '', err, code: err ? 1 : 0 };
  }

  _resolveHost(name) {
    if (/^\d+\.\d+\.\d+\.\d+$/.test(name) || name.includes(':')) return name;
    const hosts = this.read('/etc/hosts') || '';
    for (const line of hosts.split('\n')) {
      const clean = line.replace(/#.*/, '').trim();
      if (!clean) continue;
      const [ip, ...names] = clean.split(/\s+/);
      if (names.includes(name)) return ip;
    }
    return this.dns[name] || null;
  }

  c_getent(args) {
    if (args[0] !== 'hosts' || !args[1]) return { out: '', err: 'getent: in der Sandbox nur „getent hosts NAME“\n', code: 1 };
    const name = args[1];
    const ip = this._resolveHost(name);
    if (!ip) return { out: '', code: 2 };
    const hosts = this.read('/etc/hosts') || '';
    const line = hosts.split('\n').map(l => l.replace(/#.*/, '').trim()).find(l => l.split(/\s+/).slice(1).includes(name) && l.split(/\s+/)[0] === ip);
    return { out: (line ? `${ip.padEnd(15)} ${line.split(/\s+/).slice(1).join(' ')}` : `${ip.padEnd(15)} ${name}`) + '\n', code: 0 };
  }

  c_curl(args) {
    const { flags, vals, pos } = this._opts(args, ['o', 'X', 'H', 'm']);
    if (flags.has('--version') || flags.has('V')) return { out: 'curl 8.x (SANDBOX-SIMULATION – kein echter Netzwerkzugriff)\n', code: 0 };
    if (!pos.length) return { out: '', err: 'curl: try \'curl --help\' for more information\n', code: 2 };
    const head = flags.has('I') || flags.has('--head');
    const incl = flags.has('i') || flags.has('--include');
    let url = pos[0];
    if (!/^https?:\/\//.test(url)) url = 'http://' + url;
    let m = url.match(/^(https?):\/\/([^/:]+|\[[^\]]+\])(?::(\d+))?(\/[^?#]*)?/);
    if (!m) return { out: '', err: `curl: (3) URL rejected: Malformed input to a URL function\n`, code: 3 };
    const [, scheme, host, portStr, path = '/'] = m;
    const port = portStr || (scheme === 'https' ? '443' : '80');
    const ip = this._resolveHost(host);
    if (!ip) return { out: '', err: `curl: (6) Could not resolve host: ${host}\n`, code: 6 };
    const inScope = /^127\./.test(ip) || ip === '::1' || /\.lab\.sim$/.test(host) || Object.keys(this.web).some(k => k.startsWith(ip + ':') || k.startsWith(host + ':'));
    if (!inScope) return { out: '', err: `SANDBOX-SCOPE: ${host} (${ip}) liegt außerhalb des erlaubten Übungsziels. Es wurde nichts gesendet.\nErlaubt sind nur 127.0.0.1/localhost und ausdrücklich genannte Lab-Ziele.\n`, code: 7 };
    const svc = this.web[`${ip}:${port}`] || this.web[`${host}:${port}`];
    if (!svc || svc.down) return { out: '', err: `curl: (7) Failed to connect to ${host} port ${port} after 0 ms: Couldn't connect to server\n`, code: 7 };
    if (scheme === 'https' && !svc.tls) return { out: '', err: `curl: (35) OpenSSL/3.x: error:0A00010B:SSL routines::wrong version number\n`, code: 35 };
    const route = svc.routes[path] || svc.routes[path.replace(/\/$/, '')] || { status: 404, reason: 'File not found', headers: { 'Content-Type': 'text/html;charset=utf-8' }, body: '<html><body><h1>Error response</h1><p>Error code: 404</p></body></html>\n' };
    if (svc.onRequest) svc.onRequest(path, this);
    const body = typeof route.body === 'function' ? route.body(this) : (route.body ?? '');
    const reason = route.reason || { 200: 'OK', 301: 'Moved Permanently', 302: 'Found', 403: 'Forbidden', 404: 'File not found', 500: 'Internal Server Error' }[route.status] || '';
    const headers = { Server: svc.server || 'SimHTTP/1.0', Date: 'Sat, 31 Oct 2026 08:00:00 GMT', ...route.headers, 'Content-Length': String(new TextEncoder().encode(body).length) };
    const hdr = `${svc.proto || 'HTTP/1.0'} ${route.status} ${reason}\n` + Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join('\n') + '\n\n';
    const out = head ? hdr : incl ? hdr + body : body;
    if (vals.o) { const w = this._writeTo(vals.o, out, false); if (w) return { out: '', err: w, code: 23 }; return { out: '', code: 0 }; }
    return { out, code: 0 };
  }
}

export function lsLineFor(sh, path) {
  const n = sh.node(path);
  return n ? modeString(n) : null;
}
