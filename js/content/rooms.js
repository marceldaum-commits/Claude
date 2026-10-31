// Räume nach dem TryHackMe-Prinzip: Tasks mit Fragen und Flags.
// type: 'walkthrough' (geführt, mit Erklärungen) | 'challenge' (ohne Anleitung, prüft Selbstständigkeit)
// machine.kind: 'sandbox' (Browser-SIMULATION) | 'target' (echtes Trainingsziel per Docker/Python, nur 127.0.0.1)
// Fragetypen: flag (aus Lab-Token berechnet), text (accept: RegExp[]), mc (options, answer), confirm (kein Antwortwert)

import { HOME } from '../shell.js';
import { WARGAMES } from './wargames.js';

const T = (...lines) => lines.join('\n');

const BASE_ROOMS = [
  // ================================================================ R0
  {
    id: 'r0', title: 'Terminal-Spuren', type: 'walkthrough', level: 'L1', difficulty: 'leicht', minutes: 25,
    requires: { lessons: ['l1-02', 'l1-03', 'l1-06', 'l1-08', 'l1-09'] },
    tools: ['ls -a', 'cat', 'grep', 'chmod', 'find', 'wc'],
    desc: 'Ein Kollege hat auf einer Übungsmaschine Spuren hinterlassen. Finde sie – nur mit den Grundbefehlen aus Level 1.',
    ziel: 'Grundbefehle kombiniert und selbstständig einsetzen, Ergebnisse als Flag belegen.',
    scope: 'Nur die Sandbox-Simulation in diesem Raum (~/raum0).',
    stop: 'Keine Stopp-Regel nötig – die Sandbox ist isoliert und synthetisch.',
    cleanup: 'Nichts nötig. „Raum-Terminal neu starten“ setzt die Sandbox zurück.',
    machine: { kind: 'sandbox' },
    flags: ['hidden', 'grep', 'chmod', 'find'],
    setup(sh, F) {
      const p = (path, c, m) => sh.fs.put(HOME + '/raum0/' + path, c, m);
      p('start/README', 'Hier beginnt die Spurensuche. Nicht alles ist auf den ersten Blick sichtbar.\n');
      p('start/.spur', `Gut gesehen.\n${F.hidden}\n`);
      p('logs/app-01.log', 'INFO boot\nINFO ready\n');
      p('logs/app-02.log', `INFO boot\nWARN disk 81%\nSECRET token=${F.grep}\nINFO ready\n`);
      p('logs/app-03.log', 'INFO boot\nERROR db timeout\n');
      p('tresor/schloss.txt', `Rechte geändert – sauber.\n${F.chmod}\n`, 0o000);
      p('archiv/2025/q1/a.txt', 'alt\n'); p('archiv/2025/q4/b.txt', 'alt\n');
      p('archiv/2026/q2/tief/drin/zugang.key', `${F.find}\n`);
      p('firewall.log', ['ALLOW 10.0.0.2', 'DENY 10.13.37.21', 'DENY 10.13.37.21', 'ALLOW 10.0.0.3', 'DENY 10.13.37.44', 'deny-list reloaded', 'DENY 10.13.37.21', 'DENY 10.13.37.99', 'ALLOW 10.0.0.2', 'DENY 10.13.37.21', 'DENY 10.13.37.44'].join('\n') + '\n');
      sh.cwd = HOME + '/raum0';
    },
    tasks: [
      {
        id: 't1', title: 'Was du nicht siehst',
        body: T('Dateien, deren Name mit einem Punkt beginnt, zeigt ls standardmäßig nicht an. Angreifer und Admins verstecken so gern Dinge – ganz ohne Magie.',
          '', 'Wechsle nach ~/raum0/start und mach die versteckte Datei sichtbar. Die Flag steht darin.'),
        questions: [{ id: 'q1', type: 'flag', flag: 'hidden', q: 'Flag aus der versteckten Datei', points: 10, hints: ["ls hat eine Option für „all“.", "Lösung: cd start → ls -a → cat .spur"] }],
      },
      {
        id: 't2', title: 'Die Nadel im Log',
        body: T('In ~/raum0/logs liegen mehrere Logdateien. Eine davon enthält eine Zeile mit dem Wort SECRET.',
          'Durchsuche alle Logs mit einem Befehl – nicht jede Datei einzeln öffnen.'),
        questions: [
          { id: 'q1', type: 'text', q: 'In welcher Datei steht die Zeile? (nur Dateiname)', accept: [/^app-02\.log$/i], points: 5, hints: ["grep mit mehreren Dateien (Wildcard) zeigt den Dateinamen vor jedem Treffer.", "Lösung: grep SECRET logs/*.log"] },
          { id: 'q2', type: 'flag', flag: 'grep', q: 'Flag aus der SECRET-Zeile', points: 10, hints: ["Die Flag steht hinter token=.", "grep SECRET logs/*.log zeigt die Zeile.", "Lösung: alles hinter token= ist die Flag KLY{…}"] },
        ],
      },
      {
        id: 't3', title: 'Verschlossener Tresor',
        body: T('~/raum0/tresor/schloss.txt gehört dir – aber niemand darf sie lesen, nicht einmal du.',
          'Gib dir als Besitzer NUR Leserecht und lies die Datei.'),
        questions: [
          { id: 'q1', type: 'text', q: 'Welche Rechte hatte die Datei ursprünglich? (oktal, dreistellig)', accept: [/^0?000$/], points: 5, hints: ["stat -c %a zeigt den oktalen Modus.", "Alternativ: ls -l tresor zeigt ---------- (keine Rechte) – als Zahl ist das 000.", "Lösung: 000"] },
          { id: 'q2', type: 'flag', flag: 'chmod', q: 'Flag aus schloss.txt', points: 10, hints: ["Symbolisch: u+r.", "chmod u+r DATEI gibt dem Besitzer (u) Leserecht (r).", "Lösung: chmod u+r tresor/schloss.txt → cat tresor/schloss.txt"] },
        ],
      },
      {
        id: 't4', title: 'Tief vergraben',
        body: 'Irgendwo unter ~/raum0/archiv liegt eine Datei mit der Endung .key. Finde sie, ohne dich durch alle Ordner zu klicken.',
        questions: [
          { id: 'q1', type: 'text', q: 'Vollständiger Pfad ab ~ (z. B. ~/raum0/…)', accept: [/^(~|\/home\/seppi)\/raum0\/archiv\/2026\/q2\/tief\/drin\/zugang\.key$/], points: 5, hints: ["find mit -name und einem Muster in Anführungszeichen.", "Gesucht ist eine Datei mit Endung .key irgendwo unter archiv.", "Lösung: find ~/raum0/archiv -name \"*.key\""] },
          { id: 'q2', type: 'flag', flag: 'find', q: 'Flag aus der .key-Datei', points: 10, hints: ["cat auf den gefundenen Pfad.", "Lösung: cat ~/raum0/archiv/2026/q2/tief/drin/zugang.key"] },
        ],
      },
      {
        id: 't5', title: 'Firewall zählen – und deuten',
        body: 'Die Datei ~/raum0/firewall.log enthält erlaubte und blockierte Verbindungen. Achte auf Groß-/Kleinschreibung.',
        questions: [
          { id: 'q1', type: 'text', q: 'Wie viele Zeilen beginnen mit DENY?', accept: [/^7$/], points: 10, hints: ["Ein Anker ^ im grep-Muster und wc -l oder grep -c. Prüfe die „deny-list“-Zeile.", "Die Zeile „deny-list reloaded“ beginnt NICHT mit DENY (Groß-/Kleinschreibung!).", "Lösung: grep -c \"^DENY\" firewall.log"] },
          { id: 'q2', type: 'text', q: 'Welche IP wurde am häufigsten blockiert?', accept: [/^10\.13\.37\.21$/], points: 10, hints: ["grep … | sort | uniq -c | sort -nr", "Erst nur die DENY-Zeilen, dann mit cut -d\" \" -f2 nur die IP herausschneiden.", "Lösung: grep \"^DENY\" firewall.log | cut -d\" \" -f2 | sort | uniq -c | sort -nr | head -1"] },
          {
            id: 'q3', type: 'mc', q: 'Was belegt die Zahl der DENY-Zeilen?', points: 10,
            options: ['Wie oft die Firewall laut diesem Log blockiert hat – nicht, ob ein Angriff stattfand.', 'Dass 7 Angreifer aktiv waren.', 'Dass die Firewall richtig konfiguriert ist.'], answer: 0,
            hint: 'Wie viele verschiedene IPs gibt es – und was weißt du über deren Absicht?',
          },
        ],
      },
    ],
    nach: { beobachtung: 'Versteckte Datei, Log-Treffer, gesperrte Datei, vergrabener Schlüssel, Firewall-Statistik.', schluss: 'Mit wenigen Grundbefehlen findest du fast alles – wenn du systematisch vorgehst.', grenzen: 'Sandbox-Simulation. Auf echten Systemen kommen Rechteprobleme, große Datenmengen und Rauschen dazu.', naechster: 'Raum „Erste Zielmaschine“ – ein echtes Ziel mit curl.' },
  },

  // ================================================================ R1
  {
    id: 'r1', title: 'Erste Zielmaschine', type: 'walkthrough', level: 'L1', difficulty: 'leicht', minutes: 35,
    requires: { lessons: ['l1-10'] },
    tools: ['curl', 'Docker (PC) / python (Termux)'],
    desc: 'Deine erste echte Zielmaschine: ein kleiner Webserver, der nur auf deinem Gerät läuft. Lies Header, Statuscodes und robots.txt mit curl.',
    ziel: 'curl gegen ein echtes, eigenes Ziel anwenden: Header, Statuscodes, robots.txt, Weiterleitungen – und Selbstauskünfte kritisch bewerten.',
    scope: 'Ausschließlich http://127.0.0.1:10080 auf deinem eigenen Gerät.',
    stop: 'Wenn ein Befehl eine andere Adresse als 127.0.0.1/localhost enthält: nicht ausführen. Bei unerwartetem Verhalten: Maschine stoppen.',
    cleanup: 'PC: docker stop kly-r1 · Handy: Strg+C im Termux-Fenster des Servers',
    machine: { kind: 'target', room: 'r1', ports: [10080] },
    tasks: [
      {
        id: 't1', title: 'Maschine starten',
        body: T('Starte die Zielmaschine mit den Befehlen oben im Kasten „Zielmaschine“. Prüfe danach mit einer Header-Anfrage, ob sie antwortet.',
          '', 'Wichtig: Der Server läuft nur auf 127.0.0.1 – andere Geräte im Netz erreichen ihn nicht. So soll es sein.'),
        questions: [
          { id: 'q1', type: 'text', q: 'Welchen Statuscode liefert http://127.0.0.1:10080/ ?', accept: [/^200$/], points: 5, hints: ["curl -I zeigt die Statuszeile.", "Die erste Zeile der Antwort sieht aus wie HTTP/1.0 ZAHL TEXT.", "Lösung: curl -I http://127.0.0.1:10080/ → die Zahl in der ersten Zeile"] },
          { id: 'q2', type: 'text', q: 'Was steht im Server-Header?', accept: [/^KLY-httpd\/1\.4$/i], points: 5, hints: ["Zeile „Server:“ – den Wert exakt abschreiben.", "Lösung: curl -I http://127.0.0.1:10080/ | grep Server"] },
        ],
      },
      {
        id: 't2', title: 'Header verraten mehr',
        body: 'Webserver senden oft zusätzliche, selbst definierte Header (meist beginnend mit X-). Sie tauchen im Browser nicht auf – in curl schon.',
        questions: [{ id: 'q1', type: 'flag', flag: 'header', q: 'Flag aus dem eigenen Header der Startseite', points: 10, hints: ["Lies alle Header der Startseite, nicht nur Status und Server.", "Eigene Header beginnen oft mit X-.", "Lösung: curl -I http://127.0.0.1:10080/ → Zeile X-KLY-Flag"] }],
      },
      {
        id: 't3', title: 'robots.txt',
        body: T('Viele Webseiten haben eine Datei /robots.txt. Sie bittet Suchmaschinen, bestimmte Pfade nicht zu indizieren.',
          'Für Analysten ist sie interessant: Sie listet oft genau die Pfade, die jemand verstecken wollte. Sie ist KEIN Zugriffsschutz.'),
        questions: [
          { id: 'q1', type: 'text', q: 'Welcher Pfad ist in robots.txt gesperrt?', accept: [/^\/?intern\/?$/i], points: 5, hints: ["curl http://127.0.0.1:10080/robots.txt", "Lösung: Die Zeile Disallow: nennt den Pfad – /intern/"] },
          { id: 'q2', type: 'flag', flag: 'robots', q: 'Flag aus der Datei in diesem Pfad', points: 10, hints: ["Ein Verzeichnis-Listing zeigt die enthaltene Datei.", "curl http://127.0.0.1:10080/intern/ listet notiz.txt.", "Lösung: curl http://127.0.0.1:10080/intern/notiz.txt"] },
          { id: 'q3', type: 'mc', q: 'Was bewirkt ein Eintrag in robots.txt technisch?', points: 10, options: ['Nichts erzwungen – es ist eine Bitte an Crawler, kein Schutz.', 'Der Pfad ist für alle gesperrt.', 'Der Server löscht den Pfad.'], answer: 0, hint: 'Konntest du den Pfad trotz Eintrag abrufen?' },
        ],
      },
      {
        id: 't4', title: 'Statuscodes deuten',
        body: 'Frage /admin und einen Pfad ab, den es sicher nicht gibt (z. B. /gibtsnicht). Vergleiche die Statuscodes.',
        questions: [
          { id: 'q1', type: 'text', q: 'Statuscode von /admin', accept: [/^403$/], points: 5, hints: ["curl -I …/admin", "Lösung: curl -I http://127.0.0.1:10080/admin → Zahl in der ersten Zeile"] },
          { id: 'q2', type: 'text', q: 'Statuscode von /gibtsnicht', accept: [/^404$/], points: 5, hints: ["Gleicher Befehl, anderer Pfad.", "Lösung: curl -I http://127.0.0.1:10080/gibtsnicht"] },
          { id: 'q3', type: 'mc', q: 'Was ist die vorsichtigste Deutung von 403 bei /admin?', points: 10, options: ['Der Pfad reagiert, der Zugriff wird verweigert – dahinter existiert vermutlich etwas.', 'Der Server ist kaputt.', '/admin existiert sicher nicht.'], answer: 0, hint: '4xx = Client-Seite. Was unterscheidet 403 von 404?' },
        ],
      },
      {
        id: 't5', title: 'Weiterleitungen',
        body: 'Rufe /alt ab. curl folgt Weiterleitungen standardmäßig NICHT – das ist für Analysten gut, denn du siehst jeden Schritt einzeln.',
        questions: [
          { id: 'q1', type: 'text', q: 'Statuscode von /alt', accept: [/^301$/], points: 5, hints: ["Header-Anfrage auf /alt.", "Lösung: curl -I http://127.0.0.1:10080/alt"] },
          { id: 'q2', type: 'text', q: 'Wohin leitet /alt weiter? (Pfad)', accept: [/^\/neu$/i, /^http:\/\/(127\.0\.0\.1|localhost):10080\/neu$/i], points: 5, hints: ["Header „Location:“", "Lösung: curl -I http://127.0.0.1:10080/alt | grep Location"] },
          { id: 'q3', type: 'flag', flag: 'redirect', q: 'Flag am Ziel der Weiterleitung', points: 10, hints: ["Entweder das Ziel direkt abrufen oder curl die Weiterleitung folgen lassen (Option -L).", "Lösung: curl -L http://127.0.0.1:10080/alt"] },
        ],
      },
      {
        id: 't6', title: 'Kritisch bleiben & aufräumen',
        body: 'Der Server nennt sich „KLY-httpd/1.4“. Was er wirklich ist, weißt du aus seinem Header nicht.',
        questions: [
          { id: 'q1', type: 'mc', q: 'Wie prüfst du, welches Programm tatsächlich hinter Port 10080 steckt?', points: 10, options: ['Gegenprobe auf dem Host: laufende Prozesse/Container ansehen (docker ps, ps).', 'Dem Server-Header glauben.', 'Die Seite im Browser öffnen.'], answer: 0, hint: 'Welche Datenquelle ist unabhängig vom Server selbst?' },
          { id: 'q2', type: 'confirm', q: 'Maschine gestoppt (siehe Aufräumen) und mit curl geprüft, dass keine Verbindung mehr möglich ist (Fehler 7).', points: 5 },
        ],
      },
    ],
    nach: { beobachtung: 'Statuscodes 200/301/403/404, eigener X-Header, robots.txt mit internem Pfad.', schluss: 'curl zeigt dir, was ein Webserver wirklich sendet – mehr als der Browser.', grenzen: 'Header und robots.txt sind Selbstauskünfte. Das Ziel ist ein Trainingsserver.', naechster: 'Level 1 abschließen – danach „Ports & Dienste“ mit Nmap.' },
  },

  // ================================================================ R2
  {
    id: 'r2', title: 'Ports & Dienste', type: 'walkthrough', level: 'L2', difficulty: 'leicht', minutes: 40,
    requires: { lessons: [] },
    tools: ['nmap', 'nc (netcat)', 'curl'],
    desc: 'Eine Maschine, drei Dienste – einer davon lügt. Finde offene Ports mit Nmap, sprich die Dienste an und prüfe, was sie über sich behaupten.',
    ziel: 'Nmap im eigenen Scope einsetzen, Dienste identifizieren und Banner kritisch gegenprüfen.',
    scope: 'Ausschließlich 127.0.0.1, Ports 10100–10199. Niemals andere Adressen oder Netze scannen.',
    stop: 'Scan-Ziel ist nicht 127.0.0.1? → abbrechen (Strg+C). Ohne Root auf dem Handy nur -sT nutzen.',
    cleanup: 'PC: docker stop kly-r2 · Handy: Strg+C im Server-Fenster',
    machine: { kind: 'target', room: 'r2', ports: [10180, 10122, 10188] },
    tasks: [
      {
        id: 't1', title: 'Was ist ein Port-Scan?',
        body: T('Ein Port-Scan prüft, auf welchen TCP-Ports ein System Verbindungen annimmt. Nmap -sT baut dafür vollständige Verbindungen auf (geht ohne Root, auch in Termux).',
          '', 'Syntax:  nmap -sT -p 10100-10199 127.0.0.1',
          '-sT = TCP-Connect-Scan · -p = Portbereich · Ziel = genau eine Adresse',
          '', 'Ein Scan ist bereits eine Handlung gegenüber einem System. Deshalb gilt: nur eigene oder ausdrücklich freigegebene Ziele.'),
        questions: [
          { id: 'q1', type: 'mc', q: 'Warum scannst du nur 127.0.0.1 und nicht „mal kurz“ dein Heimnetz?', points: 10, options: ['Scope: Nur das freigegebene Ziel – andere Geräte (Router, Nachbarn, Familie) sind nicht freigegeben.', 'Weil Nmap Netze nicht kann.', 'Weil 127.0.0.1 schneller ist.'], answer: 0, hint: 'Wer hat welche Geräte freigegeben?' },
          { id: 'q2', type: 'confirm', q: 'Zielmaschine r2 gestartet (siehe Kasten oben).', points: 5 },
        ],
      },
      {
        id: 't2', title: 'Ports finden',
        body: 'Scanne den Portbereich 10100–10199 auf 127.0.0.1.',
        questions: [
          { id: 'q1', type: 'text', q: 'Wie viele Ports sind offen?', accept: [/^3$/], points: 10, hints: ["Zähle die Zeilen mit „open“.", "Lösung: nmap -sT -p 10100-10199 127.0.0.1 → Zeilen mit open zählen"] },
          { id: 'q2', type: 'text', q: 'Welcher offene Port ist der niedrigste?', accept: [/^10122$/], points: 5, hints: ["Nmap sortiert die Ausgabe aufsteigend.", "Lösung: die erste Zeile mit open in der Nmap-Ausgabe"] },
        ],
      },
      {
        id: 't3', title: 'Banner lesen',
        body: T('Manche Dienste senden direkt nach dem Verbindungsaufbau einen Text („Banner“). Mit netcat kannst du einfach eine Verbindung öffnen und lesen:',
          'nc 127.0.0.1 PORT   (beenden mit Strg+C)'),
        questions: [
          { id: 'q1', type: 'text', q: 'Welcher der offenen Ports spricht KEIN HTTP?', accept: [/^10122$/], points: 5, hints: ["curl -I auf alle drei – einer antwortet nicht mit HTTP.", "Wer kein HTTP spricht, liefert bei curl einen Fehler statt Header.", "Lösung: curl -I http://127.0.0.1:PORT/ für jeden offenen Port – der Banner-Dienst ist 10122"] },
          { id: 'q2', type: 'flag', flag: 'banner', q: 'Flag aus dem Banner', points: 10, hints: ["nc auf genau diesen Port.", "Lösung: nc 127.0.0.1 10122 (beenden mit Strg+C)"] },
        ],
      },
      {
        id: 't4', title: 'Banner lügen',
        body: T('Nmap kann mit -sV versuchen, Dienst und Version zu erkennen. Dafür nutzt es u. a. die Antworten der Dienste – also Selbstauskünfte.',
          'Prüfe Port 10188 mit curl -I und mit nmap -sV -p 10188 127.0.0.1.'),
        questions: [
          { id: 'q1', type: 'text', q: 'Welche Software behauptet Port 10188 zu sein? (Server-Header exakt)', accept: [/^Apache\/2\.4\.58 \(Ubuntu\)$/i], points: 5, hints: ["Zeile „Server:“.", "Lösung: curl -I http://127.0.0.1:10188/ | grep Server"] },
          { id: 'q2', type: 'flag', flag: 'web2', q: 'Flag von http://127.0.0.1:10188/', points: 10, hints: ["Den Inhalt abrufen, nicht nur die Header.", "Lösung: curl http://127.0.0.1:10188/"] },
          { id: 'q3', type: 'text', q: 'Gegenprobe: Welches Programm läuft tatsächlich? (PC: docker top kly-r2 · Handy: ps -o pid,args)', accept: [/^python3?$/i, /^python3? .*server\.py/i], points: 10, hints: ["Die Prozessliste zeigt das Programm, nicht der Header.", "PC: docker top kly-r2 zeigt die Prozesse im Container.", "Lösung: python3 (der Prozess heißt python3 … server.py r2)"] },
          { id: 'q4', type: 'mc', q: 'Was folgt daraus für Scan-Ergebnisse wie „Apache 2.4.58“?', points: 10, options: ['Versionsangaben sind Hinweise und brauchen eine Gegenprobe, bevor man daraus Schwachstellen ableitet.', 'Nmap irrt sich nie.', 'Man sollte nur Banner glauben, nicht Prozesslisten.'], answer: 0, hint: 'Woher hat Nmap die Information?' },
        ],
      },
      {
        id: 't5', title: 'Blue-Team-Sicht',
        body: 'Der Server protokolliert jede Verbindung. PC: docker logs kly-r2 · Handy: Ausgabe im Server-Fenster.',
        questions: [
          { id: 'q1', type: 'text', q: 'Von welcher Quell-IP kamen deine Scans laut Log? (bei Docker steht dort die Gateway-IP des Containernetzes, z. B. 172.17.0.1)', accept: [/^127\.0\.0\.1$/, /^172\.\d+\.\d+\.\d+$/], points: 10, hints: ["Die IP steht nach dem Raumkürzel in jeder Zeile.", "PC: docker logs kly-r2 · Handy: Server-Fenster ansehen.", "Lösung: am Handy 127.0.0.1, bei Docker meist 172.17.0.1"] },
          { id: 'q2', type: 'mc', q: 'Warum sieht der Container bei Docker nicht 127.0.0.1?', points: 10, options: ['Docker leitet die Verbindung über ein eigenes Netz (NAT) weiter – der Container sieht die Gateway-Adresse.', 'Weil der Scan von außen kam.', 'Weil das Log falsch ist.'], answer: 0, hint: 'Wo genau läuft der Container – direkt auf dem Host oder in einem eigenen Netz?' },
          { id: 'q3', type: 'confirm', q: 'Maschine r2 gestoppt.', points: 5 },
        ],
      },
    ],
    nach: { beobachtung: 'Drei offene Ports, ein Banner-Dienst, ein Dienst mit falschem Server-Header.', schluss: 'Nmap zeigt, was antwortet – nicht, was wirklich dahinter steckt. Gegenproben machen aus Hinweisen Belege.', grenzen: 'Nur Loopback, nur TCP-Connect. Firewalls, UDP und Filterregeln wurden nicht betrachtet.', naechster: 'Challenge „Leck im Dev-Server“ – diesmal ohne Anleitung.' },
  },

  // ================================================================ R3
  {
    id: 'r3', title: 'Leck im Dev-Server', type: 'challenge', level: 'L2', difficulty: 'mittel', minutes: 45,
    requires: { rooms: ['r2'] },
    tools: ['nmap', 'curl', 'gobuster/ffuf (PC)', 'docker logs'],
    desc: 'CHALLENGE ohne Anleitung. Ein Entwickler hat einen Vorschau-Server vergessen. Finde heraus, was er preisgibt – und belege es aus Red- UND Blue-Sicht.',
    ziel: 'Selbstständig Recon → Fund → Zugriff → Blue-Team-Gegenbeleg durchführen.',
    scope: 'Ausschließlich http://127.0.0.1:10280. Zugangsdaten aus dem Ziel nur gegen dieses Ziel verwenden.',
    stop: 'Kein Brute-Force gegen Logins. Keine anderen Ziele. Bei Unklarheit: stoppen und Raum „Ports & Dienste“ wiederholen.',
    cleanup: 'PC: docker stop kly-r3 · Handy: Strg+C im Server-Fenster',
    machine: { kind: 'target', room: 'r3', ports: [10280] },
    tasks: [
      {
        id: 't1', title: 'Rekognoszierung', body: 'Was läuft da, und welche Pfade gibt es? Wortliste auf Kali: /usr/share/wordlists/dirb/common.txt',
        questions: [
          { id: 'q1', type: 'text', q: 'In welchem Verzeichnis liegt die Sicherung? (z. B. /name/)', accept: [/^\/?backup\/?$/i], points: 15, hints: ["Verzeichnissuche mit Wortliste – oder überlege, wie Entwickler Sicherungsordner nennen.", "Kali: gobuster dir -u http://127.0.0.1:10280 -w /usr/share/wordlists/dirb/common.txt", "Der Ordner heißt auf Englisch „Sicherung“.", "Lösung: /backup/"] },
          { id: 'q2', type: 'flag', flag: 'user', q: 'User-Flag', points: 20, hints: ["Die Sicherung ist eine Textdatei.", "curl http://127.0.0.1:10280/backup/ zeigt den Dateinamen.", "Lösung: curl http://127.0.0.1:10280/backup/config.bak"] },
        ],
      },
      {
        id: 't2', title: 'Zugriff', body: 'Es gibt einen geschützten Bereich.',
        questions: [
          { id: 'q1', type: 'text', q: 'Welcher Pfad verlangt eine Anmeldung?', accept: [/^\/?admin\/?$/i], points: 10, hints: ["Welcher Pfad antwortet mit 401?", "Die Wortliste aus Task 1 findet ihn auch. 401 heißt „Anmeldung nötig“.", "Lösung: /admin"] },
          { id: 'q2', type: 'text', q: 'Welches Authentifizierungsverfahren verlangt er? (Header WWW-Authenticate)', accept: [/^basic$/i], points: 10, hints: ["curl -I auf den Pfad.", "Lösung: curl -I http://127.0.0.1:10280/admin → WWW-Authenticate: Basic"] },
          { id: 'q3', type: 'flag', flag: 'admin', q: 'Admin-Flag', points: 25, hints: ["curl kann Benutzer:Passwort mit -u mitschicken.", "Benutzer und Passwort stehen in config.bak (admin_user, admin_pass).", "Lösung: curl -u wartung:PASSWORT http://127.0.0.1:10280/admin"] },
        ],
      },
      {
        id: 't3', title: 'Blue-Team-Gegenbeleg', body: 'Jetzt die andere Seite: Was hat der Server über dich protokolliert?',
        questions: [
          { id: 'q1', type: 'text', q: 'Welcher Benutzername steht im Log bei der erfolgreichen Anmeldung?', accept: [/^wartung$/i], points: 10, hints: ["Suche im Log nach AUTH.", "PC: docker logs kly-r3 | grep AUTH", "Lösung: wartung"] },
          { id: 'q2', type: 'text', q: 'Mit welchem HTTP-Status antwortete /admin auf Anfragen ohne gültige Anmeldung?', accept: [/^401$/], points: 5, hints: ["Steht in jeder Zugriffszeile.", "Lösung: 401"] },
          { id: 'q3', type: 'mc', q: 'Welche Maßnahme schließt die Lücke ZUERST und am wirksamsten?', points: 15, options: ['Sicherung vom Webserver entfernen UND das Passwort ändern – es ist kompromittiert.', 'Nur /backup/ in robots.txt eintragen.', 'Den Server-Header ändern.'], answer: 0, hint: 'Was bleibt gefährlich, wenn die Datei weg ist, das Passwort aber gleich?' },
          { id: 'q4', type: 'mc', q: 'Welche Detection-Idee passt zu diesem Fall am besten?', points: 15, options: ['Alarm bei Abruf von Dateien unter /backup/ oder mit Endungen wie .bak – plus erfolgreiche Anmeldung kurz danach von derselben Quelle.', 'Alarm bei jedem 200-Status.', 'Alarm, wenn jemand robots.txt liest – das allein beweist einen Angriff.'], answer: 0, hint: 'Welche Kombination unterscheidet den Angriff von normalem Verkehr?' },
          { id: 'q5', type: 'confirm', q: 'Maschine r3 gestoppt.', points: 5 },
        ],
      },
    ],
    nach: { beobachtung: 'Ungeschützte Sicherung mit Zugangsdaten → Adminzugang; beides im Serverlog sichtbar.', schluss: 'Ein Fund ist erst vollständig mit Gegenbeleg aus Sicht der Verteidigung und einer Maßnahme.', grenzen: 'Trainingsziel mit absichtlicher Lücke. Echte Systeme haben mehr Rauschen und weniger hilfreiche Logs.', naechster: 'Diese Detection-Idee wird in Level 8 zu einer echten Sigma-Regel.' },
  },
];

