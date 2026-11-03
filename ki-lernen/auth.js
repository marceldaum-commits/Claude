// Anmeldung für die KI-Werkstatt – austauschbar.
//
// Vertrag: createAuth(env) liefert { authenticate(req) }.
//   authenticate(req) → { id, name, budgetUsd? }  angemeldet und berechtigt (budgetUsd: eigenes Monatsbudget) (id ist stabil und enthält kein Geheimnis;
//                                        Budget, Rate-Limit und Parallel-Bremse hängen an id)
//                     → { blocked: true } zu viele Fehlversuche von dieser IP
//                     → { noAccess: true }  angemeldet, aber ohne gültigen Zugang (Konto-Modus)
//                     → null              nicht angemeldet
// authenticate darf ein Promise liefern.
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

// ---------------------------------------------------------------------------------------------
// Nachtfalter-Konto (Supabase): JWT aus „Authorization: Bearer …“ gegen die JWKS des Projekts prüfen,
// dann Zugang in public.entitlements nachsehen (produkt ki|alles, gueltig_bis > jetzt).
// Ohne Fremdbibliothek: ES256/RS256 über node:crypto.

const b64url = (s) => Buffer.from(s, 'base64url');
const ALGS = {
  ES256: { hash: 'sha256', dsaEncoding: 'ieee-p1363', kty: 'EC', crv: 'P-256' },
  RS256: { hash: 'sha256', kty: 'RSA' },
};

export function verifyJwt(token, keys, { issuer, audience, now = Date.now() / 1000 } = {}) {
  const parts = String(token).split('.');
  if (parts.length !== 3) return null;
  let header, payload;
  try {
    header = JSON.parse(b64url(parts[0]).toString('utf8'));
    payload = JSON.parse(b64url(parts[1]).toString('utf8'));
  } catch {
    return null;
  }
  const alg = ALGS[header.alg];
  const key = keys.get(header.kid);
  if (!alg || !key || (key.alg && key.alg !== header.alg)) return null;
  if (key.kty !== alg.kty || (alg.crv && key.crv !== alg.crv)) return null;
  const ok = crypto.verify(alg.hash, Buffer.from(`${parts[0]}.${parts[1]}`),
    { key: key.pub, dsaEncoding: alg.dsaEncoding }, b64url(parts[2]));
  if (!ok) return null;
  const skew = 30;
  if (typeof payload.exp !== 'number' || payload.exp + skew < now) return null;
  if (typeof payload.nbf === 'number' && payload.nbf - skew > now) return null;
  if (issuer && payload.iss !== issuer) return null;
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (audience && !aud.includes(audience)) return null;
  if (payload.role !== 'authenticated' || !/^[0-9a-f-]{36}$/i.test(payload.sub || '')) return null;
  if (payload.is_anonymous === true) return null; // anonyme Supabase-Nutzer haben auch role=authenticated
  return payload;
}

