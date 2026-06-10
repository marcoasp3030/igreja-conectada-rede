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
import { Switch } from "@/components/ui/switch";
import { Plus, Megaphone, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/app/avisos")({
  component: Avisos,
});

function Avisos() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const empty = { title: "", body: "", priority: "normal", congregation_id: "", is_global: false };
  const [form, setForm] = useState(empty);

  const { data: congregations } = useQuery({
    queryKey: ["congregations-list"],
    queryFn: async () => (await supabase.from("congregations").select("id, name").order("name")).data ?? [],
  });

  const { data: items } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements").select("*, congregations(name)").order("published_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("announcements").insert({
        title: form.title,
        body: form.body,
        priority: form.priority,
        congregation_id: form.congregation_id || null,
        is_global: form.is_global,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aviso publicado!");
      qc.invalidateQueries({ queryKey: ["announcements"] });
      setOpen(false);
      setForm(empty);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Avisos e Notificações"
        description="Comunicados publicados para a igreja."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Novo aviso</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo aviso</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2"><Label>Título</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div className="space-y-2"><Label>Mensagem</Label>
                  <Textarea rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2"><Label>Prioridade</Label>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="importante">Importante</SelectItem>
                        <SelectItem value="urgente">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Congregação</Label>
                    <Select value={form.congregation_id || undefined} onValueChange={(v) => setForm({ ...form, congregation_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                      <SelectContent>{congregations?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch id="global" checked={form.is_global} onCheckedChange={(v) => setForm({ ...form, is_global: v })} />
                  <Label htmlFor="global">Enviar para todas as congregações</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={() => create.mutate()} disabled={create.isPending || !form.title || !form.body}>
                  {create.isPending ? "Publicando..." : "Publicar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="space-y-3">
        {items?.length === 0 && (
          <Card className="shadow-card"><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhum aviso publicado.</CardContent></Card>
        )}
        {items?.map((a) => {
          const urgent = a.priority === "urgente";
          const important = a.priority === "importante";
          return (
            <Card key={a.id} className={`shadow-card ${urgent ? "border-destructive/40" : ""}`}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${urgent ? "bg-destructive text-destructive-foreground" : important ? "bg-gradient-gold text-gold-foreground" : "bg-gradient-hero text-primary-foreground"}`}>
                    {urgent ? <AlertTriangle className="h-5 w-5" /> : <Megaphone className="h-5 w-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{a.title}</h3>
                      {a.is_global && <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase text-secondary-foreground">Geral</span>}
                      {urgent && <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-destructive">Urgente</span>}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
                    <p className="mt-3 text-[11px] text-muted-foreground">
                      {format(new Date(a.published_at), "PPP 'às' HH:mm", { locale: ptBR })}
                      {(a as { congregations?: { name?: string } }).congregations?.name &&
                        ` · ${(a as { congregations?: { name?: string } }).congregations?.name}`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
