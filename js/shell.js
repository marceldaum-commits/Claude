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

// ---------------------------------------------------------------- Text-/Byte-Hilfen
// grep ohne -E: Grund-Syntax (BRE) -> JavaScript. \+ \? \( \) \{ \} \| sind Metazeichen, + ? ( ) { } | wörtlich.
function breToJs(p) {
  let out = '';
  for (let i = 0; i < p.length; i++) {
    const c = p[i];
    if (c === '\\' && i + 1 < p.length) { const n = p[i + 1]; out += '+?(){}|'.includes(n) ? n : '\\' + n; i++; }
    else if ('+?(){}|'.includes(c)) out += '\\' + c;
    else if (c === '$' && i !== p.length - 1) out += '\\$';
    else if (c === '^' && i !== 0 && p[i - 1] !== '[') out += '\\^';
    else out += c;
  }
  return out;
}
const utf8 = (s) => new TextEncoder().encode(s);
function bytesToText(bytes) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes)); }
  catch { return String.fromCharCode(...bytes); }
}
function sha256hex(str) {
  const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const b = [...utf8(str)]; const l = b.length * 8;
  b.push(0x80); while (b.length % 64 !== 56) b.push(0);
  for (let i = 7; i >= 0; i--) b.push(i > 3 ? 0 : (l >>> (i * 8)) & 255);
  const r = (x, n) => (x >>> n) | (x << (32 - n)); const w = new Array(64);
  for (let o = 0; o < b.length; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = (b[o + 4 * i] << 24) | (b[o + 4 * i + 1] << 16) | (b[o + 4 * i + 2] << 8) | b[o + 4 * i + 3];
    for (let i = 16; i < 64; i++) { const s0 = r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0; }
    let [a, bb, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
      const t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & bb) ^ (a & c) ^ (bb & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
    }
    [a, bb, c, d, e, f, g, h].forEach((v, i) => { H[i] = (H[i] + v) | 0; });
  }
  return H.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
}
function md5hex(str) {
  const k = [], s = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
  for (let i = 0; i < 64; i++) k[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) | 0;
  const b = [...utf8(str)]; const l = b.length * 8;
  b.push(0x80); while (b.length % 64 !== 56) b.push(0);
  for (let i = 0; i < 8; i++) b.push(i < 4 ? (l >>> (i * 8)) & 255 : 0);
  let [a0, b0, c0, d0] = [0x67452301, 0xefcdab89 | 0, 0x98badcfe | 0, 0x10325476];
  for (let o = 0; o < b.length; o += 64) {
    const m = []; for (let i = 0; i < 16; i++) m[i] = b[o + 4 * i] | (b[o + 4 * i + 1] << 8) | (b[o + 4 * i + 2] << 16) | (b[o + 4 * i + 3] << 24);
    let [A, B, C, D] = [a0, b0, c0, d0];
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16) { F = (B & C) | (~B & D); g = i; } else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; } else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; } else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = (F + A + k[i] + m[g]) | 0; A = D; D = C; C = B; B = (B + ((F << s[i]) | (F >>> (32 - s[i])))) | 0;
    }
    a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
  }
  return [a0, b0, c0, d0].map(x => [0, 1, 2, 3].map(i => ((x >>> (8 * i)) & 255).toString(16).padStart(2, '0')).join('')).join('');
}

export const sha256hexSync = (s) => sha256hex(s);
export const md5hexSync = (s) => md5hex(s);

// ---------------------------------------------------------------- Mini-Bash-Hilfen
// Teile außerhalb von Anführungszeichen (um Leerzeichen in NAME=wert zu erkennen)
// $(…) und $((…)) entfernen (für die Prüfung, ob NAME=wert Leerzeichen enthält)
function stripSubs(s) {
  let out = '', i = 0;
  while (i < s.length) {
    if (s[i] === '$' && s[i + 1] === '(') { let d = 0, j = i + 1; for (; j < s.length; j++) { if (s[j] === '(') d++; else if (s[j] === ')' && --d === 0) break; } i = j + 1; out += 'X'; continue; }
    out += s[i++];
  }
  return out;
}
function unquotedPart(s) { return s.replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, ''); }

// Wörter am Anweisungsanfang (für Schlüsselwörter)
const OPEN = new Set(['for', 'while', 'if']), CLOSE = new Set(['done', 'fi']);
function splitStatements(text) {
  const out = []; let cur = '', depth = 0, i = 0, q = null, atStart = true, word = '';
  const flushWord = () => {
    if (!word) return;
    if (atStart && OPEN.has(word)) depth++;
    else if (CLOSE.has(word)) depth = Math.max(0, depth - 1);
    atStart = ['then', 'do', 'else', 'elif', '|', '&&', '||'].includes(word) || (atStart && ['!'].includes(word));
    word = '';
  };
  while (i < text.length) {
    const c = text[i];
    if (q) { cur += c; if (c === q) q = null; else if (c === '\\' && q === '"') { cur += text[i + 1] ?? ''; i++; } i++; continue; }
    if (c === "'" || c === '"') { q = c; cur += c; word += 'x'; i++; continue; }
    if (c === '#' && (i === 0 || /\s/.test(text[i - 1])) && !word) { while (i < text.length && text[i] !== '\n') i++; continue; }
    if (c === ';' || c === '\n') {
      flushWord();
      if (depth === 0) { if (cur.trim()) out.push(cur.trim()); cur = ''; atStart = true; }
      else { cur += c === '\n' ? ';' : c; atStart = true; }
      i++; continue;
    }
    if (/\s/.test(c)) { flushWord(); cur += c; i++; continue; }
    if (c === '|' || c === '&') { flushWord(); cur += c; atStart = true; i++; continue; }
    word += c; cur += c; i++;
  }
  flushWord();
  if (q) return { error: `Syntaxfehler: schließendes ${q} fehlt` };
  if (depth > 0) return { error: 'Syntaxfehler: „done“ oder „fi“ fehlt' };
  if (cur.trim()) out.push(cur.trim());
  return out;
}

