// Fünf Rätsel-Leitern (alle SIMULATION im Browser, erfundene Systeme):
// w5 Das Stellwerk (Linux, schwerer) · w6 Die Bewerbung (Hacking leicht) · w7 Operation Nebel (Hacking mittel)
// w8 Der Tresorraum (Linux schwer) · w9 Das Phantom (Hacking schwer)
// „Hacking“ heißt hier: CTF-Disziplinen Aufklärung, Datenlecks finden, Kodierungen knacken, Spurensicherung.

import { makeLadder, T, p2, b64, b64url, hex, rot13, rev, page } from './leiter.js';

const code = (t) => (String(t).match(/KLY\{[0-9a-f]{16}\}/) || [''])[0];
const noise = (R, n) => Array.from({ length: n }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(R() * 36)]).join('');
const binNoise = (R, n) => Array.from({ length: n }, () => String.fromCharCode(Math.floor(R() * 31) + (R() < 0.5 ? 0 : 1))).join('');

// ============================================================================ w5 – Das Stellwerk (Linux, schwerer)
const W5 = makeLadder({
  id: 'w5', title: 'Das Stellwerk', level: 'L4', dir: 'stellwerk', prefix: 'posten', seed: 5151, minutes: 120,
  tools: ['grep -ril', 'awk', 'sort -t -k', 'diff', 'xxd -r -p', 'sha256sum', 'strings', 'cut -c', 'Schleifen'],
  desc: 'Linux-Leiter, schwerer als der Funkturm: Im alten Stellwerk von Talheim stimmt nachts etwas mit den Weichen nicht. Zehn Posten bis zur Wahrheit.',
  ziel: 'Werkzeuge kombinieren: rekursiv suchen, filtern, vergleichen, Prüfsummen, Rohdaten lesen und eigene Schleifen.',
  intro: T('STELLWERK TALHEIM (erfunden)', '', 'Seit Tagen stellen sich nachts Weichen um, ohne dass es im Plan steht.',
    'Die Bahn schickt dich: Arbeite dich durch die zehn Posten des Stellwerks-Servers.',
    'Jeder Posten versteckt einen Code. Mit  entsperren CODE  geht der nächste auf.', '', 'Start:  cd posten00', ''),
  finale: T('Die Weichen stellte ein vergessenes Testskript aus der Nachtschicht um.', 'Dank dir ist es gefunden und abgeschaltet. Die Bahn sagt: Danke!', ''),
  nach: { beobachtung: 'Rekursive Suche, Filtern mit awk, Sortieren nach Feldern, Vergleiche, Hex, Prüfsummen, Rohdaten.', schluss: 'Gute Linux-Arbeit heißt: das passende Werkzeug wählen und kombinieren.', grenzen: 'Simulation einer Bash.', naechster: 'Der Tresorraum – Linux, schwer.' },
  floors: [
    { t: 'Die Meldung zu Weiche 17', pts: 10, rep: 'Nachtfalter Stufe 3 (grep -r)',
      body: '60 Störmeldungen in vielen Ordnern. Eine erwähnt „Weiche 17“ – aber jemand hat wild mit Groß- und Kleinbuchstaben geschrieben.',
      build(c) {
        const hit = Math.floor(c.R() * 60);
        for (let i = 0; i < 60; i++) {
          const w = [3, 5, 8, 12, 21, 24, 33, 40][i % 8];
          c.put(`meldungen/${['nord', 'sued', 'mitte'][i % 3]}/m${p2(i)}.txt`, i === hit ? `StörUNG an WeIcHe 17 gemeldet.\nCode: ${c.code}\n` : `Störung an Weiche ${w}. Erledigt.\n`);
        }
        c.put('hinweis.txt', 'Gesucht: die Meldung zu „weiche 17“ – Groß-/Kleinschreibung egal, irgendwo unter meldungen/.\n');
      },
      hints: ['grep -r durchsucht ganze Ordner.', 'grep -i ignoriert Groß- und Kleinschreibung, -l zeigt nur den Dateinamen.', 'Lösung: grep -ril "weiche 17" meldungen → cat auf die gefundene Datei'],
      solve: (run) => run(`cat ${run('grep -ril "weiche 17" meldungen').trim()}`) },
    { t: 'Der unpünktlichste Zug', pts: 15, rep: 'Kollektiv Stufe 4 (awk)',
      body: 'Eine Tabelle mit Verspätungen. Welcher Zug war am häufigsten MEHR als 10 Minuten zu spät?',
      build(c) {
        const zuege = ['RE7', 'RB22', 'IC118', 'S3', 'RE4', 'RB9'];
        const rows = ['zug;bahnhof;minuten'];
        for (let i = 0; i < 120; i++) { const z = c.pick(zuege); rows.push(`${z};${c.pick(['Talheim', 'Nordstadt', 'Weiler', 'Au'])};${z === 'RB22' ? (i % 2 ? 14 : 3) : Math.floor(c.R() * 12)}`); }
        c.put('verspaetungen.csv', rows.join('\n') + '\n');
        for (const z of zuege) c.put(`zuege/${z}.txt`, z === 'RB22' ? `Dieser Zug war das Problem. Code: ${c.code}\n` : 'Unauffällig.\n');
        c.put('hinweis.txt', 'Nur Zeilen mit mehr als 10 Minuten zählen. Dann: Welcher Zug kommt am häufigsten vor? Datei: zuege/ZUG.txt\n');
      },
      hints: ["awk -F';' '$3>10' DATEI zeigt nur Zeilen, deren 3. Spalte größer als 10 ist.", "Nur den Zugnamen ausgeben: awk -F';' '$3>10 {print $1}'", 'Dann zählen: | sort | uniq -c | sort -nr | head -1', "Lösung: awk -F';' '$3>10 {print $1}' verspaetungen.csv | sort | uniq -c | sort -nr | head -1 → cat zuege/ZUG.txt"],
      solve: (run) => run(`cat zuege/${run("awk -F';' '$3>10 {print $1}' verspaetungen.csv | sort | uniq -c | sort -nr | head -1").trim().split(/\s+/)[1]}.txt`) },
    { t: 'Funkfetzen', pts: 15,
      body: 'Der Code wurde in vier Teilen gefunkt – in falscher Reihenfolge.',
      build(c) {
        const parts = [c.code.slice(0, 6), c.code.slice(6, 11), c.code.slice(11, 16), c.code.slice(16)];
        const lines = Array.from({ length: 40 }, (_, i) => `RAUSCHEN ${noise(c.R, 12)}`);
        [3, 1, 4, 2].forEach((n, i) => lines.splice(5 + i * 9, 0, `TEIL=${n} WERT=${parts[n - 1]}`));
        c.put('funk.log', lines.join('\n') + '\n');
        c.put('hinweis.txt', 'Vier Zeilen enthalten TEIL=NUMMER und WERT=STÜCK. Nach Nummer sortiert und zusammengesetzt ergibt sich der Code.\n');
      },
      hints: ['grep TEIL funk.log zeigt die vier Zeilen.', 'sort -t= -k2 -n sortiert nach dem Teil hinter dem ersten =, als Zahl.', "sed 's/.*WERT=//' schneidet alles bis WERT= weg. tr -d \"\\n\" klebt zusammen.", "Lösung: grep TEIL funk.log | sort -t= -k2 -n | sed 's/.*WERT=//' | tr -d \"\\n\""],
      solve: (run) => run("grep TEIL funk.log | sort -t= -k2 -n | sed 's/.*WERT=//' | tr -d \"\\n\"") },
    { t: 'Gestern und heute', pts: 15, rep: 'Funkturm Etage 7 (diff)',
      body: 'Zwei Ordner mit Fahrplandateien: gestern/ und heute/. Heute ist eine Datei dazugekommen.',
      build(c) {
        const names = Array.from({ length: 40 }, (_, i) => `plan-${p2(i)}-${noise(c.R, 4)}.txt`);
        for (const n of names) { c.put(`gestern/${n}`, 'Fahrplan.\n'); c.put(`heute/${n}`, 'Fahrplan.\n'); }
        c.put(`heute/plan-neu-${noise(c.R, 5)}.txt`, `Diese Datei war gestern noch nicht da. Code: ${c.code}\n`);
        c.put('hinweis.txt', 'Welche Datei ist neu? Speichere beide Listen mit ls in Dateien und vergleiche sie.\n');
      },
      hints: ['ls gestern > g.txt speichert die Liste in einer Datei. Dasselbe für heute.', 'diff g.txt h.txt zeigt den Unterschied (> = nur in der zweiten Datei).', 'Lösung: ls gestern > g.txt; ls heute > h.txt; diff g.txt h.txt → cat heute/DATEI'],
      solve: (run) => { run('ls gestern > g.txt; ls heute > h.txt'); return run(`cat heute/${run('diff g.txt h.txt').match(/> (\S+)/)[1]}`); } },
    { t: 'Das Hex-Signal', pts: 10,
      body: 'Ein Signal als Hexadezimal-Zahlen. Jedes Zeichen ist hier zwei Hex-Ziffern.',
      build(c) { c.put('signal.hex', hex(`Signal entschlüsselt. Code: ${c.code}`).replace(/(.{40})/g, '$1\n') + '\n'); c.put('hinweis.txt', 'xxd zeigt Dateien als Hex – und kann auch rückwärts.\n'); },
      hints: ['Hex heißt: 4b = K, 4c = L, 59 = Y …', 'xxd -r -p wandelt reines Hex zurück in Text.', 'Lösung: xxd -r -p signal.hex'],
      solve: (run) => run('xxd -r -p signal.hex') },
    { t: 'Der echte Fahrplan', pts: 15,
      body: '30 Fahrpläne, 29 davon gefälscht. Die Bahn hat dir die Prüfsumme des echten gegeben.',
      build(c) {
        const hit = Math.floor(c.R() * 30);
        for (let i = 0; i < 30; i++) c.put(`fahrplaene/fp-${p2(i)}.txt`, i === hit ? `ECHTER FAHRPLAN\nCode: ${c.code}\n` : `Fahrplan ${i}: ${noise(c.R, 20)}\n`);
        c.put('pruefsumme.txt', 'wird beim Start berechnet\n');
      },
      hints: ['sha256sum DATEI berechnet die Prüfsumme. Mit fahrplaene/* für alle auf einmal.', 'Vergleiche mit der Prüfsumme aus pruefsumme.txt – grep hilft.', 'Lösung: sha256sum fahrplaene/* | grep $(tail -n 1 pruefsumme.txt) → cat auf die Datei'],
      solve: (run) => run(`cat ${run('sha256sum fahrplaene/* | grep $(tail -n 1 pruefsumme.txt)').trim().split(/\s+/)[1]}`) },
    { t: 'Der Blackbox-Speicher', pts: 15, rep: 'Funkturm Etage 9',
      body: 'Ein Rohdaten-Abzug aus dem Stellwerksrechner. Fast nur Datenmüll – aber irgendwo stehen lesbare Wörter.',
      build(c) { c.put('stellwerk.bin', binNoise(c.R, 400) + 'MODELL=SW-1987' + binNoise(c.R, 300) + `KENNUNG=${c.code}` + binNoise(c.R, 500) + 'ENDE'); c.put('hinweis.txt', 'cat zeigt Unsinn. Ein Werkzeug zieht nur die lesbaren Zeichenketten heraus.\n'); },
      hints: ['Rohdaten enthalten oft lesbare Wörter zwischen dem Datenmüll – Texte, Namen, Kennungen.', 'strings DATEI zeigt nur lesbare Zeichenfolgen (mindestens 4 Zeichen).', 'Lösung: strings stellwerk.bin | grep KENNUNG'],
      solve: (run) => run('strings stellwerk.bin | grep KENNUNG') },
    { t: 'Ab Zeichen 1500', pts: 15,
      body: 'Eine einzige, sehr lange Zeile. Der Code beginnt bei Zeichen 1500 und ist 21 Zeichen lang.',
      build(c) { c.put('lang.txt', noise(c.R, 1499) + c.code + noise(c.R, 1480) + '\n'); },
      hints: ['cut -c kann Zeichenbereiche ausschneiden: cut -c VON-BIS', '1500 + 21 − 1 = 1520.', 'Lösung: cut -c1500-1520 lang.txt'],
      solve: (run) => run('cut -c1500-1520 lang.txt') },
    { t: 'Die richtige Weiche', pts: 20, rep: 'Kollektiv (Schleifen)',
      body: 'Ein Prüfskript sagt bei jeder Weichennummer „falsch“ – nur bei einer nicht. Es gibt 300 Weichen.',
      build(c) {
        const w = 1 + Math.floor(c.R() * 300);
        c.put('pruefe.sh', T('#!/bin/bash', `if [ $(( ($1 * 7 + 13) % 300 )) -eq ${(w * 7 + 13) % 300} ]; then`, `  echo "Weiche $1: richtig – $(echo ${b64(`Code: ${c.code}`)} | base64 -d)"`, 'else', '  echo "Weiche $1: falsch"', 'fi', ''), 0o755);
        c.put('hinweis.txt', 'Starte ./pruefe.sh NUMMER. Alle 300 von Hand? Lass eine Schleife arbeiten.\n');
      },
      hints: ['seq 1 300 erzeugt alle Zahlen von 1 bis 300.', 'for i in $(seq 1 300); do ./pruefe.sh $i; done', 'Mit | grep -v falsch bleiben nur Treffer übrig.', 'Lösung: for i in $(seq 1 300); do ./pruefe.sh $i; done | grep -v falsch'],
      solve: (run) => run('for i in $(seq 1 300); do ./pruefe.sh $i; done | grep -v falsch') },
    { t: 'Die Nachtschicht', pts: 25, rep: 'Funkturm Etage 18',
      body: 'Wer hat nachts (00–04 Uhr) am häufigsten Weichen mit einer Nummer über 100 umgestellt?',
      build(c) {
        const leute = ['brandt', 'kaya', 'oswald', 'lindner', 'petrov'];
        const rows = [];
        for (let i = 0; i < 250; i++) rows.push(`${p2(6 + Math.floor(c.R() * 16))}:${p2(Math.floor(c.R() * 60))} ${c.pick(leute)} ${1 + Math.floor(c.R() * 200)}`);
        for (let i = 0; i < 18; i++) rows.push(`0${Math.floor(c.R() * 5)}:${p2(Math.floor(c.R() * 60))} oswald ${101 + Math.floor(c.R() * 90)}`);
        for (let i = 0; i < 14; i++) rows.push(`0${Math.floor(c.R() * 5)}:${p2(Math.floor(c.R() * 60))} kaya ${1 + Math.floor(c.R() * 99)}`);
        for (let i = 0; i < 6; i++) rows.push(`0${Math.floor(c.R() * 5)}:${p2(Math.floor(c.R() * 60))} lindner ${101 + Math.floor(c.R() * 90)}`);
        c.put('stellprotokoll.log', rows.sort(() => c.R() - 0.5).join('\n') + '\n');
        for (const l of leute) c.put(`mitarbeiter/${l}.txt`, l === 'oswald' ? `Oswald hatte ein altes Testskript laufen. Code: ${c.code}\n` : 'Unauffällig.\n');
        c.put('hinweis.txt', 'Format: UHRZEIT NAME WEICHE. Nur 00:00–04:59 und nur Weichen über 100. Datei: mitarbeiter/NAME.txt\n');
      },
      hints: ['Nachts: grep "^0[0-4]:" filtert die Uhrzeit.', "Weiche über 100: awk '$3>100 {print $2}' gibt den Namen aus.", 'Zählen: sort | uniq -c | sort -nr | head -1', "Lösung: grep \"^0[0-4]:\" stellprotokoll.log | awk '$3>100 {print $2}' | sort | uniq -c | sort -nr | head -1 → cat mitarbeiter/NAME.txt"],
      solve: (run) => run(`cat mitarbeiter/${run("grep \"^0[0-4]:\" stellprotokoll.log | awk '$3>100 {print $2}' | sort | uniq -c | sort -nr | head -1").trim().split(/\s+/)[1]}.txt`) },
  ],
});
// Prüfsumme nachträglich einsetzen (braucht den Dateiinhalt)
{
  const orig = W5.setup;
  W5.setup = (sh, F, solved) => {
    orig(sh, F, solved);
    const d = W5.dirOf(5);
    const files = Object.entries(sh.fs.get(`${d}/fahrplaene`).kids);
    const echt = files.find(([, n]) => n.data.startsWith('ECHTER'));
    sh.fs.put(`${d}/pruefsumme.txt`, `SHA-256 des echten Fahrplans:\n${shaSync(echt[1].data)}\n`);
  };
}
import { sha256hexSync as shaSync } from '../shell.js';

