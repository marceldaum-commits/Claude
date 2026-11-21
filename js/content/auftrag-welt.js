// Auftrag-Engine – SIM-Adapter: baut aus einer generierten Kiste (generiere()) die Sandbox-Welt.
// Prinzip (grep-sicher, echtes Rätsel): Die Flag-WERTE liegen NICHT im Dateisystem. Der Spieler findet
// in der „Spur" (Notizen/.env/History/sudoers) das Geheimnis (Passwort, GTFOBins-Binary, SQLi-Bypass)
// und löst damit per `zugang <geheimnis>` die Flag aus. Enumeration wird belohnt, blindes grep nicht.
// Im Docker-Adapter (später) macht derselbe eng-Datensatz die Dienste echt (ssh/hydra/sqlmap).

const HOME = '/home/seppi';

// Deterministischer Flag-Wert für die VORSCHAU (die Edge ersetzt das später durch HMAC pro Konto).
export function flagWert(eng, id) {
  let h = 2166136261 >>> 0;
  for (const c of `${eng.firma}:${eng.host}:${eng.stufe}:${id}`) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  let hex = '';
  for (let i = 0; i < 4; i++) { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; h >>>= 0; hex += h.toString(16).padStart(8, '0'); }
  return `KLY{${hex.slice(0, 16)}}`;
}
export const flagwerteFuer = (eng) => Object.fromEntries((eng.flags || []).map(f => [f.id, flagWert(eng, f.id)]));

// Baut die erkundbare Welt in eine Shell (sh = new Shell({fs: baseFS()})).
export function baueWelt(sh, eng) {
  // Spur-Dateien (lesbar) – hier stecken die Geheimnisse, die zum `zugang` führen.
  for (const f of (eng.dateien || [])) sh.fs.put(f.pfad, f.inhalt, f.modus ?? 0o644, f.owner || 'root');
  // sudoers-Spur (falls Privesc-Modul dabei)
  for (const s of (eng.sudo || [])) {
    if (!sh.read('/etc/sudoers.d/90-dienst')) sh.fs.put('/etc/sudoers.d/90-dienst', `# Dienst-Freigabe\nsvc-web ALL=(root) NOPASSWD: ${s.bin}\n`, 0o644, 'root');
  }
  // Web-App (falls SQLi-Modul dabei): eine „Landeseite", die den Login-Pfad verrät.
  for (const a of (eng.apps || [])) {
    sh.fs.put('/var/www/html/index.html', `<!-- interne Verwaltung -->\n<h1>${eng.firma}</h1>\n<p>Login: ${a.pfad}</p>\n`, 0o644, 'www-data');
  }
  // Ein kurzer Einstieg direkt im Home.
  sh.fs.put(`${HOME}/LIESMICH.txt`, `Zielsystem: ${eng.host} (${eng.firma}).\nFang mit der Aufklärung an:  nmap ${eng.host}\nWenn du ein Geheimnis gefunden hast, nutze:  zugang <geheimnis>\n`, 0o644, 'seppi');
  return sh;
}

const sqliNorm = (s) => String(s).toLowerCase().replace(/[^a-z0-9=]/g, '');
const istSqli = (u) => /'/.test(u) && /=/.test(u);
function trifft(input, unlock) {
  if (!unlock) return false;
  if (istSqli(unlock)) return sqliNorm(input).includes('or1=1');
  return String(input).trim() === String(unlock).trim();
}

// Eigene Befehle der Kiste: simuliertes nmap, curl (Web) und der `zugang`-Befehl (lokale Bestätigung).
// Das gefundene Geheimnis reicht der Spieler oben beim Ziel ein – geprüft wird serverseitig (Edge `auftrag`).
export function auftragCommands(eng) {
  const flags = eng.flags || [];
  return {
    nmap: (args) => {
      const ziel = args.find(a => !a.startsWith('-')) || eng.host;
      const zeilen = (eng.dienste || []).map(d => `${String(d.port).padEnd(9)}open   ${d.name}${d.version ? '   ' + d.version : ''}`);
      return { out: `Starting Nmap gegen ${ziel}\nPORT     STATE  SERVICE\n${zeilen.join('\n')}\nNmap done: 1 host up.\n`, code: 0 };
    },
    curl: (args) => {
      const url = args.find(a => !a.startsWith('-')) || '';
      const app = (eng.apps || [])[0];
      if (app && url.includes(app.pfad)) return { out: `<form action="${app.pfad}/login" method="post">\n  <input name="user"> <input name="pass" type="password">\n</form>\n<!-- TODO: Eingaben noch nicht abgesichert -->\n`, code: 0 };
      if (url.includes(eng.host) || url.includes('/')) return { out: `<h1>${eng.firma}</h1>\n`, code: 0 };
      return { out: '', err: 'curl: (6) Could not resolve host\n', code: 6 };
    },
    zugang: (args) => {
      const eingabe = args.join(' ').trim();
      if (!eingabe) return { out: 'Nutzung: zugang <geheimnis>  (z. B. ein gefundenes Passwort)\n', code: 1 };
      const treffer = flags.find(f => trifft(eingabe, f.unlock));
      if (treffer) return { out: `✓ Zugang bestätigt (${treffer.titel}).\n  → Trag genau dieses Geheimnis oben beim passenden Ziel ein, dann prüft es der Server.\n`, code: 0 };
      return { out: '✗ Zugang verweigert. Das ist nicht das richtige Geheimnis – erkunde weiter.\n', code: 1 };
    },
  };
}
