// Nachtfalter Zentrale: Kunden, Fortschritt, Rollen, Codes, Protokoll, System.
// Alle Daten und Änderungen laufen über die Supabase Edge Function „admin“ –
// sie prüft bei jeder Anfrage Anmeldung UND Verwaltungs-Rolle. Diese Seite hat selbst keine Sonderrechte.
const C = window.KLY_CONFIG || {};
const URL_ = C.kontoUrl, KEY = C.kontoKey;
const STORE = 'nf.zentrale.auth';
const APP = 'https://app.nachtfalter.tech';
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const datum = (d, zeit = true) => (d ? new Date(d).toLocaleString('de-DE', zeit ? { dateStyle: 'short', timeStyle: 'short' } : { dateStyle: 'medium' }) : '–');
const vor = (d) => {
  if (!d) return 'nie';
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 90) return 'gerade eben'; if (s < 3600) return `vor ${Math.round(s / 60)} Min.`;
  if (s < 86400) return `vor ${Math.round(s / 3600)} Std.`; if (s < 86400 * 45) { const t = Math.round(s / 86400); return t === 1 ? 'vor 1 Tag' : `vor ${t} Tagen`; }
  return datum(d, false);
};
const PRODUKT = { arena: '🖥️ Arena', ki: '🤖 KI-Werkstatt', alles: '⭐ Alles' };
const main = $('#main');
let NAMEN = { raeume: {}, reihenfolge: [], geschichten: {} };
fetch('raeume.json').then(r => r.ok ? r.json() : null).then(j => { if (j) NAMEN = { geschichten: {}, ...j }; }).catch(() => {});

