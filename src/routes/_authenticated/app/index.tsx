import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/page-header";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  Church,
  HeartHandshake,
  BookOpen,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  MapPin,
  Trophy,
  Activity,
  Cake,
  CalendarCheck,
  LineChart as LineChartIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Dashboard,
});

const STOCK_THRESHOLD = 5;
const LOW_EBD_PCT = 50;

function startOfMonth(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function monthKey(d: Date | string) {
  const x = typeof d === "string" ? new Date(d) : d;
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-");
  const names = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${names[Number(m) - 1]}/${y.slice(2)}`;
}

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-sede-v3"],
    queryFn: async () => {
      const monthStart = startOfMonth(0).toISOString();
      const prevMonthStart = startOfMonth(-1).toISOString();
      const sixMonthsAgo = startOfMonth(-5).toISOString().slice(0, 10);
      const threeMonthsAgo = startOfMonth(-2).toISOString().slice(0, 10);

      const [
        congs,
        members,
        membersThisMonth,
        membersLastMonth,
        familias,
        entregas6m,
        doacoes6m,
        estoque,
        sessions6m,
        records,
        assignments,
      ] = await Promise.all([
        supabase.from("congregations").select("id, name, is_headquarters, city, latitude, longitude, lead_pastor"),
        supabase.from("members").select("id, congregation_id, active, created_at, full_name, birth_date, phone"),
        supabase.from("members").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
        supabase.from("members").select("id", { count: "exact", head: true }).gte("created_at", prevMonthStart).lt("created_at", monthStart),
        supabase.from("mao_amiga_familias").select("id, congregation_id, ativo, created_at"),
        supabase.from("mao_amiga_entregas").select("id, congregation_id, data_entrega").gte("data_entrega", sixMonthsAgo),
        supabase.from("mao_amiga_doacoes").select("congregation_id, valor_dinheiro, quantidade, data_doacao").gte("data_doacao", sixMonthsAgo),
        supabase.from("mao_amiga_estoque").select("id, congregation_id, descricao, unidade, quantidade, categoria_id, mao_amiga_categorias(nome)"),
        supabase.from("ebd_attendance_sessions").select("id, class_id, lesson_date, ebd_classes(congregation_id)").gte("lesson_date", sixMonthsAgo),
        supabase.from("ebd_attendance_records").select("session_id, present"),
        supabase.from("schedule_assignments").select("status, volunteer_id, created_at"),
      ]);

      return {
        congs: congs.data ?? [],
        members: members.data ?? [],
        newThisMonth: membersThisMonth.count ?? 0,
        newLastMonth: membersLastMonth.count ?? 0,
        familias: familias.data ?? [],
        entregas6m: entregas6m.data ?? [],
        doacoes6m: doacoes6m.data ?? [],
        estoque: (estoque.data ?? []) as Array<{ id: string; congregation_id: string; descricao: string; unidade: string; quantidade: number; mao_amiga_categorias: { nome: string } | null }>,
        sessions6m: (sessions6m.data ?? []) as Array<{ id: string; lesson_date: string; ebd_classes: { congregation_id: string } | null }>,
        records: records.data ?? [],
        assignments: assignments.data ?? [],
        threeMonthsAgo,
      };
    },
  });

  if (isLoading || !data) {
    return (
      <div>
        <PageHeader title="Painel da Sede" description="Carregando indicadores…" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="h-28 animate-pulse bg-muted/30" />
          ))}
        </div>
      </div>
    );
  }

  // KPIs
  const totalMembers = data.members.filter((m) => m.active).length;
  const totalCongs = data.congs.length;
  const familiasAtivas = data.familias.filter((f) => f.ativo).length;
  const totalArrecadado6m = data.doacoes6m.reduce((acc, d) => acc + Number(d.valor_dinheiro ?? 0), 0);
  const entregasMes = data.entregas6m.filter((e) => e.data_entrega >= startOfMonth(0).toISOString().slice(0, 10)).length;
  const growthDelta = data.newThisMonth - data.newLastMonth;
  const growthPct =
    data.newLastMonth > 0
      ? Math.round(((data.newThisMonth - data.newLastMonth) / data.newLastMonth) * 100)
      : data.newThisMonth > 0
      ? 100
      : 0;

  // Members per congregation
  const membersByCong = new Map<string, number>();
  for (const m of data.members) if (m.active) membersByCong.set(m.congregation_id, (membersByCong.get(m.congregation_id) ?? 0) + 1);
  const maxMembers = Math.max(1, ...Array.from(membersByCong.values()));

  const sessionMeta = new Map<string, { cong: string; date: string }>();
  for (const s of data.sessions6m) if (s.ebd_classes) sessionMeta.set(s.id, { cong: s.ebd_classes.congregation_id, date: s.lesson_date });

  // EBD attendance % per congregation (last 3 months)
  const ebdByCong = new Map<string, { present: number; total: number }>();
  for (const r of data.records) {
    const meta = sessionMeta.get(r.session_id);
    if (!meta) continue;
    if (meta.date < data.threeMonthsAgo) continue;
    const cur = ebdByCong.get(meta.cong) ?? { present: 0, total: 0 };
    cur.total += 1;
    if (r.present) cur.present += 1;
    ebdByCong.set(meta.cong, cur);
  }

  // Mão Amiga monthly activity per congregation
  const maoAmigaActivity = new Map<string, number>();
  const currentMonth = startOfMonth(0).toISOString().slice(0, 10);
  for (const e of data.entregas6m) if (e.data_entrega >= currentMonth) maoAmigaActivity.set(e.congregation_id, (maoAmigaActivity.get(e.congregation_id) ?? 0) + 1);
  for (const d of data.doacoes6m) if (d.data_doacao >= currentMonth) maoAmigaActivity.set(d.congregation_id, (maoAmigaActivity.get(d.congregation_id) ?? 0) + 1);

  // Health Score
  const ranking = data.congs
    .map((c) => {
      const m = membersByCong.get(c.id) ?? 0;
      const ebd = ebdByCong.get(c.id);
      const ebdPct = ebd && ebd.total > 0 ? Math.round((ebd.present / ebd.total) * 100) : 0;
      const maActivity = maoAmigaActivity.get(c.id) ?? 0;

      const memberScore = Math.round((m / maxMembers) * 40);
      const ebdScore = Math.round((ebdPct / 100) * 30);
      const maScore = maActivity > 0 ? Math.min(20, 10 + maActivity * 2) : 0;
      const baseScore = m > 0 ? 10 : 0;
      const health = Math.min(100, memberScore + ebdScore + maScore + baseScore);

      return { ...c, members: m, ebdPct, maActivity, health };
    })
    .sort((a, b) => b.health - a.health);

  // Critical stock
  const stockCritical = data.estoque
    .filter((e) => Number(e.quantidade) <= STOCK_THRESHOLD)
    .sort((a, b) => Number(a.quantidade) - Number(b.quantidade));
  const congsWithCriticalStock = new Set(stockCritical.map((s) => s.congregation_id)).size;

  const congNameById = new Map(data.congs.map((c) => [c.id, c.name]));
  const chartData = ranking.slice(0, 8).map((c) => ({ name: c.name.length > 14 ? c.name.slice(0, 12) + "…" : c.name, membros: c.members }));

  const healthBadgeVariant = (h: number) => (h >= 75 ? "default" : h >= 50 ? "secondary" : "destructive");
  const healthLabel = (h: number) => (h >= 75 ? "Saudável" : h >= 50 ? "Atenção" : "Crítico");
  const congsWithGeo = data.congs.filter((c) => c.latitude && c.longitude);

  // === FASE 2 ===
  // 6-month month keys (oldest -> newest)
  const monthKeys: string[] = [];
  for (let i = 5; i >= 0; i--) monthKeys.push(monthKey(startOfMonth(-i)));

  // Growth: cumulative active members per month (total Setor 70)
  const growthSeries = monthKeys.map((mk) => {
    const endOfMonth = new Date(Number(mk.split("-")[0]), Number(mk.split("-")[1]), 1);
    const count = data.members.filter((m) => m.active && new Date(m.created_at) < endOfMonth).length;
    return { month: monthLabel(mk), membros: count };
  });

  // EBD trend (6 months) — overall % per month
  const ebdMonth = new Map<string, { present: number; total: number }>();
  for (const r of data.records) {
    const meta = sessionMeta.get(r.session_id);
    if (!meta) continue;
    const mk = monthKey(meta.date);
    if (!monthKeys.includes(mk)) continue;
    const cur = ebdMonth.get(mk) ?? { present: 0, total: 0 };
    cur.total += 1;
    if (r.present) cur.present += 1;
    ebdMonth.set(mk, cur);
  }
  const ebdTrend = monthKeys.map((mk) => {
    const v = ebdMonth.get(mk);
    return { month: monthLabel(mk), frequencia: v && v.total > 0 ? Math.round((v.present / v.total) * 100) : 0 };
  });

  // Mão Amiga trend (6 months): entregas + famílias atendidas únicas / mês
  const maTrend = monthKeys.map((mk) => {
    const entregas = data.entregas6m.filter((e) => monthKey(e.data_entrega) === mk).length;
    const valor = data.doacoes6m
      .filter((d) => monthKey(d.data_doacao) === mk)
      .reduce((acc, d) => acc + Number(d.valor_dinheiro ?? 0), 0);
    return { month: monthLabel(mk), entregas, valor: Math.round(valor) };
  });

  // Schedule coverage by congregation (proxy: % approved/total assignments + unique volunteers)
  // assignments table has no congregation_id → aggregate global
  const totalAssign = data.assignments.length;
  const aprovados = data.assignments.filter((a) => a.status === "aprovado").length;
  const pendentes = data.assignments.filter((a) => a.status === "pendente").length;
  const recusados = data.assignments.filter((a) => a.status === "recusado").length;
  const voluntariosUnicos = new Set(data.assignments.map((a) => a.volunteer_id)).size;
  const coberturaPct = totalAssign > 0 ? Math.round((aprovados / totalAssign) * 100) : 0;

  // Aniversariantes do mês (todas as congregações)
  const currentMonthNum = new Date().getMonth() + 1;
  const aniversariantes = data.members
    .filter((m) => m.active && m.birth_date && new Date(m.birth_date + "T00:00:00").getMonth() + 1 === currentMonthNum)
    .map((m) => ({
      id: m.id,
      name: m.full_name,
      phone: m.phone,
      cong: congNameById.get(m.congregation_id) ?? "—",
      day: new Date(m.birth_date! + "T00:00:00").getDate(),
    }))
    .sort((a, b) => a.day - b.day);

  // Alertas EBD baixa frequência (últimos 3 meses < LOW_EBD_PCT)
  const alertasEBD = ranking
    .filter((c) => {
      const v = ebdByCong.get(c.id);
      return v && v.total >= 4 && (v.present / v.total) * 100 < LOW_EBD_PCT;
    })
    .map((c) => ({ id: c.id, name: c.name, pct: c.ebdPct }));

  const kpis = [
    { label: "Congregações", value: totalCongs, icon: Church, hint: `${congsWithGeo.length} com localização` },
    { label: "Membros ativos", value: totalMembers, icon: Users, hint: `${data.members.length} totais` },
    {
      label: "Novos no mês",
      value: data.newThisMonth,
      icon: growthDelta >= 0 ? TrendingUp : TrendingDown,
      hint: `${growthPct >= 0 ? "+" : ""}${growthPct}% vs. mês anterior`,
      trendUp: growthDelta >= 0,
    },
    {
      label: "Mão Amiga (mês)",
      value: entregasMes,
      icon: HeartHandshake,
      hint: `${familiasAtivas} famílias · R$ ${totalArrecadado6m.toLocaleString("pt-BR")} (6m)`,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Painel da Sede" description="Visão executiva consolidada de todas as congregações do Setor 70." />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="shadow-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{k.label}</p>
                <k.icon className={`h-4 w-4 ${k.trendUp === false ? "text-destructive" : "text-primary"}`} />
              </div>
              <p className="mt-2 text-3xl font-bold">{k.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{k.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alertas */}
      {(stockCritical.length > 0 || alertasEBD.length > 0) && (
        <div className="grid gap-3 md:grid-cols-2">
          {stockCritical.length > 0 && (
            <Card className="border-destructive/40 bg-destructive/5 shadow-card">
              <CardContent className="flex items-center gap-3 p-4">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">
                    {stockCritical.length} item(ns) em estoque crítico em {congsWithCriticalStock} congregação(ões)
                  </p>
                  <p className="text-xs text-muted-foreground">Saldo ≤ {STOCK_THRESHOLD} no Mão Amiga.</p>
                </div>
                <Link to="/app/mao-amiga" className="text-xs font-semibold text-destructive hover:underline">
                  Ver →
                </Link>
              </CardContent>
            </Card>
          )}
          {alertasEBD.length > 0 && (
            <Card className="border-amber-500/40 bg-amber-500/5 shadow-card">
              <CardContent className="flex items-center gap-3 p-4">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">
                    {alertasEBD.length} congregação(ões) com frequência EBD &lt; {LOW_EBD_PCT}% (3m)
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {alertasEBD.slice(0, 3).map((a) => `${a.name} (${a.pct}%)`).join(" · ")}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Ranking + Health Score */}
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-gold" /> Ranking · Índice de Saúde
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ranking.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma congregação cadastrada.</p>
            ) : (
              <div className="space-y-3">
                {ranking.map((c, i) => (
                  <div key={c.id} className="rounded-lg border bg-card/40 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold">
                          {i + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{c.name}</p>
                            {c.is_headquarters && (
                              <Badge variant="outline" className="border-gold/40 text-gold">
                                Sede
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {c.members} membros · EBD {c.ebdPct}% · {c.maActivity} ações Mão Amiga
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">{c.health}</span>
                        <Badge variant={healthBadgeVariant(c.health)}>{healthLabel(c.health)}</Badge>
                      </div>
                    </div>
                    <Progress value={c.health} className="mt-2 h-1.5" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top membros */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Top congregações (membros)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" fontSize={10} />
                  <YAxis dataKey="name" type="category" fontSize={11} width={90} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  <Bar dataKey="membros" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* FASE 2 — Crescimento 6m */}
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChartIcon className="h-4 w-4 text-primary" /> Crescimento de membros (6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={growthSeries} margin={{ left: 0, right: 12, top: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Line type="monotone" dataKey="membros" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* FASE 2 — EBD trend */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" /> Frequência EBD (6m)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={ebdTrend} margin={{ left: 0, right: 12, top: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} domain={[0, 100]} unit="%" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Line type="monotone" dataKey="frequencia" stroke="hsl(var(--gold, var(--primary)))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* FASE 2 — Mão Amiga trend */}
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HeartHandshake className="h-4 w-4 text-primary" /> Mão Amiga · Tendência (6m)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={maTrend} margin={{ left: 0, right: 12, top: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis yAxisId="l" fontSize={11} />
                <YAxis yAxisId="r" orientation="right" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line yAxisId="l" type="monotone" dataKey="entregas" name="Entregas" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="r" type="monotone" dataKey="valor" name="R$ arrecadado" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* FASE 2 — Escalas */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-primary" /> Escalas · Cobertura
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">Aprovação geral</span>
                <span className="text-muted-foreground">{coberturaPct}%</span>
              </div>
              <Progress value={coberturaPct} className="mt-1 h-1.5" />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md border bg-card/40 p-2">
                <p className="text-lg font-bold text-emerald-500">{aprovados}</p>
                <p className="text-[10px] uppercase text-muted-foreground">Aprov.</p>
              </div>
              <div className="rounded-md border bg-card/40 p-2">
                <p className="text-lg font-bold text-amber-500">{pendentes}</p>
                <p className="text-[10px] uppercase text-muted-foreground">Pend.</p>
              </div>
              <div className="rounded-md border bg-card/40 p-2">
                <p className="text-lg font-bold text-destructive">{recusados}</p>
                <p className="text-[10px] uppercase text-muted-foreground">Recus.</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{voluntariosUnicos}</span> voluntários únicos escalados
            </p>
          </CardContent>
        </Card>

        {/* FASE 2 — Aniversariantes */}
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cake className="h-4 w-4 text-pink-500" /> Aniversariantes do mês
              <Badge variant="secondary" className="ml-2">{aniversariantes.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {aniversariantes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum aniversariante este mês.</p>
            ) : (
              <div className="max-h-72 overflow-y-auto">
                <ul className="divide-y">
                  {aniversariantes.map((a) => (
                    <li key={a.id} className="flex items-center justify-between py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{a.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{a.cong}{a.phone ? ` · ${a.phone}` : ""}</p>
                      </div>
                      <Badge variant="outline" className="border-pink-500/40 text-pink-500">Dia {a.day}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Estoque crítico */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Estoque Crítico
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stockCritical.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum item em estado crítico. ✅</p>
            ) : (
              <ul className="divide-y">
                {stockCritical.slice(0, 6).map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{s.descricao}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {congNameById.get(s.congregation_id) ?? "—"}
                      </p>
                    </div>
                    <Badge variant="destructive">
                      {Number(s.quantidade)} {s.unidade}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Geográfico */}
        <Card className="lg:col-span-3 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> Distribuição Geográfica
            </CardTitle>
          </CardHeader>
          <CardContent>
            {congsWithGeo.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma congregação possui coordenadas cadastradas. Edite cada congregação para adicionar latitude/longitude.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {congsWithGeo.map((c) => (
                  <a
                    key={c.id}
                    href={`https://www.google.com/maps/search/?api=1&query=${c.latitude},${c.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="group rounded-lg border bg-card/40 p-3 transition hover:border-primary/50 hover:bg-card"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{c.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{c.city ?? "—"}</p>
                        {c.lead_pastor && <p className="mt-1 truncate text-[11px] text-muted-foreground">Pr. {c.lead_pastor}</p>}
                      </div>
                      <Activity className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
                    </div>
                    <p className="mt-2 text-[10px] text-muted-foreground">
                      {Number(c.latitude).toFixed(4)}, {Number(c.longitude).toFixed(4)}
                    </p>
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
