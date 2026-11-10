# „Der Auftrag" – Engagement-Engine (Realbedingungen-Pentest)

**Idee (Marcel, 10.11.2026):** Ein Raum, in dem man als Pentester von einer (erfundenen) Firma
**beauftragt** wird, einen Server zu testen – **ohne Hinweise/Tipps**, selbst herausfinden was zu tun ist,
**jedes Mal neu generiert**, in Stufen von *sehr einfach* (ein sehr unsicherer Server) bis *extrem schwer*.
Wie eine eigene eJPT-Prüfung / ein echtes Engagement.

## Grundentscheidungen (mit Marcel festgelegt)
1. **Beide Ausgaben parallel** auf EINEM Kern: Browser-simuliert (mobil, kein Kali) **und** echter Docker-Server in der Arena (Realbedingungen, Kali-VM).
2. **KI nur fürs Drumherum:** KI schreibt Auftrag/Briefing + spielt den Auftraggeber (Scope-Rückfragen, *keine* Lösungen). Die **Technik ist prozedural und serverseitig geprüft** – kein LLM entscheidet über Flags (Anti-Cheat bleibt wie gehabt: HMAC pro Konto, nie im Browser).

## Warum nicht „LLM baut den ganzen Server"
Ein LLM kann keinen konsistenten, wirklich exploitbaren Server *sein* (widerspricht sich, Lücken mal da/mal nicht) und zerstört die Fälschungssicherheit. Darum: **prozeduraler Baukasten** erzeugt die Technik, das LLM macht nur das glaubwürdige Drumherum.

## Architektur: ein Kern, zwei Ausgaben
```
Schwachstellen-Module (Baukasten)  ──►  Generator (pro Konto+Stufe+Seed)  ──►  Engagement-Spec
                                                                               │
                                              ┌────────────────────────────────┴────────────────┐
                                        SIM-Adapter (Sandbox)                 DOCKER-Adapter (Arena)
                                        erzeugt Dateisystem/Dienste           baut Container aus Modulen
                                        im Browser, mobil spielbar            echtes nmap/sqlmap/…
                                                                               │
                                        Flags serverseitig geprüft (Edge `auftrag`, HMAC pro Konto)
```

### Schwachstellen-Modul (delivery-agnostisch)
Jedes Modul beschreibt EINE realistische Lücke, unabhängig von der Ausgabe:
```
{
  id: 'ssh-schwach', kategorie: 'zugang', stufe: 1,
  beschreibung: 'Schwaches SSH-Passwort eines Dienstkontos',
  ziel: 'Erst-Zugang auf den Host',           // was der Spieler erreicht
  flagquelle: 'datei:/home/<user>/zugang.txt', // wo die Flag landet
  sim:   (ctx) => { … Dateien/Dienste/nmap-Ausgabe im Sandbox-Weltmodell … },
  docker:(ctx) => { … Dockerfile-/setup.sh-Schnipsel … },
  params:(rng) => ({ user: pick(rng, NAMEN), pass: pick(rng, SCHWACH) }),
}
```
Module-Bank wächst mit. Start-Kategorien: Zugang (schwache Creds, exponiertes .git, offener Dienst),
Web (SQLi-Login, LFI, Upload), Privesc (sudo-Fehlkonfig, SUID, Cron, Klartext-Secret), Post (Pivoting).

### Stufen (Schwierigkeit = Anzahl + Verkettung + Verschleierung)
- **Stufe 1 „sehr unsicher"**: 1 offensichtliche Lücke → direkter Zugang, 1 Flag.
- **Stufe 2–3**: Zugang + Privesc, 2–3 Flags, leicht versteckt.
- **Stufe 4–5 „extrem"**: mehrere Hosts, Ketten-Exploit + Pivoting, nichts offensichtlich, mehrere Flags.
Immer **0 Tipps**. Timer + Report-Abgabe am Ende (was gefunden, wie ausgenutzt).

### Edge `auftrag` (serverseitig, Anti-Cheat)
- `start`  : Generiert Engagement (Seed aus Konto+Stufe+Versuch), liefert Briefing (KI via `ki-llm`, gecacht) + Scope + Spec für den Adapter. Flags pro Konto per HMAC.
- `frage`  : Auftraggeber-Rückfrage (KI, nur Scope/Orga – nie Lösung).
- `flag`   : Prüft eine eingereichte Flag serverseitig.
- `report` : Schließt das Engagement ab, wertet Flags + Report, vergibt Punkte/Zertifikat.

## Phasen (Bau-Reihenfolge)
1. **Kern + SIM, Stufe 1 (MVP, spielbar für alle):** Modul-Bank (3–4 Module), Generator, Edge `auftrag` (start/flag/report), KI-Briefing, Engagement-UI (Briefing, Scope, Terminal, Flag-Abgabe, Report), 0 Tipps. **Zweisprachig sofort.**
2. **SIM Stufen 2–5:** mehr Module, Verkettung, Mehr-Host, Auftraggeber-Rückfragen.
3. **DOCKER-Adapter (Arena):** gleiche Module → echter Container, echte Tools. Flags über dieselbe Edge.
4. **Politur:** Report-Bewertung, Zeit/Score, „Pentester"-Zertifikat (in die Karriere-Pfade einhängen), Bestenliste.

## Anknüpfung an Bestehendes
- Anti-Cheat/HMAC + Edge-Muster wie `ki-llm`/`uebung`.
- Sandbox-Weltmodell (Mehr-Host, curl) aus `js/shell.js`; Docker-Labs aus `labs/` (z. B. `nf-meister`).
- Abschluss-Zertifikat hängt an den **Karriere-Pfaden** (z. B. als Krönung von „Junior Penetration Tester").
