// Nachtfalter-Konto: JWT-Prüfung und Zugangsabfrage gegen eine nachgebaute Supabase (keine echten Konten).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createSupabaseAuth, createCodeAuth, parseCodes } from '../auth.js';

const URL_ = 'https://demo.supabase.co';
const ISS = `${URL_}/auth/v1`;
const UID = '11111111-2222-3333-4444-555555555555';
const UID2 = '99999999-2222-3333-4444-555555555555';

function keypair(kid) {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  return { kid, privateKey, jwk: { ...publicKey.export({ format: 'jwk' }), kid, alg: 'ES256', use: 'sig' } };
}
function sign(k, claims, header = {}) {
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const h = enc({ alg: 'ES256', typ: 'JWT', kid: k.kid, ...header });
  const p = enc(claims);
  const sig = crypto.sign('sha256', Buffer.from(`${h}.${p}`), { key: k.privateKey, dsaEncoding: 'ieee-p1363' });
  return `${h}.${p}.${sig.toString('base64url')}`;
}
const now = () => Math.floor(Date.now() / 1000);
const good = (sub = UID, extra = {}) => ({ sub, iss: ISS, aud: 'authenticated', role: 'authenticated', exp: now() + 3600, ...extra });

function setup({ ents = {}, profiles = {}, jwks }) {
  const calls = [];
  const fetchImpl = async (url, opts = {}) => {
    calls.push({ url, headers: opts.headers || {} });
    const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
    if (url === `${ISS}/.well-known/jwks.json`) return json({ keys: jwks() });
    const m = /user_id=eq\.([0-9a-f-]+)/.exec(url) || /id=eq\.([0-9a-f-]+)/.exec(url);
    if (url.includes('/rest/v1/entitlements')) return json(ents[m[1]] || []);
    if (url.includes('/rest/v1/profiles')) return json(profiles[m[1]] ? [{ display_name: profiles[m[1]] }] : []);
    return json({}, 404);
  };
  return { calls, fetchImpl };
}
const req = (token) => ({ headers: token ? { authorization: `Bearer ${token}` } : {}, socket: { remoteAddress: '127.0.0.1' } });
const future = new Date(Date.now() + 86400e3).toISOString();

test('gültiges Token mit Zugang „ki“ → angemeldet, eigenes Budget = Maximum', async () => {
  const k = keypair('k1');
  const { fetchImpl, calls } = setup({
    jwks: () => [k.jwk],
    ents: { [UID]: [{ produkt: 'ki', gueltig_bis: future, ki_budget_usd: null }, { produkt: 'alles', gueltig_bis: future, ki_budget_usd: '5.00' }] },
    profiles: { [UID]: 'Lina' },
  });
  const auth = createSupabaseAuth({ url: URL_ + '/', serviceKey: 'sb_secret_test', defaultBudget: 2, fetchImpl });
  const u = await auth.authenticate(req(sign(k, good())));
  assert.deepEqual({ id: u.id, name: u.name, budgetUsd: u.budgetUsd }, { id: `user:${UID}`, name: 'Lina', budgetUsd: 5 });
  // Neuer Schlüssel nur als apikey, nicht als Bearer
  const rest = calls.find((c) => c.url.includes('/rest/v1/entitlements'));
  assert.equal(rest.headers.apikey, 'sb_secret_test');
  assert.equal(rest.headers.Authorization, undefined);
  assert.match(rest.url, /produkt=in\.\(ki,alles\)/);
  assert.match(rest.url, /gueltig_bis=gt\./);
});

test('ohne gültigen Zugang → noAccess; Standardbudget, wenn ki_budget_usd leer', async () => {
  const k = keypair('k1');
  const { fetchImpl } = setup({ jwks: () => [k.jwk], ents: { [UID2]: [{ produkt: 'ki', gueltig_bis: future, ki_budget_usd: null }] } });
  const auth = createSupabaseAuth({ url: URL_, serviceKey: 'sb_secret_test', defaultBudget: 2, fetchImpl });
  assert.deepEqual(await auth.authenticate(req(sign(k, good(UID)))), { noAccess: true });
  const u = await auth.authenticate(req(sign(k, good(UID2))));
  assert.equal(u.budgetUsd, 2);
  assert.equal(u.name, 'Nachtfalter');
});

test('abgelaufen, falscher Aussteller, falsche Rolle, manipuliert oder fremder Schlüssel → abgelehnt', async () => {
  const k = keypair('k1');
  const evil = keypair('k1'); // gleiche kid, anderer Schlüssel
  const { fetchImpl } = setup({ jwks: () => [k.jwk], ents: { [UID]: [{ produkt: 'ki', gueltig_bis: future, ki_budget_usd: null }] } });
  const auth = createSupabaseAuth({ url: URL_, serviceKey: 'sb_secret_test', defaultBudget: 2, fetchImpl });
  const bad = [
    sign(k, good(UID, { exp: now() - 3600 })),
    sign(k, good(UID, { iss: 'https://evil.example/auth/v1' })),
    sign(k, good(UID, { role: 'anon' })),
    sign(k, good(UID, { aud: 'other' })),
    sign(evil, good()),
    sign(k, good()).replace(/\.([^.]+)\./, (m, p) => `.${Buffer.from(JSON.stringify({ ...good(), sub: UID2 })).toString('base64url')}.`),
    sign(k, good(), { alg: 'none' }),
    'kein.jwt',
  ];
  for (const t of bad) assert.equal(await auth.authenticate(req(t)), null, t.slice(0, 30));
  assert.equal(await auth.authenticate(req(null)), null);
});

