// Terminal-Widget für die SANDBOX-SIMULATION (Touch + Tastatur)
import { VFS } from './shell.js';

import { termT } from './i18n.js';
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function mountTerminal(container, shell, opts = {}) {
  container.setAttribute('translate', 'no'); // Terminal nie übersetzen (Browser-Übersetzung)
  const el = document.createElement('div');
  el.className = 'term' + (opts.tall ? ' tall' : '');
  el.innerHTML = `
    <div class="term-head"><span class="lights"><i></i><i></i><i></i></span><span class="title">${esc(opts.title || termT('Sandbox-Terminal'))}</span><span class="badge sim">Simulation</span></div>
    <div class="term-banner">${esc(opts.banner || termT('SANDBOX-SIMULATION · synthetische Dateien & Ausgaben · keine echte Shell, kein Netzwerk'))}</div>
    <div class="term-out" role="log" aria-live="polite"></div>
    <div class="term-slot"></div>
    <form class="term-in" autocomplete="off">
      <span class="p"></span>
      <input type="text" aria-label="${esc(termT('Befehl eingeben'))}" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="send" inputmode="text">
    </form>
    <div class="keys" aria-label="Sondertasten">
      ${['Tab', '↑', '↓', '|', '~', '/', '-', '>', '&', '.', '*', '"', 'clear'].map(k => `<button type="button" data-k="${esc(k)}">${esc(k)}</button>`).join('')}
    </div>`;
  container.appendChild(el);
  const out = el.querySelector('.term-out');
  const input = el.querySelector('input');
  const promptEl = el.querySelector('.term-in .p');
  const slot = el.querySelector('.term-slot');
  let hIdx = shell.history.length;

  const setPrompt = () => { promptEl.textContent = shell.prompt(); };
  const scroll = () => { out.scrollTop = out.scrollHeight; };

  function print(text, cls = '') {
    if (text === undefined || text === null || text === '') return;
    const span = document.createElement('span');
    if (cls) span.className = cls;
    span.textContent = text.endsWith('\n') ? text : text + '\n';
    out.appendChild(span);
    scroll();
  }
  function printHTML(html, cls = '') {
    const div = document.createElement('div');
    if (cls) div.className = cls;
    div.innerHTML = html;
    out.appendChild(div);
    scroll();
  }

  function run(line) {
    const c = document.createElement('div');
    c.className = 'cmd';
    c.innerHTML = `<span class="p">${esc(shell.prompt())}</span> ${esc(line)}`;
    out.appendChild(c);
    const r = shell.exec(line);
    if (r.clear) out.innerHTML = '';
    print(termT(r.out));
    print(termT(r.err), 'err');
    setPrompt();
    hIdx = shell.history.length;
    scroll();
    opts.onCommand && opts.onCommand(line, r);
    return r;
  }

  el.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value;
    input.value = '';
    run(v);
  });

  function complete() {
    const v = input.value;
    const m = v.match(/(\S*)$/);
    const word = m ? m[1] : '';
    const dirPart = word.includes('/') ? word.slice(0, word.lastIndexOf('/') + 1) : '';
    const base = word.slice(dirPart.length);
    const dirAbs = VFS.normalize(dirPart || '.', shell.cwd);
    const node = shell.fs.get(dirAbs);
    let cands = [];
    if (!v.trim().includes(' ')) {
      cands = ['pwd', 'whoami', 'ls', 'cd', 'mkdir', 'touch', 'echo', 'cat', 'cp', 'mv', 'rm', 'chmod', 'stat', 'find', 'grep', 'wc', 'head', 'tail', 'sort', 'uniq', 'cut', 'ps', 'jobs', 'sleep', 'kill', 'curl', 'getent', 'clear', 'history', 'help', 'man', ...Object.keys(shell.extra)].filter(c => c.startsWith(base));
    } else if (node && node.t === 'd') {
      cands = Object.keys(node.kids).filter(k => k.startsWith(base) && (!k.startsWith('.') || base.startsWith('.'))).map(k => k + (node.kids[k].t === 'd' ? '/' : ''));
    }
    if (cands.length === 1) {
      input.value = v.slice(0, v.length - base.length) + cands[0] + (cands[0].endsWith('/') ? '' : ' ');
    } else if (cands.length > 1) {
      let pre = cands[0];
      for (const c of cands) while (!c.startsWith(pre)) pre = pre.slice(0, -1);
      if (pre.length > base.length) input.value = v.slice(0, v.length - base.length) + pre;
      else print(cands.join('  '), 'sys');
    }
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') { e.preventDefault(); complete(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (hIdx > 0) { hIdx--; input.value = shell.history[hIdx] || ''; } }
    else if (e.key === 'ArrowDown') { e.preventDefault(); if (hIdx < shell.history.length) { hIdx++; input.value = shell.history[hIdx] || ''; } }
    else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); out.innerHTML = ''; }
    else if (e.key === 'c' && e.ctrlKey && !window.getSelection().toString()) { e.preventDefault(); print(shell.prompt() + ' ' + input.value + '^C', 'sys'); input.value = ''; }
  });

  el.querySelector('.keys').addEventListener('click', (e) => {
    const k = e.target.closest('button')?.dataset.k;
    if (!k) return;
    if (k === 'Tab') complete();
    else if (k === '↑') { if (hIdx > 0) { hIdx--; input.value = shell.history[hIdx] || ''; } }
    else if (k === '↓') { if (hIdx < shell.history.length) { hIdx++; input.value = shell.history[hIdx] || ''; } }
    else if (k === 'clear') { out.innerHTML = ''; }
    else {
      const pos = input.selectionStart ?? input.value.length;
      input.value = input.value.slice(0, pos) + k + input.value.slice(pos);
      input.setSelectionRange(pos + k.length, pos + k.length);
    }
    input.focus();
  });

  out.addEventListener('click', () => { if (!window.getSelection().toString()) input.focus({ preventScroll: true }); });

  setPrompt();
  if (opts.welcome) print(opts.welcome, 'sys');

  return { el, print, printHTML, run, input, slot, focus: () => input.focus(), setPrompt, clear: () => { out.innerHTML = ''; } };
}
