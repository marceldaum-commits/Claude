// QA „Sprache & Qualität“: KI-Werkstatt im Browser durchspielen (DE/EN/UK, Handy + PC).
// Aufruf: KI_URL=http://127.0.0.1:8123 KI_DIR=<pfad>/ki-lernen node qa/play-ki.mjs [ausgabeordner]
// Server vorher starten (ohne API-Schlüssel laufen Mythos und Detektiv).
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { readFileSync, mkdirSync } from 'node:fs';
const URL_ = process.env.KI_URL || 'http://127.0.0.1:8123';
const DIR = process.env.KI_DIR;
const OUT = process.argv[2] || 'qa-out'; mkdirSync(OUT, { recursive: true });
const dicts = { de: {} };
for (const l of ['en', 'uk']) dicts[l] = JSON.parse(readFileSync(`${DIR}/public/i18n/${l}.json`, 'utf8'));
const { DETEKTIV, MYTHOS } = await import(`${DIR}/public/content.js`);
const deKeys = Object.keys(JSON.parse(readFileSync(`${DIR}/public/i18n/de.json`, 'utf8')));
const befunde = [];
const note = (m) => { befunde.push(m); console.log('  ✗ ' + m); };
const VIEWS = { handy: { width: 390, height: 844 }, pc: { width: 1366, height: 768 } };

const browser = await chromium.launch();
for (const lang of ['de', 'en', 'uk']) for (const [vn, vp] of Object.entries(VIEWS)) {
  console.log(`== ${lang} / ${vn}`);
  const ctx = await browser.newContext({ viewport: vp, locale: 'de-DE' });
  await ctx.addInitScript((l) => localStorage.setItem('kiw-state-v1', JSON.stringify({ lang: l })), lang);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => note(`${lang}/${vn}: JS-Fehler ${e.message}`));
  const T = (s) => (lang === 'de' ? s : dicts[lang][s] || s);
  const check = async (name) => {
    await page.waitForTimeout(250);
    const w = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (w > 1) note(`${lang}/${vn}/${name}: Seite ${w}px zu breit (waagrechtes Scrollen)`);
    if (lang !== 'de') {
      const txt = await page.evaluate(() => document.body.innerText);
      for (const k of deKeys) if (k.length > 12 && dicts[lang][k] && dicts[lang][k] !== k && txt.includes(k)) note(`${lang}/${vn}/${name}: noch Deutsch: ${k}`);
    }
    await page.screenshot({ path: `${OUT}/${lang}-${vn}-${name}.png`, fullPage: true });
  };
  await page.goto(URL_ + '/#/'); await page.waitForSelector('main#app *');
  await check('start');
  // Mythos: immer richtig antworten
  await page.goto(URL_ + '/#/mythos'); await page.waitForTimeout(300);
  for (const m of MYTHOS) {
    await page.getByRole('button', { name: m.wahr ? T('✅ Wahr') : T('🦄 Mythos') }).click();
    if (m === MYTHOS[3]) await check('mythos-erklaerung');
    await page.getByRole('button', { name: T('Weiter →') }).click();
  }
  const score = await page.locator('.score').textContent();
  if (score.trim() !== `${MYTHOS.length} / ${MYTHOS.length}`) note(`${lang}/${vn}: Mythos-Ergebnis ${score}`);
  await check('mythos-ende');
  // Detektiv: alle falschen Sätze anklicken
  for (let n = 0; n < DETEKTIV.length; n++) {
    await page.goto(URL_ + `/#/detektiv/${n}`); await page.waitForTimeout(300);
    for (const s of DETEKTIV[n].saetze) if (s.f) await page.getByRole('button', { name: T(s.t), exact: true }).click();
    await page.getByRole('button', { name: T('Anklage erheben') }).click();
    if (!(await page.getByText(T('🔎 Fall gelöst!')).count())) note(`${lang}/${vn}: Detektiv Fall ${n + 1} nicht gelöst`);
    if (n === 1) await check('detektiv-2');
  }
  // Übrige Seiten nur ansehen
  for (const r of ['tokens', 'prompt', 'wuerfel', 'persona']) { await page.goto(URL_ + '/#/' + r); await check(r); }
  await ctx.close();
}
await browser.close();
console.log(befunde.length ? `\n${befunde.length} Befund(e).` : '\nKeine Befunde ✓');
