#!/usr/bin/env bash
# Baut den Veröffentlichungs-Ordner (Standard: dist/) mit NUR den App-Dateien:
# KLY_FILES + KLY_EXTRA aus app-files.js plus _headers. Keine Tests, Tools oder .git.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:-dist}"
rm -rf "$OUT"; mkdir -p "$OUT"
node -e 'global.self={};require("./app-files.js");console.log([...self.KLY_FILES,...self.KLY_EXTRA,"_headers"].join("\n"))' |
while read -r f; do
  mkdir -p "$OUT/$(dirname "$f")"
  cp "$f" "$OUT/$f"
done
echo "$(find "$OUT" -type f | wc -l) Dateien in $OUT/"
