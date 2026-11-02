import { MISSIONS, LEVELS, MYTHOS, PROMPT_TASKS, DETEKTIV, WUERFEL_FRAGEN, PERSONA_VORLAGEN } from './content.js';

// ---------- Speicher (nur in diesem Browser) ----------
const KEY = 'kiw-state-v1';
function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
const state = Object.assign({ xp: 0, done: {}, best: {}, code: '' }, load());
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
  app.replaceChildren(...nodes);
  app.focus();
  window.scrollTo(0, 0);
}
function toast(text) {
  const t = h('div', { class: 'toast', role: 'status' }, text);
  document.body.append(t);
  setTimeout(() => t.remove(), 2200);
}

// ---------- Punkte & Level ----------
function levelOf(xp) {
  let i = 0;
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1][0]) i++;
  return i;
}
function renderXp() {
  const i = levelOf(state.xp);
  const [from, name] = LEVELS[i];
  const to = LEVELS[i + 1]?.[0];
  const pct = to ? Math.round(((state.xp - from) / (to - from)) * 100) : 100;
  const bar = h('div', { class: 'bar' }, h('span'));
  bar.firstChild.style.width = pct + '%';
  document.getElementById('xp').replaceChildren(h('div', {}, h('b', {}, name), ` · ${state.xp} XP`), bar);
}
function award(id, xp, label) {
  const before = levelOf(state.xp);
  if (!state.done[id]) {
    state.done[id] = true;
    state.xp += xp;
    toast(`+${xp} XP · ${label}`);
  }
  save();
  renderXp();
  if (levelOf(state.xp) > before) setTimeout(() => toast(`🎉 Neuer Rang: ${LEVELS[levelOf(state.xp)][1]}`), 2300);
}

// ---------- Server-Verbindung ----------
let serverInfo = { ki: false };
async function api(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Invite-Code': state.code },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Fehler ${res.status}`);
  if (typeof data.budgetLeft === 'number') updateBudget(data.budgetLeft);
  return data;
}

// Chat mit Live-Text (Server-Sent Events über fetch)
async function streamChat({ messages, system }, onText) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Invite-Code': state.code },
    body: JSON.stringify({ messages, system }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Fehler ${res.status}`);
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
      if (ev === 'error') throw new Error(data);
      if (ev === 'done' && typeof data.budgetLeft === 'number') updateBudget(data.budgetLeft);
    }
  }
  return full;
}

let budgetLeft = null;
function updateBudget(v) { budgetLeft = v; }

// Prüft, ob KI-Missionen gerade möglich sind; zeigt sonst die Code-Eingabe.
function needsKi(render) {
  if (!serverInfo.ki) {
    return h('div', { class: 'card' },
      h('p', {}, '🔌 Die KI ist auf dem Server noch nicht eingeschaltet. Diese Mission braucht eine Verbindung zur KI.'),
      h('p', { class: 'hint' }, 'Probier so lange „Wahr oder Mythos?“ oder den „Halluzinations-Detektiv“ – die laufen ohne KI.'));
  }
  if (!state.code) return codeForm(render);
  return null;
}
function codeForm(render) {
  const input = h('input', { type: 'password', placeholder: 'Einladungscode', autocomplete: 'off', 'aria-label': 'Einladungscode' });
  const msg = h('p', { class: 'hint' });
  const go = async () => {
    state.code = input.value.trim();
    const res = await fetch('/api/me', { headers: { 'X-Invite-Code': state.code } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { state.code = ''; msg.textContent = data.error || 'Code ungültig.'; return; }
    save();
    budgetLeft = data.budgetLeft;
    toast(`Hallo ${data.name}!`);
    render();
  };
  return h('div', { class: 'card' },
    h('p', {}, '🔑 Für Missionen mit echter KI brauchst du einen Einladungscode.'),
    h('p', { class: 'hint' }, '🔒 Was du in diesen Missionen schreibst, wird an die KI-Firma Anthropic geschickt. ' +
      'Schreib darum nie deinen echten Namen, deine Adresse, deine Schule, Passwörter oder Fotos von dir oder anderen hinein.'),
    input,
    h('div', { class: 'row' }, h('button', { onclick: go }, 'Los geht’s')),
    msg);
}

// ---------- Seiten ----------
function home() {
  const cards = MISSIONS.map((m) =>
    h('a', { class: 'card', href: `#/${m.id}` },
      h('div', { class: 'icon', 'aria-hidden': 'true' }, m.icon),
      h('h3', {}, m.title),
      h('p', {}, m.text),
      h('div', { class: 'tags' },
        h('span', { class: 'tag' }, `${m.xp} XP`),
        h('span', { class: 'tag' }, m.ki ? 'mit echter KI' : 'ohne KI'),
        state.done[m.id] ? h('span', { class: 'tag done' }, 'geschafft') : null)));
  show(
    h('h1', {}, 'Willkommen in der KI-Werkstatt 🛠️'),
    h('p', { class: 'lead' },
      'Hier lernst du durch Ausprobieren, wie KI-Assistenten funktionieren, wo sie glänzen und wo sie danebenliegen. ',
      'Sammle XP, steige im Rang auf – und werde zum Prompt-Profi.'),
    h('div', { class: 'grid' }, cards),
    h('h2', {}, 'Die drei goldenen Regeln'),
    h('ol', {},
      h('li', {}, h('b', {}, 'Klar fragen: '), 'Ziel, Zielgruppe, Länge und Form nennen.'),
      h('li', {}, h('b', {}, 'Prüfen: '), 'KI kann sich irren und klingt dabei sicher.'),
      h('li', {}, h('b', {}, 'Schützen: '), 'Keine Passwörter oder privaten Daten eingeben.')),
    state.code ? h('p', { class: 'hint' }, h('a', { href: '#/', onclick: () => { state.code = ''; save(); home(); } }, 'Einladungscode abmelden')) : null,
  );
}

