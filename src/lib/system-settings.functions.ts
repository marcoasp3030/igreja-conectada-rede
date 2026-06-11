import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const OPENAI_KEY = "openai_api_key";

function maskKey(value: string | null | undefined) {
  if (!value) return null;
  if (value.length <= 8) return "••••";
  return `${value.slice(0, 3)}••••${value.slice(-4)}`;
}

async function ensureSedeAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId);
  const ok = (data ?? []).some((r: any) => r.role === "admin_sede");
  if (!ok) throw new Error("Apenas administradores da sede podem gerenciar esta configuração.");
}

export const getOpenAIKeyStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureSedeAdmin(context as any);
    const { data, error } = await (context as any).supabase
      .from("system_settings")
      .select("value, updated_at")
      .eq("key", OPENAI_KEY)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      configured: !!data?.value,
      masked: maskKey(data?.value),
      updated_at: data?.updated_at ?? null,
    };
  });

export const saveOpenAIKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { apiKey: string }) =>
    z
      .object({
        apiKey: z
          .string()
          .trim()
          .min(20, "Chave muito curta")
          .max(500, "Chave muito longa")
          .regex(/^sk-[A-Za-z0-9_\-]+$/, "Formato inválido. A chave deve começar com 'sk-'"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await ensureSedeAdmin(context as any);
    const { error } = await (context as any).supabase
      .from("system_settings")
      .upsert({
        key: OPENAI_KEY,
        value: data.apiKey,
        updated_at: new Date().toISOString(),
        updated_by: (context as any).userId,
      });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteOpenAIKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureSedeAdmin(context as any);
    const { error } = await (context as any).supabase
      .from("system_settings")
      .delete()
      .eq("key", OPENAI_KEY);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
