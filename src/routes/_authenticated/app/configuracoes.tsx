import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { Shield, Mail, Building2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/configuracoes")({
  component: Configuracoes,
});

const ROLE_LABEL: Record<string, string> = {
  admin_sede: "Admin Sede",
  admin_congregacao: "Admin Congregação",
  lider_departamento: "Líder de Departamento",
  membro: "Membro",
};

function Configuracoes() {
  const { user } = useAuth();
  const { data } = useProfile(user?.id);

  const { data: roleCount } = useQuery({
    queryKey: ["admin-count"],
    queryFn: async () => {
      const { count } = await supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "admin_sede");
      return count ?? 0;
    },
    enabled: !!data?.isSedeAdmin,
  });

  return (
    <div>
      <PageHeader title="Configurações" description="Seu perfil e permissões." />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader><CardTitle>Perfil</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> {user?.email}</div>
            <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" /> {data?.profile?.congregations?.name ?? "Sem congregação vinculada"}</div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-4 w-4" /> Permissões</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(data?.roles ?? ["membro"]).map((r) => (
                <span key={r} className="rounded-full bg-gradient-hero px-3 py-1 text-xs font-semibold text-primary-foreground">
                  {ROLE_LABEL[r] ?? r}
                </span>
              ))}
            </div>
            {data?.isSedeAdmin && (
              <p className="mt-3 text-xs text-muted-foreground">
                Você é Admin Sede. {roleCount} admin(s) sede no sistema.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4 shadow-card">
        <CardHeader><CardTitle>Como elevar permissões</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>O primeiro acesso de cada usuário é cadastrado como <strong>Membro</strong>.</p>
          <p>Para promover alguém a Admin Sede, Admin de Congregação ou Líder de Departamento, um administrador atual deve inserir o papel diretamente na tabela <code className="rounded bg-muted px-1 py-0.5">user_roles</code> do banco.</p>
          <p>O primeiro Admin Sede precisa ser criado manualmente no painel do banco de dados.</p>
        </CardContent>
      </Card>
    </div>
  );
}
