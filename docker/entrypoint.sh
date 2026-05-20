#!/bin/sh
set -e

DB_PATH="/app/NINJAMaster/db.sqlite3"
SHOULD_SEED="${DJANGO_SEED_INITIAL_CONTENT:-0}"

if [ ! -f "$DB_PATH" ]; then
  SHOULD_SEED="1"
fi

python manage.py migrate

if [ "$SHOULD_SEED" = "1" ]; then
  python manage.py seed_initial_content
fi

python manage.py ensure_superuser

exec "$@"
