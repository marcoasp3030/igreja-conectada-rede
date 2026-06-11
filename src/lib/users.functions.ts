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

async function getUserSummary(admin: any, userId: string) {
  const { data: p } = await admin
    .from("profiles")
    .select("full_name, email, congregation_id")
    .eq("id", userId)
    .maybeSingle();
  const { data: r } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  return {
    full_name: p?.full_name ?? null,
    email: p?.email ?? null,
    congregation_id: p?.congregation_id ?? null,
    roles: (r ?? []).map((x: any) => x.role) as string[],
  };
}

async function writeAudit(
  admin: any,
  params: {
    action: "create" | "update" | "role_change" | "password_reset" | "delete";
    actorUserId: string;
    targetUserId: string | null;
    targetEmail?: string | null;
    targetName?: string | null;
    congregationId?: string | null;
    changes?: Record<string, any>;
  },
) {
  const { data: actor } = await admin
    .from("profiles").select("full_name").eq("id", params.actorUserId).maybeSingle();
  await admin.from("user_audit_logs").insert({
    action: params.action,
    target_user_id: params.targetUserId,
    target_user_email: params.targetEmail ?? null,
    target_user_name: params.targetName ?? null,
    actor_user_id: params.actorUserId,
    actor_user_name: actor?.full_name ?? null,
    congregation_id: params.congregationId ?? null,
    changes: params.changes ?? {},
  });
}

