# Server-Absprachen (Kali Level Up + KI-Lernprogramm)

Gemeinsames Dokument der beiden Claude-Sitzungen, die auf Marcels Plesk-Server arbeiten.
Gepflegt auf Branch `ccr-63912bdd-xpv8bk` (lesen: `git fetch origin ccr-63912bdd-xpv8bk && git show origin/ccr-63912bdd-xpv8bk:docs/SERVER-ABSPRACHEN.md`).
Änderungswünsche per Nachricht an die andere Sitzung. Jede Änderung am Server bestätigt Marcel selbst.

## Wer ist wer

| | Kali Level Up (Arena) | KI-Lernprogramm |
|---|---|---|
| Sitzung | session_015vg1TjHM7UdeuegoUkYE7j | session_015vg1TkDYBs7kSfEMSPudbC |
| Repo-Ordner | alles außer `ki-lernen/` | `ki-lernen/` |
| Branch | `ccr-63912bdd-xpv8bk` | `ccr-a14979d0-4fmgpv` |
| Server-Ordner | `~/kly-labs` | `~/ki-lernen` |
| Port (nur 127.0.0.1) | 8090 | 8100 |
| Subdomain | `arena.<domain>` | `ki.<domain>` |
| Docker-Label | `kly.arena` | `ki.lernen` (falls Docker) |
| Docker-Socket | ja (startet Lab-Container) | nein |
| Supabase | `unkmvjdvcehkweutzyqw` (nur Kali-App) | eigenes Projekt |
| Veröffentlichung Web-App | `.github/workflows/deploy.yml` → Pages `kali-level-up` | eigener Workflow, eigener paths-Filter |

## Gemeinsame Regeln

- Nach außen nur Plesk (80/443, SSH). Dienste lauschen nur auf 127.0.0.1. Keine Firewall-Ports öffnen.
- Geheimnisse (API-Schlüssel, Einladungscodes) nur in `.env` im jeweiligen Server-Ordner, nie im Repo oder im Chat.
- Ressourcen: Arena bis ca. 5 GB RAM / 20 Sitzungen. KI-Dienst festes Limit ca. 512 MB.
- Keine Dateien im Bereich der anderen Sitzung ändern. Gemeinsame Dateien (dieses Dokument) nur nach Absprache.

## Grundeinrichtung des Servers (einmalig, gemeinsam genutzt)

Übernimmt: **Kali-Sitzung** (sie braucht Docker ohnehin). Die KI-Sitzung bekommt Bescheid, wenn es fertig ist.

1. System-Updates, Zeitzone Europe/Berlin.
2. Plesk-Erweiterung „Docker“ bzw. Docker Engine + Compose.
3. Benutzer und Ordner `~/kly-labs`, `~/ki-lernen`.
4. Claude Code mit Remote Control (je Ordner eine Freigabe).
5. Subdomains `arena.` und `ki.` in Plesk, Let's Encrypt, nginx-Proxy auf 8090 bzw. 8100 (mit WebSocket-Upgrade).
6. Prüfung: von außen nur 80/443/SSH erreichbar.

## Zusammenarbeit der Apps

- Gegenseitige Verlinkung: Kali-App bekommt unter „Mehr“ einen Link zum KI-Lernprogramm und umgekehrt (Adresse in `config.js` → `kiUrl`).
- Idee (offen): KI-Kapitel „KI in der IT-Sicherheit“ (z. B. KI-Antworten prüfen, Phishing erkennen) – Inhalte stimmen beide Sitzungen ab.
- Beta-Tester: dieselben Einladungen/Tester-Liste. Marcel pflegt die Liste, beide Dienste nutzen eigene Codes.

## Offene Punkte

- [ ] Domain festlegen (Marcel)
- [ ] Server-Zugang per Remote Control (Marcel)
- [ ] Grundeinrichtung (Kali-Sitzung)
- [ ] Arena installieren (Kali-Sitzung)
- [ ] KI-Dienst installieren (KI-Sitzung)
- [ ] Gegenseitige Links
