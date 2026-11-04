# Lebendiger Gegner (Duell) – Aufbau und Claude-Anbindung

Die Arena „Das Duell“ (`labs/nf-duell`) hat einen **reagierenden Gegner** statt eines festen Drehbuchs:
Der Spielleiter (`/opt/duell/gegner.py`, läuft als root im abgeschotteten Container) prüft bei JEDEM Zug,
welche Lücken noch offen sind, greift eine **zufällige offene** an und **wird mit der Zeit schneller**
(Takt von 8 s auf minimal 2 s). Jede geschlossene Lücke gibt sofort ihren Code.

## Schwierigkeit
Steckt in der Eskalation: Je länger offene Lücken bleiben, desto schneller und häufiger trifft der Gegner.
„Schwieriger“ = du musst schneller schließen. (Kein Netz, keine Kosten, kein Eingriff in den Docker-Wächter.)

## Claude als echter Gegner (Not-Aus, optional, kostenpflichtig)
Der Spielleiter liest im Modus `BRAIN=ki` die Datei `/opt/duell/ki_zug` (die ID der nächsten Lücke).
Ist sie leer/ungültig, fällt er automatisch auf das Drehbuch (Zufall) zurück – **Not-Aus**: ohne Einrichtung
läuft alles normal weiter.

Für einen echten Claude-Gegner müsste der **Arena-Server** (hat als Einziger Netz) pro Zug:
1. den Lagebericht lesen (welche Lücken offen),
2. Claude per API fragen, welche offene Lücke als Nächstes (nur eine ID aus der erlaubten Liste),
3. die ID als `ki_zug` in den Container schreiben.

Offen (bewusst noch nicht gebaut, weil kostenpflichtig und sicherheitsrelevant):
- Ein **Anthropic-API-Schlüssel** als Server-Geheimnis (`/etc/nachtfalter/arena-ki.env`), den Marcel selbst hinterlegt.
- Ein sicherer Steuerkanal Server→Container für `ki_zug` (der Spieler darf ihn nicht selbst setzen).
- Harte Kostenobergrenzen (max. Züge/Spiel, max. gleichzeitige Spiele), Modellwahl als Schwierigkeitsregler.

Bis dahin ist der adaptive Drehbuch-Gegner aktiv – er reagiert bereits auf die Aktionen des Spielers.
