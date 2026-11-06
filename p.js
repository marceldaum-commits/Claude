(function () {
  var el = document.getElementById('inhalt');
  function esc(s){ var d=document.createElement('div'); d.textContent = s==null?'':String(s); return d.innerHTML; }
  function fehler(t){ el.innerHTML = '<div class="msg">'+esc(t)+'<br><br><a class="cta" href="https://app.nachtfalter.tech">Zum Nachtfalter Hacklab →</a></div>'; }
  var id = (new URLSearchParams(location.search).get('id') || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
  if (!id) { fehler('Kein Profil angegeben.'); return; }
  var cfg = window.KLY_CONFIG || {};
  if (!cfg.supabaseUrl) { fehler('Konfiguration fehlt.'); return; }
  fetch(cfg.supabaseUrl + '/functions/v1/profil', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': cfg.supabaseAnonKey || '' },
    body: JSON.stringify({ aktion: 'oeffentlich', id: id }),
  }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
    .then(function (res) {
      if (!res.ok || !res.j || !res.j.profil) { fehler((res.j && res.j.fehler) || 'Profil nicht gefunden.'); return; }
      var p = res.j.profil;
      var name = (p.name || '').trim() || 'Nachtfalter-Lernende(r)';
      var initial = name.charAt(0).toUpperCase() || '🦉';
      var html = ''
        + '<div class="brand"><img src="icons/icon.svg" alt="">Nachtfalter Hacklab</div>'
        + '<div class="ava">' + esc(initial) + '</div>'
        + '<h1>' + esc(name) + '</h1>'
        + '<p class="sub">Lern-Profil · Linux &amp; ethisches Hacken</p>'
        + '<div class="kpis">'
        +   '<div class="kpi"><b>' + esc(p.punkte || 0) + '</b><span>Punkte</span></div>'
        +   '<div class="kpi"><b>' + esc(p.abzeichen || 0) + '</b><span>Abzeichen</span></div>'
        +   '<div class="kpi"><b>' + esc(p.streak || 0) + '🔥</b><span>Serie</span></div>'
        + '</div>'
        + (p.meilenstein ? '<span class="ms">🏅 ' + esc(p.meilenstein) + '</span>' : '')
        + '<a class="cta" href="https://app.nachtfalter.tech">Auch starten – kostenlos →</a>'
        + '<a class="cta ghost" href="https://www.nachtfalter.tech">Was ist das Nachtfalter Hacklab?</a>';
      el.innerHTML = html;
    })
    .catch(function () { fehler('Konnte das Profil gerade nicht laden.'); });
})();
