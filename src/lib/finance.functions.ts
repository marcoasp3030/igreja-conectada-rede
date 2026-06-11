import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function isSedeAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).some((r: any) => r.role === "admin_sede");
}

async function getRolesForCongregation(supabase: any, userId: string, congregationId: string | null) {
  const q = supabase.from("user_roles").select("role,congregation_id").eq("user_id", userId);
  const { data } = await q;
  return (data ?? []).filter((r: any) => r.congregation_id === congregationId || r.role === "admin_sede").map((r: any) => r.role as string);
}

async function getUserCongregation(supabase: any, userId: string) {
  const { data } = await supabase.from("profiles").select("congregation_id").eq("id", userId).maybeSingle();
  return (data?.congregation_id as string | null) ?? null;
}

async function canApprove(supabase: any, userId: string, congregationId: string) {
  if (await isSedeAdmin(supabase, userId)) return true;
  const roles = await getRolesForCongregation(supabase, userId, congregationId);
  return roles.some((r: string) => r === "admin_congregacao" || r === "tesoureiro");
}

// ============ Categorias ============
export const listCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tipo?: "entrada" | "saida" } | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("finance_categories").select("*").eq("ativo", true).order("nome");
    if (data.tipo) q = q.eq("tipo", data.tipo);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

const categorySchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(1),
  slug: z.string().min(1),
  tipo: z.enum(["entrada", "saida"]),
  cor: z.string().default("#6366f1"),
  congregation_id: z.string().nullable().optional(),
  ativo: z.boolean().default(true),
});

export const upsertCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => categorySchema.parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    if (id) {
      const { data: row, error } = await context.supabase.from("finance_categories").update(rest).eq("id", id).select().single();
      if (error) throw error;
      return row;
    }
    const { data: row, error } = await context.supabase.from("finance_categories").insert(rest).select().single();
    if (error) throw error;
    return row;
  });

// ============ Transações ============
const transactionSchema = z.object({
  id: z.string().optional(),
  congregation_id: z.string(),
  category_id: z.string(),
  tipo: z.enum(["entrada", "saida"]),
  valor: z.number().min(0),
  data: z.string(),
  forma_pagamento: z.enum(["dinheiro", "pix", "cartao", "transferencia", "outros"]),
  event_id: z.string().nullable().optional(),
  member_id: z.string().nullable().optional(),
  contribuinte_nome: z.string().nullable().optional(),
  anonimo: z.boolean().default(false),
  descricao: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
  comprovante_url: z.string().nullable().optional(),
});

export const listTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    congregation_id?: string;
    data_inicio?: string;
    data_fim?: string;
    tipo?: "entrada" | "saida";
    category_id?: string;
    status?: "pendente" | "aprovado" | "rejeitado";
    forma_pagamento?: string;
    limit?: number;
  } | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("finance_transactions")
      .select("*, finance_categories(nome,cor,slug), congregations(name), members(full_name), events(title)")
      .order("data", { ascending: false })
      .order("created_at", { ascending: false });
    if (data.congregation_id) q = q.eq("congregation_id", data.congregation_id);
    if (data.data_inicio) q = q.gte("data", data.data_inicio);
    if (data.data_fim) q = q.lte("data", data.data_fim);
    if (data.tipo) q = q.eq("tipo", data.tipo);
    if (data.category_id) q = q.eq("category_id", data.category_id);
    if (data.status) q = q.eq("status", data.status);
    if (data.forma_pagamento) q = q.eq("forma_pagamento", data.forma_pagamento as any);
    if (data.limit) q = q.limit(data.limit);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const createTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => transactionSchema.parse(d))
  .handler(async ({ data, context }) => {
    const approver = await canApprove(context.supabase, context.userId, data.congregation_id);
    const status = approver ? "aprovado" : "pendente";
    const payload: any = {
      ...data,
      created_by: context.userId,
      status,
      approved_by: approver ? context.userId : null,
      approved_at: approver ? new Date().toISOString() : null,
    };
    delete payload.id;
    const { data: row, error } = await context.supabase.from("finance_transactions").insert(payload).select().single();
    if (error) throw error;
    return row;
  });

export const updateTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => transactionSchema.parse(d))
  .handler(async ({ data, context }) => {
    if (!data.id) throw new Error("ID obrigatório");
    const { id, ...rest } = data;
    const { data: row, error } = await context.supabase
      .from("finance_transactions").update(rest).eq("id", id).select().single();
    if (error) throw error;
    return row;
  });

export const deleteTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("finance_transactions").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const approveTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("finance_transactions")
      .update({ status: "aprovado", approved_by: context.userId, approved_at: new Date().toISOString(), rejected_reason: null })
      .eq("id", data.id).select().single();
    if (error) throw error;
    return row;
  });

export const rejectTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; motivo: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("finance_transactions")
      .update({ status: "rejeitado", rejected_reason: data.motivo, approved_by: context.userId, approved_at: new Date().toISOString() })
      .eq("id", data.id).select().single();
    if (error) throw error;
    return row;
  });

