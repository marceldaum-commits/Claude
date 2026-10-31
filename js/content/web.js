// Level 3 – Web-Hacking Grundlagen
// h1 „Was die Webseite verrät“: Handy/Sandbox – mitgeschnittene Anfragen/Antworten lesen und Schwachstellen ERKENNEN.
// j1 „Juice Shop – erste Schritte“: PC – OWASP Juice Shop (offizielles, absichtlich unsicheres Übungsprojekt) lokal
//    auf 127.0.0.1 starten, mit Burp Suite beobachten, eigene Punktetafel finden. Lösungswege liefert das Projekt selbst.
// PORTSWIGGER: kuratierter Lernpfad durch die kostenlose Web Security Academy.

import { HOME } from '../shell.js';
import { textTools } from './wargames.js';

const T = (...lines) => lines.join('\n');
const b64 = (s) => (typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(s))) : Buffer.from(s, 'utf8').toString('base64'));

function webSetup(sh, F) {
  const p = (path, c) => sh.fs.put(`${HOME}/web/${path}`, c);
  const cookie = b64(JSON.stringify({ nutzer: 'seppi', rolle: 'kunde', notiz: F.cookie }));
  p('LIESMICH.txt', T(
    'Mitschnitte aus dem (erfundenen) Online-Shop „Kistenkönig“.',
    'So sieht es aus, wenn du mit Burp Suite oder den Entwicklertools des Browsers mitliest.',
    'Deine Aufgabe: lesen, verstehen, Schwachstellen ERKENNEN.',
    '',
    '  1-login.txt         Anmeldung und Antwort des Servers',
    '  2-produkte.json     Antwort der Produkt-API',
    '  3-bestellungen.log  Protokoll mehrerer Anfragen', ''));
  p('1-login.txt', T(
    '>>> ANFRAGE',
    'POST /login HTTP/1.1',
    'Host: kistenkoenig.example',
    'Content-Type: application/x-www-form-urlencoded',
    '',
    'benutzer=seppi&passwort=********',
    '',
    '<<< ANTWORT',
    'HTTP/1.1 302 Found',
    'Location: /konto',
    `Set-Cookie: sitzung=${cookie}; Path=/`,
    'Server: nginx', ''));
  const produkte = [
    { id: 1, name: 'Umzugskarton M', preis: 2.49, einkaufspreis: 0.61, lieferant_intern: 'Pappwerk Nord' },
    { id: 2, name: 'Klebeband 50 m', preis: 3.99, einkaufspreis: 0.88, lieferant_intern: 'Tape & Co' },
    { id: 3, name: 'Luftpolsterfolie', preis: 7.5, einkaufspreis: 1.9, lieferant_intern: 'Folien-Fritz', notiz_intern: `Testprodukt, nicht freigeben – ${F.api}` },
    { id: 4, name: 'Packdecke', preis: 12.0, einkaufspreis: 3.1, lieferant_intern: 'Textil Süd' },
  ];
  p('2-produkte.json', JSON.stringify({ produkte }, null, 2) + '\n');
  p('3-bestellungen.log', T(
    '# angemeldet als: seppi (Kundennummer 5310)',
    'GET /api/bestellung/1041  -> 200 {"bestellung":1041,"kunde":"Seppi","artikel":"Umzugskarton M","menge":20}',
    'GET /api/bestellung/1041/rechnung -> 200 (PDF)',
    'GET /api/bestellung/1042  -> 200 {"bestellung":1042,"kunde":"Petra Lang","adresse":"Birkenweg 3","artikel":"Packdecke","menge":2}',
    'GET /api/bestellung/1043  -> 200 {"bestellung":1043,"kunde":"Jonas Ehrlich","adresse":"Am Hang 12","artikel":"Klebeband 50 m","menge":5}',
    'GET /konto -> 200', ''));
  sh.cwd = `${HOME}/web`;
}