function diffFields(before: Record<string, any>, after: Record<string, any>, fields: string[]) {
  const out: Record<string, { from: any; to: any }> = {};
  for (const f of fields) {
    const a = before?.[f] ?? null;
    const b = after?.[f] ?? null;
    const aStr = Array.isArray(a) ? JSON.stringify([...a].sort()) : JSON.stringify(a);
    const bStr = Array.isArray(b) ? JSON.stringify([...b].sort()) : JSON.stringify(b);
    if (aStr !== bStr) out[f] = { from: a, to: b };
  }
  return out;
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sede = await isSedeAdmin(context.supabase, context.userId);
    const myCong = await getUserCongregation(context.supabase, context.userId);

    let q = context.supabase
      .from("profiles")
      .select("id, full_name, email, phone, congregation_id, active, created_at, congregations(name)")
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

    await supabaseAdmin.from("profiles").update({
      full_name: data.full_name,
      phone: data.phone ?? null,
      congregation_id: data.congregation_id ?? null,
    }).eq("id", newId);

    await supabaseAdmin.from("user_roles").delete().eq("user_id", newId);
    await supabaseAdmin.from("user_roles").insert({
      user_id: newId,
      role: data.role,
      congregation_id: data.congregation_id ?? null,
    });

    await writeAudit(supabaseAdmin, {
      action: "create",
      actorUserId: context.userId,
      targetUserId: newId,
      targetEmail: data.email,
      targetName: data.full_name,
      congregationId: data.congregation_id ?? null,
      changes: {
        full_name: { from: null, to: data.full_name },
        email: { from: null, to: data.email },
        phone: { from: null, to: data.phone ?? null },
        congregation_id: { from: null, to: data.congregation_id ?? null },
        role: { from: null, to: data.role },
      },
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
    const before = await getUserSummary(supabaseAdmin, data.user_id);

    if (!sede) {
      if (data.role === "admin_sede") throw new Error("Sem permissão.");
      if (!myCong || before.congregation_id !== myCong) throw new Error("Sem permissão.");
      if (data.congregation_id && data.congregation_id !== myCong) throw new Error("Sem permissão.");
    }

    const profileUpdate: any = {};
    if (data.full_name !== undefined) profileUpdate.full_name = data.full_name;
    if (data.phone !== undefined) profileUpdate.phone = data.phone;
    if (data.congregation_id !== undefined) profileUpdate.congregation_id = data.congregation_id;
    if (Object.keys(profileUpdate).length) {
      await supabaseAdmin.from("profiles").update(profileUpdate).eq("id", data.user_id);
    }

    const roleChanged = !!data.role && !before.roles.includes(data.role);
    if (data.role) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
      await supabaseAdmin.from("user_roles").insert({
        user_id: data.user_id,
        role: data.role,
        congregation_id: data.congregation_id ?? before.congregation_id ?? null,
      });
    }

    const after = await getUserSummary(supabaseAdmin, data.user_id);
    const changes = diffFields(before, after, ["full_name", "congregation_id", "roles"]);
    if (data.phone !== undefined && (before as any)) {
      // phone is not in summary; compare directly via input intent
      const { data: p } = await supabaseAdmin
        .from("profiles").select("phone").eq("id", data.user_id).maybeSingle();
      const newPhone = p?.phone ?? null;
      // we don't have prior phone snapshot — log only the new value if changed via input
      if (data.phone !== undefined) changes.phone = { from: null, to: newPhone };
    }

    if (Object.keys(changes).length > 0) {
      await writeAudit(supabaseAdmin, {
        action: roleChanged ? "role_change" : "update",
        actorUserId: context.userId,
        targetUserId: data.user_id,
        targetEmail: after.email,
        targetName: after.full_name,
        congregationId: after.congregation_id,
        changes,
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
    const target = await getUserSummary(supabaseAdmin, data.user_id);
    if (!sede) {
      if (!myCong || target.congregation_id !== myCong) throw new Error("Sem permissão.");
    }
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, { password: data.password });
    if (error) throw new Error(error.message);

    await writeAudit(supabaseAdmin, {
      action: "password_reset",
      actorUserId: context.userId,
      targetUserId: data.user_id,
      targetEmail: target.email,
      targetName: target.full_name,
      congregationId: target.congregation_id,
      changes: { password: { from: "***", to: "***" } },
    });
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
    const target = await getUserSummary(supabaseAdmin, data.user_id);
    if (!sede) {
      if (!myCong || target.congregation_id !== myCong) throw new Error("Sem permissão.");
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);

    await writeAudit(supabaseAdmin, {
      action: "delete",
      actorUserId: context.userId,
      targetUserId: data.user_id,
      targetEmail: target.email,
      targetName: target.full_name,
      congregationId: target.congregation_id,
      changes: {
        full_name: { from: target.full_name, to: null },
        email: { from: target.email, to: null },
        roles: { from: target.roles, to: [] },
      },
    });
    return { ok: true };
  });

export const setUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    user_id: z.string().uuid(),
    active: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.user_id === context.userId) throw new Error("Você não pode inativar seu próprio usuário.");
    const sede = await isSedeAdmin(context.supabase, context.userId);
    const myCong = await getUserCongregation(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const target = await getUserSummary(supabaseAdmin, data.user_id);
    if (!sede) {
      if (!myCong || target.congregation_id !== myCong) throw new Error("Sem permissão.");
    }

    const { error: pErr } = await supabaseAdmin
      .from("profiles")
      .update({ active: data.active })
      .eq("id", data.user_id);
    if (pErr) throw new Error(pErr.message);

    // Bloqueia/desbloqueia login via auth
    const { error: aErr } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      ban_duration: data.active ? "none" : "876000h",
    } as any);
    if (aErr) throw new Error(aErr.message);

    await writeAudit(supabaseAdmin, {
      action: "update",
      actorUserId: context.userId,
      targetUserId: data.user_id,
      targetEmail: target.email,
      targetName: target.full_name,
      congregationId: target.congregation_id,
      changes: { active: { from: !data.active, to: data.active } },
    });
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

export const listUserAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    target_user_id: z.string().uuid().optional(),
    action: z.string().optional(),
    limit: z.number().int().min(1).max(500).optional(),
  }).optional().parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const sede = await isSedeAdmin(context.supabase, context.userId);
    const myCong = await getUserCongregation(context.supabase, context.userId);

    let q = context.supabase
      .from("user_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data?.limit ?? 200);

    if (!sede) {
      if (!myCong) return [];
      q = q.eq("congregation_id", myCong);
    }
    if (data?.target_user_id) q = q.eq("target_user_id", data.target_user_id);
    if (data?.action) q = q.eq("action", data.action);

    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });
