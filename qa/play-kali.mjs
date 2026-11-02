// QA „Sprache & Qualität“: Kali-App im Browser durchspielen (DE/EN/UK, Handy 390×844 + PC 1366×768).
// App lokal starten (Repo-Stand der Kali-Sitzung), z. B.:  python3 -m http.server 8766 --bind 127.0.0.1
// Aufruf: KALI_URL=http://127.0.0.1:8766 node qa/play-kali.mjs [bilderordner]
// Prüft: Willkommen im frischen Browser, Sprachwechsel unter „Mehr“, Nachtfalter Stufe 0–1 im Terminal,
// Funkturm-Start, Level-1-Übung e1-01s, Prüfungsseite, waagrechtes Scrollen, JS-Fehler, Offline (Service Worker).
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const URL_ = process.env.KALI_URL || 'http://127.0.0.1:8766';
const OUT = process.argv[2] || 'qa-out'; mkdirSync(OUT, { recursive: true });
const VIEWS = { handy: { width: 390, height: 844 }, pc: { width: 1366, height: 768 } };
const EXPECT = { // je Sprache ein paar Texte, die von Hand übersetzt sein müssen
  de: { welcome: 'Willkommen!', home: 'Hallo', liesmich: 'Dieses Handy hast du im Zug gefunden', err: 'Datei oder Verzeichnis nicht gefunden', unlock: 'Richtig!', turm: 'RADIO TALHEIM', lesson: 'Terminal, Prompt und Benutzer' },
  en: { welcome: 'Welcome!', home: 'Hello', liesmich: 'You found this phone on a train', err: 'No such file or directory', unlock: 'Correct!', turm: 'internship, day 1', lesson: 'Terminal, prompt and user' },
  uk: { welcome: 'Ласкаво просимо!', home: 'Привіт', liesmich: 'Цей телефон лежав у потязі', err: 'Немає такого файла або каталогу', unlock: 'Правильно!', turm: 'практика, день 1', lesson: 'Термінал, запрошення і користувач' },
};
// Typische Google-Fehlübersetzungen, die wir schon kennen
const BAD = { uk: ['Чайові', 'Військова гра', 'молі', ' с.'], en: ['Tip money'] };
const befunde = [];
const note = (m) => { befunde.push(m); console.log('  ✗ ' + m); };

