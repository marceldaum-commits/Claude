  (function () {
    var els = [].slice.call(document.querySelectorAll('[data-en]'));
    els.forEach(function (el) { el.setAttribute('data-de', el.textContent); });
    var appLinks = [].slice.call(document.querySelectorAll('a[data-app]'));
    appLinks.forEach(function (a) { a.setAttribute('data-href', a.getAttribute('href')); });
    var titelDE = 'KI-Sicherheit lernen – echte KI hacken & verteidigen | Nachtfalter Hacklab';
    var titelEN = 'Learn AI security – hack & defend a real AI | Nachtfalter Hacklab';
    function readLang() {
      var q = new URLSearchParams(location.search).get('lang');
      if (q === 'en' || q === 'de') return q;
      try { var s = localStorage.getItem('kly.lang'); if (s === 'en' || s === 'de') return s; } catch (e) {}
      return 'de';
    }
    function apply(l) {
      document.documentElement.lang = l;
      els.forEach(function (el) { var t = el.getAttribute(l === 'en' ? 'data-en' : 'data-de'); if (t != null) el.textContent = t; });
      appLinks.forEach(function (a) { var base = a.getAttribute('data-href'); a.setAttribute('href', base + (base.indexOf('?') >= 0 ? '&' : '?') + 'lang=' + l); });
      document.title = (l === 'en') ? titelEN : titelDE;
      var b = document.getElementById('langtog');
      if (b) { b.textContent = (l === 'en') ? 'DE' : 'EN'; b.setAttribute('aria-pressed', l === 'en' ? 'true' : 'false'); }
      try { localStorage.setItem('kly.lang', l); } catch (e) {}
    }
    var btn = document.getElementById('langtog');
    if (btn) btn.addEventListener('click', function () { apply(document.documentElement.lang === 'en' ? 'de' : 'en'); });
    apply(readLang());
  })();