export const WEB_ROOMS = [
  // ================================================================ H1 – Handy
  {
    id: 'h1', title: 'Was die Webseite verrät', type: 'walkthrough', level: 'L3', difficulty: 'leicht', minutes: 30,
    tools: ['cat', 'grep', 'base64 -d', 'HTTP lesen'],
    desc: 'Mitschnitte aus einem Online-Shop: Cookies, API-Antworten, Anfrageprotokolle. Du liest wie ein Pentester – und findest drei typische Fehler.',
    ziel: 'HTTP-Anfragen und -Antworten lesen und drei klassische Web-Schwachstellen erkennen: Daten im Cookie, zu viel Daten in der API, fehlende Zugriffsprüfung.',
    scope: 'Nur die Mitschnitte in der Sandbox (~/web). Erfundener Shop, keine echte Seite.',
    stop: 'Keine nötig – reine Analyse in der Simulation.',
    cleanup: 'Nichts nötig.',
    machine: { kind: 'sandbox' },
    welcome: 'Web-Analyse · Sandbox bereit. Start: cat LIESMICH.txt',
    flags: ['cookie', 'api'],
    setup: webSetup,
    commands: () => textTools(),
    tasks: [
      {
        id: 't1', title: 'Das Cookie',
        body: T('Nach der Anmeldung setzt der Server ein Cookie. Der Browser schickt es ab jetzt bei JEDER Anfrage mit – so weiß der Server, wer du bist.',
          'Schau dir an, was im Cookie „sitzung“ steckt.'),
        questions: [
          { id: 'q1', type: 'flag', flag: 'cookie', q: 'Flag aus dem Cookie', points: 10, hints: [
            'Lies 1-login.txt. Das Cookie steht in der Zeile Set-Cookie: hinter sitzung=',
            'Der Wert sieht aus wie Buchstabensalat und endet evtl. auf =. Das ist typisch für Base64.',
            'Kopiere nur den Wert (bis vor das Semikolon) und lass ihn dekodieren: echo WERT | base64 -d',
            'Lösung: grep Set-Cookie 1-login.txt | cut -d= -f2 | cut -d";" -f1 | base64 -d'] },
          { id: 'q2', type: 'text', q: 'Welche Rolle steht im Cookie?', accept: [/^kunde$/i], points: 5, hints: ['Im dekodierten Cookie gibt es ein Feld „rolle“.', 'Lösung: kunde'] },
          { id: 'q3', type: 'mc', q: 'Warum ist eine Rolle im Cookie gefährlich, wenn der Server ihr einfach glaubt?', points: 10,
            options: ['Das Cookie liegt beim Nutzer – er kann es verändern. Rechte muss der Server selbst prüfen und speichern.', 'Cookies sind immer verschlüsselt, also ist es egal.', 'Weil Cookies zu groß werden.'], answer: 0,
            hints: ['Wo liegt das Cookie, und wer kann es bearbeiten?', 'Base64 ist keine Verschlüsselung – du hast es gerade selbst gelesen.'] },
          { id: 'q4', type: 'text', q: 'Welche Schutz-Eigenschaft fehlt dem Cookie, die es vor dem Auslesen durch JavaScript schützt?', accept: [/^httponly$/i], points: 10, hints: [
            'Cookies können Zusatz-Eigenschaften haben, die hinter Semikolons stehen. Hier steht nur Path=/.',
            'Es gibt eine Eigenschaft, die JavaScript den Zugriff auf das Cookie verbietet (wichtig gegen XSS).',
            'Lösung: HttpOnly (außerdem fehlt Secure – nur über HTTPS senden)'] },
        ],
      },
      {
        id: 't2', title: 'Die gesprächige API',
        body: T('Moderne Shops laden Produkte per API als JSON. Die Webseite zeigt dann nur einen Teil davon an – Name und Preis.',
          'Aber was schickt der Server wirklich?'),
        questions: [
          { id: 'q1', type: 'text', q: 'Welches Feld verrät, was der Shop selbst für ein Produkt bezahlt?', accept: [/^einkaufspreis$/i], points: 10, hints: [
            'cat 2-produkte.json zeigt die komplette Antwort.',
            'Neben name und preis stehen Felder, die Kunden nie sehen sollten.',
            'Lösung: einkaufspreis'] },
          { id: 'q2', type: 'flag', flag: 'api', q: 'Flag aus einer internen Notiz', points: 10, hints: [
            'Nicht jedes Produkt hat dieselben Felder. Eines hat ein zusätzliches internes Feld.',
            'grep sucht in der Datei nach einem Wort – z. B. nach „intern“ oder nach KLY.',
            'Lösung: grep notiz 2-produkte.json'] },
          { id: 'q3', type: 'mc', q: 'Wie behebt man das richtig?', points: 10,
            options: ['Der Server schickt nur die Felder, die die Seite wirklich braucht.', 'Die Felder mit CSS verstecken.', 'Die API-Adresse geheim halten.'], answer: 0,
            hints: ['Alles, was beim Browser ankommt, kann man lesen – egal, ob es angezeigt wird.'] },
        ],
      },
      {
        id: 't3', title: 'Fremde Bestellungen',
        body: T('Im Protokoll siehst du Anfragen eines angemeldeten Kunden. Achte darauf, WER angemeldet ist und WESSEN Daten zurückkommen.'),
        questions: [
          { id: 'q1', type: 'text', q: 'Welche andere Kundin bekommt Seppi bei Bestellung 1042 zu sehen? (Name)', accept: [/^petra lang$/i], points: 10, hints: [
            'cat 3-bestellungen.log – die erste Zeile sagt, wer angemeldet ist.',
            'Vergleiche bei jeder Antwort das Feld „kunde“ mit dem angemeldeten Nutzer.',
            'Lösung: Petra Lang'] },
          { id: 'q2', type: 'mc', q: 'Was fehlt auf dem Server?', points: 15,
            options: ['Die Prüfung, ob die angefragte Bestellung dem angemeldeten Kunden gehört.', 'Ein besserer Webserver als nginx.', 'Längere Bestellnummern – dann errät sie niemand.'], answer: 0,
            hints: ['Seppi hat nur die Zahl in der Adresse um 1 erhöht.', 'Der Fachbegriff: fehlende Zugriffskontrolle (englisch „Broken Access Control“, Platz 1 der OWASP Top 10).'] },
          { id: 'q3', type: 'mc', q: 'Du entdeckst so etwas zufällig bei einem echten Shop. Was ist richtig?', points: 10,
            options: ['Nicht weiter ausprobieren, keine fremden Daten abrufen – den Betreiber verantwortungsvoll informieren.', 'Alle Bestellungen herunterladen, um es zu beweisen.', 'In einem Forum veröffentlichen.'], answer: 0,
            hints: ['Ohne Erlaubnis ist jeder weitere Abruf fremder Daten unzulässig – auch „nur zum Testen“.'] },
        ],
      },
    ],
    nach: { beobachtung: 'Ein lesbares Cookie mit Rolle, eine API mit internen Feldern, Bestellungen ohne Zugriffsprüfung.', schluss: 'Alles, was beim Browser ankommt, ist für den Nutzer sichtbar und veränderbar. Sicherheit gehört auf den Server.', grenzen: 'Nur Mitschnitte – im Juice Shop findest du solche Fehler selbst.', naechster: 'Am PC: „Juice Shop – erste Schritte“ mit Burp Suite.' },
  },

  // ================================================================ J1 – PC
  {
    id: 'j1', title: 'Juice Shop – erste Schritte', type: 'walkthrough', level: 'L3', difficulty: 'leicht → offen', minutes: 60,
    tools: ['docker', 'Firefox/Chromium', 'Burp Suite Community', 'Entwicklertools (F12)'],
    desc: 'OWASP Juice Shop: ein absichtlich unsicherer Online-Shop zum Üben, mit über 100 Aufgaben und eigener Punktetafel. Du startest ihn in Kali und beobachtest ihn mit Burp Suite.',
    ziel: 'Eine Web-Anwendung methodisch erkunden: erst normal benutzen, dann mitlesen, dann verstehen, was der Browser dem Server schickt.',
    scope: 'Nur dein lokaler Juice Shop auf http://127.0.0.1:3000. Niemals echte Shops oder fremde Seiten.',
    stop: 'Container nie ohne „127.0.0.1:“ vor dem Port starten. Burp nur gegen 127.0.0.1 einsetzen.',
    cleanup: 'docker stop juice-shop',
    machine: { kind: 'ext', name: 'juice-shop', image: 'bkimminich/juice-shop', port: 3000, inner: 3000 },
    tasks: [
      {
        id: 't1', title: 'Shop starten',
        body: 'Starte den Juice Shop mit den Befehlen im Kasten oben und öffne http://127.0.0.1:3000 im Browser deiner Kali-VM.',
        questions: [
          { id: 'q1', type: 'confirm', q: 'Der Shop läuft und ich sehe die Startseite.', points: 5 },
          { id: 'q2', type: 'text', q: 'Wie heißt der Shop laut Titel im Browser-Tab?', accept: [/juice\s*shop/i], points: 5, hints: ['Der Titel steht oben im Tab oder in der Seitenquelle zwischen <title> und </title>.', 'Lösung: OWASP Juice Shop'] },
        ],
      },
      {
        id: 't2', title: 'Erst wie ein Kunde',
        body: T('Pentester benutzen eine Anwendung zuerst ganz normal. Lege ein Konto an (erfundene E-Mail reicht, z. B. test@test.de), suche ein Produkt, lege etwas in den Warenkorb.',
          'Merke dir: Welche Funktionen gibt es? Wo gibst du etwas ein?'),
        questions: [
          { id: 'q1', type: 'confirm', q: 'Konto angelegt, gesucht, etwas in den Warenkorb gelegt.', points: 5 },
          { id: 'q2', type: 'mc', q: 'Warum zuerst normal benutzen?', points: 10, options: ['Wer die normalen Abläufe kennt, erkennt, wo etwas anders reagiert als erwartet.', 'Weil Hacken sonst verboten ist.', 'Das ist nicht nötig, man startet sofort mit Werkzeugen.'], answer: 0, hints: ['Was ist leichter: einen Fehler in einem Ablauf finden, den du kennst – oder in einem, den du nie gesehen hast?'] },
        ],
      },
      {
        id: 't3', title: 'Mitlesen mit Burp Suite',
        body: T('Burp Suite ist auf Kali vorinstalliert. Es sitzt als „Proxy“ zwischen Browser und Server und zeigt jede Anfrage.',
          '1. Burp starten → Temporary project → Start Burp',
          '2. Reiter Proxy → „Open browser“ (Burps eigener Browser ist schon richtig eingestellt)',
          '3. In diesem Browser http://127.0.0.1:3000 öffnen und ein Produkt suchen',
          '4. Reiter Proxy → HTTP history: Hier stehen alle Anfragen.'),
        questions: [
          { id: 'q1', type: 'confirm', q: 'Burp läuft, und ich sehe Anfragen in der HTTP history.', points: 5 },
          { id: 'q2', type: 'text', q: 'An welchen API-Pfad schickt die Suche ihre Anfrage? (ohne ?q=…)', accept: [/^\/?rest\/products\/search\/?$/i], points: 15, hints: [
            'Such im Shop nach einem Wort, z. B. „apple“, und schau dann in die HTTP history.',
            'Interessant sind Anfragen, die Daten liefern (JSON), nicht Bilder oder Schriften. Sie beginnen oft mit /api oder /rest.',
            'Die gesuchte Zeile enthält dein Suchwort hinter ?q=',
            'Lösung: /rest/products/search'] },
          { id: 'q3', type: 'mc', q: 'Was macht ein Proxy wie Burp?', points: 10, options: ['Er leitet den Verkehr zwischen Browser und Server weiter und zeigt (und erlaubt das Ändern von) jeder Anfrage.', 'Er macht die Verbindung schneller.', 'Er hackt die Seite automatisch.'], answer: 0, hints: ['Proxy heißt „Stellvertreter“ – wer sitzt hier zwischen wem?'] },
        ],
      },
      {
        id: 't4', title: 'Die versteckte Punktetafel',
        body: T('Der Juice Shop hat eine Punktetafel (Score Board), die nirgends verlinkt ist. Sie zu finden ist die erste offizielle Aufgabe.',
          'Webseiten verraten oft mehr, als sie anzeigen – besonders in ihrem JavaScript.'),
        questions: [
          { id: 'q1', type: 'confirm', q: 'Punktetafel gefunden (der Shop zeigt oben ein grünes Erfolgsbanner).', points: 15 },
          { id: 'q2', type: 'text', q: 'Unter welchem Pfad liegt sie? (Teil nach dem #)', accept: [/^\/?#?\/?score-board\/?$/i], points: 10, hints: [
            'Die Seite ist eine „Single Page App“: Alle Seiten-Adressen stehen im JavaScript des Shops.',
            'Öffne die Entwicklertools (F12) → Reiter Debugger/Quellen → main.js, oder die Antwort von main.js in Burp.',
            'Suche darin nach einem Wort, das zu „Punktetafel“ passt – auf Englisch.',
            'Lösung: http://127.0.0.1:3000/#/score-board'] },
        ],
      },
      {
        id: 't5', title: 'Deine ersten Sterne',
        body: T('Auf der Punktetafel sind die Aufgaben nach Sternen sortiert (1 = leicht). Zu jeder gibt es einen kurzen Hinweis direkt im Shop.',
          'Wähle drei Ein-Stern-Aufgaben und löse sie. Wenn du feststeckst: Das Projekt hat ein offizielles, kostenloses Begleitbuch mit Tipps – Link unten in den Tipps.'),
        questions: [
          { id: 'q1', type: 'confirm', q: 'Drei Ein-Stern-Aufgaben gelöst (grüne Banner).', points: 25 },
          { id: 'q2', type: 'mc', q: 'Wann ist Ausprobieren wie hier erlaubt?', points: 10, options: ['Nur bei eigenen Übungszielen oder mit ausdrücklicher schriftlicher Erlaubnis des Betreibers.', 'Bei jedem Shop, solange man nichts kaputt macht.', 'Wenn man es nachts macht.'], answer: 0, hints: ['Der Juice Shop läuft auf DEINEM Rechner. Bei fremden Seiten gilt: ohne Erlaubnis tabu – auch „nur gucken“.'] },
          { id: 'q3', type: 'confirm', q: 'Aufgeräumt: docker stop juice-shop (dein Fortschritt im Shop geht dabei verloren – das ist normal).', points: 5 },
        ],
      },
    ],
    nach: { beobachtung: 'Juice Shop läuft lokal; mit Burp siehst du jede Anfrage, die Punktetafel war im JavaScript versteckt.', schluss: 'Methodik schlägt Werkzeug: erst verstehen, wie die Anwendung normal arbeitet, dann gezielt hinschauen.', grenzen: 'Der Juice Shop ist absichtlich voller Fehler. Echte Anwendungen sind schwerer – die Vorgehensweise bleibt gleich.', naechster: 'Weitere Sterne im Juice Shop sammeln und parallel den PortSwigger-Lernpfad (Level 3) durcharbeiten.' },
  },
];