// ---------------------------------------------------------------- Anmeldung
let ses = null;
try { ses = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch { /* */ }
const speichern = (s) => { ses = s; try { s ? localStorage.setItem(STORE, JSON.stringify(s)) : localStorage.removeItem(STORE); } catch { /* */ } };
async function token(path, body) {
  const r = await fetch(`${URL_}/auth/v1/token?grant_type=${path}`, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error_description || j.msg || 'Anmeldung fehlgeschlagen');
  return { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Math.floor(Date.now() / 1000) + Number(j.expires_in || 3600), user: j.user };
}
async function auth(path, { method = 'GET', body } = {}) {
  const r = await fetch(`${URL_}/auth/v1/${path}`, { method, headers: { apikey: KEY, Authorization: `Bearer ${ses.access_token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.msg || j.error_description || j.message || `Fehler ${r.status}`);
  return j;
}
const stufe = () => { try { return JSON.parse(atob(ses.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).aal || ''; } catch { return ''; } };

// Zwei-Faktor-Anmeldung (TOTP, z. B. Google/Microsoft Authenticator, Bitwarden Authenticator)
async function zweiterFaktor() {
  kopf(false);
  main.innerHTML = '<section class="stack" style="max-width:440px;margin:2rem auto"><p class="muted">Prüfe Zwei-Faktor-Anmeldung …</p></section>';
  let user;
  try { user = await auth('user'); } catch (e) { speichern(null); return anmelden(e.message); }
  const totp = (user.factors || []).filter(f => f.factor_type === 'totp');
  const fertig = totp.find(f => f.status === 'verified');
  if (fertig) return codeAbfrage(fertig.id, false);
  for (const f of totp) { try { await auth(`factors/${f.id}`, { method: 'DELETE' }); } catch { /* */ } } // halbfertige Versuche aufräumen
  let neu;
  try { neu = await auth('factors', { method: 'POST', body: { factor_type: 'totp', friendly_name: `Zentrale ${new Date().toISOString().slice(0, 16)}`, issuer: 'Nachtfalter Zentrale' } }); }
  catch (e) { return anmelden(`Zwei-Faktor-Einrichtung nicht möglich: ${e.message}`); }
  codeAbfrage(neu.id, true, neu.totp);
}
function codeAbfrage(faktor, einrichten, totp = {}) {
  main.innerHTML = `<section class="stack" style="max-width:440px;margin:1.5rem auto">
    <div style="text-align:center"><div style="font-size:2.4rem">🔐</div><h1 style="margin:.2rem 0 0">${einrichten ? 'Zwei-Faktor einrichten' : 'Code aus der App'}</h1></div>
    ${einrichten ? `<div class="card stack">
      <p style="margin:0">Die Zentrale ist zusätzlich mit einem <b>Code aus einer Authenticator-App</b> geschützt (z. B. Google Authenticator, Microsoft Authenticator oder Bitwarden Authenticator).</p>
      <ol class="small" style="margin:0;padding-left:1.2rem"><li>App öffnen → „Konto hinzufügen“ → <b>QR-Code scannen</b>.</li><li>Den <b>6-stelligen Code</b> aus der App unten eintragen.</li></ol>
      <div style="background:#fff;border-radius:12px;padding:10px;width:max-content;margin:0 auto"><img src="${esc(totp.qr_code || '')}" alt="QR-Code für die Authenticator-App" width="200" height="200"></div>
      <details class="small"><summary>QR-Code geht nicht? Schlüssel von Hand eingeben</summary><code translate="no" style="display:block;margin-top:.4rem;word-break:break-all">${esc(totp.secret || '')}</code></details>
      <p class="small muted" style="margin:0">Am Handy, auf dem du die Zentrale gerade öffnest: Schlüssel kopieren und in der App „Schlüssel eingeben“ wählen.</p>
    </div>` : '<p class="muted" style="text-align:center;margin:0">Öffne deine Authenticator-App und gib den aktuellen 6-stelligen Code für „Nachtfalter Zentrale“ ein.</p>'}
    <form id="mf" class="card stack konto"><label>6-stelliger Code<input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required autofocus></label>
      <button class="btn go block">${einrichten ? 'Einrichten und anmelden' : 'Bestätigen'}</button></form>
    <div id="mmsg"></div>
    <p class="small muted" style="text-align:center"><button class="linkbtn" id="mab">Abbrechen und abmelden</button></p>
  </section>`;
  $('#mab').onclick = () => { speichern(null); anmelden(); };
  const f = $('#mf');
  f.onsubmit = async (e) => {
    e.preventDefault(); f.querySelector('button').disabled = true;
    try {
      const ch = await auth(`factors/${faktor}/challenge`, { method: 'POST', body: {} });
      const t = await auth(`factors/${faktor}/verify`, { method: 'POST', body: { challenge_id: ch.id, code: f.code.value.trim() } });
      speichern({ access_token: t.access_token, refresh_token: t.refresh_token, expires_at: Math.floor(Date.now() / 1000) + Number(t.expires_in || 3600), user: t.user || ses.user });
      D = null; location.hash = '#/'; route();
    } catch (err) {
      $('#mmsg').innerHTML = `<div class="feedback no">${esc(/invalid|expired/i.test(err.message) ? 'Der Code stimmt nicht oder ist abgelaufen. Nimm den aktuellen Code aus der App.' : err.message)}</div>`;
      f.querySelector('button').disabled = false; f.code.value = ''; f.code.focus();
    }
  };
}

async function frisch() {
  if (!ses) return null;
  if (ses.expires_at - 60 > Date.now() / 1000) return ses;
  try { speichern(await token('refresh_token', { refresh_token: ses.refresh_token })); } catch { speichern(null); }
  return ses;
}
async function api(aktion, daten = {}) {
  const s = await frisch(); if (!s) { anmelden(); throw new Error('Bitte anmelden.'); }
  const r = await fetch(`${URL_}/functions/v1/admin`, { method: 'POST', headers: { apikey: KEY, Authorization: `Bearer ${s.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ aktion, ...daten }) });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) { speichern(null); anmelden('Deine Anmeldung ist abgelaufen. Bitte neu anmelden.'); throw new Error('abgemeldet'); }
  if (r.status === 403 && j.code === 'mfa') { zweiterFaktor(); throw new Error('abgemeldet'); }
  if (r.status === 403) { keinZugriff(); throw new Error('kein Zugriff'); }
  if (!r.ok) throw new Error(j.fehler || `Fehler ${r.status}`);
  return j;
}
function kopf(an) {
  $('#tabs').hidden = !an; $('#aus').hidden = !an;
  $('#wer').textContent = an && ses?.user?.email ? ses.user.email : '';
}
function anmelden(hinweis = '') {
  kopf(false);
  main.innerHTML = `<section class="stack" style="max-width:420px;margin:2rem auto">
    <div style="text-align:center"><img src="icons/icon.svg" alt="" width="72" height="72"><h1 style="margin:.4rem 0 0">Zentrale</h1>
    <p class="muted small" style="margin:.2rem 0 0">Nur für die Nachtfalter-Verwaltung. Anmeldung mit deinem Nachtfalter-Konto.</p></div>
    ${hinweis ? `<div class="feedback no">${esc(hinweis)}</div>` : ''}
    <form id="lf" class="card stack konto">
      <label>E-Mail<input type="email" name="email" autocomplete="username" required></label>
      <label>Passwort<input type="password" name="pw" autocomplete="current-password" required></label>
      <button class="btn go block">Anmelden</button>
    </form>
    <div id="lmsg"></div>
    <p class="small muted" style="text-align:center"><a href="${APP}/konto.html">Passwort vergessen?</a></p>
  </section>`;
  const f = $('#lf');
  f.onsubmit = async (e) => {
    e.preventDefault(); f.querySelector('button').disabled = true;
    try { speichern(await token('password', { email: f.email.value.trim(), password: f.pw.value })); zweiterFaktor(); }
    catch (err) { $('#lmsg').innerHTML = `<div class="feedback no">${esc(err.message === 'Invalid login credentials' ? 'E-Mail oder Passwort stimmt nicht.' : err.message)}</div>`; f.querySelector('button').disabled = false; }
  };
}
function keinZugriff() {
  kopf(false);
  main.innerHTML = `<section class="stack" style="max-width:480px;margin:2rem auto"><h1>Kein Zugriff</h1>
    <div class="card warn">Dein Konto (${esc(ses?.user?.email || '')}) hat keine Verwaltungs-Rolle.</div>
    <div class="row"><button class="btn" id="ab">Mit anderem Konto anmelden</button><a class="btn ghost" href="${APP}">Zum Hacklab</a></div></section>`;
  $('#ab').onclick = () => { speichern(null); anmelden(); };
}
$('#aus').onclick = () => { if (confirm('Von der Zentrale abmelden?')) { speichern(null); anmelden(); } };

