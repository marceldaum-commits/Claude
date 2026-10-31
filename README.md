# Kali Level Up

Interaktive Lern-App **vom Linux-Anfänger zum Pentester** (Endziel: bereit für das eJPT) – mobile-first (Galaxy S23) und am PC
neben einer Kali-VM nutzbar. Installierbare PWA, offlinefähig, ohne Build-Schritt.

## Was ist echt, was simuliert?

| Bereich | Art |
|---|---|
| Sandbox-Terminal, Fallakten, Prüfungs-Praxis | **Simulation** im Browser: synthetisches Dateisystem, keine echte Shell, kein Netzwerk. Überall sichtbar markiert. |
| „Echte Aufträge“ (Übungen und Story-Szenen) | Du führst sie in **deiner Kali-VM oder Termux/NetHunter Rootless** aus und fügst Befehl + Ausgabe ein. Die App prüft die Ausgabe nach festen Kriterien (inkl. persönlichem Lab-Token und Scope-Prüfung). Sie startet **nichts** auf deinem Gerät. |
| Sync PC ↔ Handy | Optional über Supabase (siehe [docs/SUPABASE-SETUP.md](docs/SUPABASE-SETUP.md)). Ohne Einrichtung: rein lokal + Export/Import. |
| KI-Coach | Noch nicht angebunden. Es werden keine Daten an eine KI übertragen. |

## Lernprinzip (ab 1.2.0): erst hacken, dann nachschlagen

- **Keine Sperren mehr:** Level und Räume sind offen. Die Prüfung Level 1 ist freiwillig (Abzeichen).
- **Räume sind der Hauptweg.** „Nächster Schritt“ führt zum nächsten offenen Raum; Lektionen dienen als Nachschlagewerk.
- **Lernpfad auf Pentest ausgerichtet:** Netzwerk-Aufklärung → Web-Hacking → Skripte → Linux-Rechte & Root →
  Passwörter → Exploits → Netzwerkdienste → Spuren & Verteidigung → eJPT-Vorbereitung.
- **Werkzeugkasten:** zeigt die Kali-Werkzeuge, mit denen du schon wirklich Flags gefunden hast.
- **Externe Übungsplattformen** (Bandit, TryHackMe, PortSwigger Academy, Hack The Box) direkt verlinkt.

## Purple-Team-Leitern für Level 5–8 und 10 (ab 2.3.0)

Prüfer-/Purple-Team-Sicht: Fehlkonfigurationen finden, die ein Angreifer nutzen würde, bewerten und schließen –
ohne Exploits oder Passwort-Knacken. Je 6–8 Stufen, erfundene Systeme, alle per Test durchgespielt.

| Leiter | Level | Themen |
|---|---|---|
| p5 Audit im Rechenzentrum | 5 | zweite UID 0, leere Passwörter, fremde SUID-Programme, sudo NOPASSWD ALL, beschreibbare Cron-Skripte, PATH, SSH-root |
| p6 Der Passwort-Tresor | 6 | Hash-Arten erkennen, fehlender Salt, Richtlinien, Geheimnisse im Code, Salt-Prüfung, Leak-Abgleich, bcrypt-Kostenfaktor |
| p7 Schwachstellen-Sprechstunde | 7 | Inventar ↔ Datenbank, `suche` (wie searchsploit), CVSS, Fehlalarm per Gegenprobe, Patch-Kontrolle, Priorisierung |
| p8 Das Firmennetz | 8 | SMB-Freigaben, Geheimnis-Dateien, AD-Konten, verschachtelte Admin-Gruppen, alte Konten, SMBv1, Ereignis 4625 |
| p10 Die Abschlussprüfung | 10 | Scope, Header, Pfadsuche, Leck bewerten, Konten prüfen, Logs, Kodierung, Maßnahmen priorisieren |

## Fünf weitere Leitern (ab 2.2.0)

Lernen → 🎮 Leitern, sortiert nach Art und Schwierigkeit (je 10 Stufen, Story, Tipp-Leiter, 🔁):

