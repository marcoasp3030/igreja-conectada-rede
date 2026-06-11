import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";

async function loadOpenAIKey(): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("system_settings")
    .select("value")
    .eq("key", "openai_api_key")
    .maybeSingle();
  if (error) throw new Error("Falha ao ler configuração da OpenAI.");
  const key = data?.value;
  if (!key) {
    throw new Error(
      "Chave da OpenAI não configurada. Peça a um administrador da sede para cadastrá-la em Configurações.",
    );
  }
  return key;
}

async function callOpenAI(opts: {
  system?: string;
  prompt: string;
  model?: string;
  temperature?: number;
  json?: boolean;
}): Promise<string> {
  const key = await loadOpenAIKey();
  const messages: Array<{ role: string; content: string }> = [];
  if (opts.system) messages.push({ role: "system", content: opts.system });
  messages.push({ role: "user", content: opts.prompt });

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: opts.model ?? DEFAULT_MODEL,
      messages,
      temperature: opts.temperature ?? 0.7,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 401) {
      throw new Error("Chave da OpenAI inválida. Verifique em Configurações.");
    }
    if (res.status === 429) {
      throw new Error("Limite de requisições da OpenAI atingido. Tente novamente em instantes.");
    }
    if (res.status === 402) {
      throw new Error("Créditos da OpenAI esgotados. Adicione saldo na sua conta OpenAI.");
    }
    throw new Error(`Erro da OpenAI (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Resposta vazia da OpenAI.");
  return content;
}

/** Genérico: gera texto livre a partir de um prompt. */
export const generateAIContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { prompt: string; system?: string; model?: string }) =>
    z
      .object({
        prompt: z.string().trim().min(3, "Prompt muito curto").max(4000),
        system: z.string().trim().max(2000).optional(),
        model: z.string().trim().max(80).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const text = await callOpenAI({
      system: data.system,
      prompt: data.prompt,
      model: data.model,
    });
    return { text };
  });

/** Gera um aviso/anúncio para publicar na igreja. */
export const gerarAviso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tema: string; tom?: "formal" | "amigavel" | "urgente" }) =>
    z
      .object({
        tema: z.string().trim().min(3, "Informe o tema do aviso").max(500),
        tom: z.enum(["formal", "amigavel", "urgente"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const tom = data.tom ?? "amigavel";
    const system = `Você é assistente de comunicação de uma igreja Assembleia de Deus. \
Gere avisos curtos, claros e respeitosos em português do Brasil. \
Tom: ${tom}. \
Responda APENAS em JSON válido com as chaves: "title" (até 80 caracteres) e "body" (até 400 caracteres, sem markdown).`;
    const raw = await callOpenAI({
      system,
      prompt: `Tema: ${data.tema}`,
      json: true,
      temperature: 0.8,
    });
    try {
      const parsed = JSON.parse(raw) as { title?: string; body?: string };
      return {
        title: (parsed.title ?? "").trim(),
        body: (parsed.body ?? "").trim(),
      };
    } catch {
      return { title: "", body: raw };
    }
  });

/** Gera uma descrição para um departamento da igreja. */
export const gerarDescricaoDepartamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { nome: string; publicoAlvo?: string }) =>
    z
      .object({
        nome: z.string().trim().min(2).max(120),
        publicoAlvo: z.string().trim().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const system =
      "Você escreve descrições curtas (2 a 3 frases) e inspiradoras para departamentos de uma igreja Assembleia de Deus, em português do Brasil. Não use markdown nem emojis.";
    const prompt = `Departamento: ${data.nome}${
      data.publicoAlvo ? `\nPúblico-alvo: ${data.publicoAlvo}` : ""
    }`;
    const text = await callOpenAI({ system, prompt, temperature: 0.7 });
    return { description: text };
  });
