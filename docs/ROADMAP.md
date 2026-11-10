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

## 🎯 KI-Ausbau „Austricksen & Verteidigen" – ✅ umgesetzt & live (08.11.2026, A–D)
Großes Paket im Leitstern. **Umzugssicher & anti-cheat:** jede Flag `KLY{…}` würfelt der Server pro Anlauf frisch
(HMAC, nie im Browser bekannt), prüft serverseitig; geknackter Code = Schlüssel fürs nächste Level. **Realistisch,
nicht kitschig:** die Bots antworten wie echte, eingesetzte Assistenten (seriös, glaubwürdig) – kein Spiel-Gelaber;
so überträgt sich das Gelernte auf echte Systeme. **Ethik:** nur unsere Übungs-Bots, Spiel-Codes – Mechanik + Abwehr
lehren, kein Jailbreak-Kochbuch (hält uns auch bei den App-Stores sauber). **Lernkreis:** entlocken → verstehen → verteidigen.

- **[gebaut · „ok live" erteilt (Marcel 07.11) · Rollout Di 11.11 im Paket] Freies Spiel (Endlos-Modus):** echter Claude als Spielleiter, adaptive
  Leiter von sehr einfach (Runde 1 rückt sofort raus) bis extrem. Pro Runde frische Flag, „Beste"-Rekord pro Konto.
  Edge `ki-llm` v11 Aktion `frei` (Band-Schwierigkeit + Anti-Refusal-Nachfass), App-View `kifrei` + Hub-Karte +
  Lehrpfad-Schritt. End-to-end getestet (Backend + UI, Playwright). Liegt auf `ccr-63912bdd-xpv8bk` / vorschau.nachtfalter.tech.
- **Phase A – Service-Bots austricksen (Kern/MVP):** realistische Räume, je Raum eine Technik + Erklär-Karte danach
  („das war Technik X – so schützt man sich"): 🎧 Support-Bot (Gutschein-Code, *Pretext/Autorität*), 🛒 Shop-Bot
  („keine Rückerstattung", *Regel-Override*), 🔐 Konto-Bot (*Identitäts-Vorwand/Datenabfluss*), 📋 interner Assistent
  (*System-Prompt-Leak via direkte/Format-Injektion*). Baut auf der `ki-llm`-Infrastruktur auf (realistische Persona,
  frische Flag pro Anlauf, Schlüssel→nächstes Level). Aufwand: mittel (v. a. Prompt-Design + eine Chat-Ansicht wiederverwenden).
- **Phase B – Prompt-Injection-Erklärer (Lern-Modul):** pro Technik eine Karte – Was · Warum es wirkt ·
  Beispiel-Formulierung („einsetzen"-Knopf → direkt am Übungsbot) · So schützt man sich. Statisch (kein LLM nötig),
  in den Lehrpfad eingebunden. Aufwand: niedrig–mittel (v. a. Inhalte schreiben).
- **Phase C – Abwehr mit echtem Angreifer (der alte Plan, jetzt lösbar):** Opfer-Bot ist ein realistischer Service-Bot,
  der per Default auslaufen SOLL, außer der Schutz-Prompt des Nutzers deckt den Angriff ab. Pro Angriff „durch/abgewehrt"
  + welcher Trick gebrochen hat. **Vorher: kurzer Prüf-Test** (leerer Schutz läuft aus, starker hält – die einzige echte
  Unbekannte). Fallback, falls wackelig: zweiter KI-Aufruf als Schiedsrichter (urteilt nur, muss selbst nichts „verraten").
  Aufwand: mittel + Validierungsschritt.
- **Phase D – Politur/später:** Bestenliste über alle Modi, Meilenstein-Zertifikat „KI-Red-Teamer", Schwierigkeits-Feinschliff.
- **✅ Umgesetzt (Marcel 08.11.2026: „setze alles um"):** voller Umfang **A–D** gebaut, getestet und **live** –
  zusammen mit dem Freien Spiel. Edge `ki-llm` v16 (Service-Bots mit Spiel-Token-Rahmung + Hart-Override,
  verteidigung-Prüfer neu gerahmt, Bestenliste über alle Modi), Tabelle `ki_llm_service`; App-Views `kiservice`,
  `kiinjektion`, „Scharfer Prüfer" in `kiverteidigung`, „KI-Red-Teamer"-Badge im Hub; KLY_VERSION 2.96.0.
  Backend end-to-end (echter Haiku) + App-Views (Playwright) getestet. **Hebel für Haiku:** der geheime Code ist
  im Bot-Prompt ein neutrales Spiel-Token (realistisches Label nur in der UI) → Alignment-Reflex fällt weg, Abwehr bei
  Nicht-Treffern bleibt. Siehe docs/PROJEKT.md Baulog.

## ✅ Kürzlich fertig
- **08.11.2026 – 3 Wellen + Feinschliff (alle live, KLY_VERSION bis 3.4.0):**
  - *Welle 1 (UI):* Konfetti-Erfolgsfeier, Fortschrittsbalken überall, „Starte hier"-Nudge im KI-Hub.
  - *Welle 2 (einzigartige KI-Features):* Deepfake-**Duell** (13 Szenarien), **KI-Labs** (vergiftetes Dokument = indirekte Injektion + Agent-mit-Werkzeug = Exfiltration; neue Tabelle `ki_llm_labs`, Edge `ki-llm` v17), **Wall of Defenders** (Edge `verteidiger`, v18).
  - *Welle 3 (Klassik-Labs, browser-nativ statt Docker → auch für „Nur-Browser"-/Handy-Nutzer):* **Web-Hacking-Lab** (SQLi-Login-Bypass + UNION + XSS, selbst nicht verwundbar), **Forensik-Lab** (Log-Analyse + Base64-Dekoder), **Monats-Challenge** (monatlich wechselndes Krypto-Rätsel + Dekoder-Werkzeugkasten).
  - *Feinschliff „cool & modern":* Mikro-Animationen, Lade-Skelette, einheitliche Nav-SVG-Icons, optionales **Hell-Theme** (umschaltbar, gemerkt, Terminal/Code bleiben dunkel).
- **KI-Sicherheit Phase 2 – echter LLM (live):** Boss-Bots (Nova leicht → Wächter mittel → Nyx schwer) mit
  echtem Claude (Haiku 5.5) + per-Konto-Flag; KI-Mentor. Tageslimit/Konto, Edge `ki-llm`. End-to-end getestet.
- **KI-Sicherheit Phase 1 (live):** deterministische 10-Stufen-Arena, Theorie, Lehrpfad, Deepfake, Verteidigung
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
1. **Store-Apps (später, Marcel-Wunsch 07.11.2026):** PWA in die Stores bringen. **Android/Play zuerst**
   (TWA via Bubblewrap/PWABuilder, `assetlinks.json` über Auto-Deploy; Play-Konto ~25 $ + Signatur-Schlüssel = Marcel).
   **iOS/App Store** als 2. Schritt (Apple-Konto 99 $/Jahr + Mac/Xcode oder Cloud-Build; Apple-Regel 4.2 beachten,
   Mehrwert wie Push/Offline). Beide Stores: Thema klar als **ethische Bildung** auftreten (sonst Ablehnung/Altersstufe).
1. **Verwaltung/Zentrale – Konto-Steuerung pro Kunde** (erledigt, siehe docs/PROJEKT.md): KI-Tokens/Tag + Reset.
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

## 💰 Meilenstein: Wettbewerbsfähig & monetarisierbar (Marcel 08.11.2026, Ziel ~1–2 Monate)
Entscheidung getroffen: In 1–2 Monaten soll die Plattform wettbewerbsfähig sein und **Geld verdienen**.
**Rollen-Trennung:** Preis-/Geschäftsmodell & Positionierung = **Marketing-Raum**; hier die **technischen Bausteine**.
Technische Bausteine (grobe Reihenfolge, Aufwand je ~Tage, nicht Wochen – Infrastruktur steht großteils):
1. **✅ Server-seitiges Scoring der Browser-Labs (live, 08.11.2026):** Edge-Function `uebung` (v1) + Tabelle
   `uebung_fortschritt`; Web-/Forensik-/Monats-Lab prüfen jetzt **serverseitig**, Rätsel/Flags pro Konto frisch (HMAC,
   nie im Browser bekannt – Forensik-Log & Monats-String werden per Konto erzeugt, Web-Angriffe serverseitig erkannt).
   App-Views auf Server umgestellt, `uebung()`-Caller in `sync.js`. Backend 16/16 + UI (gemockt) getestet. KLY_VERSION 3.5.0.
2. **✅ Globale Bestenliste (live):** „Übungs-Bestenliste" (`uebung` Aktion `bestenliste`) auf allen drei Lab-Seiten,
   Name nur bei opt-in-Profil, eigener Eintrag mit ★. *Als Nächstes: evtl. in ein gemeinsames „Bestenlisten"-Zentrum bündeln.*
3. **🔜 OFFEN – Bezahlung & Abo-Gating** (nächster großer Brocken). **Modell festgelegt (Marcel 08.11.2026):**
   - **Ein Preis für alle** Zahlarten (kein Aufschlag); Banküberweisung bleibt die kostenlose Zahlart (rechtlich sauber:
     Aufschlag wäre nur mit kostenloser Alternative zulässig – daher einfach ein Preis).
   - **Preise:** Pro **€8,99/Mo** oder **€79/Jahr**, **Schüler €4,99/Mo**. Gratis-Stufe bleibt.
   - **Kostendeckung über KI-Tageslimit (Fair-Use):** Gratis ~**10** KI-Nachrichten/Tag, Pro ~**60**/Tag (echte KI = Haiku-API,
     ~0,3–0,5 Ct/Nachricht → Limit schützt die Marge; Gratis-Nutzer kosten auch API, daher klein gedeckelt).
     *Wichtig: Gratis-Limit erst MIT dem Pro-Launch senken, nicht vorher (sonst Downgrade für heutige Nutzer).*
   - **⚠️ Firma wird in der UKRAINE angemeldet (Marcel 08.11.2026) → Stripe fällt weg** (Stripe unterstützt keine
     UA-Firmen, lt. Stripe-Support). Zahlungs-Route ist daher offen; drei realistische Optionen:
     (a) **Merchant of Record** (Paddle / Lemon Squeezy): werden rechtlicher Verkäufer, übernehmen **EU-Umsatzsteuer (OSS)**
     + weltweite Kartenzahlung + Auszahlung → am einfachsten für Solo-Gründer. **ABER: UA-Firmen-Onboarding direkt bei
     Paddle/LemonSqueezy prüfen** (nicht bestätigt). Gebühr ~5 %.
     (b) **UA-Zahlungsanbieter** (WayForPay / Fondy / LiqPay / plata by mono): funktioniert für UA-Firma, günstiger, aber
     EU-Karten-Akzeptanz + **EU-USt-Pflicht liegen dann bei Marcel**.
     (c) **Firma im Ausland** (Estland e-Residency / US via Stripe Atlas) → dann ginge Stripe, aber zusätzliche Firma + Steuer/Bank.
   - **EU-Umsatzsteuer:** Verkauf digitaler Abos an EU-Verbraucher löst EU-USt am Wohnort des Kunden aus (OSS). Ein MoR nimmt
     einem das ab; sonst selbst OSS-registrieren. **→ Steuer/Recht mit Steuerberater klären (Business-Raum), nicht hier entscheiden.**
   - **Technik (anbieter-unabhängig):** Egal welcher Anbieter – die Architektur bleibt gleich: Zahlung bestätigt →
     **Webhook → Edge-Function → Plan-Status pro Konto in Supabase** (Tabelle `abo`), „frei vs. Pro" serverseitig gaten
     (`plan` steuert KI-Limit + Lab-Zugang), Konto-/Rechnungs-UI. Banküberweisung = kostenlos/verzögert. Jahresabo nach vorn.
     **Dienstag zuerst den Anbieter wählen** (statt Stripe-Keys), dann baue ich gegen dessen Webhooks/API.
4. **🔜 OFFEN – Fairness/Anti-Cheat-Review** vor dem Scharfschalten des wertbaren Teils: keine client-seitigen Lücken,
   Rate-Limits auf `uebung`/Edge-Functions, Bestenlisten gegen Manipulation prüfen, Missbrauchs-Schutz.

## 📌 Später / Backlog (mit Marcel terminiert, 08.11.2026)
- **Zweisprachigkeit (DE/EN) einheitlich nachziehen:** ✅ **KI-Module erledigt (10.11.2026, live):** Live-Bots antworten in Nutzersprache (Edge `ki-llm` v26, Sprach-Übersteuerung), Deepfake + Injection-Erklärer + alle Server-Beschreibungen (Boss/Service/Labs) nach `ui.json` (autoUI/Ut). Mechanik bewiesen intakt (EN-Bot leakt `KLY{…}`). **Noch offen:** Deepfake-**Duell-Spezialtexte** (falls welche außerhalb von KI_FAKE), **Web-/Forensik-/Monats-Lab** und **Wall of Defenders** – diese Module stammen aus den 3 Wellen und haben noch deutsch-primäre Inhalte. Nächster Durchlauf: deren `U()`-Strings + JS-Literale nach `i18n/en/` ziehen (gleiche Methode: ui.json + autoUI).
- **Serverprüfung der Browser-Labs (optional, nur falls wertbar):** Web-Hacking-/Forensik-/Monats-Lab prüfen die Flags aktuell **client-seitig** (super zum Lernen, aber schummelbar → bewusst **keine** Bestenliste/Punkte). Wenn sie mal zählen sollen: Prüfung in eine Edge-Function verschieben (per-Konto-Flag, HMAC, serverseitig – wie bei den KI-Bots & CTF des Tages).
- **Zukunfts-Ideen (Leitstern-Ausbau, später):**
  - **KI Angreifer-vs-Verteidiger-Arena / Duell (PvP):** einer baut den Schutz-Prompt, der andere versucht ihn zu knacken – aus dem „Scharfen Prüfer" + „Wall of Defenders" weiterentwickeln.
  - **KI-Agent/Tool-Abuse tiefer** (mehr Werkzeuge, mehrstufig) · **RAG-Poisoning** (vergiftete Wissensquelle).
  - **Echte Docker-Web-Ziele** als Ergänzung zum browser-nativen Web-Lab (für Kali-Nutzer), über die Arena.
  - **Zertifikats-/Rang-Pfade** („Jr. Pentester", „SOC L1") mit klarem Ziel + Urkunde (siehe auch „Neue Trainings-Techniken").

## 🛠️ Technik / Betrieb
- Backups verifizieren + Plesk→Google-Drive prüfen (mit Marcel) · Geheimnisse in Bitwarden
- Monitoring/Selbsttest ausbauen · Umzug-Readiness halten (docs/UMZUG.md)
- Bei neuen Features: kurz Konkurrenz checken; mobil-first; Codes serverseitig; umzugssicher
