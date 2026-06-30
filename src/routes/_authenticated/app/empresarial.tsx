import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Briefcase, Phone, Mail, Globe, Instagram, MapPin, MessageCircle,
  Plus, Edit2, Trash2, CheckCircle2, XCircle, Clock, Search, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/empresarial")({
  component: EmpresarialPage,
});

type Listing = {
  id: string;
  user_id: string;
  congregation_id: string | null;
  nome: string;
  profissao: string;
  categoria: string | null;
  descricao: string;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  endereco: string | null;
  foto_url: string | null;
  status: "pendente" | "aprovado" | "rejeitado";
  rejection_reason: string | null;
  created_at: string;
};

const CATEGORIAS = [
  "Tecnologia", "Construção e Reformas", "Saúde", "Educação",
  "Beleza e Estética", "Alimentação", "Comércio", "Serviços Domésticos",
  "Transporte", "Eventos", "Consultoria", "Jurídico", "Financeiro", "Outros",
];

function EmpresarialPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const canModerate =
    profile?.isSedeAdmin ||
    profile?.isCongregacaoAdmin ||
    profile?.roles?.includes("secretario");

  return (
    <div>
      <PageHeader
        title="Empresarial"
        description="Divulgue seu trabalho para a comunidade. Cadastros passam por aprovação."
      />
      <Tabs defaultValue="diretorio" className="w-full">
        <TabsList>
          <TabsTrigger value="diretorio" className="gap-2">
            <Briefcase className="h-4 w-4" /> Diretório
          </TabsTrigger>
          <TabsTrigger value="meus" className="gap-2">
            <Edit2 className="h-4 w-4" /> Meus Anúncios
          </TabsTrigger>
          {canModerate && (
            <TabsTrigger value="moderacao" className="gap-2">
              <ShieldCheck className="h-4 w-4" /> Moderação
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="diretorio" className="mt-6">
          <Diretorio />
        </TabsContent>
        <TabsContent value="meus" className="mt-6">
          <MeusAnuncios userId={user?.id} congregationId={profile?.profile?.congregation_id ?? null} />
        </TabsContent>
        {canModerate && (
          <TabsContent value="moderacao" className="mt-6">
            <Moderacao />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function Diretorio() {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<string>("todas");

  const { data, isLoading } = useQuery({
    queryKey: ["business_listings", "aprovados"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_listings")
        .select("*")
        .eq("status", "aprovado")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Listing[];
    },
  });

  const filtered = useMemo(() => {
    const term = busca.trim().toLowerCase();
    return (data ?? []).filter((l) => {
      if (categoria !== "todas" && l.categoria !== categoria) return false;
      if (!term) return true;
      return [l.nome, l.profissao, l.categoria, l.descricao]
        .filter(Boolean)
        .some((s) => s!.toLowerCase().includes(term));
    });
  }, [data, busca, categoria]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, profissão ou descrição…"
            className="pl-9"
          />
        </div>
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="todas">Todas as categorias</option>
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum anúncio aprovado encontrado.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}

function ListingCard({ listing: l }: { listing: Listing }) {
  return (
    <Card className="overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          {l.foto_url ? (
            <img src={l.foto_url} alt={l.nome} className="h-12 w-12 rounded-full object-cover" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Briefcase className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold">{l.nome}</h3>
            <p className="truncate text-sm text-muted-foreground">{l.profissao}</p>
            {l.categoria && (
              <Badge variant="secondary" className="mt-1 text-[10px]">{l.categoria}</Badge>
            )}
          </div>
        </div>
        <p className="mt-3 line-clamp-3 text-sm text-foreground/80">{l.descricao}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {l.whatsapp && (
            <a
              href={`https://wa.me/${l.whatsapp.replace(/\D/g, "")}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md bg-green-500/10 px-2 py-1 text-xs text-green-700 hover:bg-green-500/20 dark:text-green-400"
            >
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </a>
          )}
          {l.telefone && (
            <a href={`tel:${l.telefone}`} className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs hover:bg-secondary/70">
              <Phone className="h-3.5 w-3.5" /> {l.telefone}
            </a>
          )}
          {l.email && (
            <a href={`mailto:${l.email}`} className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs hover:bg-secondary/70">
              <Mail className="h-3.5 w-3.5" /> E-mail
            </a>
          )}
          {l.website && (
            <a href={l.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs hover:bg-secondary/70">
              <Globe className="h-3.5 w-3.5" /> Site
            </a>
          )}
          {l.instagram && (
            <a
              href={l.instagram.startsWith("http") ? l.instagram : `https://instagram.com/${l.instagram.replace(/^@/, "")}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs hover:bg-secondary/70"
            >
              <Instagram className="h-3.5 w-3.5" /> Instagram
            </a>
          )}
        </div>
        {l.endereco && (
          <p className="mt-3 flex items-start gap-1 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {l.endereco}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function MeusAnuncios({ userId, congregationId }: { userId: string | undefined; congregationId: string | null }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Listing | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["business_listings", "meus", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_listings")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Listing[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("business_listings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Anúncio excluído.");
      qc.invalidateQueries({ queryKey: ["business_listings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button
          onClick={() => { setEditing(null); setOpen(true); }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" /> Novo Anúncio
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (data ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Você ainda não cadastrou nenhum anúncio. Clique em "Novo Anúncio" para começar.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data!.map((l) => (
            <Card key={l.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{l.nome}</h3>
                    <p className="truncate text-sm text-muted-foreground">{l.profissao}</p>
                  </div>
                  <StatusBadge status={l.status} />
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-foreground/80">{l.descricao}</p>
                {l.status === "rejeitado" && l.rejection_reason && (
                  <p className="mt-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                    <strong>Motivo:</strong> {l.rejection_reason}
                  </p>
                )}
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline" className="gap-1"
                    onClick={() => { setEditing(l); setOpen(true); }}>
                    <Edit2 className="h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-1 text-destructive"
                    onClick={() => { if (confirm("Excluir este anúncio?")) del.mutate(l.id); }}>
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ListingFormDialog
        open={open}
        onOpenChange={setOpen}
        listing={editing}
        userId={userId}
        congregationId={congregationId}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: Listing["status"] }) {
  if (status === "aprovado")
    return <Badge className="gap-1 bg-green-500/15 text-green-700 hover:bg-green-500/20 dark:text-green-400"><CheckCircle2 className="h-3 w-3" /> Aprovado</Badge>;
  if (status === "rejeitado")
    return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Rejeitado</Badge>;
  return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pendente</Badge>;
}

function ListingFormDialog({
  open, onOpenChange, listing, userId, congregationId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  listing: Listing | null;
  userId: string | undefined;
  congregationId: string | null;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nome: "", profissao: "", categoria: "", descricao: "",
    telefone: "", whatsapp: "", email: "", website: "", instagram: "", endereco: "", foto_url: "",
  });

  // sync when listing changes
  useMemo(() => {
    if (listing) {
      setForm({
        nome: listing.nome ?? "",
        profissao: listing.profissao ?? "",
        categoria: listing.categoria ?? "",
        descricao: listing.descricao ?? "",
        telefone: listing.telefone ?? "",
        whatsapp: listing.whatsapp ?? "",
        email: listing.email ?? "",
        website: listing.website ?? "",
        instagram: listing.instagram ?? "",
        endereco: listing.endereco ?? "",
        foto_url: listing.foto_url ?? "",
      });
    } else {
      setForm({
        nome: "", profissao: "", categoria: "", descricao: "",
        telefone: "", whatsapp: "", email: "", website: "", instagram: "", endereco: "", foto_url: "",
      });
    }
  }, [listing, open]);

  const save = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Usuário não autenticado.");
      if (!form.nome.trim() || !form.profissao.trim() || !form.descricao.trim())
        throw new Error("Nome, profissão e descrição são obrigatórios.");

      const payload = {
        nome: form.nome.trim(),
        profissao: form.profissao.trim(),
        categoria: form.categoria || null,
        descricao: form.descricao.trim(),
        telefone: form.telefone || null,
        whatsapp: form.whatsapp || null,
        email: form.email || null,
        website: form.website || null,
        instagram: form.instagram || null,
        endereco: form.endereco || null,
        foto_url: form.foto_url || null,
      };

      if (listing) {
        const { error } = await supabase
          .from("business_listings").update(payload).eq("id", listing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("business_listings").insert({
          ...payload, user_id: userId, congregation_id: congregationId,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(listing ? "Anúncio atualizado. Aguarda nova aprovação." : "Anúncio enviado para aprovação!");
      qc.invalidateQueries({ queryKey: ["business_listings"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{listing ? "Editar Anúncio" : "Novo Anúncio"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Nome / Empresa *</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} maxLength={120} />
          </div>
          <div>
            <Label>Profissão / Serviço *</Label>
            <Input value={form.profissao} onChange={(e) => setForm({ ...form, profissao: e.target.value })} maxLength={120} />
          </div>
          <div>
            <Label>Categoria</Label>
            <select
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Selecione…</option>
              {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label>Descrição *</Label>
            <Textarea
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              rows={4} maxLength={1000}
              placeholder="Conte sobre seu trabalho, experiência e diferenciais…"
            />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(11) 99999-9999" />
          </div>
          <div>
            <Label>WhatsApp</Label>
            <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="5511999999999" />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label>Site</Label>
            <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://…" />
          </div>
          <div>
            <Label>Instagram</Label>
            <Input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} placeholder="@usuario" />
          </div>
          <div>
            <Label>Endereço</Label>
            <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label>URL da foto / logo</Label>
            <Input value={form.foto_url} onChange={(e) => setForm({ ...form, foto_url: e.target.value })} placeholder="https://…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Moderacao() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"pendente" | "aprovado" | "rejeitado" | "todos">("pendente");
  const [rejecting, setRejecting] = useState<Listing | null>(null);
  const [reason, setReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["business_listings", "moderacao", filter],
    queryFn: async () => {
      let q = supabase.from("business_listings").select("*").order("created_at", { ascending: false });
      if (filter !== "todos") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return data as Listing[];
    },
  });

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("business_listings").update({
        status: "aprovado", approved_by: user?.id, approved_at: new Date().toISOString(), rejection_reason: null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Anúncio aprovado.");
      qc.invalidateQueries({ queryKey: ["business_listings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      const { error } = await supabase.from("business_listings").update({
        status: "rejeitado", rejection_reason: motivo, approved_by: user?.id, approved_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Anúncio rejeitado.");
      qc.invalidateQueries({ queryKey: ["business_listings"] });
      setRejecting(null); setReason("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {(["pendente", "aprovado", "rejeitado", "todos"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (data ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum anúncio neste filtro.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data!.map((l) => (
            <Card key={l.id}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{l.nome}</h3>
                      <StatusBadge status={l.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">{l.profissao} {l.categoria && `· ${l.categoria}`}</p>
                    <p className="mt-2 text-sm">{l.descricao}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {l.telefone && <span>📞 {l.telefone}</span>}
                      {l.whatsapp && <span>💬 {l.whatsapp}</span>}
                      {l.email && <span>✉️ {l.email}</span>}
                      {l.website && <span>🌐 {l.website}</span>}
                      {l.instagram && <span>📷 {l.instagram}</span>}
                      {l.endereco && <span>📍 {l.endereco}</span>}
                    </div>
                    {l.rejection_reason && (
                      <p className="mt-2 text-xs text-destructive">Motivo da rejeição: {l.rejection_reason}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {l.status !== "aprovado" && (
                      <Button size="sm" onClick={() => approve.mutate(l.id)} className="gap-1">
                        <CheckCircle2 className="h-4 w-4" /> Aprovar
                      </Button>
                    )}
                    {l.status !== "rejeitado" && (
                      <Button size="sm" variant="outline" onClick={() => { setRejecting(l); setReason(""); }} className="gap-1">
                        <XCircle className="h-4 w-4" /> Rejeitar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!rejecting} onOpenChange={(o) => { if (!o) { setRejecting(null); setReason(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar anúncio</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo. O autor poderá ver e corrigir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Motivo da rejeição…"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={!reason.trim() || reject.isPending}
              onClick={() => rejecting && reject.mutate({ id: rejecting.id, motivo: reason.trim() })}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