// ---------------------------------------------------------------- Daten
let D = null; // { nutzer, codes }
async function laden(neu = false) { if (!D || neu) D = await api('uebersicht'); return D; }
const meldung = (t, ok = true) => { const e = $('#msg'); if (e) { e.innerHTML = `<div class="feedback ${ok ? 'ok' : 'no'}">${esc(t)}</div>`; e.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } };
async function tun(fn, ok, danach) {
  try { await fn(); D = null; meldung(ok); if (danach) await danach(); }
  catch (e) { if (!['abgemeldet', 'kein Zugriff'].includes(e.message)) meldung(e.message, false); }
}
const tage = (n) => Date.now() - n * 864e5;
const status = (n) => n.gesperrt ? ['gesperrt', 'rot'] : !n.bestaetigt ? ['E-Mail offen', 'warn'] : ['aktiv', 'ok'];
const kind = (n) => n.jahrgang && new Date().getFullYear() - n.jahrgang <= 16;
function badges(n) {
  const [st, k] = status(n);
  return `<span class="zbadges">${n.admin ? '<span class="zb lila">Verwaltung</span>' : '<span class="zb">Kunde</span>'}${n.zwei_faktor ? '<span class="zb ok">🔐 2FA</span>' : ''}<span class="zb ${k}">${st}</span>${kind(n) ? `<span class="zb ${n.eltern ? '' : 'warn'}">unter 17${n.eltern ? ' · Eltern ✓' : ' · Eltern fehlt'}</span>` : ''}${n.zugaenge.some(z => new Date(z.gueltig_bis) > new Date()) ? '<span class="zb ok">Zugang</span>' : ''}</span>`;
}
const gesamtRaeume = () => NAMEN.reihenfolge.length || 22;

// ---------------------------------------------------------------- Ansichten
async function uebersicht() {
  const { nutzer, codes } = await laden();
  const k = nutzer.filter(n => !n.admin);
  const aktiv7 = nutzer.filter(n => n.zuletzt && new Date(n.zuletzt) > tage(7) || n.fortschritt && new Date(n.fortschritt.aktualisiert) > tage(7));
  const neu7 = nutzer.filter(n => new Date(n.erstellt) > tage(7));
  const offen = nutzer.filter(n => !n.bestaetigt);
  const elternFehlt = nutzer.filter(n => kind(n) && !n.eltern);
  const codesOffen = codes.filter(c => !c.widerrufen && (!c.gueltig_bis || new Date(c.gueltig_bis) > new Date()) && c.uses < c.max_uses);
  const geloest = nutzer.reduce((s, n) => s + (n.fortschritt?.geloest || 0), 0);
  const liste = (titel, arr, leer) => `<div class="card"><h3 style="margin-top:0">${titel}</h3>${arr.length ? `<ul class="list">${arr.slice(0, 6).map(n => `<li><a href="#/kunde/${n.id}"><span class="grow"><span class="t">${esc(n.name || n.email)}</span><span class="s">${esc(n.email)} · ${vor(n.zuletzt || n.erstellt)}</span></span></a></li>`).join('')}</ul>` : `<p class="small muted" style="margin:0">${leer}</p>`}</div>`;
  main.innerHTML = `<section class="stack">
    <h1 style="margin-bottom:0">Übersicht</h1>
    <div class="zkpis">
      <div class="zkpi"><b>${nutzer.length}</b><span>Konten gesamt</span></div>
      <div class="zkpi"><b>${k.length}</b><span>Kunden</span></div>
      <div class="zkpi lime"><b>${aktiv7.length}</b><span>aktiv (7 Tage)</span></div>
      <div class="zkpi"><b>${neu7.length}</b><span>neu (7 Tage)</span></div>
      <div class="zkpi ${offen.length ? 'warn' : ''}"><b>${offen.length}</b><span>E-Mail unbestätigt</span></div>
      <div class="zkpi ${elternFehlt.length ? 'warn' : ''}"><b>${elternFehlt.length}</b><span>Eltern-Zustimmung fehlt</span></div>
      <div class="zkpi"><b>${geloest}</b><span>gelöste Räume gesamt</span></div>
      <div class="zkpi"><b>${codesOffen.length}</b><span>offene Codes</span></div>
    </div>
    <div class="zgrid zwei">
      ${liste('🆕 Neu registriert', [...neu7].sort((a, b) => String(b.erstellt).localeCompare(String(a.erstellt))), 'Diese Woche noch niemand.')}
      ${liste('⏱️ Zuletzt aktiv', [...nutzer].filter(n => n.zuletzt).sort((a, b) => String(b.zuletzt).localeCompare(String(a.zuletzt))), 'Noch keine Anmeldungen.')}
      ${offen.length ? liste('✉️ Warten auf E-Mail-Bestätigung', offen, '') : ''}
      ${elternFehlt.length ? liste('👪 Unter 17 ohne Eltern-Zustimmung', elternFehlt, '') : ''}
    </div>
  </section>`;
}

