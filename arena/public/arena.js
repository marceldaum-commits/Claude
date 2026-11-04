// Arena-Oberfläche: Anmeldung mit dem Nachtfalter-Konto, Lab starten, Terminal (xterm.js) per WebSocket verbinden
(() => {
  const $ = (s) => document.querySelector(s);
  const q = new URLSearchParams(location.search);
  const lab = q.get('lab') || 'keller';
  const store = { get: (k) => { try { return localStorage.getItem(k) || ''; } catch { return ''; } }, set: (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch { /* */ } } };
  $('#token').value = (q.get('token') || store.get('arena.token')).toUpperCase();
  if (lab === 'keller') $('#titel').textContent = 'Der Kellerserver – online';

  // ---------------------------------------------------------------- Nachtfalter-Konto
  let K = null; // { url, key, app } vom Server
  let ses = null; try { ses = JSON.parse(store.get('nf.arena.auth') || 'null'); } catch { /* */ }
  const speichern = (s) => { ses = s; store.set('nf.arena.auth', s ? JSON.stringify(s) : ''); };
  async function token(grant, body) {
    const r = await fetch(`${K.url}/auth/v1/token?grant_type=${grant}`, { method: 'POST', headers: { apikey: K.key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error_description === 'Invalid login credentials' || j.msg === 'Invalid login credentials' ? 'E-Mail oder Passwort stimmt nicht.' : (j.error_description || j.msg || 'Anmeldung fehlgeschlagen'));
    return { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Math.floor(Date.now() / 1000) + Number(j.expires_in || 3600), email: j.user?.email || ses?.email || '' };
  }
  async function frisch() {
    if (!ses) return null;
    if (ses.expires_at - 60 > Date.now() / 1000) return ses;
    try { speichern(await token('refresh_token', { refresh_token: ses.refresh_token })); } catch { speichern(null); }
    return ses;
  }
  function zeige(an) {
    $('#anmelden').hidden = an; $('#start').hidden = !an;
    if (an) $('#wer').textContent = ses?.email || '';
  }
  $('#lf').onsubmit = async (e) => {
    e.preventDefault(); const f = e.target; f.querySelector('button').disabled = true; $('#lmsg').textContent = '';
    try { speichern(await token('password', { email: f.email.value.trim(), password: f.pw.value })); zeige(true); }
    catch (err) { $('#lmsg').textContent = err.message; }
    f.querySelector('button').disabled = false;
  };
  $('#aus').onclick = (e) => { e.preventDefault(); speichern(null); zeige(false); };
  $('#cf').onsubmit = async (e) => {
    e.preventDefault(); const f = e.target; const s = await frisch(); if (!s) return zeige(false);
    f.querySelector('button').disabled = true;
    try {
      const r = await fetch(`${K.url}/rest/v1/rpc/einloesen`, { method: 'POST', headers: { apikey: K.key, Authorization: `Bearer ${s.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_code: f.code.value }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) { $('#msg').textContent = '✓ Code eingelöst – jetzt kannst du dein Lab starten.'; $('#cf').hidden = true; }
      else $('#msg').textContent = ({ ungueltig: 'Diesen Code gibt es nicht.', abgelaufen: 'Dieser Code ist abgelaufen.', aufgebraucht: 'Dieser Code wurde schon zu oft benutzt.', zu_viele_versuche: 'Zu viele falsche Versuche – bitte eine Stunde warten.' })[j.grund] || 'Das hat nicht geklappt.';
    } catch { $('#msg').textContent = 'Das hat nicht geklappt.'; }
    f.querySelector('button').disabled = false;
  };
  fetch('api/status').then(r => r.json()).then(async (st) => {
    K = st.konto;
    if (!K) { $('#anmelden').hidden = false; $('#lmsg').textContent = 'Die Arena ist gerade geschlossen.'; $('#lf').hidden = true; return; }
    $('#regLink').href = `${K.app}/konto.html?neu=1`; $('#pwLink').href = `${K.app}/konto.html`;
    zeige(!!(await frisch()));
  }).catch(() => { $('#anmelden').hidden = false; $('#lmsg').textContent = 'Arena nicht erreichbar – bitte später noch einmal versuchen.'; });

  // ---------------------------------------------------------------- Lab
  let ws = null, id = null, timer = null;
  const term = new window.Terminal({ cursorBlink: true, fontSize: window.innerWidth < 600 ? 13 : 15, fontFamily: 'ui-monospace, Menlo, Consolas, monospace', theme: { background: '#0b0b12', foreground: '#e9e9f2', cursor: '#b6f23c' }, scrollback: 3000 });
  const fit = new window.FitAddon.FitAddon();
  term.loadAddon(fit);

  const send = (s) => { if (ws && ws.readyState === 1) ws.send(s); };
  const resize = () => { try { fit.fit(); send(`\u0000resize:${term.cols}x${term.rows}`); } catch { /* */ } };

  $('#los').onclick = async () => {
    const tok = $('#token').value.trim().toUpperCase();
    if (!/^KLY-[0-9A-F]{6}$/.test(tok)) { $('#msg').textContent = 'Der Lab-Token hat das Format KLY-XXXXXX (steht in der App im Raum).'; return; }
    const s = await frisch(); if (!s) { zeige(false); $('#lmsg').textContent = 'Bitte neu anmelden.'; return; }
    store.set('arena.token', tok);
    $('#los').disabled = true; $('#msg').textContent = 'Starte dein Lab … (dauert ein paar Sekunden)'; $('#cf').hidden = true;
    try {
      const r = await fetch('api/session', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.access_token}` }, body: JSON.stringify({ lab, token: tok }) });
      const j = await r.json();
      if (r.status === 401) { speichern(null); zeige(false); $('#lmsg').textContent = j.fehler || 'Bitte neu anmelden.'; $('#los').disabled = false; return; }
      if (!r.ok) { if (j.code === 'kein_zugang') $('#cf').hidden = false; throw new Error(j.fehler || 'Fehler'); }
      id = j.id; open(j.ablauf);
    } catch (e) { $('#msg').textContent = e.message; $('#los').disabled = false; }
  };

  function open(ablauf) {
    $('#start').hidden = true; $('#termbox').hidden = false; $('#ende').hidden = false;
    term.open($('#term')); resize(); term.focus();
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${location.host}${location.pathname.replace(/[^/]*$/, '')}api/term/${id}`);
    ws.onopen = resize;
    ws.onmessage = (e) => term.write(e.data);
    ws.onclose = () => { term.write('\r\n\x1b[33m[Verbindung beendet – Seite neu laden, um ein neues Lab zu starten]\x1b[0m\r\n'); clearInterval(timer); };
    term.onData(send);
    window.addEventListener('resize', resize);
    timer = setInterval(() => { const m = Math.max(0, Math.round((ablauf - Date.now()) / 60000)); $('#info').textContent = `noch ${m} min`; }, 15000);
    $('#info').textContent = 'verbunden';
  }

  const KEYS = { tab: '\t', ctrlc: '\x03', up: '\x1b[A', down: '\x1b[B', left: '\x1b[D', right: '\x1b[C' };
  document.querySelectorAll('#keys button').forEach(b => b.onclick = () => { send(b.dataset.s ?? KEYS[b.dataset.k]); term.focus(); });
  $('#ende').onclick = async () => { if (id) await fetch(`api/session/${id}`, { method: 'DELETE' }).catch(() => {}); location.reload(); };
})();
