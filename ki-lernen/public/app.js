import { MISSIONS, LEVELS, MYTHOS, PROMPT_TASKS, DETEKTIV, WUERFEL_FRAGEN, PERSONA_VORLAGEN } from './content.js';
import { t, setLang, lang, LANGS } from './i18n.js';

// ---------- Speicher (nur in diesem Browser) ----------
const KEY = 'kiw-state-v1';
function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
const state = Object.assign({ xp: 0, done: {}, best: {}, code: '', lang: '' }, load());
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* privates Fenster */ }
}

// ---------- DOM-Helfer (kein innerHTML mit fremdem Text) ----------
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid);
  return el;
}
const app = document.getElementById('app');
function show(...nodes) {
  app.replaceChildren(...nodes.filter((n) => n != null && n !== false));
  app.focus();
  window.scrollTo(0, 0);
}
function toast(text) {
  const el = h('div', { class: 'toast', role: 'status' }, text);
  document.body.append(el);
  setTimeout(() => el.remove(), 2200);
}

// ---------- Kopfzeile: Punkte, Rang, Sprache ----------
function levelOf(xp) {
  let i = 0;
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1][0]) i++;
  return i;
}
function renderHeader() {
  const i = levelOf(state.xp);
  const [from, name] = LEVELS[i];
  const to = LEVELS[i + 1]?.[0];
  const pct = to ? Math.round(((state.xp - from) / (to - from)) * 100) : 100;
  const bar = h('div', { class: 'bar' }, h('span'));
  bar.firstChild.style.width = pct + '%';
  const sel = h('select', { class: 'lang', 'aria-label': 'Sprache / Language / Мова' },
    Object.entries(LANGS).map(([code, label]) => h('option', { value: code, selected: code === lang(), title: label }, code.toUpperCase())));
  sel.addEventListener('change', async () => {
    state.lang = sel.value; save();
    await setLang(sel.value);
    renderHeader(); route();
  });
  document.getElementById('brandname').textContent = t('KI-Werkstatt');
  document.title = `Nachtfalter ${t('KI-Werkstatt')}`;
  document.getElementById('xp').replaceChildren(
    h('div', {}, h('b', {}, t(name)), ` · ${state.xp} XP`), bar);
  document.getElementById('langbox').replaceChildren(sel);
  document.getElementById('foot').textContent =
    t('Lernprojekt · KI-Antworten können Fehler enthalten · Eingaben in KI-Missionen gehen an Anthropic – keine persönlichen Daten eingeben');
}
function award(id, xp, label) {
  const before = levelOf(state.xp);
  if (!state.done[id]) {
    state.done[id] = true;
    state.xp += xp;
    toast(xp ? `+${xp} XP · ${label}` : `✓ ${label}`);
  }
  save();
  renderHeader();
  if (levelOf(state.xp) > before) {
    setTimeout(() => toast(t('🎉 Neuer Rang: {rang}', { rang: t(LEVELS[levelOf(state.xp)][1]) })), 2300);
  }
}