| Leiter | Art | Stufe | Themen |
|---|---|---|---|
| w5 Das Stellwerk | Linux | schwerer | grep -ril, awk-Filter, sort -t -k, diff, xxd, sha256sum, strings, cut -c, Schleifen |
| w8 Der Tresorraum | Linux | schwer | find mit mehreren Bedingungen, awk NF, Quoting, export, $((…)), Listen vergleichen/verknüpfen, grep -o |
| w6 Die Bewerbung | Hacking (CTF) | leicht | Quelltext, robots.txt, Header, Cookies, JS, .bak, .env, Prüfsummen, Metadaten, Sitemap |
| w7 Operation Nebel | Hacking (CTF) | mittel | Zonendatei, Pfadsuche, JWT, API, Git-Verlauf, Konfig-Diff, Kodierungskette, Mitschnitt, Logs |
| w9 Das Phantom | Hacking (CTF) | schwer | Base64url, JWT-Kopf, Klartext-Protokolle, MD5, Log-Korrelation, XOR, Akrostichon, Mehrfach-Kodierung |

„Hacking“ heißt hier: CTF-Disziplinen Aufklärung, Datenlecks, Kodierung/Krypto und Forensik in erfundenen Systemen –
keine Exploits oder Passwort-Angriffe. Neu in der Shell: `<` Eingabeumleitung, `grep -o` und Grund-Regex (`\+`),
`xxd` (auch `-r -p`), `strings`, `sha256sum`, `md5sum`, `head/tail -c`, `basename`, `dirname`.
Die Tests spielen alle 50 Stufen mit den Lösungswegen der Tipps durch.

## Wargame „Der Funkturm“ (ab 2.1.0)

Deutsches Linux-Wargame mit 20 Etagen (w4), mobil und am PC spielbar: Jede Nacht sendet der alte Funkturm von
Radio Talheim ein fremdes Signal – Etage für Etage geht es nach oben. Themen: Leerzeichen/Bindestriche in Namen,
`sed -n`, `wc -l`, `find -size/-perm`, `grep -v`, `uniq -u`, `diff`, `sort -t -k`, `cut -c`, doppeltes Base64,
`rev`+ROT13, Rechte, Schleifen, Skripte lesen, `grep -n`+Zeilenbereiche, Auswertung von Anmeldungen.
Die Sandbox-Shell kann dafür zusätzlich `diff`, `uniq -u/-d`, `sort -t/-k`, `cut -c`, `find -size/-empty`;
`wc` rückt wie GNU wc ein, `exit` beendet Skripte.

## Level 4 und 9, Lernpfade für alle Level (ab 2.0.0)

- **Mini-Bash in der Sandbox:** Variablen, `$(…)`, `$((…))`, `for`, `while read … < DATEI`, `if/elif/else` mit `[ … ]`,
  ausführbare Skripte (`./skript.sh`, braucht `chmod +x`), dazu `tr`, `sed` (s///, Np, Nd), `awk` (Felder, Muster,
  Summen), `seq`, `grep -q/-h`.
- **w3 Nachtfalter II: Das Kollektiv** (Level 4, Handy/PC): Maras Geschichte geht weiter – 9 Stufen mit Variablen,
  Schleifen, Bedingungen, tr/sed/awk und einem selbst geschriebenen Skript; 🔁 Wiederholungen aus Nachtfalter.
- **b1 Die Nacht im Kollektiv** (Level 9): erfundener Einbruch, Logs auswerten (Brute-Force, Web-Scan, offene Sicherung,
  Login, Befehlsverlauf), Zeitleiste und Gegenmaßnahmen. Adressen aus den Dokumentations-Bereichen (RFC 5737).
- **Lernpfade** mit kostenlosen, legalen Übungsquellen für Level 4–8 und 10.

## Labs vom Handy spielen (ab 1.8.0)

Mehr → „Labs vom Handy spielen“: Schritt-für-Schritt-Anleitung, um Kellerserver, Juice Shop und Zielmaschinen
vom Handy aus zu nutzen. Die Labs bleiben in der Kali-VM auf `127.0.0.1`; das Handy verbindet sich über **Tailscale**
(privates VPN, kostenlos) per SSH mit der VM, Webseiten per SSH-Tunnel (`ssh -N -L PORT:127.0.0.1:PORT`).
Tailscale-Adresse und Kali-Benutzer lassen sich eintragen, damit die Befehle direkt passen.

## Netzwerk-Aufklärung (ab 1.7.0, Level 2)

