import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Calendar as CalIcon, MapPin } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const EVENT_TYPES = [
  { value: "culto", label: "Culto" },
  { value: "evento", label: "Evento" },
  { value: "festividade", label: "Festividade" },
  { value: "reuniao", label: "Reunião" },
  { value: "escala", label: "Escala" },
  { value: "ensaio", label: "Ensaio" },
] as const;

export const Route = createFileRoute("/_authenticated/agenda")({
  component: Agenda,
});

function Agenda() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const empty = {
    title: "", description: "", event_type: "evento" as string,
    starts_at: "", ends_at: "", location: "", congregation_id: "", is_global: false,
  };
  const [form, setForm] = useState(empty);

  const { data: congregations } = useQuery({
    queryKey: ["congregations-list"],
    queryFn: async () => (await supabase.from("congregations").select("id, name").order("name")).data ?? [],
  });

  const { data: events } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events").select("*, congregations(name)").order("starts_at");
      if (error) throw error;
      return data;
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
      qc.invalidateQueries({ queryKey: ["events"] });
      setOpen(false);
      setForm(empty);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const now = new Date();
  const upcoming = (events ?? []).filter((e) => new Date(e.starts_at) >= now);
  const past = (events ?? []).filter((e) => new Date(e.starts_at) < now).slice(-5);

  return (
    <div>
      <PageHeader
        title="Agenda"
        description="Cultos, eventos, festividades, reuniões e escalas."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Novo</Button></DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader><DialogTitle>Novo evento</DialogTitle></DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2"><Label>Título</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div className="space-y-2"><Label>Tipo</Label>
                  <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{EVENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Congregação</Label>
                  <Select value={form.congregation_id || undefined} onValueChange={(v) => setForm({ ...form, congregation_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent>{congregations?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Início</Label>
                  <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></div>
                <div className="space-y-2"><Label>Fim</Label>
                  <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></div>
                <div className="space-y-2 sm:col-span-2"><Label>Local</Label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
                <div className="space-y-2 sm:col-span-2"><Label>Descrição</Label>
                  <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={() => create.mutate()} disabled={create.isPending || !form.title || !form.starts_at}>
                  {create.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Próximos</h2>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {upcoming.length === 0 && (
          <Card className="shadow-card md:col-span-2 lg:col-span-3"><CardContent className="p-6 text-center text-sm text-muted-foreground">Nenhum evento agendado.</CardContent></Card>
        )}
        {upcoming.map((e) => (
          <Card key={e.id} className="shadow-card transition hover:-translate-y-0.5">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2">
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-secondary-foreground">
                  {e.event_type}
                </span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(e.starts_at), "dd MMM · HH:mm", { locale: ptBR })}
                </span>
              </div>
              <h3 className="mt-2 text-base font-semibold">{e.title}</h3>
              {e.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{e.description}</p>}
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                {e.location && <p className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {e.location}</p>}
                {(e as { congregations?: { name?: string } }).congregations?.name && (
                  <p className="flex items-center gap-1"><CalIcon className="h-3 w-3" /> {(e as { congregations?: { name?: string } }).congregations?.name}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {past.length > 0 && (
        <>
          <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Últimos eventos</h2>
          <Card className="shadow-card">
            <CardContent className="divide-y p-0">
              {past.map((e) => (
                <div key={e.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{e.title}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(e.starts_at), "PPP", { locale: ptBR })}</p>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase">{e.event_type}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
