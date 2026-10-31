# KLY-Keller – Wargame „Der Kellerserver“ (PC)

Absichtlich verwundbarer **Übungsserver** mit erfundenen Daten für Kali Level Up.
Du meldest dich per SSH an und arbeitest dich Konto für Konto bis zum Chef durch.
Nur auf dem eigenen PC betreiben, nur auf `127.0.0.1`.

```bash
mkdir -p ~/kly-labs/kly-keller && cd ~/kly-labs/kly-keller
# Dockerfile und setup.sh aus der App holen (Raum „Der Kellerserver“)
docker build -t kly-keller .
docker run -d --rm --name kly-keller -e KLY_TOKEN=KLY-XXXXXX -p 127.0.0.1:2220:22 kly-keller
ssh azubi@127.0.0.1 -p 2220      # Passwort: azubi
docker stop kly-keller           # aufräumen
```

- Deinen Token `KLY-XXXXXX` zeigt die App. Alle Passwörter/Codes werden daraus berechnet.
- Port **immer** als `127.0.0.1:2220:22` veröffentlichen – sonst wäre der Server im Netz erreichbar.
- Der Server wird bei jedem Start neu aufgebaut. Deine Codes bleiben gleich (gleicher Token).
- Kein root-Login, keine SSH-Weiterleitungen.
