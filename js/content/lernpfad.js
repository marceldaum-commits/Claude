// Lernpfad: geführte Lernstufen, die an die Hand nehmen – Theorie, Beispiel, eigene Übung.
// Die Leiter: Jede Stufe wird erst frei, wenn die Übung der vorigen Stufe erledigt ist (Raum, Lektion oder Arena).
// Dieser Pfad wächst mit: neue Arenen hier als Stufe ergänzen. „erfordert“ kann sein:
//   { lektion: 'l_dateien' }            – eine App-Lektion gelesen (state.lessons)
//   { raum: 'w2' }                      – ein App-Raum/Wargame gelöst (roomDone)
//   { arena: 'keller', level: 3 }       – in einer Online-Arena mind. N Level geschafft (arena_fortschritt)
// Codes/Befehle in `befehle` werden in der Oberfläche als <code> gezeigt und nicht übersetzt.

export const LERNPFAD = [
  {
    id: 's0', icon: '🚀', titel: 'Willkommen – was ist „Hacken“ wirklich?',
    einleitung: 'Hacken heißt nicht „Knöpfe drücken wie im Film“, sondern: ein System genau verstehen und Fehler finden, bevor es die Bösen tun. Du lernst hier Angriff UND Verteidigung – immer nur im erlaubten Rahmen (deinem eigenen Übungssystem).',
    konzepte: [
      ['Scope', 'Der erlaubte Bereich. Alles, was du hier machst, läuft in abgeschotteten Übungs-Servern, die nur dir gehören. Nie fremde Systeme ohne schriftliche Erlaubnis.'],
      ['Terminal', 'Das schwarze Fenster, in das du Befehle tippst. Dein wichtigstes Werkzeug.'],
    ],
    beispiel: {
      text: 'Ein erster Blick: „Wer bin ich und wo bin ich?“ Diese zwei Befehle fragst du auf jedem fremden System zuerst.',
      befehle: ['whoami', 'ls -la'],
    },
    selbst: ['Öffne das Übungs-Terminal in der App und tippe die beiden Befehle aus dem Beispiel.', 'Keine Angst: Du kannst nichts kaputt machen.'],
    uebung: { label: 'Übungs-Terminal öffnen', href: '#/terminal', erfordert: { lektion: 'l1-01' }, hinweis: 'Lies die erste Lektion im Spickzettel, dann ist diese Stufe geschafft.' },
  },
  {
    id: 's1', icon: '🐧', titel: 'Linux-Grundlagen: Dateien und Ordner',
    einleitung: 'Fast alle Server laufen mit Linux. Dateien lesen, Ordner wechseln, versteckte Dinge finden – das ist das Handwerk, auf dem alles aufbaut.',
    konzepte: [
      ['Rechte (rwx)', 'Jede Datei sagt: Wer darf lesen (r), schreiben (w), ausführen (x)? Das zu lesen ist die halbe Miete.'],
      ['Versteckte Dateien', 'Namen, die mit einem Punkt beginnen (z. B. .geheim), zeigt ls nur mit -a.'],
    ],
    beispiel: {
      text: 'Alles anzeigen, auch Verstecktes, mit Rechten – und eine Datei lesen:',
      befehle: ['ls -la', 'cat .notiz', 'grep -ri passwort .'],
    },
    selbst: ['Spiele die Arena „Der Kellerserver“ (oder den gleichnamigen Raum im Hacklab).', 'Finde in den ersten Konten die versteckten Dateien und Notizen.'],
    uebung: { label: 'Arena: Der Kellerserver', href: 'arena:keller', erfordert: { arena: 'keller', level: 3 }, hinweis: 'Schaffe die ersten 3 Codes im Kellerserver (oder spiele den Raum im Hacklab).', auchRaum: 'w2' },
  },
  {
    id: 's2', icon: '🔑', titel: 'Rechte und Benutzer: der Weg nach oben',
    einleitung: 'Als schwacher Benutzer gestartet – wie kommt man zu mehr Rechten? Durch Fehler in Rechten, vergessene Passwörter, Prozesse und Gruppen. Das nennt man Rechteausweitung (Eskalation).',
    konzepte: [
      ['Eskalation', 'Von einem kleinen Konto zu einem mächtigeren kommen, über Fehlkonfigurationen.'],
      ['Prozesse', 'Laufende Programme. ps aux zeigt sie – manchmal steht ein Passwort direkt in der Befehlszeile.'],
      ['SSH', 'Als anderes Konto anmelden: ssh name@localhost.'],
    ],
    beispiel: {
      text: 'Nach Passwörtern in laufenden Programmen suchen und Gruppen prüfen:',
      befehle: ['ps aux | grep -i pass', 'id', 'find / -group wartung 2>/dev/null'],
    },
    selbst: ['Arbeite dich im Kellerserver weiter nach oben – von Konto zu Konto.'],
    uebung: { label: 'Arena: Kellerserver (weiter)', href: 'arena:keller', erfordert: { arena: 'keller', level: 6 }, hinweis: 'Schaffe mindestens 6 Codes im Kellerserver.' },
  },
  {
    id: 's3', icon: '🛰️', titel: 'Netzwerk und Dienste',
    einleitung: 'Server bieten Dienste an „Türen“ (Ports) an. Finden, ansprechen, verstehen – und aus den Antworten den nächsten Schritt ableiten.',
    konzepte: [
      ['Port', 'Eine Tür an einem Rechner, hinter der ein Dienst lauscht. ss -tln zeigt die offenen.'],
      ['HTTP', 'Die Sprache von Webseiten. Mit curl sprichst du direkt mit einem Webdienst.'],
      ['robots.txt', 'Sagt Suchmaschinen, was sie meiden sollen – und verrät damit oft spannende Pfade.'],
    ],
    beispiel: {
      text: 'Offene Ports finden und mit einem Dienst reden:',
      befehle: ['ss -tln', 'nc localhost 4444', 'curl -i http://localhost:8080/'],
    },
    selbst: ['Spiele die Arena „Die Leitstelle“: Ports finden, mit Diensten sprechen, versteckte Web-Bereiche entdecken.'],
    uebung: { label: 'Arena: Die Leitstelle', href: 'arena:leitstelle', erfordert: { arena: 'leitstelle', level: 3 }, hinweis: 'Schaffe mindestens 3 Codes in der Leitstelle.' },
  },
  {
    id: 's4', icon: '🌐', titel: 'Web-Grundlagen',
    einleitung: 'Die meisten Angriffe heute laufen über das Web. Hier lernst du, wie Browser und Server reden – und wo die typischen Schwachstellen sitzen.',
    konzepte: [
      ['HTTP-Methoden', 'GET holt, POST schickt. Manche Bereiche antworten nur auf eine bestimmte Methode.'],
      ['Header (HTTP)', 'Zusatzangaben bei jeder Anfrage – z. B. Cookies oder „Ausweise“. curl -H "Name: Wert".'],
      ['Path Traversal', 'Mit ../ aus einem erlaubten Ordner ausbrechen und fremde Dateien lesen.'],
    ],
    beispiel: {
      text: 'Kopf einer Antwort ansehen, Methode wählen, Header mitschicken:',
      befehle: ['curl -i http://localhost:8000/', 'curl -X POST http://localhost:8000/konto', 'curl -H "X-Intern: ja" http://localhost:8000/admin'],
    },
    selbst: ['Spiele die Arena „Web 1: Das Kleingedruckte“. Nimm das Handout als Begleitung.'],
    uebung: { label: 'Arena: Web 1', href: 'arena:web1', erfordert: { arena: 'web1', level: 4 }, hinweis: 'Schaffe mindestens 4 der 6 Codes in Web 1.' },
  },
  {
    id: 's5', icon: '💉', titel: 'Web-Angriffe: Injection & Umwege',
    einleitung: 'Jetzt wird es scharf: Eingaben, die als Befehl missbraucht werden (Injection), fremde Daten über Nummern (IDOR), und den Server dazu bringen, selbst Adressen abzurufen (SSRF).',
    konzepte: [
      ['SQL-Injection', 'Eingaben verändern die Datenbank-Abfrage. Klassiker beim Login: admin\'--'],
      ['SSRF', 'Der Server ruft für dich Adressen ab – auch interne, die du von außen nicht erreichst.'],
      ['Mass Assignment', 'Ein Formular übernimmt mehr Felder als vorgesehen – z. B. rolle=admin.'],
    ],
    beispiel: {
      text: 'Login umgehen und eine interne Adresse über den Server erreichen:',
      befehle: ['curl -d "user=admin\'--&pass=x" http://localhost:8000/login', 'curl -G --data-urlencode "url=http://127.0.0.1:9000/" http://localhost:8000/vorschau'],
    },
    selbst: ['Spiele „Web 2: Umwege“. Davor hilft der Webshop als sanfterer Einstieg.'],
    uebung: { label: 'Arena: Web 2', href: 'arena:web2', erfordert: { arena: 'web2', level: 4 }, hinweis: 'Schaffe mindestens 4 Codes in Web 2.', auchArena: { arena: 'webshop', level: 4 } },
  },
  {
    id: 's6', icon: '🔐', titel: 'Verschlüsselung, Hashes und Passwörter',
    einleitung: 'Warum sind schwache Passwörter gefährlich? Wie werden sie gespeichert? Und wie öffnet man ein verschlüsseltes Archiv, wenn man den Schlüssel kennt?',
    konzepte: [
      ['Hash', 'Ein Fingerabdruck von Daten. Nicht umkehrbar – aber man kann Kandidaten vergleichen (Wortliste).'],
      ['Verschlüsselung', 'Daten unlesbar machen, nur mit dem richtigen Schlüssel zurück. openssl enc -d …'],
    ],
    beispiel: {
      text: 'Einen Hash bilden und ein Archiv mit bekanntem Passwort öffnen:',
      befehle: ['echo -n hallo | sha256sum', 'openssl enc -d -aes-256-cbc -pbkdf2 -in tresor.enc -pass pass:GEHEIM'],
    },
    selbst: ['Spiele „Der Tresor“: Hashes knacken, Git-Spuren, PATH-Falle, verschlüsselter Tresor.'],
    uebung: { label: 'Arena: Der Tresor', href: 'arena:tresor', erfordert: { arena: 'tresor', level: 3 }, hinweis: 'Schaffe mindestens 3 Codes im Tresor.' },
  },
  {
    id: 's7', icon: '🧬', titel: 'Web-Profi: Ketten und moderne Lücken',
    einleitung: 'Die Königsklasse: Lücken verketten. Vorlagen-Injection (SSTI), unsichere Deserialisierung, Race Conditions und blinde SQL-Injection – da, wo man nichts sieht.',
    konzepte: [
      ['SSTI', 'Deine Eingabe wird als Vorlage ausgewertet. Test: {{ 7*7 }} ergibt 49.'],
      ['Race Condition', 'Zwei Vorgänge gleichzeitig stören sich – z. B. ein Gutschein doppelt eingelöst.'],
      ['Blind-SQLi', 'Nur „aktiv/inaktiv“ als Antwort – man liest Zeichen für Zeichen aus.'],
    ],
    beispiel: {
      text: 'SSTI erkennen und viele Anfragen gleichzeitig schicken (Race):',
      befehle: ['curl -G --data-urlencode "name={{ 7*7 }}" http://localhost:8000/gruss', 'for i in $(seq 1 30); do curl -s -X POST http://localhost:8000/gutschein & done; wait'],
    },
    selbst: ['Spiele „Web 3: Die Kette“. Das Handout und begriff ssti helfen.'],
    uebung: { label: 'Arena: Web 3', href: 'arena:web3', erfordert: { arena: 'web3', level: 3 }, hinweis: 'Schaffe mindestens 3 Codes in Web 3.' },
  },
  {
    id: 's8', icon: '🔍', titel: 'Forensik: Spuren lesen',
    einleitung: 'Jetzt die andere Seite: Ein System wurde angegriffen – finde heraus, was passiert ist. Protokolle, Verläufe und Zeiten erzählen die Geschichte.',
    konzepte: [
      ['Log / Protokoll', 'Mitschrift, was passiert ist. Erste Anlaufstelle: /var/log/auth.log.'],
      ['Timeline', 'Die zeitliche Abfolge aus mehreren Protokollen zusammensetzen.'],
      ['Base64', 'Eine Umwandlung, keine Verschlüsselung – mit base64 -d lesbar machen.'],
    ],
    beispiel: {
      text: 'Zählen, wer am meisten Fehlversuche hatte, und eine versteckte Nachricht lesen:',
      befehle: ['grep "Failed password" auth.log | awk \'{print $(NF-3)}\' | sort | uniq -c | sort -rn', 'base64 -d .notiz'],
    },
    selbst: ['Spiele „Die Spurensuche“ (Einsteiger), dann „Der Einbruch“.'],
    uebung: { label: 'Arena: Die Spurensuche', href: 'arena:spuren', erfordert: { arena: 'spuren', level: 4 }, hinweis: 'Beantworte mindestens 4 Fragen in der Spurensuche.' },
  },
  {
    id: 's9', icon: '🕵️', titel: 'Forensik-Profi: den Maulwurf überführen',
    einleitung: 'Schwere Fälle: Zeitzonen, wiederverwendete IP-Adressen, heimlich hinausgeschmuggelte Daten. Hier zählt genaues Lesen und Kombinieren.',
    konzepte: [
      ['UTC / Zeitzone', 'Protokolle mischen Zeitzonen. 23:58 MEZ = 22:58 UTC – das entscheidet, wer es war.'],
      ['Exfiltration', 'Das heimliche Hinausschaffen von Daten, z. B. versteckt in DNS-Anfragen.'],
    ],
    beispiel: {
      text: 'Einen Unix-Zeitstempel in UTC umrechnen und Hex zurückwandeln:',
      befehle: ['date -u -d @1700000000', 'echo 48616c6c6f | xxd -r -p'],
    },
    selbst: ['Spiele „Der Einbruch“ und als Krönung „Der Maulwurf“ (Extrem).'],
    uebung: { label: 'Arena: Der Einbruch', href: 'arena:einbruch', erfordert: { arena: 'einbruch', level: 4 }, hinweis: 'Beantworte mindestens 4 Fragen im Einbruch.' },
  },
  {
    id: 's10', icon: '🛡️', titel: 'Verteidigung: gegen einen Angreifer bestehen',
    einleitung: 'Zum Abschluss die Verteidiger-Seite: Ein Angreifer greift live an, du musst die Lücken dichtmachen, bevor er Schaden anrichtet. Alles, was du gelernt hast, hilft dir jetzt beim Erkennen.',
    konzepte: [
      ['Least Privilege', 'Jeder bekommt nur die Rechte, die er wirklich braucht.'],
      ['Persistenz', 'Wie sich ein Angreifer festsetzt (Autostart, Cronjob) – und wie du das findest.'],
      ['Threat Hunting', 'Aktiv nach dem Angreifer suchen – auch wenn deine Werkzeuge belogen werden.'],
    ],
    beispiel: {
      text: 'Offene Ports samt Programm sehen und echte Prozesse prüfen (ohne getarnte Funktionen):',
      befehle: ['ss -tlnp', 'command ps -eo user,pid,args', 'cat ~/.bashrc ~/.profile'],
    },
    selbst: ['Spiele die Reihe „Angriff!“ – Stufe 1, dann 2, dann 3 (Extrem).'],
    uebung: { label: 'Arena: Angriff! Stufe 1', href: 'arena:abwehr1', erfordert: { arena: 'abwehr1', level: 5 }, hinweis: 'Wehre alle 5 Wellen in Angriff! Stufe 1 ab.' },
  },
  {
    id: 's11', icon: '🏆', titel: 'Meister: das ganze Rechenzentrum',
    einleitung: 'Die Abschlussprüfung. Jetzt kommt alles zusammen: Du verschaffst dir Zugang, pivotierst durch ein simuliertes internes Netz von Maschine zu Maschine, knackst einen Passwort-Hash, überlistest einen Dienst mit einem echten Buffer Overflow und arbeitest dich bis root durch.',
    konzepte: [
      ['Pivoting', 'Von einem übernommenen Rechner aus die nächsten im inneren Netz angreifen.'],
      ['Buffer Overflow', 'Zu viele Daten in einen zu kleinen Puffer – man überschreibt die Rücksprungadresse und lenkt das Programm um (ret2win).'],
      ['Eskalation', 'Über Fehlkonfigurationen vom kleinen Konto bis zu root.'],
    ],
    beispiel: {
      text: 'Die Gewinn-Funktion und ein ret-Gadget finden, dann die Rücksprungadresse überschreiben:',
      befehle: ['objdump -d pruefdienst | grep -A2 gewinn', 'python3 -c "import struct; print((b\'A\'*72+struct.pack(\'<Q\',WIN)).hex())"'],
    },
    selbst: ['Spiele „Der Meister: Das Rechenzentrum“. Nimm dir Zeit – das ist die härteste Arena.', 'Nutze das Handout und begriff pivoting / begriff buffer.'],
    uebung: { label: 'Arena: Der Meister', href: 'arena:meister', erfordert: { arena: 'meister', level: 4 }, hinweis: 'Schaffe mindestens 4 der 6 Codes im Rechenzentrum.' },
  },
  {
    id: 's12', icon: '⚔️', titel: 'Das Duell: gegen einen lebendigen Gegner',
    einleitung: 'Zum Abschluss: kein Drehbuch mehr. Ein Gegner schaut live, welche Lücken bei dir offen sind, nimmt sich eine zufällige davon vor und wird immer schneller. Alles, was du gelernt hast, zählt jetzt unter Zeitdruck.',
    konzepte: [
      ['Threat Hunting', 'Aktiv und schnell Schwachstellen bei dir selbst finden und schließen.'],
      ['Persistenz', 'Prozess beenden reicht nicht, wenn ein Autostart ihn neu bringt – beides entfernen.'],
      ['Least Privilege', 'Enge Rechte lassen dem Gegner weniger Angriffsfläche.'],
    ],
    beispiel: {
      text: 'Lage prüfen und einen laufenden Spion samt Autostart entfernen:',
      befehle: ['lage', 'ss -tlnp', 'kill PID', 'nano ~/.bashrc'],
    },
    selbst: ['Spiele „Das Duell: Mann gegen Maschine“. Je schneller du schließt, desto weniger Treffer landet der Gegner.'],
    uebung: { label: 'Arena: Das Duell', href: 'arena:duell', erfordert: { arena: 'duell', level: 6 }, hinweis: 'Mach im Duell alle 6 Lücken dicht.' },
  },
];
