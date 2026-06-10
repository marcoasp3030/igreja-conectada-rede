import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { 
  Plus, BookOpen, CalendarDays, Users, GraduationCap, 
  CheckCircle2, XCircle, AlertCircle, Filter, Search,
  ArrowRight, ClipboardList, TrendingUp, History
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/app/ebd")({
  component: EBD,
});

function EBD() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedCongregation, setSelectedCongregation] = useState<string>("all");
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [selectedClassForAttendance, setSelectedClassForAttendance] = useState<string | null>(null);
  const [attendanceData, setAttendanceData] = useState<Record<string, { present: boolean; justification: string }>>({});

  
  // Queries
  const { data: congregations } = useQuery({
    queryKey: ["congregations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("congregations").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: classes } = useQuery({
    queryKey: ["ebd-classes", selectedCongregation],
    queryFn: async () => {
      let query = supabase.from("ebd_classes").select(`
        *,
        congregation:congregations(name),
        teacher:profiles!ebd_classes_teacher_id_fkey(full_name),
        assistant:profiles!ebd_classes_assistant_id_fkey(full_name)
      `);
      
      if (selectedCongregation !== "all") {
        query = query.eq("congregation_id", selectedCongregation);
      }
      
      const { data, error } = await query.order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["ebd-stats", selectedCongregation],
    queryFn: async () => {
      let enrollQuery = supabase.from("ebd_enrollments").select("id", { count: "exact" });
      if (selectedCongregation !== "all") {
        enrollQuery = enrollQuery.eq("congregation_id", selectedCongregation);
      }
      const { count: totalStudents } = await enrollQuery;

      // Simplificando stats para MVP
      return {
        totalStudents: totalStudents || 0,
        activeClasses: classes?.length || 0,
        averageAttendance: "85%", // Mock para o dashboard
        visitorsThisMonth: 12,    // Mock para o dashboard
      };
    },
    enabled: !!classes,
  });

  const { data: students } = useQuery({
    queryKey: ["ebd-enrollments", selectedClassForAttendance],
    queryFn: async () => {
      if (!selectedClassForAttendance) return [];
      const { data, error } = await supabase
        .from("ebd_enrollments")
        .select("*")
        .eq("class_id", selectedClassForAttendance)
        .eq("status", "ativo");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedClassForAttendance,
  });

  const saveAttendance = useMutation({
    mutationFn: async () => {
      if (!selectedClassForAttendance) return;
      
      const { data: session, error: sessionError } = await supabase
        .from("ebd_attendance_sessions")
        .insert({
          class_id: selectedClassForAttendance,
          lesson_date: new Date().toISOString().split("T")[0],
          lesson_title: "Chamada Rápida",
        })
        .select()
        .single();
        
      if (sessionError) throw sessionError;

      const records = Object.entries(attendanceData).map(([enrollmentId, data]) => ({
        session_id: session.id,
        enrollment_id: enrollmentId,
        present: data.present,
        justification: data.justification || null,
      }));

      const { error: recordsError } = await supabase
        .from("ebd_attendance_records")
        .insert(records);
        
      if (recordsError) throw recordsError;
    },
    onSuccess: () => {
      toast.success("Presença registrada com sucesso!");
      setAttendanceDialogOpen(false);
      setAttendanceData({});
      qc.invalidateQueries({ queryKey: ["ebd-stats"] });
    },
    onError: (e: Error) => toast.error("Erro ao salvar: " + e.message),
  });

  const togglePresence = (studentId: string) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: {
        present: !prev[studentId]?.present,
        justification: prev[studentId]?.justification || ""
      }
    }));
  };

  const setJustification = (studentId: string, justification: string) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        justification
      }
    }));
  };


  return (
    <div className="space-y-6">
      <PageHeader
        title="Escola Bíblica Dominical"
        description="Gestão de classes, alunos e presenças da EBD."
        actions={
          <div className="flex items-center gap-3">
            <Select value={selectedCongregation} onValueChange={setSelectedCongregation}>
              <SelectTrigger className="w-[200px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Congregação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Congregações</SelectItem>
                {congregations?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Nova Classe
            </Button>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="dashboard" className="gap-2"><TrendingUp className="h-4 w-4" /> Dashboard</TabsTrigger>
          <TabsTrigger value="classes" className="gap-2"><Users className="h-4 w-4" /> Classes</TabsTrigger>
          <TabsTrigger value="students" className="gap-2"><GraduationCap className="h-4 w-4" /> Alunos</TabsTrigger>
          <TabsTrigger value="attendance" className="gap-2"><ClipboardList className="h-4 w-4" /> Presença</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total de Alunos</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalStudents}</div>
                <p className="text-xs text-muted-foreground">Matriculados ativos</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Classes Ativas</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.activeClasses}</div>
                <p className="text-xs text-muted-foreground">Turmas em funcionamento</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Freq. Média</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats?.averageAttendance}</div>
                <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Visitantes</CardTitle>
                <Plus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">+{stats?.visitorsThisMonth}</div>
                <p className="text-xs text-muted-foreground">Novos este mês</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><History className="h-5 w-5 text-primary" /> Últimas Aulas</CardTitle>
                <CardDescription>Resumo das lições ministradas recentemente.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Mock data for visualization */}
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-1">
                      <p className="font-medium">Lição {10 + i}: A Graça de Deus</p>
                      <p className="text-xs text-muted-foreground">Classe: Adultos · 08/06/2026</p>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">92% Presença</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /> Próxima Aula</CardTitle>
                <CardDescription>Prepare-se para o próximo domingo.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl bg-gradient-hero p-6 text-white">
                  <p className="text-xs font-medium uppercase tracking-wider text-gold">14 de Junho, 2026</p>
                  <h3 className="mt-2 text-xl font-bold">A Importância da Oração</h3>
                  <p className="mt-1 text-sm opacity-90">Referência: 1 Tessalonicenses 5:17</p>
                  <Button variant="secondary" size="sm" className="mt-4 gap-2">
                    Ver Material <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Dialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Lançamento Rápido de Presença</DialogTitle>
                <CardDescription>Registre quem compareceu à aula hoje.</CardDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {students?.map((student) => {
                  const data = attendanceData[student.id] || { present: true, justification: "" };
                  return (
                    <div key={student.id} className="flex flex-col gap-2 rounded-lg border p-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-white ${data.present ? 'bg-primary' : 'bg-destructive'}`}>
                            {student.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{student.full_name}</p>
                            <p className="text-xs text-muted-foreground">{student.phone || "Sem telefone"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant={data.present ? "default" : "outline"}
                            size="sm"
                            className="gap-1 h-9"
                            onClick={() => togglePresence(student.id)}
                          >
                            <CheckCircle2 className="h-4 w-4" /> Presente
                          </Button>
                          <Button 
                            variant={!data.present ? "destructive" : "outline"}
                            size="sm"
                            className="gap-1 h-9"
                            onClick={() => togglePresence(student.id)}
                          >
                            <XCircle className="h-4 w-4" /> Falta
                          </Button>
                        </div>
                      </div>
                      
                      {!data.present && (
                        <div className="mt-1 flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                          <AlertCircle className="h-4 w-4 text-destructive" />
                          <Input 
                            placeholder="Justificativa da falta..." 
                            className="h-8 text-xs"
                            value={data.justification}
                            onChange={(e) => setJustification(student.id, e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
                {(!students || students.length === 0) && (
                  <div className="py-10 text-center text-muted-foreground">
                    Carregando alunos ou nenhum aluno matriculado nesta classe.
                  </div>
                )}
              </div>

              <DialogFooter className="sticky bottom-0 bg-background pt-2">
                <Button variant="outline" onClick={() => setAttendanceDialogOpen(false)}>Cancelar</Button>
                <Button 
                  onClick={() => saveAttendance.mutate()} 
                  disabled={saveAttendance.isPending}
                  className="gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {saveAttendance.isPending ? "Salvando..." : "Confirmar Chamada"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>


        <TabsContent value="classes">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {classes?.map((cls) => (
              <Card key={cls.id} className="overflow-hidden shadow-card transition-all hover:shadow-md">
                <div className="h-2 bg-primary" />
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{cls.category}</Badge>
                    <p className="text-xs text-muted-foreground">{cls.congregation?.name}</p>
                  </div>
                  <CardTitle className="mt-2">{cls.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Professor:</span>
                      <span className="font-medium">{cls.teacher?.full_name || "Não definido"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Auxiliar:</span>
                      <span className="font-medium">{cls.assistant?.full_name || "-"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Total Alunos:</span>
                      <span className="font-medium">24</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">Gerenciar</Button>
                    <Button 
                      size="sm" 
                      className="flex-1 gap-1"
                      onClick={() => {
                        setSelectedClassForAttendance(cls.id);
                        setAttendanceDialogOpen(true);
                      }}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Presença
                    </Button>
                  </div>

                </CardContent>
              </Card>
            ))}
            <Button variant="outline" className="h-auto min-h-[200px] border-dashed flex-col gap-2">
              <Plus className="h-8 w-8 text-muted-foreground" />
              <span className="font-medium text-muted-foreground">Adicionar Classe</span>
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="students">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Listagem de Alunos</CardTitle>
                  <CardDescription>Gerencie as matrículas e dados dos alunos da EBD.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar aluno..." className="w-[250px] pl-8" />
                  </div>
                  <Button size="sm">Matricular Aluno</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="border-b text-left font-medium">
                      <th className="p-4">Nome</th>
                      <th className="p-4">Classe</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Congregação</th>
                      <th className="p-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr className="hover:bg-muted/50 transition-colors">
                      <td className="p-4 font-medium">João Silva dos Santos</td>
                      <td className="p-4">Adultos - Manhã</td>
                      <td className="p-4"><Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Ativo</Badge></td>
                      <td className="p-4 text-muted-foreground">Sede</td>
                      <td className="p-4 text-right">
                        <Button variant="ghost" size="sm">Editar</Button>
                      </td>
                    </tr>
                    <tr className="hover:bg-muted/50 transition-colors">
                      <td className="p-4 font-medium">Maria Oliveira</td>
                      <td className="p-4">Crianças (4-6 anos)</td>
                      <td className="p-4"><Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">Visitante</Badge></td>
                      <td className="p-4 text-muted-foreground">Betel</td>
                      <td className="p-4 text-right">
                        <Button variant="ghost" size="sm">Editar</Button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
           <Card>
            <CardHeader>
              <CardTitle>Lançamento de Presença</CardTitle>
              <CardDescription>Selecione a classe e a data para registrar a frequência.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Classe</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a classe" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes?.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data da Aula</Label>
                  <Input type="date" defaultValue={new Date().toISOString().split("T")[0]} />
                </div>
                <div className="flex items-end">
                  <Button className="w-full gap-2"><ClipboardList className="h-4 w-4" /> Iniciar Chamada</Button>
                </div>
              </div>

              <div className="rounded-xl border bg-muted/30 p-8 text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
                <h3 className="mt-4 text-lg font-medium">Nenhuma classe selecionada</h3>
                <p className="mt-1 text-sm text-muted-foreground">Selecione uma classe acima para visualizar a lista de alunos e realizar a chamada.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
