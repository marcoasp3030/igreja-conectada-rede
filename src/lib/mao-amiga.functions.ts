import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function isSedeAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).some((r: any) => r.role === "admin_sede");
}

async function getUserCongregation(supabase: any, userId: string) {
  const { data } = await supabase.from("profiles").select("congregation_id").eq("id", userId).single();
  return data?.congregation_id as string | null;
}

// Schemas
const doadorSchema = z.object({
  id: z.string().optional(),
  congregation_id: z.string(),
  member_id: z.string().nullable().optional(),
  nome: z.string().min(1),
  telefone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  observacoes: z.string().nullable().optional(),
});

const doacaoSchema = z.object({
  congregation_id: z.string(),
  doador_id: z.string(),
  categoria_id: z.string(),
  descricao: z.string().min(1),
  quantidade: z.number().min(0.01),
  unidade: z.string().default("un"),
  valor_dinheiro: z.number().nullable().optional(),
  data_doacao: z.string(),
  observacoes: z.string().nullable().optional(),
});

const familiaSchema = z.object({
  id: z.string().optional(),
  congregation_id: z.string(),
  nome_responsavel: z.string().min(1),
  telefone: z.string().nullable().optional(),
  endereco: z.string().nullable().optional(),
  qtd_pessoas: z.number().int().min(1),
  necessidade_principal: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
  ativo: z.boolean().default(true),
});

const entregaSchema = z.object({
  congregation_id: z.string(),
  familia_id: z.string(),
  categoria_id: z.string(),
  descricao: z.string().min(1),
  quantidade: z.number().min(0.01),
  data_entrega: z.string(),
  observacoes: z.string().nullable().optional(),
});

const campanhaSchema = z.object({
  id: z.string().optional(),
  congregation_id: z.string(),
  titulo: z.string().min(1),
  descricao: z.string().nullable().optional(),
  meta: z.string().nullable().optional(),
  starts_at: z.string().nullable().optional(),
  ends_at: z.string().nullable().optional(),
  tipo: z.enum(["arrecadacao", "mutirao", "acao_social"]),
  status: z.enum(["planejado", "ativo", "concluido", "cancelado"]).default("planejado"),
});

const avisoSchema = z.object({
  id: z.string().optional(),
  congregation_id: z.string(),
  titulo: z.string().min(1),
  mensagem: z.string().min(1),
  urgente: z.boolean().default(false),
  campanha_id: z.string().nullable().optional(),
  expires_at: z.string().nullable().optional(),
});

// Functions
export const listCategorias = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("mao_amiga_categorias")
      .select("*")
      .order("nome");
    if (error) throw error;
    return data;
  });

export const listDoadores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const isSede = await isSedeAdmin(context.supabase, context.userId);
    const congregation_id = await getUserCongregation(context.supabase, context.userId);

    let query = context.supabase
      .from("mao_amiga_doadores")
      .select("*")
      .order("nome");

    if (!isSede && congregation_id) {
      query = query.eq("congregation_id", congregation_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  });

export const createDoador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => doadorSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: res, error } = await context.supabase
      .from("mao_amiga_doadores")
      .insert([data])
      .select()
      .single();
    if (error) throw error;
    return res;
  });

export const listDoacoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const isSede = await isSedeAdmin(context.supabase, context.userId);
    const congregation_id = await getUserCongregation(context.supabase, context.userId);

    let query = context.supabase
      .from("mao_amiga_doacoes")
      .select("*, mao_amiga_doadores(nome), mao_amiga_categorias(nome)")
      .order("data_doacao", { ascending: false });

    if (!isSede && congregation_id) {
      query = query.eq("congregation_id", congregation_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  });

export const createDoacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => doacaoSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: res, error } = await context.supabase
      .from("mao_amiga_doacoes")
      .insert([{ ...data, created_by: context.userId }])
      .select()
      .single();
    if (error) throw error;
    return res;
  });

export const listEstoque = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const isSede = await isSedeAdmin(context.supabase, context.userId);
    const congregation_id = await getUserCongregation(context.supabase, context.userId);

    let query = context.supabase
      .from("mao_amiga_estoque")
      .select("*, mao_amiga_categorias(nome)")
      .order("descricao");

    if (!isSede && congregation_id) {
      query = query.eq("congregation_id", congregation_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  });