// Reihenfolge: erst Sandbox-Raum, dann die Wargames neben den Zielmaschinen-Räumen
const byId = Object.fromEntries([...BASE_ROOMS, ...WARGAMES].map(r => [r.id, r]));
export const ROOMS = ['r0', 'w1', 'r1', 'w2', 'r2', 'r3'].map(id => byId[id]);

// Abzeichen (aus dem Lernstand abgeleitet – nicht speicherbar, nicht fälschbar über Merge)
export const BADGES = [
  { id: 'erste-flag', icon: '⚑', title: 'Erste Flag', desc: 'Eine Flag gefunden.' },
  { id: 'echter-beleg', icon: '✓', title: 'Echter Beleg', desc: 'Einen echten Kali-Auftrag bestanden.' },
  { id: 'zielmaschine', icon: '⌁', title: 'Zielmaschine', desc: 'Eine Frage an einer echten Zielmaschine gelöst.' },
  { id: 'erster-raum', icon: '▣', title: 'Raum gemeistert', desc: 'Einen Raum vollständig abgeschlossen.' },
  { id: 'ohne-hinweis', icon: '◎', title: 'Ohne Netz', desc: 'Einen Raum ohne einen einzigen Hinweis abgeschlossen.' },
  { id: 'challenge', icon: '⚔', title: 'Challenger', desc: 'Einen Challenge-Raum abgeschlossen.' },
  { id: 'nachtfalter', icon: '🦋', title: 'Nachtfalter', desc: 'Das Handy-Wargame komplett gelöst.' },
  { id: 'kellerserver', icon: '🗝', title: 'Bis zum Chef', desc: 'Den Kellerserver komplett geknackt.' },
  { id: 'story-1', icon: '▶', title: 'Stiller Alarm', desc: 'Story-Mission 1 abgeschlossen.' },
  { id: 'level-1', icon: '★', title: 'Linux-Grundlagen', desc: 'Prüfung Level 1 bestanden.' },
  { id: 'streak-3', icon: '🔥', title: '3-Tage-Serie', desc: 'An 3 Tagen in Folge gelernt.' },
  { id: 'streak-7', icon: '🔥', title: '7-Tage-Serie', desc: 'An 7 Tagen in Folge gelernt.' },
];
