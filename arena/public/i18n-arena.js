// Übersetzung für die Arena-Seiten (eigenständig, ohne die große App-i18n).
// Deutsch ist Original. Bei Englisch/Ukrainisch übersetzt der Google-Website-Übersetzer – aber nur nach aktiver
// Wahl (Einwilligung). Codes (KLY{…}), Befehle und das Terminal sind translate="no" und bleiben im Original.
(function () {
  const LANGS = { de: { name: 'Deutsch', flag: '🇩🇪' }, en: { name: 'English', flag: '🇬🇧' }, uk: { name: 'Українська', flag: '🇺🇦' } };
  const KEY = 'kly.lang';
  const hol = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const gewaehlt = () => !!LANGS[hol()];
  function geraeteSprache() {
    const l = ((navigator.languages && navigator.languages[0]) || navigator.language || '').slice(0, 2).toLowerCase();
    return LANGS[l] ? l : 'en';
  }
  const aktuell = () => LANGS[hol()] ? hol() : geraeteSprache();
  function cookie(v) {
    const h = location.hostname; const exp = v ? '' : '; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = `googtrans=${v}; path=/${exp}`;
    if (h.includes('.')) document.cookie = `googtrans=${v}; path=/; domain=.${h}${exp}`;
  }
  function setze(l) { if (!LANGS[l]) l = 'de'; try { localStorage.setItem(KEY, l); } catch { /* */ } cookie(l === 'de' ? '' : `/de/${l}`); location.reload(); }
  function picker() {
    const l = aktuell();
    const box = document.getElementById('sprache'); if (!box) return;
    box.setAttribute('translate', 'no');
    box.innerHTML = Object.entries(LANGS).map(([k, v]) => `<button class="${k === l ? 'an' : ''}" data-l="${k}">${v.flag} ${v.name}</button>`).join('');
    box.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { if (b.dataset.l !== l || !gewaehlt()) setze(b.dataset.l); });
    if (!gewaehlt() && l !== 'de') {
      const n = document.createElement('p'); n.className = 'small muted'; n.id = 'sprachhinweis';
      n.textContent = { en: 'Language from your phone. Tap your language again to translate the rest automatically (Google).', uk: 'Мову взято з телефона. Натисни мову ще раз для авто-перекладу решти (Google).' }[l];
      box.after(n);
    }
  }
  function initGoogle() {
    const l = aktuell();
    document.documentElement.lang = l;
    if (l === 'de' || !gewaehlt()) { cookie(''); return; }
    cookie(`/de/${l}`);
    const holder = document.createElement('div'); holder.id = 'gt-el'; holder.hidden = true; holder.setAttribute('translate', 'no'); document.body.appendChild(holder);
    window.arenaGtInit = () => { try { new window.google.translate.TranslateElement({ pageLanguage: 'de', includedLanguages: 'en,uk', autoDisplay: false }, 'gt-el'); } catch { /* */ } };
    const s = document.createElement('script'); s.src = 'https://translate.google.com/translate_a/element.js?cb=arenaGtInit'; document.head.appendChild(s);
  }
  window.ArenaI18n = { picker, aktuell };
  if (document.readyState !== 'loading') { picker(); initGoogle(); }
  else document.addEventListener('DOMContentLoaded', () => { picker(); initGoogle(); });
})();
