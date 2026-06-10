import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, BookOpen, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/app/ebd")({
  component: EBD,
});

function EBD() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const empty = { title: "", reference: "", lesson_date: "", content: "", notice: "", daily_readings: "" };
  const [form, setForm] = useState(empty);

  const { data: lessons } = useQuery({
    queryKey: ["ebd-lessons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ebd_lessons").select("*").order("lesson_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const readings = form.daily_readings.split("\n").map((l) => l.trim()).filter(Boolean)
        .map((line) => {
          const [day, ...rest] = line.split(":");
          return { day: day.trim(), reading: rest.join(":").trim() };
        });
      const { error } = await supabase.from("ebd_lessons").insert({
        title: form.title,
        reference: form.reference || null,
        lesson_date: form.lesson_date,
        content: form.content || null,
        notice: form.notice || null,
        daily_readings: readings,
        is_global: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lição publicada!");
      qc.invalidateQueries({ queryKey: ["ebd-lessons"] });
      setOpen(false);
      setForm(empty);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const current = lessons?.[0];

  return (
    <div>
      <PageHeader
        title="Escola Bíblica Dominical"
        description="Lições, leitura diária e avisos da EBD."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Nova lição</Button></DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
              <DialogHeader><DialogTitle>Nova lição da EBD</DialogTitle></DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2"><Label>Título</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div className="space-y-2"><Label>Referência bíblica</Label>
                  <Input placeholder="Ex.: Romanos 12:1-2" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
                <div className="space-y-2"><Label>Data</Label>
                  <Input type="date" value={form.lesson_date} onChange={(e) => setForm({ ...form, lesson_date: e.target.value })} /></div>
                <div className="space-y-2 sm:col-span-2"><Label>Conteúdo</Label>
                  <Textarea rows={5} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Leitura diária (uma por linha — formato: Dia: Referência)</Label>
                  <Textarea rows={4} placeholder="Segunda: Salmo 1&#10;Terça: Salmo 23&#10;..." value={form.daily_readings} onChange={(e) => setForm({ ...form, daily_readings: e.target.value })} />
                </div>
                <div className="space-y-2 sm:col-span-2"><Label>Aviso</Label>
                  <Textarea rows={2} value={form.notice} onChange={(e) => setForm({ ...form, notice: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={() => create.mutate()} disabled={create.isPending || !form.title || !form.lesson_date}>
                  {create.isPending ? "Publicando..." : "Publicar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {current && (
        <Card className="mb-6 shadow-card overflow-hidden">
          <div className="bg-gradient-hero p-6 text-primary-foreground">
            <p className="text-xs uppercase tracking-wider text-gold">Lição atual · {format(new Date(current.lesson_date), "PPP", { locale: ptBR })}</p>
            <h2 className="mt-2 text-2xl font-semibold">{current.title}</h2>
            {current.reference && <p className="mt-1 text-sm text-primary-foreground/85">{current.reference}</p>}
          </div>
          <CardContent className="p-6">
            {current.content && <p className="whitespace-pre-wrap text-sm leading-relaxed">{current.content}</p>}
            {Array.isArray(current.daily_readings) && current.daily_readings.length > 0 && (
              <div className="mt-4 rounded-lg border bg-muted/40 p-4">
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><CalendarDays className="h-4 w-4 text-primary" /> Leitura diária</p>
                <ul className="space-y-1 text-sm">
                  {(current.daily_readings as { day: string; reading: string }[]).map((r, i) => (
                    <li key={i}><span className="font-medium">{r.day}:</span> <span className="text-muted-foreground">{r.reading}</span></li>
                  ))}
                </ul>
              </div>
            )}
            {current.notice && (
              <div className="mt-4 rounded-lg border-l-4 border-gold bg-gold/10 p-3 text-sm">
                <p className="font-semibold text-gold">Aviso</p>
                <p className="mt-1 text-muted-foreground">{current.notice}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> Histórico de lições</CardTitle>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {(lessons ?? []).slice(1).map((l) => (
            <div key={l.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{l.title}</p>
                {l.reference && <p className="text-xs text-muted-foreground">{l.reference}</p>}
              </div>
              <p className="text-xs text-muted-foreground">{format(new Date(l.lesson_date), "PPP", { locale: ptBR })}</p>
            </div>
          ))}
          {(!lessons || lessons.length === 0) && (
            <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma lição cadastrada.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
