// Nachtfalter-Verwaltung: Nutzer, Einladungscodes, Zugänge. Nur für Admins.
// Alle Änderungen laufen über die Supabase Edge Function „admin“ (prüft Anmeldung + Admin-Rolle serverseitig).
// Diese Seite selbst hat keine besonderen Rechte – sie zeigt nur an, was der Dienst erlaubt.
const C = window.KLY_CONFIG || {};
const URL_ = C.kontoUrl, KEY = C.kontoKey;
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const datum = (d) => (d ? new Date(d).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }) : '–');
const PRODUKT = { arena: '🖥️ Arena', ki: '🤖 KI', alles: '⭐ Alles' };
const main = $('#main');

function session() { try { return JSON.parse(localStorage.getItem('kly.auth') || 'null'); } catch { return null; } }
async function frisch() {
  let s = session(); if (!s) return null;
  if (s.expires_at - 60 > Date.now() / 1000) return s;
  const r = await fetch(`${URL_}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: s.refresh_token }) });
  if (!r.ok) return null;
  const t = await r.json();
  s = { ...s, access_token: t.access_token, refresh_token: t.refresh_token, expires_in: t.expires_in, expires_at: Math.floor(Date.now() / 1000) + t.expires_in, user: t.user || s.user };
  try { localStorage.setItem('kly.auth', JSON.stringify(s)); } catch { /* */ }
  return s;
}
async function admin(aktion, daten = {}) {
  const s = await frisch(); if (!s) throw new Error('Bitte zuerst im Konto anmelden.');
  const r = await fetch(`${URL_}/functions/v1/admin`, { method: 'POST', headers: { apikey: KEY, Authorization: `Bearer ${s.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ aktion, ...daten }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.fehler || `Fehler ${r.status}`);
  return j;
}
const meldung = (t, ok = true) => { const e = $('#msg'); if (e) { e.innerHTML = `<div class="feedback ${ok ? 'ok' : 'no'}">${esc(t)}</div>`; e.scrollIntoView({ block: 'nearest' }); } };

let daten = null, filter = '';
async function laden() {
  main.innerHTML = '<section class="stack" style="max-width:900px;margin:0 auto"><p class="muted">Lade …</p></section>';
  try { daten = await admin('uebersicht'); zeigen(); }
  catch (e) {
    main.innerHTML = `<section class="stack" style="max-width:600px;margin:0 auto"><h1>Verwaltung</h1><div class="card warn">${esc(e.message)}</div>
      <a class="btn" href="konto.html">Zum Konto (anmelden)</a></section>`;
  }
}

