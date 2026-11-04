# Abschottung der Arena (Isolation) – „safe safe“

Alle Übungs-Labs laufen **ohne jede Internet- oder Netzwerkverbindung**. Das ist an mehreren Stellen erzwungen und
wird bei jedem `npm run check` automatisch geprüft (`tools/isolation-check.mjs`).

## Was garantiert ist
- **Kein Netz im Lab:** Jeder Lab-Container startet mit `NetworkMode: none` – es gibt nur `lo` (localhost).
  Kein Internet, kein DNS, kein Kontakt zu anderen Labs oder zum Server. Nachgewiesen zur Laufzeit
  (Netzwerk nicht erreichbar, keine DNS-Auflösung).
- **Doppelt abgesichert:** Der Arena-Server setzt `none`, und der **Docker-Wächter** lehnt jeden Container ab,
  der nicht `none` ist (`waechter.js`). Selbst ein Fehler an einer Stelle bliebe abgefangen.
- **Keine Sonderrechte:** Container laufen ohne root-Fähigkeiten (`CapDrop: ALL` + wenige nötige Caps),
  mit `no-new-privileges`, Speicher-/CPU-/Prozess-Grenzen, und werden nach spätestens 2 Stunden gelöscht.
- **Alles Schreibbare im Arbeitsspeicher** (tmpfs) – die Server-Festplatte kann nicht volllaufen.
- **Wächter selbst ohne Netz:** Der Docker-Wächter-Container läuft mit `--network none` und spricht nur über ein
  lokales Volume mit der Arena.
- **Erfundene „Schadsoftware“** (z. B. im Forensik-Lab „Der Einbruch“) ist nur Beweismaterial in Dateien – sie wird
  nie ausgeführt, und selbst wenn: ohne Netz läuft nichts nach außen.

## Was Netz braucht (und warum das sicher ist)
- **Der Arena-Server** (nicht die Labs) spricht mit dem Nachtfalter-Konto (Supabase) für Anmeldung und
  Code-Prüfung. Er läuft als Nicht-root, schreibgeschützt, ohne Docker-Zugriff (nur über den Wächter).
- **Der Bau der Lab-Images** lädt einmalig Pakete per apt (nur beim Bauen auf dem Server, nie im laufenden Lab).

## Automatische Prüfung
`tools/isolation-check.mjs` stellt sicher:
1. Der Arena-Server setzt überall `NetworkMode: 'none'`.
2. Der Wächter erzwingt `NetworkMode === 'none'`.
3. Kein Lab-Setup führt beim Start einen echten Aufruf nach außen aus.
