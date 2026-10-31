# KLY-Target – Zielmaschinen für Kali Level Up

Absichtlich verwundbare **Trainingsziele** mit synthetischen Daten. Nur auf dem eigenen Gerät,
nur auf `127.0.0.1` betreiben.

| Raum | Ports (127.0.0.1) | Thema |
|---|---|---|
| r1 | 10080 | HTTP-Grundlagen mit curl (Header, robots.txt, Statuscodes, Weiterleitung) |
| r2 | 10122, 10180, 10188 | Ports & Dienste mit Nmap, Banner, gefälschter Server-Header |
| r3 | 10280 | Challenge: vergessene Sicherung, Basic-Auth, Serverlog |

Deinen Token `KLY-XXXXXX` zeigt die App (Raum → Zielmaschine). Die Flags werden aus ihm berechnet.

## PC: Kali mit Docker

```bash
cd ~/kly-labs/kly-target
docker build -t kly-target .
docker run -d --rm --name kly-r1 -e KLY_TOKEN=KLY-XXXXXX -p 127.0.0.1:10080:10080 kly-target r1
docker logs kly-r1      # Serverlog (Blue-Team-Sicht)
docker stop kly-r1      # aufräumen
```

Ports **immer** als `127.0.0.1:PORT:PORT` veröffentlichen – ohne die IP wäre das Ziel im Netz erreichbar.

## Handy: Termux (ohne Docker, ohne Root)

```bash
pkg install python          # falls nicht vorhanden
KLY_TOKEN=KLY-XXXXXX python server.py r1
```

Der Server bindet außerhalb von Docker ausschließlich an 127.0.0.1 und verweigert andere Adressen.
Stoppen mit Strg+C.