const back = () => h('a', { class: 'back', href: '#/' }, '← Alle Missionen');

// --- Mission: Wahr oder Mythos? ---
function mythos() {
  let i = 0, right = 0;
  const stmt = h('p', { class: 'statement' });
  const prog = h('p', { class: 'progress' });
  const expl = h('div', { class: 'out hidden' });
  const btnW = h('button', { onclick: () => answer(true) }, '✅ Wahr');
  const btnM = h('button', { class: 'ghost', onclick: () => answer(false) }, '🦄 Mythos');
  const next = h('button', { class: 'hidden', onclick: () => { i++; step(); } }, 'Weiter →');
  function step() {
    if (i >= MYTHOS.length) {
      const pct = Math.round((right / MYTHOS.length) * 100);
      card.replaceChildren(
        h('p', { class: 'score' }, `${right} / ${MYTHOS.length}`),
        h('p', {}, pct >= 75 ? 'Stark! Du durchschaust KI schon ziemlich gut.' : 'Guter Anfang – die Erklärungen helfen beim zweiten Durchgang.'),
        h('div', { class: 'row' }, h('button', { onclick: mythos }, 'Nochmal'), h('a', { class: 'btn', href: '#/' }, 'Zur Übersicht')));
      if (pct >= 50) award('mythos', 60, 'Wahr oder Mythos?');
      return;
    }
    const q = MYTHOS[i];
    prog.textContent = `Behauptung ${i + 1} von ${MYTHOS.length} · ${right} richtig`;
    stmt.textContent = q.s;
    expl.classList.add('hidden');
    next.classList.add('hidden');
    btnW.disabled = btnM.disabled = false;
  }
  function answer(v) {
    const q = MYTHOS[i];
    const ok = v === q.wahr;
    if (ok) right++;
    btnW.disabled = btnM.disabled = true;
    expl.replaceChildren(h('span', { class: ok ? 'ok' : 'bad' }, ok ? 'Richtig! ' : 'Leider nein. '),
      `Das ist ${q.wahr ? 'wahr' : 'ein Mythos'}. ${q.e}`);
    expl.classList.remove('hidden');
    next.classList.remove('hidden');
    prog.textContent = `Behauptung ${i + 1} von ${MYTHOS.length} · ${right} richtig`;
  }
  const card = h('div', { class: 'card' }, prog, stmt, h('div', { class: 'row' }, btnW, btnM), h('div', { class: 'row' }, expl), h('div', { class: 'row' }, next));
  show(back(), h('h1', {}, '🧠 Wahr oder Mythos?'), h('p', { class: 'lead' }, 'Entscheide bei jeder Behauptung über KI: stimmt das?'), card);
  step();
}

