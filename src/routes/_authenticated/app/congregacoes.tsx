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
import { Switch } from "@/components/ui/switch";
import { Plus, MapPin, Phone, Crown } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/congregacoes")({
  component: Congregacoes,
});

function Congregacoes() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", address: "", city: "", state: "SP", zip_code: "", phone: "",
    lead_pastor: "", assistant_pastors: "", service_schedule: "", is_headquarters: false,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["congregations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("congregations").select("*").order("is_headquarters", { ascending: false }).order("name");
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const schedule = form.service_schedule
        .split("\n").map((l) => l.trim()).filter(Boolean).map((line) => ({ description: line }));
      const { error } = await supabase.from("congregations").insert({
        name: form.name,
        address: form.address,
        city: form.city,
        state: form.state,
        zip_code: form.zip_code,
        phone: form.phone,
        lead_pastor: form.lead_pastor,
        assistant_pastors: form.assistant_pastors,
        service_schedule: schedule,
        is_headquarters: form.is_headquarters,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Congregação cadastrada!");
      qc.invalidateQueries({ queryKey: ["congregations"] });
      setOpen(false);
      setForm({ name: "", address: "", city: "", state: "SP", zip_code: "", phone: "", lead_pastor: "", assistant_pastors: "", service_schedule: "", is_headquarters: false });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Congregações"
        description="Cadastro de congregações do Setor 70."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Nova congregação</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Nova congregação</DialogTitle></DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Nome</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Endereço</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="space-y-2"><Label>Cidade</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                <div className="space-y-2"><Label>Estado</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
                <div className="space-y-2"><Label>CEP</Label><Input value={form.zip_code} onChange={(e) => setForm({ ...form, zip_code: e.target.value })} /></div>
                <div className="space-y-2"><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="space-y-2 sm:col-span-2"><Label>Pastor responsável</Label><Input value={form.lead_pastor} onChange={(e) => setForm({ ...form, lead_pastor: e.target.value })} /></div>
                <div className="space-y-2 sm:col-span-2"><Label>Pastores auxiliares</Label><Input value={form.assistant_pastors} onChange={(e) => setForm({ ...form, assistant_pastors: e.target.value })} /></div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Horários de cultos (uma linha por horário)</Label>
                  <Textarea rows={4} placeholder="Domingo 19h - Culto de celebração&#10;Quarta 20h - Estudo bíblico"
                    value={form.service_schedule} onChange={(e) => setForm({ ...form, service_schedule: e.target.value })} />
                </div>
                <div className="flex items-center gap-3 sm:col-span-2">
                  <Switch id="hq" checked={form.is_headquarters} onCheckedChange={(v) => setForm({ ...form, is_headquarters: v })} />
                  <Label htmlFor="hq">Congregação sede</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={() => create.mutate()} disabled={create.isPending || !form.name}>
                  {create.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {data?.length === 0 && (
          <Card className="md:col-span-2 xl:col-span-3 shadow-card">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma congregação cadastrada. Comece criando a sede.
            </CardContent>
          </Card>
        )}
        {data?.map((c) => (
          <Card key={c.id} className="shadow-card transition hover:-translate-y-0.5">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-semibold">{c.name}</h3>
                {c.is_headquarters && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-gold px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold-foreground">
                    <Crown className="h-3 w-3" /> Sede
                  </span>
                )}
              </div>
              {c.lead_pastor && <p className="mt-1 text-sm text-muted-foreground">Pr. {c.lead_pastor}</p>}
              {(c.address || c.city) && (
                <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{[c.address, c.city, c.state].filter(Boolean).join(", ")}</span>
                </p>
              )}
              {c.phone && (
                <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" /> {c.phone}
                </p>
              )}
              {Array.isArray(c.service_schedule) && c.service_schedule.length > 0 && (
                <div className="mt-3 rounded-lg bg-muted/60 p-3 text-xs">
                  <p className="mb-1 font-semibold">Cultos</p>
                  <ul className="space-y-0.5 text-muted-foreground">
                    {(c.service_schedule as { description: string }[]).map((s, i) => (
                      <li key={i}>• {s.description}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
