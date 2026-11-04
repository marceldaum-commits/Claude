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
#   Branch „live“     → Web-App (Hacklab, Konto, Verwaltung)    → /opt/nachtfalter/web/live     → app.nachtfalter.tech
#   Arbeits-Branch    → Web-App Vorschau                         → /opt/nachtfalter/web/vorschau → vorschau.nachtfalter.tech
#   Branch „live“     → Zentrale (Kundenverwaltung)              → /opt/nachtfalter/web/zentrale → zentrale.nachtfalter.tech
# Branches werden nur nach Marcels „ok“ aktualisiert. Fehlt ein Branch, wird der Teil übersprungen.
#
# Geheimnisse (nur root lesbar, nie im Repository):
#   /etc/nachtfalter/github-token   GitHub-Fine-grained-Token, nur „Contents: Read-only“ für dieses Repository
#   /etc/nachtfalter/ki.env         Einstellungen der KI-Werkstatt (API-Schlüssel, Supabase …)
#   /etc/nachtfalter/arena.env      Einstellungen der Arena (Einladungscode …)
#   /etc/nachtfalter/konto-db.env   (optional) KONTO_DB_URL=postgresql://… der Supabase-Datenbank für die nächtliche Sicherung
set -euo pipefail
umask 022
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

REPO=marceldaum-commits/claude
ETC=/etc/nachtfalter
STATE=/var/lib/nachtfalter
BASE=/opt/nachtfalter
LOG=/var/log/nachtfalter-deploy.log
DIENST=nfdienst
WEBCONF=/etc/nachtfalter-web     # nginx-Bausteine + Vorschau-Passwort (für nginx lesbar, keine Geheimnisse außer dem Passwort-Hash)
VORSCHAU=ccr-63912bdd-xpv8bk     # Arbeits-Branch → vorschau.nachtfalter.tech
MODE=${1:-}

[ "$(id -u)" = 0 ] || { echo "Bitte mit sudo starten: sudo $0 $MODE"; exit 1; }
case "$MODE" in ""|--force|status) ;; *) echo "Unbekannt: $MODE (erlaubt: --force, status)"; exit 2;; esac

log() { echo "$(date '+%F %T') $*" | tee -a "$LOG"; }

