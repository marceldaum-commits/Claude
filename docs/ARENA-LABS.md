# Arena – Übersicht aller Labs

> Automatisch erzeugt aus `arena/server.js` mit `node tools/arena-uebersicht.mjs`. Nicht von Hand ändern.

Insgesamt **21 Arenen** in drei Reihen. Zugang: **Arena-Zugang** (Grundstufe) oder **Profi-Arena-Zugang**.

## 🗝️ Hacken

| Arena | Team | Stufe | Codes | Zugang | Themen |
|---|---|---|---|---|---|
| **Der Meister: Das Rechenzentrum** | 🔴 Rot | Meister | 6 | Profi | #Pivoting #Exploitation #Netzwerk #Linux |
| **Der Kellerserver** | 🔴 Rot | Einsteiger | 10 | Arena | #Linux #Rechte #Passwörter |
| **Die Leitstelle** | 🔴 Rot | Fortgeschritten | 6 | Profi | #Netzwerk #Dienste #Linux |
| **Der Webshop** | 🔴 Rot | Fortgeschritten | 6 | Profi | #Web #Injection |
| **Web 1: Das Kleingedruckte** | 🔴 Rot | Fortgeschritten | 6 | Arena | #Web |
| **Der Chiffrensaal** | 🔴 Rot | Fortgeschritten | 5 | Profi | #Krypto |
| **Der Tresor** | 🔴 Rot | Experte | 6 | Profi | #Krypto #Web #Linux |
| **Web 2: Umwege** | 🔴 Rot | Experte | 6 | Profi | #Web #Injection #Netzwerk |
| **Die Werkstatt** | 🔴 Rot | Experte | 5 | Profi | #Reverse #Binär |
| **Der Flüsterer** | 🔴 Rot | Experte | 6 | Profi | #KI-Sicherheit #Prompt Injection |
| **Web 3: Die Kette** | 🔴 Rot | Extrem | 6 | Profi | #Web #Injection |

- **Der Meister: Das Rechenzentrum** (Meister): Die Königsklasse: durch ein simuliertes internes Netz (mehrere Konten = Maschinen) bis zum Kern pivotieren – Hash knacken, echter Buffer Overflow (ret2win), Rechteausweitung bis root.
- **Der Kellerserver** (Einsteiger): Ein alter Firmenserver: Arbeite dich Konto für Konto bis zum Chef durch – versteckte Dateien, Verläufe, Rechte, Schlüssel.
- **Die Leitstelle** (Fortgeschritten): Netzwerk & Dienste: offene Ports finden, mit Diensten sprechen, versteckte Web-Bereiche, eigenes Protokoll, Protokolle auswerten, unsichere Automatik.
- **Der Webshop** (Fortgeschritten): Web-Hacking mit curl: vergessener Testzugang, fremde Bestellungen, Rollen-Cookie fälschen, SQL-Injection, Befehle einschleusen, Signatur selbst bauen.
- **Web 1: Das Kleingedruckte** (Fortgeschritten): Web-Grundlagen mit curl: versteckte Pfade (robots.txt), HTTP-Methoden, versteckte Parameter, Pfad-Ausbruch, vergessene Backup-Datei, gefälschte Header.
- **Der Chiffrensaal** (Fortgeschritten): Kryptoanalyse: klassische Chiffren brechen – Caesar, XOR mit Byte und Schlüsselwort, Kodierungs-Ketten und Vigenère. Jede Nachricht enthält ihren Code.
- **Der Tresor** (Experte): Für Experten: Passwort-Hash knacken, Geheimnisse in Git und Logs, PATH-Falle, Pfad-Ausbruch in einer API, verschlüsselter Tresor.
- **Web 2: Umwege** (Experte): Web mittel: SQL-Login umgehen, mit UNION fremde Tabellen lesen, SSRF auf interne Dienste, unsicheres Zusatzfeld, Token fälschen (JWT alg=none), file://.
- **Die Werkstatt** (Experte): Reverse Engineering: fünf kleine Programme (Crackmes) ohne Quelltext knacken – mit strings, ltrace, objdump, gdb und einer selbst gebauten Keygen.
- **Der Flüsterer** (Experte): KI-Sicherheit: einen lokalen KI-Assistenten per Prompt Injection austricksen, damit er sein geheimes Codewort verrät – durch sechs immer strengere Schutzregeln.
- **Web 3: Die Kette** (Extrem): Web extrem: Template-Injection, unsichere Deserialisierung, Race Condition, Blind-SQL-Injection, SSRF mit umgangener Sperre, XXE.