// --- Mission: Token-Schnipsler ---
// Vereinfachte Zerlegung nur zur Veranschaulichung: Wörter, lange Wörter in Silben-Stücke.
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
  const ta = h('textarea', { 'aria-label': 'Text' });
  ta.value = 'Donaudampfschifffahrtsgesellschaft und Hund – was kostet mehr Tokens?';
  const vis = h('div', { class: 'tokens' });
  const res = h('p', {});
  const draw = () => {
    vis.replaceChildren(...roughSplit(ta.value).map((t, k) => h('span', { class: `tok t${k % 5}` }, t)));
  };
  ta.addEventListener('input', draw);
  const btn = h('button', { onclick: async () => {
    btn.disabled = true; res.textContent = 'Zähle …';
    try {
      const d = await api('/api/tokens', { text: ta.value });
      res.replaceChildren('Echte Zählung der KI: ', h('b', {}, `${d.tokens} ${d.tokens === 1 ? 'Token' : 'Tokens'}`), ` für ${d.zeichen} Zeichen ` +
        `(≈ ${(d.zeichen / d.tokens).toFixed(1)} Zeichen pro Token).`);
      award('tokens', 40, 'Token-Schnipsler');
    } catch (e) { res.textContent = e.message; }
    btn.disabled = false;
  } }, 'Echte Tokens zählen');
  draw();
  show(back(), h('h1', {}, '✂️ Der Token-Schnipsler'),
    h('p', { class: 'lead' }, 'Eine KI liest keine Buchstaben und keine ganzen Wörter, sondern „Tokens“: häufige Wörter sind ein Stück, ' +
      'seltene oder lange Wörter werden zerschnitten. Bezahlt und begrenzt wird KI ebenfalls in Tokens.'),
    h('div', { class: 'card' },
      ta,
      h('p', { class: 'hint' }, 'Bunte Vorschau (vereinfacht – die echte Zerlegung ist geheim):'), vis,
      block || h('div', { class: 'row' }, btn), res),
    h('h2', {}, 'Probier mal'),
    h('ul', {}, h('li', {}, 'Ein langes deutsches Wort gegen ein kurzes englisches.'), h('li', {}, 'Emojis 🤖🎉 – wie viele Tokens sind das?'),
      h('li', {}, 'Denselben Satz auf Deutsch und Englisch.')));
}

// --- Mission: Prompt-Werkstatt ---
function prompt(taskId) {
  const block = needsKi(() => prompt(taskId));
  const t = PROMPT_TASKS.find((x) => x.id === taskId) || PROMPT_TASKS[0];
  const ta = h('textarea', { 'aria-label': 'Dein Prompt' });
  ta.value = t.schwach;
  const out = h('div', {});
  const btn = h('button', { onclick: async () => {
    btn.disabled = true; out.replaceChildren(h('p', { class: 'hint' }, 'Der Prompt-Trainer liest …'));
    try {
      const { result: r } = await api('/api/judge', { task: t.task, prompt: ta.value });
      const best = Math.max(state.best[t.id] || 0, r.punkte);
      state.best[t.id] = best; save();
      const check = (ok, txt) => h('li', { class: ok ? 'yes' : '' }, txt);
      out.replaceChildren(h('div', { class: 'card' },
        h('p', { class: 'score' }, `${r.punkte} / 100`),
        h('p', { class: 'hint' }, `Ziel für diese Aufgabe: ${t.ziel} Punkte · deine Bestleistung: ${best}`),
        h('ul', { class: 'checks' }, check(r.rolle, 'Rolle / Ton'), check(r.ziel, 'Klares Ziel'), check(r.kontext, 'Kontext'), check(r.format, 'Format / Länge')),
        h('p', {}, '👍 ', r.lob), h('p', {}, '💡 ', r.tipp),
        h('details', {}, h('summary', {}, 'Vorschlag des Trainers ansehen'), h('div', { class: 'out' }, r.verbessert))));
      if (r.punkte >= t.ziel) award('prompt-' + t.id, 25, t.title);
      if (PROMPT_TASKS.every((x) => (state.best[x.id] || 0) >= x.ziel)) award('prompt', 0, 'Prompt-Werkstatt komplett');
    } catch (e) { out.replaceChildren(h('p', { class: 'bad' }, e.message)); }
    btn.disabled = false;
  } }, 'Prompt bewerten lassen');
  const tabs = PROMPT_TASKS.map((x) => h('a', { href: `#/prompt/${x.id}`, class: 'tag' + ((state.best[x.id] || 0) >= x.ziel ? ' done' : '') }, x.title));
  show(back(), h('h1', {}, '✍️ Prompt-Werkstatt'),
    h('p', { class: 'lead' }, 'Ein „Prompt“ ist dein Auftrag an die KI. Verbessere den schwachen Prompt, bis der Trainer zufrieden ist. ' +
      'Tipp: Wer bist du, was genau soll herauskommen, für wen, wie lang, in welcher Form?'),
    h('div', { class: 'tags' }, tabs),
    h('div', { class: 'card' }, h('h3', {}, t.title), h('p', {}, '🎯 ', t.task), ta, block || h('div', { class: 'row' }, btn)),
    out);
}