function zeigen() {
  const { nutzer, codes } = daten;
  const f = filter.toLowerCase();
  const liste = nutzer.filter(n => !f || (n.email + ' ' + n.name).toLowerCase().includes(f))
    .sort((a, b) => String(b.erstellt).localeCompare(String(a.erstellt)));
  const aktivCodes = codes.filter(c => !c.widerrufen && (!c.gueltig_bis || new Date(c.gueltig_bis) > new Date()) && c.uses < c.max_uses);
  main.innerHTML = `<section class="stack" style="max-width:900px;margin:0 auto">
    <div class="row between"><h1 style="margin:0">Verwaltung</h1><a class="small" href="konto.html">← Konto</a></div>
    <div class="kpis" style="grid-template-columns:repeat(3,1fr)">
      <div class="kpi"><b>${nutzer.length}</b><span>Konten</span></div>
      <div class="kpi"><b>${nutzer.filter(n => n.freigeschaltet).length}</b><span>freigeschaltet</span></div>
      <div class="kpi"><b>${aktivCodes.length}</b><span>offene Codes</span></div>
    </div>
    <div id="msg"></div>

    <div class="card"><h2>Einladungscode erstellen</h2>
      <form id="neu" class="stack">
        <label>Für wen? (Notiz, nur für dich)<input name="notiz" maxlength="200" placeholder="z. B. Kinder, Tester Jonas"></label>
        <div class="grid two">
          <label>Wie oft einlösbar?<input name="max" type="number" min="1" max="1000" value="1"></label>
          <label>Code gültig (Tage)<input name="gueltig" type="number" min="1" max="365" value="30"></label>
        </div>
        <div class="grid two">
          <label>Zusätzlicher Zugang<select name="produkt"><option value="">nur Freischaltung (Browser-Räume)</option><option value="arena">🖥️ Arena (Online-Labs)</option><option value="ki">🤖 KI-Werkstatt</option><option value="alles">⭐ Alles</option></select></label>
          <label>Zugang für (Tage)<input name="tage" type="number" min="1" max="3650" value="30"></label>
        </div>
        <button class="btn go">Code erstellen</button>
      </form>
      <div id="neucode"></div>
    </div>

    <div class="card"><h2>Codes</h2>
      ${codes.length ? `<ul class="list">${codes.map(c => {
        const offen = aktivCodes.includes(c);
        return `<li><div class="row between" style="padding:.45rem 0;flex-wrap:nowrap">
          <span class="grow" style="display:flex;flex-direction:column"><code translate="no">${esc(c.code)}</code>
          <span class="small muted">${esc(c.notiz || '')} · ${c.uses}/${c.max_uses} benutzt · bis ${datum(c.gueltig_bis)}${c.produkt ? ` · ${PRODUKT[c.produkt]} ${c.tage} T.` : ''}${c.widerrufen ? ' · <b>widerrufen</b>' : ''}</span></span>
          ${offen ? `<span class="row" style="flex-wrap:nowrap"><button class="btn small ghost" data-kopie="${esc(c.code)}">Kopieren</button><button class="btn small ghost" data-widerruf="${esc(c.code)}">Widerrufen</button></span>` : '<span class="badge plain">zu</span>'}
        </div></li>`; }).join('')}</ul>` : '<p class="small muted">Noch keine Codes.</p>'}
    </div>

    <div class="card"><div class="row between"><h2 style="margin:0">Nutzer</h2><input id="such" placeholder="Suchen …" value="${esc(filter)}" style="max-width:220px"></div>
      <div class="stack" style="margin-top:.6rem">${liste.map(n => `
        <details class="card tight">
          <summary><b>${esc(n.name || '–')}</b> <span class="small muted">${esc(n.email)}</span>
            ${n.admin ? '<span class="badge real">Admin</span>' : ''}${n.gesperrt ? '<span class="badge warn">gesperrt</span>' : n.freigeschaltet ? '<span class="badge ok">frei</span>' : '<span class="badge plain">wartet</span>'}${!n.bestaetigt ? '<span class="badge plain">E-Mail offen</span>' : ''}</summary>
          <p class="small" style="margin:.5rem 0">Registriert ${datum(n.erstellt)} · zuletzt ${datum(n.zuletzt)}${n.jahrgang ? ` · Jahrgang ${n.jahrgang}` : ''}${n.jahrgang && new Date().getFullYear() - n.jahrgang <= 16 ? ` · Eltern: ${n.eltern ? '✓' : '<b>fehlt</b>'}` : ''}<br>
          Fortschritt: ${n.fortschritt ? `${n.fortschritt.geloest} Räume geschafft · ${datum(n.fortschritt.aktualisiert)}` : 'noch nichts synchronisiert'}</p>
          <p class="small" style="margin:.3rem 0"><b>Zugänge:</b> ${n.zugaenge.length ? n.zugaenge.map(z => { const aktiv = new Date(z.gueltig_bis) > new Date(); return `${PRODUKT[z.produkt]} bis ${datum(z.gueltig_bis)} ${aktiv ? `<button class="btn small ghost" data-ende="${z.id}">beenden</button>` : '(abgelaufen)'}`; }).join(' · ') : 'keine'}</p>
          <div class="row" style="margin-top:.4rem">
            <button class="btn small" data-frei="${n.id}" data-wert="${!n.freigeschaltet}">${n.freigeschaltet ? 'Freischaltung entziehen' : 'Freischalten'}</button>
            <select data-zprodukt="${n.id}" style="width:auto"><option value="alles">⭐ Alles</option><option value="arena">🖥️ Arena</option><option value="ki">🤖 KI</option></select>
            <button class="btn small" data-zugang="${n.id}">+ 30 Tage Zugang</button>
            ${n.admin ? '' : `<button class="btn small ghost" data-sperre="${n.id}" data-wert="${!n.gesperrt}">${n.gesperrt ? 'Entsperren' : 'Sperren'}</button>
            <button class="btn small danger" data-loesch="${n.id}" data-mail="${esc(n.email)}">Löschen</button>`}
          </div>
        </details>`).join('') || '<p class="small muted">Keine Treffer.</p>'}</div>
    </div>
    <p class="small muted">Löschen entfernt Konto, Profil, Fortschritt und Zugänge endgültig. Sperren verhindert die Anmeldung, Daten bleiben.</p>
  </section>`;
  binden();
}

