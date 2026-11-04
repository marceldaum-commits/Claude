// Nachtfalter-Konto: Registrieren, Anmelden, Passwort vergessen, Profil, Zugänge.
// Eigenes Supabase-Projekt „nachtfalter-konto“ (getrennt vom Lernstand-Sync). Bewusst ohne Bibliothek:
// nur die öffentlichen Auth- und REST-Endpunkte mit dem Publishable Key. Rechte regelt Row Level Security
// (supabase/konto-schema.sql): Nutzer sehen nur ihr eigenes Profil und ihre eigenen Zugänge.
// Später eigene Adresse: konto.nachtfalter.tech.
import { initLang, protectCodes, loadUI, langNoteHTML, langPickerHTML, bindLangPicker, currentLang, setLang } from './i18n.js';

const C = window.KLY_CONFIG || {};
const URL_ = C.kontoUrl, KEY = C.kontoKey;
const STORE = 'kly.auth'; // gemeinsam mit dem Hacklab (supabase-js-Format): einmal anmelden, überall angemeldet
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const here = () => location.origin + location.pathname; // Rücksprung nach E-Mail-Links
const YEAR = new Date().getFullYear();
const ADULT = 16; // DSGVO Art. 8 / Deutschland: unter 16 nur mit Einwilligung der Eltern
// Nur der Jahrgang ist bekannt: vorsichtig rechnen – wer dieses Jahr 16 wird, kann noch 15 sein.
const evtlKind = (jahr) => !!jahr && YEAR - jahr <= ADULT;

