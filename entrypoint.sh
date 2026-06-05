#!/usr/bin/env sh
set -e

cd /app/server

if [ "$#" -gt 0 ]; then
  exec "$@"
fi

exec node src/index.js
