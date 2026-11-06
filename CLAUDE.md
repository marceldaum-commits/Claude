# Nachtfalter Hacklab – Projektnotizen für Claude

Deutschsprachiges Lern-Projekt (Linux/Hacking) von Marcel. Antworten auf **Deutsch**, einfach,
ein Schritt nach dem anderen (Marcel arbeitet viel am Handy, Anfänger).

## Arbeitsraum – zu Beginn JEDER Sitzung lesen (Marcel, 06.11.2026)
**Immer zuerst `docs/ARBEITSRAUM.md` und `docs/ROADMAP.md` lesen.** Das ist unser gemeinsamer Projektkopf
(Entscheidungen, offene Fragen, Ideen, Baulog). Marcel will **kein Extra-Dokument öffnen** – die Zusammenarbeit
läuft automatisch im Dialog über diese Repo-Dateien. Nach erledigten/neuen Dingen `docs/ARBEITSRAUM.md`
fortschreiben (Baulog oben ergänzen, Entscheidungen/offene Fragen pflegen).

## Grundsatz: selbst-einrichtend bauen (Marcel, 05.11.2026)
Funktionen/Automatiken **immer** so bauen, dass sie sich über den **Auto-Deploy von selbst
einrichten** (in App/Server/Deploy integriert) – ohne manuelles SSH, ohne händischen Cron, ohne
manuelle Migration, wenn vermeidbar. Wiederkehrendes als Im-Server-Zeitplan oder CCR-Routine.
Nur bei echten Geheimnissen (Passwort/API-Key) ist **ein** kurzer Schritt von Marcel okay – vorher ansagen.

## Entwicklung & Release
- Entwickeln auf Branch `ccr-63912bdd-xpv8bk`.
- Release: nach `live` pushen (`git push origin HEAD:live`); der Server deployt automatisch alle ~10 Min.
- Bei App-Änderungen Version in `app-files.js` (`KLY_VERSION`) erhöhen; vor dem Commit `npm run check` grün.
- Commit-/PR-Attribution gemäß Session-Vorgabe anhängen.

## Struktur
- Haupt-App (`index.html`, `js/`, `css/`), Arena (`arena/` – eigener Node-Server + Docker-Labs in `labs/nf-*`),
  Zentrale (`zentrale/`, Admin), Supabase Edge Functions (`supabase/functions/`).
- **`ki-lernen/` gehört der anderen Claude-Sitzung** – nicht anfassen.
- Sprachen: nur **Deutsch + Englisch** (Ukrainisch wurde entfernt).
- Arena-Labs sind vom Internet abgeschottet (`NetworkMode: none`); Codes `KLY{…}` werden nur serverseitig geprüft.

## Nützliches
- Selbsttest aller Räume: `arena.nachtfalter.tech/api/gesundheit` (läuft im Server mit).
- Problem-Meldungen: Tabelle `support_meldungen` (Edge Function `melden`).
- Server-Absprachen beider Sitzungen: `docs/SERVER-ABSPRACHEN.md`.
