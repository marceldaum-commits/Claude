// Level 1 – Linux Grundlagen
// Jede Übung: Lernziel, ein Arbeitsauftrag, Scope, verlangter Beleg, Knobelfrage, max. ein gestufter Hinweis, Nachbesprechung.
// Sandbox-Übungen laufen in der SIMULIERTEN Browser-Shell. Echte Übungen laufen in deiner Kali-VM bzw. Termux.

import { HOME } from '../shell.js';

const H = HOME;

// ---------------------------------------------------------------- Lektionen
export const LESSONS = [
  {
    id: 'l1-01', title: 'Terminal, Prompt und Benutzer', minutes: 12,
    intro: 'Bevor du irgendetwas tust, musst du zwei Dinge wissen: WER du gerade bist und WO du gerade arbeitest. Beides zeigt dir der Prompt – und beides kannst du mit zwei Befehlen belegen.',
    concepts: [
      {
        name: 'Der Prompt',
        zweck: 'Zeigt dir, dass die Shell auf einen Befehl wartet – und gibt Kontext.',
        syntax: 'benutzer@rechner:verzeichnis$',
        args: [['benutzer', 'unter welchem Konto du arbeitest'], ['rechner', 'auf welchem System (wichtig bei mehreren Terminals!)'], ['verzeichnis', '~ steht für dein Home-Verzeichnis'], ['$ / #', '$ = normaler Benutzer, # = root (Administrator)']],
        wirkung: 'Der Prompt selbst tut nichts. Er ist eine Anzeige.',
        fehler: ['Befehle im falschen Fenster eingeben (Prompt nicht gelesen).', 'Den Prompt mit in einen Befehl kopieren („$ ls“).'],
        regel: 'Lies vor JEDEM Befehl den Prompt: richtiges System? richtiger Benutzer? richtiges Verzeichnis?',
      },
      {
        name: 'pwd und whoami',
        zweck: 'pwd (print working directory) zeigt den absoluten Pfad des aktuellen Verzeichnisses. whoami zeigt den aktuellen Benutzernamen.',
        syntax: 'pwd\nwhoami',
        args: [['(keine)', 'Beide Befehle brauchen für den Alltag keine Argumente.']],
        wirkung: 'Nur Ausgabe – nichts wird verändert. Das macht sie zu sicheren ersten Belegen.',
        fehler: ['„~“ für einen echten Pfad halten – pwd zeigt den ausgeschriebenen Pfad, z. B. /home/kali.', 'Auf dem Handy wundern: Termux-Benutzer heißen z. B. u0_a123, das Home liegt unter /data/data/com.termux/files/home.'],
        regel: 'Ein Beleg ist die tatsächliche Ausgabe, nicht deine Vermutung darüber.',
      },
    ],
    exercises: ['e1-01s', 'e1-01r'],
  },
  {
    id: 'l1-02', title: 'Pfade und Navigation', minutes: 15,
    intro: 'Linux hat einen einzigen Verzeichnisbaum, der bei / beginnt. Jede Datei hat einen eindeutigen Pfad. Wer Pfade sicher liest, löscht und überschreibt nichts aus Versehen.',
    concepts: [
      {
        name: 'Absolute und relative Pfade',
        zweck: 'Dateien eindeutig ansprechen.',
        syntax: '/home/seppi/lab   (absolut, beginnt mit /)\nlab/notiz.txt      (relativ zum aktuellen Verzeichnis)',
        args: [['/', 'Wurzel des Baums'], ['~', 'dein Home-Verzeichnis'], ['.', 'aktuelles Verzeichnis'], ['..', 'übergeordnetes Verzeichnis']],
        wirkung: 'Ein relativer Pfad bedeutet je nach Standort etwas anderes – ein absoluter immer dasselbe.',
        fehler: ['„/lab“ schreiben, obwohl „~/lab“ gemeint ist.', 'Leerzeichen in Namen ohne Anführungszeichen.'],
        regel: 'Bei verändernden Befehlen (rm, mv, cp, chmod) lieber absolute Pfade oder vorher pwd.',
      },
      {
        name: 'cd und ls',
        zweck: 'cd wechselt das Verzeichnis, ls zeigt Inhalte.',
        syntax: 'cd PFAD   ·   cd ..   ·   cd ~   ·   cd -\nls   ·   ls -l   ·   ls -a   ·   ls PFAD',
        args: [['cd ..', 'eine Ebene hoch'], ['cd -', 'zurück zum vorherigen Verzeichnis'], ['ls -l', 'Langformat (Rechte, Besitzer, Größe, Datum)'], ['ls -a', 'auch versteckte Einträge (Name beginnt mit .)']],
        wirkung: 'cd ändert nur deinen Standort. ls liest nur.',
        fehler: ['cd auf eine Datei statt einen Ordner.', 'Groß-/Kleinschreibung: Linux unterscheidet Notizen und notizen.'],
        regel: 'Erst ls, dann handeln: schau dir an, was da ist.',
      },
    ],
    exercises: ['e1-02s', 'd1-pfade'],
  },
  {
    id: 'l1-03', title: 'Dateien und Ordner anlegen, umbenennen, löschen', minutes: 15,
    intro: 'Für jeden Fall legst du eine saubere Ablage an. Dazu brauchst du mkdir, touch, mv und – vorsichtig – rm.',
    concepts: [
      {
        name: 'mkdir, touch, mv',
        zweck: 'Ordner anlegen, leere Dateien anlegen, verschieben/umbenennen.',
        syntax: 'mkdir [-p] ORDNER\ntouch DATEI\nmv QUELLE ZIEL',
        args: [['-p', 'legt fehlende Elternordner mit an und meckert nicht, wenn es den Ordner schon gibt'], ['mv a b', 'benennt a in b um – ist b ein Ordner, wird a hineingeschoben']],
        wirkung: 'Verändert das Dateisystem.',
        fehler: ['mkdir a/b/c ohne -p, wenn a/b noch fehlt.', 'mv überschreibt ein vorhandenes Ziel OHNE Rückfrage.'],
        regel: 'Vor mv: Existiert das Ziel schon? (ls ZIEL)',
      },
      {
        name: 'rm und rmdir',
        zweck: 'Dateien bzw. leere Ordner löschen.',
        syntax: 'rm DATEI   ·   rm -r ORDNER   ·   rmdir LEERER_ORDNER',
        args: [['-r', 'rekursiv: Ordner mit allem Inhalt'], ['-f', 'ohne Rückfrage/Fehlermeldung – vermeiden, solange du lernst']],
        wirkung: 'Endgültig. Es gibt keinen Papierkorb im Terminal.',
        fehler: ['Leerzeichen an der falschen Stelle: „rm -r ~/lab /alt“ löscht ZWEI Pfade.', 'Wildcards (*) ungeprüft benutzen.'],
        regel: 'Vor rm: erst ls mit genau demselben Pfad. Sieht die Liste richtig aus, dann rm.',
      },
    ],
    exercises: ['e1-03s'],
  },
  {
    id: 'l1-04', title: 'Ein- und Ausgabe, Umleitung', minutes: 15,
    intro: 'Belege müssen festgehalten werden. Mit Umleitungen schreibst du Ausgaben direkt in Dateien – und verstehst, warum Fehlermeldungen manchmal trotzdem im Terminal erscheinen.',
    concepts: [
      {
        name: 'echo und cat',
        zweck: 'echo gibt Text aus, cat gibt Dateiinhalte aus.',
        syntax: 'echo "Text"\ncat DATEI   ·   cat -n DATEI',
        args: [['-n (cat)', 'Zeilennummern anzeigen']],
        wirkung: 'Nur Ausgabe – bis du sie umleitest.',
        fehler: ['Anführungszeichen vergessen bei Text mit Sonderzeichen.'],
        regel: 'Nach jedem Schreiben mit cat kontrollieren, was wirklich in der Datei steht.',
      },
      {
        name: 'Umleitung: >, >> und 2>',
        zweck: 'Ausgabe in Dateien schreiben.',
        syntax: 'BEFEHL > DATEI    (überschreiben)\nBEFEHL >> DATEI   (anhängen)\nBEFEHL 2> DATEI   (Fehlerausgabe umleiten)',
        args: [['stdout (1)', 'normale Ausgabe'], ['stderr (2)', 'Fehlermeldungen – eigener Kanal!']],
        wirkung: '> leert die Zieldatei SOFORT, bevor der Befehl läuft.',
        fehler: ['> statt >> – und die bisherige Zeitlinie ist weg.', 'Erwarten, dass > auch Fehlermeldungen einfängt.'],
        regel: 'Bei bestehenden Dateien zweimal hinsehen: > oder >>?',
      },
    ],
    exercises: ['e1-04s'],
  },
  {
    id: 'l1-05', title: 'Sicherungen mit cp', minutes: 12,
    intro: 'Bevor du eine Konfiguration änderst, sicherst du sie. Nur so kannst du eine Änderung zurücknehmen und vorher/nachher vergleichen.',
    concepts: [
      {
        name: 'cp',
        zweck: 'Dateien und Ordner kopieren.',
        syntax: 'cp QUELLE ZIEL\ncp -p QUELLE ZIEL   (Rechte & Zeitstempel erhalten)\ncp -r ORDNER ZIEL   (rekursiv)\ncp -a ORDNER ZIEL   (Archiv: rekursiv + alles erhalten)',
        args: [['-p', 'preserve: Rechte, Zeitstempel'], ['-r', 'Ordner mit Inhalt'], ['-a', 'Archivmodus – für echte Sicherungen']],
        wirkung: 'Legt eine Kopie an. Existiert das Ziel, wird es ohne Rückfrage überschrieben.',
        fehler: ['Sicherung NACH der Änderung anlegen.', 'Sicherung mit gleichem Namen überschreiben.', 'Ohne -p verliert die Kopie den Original-Zeitstempel.'],
        regel: 'Konvention: DATEI.bak (oder mit Datum) im selben Ordner; danach mit ls -l und cat prüfen.',
      },
    ],
    exercises: ['e1-05s', 'w1-01'],
  },
  {
    id: 'l1-06', title: 'Rechte: rwx, ls -l und chmod', minutes: 20,
    intro: 'Rechte entscheiden, wer eine Datei lesen, ändern oder ausführen darf. Falsche Rechte sind einer der häufigsten Befunde in echten Sicherheitsprüfungen.',
    concepts: [
      {
        name: 'ls -l lesen',
        zweck: 'Rechte, Besitzer und Gruppe einer Datei erkennen.',
        syntax: '-rw-r----- 1 seppi seppi 120 Okt 31 08:00 notiz.txt',
        args: [['1. Zeichen', '- Datei, d Ordner'], ['rw-', 'Besitzer (u)'], ['r--', 'Gruppe (g)'], ['---', 'alle anderen (o)'], ['r/w/x', 'lesen (4) / schreiben (2) / ausführen (1)']],
        wirkung: 'Bei Ordnern bedeutet x: hineinwechseln dürfen; r: Inhalt auflisten.',
        fehler: ['Die drei Dreiergruppen verwechseln.', 'Annahme: „Besitzer“ heißt automatisch „ich“ – erst den Namen lesen!'],
        regel: 'Prüfe Rechte immer am Beleg (ls -l oder stat), nicht aus der Erinnerung.',
      },
      {
        name: 'chmod numerisch und symbolisch',
        zweck: 'Rechte ändern.',
        syntax: 'chmod 640 DATEI\nchmod u+x DATEI · chmod g-w DATEI · chmod o= DATEI',
        args: [['640', 'u=6 (4+2: rw), g=4 (r), o=0 (nichts)'], ['u/g/o/a', 'user, group, others, all'], ['+ - =', 'hinzufügen, entfernen, exakt setzen']],
        wirkung: 'Nur der Besitzer (oder root) darf Rechte ändern.',
        fehler: ['chmod 777 „damit es geht“ – damit darf es jeder.', 'Ordner ohne x: Man kommt nicht mehr hinein.'],
        regel: 'So wenig Rechte wie nötig. Nach chmod: ls -l als Retest.',
      },
      {
        name: 'stat',
        zweck: 'Metadaten genau anzeigen – inklusive oktaler Rechte.',
        syntax: "stat DATEI\nstat -c '%a %A %n' DATEI",
        args: [['%a', 'Rechte oktal (640)'], ['%A', 'Rechte als rwx'], ['%n', 'Name']],
        wirkung: 'Nur Ausgabe.',
        fehler: ['Auf dem Handy in ~/storage/shared arbeiten: Android ignoriert dort Linux-Rechte.'],
        regel: 'Für Belege: stat -c ist eindeutiger als ls -l.',
      },
    ],
    exercises: ['e1-06s', 'e1-06r', 'd1-chmod'],
  },
  {
    id: 'l1-07', title: 'Prozesse: PID, PPID, Jobs und kill', minutes: 20,
    intro: 'Jedes laufende Programm ist ein Prozess mit einer Nummer (PID). Wer ihn gestartet hat, steht in der PPID. Im Vorfall musst du einen Prozess eindeutig identifizieren, bevor du ihn beendest.',
    concepts: [
      {
        name: 'ps',
        zweck: 'Prozesse anzeigen.',
        syntax: 'ps   ·   ps -ef   ·   ps -o pid,ppid,args',
        args: [['PID', 'Prozess-ID'], ['PPID', 'Parent-PID: wer hat den Prozess gestartet'], ['-ef', 'alle Prozesse, ausführlich'], ['-o pid,ppid,args', 'eigene Spaltenauswahl; args = vollständige Befehlszeile (cmd ist ein Alias auf Kali)']],
        wirkung: 'Nur Ausgabe – eine Momentaufnahme.',
        fehler: ['PIDs aus einer älteren Ausgabe verwenden – PIDs werden wiederverwendet.', 'Den grep-Prozess selbst für den gesuchten halten (ps -ef | grep sleep).'],
        regel: 'Identifiziere einen Prozess über PID UND Befehlszeile, nie nur über den Namen.',
      },
      {
        name: 'Hintergrund, jobs, kill',
        zweck: 'Prozesse im Hintergrund starten, auflisten und gezielt beenden.',
        syntax: 'sleep 300 &\njobs -l\nkill PID   ·   kill %1   ·   kill -9 PID',
        args: [['&', 'am Zeilenende: im Hintergrund starten'], ['%1', 'Job Nummer 1 dieser Shell'], ['Signal 15 (TERM)', 'Standard: höflich beenden'], ['Signal 9 (KILL)', 'erzwingen – nur wenn TERM nicht wirkt']],
        wirkung: 'kill sendet ein Signal; ob der Prozess endet, prüfst du danach (Retest).',
        fehler: ['Sofort kill -9 statt erst TERM.', 'Den falschen Prozess treffen, weil zwei gleich heißen.'],
        regel: 'Nur eigene, eindeutig identifizierte Prozesse beenden – und danach mit ps prüfen.',
      },
    ],
    exercises: ['e1-07s', 'e1-07r'],
  },
  {
    id: 'l1-08', title: 'Suchen mit find und grep', minutes: 20,
    intro: 'find sucht Dateien nach Eigenschaften (Name, Typ, Rechte). grep sucht Text IN Dateien. Zusammen sind sie dein wichtigstes Ermittlungswerkzeug.',
    concepts: [
      {
        name: 'find',
        zweck: 'Dateien und Ordner nach Eigenschaften finden.',
        syntax: 'find START -name "MUSTER"\nfind START -type f -name "*.conf"\nfind START -perm -o=w',
        args: [['START', 'wo die Suche beginnt (z. B. ~/kly-lab)'], ['-name / -iname', 'Name (mit/ohne Groß-Klein), Muster in Anführungszeichen!'], ['-type f / d', 'nur Dateien / nur Ordner'], ['-perm -o=w', 'mindestens: andere dürfen schreiben']],
        wirkung: 'Nur Ausgabe. Achtung: find kann mit -delete/-exec auch verändern – das nutzen wir hier nicht.',
        fehler: ['Muster ohne Anführungszeichen – die Shell expandiert * vorher.', 'Bei / starten und in tausend „Keine Berechtigung“ ertrinken.'],
        regel: 'Suche immer im kleinsten sinnvollen Startordner.',
      },
      {
        name: 'grep',
        zweck: 'Zeilen finden, die ein Muster enthalten.',
        syntax: 'grep MUSTER DATEI\ngrep -rn MUSTER ORDNER',
        args: [['-i', 'Groß-/Kleinschreibung ignorieren'], ['-n', 'Zeilennummer'], ['-r', 'rekursiv durch Ordner'], ['-c', 'nur Anzahl'], ['-v', 'Zeilen OHNE Muster'], ['-l', 'nur Dateinamen']],
        wirkung: 'Nur Ausgabe.',
        fehler: ['„Nichts gefunden“ als Beweis für „nicht vorhanden“ werten.', 'Sonderzeichen wie . oder * im Muster nicht bedenken.'],
        regel: 'Notiere bei Treffern immer Datei UND Zeilennummer – das ist ein prüfbarer Beleg.',
      },
    ],
    exercises: ['e1-08s', 'e1-08r'],
  },
  {
    id: 'l1-09', title: 'Pipes und Zählen', minutes: 15,
    intro: 'Mit der Pipe | wird die Ausgabe eines Befehls zur Eingabe des nächsten. So baust du aus kleinen Werkzeugen eine Analyse.',
    concepts: [
      {
        name: 'Pipe |',
        zweck: 'Befehle verketten.',
        syntax: 'BEFEHL1 | BEFEHL2 | BEFEHL3',
        args: [['|', 'stdout links → stdin rechts (stderr geht NICHT durch die Pipe)']],
        wirkung: 'Jeder Schritt filtert oder verarbeitet weiter.',
        fehler: ['Zu lange Ketten auf einmal – baue sie Schritt für Schritt und prüfe jeden Zwischenstand.'],
        regel: 'Erst den ersten Befehl allein ausführen und die Ausgabe ansehen, dann erweitern.',
      },
      {
        name: 'wc, sort, uniq, head, tail',
        zweck: 'Zählen, sortieren, Duplikate zusammenfassen, Anfang/Ende zeigen.',
        syntax: 'grep "Failed" auth.log | wc -l\ncut -d" " -f5 datei | sort | uniq -c | sort -nr | head -3',
        args: [['wc -l', 'Zeilen zählen'], ['sort -n / -r', 'numerisch / umgekehrt'], ['uniq -c', 'gleiche FOLGEZEILEN zählen – deshalb vorher sort'], ['head -n 3', 'erste 3 Zeilen']],
        wirkung: 'Nur Ausgabe.',
        fehler: ['uniq ohne vorheriges sort.', 'wc -l zählt Zeilen, nicht Ereignisse – prüfe, ob jede Zeile ein Ereignis ist.'],
        regel: 'Eine Zahl ist nur ein Beleg, wenn klar ist, WAS gezählt wurde.',
      },
    ],
    exercises: ['e1-09s', 'd1-pipes'],
  },
  {
    id: 'l1-10', title: 'curl, HTTP-Header und Statuscodes', minutes: 20,
    intro: 'curl ist das erste echte Kali-Werkzeug in deinem Werkzeugkasten. Damit sprichst du mit Webdiensten – und liest, was sie über sich verraten.',
    concepts: [
      {
        name: 'curl',
        zweck: 'HTTP-Anfragen senden und Antworten anzeigen.',
        syntax: 'curl URL\ncurl -I URL   (nur Header, HEAD-Anfrage)\ncurl -i URL   (Header + Inhalt)\ncurl -s URL   (still, ohne Fortschritt)',
        args: [['-I', 'sendet HEAD und zeigt nur die Antwort-Header'], ['-i', 'zeigt Header UND Body'], ['-o DATEI', 'Antwort in Datei speichern']],
        wirkung: 'Sendet eine Anfrage an das Ziel – das ist bereits eine Handlung gegenüber einem System!',
        fehler: ['Fremde Seiten „mal eben testen“ – nicht erlaubt.', 'https auf einen reinen http-Dienst (Fehler 35).'],
        regel: 'Nur Ziele im Scope: in Level 1 ausschließlich 127.0.0.1 / localhost.',
      },
      {
        name: 'Statuscodes und Header',
        zweck: 'Antworten deuten.',
        syntax: 'HTTP/1.0 200 OK\nServer: SimpleHTTP/0.6 Python/3.x\nContent-Type: text/html',
        args: [['2xx', 'Erfolg (200 OK)'], ['3xx', 'Weiterleitung'], ['4xx', 'Clientfehler: 403 verboten, 404 nicht gefunden'], ['5xx', 'Serverfehler'], ['curl: (7)', 'keine Verbindung – es lauscht niemand (oder Firewall)']],
        wirkung: 'Header sind Selbstauskünfte des Servers – sie können falsch oder absichtlich verändert sein.',
        fehler: ['Server-Header als Beweis für die tatsächliche Software werten.'],
        regel: 'Header sind ein Hinweis. Eine Gegenprobe (z. B. ps) macht daraus einen Beleg.',
      },
    ],
    exercises: ['e1-10s', 'e1-10r'],
  },
  {
    id: 'l1-11', title: 'Erste DNS-Fehlersuche', minutes: 15,
    intro: 'Wenn „die Seite nicht geht“, liegt es oft nicht am Dienst, sondern an der Namensauflösung. Du lernst, beides sauber zu trennen.',
    concepts: [
      {
        name: 'Namen und Adressen',
        zweck: 'Rechner sprechen über IP-Adressen; Namen werden vorher aufgelöst.',
        syntax: '/etc/hosts       (lokale Zuordnungen)\n/etc/resolv.conf (welcher DNS-Server gefragt wird)\ngetent hosts NAME',
        args: [['getent hosts', 'fragt die Quellen ab, die auch Programme nutzen (hosts-Datei, DNS)'], ['curl: (6)', 'Name konnte nicht aufgelöst werden']],
        wirkung: 'Nur lesen.',
        fehler: ['Tippfehler im Namen übersehen.', 'Bei (6) den Dienst neu starten wollen – der Dienst ist gar nicht das Problem.'],
        regel: 'Teile das Problem: Geht es mit der IP? Dann ist es die Namensauflösung. Geht es mit der IP auch nicht? Dann Dienst/Verbindung.',
      },
    ],
    exercises: ['e1-11s', 'e1-11r', 'w1-02'],
  },
];

