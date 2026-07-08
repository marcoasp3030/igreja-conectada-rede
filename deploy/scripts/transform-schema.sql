-- ============================================================
-- Transformações no schema exportado do Lovable Cloud para rodar
-- em Postgres 16 puro (sem extensão auth/pgsodium/etc.).
--
-- Aplique DEPOIS de restaurar o dump public-*.sql em um banco novo:
--   psql "$DATABASE_URL" -f public-YYYYMMDD-HHMMSS.sql
--   psql "$DATABASE_URL" -f deploy/scripts/transform-schema.sql
-- ============================================================

BEGIN;

-- 1) Tabela de usuários da aplicação (substitui auth.users)
CREATE TABLE IF NOT EXISTS public.app_users (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email         citext UNIQUE NOT NULL,
    password_hash text NOT NULL,             -- bcrypt (custo 12)
    full_name     text,
    email_verified_at timestamptz,
    last_login_at timestamptz,
    is_active     boolean NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2) Tabela de sessões / refresh tokens (opcional se usar JWT stateless)
CREATE TABLE IF NOT EXISTS public.app_sessions (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    refresh_token_hash text NOT NULL,
    user_agent    text,
    ip            inet,
    expires_at    timestamptz NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    revoked_at    timestamptz
);
CREATE INDEX IF NOT EXISTS idx_app_sessions_user ON public.app_sessions(user_id);

-- 3) Helper que substitui auth.uid() lendo GUC por request
--    A app faz: SET LOCAL app.current_user_id = '<uuid>';
CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid
$$;

-- 4) Reescreve as funções que dependiam de auth.uid()
--    (aqui você pode simplesmente substituir chamadas de auth.uid() por
--     public.current_app_user_id() nas policies. Como Postgres não permite
--     ALTER POLICY expression, o caminho é DROP + CREATE.)
--
--    Este bloco é um TEMPLATE — rode `\df+` para listar as funções e
--    troque auth.uid() → public.current_app_user_id() dentro delas.
--    Para as policies, use o script gerado por gerar-policies.sh.

-- 5) FK de business_listings, prayer_posts, etc. que referenciam auth.users
--    passam a referenciar public.app_users. Descubra as FKs:
--
--    SELECT conrelid::regclass, conname
--    FROM pg_constraint
--    WHERE confrelid = 'auth.users'::regclass;
--
--    Depois, para cada uma:
--    ALTER TABLE public.<tabela> DROP CONSTRAINT <fk>;
--    ALTER TABLE public.<tabela>
--      ADD CONSTRAINT <fk> FOREIGN KEY (user_id)
--      REFERENCES public.app_users(id) ON DELETE CASCADE;

-- 6) Trigger de "usuário criado" (equivalente ao handle_new_user)
--    Já não precisa: a própria server function de signUp faz o INSERT em
--    app_users + profiles + user_roles numa única transação.

COMMIT;
