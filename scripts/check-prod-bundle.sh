#!/bin/sh
# Fails if debug code reached a production build (#65). Run after `npm run build`.
set -eu
dist="${1:-dist}"
if [ ! -f "$dist/index.html" ]; then
  echo "No $dist/index.html. Run npm run build first." >&2
  exit 1
fi
if grep -rlE 'picross-debug|picross:debug|VITE_DEBUG' "$dist"; then
  echo "Debug code found in the production build (files above)." >&2
  exit 1
fi
echo "No debug code in $dist."