// ---------------------------------------------------------------- Hilfen für Sandbox-Setups
function lab(sh, files) {
  for (const [p, c, m] of files) sh.fs.put(p.startsWith('/') ? p : H + '/' + p, c, m);
}

const AUTH_LOG = [
  'Oct 31 07:58:01 kali sshd[811]: Accepted publickey for seppi from 127.0.0.1 port 50122',
  'Oct 31 07:59:12 kali sshd[812]: Failed password for admin from 10.13.37.21 port 40110',
  'Oct 31 07:59:14 kali sshd[812]: Failed password for admin from 10.13.37.21 port 40112',
  'Oct 31 07:59:15 kali sshd[813]: Failed password for root from 10.13.37.21 port 40114',
  'Oct 31 08:00:02 kali CRON[900]: pam_unix(cron:session): session opened for user root',
  'Oct 31 08:01:40 kali sshd[820]: Failed password for test from 10.13.37.44 port 51001',
  'Oct 31 08:01:41 kali sshd[820]: Failed password for test from 10.13.37.44 port 51003',
  'Oct 31 08:02:10 kali sshd[825]: Accepted password for seppi from 127.0.0.1 port 50200',
  'Oct 31 08:03:55 kali sshd[830]: Failed password for admin from 10.13.37.21 port 40190',
  'Oct 31 08:04:01 kali sshd[831]: failed password check skipped (Info, kein Login-Versuch)',
].join('\n') + '\n';