- **n1 Inventur bei den Stadtwerken** (Handy + PC, Sandbox): erfundenes Firmennetz `10.10.20.0/24` mit sechs Geräten,
  **simuliertes** `nmap` (`-sn`, `-p-`, `-p`, `-sV`, `-sU`, `-sC/-A`, `-oN`) und `nc`. Kein echter Netzwerkverkehr;
  Ziele außerhalb des Auftrags werden verweigert.
- **Lernpfad „echte Scans ohne Abo“** auf der Level-2-Seite: eigener Raum r2 und kostenlose Hack-The-Box-Starting-Point-Maschinen.

## Web-Hacking (ab 1.5.0, Level 3)

- **h1 Was die Webseite verrät** (Handy/Sandbox): Mitschnitte eines erfundenen Shops lesen – Cookie mit Rolle,
  geschwätzige API, fehlende Zugriffsprüfung. Reine Analyse, keine Angriffe.
- **j1 Juice Shop – erste Schritte** (PC): offizielles OWASP-Übungsprojekt per Docker nur auf `127.0.0.1:3000`,
  mit Burp Suite mitlesen, versteckte Punktetafel finden, erste Ein-Stern-Aufgaben. Lösungswege: offizielles Begleitbuch.
- **PortSwigger-Lernpfad** auf der Level-3-Seite (kostenlose Online-Labs).

## Tipp-Leiter statt Schwierigkeitsgrad (ab 1.4.0)

Zu jeder Frage gibt es 1–5 Tipps, vom Denkanstoß bis zur Lösung. Sie sind **sofort** abrufbar, Stufe für Stufe.
Jeder Tipp kostet einen gleichen Anteil der Punkte der Frage (mindestens 1 Punkt bleibt). Die Lösung kommt erst nach
einer Rückfrage. Aufgedeckte Tipps werden synchronisiert (beim Zusammenführen gilt das Maximum).

## Wargames (ab 1.3.0) – Linux als Spiel

Jedes Level ist ein Rätsel, die Lösung (Code `KLY{…}`) öffnet das nächste. Zwei getrennte Geschichten:

| Spiel | Wo | Story | Technik |
|---|---|---|---|
| **w1 Nachtfalter** | Handy/überall, im App-Terminal | Du findest das Handy der Hackerin Mara Falk – zehn verschlossene Stufen. | Sandbox-**Simulation**, `entsperren CODE` öffnet die nächste Stufe |
| **w2 Der Kellerserver** | PC, Kali-VM | Erster Tag im IT-Team einer (erfundenen) Spedition: Konto für Konto bis zum Chef. | Echter Debian-Server per Docker + **SSH** (`labs/kly-keller`), nur `127.0.0.1:2220` |

Themen Nachtfalter: versteckte Dateien, Dateigrößen, `grep -r`, `sort | uniq -c`, `chmod`, `base64`, `rev`, `find -perm`, Pipelines.
Themen Kellerserver: SSH, `.bash_history`, `grep` in großen Dateien, `tar`, `file`/`zcat`, `ps aux`, Gruppen & `find -group`,
`git log -p`, SSH-Schlüssel, `curl -H` gegen einen internen Dienst.

## Räume nach dem TryHackMe-Prinzip (ab 1.1.0)

- **Räume** mit nummerierten Tasks, Fragen und **Flags** (`KLY{…}`). Flags werden aus dem persönlichen
  Lab-Token berechnet – jede Person hat eigene, Abschreiben funktioniert nicht.
- **Walkthroughs** (geführt, mit Erklärungen) und **Challenges** (ohne Anleitung, Hinweis erst nach 3 Versuchen).
- **Zielmaschinen** (`labs/kly-target`): absichtlich verwundbare, synthetische Trainingsziele.
  PC: per Docker, Ports nur auf `127.0.0.1`. Handy: dasselbe Skript direkt in Termux (`python server.py r1`).
- **Lernpfade** (Level 1–10), **Abzeichen**, **Raum-Punkte** und **Lernserie** – reine Motivation,
  sie schalten keine Prüfung frei.

| Raum | Typ | Level | Ziel |
|---|---|---|---|
| r0 Terminal-Spuren | Walkthrough | 1 | Sandbox-Simulation |
| r1 Erste Zielmaschine | Walkthrough | 1 | echtes Ziel, curl |
| r2 Ports & Dienste | Walkthrough | 2 | echtes Ziel, nmap/nc |
| r3 Leck im Dev-Server | Challenge | 2 | echtes Ziel, Red + Blue |

