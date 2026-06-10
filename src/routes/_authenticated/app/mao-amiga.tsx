import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import * as fns from "@/lib/mao-amiga.functions";

export const Route = createFileRoute("/_authenticated/app/mao-amiga")({
  component: MaoAmigaPage,
});

function MaoAmigaPage() {
  const getStats = useServerFn(fns.getMaoAmigaStats);
  const { data: stats } = useQuery({
    queryKey: ["mao-amiga-stats"],
    queryFn: () => getStats(),
  });

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Mão Amiga" 
        description="Gestão de doações e assistência social." 
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Doações no mês</div>
            <div className="text-2xl font-bold">{stats?.totalDoacoes ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Itens em Estoque</div>
            <div className="text-2xl font-bold">{stats?.totalItensEstoque ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Famílias Assistidas</div>
            <div className="text-2xl font-bold">{stats?.totalFamilias ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Entregas Realizadas</div>
            <div className="text-2xl font-bold">{stats?.totalEntregas ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="doacoes">Doações</TabsTrigger>
          <TabsTrigger value="estoque">Estoque</TabsTrigger>
          <TabsTrigger value="familias">Famílias</TabsTrigger>
          <TabsTrigger value="entregas">Entregas</TabsTrigger>
          <TabsTrigger value="campanhas">Campanhas</TabsTrigger>
          <TabsTrigger value="avisos">Avisos</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-4">
            <Card><CardContent className="p-6">Conteúdo do Dashboard...</CardContent></Card>
        </TabsContent>
        {/* Adicionar outros conteúdos conforme necessidade */}
      </Tabs>
    </div>
  );
}