// ============================================================================ w6 – Die Bewerbung (Hacking leicht)
const K = 'karriere.kristall.sim', KIP = '10.77.0.10';
const W6 = makeLadder({
  id: 'w6', title: 'Die Bewerbung', level: 'L3', dir: 'bewerbung', prefix: 'runde', seed: 6161, minutes: 90,
  tools: ['curl', 'curl -I', 'robots.txt', 'base64', 'xxd -r -p', 'sha256sum', 'strings', 'Schleifen'],
  desc: 'Hacking-Leiter (leicht): Die (erfundene) Sicherheitsfirma Kristall Security stellt nur ein, wer ihren Bewerbungs-CTF knackt. Zehn Runden auf ihrer Karriereseite.',
  ziel: 'Webseiten wie ein Pentester lesen: Quelltext, versteckte Pfade, Header, Cookies, Skripte, Sicherungen, Konfigurationslecks.',
  intro: T('KRISTALL SECURITY – Bewerbungs-CTF (erfunden)', '',
    'Wir suchen Nachwuchs. Statt Lebenslauf: Zeig uns, dass du hinschaust.',
    `Unsere Karriereseite: http://${K}/  (nur hier in der Simulation erreichbar)`,
    'Jede Runde hat einen Code. Mit  entsperren CODE  geht es weiter.', '',
    'Erlaubt ist nur diese Seite. Im echten Leben gilt: nur mit Erlaubnis!', '', 'Start:  cd runde00', ''),
  finale: T('Herzlichen Glückwunsch – du bist eingestellt!', 'Du hast gezeigt: Webseiten verraten oft viel mehr, als sie anzeigen.', ''),
  nach: { beobachtung: 'Kommentare, robots.txt, Header, Cookies, JavaScript, .bak, .env, Prüfsummen, Metadaten, Sitemap.', schluss: 'Die meisten Funde im echten Pentest sind genau solche Kleinigkeiten.', grenzen: 'Simulation. Im Juice Shop findest du dasselbe in echt.', naechster: 'Operation Nebel – Hacking mittel.' },
  floors: [
    { t: 'Der Quelltext', pts: 5, body: 'Die Startseite sieht harmlos aus. Aber was steht im Quelltext?',
      build(c) {
        c.web(K, KIP, {
          '/': page('Kristall Security – Karriere', `<h1>Werde Teil des Teams!</h1>\n<!-- Notiz an Bewerber: Code ${c.code} – und schau dir auch /robots.txt an -->\n<p>Wir suchen Menschen, die genau hinsehen.</p>`),
        });
        c.put('hinweis.txt', `curl http://${K}/ zeigt den HTML-Quelltext. Kommentare stehen zwischen <!-- und -->.\n`);
      },
      hints: ['Im Browser siehst du nur die fertige Seite. Der Quelltext zeigt auch, was nicht angezeigt wird.', 'curl ADRESSE zeigt den Quelltext einer Webseite. Kommentare stehen zwischen <!-- und -->.', 'Lösung: curl http://karriere.kristall.sim/'],
      solve: (run) => run(`curl -s http://${K}/`) },
    { t: 'robots.txt', pts: 10, rep: 'Raum „Erste Zielmaschine“',
      body: 'Der Kommentar verriet: Schau in robots.txt.',
      build(c) {
        c.sh.web[`${KIP}:80`].routes['/robots.txt'] = { status: 200, headers: { 'Content-Type': 'text/plain' }, body: 'User-agent: *\nDisallow: /bewerber-intern/\n' };
        c.sh.web[`${KIP}:80`].routes['/bewerber-intern/'] = { status: 200, headers: {}, body: page('Intern', `<p>Hier sollte niemand sein. Code: ${c.code}</p>`) };
      },
      hints: ['robots.txt liegt immer direkt unter der Adresse: /robots.txt', 'Der Pfad hinter Disallow ist interessant.', 'Lösung: curl http://karriere.kristall.sim/robots.txt → curl http://karriere.kristall.sim/bewerber-intern/'],
      solve: (run) => run(`curl -s http://${K}/bewerber-intern/`) },
    { t: 'Der Header', pts: 10, body: 'Die Seite /start schickt mehr als nur HTML.',
      build(c) { c.sh.web[`${KIP}:80`].routes['/start'] = { status: 200, headers: { 'Content-Type': 'text/html', 'X-Bewerber-Code': c.code }, body: page('Start', '<p>Los gehts.</p>') }; },
      hints: ['curl -I zeigt nur die Kopfzeilen (Header) der Antwort.', 'Eigene Header beginnen oft mit X-.', 'Lösung: curl -I http://karriere.kristall.sim/start'],
      solve: (run) => run(`curl -s -I http://${K}/start`) },
    { t: 'Das Cookie', pts: 10, rep: 'Was die Webseite verrät',
      body: 'Die Anmeldeseite /login setzt ein Cookie.',
      build(c) { c.sh.web[`${KIP}:80`].routes['/login'] = { status: 200, headers: { 'Set-Cookie': `profil=${b64(JSON.stringify({ rolle: 'bewerber', code: c.code }))}; Path=/` }, body: page('Login', '<form>…</form>') }; },
      hints: ['curl -I http://karriere.kristall.sim/login zeigt Set-Cookie.', 'Der Wert hinter profil= ist Base64.', "Lösung: curl -I http://karriere.kristall.sim/login | grep Set-Cookie | cut -d= -f2 | cut -d';' -f1 | base64 -d"],
      solve: (run) => run(`curl -s -I http://${K}/login | grep Set-Cookie | cut -d= -f2 | cut -d';' -f1 | base64 -d`) },
    { t: 'Das Skript', pts: 15, body: 'Die Seite /bewerben lädt eine JavaScript-Datei. Entwickler vergessen gern Dinge darin.',
      build(c) {
        c.sh.web[`${KIP}:80`].routes['/bewerben'] = { status: 200, headers: {}, body: page('Bewerben', '<script src="/js/form.js"></script>') };
        c.sh.web[`${KIP}:80`].routes['/js/form.js'] = { status: 200, headers: { 'Content-Type': 'application/javascript' }, body: `// Formular\nconst api = "/api/v1";\n// TODO entfernen!\nconst testCode = "${hex(c.code)}";\n` };
      },
      hints: ['curl …/bewerben zeigt, welche Datei geladen wird.', 'In form.js steht ein Wert aus lauter 0–9 und a–f: Hex.', 'Lösung: curl http://karriere.kristall.sim/js/form.js | grep testCode | cut -d\'"\' -f2 | xxd -r -p'],
      solve: (run) => run(`curl -s http://${K}/js/form.js | grep testCode | cut -d'"' -f2 | xxd -r -p`) },
    { t: 'Die Sicherungskopie', pts: 10, body: 'Editoren und Admins hinterlassen gern Sicherungskopien mit der Endung .bak.',
      build(c) { c.sh.web[`${KIP}:80`].routes['/index.html.bak'] = { status: 200, headers: { 'Content-Type': 'text/plain' }, body: page('ALT', `<!-- alter Bewerber-Code: ${c.code} -->`) }; },
      hints: ['Die Startseite heißt intern index.html.', 'Hänge .bak an.', 'Lösung: curl http://karriere.kristall.sim/index.html.bak'],
      solve: (run) => run(`curl -s http://${K}/index.html.bak`) },
    { t: 'Die Konfiguration', pts: 15, body: 'Viele Webanwendungen speichern Geheimnisse in einer Datei namens .env. Die gehört nie ins Web.',
      build(c) { c.sh.web[`${KIP}:80`].routes['/.env'] = { status: 200, headers: { 'Content-Type': 'text/plain' }, body: `APP_ENV=production\nDB_HOST=db.intern\nAPP_SECRET=${c.code}\n` }; },
      hints: ['Dateien mit Punkt am Anfang sind auch im Web „versteckt“ – aber nur, wenn der Server sie wirklich sperrt.', 'Die Datei liegt direkt unter der Adresse: /.env', 'Lösung: curl http://karriere.kristall.sim/.env'],
      solve: (run) => run(`curl -s http://${K}/.env`) },
    { t: 'Das Kennwort-Wort', pts: 20, body: 'In wort.sha256 steht die Prüfsumme eines Wortes aus woerter.txt. Dieses Wort ist ein Pfad auf der Seite.',
      build(c) {
        const ws = ['bernstein', 'quarz', 'achat', 'onyx', 'opal', 'jaspis', 'topas', 'saphir', 'rubin', 'beryll', 'zirkon', 'granat', 'malachit', 'citrin', 'amethyst', 'turmalin', 'spinell', 'peridot', 'aquamarin', 'jade'];
        const w = c.pick(ws);
        c.put('woerter.txt', ws.join('\n') + '\n'); c.target = w;
        c.sh.web[`${KIP}:80`].routes[`/raum/${w}`] = { status: 200, headers: {}, body: page('Raum', `<p>Richtiges Wort. Code: ${c.code}</p>`) };
        c.put('wort.sha256', `__WORT__${w}\n`);
      },
      hints: ['echo -n WORT | sha256sum berechnet die Prüfsumme eines Wortes (-n: ohne Zeilenumbruch).', 'Für jedes Wort: for w in $(cat woerter.txt); do echo "$(echo -n $w | sha256sum) $w"; done', 'Mit grep $(cat wort.sha256) findest du die passende Zeile.', 'Lösung: for w in $(cat woerter.txt); do echo "$(echo -n $w | sha256sum) $w"; done | grep $(cat wort.sha256) → curl http://karriere.kristall.sim/raum/WORT'],
      solve: (run) => run(`curl -s http://${K}/raum/${run('for w in $(cat woerter.txt); do echo "$(echo -n $w | sha256sum) $w"; done | grep $(cat wort.sha256)').trim().split(/\s+/).pop()}`) },
    { t: 'Das Bewerbungsfoto', pts: 15, rep: 'Stellwerk Posten 6 (strings)',
      body: 'Im Foto eines früheren Bewerbers stecken Metadaten (ein Kommentar).',
      build(c) { c.put('bewerbungsfoto.jpg', '\u00ff\u00d8\u00ff\u00e0' + binNoise(c.R, 200) + 'Exif' + binNoise(c.R, 40) + `Comment: ${c.code}` + binNoise(c.R, 400)); },
      hints: ['Bilder enthalten neben den Pixeln oft lesbare Zusatzinfos.', 'strings zeigt lesbaren Text, grep -i comment filtert.', 'Lösung: strings bewerbungsfoto.jpg | grep -i comment'],
      solve: (run) => run('strings bewerbungsfoto.jpg | grep -i comment') },
    { t: 'Die Sitemap', pts: 25, rep: 'Kollektiv (Schleifen)',
      body: 'Die Sitemap listet 25 Seiten. Nur eine davon existiert noch – die letzte Aufgabe.',
      build(c) {
        const ps = Array.from({ length: 25 }, (_, i) => `/seite-${noise(c.R, 6)}-${i}`);
        const live = c.pick(ps);
        c.sh.web[`${KIP}:80`].routes['/sitemap.xml'] = { status: 200, headers: { 'Content-Type': 'application/xml' }, body: `<?xml version="1.0"?>\n<urlset>\n${ps.map(x => `  <url><loc>http://${K}${x}</loc></url>`).join('\n')}\n</urlset>\n` };
        c.sh.web[`${KIP}:80`].routes[live] = { status: 200, headers: {}, body: page('Finale', `<p>Letzte Runde geschafft. Code: ${c.code}</p>`) };
      },
      hints: ['curl …/sitemap.xml zeigt alle Adressen. grep -o "/seite-[^<]*" schneidet die Pfade heraus.', 'Für jeden Pfad prüfen: curl -s -I http://karriere.kristall.sim$p | head -1', 'In einer Schleife und mit grep 200 filtern.', 'Lösung: for p in $(curl -s http://karriere.kristall.sim/sitemap.xml | grep -o "/seite-[^<]*"); do echo "$p $(curl -s -I http://karriere.kristall.sim$p | head -1)"; done | grep 200 → curl auf den Pfad'],
      solve: (run) => run(`curl -s http://${K}${run(`for p in $(curl -s http://${K}/sitemap.xml | grep -o "/seite-[^<]*"); do echo "$p $(curl -s -I http://${K}$p | head -1)"; done | grep 200`).trim().split(' ')[0]}`) },
  ],
});
{
  const orig = W6.setup;
  W6.setup = (sh, F, solved) => {
    orig(sh, F, solved);
    const f = `${W6.dirOf(7)}/wort.sha256`;
    const w = sh.read(f).replace('__WORT__', '').trim();
    sh.fs.put(f, shaSync(w) + '\n');
  };
}

// ============================================================================ w7 – Operation Nebel (Hacking mittel)
const NEB = { dev: ['dev.nebelwerk.sim', '10.88.0.20'], api: ['api.nebelwerk.sim', '10.88.0.30'], portal: ['portal.nebelwerk.sim', '10.88.0.40'], bericht: ['bericht.nebelwerk.sim', '10.88.0.50'] };
const W7 = makeLadder({
  id: 'w7', title: 'Operation Nebel', level: 'L3', dir: 'nebel', prefix: 'phase', seed: 7171, minutes: 120,
  tools: ['Zonendatei', 'Verzeichnissuche', 'JWT', 'JSON/API', 'Git-Verlauf', 'diff', 'Kodierungsketten', 'Mitschnitte', 'Logs'],
  desc: 'Hacking-Leiter (mittel): Ein autorisierter Pentest bei der (erfundenen) Nebelwerk GmbH. Zehn Phasen von der Aufklärung bis zum Bericht.',
  ziel: 'Methodische Aufklärung: Hosts finden, Pfade suchen, Tokens und APIs lesen, Lecks in Git und Konfiguration, Mitschnitte und Logs auswerten.',
  intro: T('AUFTRAG – Nebelwerk GmbH (erfunden)', '', 'Erlaubt: Aufklärung aller Hosts unter *.nebelwerk.sim, Lesen von Daten, die die Firma selbst preisgibt.',
    'NICHT erlaubt: Passwörter raten, Daten verändern, andere Ziele.', '', 'Die Firma hat dir ein paar Unterlagen gegeben (in den Phasen-Ordnern).',
    'Jede Phase hat einen Code – mit  entsperren CODE  geht es weiter.', '', 'Start:  cd phase00', ''),
  finale: T('Bericht abgegeben. Nebelwerk schließt jetzt: offene Sicherungen, Tokens mit Geheimnissen, alte Git-Einträge,', 'unverschlüsselte Logins und eine vergessene Wartungsseite. Gute Arbeit!', ''),
  nach: { beobachtung: 'Zonendatei, Pfadsuche, JWT, API, Git, Konfig-Diff, Kodierungskette, Mitschnitt, Log-Korrelation.', schluss: 'Aufklärung ist der wichtigste Teil eines Pentests – und meistens der längste.', grenzen: 'Simulation mit erfundenen Hosts.', naechster: 'Das Phantom – Hacking schwer.' },
  floors: [
    { t: 'Die Zonendatei', pts: 10, body: 'Nebelwerk hat dir seine DNS-Zonendatei gegeben. Ein TXT-Eintrag enthält etwas Codiertes.',
      build(c) {
        const rec = [];
        for (let i = 0; i < 25; i++) rec.push(`${c.pick(['www', 'mail', 'vpn', 'cdn', 'shop', 'kb', 'ns1', 'ns2', 'git', 'ci'])}${i}.nebelwerk.sim.  3600 IN A 10.88.${Math.floor(c.R() * 9)}.${Math.floor(c.R() * 250)}`);
        rec.splice(12, 0, `_verify.nebelwerk.sim.  3600 IN TXT "${b64(`Pentest-Code: ${c.code}`)}"`);
        rec.splice(5, 0, '_spf.nebelwerk.sim.  3600 IN TXT "v=spf1 -all"');
        Object.values(NEB).forEach(([n, ip]) => rec.push(`${n}.  3600 IN A ${ip}`));
        c.put('zone.txt', rec.join('\n') + '\n');
      },
      hints: ['grep TXT zone.txt zeigt die Text-Einträge.', 'Der Wert in Anführungszeichen beim _verify-Eintrag ist Base64.', 'Lösung: grep _verify zone.txt | cut -d\'"\' -f2 | base64 -d'],
      solve: (run) => run('grep _verify zone.txt | cut -d\'"\' -f2 | base64 -d') },
    { t: 'Die Pfadsuche', pts: 15, rep: 'Bewerbung Runde 9',
      body: 'Auf dev.nebelwerk.sim gibt es ein Verzeichnis, das nirgends verlinkt ist. woerter.txt ist eine kleine Wortliste.',
      build(c) {
        const ws = ['admin', 'test', 'old', 'backup', 'staging', 'temp', 'files', 'upload', 'private', 'docs', 'api', 'assets', 'build', 'release', 'archiv', 'intern', 'cache', 'logs', 'data', 'export'];
        const hit = 'release';
        c.put('woerter.txt', ws.join('\n') + '\n');
        c.web(...NEB.dev, { '/': page('Dev', '<p>Entwicklungsserver</p>'), [`/${hit}/`]: page('Index of /release/', '<a href="notizen.txt">notizen.txt</a>'), [`/${hit}/notizen.txt`]: { status: 200, headers: { 'Content-Type': 'text/plain' }, body: `Release-Notizen (intern)\nCode: ${c.code}\n` } });
      },
      hints: ['Für jedes Wort prüfen, ob /WORT/ existiert: curl -s -I http://dev.nebelwerk.sim/WORT/ | head -1', 'In einer Schleife: for w in $(cat woerter.txt); do …; done – mit grep -q 200 && echo $w', 'Lösung: for w in $(cat woerter.txt); do curl -s -I http://dev.nebelwerk.sim/$w/ | head -1 | grep -q 200 && echo $w; done → curl http://dev.nebelwerk.sim/release/ → notizen.txt'],
      solve: (run) => { const w = run('for w in $(cat woerter.txt); do curl -s -I http://dev.nebelwerk.sim/$w/ | head -1 | grep -q 200 && echo $w; done').trim(); return run(`curl -s http://dev.nebelwerk.sim/${w}/notizen.txt`); } },
    { t: 'Das Token', pts: 15, body: 'In den Release-Notizen lag ein Anmelde-Token (JWT). JWTs sind nicht verschlüsselt – nur codiert.',
      build(c) {
        const jwt = `${b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${b64url(JSON.stringify({ sub: 'dev-ci', rolle: 'deploy', notiz: c.code }))}.${b64url(noise(c.R, 32))}`;
        c.put('token.txt', jwt + '\n');
        c.put('hinweis.txt', 'Ein JWT hat drei Teile, getrennt durch Punkte: Kopf.Inhalt.Signatur. Der mittlere Teil ist Base64url (- und _ statt + und /).\n');
      },
      hints: ['cut -d. -f2 token.txt gibt den mittleren Teil.', "Base64url → Base64: tr '_-' '/+'", "Lösung: cut -d. -f2 token.txt | tr '_-' '/+' | base64 -d"],
      solve: (run) => run("cut -d. -f2 token.txt | tr '_-' '/+' | base64 -d") },
    { t: 'Die gesprächige API', pts: 15, rep: 'Was die Webseite verrät (API)',
      body: 'http://api.nebelwerk.sim/v1/mitarbeiter liefert mehr Felder, als die Webseite anzeigt.',
      build(c) {
        const ma = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, name: c.pick(['Ada', 'Ben', 'Cem', 'Dana', 'Eli', 'Fe']) + ' ' + c.pick(['Ruhr', 'Moos', 'Lind', 'Stein']), abteilung: c.pick(['IT', 'Vertrieb', 'Lager']) }));
        ma[5].notiz_intern = hex(`Code: ${c.code}`);
        c.web(...NEB.api, { '/v1/mitarbeiter': { status: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ma, null, 1) + '\n' } }, 'gunicorn');
      },
      hints: ['curl http://api.nebelwerk.sim/v1/mitarbeiter zeigt die JSON-Antwort.', 'Ein Datensatz hat ein internes Feld mit Hex-Werten.', 'Lösung: curl http://api.nebelwerk.sim/v1/mitarbeiter | grep notiz_intern | cut -d\'"\' -f4 | xxd -r -p'],
      solve: (run) => run(`curl -s http://api.nebelwerk.sim/v1/mitarbeiter | grep notiz_intern | cut -d'"' -f4 | xxd -r -p`) },
    { t: 'Git vergisst nichts', pts: 15, rep: 'Kellerserver (Git)',
      body: 'Nebelwerk hat dir einen Auszug aus „git log -p“ gegeben. Ein Passwort wurde „entfernt“.',
      build(c) {
        const l = [];
        for (let i = 0; i < 6; i++) l.push(`commit ${noise(c.R, 40)}`, `Author: Dev <dev@nebelwerk.sim>`, `Date:   2026-10-${p2(10 + i)}`, '', `    Änderung ${i}`, '', `diff --git a/app.cfg b/app.cfg`, `@@ -1,3 +1,3 @@`, ` port=8080`, `-version=${i}`, `+version=${i + 1}`, '');
        l.splice(30, 0, `commit ${noise(c.R, 40)}`, 'Author: Dev <dev@nebelwerk.sim>', 'Date:   2026-10-14', '', '    Passwort aus Konfiguration entfernt', '', 'diff --git a/deploy.cfg b/deploy.cfg', '@@ -2,1 +2,1 @@', `-deploy_passwort=${c.code}`, '+deploy_passwort=', '');
        c.put('git-log.txt', l.join('\n') + '\n');
      },
      hints: ['Im Git-Verlauf bedeutet - eine entfernte Zeile, + eine hinzugefügte.', 'grep "^-.*passwort" git-log.txt', 'Lösung: grep "^-.*passwort" git-log.txt'],
      solve: (run) => run('grep "^-.*passwort" git-log.txt') },
    { t: 'Die vergessene Wartungsseite', pts: 15, rep: 'Stellwerk Posten 3 (diff)',
      body: 'Zwei Versionen der Webserver-Konfiguration. In der neuen ist ein Bereich dazugekommen – öffentlich erreichbar.',
      build(c) {
        const base = Array.from({ length: 40 }, (_, i) => `    location /seite${i} { root /var/www; }`);
        const alt = ['server {', '    listen 80;', ...base, '}'];
        const path = `/wartung-${noise(c.R, 6)}`;
        const neu = [...alt]; neu.splice(20, 0, `    location ${path} { allow all; }`);
        c.put('nginx-alt.conf', alt.join('\n') + '\n'); c.put('nginx-neu.conf', neu.join('\n') + '\n');
        c.web(...NEB.portal, { '/': page('Portal', '<p>Kundenportal</p>'), [path]: page('Wartung', `<p>Wartungsmodus. Code: ${c.code}</p>`) });
      },
      hints: ['diff nginx-alt.conf nginx-neu.conf zeigt die neue Zeile.', 'Der Pfad hinter location ist auf portal.nebelwerk.sim erreichbar.', 'Lösung: diff nginx-alt.conf nginx-neu.conf → curl http://portal.nebelwerk.sim/wartung-…'],
      solve: (run) => run(`curl -s http://portal.nebelwerk.sim${run('diff nginx-alt.conf nginx-neu.conf').match(/location (\S+)/)[1]}`) },
    { t: 'Die Kette', pts: 20, rep: 'Funkturm (base64, ROT13, Hex)',
      body: 'Eine Nachricht, dreifach verpackt: erst Hex, dann ROT13, dann Base64. Pack sie in umgekehrter Reihenfolge aus.',
      build(c) { c.put('nachricht.txt', b64(rot13(hex(`Kette geknackt. Code: ${c.code}`))) + '\n'); },
      hints: ['Außen ist Base64: base64 -d', "Dann ROT13 rückgängig: tr 'A-Za-z' 'N-ZA-Mn-za-m'", 'Zum Schluss Hex: xxd -r -p', "Lösung: base64 -d nachricht.txt | tr 'A-Za-z' 'N-ZA-Mn-za-m' | xxd -r -p"],
      solve: (run) => run("base64 -d nachricht.txt | tr 'A-Za-z' 'N-ZA-Mn-za-m' | xxd -r -p") },
    { t: 'Der Mitschnitt', pts: 20,
      body: 'Ein Mitschnitt aus dem internen Netz (Textform). Ein Dienst meldet sich per HTTP mit „Basic“-Anmeldung an – die ist nur Base64, nicht verschlüsselt.',
      build(c) {
        const l = [];
        for (let i = 0; i < 12; i++) l.push(`12:0${i % 10}:${p2(i * 4)} IP 10.88.0.${60 + i}.${40000 + i} > 10.88.0.40.80: GET /status HTTP/1.1`, 'Host: portal.nebelwerk.sim', 'User-Agent: monitor/1.0', '');
        l.splice(20, 0, '12:04:41 IP 10.88.0.77.51234 > 10.88.0.40.80: GET /intern HTTP/1.1', 'Host: portal.nebelwerk.sim', `Authorization: Basic ${b64(`svc-backup:${c.code}`)}`, '');
        c.put('mitschnitt.txt', l.join('\n') + '\n');
      },
      hints: ['grep Authorization mitschnitt.txt', 'Nach „Basic “ folgt Base64 von BENUTZER:PASSWORT.', "Lösung: grep Authorization mitschnitt.txt | cut -d' ' -f3 | base64 -d"],
      solve: (run) => run("grep Authorization mitschnitt.txt | cut -d' ' -f3 | base64 -d") },
    { t: 'Wer kam rein?', pts: 20, rep: 'Die Nacht im Kollektiv',
      body: 'Im Zugriffslog versucht eine IP viele Male /admin (401) – und bekommt am Ende 200.',
      build(c) {
        const l = [];
        for (let i = 0; i < 80; i++) l.push(`10.88.1.${Math.floor(c.R() * 50)} "GET /${c.pick(['', 'shop', 'kontakt', 'admin'])} HTTP/1.1" ${c.R() < 0.2 ? 401 : 200}`.replace('/admin HTTP/1.1" 200', '/admin HTTP/1.1" 401'));
        for (let i = 0; i < 12; i++) l.push('10.88.9.66 "GET /admin HTTP/1.1" 401');
        l.push('10.88.9.66 "GET /admin HTTP/1.1" 200');
        c.put('zugriffe.log', l.join('\n') + '\n');
        c.put(`ips/10.88.9.66.txt`, `Diese IP kam in den Adminbereich. Code: ${c.code}\n`);
        for (let i = 0; i < 6; i++) c.put(`ips/10.88.1.${i}.txt`, 'Normaler Besucher.\n');
      },
      hints: ['grep "/admin" zugriffe.log | grep " 200" findet erfolgreiche Admin-Zugriffe.', 'Die IP steht am Zeilenanfang: cut -d\' \' -f1', 'Lösung: grep "/admin" zugriffe.log | grep " 200" → cat ips/IP.txt'],
      solve: (run) => run(`cat ips/${run('grep "/admin" zugriffe.log | grep " 200"').trim().split(' ')[0]}.txt`) },
    { t: 'Der Abschlussbericht', pts: 25, rep: 'Bewerbung (robots, .bak)',
      body: 'Der Bericht-Server bericht.nebelwerk.sim versteckt die Musterlösung des Kunden. Alles, was du gelernt hast.',
      build(c) {
        c.web(...NEB.bericht, {
          '/': page('Berichte', '<p>Nur intern.</p>'),
          '/robots.txt': { status: 200, headers: { 'Content-Type': 'text/plain' }, body: 'User-agent: *\nDisallow: /entwurf/\n' },
          '/entwurf/': page('Index of /entwurf/', '<a href="bericht.txt">bericht.txt</a>'),
          '/entwurf/bericht.txt': { status: 404, headers: {}, body: 'Not found\n' },
          '/entwurf/bericht.txt.bak': { status: 200, headers: { 'Content-Type': 'text/plain' }, body: `Entwurf (alt)\nanhang=${b64(hex(`Code: ${c.code}`))}\n` },
        });
      },
      hints: ['Fang mit robots.txt an.', 'bericht.txt gibt 404 – aber vielleicht gibt es eine Sicherungskopie (.bak).', 'Der Anhang ist Base64, darin steckt Hex.', 'Lösung: curl http://bericht.nebelwerk.sim/entwurf/bericht.txt.bak | grep anhang | cut -d= -f2 | base64 -d | xxd -r -p'],
      solve: (run) => run('curl -s http://bericht.nebelwerk.sim/entwurf/bericht.txt.bak | grep anhang | cut -d= -f2 | base64 -d | xxd -r -p') },
  ],
});

