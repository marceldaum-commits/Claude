// Sprache: Deutsch ist das Original. Englisch und Ukrainisch werden automatisch von Google Translate übersetzt
// (Website-Übersetzer). Befehle, Codes und Terminals sind translate="no" und bleiben im Original.
// Datenschutz: Bei EN/UK gehen die angezeigten Texte zur Übersetzung an Google.

export const LANGS = {
  de: { name: 'Deutsch', flag: '🇩🇪', note: '' },
  en: { name: 'English', flag: '🇬🇧', note: 'Machine-translated (Google). Commands and terminals stay in the original – type them exactly as shown.' },
  uk: { name: 'Українська', flag: '🇺🇦', note: 'Машинний переклад (Google). Команди й термінал залишаються в оригіналі – вводьте їх саме так, як показано.' },
};
const KEY = 'kly.lang';
// Wenige feste Begriffe übersetzen wir selbst (zuverlässiger als die Maschine)
export const NAV = { de: ['Start', 'Lernen', 'Terminal', 'Mehr'], en: ['Home', 'Learn', 'Terminal', 'More'], uk: ['Головна', 'Навчання', 'Термінал', 'Ще'] };
const FAIL = { en: 'Translation service not reachable right now – showing the German original.', uk: 'Сервіс перекладу зараз недоступний – показано німецький оригінал.' };

export function currentLang() {
  try { const l = localStorage.getItem(KEY); return LANGS[l] ? l : 'de'; } catch { return 'de'; }
}

function setCookie(v) {
  const host = location.hostname;
  const exp = v ? '' : '; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = `googtrans=${v}; path=/${exp}`;
  if (host.includes('.')) document.cookie = `googtrans=${v}; path=/; domain=.${host}${exp}`;
}

// Sprache wechseln: speichern und neu laden (Google übersetzt beim Laden zuverlässig)
export function setLang(l) {
  if (!LANGS[l]) l = 'de';
  try { localStorage.setItem(KEY, l); } catch { /* */ }
  setCookie(l === 'de' ? '' : `/de/${l}`);
  location.reload();
}

// Beim Start aufrufen
export function initLang() {
  const l = currentLang();
  document.documentElement.lang = l === 'de' ? 'de' : l;
  if (l === 'de') { setCookie(''); return; }
  setCookie(`/de/${l}`);
  const holder = document.createElement('div'); holder.id = 'gt-el'; holder.hidden = true; document.body.appendChild(holder);
  window.klyGtInit = () => {
    try { new window.google.translate.TranslateElement({ pageLanguage: 'de', includedLanguages: 'en,uk', autoDisplay: false }, 'gt-el'); } catch { /* */ }
  };
  const s = document.createElement('script');
  s.src = 'https://translate.google.com/translate_a/element.js?cb=klyGtInit';
  s.onerror = () => { const n = document.getElementById('lang-note'); if (n) n.textContent = FAIL[l]; };
  document.head.appendChild(s);
  // Prüfen, ob Google wirklich übersetzt hat (setzt die Klasse translated-ltr am <html>)
  setTimeout(() => {
    if (!document.documentElement.className.includes('translated')) { const n = document.getElementById('lang-note'); if (n) n.textContent = FAIL[l]; }
  }, 12000);
}

// Hinweiszeile bei maschineller Übersetzung (wird selbst nicht übersetzt)
export function langNoteHTML() {
  const l = currentLang();
  return l === 'de' ? '' : `<div class="card tight small" id="lang-note" translate="no">${LANGS[l].flag} ${LANGS[l].note}</div>`;
}

// Auswahlknöpfe (nicht übersetzt, damit jede Sprache ihren eigenen Namen zeigt)
export function langPickerHTML() {
  const l = currentLang();
  return `<div class="row" translate="no" style="gap:.4rem;flex-wrap:wrap">${Object.entries(LANGS).map(([k, v]) => `<button class="btn small ${k === l ? 'primary' : 'ghost'}" data-lang="${k}">${v.flag} ${v.name}</button>`).join('')}</div>`;
}
export function bindLangPicker(root) {
  root.querySelectorAll('[data-lang]').forEach(b => b.onclick = () => { if (b.dataset.lang !== currentLang()) setLang(b.dataset.lang); });
}
