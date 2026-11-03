// Prüft die .env der KI-Werkstatt, OHNE Werte auszugeben.
//   node tools/check-env.mjs            Vorhandensein und Format
//   node tools/check-env.mjs --online   zusätzlich: Schlüssel bei Anthropic und Supabase testen (kostenlos, keine KI-Antwort)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = process.argv.find((a) => a.endsWith('.env')) || path.join(root, '.env');
const online = process.argv.includes('--online');

let ok = true;
const line = (state, name, note = '') => {
  if (state === '✗') ok = false;
  console.log(`${state} ${name.padEnd(26)} ${note}`);
};

if (!fs.existsSync(file)) {
  console.log(`✗ ${file} fehlt – Vorlage kopieren: cp .env.example .env`);
  process.exit(1);
}
const mode = fs.statSync(file).mode & 0o777;
line(mode & 0o077 ? '⚠' : '✓', 'Dateirechte', mode & 0o077 ? `${mode.toString(8)} – besser: chmod 600 .env` : '600');

// Einfacher .env-Leser (KEY=WERT, # Kommentare)
const env = {};
for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(raw);
  if (m && !raw.trim().startsWith('#')) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const has = (k) => Boolean(env[k]);
const fmt = (k, re, hint) => {
  if (!has(k)) return line('✗', k, 'fehlt');
  if (!re.test(env[k])) return line('✗', k, `Format passt nicht (${hint})`);
  line('✓', k, `vorhanden (${env[k].length} Zeichen)`);
};

fmt('ANTHROPIC_API_KEY', /^sk-ant-[A-Za-z0-9_-]{20,}$/, 'erwartet sk-ant-…');
const model = env.KI_MODEL || 'claude-haiku-5-5';
line(/^claude-[a-z0-9-]+$/.test(model) ? '✓' : '✗', 'KI_MODEL', model);
line(Number(env.BUDGET_USD_PER_CODE || 2) > 0 ? '✓' : '✗', 'BUDGET_USD_PER_CODE', `${env.BUDGET_USD_PER_CODE || 2} $ pro Monat`);
line((env.PORT || '8100') === '8090' ? '✗' : '✓', 'PORT', `${env.PORT || 8100}${env.PORT === '8090' ? ' – gehört der Arena!' : ''}`);
line(['127.0.0.1', '::1', undefined, ''].includes(env.HOST) ? '✓' : '✗', 'HOST', `${env.HOST || '127.0.0.1'} (muss lokal bleiben)`);

const auth = env.AUTH_MODE || 'codes';
line(['codes', 'supabase'].includes(auth) ? '✓' : '✗', 'AUTH_MODE', auth);
if (auth === 'codes') {
  const codes = (env.INVITE_CODES || '').split(',').map((s) => s.split(':')[0].trim()).filter(Boolean);
  const weak = codes.filter((c) => c.length < 12 || /HIER-ZUFALLSCODE/.test(c));
  if (!codes.length) line('✗', 'INVITE_CODES', 'keine Codes');
  else line(weak.length ? '✗' : '✓', 'INVITE_CODES', `${codes.length} Codes${weak.length ? `, ${weak.length} zu kurz/Vorlage – openssl rand -hex 8` : ''}`);
} else {
  fmt('SUPABASE_URL', /^https:\/\/[a-z0-9]{20}\.supabase\.co\/?$/, 'https://<ref>.supabase.co');
  fmt('SUPABASE_PUBLISHABLE_KEY', /^(sb_publishable_[A-Za-z0-9_-]{10,}|eyJ[\w-]+\.[\w-]+\.[\w-]+)$/, 'sb_publishable_…');
  fmt('SUPABASE_SERVICE_KEY', /^(sb_secret_[A-Za-z0-9_-]{10,}|eyJ[\w-]+\.[\w-]+\.[\w-]+)$/, 'sb_secret_…');
  if (env.SUPABASE_SERVICE_KEY && env.SUPABASE_SERVICE_KEY === env.SUPABASE_PUBLISHABLE_KEY) line('✗', 'SUPABASE_SERVICE_KEY', 'ist derselbe wie der öffentliche Schlüssel');
  if (/^sb_publishable_/.test(env.SUPABASE_SERVICE_KEY || '')) line('✗', 'SUPABASE_SERVICE_KEY', 'ist ein öffentlicher Schlüssel – hier gehört sb_secret_… hin');
  line(has('ACCOUNT_URL') ? '✓' : '⚠', 'ACCOUNT_URL', has('ACCOUNT_URL') ? env.ACCOUNT_URL : 'leer – kein Registrier-Link');
}

if (online) {
  console.log('\nOnline-Prüfung (keine KI-Antwort, keine Kosten):');
  if (has('ANTHROPIC_API_KEY')) {
    const r = await fetch(`https://api.anthropic.com/v1/models/${model}`, {
      headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    }).catch((e) => ({ ok: false, status: e.message }));
    line(r.ok ? '✓' : '✗', 'Anthropic-Schlüssel', r.ok ? `gültig, Modell ${model} verfügbar` : `abgelehnt (${r.status})`);
  }
  if (auth === 'supabase' && has('SUPABASE_URL')) {
    const base = env.SUPABASE_URL.replace(/\/+$/, '');
    const j = await fetch(`${base}/auth/v1/.well-known/jwks.json`).catch((e) => ({ ok: false, status: e.message }));
    line(j.ok ? '✓' : '✗', 'Supabase JWKS', j.ok ? 'erreichbar' : `nicht erreichbar (${j.status})`);
    if (has('SUPABASE_SERVICE_KEY')) {
      const h = { apikey: env.SUPABASE_SERVICE_KEY };
      if (env.SUPABASE_SERVICE_KEY.startsWith('eyJ')) h.Authorization = `Bearer ${env.SUPABASE_SERVICE_KEY}`;
      const e = await fetch(`${base}/rest/v1/entitlements?select=id&limit=1`, { headers: h }).catch((x) => ({ ok: false, status: x.message }));
      line(e.ok ? '✓' : '✗', 'Dienst-Schlüssel', e.ok ? 'darf entitlements lesen' : `abgelehnt (${e.status})`);
    }
  }
}
console.log(ok ? '\nAlles bereit.' : '\nBitte die ✗-Punkte beheben.');
process.exit(ok ? 0 : 1);