// ============ Dashboard ============
export const getDashboardSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { congregation_id?: string; mes: number; ano: number }) => d)
  .handler(async ({ data, context }) => {
    const inicio = new Date(data.ano, data.mes - 1, 1);
    const fim = new Date(data.ano, data.mes, 0);
    const prevInicio = new Date(data.ano, data.mes - 2, 1);
    const prevFim = new Date(data.ano, data.mes - 1, 0);

    const sede = await isSedeAdmin(context.supabase, context.userId);
    const cong = data.congregation_id ?? (sede ? null : await getUserCongregation(context.supabase, context.userId));

    const buildQuery = (di: Date, df: Date) => {
      let q = context.supabase
        .from("finance_transactions")
        .select("tipo,valor,category_id,forma_pagamento,data,finance_categories(nome,cor)")
        .gte("data", di.toISOString().slice(0, 10))
        .lte("data", df.toISOString().slice(0, 10))
        .eq("status", "aprovado");
      if (cong) q = q.eq("congregation_id", cong);
      return q;
    };

    const [{ data: atual }, { data: anterior }] = await Promise.all([
      buildQuery(inicio, fim),
      buildQuery(prevInicio, prevFim),
    ]);

    const rows = atual ?? [];
    const totalEntradas = rows.filter((r: any) => r.tipo === "entrada").reduce((s: number, r: any) => s + Number(r.valor), 0);
    const totalSaidas = rows.filter((r: any) => r.tipo === "saida").reduce((s: number, r: any) => s + Number(r.valor), 0);
    const totalAnterior = (anterior ?? []).filter((r: any) => r.tipo === "entrada").reduce((s: number, r: any) => s + Number(r.valor), 0);

    const porCategoria = new Map<string, { nome: string; cor: string; total: number; tipo: string }>();
    for (const r of rows as any[]) {
      const k = r.category_id;
      const cur = porCategoria.get(k) ?? { nome: r.finance_categories?.nome ?? "Sem categoria", cor: r.finance_categories?.cor ?? "#888", total: 0, tipo: r.tipo };
      cur.total += Number(r.valor);
      porCategoria.set(k, cur);
    }

    const porPagamento = new Map<string, number>();
    for (const r of rows as any[]) {
      porPagamento.set(r.forma_pagamento, (porPagamento.get(r.forma_pagamento) ?? 0) + Number(r.valor));
    }

    const porDia = new Map<string, { data: string; entrada: number; saida: number }>();
    for (const r of rows as any[]) {
      const cur = porDia.get(r.data) ?? { data: r.data, entrada: 0, saida: 0 };
      if (r.tipo === "entrada") cur.entrada += Number(r.valor);
      else cur.saida += Number(r.valor);
      porDia.set(r.data, cur);
    }

    return {
      totalEntradas,
      totalSaidas,
      saldo: totalEntradas - totalSaidas,
      totalAnterior,
      variacao: totalAnterior > 0 ? ((totalEntradas - totalAnterior) / totalAnterior) * 100 : 0,
      porCategoria: Array.from(porCategoria.values()).sort((a, b) => b.total - a.total),
      porPagamento: Array.from(porPagamento.entries()).map(([k, v]) => ({ forma: k, total: v })),
      porDia: Array.from(porDia.values()).sort((a, b) => a.data.localeCompare(b.data)),
      congregationId: cong,
      isSede: sede,
    };
  });

export const getSedeOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { mes: number; ano: number }) => d)
  .handler(async ({ data, context }) => {
    const sede = await isSedeAdmin(context.supabase, context.userId);
    if (!sede) throw new Error("Acesso restrito à sede");
    const inicio = new Date(data.ano, data.mes - 1, 1).toISOString().slice(0, 10);
    const fim = new Date(data.ano, data.mes, 0).toISOString().slice(0, 10);
    const { data: rows, error } = await context.supabase
      .from("finance_transactions")
      .select("congregation_id,tipo,valor,congregations(name,is_headquarters)")
      .gte("data", inicio).lte("data", fim).eq("status", "aprovado");
    if (error) throw error;
    const map = new Map<string, { id: string; nome: string; sede: boolean; entradas: number; saidas: number }>();
    for (const r of (rows ?? []) as any[]) {
      const cur = map.get(r.congregation_id) ?? {
        id: r.congregation_id,
        nome: r.congregations?.name ?? "—",
        sede: !!r.congregations?.is_headquarters,
        entradas: 0, saidas: 0,
      };
      if (r.tipo === "entrada") cur.entradas += Number(r.valor);
      else cur.saidas += Number(r.valor);
      map.set(r.congregation_id, cur);
    }
    return Array.from(map.values()).map((x) => ({ ...x, saldo: x.entradas - x.saidas })).sort((a, b) => b.entradas - a.entradas);
  });

export const getMyContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sede = await isSedeAdmin(context.supabase, context.userId);
    const cong = await getUserCongregation(context.supabase, context.userId);
    const { data: rolesData } = await context.supabase.from("user_roles").select("role,congregation_id").eq("user_id", context.userId);
    const roles = (rolesData ?? []) as Array<{ role: string; congregation_id: string | null }>;
    return { userId: context.userId, isSede: sede, congregationId: cong, roles };
  });

