import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import {
  Heart, HandHeart, Sparkles, ShieldAlert, Trash2, Check, X, Plus, Search, Flame,
  MessageCircleHeart, Clock, User as UserIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { z } from "zod";

export const Route = createFileRoute("/_authenticated/app/mural-oracao")({
  component: MuralOracaoPage,
});

type PostRow = {
  id: string;
  congregation_id: string;
  user_id: string;
  tipo: "pedido" | "testemunho";
  titulo: string;
  mensagem: string;
  is_anonymous: boolean;
  is_urgent: boolean;
  status: "pendente" | "aprovado" | "rejeitado";
  rejection_reason: string | null;
  created_at: string;
  approved_at: string | null;
};

type PostWithAuthor = PostRow & {
  author_name?: string | null;
  congregation_name?: string | null;
  intercessions_count: number;
  user_has_prayed: boolean;
};

const postSchema = z.object({
  tipo: z.enum(["pedido", "testemunho"]),
  titulo: z.string().trim().min(3, "Título muito curto").max(120),
  mensagem: z.string().trim().min(10, "Compartilhe um pouco mais").max(2000),
  is_anonymous: z.boolean(),
  is_urgent: z.boolean(),
});

function MuralOracaoPage() {
  const { user } = useAuth();
  const { data: userProfile } = useProfile(user?.id);
  const isModerator = Boolean(
    userProfile?.isSedeAdmin ||
    userProfile?.roles.includes("admin_congregacao") ||
    userProfile?.roles.includes("secretario"),
  );

  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("mural");
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState<"todos" | "pedido" | "testemunho">("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rejectDialog, setRejectDialog] = useState<{ id: string; open: boolean }>({ id: "", open: false });
  const [rejectReason, setRejectReason] = useState("");

  async function loadPosts() {
    setLoading(true);
    const { data: postsData, error } = await supabase
      .from("prayer_posts")
      .select("*, profiles:user_id(full_name), congregations(name)")
      .order("is_urgent", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar mural: " + error.message);
      setLoading(false);
      return;
    }

    const postIds = (postsData ?? []).map((p: any) => p.id);
    const { data: intercessions } = postIds.length
      ? await supabase.from("prayer_intercessions").select("post_id, user_id").in("post_id", postIds)
      : { data: [] as any[] };

    const counts = new Map<string, number>();
    const userSet = new Set<string>();
    for (const i of intercessions ?? []) {
      counts.set(i.post_id, (counts.get(i.post_id) ?? 0) + 1);
      if (i.user_id === user?.id) userSet.add(i.post_id);
    }

    setPosts(
      (postsData ?? []).map((p: any) => ({
        ...p,
        author_name: p.profiles?.full_name ?? null,
        congregation_name: p.congregations?.name ?? null,
        intercessions_count: counts.get(p.id) ?? 0,
        user_has_prayed: userSet.has(p.id),
      })),
    );
    setLoading(false);
  }

  useEffect(() => {
    if (!user) return;
    loadPosts();

    const channel = supabase
      .channel("mural-oracao")
      .on("postgres_changes", { event: "*", schema: "public", table: "prayer_posts" }, (payload) => {
        loadPosts();
        if (
          payload.eventType === "UPDATE" &&
          (payload.new as any).status === "aprovado" &&
          (payload.old as any).status !== "aprovado" &&
          (payload.new as any).user_id !== user.id
        ) {
          const p = payload.new as any;
          toast(p.tipo === "testemunho" ? "🙌 Novo testemunho no mural" : "🙏 Novo pedido de oração", {
            description: p.titulo,
          });
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "prayer_intercessions" }, () => {
        loadPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const approvedPosts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return posts.filter((p) => {
      if (p.status !== "aprovado") return false;
      if (filterTipo !== "todos" && p.tipo !== filterTipo) return false;
      if (!term) return true;
      return (
        p.titulo.toLowerCase().includes(term) ||
        p.mensagem.toLowerCase().includes(term) ||
        (p.author_name ?? "").toLowerCase().includes(term)
      );
    });
  }, [posts, search, filterTipo]);

  const myPosts = useMemo(() => posts.filter((p) => p.user_id === user?.id), [posts, user?.id]);
  const pendingPosts = useMemo(() => posts.filter((p) => p.status === "pendente"), [posts]);

  const stats = useMemo(() => ({
    pedidos: approvedPosts.filter((p) => p.tipo === "pedido").length,
    testemunhos: approvedPosts.filter((p) => p.tipo === "testemunho").length,
    urgentes: approvedPosts.filter((p) => p.is_urgent).length,
    pendentes: pendingPosts.length,
  }), [approvedPosts, pendingPosts]);

  async function handlePray(post: PostWithAuthor) {
    if (!user) return;
    if (post.user_has_prayed) {
      const { error } = await supabase
        .from("prayer_intercessions")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", user.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase
        .from("prayer_intercessions")
        .insert({ post_id: post.id, user_id: user.id });
      if (error) return toast.error(error.message);
      toast.success("🙏 Que Deus abençoe!", { description: "Seu apoio foi registrado." });
    }
  }

  async function handleApprove(id: string) {
    const { error } = await supabase.from("prayer_posts").update({ status: "aprovado" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Post aprovado");
  }

  async function handleReject() {
    const { error } = await supabase
      .from("prayer_posts")
      .update({ status: "rejeitado", rejection_reason: rejectReason.trim() || null })
      .eq("id", rejectDialog.id);
    if (error) return toast.error(error.message);
    toast.success("Post rejeitado");
    setRejectDialog({ id: "", open: false });
    setRejectReason("");
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("prayer_posts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removido");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mural de Oração"
        description="Pedidos, testemunhos e intercessão em comunhão."
        icon={HandHeart}
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Compartilhar
              </Button>
            </DialogTrigger>
            <PostDialog
              onClose={() => setDialogOpen(false)}
              congregationId={userProfile?.profile?.congregation_id}
              userId={user?.id}
              isModerator={isModerator}
            />
          </Dialog>
        }
      />

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pedidos" value={stats.pedidos} icon={HandHeart} tone="rose" />
        <StatCard label="Testemunhos" value={stats.testemunhos} icon={Sparkles} tone="amber" />
        <StatCard label="Urgentes" value={stats.urgentes} icon={Flame} tone="red" />
        {isModerator && (
          <StatCard label="Aguardando aprovação" value={stats.pendentes} icon={Clock} tone="blue" />
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="mural">
            <HandHeart className="mr-2 h-4 w-4" /> Mural
          </TabsTrigger>
          <TabsTrigger value="meus">
            <UserIcon className="mr-2 h-4 w-4" /> Meus posts
          </TabsTrigger>
          {isModerator && (
            <TabsTrigger value="moderacao">
              <ShieldAlert className="mr-2 h-4 w-4" /> Moderação
              {pendingPosts.length > 0 && (
                <Badge variant="destructive" className="ml-2">{pendingPosts.length}</Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="mural" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por título ou mensagem..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterTipo === "todos" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterTipo("todos")}
              >Todos</Button>
              <Button
                variant={filterTipo === "pedido" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterTipo("pedido")}
              >Pedidos</Button>
              <Button
                variant={filterTipo === "testemunho" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterTipo("testemunho")}
              >Testemunhos</Button>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : approvedPosts.length === 0 ? (
            <EmptyState
              icon={HandHeart}
              title="Ainda sem posts"
              description="Seja o primeiro a compartilhar um pedido de oração ou testemunho."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {approvedPosts.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  isOwner={p.user_id === user?.id}
                  isModerator={isModerator}
                  onPray={() => handlePray(p)}
                  onDelete={() => handleDelete(p.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="meus" className="space-y-4">
          {myPosts.length === 0 ? (
            <EmptyState
              icon={MessageCircleHeart}
              title="Você ainda não compartilhou nada"
              description="Clique em 'Compartilhar' para publicar um pedido ou testemunho."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {myPosts.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  isOwner
                  isModerator={isModerator}
                  onPray={() => handlePray(p)}
                  onDelete={() => handleDelete(p.id)}
                  showStatus
                />
              ))}
            </div>
          )}
        </TabsContent>

        {isModerator && (
          <TabsContent value="moderacao" className="space-y-4">
            {pendingPosts.length === 0 ? (
              <EmptyState
                icon={Check}
                title="Nenhum post pendente"
                description="Tudo em dia por aqui."
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {pendingPosts.map((p) => (
                  <Card key={p.id} className="border-blue-500/40">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={p.tipo === "testemunho" ? "default" : "secondary"}>
                              {p.tipo === "testemunho" ? "Testemunho" : "Pedido"}
                            </Badge>
                            {p.is_urgent && (
                              <Badge variant="destructive">
                                <Flame className="mr-1 h-3 w-3" /> Urgente
                              </Badge>
                            )}
                            {p.is_anonymous && <Badge variant="outline">Anônimo</Badge>}
                          </div>
                          <CardTitle className="mt-2 text-base">{p.titulo}</CardTitle>
                          <CardDescription className="mt-1 text-xs">
                            Por {p.author_name ?? "Desconhecido"}
                            {p.congregation_name ? ` • ${p.congregation_name}` : ""}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-4 whitespace-pre-wrap text-sm text-muted-foreground">{p.mensagem}</p>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => handleApprove(p.id)}>
                          <Check className="mr-1 h-4 w-4" /> Aprovar
                        </Button>
                        <AlertDialog
                          open={rejectDialog.open && rejectDialog.id === p.id}
                          onOpenChange={(open) => setRejectDialog({ id: open ? p.id : "", open })}
                        >
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <X className="mr-1 h-4 w-4" /> Rejeitar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Rejeitar post</AlertDialogTitle>
                              <AlertDialogDescription>
                                Informe (opcionalmente) o motivo para o autor.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <Textarea
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder="Motivo (opcional)"
                              maxLength={500}
                            />
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setRejectReason("")}>
                                Cancelar
                              </AlertDialogCancel>
                              <AlertDialogAction onClick={handleReject}>Rejeitar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(p.id)}>
                          <Trash2 className="mr-1 h-4 w-4" /> Excluir
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function StatCard({
  label, value, icon: Icon, tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: "rose" | "amber" | "red" | "blue";
}) {
  const toneMap = {
    rose: "text-rose-500",
    amber: "text-amber-500",
    red: "text-red-500",
    blue: "text-blue-500",
  } as const;
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`rounded-lg bg-muted p-2 ${toneMap[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  icon: Icon, title, description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <div className="rounded-full bg-muted p-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function PostCard({
  post, isOwner, isModerator, onPray, onDelete, showStatus,
}: {
  post: PostWithAuthor;
  isOwner: boolean;
  isModerator: boolean;
  onPray: () => void;
  onDelete: () => void;
  showStatus?: boolean;
}) {
  const author = post.is_anonymous && !isOwner && !isModerator
    ? "Anônimo"
    : post.author_name ?? "Membro";
  const relative = formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR });

  return (
    <Card className={post.is_urgent ? "border-red-500/50" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={post.tipo === "testemunho" ? "default" : "secondary"}>
                {post.tipo === "testemunho" ? (
                  <>
                    <Sparkles className="mr-1 h-3 w-3" /> Testemunho
                  </>
                ) : (
                  <>
                    <HandHeart className="mr-1 h-3 w-3" /> Pedido
                  </>
                )}
              </Badge>
              {post.is_urgent && (
                <Badge variant="destructive">
                  <Flame className="mr-1 h-3 w-3" /> Urgente
                </Badge>
              )}
              {showStatus && (
                <Badge
                  variant={
                    post.status === "aprovado" ? "default"
                      : post.status === "rejeitado" ? "destructive"
                      : "outline"
                  }
                >
                  {post.status === "aprovado" ? "Aprovado"
                    : post.status === "rejeitado" ? "Rejeitado"
                    : "Pendente"}
                </Badge>
              )}
            </div>
            <CardTitle className="mt-2 text-base leading-snug">{post.titulo}</CardTitle>
            <CardDescription className="mt-1 flex flex-wrap items-center gap-x-2 text-xs">
              <span className="truncate">{author}</span>
              {post.congregation_name && <span>• {post.congregation_name}</span>}
              <span>• {relative}</span>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-4 whitespace-pre-wrap text-sm leading-relaxed">{post.mensagem}</p>
        {post.status === "rejeitado" && post.rejection_reason && (
          <p className="mb-3 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
            <strong>Motivo:</strong> {post.rejection_reason}
          </p>
        )}
        <div className="flex items-center justify-between">
          <Button
            size="sm"
            variant={post.user_has_prayed ? "default" : "outline"}
            onClick={onPray}
            disabled={post.status !== "aprovado"}
            className={post.user_has_prayed ? "bg-rose-500 hover:bg-rose-600" : ""}
          >
            <Heart className={`mr-2 h-4 w-4 ${post.user_has_prayed ? "fill-current" : ""}`} />
            {post.user_has_prayed ? "Orando" : "Estou orando"}
            {post.intercessions_count > 0 && (
              <span className="ml-2 rounded-full bg-background/20 px-2 py-0.5 text-xs">
                {post.intercessions_count}
              </span>
            )}
          </Button>
          {(isOwner || isModerator) && (
            <Button size="sm" variant="ghost" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PostDialog({
  onClose, congregationId, userId, isModerator,
}: {
  onClose: () => void;
  congregationId: string | null | undefined;
  userId: string | undefined;
  isModerator: boolean;
}) {
  const [tipo, setTipo] = useState<"pedido" | "testemunho">("pedido");
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!userId || !congregationId) {
      toast.error("Perfil sem congregação associada.");
      return;
    }
    const parsed = postSchema.safeParse({ tipo, titulo, mensagem, is_anonymous: isAnonymous, is_urgent: isUrgent });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("prayer_posts").insert({
      user_id: userId,
      congregation_id: congregationId,
      ...parsed.data,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success(
      isModerator
        ? "Publicado no mural"
        : "Enviado para aprovação",
      { description: isModerator ? undefined : "Um moderador irá revisar em breve." },
    );
    setTitulo("");
    setMensagem("");
    setIsAnonymous(false);
    setIsUrgent(false);
    onClose();
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Compartilhar no mural</DialogTitle>
        <DialogDescription>
          Publique um pedido de oração ou um testemunho de gratidão.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Tipo</Label>
          <RadioGroup value={tipo} onValueChange={(v) => setTipo(v as any)} className="flex gap-4">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="pedido" id="tipo-pedido" />
              <Label htmlFor="tipo-pedido" className="cursor-pointer">Pedido de oração</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="testemunho" id="tipo-testemunho" />
              <Label htmlFor="tipo-testemunho" className="cursor-pointer">Testemunho</Label>
            </div>
          </RadioGroup>
        </div>
        <div className="space-y-2">
          <Label htmlFor="titulo">Título</Label>
          <Input
            id="titulo"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex: Pela saúde da minha mãe"
            maxLength={120}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mensagem">Mensagem</Label>
          <Textarea
            id="mensagem"
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            rows={5}
            maxLength={2000}
            placeholder="Compartilhe o que está no seu coração..."
          />
          <p className="text-xs text-muted-foreground">{mensagem.length}/2000</p>
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label htmlFor="anon" className="cursor-pointer">Publicar anonimamente</Label>
            <p className="text-xs text-muted-foreground">Seu nome ficará oculto para os demais membros.</p>
          </div>
          <Switch id="anon" checked={isAnonymous} onCheckedChange={setIsAnonymous} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label htmlFor="urg" className="cursor-pointer">Marcar como urgente</Label>
            <p className="text-xs text-muted-foreground">Aparece em destaque no topo do mural.</p>
          </div>
          <Switch id="urg" checked={isUrgent} onCheckedChange={setIsUrgent} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={submit} disabled={submitting}>
          {submitting ? "Enviando..." : "Publicar"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
