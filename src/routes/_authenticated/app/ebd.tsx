import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  Plus, BookOpen, CalendarDays, Users, GraduationCap,
  CheckCircle2, XCircle, AlertCircle, Filter, Search,
  ClipboardList, TrendingUp, Trash2, Pencil
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/app/ebd")({
  component: EBD,
});

type ClassCategory = "Adultos" | "Crianças" | "Jovens" | "Homens" | "Mulheres";
type StudentStatus = "ativo" | "visitante" | "transferido" | "inativo";

const statusColors: Record<StudentStatus, string> = {
  ativo: "bg-green-100 text-green-700 border-none",
  visitante: "bg-blue-100 text-blue-700 border-none",
  transferido: "bg-amber-100 text-amber-700 border-none",
  inativo: "bg-gray-100 text-gray-700 border-none",
};

function EBD() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedCongregation, setSelectedCongregation] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Dialog states
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [selectedClassForAttendance, setSelectedClassForAttendance] = useState<string | null>(null);
  const [attendanceData, setAttendanceData] = useState<Record<string, { present: boolean; justification: string }>>({});
  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [editingStudent, setEditingStudent] = useState<any>(null);

  // Attendance tab launcher
  const [attClassId, setAttClassId] = useState<string>("");
  const [attDate, setAttDate] = useState(new Date().toISOString().split("T")[0]);

  const [newClass, setNewClass] = useState({
    name: "",
    category: "Adultos" as ClassCategory,
    congregation_id: "",
  });
  const [newStudent, setNewStudent] = useState({
    full_name: "",
    phone: "",
    birth_date: "",
    address: "",
    guardian_name: "",
    class_id: "",
    status: "ativo" as StudentStatus,
  });

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
        congregation:congregations(name)
      `);
      if (selectedCongregation !== "all") {
        query = query.eq("congregation_id", selectedCongregation);
      }
      const { data, error } = await query.order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: allEnrollments } = useQuery({
    queryKey: ["ebd-all-enrollments", selectedCongregation],
    queryFn: async () => {
      let query = supabase.from("ebd_enrollments").select(`
        *,
        class:ebd_classes(name, category),
        congregation:congregations(name)
      `);
      if (selectedCongregation !== "all") {
        query = query.eq("congregation_id", selectedCongregation);
      }
      const { data, error } = await query.order("full_name");
      if (error) throw error;
      return data;
    },
  });

  // Students for attendance dialog
  const { data: students } = useQuery({
    queryKey: ["ebd-enrollments", selectedClassForAttendance],
    queryFn: async () => {
      if (!selectedClassForAttendance) return [];
      const { data, error } = await supabase
        .from("ebd_enrollments")
        .select("*")
        .eq("class_id", selectedClassForAttendance)
        .in("status", ["ativo", "visitante"])
        .order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedClassForAttendance,
  });

  // Computed stats
  const stats = useMemo(() => {
    const totalStudents = allEnrollments?.length || 0;
    const activeStudents = allEnrollments?.filter(e => e.status === "ativo").length || 0;
    const visitors = allEnrollments?.filter(e => e.status === "visitante").length || 0;
    const activeClasses = classes?.length || 0;
    return { totalStudents, activeStudents, visitors, activeClasses };
  }, [allEnrollments, classes]);

  const studentsByClass = useMemo(() => {
    const map: Record<string, number> = {};
    allEnrollments?.forEach(e => {
      map[e.class_id] = (map[e.class_id] || 0) + 1;
    });
    return map;
  }, [allEnrollments]);

  // Mutations
  const saveAttendance = useMutation({
    mutationFn: async () => {
      if (!selectedClassForAttendance) return;
      const { data: session, error: sessionError } = await supabase
        .from("ebd_attendance_sessions")
        .insert({
          class_id: selectedClassForAttendance,
          lesson_date: attDate,
          lesson_title: "Chamada",
        })
        .select()
        .single();
      if (sessionError) throw sessionError;

      const records = (students || []).map(s => {
        const d = attendanceData[s.id] || { present: true, justification: "" };
        return {
          session_id: session.id,
          enrollment_id: s.id,
          present: d.present,
          justification: d.justification || null,
        };
      });
      if (records.length === 0) return;
      const { error } = await supabase.from("ebd_attendance_records").insert(records);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Presença registrada com sucesso!");
      setAttendanceDialogOpen(false);
      setAttendanceData({});
      qc.invalidateQueries({ queryKey: ["ebd-all-enrollments"] });
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });

  const saveClass = useMutation({
    mutationFn: async () => {
      const congId = newClass.congregation_id || congregations?.[0]?.id;
      if (!congId) throw new Error("Selecione uma congregação");
      if (!newClass.name) throw new Error("Informe o nome da classe");

      if (editingClass) {
        const { error } = await supabase
          .from("ebd_classes")
          .update({ name: newClass.name, category: newClass.category, congregation_id: congId })
          .eq("id", editingClass.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ebd_classes").insert({
          name: newClass.name,
          category: newClass.category,
          congregation_id: congId,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingClass ? "Classe atualizada!" : "Classe criada!");
      setClassDialogOpen(false);
      setEditingClass(null);
      setNewClass({ name: "", category: "Adultos", congregation_id: "" });
      qc.invalidateQueries({ queryKey: ["ebd-classes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteClass = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ebd_classes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Classe removida");
      qc.invalidateQueries({ queryKey: ["ebd-classes"] });
      qc.invalidateQueries({ queryKey: ["ebd-all-enrollments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveStudent = useMutation({
    mutationFn: async () => {
      const selectedClass = classes?.find(c => c.id === newStudent.class_id);
      if (!selectedClass) throw new Error("Selecione uma classe");
      if (!newStudent.full_name) throw new Error("Informe o nome do aluno");

      const payload: any = {
        full_name: newStudent.full_name,
        phone: newStudent.phone || null,
        birth_date: newStudent.birth_date || null,
        address: newStudent.address || null,
        guardian_name: newStudent.guardian_name || null,
        class_id: newStudent.class_id,
        status: newStudent.status,
        congregation_id: selectedClass.congregation_id,
      };

      if (editingStudent) {
        const { error } = await supabase.from("ebd_enrollments").update(payload).eq("id", editingStudent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ebd_enrollments").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingStudent ? "Aluno atualizado!" : "Aluno matriculado!");
      setStudentDialogOpen(false);
      setEditingStudent(null);
      setNewStudent({ full_name: "", phone: "", birth_date: "", address: "", guardian_name: "", class_id: "", status: "ativo" });
      qc.invalidateQueries({ queryKey: ["ebd-all-enrollments"] });
      qc.invalidateQueries({ queryKey: ["ebd-enrollments"] });
    },

    onError: (e: Error) => toast.error(e.message),
  });

  const deleteStudent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ebd_enrollments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aluno removido");
      qc.invalidateQueries({ queryKey: ["ebd-all-enrollments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Helpers
  const togglePresence = (sid: string) => {
    setAttendanceData(p => ({
      ...p,
      [sid]: { present: !(p[sid]?.present ?? true), justification: p[sid]?.justification || "" },
    }));
  };
  const setJustification = (sid: string, j: string) => {
    setAttendanceData(p => ({ ...p, [sid]: { present: p[sid]?.present ?? false, justification: j } }));
  };

  const openNewClass = () => {
    setEditingClass(null);
    setNewClass({ name: "", category: "Adultos", congregation_id: selectedCongregation !== "all" ? selectedCongregation : "" });
    setClassDialogOpen(true);
  };
  const openEditClass = (cls: any) => {
    setEditingClass(cls);
    setNewClass({ name: cls.name, category: cls.category, congregation_id: cls.congregation_id });
    setClassDialogOpen(true);
  };
  const openNewStudent = () => {
    setEditingStudent(null);
    setNewStudent({ full_name: "", phone: "", birth_date: "", address: "", guardian_name: "", class_id: "", status: "ativo" });
    setStudentDialogOpen(true);
  };
  const openEditStudent = (s: any) => {
    setEditingStudent(s);
    setNewStudent({
      full_name: s.full_name,
      phone: s.phone || "",
      birth_date: s.birth_date || "",
      address: s.address || "",
      guardian_name: s.guardian_name || "",
      class_id: s.class_id,
      status: s.status,
    });
    setStudentDialogOpen(true);
  };

  const startAttendance = (classId: string) => {
    if (!classId) {
      toast.error("Selecione uma classe primeiro");
      return;
    }
    setSelectedClassForAttendance(classId);
    setAttendanceData({});
    setAttendanceDialogOpen(true);
  };

  const filteredStudents = useMemo(() => {
    if (!allEnrollments) return [];
    if (!searchTerm) return allEnrollments;
    const q = searchTerm.toLowerCase();
    return allEnrollments.filter(s => s.full_name.toLowerCase().includes(q));
  }, [allEnrollments, searchTerm]);

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
            <Button className="gap-2" onClick={openNewClass}>
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

        {/* DASHBOARD */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total de Alunos</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalStudents}</div>
                <p className="text-xs text-muted-foreground">Matriculados</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Classes Ativas</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeClasses}</div>
                <p className="text-xs text-muted-foreground">Turmas em funcionamento</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Alunos Ativos</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.activeStudents}</div>
                <p className="text-xs text-muted-foreground">Com matrícula ativa</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Visitantes</CardTitle>
                <Plus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.visitors}</div>
                <p className="text-xs text-muted-foreground">Em acompanhamento</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Lançamento Rápido de Presença</CardTitle>
              <CardDescription>Selecione uma classe e registre a chamada em segundos.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <Select value={attClassId} onValueChange={setAttClassId}>
                <SelectTrigger><SelectValue placeholder="Selecione a classe" /></SelectTrigger>
                <SelectContent>
                  {classes?.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.congregation?.name})</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="date" value={attDate} onChange={e => setAttDate(e.target.value)} />
              <Button onClick={() => startAttendance(attClassId)} className="gap-2">
                <ClipboardList className="h-4 w-4" /> Iniciar Chamada
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CLASSES */}
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
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Alunos:</span>
                    <span className="font-medium">{studentsByClass[cls.id] || 0}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => openEditClass(cls)}>
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => {
                        if (confirm(`Excluir a classe "${cls.name}"? Esta ação não pode ser desfeita.`)) {
                          deleteClass.mutate(cls.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                    <Button size="sm" className="flex-1 gap-1" onClick={() => startAttendance(cls.id)}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Presença
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button
              variant="outline"
              className="h-auto min-h-[200px] border-dashed flex-col gap-2"
              onClick={openNewClass}
            >
              <Plus className="h-8 w-8 text-muted-foreground" />
              <span className="font-medium text-muted-foreground">Adicionar Classe</span>
            </Button>
          </div>
        </TabsContent>

        {/* STUDENTS */}
        <TabsContent value="students">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Listagem de Alunos</CardTitle>
                  <CardDescription>Gerencie as matrículas e dados dos alunos da EBD.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar aluno..."
                      className="w-[250px] pl-8"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button size="sm" onClick={openNewStudent}>Matricular Aluno</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
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
                    {filteredStudents.map(s => (
                      <tr key={s.id} className="hover:bg-muted/50 transition-colors">
                        <td className="p-4 font-medium">{s.full_name}</td>
                        <td className="p-4">{s.class?.name}</td>
                        <td className="p-4">
                          <Badge className={statusColors[s.status as StudentStatus]}>{s.status}</Badge>
                        </td>
                        <td className="p-4 text-muted-foreground">{s.congregation?.name}</td>
                        <td className="p-4 text-right space-x-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditStudent(s)}>Editar</Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { if (confirm(`Remover ${s.full_name}?`)) deleteStudent.mutate(s.id); }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {filteredStudents.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                          Nenhum aluno encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ATTENDANCE TAB */}
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
                  <Select value={attClassId} onValueChange={setAttClassId}>
                    <SelectTrigger><SelectValue placeholder="Selecione a classe" /></SelectTrigger>
                    <SelectContent>
                      {classes?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data da Aula</Label>
                  <Input type="date" value={attDate} onChange={e => setAttDate(e.target.value)} />
                </div>
                <div className="flex items-end">
                  <Button className="w-full gap-2" onClick={() => startAttendance(attClassId)}>
                    <ClipboardList className="h-4 w-4" /> Iniciar Chamada
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border bg-muted/30 p-8 text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
                <h3 className="mt-4 text-lg font-medium">Clique em "Iniciar Chamada"</h3>
                <p className="mt-1 text-sm text-muted-foreground">A lista de alunos abrirá em uma janela para você marcar presença e justificativas.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ATTENDANCE DIALOG */}
      <Dialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lançamento Rápido de Presença</DialogTitle>
            <DialogDescription>Marque presença ou falta de cada aluno e adicione justificativas se necessário.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {students?.map(student => {
              const data = attendanceData[student.id] || { present: true, justification: "" };
              return (
                <div key={student.id} className="flex flex-col gap-2 rounded-lg border p-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between flex-wrap gap-2">
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
                        onClick={() => !data.present && togglePresence(student.id)}
                      >
                        <CheckCircle2 className="h-4 w-4" /> Presente
                      </Button>
                      <Button
                        variant={!data.present ? "destructive" : "outline"}
                        size="sm"
                        className="gap-1 h-9"
                        onClick={() => data.present && togglePresence(student.id)}
                      >
                        <XCircle className="h-4 w-4" /> Falta
                      </Button>
                    </div>
                  </div>
                  {!data.present && (
                    <div className="mt-1 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                      <Input
                        placeholder="Justificativa da falta..."
                        className="h-8 text-xs"
                        value={data.justification}
                        onChange={e => setJustification(student.id, e.target.value)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
            {(!students || students.length === 0) && (
              <div className="py-10 text-center text-muted-foreground">
                Nenhum aluno matriculado nesta classe.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttendanceDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveAttendance.mutate()} disabled={saveAttendance.isPending || !students?.length} className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {saveAttendance.isPending ? "Salvando..." : "Confirmar Chamada"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CLASS DIALOG */}
      <Dialog open={classDialogOpen} onOpenChange={setClassDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingClass ? "Editar Classe" : "Nova Classe da EBD"}</DialogTitle>
            <DialogDescription>Cadastre uma turma da Escola Bíblica Dominical.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Classe</Label>
              <Input value={newClass.name} onChange={e => setNewClass({ ...newClass, name: e.target.value })} placeholder="Ex: Classe dos Adultos" />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={newClass.category} onValueChange={(v: any) => setNewClass({ ...newClass, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Adultos">Adultos</SelectItem>
                  <SelectItem value="Crianças">Crianças</SelectItem>
                  <SelectItem value="Jovens">Jovens</SelectItem>
                  <SelectItem value="Homens">Homens</SelectItem>
                  <SelectItem value="Mulheres">Mulheres</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Congregação</Label>
              <Select value={newClass.congregation_id} onValueChange={v => setNewClass({ ...newClass, congregation_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione a congregação" /></SelectTrigger>
                <SelectContent>
                  {congregations?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClassDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveClass.mutate()} disabled={saveClass.isPending || !newClass.name}>
              {saveClass.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* STUDENT DIALOG */}
      <Dialog open={studentDialogOpen} onOpenChange={setStudentDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingStudent ? "Editar Aluno" : "Matricular Novo Aluno"}</DialogTitle>
            <DialogDescription>Cadastro de matrícula da EBD.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Nome Completo</Label>
              <Input value={newStudent.full_name} onChange={e => setNewStudent({ ...newStudent, full_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={newStudent.phone} onChange={e => setNewStudent({ ...newStudent, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Data de Nascimento</Label>
              <Input type="date" value={newStudent.birth_date} onChange={e => setNewStudent({ ...newStudent, birth_date: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Endereço</Label>
              <Input value={newStudent.address} onChange={e => setNewStudent({ ...newStudent, address: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Responsável (se criança)</Label>
              <Input value={newStudent.guardian_name} onChange={e => setNewStudent({ ...newStudent, guardian_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Classe</Label>
              <Select value={newStudent.class_id} onValueChange={v => setNewStudent({ ...newStudent, class_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {classes?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={newStudent.status} onValueChange={(v: any) => setNewStudent({ ...newStudent, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="visitante">Visitante</SelectItem>
                  <SelectItem value="transferido">Transferido</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStudentDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveStudent.mutate()} disabled={saveStudent.isPending || !newStudent.full_name || !newStudent.class_id}>
              {saveStudent.isPending ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
