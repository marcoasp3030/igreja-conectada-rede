import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Users2, Heart, Baby, GraduationCap, Globe, HandHelping, BookOpen, Sparkles } from "lucide-react";

const DEPARTMENTS = [
  { key: "UMADB", name: "UMADB", desc: "União da Mocidade da Assembleia de Deus Belém", icon: Users2, color: "from-blue-600 to-blue-400" },
  { key: "UFADEB", name: "UFADEB", desc: "União Feminina da AD Belém", icon: Heart, color: "from-pink-600 to-pink-400" },
  { key: "Alpha Kids", name: "Alpha Kids", desc: "Ministério Infantil", icon: Baby, color: "from-amber-500 to-yellow-400" },
  { key: "CREIO", name: "CREIO", desc: "Crianças e Adolescentes", icon: Sparkles, color: "from-purple-600 to-purple-400" },
  { key: "Missoes", name: "Missões", desc: "Departamento de Missões", icon: Globe, color: "from-emerald-600 to-teal-400" },
  { key: "Assistencia Social", name: "Assistência Social", desc: "Ação Social", icon: HandHelping, color: "from-rose-600 to-rose-400" },
  { key: "EBD", name: "EBD", desc: "Escola Bíblica Dominical", icon: BookOpen, color: "from-indigo-600 to-indigo-400" },
  { key: "Teologia FAESP", name: "Teologia FAESP", desc: "Formação Teológica", icon: GraduationCap, color: "from-slate-700 to-slate-500" },
] as const;

export const Route = createFileRoute("/_authenticated/departamentos")({
  component: Departamentos,
});

function Departamentos() {
  const { data: members } = useQuery({
    queryKey: ["members-by-dept"],
    queryFn: async () => (await supabase.from("members").select("id, department")).data ?? [],
  });

  const count = (dep: string) => (members ?? []).filter((m) => m.department === dep).length;

  return (
    <div>
      <PageHeader title="Departamentos" description="Ministérios e departamentos do Setor 70." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {DEPARTMENTS.map((d) => (
          <Card key={d.key} className="overflow-hidden shadow-card transition hover:-translate-y-0.5">
            <div className={`h-2 bg-gradient-to-r ${d.color}`} />
            <CardContent className="p-5">
              <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${d.color} text-white`}>
                <d.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{d.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{d.desc}</p>
              <p className="mt-3 text-xs">
                <span className="rounded-full bg-secondary px-2 py-0.5 font-semibold text-secondary-foreground">
                  {count(d.key)} membros
                </span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
