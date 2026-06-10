import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, Users2, Calendar, Search, Filter, CheckCircle2, 
  XCircle, Clock, Bell, Settings, ArrowRightLeft, UserPlus
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

import * as functions from "@/lib/escalas.functions";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";

export const Route = createFileRoute("/_authenticated/app/escalas")({
  component: Escalas,
});

function Escalas() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const [activeTab, setActiveTab] = useState("calendar");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCong, setFilterCong] = useState("all");
  const [filterRole, setFilterRole] = useState("all");

  // Dialog states
  const [volunteerDialogOpen, setVolunteerDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  
  // Queries
  const { data: congregations } = useQuery({
    queryKey: ["congregations-list"],
    queryFn: async () => (await functions.getVolunteers({ congregationId: "" })).map(v => v.congregations).filter((v, i, a) => a.findIndex(t => t?.name === v?.name) === i)
  });

  const { data: roles } = useQuery({
    queryKey: ["ministry-roles"],
    queryFn: () => functions.getMinistryRoles()
  });

  const { data: volunteers } = useQuery({
    queryKey: ["volunteers", filterCong],
    queryFn: () => functions.getVolunteers({ congregationId: filterCong === "all" ? undefined : filterCong })
  });

  const { data: schedules } = useQuery({
    queryKey: ["event-schedules", filterCong],
    queryFn: () => functions.getEventSchedules({ congregationId: filterCong === "all" ? undefined : filterCong })
  });

  const { data: pendingApprovals } = useQuery({
    queryKey: ["pending-approvals"],
    queryFn: () => functions.getPendingApprovals()
  });

  // Volunteer Form State
  const [volunteerForm, setVolunteerForm] = useState({
    name: "", phone: "", congregation_id: "", role_ids: [] as string[], notes: ""
  });

  const saveVolunteer = useMutation({
    mutationFn: (data: any) => functions.upsertVolunteer(data),
    onSuccess: () => {
      toast.success("Voluntário salvo com sucesso!");
      qc.invalidateQueries({ queryKey: ["volunteers"] });
      setVolunteerDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message)
  });

  const updateStatus = useMutation({
    mutationFn: (data: any) => functions.updateAssignmentStatus(data),
    onSuccess: () => {
      toast.success("Status atualizado!");
      qc.invalidateQueries({ queryKey: ["event-schedules"] });
      qc.invalidateQueries({ queryKey: ["pending-approvals"] });
    },
    onError: (e: any) => toast.error(e.message)
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Escalas Ministeriais"
        description="Organização de voluntários e escalas para cultos e eventos."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="relative">
              <Bell className="h-4 w-4" />
              {pendingApprovals && pendingApprovals.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white">
                  {pendingApprovals.length}
                </span>
              )}
            </Button>
            <Button onClick={() => setVolunteerDialogOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" /> Novo Voluntário
            </Button>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:grid-cols-5">
          <TabsTrigger value="calendar" className="gap-2"><Calendar className="h-4 w-4" /> Agenda</TabsTrigger>
          <TabsTrigger value="volunteers" className="gap-2"><Users2 className="h-4 w-4" /> Voluntários</TabsTrigger>
          <TabsTrigger value="active" className="gap-2"><Clock className="h-4 w-4" /> Escalas</TabsTrigger>
          {profile?.isCongregacaoAdmin && (
            <TabsTrigger value="approvals" className="gap-2"><CheckCircle2 className="h-4 w-4" /> Aprovações</TabsTrigger>
          )}
          {profile?.isSedeAdmin && (
            <TabsTrigger value="sede" className="gap-2"><Settings className="h-4 w-4" /> Painel Sede</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Agenda de Eventos</CardTitle>
                <CardDescription>Eventos que necessitam de escala.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border">
                  {schedules?.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between py-4">
                      <div>
                        <h4 className="font-semibold">{s.events.title}</h4>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>{format(new Date(s.events.starts_at), "PPP p", { locale: ptBR })}</span>
                          <span>{s.congregations?.name}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => {
                        setSelectedEvent(s);
                        setAssignmentDialogOpen(true);
                      }}>Gerenciar Escala</Button>
                    </div>
                  ))}
                  {(!schedules || schedules.length === 0) && (
                    <div className="py-8 text-center text-muted-foreground">Nenhuma escala cadastrada.</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Visão Rápida</CardTitle>
                <CardDescription>Resumo das próximas escalas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-muted p-4">
                  <div className="text-2xl font-bold">{schedules?.length || 0}</div>
                  <div className="text-sm text-muted-foreground">Escalas ativas este mês</div>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <div className="text-2xl font-bold">{pendingApprovals?.length || 0}</div>
                  <div className="text-sm text-muted-foreground">Solicitações aguardando sua aprovação</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="volunteers" className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nome ou função..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterCong} onValueChange={setFilterCong}>
              <SelectTrigger className="w-[200px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filtrar Congregação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {/* Aqui viria o mapeamento real das congregações */}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {volunteers?.filter(v => v.name.toLowerCase().includes(searchTerm.toLowerCase())).map((v: any) => (
              <Card key={v.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                      {v.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-semibold">{v.name}</h4>
                      <p className="text-xs text-muted-foreground">{v.congregations?.name}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {v.ministry_roles?.map((r: any) => (
                      <Badge key={r.id} variant="secondary" className="text-[10px]">{r.name}</Badge>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <p>Disponibilidade: {v.availability || "Não informada"}</p>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">Ver Perfil</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="approvals" className="space-y-4">
          <div className="grid gap-4">
            {pendingApprovals?.map((a: any) => (
              <Card key={a.id} className="border-l-4 border-l-amber-500">
                <CardContent className="flex items-center justify-between p-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-lg">{a.volunteers.name}</h4>
                      <Badge variant="outline" className="gap-1">
                        <ArrowRightLeft className="h-3 w-3" /> Solicitação Externa
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">
                      Solicitado para ser <span className="text-foreground font-semibold">{a.ministry_roles.name}</span> no evento:
                    </p>
                    <p className="font-semibold text-primary">{a.event_schedules.events.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Congregação Solicitante: {a.event_schedules.congregations.name}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => updateStatus.mutate({ id: a.id, status: "recusado" })}>
                      <XCircle className="mr-2 h-4 w-4" /> Recusar
                    </Button>
                    <Button className="bg-green-600 hover:bg-green-700" onClick={() => updateStatus.mutate({ id: a.id, status: "aprovado" })}>
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Aprovar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!pendingApprovals || pendingApprovals.length === 0) && (
              <div className="py-12 text-center text-muted-foreground">
                <CheckCircle2 className="mx-auto h-12 w-12 opacity-20 mb-4" />
                <p>Nenhuma aprovação pendente para sua congregação.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Volunteer Form Dialog */}
      <Dialog open={volunteerDialogOpen} onOpenChange={setVolunteerDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Voluntário</DialogTitle>
            <DialogDescription>Cadastre pessoas disponíveis para servir.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input 
                value={volunteerForm.name} 
                onChange={(e) => setVolunteerForm({...volunteerForm, name: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input 
                value={volunteerForm.phone} 
                onChange={(e) => setVolunteerForm({...volunteerForm, phone: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Funções Ministeriais</Label>
              <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto p-2 border rounded-md">
                {roles?.map((r) => (
                  <div key={r.id} className="flex items-center gap-2">
                    <Checkbox 
                      id={r.id} 
                      checked={volunteerForm.role_ids.includes(r.id)}
                      onCheckedChange={(checked) => {
                        if (checked) setVolunteerForm({...volunteerForm, role_ids: [...volunteerForm.role_ids, r.id]})
                        else setVolunteerForm({...volunteerForm, role_ids: volunteerForm.role_ids.filter(id => id !== r.id)})
                      }}
                    />
                    <Label htmlFor={r.id} className="text-sm cursor-pointer">{r.name}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações / Disponibilidade</Label>
              <Textarea 
                value={volunteerForm.notes} 
                onChange={(e) => setVolunteerForm({...volunteerForm, notes: e.target.value})} 
                placeholder="Ex: Disponível apenas aos domingos."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVolunteerDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveVolunteer.mutate({
              ...volunteerForm,
              congregation_id: profile?.congregation_id
            })}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
