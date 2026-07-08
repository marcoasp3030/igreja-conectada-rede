# Migração para VPS (Postgres puro, sem Supabase)

Este diretório contém tudo necessário para rodar o sistema em uma VPS Linux com Docker, usando **Postgres 16 nativo** no lugar do Supabase.

## Visão geral da arquitetura alvo

```
Internet ──► Nginx (443/80, TLS Let's Encrypt)
                │
                ├──► app  (Node 20 + TanStack Start SSR, porta interna 3000)
                │       └── conecta em postgres:5432 via pool pg
                │
                └──► (opcional) /uploads → volume estático
       postgres:16 (volume dedicado, backup diário)
```

Auth deixa de ser Supabase Auth e passa a ser JWT httpOnly emitido pela própria app (bcrypt + `jsonwebtoken`). RLS **continua ativo** no Postgres — cada request faz `SET LOCAL app.current_user_id` na transação, e as policies passam a ler `current_setting('app.current_user_id', true)::uuid` em vez de `auth.uid()`.

## Ordem de execução

1. **Provisionar VPS** (Ubuntu 22.04+, 2 vCPU / 4 GB mínimo). Instalar Docker + Docker Compose plugin.
2. **DNS**: apontar seu domínio (A record) para o IP da VPS.
3. **Clonar o projeto** na VPS.
4. **Exportar dados do Cloud atual** com `scripts/export-from-cloud.sh` (roda localmente, gera `dump.sql`).
5. **Transformar o schema** com `scripts/transform-schema.sql` (troca `auth.uid()` → app setting, cria `app_users`).
6. **Configurar `.env`** a partir de `.env.example`.
7. `docker compose up -d --build` na VPS.
8. **Certbot** para HTTPS: `docker compose run --rm certbot`.
9. **Backups**: cron chamando `scripts/backup.sh` (diário, retenção 14 dias).

Cada passo está detalhado em [`MIGRATION_GUIDE.md`](./MIGRATION_GUIDE.md).

## O que ainda precisa ser feito no código da app (checklist)

Estes arquivos ainda usam Supabase e precisarão ser adaptados quando você decidir cortar o cordão. **Não fiz esta troca automaticamente** para não quebrar o preview do Lovable enquanto você prepara a VPS.

- [ ] Substituir `src/integrations/supabase/client.ts` por um wrapper `src/integrations/db/client.ts` usando `pg` (pool) + `postgres-meta` opcional.
- [ ] Substituir `src/integrations/supabase/auth-middleware.ts` por middleware que:
      1. lê cookie `session` (JWT),
      2. valida com `jsonwebtoken`,
      3. injeta `userId`/`claims` no context,
      4. antes de cada query executa `SET LOCAL app.current_user_id = $1`.
- [ ] Criar server functions `signIn`, `signUp`, `signOut`, `resetPassword` (bcrypt + JWT em cookie httpOnly).
- [ ] Trocar chamadas `supabase.from('x').select()` por queries SQL parametrizadas ou por um mini query builder (recomendado: [`kysely`](https://kysely.dev) — tipado, leve).
- [ ] Storage: substituir buckets por volume local em `/var/app/uploads` ou por S3 compatível (MinIO no compose se quiser).

O arquivo [`APP_CODE_MIGRATION.md`](./APP_CODE_MIGRATION.md) mostra exatamente o código de substituição para cada ponto.
