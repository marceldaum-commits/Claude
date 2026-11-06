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
| 06.11.2026 | Advent-Kalender „Advent of Hacking" (24 Türchen, Edge Function + Tabelle + App-UI + Zertifikat) | **Live** |
| 06.11.2026 | Ausführliches Zertifikat (4 Spalten) + Zentrale-Druck, Meilenstein-Zertifikate, Roadmap | Live |
| ~05.11. | Experten-Stufe (ohne Tipps), Räume stufengerecht sortiert | Live |
| ~05.11. | Einheitlicher XP-/Streak-Wert, Erfahrungsstufe beim Erststart | Live |
| ~04.11. | CTF des Tages (2/Tag, serverseitig) + Streak + Bestenliste | Live |
| ~03.11. | SEO-Fix (gzip, Sitemap, Search Console), Sicherheits-Härtung #29–#33 | Live |