test('Schlüsselwechsel: unbekannte kid lädt die JWKS neu', async () => {
  const k1 = keypair('k1');
  const k2 = keypair('k2');
  let current = [k1.jwk];
  const { fetchImpl, calls } = setup({ jwks: () => current, ents: { [UID]: [{ produkt: 'alles', gueltig_bis: future, ki_budget_usd: null }] } });
  const auth = createSupabaseAuth({ url: URL_, serviceKey: 'eyJlegacy', defaultBudget: 2, fetchImpl });
  assert.ok((await auth.authenticate(req(sign(k1, good())))).id);
  current = [k1.jwk, k2.jwk];
  assert.ok((await auth.authenticate(req(sign(k2, good())))).id);
  assert.equal(calls.filter((c) => c.url.endsWith('jwks.json')).length, 2);
  // Alter service_role-JWT: zusätzlich als Bearer
  assert.equal(calls.find((c) => c.url.includes('/rest/v1/')).headers.Authorization, 'Bearer eyJlegacy');
});

test('Einladungscodes: Hash-ID statt Klartext, Sperre nach 10 Fehlversuchen', () => {
  const auth = createCodeAuth(parseCodes('ABC:Anna'));
  const r = (code) => auth.authenticate({ headers: { 'x-invite-code': code }, socket: { remoteAddress: '10.0.0.9' } });
  const u = r('ABC');
  assert.equal(u.name, 'Anna');
  assert.match(u.id, /^code:[0-9a-f]{16}$/);
  for (let i = 0; i < 10; i++) assert.equal(r('X' + i), null);
  assert.deepEqual(r('ABC'), { blocked: true });
});

test('Härtung: anonyme Nutzer und falscher Schlüsseltyp werden abgelehnt', async () => {
  const k = keypair('k1');
  const noAlg = { ...k.jwk }; delete noAlg.alg; // JWK ohne alg-Angabe
  const { fetchImpl } = setup({ jwks: () => [noAlg], ents: { [UID]: [{ produkt: 'ki', gueltig_bis: future, ki_budget_usd: null }] } });
  const auth = createSupabaseAuth({ url: URL_, serviceKey: 'sb_secret_test', defaultBudget: 2, fetchImpl });
  assert.ok((await auth.authenticate(req(sign(k, good())))).id);
  assert.equal(await auth.authenticate(req(sign(k, good(UID, { is_anonymous: true })))), null);
  // RS256 im Kopf, aber EC-Schlüssel: muss scheitern, auch ohne alg in der JWK
  assert.equal(await auth.authenticate(req(sign(k, good(), { alg: 'RS256' }))), null);
});

test('Härtung: JWKS-Ausfall → 503 ohne Schlüssel, mit alten Schlüsseln weiter', async () => {
  const k = keypair('k1');
  let down = true;
  const { fetchImpl: inner } = setup({ jwks: () => [k.jwk], ents: { [UID]: [{ produkt: 'ki', gueltig_bis: future, ki_budget_usd: null }] } });
  const fetchImpl = async (url, o) => (down && url.endsWith('jwks.json') ? { ok: false, status: 500, json: async () => ({}) } : inner(url, o));
  const auth = createSupabaseAuth({ url: URL_, serviceKey: 'sb_secret_test', defaultBudget: 2, fetchImpl });
  await assert.rejects(auth.authenticate(req(sign(k, good()))), (e) => e.status === 503);
  down = false;
  assert.ok((await auth.authenticate(req(sign(k, good())))).id);
  down = true; // Schlüssel sind geladen: Ausfall stört nicht
  const k2 = keypair('k2'); // unbekannte kid erzwingt Nachladen, das scheitert → alte Schlüssel bleiben
  assert.equal(await auth.authenticate(req(sign(k2, good()))), null);
  assert.ok((await auth.authenticate(req(sign(k, good())))).id);
});

test('ohne Dienst-Schlüssel: Abfrage mit öffentlichem Schlüssel + Token des Nutzers (RLS), gesperrte Konten abgewiesen', async () => {
  const k = keypair('k1');
  const calls = [];
  const fetchImpl = async (url, opts = {}) => {
    calls.push({ url, headers: opts.headers || {} });
    const json = (b) => ({ ok: true, status: 200, json: async () => b });
    if (url.endsWith('jwks.json')) return json({ keys: [k.jwk] });
    const uid = /(?:user_id|id)=eq\.([0-9a-f-]+)/.exec(url)[1];
    if (url.includes('/entitlements')) return json([{ produkt: 'ki', gueltig_bis: future, ki_budget_usd: null }]);
    if (url.includes('/profiles')) return json([{ display_name: 'Tom', gesperrt: uid === UID2 }]);
    return json({});
  };
  const auth = createSupabaseAuth({ url: URL_, publishableKey: 'sb_publishable_x', serviceKey: '', defaultBudget: 2, fetchImpl });
  const token = sign(k, good());
  const u = await auth.authenticate(req(token));
  assert.equal(u.name, 'Tom');
  const rest = calls.find((c) => c.url.includes('/rest/v1/entitlements'));
  assert.equal(rest.headers.apikey, 'sb_publishable_x');
  assert.equal(rest.headers.Authorization, `Bearer ${token}`);
  assert.match(calls.find((c) => c.url.includes('/profiles')).url, /select=display_name,gesperrt/);
  assert.deepEqual(await auth.authenticate(req(sign(k, good(UID2)))), { noAccess: true, gesperrt: true });
});

test('Konfiguration: Supabase-Modus braucht URL und mindestens einen Schlüssel', () => {
  assert.throws(() => createSupabaseAuth({ url: URL_, defaultBudget: 2 }), /SUPABASE_PUBLISHABLE_KEY/);
  assert.throws(() => createSupabaseAuth({ publishableKey: 'x', defaultBudget: 2 }), /SUPABASE_URL/);
});
