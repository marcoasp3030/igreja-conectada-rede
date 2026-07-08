# Migração do código da app (Supabase → Postgres puro)

> ⚠️ **Não faça essa troca no Lovable.** Aplique este diff numa branch local depois de clonar o projeto na sua máquina — é o que vai rodar na VPS. Enquanto o preview do Lovable existir, ele continua usando o Cloud.

## 1. Dependências a adicionar / remover

```bash
npm remove @supabase/supabase-js
npm i pg kysely bcryptjs jsonwebtoken zod nodemailer
npm i -D @types/pg @types/bcryptjs @types/jsonwebtoken @types/nodemailer kysely-codegen
```

## 2. Novo cliente de banco — `src/integrations/db/pool.server.ts`

```ts
import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

export const pool =
  globalThis.__pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
  });

if (process.env.NODE_ENV !== "production") globalThis.__pgPool = pool;
```

## 3. Executor com RLS por-request — `src/integrations/db/withUser.server.ts`

```ts
import type { PoolClient } from "pg";
import { pool } from "./pool.server";

export async function withUser<T>(
  userId: string | null,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [
      userId ?? "",
    ]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
```

Uso dentro de qualquer server function:
```ts
export const listAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    return withUser(context.userId, async (db) => {
      const { rows } = await db.query(
        "SELECT * FROM announcements ORDER BY created_at DESC LIMIT 50",
      );
      return rows;
    });
  });
```

## 4. Middleware de autenticação — `src/integrations/auth/middleware.server.ts`

```ts
import { createMiddleware } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import jwt from "jsonwebtoken";

export const requireAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const token = getCookie("session");
    if (!token) throw new Response("Unauthorized", { status: 401 });
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
        sub: string;
        email: string;
      };
      return next({ context: { userId: payload.sub, email: payload.email } });
    } catch {
      throw new Response("Unauthorized", { status: 401 });
    }
  },
);
```

## 5. Signup / signin — `src/lib/auth.functions.ts`

```ts
import { createServerFn } from "@tanstack/react-start";
import { setCookie, deleteCookie } from "@tanstack/react-start/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { pool } from "@/integrations/db/pool.server";

const creds = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const signIn = createServerFn({ method: "POST" })
  .inputValidator((d) => creds.parse(d))
  .handler(async ({ data }) => {
    const { rows } = await pool.query(
      "SELECT id, password_hash FROM app_users WHERE email = $1 AND is_active",
      [data.email],
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(data.password, user.password_hash))) {
      throw new Response("Credenciais inválidas", { status: 401 });
    }
    const token = jwt.sign(
      { sub: user.id, email: data.email },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" },
    );
    setCookie("session", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    await pool.query("UPDATE app_users SET last_login_at = now() WHERE id = $1", [
      user.id,
    ]);
    return { userId: user.id };
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  deleteCookie("session", { path: "/" });
  return { ok: true };
});

export const signUp = createServerFn({ method: "POST" })
  .inputValidator((d) => creds.extend({ full_name: z.string().min(2) }).parse(d))
  .handler(async ({ data }) => {
    const hash = await bcrypt.hash(data.password, 12);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        `INSERT INTO app_users (email, password_hash, full_name)
         VALUES ($1, $2, $3) RETURNING id`,
        [data.email, hash, data.full_name],
      );
      const userId = rows[0].id;
      await client.query(
        `INSERT INTO profiles (id, full_name, email) VALUES ($1, $2, $3)`,
        [userId, data.full_name, data.email],
      );
      await client.query(
        `INSERT INTO user_roles (user_id, role) VALUES ($1, 'membro')`,
        [userId],
      );
      await client.query("COMMIT");
      return { userId };
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  });
```

## 6. Reescrever policies (drop auth.uid())

Rode uma vez no banco de produção:

```sql
-- Gera comandos DROP/CREATE POLICY para revisão
SELECT
  format('-- %I on %I.%I', polname, schemaname, tablename) as header,
  format('DROP POLICY %I ON %I.%I;', polname, schemaname, tablename) as drop_cmd,
  pg_get_expr(polqual, polrelid) as using_expr,
  pg_get_expr(polwithcheck, polrelid) as check_expr
FROM pg_policies
JOIN pg_policy ON pg_policy.polname = pg_policies.policyname
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Substitua no texto de cada policy:
- `auth.uid()` → `public.current_app_user_id()`
- `auth.jwt() ->> 'email'` → `(SELECT email FROM public.app_users WHERE id = public.current_app_user_id())`

## 7. Storage (arquivos)

Substitua `supabase.storage.from(bucket).upload(...)` por gravação em disco local em `/var/app/uploads/<tenant>/<uuid>-<filename>` — ou monte um MinIO no `docker-compose.yml`:

```yaml
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${S3_KEY}
      MINIO_ROOT_PASSWORD: ${S3_SECRET}
    volumes:
      - minio:/data
    ports:
      - "127.0.0.1:9000:9000"
      - "127.0.0.1:9001:9001"
```

E use o SDK `@aws-sdk/client-s3` apontando para `http://minio:9000`.

## 8. Emails

Substitua `supabase.auth.resetPasswordForEmail(...)` por `nodemailer` + template próprio, gerando um token curto guardado em `password_reset_tokens (user_id, token_hash, expires_at)`.

---

Quando você tiver tudo isso pronto e testado localmente, é só apontar o Docker da VPS para essa branch. O `deploy/Dockerfile` já builda a partir da raiz do projeto.
