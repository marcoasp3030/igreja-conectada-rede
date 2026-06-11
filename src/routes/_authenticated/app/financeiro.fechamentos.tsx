import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import * as fns from "@/lib/finance.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Lock, Unlock, RefreshCw, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/app/financeiro/fechamentos")({
  component: FechamentosPage,
});

const BRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n) || 0);

const periodoLabel: Record<string, string> = { culto: "Culto", semana: "Semana", mes: "Mês" };

function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
function firstDayOfMonth() {
  const d = new Date(); d.setDate(1);
  return d.toISOString().slice(0, 10);
}
function lastDayOfMonth() {
  const d = new Date(); d.setMonth(d.getMonth() + 1, 0);
  return d.toISOString().slice(0, 10);
}

function FechamentosPage() {
  const qc = useQueryClient();
  const getContext = useServerFn(fns.getMyContext);
  const listCong = useServerFn(fns.listCongregationsLite);
  const listEvents = useServerFn(fns.listEventsLite);
  const list = useServerFn(fns.listClosings);
  const create = useServerFn(fns.createClosing);
  const recompute = useServerFn(fns.recomputeClosing);
  const close = useServerFn(fns.closeClosing);
  const reopen = useServerFn(fns.reopenClosing);
  const remove = useServerFn(fns.deleteClosing);

  const ctx = useQuery({ queryKey: ["finance", "ctx"], queryFn: () => getContext() });
  const congs = useQuery({
    queryKey: ["finance", "congs"],
    queryFn: () => listCong(),
    enabled: !!ctx.data?.isSede,
  });

  const [filterCong, setFilterCong] = useState<string>("all");
  const targetCong = ctx.data?.isSede
    ? (filterCong === "all" ? undefined : filterCong)
    : (ctx.data?.congregationId ?? undefined);

  const closings = useQuery({
    queryKey: ["finance", "closings", targetCong ?? "all"],
    queryFn: () => list({ data: { congregation_id: targetCong } as any }),
    enabled: !!ctx.data,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["finance", "closings"] });

  const onError = (e: any) => toast.error(e?.message ?? "Falha na operação");

  const mCreate = useMutation({ mutationFn: (d: any) => create({ data: d }), onSuccess: () => { toast.success("Fechamento criado"); invalidate(); }, onError });
  const mRecompute = useMutation({ mutationFn: (id: string) => recompute({ data: { id } }), onSuccess: () => { toast.success("Totais recalculados"); invalidate(); }, onError });
  const mClose = useMutation({ mutationFn: (id: string) => close({ data: { id } }), onSuccess: () => { toast.success("Período fechado e travado"); invalidate(); }, onError });
  const mReopen = useMutation({ mutationFn: (id: string) => reopen({ data: { id } }), onSuccess: () => { toast.success("Período reaberto"); invalidate(); }, onError });
  const mRemove = useMutation({ mutationFn: (id: string) => remove({ data: { id } }), onSuccess: () => { toast.success("Fechamento excluído"); invalidate(); }, onError });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Fechamentos</CardTitle>
            <p className="text-sm text-muted-foreground">Consolide e trave períodos (culto, semana ou mês). Após fechado, novos lançamentos no período ficam bloqueados.</p>
          </div>
          <div className="flex gap-2 items-center">
            {ctx.data?.isSede && (
              <Select value={filterCong} onValueChange={setFilterCong}>
                <SelectTrigger className="w-[220px]"><SelectValue placeholder="Congregação" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as congregações</SelectItem>
                  {(congs.data ?? []).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <NewClosingDialog
              isSede={!!ctx.data?.isSede}
              defaultCong={ctx.data?.congregationId ?? undefined}
              congs={congs.data ?? []}
              listEvents={listEvents}
              onSubmit={(d) => mCreate.mutate(d)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {ctx.data?.isSede && <TableHead>Congregação</TableHead>}
                <TableHead>Período</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Entradas</TableHead>
                <TableHead className="text-right">Saídas</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(closings.data ?? []).map((c: any) => {
                const locked = c.status === "fechado";
                return (
                  <TableRow key={c.id}>
                    {ctx.data?.isSede && <TableCell>{c.congregations?.name ?? "—"}</TableCell>}
                    <TableCell>
                      <div className="text-sm">{c.data_inicio} → {c.data_fim}</div>
                      {c.events?.title && <div className="text-xs text-muted-foreground">{c.events.title}</div>}
                    </TableCell>
                    <TableCell>{periodoLabel[c.periodo_tipo]}</TableCell>
                    <TableCell className="text-right text-emerald-600">{BRL(c.total_entradas)}</TableCell>
                    <TableCell className="text-right text-rose-600">{BRL(c.total_saidas)}</TableCell>
                    <TableCell className={`text-right font-medium ${Number(c.saldo) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{BRL(c.saldo)}</TableCell>
                    <TableCell>
                      {locked ? (
                        <Badge variant="default" className="gap-1"><Lock className="h-3 w-3" /> Fechado</Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1"><Unlock className="h-3 w-3" /> Aberto</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {!locked && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => mRecompute.mutate(c.id)} title="Recalcular">
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="default" className="gap-1"><CheckCircle2 className="h-4 w-4" /> Fechar</Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Fechar e travar período?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Após o fechamento, lançamentos com data entre {c.data_inicio} e {c.data_fim} não poderão ser criados, editados ou excluídos. Apenas a sede pode reabrir.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => mClose.mutate(c.id)}>Confirmar fechamento</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            <Button size="sm" variant="ghost" onClick={() => mRemove.mutate(c.id)} title="Excluir">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {locked && ctx.data?.isSede && (
                          <Button size="sm" variant="outline" onClick={() => mReopen.mutate(c.id)} className="gap-1">
                            <Unlock className="h-4 w-4" /> Reabrir
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(closings.data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={ctx.data?.isSede ? 8 : 7} className="text-center py-10 text-muted-foreground">
                    Nenhum fechamento registrado ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function NewClosingDialog({
  isSede, defaultCong, congs, listEvents, onSubmit,
}: {
  isSede: boolean;
  defaultCong?: string;
  congs: any[];
  listEvents: any;
  onSubmit: (d: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const [periodo, setPeriodo] = useState<"culto" | "semana" | "mes">("mes");
  const [cong, setCong] = useState<string | undefined>(defaultCong);
  const [eventId, setEventId] = useState<string>("");
  const [di, setDi] = useState(firstDayOfMonth());
  const [df, setDf] = useState(lastDayOfMonth());
  const [obs, setObs] = useState("");

  const events = useQuery({
    queryKey: ["finance", "events", cong],
    queryFn: () => listEvents({ data: { congregation_id: cong! } as any }),
    enabled: !!cong && periodo === "culto",
  });

  const congregationId = useMemo(() => isSede ? cong : defaultCong, [isSede, cong, defaultCong]);

  function applyPeriodoDefaults(p: string) {
    if (p === "mes") { setDi(firstDayOfMonth()); setDf(lastDayOfMonth()); }
    if (p === "semana") {
      const d = new Date(); const day = d.getDay();
      const start = new Date(d); start.setDate(d.getDate() - day);
      const end = new Date(start); end.setDate(start.getDate() + 6);
      setDi(start.toISOString().slice(0, 10)); setDf(end.toISOString().slice(0, 10));
    }
    if (p === "culto") { setDi(todayISO()); setDf(todayISO()); }
  }

  function handleSubmit() {
    if (!congregationId) return toast.error("Selecione a congregação");
    if (!di || !df) return toast.error("Informe o período");
    onSubmit({
      congregation_id: congregationId,
      periodo_tipo: periodo,
      event_id: eventId || null,
      data_inicio: di,
      data_fim: df,
      observacoes: obs || null,
    });
    setOpen(false);
    setObs(""); setEventId("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-1"><Plus className="h-4 w-4" /> Novo fechamento</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo fechamento</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {isSede && (
            <div>
              <Label>Congregação</Label>
              <Select value={cong} onValueChange={setCong}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {congs.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Tipo de período</Label>
            <Select value={periodo} onValueChange={(v) => { setPeriodo(v as any); applyPeriodoDefaults(v); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="culto">Culto</SelectItem>
                <SelectItem value="semana">Semana</SelectItem>
                <SelectItem value="mes">Mês</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {periodo === "culto" && congregationId && (
            <div>
              <Label>Evento/Culto (opcional)</Label>
              <Select value={eventId} onValueChange={setEventId}>
                <SelectTrigger><SelectValue placeholder="Selecionar culto" /></SelectTrigger>
                <SelectContent>
                  {(events.data ?? []).map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.title} — {new Date(e.starts_at).toLocaleDateString("pt-BR")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data início</Label>
              <Input type="date" value={di} onChange={(e) => setDi(e.target.value)} />
            </div>
            <div>
              <Label>Data fim</Label>
              <Input type="date" value={df} onChange={(e) => setDf(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>Criar fechamento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
