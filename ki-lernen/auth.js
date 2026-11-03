// Anmeldung für die KI-Werkstatt – austauschbar.
//
// Vertrag: createAuth(env) liefert { authenticate(req) }.
//   authenticate(req) → { id, name }   angemeldet und berechtigt (id ist stabil und enthält kein Geheimnis;
//                                        Budget, Rate-Limit und Parallel-Bremse hängen an id)
//                     → { blocked: true } zu viele Fehlversuche von dieser IP
//                     → null              nicht angemeldet / nicht berechtigt
//
// Heute: Einladungscodes (Header X-Invite-Code).
// Später (Nachtfalter-Konto, siehe docs/SERVER-ABSPRACHEN.md): Supabase-JWT im Header
// „Authorization: Bearer …“ prüfen und Entitlement „ki“ oder „alles“ mit gueltig_bis > jetzt verlangen.
// Dann liefert authenticate { id: 'user:<supabase-uuid>', name } – der Rest des Servers bleibt unverändert.
import crypto from 'node:crypto';

// Echte Absender-IP: X-Forwarded-For nur glauben, wenn die Anfrage vom lokalen Plesk-nginx kommt.
export function clientIp(req) {
  const peer = req.socket.remoteAddress || '';
  const local = peer === '127.0.0.1' || peer === '::1' || peer === '::ffff:127.0.0.1';
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',').pop().trim();
  return local && fwd ? fwd : peer;
}

// Fehlversuche pro IP: höchstens 10 in 15 Minuten, sonst Sperre (gegen Durchprobieren).
// Gilt für jede Anmeldeart.
function makeLockout(max = 10, windowMs = 15 * 60_000) {
  const failures = new Map();
  const recent = (ip) => {
    const list = (failures.get(ip) || []).filter((t) => Date.now() - t < windowMs);
    failures.set(ip, list);
    return list;
  };
  return { blocked: (ip) => recent(ip).length >= max, fail: (ip) => recent(ip).push(Date.now()) };
}

const digest = (s) => crypto.createHash('sha256').update(String(s)).digest();

// Einladungscodes "CODE:Name,CODE2:Name2"
export function parseCodes(raw) {
  return new Map(
    String(raw || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const [code, ...name] = s.split(':');
        return [code.trim(), name.join(':').trim() || code.trim()];
      }),
  );
}

export function createCodeAuth(codes) {
  const lockout = makeLockout();
  // Zeitkonstant vergleichen (Hash auf feste Länge, dann timingSafeEqual).
  const entries = [...codes.entries()].map(([code, name]) => ({
    d: digest(code),
    // Budget-Schlüssel ohne Klartext-Code, damit data/usage.json keine Codes verrät
    id: 'code:' + digest('kiw:' + code).toString('hex').slice(0, 16),
    name,
  }));
  return {
    kind: 'codes',
    count: entries.length,
    authenticate(req) {
      const ip = clientIp(req);
      if (lockout.blocked(ip)) return { blocked: true };
      const given = String(req.headers['x-invite-code'] || '').trim();
      if (!given) return null;
      const d = digest(given);
      let hit = null;
      for (const e of entries) if (crypto.timingSafeEqual(d, e.d)) hit = e;
      if (!hit) {
        lockout.fail(ip);
        return null;
      }
      return { id: hit.id, name: hit.name };
    },
  };
}

// Auswahl über die Umgebung. AUTH_MODE=supabase ist vorbereitet, aber noch nicht gebaut.
export function createAuth(env = process.env) {
  const mode = env.AUTH_MODE || 'codes';
  if (mode === 'codes') return createCodeAuth(parseCodes(env.INVITE_CODES));
  throw new Error(`AUTH_MODE=${mode} ist noch nicht umgesetzt (geplant: supabase).`);
}