## 🔍 Ermitteln

| Arena | Team | Stufe | Codes | Zugang | Themen |
|---|---|---|---|---|---|
| **Die Spurensuche** | 🔵 Blau | Einsteiger | 5 | Arena | #Forensik #Logs |
| **Das Versteck** | 🔵 Blau | Fortgeschritten | 5 | Profi | #Steganografie #Forensik |
| **Der Einbruch** | 🔵 Blau | Experte | 6 | Profi | #Forensik #Logs #Schadsoftware |
| **Der Mitschnitt** | 🔵 Blau | Experte | 5 | Profi | #Netzwerk #Forensik #Logs |
| **Der Maulwurf** | 🔵 Blau | Extrem | 6 | Profi | #Forensik #Netzwerk #Krypto |

- **Die Spurensuche** (Einsteiger): Deine erste Ermittlung: Wer hat nachts die Firmen-Webseite verändert? Mit ls, grep, diff und base64 den Spuren folgen.
- **Das Versteck** (Fortgeschritten): Steganografie: versteckte Daten finden – hinter Bildern, in Archiven, in Leerzeichen und im niederwertigsten Bit von Pixeln.
- **Der Einbruch** (Experte): Blue Team: Ein Server wurde gehackt. Finde in Protokollen, Verlauf, Cronjobs und verschleierter Schadsoftware heraus, wer, wie und was gestohlen hat.
- **Der Mitschnitt** (Experte): Netzwerk-Forensik: einen aufgezeichneten Datenverkehr (pcap) mit tshark auswerten – Klartext-Login, Datei-Diebstahl, DNS-Ausleitung und ein verstecktes Kommando.
- **Der Maulwurf** (Extrem): Werksspionage von innen: Zeitzonen, wiederverwendete IP-Adressen, DNS-Ausleitung zusammensetzen, Prüfsummen, Zeitstempel, verschlüsseltes Archiv.

## 🛡️ Abwehren

| Arena | Team | Stufe | Codes | Zugang | Themen |
|---|---|---|---|---|---|
| **Angriff! Offene Türen** | 🔵 Blau | Einsteiger | 5 | Arena | #Rechte #Passwörter |
| **Angriff! Die Hintertür** | 🔵 Blau | Fortgeschritten | 6 | Profi | #Web #Injection #Linux |
| **Die Härtung** | 🔵 Blau | Fortgeschritten | 6 | Profi | #Härtung #Rechte #Linux |
| **Angriff! Der Profi** | 🔵 Blau | Extrem | 6 | Profi | #Threat Hunting #Linux |
| **Das Duell: Mann gegen Maschine** | 🔵 Blau | Extrem | 6 | Profi | #Threat Hunting #Rechte #Persistenz |

- **Angriff! Offene Türen** (Einsteiger): Ein Hacker-Bot greift deinen Rechner live an. Mach die Lücken dicht, bevor er Schaden anrichtet: Passwort, Rechte, Debug-Modus, Upload-Ordner, fremder Schlüssel.
- **Angriff! Die Hintertür** (Fortgeschritten): Der Hacker wird frecher: PIN-Brute-Force, giftige Dateinamen, Hintertür mit Autostart, Schlüssel in der Git-Historie, PATH-Falle, zu weite Freigabe.
- **Die Härtung** (Fortgeschritten): Blue Team: einen absichtlich unsicheren Server absichern – Rechte, SSH-Konfig, unnötige Dienste, Autostart-Hintertür und ein schwaches Passwort. Der Prüfdienst gibt pro behobener Lücke einen Code.
- **Angriff! Der Profi** (Extrem): Der Profi ist längst drin: getarnte Prozesse, versteckte Autostarts, lügende Befehle, präparierter Schlüssel, Wanze, Zeitbombe, Git-Haken. Traue nichts.
- **Das Duell: Mann gegen Maschine** (Extrem): Ein lebendiger Gegner: Der Hacker-Bot prüft live, welche Lücken offen sind, greift eine zufällige davon an und wird immer schneller. Mach alles dicht – jede geschlossene Lücke gibt einen Code.

## Hinweise
- Jede Arena ist ein eigener, abgeschotteter Linux-Container (kein Netz, nach max. 2 Stunden gelöscht).
- Codes `KLY{…}` entstehen aus einem geheimen Server-Salz pro Konto; Prüfung nur serverseitig.
- Handbuch und Handouts: `arena/public/handbuch.html`. Im Lab: `hilfe` und `begriff WORT`.
