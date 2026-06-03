#!/usr/bin/env sh
set -e

cd /app/server

echo "Initializing SQLite database..."
node src/db/init-db.js
node src/db/seed.js

if [ "$#" -gt 0 ]; then
  exec "$@"
fi

exec node src/index.js
