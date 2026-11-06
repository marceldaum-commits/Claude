# Projekt-Kopf (Programmierung) – Claude & Marcel

Mein (Claude) Programmier-Kontext. **Rollen-Trennung (Marcel, 06.11.2026):**
**„Arbeitsraum" = Marketing** (Marcels eigener Raum), **Claude = Programmieren.**
Marketing-Strategie/Reichweite gehört in den Marketing-Raum, nicht hierher.

Claude liest diese Datei + `docs/ROADMAP.md` automatisch zu Sitzungsbeginn (kein Dokument zum Öffnen nötig).
Lebendes Dokument. Entwickeln auf `ccr-63912bdd-xpv8bk`, live erst nach Marcels „ok".

## Spielregeln (fest, fürs Bauen)
- **Live erst nach Marcels „ok".** Entwickelt wird auf `ccr-63912bdd-xpv8bk`; nichts geht ungefragt live.
- **Release:** nach `live` pushen (`git push origin HEAD:live`), Server deployt ~alle 10 Min.
- Bei App-Änderungen `KLY_VERSION` in `app-files.js` erhöhen; vor Commit `npm run check` grün.
- **Sprachen:** nur Deutsch + Englisch.
- **Codes `KLY{…}` immer serverseitig prüfen** – nie im Browser (anti-cheat).
- **Faire Tipps:** Tipps mindern nur die Punkte der Aufgabe, nie das Konto; mind. 1 Punkt bleibt.
- **Umzugssicher** (siehe `docs/UMZUG.md`) und **selbst-einrichtend** (Auto-Deploy, kein manuelles SSH).
- **`ki-lernen/` nicht anfassen** – andere Claude-Sitzung.

## Offene technische Punkte
- [ ] Backups prüfen: Plesk → Google Drive läuft? (mit Marcel) + Geheimnisse in Bitwarden
- [ ] Nächster großer Block: Technik-Module (Active Directory tief, SOC/Blue-Team-Detection, Malware-Analyse)
      vs. Produkt-Features – Priorität mit Marcel klären.

## Feature-Backlog (bau-relevant; Strategie dazu kommt aus dem Marketing-Raum)
- Streak-Erinnerung (Mail/Push), Wochen-Mission (Bonus-XP)
- Teilbares öffentliches Profil + „Freund einladen", Schul-/Klassen-Modus (Lehreransicht)
- Meilenstein-Zertifikate ausbauen (QR-Prüflink zur Echtheit), saisonale Events
- Werkstatt/Baukasten (user-created Räume) – groß, braucht Editor + Moderation + Sandbox

## Baulog (neueste zuerst)
| Datum | Was | Stand |
| --- | --- | --- |
| 06.11.2026 | KI-Lehrpfad geführt (Grundlagen → Angriff → Abwehr → Fälschungen, mit Übungen, verbindet alles) | **Live** |
| 06.11.2026 | KI-Verteidigung: Schutzmaßnahmen wählen, Prüfer fährt alle Angriffe dagegen (Angriff UND Abwehr) | **Live** |
| 06.11.2026 | KI-Arena auf 10 Stufen (sehr leicht → echt schwer: Ausgabefilter, Reizwort-Sperre, Verschleierung, Finale-Kombo) | **Live** |
| 06.11.2026 | Deepfake-/KI-Phishing-Erkennung (interaktives „entlarve die Fälschung"-Modul, defensiv) | **Live** |
| 06.11.2026 | SEO auf KI-Sicherheit: öffentliche Seite ki-sicherheit.html (DE/EN, Course/FAQ-JSON-LD), Startseiten-Feature, Sitemap | **Live** |
| 06.11.2026 | ⭐ KI-Sicherheit Phase 1: Live-Angriffs-Labor (Edge `ki-sec`, 5 verwundbare Bot-Stufen, Flag pro Konto) + Hub mit Theorie | **Live** |
| 06.11.2026 | SOC/Blue-Team-Detection-Modul (Brute-Force in Logs, Event-ID 4625, kodierte PowerShell, C2-Beaconing, DFIR-Zeitachse) | **Live** |
| 06.11.2026 | Active Directory abgerundet: AS-REP-Roasting (-m 18200) + GPO-Abuse im GOAD-Modul | **Live** |
| 06.11.2026 | Wochen-Mission (Edge `mission` + Tabelle wochen_mission, App-View + Startkarte, +50 XP) | **Live** |
| 06.11.2026 | Teilbares öffentliches Profil (Edge `profil` + Tabelle public_profiles, App-Teilen-UI + p.html) | **Live** |
| 06.11.2026 | Advent streng: alle 24 Türchen = Konto-eigene Flag-Rätsel (anti-cheat, nicht teilbar), Thema je im Titel/Einleitung | **Live** |
| 06.11.2026 | Startseite (start.html): DE/EN-Umschalter, Wahl gemerkt + an App weitergereicht | **Live** |
| 06.11.2026 | Advent-Kalender neu gestaltet: 24 Themen-Türchen (Marcels Titel), Nachtfalter-Look (Mond/Lime) | **Live** |
| 06.11.2026 | Advent-Kalender „Advent of Hacking" (24 Türchen, Edge Function + Tabelle + App-UI + Zertifikat) | **Live** |
| 06.11.2026 | Ausführliches Zertifikat (4 Spalten) + Zentrale-Druck, Meilenstein-Zertifikate, Roadmap | Live |
| ~05.11. | Experten-Stufe (ohne Tipps), Räume stufengerecht sortiert | Live |
| ~05.11. | Einheitlicher XP-/Streak-Wert, Erfahrungsstufe beim Erststart | Live |
| ~04.11. | CTF des Tages (2/Tag, serverseitig) + Streak + Bestenliste | Live |
| ~03.11. | SEO-Fix (gzip, Sitemap, Search Console), Sicherheits-Härtung #29–#33 | Live |