// Position des passenden Abschlussworts (done/fi) auf oberster Ebene in text
function findClose(text, close, opens = ['for', 'while']) {
  const re = /'[^']*'|"(?:\\.|[^"\\])*"|[A-Za-z_]+/g; let m, depth = 0;
  const openSet = new Set(close === 'fi' ? ['if'] : ['for', 'while']);
  while ((m = re.exec(text))) {
    const w = m[0]; const prev = text.slice(0, m.index).replace(/\s+$/, '');
    const start = !prev || /[;|&\n]$/.test(prev) || /\b(then|do|else)$/.test(prev);
    if (openSet.has(w) && start) depth++;
    else if (w === close && start) { if (depth === 0) return m.index; depth--; }
  }
  return -1;
}

// "BED; then A; elif BED2; then B; else C" -> [{cond, body}, …, {cond:null, body}]
function splitIf(inner) {
  const toks = []; const re = /'[^']*'|"(?:\\.|[^"\\])*"|\b(then|elif|else|if|fi)\b/g; let m, depth = 0, last = 0;
  while ((m = re.exec(inner))) {
    if (!m[1]) continue;
    const prev = inner.slice(0, m.index).replace(/\s+$/, '');
    if (!(!prev || /[;\n]$/.test(prev) || /\b(then|else|do)$/.test(prev))) continue; // nur am Anweisungsanfang
    if (m[1] === 'if') { depth++; continue; } if (m[1] === 'fi') { depth--; continue; }
    if (depth === 0) { toks.push({ kw: m[1], at: m.index }); }
  }
  const parts = []; let cond = null, pos = 0, mode = 'cond';
  for (const t of toks) {
    const seg = inner.slice(pos, t.at).trim().replace(/;\s*$/, '');
    if (t.kw === 'then') { if (mode !== 'cond') return null; cond = seg; mode = 'body'; }
    else if (t.kw === 'elif' || t.kw === 'else') { if (mode !== 'body') return null; parts.push({ cond, body: seg }); cond = null; mode = t.kw === 'elif' ? 'cond' : 'else'; }
    pos = t.at + t.kw.length;
  }
  const seg = inner.slice(pos).trim().replace(/;\s*$/, '');
  if (mode === 'body') parts.push({ cond, body: seg }); else if (mode === 'else') parts.push({ cond: null, body: seg }); else return null;
  return parts;
}

// ---------------------------------------------------------------- Shell

