// Prüfung eingefügter Belege aus dem ECHTEN Terminal (Kali-VM oder Termux).
// Ehrliche Grenze: Die App prüft Form, Inhalt und Plausibilität der eingefügten Ausgabe.
// Sie kann nicht beweisen, dass die Ausgabe wirklich auf deinem Gerät entstanden ist.
// Der persönliche Lab-Token (aus dem Setup-Skript) macht Abschreiben aus fremden Quellen sinnlos.

const PRIVATE_V4 = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

// Extrahiert Ziele (Hosts/IPs/URLs) aus einer Befehlszeile
export function extractTargets(cmd) {
  const targets = new Set();
  const urlRe = /\b(?:https?|ftp):\/\/(\[[^\]]+\]|[^/\s:'"]+)/gi;
  let m;
  while ((m = urlRe.exec(cmd))) targets.add(m[1].replace(/^\[|\]$/g, '').toLowerCase());
  const ipRe = /(?<![\w.])(\d{1,3}(?:\.\d{1,3}){3})(?:\/\d+)?(?![\w.])/g;
  while ((m = ipRe.exec(cmd))) targets.add(m[1]);
  return [...targets];
}

export function isLoopback(t) {
  return /^127\./.test(t) || t === 'localhost' || t === '::1' || t === 'ip6-localhost';
}

// Scope-Prüfung: Standard nur Loopback. allow kann weitere ausdrücklich genannte Ziele enthalten.
export function scopeCheck(cmd, allow = []) {
  const bad = extractTargets(cmd).filter(t => !isLoopback(t) && !allow.includes(t));
  if (!bad.length) return { ok: true };
  return {
    ok: false,
    msg: `STOPP – Scope verletzt: ${bad.join(', ')} ist kein freigegebenes Ziel. ` +
      'Diese Übung erlaubt nur 127.0.0.1/localhost auf deinem eigenen Gerät. Nichts davon ausführen; falls schon geschehen: abbrechen (Strg+C) und den Vorfall im Bericht notieren.',
    private: bad.some(b => PRIVATE_V4.test(b)),
  };
}

// Normalisiert eingefügten Text (Windows-Zeilenenden, ANSI-Farben, nbsp)
export function cleanPaste(s) {
  return String(s || '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u001b\[[0-9;?]*[A-Za-z]/g, '')
    .replace(/ /g, ' ')
    .trim();
}

// Sensible Inhalte, die NIE eingefügt werden sollen
const SECRET_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bsk-[A-Za-z0-9]{20,}/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bghp_[A-Za-z0-9]{30,}/,
  /\beyJhbGciOi[A-Za-z0-9_-]{20,}/,
];

export function containsSecret(s) {
  return SECRET_PATTERNS.some(re => re.test(s));
}

/**
 * spec = {
 *   commandRe: RegExp | [RegExp]  – der verwendete Befehl muss passen (Form, nicht exakter Text)
 *   commandHint: string           – Rückfrage, falls der Befehl nicht passt
 *   criteria: [{ re | test(output, ctx), label, rueckfrage }]
 *   needToken: bool               – Ausgabe muss den persönlichen Lab-Token enthalten
 *   allowTargets: [string]
 * }
 * input = { command, output, token }
 */
export function verifyEvidence(spec, input) {
  const command = cleanPaste(input.command).replace(/^\S*[$#]\s+/, ''); // Prompt-Reste entfernen
  const output = cleanPaste(input.output);
  const results = [];

  if (!command) return { ok: false, results: [{ ok: false, label: 'Befehl eingetragen', rueckfrage: 'Welchen Befehl hast du im echten Terminal genau eingegeben? Trage ihn ein.' }] };
  if (!output) return { ok: false, results: [{ ok: false, label: 'Ausgabe eingefügt', rueckfrage: 'Füge die tatsächliche Ausgabe deines Terminals ein – nicht abgetippt, nicht zusammengefasst.' }] };
  if (containsSecret(command + '\n' + output)) {
    return { ok: false, secret: true, results: [{ ok: false, label: 'Keine Geheimnisse', rueckfrage: 'Die Eingabe sieht nach einem echten Schlüssel/Token aus. Entferne ihn sofort – Übungen brauchen niemals echte Zugangsdaten.' }] };
  }

  const scope = scopeCheck(command, spec.allowTargets || []);
  if (!scope.ok) return { ok: false, scopeViolation: true, results: [{ ok: false, label: 'Scope verletzt', rueckfrage: scope.msg }] };
  results.push({ ok: true, label: 'Scope eingehalten (nur freigegebene Ziele)' });

  if (spec.commandRe) {
    const res = Array.isArray(spec.commandRe) ? spec.commandRe : [spec.commandRe];
    const ok = res.every(re => re.test(command));
    results.push({ ok, label: spec.commandLabel || 'Passender Befehl verwendet', rueckfrage: spec.commandHint || 'Passt dein Befehl zum Auftrag? Prüfe Befehlsname, Optionen und Ziel noch einmal gegen die Lektion.' });
  }

  const ctx = { command, output, token: input.token };
  for (const c of spec.criteria || []) {
    let ok;
    try { ok = c.test ? !!c.test(output, ctx) : c.re.test(output); } catch { ok = false; }
    results.push({ ok, label: c.label, rueckfrage: c.rueckfrage });
  }

  if (spec.needToken) {
    const ok = !!input.token && output.includes(input.token);
    results.push({ ok, label: 'Dein persönlicher Lab-Token ist in der Ausgabe', rueckfrage: 'Die Ausgabe enthält deinen Lab-Token nicht. Hast du das Setup-Skript aus DIESER App ausgeführt und arbeitest im richtigen Lab-Ordner?' });
  }

  return { ok: results.every(r => r.ok), results, command, output };
}

// Normalisierte Textantwort vergleichen (Knobel-/Story-Antworten)
export function normAnswer(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/^["']|["']$/g, '');
}
