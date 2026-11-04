// Handbuch: Begriffe (mit Suche), Befehle, Handouts je Arena (druckbar). Adresse: handbuch.html#begriffe | #befehle | #handout-<lab>
(() => {
  const { BEGRIFFE, BEFEHLE, HANDOUTS } = window.NF_HANDBUCH;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const anker = (t) => 'b-' + t.toLowerCase().replace(/[^a-z0-9äöüß]+/g, '-');
  let titel = {};

  function begriffe(f = '') {
    const q = f.trim().toLowerCase();
    $('#liste').innerHTML = BEGRIFFE.filter(([t, e]) => !q || t.toLowerCase().includes(q) || e.toLowerCase().includes(q))
      .map(([t, e, b]) => `<dt id="${anker(t)}">${esc(t)}</dt><dd>${esc(e)}${b ? `<br><span class="beispiel">Beispiel: <code translate="no">${esc(b)}</code></span>` : ''}</dd>`).join('') || '<p class="muted">Nichts gefunden.</p>';
  }
  function befehle() { $('#cmds').innerHTML = BEFEHLE.map(([c, w]) => `<tr><td><code translate="no">${esc(c)}</code></td><td>${esc(w)}</td></tr>`).join(''); }
  function blatt(id) {
    const h = HANDOUTS[id]; if (!h) return '';
    const liste = (a) => `<ul>${a.map(x => `<li>${x}</li>`).join('')}</ul>`;
    return `<article class="card blatt" id="handout-${esc(id)}">
      <h2>${esc(titel[id] || id)}</h2><p><b>Worum geht es?</b> ${esc(h.ziel)}</p>
      <h3>Begriffe</h3><ul>${h.begriffe.map(b => { const e = BEGRIFFE.find(x => x[0] === b); return `<li><b>${esc(b)}</b>${e ? ' – ' + esc(e[1]) : ''}</li>`; }).join('')}</ul>
      <h3>Werkzeuge</h3><p>${h.werkzeuge.map(w => `<code translate="no">${esc(w)}</code>`).join(' · ')}</p>
      <h3>So gehst du vor</h3>${liste(h.vorgehen.map(esc))}
      <h3>Und im echten Leben? So schützt man sich</h3>${liste(h.schutz.map(esc))}
      <p class="small muted">Nachtfalter Arena · Übungssystem, alle Daten erfunden. Nur im erlaubten Rahmen (Scope) üben.</p></article>`;
  }
  function handouts(id) {
    $('#wahl').value = id || '';
    $('#blaetter').innerHTML = (id ? [id] : Object.keys(HANDOUTS)).map(blatt).join('');
  }
  function zeige() {
    const h = decodeURIComponent(location.hash.slice(1));
    const tab = h.startsWith('handout') ? 'handouts' : (['begriffe', 'befehle', 'handouts'].includes(h) ? h : (h.startsWith('b-') ? 'begriffe' : 'begriffe'));
    for (const s of ['begriffe', 'befehle', 'handouts']) { $('#' + s).hidden = s !== tab; }
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('an', b.dataset.tab === tab));
    if (tab === 'handouts') handouts(h.startsWith('handout-') ? h.slice(8) : '');
    if (h.startsWith('b-')) document.getElementById(h)?.scrollIntoView({ block: 'center' });
  }
  document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => { location.hash = b.dataset.tab; });
  $('#suche').oninput = (e) => begriffe(e.target.value);
  $('#wahl').onchange = (e) => { location.hash = e.target.value ? 'handout-' + e.target.value : 'handouts'; };
  $('#drucken').onclick = () => window.print();
  window.addEventListener('hashchange', zeige);
  begriffe(); befehle();
  fetch('api/labs').then(r => r.json()).then(j => { for (const l of j.labs || []) titel[l.id] = l.titel; }).catch(() => {}).finally(() => {
    $('#wahl').innerHTML = '<option value="">Alle Arenen</option>' + Object.keys(HANDOUTS).map(id => `<option value="${esc(id)}">${esc(titel[id] || id)}</option>`).join('');
    zeige();
  });
})();
