// Export/Import: Lernstand-Sicherung (JSON) und App-Download (ZIP).
// Neutraler App-Download enthält KEINEN Lernstand und KEINE Sync-Zugangsdaten.
import { snapshotForExport, looksLikeState, upgrade } from './state.js';

const JSZIP_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';

export function download(name, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');

export function exportStateJSON(state) {
  const data = JSON.stringify(snapshotForExport(state), null, 2);
  download(`kali-level-up-lernstand-${stamp()}.json`, new Blob([data], { type: 'application/json' }));
}

export async function readStateFile(file) {
  const text = await file.text();
  let obj;
  try { obj = JSON.parse(text); } catch { throw new Error('Die Datei ist kein gültiges JSON.'); }
  if (!looksLikeState(obj)) throw new Error('Die Datei sieht nicht nach einem Kali-Level-Up-Lernstand aus.');
  return upgrade(obj);
}

function loadJSZip() {
  if (globalThis.JSZip) return Promise.resolve(globalThis.JSZip);
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = JSZIP_URL;
    s.onload = () => res(globalThis.JSZip);
    s.onerror = () => rej(new Error('ZIP-Bibliothek konnte nicht geladen werden (offline?).'));
    document.head.appendChild(s);
  });
}

const NEUTRAL_CONFIG = `// Konfiguration für die geräteübergreifende Synchronisierung (Supabase).
// Leer lassen = App läuft rein lokal. Einrichtung: docs/SUPABASE-SETUP.md
window.KLY_CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: '',
};
`;

export async function exportApp({ includeState, state }) {
  const JSZip = await loadJSZip();
  const zip = new JSZip();
  const root = zip.folder('kali-level-up');
  const files = [...(self.KLY_FILES || []), ...(self.KLY_EXTRA || [])];
  const missing = [];
  for (const f of files) {
    if (f === 'config.js') { root.file(f, NEUTRAL_CONFIG); continue; }
    try {
      const r = await fetch(f, { cache: 'no-cache' });
      if (!r.ok) throw new Error(r.status);
      root.file(f, await r.blob());
    } catch { missing.push(f); }
  }
  if (includeState) {
    root.file('lernstand-snapshot.json', JSON.stringify(snapshotForExport(state), null, 2));
  }
  root.file('WEITERGABE.txt',
    `Nachtfalter Hacklab ${self.KLY_VERSION || ''} – exportiert am ${new Date().toLocaleString('de-DE')}\n\n` +
    (includeState
      ? 'ACHTUNG: Dieses Paket enthält einen PERSÖNLICHEN Lernstand (lernstand-snapshot.json) als Momentaufnahme.\nNicht öffentlich weitergeben. Import in der App: Mehr → Daten → Lernstand importieren.\n'
      : 'Neutrale Version: kein Lernstand, keine Zugangsdaten. Sync-Konfiguration ist leer.\n') +
    '\nStart: Ordner über einen lokalen Webserver ausliefern (z. B. python3 -m http.server 8000 --bind 127.0.0.1)\nund http://127.0.0.1:8000 öffnen. Details: README.md\n' +
    (missing.length ? `\nNicht enthalten (konnten nicht geladen werden): ${missing.join(', ')}\n` : ''));
  const blob = await zip.generateAsync({ type: 'blob' });
  download(`kali-level-up-${self.KLY_VERSION || 'app'}${includeState ? '-mit-lernstand' : ''}-${stamp()}.zip`, blob);
  return { missing };
}
