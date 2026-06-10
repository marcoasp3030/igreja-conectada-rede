import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Users2, Heart, Baby, GraduationCap, Globe, HandHelping, 
  BookOpen, Sparkles, Plus, Edit2, Trash2, MoreHorizontal 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { DepartmentForm } from "@/components/departments/department-form";
import { useProfile } from "@/hooks/use-profile";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

type Departamento = Database["public"]["Tables"]["departamentos"]["Row"];


const ICON_MAP: Record<string, any> = {
  Users2, Heart, Baby, Globe, HandHelping, BookOpen, GraduationCap, Sparkles
};

export const Route = createFileRoute("/_authenticated/app/departamentos")({
  component: Departamentos,
});

function Departamentos() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profileData } = useProfile(user?.id);
  const isAdmin = profileData?.isSedeAdmin || profileData?.isCongregacaoAdmin;
  
  const [formOpen, setFormOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Departamento | null>(null);


  const { data: departments, isLoading } = useQuery({
    queryKey: ["departamentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departamentos")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: members } = useQuery({
    queryKey: ["members-by-dept"],
    queryFn: async () => (await supabase.from("members").select("id, department")).data ?? [],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("departamentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departamentos"] });
      toast.success("Departamento excluído com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir departamento: " + error.message);
    },
  });

  const count = (sigla: string | null) => {
    if (!sigla) return 0;
    return (members ?? []).filter((m) => m.department === sigla).length;
  };

  const handleEdit = (dept: Departamento) => {
    setEditingDept(dept);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditingDept(null);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este departamento?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div>
      <PageHeader 
        title="Departamentos" 
        description="Ministérios e departamentos do Setor 70."
        actions={isAdmin ? (
          <Button onClick={handleAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Departamento
          </Button>
        ) : undefined}
      />


      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="h-40 animate-pulse bg-muted/50" />
          ))
        ) : (
          departments?.map((d) => {
            const IconComp = ICON_MAP[d.icone || "Users2"] || Users2;
            return (
              <Card key={d.id} className="group overflow-hidden shadow-card transition hover:-translate-y-0.5">
                <div className={`h-2 bg-gradient-to-r ${d.cor}`} />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${d.cor} text-white`}>
                      <IconComp className="h-5 w-5" />
                    </div>
                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(d)} className="gap-2">
                            <Edit2 className="h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(d.id)} className="gap-2 text-destructive focus:text-destructive">
                            <Trash2 className="h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <h3 className="font-semibold">{d.nome}</h3>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{d.descricao}</p>
                  <p className="mt-3 text-xs">
                    <span className="rounded-full bg-secondary px-2 py-0.5 font-semibold text-secondary-foreground">
                      {count(d.sigla)} membros
                    </span>
                  </p>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <DepartmentForm 
        open={formOpen} 
        onOpenChange={setFormOpen} 
        department={editingDept}
      />
    </div>
  );
}

