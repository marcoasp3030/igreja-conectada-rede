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
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Dashboard,
});

const STOCK_THRESHOLD = 5;

function startOfMonth(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-sede-v2"],
    queryFn: async () => {
      const monthStart = startOfMonth(0).toISOString();
      const prevMonthStart = startOfMonth(-1).toISOString();
      const threeMonthsAgo = startOfMonth(-3).toISOString().slice(0, 10);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

      const [
        congs,
        members,
        membersThisMonth,
        membersLastMonth,
        familias,
        entregasMonth,
        doacoes,
        estoque,
        attendanceSessions,
        attendanceRecords,
        assignments,
      ] = await Promise.all([
        supabase.from("congregations").select("id, name, is_headquarters, city, latitude, longitude, lead_pastor"),
        supabase.from("members").select("id, congregation_id, active, created_at"),
        supabase.from("members").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
        supabase.from("members").select("id", { count: "exact", head: true }).gte("created_at", prevMonthStart).lt("created_at", monthStart),
        supabase.from("mao_amiga_familias").select("id, congregation_id, ativo"),
        supabase.from("mao_amiga_entregas").select("id, congregation_id, data_entrega").gte("data_entrega", monthStart.slice(0, 10)),
        supabase.from("mao_amiga_doacoes").select("congregation_id, valor_dinheiro, quantidade, data").gte("data", monthStart.slice(0, 10)),
        supabase.from("mao_amiga_estoque").select("id, congregation_id, descricao, unidade, quantidade, categoria_id, mao_amiga_categorias(nome)"),
        supabase.from("ebd_attendance_sessions").select("id, class_id, lesson_date, ebd_classes(congregation_id)").gte("lesson_date", threeMonthsAgo),
        supabase.from("ebd_attendance_records").select("session_id, present"),
        supabase.from("schedule_assignments").select("status, volunteer_id, created_at").gte("created_at", thirtyDaysAgo),
      ]);

      return {
        congs: congs.data ?? [],
        members: members.data ?? [],
        newThisMonth: membersThisMonth.count ?? 0,
        newLastMonth: membersLastMonth.count ?? 0,
        familias: familias.data ?? [],
        entregasMonth: entregasMonth.data ?? [],
        doacoes: doacoes.data ?? [],
        estoque: (estoque.data ?? []) as Array<{ id: string; congregation_id: string; descricao: string; unidade: string; quantidade: number; mao_amiga_categorias: { nome: string } | null }>,
        sessions: (attendanceSessions.data ?? []) as Array<{ id: string; ebd_classes: { congregation_id: string } | null }>,
        records: attendanceRecords.data ?? [],
        assignments: assignments.data ?? [],
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
  const totalArrecadadoMes = data.doacoes.reduce((acc, d) => acc + Number(d.valor_dinheiro ?? 0), 0);
  const entregasMes = data.entregasMonth.length;
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

  // EBD attendance % per congregation (last 3 months)
  const sessionToCong = new Map<string, string>();
  for (const s of data.sessions) if (s.ebd_classes) sessionToCong.set(s.id, s.ebd_classes.congregation_id);
  const ebdByCong = new Map<string, { present: number; total: number }>();
  for (const r of data.records) {
    const cong = sessionToCong.get(r.session_id);
    if (!cong) continue;
    const cur = ebdByCong.get(cong) ?? { present: 0, total: 0 };
    cur.total += 1;
    if (r.present) cur.present += 1;
    ebdByCong.set(cong, cur);
  }

  // Mão Amiga activity per congregation (last 30 days)
  const maoAmigaActivity = new Map<string, number>();
  for (const e of data.entregasMonth) maoAmigaActivity.set(e.congregation_id, (maoAmigaActivity.get(e.congregation_id) ?? 0) + 1);
  for (const d of data.doacoes) maoAmigaActivity.set(d.congregation_id, (maoAmigaActivity.get(d.congregation_id) ?? 0) + 1);

  // Schedule fill % per congregation (proxy: % approved out of total)
  // Health Score per congregation
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

  // Critical stock (per congregation x item, quantity below threshold)
  const stockCritical = data.estoque
    .filter((e) => Number(e.quantidade) <= STOCK_THRESHOLD)
    .sort((a, b) => Number(a.quantidade) - Number(b.quantidade));
  const congsWithCriticalStock = new Set(stockCritical.map((s) => s.congregation_id)).size;

  const congNameById = new Map(data.congs.map((c) => [c.id, c.name]));

  const chartData = ranking.slice(0, 8).map((c) => ({ name: c.name.length > 14 ? c.name.slice(0, 12) + "…" : c.name, membros: c.members }));

  const healthBadgeVariant = (h: number) => (h >= 75 ? "default" : h >= 50 ? "secondary" : "destructive");
  const healthLabel = (h: number) => (h >= 75 ? "Saudável" : h >= 50 ? "Atenção" : "Crítico");

  const congsWithGeo = data.congs.filter((c) => c.latitude && c.longitude);

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
      hint: `${familiasAtivas} famílias · R$ ${totalArrecadadoMes.toLocaleString("pt-BR")}`,
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
      {(congsWithCriticalStock > 0 || stockCritical.length > 0) && (
        <Card className="border-destructive/40 bg-destructive/5 shadow-card">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div className="flex-1">
              <p className="text-sm font-semibold">
                {stockCritical.length} item(ns) em estoque crítico em {congsWithCriticalStock} congregação(ões)
              </p>
              <p className="text-xs text-muted-foreground">Itens com saldo ≤ {STOCK_THRESHOLD} no projeto Mão Amiga.</p>
            </div>
            <Link to="/app/mao-amiga" className="text-xs font-semibold text-destructive hover:underline">
              Ver detalhes →
            </Link>
          </CardContent>
        </Card>
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

        {/* Top membros chart */}
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

        {/* Estoque Crítico */}
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Estoque Crítico — Mão Amiga
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stockCritical.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum item em estado crítico. ✅</p>
            ) : (
              <ul className="divide-y">
                {stockCritical.slice(0, 8).map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium">{s.descricao}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.mao_amiga_categorias?.nome ?? "—"} · {congNameById.get(s.congregation_id) ?? "—"}
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

        {/* EBD consolidado */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" /> EBD · Frequência (3m)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ebdByCong.size === 0 ? (
              <p className="text-sm text-muted-foreground">Sem registros de chamada.</p>
            ) : (
              <ul className="space-y-3">
                {Array.from(ebdByCong.entries())
                  .map(([cong, v]) => ({
                    cong,
                    pct: v.total > 0 ? Math.round((v.present / v.total) * 100) : 0,
                    total: v.total,
                  }))
                  .sort((a, b) => b.pct - a.pct)
                  .slice(0, 6)
                  .map((row) => (
                    <li key={row.cong}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="truncate font-medium">{congNameById.get(row.cong) ?? "—"}</span>
                        <span className="text-muted-foreground">{row.pct}%</span>
                      </div>
                      <Progress value={row.pct} className="mt-1 h-1.5" />
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
