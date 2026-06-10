import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus, MapPin, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, isSameMonth, isSameDay, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const EVENT_TYPES = [
  { value: "culto", label: "Culto", color: "bg-primary/15 text-primary border-primary/30" },
  { value: "evento", label: "Evento", color: "bg-blue-500/15 text-blue-500 border-blue-500/30" },
  { value: "festividade", label: "Festividade", color: "bg-pink-500/15 text-pink-500 border-pink-500/30" },
  { value: "reuniao", label: "Reunião", color: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  { value: "escala", label: "Escala", color: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  { value: "ensaio", label: "Ensaio", color: "bg-purple-500/15 text-purple-500 border-purple-500/30" },
] as const;

const typeMeta = (t: string) => EVENT_TYPES.find((x) => x.value === t) ?? EVENT_TYPES[1];

export const Route = createFileRoute("/_authenticated/app/calendario")({
  component: Calendario,
});

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  congregation_id: string | null;
  is_global: boolean;
  congregations?: { name?: string } | null;
};

function Calendario() {
  const qc = useQueryClient();
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(() => new Date());
  const [open, setOpen] = useState(false);

  const empty = {
    title: "", description: "", event_type: "culto",
    starts_at: "", ends_at: "", location: "", congregation_id: "", is_global: false,
  };
  const [form, setForm] = useState(empty);

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const { data: congregations } = useQuery({
    queryKey: ["congregations-list"],
    queryFn: async () => (await supabase.from("congregations").select("id, name").order("name")).data ?? [],
  });

  const { data: events } = useQuery({
    queryKey: ["events-month", format(cursor, "yyyy-MM")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, congregations(name)")
        .gte("starts_at", gridStart.toISOString())
        .lte("starts_at", gridEnd.toISOString())
        .order("starts_at");
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("events").insert({
        title: form.title,
        description: form.description || null,
        event_type: form.event_type as "evento",
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        location: form.location || null,
        congregation_id: form.congregation_id || null,
        is_global: form.is_global,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Evento agendado!");
      qc.invalidateQueries({ queryKey: ["events-month"] });
      setOpen(false);
      setForm(empty);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Evento removido");
      qc.invalidateQueries({ queryKey: ["events-month"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const days = useMemo(() => {
    const out: Date[] = [];
    let d = gridStart;
    while (d <= gridEnd) {
      out.push(d);
      d = addDays(d, 1);
    }
    return out;
  }, [gridStart, gridEnd]);

  const eventsByDay = useMemo(() => {
    const m = new Map<string, EventRow[]>();
    for (const e of events ?? []) {
      const k = format(new Date(e.starts_at), "yyyy-MM-dd");
      const arr = m.get(k) ?? [];
      arr.push(e);
      m.set(k, arr);
    }
    return m;
  }, [events]);

  const dayEvents = eventsByDay.get(format(selected, "yyyy-MM-dd")) ?? [];

  const openCreateAt = (d?: Date) => {
    const base = d ?? selected;
    const hhmm = "19:00";
    setForm({ ...empty, starts_at: `${format(base, "yyyy-MM-dd")}T${hhmm}` });
    setOpen(true);
  };

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendário"
        description="Organize cultos, eventos e reuniões com visão mensal e agenda diária."
        actions={
          <Button onClick={() => openCreateAt()}>
            <Plus className="mr-2 h-4 w-4" /> Novo evento
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="shadow-card lg:col-span-2">
          <CardContent className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setCursor(addMonths(cursor, -1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="min-w-[180px] text-center text-lg font-semibold capitalize">
                  {format(cursor, "MMMM 'de' yyyy", { locale: ptBR })}
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setCursor(addMonths(cursor, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date();
                  setCursor(startOfMonth(now));
                  setSelected(now);
                }}
              >
                Hoje
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {weekDays.map((d) => (
                <div key={d} className="py-1">{d}</div>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {days.map((d) => {
                const k = format(d, "yyyy-MM-dd");
                const dayEv = eventsByDay.get(k) ?? [];
                const outside = !isSameMonth(d, cursor);
                const isSel = isSameDay(d, selected);
                const today = isToday(d);
                return (
                  <button
                    key={k}
                    onClick={() => setSelected(d)}
                    onDoubleClick={() => openCreateAt(d)}
                    className={cn(
                      "flex min-h-[80px] flex-col gap-1 rounded-md border p-1.5 text-left text-xs transition",
                      "hover:border-primary/50 hover:bg-card",
                      outside && "opacity-40",
                      isSel ? "border-primary bg-primary/5" : "border-border bg-card/40",
                      today && "ring-1 ring-primary/40",
                    )}
                  >
                    <span className={cn("text-[11px] font-semibold", today && "text-primary")}>
                      {format(d, "d")}
                    </span>
                    <div className="space-y-0.5 overflow-hidden">
                      {dayEv.slice(0, 3).map((e) => {
                        const meta = typeMeta(e.event_type);
                        return (
                          <div
                            key={e.id}
                            className={cn("truncate rounded px-1 py-0.5 text-[10px] font-medium border", meta.color)}
                            title={e.title}
                          >
                            {format(new Date(e.starts_at), "HH:mm")} {e.title}
                          </div>
                        );
                      })}
                      {dayEv.length > 3 && (
                        <div className="px-1 text-[10px] text-muted-foreground">+{dayEv.length - 3} mais</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {EVENT_TYPES.map((t) => (
                <Badge key={t.value} variant="outline" className={cn("border", t.color)}>
                  {t.label}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Daily agenda */}
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Agenda do dia</p>
                <h3 className="text-lg font-semibold capitalize">
                  {format(selected, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </h3>
              </div>
              <Button size="sm" variant="outline" onClick={() => openCreateAt(selected)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {dayEvents.length === 0 ? (
              <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                Nenhum evento neste dia.
              </div>
            ) : (
              <ul className="space-y-3">
                {dayEvents.map((e) => {
                  const meta = typeMeta(e.event_type);
                  return (
                    <li key={e.id} className="rounded-lg border bg-card/40 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={cn("border text-[10px]", meta.color)}>
                              {meta.label}
                            </Badge>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {format(new Date(e.starts_at), "HH:mm")}
                              {e.ends_at && ` – ${format(new Date(e.ends_at), "HH:mm")}`}
                            </span>
                          </div>
                          <p className="mt-1 font-semibold">{e.title}</p>
                          {e.description && (
                            <p className="mt-1 text-xs text-muted-foreground">{e.description}</p>
                          )}
                          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                            {e.location && (
                              <p className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {e.location}</p>
                            )}
                            {e.congregations?.name && (
                              <p>{e.is_global ? "Global · " : ""}{e.congregations.name}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Remover "${e.title}"?`)) remove.mutate(e.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Novo evento</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Título</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Congregação</Label>
              <Select value={form.congregation_id || undefined} onValueChange={(v) => setForm({ ...form, congregation_id: v })}>
                <SelectTrigger><SelectValue placeholder="Todas (global)" /></SelectTrigger>
                <SelectContent>
                  {congregations?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Início</Label>
              <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Fim</Label>
              <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Local</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Descrição</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending || !form.title || !form.starts_at}>
              {create.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
