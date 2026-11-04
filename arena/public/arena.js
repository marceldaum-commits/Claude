// Arena-Oberfläche: Anmeldung mit dem Nachtfalter-Konto, Übersicht aller Arenen, Zugang anfragen,
// Codes eintragen, Lab starten und Terminal (xterm.js) per WebSocket verbinden.
(() => {
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const q = new URLSearchParams(location.search);
  const store = { get: (k) => { try { return localStorage.getItem(k) || ''; } catch { return ''; } }, set: (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch { /* */ } } };
  const TOKEN_RE = /^KLY-[0-9A-F]{6}$/;
  const PRODUKT = { arena: 'Arena-Zugang', 'arena-profi': 'Profi-Arena-Zugang' };

  // ---------------------------------------------------------------- Nachtfalter-Konto
  let K = null; // { url, key, app } vom Server
  let ses = null; try { ses = JSON.parse(store.get('nf.arena.auth') || 'null'); } catch { /* */ }
  const speichern = (s) => { ses = s; store.set('nf.arena.auth', s ? JSON.stringify(s) : ''); };
  const uid = () => { try { return JSON.parse(atob(ses.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub; } catch { return null; } };
  async function token(grant, body) {
    const r = await fetch(`${K.url}/auth/v1/token?grant_type=${grant}`, { method: 'POST', headers: { apikey: K.key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.error_description === 'Invalid login credentials' || j.msg === 'Invalid login credentials' ? 'E-Mail oder Passwort stimmt nicht.' : (j.error_description || j.msg || 'Anmeldung fehlgeschlagen')), { status: r.status });
    return { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Math.floor(Date.now() / 1000) + Number(j.expires_in || 3600), email: j.user?.email || ses?.email || '' };
  }
  async function frisch() {
    if (!ses) return null;
    if (ses.expires_at - 60 > Date.now() / 1000) return ses;
    try { speichern(await token('refresh_token', { refresh_token: ses.refresh_token })); }
    catch (e) { if (e.status >= 400 && e.status < 500) speichern(null); }
    return ses;
  }
  async function rest(pfad, opt = {}) {
    const s = await frisch(); if (!s) throw new Error('Bitte neu anmelden.');
    const r = await fetch(`${K.url}${pfad}`, { ...opt, headers: { apikey: K.key, Authorization: `Bearer ${s.access_token}`, 'Content-Type': 'application/json', ...(opt.headers || {}) } });
    const j = await r.json().catch(() => null);
    if (!r.ok) throw Object.assign(new Error(j?.message || `Fehler ${r.status}`), { status: r.status });
    return j;
  }

  $('#lf').onsubmit = async (e) => {
    e.preventDefault(); const f = e.target; f.querySelector('button').disabled = true; $('#lmsg').textContent = '';
    try { speichern(await token('password', { email: f.email.value.trim(), password: f.pw.value })); await uebersicht(); }
    catch (err) { $('#lmsg').textContent = err.message; }
    f.querySelector('button').disabled = false;
  };
  $('#aus').onclick = (e) => { e.preventDefault(); speichern(null); $('#start').hidden = true; $('#anmelden').hidden = false; };

  // ---------------------------------------------------------------- Übersicht
  let LABS = [], zugang = { labs: {} }, anfragen = [], geloest = [];
  const markiert = q.get('lab');

  async function labToken() {
    let t = (q.get('token') || '').toUpperCase();
    if (!TOKEN_RE.test(t)) { // aus dem Hacklab-Konto holen
      try { const r = await rest(`/rest/v1/progress?select=t:state->>labToken&user_id=eq.${uid()}`); t = String(r?.[0]?.t || '').toUpperCase(); } catch { t = ''; }
    }
    if (!TOKEN_RE.test(t)) t = store.get('arena.token').toUpperCase();
    if (!TOKEN_RE.test(t)) { // noch nie im Hacklab gespielt: eigenen Token erzeugen
      const b = crypto.getRandomValues(new Uint8Array(3)); t = 'KLY-' + [...b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
    }
    store.set('arena.token', t);
    return t;
  }

  async function uebersicht() {
    $('#anmelden').hidden = true; $('#start').hidden = false; $('#wer').textContent = ses?.email || '';
    $('#labs').innerHTML = '<section class="card"><p class="muted">Lade Arenen …</p></section>';
    if (!$('#token').value) $('#token').value = await labToken();
    $('#tokenzeige').textContent = $('#token').value;
    const s = await frisch(); if (!s) { $('#start').hidden = true; $('#anmelden').hidden = false; return; }
    const [l, z, a, g] = await Promise.all([
      fetch('api/labs').then(r => r.json()).catch(() => ({ labs: [] })),
      fetch('api/zugang?frisch', { headers: { Authorization: `Bearer ${s.access_token}` } }).then(async r => r.ok ? r.json() : Promise.reject(Object.assign(new Error((await r.json().catch(() => ({}))).fehler || 'Fehler'), { status: r.status }))),
      rest('/rest/v1/zugangsanfragen?select=produkt,status,antwort,erstellt&order=erstellt.desc').catch(() => []),
      rest(`/rest/v1/arena_fortschritt?select=lab,level&user_id=eq.${uid()}`).catch(() => []),
    ]).catch((e) => { if (e.status === 401) { speichern(null); $('#start').hidden = true; $('#anmelden').hidden = false; $('#lmsg').textContent = e.message; } else $('#msg').textContent = e.message; return [null]; });
    if (!l) return;
    LABS = l.labs; zugang = z; anfragen = a; geloest = g;
    $('#adminhinweis').hidden = !zugang.admin;
    zeichne();
  }

  function anfrageStatus(produkt) { return anfragen.find(x => x.produkt === produkt) || null; }

  // Empfohlene Reihenfolge je Reihe: Hacken (Keller → …), Ermitteln (Spurensuche → Einbruch → Maulwurf), Abwehren (Angriff! 1 → 2 → 3)
  const VORHER = { leitstelle: 'keller', webshop: 'keller', tresor: 'leitstelle', einbruch: 'spuren', maulwurf: 'einbruch', abwehr2: 'abwehr1', abwehr3: 'abwehr2', web2: 'web1', web3: 'web2', meister: 'web3', duell: 'abwehr3' };

  // ---------------------------------------------------------------- Register (Filter nach Reihe, Stufe, Thema)
  const REIHEN = { Hacken: '🗝️ Hacken', Ermitteln: '🔍 Ermitteln', Abwehren: '🛡️ Abwehren' };
  const STUFEN = ['Einsteiger', 'Fortgeschritten', 'Experte', 'Extrem'];
  let F = { reihe: '', stufe: '', thema: '' };
  try { F = { ...F, ...JSON.parse(store.get('arena.filter') || '{}') }; } catch { /* */ }
  function filterZeichnen() {
    const knopf = (art, wert, text) => `<button data-f="${art}" data-w="${esc(wert)}" class="${F[art] === wert ? 'an' : ''}">${esc(text)}</button>`;
    const themen = [...new Set(LABS.flatMap(l => l.themen || []))].sort();
    $('#fReihe').innerHTML = knopf('reihe', '', 'Alle') + Object.entries(REIHEN).map(([k, t]) => knopf('reihe', k, t)).join('');
    $('#fStufe').innerHTML = knopf('stufe', '', 'Jede Stufe') + STUFEN.filter(x => LABS.some(l => l.stufe === x)).map(x => knopf('stufe', x, x)).join('');
    $('#fThema').innerHTML = knopf('thema', '', 'Alle Themen') + themen.map(x => knopf('thema', x, '#' + x)).join('');
    document.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { F[b.dataset.f] = F[b.dataset.f] === b.dataset.w ? '' : b.dataset.w; store.set('arena.filter', JSON.stringify(F)); zeichne(); });
  }
  const passt = (L) => (!F.reihe || L.reihe === F.reihe) && (!F.stufe || L.stufe === F.stufe) && (!F.thema || (L.themen || []).includes(F.thema));

  function zeichne() {
    filterZeichnen();
    const sichtbar = LABS.filter(passt);
    $('#fInfo').textContent = `${sichtbar.length} von ${LABS.length} Arenen`;
    $('#labs').innerHTML = (sichtbar.length ? '' : '<section class="card"><p class="muted">Keine Arena passt zu diesem Filter.</p></section>') + sichtbar.map((L) => {
      const darf = !!zugang.labs[L.id];
      const fertig = geloest.filter(x => x.lab === L.id).length;
      const af = anfrageStatus(L.produkt);
      let status;
      if (!L.bereit) status = '<p class="hinweis warn">🛠️ Diese Arena wird gerade aufgebaut und ist bald startklar.</p>';
      else if (darf) status = `<div class="reihe"><button class="btn" data-start="${L.id}">▶ Lab starten</button></div>`;
      else if (af?.status === 'offen') status = `<p class="hinweis warn">⏳ Deine Anfrage für den ${esc(PRODUKT[L.produkt])} ist eingegangen (${new Date(af.erstellt).toLocaleDateString('de-DE')}). Du bekommst Bescheid, sobald sie entschieden ist – schau einfach später wieder vorbei.</p>`;
      else status = `${af?.status === 'abgelehnt' ? `<p class="hinweis rot">Deine letzte Anfrage wurde abgelehnt${af.antwort ? `: „${esc(af.antwort)}“` : '.'}</p>` : ''}
        <p class="hinweis">🔒 Für diese Arena brauchst du einen <b>${esc(PRODUKT[L.produkt])}</b>.</p>
        <details><summary class="small">Zugang anfragen</summary>
          <form data-anfrage="${esc(L.produkt)}"><label>Kurz zu dir (freiwillig)<textarea name="n" maxlength="500" placeholder="z. B. Ich habe den Kellerserver geschafft und will mehr."></textarea></label>
          <button class="btn sek">Zugang anfragen</button></form></details>`;
      const vorId = VORHER[L.id], vor = vorId && LABS.find(x => x.id === vorId);
      let empf = '';
      if (vor) {
        const vf = geloest.filter(x => x.lab === vor.id).length;
        empf = vf >= vor.levels
          ? `<p class="hinweis gruen small">✓ Voraussetzung geschafft: „${esc(vor.titel)}“ komplett gelöst.</p>`
          : `<p class="hinweis small">💡 Empfohlen: Schaff vorher „${esc(vor.titel)}“ (${vf} von ${vor.levels} Codes) – hier baut alles darauf auf.</p>`;
      }
      return `<section class="card lab ${markiert === L.id ? 'markiert' : ''}" id="lab-${esc(L.id)}">
        <div class="kopf"><h2 style="margin:0">${esc(L.titel)}</h2><span class="stufe ${esc(L.stufe)}">${esc(L.stufe)}</span></div>
        <div class="themen"><span>${esc(REIHEN[L.reihe] || L.reihe)}</span>${(L.themen || []).map(t => `<span>#${esc(t)}</span>`).join('')}</div>
        <p class="small">${esc(L.kurz)}</p>
        <p class="small" style="margin:.2rem 0 .5rem"><a href="handbuch.html#handout-${esc(L.id)}">📄 Handout: Begriffe, Werkzeuge, Vorgehen</a></p>
        ${empf}
        <div class="balken"><i style="width:${Math.round(100 * fertig / L.levels)}%"></i></div>
        <p class="small muted" style="margin:0 0 .6rem">${fertig} von ${L.levels} Codes gefunden</p>
        ${status}
        <details style="margin-top:.6rem"><summary class="small">Gefundenen Code eintragen</summary>
          <form class="reihe" data-code="${esc(L.id)}" style="margin-top:.4rem"><input name="c" translate="no" placeholder="KLY{…}" autocomplete="off" spellcheck="false" required><button class="btn sek">Prüfen</button></form>
        </details>
      </section>`;
    }).join('');
    document.querySelectorAll('[data-start]').forEach(b => b.onclick = () => starten(b.dataset.start, b));
    document.querySelectorAll('[data-anfrage]').forEach(f => f.onsubmit = async (e) => {
      e.preventDefault(); f.querySelector('button').disabled = true;
      try {
        const r = await rest('/rest/v1/rpc/anfrage_stellen', { method: 'POST', body: JSON.stringify({ p_produkt: f.dataset.anfrage, p_nachricht: f.n.value }) });
        if (r?.ok) { $('#msg').textContent = '✓ Anfrage gesendet.'; anfragen = await rest('/rest/v1/zugangsanfragen?select=produkt,status,antwort,erstellt&order=erstellt.desc').catch(() => anfragen); zeichne(); }
        else $('#msg').textContent = ({ schon_zugang: 'Du hast diesen Zugang schon – lade die Seite neu.', zu_viele: 'Zu viele Anfragen heute – bitte morgen noch einmal.', gesperrt: 'Dein Konto ist gesperrt.' })[r?.grund] || 'Das hat nicht geklappt.';
      } catch (err) { $('#msg').textContent = err.message; }
      f.querySelector('button').disabled = false;
    });
    document.querySelectorAll('[data-code]').forEach(f => f.onsubmit = async (e) => { e.preventDefault(); await codePruefen(f.dataset.code, f.c.value.trim(), f); });
    if (markiert) document.getElementById('lab-' + markiert)?.scrollIntoView({ block: 'center' });
  }

  // Codes prüft nur der Server (Edge Function „arena-code“ fragt die Arena) – im Browser lässt sich nichts ausrechnen.
  async function codePruefen(lab, code, f) {
    const L = LABS.find(x => x.id === lab); const knopf = f.querySelector('button'); knopf.disabled = true;
    try {
      const s = await frisch(); if (!s) throw new Error('Bitte neu anmelden.');
      const r = await fetch(`${K.url}/functions/v1/arena-code`, { method: 'POST', headers: { apikey: K.key, Authorization: `Bearer ${s.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ lab, code }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.fehler || `Fehler ${r.status}`);
      if (!j.level) { $('#msg').textContent = `Dieser Code passt nicht zu „${L.titel}“. Achte auf die geschweiften Klammern: KLY{…}`; return; }
      if (!geloest.some(x => x.lab === lab && x.level === j.level)) geloest.push({ lab, level: j.level });
      $('#msg').textContent = `✓ Richtig! Level ${j.level} von „${L.titel}“ geschafft.`; f.reset(); zeichne();
    } catch (err) { $('#msg').textContent = err.message; }
    finally { knopf.disabled = false; }
  }

  $('#cf').onsubmit = async (e) => {
    e.preventDefault(); const f = e.target; f.querySelector('button').disabled = true;
    try {
      const j = await rest('/rest/v1/rpc/einloesen', { method: 'POST', body: JSON.stringify({ p_code: f.code.value }) });
      if (j?.ok) { $('#msg').textContent = '✓ Code eingelöst.'; f.reset(); await uebersicht(); }
      else $('#msg').textContent = ({ ungueltig: 'Diesen Code gibt es nicht.', abgelaufen: 'Dieser Code ist abgelaufen.', aufgebraucht: 'Dieser Code wurde schon zu oft benutzt.', zu_viele_versuche: 'Zu viele falsche Versuche – bitte eine Stunde warten.' })[j?.grund] || 'Das hat nicht geklappt.';
    } catch (err) { $('#msg').textContent = err.message; }
    f.querySelector('button').disabled = false;
  };
  $('#token').onchange = () => { const t = $('#token').value.trim().toUpperCase(); if (TOKEN_RE.test(t)) { store.set('arena.token', t); $('#tokenzeige').textContent = t; } };

  fetch('api/status').then(r => r.json()).then(async (st) => {
    K = st.konto;
    if (!K) { $('#anmelden').hidden = false; $('#lmsg').textContent = 'Die Arena ist gerade geschlossen.'; $('#lf').hidden = true; return; }
    $('#regLink').href = `${K.app}/konto.html?neu=1`; $('#pwLink').href = `${K.app}/konto.html`;
    if (await frisch()) await uebersicht(); else $('#anmelden').hidden = false;
  }).catch(() => { $('#anmelden').hidden = false; $('#lmsg').textContent = 'Arena nicht erreichbar – bitte später noch einmal versuchen.'; });

  // ---------------------------------------------------------------- Lab
  let ws = null, id = null, timer = null;
  const term = new window.Terminal({ cursorBlink: true, fontSize: window.innerWidth < 600 ? 13 : 15, fontFamily: 'ui-monospace, Menlo, Consolas, monospace', theme: { background: '#0b0b12', foreground: '#e9e9f2', cursor: '#b6f23c' }, scrollback: 3000 });
  const fit = new window.FitAddon.FitAddon();
  term.loadAddon(fit);
  const send = (s) => { if (ws && ws.readyState === 1) ws.send(s); };
  const resize = () => { try { fit.fit(); send(`\u0000resize:${term.cols}x${term.rows}`); } catch { /* */ } };

  async function starten(lab, knopf) {
    const tok = $('#token').value.trim().toUpperCase();
    if (!TOKEN_RE.test(tok)) { $('#msg').textContent = 'Der Lab-Token hat das Format KLY-XXXXXX.'; return; }
    const s = await frisch(); if (!s) { $('#start').hidden = true; $('#anmelden').hidden = false; $('#lmsg').textContent = 'Bitte neu anmelden.'; return; }
    knopf.disabled = true; $('#msg').textContent = 'Starte dein Lab … (dauert ein paar Sekunden)'; window.scrollTo(0, 0);
    try {
      const r = await fetch('api/session', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.access_token}` }, body: JSON.stringify({ lab, token: tok }) });
      const j = await r.json();
      if (r.status === 401) { speichern(null); $('#start').hidden = true; $('#anmelden').hidden = false; $('#lmsg').textContent = j.fehler || 'Bitte neu anmelden.'; return; }
      if (!r.ok) throw new Error(j.fehler || 'Fehler');
      id = j.id; oeffnen(j.ablauf, LABS.find(x => x.id === lab)?.titel || 'Lab');
    } catch (e) { $('#msg').textContent = e.message; knopf.disabled = false; }
  }

  function oeffnen(ablauf, titel) {
    $('#start').hidden = true; $('#termbox').hidden = false; $('#ende').hidden = false; $('#info').textContent = titel;
    term.open($('#term')); resize(); term.focus();
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${location.host}${location.pathname.replace(/[^/]*$/, '')}api/term/${id}`);
    ws.onopen = resize;
    ws.onmessage = (e) => term.write(e.data);
    ws.onclose = () => { term.write('\r\n\x1b[33m[Verbindung beendet – „Beenden“ führt zurück zur Übersicht]\x1b[0m\r\n'); clearInterval(timer); };
    term.onData(send);
    window.addEventListener('resize', resize);
    timer = setInterval(() => { const m = Math.max(0, Math.round((ablauf - Date.now()) / 60000)); $('#info').textContent = `${titel} · noch ${m} min`; }, 15000);
  }

  const KEYS = { tab: '\t', ctrlc: '\x03', up: '\x1b[A', down: '\x1b[B', left: '\x1b[D', right: '\x1b[C' };
  document.querySelectorAll('#keys button').forEach(b => b.onclick = () => { send(b.dataset.s ?? KEYS[b.dataset.k]); term.focus(); });
  $('#ende').onclick = async () => { if (id) await fetch(`api/session/${id}`, { method: 'DELETE' }).catch(() => {}); location.href = location.pathname; };
})();
