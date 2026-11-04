// QA: Konto-Seite (konto.html) in DE/EN/UK auf Handy und PC – ohne echte Anfragen.
// Alle Aufrufe ans Konto-Backend werden im Browser abgefangen und mit Testdaten beantwortet.
// Nutzung: KALI_URL=http://127.0.0.1:8766 node qa/play-konto.mjs [ausgabeordner]
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const BASE = process.env.KALI_URL || 'http://127.0.0.1:8766';
const OUT = process.argv[2] || '.';
const GERMAN = /\b(und|oder|nicht|Konto|Passwort|Zugänge?|Jahrgang|gültig|abgelaufen|gekauft|geschenkt|fehlt|Zurück|anlegen|Spitzname|Einladungscode|Zentrale|Anmeldung|Willkommen|Impressum|Datenschutz)\b/;
const fake = (route) => {
  const u = route.request().url();
  const j = (b) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
  if (u.includes('/auth/v1/user')) return j({ id: 'u1', email: 'kim@example.org' });
  if (u.includes('/rpc/mein_status')) return j({ admin: true, freigeschaltet: true, gesperrt: false });
  if (u.includes('/rest/v1/profiles')) return j([{ display_name: 'Kim', lang: 'de', birth_year: 2013, parent_consent: false }]);
  if (u.includes('/rest/v1/entitlements')) return j([
    { produkt: 'ki', gueltig_bis: '2099-01-31', quelle: 'beta' },
    { produkt: 'arena', gueltig_bis: '2020-05-01', quelle: 'geschenk' }]);
  return route.fulfill({ status: 400, contentType: 'application/json', body: '{"msg":"test"}' });
};
const b = await chromium.launch();
let problems = 0;
for (const [dev, vp] of [['handy', { width: 390, height: 844 }], ['pc', { width: 1366, height: 768 }]]) for (const lang of ['de', 'en']) for (const view of ['login', 'neu', 'vergessen', 'konto']) {
  const ctx = await b.newContext({ viewport: vp });
  await ctx.route(/supabase\.co/, fake);
  await ctx.route(/translate\.goog|googleapis|gstatic/, r => r.abort());
  const p = await ctx.newPage();
  await p.addInitScript(([l, v]) => {
    localStorage.setItem('kly.lang', l);
    if (v === 'konto') { const s = JSON.stringify({ access_token: 'x', refresh_token: 'y', expires_at: 4e9, user: { id: 'u1' } }); localStorage.setItem('nf.konto', s); localStorage.setItem('kly.auth', s); }
  }, [lang, view]);
  await p.goto(`${BASE}/konto.html${view === 'neu' ? '?neu=1' : ''}`);
  await p.waitForTimeout(1200);
  if (view === 'vergessen') { await p.click('[data-tab=vergessen]'); await p.waitForTimeout(400); }
  if (view === 'neu') { await p.fill('input[name=jahr]', '2014'); await p.dispatchEvent('input[name=jahr]', 'input'); await p.waitForTimeout(400); }
  const txt = await p.evaluate(() => document.body.innerText);
  const wide = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const left = lang === 'de' ? [] : txt.split('\n').filter(l => GERMAN.test(l) && l !== 'Nachtfalter Konto');
  if (left.length || wide > 0) { problems++; console.log(`✗ ${dev} ${lang} ${view}: zu breit ${wide}px; deutsch übrig:`, left); }
  else console.log(`✓ ${dev} ${lang} ${view}`);
  await p.screenshot({ path: `${OUT}/konto-${dev}-${lang}-${view}.png`, fullPage: true });
  await ctx.close();
}
await b.close();
console.log(problems ? `${problems} Probleme` : 'alles gut');