let filter = 'alle', suche = '';
async function kunden() {
  const { nutzer } = await laden();
  const F = {
    alle: () => true, kunden: n => !n.admin, verwaltung: n => n.admin, offen: n => !n.bestaetigt,
    gesperrt: n => n.gesperrt, aktiv: n => n.zuletzt && new Date(n.zuletzt) > tage(7), kinder: n => kind(n),
  };
  const L = { alle: 'Alle', kunden: 'Kunden', verwaltung: 'Verwaltung', aktiv: 'Aktiv (7 T.)', offen: 'E-Mail offen', gesperrt: 'Gesperrt', kinder: 'Unter 17' };
  const zeichne = () => {
    const q = suche.toLowerCase();
    const liste = nutzer.filter(F[filter]).filter(n => !q || `${n.email} ${n.name} ${n.notiz}`.toLowerCase().includes(q))
      .sort((a, b) => String(b.zuletzt || b.erstellt).localeCompare(String(a.zuletzt || a.erstellt)));
    $('#kl').innerHTML = liste.length ? `<table class="ztab"><thead><tr><th>Name / E-Mail</th><th>Status</th><th class="zmobil-weg">Fortschritt</th><th class="zmobil-weg">Zuletzt</th></tr></thead><tbody>
      ${liste.map(n => `<tr class="klick" data-id="${n.id}"><td><b>${esc(n.name || '–')}</b><br><span class="small muted">${esc(n.email)}</span></td><td>${badges(n)}</td>
        <td class="zmobil-weg">${n.fortschritt ? `${n.fortschritt.geloest}/${gesamtRaeume()} Räume<div class="zbalken" style="margin-top:.3rem"><i style="width:${Math.min(100, 100 * n.fortschritt.geloest / gesamtRaeume())}%"></i></div>` : '<span class="muted">–</span>'}</td>
        <td class="zmobil-weg small">${vor(n.zuletzt)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Keine Treffer.</p>';
    $('#kl').querySelectorAll('tr.klick').forEach(tr => tr.onclick = () => { location.hash = `#/kunde/${tr.dataset.id}`; });
    $('#anz').textContent = `${liste.length} von ${nutzer.length}`;
  };
  main.innerHTML = `<section class="stack">
    <div class="row between"><h1 style="margin:0">Kunden</h1><button class="btn small ghost" id="csv">⬇️ CSV-Export</button></div>
    <input type="search" id="q" placeholder="Suchen: Name, E-Mail, Notiz …" value="${esc(suche)}">
    <div class="zfilter">${Object.keys(F).map(k => `<button data-f="${k}" class="${k === filter ? 'an' : ''}">${L[k]}</button>`).join('')}<span class="small muted" id="anz" style="align-self:center;margin-left:.3rem"></span></div>
    <div id="msg"></div><div class="card" id="kl" style="padding:.4rem .6rem;overflow-x:auto"></div>
  </section>`;
  $('#q').oninput = (e) => { suche = e.target.value; zeichne(); };
  main.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filter = b.dataset.f; main.querySelectorAll('[data-f]').forEach(x => x.classList.toggle('an', x === b)); zeichne(); });
  $('#csv').onclick = () => csv(nutzer);
  zeichne();
}

