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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, MapPin, Phone, Crown, Search, MoreVertical, Pencil, Trash2, Users, Church,
  Copy, ExternalLink, Calendar, UserCircle2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/congregacoes")({
  component: Congregacoes,
});

type FormState = {
  name: string; address: string; city: string; state: string; zip_code: string;
  phone: string; lead_pastor: string; assistant_pastors: string;
  service_schedule: string; is_headquarters: boolean;
};

const emptyForm: FormState = {
  name: "", address: "", city: "", state: "SP", zip_code: "", phone: "",
  lead_pastor: "", assistant_pastors: "", service_schedule: "", is_headquarters: false,
};

function Congregacoes() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"todas" | "sede" | "congregacoes">("todas");

  const { data, isLoading } = useQuery({
    queryKey: ["congregations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("congregations")
        .select("*")
        .order("is_headquarters", { ascending: false })
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: memberCounts } = useQuery({
    queryKey: ["congregations", "member-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("members").select("congregation_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const m of data ?? []) {
        if (m.congregation_id) counts[m.congregation_id] = (counts[m.congregation_id] ?? 0) + 1;
      }
      return counts;
    },
  });

  const upsert = useMutation({
    mutationFn: async () => {
      const schedule = form.service_schedule
        .split("\n").map((l) => l.trim()).filter(Boolean).map((line) => ({ description: line }));
      const payload = {
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
      };
      if (editId) {
        const { error } = await supabase.from("congregations").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("congregations").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "Congregação atualizada!" : "Congregação cadastrada!");
      qc.invalidateQueries({ queryKey: ["congregations"] });
      closeDialog();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("congregations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Congregação removida");
      qc.invalidateQueries({ queryKey: ["congregations"] });
      setDeleteId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openCreate() {
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(c: NonNullable<typeof data>[number]) {
    setEditId(c.id);
    const schedule = Array.isArray(c.service_schedule)
      ? (c.service_schedule as { description: string }[]).map((s) => s.description).join("\n")
      : "";
    setForm({
      name: c.name ?? "",
      address: c.address ?? "",
      city: c.city ?? "",
      state: c.state ?? "SP",
      zip_code: c.zip_code ?? "",
      phone: c.phone ?? "",
      lead_pastor: c.lead_pastor ?? "",
      assistant_pastors: c.assistant_pastors ?? "",
      service_schedule: schedule,
      is_headquarters: !!c.is_headquarters,
    });
    setOpen(true);
  }

  function closeDialog() {
    setOpen(false);
    setEditId(null);
    setForm(emptyForm);
  }

  const filtered = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    return data.filter((c) => {
      if (filter === "sede" && !c.is_headquarters) return false;
      if (filter === "congregacoes" && c.is_headquarters) return false;
      if (!term) return true;
      return [c.name, c.city, c.lead_pastor, c.address]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(term));
    });
  }, [data, search, filter]);

  const totals = useMemo(() => {
    const list = data ?? [];
    const sede = list.filter((c) => c.is_headquarters).length;
    const totalMembers = Object.values(memberCounts ?? {}).reduce((a, b) => a + b, 0);
    return { total: list.length, sede, congregacoes: list.length - sede, totalMembers };
  }, [data, memberCounts]);

  return (
    <div>
      <PageHeader
        title="Congregações"
        description="Cadastro de congregações do Setor 70."
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Nova congregação
          </Button>
        }
      />

      {/* Stats */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Church className="h-4 w-4" />} label="Total" value={totals.total} />
        <StatCard icon={<Crown className="h-4 w-4" />} label="Sede" value={totals.sede} accent />
        <StatCard icon={<Church className="h-4 w-4" />} label="Congregações" value={totals.congregacoes} />
        <StatCard icon={<Users className="h-4 w-4" />} label="Membros" value={totals.totalMembers} />
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, cidade, pastor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            <TabsTrigger value="todas">Todas</TabsTrigger>
            <TabsTrigger value="sede">Sede</TabsTrigger>
            <TabsTrigger value="congregacoes">Congregações</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isLoading &&
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="shadow-card">
              <CardContent className="space-y-3 p-5">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}

        {!isLoading && filtered.length === 0 && (
          <Card className="shadow-card md:col-span-2 xl:col-span-3">
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
              <div className="rounded-full bg-muted p-3">
                <Church className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">
                  {data?.length === 0 ? "Nenhuma congregação cadastrada" : "Nenhum resultado encontrado"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {data?.length === 0
                    ? "Comece criando a sede do Setor 70."
                    : "Tente ajustar a busca ou os filtros."}
                </p>
              </div>
              {data?.length === 0 && (
                <Button size="sm" onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" /> Cadastrar primeira
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {filtered.map((c) => {
          const members = memberCounts?.[c.id] ?? 0;
          const fullAddress = [c.address, c.city, c.state].filter(Boolean).join(", ");
          const mapsUrl = fullAddress
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`
            : null;
          return (
            <Card
              key={c.id}
              className={`group relative overflow-hidden shadow-card transition hover:-translate-y-0.5 hover:shadow-lg ${
                c.is_headquarters ? "border-amber-500/40" : ""
              }`}
            >
              {c.is_headquarters && (
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-gold" />
              )}
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-lg font-semibold">{c.name}</h3>
                      {c.is_headquarters && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-gold px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold-foreground">
                          <Crown className="h-3 w-3" /> Sede
                        </span>
                      )}
                    </div>
                    {c.lead_pastor && (
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <UserCircle2 className="h-3.5 w-3.5" /> Pr. {c.lead_pastor}
                      </p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(c)}>
                        <Pencil className="mr-2 h-4 w-4" /> Editar
                      </DropdownMenuItem>
                      {c.phone && (
                        <DropdownMenuItem
                          onClick={() => {
                            navigator.clipboard.writeText(c.phone!);
                            toast.success("Telefone copiado");
                          }}
                        >
                          <Copy className="mr-2 h-4 w-4" /> Copiar telefone
                        </DropdownMenuItem>
                      )}
                      {mapsUrl && (
                        <DropdownMenuItem asChild>
                          <a href={mapsUrl} target="_blank" rel="noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" /> Abrir no mapa
                          </a>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteId(c.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <Users className="h-3 w-3" /> {members} {members === 1 ? "membro" : "membros"}
                  </Badge>
                  {Array.isArray(c.service_schedule) && c.service_schedule.length > 0 && (
                    <Badge variant="outline" className="gap-1">
                      <Calendar className="h-3 w-3" /> {c.service_schedule.length} cultos
                    </Badge>
                  )}
                </div>

                {fullAddress && (
                  <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span className="line-clamp-2">{fullAddress}</span>
                  </p>
                )}
                {c.phone && (
                  <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" /> {c.phone}
                  </p>
                )}

                {Array.isArray(c.service_schedule) && c.service_schedule.length > 0 && (
                  <div className="mt-3 rounded-lg bg-muted/60 p-3 text-xs">
                    <p className="mb-1 font-semibold">Horários</p>
                    <ul className="space-y-0.5 text-muted-foreground">
                      {(c.service_schedule as { description: string }[]).slice(0, 3).map((s, i) => (
                        <li key={i}>• {s.description}</li>
                      ))}
                      {c.service_schedule.length > 3 && (
                        <li className="text-[11px] italic">
                          +{c.service_schedule.length - 3} outros
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : closeDialog())}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar congregação" : "Nova congregação"}</DialogTitle>
            <DialogDescription>
              Preencha as informações da congregação. Campos com * são obrigatórios.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Nome *</Label>
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
              <Textarea
                rows={4}
                placeholder={"Domingo 19h - Culto de celebração\nQuarta 20h - Estudo bíblico"}
                value={form.service_schedule}
                onChange={(e) => setForm({ ...form, service_schedule: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3 sm:col-span-2">
              <Switch id="hq" checked={form.is_headquarters} onCheckedChange={(v) => setForm({ ...form, is_headquarters: v })} />
              <div className="flex-1">
                <Label htmlFor="hq" className="cursor-pointer">Congregação sede</Label>
                <p className="text-xs text-muted-foreground">Marque se esta é a sede do setor.</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={() => upsert.mutate()} disabled={upsert.isPending || !form.name.trim()}>
              {upsert.isPending ? "Salvando..." : editId ? "Atualizar" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir congregação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Membros vinculados podem ficar sem congregação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && remove.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({
  icon, label, value, accent,
}: { icon: React.ReactNode; label: string; value: number; accent?: boolean }) {
  return (
    <Card className={`shadow-card ${accent ? "border-amber-500/40" : ""}`}>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
        <div className={`rounded-lg p-2 ${accent ? "bg-gradient-gold text-gold-foreground" : "bg-muted text-muted-foreground"}`}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
