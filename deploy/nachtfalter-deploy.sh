#!/bin/bash
# nachtfalter-deploy – holt freigegebene Stände aus GitHub und startet die Nachtfalter-Dienste neu.
# Läuft als root (per Cron alle 10 Min und auf Wunsch über sudo durch den Benutzer „claude“).
# Gehört root, Rechte 755 – „claude“ kann es ausführen, aber nicht ändern.
#
#   nachtfalter-deploy           neue Stände holen; nur bei Änderungen bauen und neu starten
#   nachtfalter-deploy --force   alles neu bauen und starten
#   nachtfalter-deploy status    Zustand anzeigen (nichts ändern)
#
# Quellen (Repository marceldaum-commits/claude):
#   Branch „live“     → Arena (arena/, labs/kly-keller/)        → Container nf-arena, 127.0.0.1:8090
#   Branch „ki-live“  → KI-Werkstatt (ki-lernen/)               → systemd nachtfalter-ki, 127.0.0.1:8100
# Branches werden nur nach Marcels „ok“ aktualisiert. Fehlt ein Branch, wird der Teil übersprungen.
#
# Geheimnisse (nur root lesbar, nie im Repository):
#   /etc/nachtfalter/github-token   GitHub-Fine-grained-Token, nur „Contents: Read-only“ für dieses Repository
#   /etc/nachtfalter/ki.env         Einstellungen der KI-Werkstatt (API-Schlüssel, Supabase …)
#   /etc/nachtfalter/arena.env      Einstellungen der Arena (Einladungscode …)
set -euo pipefail
umask 022
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

REPO=marceldaum-commits/claude
ETC=/etc/nachtfalter
STATE=/var/lib/nachtfalter
BASE=/opt/nachtfalter
LOG=/var/log/nachtfalter-deploy.log
DIENST=nfdienst
MODE=${1:-}

[ "$(id -u)" = 0 ] || { echo "Bitte mit sudo starten: sudo $0 $MODE"; exit 1; }
case "$MODE" in ""|--force|status) ;; *) echo "Unbekannt: $MODE (erlaubt: --force, status)"; exit 2;; esac

log() { echo "$(date '+%F %T') $*" | tee -a "$LOG"; }

status() {
  echo "== Nachtfalter-Dienste =="
  for c in arena ki; do printf '%-6s Stand: %s\n' "$c" "$(cat "$STATE/$c.commit" 2>/dev/null | cut -c1-7 || echo -)"; done
  printf 'KI-Werkstatt: %s\n' "$(systemctl is-active nachtfalter-ki 2>/dev/null || true)"
  printf 'Arena:        %s\n' "$(docker inspect -f '{{.State.Status}}' nf-arena 2>/dev/null || echo 'nicht vorhanden')"
  printf 'Prüfung 8100: %s\n' "$(curl -fsS -m 5 http://127.0.0.1:8100/api/status >/dev/null 2>&1 && echo ok || echo -)"
  printf 'Prüfung 8090: %s\n' "$(curl -fsS -m 5 http://127.0.0.1:8090/api/status >/dev/null 2>&1 && echo ok || echo -)"
  echo "== Letzte Meldungen =="; tail -n 8 "$LOG" 2>/dev/null || true
}
[ "$MODE" = status ] && { status; exit 0; }

exec 9>/run/nachtfalter-deploy.lock
flock -n 9 || { echo "Läuft bereits."; exit 0; }
[ -s "$ETC/github-token" ] || { log "FEHLT: $ETC/github-token"; exit 1; }
mkdir -p "$STATE" "$BASE"; chmod 755 "$BASE"

# Holt einen Branch. Der Token steht nur in Umgebungsvariablen dieses root-Prozesses
# (nicht in der Befehlszeile, also für andere Benutzer per ps nicht sichtbar).
holen() {
  local br=$1 dir="$STATE/src-$1"
  if [ ! -d "$dir/.git" ]; then git init -q "$dir"; git -C "$dir" remote add origin "https://github.com/$REPO.git"; fi
  local auth; auth="Authorization: Basic $(printf 'x-access-token:%s' "$(tr -d ' \r\n' < "$ETC/github-token")" | base64 -w0)"
  if ! GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=http.extraHeader GIT_CONFIG_VALUE_0="$auth" GIT_TERMINAL_PROMPT=0 \
       git -C "$dir" fetch -q --depth 1 origin "$br" 2>/dev/null; then
    return 1
  fi
  git -C "$dir" checkout -q -f FETCH_HEAD
  git -C "$dir" clean -qfdx
  echo "$dir"
}
neu() { [ -n "${FORCE:-}" ] || [ "$(cat "$STATE/$1.commit" 2>/dev/null)" != "$2" ]; }
warten() { for _ in $(seq 1 30); do curl -fsS -m 3 "$1" >/dev/null 2>&1 && return 0; sleep 1; done; return 1; }
[ "$MODE" = --force ] && FORCE=1

