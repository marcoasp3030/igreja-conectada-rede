import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Heart, Package, Users, HandHelping, Megaphone, Calendar, Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import * as fns from "@/lib/mao-amiga.functions";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { FamiliaDialog } from "@/components/mao-amiga/familia-dialog";
import { DoacaoDialog } from "@/components/mao-amiga/doacao-dialog";
import { EntregaDialog } from "@/components/mao-amiga/entrega-dialog";
import { useProfile } from "@/hooks/use-profile";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/mao-amiga")({
  component: MaoAmigaPage,
});

function MaoAmigaPage() {
  const queryClient = useQueryClient();
  const { data: userProfile } = useProfile(undefined); // Current user profile
  
  const [isFamiliaDialogOpen, setIsFamiliaDialogOpen] = useState(false);
  const [isDoacaoDialogOpen, setIsDoacaoDialogOpen] = useState(false);
  const [isEntregaDialogOpen, setIsEntregaDialogOpen] = useState(false);

  const getStats = useServerFn(fns.getMaoAmigaStats);
  const listDoadores = useServerFn(fns.listDoadores);
  const listDoacoes = useServerFn(fns.listDoacoes);
  const listEstoque = useServerFn(fns.listEstoque);
  const listFamilias = useServerFn(fns.listFamilias);
  const listEntregas = useServerFn(fns.listEntregas);
  const listCampanhas = useServerFn(fns.listCampanhas);
  const listAvisos = useServerFn(fns.listAvisos);
  const listCategorias = useServerFn(fns.listCategorias);

  const createFamiliaFn = useServerFn(fns.createFamilia);
  const createDoacaoFn = useServerFn(fns.createDoacao);
  const createEntregaFn = useServerFn(fns.createEntrega);

  const { data: stats } = useQuery({
    queryKey: ["mao-amiga-stats"],
    queryFn: () => getStats(),
  });

  const { data: doadores = [] } = useQuery({
    queryKey: ["mao-amiga-doadores"],
    queryFn: () => listDoadores(),
  });

  const { data: doacoes = [] } = useQuery({
    queryKey: ["mao-amiga-doacoes"],
    queryFn: () => listDoacoes(),
  });

  const { data: estoque = [] } = useQuery({
    queryKey: ["mao-amiga-estoque"],
    queryFn: () => listEstoque(),
  });

  const { data: familias = [] } = useQuery({
    queryKey: ["mao-amiga-familias"],
    queryFn: () => listFamilias(),
  });

  const { data: entregas = [] } = useQuery({
    queryKey: ["mao-amiga-entregas"],
    queryFn: () => listEntregas(),
  });

  const { data: campanhas = [] } = useQuery({
    queryKey: ["mao-amiga-campanhas"],
    queryFn: () => listCampanhas(),
  });

  const { data: avisos = [] } = useQuery({
    queryKey: ["mao-amiga-avisos"],
    queryFn: () => listAvisos(),
  });

  const { data: categorias = [] } = useQuery({
    queryKey: ["mao-amiga-categorias"],
    queryFn: () => listCategorias(),
  });

  const createFamiliaMutation = useMutation({
    mutationFn: createFamiliaFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mao-amiga-familias"] });
      queryClient.invalidateQueries({ queryKey: ["mao-amiga-stats"] });
      setIsFamiliaDialogOpen(false);
      toast.success("Família cadastrada com sucesso!");
    },
    onError: (error) => toast.error("Erro ao cadastrar família: " + error.message),
  });

  const createDoacaoMutation = useMutation({
    mutationFn: createDoacaoFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mao-amiga-doacoes"] });
      queryClient.invalidateQueries({ queryKey: ["mao-amiga-estoque"] });
      queryClient.invalidateQueries({ queryKey: ["mao-amiga-stats"] });
      setIsDoacaoDialogOpen(false);
      toast.success("Doação registrada com sucesso!");
    },
    onError: (error) => toast.error("Erro ao registrar doação: " + error.message),
  });

  const createEntregaMutation = useMutation({
    mutationFn: createEntregaFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mao-amiga-entregas"] });
      queryClient.invalidateQueries({ queryKey: ["mao-amiga-estoque"] });
      queryClient.invalidateQueries({ queryKey: ["mao-amiga-stats"] });
      setIsEntregaDialogOpen(false);
      toast.success("Entrega registrada com sucesso!");
    },
    onError: (error) => toast.error("Erro ao registrar entrega: " + error.message),
  });

  const handleCreateFamilia = (data: any) => {
    if (!userProfile?.profile?.congregation_id) {
        toast.error("Congregação não identificada.");
        return;
    }
    createFamiliaMutation.mutate({ data: { ...data, congregation_id: userProfile.profile.congregation_id } });
  };

  const handleCreateDoacao = (data: any) => {
    if (!userProfile?.profile?.congregation_id) {
        toast.error("Congregação não identificada.");
        return;
    }
    createDoacaoMutation.mutate({ data: { ...data, congregation_id: userProfile.profile.congregation_id } });
  };

  const handleCreateEntrega = (data: any) => {
    if (!userProfile?.profile?.congregation_id) {
        toast.error("Congregação não identificada.");
        return;
    }
    createEntregaMutation.mutate({ data: { ...data, congregation_id: userProfile.profile.congregation_id } });
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Mão Amiga" 
        description="Gestão de doações e assistência social — Ministério do Setor 70." 
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Doações no mês", value: stats?.totalDoacoes ?? 0, icon: Heart, color: "text-red-500 bg-red-50 dark:bg-red-950/20" },
          { label: "Itens em Estoque", value: stats?.totalItensEstoque ?? 0, icon: Package, color: "text-blue-500 bg-blue-50 dark:bg-blue-950/20" },
          { label: "Famílias Assistidas", value: stats?.totalFamilias ?? 0, icon: Users, color: "text-green-500 bg-green-50 dark:bg-green-950/20" },
          { label: "Entregas Realizadas", value: stats?.totalEntregas ?? 0, icon: HandHelping, color: "text-purple-500 bg-purple-50 dark:bg-purple-950/20" },
        ].map((item) => (
          <Card key={item.label} className="shadow-card border-none">
            <CardContent className="flex items-center gap-4 p-6">
              <div className={`p-3 rounded-xl ${item.color}`}>
                <item.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none">{item.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto bg-transparent border-b rounded-none h-auto p-0 gap-6">
          {["dashboard", "doacoes", "estoque", "familias", "entregas", "campanhas", "avisos"].map(t => (
            <TabsTrigger 
              key={t}
              value={t} 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-2 capitalize font-medium"
            >
              {t === "doacoes" ? "Doações" : t === "familias" ? "Famílias" : t}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="lg:col-span-2 shadow-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" /> Campanhas Ativas
                </CardTitle>
                <Button variant="ghost" size="sm">Ver todas</Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {campanhas.filter(c => c.status === "ativo").length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma campanha ativa no momento.</p>
                ) : (
                  campanhas.filter(c => c.status === "ativo").map(c => (
                    <div key={c.id} className="p-4 rounded-lg border bg-muted/30">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{c.titulo}</h4>
                        <Badge variant="outline" className="capitalize">{c.tipo.replace("_", " ")}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{c.descricao}</p>
                      <div className="flex justify-between text-xs text-primary font-medium">
                        <span>Meta: {c.meta || "N/A"}</span>
                        <span>{c.starts_at ? format(new Date(c.starts_at), "dd/MM") : ""} - {c.ends_at ? format(new Date(c.ends_at), "dd/MM") : ""}</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-red-500" /> Avisos Urgentes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {avisos.filter(a => a.urgente).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Nenhum aviso urgente.</p>
                ) : (
                  avisos.filter(a => a.urgente).map(a => (
                    <div key={a.id} className="p-3 rounded-lg border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/10">
                      <h4 className="font-medium text-sm text-red-700 dark:text-red-400">{a.titulo}</h4>
                      <p className="text-xs text-red-600 dark:text-red-500 mt-1">{a.mensagem}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="doacoes" className="mt-6">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Registro de Doações</CardTitle>
              <Button size="sm" onClick={() => setIsDoacaoDialogOpen(true)}><Plus className="h-4 w-4 mr-2" /> Nova Doação</Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Doador</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {doacoes.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma doação registrada.</TableCell></TableRow>
                    ) : (
                      doacoes.map((d: any) => (
                        <TableRow key={d.id}>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(d.data_doacao), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell className="font-medium">{d.mao_amiga_doadores?.nome}</TableCell>
                          <TableCell><Badge variant="outline">{d.mao_amiga_categorias?.nome}</Badge></TableCell>
                          <TableCell className="text-sm">{d.descricao}</TableCell>
                          <TableCell className="text-right font-medium">{Number(d.quantidade)} {d.unidade}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="estoque" className="mt-6">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Estoque por Congregação</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-2" /> Ajustar Estoque</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Quantidade Atual</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {estoque.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Estoque vazio.</TableCell></TableRow>
                    ) : (
                      estoque.map((e: any) => (
                        <TableRow key={e.id}>
                          <TableCell><Badge variant="outline">{e.mao_amiga_categorias?.nome}</Badge></TableCell>
                          <TableCell className="font-medium">{e.descricao}</TableCell>
                          <TableCell className="text-right font-bold text-primary">{Number(e.quantidade)} {e.unidade}</TableCell>
                          <TableCell className="text-center">
                            {Number(e.quantidade) <= 0 ? (
                              <Badge variant="destructive">Esgotado</Badge>
                            ) : Number(e.quantidade) < 5 ? (
                              <Badge variant="outline" className="text-orange-500 border-orange-500">Baixo</Badge>
                            ) : (
                              <Badge variant="outline" className="text-green-500 border-green-500">Ok</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="familias" className="mt-6">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Famílias Assistidas</CardTitle>
              <Button size="sm" onClick={() => setIsFamiliaDialogOpen(true)}><Plus className="h-4 w-4 mr-2" /> Cadastrar Família</Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Necessidade</TableHead>
                      <TableHead className="text-center">Pessoas</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {familias.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma família cadastrada.</TableCell></TableRow>
                    ) : (
                      familias.map((f: any) => (
                        <TableRow key={f.id}>
                          <TableCell>
                            <div className="font-medium">{f.nome_responsavel}</div>
                            <div className="text-xs text-muted-foreground">{f.telefone || "Sem telefone"}</div>
                          </TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">{f.necessidade_principal || "Não informada"}</TableCell>
                          <TableCell className="text-center">{f.qtd_pessoas}</TableCell>
                          <TableCell>
                            <Badge variant={f.ativo ? "default" : "secondary"}>{f.ativo ? "Ativo" : "Inativo"}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                             <Button variant="ghost" size="sm">Histórico</Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entregas" className="mt-6">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Registro de Entregas</CardTitle>
              <Button size="sm" onClick={() => setIsEntregaDialogOpen(true)}><Plus className="h-4 w-4 mr-2" /> Registrar Entrega</Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Beneficiado</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entregas.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhuma entrega registrada.</TableCell></TableRow>
                    ) : (
                      entregas.map((e: any) => (
                        <TableRow key={e.id}>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(e.data_entrega), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell className="font-medium">{e.mao_amiga_familias?.nome_responsavel}</TableCell>
                          <TableCell className="text-sm">{e.descricao}</TableCell>
                          <TableCell className="text-right font-medium">{Number(e.quantidade)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <FamiliaDialog 
        open={isFamiliaDialogOpen} 
        onOpenChange={setIsFamiliaDialogOpen} 
        onSubmit={handleCreateFamilia}
        isLoading={createFamiliaMutation.isPending}
      />

      <DoacaoDialog
        open={isDoacaoDialogOpen}
        onOpenChange={setIsDoacaoDialogOpen}
        onSubmit={handleCreateDoacao}
        isLoading={createDoacaoMutation.isPending}
        doadores={doadores}
        categorias={categorias}
      />

      <EntregaDialog
        open={isEntregaDialogOpen}
        onOpenChange={setIsEntregaDialogOpen}
        onSubmit={handleCreateEntrega}
        isLoading={createEntregaMutation.isPending}
        familias={familias}
        categorias={categorias}
      />
    </div>
  );
}