function csv(nutzer) {
  const zeilen = [['E-Mail', 'Name', 'Rolle', 'Status', 'Registriert', 'Zuletzt angemeldet', 'Jahrgang', 'Eltern-Zustimmung', 'Räume gelöst', 'Lektionen', 'Prüfungen bestanden', 'Notiz']];
  for (const n of nutzer) zeilen.push([n.email, n.name, n.admin ? 'Verwaltung' : 'Kunde', status(n)[0], datum(n.erstellt), datum(n.zuletzt), n.jahrgang || '', kind(n) ? (n.eltern ? 'ja' : 'nein') : '', n.fortschritt?.geloest ?? 0, n.fortschritt?.lektionen ?? 0, n.fortschritt?.pruefungen ?? 0, n.notiz || '']);
  const text = '﻿' + zeilen.map(z => z.map(v => `"${String(v ?? '').replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"`).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  a.download = `nachtfalter-kunden-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

async function kunde(id) {
  const { nutzer } = await laden();
  const n = nutzer.find(x => x.id === id);
  if (!n) { main.innerHTML = '<section class="stack"><p>Diesen Kunden gibt es nicht (mehr).</p><a class="btn" href="#/kunden">← Zur Liste</a></section>'; return; }
  const ich = n.id === ses?.user?.id;
  main.innerHTML = `<section class="stack">
    <a class="small" href="#/kunden">← Alle Kunden</a>
    <div><h1 style="margin:0">${esc(n.name || n.email)}</h1><p class="muted" style="margin:.2rem 0 .4rem">${esc(n.email)}</p>${badges(n)}</div>
    <div id="msg"></div>
    <div class="zgrid zwei">
      <div class="card"><h3 style="margin-top:0">Stammdaten</h3><dl class="zdl">
        <dt>Spitzname</dt><dd>${esc(n.name || '–')}</dd><dt>E-Mail</dt><dd>${esc(n.email)} ${n.bestaetigt ? '✓' : '<span class="zb warn">unbestätigt</span>'}</dd>
        <dt>Registriert</dt><dd>${datum(n.erstellt)}</dd><dt>Zuletzt angemeldet</dt><dd>${datum(n.zuletzt)} (${vor(n.zuletzt)})</dd>
        <dt>Sprache</dt><dd>${esc({ de: 'Deutsch', en: 'Englisch', uk: 'Ukrainisch' }[n.lang] || n.lang || '–')}</dd>
        <dt>Geburtsjahr</dt><dd>${esc(n.jahrgang || '–')}${kind(n) ? ` · Eltern-Zustimmung: <b>${n.eltern ? 'ja' : 'nein'}</b>` : ''}</dd>
        <dt>Zwei-Faktor</dt><dd>${n.zwei_faktor ? '🔐 eingerichtet' : '<span class="muted">nicht eingerichtet</span>'}${n.admin && !n.zwei_faktor ? ' <span class="zb warn">wird bei der nächsten Anmeldung in der Zentrale eingerichtet</span>' : ''}</dd>
        <dt>Kunden-ID</dt><dd class="small muted">${esc(n.id)}</dd></dl></div>
      <div class="card"><h3 style="margin-top:0">Aktionen</h3><div class="stack">
        <div><b class="small">Rolle</b><div class="zfilter" style="margin-top:.3rem">
          <button data-rolle="kunde" class="${!n.admin ? 'an' : ''}" ${ich ? 'disabled title="Die eigene Rolle kannst du nicht ändern"' : ''}>👤 Kunde</button>
          <button data-rolle="verwaltung" class="${n.admin ? 'an' : ''}">🛠️ Verwaltung</button></div>
          <p class="small muted" style="margin:.3rem 0 0">Verwaltung = Zugriff auf diese Zentrale.</p></div>
        <div class="zaktionen">
          <button class="btn small" id="pw">🔑 Passwort-Mail senden</button>
          ${n.bestaetigt ? '' : '<button class="btn small" id="best">✉️ Bestätigung erneut senden</button><button class="btn small ghost" id="bestH">✓ E-Mail manuell bestätigen</button>'}
          ${n.zwei_faktor && !ich ? '<button class="btn small ghost" id="mfa">🔐 Zwei-Faktor zurücksetzen</button>' : ''}
          ${kind(n) ? `<button class="btn small ghost" id="eltern">${n.eltern ? 'Eltern-Zustimmung entfernen' : '👪 Eltern-Zustimmung vermerken'}</button>` : ''}
          ${ich ? '' : `<button class="btn small ${n.gesperrt ? '' : 'ghost'}" id="sperre">${n.gesperrt ? '🔓 Entsperren' : '⛔ Sperren'}</button><button class="btn small rot" id="weg">🗑️ Konto löschen</button>`}
        </div></div></div>
    </div>
    <div class="card"><h3 style="margin-top:0">Lernfortschritt</h3><div id="fs"><p class="muted small">Lade …</p></div></div>
    <div class="zgrid zwei">
      <div class="card"><h3 style="margin-top:0">Zugänge</h3>
        ${n.zugaenge.length ? `<ul class="list">${n.zugaenge.map(z => { const a = new Date(z.gueltig_bis) > new Date(); return `<li><div class="row" style="padding:.4rem 0;flex-wrap:nowrap"><span class="grow"><b>${esc(PRODUKT[z.produkt] || z.produkt)}</b><br><span class="small muted">${a ? 'bis' : 'abgelaufen'} ${datum(z.gueltig_bis, false)} · ${esc(z.quelle)}${z.notiz ? ' · ' + esc(z.notiz) : ''}</span></span>${a ? `<button class="btn small ghost" data-ende="${z.id}">Beenden</button>` : ''}</div></li>`; }).join('')}</ul>` : '<p class="small muted">Keine Zugänge.</p>'}
        <form id="zf" class="row" style="margin-top:.5rem"><select name="produkt"><option value="arena">🖥️ Arena</option><option value="alles">⭐ Alles</option><option value="ki">🤖 KI-Werkstatt</option></select>
          <input name="tage" type="number" min="1" max="3650" value="30" style="width:6rem" aria-label="Tage"><span class="small muted">Tage</span><button class="btn small">Zugang geben</button></form></div>
      <div class="card"><h3 style="margin-top:0">Notiz <span class="small muted">(nur für die Verwaltung sichtbar)</span></h3>
        <textarea class="znotiz" id="nz" maxlength="2000" placeholder="z. B. Tester aus Klasse 8b, hat Feedback zu Raum w4 gegeben …">${esc(n.notiz)}</textarea>
        <button class="btn small" id="nzs" style="margin-top:.4rem">Notiz speichern</button></div>
    </div>
  </section>`;
  const neu = () => kunde(id);
  main.querySelectorAll('[data-rolle]').forEach(b => b.onclick = () => {
    const r = b.dataset.rolle; if ((r === 'verwaltung') === n.admin) return;
    if (!confirm(r === 'verwaltung' ? `${n.email} zur Verwaltung machen? Dann hat das Konto vollen Zugriff auf diese Zentrale.` : `${n.email} die Verwaltungs-Rolle entziehen?`)) return;
    tun(() => api('rolle_setzen', { user_id: id, rolle: r }), 'Rolle geändert.', neu);
  });
  $('#pw').onclick = () => confirm(`Eine Mail zum Zurücksetzen des Passworts an ${n.email} senden?`) && tun(() => api('passwort_mail', { user_id: id }), 'Passwort-Mail ist unterwegs.');
  if ($('#best')) $('#best').onclick = () => tun(() => api('bestaetigung_erneut', { user_id: id }), 'Bestätigungs-Mail erneut gesendet.');
  if ($('#bestH')) $('#bestH').onclick = () => confirm('E-Mail-Adresse ohne Klick des Kunden als bestätigt markieren?') && tun(() => api('email_bestaetigen', { user_id: id }), 'E-Mail als bestätigt markiert.', neu);
  if ($('#mfa')) $('#mfa').onclick = () => confirm(`Zwei-Faktor-Anmeldung von ${n.email} entfernen? (z. B. Handy verloren) Bei Verwaltungs-Konten wird sie bei der nächsten Anmeldung in der Zentrale neu eingerichtet.`) && tun(() => api('zwei_faktor_zuruecksetzen', { user_id: id }), 'Zwei-Faktor-Anmeldung zurückgesetzt.', neu);
  if ($('#eltern')) $('#eltern').onclick = () => tun(() => api('nutzer_setzen', { user_id: id, eltern: !n.eltern }), 'Gespeichert.', neu);
  if ($('#sperre')) $('#sperre').onclick = () => confirm(n.gesperrt ? 'Konto wieder freigeben?' : 'Konto sperren? Der Kunde kann sich dann nicht mehr anmelden.') && tun(() => api('nutzer_setzen', { user_id: id, gesperrt: !n.gesperrt }), n.gesperrt ? 'Konto entsperrt.' : 'Konto gesperrt.', neu);
  if ($('#weg')) $('#weg').onclick = () => {
    const b = prompt(`Konto ${n.email} endgültig löschen – mit Fortschritt und Zugängen?\nZum Bestätigen LÖSCHEN eintippen:`);
    if (b === 'LÖSCHEN') tun(() => api('nutzer_loeschen', { user_id: id, bestaetigung: b }), 'Konto gelöscht.', () => { location.hash = '#/kunden'; });
  };
  main.querySelectorAll('[data-ende]').forEach(b => b.onclick = () => confirm('Zugang sofort beenden?') && tun(() => api('zugang_beenden', { zugang_id: Number(b.dataset.ende) }), 'Zugang beendet.', neu));
  $('#zf').onsubmit = (e) => { e.preventDefault(); const f = e.target; tun(() => api('zugang_geben', { user_id: id, produkt: f.produkt.value, tage: Number(f.tage.value) }), 'Zugang vergeben.', neu); };
  $('#nzs').onclick = () => tun(() => api('notiz_setzen', { user_id: id, notiz: $('#nz').value }), 'Notiz gespeichert.');
  fortschritt(id);
}

async function fortschritt(id) {
  const el = $('#fs');
  try {
    const d = await api('nutzer_detail', { user_id: id });
    const R = Object.fromEntries(d.raeume.map(r => [r.id, r]));
    const ids = [...new Set([...NAMEN.reihenfolge, ...Object.keys(R)])];
    const geloest = d.raeume.filter(r => r.geloest).length;
    el.innerHTML = `<div class="zkpis" style="margin-bottom:.7rem">
        <div class="zkpi lime"><b>${geloest}/${gesamtRaeume()}</b><span>Räume gelöst</span></div>
        <div class="zkpi"><b>${d.raeume.filter(r => !r.geloest).length}</b><span>Räume begonnen</span></div>
        <div class="zkpi"><b>${d.lektionen}</b><span>Lektionen</span></div>
        <div class="zkpi"><b>${d.pruefungen.filter(p => p.bestanden).length}</b><span>Prüfungen bestanden</span></div>
      </div>
      <p class="small muted" style="margin:0 0 .5rem">Zuletzt synchronisiert: ${datum(d.aktualisiert)} (${vor(d.aktualisiert)})</p>
      ${d.pruefungen.length ? `<p class="small" style="margin:.2rem 0">Prüfungen: ${d.pruefungen.map(p => `<span class="zb ${p.bestanden ? 'ok' : ''}">${esc(p.level)} · ${p.bestanden ? 'bestanden' : 'offen'} · ${p.versuche} Versuch(e)</span>`).join(' ')}</p>` : ''}
      ${d.geschichten.length ? `<p class="small" style="margin:.2rem 0">Geschichten: ${d.geschichten.map(g => `<span class="zb ${g.fertig ? 'ok' : ''}">${esc(NAMEN.geschichten?.[g.id] || g.id)} · ${g.fertig ? 'fertig' : 'begonnen'}</span>`).join(' ')}</p>` : ''}
      <div style="overflow-x:auto"><table class="ztab"><thead><tr><th>Raum</th><th>Stand</th><th class="zmobil-weg">Richtige Antworten</th><th class="zmobil-weg">Tipps</th></tr></thead><tbody>
      ${ids.map(rid => { const r = R[rid]; const m = NAMEN.raeume[rid] || { titel: rid };
        return `<tr><td>${esc(m.titel)} <span class="small muted">${esc(m.level || '')}</span></td>
          <td>${!r ? '<span class="muted">–</span>' : r.geloest ? `<span class="zb ok">✓ ${datum(r.geloest, false)}</span>` : `<span class="zb warn">begonnen</span>`}</td>
          <td class="zmobil-weg">${r ? r.antworten : ''}</td><td class="zmobil-weg">${r ? r.tipps : ''}</td></tr>`; }).join('')}
      </tbody></table></div>`;
  } catch (e) { el.innerHTML = `<p class="small muted">Fortschritt nicht ladbar: ${esc(e.message)}</p>`; }
}

async function codes() {
  const { codes: liste } = await laden();
  const offen = (c) => !c.widerrufen && (!c.gueltig_bis || new Date(c.gueltig_bis) > new Date()) && c.uses < c.max_uses;
  main.innerHTML = `<section class="stack">
    <h1 style="margin:0">Einladungscodes</h1><div id="msg"></div>
    <div class="card"><h3 style="margin-top:0">Neuen Code erstellen</h3>
      <form id="cf" class="stack konto">
        <label>Für wen? (Notiz)<input name="notiz" maxlength="200" placeholder="z. B. Arena-Tester Klasse 8b"></label>
        <div class="zgrid zwei">
          <label>Wie oft einlösbar?<input name="max_uses" type="number" min="1" max="1000" value="1"></label>
          <label>Code gültig (Tage)<input name="gueltig_tage" type="number" min="1" max="365" value="30"></label>
          <label>Schaltet frei<select name="produkt"><option value="arena">🖥️ Arena</option><option value="alles">⭐ Alles</option><option value="ki">🤖 KI-Werkstatt</option><option value="">nichts (nur Vermerk)</option></select></label>
          <label>Zugang für (Tage)<input name="tage" type="number" min="1" max="3650" value="30"></label>
        </div>
        <button class="btn primary">Code erstellen</button></form>
      <div id="neuCode"></div></div>
    <div class="card" style="overflow-x:auto"><h3 style="margin-top:0">Alle Codes</h3>
      ${liste.length ? `<table class="ztab"><thead><tr><th>Code</th><th>Notiz</th><th>Genutzt</th><th class="zmobil-weg">Gültig bis</th><th></th></tr></thead><tbody>
      ${liste.map(c => `<tr><td><code translate="no">${esc(c.code)}</code><br><span class="small muted">${esc(PRODUKT[c.produkt] || '–')}${c.tage ? ` · ${c.tage} T.` : ''}</span></td><td>${esc(c.notiz || '')}</td><td>${c.uses}/${c.max_uses}</td>
        <td class="zmobil-weg small">${datum(c.gueltig_bis, false)}</td><td>${offen(c) ? `<button class="btn small ghost" data-w="${esc(c.code)}">Widerrufen</button>` : `<span class="zb">${c.widerrufen ? 'widerrufen' : 'abgelaufen'}</span>`}</td></tr>`).join('')}</tbody></table>` : '<p class="small muted">Noch keine Codes.</p>'}
    </div></section>`;
  $('#cf').onsubmit = async (e) => {
    e.preventDefault(); const f = e.target;
    try {
      const r = await api('code_erstellen', { notiz: f.notiz.value, max_uses: Number(f.max_uses.value), gueltig_tage: Number(f.gueltig_tage.value), produkt: f.produkt.value, tage: Number(f.tage.value) });
      D = null; await codes();
      $('#neuCode').innerHTML = `<div class="feedback ok" style="margin-top:.6rem">Neuer Code: <code translate="no" style="font-size:1.15rem">${esc(r.code.code)}</code> <button class="btn small" id="kop">Kopieren</button></div>`;
      $('#kop').onclick = () => navigator.clipboard?.writeText(r.code.code).then(() => { $('#kop').textContent = '✓ Kopiert'; });
    } catch (err) { meldung(err.message, false); }
  };
  main.querySelectorAll('[data-w]').forEach(b => b.onclick = () => confirm(`Code ${b.dataset.w} widerrufen? Wer ihn schon eingelöst hat, behält seinen Zugang.`) && tun(() => api('code_widerrufen', { code: b.dataset.w }), 'Code widerrufen.', codes));
}

const AKTION = { code_erstellt: '🎟️ Code erstellt', code_widerrufen: '🎟️ Code widerrufen', nutzer_geaendert: '✏️ Konto geändert', zugang_gegeben: '➕ Zugang gegeben', zugang_beendet: '➖ Zugang beendet', nutzer_geloescht: '🗑️ Konto gelöscht', passwort_mail: '🔑 Passwort-Mail', rolle_gesetzt: '🛠️ Rolle geändert', notiz_geaendert: '📝 Notiz', email_bestaetigt: '✓ E-Mail bestätigt', zwei_faktor_zurueckgesetzt: '🔐 Zwei-Faktor zurückgesetzt', bestaetigung_erneut: '✉️ Bestätigung erneut' };
async function protokoll() {
  main.innerHTML = '<section class="stack"><h1 style="margin:0">Protokoll</h1><p class="muted">Lade …</p></section>';
  const [{ eintraege }, { nutzer }] = await Promise.all([api('protokoll'), laden()]);
  const M = Object.fromEntries(nutzer.map(n => [n.id, n]));
  const wer = (id) => M[id] ? esc(M[id].name || M[id].email) : '<span class="muted">–</span>';
  const det = (e) => { const d = e.details || {}; return esc([d.code, d.produkt && (PRODUKT[d.produkt] || d.produkt), d.tage && `${d.tage} Tage`, d.rolle, d.email, d.gesperrt === true && 'gesperrt', d.gesperrt === false && 'entsperrt', d.parent_consent !== undefined && `Eltern: ${d.parent_consent ? 'ja' : 'nein'}`].filter(Boolean).join(' · ')); };
  main.innerHTML = `<section class="stack"><h1 style="margin:0">Protokoll</h1><p class="small muted" style="margin:0">Alle Änderungen in der Verwaltung (die letzten 200).</p>
    <div class="card" style="overflow-x:auto">${eintraege.length ? `<table class="ztab"><thead><tr><th>Wann</th><th>Was</th><th>Betrifft</th><th class="zmobil-weg">Wer</th></tr></thead><tbody>
    ${eintraege.map(e => `<tr><td class="small">${datum(e.at)}</td><td>${esc(AKTION[e.aktion] || e.aktion)}<br><span class="small muted">${det(e)}</span></td><td>${e.ziel ? `<a href="#/kunde/${e.ziel}">${wer(e.ziel)}</a>` : ''}</td><td class="zmobil-weg small">${wer(e.admin_id)}</td></tr>`).join('')}
    </tbody></table>` : '<p class="small muted">Noch keine Einträge.</p>'}</div></section>`;
}

async function system() {
  main.innerHTML = '<section class="stack"><h1 style="margin:0">System</h1><p class="muted">Prüfe Dienste …</p></section>';
  let s = null; try { s = await api('status'); } catch (e) { s = { fehler: e.message }; }
  const z = (ok, t) => `<span class="zb ${ok ? 'ok' : 'rot'}">${ok ? '● läuft' : '● Problem'}</span> ${t || ''}`;
  const link = (u, t) => `<li><a href="${u}" target="_blank" rel="noopener"><span class="grow"><span class="t">${t}</span><span class="s">${esc(u.replace('https://', ''))}</span></span></a></li>`;
  main.innerHTML = `<section class="stack"><h1 style="margin:0">System</h1>
    <div class="card"><h3 style="margin-top:0">Dienste</h3>${s.fehler ? `<p class="feedback no">${esc(s.fehler)}</p>` : `<dl class="zdl">
      <dt>Hacklab (app.)</dt><dd>${z(s.app.ok, `Version <b>${esc(s.app.version || '?')}</b> · ${s.app.ms} ms`)}</dd>
      <dt>Vorschau</dt><dd>${z(s.vorschau.ok, s.vorschau.geschuetzt ? '· passwortgeschützt' : '')}</dd>
      <dt>Startseite (www.)</dt><dd>${z(s.www.ok, `· ${s.www.ms} ms`)}</dd>
      <dt>Arena</dt><dd>${z(s.arena.ok, s.arena.info ? `· ${s.arena.info.offen ? 'offen' : 'geschlossen'} · ${esc(s.arena.info.frei ?? '?')} freie Plätze` : '')}</dd>
      <dt>Konto-Datenbank</dt><dd>${z(true, '· Supabase Frankfurt')}</dd></dl>`}
      <button class="btn small ghost" id="neu" style="margin-top:.6rem">Neu prüfen</button></div>
    <div class="card"><h3 style="margin-top:0">Schnellzugriff</h3><ul class="list">
      ${link('https://www.nachtfalter.tech/', '🦋 Startseite')}${link(APP + '/', '🎮 Hacklab')}${link('https://vorschau.nachtfalter.tech/', '🧪 Vorschau')}${link('https://arena.nachtfalter.tech/', '🖥️ Arena')}
      ${link('https://supabase.com/dashboard/project/sxapebxzxmathkvtuuvn', '🗄️ Supabase (Konten, E-Mail-Vorlagen)')}${link('https://app.brevo.com/', '✉️ Brevo (Mail-Versand, Protokolle)')}
    </ul><p class="small muted" style="margin:.5rem 0 0">Plesk und Strato öffnest du wie gewohnt über deine Lesezeichen.</p></div>
  </section>`;
  $('#neu').onclick = system;
}

// ---------------------------------------------------------------- Router
async function route() {
  if (!await frisch()) return anmelden();
  if (stufe() !== 'aal2') return zweiterFaktor();
  kopf(true);
  const [, teil = '', arg] = (location.hash || '#/').split('/');
  document.querySelectorAll('#tabs a').forEach(a => a.classList.toggle('an', a.dataset.r === (teil === 'kunde' ? 'kunden' : teil)));
  try {
    if (teil === 'kunden') await kunden();
    else if (teil === 'kunde' && arg) await kunde(arg);
    else if (teil === 'codes') await codes();
    else if (teil === 'protokoll') await protokoll();
    else if (teil === 'system') await system();
    else await uebersicht();
  } catch (e) {
    if (!['abgemeldet', 'kein Zugriff', 'Bitte anmelden.'].includes(e.message)) main.innerHTML = `<section class="stack"><div class="card warn">${esc(e.message)}</div><button class="btn" id="nochmal">Neu laden</button></section>`, $('#nochmal').onclick = () => { D = null; route(); };
  }
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);
route();
