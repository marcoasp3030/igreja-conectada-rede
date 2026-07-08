#!/usr/bin/env bash
# Backup diário do Postgres. Coloque no cron da VPS:
#   0 3 * * * /opt/app/deploy/scripts/backup.sh >> /var/log/app-backup.log 2>&1
set -euo pipefail

cd "$(dirname "$0")/.."

BACKUP_DIR="./backups"
RETENTION_DAYS=14
STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_DIR"

# Dump comprimido dentro do container postgres
docker compose exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc \
  > "$BACKUP_DIR/db-$STAMP.dump"

# Backup dos uploads
docker run --rm \
  -v "$(pwd)"/backups:/out \
  -v deploy_uploads:/data:ro \
  alpine tar czf "/out/uploads-$STAMP.tar.gz" -C /data .

# Limpeza
find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -delete

echo "[$(date -Is)] backup ok — $STAMP"