// ---------------------------------------------------------------- Übungen
export const EXERCISES = [
  // ---------------------------------------------------- L1-01
  {
    id: 'e1-01s', lesson: 'l1-01', kind: 'sandbox', required: true, xp: 10,
    title: 'Wer bin ich, wo bin ich?',
    ziel: 'Benutzer und Arbeitsverzeichnis selbst belegen statt raten.',
    auftrag: 'Die Sandbox-Shell startet an einem dir unbekannten Ort. Stelle mit zwei passenden Befehlen fest, als welcher Benutzer du arbeitest und in welchem Verzeichnis du gerade stehst.',
    scope: 'Nur die Sandbox-Simulation. Nichts verändern.',
    beleg: 'Beide Befehle wurden ausgeführt; ihre Ausgaben stehen im Sandbox-Terminal.',
    sandbox: {
      setup(sh) { lab(sh, [['lab/einsatz/tag1', null]]); sh.cwd = H + '/lab/einsatz/tag1'; },
      check(sh) {
        const a = sh.usedCommand('pwd'), b = sh.usedCommand('whoami');
        if (a && b) return { ok: true, msg: 'Beide Belege liegen vor.' };
        return { ok: false, msg: !a && !b ? 'Noch kein Beleg im Terminal. Welche zwei Fragen musst du beantworten – und welcher Befehl beantwortet welche?' : !a ? 'Der Benutzer ist belegt. Woher weißt du sicher, in welchem Verzeichnis du stehst – vom Prompt allein?' : 'Der Ort ist belegt. Welcher Befehl nennt den Benutzer ausdrücklich?' };
      },
    },
    knobel: {
      q: 'Dein Prompt endet auf „…/tag1$“. Was sagt dir das $-Zeichen?',
      options: [
        { t: 'Ich arbeite als normaler Benutzer, nicht als root.', ok: true },
        { t: 'Der letzte Befehl war erfolgreich.', why: 'Woran würdest du den Erfolg eines Befehls wirklich erkennen – am Prompt oder an Ausgabe und Rückgabewert?' },
        { t: 'Ich bin root.', why: 'Welches Zeichen zeigt eine root-Shell typischerweise an?' },
        { t: 'Es leitet eine Variable ein.', why: 'Steht das $ hier in einem Befehl, den du eingibst – oder in der Anzeige der Shell?' },
      ],
    },
    hinweis: 'Ein Befehl beantwortet „wer“ – sein Name klingt wie die englische Frage danach. Der andere ist eine Abkürzung für „print working directory“.',
    nach: {
      beobachtung: 'pwd lieferte einen absoluten Pfad, whoami einen Benutzernamen.',
      schluss: 'Du kennst jetzt den Kontext, in dem jeder weitere Befehl wirkt.',
      grenzen: 'whoami sagt nichts über zusätzliche Rechte (z. B. sudo-Gruppe). Dafür gibt es id.',
      naechster: 'Mach dasselbe im echten Terminal und vergleiche.',
    },
  },
  {
    id: 'e1-01r', lesson: 'l1-01', kind: 'real', required: true, xp: 15,
    title: 'Echter Kontext-Beleg',
    ziel: 'Den ersten echten Beleg aus deinem eigenen Terminal sauber übernehmen.',
    auftrag: 'Ermittle in deinem echten Terminal deinen Benutzer und dein aktuelles Verzeichnis. Trage die Befehle ein und füge die unveränderte Ausgabe ein.',
    scope: 'Nur dein eigenes Gerät. Die Befehle lesen nur.',
    beleg: 'Ausgabe mit einem absoluten Pfad und einem Benutzernamen.',
    real: {
      voraus: { pc: 'Kali-VM gestartet, Terminal offen.', phone: 'Termux (oder NetHunter-Terminal) offen.' },
      setup: null,
      cleanup: 'Nichts nötig – es wurde nichts verändert.',
      spec: {
        commandRe: [/\bpwd\b/, /\bwhoami\b/],
        commandHint: 'Hast du wirklich beide Fragen (wer? wo?) mit je einem Befehl beantwortet und beide Befehle eingetragen?',
        criteria: [
          { re: /^\/\S*\s*$/m, label: 'Ausgabe enthält einen absoluten Pfad', rueckfrage: 'Womit beginnt ein absoluter Pfad? Findest du so eine Zeile in deiner Ausgabe?' },
          { re: /^(?!\/)[a-z_][a-z0-9_.-]*\s*$/m, label: 'Ausgabe enthält einen Benutzernamen', rueckfrage: 'Welche Zeile deiner Ausgabe ist der Benutzername? Hast du sie mit eingefügt?' },
        ],
      },
    },
    knobel: {
      q: 'Dein pwd zeigt /home/kali. Belegt das, dass du Administratorrechte hast?',
      options: [
        { t: 'Nein. Es zeigt nur, wo ich stehe – nicht, welche Rechte ich habe.', ok: true },
        { t: 'Ja, weil /home zum System gehört.', why: 'Wem gehört dein Home-Verzeichnis normalerweise – dem System oder dir?' },
        { t: 'Ja, auf Kali ist man immer root.', why: 'Was zeigt dir whoami gerade an – root?' },
      ],
    },
    hinweis: 'Gib die beiden Befehle nacheinander ein (oder mit ; getrennt) und kopiere beide Ausgabezeilen.',
    nach: {
      beobachtung: 'Ein absoluter Pfad und ein Benutzername aus deinem System.',
      schluss: 'Belege kommen aus Ausgaben, nicht aus Annahmen.',
      grenzen: 'Die App prüft die Form deiner Ausgabe; sie kann nicht sehen, dass sie aus deinem Terminal stammt. Ehrlichkeit ist Teil der Methode.',
      naechster: 'Lektion „Pfade und Navigation“.',
    },
  },

  // ---------------------------------------------------- L1-02
  {
    id: 'e1-02s', lesson: 'l1-02', kind: 'sandbox', required: true, xp: 10,
    title: 'Die verlegte Akte',
    ziel: 'Sich mit cd und ls selbstständig durch einen unbekannten Baum bewegen.',
    auftrag: 'Irgendwo unter ~/lab liegt die Datei ziel.txt. Finde sie nur mit ls und cd und wechsle in genau den Ordner, in dem sie liegt.',
    scope: 'Sandbox, nur ~/lab. Nichts verändern; find ist hier noch nicht erlaubt.',
    beleg: 'Dein Arbeitsverzeichnis ist am Ende der Ordner mit ziel.txt.',
    sandbox: {
      setup(sh) {
        lab(sh, [
          ['lab/projekte/alpha/docs/readme.txt', 'Projekt Alpha\n'], ['lab/projekte/beta/notiz.txt', 'nichts hier\n'],
          ['lab/archiv/2025/dezember/alt.txt', 'alt\n'], ['lab/archiv/2026/september/log.txt', 'log\n'],
          ['lab/archiv/2026/oktober/ziel.txt', 'Gefunden. Gute Navigation.\n'], ['lab/archiv/2026/oktober/.versteckt', 'hallo\n'],
        ]);
      },
      check(sh) {
        if (sh.usedCommand('find')) return { ok: false, msg: 'find ist in dieser Übung noch nicht erlaubt – es geht ums Navigieren. Starte die Übung neu und arbeite mit ls und cd.' };
        if (sh.cwd === H + '/lab/archiv/2026/oktober') return { ok: true, msg: 'Du stehst im richtigen Ordner.' };
        return { ok: false, msg: `Du stehst in ${sh.cwd}. Liegt ziel.txt hier? Was zeigt ls an dieser Stelle?` };
      },
    },
    knobel: {
      q: 'Du stehst in ~/lab/archiv. Welcher RELATIVE Pfad führt von dort nach ~/lab/projekte?',
      options: [
        { t: '../projekte', ok: true },
        { t: '/projekte', why: 'Beginnt dieser Pfad relativ oder an der Wurzel /?' },
        { t: 'projekte', why: 'Liegt projekte innerhalb von archiv – was zeigt ls dort?' },
        { t: '~/lab/projekte', why: 'Funktioniert, aber ist das relativ zu deinem Standort?' },
      ],
    },
    hinweis: 'Arbeite systematisch: ls zeigt die Möglichkeiten, cd geht eine Ebene tiefer, cd .. wieder zurück. Jahreszahlen sind ein Hinweis auf die Ordnung.',
    nach: {
      beobachtung: 'Der Baum war nach Projekt und Datum geordnet.',
      schluss: 'Mit ls → cd → ls findest du dich in jedem Baum zurecht.',
      grenzen: 'Bei großen Bäumen ist das langsam – dafür lernst du später find.',
      naechster: 'Wie legst du selbst eine saubere Fallablage an?',
    },
  },
  {
    id: 'd1-pfade', lesson: 'l1-02', kind: 'drill', required: false, xp: 5,
    title: 'Drill: Absolut und relativ',
    ziel: 'Relative Pfade sicher bilden.',
    auftrag: 'Du startest in ~/lab/a/b. Wechsle mit EINEM cd-Befehl und einem relativen Pfad nach ~/lab/c/d.',
    scope: 'Sandbox.',
    beleg: 'Arbeitsverzeichnis ~/lab/c/d, erreicht mit genau einem relativen cd.',
    sandbox: {
      setup(sh) { lab(sh, [['lab/a/b', null], ['lab/c/d', null]]); sh.cwd = H + '/lab/a/b'; },
      check(sh) {
        const cds = sh.log.filter(l => /^cd\s/.test(l.line));
        const last = cds[cds.length - 1];
        if (sh.cwd !== H + '/lab/c/d') return { ok: false, msg: 'Du bist noch nicht in ~/lab/c/d. Wie viele Ebenen musst du von b aus hoch, bevor du nach c/d hinunter kannst?' };
        if (cds.length !== 1 || /^cd\s+[~/]/.test(last.line)) return { ok: false, msg: 'Ziel erreicht – aber mit genau EINEM relativen cd? Starte neu und versuch es in einem Schritt.' };
        return { ok: true, msg: 'Sauber in einem Schritt.' };
      },
    },
    knobel: {
      q: 'Warum ist ein relativer Pfad in einem Löschbefehl riskanter als ein absoluter?',
      options: [
        { t: 'Weil seine Bedeutung vom aktuellen Standort abhängt.', ok: true },
        { t: 'Weil relative Pfade langsamer sind.', why: 'Geht es bei Risiko um Geschwindigkeit oder darum, WAS getroffen wird?' },
        { t: 'Weil rm relative Pfade nicht kennt.', why: 'Probier gedanklich: rm notiz.txt – funktioniert das?' },
      ],
    },
    hinweis: 'Zähle: von b nach a ist eine Ebene, von a nach lab die zweite.',
    nach: { beobachtung: '../../c/d führt zwei Ebenen hoch und zwei hinunter.', schluss: 'Relative Pfade sind kurz, aber standortabhängig.', grenzen: '—', naechster: 'Wiederhole mit anderen Startpunkten im Terminal.' },
  },

  // ---------------------------------------------------- L1-03
  {
    id: 'e1-03s', lesson: 'l1-03', kind: 'sandbox', required: true, xp: 10,
    title: 'Fallablage anlegen',
    ziel: 'Eine saubere Ordnerstruktur anlegen und eine falsche Datei gezielt entfernen.',
    auftrag: 'Lege für Fall 01 die Ordner ~/lab/fall-01/notizen und ~/lab/fall-01/belege an, darin die leere Datei belege/README, und entferne die versehentlich angelegte Datei ~/lab/fall-01/temp.tmp. Alles andere bleibt unangetastet.',
    scope: 'Sandbox, nur ~/lab/fall-01.',
    beleg: 'Struktur vorhanden, temp.tmp gelöscht, wichtig.txt unverändert.',
    sandbox: {
      setup(sh) { lab(sh, [['lab/fall-01/temp.tmp', 'Müll\n'], ['lab/fall-01/wichtig.txt', 'Nicht löschen: Übergabe von der Frühschicht.\n']]); },
      check(sh) {
        const miss = [];
        if (sh.node('~/lab/fall-01/notizen')?.t !== 'd') miss.push('notizen-Ordner');
        if (sh.node('~/lab/fall-01/belege')?.t !== 'd') miss.push('belege-Ordner');
        if (sh.node('~/lab/fall-01/belege/README')?.t !== 'f') miss.push('belege/README');
        if (sh.node('~/lab/fall-01/temp.tmp')) miss.push('temp.tmp ist noch da');
        if (sh.read('~/lab/fall-01/wichtig.txt') !== 'Nicht löschen: Übergabe von der Frühschicht.\n') return { ok: false, msg: 'wichtig.txt wurde verändert oder gelöscht. Was hätte vor dem Löschen geholfen? Starte die Übung neu.' };
        return miss.length ? { ok: false, msg: 'Noch offen: ' + miss.join(', ') + '. Prüfe mit ls -la ~/lab/fall-01 und ls ~/lab/fall-01/belege.' } : { ok: true, msg: 'Ablage steht, nichts Falsches gelöscht.' };
      },
    },
    knobel: {
      q: '„mkdir lab/fall-02/notizen“ meldet „Datei oder Verzeichnis nicht gefunden“. Wahrscheinlichste Ursache?',
      options: [
        { t: 'fall-02 existiert noch nicht und -p fehlt.', ok: true },
        { t: 'Mir fehlen Schreibrechte.', why: 'Wie lautet die Meldung bei fehlenden Rechten – auch „nicht gefunden“?' },
        { t: 'notizen existiert bereits.', why: 'Welche Meldung gibt mkdir, wenn ein Ordner schon da ist?' },
        { t: 'mkdir ist nicht installiert.', why: 'Dann würde die Shell etwas anderes melden – was genau?' },
      ],
    },
    hinweis: 'Eine Option von mkdir legt Zwischenordner automatisch mit an. Vor dem Löschen: ls mit genau dem Pfad.',
    nach: {
      beobachtung: 'Ordner mit mkdir -p, Datei mit touch, gezieltes rm.',
      schluss: 'Eine feste Ablage (notizen/belege) macht spätere Berichte einfach.',
      grenzen: 'rm hat keinen Papierkorb. Ein Tippfehler bei -r kann viel mehr löschen.',
      naechster: 'Belege in Dateien schreiben.',
    },
  },

  // ---------------------------------------------------- L1-04
  {
    id: 'e1-04s', lesson: 'l1-04', kind: 'sandbox', required: true, xp: 10,
    title: 'Zeitlinie schreiben',
    ziel: '> und >> bewusst einsetzen.',
    auftrag: 'Ersetze den veralteten Inhalt von ~/lab/fall-01/notizen/zeitlinie.txt so, dass die Datei danach GENAU diese drei Zeilen in dieser Reihenfolge enthält:\n08:00 Alarm eingegangen\n08:05 Scope geklärt\n08:10 Analyse gestartet',
    scope: 'Sandbox, nur diese Datei.',
    beleg: 'Dateiinhalt exakt wie gefordert (prüfe selbst mit cat).',
    sandbox: {
      setup(sh) { lab(sh, [['lab/fall-01/notizen/zeitlinie.txt', 'ALT: Entwurf von gestern\n']]); },
      check(sh) {
        const c = sh.read('~/lab/fall-01/notizen/zeitlinie.txt');
        const want = '08:00 Alarm eingegangen\n08:05 Scope geklärt\n08:10 Analyse gestartet\n';
        if (c === null) return { ok: false, msg: 'Die Datei fehlt. Wo genau sollte sie liegen?' };
        if (c === want) return { ok: true, msg: 'Zeitlinie exakt.' };
        if (c.includes('ALT')) return { ok: false, msg: 'Der alte Inhalt steht noch drin. Welcher Operator ÜBERSCHREIBT statt anzuhängen?' };
        const lines = c.split('\n').filter(Boolean).length;
        return { ok: false, msg: `Die Datei hat ${lines} Zeile(n) und weicht ab. Was zeigt cat -n? Stimmen Anzahl, Reihenfolge und Schreibweise?` };
      },
    },
    knobel: {
      q: '„ls /root > liste.txt“: liste.txt ist leer, im Terminal steht „Keine Berechtigung“. Warum landet die Meldung nicht in der Datei?',
      options: [
        { t: 'Fehlermeldungen laufen über stderr; > leitet nur stdout um.', ok: true },
        { t: 'Weil die Datei schreibgeschützt ist.', why: 'Wurde liste.txt denn angelegt? Was heißt das für die Schreibrechte?' },
        { t: 'Weil ls bei Fehlern gar nichts ausgibt.', why: 'Wo genau erschien dann der Text „Keine Berechtigung“?' },
      ],
    },
    hinweis: 'Erste Zeile mit dem Operator, der die Datei neu anfängt; die beiden weiteren mit dem, der anhängt.',
    nach: {
      beobachtung: '> hat die Datei geleert, >> hat ergänzt.',
      schluss: 'Eine Zeitlinie ist ein Beleg – sie darf nicht versehentlich überschrieben werden.',
      grenzen: 'Uhrzeiten in Notizen sind nur so gut wie die Uhr, von der du sie abliest.',
      naechster: 'Vor Änderungen sichern.',
    },
  },

  // ---------------------------------------------------- L1-05
  {
    id: 'e1-05s', lesson: 'l1-05', kind: 'sandbox', required: true, xp: 10,
    title: 'Erst sichern, dann ändern',
    ziel: 'Eine Sicherung mit erhaltenen Rechten anlegen und danach ändern.',
    auftrag: 'Ergänze in ~/lab/config/app.conf die Zeile debug=false – aber erst, nachdem du im selben Ordner die Sicherung app.conf.bak mit unverändertem Inhalt UND unveränderten Rechten angelegt hast.',
    scope: 'Sandbox, nur ~/lab/config.',
    beleg: 'app.conf.bak = Originalinhalt mit Rechten 640; app.conf endet mit debug=false.',
    sandbox: {
      setup(sh) { lab(sh, [['lab/config/app.conf', 'name=lab-app\nport=8080\n', 0o640]]); },
      check(sh) {
        const bak = sh.node('~/lab/config/app.conf.bak'), cur = sh.read('~/lab/config/app.conf');
        if (!bak) return { ok: false, msg: 'Es gibt noch keine app.conf.bak. Was zuerst – Sicherung oder Änderung?' };
        if (bak.data !== 'name=lab-app\nport=8080\n') return { ok: false, msg: 'Die Sicherung enthält nicht den Originalinhalt. Wann hast du sie angelegt – vor oder nach der Änderung? Starte die Übung neu.' };
        if ((bak.mode & 0o777) !== 0o640) return { ok: false, msg: `Die Sicherung hat Rechte ${(bak.mode & 0o777).toString(8)} statt 640. Welche cp-Option erhält Rechte?` };
        if (cur !== 'name=lab-app\nport=8080\ndebug=false\n') return { ok: false, msg: 'app.conf ist noch nicht korrekt ergänzt. Hast du angehängt oder überschrieben? Prüfe mit cat.' };
        return { ok: true, msg: 'Sicherung korrekt, Änderung korrekt.' };
      },
    },
    knobel: {
      q: 'Nach „cp app.conf app.conf.bak“ ersetzt jemand app.conf mit „mv neu.conf app.conf“. Was steht jetzt in app.conf.bak?',
      options: [
        { t: 'Der ursprüngliche Inhalt von app.conf.', ok: true },
        { t: 'Der Inhalt von neu.conf.', why: 'Hat mv die .bak-Datei überhaupt berührt?' },
        { t: 'Nichts – die Sicherung ist jetzt leer.', why: 'Warum sollte eine unabhängige Kopie leer werden?' },
      ],
    },
    hinweis: 'cp hat eine Option, die mit „p“ wie preserve beginnt. Zum Ergänzen: denk an die Umleitung aus der letzten Lektion.',
    nach: {
      beobachtung: 'Die Sicherung trägt Inhalt und Rechte des Originals.',
      schluss: 'Mit Sicherung kannst du jede Änderung belegen und zurücknehmen.',
      grenzen: 'Eine Sicherung im selben Ordner schützt nicht vor Datenträgerverlust.',
      naechster: 'Wiederholungsrunde 1.',
    },
  },
  {
    id: 'w1-01', lesson: 'l1-05', kind: 'review', required: true, xp: 15,
    title: 'Wiederholung 1: Eingang sichern',
    ziel: 'Navigation, Wildcards, Sicherung und Zählen kombinieren.',
    auftrag: 'Sichere alle .txt-Dateien aus ~/lab/w1/eingang mit erhaltenen Rechten in den neuen Ordner ~/lab/w1/sicherung und schreibe die Anzahl der gesicherten Dateien (nur die Zahl) in ~/lab/w1/sicherung/anzahl.txt.',
    scope: 'Sandbox, nur ~/lab/w1.',
    beleg: 'Alle .txt-Dateien mit gleichen Rechten in sicherung; anzahl.txt enthält die richtige Zahl.',
    sandbox: {
      setup(sh) {
        lab(sh, [['lab/w1/eingang/bericht-a.txt', 'A\n', 0o600], ['lab/w1/eingang/bericht-b.txt', 'B\n', 0o640], ['lab/w1/eingang/liste.txt', 'L\n'],
          ['lab/w1/eingang/bild.png', 'PNG\n'], ['lab/w1/eingang/notiz.md', 'md\n']]);
      },
      check(sh) {
        const names = ['bericht-a.txt', 'bericht-b.txt', 'liste.txt'];
        for (const n of names) {
          const s = sh.node('~/lab/w1/eingang/' + n), d = sh.node('~/lab/w1/sicherung/' + n);
          if (!d) return { ok: false, msg: `${n} fehlt in der Sicherung. Welche Dateien erfasst dein Muster wirklich? Prüfe vorher mit ls.` };
          if (!s) return { ok: false, msg: `${n} fehlt im Eingang – eine Sicherung KOPIERT. Starte die Übung neu.` };
          if ((d.mode & 0o777) !== (s.mode & 0o777)) return { ok: false, msg: `${n} hat in der Sicherung andere Rechte. Was erhält Rechte beim Kopieren?` };
        }
        if (sh.node('~/lab/w1/sicherung/bild.png') || sh.node('~/lab/w1/sicherung/notiz.md')) return { ok: false, msg: 'Es wurden auch Nicht-.txt-Dateien gesichert. Passt dein Muster?' };
        const a = (sh.read('~/lab/w1/sicherung/anzahl.txt') || '').trim();
        if (a !== '3' && !/^3\s/.test(a)) return { ok: false, msg: 'anzahl.txt enthält nicht die richtige Zahl. Wie zählst du die .txt-Dateien – und hast du anzahl.txt vielleicht selbst mitgezählt?' };
        return { ok: true, msg: 'Sauber gesichert und gezählt.' };
      },
    },
    knobel: {
      q: 'Du zählst mit „ls ~/lab/w1/sicherung | wc -l“, NACHDEM anzahl.txt schon existiert. Was passiert?',
      options: [
        { t: 'Die Zahl ist um 1 zu hoch, weil anzahl.txt mitgezählt wird.', ok: true },
        { t: 'Nichts, wc zählt nur .txt-Dateien.', why: 'Weiß wc, welche Dateinamen es zählt – oder zählt es Zeilen?' },
        { t: 'Fehler, weil die Datei sich selbst zählt.', why: 'Gibt es eine Fehlermeldung – oder einfach eine andere Zahl?' },
      ],
    },
    hinweis: 'Reihenfolge: Ordner anlegen → mit *.txt und Rechte-Option kopieren → zählen, bevor oder ohne dass anzahl.txt mitgezählt wird.',
    nach: { beobachtung: 'Drei Dateien gesichert, Rechte erhalten.', schluss: 'Wildcards + Prüfen mit ls verhindern Überraschungen.', grenzen: 'Zählungen hängen davon ab, was gerade im Ordner liegt.', naechster: 'Rechte im Detail.' },
  },

  // ---------------------------------------------------- L1-06
  {
    id: 'e1-06s', lesson: 'l1-06', kind: 'sandbox', required: true, xp: 15,
    title: 'Rechte aufräumen',
    ziel: 'Rechte lesen und gezielt minimal setzen.',
    auftrag: 'Setze in ~/lab/rechte: bericht.txt auf „Besitzer lesen+schreiben, Gruppe lesen, andere nichts“; skript.sh soll zusätzlich NUR für den Besitzer ausführbar werden (sonst unverändert); der Ordner privat/ soll nur noch für den Besitzer zugänglich sein (voll).',
    scope: 'Sandbox, nur ~/lab/rechte.',
    beleg: 'bericht.txt 640, skript.sh 744, privat/ 700 – prüfe mit ls -l bzw. stat.',
    sandbox: {
      setup(sh) { lab(sh, [['lab/rechte/bericht.txt', 'Bericht\n', 0o666], ['lab/rechte/skript.sh', 'echo hallo\n', 0o644], ['lab/rechte/privat/geheim.txt', 'x\n', 0o600]]); sh.node('~/lab/rechte/privat').mode = 0o777; },
      check(sh) {
        const m = (p) => (sh.node(p)?.mode ?? 0) & 0o777;
        const out = [];
        if (m('~/lab/rechte/bericht.txt') !== 0o640) out.push(`bericht.txt ist ${m('~/lab/rechte/bericht.txt').toString(8)}`);
        if (m('~/lab/rechte/skript.sh') !== 0o744) out.push(`skript.sh ist ${m('~/lab/rechte/skript.sh').toString(8)}`);
        if (m('~/lab/rechte/privat') !== 0o700) out.push(`privat/ ist ${m('~/lab/rechte/privat').toString(8)}`);
        return out.length ? { ok: false, msg: out.join(', ') + '. Übersetze jede Anforderung in u/g/o und rechne nach: r=4, w=2, x=1.' } : { ok: true, msg: 'Alle Rechte minimal und korrekt.' };
      },
    },
    knobel: {
      q: '„-rwxr-x--- 1 root root … tool.sh“. Darf seppi (nicht in Gruppe root) das Skript ausführen?',
      options: [
        { t: 'Nein – für „andere“ ist kein Recht gesetzt.', ok: true },
        { t: 'Ja, weil x gesetzt ist.', why: 'Für WELCHE der drei Gruppen ist x gesetzt – und zu welcher gehört seppi?' },
        { t: 'Nur lesen, nicht ausführen.', why: 'Was steht in der letzten Dreiergruppe genau?' },
      ],
    },
    hinweis: 'bericht.txt: 6-4-0. Für skript.sh reicht eine symbolische Änderung nur für u. Bei privat/: Ordner brauchen x zum Hineinwechseln.',
    nach: {
      beobachtung: 'Weltweit beschreibbare Datei und offener Ordner sind geschlossen.',
      schluss: 'Least Privilege: so wenig Rechte wie nötig.',
      grenzen: 'root kann trotzdem alles lesen. Rechte schützen vor anderen Benutzern, nicht vor Administratoren.',
      naechster: 'Echte Rechte in deiner VM setzen.',
    },
  },
  {
    id: 'e1-06r', lesson: 'l1-06', kind: 'real', required: true, xp: 20,
    title: 'Echte Notiz absichern',
    ziel: 'chmod im echten System anwenden und mit ls -l belegen.',
    auftrag: 'Führe das Setup aus. Die Notiz ist danach für alle les- und schreibbar. Setze ihre Rechte auf „Besitzer lesen+schreiben, Gruppe lesen, andere nichts“ und belege das Ergebnis mit dem Langformat von ls für genau diese Datei.',
    scope: 'Nur ~/kly-lab/rechte auf deinem eigenen Gerät.',
    beleg: 'ls-Langformat-Zeile von notiz.txt mit -rw-r-----.',
    real: {
      voraus: { pc: 'Kali-Terminal.', phone: 'Termux. Arbeite im Termux-Home (~), NICHT in ~/storage/shared – dort ignoriert Android Linux-Rechte.' },
      setup: 'mkdir -p ~/kly-lab/rechte && cd ~/kly-lab/rechte\necho "Lab-Notiz {{TOKEN}}" > notiz.txt\nchmod 666 notiz.txt\nls -l notiz.txt',
      cleanup: 'Erst NACH dem geprüften Beleg: rm -r ~/kly-lab/rechte',
      spec: {
        commandRe: /\bls\b[^;|&]*\s-\w*l/,
        commandHint: 'Der Beleg soll aus dem LANGFORMAT von ls stammen. Welche Option zeigt Rechte an – und hast du genau diesen Befehl eingetragen?',
        criteria: [
          { re: /^-rw-r-----\S*\s+\d+\s+\S+\s+\S+\s+\d+\s.*\bnotiz\.txt\s*$/m, label: 'notiz.txt hat -rw-r-----', rueckfrage: 'Lies die Rechtespalte deiner Ausgabe Gruppe für Gruppe. Entspricht jede Dreiergruppe der Anforderung?' },
        ],
      },
    },
    knobel: {
      q: 'Dein ls -l zeigt -rw-r-----. Was belegt diese Zeile NICHT?',
      options: [
        { t: 'Dass vorher niemand die Datei gelesen hat.', ok: true },
        { t: 'Dass andere Benutzer sie jetzt nicht lesen können.', why: 'Was sagt die letzte Dreiergruppe über „andere“ aus?' },
        { t: 'Wem die Datei gehört.', why: 'Welche Spalten folgen in ls -l auf die Linkanzahl?' },
      ],
    },
    hinweis: 'Rechne 6/4/0 oder nutze symbolisch u=rw,g=r,o=. Danach ls mit der Option für das Langformat und dem Dateinamen.',
    nach: {
      beobachtung: 'Die Rechte wurden von 666 auf 640 reduziert.',
      schluss: 'Der Zustand JETZT ist belegt.',
      grenzen: 'Rechte sagen nichts über die Vergangenheit. Wer vorher zugegriffen hat, zeigen nur Logs/Audit.',
      naechster: 'Prozesse.',
    },
  },
  {
    id: 'd1-chmod', lesson: 'l1-06', kind: 'drill', required: false, xp: 5,
    title: 'Drill: Oktal rechnen',
    ziel: 'rwx-Darstellung und Oktalwerte sicher übersetzen.',
    auftrag: 'In ~/lab/drill liegen a.txt, b.txt und c.sh. Setze a.txt auf r--------, b.txt auf rw-rw-r-- und c.sh auf rwxr-x--- – jeweils mit NUMERISCHEM Modus.',
    scope: 'Sandbox.',
    beleg: 'a.txt 400, b.txt 664, c.sh 750, alles numerisch gesetzt.',
    sandbox: {
      setup(sh) { lab(sh, [['lab/drill/a.txt', 'a\n'], ['lab/drill/b.txt', 'b\n'], ['lab/drill/c.sh', 'c\n']]); },
      check(sh) {
        const m = (p) => (sh.node(p)?.mode ?? 0) & 0o777;
        if (sh.log.some(l => /^chmod\s+[ugoa]*[+\-=]/.test(l.line))) return { ok: false, msg: 'Du hast symbolisch gearbeitet. Dieser Drill verlangt numerische Modi – starte neu.' };
        const ok = m('~/lab/drill/a.txt') === 0o400 && m('~/lab/drill/b.txt') === 0o664 && m('~/lab/drill/c.sh') === 0o750;
        return ok ? { ok: true, msg: 'Alle drei korrekt.' } : { ok: false, msg: 'Mindestens ein Modus stimmt nicht. Prüfe mit stat -c "%a %A %n" ~/lab/drill/*' };
      },
    },
    knobel: {
      q: 'Was bedeutet chmod 755 für einen Ordner?',
      options: [
        { t: 'Besitzer alles; Gruppe und andere dürfen auflisten und hineinwechseln, aber nichts anlegen/löschen.', ok: true },
        { t: 'Alle dürfen darin Dateien anlegen.', why: 'Welches Recht braucht man zum Anlegen – und haben g/o es bei 5?' },
        { t: 'Nur der Besitzer darf hineinwechseln.', why: 'Was bedeutet die 5 (r-x) für g und o bei Ordnern?' },
      ],
    },
    hinweis: 'r=4, w=2, x=1. Jede Dreiergruppe einzeln addieren.',
    nach: { beobachtung: '—', schluss: 'Oktal ist schnell, symbolisch ist gezielt.', grenzen: '—', naechster: 'Wiederhole mit eigenen Kombinationen.' },
  },

  // ---------------------------------------------------- L1-07
  {
    id: 'e1-07s', lesson: 'l1-07', kind: 'sandbox', required: true, xp: 15,
    title: 'Der vergessene Prozess',
    ziel: 'Einen Prozess eindeutig über PID identifizieren und gezielt beenden.',
    auftrag: 'In dieser Sandbox läuft ein vergessener Hintergrundprozess „sleep 900“, daneben ein Lab-Webserver, der weiterlaufen muss. Beende genau den sleep-Prozess über seine PID.',
    scope: 'Sandbox. Nur eigene Prozesse.',
    beleg: 'sleep 900 ist weg, der Webserver läuft noch.',
    sandbox: {
      setup(sh) {
        sh.procs.push({ pid: 3170, ppid: sh.bashPid, user: 'seppi', cmd: 'python3 -m http.server 8000 --bind 127.0.0.1' });
        sh.procs.push({ pid: 3188, ppid: sh.bashPid, user: 'seppi', cmd: 'sleep 900' });
      },
      check(sh) {
        const p = sh.liveProcs();
        const web = p.some(x => x.cmd.includes('http.server')), sl = p.some(x => x.cmd === 'sleep 900');
        if (!web) return { ok: false, msg: 'Der Webserver läuft nicht mehr. Wie hättest du vorher sicherstellen können, welche PID zu welchem Befehl gehört? Starte neu.' };
        if (sl) return { ok: false, msg: 'sleep 900 läuft noch. Welcher Befehl zeigt dir PIDs zusammen mit der Befehlszeile?' };
        if (!sh.usedCommand('ps')) return { ok: false, msg: 'Erledigt – aber ohne ps-Beleg. Woher wusstest du die PID? Starte neu und belege zuerst.' };
        return { ok: true, msg: 'Richtiger Prozess, richtiger Weg.' };
      },
    },
    knobel: {
      q: 'In ps -o pid,ppid,args hat „sleep 900“ die PPID 2301. Was ist 2301 wahrscheinlich?',
      options: [
        { t: 'Die Shell, aus der sleep gestartet wurde.', ok: true },
        { t: 'Die Laufzeit in Sekunden.', why: 'Wofür steht das P in PPID?' },
        { t: 'Der Webserver.', why: 'Welche PID hat der Webserver in deiner Ausgabe?' },
      ],
    },
    hinweis: 'Lass dir PID, PPID und vollständige Befehlszeile anzeigen, lies die richtige Zeile ab und sende das Standardsignal an genau diese Nummer. Danach Retest.',
    nach: {
      beobachtung: 'Zwei Prozesse mit derselben Eltern-Shell; nur einer wurde beendet.',
      schluss: 'Identifikation über PID + Befehlszeile verhindert Kollateralschaden.',
      grenzen: 'ps ist eine Momentaufnahme. Zwischen ps und kill kann sich etwas ändern.',
      naechster: 'Echte Prozesse in deiner VM.',
    },
  },
  {
    id: 'e1-07r', lesson: 'l1-07', kind: 'real', required: true, xp: 20,
    title: 'Eltern und Kind belegen',
    ziel: 'PID/PPID im echten System lesen und eine Prozessbeziehung belegen.',
    auftrag: 'Starte im echten Terminal einen harmlosen Hintergrundprozess „sleep 300“. Zeige dann PID, PPID und die vollständige Befehlszeile aller Prozesse deines Terminals an, sodass sowohl sleep als auch seine Eltern-Shell in der Ausgabe erscheinen. Danach beendest du sleep wieder.',
    scope: 'Nur dein eigener sleep-Prozess.',
    beleg: 'ps-Ausgabe mit einer sleep-300-Zeile und der Zeile ihres Elternprozesses (PID = PPID von sleep).',
    real: {
      voraus: { pc: 'Kali-Terminal (Standard-Shell ist zsh – das ist in Ordnung).', phone: 'Termux. Falls ps -o nicht klappt: pkg install procps.' },
      setup: null,
      cleanup: 'kill %1 (oder kill PID) und mit jobs bzw. ps prüfen, dass sleep weg ist.',
      spec: {
        commandRe: [/\bsleep\s+300\b/, /\bps\b/],
        commandHint: 'Trage alle Befehle ein, die du ausgeführt hast – den Start von sleep und die ps-Abfrage.',
        criteria: [
          { re: /^\s*\d+\s+\d+\s+.*\bsleep(\s+300)?\b/m, label: 'sleep-Zeile mit PID und PPID', rueckfrage: 'Zeigt deine ps-Ausgabe pro Zeile zwei Zahlen (PID, PPID) vor dem Befehl? Welche Spalten hast du angefordert?' },
          {
            test: (out) => {
              const m = out.match(/^\s*(\d+)\s+(\d+)\s+.*\bsleep(\s+300)?\b/m);
              if (!m) return false;
              return new RegExp('^\\s*' + m[2] + '\\s+\\d+\\s+\\S*(bash|zsh|sh|fish)\\b', 'm').test(out);
            },
            label: 'Elternprozess (Shell) mit passender PID enthalten',
            rueckfrage: 'Suche die PPID von sleep in der PID-Spalte. Ist diese Zeile in deinem Beleg – und was für ein Programm ist das?',
          },
        ],
      },
    },
    knobel: {
      q: 'Du schließt das Terminalfenster, ohne sleep zu beenden. Was passiert typischerweise mit sleep?',
      options: [
        { t: 'Es wird meist mit beendet, weil die Shell beim Schließen ein Signal an ihre Jobs weitergibt.', ok: true },
        { t: 'Es läuft garantiert ewig weiter.', why: 'Was passiert mit Kindprozessen, wenn ihre Eltern-Shell ein Hangup-Signal bekommt?' },
        { t: 'Es wird zu PID 1.', why: 'Wird die PID geändert – oder höchstens der Elternprozess?' },
      ],
    },
    hinweis: 'Für die Spaltenauswahl von ps gibt es -o. Die Lektion nennt die drei Spalten. Ein & am Ende startet im Hintergrund.',
    nach: {
      beobachtung: 'Die PPID von sleep ist die PID deiner Shell.',
      schluss: 'Prozessbäume zeigen, wer was gestartet hat – zentral in jeder Vorfallanalyse.',
      grenzen: 'Auf Android siehst du nur Prozesse deiner App. Systemprozesse bleiben unsichtbar.',
      naechster: 'Suchen mit find und grep.',
    },
  },

  // ---------------------------------------------------- L1-08
  {
    id: 'e1-08s', lesson: 'l1-08', kind: 'sandbox', required: true, xp: 15,
    title: 'Debug-Modus aufspüren',
    ziel: 'find und grep kombinieren und das Ergebnis als Beleg sichern.',
    auftrag: 'Unter ~/lab/sammlung liegen viele Dateien. Genau eine Konfigurationsdatei (Endung .conf) enthält debug=true. Schreibe ihren Pfad (absolut oder relativ zu ~) in ~/lab/fund.txt.',
    scope: 'Sandbox, nur ~/lab/sammlung.',
    beleg: '~/lab/fund.txt enthält den Pfad der richtigen Datei.',
    sandbox: {
      setup(sh) {
        lab(sh, [
          ['lab/sammlung/web/site.conf', 'debug=false\nport=80\n'], ['lab/sammlung/web/alt/site.conf.old', 'debug=true\n'],
          ['lab/sammlung/api/dienst.conf', 'port=9000\ndebug=true\nlog=info\n'], ['lab/sammlung/api/README.txt', 'Setze nie debug=true in Produktion.\n'],
          ['lab/sammlung/db/db.conf', 'debug=false\n'], ['lab/sammlung/tmp/notiz.txt', 'debug=true irgendwo?\n'],
        ]);
      },
      check(sh) {
        const c = (sh.read('~/lab/fund.txt') || '').trim();
        if (!c) return { ok: false, msg: 'fund.txt fehlt oder ist leer.' };
        const want = H + '/lab/sammlung/api/dienst.conf';
        const norm = c.split('\n').map(l => l.split(':')[0].trim()).filter(Boolean).map(l => l.startsWith('/') || l.startsWith('~') ? l.replace(/^~/, H) : H + '/' + l.replace(/^\.\//, ''));
        if (norm.length === 1 && norm[0] === want) return { ok: true, msg: 'Richtige Datei, sauber belegt.' };
        if (norm.includes(want)) return { ok: false, msg: 'Die richtige Datei ist dabei, aber auch andere. Welche davon sind keine .conf-Dateien – oder enthalten debug=true nur als Text?' };
        return { ok: false, msg: 'Das ist nicht die gesuchte Datei. Erfüllt sie BEIDE Bedingungen: Endung genau .conf UND debug=true als Einstellung?' };
      },
    },
    knobel: {
      q: '„grep -r passwort ~/lab“ liefert keinen Treffer. Was kannst du daraus schließen?',
      options: [
        { t: 'Nur, dass keine lesbare Datei die exakte Zeichenfolge „passwort“ enthält.', ok: true },
        { t: 'Dass es dort keine Passwörter gibt.', why: 'Was ist mit „Passwort“, „password“, „pw=“ oder Dateien ohne Leserecht?' },
        { t: 'Dass grep defekt ist.', why: 'Wie könntest du mit einer Gegenprobe prüfen, ob grep überhaupt funktioniert?' },
      ],
    },
    hinweis: 'Erst die Kandidaten eingrenzen (Dateityp/Endung), dann im Inhalt suchen. Ein Treffer in README oder .old ist eine Falle.',
    nach: {
      beobachtung: 'Vier Dateien enthielten „debug=true“, nur eine davon ist eine aktive .conf.',
      schluss: 'Treffer müssen bewertet werden – nicht jeder Treffer ist ein Befund.',
      grenzen: 'Eine Einstellung in einer Datei heißt nicht, dass der Dienst sie auch geladen hat.',
      naechster: 'Echte Suche in deinem Lab.',
    },
  },
  {
    id: 'e1-08r', lesson: 'l1-08', kind: 'real', required: true, xp: 20,
    title: 'Token-Suche im echten Lab',
    ziel: 'Rekursiv mit Zeilennummern suchen und den Treffer belegen.',
    auftrag: 'Führe das Setup aus. Dein persönlicher Lab-Token steckt in genau einer Einstellung namens lab_token in einer .conf-Datei. Belege den Treffer mit einer rekursiven grep-Suche, die Dateipfad UND Zeilennummer zeigt.',
    scope: 'Nur ~/kly-lab/suche.',
    beleg: 'grep-Treffer im Format pfad:zeile:inhalt mit deinem Token.',
    real: {
      voraus: { pc: 'Kali-Terminal.', phone: 'Termux.' },
      setup: 'mkdir -p ~/kly-lab/suche/alt ~/kly-lab/suche/neu/conf ~/kly-lab/suche/tmp\necho "debug=false" > ~/kly-lab/suche/alt/app.conf\necho "lab_token=NICHT-HIER" > ~/kly-lab/suche/tmp/notiz.txt\nprintf \'mode=lab\\nlab_token={{TOKEN}}\\n\' > ~/kly-lab/suche/neu/conf/dienst.conf',
      cleanup: 'Nach dem Beleg: rm -r ~/kly-lab/suche',
      spec: {
        commandRe: [/\bgrep\b/, /(\s-\w*r|\s-\w*R|--recursive)/, /(\s-\w*n|--line-number)/],
        commandHint: 'Sucht dein grep rekursiv UND zeigt Zeilennummern? Welche zwei Optionen brauchst du dafür?',
        needToken: true,
        criteria: [
          { re: /dienst\.conf:2:lab_token=/, label: 'Treffer zeigt Datei und Zeilennummer', rueckfrage: 'Hat deine Trefferzeile die Form pfad:nummer:inhalt? Welche Datei und welche Zeile ist es?' },
        ],
      },
    },
    knobel: {
      q: 'Die Suche liefert auch tmp/notiz.txt mit „lab_token=NICHT-HIER“. Wie gehst du damit um?',
      options: [
        { t: 'Als Treffer notieren, aber als irrelevant bewerten: falsche Endung und kein echter Token.', ok: true },
        { t: 'Ignorieren und nicht erwähnen.', why: 'Wenn ein Kollege deine Suche wiederholt und den Treffer sieht – was sollte er in deinem Bericht finden?' },
        { t: 'Als zweiten Fund melden.', why: 'Erfüllt diese Datei beide Bedingungen des Auftrags?' },
      ],
    },
    hinweis: 'Suche nach dem Einstellungsnamen, nicht nach dem Token selbst, und starte im Lab-Ordner. -r und -n lassen sich kombinieren.',
    nach: {
      beobachtung: 'Ein echter Treffer mit Pfad und Zeile, ein Köder.',
      schluss: 'Die Zeilennummer macht den Befund für andere sofort überprüfbar.',
      grenzen: 'grep findet nur Text. Komprimierte oder binäre Dateien bräuchten andere Werkzeuge.',
      naechster: 'Pipes und Zählen.',
    },
  },

  // ---------------------------------------------------- L1-09
  {
    id: 'e1-09s', lesson: 'l1-09', kind: 'sandbox', required: true, xp: 15,
    title: 'Fehlversuche zählen',
    ziel: 'Mit einer Pipe gezielt zählen – und das Ergebnis richtig deuten.',
    auftrag: 'Zähle in ~/lab/logs/auth.log die fehlgeschlagenen Anmeldeversuche (Zeilen mit „Failed password“) und schreibe nur die Zahl in ~/lab/antwort.txt.',
    scope: 'Sandbox, synthetisches Log.',
    beleg: 'antwort.txt enthält die korrekte Anzahl.',
    sandbox: {
      setup(sh) { lab(sh, [['lab/logs/auth.log', AUTH_LOG]]); },
      check(sh) {
        const a = (sh.read('~/lab/antwort.txt') || '').trim();
        if (!a) return { ok: false, msg: 'antwort.txt fehlt oder ist leer.' };
        if (a === '6') return { ok: true, msg: '6 Fehlversuche – korrekt gezählt.' };
        if (a === '7') return { ok: false, msg: '7 ist eine Zeile zu viel. Schau dir die Treffer an, bevor du zählst: Ist jede davon wirklich ein fehlgeschlagener Login?' };
        return { ok: false, msg: `„${a}“ stimmt nicht. Lass dir die Treffer erst einmal ANZEIGEN, bevor du sie zählst.` };
      },
    },
    knobel: {
      q: 'Du hast 6 Fehlversuche gezählt. Was belegt diese Zahl?',
      options: [
        { t: '6 protokollierte Fehlversuche in DIESEM Log – nicht die Anzahl der Angreifer.', ok: true },
        { t: 'Dass 6 Angreifer aktiv waren.', why: 'Aus wie vielen verschiedenen Quell-IPs kommen die Versuche?' },
        { t: 'Dass ein Angriff erfolgreich war.', why: 'Gibt es ein „Accepted“ von einer der fehlschlagenden IPs?' },
      ],
    },
    hinweis: 'Achte auf Groß-/Kleinschreibung: Eine Zeile enthält „failed password“ klein und ist kein Login-Versuch.',
    nach: {
      beobachtung: '6 Zeilen „Failed password“ von 2 Quell-IPs; die erfolgreichen Logins kamen von 127.0.0.1.',
      schluss: 'Zählen ist erst ein Beleg, wenn klar ist, was die Zeilen bedeuten.',
      grenzen: 'Synthetisches Log. In echten Systemen können Logs rotiert, gefiltert oder manipuliert sein.',
      naechster: 'Drill: Top-Quelle ermitteln.',
    },
  },
  {
    id: 'd1-pipes', lesson: 'l1-09', kind: 'drill', required: false, xp: 5,
    title: 'Drill: Häufigste Quelle',
    ziel: 'sort | uniq -c | sort -nr anwenden.',
    auftrag: 'Ermittle aus ~/lab/logs/auth.log die Quell-IP mit den meisten „Failed password“-Zeilen und schreibe nur diese IP in ~/lab/top.txt.',
    scope: 'Sandbox, synthetisches Log.',
    beleg: 'top.txt enthält die korrekte IP.',
    sandbox: {
      setup(sh) { lab(sh, [['lab/logs/auth.log', AUTH_LOG]]); },
      check(sh) {
        const a = (sh.read('~/lab/top.txt') || '').trim();
        if (a === '10.13.37.21') return { ok: true, msg: 'Richtig: 10.13.37.21 mit 4 Versuchen.' };
        return { ok: false, msg: 'Nicht korrekt. Welches Feld der Zeile enthält die IP? (Zähle Wörter, Trenner ist das Leerzeichen.)' };
      },
    },
    knobel: {
      q: 'Warum steht vor uniq -c fast immer sort?',
      options: [
        { t: 'uniq fasst nur direkt aufeinanderfolgende gleiche Zeilen zusammen.', ok: true },
        { t: 'uniq funktioniert nur mit Zahlen.', why: 'Was zählt uniq -c in deinem Beispiel – Zahlen oder IP-Texte?' },
        { t: 'sort entfernt Duplikate.', why: 'Welche Option bräuchte sort dafür – und nutzt du sie hier?' },
      ],
    },
    hinweis: 'grep … | cut -d" " -f… | sort | uniq -c | sort -nr | head -1 – das Feld musst du selbst bestimmen.',
    nach: { beobachtung: '10.13.37.21 (4×), 10.13.37.44 (2×).', schluss: 'Häufigkeit ≠ Gefährlichkeit, aber ein guter Startpunkt.', grenzen: 'Gespoofte oder NAT-Adressen verzerren das Bild.', naechster: 'curl & HTTP.' },
  },

  // ---------------------------------------------------- L1-10
  {
    id: 'e1-10s', lesson: 'l1-10', kind: 'sandbox', required: true, xp: 15,
    title: 'Status ohne Inhalt',
    ziel: 'Header-Anfragen gezielt einsetzen und Statuscodes deuten.',
    auftrag: 'Auf 127.0.0.1:8080 läuft ein (simulierter) Lab-Dienst. Ermittle den HTTP-Statuscode von /admin, OHNE den Seiteninhalt zu laden, und schreibe nur den dreistelligen Code in ~/lab/status.txt.',
    scope: 'Sandbox. Nur 127.0.0.1:8080 – andere Ziele werden blockiert.',
    beleg: 'status.txt enthält den richtigen Code; die Abfrage war eine reine Header-Anfrage.',
    sandbox: {
      setup(sh) {
        lab(sh, [['lab', null]]);
        sh.web['127.0.0.1:8080'] = {
          server: 'nginx/1.26.0 (SIMULIERT)',
          routes: {
            '/': { status: 200, headers: { 'Content-Type': 'text/html' }, body: '<h1>Lab-Portal</h1>\n' },
            '/admin': { status: 403, headers: { 'Content-Type': 'text/html' }, body: '<h1>403 Forbidden</h1>\n' },
            '/login': { status: 302, headers: { Location: '/' }, body: '' },
          },
        };
      },
      check(sh) {
        const a = (sh.read('~/lab/status.txt') || '').trim();
        const headOnly = sh.log.some(l => /^curl\b.*(\s-\w*I\b|\s--head\b).*\/admin/.test(l.line));
        if (a !== '403') return { ok: false, msg: a ? `„${a}“ ist nicht der Code von /admin. Lies die erste Zeile der Antwort genau.` : 'status.txt fehlt oder ist leer.' };
        if (!headOnly) return { ok: false, msg: 'Der Code stimmt – aber hast du /admin wirklich OHNE Inhalt abgefragt? Welche curl-Option sendet nur eine HEAD-Anfrage?' };
        return { ok: true, msg: '403 – sauber per Header-Anfrage belegt.' };
      },
    },
    knobel: {
      q: '/admin antwortet mit 403, /geheim mit 404. Was ist die vorsichtigste Deutung?',
      options: [
        { t: '403: Ressource reagiert, Zugriff verweigert. 404: Der Server meldet sie als nicht vorhanden – das muss aber nicht stimmen.', ok: true },
        { t: '404 beweist, dass /geheim nicht existiert.', why: 'Kann ein Server absichtlich 404 statt 403 senden, um etwas zu verbergen?' },
        { t: '403 bedeutet, der Server ist kaputt.', why: 'Ist 403 ein Client- oder ein Serverfehler (4xx vs. 5xx)?' },
      ],
    },
    hinweis: 'Großes I. Der Statuscode steht in der ersten Zeile hinter der HTTP-Version.',
    nach: {
      beobachtung: '/ → 200, /admin → 403, /login → 302.',
      schluss: 'Statuscodes geben eine schnelle Lage, ohne Inhalte zu ziehen.',
      grenzen: 'Simulierte Antworten. Header sind Selbstauskünfte.',
      naechster: 'Echter Lab-Server in deiner VM.',
    },
  },
  {
    id: 'e1-10r', lesson: 'l1-10', kind: 'real', required: true, xp: 25,
    title: 'Echter Header-Beleg mit curl',
    ziel: 'curl als echtes Kali-Werkzeug gegen einen eigenen Lab-Dienst anwenden.',
    auftrag: 'Starte mit dem Setup einen Python-Webserver, der NUR auf 127.0.0.1:8080 lauscht. Belege dann mit curl Statuscode und Server-Header dieses Dienstes, ohne den Inhalt zu laden.',
    scope: 'Ausschließlich http://127.0.0.1:8080 auf deinem eigenen Gerät. Keine anderen Adressen.',
    beleg: 'Header-Ausgabe mit Statuszeile 200 und Server-Header.',
    real: {
      voraus: { pc: 'Kali-Terminal. Prüfe: command -v python3 curl', phone: 'Termux. Prüfe: command -v python curl – fehlt python: pkg install python' },
      setup: 'command -v python3 curl\nmkdir -p ~/kly-lab/web && cd ~/kly-lab/web\necho "Kali Level Up Lab {{TOKEN}}" > index.html\npython3 -m http.server 8080 --bind 127.0.0.1 &\n# Hinweis: Der Server schreibt Zugriffe ins Terminal. Einmal Enter drücken, um den Prompt zu sehen.',
      cleanup: 'kill %1 (im selben Terminal) oder PID per ps ermitteln und kill PID; danach: rm -r ~/kly-lab/web',
      spec: {
        commandRe: [/\bcurl\b/, /(\s-\w*I\b|\s--head\b)/, /(127\.0\.0\.1|localhost):8080/],
        commandHint: 'Fragt dein curl-Befehl nur die Header ab und zielt genau auf 127.0.0.1:8080?',
        criteria: [
          { re: /^HTTP\/1\.[01] 200\b/m, label: 'Statuszeile 200', rueckfrage: 'Was steht in der ersten Zeile deiner Ausgabe? Läuft der Server noch (jobs)?' },
          { re: /^Server:\s*SimpleHTTP\/[\d.]+\s+Python\/[\d.]+/mi, label: 'Server-Header des Python-Servers', rueckfrage: 'Findest du eine Zeile, die mit „Server:“ beginnt? Hast du die vollständige Ausgabe eingefügt?' },
        ],
      },
    },
    knobel: {
      q: 'Der Header sagt „Server: SimpleHTTP/0.6 Python/3.x“. Wie belastbar ist das als Beweis, welche Software lauscht?',
      options: [
        { t: 'Ein Hinweis – Header sind Selbstauskunft. Beleg wird es erst mit einer Gegenprobe, z. B. ps.', ok: true },
        { t: 'Ein sicherer Beweis, Header lügen nicht.', why: 'Wer schreibt den Server-Header – und könnte er etwas anderes hineinschreiben?' },
        { t: 'Wertlos, Header bedeuten nichts.', why: 'Ist ein Hinweis, den man gegenprüfen kann, wirklich wertlos?' },
      ],
    },
    hinweis: 'Dieselbe Option wie in der Sandbox-Übung, diesmal mit http:// und Port 8080.',
    nach: {
      beobachtung: 'HTTP 200, Server: SimpleHTTP – dein eigener Lab-Server antwortet.',
      schluss: 'Du hast ein echtes Werkzeug gegen ein echtes, eigenes, eng begrenztes Ziel eingesetzt.',
      grenzen: 'Header sind Selbstauskunft. Eine Gegenprobe mit ps zeigt den tatsächlichen Prozess.',
      naechster: 'Aufräumen (cleanup) – und dann DNS.',
    },
  },

  // ---------------------------------------------------- L1-11
  {
    id: 'e1-11s', lesson: 'l1-11', kind: 'sandbox', required: true, xp: 15,
    title: 'Intranet nicht erreichbar',
    ziel: 'Namensauflösung und Dienst getrennt prüfen.',
    auftrag: 'Ein Kollege meldet: „http://intranet.lab.sim:8080 geht nicht.“ Finde die Ursache und schreibe die verantwortliche Zeile (unverändert) in ~/lab/dns-befund.txt.',
    scope: 'Sandbox. Nur intranet.lab.sim / 127.0.0.1.',
    beleg: 'dns-befund.txt enthält die fehlerhafte Zeile.',
    sandbox: {
      setup(sh) {
        const hosts = sh.read('/etc/hosts') + '127.0.0.1\tintranet.lab.slm\t# Lab-Intranet\n';
        sh.fs.put('/etc/hosts', hosts, 0o644, 'root');
        lab(sh, [['lab', null]]);
        sh.web['127.0.0.1:8080'] = { server: 'SimHTTP/1.0', routes: { '/': { status: 200, headers: { 'Content-Type': 'text/html' }, body: '<h1>Intranet (SIMULIERT)</h1>\n' } } };
      },
      check(sh) {
        const c = sh.read('~/lab/dns-befund.txt') || '';
        if (/intranet\.lab\.slm/.test(c) && c.trim().split('\n').length === 1) return { ok: true, msg: 'Tippfehler „slm“ statt „sim“ gefunden.' };
        if (/intranet\.lab\.slm/.test(c)) return { ok: false, msg: 'Die richtige Zeile ist dabei, aber nicht allein. Wie grenzt du die Ausgabe auf genau eine Zeile ein?' };
        return { ok: false, msg: 'Noch nicht. Funktioniert der Dienst über die IP? Und was liefert die Namensauflösung für intranet.lab.sim?' };
      },
    },
    knobel: {
      q: 'curl http://127.0.0.1:8080 funktioniert, curl http://intranet.lab.sim:8080 meldet „(6) Could not resolve host“. Was folgt daraus?',
      options: [
        { t: 'Dienst und Verbindung sind ok – das Problem liegt in der Namensauflösung.', ok: true },
        { t: 'Der Webserver ist abgestürzt.', why: 'Wie hat dann die Anfrage an die IP funktioniert?' },
        { t: 'Port 8080 ist gesperrt.', why: 'Welcher Fehlercode käme bei einer abgelehnten Verbindung?' },
      ],
    },
    hinweis: 'Vergleiche Zeichen für Zeichen: Wie heißt der Name in der Meldung, wie in der Konfigurationsdatei?',
    nach: {
      beobachtung: '/etc/hosts enthält „intranet.lab.slm“ statt „intranet.lab.sim“.',
      schluss: 'Fehler eingrenzen: erst IP testen, dann Namen.',
      grenzen: '/etc/hosts darfst du als normaler Benutzer nicht ändern – der Fix gehört zum Admin (mit Ticket/Beleg).',
      naechster: 'Echte Namensauflösung prüfen.',
    },
  },
  {
    id: 'e1-11r', lesson: 'l1-11', kind: 'real', required: true, xp: 15,
    title: 'localhost auflösen',
    ziel: 'Die Namensauflösung des eigenen Systems belegen – und Werkzeugverfügbarkeit prüfen.',
    auftrag: 'Belege, welche Adresse dein echtes System für den Namen localhost liefert. Prüfe vorher, ob dir das passende Werkzeug zur Verfügung steht.',
    scope: 'Nur der Name localhost.',
    beleg: 'Zeile mit 127.0.0.1 oder ::1 und localhost.',
    real: {
      voraus: { pc: 'Kali-Terminal. Werkzeug: getent (prüfen mit command -v getent).', phone: 'Termux: getent fehlt meist. Prüfe mit command -v getent. Fehlt es, belege stattdessen den Eintrag in der hosts-Datei von Termux ($PREFIX/etc/hosts). Fehlt auch die, erledige die Aufgabe am PC.' },
      setup: null,
      cleanup: 'Nichts nötig – nur lesend.',
      spec: {
        commandRe: /\b(getent\s+hosts\s+localhost|cat\s+\S*hosts|grep\s+.*localhost\s+\S*hosts)\b/,
        commandHint: 'Nutzt du ein Werkzeug, das die Systemquellen für Namen abfragt (oder liest du die hosts-Datei)? Hast du den Befehl eingetragen?',
        criteria: [
          { re: /^\s*(127\.0\.0\.1|::1)\s+.*\blocalhost\b/m, label: 'Adresse + localhost in der Ausgabe', rueckfrage: 'Welche IP-Adresse steht in deiner Ausgabe vor „localhost“?' },
        ],
      },
    },
    knobel: {
      q: 'getent liefert ::1 statt 127.0.0.1. Ist das ein Fehler?',
      options: [
        { t: 'Nein – ::1 ist die IPv6-Loopback-Adresse; beide zeigen auf das eigene Gerät.', ok: true },
        { t: 'Ja, localhost muss immer 127.0.0.1 sein.', why: 'Welche zwei Loopback-Adressen gibt es – eine je IP-Version?' },
        { t: 'Ja, ::1 ist eine externe Adresse.', why: 'Was steht in /etc/hosts neben ::1?' },
      ],
    },
    hinweis: 'getent hat eine Datenbank „hosts“. Auf dem Handy liegt die hosts-Datei unter $PREFIX/etc/.',
    nach: {
      beobachtung: 'localhost wird lokal auf Loopback aufgelöst.',
      schluss: 'Werkzeugverfügbarkeit prüfen gehört zur Methode.',
      grenzen: 'getent sagt nichts darüber, ob ein externer DNS-Server funktioniert.',
      naechster: 'Wiederholung 2 – dann Story „Der stille Alarm“.',
    },
  },
  {
    id: 'w1-02', lesson: 'l1-11', kind: 'review', required: true, xp: 20,
    title: 'Wiederholung 2: Offene Datei',
    ziel: 'find, Rechte, Sicherung und Retest in einem Ablauf.',
    auftrag: 'Unter ~/lab/w2 ist genau eine Datei für ALLE beschreibbar. Finde sie und setze ihre Rechte auf „Besitzer lesen+schreiben, Gruppe lesen, andere nichts“. Keine andere Datei darf sich ändern.',
    scope: 'Sandbox, nur ~/lab/w2.',
    beleg: 'Die Datei hat 640, alle anderen sind unverändert.',
    sandbox: {
      setup(sh) {
        lab(sh, [['lab/w2/a/report.txt', 'r\n', 0o644], ['lab/w2/a/b/token.cfg', 'x\n', 0o666], ['lab/w2/c/run.sh', 'echo\n', 0o755], ['lab/w2/c/notes.txt', 'n\n', 0o600], ['lab/w2/readme', 'lies mich\n', 0o664]]);
      },
      check(sh) {
        const m = (p) => (sh.node(p)?.mode ?? -1) & 0o777;
        const exp = { 'a/report.txt': 0o644, 'c/run.sh': 0o755, 'c/notes.txt': 0o600, readme: 0o664 };
        for (const [p, v] of Object.entries(exp)) if (m('~/lab/w2/' + p) !== v) return { ok: false, msg: `${p} wurde verändert. Starte neu – und finde zuerst NUR die betroffene Datei.` };
        if (m('~/lab/w2/a/b/token.cfg') !== 0o640) return { ok: false, msg: 'Die betroffene Datei ist noch nicht korrekt. Welche ist für „andere“ beschreibbar? find kennt eine Bedingung für Rechte.' };
        return { ok: true, msg: 'Gefunden, gezielt behoben.' };
      },
    },
    knobel: {
      q: 'readme hat 664. Ist das auch ein Befund?',
      options: [
        { t: 'Möglicherweise – die Gruppe darf schreiben. Ob das ein Problem ist, hängt davon ab, wer in der Gruppe ist.', ok: true },
        { t: 'Ja, gleich schlimm wie 666.', why: 'Wer darf bei 664 schreiben, wer bei 666?' },
        { t: 'Nein, 664 ist immer sicher.', why: 'Was, wenn die Gruppe viele Mitglieder hat?' },
      ],
    },
    hinweis: 'find hat -perm. Mit -o=w und dem richtigen Präfix suchst du „mindestens schreibbar für andere“.',
    nach: { beobachtung: 'a/b/token.cfg war 666.', schluss: 'Erst finden, dann gezielt ändern, dann Retest.', grenzen: 'Gruppenrechte brauchen Kontext.', naechster: 'Story-Lab: Der stille Alarm.' },
  },
];

// ---------------------------------------------------------------- Prüfung
// Bestehensregel: ≥ 85 % UND alle Pflicht-Aufgaben (mandatory) korrekt.
export const EXAM = {
  level: 'L1',
  title: 'Prüfung Level 1 – Linux Grundlagen',
  rules: 'Mindestens 85 % und alle Pflichtaufgaben (★) korrekt. Kein Coach, keine Hinweise. Antworten werden erst am Ende ausgewertet. Nicht bestanden: Themen werden genannt, Lösungen nicht.',
  items: [
    { id: 'x01', mandatory: true, type: 'mc', topic: 'Prompt', q: 'Ein Prompt endet mit #. Was bedeutet das?', options: ['Du arbeitest als root – besondere Vorsicht.', 'Ein Kommentar folgt.', 'Der letzte Befehl schlug fehl.', 'Du bist in /root.'], answer: 0 },
    { id: 'x02', type: 'input', topic: 'Pfade', q: 'Wie lautet der absolute Pfad von ~ für den Benutzer seppi auf Kali (Standard)?', accept: [/^\/home\/seppi\/?$/] },
    { id: 'x03', type: 'mc', topic: 'Navigation', q: 'Du bist in /home/seppi/lab/fall und tippst cd ../.. – wo bist du?', options: ['/home/seppi', '/home', '/home/seppi/lab', '/'], answer: 0 },
    { id: 'x04', type: 'mc', topic: 'Dateien', q: 'Was bewirkt mkdir -p a/b/c, wenn a noch nicht existiert?', options: ['Legt a, a/b und a/b/c an.', 'Fehler: a fehlt.', 'Legt nur c an.', 'Legt a/b/c als Datei an.'], answer: 0 },
    { id: 'x05', mandatory: true, type: 'mc', topic: 'Sicheres Löschen', q: 'Was ist vor rm -r PFAD die beste Sicherheitsmaßnahme?', options: ['Mit ls genau denselben Pfad prüfen (und ggf. sichern).', 'Gleich -f ergänzen, damit nichts nachfragt.', 'Als root ausführen, damit es sicher klappt.', 'Einen relativen Pfad nutzen.'], answer: 0 },
    { id: 'x06', type: 'mc', topic: 'Umleitung', q: 'echo b >> f.txt bei bestehender Datei mit Inhalt „a“ – Ergebnis?', options: ['Zwei Zeilen: a und b', 'Nur b', 'Nur a', 'Fehler: Datei existiert'], answer: 0 },
    { id: 'x07', type: 'mc', topic: 'stderr', q: 'Warum landet eine Fehlermeldung bei BEFEHL > out.txt trotzdem im Terminal?', options: ['Sie läuft über stderr, > leitet nur stdout um.', 'Fehler werden nie gespeichert.', 'out.txt ist schreibgeschützt.', 'Weil > nur Text speichert.'], answer: 0 },
    { id: 'x08', mandatory: true, type: 'input', topic: 'Rechte', q: 'Welcher numerische Modus entspricht rw-r-----?', accept: [/^0?640$/] },
    { id: 'x09', type: 'mc', topic: 'Rechte lesen', q: '-rwxr-x--- root root tool – darf ein Benutzer, der nicht root ist und nicht in Gruppe root, es ausführen?', options: ['Nein', 'Ja', 'Nur lesen', 'Nur mit -r'], answer: 0 },
    { id: 'x10', type: 'mc', topic: 'chmod', q: 'Eine Datei hat 644. Was ergibt chmod u+x?', options: ['744', '755', '645', '711'], answer: 0 },
    { id: 'x11', type: 'mc', topic: 'Prozesse', q: 'Was ist die PPID?', options: ['Die PID des Elternprozesses', 'Die Priorität', 'Die PID des ps-Befehls', 'Die Port-ID'], answer: 0 },
    { id: 'x12', type: 'mc', topic: 'kill', q: 'Welches Signal sendet kill ohne Option?', options: ['15 (TERM)', '9 (KILL)', '1 (HUP)', '0'], answer: 0 },
    { id: 'x13', mandatory: true, type: 'mc', topic: 'Prozess-Sicherheit', q: 'Du sollst einen hängenden Lab-Prozess beenden. Richtiges Vorgehen?', options: ['Mit ps PID und Befehlszeile prüfen, nur den eigenen identifizierten Prozess beenden, danach Retest.', 'Alle Prozesse mit dem Namen beenden.', 'Sofort kill -9 auf die erste passende PID aus einer alten Notiz.', 'Den Rechner neu starten.'], answer: 0 },
    { id: 'x14', type: 'mc', topic: 'find', q: 'Was findet find ~/lab -type f -name "*.log"?', options: ['Alle Dateien unter ~/lab, deren Name auf .log endet', 'Alle Zeilen mit „log“', 'Nur Ordner namens log', 'Dateien, die „*.log“ enthalten'], answer: 0 },
    { id: 'x15', type: 'mc', topic: 'grep', q: 'Welche Aussage stimmt? grep -c X f und grep X f | wc -l …', options: ['… liefern bei einer Datei dieselbe Zahl (Anzahl Zeilen mit X).', '… zählen Vorkommen von X, auch mehrere pro Zeile.', '… sind beide ungültig.', '… zählen nur Wörter.'], answer: 0 },
    { id: 'x16', mandatory: true, type: 'mc', topic: 'Belegqualität', q: 'grep -r "passwort" ~/lab findet nichts. Was ist die korrekte Aussage?', options: ['Keine lesbare Datei enthält genau „passwort“ – andere Schreibweisen oder unlesbare Dateien sind nicht abgedeckt.', 'Es gibt dort keine Passwörter.', 'Der Ordner ist leer.', 'grep ist defekt.'], answer: 0 },
    { id: 'x17', type: 'mc', topic: 'Pipes', q: 'Was macht die Pipe | ?', options: ['Leitet stdout des linken Befehls an stdin des rechten.', 'Schreibt in eine Datei.', 'Führt Befehle parallel ohne Verbindung aus.', 'Leitet stderr weiter.'], answer: 0 },
    { id: 'x18', type: 'mc', topic: 'curl', q: 'Was macht curl -I URL?', options: ['Sendet eine HEAD-Anfrage und zeigt nur die Header.', 'Zeigt Header und Body.', 'Lädt eine Datei hoch.', 'Ignoriert Zertifikate.'], answer: 0 },
    { id: 'x19', type: 'mc', topic: 'HTTP', q: 'Was bedeutet 403?', options: ['Zugriff verweigert (Ressource reagiert)', 'Nicht gefunden', 'Serverfehler', 'Weiterleitung'], answer: 0 },
    { id: 'x20', mandatory: true, type: 'mc', topic: 'Scope', q: 'Welches Ziel ist für eine Level-1-curl-Übung erlaubt?', options: ['http://127.0.0.1:8080 (eigener Lab-Server)', 'Der Router im Heimnetz', 'Die Website eines Freundes – er hat mündlich zugestimmt', 'Eine zufällige IP aus einem Log'], answer: 0 },
    { id: 'x21', type: 'mc', topic: 'DNS', q: 'Mit IP geht es, mit Namen kommt „Could not resolve host“. Wo liegt das Problem?', options: ['In der Namensauflösung', 'Im Webserver', 'In der Firewall', 'In curl'], answer: 0 },
    { id: 'x22', type: 'mc', topic: 'Header', q: 'Ein Server-Header nennt „Apache/2.4“. Wie bewertest du das?', options: ['Als Selbstauskunft – Hinweis, der eine Gegenprobe braucht.', 'Als sicheren Beweis.', 'Als Fehler im Server.', 'Als Angriff.'], answer: 0 },
    {
      id: 'x23', mandatory: true, type: 'sandbox', topic: 'Rechte (Praxis)',
      q: 'Praxis: Setze ~/pruefung/geheim.txt so, dass NUR der Besitzer lesen und schreiben darf, und den Ordner ~/pruefung/akten so, dass NUR der Besitzer ihn nutzen kann (alle Rechte).',
      setup: (sh) => { sh.fs.put(H + '/pruefung/geheim.txt', 'x\n', 0o664); sh.fs.put(H + '/pruefung/akten', null, 0o775); },
      check: (sh) => ((sh.node('~/pruefung/geheim.txt')?.mode ?? 0) & 0o777) === 0o600 && ((sh.node('~/pruefung/akten')?.mode ?? 0) & 0o777) === 0o700,
    },
    {
      id: 'x24', mandatory: true, type: 'sandbox', topic: 'Suchen & Zählen (Praxis)',
      q: 'Praxis: Zähle in ~/pruefung/app.log die Zeilen mit dem Wort ERROR (Großschreibung) und schreibe nur die Zahl in ~/pruefung/fehler.txt.',
      setup: (sh) => { sh.fs.put(H + '/pruefung/app.log', 'INFO start\nERROR db timeout\nWARN slow\nERROR db timeout\ninfo error ignored\nERROR auth failed\nINFO stop\n'); },
      check: (sh) => (sh.read('~/pruefung/fehler.txt') || '').trim() === '3',
    },
    {
      id: 'x25', type: 'sandbox', topic: 'Prozesse (Praxis)',
      q: 'Praxis: Beende den Prozess „sleep 777“. Der Prozess „sleep 778“ muss weiterlaufen.',
      setup: (sh) => { sh.procs.push({ pid: 4101, ppid: sh.bashPid, user: 'seppi', cmd: 'sleep 778' }, { pid: 4107, ppid: sh.bashPid, user: 'seppi', cmd: 'sleep 777' }); },
      check: (sh) => { const p = sh.liveProcs(); return !p.some(x => x.cmd === 'sleep 777') && p.some(x => x.cmd === 'sleep 778'); },
    },
  ],
};

export const LEVEL1 = { id: 'L1', lessons: LESSONS, exercises: EXERCISES, exam: EXAM };
