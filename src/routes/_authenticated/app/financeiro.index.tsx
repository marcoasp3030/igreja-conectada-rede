import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import * as fns from "@/lib/finance.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, Building2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/app/financeiro/")({
  component: FinanceDashboard,
});

const BRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function FinanceDashboard() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [congId, setCongId] = useState<string>("");

  const getContext = useServerFn(fns.getMyContext);
  const getDashboard = useServerFn(fns.getDashboardSummary);
  const listCongs = useServerFn(fns.listCongregationsLite);
  const getOverview = useServerFn(fns.getSedeOverview);

  const { data: ctx } = useQuery({ queryKey: ["finance-context"], queryFn: () => getContext() });
  const { data: congs = [] } = useQuery({
    queryKey: ["finance-congs"],
    queryFn: () => listCongs(),
    enabled: !!ctx?.isSede,
  });

  const { data: dash } = useQuery({
    queryKey: ["finance-dashboard", mes, ano, congId, ctx?.userId],
    enabled: !!ctx,
    queryFn: () => getDashboard({ data: { mes, ano, congregation_id: congId || undefined } }),
  });

  const { data: overview = [] } = useQuery({
    queryKey: ["finance-overview", mes, ano],
    enabled: !!ctx?.isSede && !congId,
    queryFn: () => getOverview({ data: { mes, ano } }),
  });

  const variacao = dash?.variacao ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Mês</label>
          <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>{meses.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Ano</label>
          <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[ano - 1, ano, ano + 1].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {ctx?.isSede && (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Congregação</label>
            <Select value={congId || "all"} onValueChange={(v) => setCongId(v === "all" ? "" : v)}>
              <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas (consolidado)</SelectItem>
                {congs.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entradas do mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{BRL(dash?.totalEntradas ?? 0)}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              {variacao >= 0 ? <ArrowUpRight className="h-3 w-3 text-emerald-500" /> : <ArrowDownRight className="h-3 w-3 text-rose-500" />}
              {Math.abs(variacao).toFixed(1)}% vs mês anterior
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saídas do mês</CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{BRL(dash?.totalSaidas ?? 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Despesas aprovadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(dash?.saldo ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {BRL(dash?.saldo ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Entradas - Saídas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top categoria</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{dash?.porCategoria[0]?.nome ?? "—"}</div>
            <p className="text-xs text-muted-foreground mt-1">{BRL(dash?.porCategoria[0]?.total ?? 0)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Fluxo diário</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dash?.porDia ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="data" tickFormatter={(d) => d?.slice(8, 10)} fontSize={11} />
                <YAxis tickFormatter={(v) => `R$${v}`} fontSize={11} />
                <Tooltip formatter={(v: number) => BRL(v)} />
                <Legend />
                <Line type="monotone" dataKey="entrada" stroke="#10b981" name="Entradas" strokeWidth={2} />
                <Line type="monotone" dataKey="saida" stroke="#ef4444" name="Saídas" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Por categoria</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dash?.porCategoria ?? []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tickFormatter={(v) => `R$${v}`} fontSize={11} />
                <YAxis type="category" dataKey="nome" width={120} fontSize={11} />
                <Tooltip formatter={(v: number) => BRL(v)} />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {(dash?.porCategoria ?? []).map((c, i) => <Cell key={i} fill={c.cor} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Forma de pagamento</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dash?.porPagamento ?? []} dataKey="total" nameKey="forma" cx="50%" cy="50%" outerRadius={90} label>
                  {(dash?.porPagamento ?? []).map((_, i) => (
                    <Cell key={i} fill={["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"][i % 5]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => BRL(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {ctx?.isSede && !congId && (
          <Card>
            <CardHeader><CardTitle>Consolidado por congregação</CardTitle></CardHeader>
            <CardContent className="space-y-2 max-h-72 overflow-auto">
              {overview.length === 0 && <p className="text-sm text-muted-foreground">Sem lançamentos no período.</p>}
              {overview.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="font-medium text-sm flex items-center gap-2">
                      {c.nome}
                      {c.sede && <Badge variant="outline" className="text-xs">Sede</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Entradas {BRL(c.entradas)} · Saídas {BRL(c.saidas)}
                    </div>
                  </div>
                  <div className={`text-sm font-semibold ${c.saldo >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {BRL(c.saldo)}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