function binden() {
  const tun = async (fn, ok) => { try { await fn(); await laden(); meldung(ok); } catch (e) { meldung(e.message, false); } };
  $('#such').oninput = (e) => { filter = e.target.value; const pos = e.target.selectionStart; zeigen(); const i = $('#such'); i.focus(); i.setSelectionRange(pos, pos); };
  $('#neu').onsubmit = async (e) => {
    e.preventDefault(); const f = e.target;
    try {
      const { code } = await admin('code_erstellen', { notiz: f.notiz.value, max_uses: +f.max.value, gueltig_tage: +f.gueltig.value, produkt: f.produkt.value || null, tage: +f.tage.value });
      await laden();
      $('#neucode').innerHTML = `<div class="feedback ok">Neuer Code: <code translate="no" style="font-size:1.1rem">${esc(code.code)}</code> <button class="btn small" data-kopie="${esc(code.code)}">Kopieren</button></div>`;
      binden();
    } catch (err) { meldung(err.message, false); }
  };
  main.querySelectorAll('[data-kopie]').forEach(b => b.onclick = async () => { try { await navigator.clipboard.writeText(b.dataset.kopie); b.textContent = '✓ kopiert'; } catch { prompt('Code kopieren:', b.dataset.kopie); } });
  main.querySelectorAll('[data-widerruf]').forEach(b => b.onclick = () => confirm(`Code ${b.dataset.widerruf} widerrufen? Wer ihn schon eingelöst hat, bleibt freigeschaltet.`) && tun(() => admin('code_widerrufen', { code: b.dataset.widerruf }), 'Code widerrufen.'));
  main.querySelectorAll('[data-frei]').forEach(b => b.onclick = () => tun(() => admin('nutzer_setzen', { user_id: b.dataset.frei, freigeschaltet: b.dataset.wert === 'true' }), 'Gespeichert.'));
  main.querySelectorAll('[data-sperre]').forEach(b => b.onclick = () => confirm(b.dataset.wert === 'true' ? 'Konto sperren? Die Person kann sich nicht mehr anmelden.' : 'Konto entsperren?') && tun(() => admin('nutzer_setzen', { user_id: b.dataset.sperre, gesperrt: b.dataset.wert === 'true' }), 'Gespeichert.'));
  main.querySelectorAll('[data-zugang]').forEach(b => b.onclick = () => tun(() => admin('zugang_geben', { user_id: b.dataset.zugang, produkt: main.querySelector(`[data-zprodukt="${b.dataset.zugang}"]`).value, tage: 30 }), 'Zugang vergeben.'));
  main.querySelectorAll('[data-ende]').forEach(b => b.onclick = () => confirm('Zugang sofort beenden?') && tun(() => admin('zugang_beenden', { zugang_id: +b.dataset.ende }), 'Zugang beendet.'));
  main.querySelectorAll('[data-loesch]').forEach(b => b.onclick = () => {
    const t = prompt(`Konto ${b.dataset.mail} endgültig löschen? Fortschritt und Zugänge sind dann weg.\nZum Bestätigen LÖSCHEN eintippen:`);
    if (t === 'LÖSCHEN') tun(() => admin('nutzer_loeschen', { user_id: b.dataset.loesch, bestaetigung: 'LÖSCHEN' }), 'Konto gelöscht.');
  });
}

if (!URL_ || !KEY) main.innerHTML = '<div class="card warn">Nicht eingerichtet.</div>';
else laden();