## Inhalt (Stand 1.0.0)

- **Level 1 – Linux Grundlagen: vollständig ausgearbeitet**
  - 11 Lektionen (Zweck, Syntax, Argumente, Wirkung, typische Fehler, sichere Regel)
  - 22 Übungen: 13 Sandbox-Übungen, 6 echte Kali-Aufträge, 2 Wiederholungsrunden, 3 optionale Drills
  - jede Übung mit Lernziel, einem Auftrag, Scope, Beleg, Knobelfrage, max. einem gestuften Hinweis
    (erst nach 2 eigenen Versuchen) und Nachbesprechung
  - kumulative Prüfung: 25 Aufgaben inkl. 3 Praxisaufgaben, **≥ 85 % und alle Pflichtaufgaben (★)**
- **Story-Mission 1 „Der stille Alarm“** (SOC-Fall, 8 Szenen): simulierte Fallakte im Terminal +
  echte Schritte mit curl, ps, kill, chmod, ls auf `127.0.0.1:8080` in deiner eigenen Umgebung,
  Beweiskette bis Retest und Übergabebericht.
- **Level 2–10**: Lehrplan und Werkzeugzuordnung stehen, Inhalte folgen. Gesperrt bis zur
  bestandenen Vorgänger-Prüfung.
- Lernortwahl (PC / Handy / beides / Windows), Tagesmissionen, dauerhaftes Aufgabenarchiv
  (Wiederholung ohne XP), Werkzeugkatalog, Export/Import, lokale Sicherungen, App-Download als ZIP
  (neutral oder mit bewusst gewähltem Lernstand-Snapshot).

## Lokal starten

```bash
python3 -m http.server 8000 --bind 127.0.0.1
# dann http://127.0.0.1:8000 öffnen
```

(Service Worker und Installation brauchen `http://127.0.0.1`/`localhost` oder `https`.)

## Tests

```bash
npm test        # oder: node tests/run.mjs
npm run check   # Syntaxprüfung aller Module + Tests
```

Die Tests prüfen u. a. die Shell-Engine, die Belegprüfung (inkl. Scope-Verstöße und Geheimnisfilter),
das konservative Zusammenführen von Lernständen, die Vollständigkeit jeder Übung und lösen **jede
Sandbox-Übung und Prüfungs-Praxisaufgabe mit einer Musterlösung**, damit nichts Unlösbares
veröffentlicht wird.

## Veröffentlichen

Privat über **Cloudflare Pages + Cloudflare Access** – Schritt für Schritt in
[docs/CLOUDFLARE-DEPLOY.md](docs/CLOUDFLARE-DEPLOY.md). Kein Build-Schritt nötig; `_headers` setzt
Sicherheits-Header (CSP, noindex). Sync-Einrichtung: [docs/SUPABASE-SETUP.md](docs/SUPABASE-SETUP.md).

## Projektstruktur

```
index.html, manifest.webmanifest, sw.js, app-files.js, config.js
css/app.css
js/main.js          App, Router, Ansichten
js/shell.js         Sandbox-Shell (Simulation, DOM-frei, testbar)
js/terminal-ui.js   Terminal-Widget (Touch + Tastatur)
js/verify.js        Prüfung echter Terminal-Belege, Scope-Prüfung
js/state.js         Lernstand, Merge, Prüfungsauswertung
js/sync.js          Supabase-Sync (optional)
js/export.js        Export/Import, App-ZIP
js/content/         Lehrplan, Level 1, Story, Werkzeuge
supabase/schema.sql Tabelle + Row Level Security
tests/run.mjs       Tests ohne Abhängigkeiten
```

## Sicherheit

- Alle Netzwerkübungen sind auf **127.0.0.1/localhost** begrenzt; die Belegprüfung lehnt andere
  Ziele mit einer STOPP-Meldung ab.
- Keine echten Zugangsdaten in Übungen; eingefügte Ausgaben werden auf typische Schlüssel geprüft.
- `config.js` enthält höchstens den öffentlichen Supabase-anon-Key, nie den service_role-Key.
