// Arena-Oberfläche: Lab starten, Terminal (xterm.js) per WebSocket verbinden
(() => {
  const $ = (s) => document.querySelector(s);
  const q = new URLSearchParams(location.search);
  const lab = q.get('lab') || 'keller';
  const store = { get: (k) => { try { return localStorage.getItem(k) || ''; } catch { return ''; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* */ } } };
  $('#token').value = (q.get('token') || store.get('arena.token')).toUpperCase();
  $('#code').value = q.get('code') || store.get('arena.code');
  if (lab === 'keller') $('#titel').textContent = 'Der Kellerserver – online';

  let ws = null, id = null, timer = null;
  const term = new window.Terminal({ cursorBlink: true, fontSize: window.innerWidth < 600 ? 13 : 15, fontFamily: 'ui-monospace, Menlo, Consolas, monospace', theme: { background: '#0b0b12', foreground: '#e9e9f2', cursor: '#b6f23c' }, scrollback: 3000 });
  const fit = new window.FitAddon.FitAddon();
  term.loadAddon(fit);

  const send = (s) => { if (ws && ws.readyState === 1) ws.send(s); };
  const resize = () => { try { fit.fit(); send(`\u0000resize:${term.cols}x${term.rows}`); } catch { /* */ } };

  $('#los').onclick = async () => {
    const token = $('#token').value.trim().toUpperCase(), code = $('#code').value.trim();
    if (!/^KLY-[0-9A-F]{6}$/.test(token)) { $('#msg').textContent = 'Der Lab-Token hat das Format KLY-XXXXXX (steht in der App im Raum).'; return; }
    store.set('arena.token', token); store.set('arena.code', code);
    $('#los').disabled = true; $('#msg').textContent = 'Starte dein Lab … (dauert ein paar Sekunden)';
    try {
      const r = await fetch('api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lab, token, code }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.fehler || 'Fehler');
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