// ============================================================================ w8 – Der Tresorraum (Linux schwer)
const W8 = makeLadder({
  id: 'w8', title: 'Der Tresorraum', level: 'L5', dir: 'tresorraum', prefix: 'kammer', seed: 8181, minutes: 150,
  tools: ['find (mehrere Bedingungen)', 'awk NF', 'Quoting', 'export', '$((…))', 'sort + diff', 'while read', 'grep -o', 'eigene Skripte'],
  desc: 'Linux-Leiter (schwer): Die Talheimer Sparkasse (erfunden) baut ihren alten Tresorraum-Server ab. Zehn Kammern – jede braucht saubere, durchdachte Befehle.',
  ziel: 'Linux auf hohem Niveau: mehrere Bedingungen, Quoting, Umgebungsvariablen, Rechnen, Listen vergleichen, Datensätze verknüpfen, eigene Skripte.',
  intro: T('TRESORRAUM DER TALHEIMER SPARKASSE (erfunden)', '', 'Der alte Server wird abgeschaltet. Vorher muss jemand die zehn Kammern prüfen.',
    'Hier gibt es kaum Hinweise in den Ordnern – die Aufgaben stehen in der App.', 'Codes wie immer mit  entsperren CODE.', '', 'Start:  cd kammer00', ''),
  finale: T('Alle Kammern geprüft. Der Server darf in Rente.', 'Was du hier geschafft hast, bringt dich in jeder Linux-Umgebung weiter.', ''),
  nach: { beobachtung: 'Kombinierte Suchen, Feldanzahl, Quoting, Umgebung, Rechnen, Listenvergleiche, Verknüpfungen, Regex-Zählung, eigene Skripte.', schluss: 'Du schreibst jetzt Einzeiler, für die andere ein Programm bräuchten.', grenzen: 'Simulation einer Bash.', naechster: 'Das Phantom – Hacking schwer.' },
  floors: [
    { t: 'Drei Bedingungen', pts: 15, rep: 'Funkturm Etage 4 + 13',
      body: 'Im Archiv: genau EINE Datei endet auf .dat, ist größer als 2 KB (+2k) UND hat die Rechte 640.',
      build(c) {
        const hit = Math.floor(c.R() * 80);
        for (let i = 0; i < 80; i++) {
          const ext = i === hit || i % 3 === 0 ? 'dat' : c.pick(['txt', 'log', 'bak']);
          const big = i === hit || i % 4 === 0; const perm = i === hit || i % 5 === 0 ? 0o640 : 0o644;
          const ok = i === hit || !(ext === 'dat' && big && perm === 0o640);
          const content = (i === hit ? `Code: ${c.code}\n` : 'Daten\n') + 'x'.repeat(big ? 2500 : 300);
          c.put(`archiv/${c.pick(['a', 'b', 'c'])}/${c.pick(['1', '2'])}/f${p2(i)}.${ext}`, ok ? content : 'Daten\n' + 'x'.repeat(300), perm);
        }
      },
      hints: ['find kann mehrere Bedingungen hintereinander – alle müssen zutreffen.', 'find archiv -name "*.dat" -size +2k -perm 640', 'Lösung: cat $(find archiv -name "*.dat" -size +2k -perm 640) | head -1'],
      solve: (run) => run('cat $(find archiv -name "*.dat" -size +2k -perm 640) | head -1') },
    { t: 'Der Datensatz mit sieben Feldern', pts: 15, rep: 'Kollektiv Stufe 4 (awk)',
      body: 'datensaetze.txt: Jede Zeile hat eine andere Anzahl Wörter. Genau eine hat sieben.',
      build(c) {
        const l = Array.from({ length: 200 }, () => { let n = 2 + Math.floor(c.R() * 10); if (n === 7) n = 8; return Array.from({ length: n }, () => noise(c.R, 4)).join(' '); });
        l[Math.floor(c.R() * 200)] = `kammer eins zwei drei vier code ${c.code}`;
        c.put('datensaetze.txt', l.join('\n') + '\n');
      },
      hints: ['awk kennt NF: die Anzahl der Felder einer Zeile.', "awk 'NF==7' DATEI zeigt nur Zeilen mit genau 7 Feldern.", "Lösung: awk 'NF==7' datensaetze.txt"],
      solve: (run) => run("awk 'NF==7' datensaetze.txt") },
    { t: 'Akten mit Leerzeichen', pts: 20, rep: 'Funkturm Etage 0 + 15',
      body: 'liste.txt nennt 30 Akten – mit Leerzeichen im Namen. Nur eine existiert in akten/. Ohne richtiges Quoting klappt es nicht.',
      build(c) {
        const names = Array.from({ length: 30 }, (_, i) => `Akte ${c.pick(['Meier', 'Schulz', 'Kaya', 'Ott'])} ${i}`);
        const hit = c.pick(names);
        c.put('liste.txt', names.join('\n') + '\n'); c.put(`akten/${hit}`, `Gefunden. Code: ${c.code}\n`);
        for (let i = 0; i < 5; i++) c.put(`akten/Akte Alt ${i}`, 'alt\n');
      },
      hints: ['while read f; do …; done < liste.txt liest jede Zeile.', 'Ohne Anführungszeichen wird "Akte Ott 3" zu drei Wörtern. Schreib "akten/$f".', 'Lösung: while read f; do [ -f "akten/$f" ] && cat "akten/$f"; done < liste.txt'],
      solve: (run) => { const bad = run('while read f; do [ -f akten/$f ] && cat akten/$f; done < liste.txt'); if (code(bad)) throw new Error('ohne Quoting lösbar'); return run('while read f; do [ -f "akten/$f" ] && cat "akten/$f"; done < liste.txt'); } },
    { t: 'Die Umgebung', pts: 15,
      body: 'Das Skript tresor.sh öffnet nur, wenn eine Umgebungsvariable richtig gesetzt ist. Welche, steht im Skript.',
      build(c) { c.put('tresor.sh', T('#!/bin/bash', 'if [ "$TRESOR_MODUS" != "nachtschicht" ]; then', '  echo "Falscher Modus: \'$TRESOR_MODUS\'"', '  exit', 'fi', `echo "Geöffnet. $(echo ${b64(`Code: ${c.code}`)} | base64 -d)"`, ''), 0o755); },
      hints: ['cat tresor.sh – welche Variable wird geprüft, welcher Wert erwartet?', 'export NAME=WERT setzt eine Variable für alle folgenden Befehle.', 'Lösung: export TRESOR_MODUS=nachtschicht; ./tresor.sh'],
      solve: (run) => run('export TRESOR_MODUS=nachtschicht; ./tresor.sh') },
    { t: 'Die Kombination', pts: 20,
      body: 'Kombination = (Zeilen in a.log) × (Wörter in b.log). Die Datei schloss/KOMBINATION.txt enthält den Code.',
      build(c) {
        const a = 20 + Math.floor(c.R() * 30), w = 10 + Math.floor(c.R() * 20);
        c.put('a.log', Array.from({ length: a }, () => noise(c.R, 8)).join('\n') + '\n');
        c.put('b.log', Array.from({ length: w }, () => noise(c.R, 5)).join(' ') + '\n');
        for (let v = a * w - 30; v <= a * w + 30; v += 3) if (v !== a * w) c.put(`schloss/${v}.txt`, 'Falsch.\n');
        c.put(`schloss/${a * w}.txt`, `Kombination richtig. Code: ${c.code}\n`);
      },
      hints: ['wc -l zählt Zeilen, wc -w Wörter. Mit cat DATEI | wc -l bekommst du nur die Zahl.', 'Rechnen: echo $(( A * B ))', 'Lösung: cat schloss/$(( $(cat a.log | wc -l) * $(cat b.log | wc -w) )).txt'],
      solve: (run) => run('cat schloss/$(( $(cat a.log | wc -l) * $(cat b.log | wc -w) )).txt') },
    { t: 'Wer ist gegangen?', pts: 20, rep: 'Stellwerk Posten 3 (diff)',
      body: 'Zwei Personallisten in zufälliger Reihenfolge. Genau eine Person steht nur in der alten Liste.',
      build(c) {
        const ns = Array.from({ length: 50 }, (_, i) => `${c.pick(['anna', 'bert', 'can', 'dora', 'emil', 'frida', 'gul', 'hans'])}-${i}`);
        const weg = c.pick(ns);
        const sh = (a) => [...a].sort(() => c.R() - 0.5);
        c.put('personal-alt.txt', sh(ns).join('\n') + '\n'); c.put('personal-neu.txt', sh(ns.filter(x => x !== weg)).join('\n') + '\n');
        for (const n of ns.slice(0, 8)) c.put(`spinde/${n}.txt`, 'leer\n');
        c.put(`spinde/${weg}.txt`, `Ausgeräumt vergessen. Code: ${c.code}\n`);
      },
      hints: ['diff vergleicht Zeile für Zeile – unsortiert hilft das nicht. Erst sortieren: sort DATEI > DATEI2', 'diff alt-sortiert neu-sortiert | grep "^<" zeigt, was nur in der alten steht.', 'Lösung: sort personal-alt.txt > a.txt; sort personal-neu.txt > n.txt; diff a.txt n.txt | grep "^<" → cat spinde/NAME.txt'],
      solve: (run) => { run('sort personal-alt.txt > a.txt; sort personal-neu.txt > n.txt'); return run(`cat spinde/${run('diff a.txt n.txt | grep "^<"').trim().slice(2)}.txt`); } },
    { t: 'Zwei Listen verknüpfen', pts: 25, rep: 'Kollektiv Stufe 6 (while read)',
      body: 'konten-a.csv und konten-b.csv (ID;STATUS). Gesucht: die ID, die in A „OFFEN“ und in B „AKTIV“ ist.',
      build(c) {
        const a = [], b = []; const hit = 300 + Math.floor(c.R() * 100);
        for (let id = 300; id < 400; id++) {
          a.push(`${id};${id === hit ? 'OFFEN' : c.R() < 0.3 ? 'OFFEN' : 'ZU'}`);
          const inA = a[a.length - 1].endsWith('OFFEN');
          b.push(`${id};${id === hit ? 'AKTIV' : inA ? 'GESPERRT' : c.pick(['AKTIV', 'GESPERRT'])}`);
        }
        c.put('konten-a.csv', a.join('\n') + '\n'); c.put('konten-b.csv', b.join('\n') + '\n');
        c.put(`konten/${hit}.txt`, `Das ist das Konto. Code: ${c.code}\n`);
      },
      hints: ['Erst alle OFFEN-IDs aus A: grep OFFEN konten-a.csv | cut -d";" -f1', 'Für jede davon in B nachsehen: grep -q "^ID;AKTIV" konten-b.csv', 'Lösung: for id in $(grep OFFEN konten-a.csv | cut -d";" -f1); do grep -q "^$id;AKTIV" konten-b.csv && echo $id; done → cat konten/ID.txt'],
      solve: (run) => run(`cat konten/${run('for id in $(grep OFFEN konten-a.csv | cut -d";" -f1); do grep -q "^$id;AKTIV" konten-b.csv && echo $id; done').trim()}.txt`) },
    { t: 'Die häufigste Kennung', pts: 20,
      body: 'Ein Bericht voller Fließtext. Darin tauchen Kennungen wie TR-1234 auf. Welche am häufigsten?',
      build(c) {
        const ids = Array.from({ length: 12 }, () => `TR-${1000 + Math.floor(c.R() * 8999)}`); const top = ids[3];
        const t = [];
        for (let i = 0; i < 120; i++) t.push(`Im Abschnitt ${i} wurde ${c.pick(ids)} geprüft, außerdem ${c.R() < 0.5 ? top : c.pick(ids)} und ${noise(c.R, 5)}.`);
        c.put('bericht.txt', t.join('\n') + '\n');
        for (const id of ids) c.put(`kaesten/${id}.txt`, id === top ? `Meistgeprüfter Kasten. Code: ${c.code}\n` : 'normal\n');
      },
      hints: ['grep -o gibt nur den passenden Teil aus – jeden Treffer in einer eigenen Zeile.', 'Muster: "TR-[0-9]\\+" (eine oder mehr Ziffern).', 'Lösung: grep -o "TR-[0-9]\\+" bericht.txt | sort | uniq -c | sort -nr | head -1 → cat kaesten/ID.txt'],
      solve: (run) => run(`cat kaesten/${run('grep -o "TR-[0-9]\\+" bericht.txt | sort | uniq -c | sort -nr | head -1').trim().split(/\s+/)[1]}.txt`) },
    { t: 'Summe genau 1000', pts: 25, rep: 'Funkturm Etage 14',
      body: 'Unter reihen/ liegen 20 Dateien voller Zahlen. Genau eine ergibt in Summe 1000. Ihr Name ist der Schlüssel zu codes/NAME.',
      build(c) {
        const hit = Math.floor(c.R() * 20);
        for (let i = 0; i < 20; i++) {
          const nums = []; let s = 0;
          if (i === hit) { while (s < 900) { const v = 1 + Math.floor(c.R() * 50); nums.push(v); s += v; } nums.push(1000 - s); }
          else { const n = 20 + Math.floor(c.R() * 20); for (let k = 0; k < n; k++) nums.push(1 + Math.floor(c.R() * 99)); if (nums.reduce((a, b) => a + b, 0) === 1000) nums.push(1); }
          c.put(`reihen/r${p2(i)}`, nums.join('\n') + '\n');
          c.put(`codes/r${p2(i)}`, i === hit ? `Code: ${c.code}\n` : 'nein\n');
        }
      },
      hints: ["Summe einer Datei: awk '{s+=$1} END {print s}' DATEI", 'Für alle: for f in reihen/*; do echo "$(awk \'{s+=$1} END {print s}\' $f) $f"; done', 'Mit grep "^1000 " die richtige finden. Den Namen ohne Ordner liefert basename.', 'Lösung: for f in reihen/*; do echo "$(awk \'{s+=$1} END {print s}\' $f) $f"; done | grep "^1000 " → cat codes/rNN'],
      solve: (run) => run(`cat codes/${run('for f in reihen/*; do echo "$(awk \'{s+=$1} END {print s}\' $f) $(basename $f)"; done | grep "^1000 "').trim().split(' ')[1]}`) },
    { t: 'Die letzte Kammer', pts: 30, rep: 'Alles',
      body: 'Unter tief/ gibt es viele Dateien mit Rechten 600. Nur EINE davon ist kleiner als 1024 Bytes UND enthält das Wort TRESOR.',
      build(c) {
        for (let i = 0; i < 60; i++) {
          const hit = i === 42, small = i % 2 === 0, perm = i % 4 === 1 ? 0o644 : 0o600;
          // TRESOR steht nur in großen oder in 644-Dateien – und in der einen richtigen
          const word = hit || ((!small || perm === 0o644) && i % 3 === 0);
          const body = hit ? `TRESOR geöffnet. Code: ${c.code}\n` : `${word ? 'TRESOR ' : ''}Inhalt ${'z'.repeat(small ? 100 : 1500)}\n`;
          c.put(`tief/${c.pick(['x', 'y', 'z'])}/${c.pick(['1', '2', '3'])}/d${p2(i)}`, body, perm);
        }
      },
      hints: ['Vorsicht, Falle: find -size -1k rundet auf ganze Kilobyte auf und findet nur LEERE Dateien. Genau ist -size -1024c (c = Bytes).', 'find tief -type f -perm 600 -size -1024c findet die kleinen 600er-Dateien.', 'Ausgabe von find in eine Schleife geben: find … | while read f; do grep -l TRESOR "$f"; done', 'Lösung: find tief -type f -perm 600 -size -1024c | while read f; do grep -l TRESOR "$f"; done → cat auf den Pfad'],
      solve: (run) => run(`cat ${run('find tief -type f -perm 600 -size -1024c | while read f; do grep -l TRESOR "$f"; done').trim()}`) },
  ],
});

