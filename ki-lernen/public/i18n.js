// Mini-Übersetzung: Schlüssel ist der exakte deutsche Text, Wörterbücher liegen in i18n/<sprache>.json.
// Fehlt eine Übersetzung, erscheint der deutsche Text. Platzhalter: {name}.
export const LANGS = { de: 'Deutsch', en: 'English', uk: 'Українська' };

let dict = {};
let current = 'de';

export function lang() { return current; }

export async function setLang(code) {
  current = LANGS[code] ? code : 'de';
  dict = {};
  if (current !== 'de') {
    try {
      const res = await fetch(`i18n/${current}.json`, { cache: 'no-cache' });
      if (res.ok) dict = await res.json();
    } catch { /* offline: Deutsch */ }
  }
  document.documentElement.lang = current;
  return current;
}

export function t(text, vars) {
  let s = (current !== 'de' && dict[text]) || text;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  return s;
}
