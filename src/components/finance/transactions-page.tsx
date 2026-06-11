import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import * as fns from "@/lib/finance.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Check, X, Trash2, Pencil, Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TransactionDialog } from "./transaction-dialog";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const BRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

const statusBadge: Record<string, { label: string; variant: any }> = {
  pendente: { label: "Pendente", variant: "secondary" },
  aprovado: { label: "Aprovado", variant: "default" },
  rejeitado: { label: "Rejeitado", variant: "destructive" },
};

export function TransactionsPage({ tipo }: { tipo: "entrada" | "saida" }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const getContext = useServerFn(fns.getMyContext);
  const listTx = useServerFn(fns.listTransactions);
  const approve = useServerFn(fns.approveTransaction);
  const reject = useServerFn(fns.rejectTransaction);
  const remove = useServerFn(fns.deleteTransaction);

  const { data: ctx } = useQuery({ queryKey: ["finance-context"], queryFn: () => getContext() });
  const { data: rows = [] } = useQuery({
    queryKey: ["finance-transactions", tipo, status],
    queryFn: () => listTx({ data: { tipo, status: status === "all" ? undefined : (status as any) } }),
  });

  const mApprove = useMutation({
    mutationFn: (id: string) => approve({ data: { id } }),
    onSuccess: () => { toast.success("Aprovado"); qc.invalidateQueries({ queryKey: ["finance-transactions"] }); },
  });
  const mReject = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) => reject({ data: { id, motivo } }),
    onSuccess: () => { toast.success("Rejeitado"); qc.invalidateQueries({ queryKey: ["finance-transactions"] }); },
  });
  const mDelete = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => { toast.success("Excluído"); qc.invalidateQueries({ queryKey: ["finance-transactions"] }); },
  });

  const filtered = (rows as any[]).filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      r.finance_categories?.nome?.toLowerCase().includes(s) ||
      r.descricao?.toLowerCase().includes(s) ||
      r.contribuinte_nome?.toLowerCase().includes(s) ||
      r.members?.full_name?.toLowerCase().includes(s) ||
      r.congregations?.name?.toLowerCase().includes(s)
    );
  });

  const totals = filtered.reduce((s: number, r: any) => s + Number(r.valor), 0);

  const canApprove = (cid: string) => {
    if (!ctx) return false;
    if (ctx.isSede) return true;
    return ctx.roles.some((r) => r.congregation_id === cid && (r.role === "admin_congregacao" || r.role === "tesoureiro"));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{tipo === "entrada" ? "Entradas" : "Despesas"} ({filtered.length})</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Total: <span className="font-semibold">{BRL(totals)}</span></p>
          </div>
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Novo {tipo === "entrada" ? "lançamento" : "despesa"}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="aprovado">Aprovados</SelectItem>
                <SelectItem value="rejeitado">Rejeitados</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Congregação</TableHead>
                  <TableHead>{tipo === "entrada" ? "Contribuinte" : "Descrição"}</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum registro</TableCell></TableRow>
                )}
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.data?.split("-").reverse().join("/")}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ background: r.finance_categories?.cor }} />
                        {r.finance_categories?.nome}
                      </span>
                    </TableCell>
                    <TableCell>{r.congregations?.name}</TableCell>
                    <TableCell>
                      {tipo === "entrada"
                        ? (r.anonimo ? <Badge variant="outline">Anônimo</Badge> : (r.members?.full_name ?? r.contribuinte_nome ?? "—"))
                        : (r.descricao ?? "—")}
                    </TableCell>
                    <TableCell className="capitalize">{r.forma_pagamento}</TableCell>
                    <TableCell className={`text-right font-medium ${tipo === "entrada" ? "text-emerald-600" : "text-rose-600"}`}>
                      {BRL(Number(r.valor))}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadge[r.status].variant}>{statusBadge[r.status].label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        {r.status === "pendente" && canApprove(r.congregation_id) && (
                          <>
                            <Button size="icon" variant="ghost" onClick={() => mApprove.mutate(r.id)} title="Aprovar">
                              <Check className="h-4 w-4 text-emerald-600" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => {
                              const m = prompt("Motivo da rejeição:");
                              if (m) mReject.mutate({ id: r.id, motivo: m });
                            }} title="Rejeitar">
                              <X className="h-4 w-4 text-rose-600" />
                            </Button>
                          </>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setDialogOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {canApprove(r.congregation_id) && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-rose-600" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
                                <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => mDelete.mutate(r.id)}>Excluir</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {ctx?.congregationId || ctx?.isSede ? (
        <TransactionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          tipo={tipo}
          congregationId={ctx.congregationId ?? ""}
          isSede={!!ctx.isSede}
          initial={editing}
        />
      ) : null}
    </div>
  );
}