const KNOWN = ['pwd', 'whoami', 'id', 'hostname', 'date', 'ls', 'cd', 'mkdir', 'rmdir', 'touch', 'echo', 'cat', 'cp', 'mv', 'rm',
  'chmod', 'stat', 'find', 'grep', 'wc', 'head', 'tail', 'sort', 'uniq', 'cut', 'ps', 'jobs', 'sleep', 'kill', 'curl', 'getent',
  'clear', 'history', 'help', 'man', 'command', 'which', 'type', 'true', 'false', 'exit', 'uname', 'file',
  'tr', 'sed', 'awk', 'seq', 'test', '[', 'bash', 'sh', 'export', 'read', 'diff',
  'xxd', 'strings', 'sha256sum', 'md5sum', 'basename', 'dirname'];

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
    this.uvars = {};               // eigene Variablen (NAME=wert)
    this.log = [];                 // [{line, cmd, args, code, out}]
    this.now = opts.now || (() => Date.now());
  }

  // ------------------------------------------------ öffentliche API
  exec(line) {
    line = String(line ?? '');
    const trimmed = line.trim();
    if (!trimmed) return { out: '', code: 0 };
    this.history.push(trimmed);
    this._depth = 0; this._exitReq = false;
    const r = this._script(trimmed);
    this._reap();
    return this._done(trimmed, r);
  }

  // ------------------------------------------------ Mini-Bash: Variablen, $(…), $((…)), for, while read, if, Skripte
  // Ein Text wird in Anweisungen zerlegt (; oder Zeilenumbruch auf oberster Ebene). Schlüsselwörter for/while/if
  // öffnen eine Ebene, done/fi schließen sie. Einfache Zeilen ohne diese Konstrukte laufen unverändert durch _plain.
  _script(text) {
    if ((this._depth = (this._depth || 0) + 1) > 40) return { out: '', err: 'bash: zu tief verschachtelt (Endlosschleife?)\n', code: 1 };
    try {
      const stmts = splitStatements(text);
      if (stmts.error) return { out: '', err: 'bash: ' + stmts.error + '\n', code: 2 };
      let out = '', err = '', code = 0, clear = false;
      for (const st of stmts) {
        const r = this._statement(st);
        if (r.clear) { clear = true; out = ''; err = ''; }
        out += r.out || ''; err += r.err || ''; code = r.code ?? 0; this.lastCode = code;
        if (r.exit || this._exitReq) return { out, err, code, clear, exit: true };
      }
      return { out, err, code, clear };
    } finally { this._depth--; }
  }

  _statement(st) {
    st = st.trim();
    if (!st || st.startsWith('#')) return { out: '', code: this.lastCode };
    let m;
    if (/^for\s/.test(st)) return this._for(st);
    if (/^while\s/.test(st) || /\|\s*while\s+read\b/.test(st)) return this._while(st);
    if (/^if\s/.test(st)) return this._if(st);
    if ((m = st.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/s)) && !/\s/.test(unquotedPart(stripSubs(m[2])))) {
      this.uvars[m[1]] = this._expandValue(m[2]);
      return { out: '', code: 0 };
    }
    return this._plain(this._substitute(st));
  }

  // $(…) und $((…)) vorab ersetzen (nicht in '…')
  _substitute(st) {
    let res = '', i = 0, inS = false;
    while (i < st.length) {
      const c = st[i];
      if (c === "'" ) { inS = !inS; res += c; i++; continue; }
      if (!inS && c === '$' && st[i + 1] === '(') {
        const arith = st[i + 2] === '(';
        let depth = 0, j = i + 1;
        for (; j < st.length; j++) { if (st[j] === '(') depth++; else if (st[j] === ')') { depth--; if (depth === 0) break; } }
        if (j >= st.length) { res += st.slice(i); break; }
        const inner = st.slice(i + (arith ? 3 : 2), arith ? j - 1 : j);
        res += arith ? String(this._arith(inner)) : (this._script(inner).out || '').replace(/\n+$/, '').replace(/\n/g, ' ');
        i = j + 1; continue;
      }
      res += c; i++;
    }
    return res;
  }

  _arith(expr) {
    const e = this._substitute(expr).replace(/\$(\d+|#)/g, (_, n) => String(parseInt(this._var(n), 10) || 0)).replace(/\$?\{?([A-Za-z_][A-Za-z0-9_]*)\}?/g, (_, n) => String(parseInt(this._var(n), 10) || 0));
    if (!/^[\d\s+\-*/%()]+$/.test(e)) return 0;
    try { const v = Function('"use strict";return (' + e + ')')(); return Number.isFinite(v) ? Math.trunc(v) : 0; } catch { return 0; }
  }

  _var(n) {
    const vars = { HOME, USER, PWD: this.cwd, '?': String(this.lastCode), SHELL: '/bin/bash', OLDPWD: this.oldpwd };
    return this.uvars[n] ?? vars[n] ?? '';
  }

  _expandValue(raw) {
    raw = this._substitute(raw);
    if (/^'.*'$/s.test(raw)) return raw.slice(1, -1);
    if (/^".*"$/s.test(raw)) raw = raw.slice(1, -1);
    return raw.replace(/\$(\?|#|\d|[A-Za-z_][A-Za-z0-9_]*|\{[A-Za-z_][A-Za-z0-9_]*\})/g, (_, n) => this._var(n.replace(/[{}]/g, '')));
  }

  // Ausgabe einer Schleife weiterreichen: "done | sort", "done > datei"
  _after(rest, out, err, code) {
    rest = rest.trim();
    if (!rest) return { out, err, code };
    if (!/^(\||>|>>|2>)/.test(rest)) return { out, err: err + `bash: Syntaxfehler nach done/fi: ${rest}\n`, code: 2 };
    this.extra.__block = () => ({ out, code: 0 });
    const r = this._plain('__block ' + this._substitute(rest));
    delete this.extra.__block;
    return { out: r.out, err: err + (r.err || ''), code: r.code };
  }

  _for(st) {
    const m = st.match(/^for\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\s+([\s\S]*?)\s*(?:;|\n)\s*do\b([\s\S]*)$/);
    if (!m) return { out: '', err: 'bash: for-Syntax: for VAR in LISTE; do BEFEHLE; done\n', code: 2 };
    const end = findClose(m[3], 'done');
    if (end < 0) return { out: '', err: 'bash: Syntaxfehler: „done“ fehlt\n', code: 2 };
    const body = m[3].slice(0, end), rest = m[3].slice(end + 4);
    const words = [];
    for (const t of tokenize(this._substitute(m[2]))) if (t.w !== undefined) words.push(...this._expandWord(t));
    let out = '', err = '', code = 0;
    for (const w of words.slice(0, 5000)) {
      this.uvars[m[1]] = w;
      const r = this._script(body); out += r.out || ''; err += r.err || ''; code = r.code;
      if (r.exit || this._exitReq) break;
    }
    return this._after(rest, out, err, code);
  }

  _while(st) {
    const m = st.match(/^(?:([\s\S]*?)\|\s*)?while\s+read\s+(?:-r\s+)?([A-Za-z_][A-Za-z0-9_]*(?:\s+[A-Za-z_][A-Za-z0-9_]*)*)\s*(?:;|\n)\s*do\b([\s\S]*)$/);
    if (!m) return { out: '', err: 'bash: In der Sandbox geht: while read ZEILE; do …; done < DATEI  oder  … | while read ZEILE; do …; done\n', code: 2 };
    const end = findClose(m[3], 'done');
    if (end < 0) return { out: '', err: 'bash: Syntaxfehler: „done“ fehlt\n', code: 2 };
    const body = m[3].slice(0, end); let rest = m[3].slice(end + 4).trim();
    let input = '', err = '';
    if (m[1]) { const r = this._script(m[1]); input = r.out || ''; err += r.err || ''; }
    const red = rest.match(/^<\s*(\S+)\s*([\s\S]*)$/);
    if (red) { const f = this._readable(this._expandValue(red[1]), 'bash'); if (f.err) return { out: '', err: f.err, code: 1 }; input = f.data; rest = red[2]; }
    let out = '', code = 0;
    for (const line of input.replace(/\n$/, '').split('\n').slice(0, 5000)) {
      if (!input) break;
      const names = m[2].split(/\s+/);
      if (names.length === 1) this.uvars[names[0]] = line;
      else { const w = line.trim().split(/\s+/); names.forEach((n, k) => { this.uvars[n] = k === names.length - 1 ? w.slice(k).join(' ') : (w[k] ?? ''); }); }
      const r = this._script(body); out += r.out || ''; err += r.err || ''; code = r.code;
      if (r.exit || this._exitReq) break;
    }
    return this._after(rest, out, err, code);
  }

  _if(st) {
    // if BED; then A; [elif BED; then B;] [else C;] fi
    const end = findClose(st.slice(2), 'fi', ['if']);
    if (end < 0) return { out: '', err: 'bash: Syntaxfehler: „fi“ fehlt\n', code: 2 };
    const inner = st.slice(2, 2 + end), rest = st.slice(2 + end + 2);
    const parts = splitIf(inner);
    if (!parts) return { out: '', err: 'bash: if-Syntax: if BEDINGUNG; then BEFEHLE; else BEFEHLE; fi\n', code: 2 };
    let out = '', err = '', code = 0, done = false;
    for (const p of parts) {
      if (p.cond !== null) {
        const c = this._script(p.cond); err += c.err || ''; out += c.out || '';
        if (c.code !== 0) continue;
      }
      const r = this._script(p.body); out += r.out || ''; err += r.err || ''; code = r.code; done = true; break;
    }
    if (!done) code = 0;
    return this._after(rest, out, err, code);
  }

  _plain(trimmed) {
    let toks;
    try { toks = tokenize(trimmed); } catch (e) { return { out: '', err: 'bash: ' + e.message + '\n', code: 2 }; }

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
    return { out, err, code, clear };
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
    const rep = (s) => s.replace(/\$(\?|#|\d|[A-Za-z_][A-Za-z0-9_]*|\{[A-Za-z_][A-Za-z0-9_]*\})/g, (_, n) => this._var(n.replace(/[{}]/g, '')));
    if (t.q) {
      // Nur in "…" markierte $ expandieren
      w = w.split('\u0000').map((seg, i) => (i === 0 ? seg : rep(seg))).join('');
      return [w];
    }
    if (w === '~' || w.startsWith('~/')) w = HOME + w.slice(1);
    const hadVar = /\$/.test(w);
    w = rep(w);
    if (hadVar) { const parts = w.split(/\s+/).filter(Boolean); if (parts.length !== 1) return parts; w = parts[0]; }
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

    const cmds = []; let cur = [];
    for (const t of toks) { if (t.op === '|') { cmds.push(cur); cur = []; } else cur.push(t); }
    cmds.push(cur);
    if (cmds.some(c => !c.length)) return { out: '', err: "bash: Syntaxfehler beim unerwarteten Wort '|'\n", code: 2 };

    let stdin = null, err = '', last = { out: '', code: 0 };
    for (let i = 0; i < cmds.length; i++) {
      const parsed = this._parseRedirects(cmds[i]);
      if (parsed.error) return { out: '', err: parsed.error, code: 2 };
      const { args, redirOut, append, redirErr, errToOut, redirIn } = parsed;
      if (redirIn) { const f = this._readable(redirIn, 'bash'); if (f.err) return { out: '', err: f.err, code: 1 }; stdin = f.data; }
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
    const args = []; let redirOut = null, append = false, redirErr = null, errToOut = false, redirIn = null;
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      if (t.op === '<') {
        const nx = toks[i + 1];
        if (!nx || nx.op) return { error: "bash: Syntaxfehler: Datei nach '<' fehlt\n" };
        redirIn = this._expandWord(nx)[0]; i++; continue;
      }
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
    return { args, redirOut, append, redirErr, errToOut, redirIn };
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
    if (name.includes('/')) {
      const n = this.node(name);
      if (!n) return { out: '', err: `bash: ${name}: Datei oder Verzeichnis nicht gefunden\n`, code: 127 };
      if (n.t === 'd') return { out: '', err: `bash: ${name}: Ist ein Verzeichnis\n`, code: 126 };
      if (!canDo(n, 1) || !this._traversable(name)) return { out: '', err: `bash: ${name}: Keine Berechtigung\n`, code: 126 };
      return this._runScript(name, args);
    }
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

  // Wie echtes Linux: Jeder Ordner auf dem Weg braucht das x-Recht (Durchsuchen)
  _traversable(p) {
    const parts = VFS.normalize(p, this.cwd).split('/').filter(Boolean);
    let node = this.fs.root;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!node || node.t !== 'd' || !canDo(node, 1)) return false;
      node = node.kids[parts[i]];
    }
    return !node || node.t !== 'd' || canDo(node, 1);
  }

  _readable(p, cmd) {
    const n = this.node(p);
    if (n && !this._traversable(p)) return { err: `${cmd}: ${p}: Keine Berechtigung\n` };
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
  c_exit() { if (this._depth > 1) this._exitReq = true; return this._depth > 1 ? { out: '', code: 0, exit: true } : { out: 'Die Sandbox-Shell läuft weiter – „exit“ hat hier keine Wirkung.\n', code: 0 }; }
  c_clear() { return { out: '', code: 0, clear: true }; }

  c_history() {
    return { out: this.history.map((h, i) => `${String(i + 1).padStart(5)}  ${h}`).join('\n') + '\n', code: 0 };
  }

  c_help() {
    return {
      out: 'SANDBOX-SIMULATION – verfügbare Befehle:\n' + KNOWN.join(' ') +
        (Object.keys(this.extra).filter(k => !k.startsWith('_')).length ? '\nIn diesem Raum zusätzlich: ' + Object.keys(this.extra).filter(k => !k.startsWith('_')).join(' ') : '') +
        '\nMehr: man BEFEHL oder BEFEHL --help. Pipes |, Umleitungen > >> 2>, ; && || und & am Zeilenende werden unterstützt.' +
        '\nSkripte: NAME=wert, $(…), $((…)), for … in …; do …; done, while read Z; do …; done < DATEI, if [ … ]; then …; else …; fi, ./skript.sh\n',
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

  _runScript(path, args) {
    const f = this._readable(path, 'bash'); if (f.err) return { out: '', err: f.err, code: 1 };
    const saved = { ...this.uvars };
    args.forEach((a, i) => { this.uvars[String(i + 1)] = a; });
    this.uvars['#'] = String(args.length);
    const r = this._script(f.data.replace(/^#!.*\n/, ''));
    this._exitReq = false;
    for (const k of Object.keys(this.uvars)) if (/^(\d+|#)$/.test(k)) delete this.uvars[k];
    Object.assign(this.uvars, Object.fromEntries(Object.entries(saved).filter(([k]) => /^(\d+|#)$/.test(k))));
    return { out: r.out, err: r.err, code: r.code };
  }
  c_bash(args) {
    if (!args.length) return { out: '', err: 'bash: In der Sandbox: bash SKRIPT.sh (keine neue interaktive Shell)\n', code: 2 };
    if (args[0] === '-c') return this._script(args.slice(1).join(' '));
    return this._runScript(args[0], args.slice(1));
  }
  c_sh(args) { return this.c_bash(args); }
  c_export(args) {
    for (const a of args) { const m = a.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/s); if (m) this.uvars[m[1]] = m[2]; }
    return { out: '', code: 0 };
  }
  c_read() { return { out: '', err: 'read: In der Sandbox nur als  while read ZEILE; do …; done < DATEI\n', code: 1 }; }

  c_seq(args) {
    const n = args.map(Number);
    if (!args.length || n.some(x => !Number.isFinite(x))) return { out: '', err: 'Aufruf: seq [START] ENDE  oder  seq START SCHRITT ENDE\n', code: 1 };
    const [a, st, b] = n.length === 1 ? [1, 1, n[0]] : n.length === 2 ? [n[0], 1, n[1]] : n;
    const out = []; for (let x = a; st > 0 ? x <= b : x >= b; x += st) { out.push(x); if (out.length > 10000) break; }
    return { out: out.length ? out.join('\n') + '\n' : '', code: 0 };
  }

  c_test(args) {
    const a = args[args.length - 1] === ']' ? args.slice(0, -1) : args;
    let neg = false; if (a[0] === '!') { neg = true; a.shift(); }
    let ok = false;
    if (a.length === 0) ok = false;
    else if (a.length === 1) ok = a[0] !== '';
    else if (a.length === 2) {
      const [op, v] = a; const n = this.node(v);
      ok = op === '-f' ? !!n && n.t === 'f' && this._traversable(v) : op === '-d' ? !!n && n.t === 'd' : op === '-e' ? !!n : op === '-z' ? v === '' : op === '-n' ? v !== '' : op === '-r' ? !!n && canDo(n, 4) : op === '-x' ? !!n && canDo(n, 1) : false;
    } else {
      const [x, op, y] = a; const nx = parseInt(x, 10), ny = parseInt(y, 10);
      ok = op === '=' || op === '==' ? x === y : op === '!=' ? x !== y : op === '-eq' ? nx === ny : op === '-ne' ? nx !== ny : op === '-gt' ? nx > ny : op === '-lt' ? nx < ny : op === '-ge' ? nx >= ny : op === '-le' ? nx <= ny : false;
    }
    return { out: '', code: (ok !== neg) ? 0 : 1 };
  }
  ['c_['](args) {
    if (args[args.length - 1] !== ']') return { out: '', err: '[: fehlendes „]“ (Leerzeichen vor ] nicht vergessen)\n', code: 2 };
    return this.c_test(args);
  }

  c_tr(args, stdin) {
    let del = false, sq = false; const pos = [];
    for (const a of args) { if (a === '-d') del = true; else if (a === '-s') sq = true; else if (/^-[ds]{2}$/.test(a)) { del = sq = true; } else pos.push(a); }
    const expand = (set) => {
      set = set.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\[:upper:\]/g, 'A-Z').replace(/\[:lower:\]/g, 'a-z').replace(/\[:digit:\]/g, '0-9').replace(/\[:space:\]/g, ' \t\n');
      let out = '';
      for (let i = 0; i < set.length; i++) {
        if (set[i + 1] === '-' && i + 2 < set.length) { for (let c = set.charCodeAt(i); c <= set.charCodeAt(i + 2); c++) out += String.fromCharCode(c); i += 2; }
        else out += set[i];
      }
      return out;
    };
    if (!pos.length) return { out: '', err: 'Aufruf: tr SATZ1 SATZ2  ·  tr -d SATZ  ·  tr -s SATZ\n', code: 1 };
    const s1 = expand(pos[0]), s2 = pos[1] !== undefined ? expand(pos[1]) : '';
    let text = stdin ?? '';
    if (del) text = [...text].filter(c => !s1.includes(c)).join('');
    else if (s2) text = [...text].map(c => { const i = s1.indexOf(c); return i < 0 ? c : s2[Math.min(i, s2.length - 1)]; }).join('');
    if (sq) { const set = del ? s2 || s1 : s2 || s1; text = text.replace(/(.)\1+/g, (m, c) => (set.includes(c) ? c : m)); }
    return { out: text, code: 0 };
  }

  c_sed(args, stdin) {
    const pos = args.filter(a => a !== '-e'); let n = false;
    if (pos[0] === '-n') { n = true; pos.shift(); }
    const prog = pos.shift();
    if (!prog) return { out: '', err: "Aufruf: sed 's/ALT/NEU/g' [DATEI]  ·  sed -n '5p' DATEI\n", code: 1 };
    const { parts, err } = this._inputs(pos, stdin, 'sed'); if (err) return { out: '', err, code: 2 };
    const lines = parts.map(p => p.data).join('').replace(/\n$/, '').split('\n');
    let m;
    if ((m = prog.match(/^s(.)(.*?)\1(.*?)\1([gi]*)$/s))) {
      let re; try { re = new RegExp(m[2].replace(/\\([(){}|+?])/g, '$1'), (m[4].includes('g') ? 'g' : '') + (m[4].includes('i') ? 'i' : '')); } catch { return { out: '', err: 'sed: ungültiger Ausdruck\n', code: 1 }; }
      const repl = m[3].replace(/\\n/g, '\n').replace(/&/g, '$$&').replace(/\\(\d)/g, '$$$1');
      const out = lines.map(l => l.replace(re, repl));
      return { out: n ? '' : out.join('\n') + '\n', code: 0 };
    }
    if ((m = prog.match(/^(\d+)(?:,(\d+))?([pd])$/))) {
      const a = +m[1], b = m[2] ? +m[2] : a;
      const out = lines.filter((l, i) => { const inR = i + 1 >= a && i + 1 <= b; return m[3] === 'p' ? (n ? inR : true) : !inR; });
      const extra = m[3] === 'p' && !n ? lines.filter((l, i) => i + 1 >= a && i + 1 <= b) : [];
      return { out: [...out, ...extra].join('\n') + (out.length || extra.length ? '\n' : ''), code: 0 };
    }
    if ((m = prog.match(/^\/(.*)\/d$/))) { const re = new RegExp(m[1]); const out = lines.filter(l => !re.test(l)); return { out: out.length ? out.join('\n') + '\n' : '', code: 0 }; }
    return { out: '', err: "sed: Die Sandbox kennt s/ALT/NEU/[g], Np, N,Mp (mit -n), Nd und /MUSTER/d\n", code: 1 };
  }

  c_awk(args, stdin) {
    let fs = null; const pos = [];
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '-F') fs = args[++i]; else if (args[i].startsWith('-F')) fs = args[i].slice(2); else pos.push(args[i]);
    }
    const prog = pos.shift();
    if (!prog) return { out: '', err: "Aufruf: awk -F';' '{print $2}' DATEI\n", code: 1 };
    const { parts, err } = this._inputs(pos, stdin, 'awk'); if (err) return { out: '', err, code: 2 };
    const text = parts.map(p => p.data).join('');
    const lines = text ? text.replace(/\n$/, '').split('\n') : [];
    if (fs === '\\t' || fs === '\t') fs = '\t';
    // Programm: [MUSTER] { AKTION } [END { AKTION }]
    const m = prog.trim().match(/^(?:(BEGIN\s*\{[^}]*\})\s*)?([^{]*?)\s*(?:\{([^}]*)\})?\s*(?:END\s*\{([^}]*)\})?$/);
    if (!m) return { out: '', err: 'awk: Diese Form kennt die Sandbox nicht. Beispiele: {print $1} · /MUSTER/ {print $2} · $3>100 · {s+=$2} END {print s}\n', code: 2 };
    const pattern = m[2].trim(), action = m[3] ?? (pattern ? 'print $0' : ''), endAction = m[4];
    const vars = {}; let out = '';
    const fields = (l) => { const f = fs === null ? l.trim().split(/\s+/) : l.split(fs); return f[0] === '' && fs === null ? [] : f; };
    const val = (tok, f, l, nr) => {
      tok = tok.trim();
      if (/^\$\d+$/.test(tok)) { const k = +tok.slice(1); return k === 0 ? l : (f[k - 1] ?? ''); }
      if (tok === '$NF') return f[f.length - 1] ?? '';
      if (tok === 'NF') return f.length; if (tok === 'NR') return nr;
      if (/^".*"$/.test(tok)) return tok.slice(1, -1);
      if (/^-?\d+(\.\d+)?$/.test(tok)) return Number(tok);
      if (/^[A-Za-z_]\w*$/.test(tok)) return vars[tok] ?? '';
      if (/^length\((.*)\)$/.test(tok)) return String(val(tok.match(/^length\((.*)\)$/)[1] || '$0', f, l, nr)).length;
      return '';
    };
    const cond = (pat, f, l, nr) => {
      if (!pat) return true;
      let mm;
      if ((mm = pat.match(/^!?\/(.*)\/$/))) { const hit = new RegExp(mm[1]).test(l); return pat.startsWith('!') ? !hit : hit; }
      if ((mm = pat.match(/^(\S+?)\s*(==|!=|>=|<=|>|<|~)\s*(.+)$/))) {
        const a = val(mm[1], f, l, nr); let b = mm[3].trim();
        if (mm[2] === '~') return new RegExp(b.replace(/^\/|\/$/g, '')).test(String(a));
        b = val(b, f, l, nr);
        const num = (x) => (x !== '' && !isNaN(x) ? Number(x) : x);
        const A = num(a), B = num(b);
        return mm[2] === '==' ? A == B : mm[2] === '!=' ? A != B : mm[2] === '>' ? A > B : mm[2] === '<' ? A < B : mm[2] === '>=' ? A >= B : A <= B;
      }
      return false;
    };
    const run = (act, f, l, nr) => {
      for (const stmt of act.split(';').map(x => x.trim()).filter(Boolean)) {
        let mm;
        if ((mm = stmt.match(/^print\s*(.*)$/))) {
          const expr = mm[1].trim() || '$0';
          const items = []; let cur = '', q = false;
          for (const ch of expr) { if (ch === '"') q = !q; if (ch === ',' && !q) { items.push(cur); cur = ''; } else cur += ch; }
          items.push(cur);
          out += items.map(it => it.trim().split(/\s+(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(t => val(t, f, l, nr)).join('')).join(' ') + '\n';
        } else if ((mm = stmt.match(/^([A-Za-z_]\w*)\s*(\+=|-=|=)\s*(.+)$/))) {
          const v = val(mm[3], f, l, nr);
          if (mm[2] === '=') vars[mm[1]] = v; else vars[mm[1]] = (Number(vars[mm[1]]) || 0) + (mm[2] === '+=' ? 1 : -1) * (Number(v) || 0);
        } else if ((mm = stmt.match(/^([A-Za-z_]\w*)\+\+$/))) vars[mm[1]] = (Number(vars[mm[1]]) || 0) + 1;
        else throw new Error('Unbekannte Aktion: ' + stmt);
      }
    };
    try {
      lines.forEach((l, i) => { const f = fields(l); if (cond(pattern, f, l, i + 1)) run(action || 'print $0', f, l, i + 1); });
      if (endAction !== undefined) run(endAction, [], '', lines.length);
    } catch (e) { return { out, err: 'awk: ' + e.message + ' (Sandbox kennt print, VAR+=, VAR++, VAR=)\n', code: 2 }; }
    return { out, code: 0 };
  }

  _hashCmd(args, stdin, name, fn) {
    const { parts, err } = this._inputs(args.filter(a => !a.startsWith('-')), stdin, name);
    return { out: parts.map(p => `${fn(p.data)}  ${p.name ?? '-'}\n`).join(''), err, code: err ? 1 : 0 };
  }
  c_sha256sum(args, stdin) { return this._hashCmd(args, stdin, 'sha256sum', sha256hex); }
  c_md5sum(args, stdin) { return this._hashCmd(args, stdin, 'md5sum', md5hex); }

  c_xxd(args, stdin) {
    const rev = args.includes('-r'), plain = args.includes('-p') || args.includes('-ps');
    const { parts, err } = this._inputs(args.filter(a => !a.startsWith('-')), stdin, 'xxd'); if (err) return { out: '', err, code: 2 };
    const data = parts.map(p => p.data).join('');
    if (rev) {
      if (!plain) return { out: '', err: 'xxd: In der Sandbox geht -r nur zusammen mit -p (xxd -r -p)\n', code: 1 };
      const hex = data.replace(/[^0-9a-fA-F]/g, '');
      const bytes = []; for (let i = 0; i + 1 < hex.length; i += 2) bytes.push(parseInt(hex.slice(i, i + 2), 16));
      return { out: bytesToText(bytes), code: 0 };
    }
    const b = [...utf8(data)];
    if (plain) { let out = ''; for (let i = 0; i < b.length; i += 30) out += b.slice(i, i + 30).map(x => x.toString(16).padStart(2, '0')).join('') + '\n'; return { out, code: 0 }; }
    let out = '';
    for (let i = 0; i < b.length; i += 16) {
      const row = b.slice(i, i + 16);
      const hex = row.map(x => x.toString(16).padStart(2, '0')).join('').replace(/(.{4})/g, '$1 ').trim();
      out += `${i.toString(16).padStart(8, '0')}: ${hex.padEnd(39)}  ${row.map(x => (x >= 32 && x < 127 ? String.fromCharCode(x) : '.')).join('')}\n`;
    }
    return { out, code: 0 };
  }

  c_strings(args, stdin) {
    const { vals, pos } = this._opts(args, ['n']);
    const min = vals.n ? parseInt(vals.n, 10) : 4;
    const { parts, err } = this._inputs(pos, stdin, 'strings');
    const out = parts.map(p => (p.data.match(new RegExp(`[\\x20-\\x7e\\t]{${min},}`, 'g')) || []).join('\n')).filter(Boolean).join('\n');
    return { out: out ? out + '\n' : '', err, code: err ? 1 : 0 };
  }

  c_basename(args) { if (!args[0]) return { out: '', err: 'basename: Operand fehlt\n', code: 1 }; let b = args[0].replace(/\/+$/, '').split('/').pop(); if (args[1] && b.endsWith(args[1])) b = b.slice(0, -args[1].length); return { out: b + '\n', code: 0 }; }
  c_dirname(args) { if (!args[0]) return { out: '', err: 'dirname: Operand fehlt\n', code: 1 }; const p = args[0].replace(/\/+$/, ''); const i = p.lastIndexOf('/'); return { out: (i < 0 ? '.' : i === 0 ? '/' : p.slice(0, i)) + '\n', code: 0 }; }

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
      else if (a === '-empty') tests.push((n) => (n.t === 'f' ? n.data.length === 0 : Object.keys(n.kids).length === 0));
      else if (a === '-size') {
        const m = String(v ?? '').match(/^([+-]?)(\d+)([ckM]?)$/);
        if (!m) return { out: '', err: 'find: -size erwartet z. B. 33c (Bytes), +1k, -100c\n', code: 1 };
        const unit = m[3] === 'c' ? 1 : m[3] === 'M' ? 1048576 : m[3] === 'k' ? 1024 : 512;
        const want = +m[2] * unit;
        tests.push((n) => { if (n.t !== 'f') return false; const sz = new TextEncoder().encode(n.data).length; const sizeU = m[3] === 'c' ? sz : Math.ceil(sz / unit); return m[1] === '+' ? sizeU > +m[2] : m[1] === '-' ? sizeU < +m[2] : (m[3] === 'c' ? sz === want : sizeU === +m[2]); });
        i++;
      }
      else if (a === '-perm') { const want = v.replace(/^[-/]/, ''); const m = Shell.applyMode(0, want); const any = v.startsWith('/'); const all = v.startsWith('-'); tests.push((n) => { const mm = n.mode & 0o777; return all ? (mm & m) === m : any ? (mm & m) !== 0 : mm === m; }); i++; }
      else return { out: '', err: `find: Unbekannte Bedingung „${a}“ (Sandbox kennt -name, -iname, -type, -maxdepth, -perm, -size, -empty)\n`, code: 1 };
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
      let src = flags.has('F') ? pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : flags.has('E') ? pat : breToJs(pat);
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
    const multi = !flags.has('h') && (files.length > 1 || flags.has('r') || flags.has('R'));
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
        if (flags.has('o') && !flags.has('v')) {
          const g = new RegExp(re.source, re.flags + 'g');
          for (const m of l.matchAll(g)) if (m[0]) out += (multi ? f.p + ':' : '') + (flags.has('n') ? (idx + 1) + ':' : '') + m[0] + '\n';
          return;
        }
        out += (multi ? f.p + ':' : '') + (flags.has('n') ? (idx + 1) + ':' : '') + l + '\n';
      });
      if (flags.has('c')) out += (multi ? f.p + ':' : '') + count + '\n';
      if (flags.has('l') && count) out += f.p + '\n';
    }
    if (flags.has('q')) out = '';
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
      p.cols = []; if (sel.has('l')) p.cols.push(l); if (sel.has('w')) p.cols.push(w); if (sel.has('c')) p.cols.push(c);
    }
    // Wie GNU wc: bei mehreren Dateien rechtsbündig auf die Breite der Gesamtsumme
    const totCols = []; if (sel.has('l')) totCols.push(tot[0]); if (sel.has('w')) totCols.push(tot[1]); if (sel.has('c')) totCols.push(tot[2]);
    const width = parts.length > 1 ? Math.max(...totCols.map(x => String(x).length)) : sel.size > 1 ? 7 : 1;
    for (const p of parts) out += (p.name === null && p.cols.length === 1 ? String(p.cols[0]) : p.cols.map(x => String(x).padStart(width)).join(' ')) + (p.name ? ' ' + p.name : '') + '\n';
    if (parts.length > 1) out += totCols.map(x => String(x).padStart(width)).join(' ') + ' insgesamt\n';
    return { out, err, code: err ? 1 : 0 };
  }

  _headTail(args, stdin, tail) {
    const norm = args.map(a => /^-\d+$/.test(a) ? ['-n', a.slice(1)] : [a]).flat();
    const { vals, pos } = this._opts(norm, ['n', 'c']);
    const n = vals.n !== undefined ? parseInt(vals.n, 10) : 10;
    const { parts, err } = this._inputs(pos, stdin, tail ? 'tail' : 'head');
    let out = '';
    if (vals.c !== undefined) { const c = parseInt(vals.c, 10); for (const p of parts) out += tail ? p.data.slice(-c) : p.data.slice(0, c); return { out, err, code: err ? 1 : 0 }; }
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
    const { flags, vals, pos } = this._opts(args, ['t', 'k']);
    const { parts, err } = this._inputs(pos, stdin, 'sort');
    let lines = parts.map(p => p.data).join('').replace(/\n$/, '').split('\n').filter((l, i, a) => !(a.length === 1 && l === ''));
    const kn = vals.k ? parseInt(vals.k, 10) : 0;
    const keyNum = vals.k && /n/.test(vals.k.replace(/^\d+(,\d+)?/, ''));
    const key = (l) => { if (!kn) return l; const f = vals.t !== undefined ? l.split(vals.t) : l.trim().split(/\s+/); return f.slice(kn - 1).join(vals.t ?? ' '); };
    const num = flags.has('n') || keyNum;
    lines.sort(num ? (a, b) => (parseFloat(key(a)) || 0) - (parseFloat(key(b)) || 0) : (a, b) => key(a).localeCompare(key(b)));
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
    const out = res.filter(([l]) => l !== '' || lines.length > 1).filter(([, c]) => (flags.has('u') ? c === 1 : flags.has('d') ? c > 1 : true)).map(([l, c]) => flags.has('c') ? `${String(c).padStart(7)} ${l}` : l).join('\n');
    return { out: out ? out + '\n' : '', err, code: err ? 1 : 0 };
  }

  c_cut(args, stdin) {
    const { vals, pos } = this._opts(args, ['d', 'f', 'c']);
    if (!vals.f && !vals.c) return { out: '', err: 'cut: Sie müssen eine Liste von Feldern (-f) oder Zeichen (-c) angeben\n', code: 1 };
    const sel = (spec, n) => { // "1-3,5,7-" -> Indizes (0-basiert)
      const out = [];
      for (const part of String(spec).split(',')) {
        const m = part.match(/^(\d*)-(\d*)$/);
        if (m) { const a = m[1] ? +m[1] : 1, b = m[2] ? +m[2] : n; for (let i = a; i <= b; i++) out.push(i - 1); }
        else if (/^\d+$/.test(part)) out.push(+part - 1);
      }
      return out;
    };
    const { parts, err } = this._inputs(pos, stdin, 'cut');
    const lines = parts.map(p => p.data).join('').replace(/\n$/, '').split('\n');
    if (vals.c) return { out: lines.map(l => { const ch = [...l]; return sel(vals.c, ch.length).map(i => ch[i] ?? '').join(''); }).join('\n') + '\n', err, code: 0 };
    const d = vals.d ?? '\t';
    return { out: lines.map(l => { const s = l.split(d); return s.length === 1 ? l : sel(vals.f, s.length).map(f => s[f]).filter(x => x !== undefined).join(d); }).join('\n') + '\n', err, code: 0 };
  }

  c_diff(args) {
    const pos = args.filter(a => !a.startsWith('-'));
    if (pos.length !== 2) return { out: '', err: 'Aufruf: diff DATEI1 DATEI2\n', code: 2 };
    const A = this._readable(pos[0], 'diff'), B = this._readable(pos[1], 'diff');
    if (A.err || B.err) return { out: '', err: (A.err || '') + (B.err || ''), code: 2 };
    const a = A.data.replace(/\n$/, '').split('\n'), b = B.data.replace(/\n$/, '').split('\n');
    if (a.length * b.length > 4e6) return { out: '', err: 'diff: Dateien zu groß für die Sandbox\n', code: 2 };
    // LCS-Tabelle, dann Änderungen im Normalformat (NcM, NdM, NaM)
    const L = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
    for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const hunks = []; let i = 0, j = 0, cur = null;
    const flush = () => { if (cur) { hunks.push(cur); cur = null; } };
    while (i < a.length || j < b.length) {
      if (i < a.length && j < b.length && a[i] === b[j]) { flush(); i++; j++; }
      else if (j < b.length && (i >= a.length || L[i][j + 1] >= L[i + 1][j])) { (cur ||= { ai: i, bj: j, del: [], add: [] }).add.push(b[j++]); }
      else { (cur ||= { ai: i, bj: j, del: [], add: [] }).del.push(a[i++]); }
    }
    flush();
    const rng = (s, n) => (n <= 1 ? String(s + (n ? 1 : 0)) : `${s + 1},${s + n}`);
    let out = '';
    for (const h of hunks) {
      const op = h.del.length && h.add.length ? 'c' : h.del.length ? 'd' : 'a';
      out += `${h.del.length ? rng(h.ai, h.del.length) : h.ai}${op}${h.add.length ? rng(h.bj, h.add.length) : h.bj}\n`;
      out += h.del.map(x => '< ' + x + '\n').join('');
      if (op === 'c') out += '---\n';
      out += h.add.map(x => '> ' + x + '\n').join('');
    }
    return { out, code: out ? 1 : 0 };
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