// --- Mission: Würfel-Labor ---
function wuerfel() {
  const block = needsKi(wuerfel);
  const sel = h('select', { 'aria-label': 'Frage' }, WUERFEL_FRAGEN.map((f) => h('option', {}, f)));
  const boxes = [0, 1, 2].map(() => h('div', { class: 'out' }));
  const note = h('p', {});
  const btn = h('button', { onclick: async () => {
    btn.disabled = true; note.textContent = '';
    boxes.forEach((b) => (b.textContent = '…'));
    try {
      const answers = await Promise.all(boxes.map((b) =>
        streamChat({ messages: [{ role: 'user', content: sel.value }] }, (t) => (b.textContent = t))));
      const same = new Set(answers.map((a) => a.trim())).size;
      note.textContent = same === 1
        ? 'Dreimal gleich! Bei Fragen mit einer klaren Antwort ist die KI sehr sicher – der Zufall spielt kaum eine Rolle.'
        : `${same} verschiedene Antworten! Beim Wählen der nächsten Tokens ist Zufall im Spiel – gut für Kreativität, schlecht, wenn du dich auf eine einzige Antwort verlässt.`;
      award('wuerfel', 40, 'Würfel-Labor');
    } catch (e) { note.textContent = e.message; }
    btn.disabled = false;
  } }, '🎲 Dreimal fragen');
  show(back(), h('h1', {}, '🎲 Das Würfel-Labor'),
    h('p', { class: 'lead' }, 'Die KI würfelt ein bisschen bei jedem Token. Was passiert, wenn wir dieselbe Frage dreimal gleichzeitig stellen?'),
    h('div', { class: 'card' }, sel, block || h('div', { class: 'row' }, btn)),
    h('div', { class: 'cols' }, boxes), note,
    h('p', { class: 'hint' }, 'Vergleiche eine kreative Frage mit einer Wissensfrage. Was fällt dir auf?'));
}

