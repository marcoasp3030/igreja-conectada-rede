import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const roleEnum = z.enum(["admin_sede", "admin_congregacao", "lider_departamento", "membro"]);

async function isSedeAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).some((r: any) => r.role === "admin_sede");
}

async function getUserCongregation(supabase: any, userId: string) {
  const { data } = await supabase.from("profiles").select("congregation_id").eq("id", userId).single();
  return data?.congregation_id as string | null;
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sede = await isSedeAdmin(context.supabase, context.userId);
    const myCong = await getUserCongregation(context.supabase, context.userId);

    let q = context.supabase
      .from("profiles")
      .select("id, full_name, email, phone, congregation_id, created_at, congregations(name)")
      .order("created_at", { ascending: false });
    if (!sede) {
      if (!myCong) return [];
      q = q.eq("congregation_id", myCong);
    }
    const { data: profiles, error } = await q;
    if (error) throw error;

    const ids = (profiles ?? []).map((p: any) => p.id);
    let rolesByUser: Record<string, string[]> = {};
    if (ids.length) {
      const { data: roles } = await context.supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", ids);
      for (const r of roles ?? []) {
        rolesByUser[r.user_id] = rolesByUser[r.user_id] ?? [];
        rolesByUser[r.user_id].push(r.role);
      }
    }
    return (profiles ?? []).map((p: any) => ({ ...p, roles: rolesByUser[p.id] ?? [] }));
  });

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    email: z.string().email(),
    password: z.string().min(8),
    full_name: z.string().min(2),
    phone: z.string().optional(),
    congregation_id: z.string().uuid().nullable().optional(),
    role: roleEnum,
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sede = await isSedeAdmin(context.supabase, context.userId);
    const myCong = await getUserCongregation(context.supabase, context.userId);

    // Authorization
    if (!sede) {
      if (data.role === "admin_sede") throw new Error("Sem permissão para criar admin da sede.");
      if (!myCong || data.congregation_id !== myCong) {
        throw new Error("Você só pode criar usuários na sua congregação.");
      }
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (error) throw new Error(error.message);
    const newId = created.user!.id;

    // Update profile (trigger already inserted base row)
    await supabaseAdmin.from("profiles").update({
      full_name: data.full_name,
      phone: data.phone ?? null,
      congregation_id: data.congregation_id ?? null,
    }).eq("id", newId);

    // Reset roles and set chosen role
    await supabaseAdmin.from("user_roles").delete().eq("user_id", newId);
    await supabaseAdmin.from("user_roles").insert({
      user_id: newId,
      role: data.role,
      congregation_id: data.congregation_id ?? null,
    });

    return { id: newId };
  });

export const updateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    user_id: z.string().uuid(),
    full_name: z.string().optional(),
    phone: z.string().nullable().optional(),
    congregation_id: z.string().uuid().nullable().optional(),
    role: roleEnum.optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sede = await isSedeAdmin(context.supabase, context.userId);
    const myCong = await getUserCongregation(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target } = await supabaseAdmin
      .from("profiles").select("congregation_id").eq("id", data.user_id).single();

    if (!sede) {
      if (data.role === "admin_sede") throw new Error("Sem permissão.");
      if (!myCong || target?.congregation_id !== myCong) throw new Error("Sem permissão.");
      if (data.congregation_id && data.congregation_id !== myCong) throw new Error("Sem permissão.");
    }

    const profileUpdate: any = {};
    if (data.full_name !== undefined) profileUpdate.full_name = data.full_name;
    if (data.phone !== undefined) profileUpdate.phone = data.phone;
    if (data.congregation_id !== undefined) profileUpdate.congregation_id = data.congregation_id;
    if (Object.keys(profileUpdate).length) {
      await supabaseAdmin.from("profiles").update(profileUpdate).eq("id", data.user_id);
    }

    if (data.role) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
      await supabaseAdmin.from("user_roles").insert({
        user_id: data.user_id,
        role: data.role,
        congregation_id: data.congregation_id ?? target?.congregation_id ?? null,
      });
    }
    return { ok: true };
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    user_id: z.string().uuid(),
    password: z.string().min(8),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sede = await isSedeAdmin(context.supabase, context.userId);
    const myCong = await getUserCongregation(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (!sede) {
      const { data: target } = await supabaseAdmin
        .from("profiles").select("congregation_id").eq("id", data.user_id).single();
      if (!myCong || target?.congregation_id !== myCong) throw new Error("Sem permissão.");
    }
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, { password: data.password });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.user_id === context.userId) throw new Error("Você não pode excluir seu próprio usuário.");
    const sede = await isSedeAdmin(context.supabase, context.userId);
    const myCong = await getUserCongregation(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (!sede) {
      const { data: target } = await supabaseAdmin
        .from("profiles").select("congregation_id").eq("id", data.user_id).single();
      if (!myCong || target?.congregation_id !== myCong) throw new Error("Sem permissão.");
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listCongregationsLite = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sede = await isSedeAdmin(context.supabase, context.userId);
    const myCong = await getUserCongregation(context.supabase, context.userId);
    let q = context.supabase.from("congregations").select("id, name").order("name");
    if (!sede && myCong) q = q.eq("id", myCong);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  });
