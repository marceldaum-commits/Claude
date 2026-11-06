# Nachtfalter Hacklab – Roadmap

Ziel (Marcel): **die modernere, mindestens gleich gute Alternative zu TryHackMe/HackTheBox** –
mobil-first, deutsch, KI-Sicherheit eingebaut, anfängerfreundlich & fair. Lebendes Dokument,
wird abgearbeitet und fortgeschrieben. Entwickeln auf `ccr-63912bdd-xpv8bk`, live erst nach Marcels „ok".

## ⭐ LEITSTERN / Alleinstellungsmerkmal (höchste Priorität – durchgehend ausbauen)
**KI-Sicherheit zum Anfassen – echte, angreifbare KI im Browser, statt nur Theorie.** Das haben die Großen
(noch) nicht; deutschsprachig ist das Feld fast leer. Positionierung: „Die deutschsprachige Plattform, auf der
du KI-Sicherheit wirklich übst – echte KI angreifen *und* verteidigen, mit KI-Mentor." Dauerauftrag: laufend
verbessern, korrigieren, erweitern – besser werden. Vollausbau mit Theorie + Lehrpfad + Arenen + Übungen.
- **KI-Angriffs-Labor (live):** Chatbot mit Geheimnis im System-Prompt. Stufen: Geheimnis entlocken →
  Schutzregeln umgehen → indirekte Injection (Gift im „Dokument") → Datenabfluss. Flag pro Konto, serverseitig.
  (Phase 1 deterministisch/anti-cheat; später echter LLM dahinter mit Kostenbremse – API-Key von Marcel.)
- **KI-Verteidigung:** Nutzer härtet selbst einen System-Prompt, unser Prüfer greift mit Standard-Tricks an –
  hältst du stand, gewinnst du. (Angriff **und** Abwehr – macht kaum jemand.)
- **Deepfake- & KI-Phishing-Erkennung** (defensiv, hochaktuell): KI-Fälschungen entlarven.
- **KI-Mentor:** Begleiter, der beim Feststecken erklärt, gestufte Tipps gibt, Übungen aufs Niveau generiert.
- **Theorie + Lehrpfad + Übungen** rund um alles oben; **SEO** der Startseite/App darauf ausrichten.

## ✅ Kürzlich fertig
- **KI-Sicherheit Phase 1 – in Arbeit** (siehe Leitstern)
- Advent-Kalender „Advent of Hacking" (24 Themen-Türchen, streng/anti-cheat, Nachtfalter-Look) – live
- Wochen-Mission (+50 XP) · Teilbares öffentliches Profil (+ p.html) · Startseite DE/EN-Umschalter – live
- Technik-Lücken geschlossen: Active Directory (Kerberoasting, AS-REP, PtH, BloodHound, GPO) + SOC/Detection – live
- SEO (Startseite indexierbar, gzip, Sitemap, Search Console)
- CTF des Tages (2/Tag pro Konto, serverseitig, anti-cheat) + Streak + Punkte + Bestenliste
- Einheitlicher XP-/Streak-Wert über alles (Räume + Arena + CTF)
- Erfahrungsstufe beim Erststart (Anfänger/Etwas/Profi/**Experte ohne Tipps**), im Profil änderbar
- Räume/Arenen stufengerecht sortiert
- Urkunde/Leistungsnachweis als PDF (kompakt + **ausführlich**), auch in der Zentrale druckbar
- Faires Tipp-Modell bestätigt (Tipps mindern nur die Aufgaben-Punkte, nie das Konto; min. 1 Punkt bleibt)
- Sicherheits-Härtung #29–#33, Umzug-Runbook, Geheimnis-Checkliste

## 🔜 Als Nächstes (Produkt/Engagement) – Reihenfolge
1. **[in Arbeit] Nachweis-Design in Spalten** (sieht aufgeräumter aus)
2. **Meilenstein-Zertifikate** („Grundlagen abgeschlossen", „Lernpfad gemeistert", „10 Räume")
3. **Streak-Erinnerung** (Mail/Push „deine Serie läuft ab")
4. **Wochen-Mission** (eine größere Aufgabe pro Woche, Bonus-XP) – wie THM „Pulse"
5. **[gebaut, Vorschau] Advent-Kalender „Advent of Hacking"** (24 Türchen ab 1. Dez) – Edge Function `advent`
   (serverseitige HMAC-Flags + Prüfung, Datums-Gating) + Tabelle `advent_fortschritt` live; App-UI (`views.advent`,
   Kalender-Grid, Advent-Zertifikat) auf Branch, wartet auf „ok live". Großer Reichweiten-Hebel, zeitlich dringend.
6. **Teilbares öffentliches Profil** (Abzeichen/Score zeigen)
7. **Werkstatt / Baukasten: Kunden bauen eigene Räume** (user-created content) – großer Brocken,
   braucht Editor + Moderation + strenge Sicherheit (Sandbox/Isolation). NOCH NICHT vorhanden.

## 🧪 Neue Trainings-Techniken (Lücken ggü. der Konkurrenz)
Wir decken schon sehr viel ab (Recon, Web-Lücken breit, Passwörter, Exploitation, BOF, PrivEsc,
Container-Escape, WLAN, Windows/NTLM, Android/APK, API/BOLA, Cloud/S3, OSINT, Krypto, Stego, RE,
Forensik/pcap, KI-Sicherheit, Blue-Team-Wellen, Pivoting). Es fehlen v. a.:
- **Active Directory in der Tiefe**: Kerberoasting, AS-REP-Roasting, Pass-the-Hash/Ticket, BloodHound, GPO-Abuse
- **SOC / Blue Team – Detection**: SIEM/Log-Analyse, Detection-Regeln (Sigma), Threat Hunting, DFIR-Fälle
- **Malware-Analyse**: statisch/dynamisch, Sandbox, Entpacken (ergänzt unser Reverse Engineering)
- **Cloud tiefer**: Azure/GCP, IAM-Fehlkonfigurationen (nicht nur S3)
- **Mobile tiefer**: Frida/dynamische Analyse, iOS-Grundlagen
- **Rollen-/Cert-Pfade**: strukturierte Pfade (Jr. Pentester, SOC L1) mit klarem Ziel

## 🚀 Modern / teils Lücken AUCH bei der Konkurrenz (Chance, voraus zu sein)
- **KI-/LLM-Sicherheit** ausbauen (Prompt Injection, Datenabfluss, Jailbreaks) – wir haben den Anfang (Flüsterer, KI-Gegner)
- **CI/CD- & Supply-Chain-Sicherheit** (vergiftete Pipelines, Dependency Confusion)
- **Kubernetes-/Container-Orchestrierung-Sicherheit** (über Container-Escape hinaus)
- **KI-Phishing / Deepfake-Erkennung** (defensiv, sehr aktuell)

## 🛠️ Technik / Betrieb
- Backups verifizieren + Plesk→Google-Drive prüfen (mit Marcel) · Geheimnisse in Bitwarden
- Monitoring/Selbsttest ausbauen · Umzug-Readiness halten (docs/UMZUG.md)
- Bei neuen Features: kurz Konkurrenz checken; mobil-first; Codes serverseitig; umzugssicher