// ---------- Server-Verbindung ----------
let serverInfo = { ki: false };
const headers = () => ({ 'Content-Type': 'application/json', 'X-Invite-Code': state.code });
async function api(path, body) {
  const res = await fetch(path, { method: 'POST', headers: headers(), body: JSON.stringify({ ...body, lang: lang() }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(t(data.error || 'Fehler {n}', { n: res.status }));
  return data;
}

// Chat mit Live-Text (Server-Sent Events über fetch)
async function streamChat({ messages, system }, onText) {
  const res = await fetch('/api/chat', {
    method: 'POST', headers: headers(), body: JSON.stringify({ messages, system, lang: lang() }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(t(data.error || 'Fehler {n}', { n: res.status }));
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let full = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf('\n\n')) >= 0) {
      const chunk = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const ev = /^event: (.+)$/m.exec(chunk)?.[1];
      const raw = /^data: (.*)$/m.exec(chunk)?.[1];
      if (!ev || raw == null) continue;
      const data = JSON.parse(raw);
      if (ev === 'text') { full += data; onText(full); }
      if (ev === 'note') { full += '\n\n' + t(data); onText(full); }
      if (ev === 'error') throw new Error(t(data));
    }
  }
  return full;
}

// Prüft, ob KI-Missionen gerade möglich sind; zeigt sonst die Code-Eingabe.
function needsKi(render) {
  if (!serverInfo.ki) {
    return h('div', { class: 'card' },
      h('p', {}, t('🔌 Die KI ist auf dem Server noch nicht eingeschaltet. Diese Mission braucht eine Verbindung zur KI.')),
      h('p', { class: 'hint' }, t('Probier so lange „Wahr oder Mythos?“ oder den „Halluzinations-Detektiv“ – die laufen ohne KI.')));
  }
  if (!state.code) return codeForm(render);
  return null;
}
function codeForm(render) {
  const input = h('input', { type: 'password', placeholder: t('Einladungscode'), autocomplete: 'off', 'aria-label': t('Einladungscode') });
  const msg = h('p', { class: 'hint' });
  const go = async () => {
    state.code = input.value.trim();
    const res = await fetch('/api/me', { headers: { 'X-Invite-Code': state.code } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { state.code = ''; msg.textContent = t(data.error || 'Code ungültig.'); return; }
    save();
    toast(t('Hallo {name}!', { name: data.name }));
    render();
  };
  return h('div', { class: 'card' },
    h('p', {}, t('🔑 Für Missionen mit echter KI brauchst du einen Einladungscode.')),
    h('p', { class: 'hint' }, t('🔒 Was du in diesen Missionen schreibst, wird an die KI-Firma Anthropic geschickt. Schreib darum nie deinen echten Namen, deine Adresse, deine Schule, Passwörter oder Fotos von dir oder anderen hinein.')),
    input,
    h('div', { class: 'row' }, h('button', { onclick: go }, t('Los geht’s'))),
    msg);
}

// ---------- Seiten ----------
function home() {
  const cards = MISSIONS.map((m) =>
    h('a', { class: 'card', href: `#/${m.id}` },
      h('div', { class: 'icon', 'aria-hidden': 'true' }, m.icon),
      h('h3', {}, t(m.title)),
      h('p', {}, t(m.text)),
      h('div', { class: 'tags' },
        h('span', { class: 'tag' }, `${m.xp} XP`),
        h('span', { class: 'tag' }, m.ki ? t('mit echter KI') : t('ohne KI')),
        state.done[m.id] ? h('span', { class: 'tag done' }, t('geschafft')) : null)));
  show(
    h('h1', {}, t('Willkommen in der KI-Werkstatt 🛠️')),
    h('p', { class: 'lead' }, t('Hier lernst du durch Ausprobieren, wie KI-Assistenten funktionieren, wo sie glänzen und wo sie danebenliegen. Sammle XP, steige im Rang auf – und werde zum Prompt-Profi.')),
    h('div', { class: 'grid' }, cards),
    h('h2', {}, t('Die drei goldenen Regeln')),
    h('ol', {},
      h('li', {}, h('b', {}, t('Klar fragen:')), ' ', t('Ziel, Zielgruppe, Länge und Form nennen.')),
      h('li', {}, h('b', {}, t('Prüfen:')), ' ', t('KI kann sich irren und klingt dabei sicher.')),
      h('li', {}, h('b', {}, t('Schützen:')), ' ', t('Keine Passwörter oder privaten Daten eingeben.'))),
    state.code ? h('p', { class: 'hint' }, h('a', { href: '#/', onclick: () => { state.code = ''; save(); home(); } }, t('Einladungscode abmelden'))) : null,
  );
}

const back = () => h('a', { class: 'back', href: '#/' }, t('← Alle Missionen'));

// --- Mission: Wahr oder Mythos? ---
function mythos() {
  let i = 0, right = 0;
  const stmt = h('p', { class: 'statement' });
  const prog = h('p', { class: 'progress' });
  const expl = h('div', { class: 'out hidden' });
  const btnW = h('button', { onclick: () => answer(true) }, t('✅ Wahr'));
  const btnM = h('button', { class: 'ghost', onclick: () => answer(false) }, t('🦄 Mythos'));
  const next = h('button', { class: 'hidden', onclick: () => { i++; step(); } }, t('Weiter →'));
  const progress = () => t('Behauptung {i} von {n} · {r} richtig', { i: i + 1, n: MYTHOS.length, r: right });
  function step() {
    if (i >= MYTHOS.length) {
      const pct = Math.round((right / MYTHOS.length) * 100);
      card.replaceChildren(
        h('p', { class: 'score' }, `${right} / ${MYTHOS.length}`),
        h('p', {}, pct >= 75 ? t('Stark! Du durchschaust KI schon ziemlich gut.') : t('Guter Anfang – die Erklärungen helfen beim zweiten Durchgang.')),
        h('div', { class: 'row' }, h('button', { onclick: mythos }, t('Nochmal')), h('a', { class: 'btn', href: '#/' }, t('Zur Übersicht'))));
      if (pct >= 50) award('mythos', 60, t('Wahr oder Mythos?'));
      return;
    }
    prog.textContent = progress();
    stmt.textContent = t(MYTHOS[i].s);
    expl.classList.add('hidden');
    next.classList.add('hidden');
    btnW.disabled = btnM.disabled = false;
  }
  function answer(v) {
    const q = MYTHOS[i];
    const ok = v === q.wahr;
    if (ok) right++;
    btnW.disabled = btnM.disabled = true;
    expl.replaceChildren(h('span', { class: ok ? 'ok' : 'bad' }, ok ? t('Richtig!') : t('Leider nein.')), ' ',
      q.wahr ? t('Das ist wahr.') : t('Das ist ein Mythos.'), ' ', t(q.e));
    expl.classList.remove('hidden');
    next.classList.remove('hidden');
    prog.textContent = progress();
  }
  const card = h('div', { class: 'card' }, prog, stmt, h('div', { class: 'row' }, btnW, btnM), h('div', { class: 'row' }, expl), h('div', { class: 'row' }, next));
  show(back(), h('h1', {}, '🧠 ', t('Wahr oder Mythos?')), h('p', { class: 'lead' }, t('Entscheide bei jeder Behauptung über KI: stimmt das?')), card);
  step();
}

// --- Mission: Token-Schnipsler ---
// Vereinfachte Zerlegung nur zur Veranschaulichung: Wörter, lange Wörter in Stücke.
function roughSplit(text) {
  const parts = text.match(/\s*[\p{L}\p{N}]+|\s*[^\s\p{L}\p{N}]|\s+/gu) || [];
  const out = [];
  for (const p of parts) {
    if (p.trim().length <= 6) { out.push(p); continue; }
    for (let k = 0; k < p.length; k += 5) out.push(p.slice(k, k + 5));
  }
  return out;
}
function tokens() {
  const block = needsKi(tokens);
  const ta = h('textarea', { 'aria-label': t('Text') });
  ta.value = t('Donaudampfschifffahrtsgesellschaft und Hund – was kostet mehr Tokens?');
  const vis = h('div', { class: 'tokens' });
  const res = h('p', {});
  const draw = () => {
    vis.replaceChildren(...roughSplit(ta.value).map((s, k) => h('span', { class: `tok t${k % 5}` }, s)));
  };
  ta.addEventListener('input', draw);
  const btn = h('button', { onclick: async () => {
    btn.disabled = true; res.textContent = t('Zähle …');
    try {
      const d = await api('/api/tokens', { text: ta.value });
      res.textContent = t(d.tokens === 1 ? 'Echte Zählung der KI: {n} Token für {z} Zeichen.' : 'Echte Zählung der KI: {n} Tokens für {z} Zeichen (≈ {q} Zeichen pro Token).',
        { n: d.tokens, z: d.zeichen, q: (d.zeichen / d.tokens).toFixed(1) });
      award('tokens', 40, t('Der Token-Schnipsler'));
    } catch (e) { res.textContent = e.message; }
    btn.disabled = false;
  } }, t('Echte Tokens zählen'));
  draw();
  show(back(), h('h1', {}, '✂️ ', t('Der Token-Schnipsler')),
    h('p', { class: 'lead' }, t('Eine KI liest keine Buchstaben und keine ganzen Wörter, sondern „Tokens“: häufige Wörter sind ein Stück, seltene oder lange Wörter werden zerschnitten. Bezahlt und begrenzt wird KI ebenfalls in Tokens.')),
    h('div', { class: 'card' },
      ta,
      h('p', { class: 'hint' }, t('Bunte Vorschau (vereinfacht – die echte Zerlegung ist geheim):')), vis,
      block || h('div', { class: 'row' }, btn), res),
    h('h2', {}, t('Probier mal')),
    h('ul', {}, h('li', {}, t('Ein langes deutsches Wort gegen ein kurzes englisches.')), h('li', {}, t('Emojis 🤖🎉 – wie viele Tokens sind das?')),
      h('li', {}, t('Denselben Satz in zwei Sprachen.'))));
}

// --- Mission: Prompt-Werkstatt ---
function prompt(taskId) {
  const block = needsKi(() => prompt(taskId));
  const task = PROMPT_TASKS.find((x) => x.id === taskId) || PROMPT_TASKS[0];
  const ta = h('textarea', { 'aria-label': t('Dein Prompt') });
  ta.value = t(task.schwach);
  const out = h('div', {});
  const btn = h('button', { onclick: async () => {
    btn.disabled = true; out.replaceChildren(h('p', { class: 'hint' }, t('Der Prompt-Trainer liest …')));
    try {
      const { result: r } = await api('/api/judge', { task: t(task.task), prompt: ta.value });
      const best = Math.max(state.best[task.id] || 0, r.punkte);
      state.best[task.id] = best; save();
      const check = (ok, txt) => h('li', { class: ok ? 'yes' : '' }, txt);
      out.replaceChildren(h('div', { class: 'card' },
        h('p', { class: 'score' }, `${r.punkte} / 100`),
        h('p', { class: 'hint' }, t('Ziel für diese Aufgabe: {ziel} Punkte · deine Bestleistung: {best}', { ziel: task.ziel, best })),
        h('ul', { class: 'checks' }, check(r.rolle, t('Rolle / Ton')), check(r.ziel, t('Klares Ziel')), check(r.kontext, t('Kontext')), check(r.format, t('Format / Länge'))),
        h('p', {}, '👍 ', r.lob), h('p', {}, '💡 ', r.tipp),
        h('details', {}, h('summary', {}, t('Vorschlag des Trainers ansehen')), h('div', { class: 'out' }, r.verbessert))));
      if (r.punkte >= task.ziel) award('prompt-' + task.id, 25, t(task.title));
      if (PROMPT_TASKS.every((x) => (state.best[x.id] || 0) >= x.ziel)) award('prompt', 0, t('Prompt-Werkstatt'));
    } catch (e) { out.replaceChildren(h('p', { class: 'bad' }, e.message)); }
    btn.disabled = false;
  } }, t('Prompt bewerten lassen'));
  const tabs = PROMPT_TASKS.map((x) => h('a', { href: `#/prompt/${x.id}`, class: 'tag' + ((state.best[x.id] || 0) >= x.ziel ? ' done' : '') }, t(x.title)));
  show(back(), h('h1', {}, '✍️ ', t('Prompt-Werkstatt')),
    h('p', { class: 'lead' }, t('Ein „Prompt“ ist dein Auftrag an die KI. Verbessere den schwachen Prompt, bis der Trainer zufrieden ist. Tipp: Wer bist du, was genau soll herauskommen, für wen, wie lang, in welcher Form?')),
    h('div', { class: 'tags' }, tabs),
    h('div', { class: 'card' }, h('h3', {}, t(task.title)), h('p', {}, '🎯 ', t(task.task)), ta, block || h('div', { class: 'row' }, btn)),
    out);
}

// --- Mission: Würfel-Labor ---
function wuerfel() {
  const block = needsKi(wuerfel);
  const sel = h('select', { 'aria-label': t('Frage') }, WUERFEL_FRAGEN.map((f) => h('option', {}, t(f))));
  const boxes = [0, 1, 2].map(() => h('div', { class: 'out' }));
  const note = h('p', {});
  const btn = h('button', { onclick: async () => {
    btn.disabled = true; note.textContent = '';
    boxes.forEach((b) => (b.textContent = '…'));
    try {
      const answers = await Promise.all(boxes.map((b) =>
        streamChat({ messages: [{ role: 'user', content: sel.value }] }, (s) => (b.textContent = s))));
      const same = new Set(answers.map((a) => a.trim())).size;
      note.textContent = same === 1
        ? t('Dreimal gleich! Bei Fragen mit einer klaren Antwort ist die KI sehr sicher – der Zufall spielt kaum eine Rolle.')
        : t('{n} verschiedene Antworten! Beim Wählen der nächsten Tokens ist Zufall im Spiel – gut für Kreativität, schlecht, wenn du dich auf eine einzige Antwort verlässt.', { n: same });
      award('wuerfel', 40, t('Das Würfel-Labor'));
    } catch (e) { note.textContent = e.message; }
    btn.disabled = false;
  } }, t('🎲 Dreimal fragen'));
  show(back(), h('h1', {}, '🎲 ', t('Das Würfel-Labor')),
    h('p', { class: 'lead' }, t('Die KI würfelt ein bisschen bei jedem Token. Was passiert, wenn wir dieselbe Frage dreimal gleichzeitig stellen?')),
    h('div', { class: 'card' }, sel, block || h('div', { class: 'row' }, btn)),
    h('div', { class: 'cols' }, boxes), note,
    h('p', { class: 'hint' }, t('Vergleiche eine kreative Frage mit einer Wissensfrage. Was fällt dir auf?')));
}

// --- Mission: Halluzinations-Detektiv ---
function detektiv(n = 0) {
  const fall = DETEKTIV[n];
  const picked = new Set();
  let checked = false;
  const btns = fall.saetze.map((s, k) => h('button', { class: 'sentence', onclick: () => {
    if (checked) return;
    picked.has(k) ? picked.delete(k) : picked.add(k);
    btns[k].classList.toggle('picked');
  } }, t(s.t)));
  const out = h('div', {});
  const check = h('button', { onclick: () => {
    checked = true; check.disabled = true;
    let ok = true;
    fall.saetze.forEach((s, k) => {
      if (picked.has(k) !== Boolean(s.f)) ok = false;
      btns[k].classList.add(s.f ? 'wrong' : 'right');
    });
    out.replaceChildren(
      h('p', { class: ok ? 'ok' : 'bad' }, ok ? t('🔎 Fall gelöst!') : t('Nicht ganz. Rot umrandet sind die falschen Sätze:')),
      h('ul', {}, fall.saetze.filter((s) => s.f).map((s) => h('li', {}, h('b', {}, t(s.t)), ' – ', t(s.w)))),
      h('div', { class: 'row' },
        n + 1 < DETEKTIV.length ? h('a', { class: 'btn', href: `#/detektiv/${n + 1}` }, t('Nächster Fall →')) : h('a', { class: 'btn', href: '#/' }, t('Zur Übersicht')),
        h('button', { class: 'ghost', onclick: () => detektiv(n) }, t('Nochmal'))));
    if (ok) {
      award('detektiv-' + n, 0, t(fall.title));
      if (DETEKTIV.every((_, k) => state.done['detektiv-' + k])) award('detektiv', 80, t('Halluzinations-Detektiv'));
    }
  } }, t('Anklage erheben'));
  show(back(), h('h1', {}, '🕵️ ', t('Halluzinations-Detektiv')),
    h('p', { class: 'lead' }, t('Diese Antworten könnten von einer KI stammen. Klicke alle Sätze an, die falsch oder erfunden sind.')),
    h('p', { class: 'progress' }, t('{fall} · {i} von {n}', { fall: t(fall.title), i: n + 1, n: DETEKTIV.length })),
    h('div', { class: 'card' }, h('p', { class: 'hint' }, t('Frage:'), ' ', t(fall.frage)), btns, h('div', { class: 'row' }, check), out));
}

// --- Mission: Persönlichkeits-Baukasten ---
const chatState = { system: '', messages: [] };
function persona() {
  const block = needsKi(persona);
  const sys = h('textarea', { 'aria-label': t('System-Prompt') });
  sys.value = chatState.system || t(PERSONA_VORLAGEN[0].text);
  const log = h('div', { class: 'chat', 'aria-live': 'polite' });
  const reset = () => { chatState.messages = []; log.replaceChildren(); };
  const vorl = PERSONA_VORLAGEN.map((v) => h('button', { class: 'ghost', onclick: () => { sys.value = t(v.text); reset(); } }, t(v.name)));
  const input = h('input', { type: 'text', placeholder: t('Schreib deinem Assistenten …'), 'aria-label': t('Nachricht') });
  const send = h('button', {}, t('Senden'));
  const draw = () => log.replaceChildren(...chatState.messages.map((m) => h('div', { class: `msg ${m.role}` }, m.content)));
  async function go() {
    const text = input.value.trim();
    if (!text) return;
    if (sys.value !== chatState.system) { chatState.system = sys.value; chatState.messages = []; }
    chatState.messages.push({ role: 'user', content: text });
    input.value = ''; send.disabled = true;
    draw();
    const bubble = h('div', { class: 'msg assistant' }, '…');
    log.append(bubble);
    try {
      const answer = await streamChat({ messages: chatState.messages, system: chatState.system }, (s) => (bubble.textContent = s));
      chatState.messages.push({ role: 'assistant', content: answer || '…' });
      if (chatState.messages.length >= 6) award('persona', 60, t('Persönlichkeits-Baukasten'));
    } catch (e) {
      chatState.messages.pop();
      bubble.textContent = '⚠️ ' + e.message;
    }
    send.disabled = false; input.focus();
  }
  send.addEventListener('click', go);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  show(back(), h('h1', {}, '🎭 ', t('Persönlichkeits-Baukasten')),
    h('p', { class: 'lead' }, t('Der „System-Prompt“ ist die Anleitung, die die KI vor jedem Gespräch bekommt. Damit bauen Firmen ihre Chatbots. Schreib deinen eigenen und teste, ob sich die KI daran hält!')),
    h('div', { class: 'card' }, h('div', { class: 'row' }, t('Vorlagen:'), vorl), h('p', {}), sys,
      h('p', { class: 'hint' }, t('Wenn du den System-Prompt änderst, beginnt das Gespräch neu.'))),
    block || h('div', { class: 'card' }, log, h('div', { class: 'row' }, input, send)),
    h('h2', {}, t('Forscher-Aufgaben')),
    h('ul', {}, h('li', {}, t('Versuche, den Sokrates-Tutor dazu zu bringen, dir die Lösung von 12 × 12 direkt zu verraten.')),
      h('li', {}, t('Was passiert, wenn dein System-Prompt sich selbst widerspricht?')),
      h('li', {}, t('Wie kurz kann ein System-Prompt sein, der trotzdem wirkt?'))));
}

// ---------- Router ----------
function route() {
  const [, page, arg] = location.hash.split('/');
  switch (page) {
    case 'mythos': return mythos();
    case 'tokens': return tokens();
    case 'prompt': return prompt(arg);
    case 'wuerfel': return wuerfel();
    case 'detektiv': return detektiv(Math.min(Number(arg) || 0, DETEKTIV.length - 1));
    case 'persona': return persona();
    default: return home();
  }
}
window.addEventListener('hashchange', route);

// Start: Sprache (gespeichert oder vom Browser), Serverstatus, dann erste Seite.
const browserLang = (navigator.language || 'de').slice(0, 2);
await setLang(state.lang || (LANGS[browserLang] ? browserLang : 'de'));
try { serverInfo = await (await fetch('/api/status')).json(); } catch { /* offline */ }
renderHeader();
route();