export function createSupabaseAuth({ url, serviceKey, defaultBudget, fetchImpl = fetch }) {
  if (!url || !serviceKey) throw new Error('AUTH_MODE=supabase braucht SUPABASE_URL und SUPABASE_SERVICE_KEY in .env');
  const base = url.replace(/\/+$/, '');
  const issuer = `${base}/auth/v1`;
  let keys = new Map();
  let keysAt = 0;
  let lastForced = 0;

  async function loadKeys(force = false) {
    const age = Date.now() - keysAt;
    if (!force && keys.size && age < 10 * 60_000) return;
    if (force) {
      if (Date.now() - lastForced < 30_000) return; // unbekannte kid: höchstens alle 30 s nachladen
      lastForced = Date.now();
    }
    let list;
    try {
      const res = await fetchImpl(`${issuer}/.well-known/jwks.json`);
      if (!res.ok) throw new Error(`JWKS ${res.status}`);
      ({ keys: list = [] } = await res.json());
    } catch (err) {
      console.error('Anmeldeschlüssel nicht ladbar:', err.message);
      if (keys.size) { keysAt = Date.now() - 9 * 60_000; return; } // mit alten Schlüsseln weiter, in 1 Min erneut versuchen
      throw unavailable();
    }
    const next = new Map();
    for (const jwk of list) {
      try {
        next.set(jwk.kid, { alg: jwk.alg, kty: jwk.kty, crv: jwk.crv, pub: crypto.createPublicKey({ key: jwk, format: 'jwk' }) });
      } catch { /* unbekannter Schlüsseltyp */ }
    }
    keys = next;
    keysAt = Date.now();
  }

  // Neue Supabase-Schlüssel (sb_secret_…) nur als apikey; alte service_role-JWTs zusätzlich als Bearer.
  const headers = { apikey: serviceKey, Accept: 'application/json' };
  if (serviceKey.startsWith('eyJ')) headers.Authorization = `Bearer ${serviceKey}`;

  const unavailable = () => Object.assign(new Error('Die Anmeldung ist gerade nicht erreichbar. Bitte gleich nochmal versuchen.'), { status: 503 });
  // 4) Zugangs-Cache mit Obergrenze: abgelaufene Einträge zuerst, sonst die ältesten entfernen
  const cache = new Map(); // user_id → { until, value }
  const MAX_CACHE = 5000;
  function remember(userId, value) {
    if (cache.size >= MAX_CACHE) {
      const t = Date.now();
      for (const [k, v] of cache) if (v.until <= t) cache.delete(k);
      while (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
    }
    cache.set(userId, { until: Date.now() + 60_000, value });
  }
  async function lookup(userId) {
    const hit = cache.get(userId);
    if (hit && hit.until > Date.now()) return hit.value;
    const now = new Date().toISOString();
    const q = (path) => fetchImpl(`${base}/rest/v1/${path}`, { headers }).then((r) => {
      if (!r.ok) throw new Error(`Supabase ${r.status}`);
      return r.json();
    }).catch((err) => {
      console.error('Zugangsabfrage fehlgeschlagen:', err.message);
      throw unavailable();
    });
    const [ents, profs] = await Promise.all([
      q(`entitlements?select=produkt,gueltig_bis,ki_budget_usd&user_id=eq.${userId}&produkt=in.(ki,alles)&gueltig_bis=gt.${encodeURIComponent(now)}`),
      q(`profiles?select=display_name&id=eq.${userId}`),
    ]);
    let value = null;
    if (ents.length) {
      const budgets = ents.map((e) => e.ki_budget_usd).filter((b) => b !== null && b !== undefined).map(Number);
      value = {
        budgetUsd: budgets.length ? Math.max(...budgets) : defaultBudget,
        until: ents.map((e) => e.gueltig_bis).sort().pop(),
        name: profs[0]?.display_name || '',
      };
    }
    remember(userId, value);
    return value;
  }

  return {
    kind: 'supabase',
    count: 0,
    // Keine IP-Sperre: Signaturen kann man nicht erraten, und abgelaufene Tokens echter Nutzer sollen nicht sperren.
    async authenticate(req) {
      const m = /^Bearer\s+(\S+)$/i.exec(String(req.headers.authorization || ''));
      if (!m) return null;
      await loadKeys();
      const opts = { issuer, audience: 'authenticated' };
      let claims = verifyJwt(m[1], keys, opts);
      if (!claims) {
        // Vielleicht neuer Schlüssel (Rotation): einmal nachladen und erneut prüfen
        const kid = (() => { try { return JSON.parse(b64url(m[1].split('.')[0])).kid; } catch { return null; } })();
        if (kid && !keys.has(kid)) {
          await loadKeys(true);
          claims = verifyJwt(m[1], keys, opts);
        }
      }
      if (!claims) return null;
      const ent = await lookup(claims.sub);
      if (!ent) return { noAccess: true };
      return { id: `user:${claims.sub}`, name: ent.name || 'Nachtfalter', budgetUsd: ent.budgetUsd, until: ent.until };
    },
  };
}

// Auswahl über die Umgebung.
export function createAuth(env = process.env, defaults = {}) {
  const mode = env.AUTH_MODE || 'codes';
  if (mode === 'codes') return createCodeAuth(parseCodes(env.INVITE_CODES));
  if (mode === 'supabase') {
    return createSupabaseAuth({ url: env.SUPABASE_URL, serviceKey: env.SUPABASE_SERVICE_KEY, defaultBudget: defaults.budgetUsd });
  }
  throw new Error(`Unbekannter AUTH_MODE=${mode} (erlaubt: codes, supabase)`);
}