// ============================================================================ w9 – Das Phantom (Hacking schwer)
const PH = ['phantom-dev.sim', '10.99.0.13'];
const W9 = makeLadder({
  id: 'w9', title: 'Das Phantom', level: 'L9', dir: 'phantom', prefix: 'spur', seed: 9191, minutes: 150,
  tools: ['Base64url', 'Hex', 'JWT', 'Mitschnitte', 'md5sum', 'uniq -d', 'xor', 'Akrostichon', 'Mehrfach-Kodierung'],
  desc: 'Hacking-Leiter (schwer): Ein Unbekannter – „das Phantom“ – hinterlässt in Talheim digitale Rätsel. Zehn Spuren, jede baut auf der vorigen auf.',
  ziel: 'CTF auf hohem Niveau: Spuren über mehrere Quellen verfolgen, Kodierungen erkennen und kombinieren, Daten korrelieren.',
  intro: T('DAS PHANTOM (erfunden)', '', 'Seit Wochen tauchen in Talheim seltsame Nachrichten auf. Unterschrift: „Das Phantom“.',
    'Die Polizei bittet dich um Hilfe bei der Auswertung. Jede Spur führt zur nächsten.',
    'Codes wie immer mit  entsperren CODE.', '', 'Start:  cd spur00', ''),
  finale: T('Das Phantom war … ein Uni-Projekt zur Sicherheitsausbildung. Die letzte Nachricht:', '„Wer bis hierher gekommen ist, kann CTFs spielen. Melde dich bei einem echten Wettbewerb an!“', ''),
  nach: { beobachtung: 'Base64url, Hex, JWT, Klartext-Protokolle, Prüfsummen, Korrelation, XOR, Steganografie, Mehrfach-Kodierung.', schluss: 'Das sind die klassischen CTF-Kategorien Crypto, Forensik und Web – auf Einsteiger-Wettbewerbsniveau.', grenzen: 'Simulation. Echte CTFs gibt es z. B. bei picoCTF (kostenlos, für Einsteiger).', naechster: 'Probier einen echten Einsteiger-CTF.' },
  extra: () => ({
    xor(args, { sh }) {
      if (args.length < 2) return { out: '', err: 'Aufruf: xor SCHLÜSSEL DATEI   (DATEI enthält Hex, Ausgabe ist Text)\n', code: 1 };
      const f = sh._readable(args[1], 'xor'); if (f.err) return { out: '', err: f.err, code: 1 };
      const h = f.data.replace(/[^0-9a-fA-F]/g, ''); const key = new TextEncoder().encode(args[0]);
      const bytes = []; for (let i = 0; i + 1 < h.length; i += 2) bytes.push(parseInt(h.slice(i, i + 2), 16) ^ key[(i / 2) % key.length]);
      try { return { out: new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes)) + '\n', code: 0 }; } catch { return { out: String.fromCharCode(...bytes) + '\n', code: 0 }; }
    },
  }),
  floors: [
    { t: 'Die erste Botschaft', pts: 15, rep: 'Operation Nebel Phase 2 (Base64url)',
      body: 'Die erste Nachricht des Phantoms. Sie sieht aus wie Base64 – aber mit - und _.',
      build(c) { c.put('botschaft.txt', b64url(`Ich bin das Phantom. Folge mir: ${PH[0]}  Code: ${c.code}`) + '\n'); },
      hints: ['Base64url benutzt - statt + und _ statt /.', "tr '_-' '/+' macht daraus normales Base64.", "Lösung: tr '_-' '/+' < botschaft.txt | base64 -d"],
      solve: (run) => run("tr '_-' '/+' < botschaft.txt | base64 -d") },
    { t: 'Die Baustelle', pts: 15, rep: 'Bewerbung (Quelltext)',
      body: `Die Botschaft nannte ${PH[0]}. Sieh dir die Seite an – und folge ihren Hinweisen.`,
      build(c) {
        c.web(...PH, {
          '/': page('Im Aufbau', '<h1>Hier entsteht etwas.</h1>\n<!-- Build-Protokolle unter /build/ -->'),
          '/build/': page('Index of /build/', '<a href="build-2026.log">build-2026.log</a>'),
          '/build/build-2026.log': { status: 200, headers: { 'Content-Type': 'text/plain' }, body: Array.from({ length: 30 }, (_, i) => `[${p2(i)}] Schritt ${i} ok`).join('\n') + `\n[30] token=${hex(`Code: ${c.code}`)}\n[31] fertig\n` },
        });
      },
      hints: [`curl http://${PH[0]}/ – lies die Kommentare.`, 'Im Build-Protokoll steht ein Token aus Hex-Zeichen.', `Lösung: curl http://${PH[0]}/build/build-2026.log | grep token | cut -d= -f2 | xxd -r -p`],
      solve: (run) => run(`curl -s http://${PH[0]}/build/build-2026.log | grep token | cut -d= -f2 | xxd -r -p`) },
    { t: 'Der Schlüsselhinweis', pts: 20, rep: 'Operation Nebel Phase 2 (JWT)',
      body: 'Neben dem Build lag ein JWT. Sein Inhalt verweist auf eine Datei auf demselben Server.',
      build(c) {
        const kid = `/schluessel/k-${noise(c.R, 6)}.txt`;
        c.put('fund.jwt', `${b64url(JSON.stringify({ alg: 'none', kid }))}.${b64url(JSON.stringify({ sub: 'phantom', hinweis: 'kid zeigt den Weg' }))}.\n`);
        c.sh.web[`${PH[1]}:80`].routes[kid] = { status: 200, headers: { 'Content-Type': 'text/plain' }, body: `Gut gelesen. Code: ${c.code}\n` };
      },
      hints: ['Diesmal steckt der Hinweis im KOPF (erster Teil) des Tokens.', "cut -d. -f1 fund.jwt | tr '_-' '/+' | base64 -d", 'Der Wert von kid ist ein Pfad auf dem Phantom-Server.', `Lösung: cut -d. -f1 fund.jwt | tr '_-' '/+' | base64 -d → curl http://${PH[0]}/schluessel/k-….txt`],
      solve: (run) => run(`curl -s http://${PH[0]}${run("cut -d. -f1 fund.jwt | tr '_-' '/+' | base64 -d").match(/"kid":"([^"]+)"/)[1]}`) },
    { t: 'Der Klartext-Login', pts: 20, rep: 'Operation Nebel Phase 7',
      body: 'Ein Mitschnitt einer alten Dateiübertragung (FTP). FTP schickt Benutzer und Passwort im Klartext – das Phantom hat sein „Passwort“ aber noch ROT13-verschoben.',
      build(c) {
        const l = ['220 Talheim FTP bereit', 'USER gast', '331 Passwort bitte', 'PASS gast', '230 Angemeldet', 'LIST', '226 Fertig', 'QUIT', '', '220 Talheim FTP bereit', 'USER phantom', '331 Passwort bitte', `PASS ${rot13(c.code)}`, '230 Angemeldet', 'RETR plan.txt', '226 Fertig'];
        c.put('ftp-mitschnitt.txt', l.join('\n') + '\n');
      },
      hints: ['Gesucht ist die PASS-Zeile nach USER phantom.', 'grep PASS zeigt beide Anmeldungen – die letzte gehört dem Phantom: | tail -n 1', "Lösung: grep PASS ftp-mitschnitt.txt | tail -n 1 | cut -d' ' -f2 | tr 'A-Za-z' 'N-ZA-Mn-za-m'"],
      solve: (run) => run("grep PASS ftp-mitschnitt.txt | tail -n 1 | cut -d' ' -f2 | tr 'A-Za-z' 'N-ZA-Mn-za-m'") },
    { t: 'Die richtige Konfiguration', pts: 20, rep: 'Stellwerk Posten 5 (Prüfsummen)',
      body: '50 Konfigurationsdateien. Das Phantom hinterließ nur eine MD5-Prüfsumme.',
      build(c) { const hit = Math.floor(c.R() * 50); for (let i = 0; i < 50; i++) c.put(`configs/c${p2(i)}.conf`, i === hit ? `phantom=1\nCode: ${c.code}\n` : `phantom=0\nwert=${noise(c.R, 10)}\n`); c.put('hinweis.md5', '__MD5__\n'); },
      hints: ['Eine Prüfsumme ist wie ein Fingerabdruck einer Datei. MD5 ist ein älteres Verfahren.', 'md5sum configs/* berechnet alle auf einmal – vergleiche mit hinweis.md5.', 'Lösung: md5sum configs/* | grep $(cat hinweis.md5) → cat auf die Datei'],
      solve: (run) => run(`cat ${run('md5sum configs/* | grep $(cat hinweis.md5)').trim().split(/\s+/)[1]}`) },
    { t: 'Zwei Logs, eine IP', pts: 25, rep: 'Funkturm Etage 6 (uniq)',
      body: 'web.log und vpn.log haben viele IPs. Genau EINE taucht in beiden auf – das ist das Phantom.',
      build(c) {
        const ip = () => `10.${Math.floor(c.R() * 200)}.${Math.floor(c.R() * 250)}.${Math.floor(c.R() * 250)}`;
        const ph = '10.201.13.37';
        const w = Array.from({ length: 60 }, () => `${ip()} GET /${noise(c.R, 4)}`); w.splice(30, 0, `${ph} GET /phantom`);
        const v = Array.from({ length: 40 }, () => `vpn login ok from ${ip()}`); v.splice(10, 0, `vpn login ok from ${ph}`);
        c.put('web.log', w.join('\n') + '\n'); c.put('vpn.log', v.join('\n') + '\n');
        c.put(`spuren/${ph}.txt`, `Erwischt. Code: ${c.code}\n`); for (let i = 0; i < 5; i++) c.put(`spuren/10.0.0.${i}.txt`, 'nein\n');
      },
      hints: ['IPs aus web.log: cut -d\' \' -f1 · aus vpn.log: das letzte Wort – awk \'{print $NF}\'', 'Jede Liste mit sort -u eindeutig machen, beide zusammenwerfen, dann zeigt uniq -d, was doppelt ist.', "Lösung: cut -d' ' -f1 web.log | sort -u > a; awk '{print $NF}' vpn.log | sort -u > b; cat a b | sort | uniq -d → cat spuren/IP.txt"],
      solve: (run) => { run("cut -d' ' -f1 web.log | sort -u > a; awk '{print $NF}' vpn.log | sort -u > b"); return run(`cat spuren/${run('cat a b | sort | uniq -d').trim()}.txt`); } },
    { t: 'XOR', pts: 25,
      body: 'Die nächste Nachricht ist mit XOR verschlüsselt. Den Schlüssel hat das Phantom rückwärts geschrieben in schluessel-hinweis.txt hinterlassen.',
      build(c) {
        const key = 'nebelkrähe';
        const msg = new TextEncoder().encode(`XOR geknackt. Code: ${c.code}`); const k = new TextEncoder().encode(key);
        c.put('geheim.hex', [...msg].map((b, i) => (b ^ k[i % k.length]).toString(16).padStart(2, '0')).join('') + '\n');
        c.put('schluessel-hinweis.txt', rev(key) + '\n');
      },
      hints: ['rev schluessel-hinweis.txt zeigt den Schlüssel.', 'In diesem Raum gibt es das Werkzeug xor: xor SCHLÜSSEL DATEI', 'Lösung: xor $(rev schluessel-hinweis.txt) geheim.hex'],
      solve: (run) => run('xor $(rev schluessel-hinweis.txt) geheim.hex') },
    { t: 'Das Gedicht', pts: 20,
      body: 'Ein Gedicht mit 21 Zeilen. Lies nicht die Zeilen – lies die Anfänge.',
      build(c) { c.put('gedicht.txt', [...c.code].map(ch => `${ch}${c.pick([' wie Wind', ' im Nebel', ' über Talheim', ' leise', ' ganz still', ' bei Nacht'])}`).join('\n') + '\n'); },
      hints: ['Der erste Buchstabe jeder Zeile zählt.', 'cut -c1 schneidet das erste Zeichen jeder Zeile aus.', 'Lösung: cut -c1 gedicht.txt | tr -d "\\n"'],
      solve: (run) => run('cut -c1 gedicht.txt | tr -d "\\n"') },
    { t: 'Das Foto', pts: 25, rep: 'Bewerbung Runde 8',
      body: 'Ein Foto vom Tatort. In den Metadaten steckt ein Kommentar – mehrfach verpackt.',
      build(c) { c.put('tatort.jpg', '\u00ff\u00d8\u00ff\u00e1' + binNoise(c.R, 300) + `Comment: ${hex(b64(`Code: ${c.code}`))}` + binNoise(c.R, 300)); },
      hints: ['strings tatort.jpg | grep Comment', 'Der Kommentar ist Hex. Darunter: Base64.', "Lösung: strings tatort.jpg | grep Comment | cut -d' ' -f2 | xxd -r -p | base64 -d"],
      solve: (run) => run("strings tatort.jpg | grep Comment | cut -d' ' -f2 | xxd -r -p | base64 -d") },
    { t: 'Die letzte Nachricht', pts: 30, rep: 'Alles',
      body: 'Die letzte Nachricht: Hex, dann ROT13, dann rückwärts, dann Base64. Finde den Weg zurück.',
      build(c) { c.put('letzte.txt', b64(rev(rot13(hex(`Phantom enttarnt. Code: ${c.code}`)))) + '\n'); },
      hints: ['Außen: Base64.', 'Danach umdrehen (rev), dann ROT13 rückgängig (tr), zum Schluss Hex (xxd -r -p).', "Lösung: base64 -d letzte.txt | rev | tr 'A-Za-z' 'N-ZA-Mn-za-m' | xxd -r -p"],
      solve: (run) => run("base64 -d letzte.txt | rev | tr 'A-Za-z' 'N-ZA-Mn-za-m' | xxd -r -p") },
  ],
});
{
  const orig = W9.setup;
  W9.setup = (sh, F, solved) => {
    orig(sh, F, solved);
    const d = W9.dirOf(4);
    const hit = Object.entries(sh.fs.get(`${d}/configs`).kids).find(([, n]) => n.data.startsWith('phantom=1'));
    sh.fs.put(`${d}/hinweis.md5`, md5Sync(hit[1].data) + '\n');
  };
}
import { md5hexSync as md5Sync } from '../shell.js';

export const LEITERN = [W5, W6, W7, W8, W9];