// Lernpfad durch die kostenlose PortSwigger Web Security Academy (Labs laufen online bei PortSwigger – erlaubt und dafür gemacht)
export const PORTSWIGGER = [
  { t: 'Zugriffskontrolle (Access control)', url: 'https://portswigger.net/web-security/access-control', why: 'Fremde Daten durch fehlende Prüfungen – wie im Raum „Was die Webseite verrät“.' },
  { t: 'Authentifizierung', url: 'https://portswigger.net/web-security/authentication', why: 'Wie Logins funktionieren und wo sie schwach sind.' },
  { t: 'Path Traversal', url: 'https://portswigger.net/web-security/file-path-traversal', why: 'Dateien lesen, die man nicht lesen soll – Linux-Pfade zahlen sich aus.' },
  { t: 'Informationslecks', url: 'https://portswigger.net/web-security/information-disclosure', why: 'Was Fehlermeldungen, Kommentare und Header verraten.' },
  { t: 'SQL Injection', url: 'https://portswigger.net/web-security/sql-injection', why: 'Der Klassiker: Wenn Eingaben Teil einer Datenbankabfrage werden.' },
  { t: 'Cross-Site Scripting (XSS)', url: 'https://portswigger.net/web-security/cross-site-scripting', why: 'Wenn eine Seite Eingaben ungeprüft wieder ausgibt.' },
];
