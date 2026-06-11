import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import * as fns from "@/lib/finance.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/app/financeiro/relatorios")({
  component: ReportsPage,
});

const BRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

function ReportsPage() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [di, setDi] = useState(firstDay);
  const [df, setDf] = useState(lastDay);
  const [tipo, setTipo] = useState<string>("all");
  const [congId, setCongId] = useState<string>("");

  const getContext = useServerFn(fns.getMyContext);
  const listTx = useServerFn(fns.listTransactions);
  const listCongs = useServerFn(fns.listCongregationsLite);

  const { data: ctx } = useQuery({ queryKey: ["finance-context"], queryFn: () => getContext() });
  const { data: congs = [] } = useQuery({
    queryKey: ["finance-congs"],
    queryFn: () => listCongs(),
    enabled: !!ctx?.isSede,
  });

  const { data: rows = [] } = useQuery({
    queryKey: ["finance-report", di, df, tipo, congId],
    queryFn: () => listTx({
      data: {
        data_inicio: di, data_fim: df,
        tipo: tipo === "all" ? undefined : (tipo as "entrada" | "saida"),
        congregation_id: congId || undefined,
        status: "aprovado",
      },
    }),
  });

  const totals = useMemo(() => {
    let entradas = 0, saidas = 0;
    for (const r of rows as any[]) {
      if (r.tipo === "entrada") entradas += Number(r.valor);
      else saidas += Number(r.valor);
    }
    return { entradas, saidas, saldo: entradas - saidas };
  }, [rows]);

  const exportCSV = () => {
    const header = ["Data", "Tipo", "Categoria", "Congregação", "Valor", "Pagamento", "Contribuinte", "Descrição"];
    const lines = (rows as any[]).map((r) => [
      r.data, r.tipo, r.finance_categories?.nome ?? "", r.congregations?.name ?? "",
      Number(r.valor).toFixed(2).replace(".", ","),
      r.forma_pagamento,
      r.anonimo ? "Anônimo" : (r.members?.full_name ?? r.contribuinte_nome ?? ""),
      (r.descricao ?? "").replace(/[\n;]/g, " "),
    ]);
    const csv = [header, ...lines].map((l) => l.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `relatorio-financeiro-${di}-${df}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Filtros</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-5">
            <div><Label>Início</Label><Input type="date" value={di} onChange={(e) => setDi(e.target.value)} /></div>
            <div><Label>Fim</Label><Input type="date" value={df} onChange={(e) => setDf(e.target.value)} /></div>
            <div>
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="entrada">Entradas</SelectItem>
                  <SelectItem value="saida">Saídas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {ctx?.isSede && (
              <div>
                <Label>Congregação</Label>
                <Select value={congId || "all"} onValueChange={(v) => setCongId(v === "all" ? "" : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {congs.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-end">
              <Button onClick={exportCSV} className="w-full"><Download className="mr-2 h-4 w-4" />Exportar CSV</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Entradas</div><div className="text-2xl font-bold text-emerald-600">{BRL(totals.entradas)}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Saídas</div><div className="text-2xl font-bold text-rose-600">{BRL(totals.saidas)}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Saldo</div><div className={`text-2xl font-bold ${totals.saldo >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{BRL(totals.saldo)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Lançamentos ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Congregação</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sem dados no período</TableCell></TableRow>}
                {(rows as any[]).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.data?.slice(0, 10).split("-").reverse().join("/")}</TableCell>
                    <TableCell>
                      <Badge variant={r.tipo === "entrada" ? "default" : "destructive"}>
                        {r.tipo === "entrada" ? "Entrada" : "Saída"}
                      </Badge>
                    </TableCell>
                    <TableCell>{r.finance_categories?.nome}</TableCell>
                    <TableCell>{r.congregations?.name}</TableCell>
                    <TableCell className="capitalize">{r.forma_pagamento}</TableCell>
                    <TableCell className={`text-right font-medium ${r.tipo === "entrada" ? "text-emerald-600" : "text-rose-600"}`}>
                      {BRL(Number(r.valor))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