# ---------------------------------------------------------------- KI-Werkstatt
ki() {
  local dir rev
  dir=$(holen ki-live) || { log "ki: Branch ki-live nicht abrufbar – übersprungen"; return 0; }
  rev=$(git -C "$dir" rev-parse HEAD); neu ki "$rev" || return 0
  [ -f "$dir/ki-lernen/server.js" ] || { log "ki: ki-lernen/server.js fehlt in ${rev:0:7}"; return 1; }
  [ -s "$ETC/ki.env" ] || { log "ki: $ETC/ki.env fehlt – nicht gestartet"; return 1; }
  log "ki: baue ${rev:0:7}"
  local neu="$BASE/ki.neu"; rm -rf "$neu"; cp -a "$dir/ki-lernen" "$neu"; rm -rf "$neu/data" "$neu/.env"
  mkdir -p "$BASE/ki-daten"; ln -s ../ki-daten "$neu/data"
  chown -R "$DIENST:$DIENST" "$neu" "$BASE/ki-daten"
  if ! runuser -u "$DIENST" -- env HOME="$BASE" bash -c "cd '$neu' && npm ci --omit=dev --no-audit --no-fund --loglevel=error" >>"$LOG" 2>&1; then
    log "ki: npm ci fehlgeschlagen – alter Stand bleibt"; rm -rf "$neu"; return 1
  fi
  cat > /etc/systemd/system/nachtfalter-ki.service <<EOF
[Unit]
Description=Nachtfalter KI-Werkstatt (127.0.0.1:8100)
After=network-online.target
[Service]
User=$DIENST
WorkingDirectory=$BASE/ki
EnvironmentFile=$ETC/ki.env
Environment=HOST=127.0.0.1 PORT=8100 NODE_ENV=production
ExecStart=/usr/bin/node server.js
Restart=on-failure
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=$BASE/ki-daten
MemoryMax=512M
[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  rm -rf "$BASE/ki.alt"; [ -d "$BASE/ki" ] && mv "$BASE/ki" "$BASE/ki.alt"; mv "$neu" "$BASE/ki"
  systemctl enable -q nachtfalter-ki; systemctl restart nachtfalter-ki
  if warten http://127.0.0.1:8100/api/status; then
    echo "$rev" > "$STATE/ki.commit"; log "ki: läuft (${rev:0:7})"
  else
    log "ki: startet nicht – stelle alten Stand wieder her"
    journalctl -u nachtfalter-ki -n 20 --no-pager >>"$LOG" 2>&1 || true
    rm -rf "$BASE/ki.kaputt"; mv "$BASE/ki" "$BASE/ki.kaputt"
    [ -d "$BASE/ki.alt" ] && mv "$BASE/ki.alt" "$BASE/ki" && systemctl restart nachtfalter-ki
    return 1
  fi
}

# ---------------------------------------------------------------- Arena
arena() {
  local dir rev
  dir=$(holen live) || { log "arena: Branch live nicht abrufbar – übersprungen"; return 0; }
  rev=$(git -C "$dir" rev-parse HEAD); neu arena "$rev" || return 0
  [ -f "$dir/arena/server.js" ] || { log "arena: arena/server.js fehlt in ${rev:0:7}"; return 1; }
  [ -s "$ETC/arena.env" ] || { log "arena: $ETC/arena.env fehlt – nicht gestartet"; return 1; }
  log "arena: baue ${rev:0:7}"
  if ! docker build -q -t kly-keller "$dir/labs/kly-keller" >>"$LOG" 2>&1 || ! docker build -q -t nachtfalter-arena:neu "$dir/arena" >>"$LOG" 2>&1; then
    log "arena: Bau fehlgeschlagen – alter Stand bleibt"; return 1
  fi
  docker image inspect nachtfalter-arena:live >/dev/null 2>&1 && docker tag nachtfalter-arena:live nachtfalter-arena:alt
  docker tag nachtfalter-arena:neu nachtfalter-arena:live
  starten() {
    docker rm -f nf-arena >/dev/null 2>&1 || true
    docker run -d --name nf-arena --restart unless-stopped --env-file "$ETC/arena.env" \
      -e HOST=0.0.0.0 -e PORT=8090 -e TRUST_PROXY=1 -p 127.0.0.1:8090:8090 \
      -v /var/run/docker.sock:/var/run/docker.sock --memory 512m "nachtfalter-arena:$1" >/dev/null
  }
  starten live
  if warten http://127.0.0.1:8090/api/status; then
    echo "$rev" > "$STATE/arena.commit"; log "arena: läuft (${rev:0:7})"
  else
    log "arena: startet nicht – stelle alten Stand wieder her"
    docker logs --tail 20 nf-arena >>"$LOG" 2>&1 || true
    docker image inspect nachtfalter-arena:alt >/dev/null 2>&1 && starten alt
    return 1
  fi
}

fehler=0
ki || fehler=1
arena || fehler=1
docker image prune -f >/dev/null 2>&1 || true
exit $fehler
