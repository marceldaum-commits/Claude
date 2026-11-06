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

## Test-Zugang (intern, von Marcel freigegeben 06.11.2026)
Damit Claude die komplette App end-to-end prüfen kann (eingeloggte Views + Edge Functions).
Reiner Test-Account ohne Sonderrechte, per SQL bestätigt angelegt. Bei Bedarf Passwort rotieren.
- E-Mail: `klytest@nachtfalter.tech`  ·  Passwort: `KlyTest!2026`  ·  user_id: `4e4de3ed-1998-40f2-9e7d-4b7f6fea0db2`
- Login-Token holen: POST `…/auth/v1/token?grant_type=password` mit `apikey:<anon>` + JSON `{email,password}` → `access_token`.

## Offene technische Punkte
- [x] **Verwaltung/Zentrale – Konto-Steuerung pro Kunde (live):** Zentrale-Kunden-Detail hat jetzt „🎟️ KI-Tokens geben" (heute: Zahl oder „voll") und „🤖 KI-Fortschritt zurücksetzen". Edge `admin` v14 (Aktionen `ki_tokens`, `ki_reset`, Service-Rolle, AAL2, protokolliert). **Offen:** durable „Tokens pro TAG dauerhaft erhöhen" (Pro-Konto-Limit-Override, das `ki-llm` liest) – bisher nur Gutschrift für heute.
- [x] **KI-Verteidigung „echter Angreifer" → stattdessen KI-Coach (erledigt):** Der echte-Angreifer-Modus funktioniert nicht (Haiku verweigert die Code-Preisgabe fast immer → jede Abwehr „gewinnt"). Edge-Aktion `verteidigung` bleibt deployt, aber ungenutzt. Stattdessen **KI-Coach** gebaut & live: echte KI analysiert den selbst geschriebenen Schutz-Prompt und benennt pro Standard-Angriff ✅/⚠️ + Tipps (Edge-Aktion `coach`, in der Verteidigungs-Ansicht verdrahtet).
- [ ] **Hinweis MCP/SQL:** Destruktives SQL (DELETE/DROP/TRUNCATE) über die Supabase-MCP braucht eine interaktive Bestätigung → läuft aus dieser Cloud-Sitzung in 230s-Timeout. Workarounds: statt DELETE ein `UPDATE … SET anzahl=0` (nicht-destruktiv, kein Confirm), oder über die Admin-Edge-Function (Service-Rolle), oder Bestätigung im Supabase-Dashboard. Budget setzt sich ohnehin täglich (UTC) zurück.
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
| 06.11.2026 | KI-Verteidigung: **KI-Coach** (echte KI prüft den selbst geschriebenen Schutz-Prompt, nennt ✅/⚠️ pro Angriff + Tipps) + Boss-Härtung (leichte Stufen „nie ablehnen" + stiller 1×-Nachfass) | **Live** |
| 06.11.2026 | **Boss-Bots: 8-Stufen-Leiter (sehr einfach → extrem schwer), jede Stufe andere Technik** (direkt, Vorwand, Rollenspiel, Format, Override, indirekte Injektion, Kombi, 3-fach-Kombi) + **Lernmodus** (Technik erklärt + Beispiel-Angriff). Alle 8 end-to-end mit echtem Claude getestet. | **Live** |
| 06.11.2026 | Fix (live): EN-Umschalter & öffentliches Profil – Inline-Scripts wegen CSP in externe .js ausgelagert (start.js/ki-sicherheit.js/p.js) | **Live** |
| 06.11.2026 | 🔴 **Arena-Selbsttest repariert** (meldete 22/22 „defekt"): Selbsttest-Container war nicht Wächter-konform (Name/Label/LogConfig/Ulimits/AutoRemove). Echtes Spielen war nie betroffen. Fix live gepusht; nachtfalter-deploy baut Arena-Container neu (~10 Min). | **Live** |
| 06.11.2026 | KI-Sicherheit Phase 2: echter LLM – Boss-Bots (Nova/Wächter/Nyx, steigende Abwehr) + KI-Mentor (Claude Haiku 5.5, Tageslimit 40/Konto, Edge `ki-llm`) | **Live** |
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
