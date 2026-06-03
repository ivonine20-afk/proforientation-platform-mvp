#!/usr/bin/env sh
set -e

cd /app/server

if [ ! -f /app/data/base.db ]; then
  echo "Initializing SQLite database..."
  node src/db/init-db.js
  node src/db/seed.js
fi

exec node src/index.js