export const listCongregationsLite = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("congregations").select("id,name,is_headquarters").order("name");
    return data ?? [];
  });

export const listMembersLite = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { congregation_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("members").select("id,full_name").eq("congregation_id", data.congregation_id).order("full_name");
    return rows ?? [];
  });

// ============ Fechamentos ============
const closingSchema = z.object({
  congregation_id: z.string(),
  periodo_tipo: z.enum(["culto", "semana", "mes"]),
  event_id: z.string().nullable().optional(),
  data_inicio: z.string(),
  data_fim: z.string(),
  observacoes: z.string().nullable().optional(),
});

async function computeTotals(supabase: any, congregation_id: string, di: string, df: string) {
  const { data, error } = await supabase
    .from("finance_transactions")
    .select("tipo,valor")
    .eq("congregation_id", congregation_id)
    .eq("status", "aprovado")
    .gte("data", di).lte("data", df);
  if (error) throw error;
  const entradas = (data ?? []).filter((r: any) => r.tipo === "entrada").reduce((s: number, r: any) => s + Number(r.valor), 0);
  const saidas = (data ?? []).filter((r: any) => r.tipo === "saida").reduce((s: number, r: any) => s + Number(r.valor), 0);
  return { entradas, saidas };
}

export const listClosings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { congregation_id?: string } | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("finance_closings")
      .select("*, congregations(name), events(title)")
      .order("data_inicio", { ascending: false });
    if (data.congregation_id) q = q.eq("congregation_id", data.congregation_id);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const createClosing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => closingSchema.parse(d))
  .handler(async ({ data, context }) => {
    // Verificar sobreposição com fechamentos já consolidados
    const { data: overlap } = await context.supabase
      .from("finance_closings")
      .select("id,status,data_inicio,data_fim")
      .eq("congregation_id", data.congregation_id)
      .eq("status", "fechado")
      .lte("data_inicio", data.data_fim)
      .gte("data_fim", data.data_inicio);
    if ((overlap ?? []).length > 0) {
      throw new Error("Já existe um fechamento consolidado que cobre este período.");
    }
    const totals = await computeTotals(context.supabase, data.congregation_id, data.data_inicio, data.data_fim);
    const payload = {
      ...data,
      total_entradas: totals.entradas,
      total_saidas: totals.saidas,
      saldo: totals.entradas - totals.saidas,
      status: "aberto" as const,
      created_by: context.userId,
    };
    const { data: row, error } = await context.supabase.from("finance_closings").insert(payload).select().single();
    if (error) throw error;
    return row;
  });

export const recomputeClosing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: cur, error: e1 } = await context.supabase
      .from("finance_closings").select("*").eq("id", data.id).single();
    if (e1) throw e1;
    if (cur.status === "fechado") throw new Error("Fechamento já consolidado.");
    const totals = await computeTotals(context.supabase, cur.congregation_id, cur.data_inicio, cur.data_fim);
    const { data: row, error } = await context.supabase
      .from("finance_closings")
      .update({ total_entradas: totals.entradas, total_saidas: totals.saidas, saldo: totals.entradas - totals.saidas })
      .eq("id", data.id).select().single();
    if (error) throw error;
    return row;
  });

export const closeClosing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: cur, error: e1 } = await context.supabase
      .from("finance_closings").select("*").eq("id", data.id).single();
    if (e1) throw e1;
    if (cur.status === "fechado") return cur;
    // Bloquear se houver lançamentos pendentes
    const { data: pend } = await context.supabase
      .from("finance_transactions")
      .select("id", { count: "exact", head: true })
      .eq("congregation_id", cur.congregation_id)
      .eq("status", "pendente")
      .gte("data", cur.data_inicio).lte("data", cur.data_fim);
    if ((pend as any)?.length) throw new Error("Existem lançamentos pendentes no período. Aprove ou rejeite antes de fechar.");
    const totals = await computeTotals(context.supabase, cur.congregation_id, cur.data_inicio, cur.data_fim);
    const { data: row, error } = await context.supabase
      .from("finance_closings")
      .update({
        status: "fechado",
        closed_by: context.userId,
        closed_at: new Date().toISOString(),
        total_entradas: totals.entradas,
        total_saidas: totals.saidas,
        saldo: totals.entradas - totals.saidas,
      })
      .eq("id", data.id).select().single();
    if (error) throw error;
    return row;
  });

export const reopenClosing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const sede = await isSedeAdmin(context.supabase, context.userId);
    if (!sede) throw new Error("Apenas a sede pode reabrir fechamentos.");
    const { data: row, error } = await context.supabase
      .from("finance_closings")
      .update({ status: "aberto", closed_by: null, closed_at: null })
      .eq("id", data.id).select().single();
    if (error) throw error;
    return row;
  });

export const deleteClosing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("finance_closings").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const listEventsLite = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { congregation_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("events").select("id,title,starts_at")
      .eq("congregation_id", data.congregation_id)
      .order("starts_at", { ascending: false }).limit(100);
    return rows ?? [];
  });
