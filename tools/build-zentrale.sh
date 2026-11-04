#!/usr/bin/env bash
# Baut die Zentrale (zentrale.nachtfalter.tech) in einen eigenen Ordner (Standard: dist-zentrale/).
# Nur Dateien der Zentrale + gemeinsames Stylesheet, Symbol und config.js – keine App, keine Tests.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:-dist-zentrale}"
rm -rf "$OUT"; mkdir -p "$OUT/css" "$OUT/icons"
cp zentrale/index.html zentrale/zentrale.js zentrale/zentrale.css zentrale/_headers zentrale/markt.json "$OUT/"
cp css/app.css "$OUT/css/"; cp icons/icon.svg "$OUT/icons/"; cp config.js "$OUT/"
node tools/raeume-json.mjs > "$OUT/raeume.json"
echo "$(find "$OUT" -type f | wc -l) Dateien in $OUT/"