status() {
  echo "== Nachtfalter-Dienste =="
  for c in web-live web-vorschau web-zentrale arena ki; do printf '%-12s Stand: %s\n' "$c" "$(cat "$STATE/$c.commit" 2>/dev/null | cut -c1-7 || echo -)"; done
  printf 'KI-Werkstatt: %s\n' "$(systemctl is-active nachtfalter-ki 2>/dev/null || true)"
  printf 'Arena:        %s\n' "$(docker inspect -f '{{.State.Status}}' nf-arena 2>/dev/null | head -1 | grep . || echo 'nicht vorhanden')"
  printf 'Prüfung 8100: %s\n' "$(curl -fsS -m 5 http://127.0.0.1:8100/api/status >/dev/null 2>&1 && echo ok || echo -)"
  printf 'Prüfung 8090: %s\n' "$(curl -fsS -m 5 http://127.0.0.1:8090/api/status >/dev/null 2>&1 && echo ok || echo -)"
  printf 'Konto-Ping:   %s\n' "$(cat "$STATE/konto-ping" 2>/dev/null || echo -)"
  printf 'Sicherung:    %s\n' "$(ls -1t /var/www/vhosts/nachtfalter.tech/private/konto-sicherung 2>/dev/null | head -1 | grep . || echo 'noch keine')"
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
  rev=$(git -C "$dir" rev-parse HEAD:ki-lernen 2>/dev/null) || { log "ki: ki-lernen fehlt im Branch ki-live"; return 1; }
  neu ki "$rev" || return 0
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
  # Nur neu bauen, wenn sich Arena oder Lab geändert haben (sonst brächen laufende Labs ab)
  rev="$(git -C "$dir" rev-parse HEAD:arena 2>/dev/null)-$(git -C "$dir" rev-parse HEAD:labs/kly-keller 2>/dev/null)"
  neu arena "$rev" || return 0
  [ -f "$dir/arena/server.js" ] || { log "arena: arena/server.js fehlt in ${rev:0:7}"; return 1; }
  [ -s "$ETC/arena.env" ] || { log "arena: $ETC/arena.env fehlt – nicht gestartet"; return 1; }
  log "arena: baue ${rev:0:7}"
  if ! docker build -q -t kly-keller "$dir/labs/kly-keller" >/dev/null 2>>"$LOG" || ! docker build -q -t nachtfalter-arena:neu "$dir/arena" >/dev/null 2>>"$LOG"; then
    log "arena: Bau fehlgeschlagen – alter Stand bleibt"; return 1
  fi
  docker image inspect nachtfalter-arena:live >/dev/null 2>&1 && docker tag nachtfalter-arena:live nachtfalter-arena:alt
  docker tag nachtfalter-arena:neu nachtfalter-arena:live
  starten() {
    docker rm -f nf-arena >/dev/null 2>&1 || true
    docker run -d --name nf-arena --restart unless-stopped --env-file "$ETC/arena.env" \
      -e HOST=0.0.0.0 -e PORT=8090 -e TRUST_PROXY=1 -p 127.0.0.1:8090:8090 \
      -v /var/run/docker.sock:/var/run/docker.sock --memory 512m \
      --log-opt max-size=10m --log-opt max-file=3 "nachtfalter-arena:$1" >/dev/null
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

# ---------------------------------------------------------------- Web (Hacklab, Konto, Zentrale)
# Statische Dateien nach $BASE/web/<seite>; nginx (Plesk) bindet $WEBCONF/<seite>.conf ein.
# Die Sicherheits-Header kommen aus _headers im Repository (streng geprüft, sonst kein Wechsel).
#   live / vorschau       → Hacklab (tools/build-deploy.sh, _headers)
#   zentrale              → Zentrale (tools/build-zentrale.sh, zentrale/_headers) aus „live“
#   zentrale-vorschau     → Zentrale aus dem Arbeits-Branch, erreichbar unter vorschau.nachtfalter.tech/zentrale/
header_lesen() { # $1 = _headers-Datei → füllt HDR[pfad] und HPFADE
  local datei=$1 pfad="" zeile name wert
  declare -gA HDR=(); HPFADE=()
  while IFS= read -r zeile || [ -n "$zeile" ]; do
    zeile=${zeile%$'\r'}
    case "$zeile" in ''|'#'*) continue;; esac
    if [[ "$zeile" =~ ^/[A-Za-z0-9._/*-]*$ ]]; then pfad=$zeile; [ "$pfad" = '/*' ] || HPFADE+=("$pfad"); continue; fi
    [[ "$zeile" =~ ^[[:space:]]+([A-Za-z-]+):[[:space:]]*(.+)$ ]] || { echo "unlesbare Zeile: $zeile" >&2; return 1; }
    name=${BASH_REMATCH[1]} wert=${BASH_REMATCH[2]}
    [[ "$wert" =~ [\"\\\$\{\}] ]] && { echo "unerlaubtes Zeichen in $name" >&2; return 1; }
    [ -n "$pfad" ] || { echo "Header ohne Pfad" >&2; return 1; }
    HDR["$pfad"]+="add_header $name \"$wert\" always;"$'\n'
  done < "$datei"
}
nginx_conf() { # $1 = _headers-Datei, $2 = Web-Ordner, $3 = Seite → Konfiguration auf stdout
  local root=$2 seite=$3 p re zblock=""
  # (Die Zentrale-Vorschau lief früher unter vorschau.nachtfalter.tech/zentrale/ – abgeschaltet, weil sie sich dort
  #  den Browser-Speicher mit der Vorschau-App teilte. Eine eigene Vorschau-Adresse kann später folgen.)
  header_lesen "$1" || return 1
  echo "# Automatisch erzeugt von nachtfalter-deploy ($seite) – nicht von Hand ändern."
  echo "root $root;"
  echo "index index.html;"
  if [ "$seite" = vorschau ] && [ -s "$WEBCONF/vorschau.htpasswd" ]; then
    echo 'auth_basic "Nachtfalter Vorschau";'
    echo "auth_basic_user_file $WEBCONF/vorschau.htpasswd;"
  fi
  printf '%s' "${HDR['/*']:-}"
  printf '%s' "$zblock"
  for p in "${HPFADE[@]}"; do
    [[ "$p" == *'*'* ]] && continue
    re=${p//./\\.}
    echo "location ~ ^${re}\$ {"; printf '%s' "${HDR['/*']:-}${HDR[$p]:-}"; echo "}"
  done
  # HTML immer frisch prüfen lassen
  echo 'location ~ \.html$ {'; printf '%s' "${HDR['/*']:-}"; echo 'add_header Cache-Control "no-cache" always;'; echo "}"
  echo 'location ~ (/\.(?!well-known/)|/_headers$) { return 404; }'
}

web() { # $1 = Seite, $2 = Branch, $3 = app|zentrale
  local seite=$1 br=$2 art=${3:-app} dir rev ziel neu bau hdr
  if [ "$art" = zentrale ]; then bau=tools/build-zentrale.sh hdr=zentrale/_headers; else bau=tools/build-deploy.sh hdr=_headers; fi
  dir=$(holen "$br") || { log "web-$seite: Branch $br nicht abrufbar – übersprungen"; return 0; }
  rev=$(git -C "$dir" rev-parse 'HEAD^{tree}')
  ziel="$BASE/web/$seite"; neu="$ziel.neu"
  if neu "web-$seite" "$rev" || [ ! -d "$ziel" ]; then
    if [ ! -f "$dir/$bau" ] || [ ! -f "$dir/$hdr" ]; then
      [ "$art" = zentrale ] && return 0 # Zentrale gibt es in diesem Stand noch nicht
      log "web-$seite: Bau-Dateien fehlen in ${rev:0:7}"; return 1
    fi
    log "web-$seite: baue ${rev:0:7}"
    install -d -m 755 "$BASE/web"; install -d -o "$DIENST" -g "$DIENST" -m 755 "$BASE/web/bau"
    rm -rf "$BASE/web/bau/$seite"
    # Bau als Dienstbenutzer in einer eigenen systemd-Einheit: Nach dem Ende werden auch alle
    # zurückgelassenen Prozesse beendet (kein nachträgliches Austauschen von Dateien).
    if ! systemd-run --quiet --wait --pipe --collect --uid="$DIENST" --gid="$DIENST" \
         -p RuntimeMaxSec=600 -p KillMode=control-group -E HOME="$BASE" \
         bash "$dir/$bau" "$BASE/web/bau/$seite" >>"$LOG" 2>&1 \
       || [ -L "$BASE/web/bau/$seite" ] || [ ! -f "$BASE/web/bau/$seite/index.html" ]; then
      log "web-$seite: Bau fehlgeschlagen – alter Stand bleibt"; return 1
    fi
    rm -rf "$neu"; cp -r "$BASE/web/bau/$seite" "$neu"
    # Die Kopie gehört root und liegt in einem nur für root beschreibbaren Ordner – erst DORT prüfen:
    # keine Verknüpfungen (Symlinks), sonst würde nginx womöglich fremde Dateien ausliefern.
    if [ -L "$neu" ] || [ ! -d "$neu" ] || [ -n "$(find "$neu" -type l -print -quit)" ]; then
      log "web-$seite: Bau enthält Verknüpfungen – abgelehnt, alter Stand bleibt"; rm -rf "$neu"; return 1
    fi
    rm -f "$neu/_headers"
    chown -R root:root "$neu"; chmod -R u=rwX,go=rX "$neu"
    rm -rf "$ziel.alt"; [ -d "$ziel" ] && mv "$ziel" "$ziel.alt"; mv "$neu" "$ziel"
    cp "$dir/$hdr" "$STATE/web-$seite.headers"
    echo "$rev" > "$STATE/web-$seite.commit"; log "web-$seite: Dateien aktuell (${rev:0:7})"
  fi
  [ "$seite" = zentrale-vorschau ] && return 0 # wird im Baustein der Vorschau eingebunden
  # nginx-Baustein (bei jedem Lauf prüfen, z. B. wenn das Vorschau-Passwort neu angelegt wurde)
  install -d -m 755 "$WEBCONF"
  local conf="$WEBCONF/$seite.conf" tmp; tmp=$(mktemp)
  if ! nginx_conf "$STATE/web-$seite.headers" "$ziel" "$seite" > "$tmp" 2>>"$LOG"; then
    rm -f "$tmp"; log "web-$seite: _headers nicht übernehmbar – nginx-Baustein bleibt"; return 1
  fi
  if [ -f "$WEBCONF/vorschau.htpasswd" ]; then # nginx-Arbeitsprozesse müssen die Datei lesen können
    local wu; wu=$(ps -o user= -C nginx 2>/dev/null | grep -vx root | sort -u | head -1)
    if [ -n "$wu" ]; then chown "root:$(id -gn "$wu")" "$WEBCONF/vorschau.htpasswd"; chmod 640 "$WEBCONF/vorschau.htpasswd"; fi
  fi
  if cmp -s "$tmp" "$conf"; then rm -f "$tmp"; return 0; fi
  [ -f "$conf" ] && cp "$conf" "$conf.alt"
  install -m 644 "$tmp" "$conf"; rm -f "$tmp"
  if nginx -t >/dev/null 2>>"$LOG"; then
    systemctl reload nginx && log "web-$seite: nginx neu geladen"
  else
    log "web-$seite: nginx-Prüfung fehlgeschlagen – vorheriger Baustein zurück"
    if [ -f "$conf.alt" ]; then mv "$conf.alt" "$conf"; else rm -f "$conf"; fi
    return 1
  fi
}

# ---------------------------------------------------------------- Konto (Supabase): Lebenszeichen + Sicherung
# Einmal täglich: kleiner Aufruf, damit das kostenlose Supabase-Projekt nicht wegen „Inaktivität“ pausiert wird.
# Optional nachts: Sicherung von Konten (auth) und App-Daten (public) mit pg_dump in den Webspace-Ordner „private“
# – dort erfasst sie das Plesk-Backup (verschlüsselt, Google Drive). Nur root kann die Dateien lesen.
KONTO_URL=https://sxapebxzxmathkvtuuvn.supabase.co
KONTO_KEY=sb_publishable_04l6lOd2uIPsErdWDOMvew_U6vsFGbn
SICHERUNG=/var/www/vhosts/nachtfalter.tech/private/konto-sicherung
konto() {
  local heute; heute=$(date +%F)
  if [ "$(cat "$STATE/konto-ping" 2>/dev/null)" != "$heute" ]; then
    # Auth-Dienst und Datenbank (über die REST-Schnittstelle) je einmal ansprechen
    if curl -fsS -m 15 -o /dev/null -H "apikey: $KONTO_KEY" "$KONTO_URL/auth/v1/health" \
       && curl -sS -m 15 -o /dev/null -X POST -H "apikey: $KONTO_KEY" -H "Content-Type: application/json" -d '{}' "$KONTO_URL/rest/v1/rpc/mein_status"; then echo "$heute" > "$STATE/konto-ping"
    else log "konto: Supabase nicht erreichbar"; fi
  fi
  [ -s "$ETC/konto-db.env" ] || return 0
  [ "$(date +%H)" -ge 2 ] && [ "$(date +%H)" -lt 5 ] || return 0           # nur nachts
  [ "$(cat "$STATE/konto-sicherung" 2>/dev/null)" != "$heute" ] || return 0
  command -v pg_dump >/dev/null || { log "konto: pg_dump fehlt (apt install postgresql-client)"; echo "$heute" > "$STATE/konto-sicherung"; return 1; }
  local url; url=$(sed -n 's/^KONTO_DB_URL=//p' "$ETC/konto-db.env" | head -1)
  # postgresql://benutzer:passwort@host:port/datenbank → Umgebungsvariablen (nicht in der Prozessliste sichtbar)
  [[ "$url" =~ ^postgres(ql)?://([^:/@]+):([^@]+)@([^:/]+):([0-9]+)/([^?]+)$ ]] \
    || { log "konto: KONTO_DB_URL in $ETC/konto-db.env hat nicht das erwartete Format"; return 1; }
  local -x PGUSER=${BASH_REMATCH[2]} PGPASSWORD=${BASH_REMATCH[3]} PGHOST=${BASH_REMATCH[4]} PGPORT=${BASH_REMATCH[5]} \
           PGDATABASE=${BASH_REMATCH[6]} PGSSLMODE=require PGCONNECT_TIMEOUT=20
  ( umask 077
    # Zielordner: muss root gehören und darf keine Verknüpfung sein
    [ -L "$SICHERUNG" ] && { log "konto: $SICHERUNG ist eine Verknüpfung – abgebrochen"; exit 1; }
    install -d -o root -g root -m 700 "$SICHERUNG"
    [ "$(stat -c %u "$SICHERUNG")" = 0 ] || { log "konto: $SICHERUNG gehört nicht root – abgebrochen"; exit 1; }
    local tmp="$STATE/konto-sicherung.tmp"
    if pg_dump --format=custom --no-owner --no-privileges --schema=public --schema=auth --file="$tmp" 2>>"$LOG"; then
      install -o root -g root -m 600 "$tmp" "$SICHERUNG/konto-$heute.dump"; rm -f "$tmp"
      find "$SICHERUNG" -maxdepth 1 -type f -name 'konto-*.dump' -mtime +14 -delete
      log "konto: Sicherung $(du -h "$SICHERUNG/konto-$heute.dump" | cut -f1) gespeichert"
    else
      rm -f "$tmp"; log "konto: Sicherung fehlgeschlagen"; exit 1
    fi )
  local rc=$?; echo "$heute" > "$STATE/konto-sicherung"; return $rc
}

fehler=0
web live live || fehler=1
rm -rf "$BASE/web/zentrale-vorschau" "$STATE/web-zentrale-vorschau.headers" "$STATE/web-zentrale-vorschau.commit"
web vorschau "$VORSCHAU" || fehler=1
web zentrale live zentrale || fehler=1
ki || fehler=1
arena || fehler=1
konto || fehler=1
docker image prune -f >/dev/null 2>&1 || true
exit $fehler