// --- Mission: Halluzinations-Detektiv ---
function detektiv(n = 0) {
  const fall = DETEKTIV[n];
  const picked = new Set();
  const btns = fall.saetze.map((s, k) => h('button', { class: 'sentence', onclick: () => {
    if (checked) return;
    picked.has(k) ? picked.delete(k) : picked.add(k);
    btns[k].classList.toggle('picked');
  } }, s.t));
  const out = h('div', {});
  let checked = false;
  const check = h('button', { onclick: () => {
    checked = true; check.disabled = true;
    let ok = true;
    fall.saetze.forEach((s, k) => {
      const hit = picked.has(k) === Boolean(s.f);
      if (!hit) ok = false;
      btns[k].classList.add(s.f ? 'wrong' : 'right');
    });
    out.replaceChildren(
      h('p', { class: ok ? 'ok' : 'bad' }, ok ? '🔎 Fall gelöst!' : 'Nicht ganz. Rot umrandet sind die falschen Sätze:'),
      h('ul', {}, fall.saetze.filter((s) => s.f).map((s) => h('li', {}, h('b', {}, s.t), ' – ', s.w))),
      h('div', { class: 'row' },
        n + 1 < DETEKTIV.length ? h('a', { class: 'btn', href: `#/detektiv/${n + 1}` }, 'Nächster Fall →') : h('a', { class: 'btn', href: '#/' }, 'Zur Übersicht'),
        h('button', { class: 'ghost', onclick: () => detektiv(n) }, 'Nochmal')));
    if (ok) {
      award('detektiv-' + n, 0, fall.title);
      if (DETEKTIV.every((_, k) => state.done['detektiv-' + k])) award('detektiv', 80, 'Alle Fälle gelöst');
    }
  } }, 'Anklage erheben');
  show(back(), h('h1', {}, '🕵️ Halluzinations-Detektiv'),
    h('p', { class: 'lead' }, 'Diese Antworten könnten von einer KI stammen. Klicke alle Sätze an, die falsch oder erfunden sind.'),
    h('p', { class: 'progress' }, `${fall.title} · ${n + 1} von ${DETEKTIV.length}`),
    h('div', { class: 'card' }, h('p', { class: 'hint' }, 'Frage: ', fall.frage), btns, h('div', { class: 'row' }, check), out));
}

// --- Mission: Persönlichkeits-Baukasten ---
const chatState = { system: '', messages: [] };
function persona() {
  const block = needsKi(persona);
  const sys = h('textarea', { 'aria-label': 'System-Prompt' });
  sys.value = chatState.system || PERSONA_VORLAGEN[0].text;
  const vorl = PERSONA_VORLAGEN.map((v) => h('button', { class: 'ghost', onclick: () => { sys.value = v.text; reset(); } }, v.name));
  const log = h('div', { class: 'chat', 'aria-live': 'polite' });
  const input = h('input', { type: 'text', placeholder: 'Schreib deinem Assistenten …', 'aria-label': 'Nachricht' });
  const send = h('button', {}, 'Senden');
  function reset() { chatState.messages = []; log.replaceChildren(); }
  function draw() {
    log.replaceChildren(...chatState.messages.map((m) => h('div', { class: `msg ${m.role}` }, m.content)));
  }
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
      const answer = await streamChat({ messages: chatState.messages, system: chatState.system }, (t) => (bubble.textContent = t));
      chatState.messages.push({ role: 'assistant', content: answer || '(keine Antwort)' });
      if (chatState.messages.length >= 6) award('persona', 60, 'Persönlichkeits-Baukasten');
    } catch (e) {
      chatState.messages.pop();
      bubble.textContent = '⚠️ ' + e.message;
    }
    send.disabled = false; input.focus();
  }
  send.addEventListener('click', go);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  show(back(), h('h1', {}, '🎭 Persönlichkeits-Baukasten'),
    h('p', { class: 'lead' }, 'Der „System-Prompt“ ist die Anleitung, die die KI vor jedem Gespräch bekommt. ' +
      'Damit bauen Firmen ihre Chatbots. Schreib deinen eigenen und teste, ob sich die KI daran hält!'),
    h('div', { class: 'card' }, h('div', { class: 'row' }, 'Vorlagen:', vorl), h('p', {}), sys,
      h('p', { class: 'hint' }, 'Wenn du den System-Prompt änderst, beginnt das Gespräch neu.')),
    block || h('div', { class: 'card' }, log, h('div', { class: 'row' }, input, send)),
    h('h2', {}, 'Forscher-Aufgaben'),
    h('ul', {}, h('li', {}, 'Versuche, den Sokrates-Tutor dazu zu bringen, dir die Lösung von 12 × 12 direkt zu verraten.'),
      h('li', {}, 'Was passiert, wenn dein System-Prompt sich selbst widerspricht?'),
      h('li', {}, 'Wie kurz kann ein System-Prompt sein, der trotzdem wirkt?')));
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

fetch('/api/status').then((r) => r.json()).then((d) => { serverInfo = d; }).catch(() => {}).finally(() => { renderXp(); route(); });