export const listFamilias = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const isSede = await isSedeAdmin(context.supabase, context.userId);
    const congregation_id = await getUserCongregation(context.supabase, context.userId);

    let query = context.supabase
      .from("mao_amiga_familias")
      .select("*")
      .order("nome_responsavel");

    if (!isSede && congregation_id) {
      query = query.eq("congregation_id", congregation_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  });

export const createFamilia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => familiaSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: res, error } = await context.supabase
      .from("mao_amiga_familias")
      .insert([data])
      .select()
      .single();
    if (error) throw error;
    return res;
  });

export const listEntregas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const isSede = await isSedeAdmin(context.supabase, context.userId);
    const congregation_id = await getUserCongregation(context.supabase, context.userId);

    let query = context.supabase
      .from("mao_amiga_entregas")
      .select("*, mao_amiga_familias(nome_responsavel), mao_amiga_categorias(nome)")
      .order("data_entrega", { ascending: false });

    if (!isSede && congregation_id) {
      query = query.eq("congregation_id", congregation_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  });

export const createEntrega = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => entregaSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: res, error } = await context.supabase
      .from("mao_amiga_entregas")
      .insert([{ ...data, responsavel_id: context.userId }])
      .select()
      .single();
    if (error) throw error;
    return res;
  });

export const listCampanhas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const isSede = await isSedeAdmin(context.supabase, context.userId);
    const congregation_id = await getUserCongregation(context.supabase, context.userId);

    let query = context.supabase
      .from("mao_amiga_campanhas")
      .select("*")
      .order("created_at", { ascending: false });

    if (!isSede && congregation_id) {
      query = query.eq("congregation_id", congregation_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  });

export const createCampanha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => campanhaSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: res, error } = await context.supabase
      .from("mao_amiga_campanhas")
      .insert([data])
      .select()
      .single();
    if (error) throw error;
    return res;
  });

export const listAvisos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const isSede = await isSedeAdmin(context.supabase, context.userId);
    const congregation_id = await getUserCongregation(context.supabase, context.userId);

    let query = context.supabase
      .from("mao_amiga_avisos")
      .select("*")
      .order("created_at", { ascending: false });

    if (!isSede && congregation_id) {
      query = query.eq("congregation_id", congregation_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  });

export const createAviso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => avisoSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: res, error } = await context.supabase
      .from("mao_amiga_avisos")
      .insert([data])
      .select()
      .single();
    if (error) throw error;
    return res;
  });

export const getMaoAmigaStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase } = context;
    const isSede = await isSedeAdmin(supabase, userId);
    const congregation_id = await getUserCongregation(supabase, userId);
    
    if (!congregation_id && !isSede) return null;

    let queryDoacoes = supabase.from("mao_amiga_doacoes").select("id", { count: "exact" });
    let queryFamilias = supabase.from("mao_amiga_familias").select("id", { count: "exact" }).eq("ativo", true);
    let queryEntregas = supabase.from("mao_amiga_entregas").select("id", { count: "exact" });
    let queryEstoque = supabase.from("mao_amiga_estoque").select("quantidade");

    if (!isSede && congregation_id) {
      queryDoacoes = queryDoacoes.eq("congregation_id", congregation_id);
      queryFamilias = queryFamilias.eq("congregation_id", congregation_id);
      queryEntregas = queryEntregas.eq("congregation_id", congregation_id);
      queryEstoque = queryEstoque.eq("congregation_id", congregation_id);
    }

    const [doacoes, familias, entregas, estoque] = await Promise.all([
      queryDoacoes,
      queryFamilias,
      queryEntregas,
      queryEstoque,
    ]);

    return {
      totalDoacoes: doacoes.count || 0,
      totalFamilias: familias.count || 0,
      totalEntregas: entregas.count || 0,
      totalItensEstoque: estoque.data?.reduce((acc, curr) => acc + Number(curr.quantidade), 0) || 0,
    };
  });
