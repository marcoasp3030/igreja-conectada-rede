#!/usr/bin/env bash
# Exporta o schema + dados atuais do Lovable Cloud (Supabase gerenciado)
# Requer: pg_dump 16 instalado localmente, PGURI da Cloud à mão.
#
# Como pegar a PGURI:
#   Lovable → Cloud → Advanced settings → Export data
#   (ou peça ao Lovable exportar CSV por tabela via UI)
#
# Uso:
#   PGURI="postgres://postgres:SENHA@HOST:6543/postgres?sslmode=require" ./export-from-cloud.sh

set -euo pipefail

if [[ -z "${PGURI:-}" ]]; then
  echo "ERRO: defina PGURI com a connection string da Cloud." >&2
  exit 1
fi

OUT_DIR="$(dirname "$0")/../dumps"
mkdir -p "$OUT_DIR"
STAMP=$(date +%Y%m%d-%H%M%S)

echo "==> Dump apenas do schema public + auth.users (para migrar usuários)"

pg_dump "$PGURI" \
  --no-owner --no-privileges \
  --schema=public \
  --exclude-table='public._realtime*' \
  -F p -f "$OUT_DIR/public-$STAMP.sql"

# auth.users é útil para migrar credenciais (email + id) — senhas Supabase NÃO
# são compatíveis com bcrypt puro (usam auth.crypt), então usuários precisarão
# redefinir senha OU você preserva o id e força fluxo "reset senha" no 1º login.
pg_dump "$PGURI" \
  --no-owner --no-privileges \
  --schema=auth --table='auth.users' \
  --data-only \
  -F p -f "$OUT_DIR/auth-users-$STAMP.sql"

echo "==> Dumps gerados em $OUT_DIR"
ls -lh "$OUT_DIR"