// ---- Sitzung --------------------------------------------------------------------------------
let ses = null;
try { ses = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch { ses = null; }
const saveSes = (s) => { ses = s; try { s ? localStorage.setItem(STORE, JSON.stringify(s)) : localStorage.removeItem(STORE); localStorage.setItem('kly.auth.projekt', URL_); } catch { /* */ } };
const fromToken = (t) => ({ access_token: t.access_token, refresh_token: t.refresh_token, token_type: 'bearer', expires_in: Number(t.expires_in || 3600), expires_at: Math.floor(Date.now() / 1000) + Number(t.expires_in || 3600), user: t.user || null });

async function api(path, { method = 'GET', body, auth = false, prefer } = {}) {
  const headers = { apikey: KEY, 'Content-Type': 'application/json' };
  if (auth) { await fresh(); if (!ses) throw new Error('Bitte erneut anmelden.'); headers.Authorization = `Bearer ${ses.access_token}`; }
  if (prefer) headers.Prefer = prefer;
  const r = await fetch(URL_ + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const txt = await r.text(); let data = null; try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
  if (!r.ok) throw Object.assign(new Error(fehlertext(data, r.status)), { status: r.status });
  return data;
}
function fehlertext(d, status) {
  const m = String(d?.msg || d?.error_description || d?.message || d?.error || '');
  if (/Invalid login credentials/i.test(m)) return 'E-Mail oder Passwort stimmt nicht.';
  if (/Email not confirmed/i.test(m)) return 'Bitte bestätige zuerst deine E-Mail (Link im Postfach).';
  if (/already registered|already exists/i.test(m)) return 'Für diese E-Mail gibt es schon ein Konto. Melde dich an oder nutze „Passwort vergessen“.';
  if (/Password should be|weak/i.test(m)) return 'Das Passwort ist zu schwach. Nimm mindestens 10 Zeichen.';
  if (/rate limit|too many/i.test(m) || status === 429) return 'Zu viele Versuche. Bitte warte ein paar Minuten.';
  if (/Signups not allowed/i.test(m)) return 'Neue Konten sind gerade geschlossen (Beta).';
  if (/invalid format|Unable to validate email/i.test(m)) return 'Diese E-Mail-Adresse sieht nicht richtig aus.';
  if (/should be different/i.test(m)) return 'Das neue Passwort muss anders sein als das alte.';
  if (/expired|invalid.*(token|link)|otp/i.test(m)) return 'Der Link ist abgelaufen. Fordere einfach einen neuen an.';
  if (/Bitte erneut anmelden/.test(m)) return m;
  console.warn('Konto:', status, m);
  return `Das hat nicht geklappt (Fehler ${status}). Bitte versuch es nochmal.`;
}
async function fresh() {
  if (!ses) return;
  if (ses.expires_at - 60 > Date.now() / 1000) return;
  try { saveSes(fromToken(await api('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: ses.refresh_token } }))); }
  catch (e) { if (e.status >= 400 && e.status < 500) saveSes(null); } // bei Netz-/Serverstörung angemeldet bleiben
}

// ---- Rückkehr aus E-Mail-Links (#access_token=…&type=signup|recovery) -------------------------
let modus = null, hinweis = '', fehlerHinweis = '';
(function rueckkehr() {
  const h = new URLSearchParams(location.hash.replace(/^#/, ''));
  if (h.get('error_description') || h.get('error')) { console.warn('Konto-Link:', h.get('error_description')); fehlerHinweis = 'Der Link ist abgelaufen oder wurde schon benutzt. Fordere unten einfach einen neuen an.'; }
  if (h.get('access_token')) {
    saveSes(fromToken({ access_token: h.get('access_token'), refresh_token: h.get('refresh_token'), expires_in: h.get('expires_in') }));
    if (h.get('type') === 'recovery') modus = 'neues-passwort';
    else if (h.get('type') === 'signup') hinweis = '✓ E-Mail bestätigt – du bist angemeldet.';
  }
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
})();

// ---- Ansichten ------------------------------------------------------------------------------
const main = $('#main');
const msg = (t, ok = false) => { const e = $('#msg'); if (e) e.innerHTML = t ? `<div class="feedback ${ok ? 'ok' : 'no'}">${esc(t)}</div>` : ''; };
const busy = (form, on) => form.querySelectorAll('button, input, select').forEach(x => { x.disabled = on; });

function rahmen(inner, { held = false } = {}) {
  const zurueck = $('#zumLab'); if (zurueck) zurueck.hidden = held; // abgemeldet: kein Weg am Login vorbei
  const meldungen = `${hinweis ? `<div class="feedback ok">${esc(hinweis)}</div>` : ''}
    ${fehlerHinweis ? `<div class="feedback no">${esc(fehlerHinweis)}</div>` : ''}`;
  const sprache = `<details class="card tight small"><summary>🌍 Sprache · Language · Мова</summary><div style="margin-top:.5rem">${langPickerHTML()}</div></details>`;
  main.innerHTML = held ? `${langNoteHTML()}<section class="anmelde-layout">
    <div class="held-links">
      <img class="held-bild" src="icons/hero.svg" alt="Ein Nachtfalter fliegt im Mondlicht über ein Terminal">
      <div><h1 class="held-titel">Willkommen im <span>Hacklab</span></h1>
      <p class="muted" style="margin:.3rem 0 0">Linux und ethisches Hacken lernen – Schritt für Schritt, am Handy oder am PC. Kostenlos.</p></div>
      <ul class="held-punkte small muted"><li>🧩 Räume, Rätsel und Geschichten</li><li>💬 Tipps, wenn du festhängst</li><li>☁️ Fortschritt auf allen Geräten</li></ul>
    </div>
    <div class="held-rechts stack">${meldungen}${inner}<div id="msg"></div>${sprache}</div>
  </section>` : `${langNoteHTML()}<section class="stack" style="max-width:520px;margin:0 auto">
    <h1 style="margin-bottom:.2rem">Nachtfalter-Konto</h1>
    <p class="small muted" style="margin-top:0">Kostenlos registrieren – dein Fortschritt im Hacklab auf allen Geräten. <span class="badge plain">Beta</span></p>
    ${meldungen}${inner}<div id="msg"></div>${sprache}
    <p class="small muted"><a href="./">← Zurück zum Hacklab</a></p>
  </section>`;
  bindLangPicker(main);
  hinweis = ''; fehlerHinweis = '';
}

function abgemeldet(tab = 'login') {
  const t = (id, label) => `<button type="button" role="tab" aria-selected="${tab === id}" class="${tab === id ? 'an' : ''}" data-tab="${id}">${label}</button>`;
  const formular = {
    login: `<form id="f" class="stack">
      <label>E-Mail<input type="email" name="email" autocomplete="email" required></label>
      <label>Passwort<input type="password" name="pw" autocomplete="current-password" required></label>
      <button class="btn go block">Anmelden</button></form>`,
    neu: `<form id="f" class="stack">
      <label>Wie sollen wir dich nennen?<input name="name" maxlength="30" placeholder="Spitzname – nicht dein echter Name" required></label>
      <label>E-Mail<input type="email" name="email" autocomplete="email" required></label>
      <label>Passwort (mindestens 10 Zeichen – Tipp: drei Wörter mit Bindestrich, z. B. Mond-Kakao-Fahrrad)<input type="password" name="pw" autocomplete="new-password" minlength="10" required></label>
      <label>Geburtsjahr<input type="number" name="jahr" inputmode="numeric" min="1900" max="${YEAR}" placeholder="z. B. 2012" required></label>
      <label>Sprache<select name="lang"><option value="de">Deutsch</option><option value="en">English</option><option value="uk">Українська</option></select></label>
      <div id="eltern" class="card warn small" hidden>
        <b>Unter ${ADULT} Jahren:</b> Hol jetzt bitte deine Mama, deinen Papa oder wer sonst für dich sorgt – ihr legt das Konto zusammen an.
        <label class="row" style="flex-wrap:nowrap;margin-top:.4rem"><input type="checkbox" name="eltern" style="width:auto"> Ich bin Elternteil bzw. erziehungsberechtigt und stimme zu, dass mein Kind dieses Konto nutzt.</label>
      </div>
      <p class="small muted">Gespeichert werden E-Mail, Spitzname, Sprache, Geburtsjahr und ob ein Elternteil zugestimmt hat – nur für dein Konto und deine Zugänge. Keine Werbung, keine Weitergabe.</p>
      <button class="btn go block">Konto anlegen</button></form>`,
    vergessen: `<form id="f" class="stack">
      <label>E-Mail<input type="email" name="email" autocomplete="email" required></label>
      <button class="btn go block">Link zum Zurücksetzen schicken</button></form>`,
  }[tab];
  rahmen(`<div class="card anmelde-karte">
    ${tab === 'vergessen' ? '<h3 style="margin:0 0 .6rem">Passwort vergessen?</h3>' : `<div class="reiter" role="tablist">${t('login', 'Anmelden')}${t('neu', 'Registrieren')}</div>`}
    ${formular}
    <p class="small" style="margin:.8rem 0 0;text-align:center">${tab === 'vergessen' ? '<button class="linkbtn" data-tab="login">← Zurück zur Anmeldung</button>' : tab === 'login' ? '<button class="linkbtn" data-tab="vergessen">Passwort vergessen?</button>' : 'Schon ein Konto? <button class="linkbtn" data-tab="login">Hier anmelden</button>'}</p>
  </div>`, { held: true });
  main.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => abgemeldet(b.dataset.tab));
  const f = $('#f');
  if (tab === 'neu') {
    const pruefe = () => { const j = +f.jahr.value; $('#eltern').hidden = !evtlKind(j); };
    f.jahr.oninput = pruefe;
    f.lang.value = currentLang();
  }
  f.onsubmit = async (e) => {
    e.preventDefault(); msg(''); busy(f, true);
    try {
      if (tab === 'login') {
        saveSes(fromToken(await api('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: f.email.value.trim(), password: f.pw.value } })));
        return location.replace('./'); // nach der Anmeldung direkt ins Hacklab
      }
      if (tab === 'neu') {
        const jahr = +f.jahr.value, kind = evtlKind(jahr);
        if (kind && !f.eltern.checked) throw new Error(`Unter ${ADULT} braucht es die Zustimmung eines Elternteils (Haken setzen).`);
        await api(`/auth/v1/signup?redirect_to=${encodeURIComponent(here())}`, { method: 'POST', body: {
          email: f.email.value.trim(), password: f.pw.value,
          data: { display_name: f.name.value.trim().slice(0, 30), lang: f.lang.value, birth_year: String(jahr), parent_consent: kind ? 'true' : 'false' },
        } });
        f.reset(); return msg('Fast geschafft! Wir haben dir eine E-Mail geschickt. Klicke auf den Link darin, dann ist dein Konto aktiv. Keine E-Mail da? Schau im Spam-Ordner nach. Hattest du schon ein Konto, nutze „Passwort vergessen“.', true);
      }
      if (tab === 'vergessen') {
        await api(`/auth/v1/recover?redirect_to=${encodeURIComponent(here())}`, { method: 'POST', body: { email: f.email.value.trim() } });
        return msg('Wenn es ein Konto mit dieser E-Mail gibt, ist jetzt ein Link unterwegs. Schau auch im Spam-Ordner nach.', true);
      }
    } catch (err) { msg(err.message); } finally { busy(f, false); }
  };
}

async function angemeldet() {
  await fresh();
  if (!ses) return abgemeldet();
  rahmen('<div class="card"><p class="muted">Lade dein Konto …</p></div>');
  try {
    const [user, profile, zugaenge, st] = await Promise.all([
      api('/auth/v1/user', { auth: true }),
      api(`/rest/v1/profiles?select=display_name,lang,birth_year,parent_consent&id=eq.${ses.user?.id || ''}`, { auth: true }).catch(() => []),
      api('/rest/v1/entitlements?select=produkt,gueltig_bis,quelle&order=gueltig_bis.desc', { auth: true }),
      api('/rest/v1/rpc/mein_status', { method: 'POST', auth: true, body: {} }).catch(() => ({})),
    ]);
    if (!ses.user) { saveSes({ ...ses, user }); }
    const p = (profile[0]) || (await api(`/rest/v1/profiles?select=display_name,lang,birth_year,parent_consent&id=eq.${user.id}`, { auth: true }))[0] || {};
    const NAMEN = { arena: '🖥️ Arena (Online-Labs)', ki: '🤖 KI-Werkstatt', alles: '⭐ Alles' };
    const QUELLE = { beta: 'Beta-Zugang', kauf: 'gekauft', geschenk: 'geschenkt' };
    const datum = (d) => new Date(d).toLocaleDateString(currentLang() === 'uk' ? 'uk-UA' : currentLang() === 'en' ? 'en-GB' : 'de-DE');
    const liste = zugaenge.length ? `<ul class="list">${zugaenge.map(z => { const aktiv = new Date(z.gueltig_bis) > new Date(); return `<li><div class="row" style="flex-wrap:nowrap;padding:.45rem 0"><span class="state ${aktiv ? 'done' : ''}">${aktiv ? '✓' : '–'}</span><span class="grow" style="display:flex;flex-direction:column"><b>${esc(NAMEN[z.produkt] || z.produkt)}</b><span class="small muted">${aktiv ? 'gültig bis' : 'abgelaufen am'} ${esc(datum(z.gueltig_bis))} · ${esc(QUELLE[z.quelle] || z.quelle)}</span></span></div></li>`; }).join('')}</ul>`
      : '<p class="small muted" style="margin:0">Noch keine Zugänge. Alles, was im Browser läuft, ist kostenlos. Arena und KI-Werkstatt kommen bald.</p>';
    const kind = evtlKind(p.birth_year);
    rahmen(`
      <div class="card"><h2 style="margin-bottom:.3rem">Hallo${p.display_name ? ' ' + esc(p.display_name) : ''}!</h2>
        <p class="small muted" style="margin:0">${esc(user.email)}${p.birth_year ? ` · Jahrgang ${esc(p.birth_year)}` : ''}${kind ? ` · Elternzustimmung: ${p.parent_consent ? '✓' : 'fehlt'}` : ''}</p></div>
      ${st?.admin ? `<a class="card lime" href="${(location.hostname.startsWith('vorschau.') ? '/zentrale/' : 'https://zentrale.nachtfalter.tech/')}" style="display:block;text-decoration:none;color:inherit"><b>🛠️ Zentrale</b><br><span class="small muted">Kunden, Fortschritt, Rollen, Einladungscodes</span></a>` : ''}
      ${st?.gesperrt ? '' : '<a class="btn primary block" href="./">▶ Zum Hacklab</a>'}
      <div class="card"><h3>Meine Zugänge</h3>${liste}</div>
      <details class="card"><summary><b>Einladungscode einlösen</b> <span class="small muted">(z. B. für die Arena)</span></summary>
        <form id="cf" class="stack" style="margin-top:.6rem"><label>Einladungscode<input name="code" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="NF-XXXX-XXXX-XXXX" required></label>
        <button class="btn go">Einlösen</button></form></details>
      <div class="card"><h3>Profil</h3><form id="pf" class="stack">
        <label>Name<input name="name" maxlength="30" value="${esc(p.display_name || '')}"></label>
        <label>Sprache<select name="lang"><option value="de">Deutsch</option><option value="en">English</option><option value="uk">Українська</option></select></label>
        <button class="btn primary">Speichern</button></form></div>
      <div class="card"><h3>Passwort ändern</h3><form id="pw" class="stack">
        <label>Neues Passwort (mindestens 10 Zeichen)<input type="password" name="pw" autocomplete="new-password" minlength="10" required></label>
        <button class="btn">Passwort ändern</button></form></div>
      <div class="card"><h3>Meine Daten</h3>
        <p class="small muted" style="margin-top:0">Alles, was wir zu deinem Konto speichern, als Datei – und auf Wunsch die Löschung deines Kontos.</p>
        <div class="row"><button class="btn small" id="export">⬇️ Meine Daten herunterladen</button>
        <a class="btn small ghost" href="mailto:info@nachtfalter.tech?subject=${encodeURIComponent('Bitte mein Nachtfalter-Konto löschen')}&body=${encodeURIComponent(`Hallo,\n\nbitte löscht mein Nachtfalter-Konto mit allen Daten.\nE-Mail-Adresse des Kontos: ${user.email || ''}\n\nDanke!`)}">🗑️ Konto löschen lassen</a></div></div>
      <button class="btn ghost block" id="out">Abmelden</button>`);
    const cf = $('#cf');
    if (cf) cf.onsubmit = async (e) => {
      e.preventDefault(); busy(cf, true);
      try {
        const r = await api('/rest/v1/rpc/einloesen', { method: 'POST', auth: true, body: { p_code: cf.code.value } });
        if (r?.ok) { hinweis = '✓ Code eingelöst – viel Spaß!'; return angemeldet(); }
        msg({ ungueltig: 'Diesen Code gibt es nicht. Prüfe die Schreibweise.', abgelaufen: 'Dieser Code ist abgelaufen. Frag nach einem neuen.', aufgebraucht: 'Dieser Code wurde schon zu oft benutzt.', zu_viele_versuche: 'Zu viele falsche Versuche. Bitte warte eine Stunde.' }[r?.grund] || 'Das hat nicht geklappt. Bitte versuch es nochmal.');
      } catch (err) { msg(err.message); } finally { busy(cf, false); }
    };
    const pf = $('#pf'); pf.lang.value = p.lang || 'de';
    pf.onsubmit = async (e) => {
      e.preventDefault(); busy(pf, true);
      try { await api(`/rest/v1/profiles?id=eq.${user.id}`, { method: 'PATCH', auth: true, prefer: 'return=minimal', body: { display_name: pf.name.value.trim().slice(0, 30), lang: pf.lang.value } }); msg('✓ Profil gespeichert.', true); if (pf.lang.value !== currentLang()) setLang(pf.lang.value); }
      catch (err) { msg(err.message); } finally { busy(pf, false); }
    };
    const pw = $('#pw');
    pw.onsubmit = async (e) => {
      e.preventDefault(); busy(pw, true);
      try { await api('/auth/v1/user', { method: 'PUT', auth: true, body: { password: pw.pw.value } }); pw.reset(); msg('✓ Passwort geändert.', true); }
      catch (err) { msg(err.message); } finally { busy(pw, false); }
    };
    $('#export').onclick = async () => {
      try {
        const [prof, fort, zug] = await Promise.all([
          api(`/rest/v1/profiles?select=*&id=eq.${user.id}`, { auth: true }),
          api(`/rest/v1/progress?select=updated_at,state&user_id=eq.${user.id}`, { auth: true }).catch(() => []),
          api('/rest/v1/entitlements?select=produkt,gueltig_bis,quelle,notiz', { auth: true }).catch(() => []),
        ]);
        const daten = { exportiert_am: new Date().toISOString(), konto: { id: user.id, email: user.email, registriert: user.created_at, zuletzt_angemeldet: user.last_sign_in_at }, profil: prof[0] || null, fortschritt: fort[0] || null, zugaenge: zug };
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(daten, null, 2)], { type: 'application/json' }));
        a.download = `nachtfalter-meine-daten-${new Date().toISOString().slice(0, 10)}.json`; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      } catch (err) { msg(err.message); }
    };
    $('#out').onclick = async () => { try { await api('/auth/v1/logout', { method: 'POST', auth: true }); } catch { /* */ } saveSes(null); abgemeldet(); };
  } catch (err) {
    if (/anmelden|JWT|401/i.test(err.message)) { saveSes(null); return abgemeldet(); }
    rahmen(`<div class="card danger">${esc(err.message)}</div><button class="btn" id="reload">Neu laden</button>`);
    $('#reload').onclick = () => location.reload();
  }
}

function neuesPasswort() {
  rahmen(`<div class="card"><h3>Neues Passwort festlegen</h3><form id="f" class="stack">
    <label>Neues Passwort (mindestens 10 Zeichen)<input type="password" name="pw" autocomplete="new-password" minlength="10" required></label>
    <button class="btn go block">Speichern</button></form></div>`);
  const f = $('#f');
  f.onsubmit = async (e) => {
    e.preventDefault(); busy(f, true);
    try { await api('/auth/v1/user', { method: 'PUT', auth: true, body: { password: f.pw.value } }); hinweis = '✓ Neues Passwort gespeichert.'; angemeldet(); }
    catch (err) { msg(err.message); busy(f, false); }
  };
}

// ---- Start ----------------------------------------------------------------------------------
initLang(); protectCodes(); await loadUI();
if (!URL_ || !KEY) rahmen('<div class="card warn">Das Konto ist auf dieser Seite noch nicht eingerichtet.</div>');
else if (modus === 'neues-passwort') neuesPasswort();
else if (ses) angemeldet();
else abgemeldet(new URLSearchParams(location.search).get('neu') ? 'neu' : 'login');
