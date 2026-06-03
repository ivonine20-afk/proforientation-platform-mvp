#!/usr/bin/env sh
set -e

cd /app/server

echo "Initializing SQLite database..."
node src/db/init-db.js
node src/db/seed.js

exec node src/index.js