const browser = await chromium.launch();
for (const lang of ['de', 'en', 'uk']) for (const [vn, vp] of Object.entries(VIEWS)) {
  console.log(`== ${lang} / ${vn}`);
  const X = EXPECT[lang];
  const ctx = await browser.newContext({ viewport: vp, serviceWorkers: 'allow' });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => note(`${lang}/${vn}: JS-Fehler ${e.message}`));
  const shot = async (name) => {
    await p.waitForTimeout(300);
    const w = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (w > 1) note(`${lang}/${vn}/${name}: Seite ${w}px zu breit`);
    const txt = await p.evaluate(() => document.body.innerText);
    for (const b of BAD[lang] || []) if (txt.includes(b)) note(`${lang}/${vn}/${name}: Fehlübersetzung „${b.trim()}“ sichtbar`);
    await p.screenshot({ path: `${OUT}/${lang}-${vn}-${name}.png`, fullPage: true });
    return txt;
  };
  const term = async (cmds) => { const i = p.locator('.term-in input').first(); for (const c of cmds) { await i.fill(c); await i.press('Enter'); await p.waitForTimeout(150); } return p.locator('.term-out').first().innerText(); };

  // 1. Frischer Browser: Willkommen, Sprache wählen, Lernort
  await p.goto(URL_ + '/'); await p.waitForSelector('.modal');
  if (lang !== 'de') { await p.click(`[data-lang=${lang}]`); await p.waitForSelector('.modal'); await p.waitForTimeout(800); }
  let t = await shot('willkommen');
  if (!t.includes(X.welcome)) note(`${lang}/${vn}: Willkommen-Text fehlt („${X.welcome}“)`);
  await p.click('.loc-opt[data-k=browser]'); await p.waitForTimeout(600);
  t = await shot('start');
  if (!t.includes(X.home)) note(`${lang}/${vn}: Startseite ohne „${X.home}“`);

  // 2. Nachtfalter
  await p.goto(URL_ + '/#/raum/w1'); await p.waitForSelector('.term-in input'); await p.waitForTimeout(500);
  let o = await term(['cat LIESMICH.txt', 'cd stufe0', 'cat hallo.txt']);
  if (!o.includes(X.liesmich)) note(`${lang}/${vn}: LIESMICH nicht in ${lang}`);
  const code = (o.match(/KLY\{[0-9a-f]{16}\}/) || [])[0];
  if (!code) note(`${lang}/${vn}: kein Code in hallo.txt`);
  o = await term(['entsperren ' + code, 'cat nix', 'cd ../stufe1', 'ls -a', 'cat .tagebuch']);
  if (!o.includes(X.unlock)) note(`${lang}/${vn}: entsperren-Meldung nicht in ${lang}`);
  if (!o.includes(X.err)) note(`${lang}/${vn}: Shell-Fehler nicht in ${lang}`);
  if (!/KLY\{[0-9a-f]{16}\}[\s\S]*$/.test(o.split('.tagebuch').pop())) note(`${lang}/${vn}: Stufe 1 liefert keinen Code`);
  // Code ins Antwortfeld + Tipp aufdecken
  const inp = p.locator('input[data-k]:not([disabled])').first(); // Stufe 0 ist durch entsperren schon gelöst
  if (await inp.count()) { await inp.fill('KLY{0000000000000000}'); await p.locator('[data-send]:not([disabled])').first().click(); await p.waitForTimeout(400); }
  const tip = p.locator('[data-tip]').first(); if (await tip.count()) { await tip.click(); await p.waitForTimeout(300); }
  await shot('nachtfalter');

  // 3. Funkturm
  await p.goto(URL_ + '/#/raum/w4'); await p.waitForSelector('.term-in input'); await p.waitForTimeout(500);
  o = await term(['cat LIESMICH.txt', 'cd etage00', 'cat "Willkommen im Turm.txt"']);
  if (!o.includes(X.turm)) note(`${lang}/${vn}: Funkturm-LIESMICH nicht in ${lang}`);
  if (!/KLY\{[0-9a-f]{16}\}/.test(o)) note(`${lang}/${vn}: Funkturm Etage 0 ohne Code`);
  await shot('funkturm');

  // 3b. Weitere Leitern: Start + erste Stufe (verpackte Dateien in w9)
  const LANGTEST = { de: /\b(der|die|das|und|ist|ich|bin|nicht)\b/i, en: /\b(the|and|is|you)\b/i, uk: /[а-яіїєґ]{3}/i };
  for (const [room, dir, cmds] of [
    ['w5', 'posten00', ['cat hinweis.txt', 'cat $(grep -ril "weiche 17" meldungen)']],
    ['w6', 'runde00', ['cat hinweis.txt']],
    ['w7', 'phase00', ['ls']], // Stufe 0 enthält nur Daten (bleiben original)
    ['w9', 'spur00', ["tr '_-' '/+' < botschaft.txt | base64 -d"]],
    ['p5', 'pruefung00', ['ls']], // dito
  ]) {
    await p.goto(URL_ + '/#/raum/' + room); await p.waitForSelector('.term-in input'); await p.waitForTimeout(500);
    const lm = await term(['cat LIESMICH.txt']);
    if (!LANGTEST[lang].test(lm.split('LIESMICH.txt').pop())) note(`${lang}/${vn}: ${room} LIESMICH nicht in ${lang}`);
    const o2 = await term([`cd ${dir}`, ...cmds]);
    const tail = o2.split(cmds[0]).pop();
    if (room === 'w5' || room === 'w9') { if (!/KLY\{[0-9a-f]{16}\}/.test(tail)) note(`${lang}/${vn}: ${room} Stufe 0 ohne Code`); }
    if (cmds[0] !== 'ls' && !LANGTEST[lang].test(tail)) note(`${lang}/${vn}: ${room} Stufe-0-Text nicht in ${lang}: ${tail.slice(0, 80)}`);
  }
  await shot('leitern');

  // 4. Level 1: Lektion + Übung
  await p.goto(URL_ + '/#/lektion/l1-01'); await p.waitForTimeout(600);
  t = await shot('lektion');
  if (!t.includes(X.lesson)) note(`${lang}/${vn}: Lektionstitel nicht in ${lang}`);
  await p.goto(URL_ + '/#/uebung/e1-01s'); await p.waitForTimeout(700);
  if (await p.locator('.term-in input').count()) { await term(['pwd', 'whoami']); const c = p.locator('#check'); if (await c.count()) { await c.click(); await p.waitForTimeout(400); } }
  await shot('uebung');

  // 5. Sprachwechsel unter „Mehr“ (nur einmal je Sprache, am Handy)
  if (vn === 'handy') {
    const next = { de: 'uk', uk: 'en', en: 'de' }[lang];
    await p.goto(URL_ + '/#/mehr'); await p.waitForTimeout(500);
    await p.click(`[data-lang=${next}]`); await p.waitForTimeout(1500);
    const t2 = await p.evaluate(() => document.body.innerText);
    const lc = await p.evaluate(() => localStorage.getItem('kly.lang'));
    if (lc !== next) note(`${lang}→${next}: Sprache nicht gespeichert (${lc})`);
    await p.goto(URL_ + '/#/heute'); await p.waitForTimeout(800);
    if (!(await p.evaluate(() => document.body.innerText)).includes(EXPECT[next].home)) note(`${lang}→${next}: Startseite nach Wechsel nicht in ${next}`);
    // zurück
    await p.goto(URL_ + '/#/mehr'); await p.waitForTimeout(400); await p.click(`[data-lang=${lang}]`); await p.waitForTimeout(1500);
  }

  // 6. Offline: Service Worker muss Übersetzungen ausliefern
  if (vn === 'handy') {
    await p.goto(URL_ + '/#/heute'); await p.waitForTimeout(500);
    const sw = await p.evaluate(async () => { if (!navigator.serviceWorker) return 'kein SW'; const r = await Promise.race([navigator.serviceWorker.ready.then(() => 'ok'), new Promise(r => setTimeout(() => r('timeout'), 8000))]); return r; });
    if (sw !== 'ok') note(`${lang}: Service Worker nicht bereit (${sw})`);
    await p.waitForTimeout(1500);
    await ctx.setOffline(true);
    await p.reload(); await p.waitForTimeout(1500);
    const ot = await p.evaluate(() => document.body.innerText).catch(() => '');
    if (!ot.includes(X.home)) note(`${lang}: offline Startseite ohne „${X.home}“`);
    await p.goto(URL_ + '/#/raum/w1'); await p.waitForTimeout(1500);
    if (await p.locator('.term-in input').count()) { const oo = await term(['cat LIESMICH.txt']); if (!oo.includes(X.liesmich)) note(`${lang}: offline Nachtfalter nicht in ${lang}`); }
    else note(`${lang}: offline kein Terminal im Nachtfalter`);
    await shot('offline');
    await ctx.setOffline(false);
  }
  await ctx.close();
}
await browser.close();
console.log(befunde.length ? `\n${befunde.length} Befund(e).` : '\nKeine Befunde ✓');
