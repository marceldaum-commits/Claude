# Kali Level Up

Interaktive Lern-App **vom Linux-Anfänger bis zum Purple Team** – mobile-first (Galaxy S23) und am PC
neben einer Kali-VM nutzbar. Installierbare PWA, offlinefähig, ohne Build-Schritt.

## Was ist echt, was simuliert?

| Bereich | Art |
|---|---|
| Sandbox-Terminal, Fallakten, Prüfungs-Praxis | **Simulation** im Browser: synthetisches Dateisystem, keine echte Shell, kein Netzwerk. Überall sichtbar markiert. |
| „Echte Aufträge“ (Übungen und Story-Szenen) | Du führst sie in **deiner Kali-VM oder Termux/NetHunter Rootless** aus und fügst Befehl + Ausgabe ein. Die App prüft die Ausgabe nach festen Kriterien (inkl. persönlichem Lab-Token und Scope-Prüfung). Sie startet **nichts** auf deinem Gerät. |
| Sync PC ↔ Handy | Optional über Supabase (siehe [docs/SUPABASE-SETUP.md](docs/SUPABASE-SETUP.md)). Ohne Einrichtung: rein lokal + Export/Import. |
| KI-Coach | Noch nicht angebunden. Es werden keine Daten an eine KI übertragen. |

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

Die App ist eine statische Seite. Sie kann auf jedem statischen Hosting laufen, das **https** bietet.
Private Bereitstellung: Hosting mit Zugriffsschutz wählen (z. B. Cloudflare Pages + Cloudflare Access,
Netlify mit Passwortschutz). `index.html` setzt `noindex`.

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
