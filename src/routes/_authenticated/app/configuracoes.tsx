import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useProfile, type AppRole } from "@/hooks/use-profile";
import {
  Shield,
  Mail,
  Building2,
  User,
  Crown,
  Users,
  UserCheck,
  KeyRound,
  Info,
  Fingerprint,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/configuracoes")({
  component: Configuracoes,
});

const ROLE_META: Record<
  AppRole,
  { label: string; icon: React.ElementType; variant: "default" | "gold" | "secondary" | "outline" }
> = {
  admin_sede: { label: "Admin Sede", icon: Crown, variant: "gold" },
  admin_congregacao: { label: "Admin Congregação", icon: Shield, variant: "default" },
  lider_departamento: { label: "Líder de Departamento", icon: Users, variant: "secondary" },
  membro: { label: "Membro", icon: User, variant: "outline" },
  tesoureiro: { label: "Tesoureiro", icon: KeyRound, variant: "secondary" },
  secretario: { label: "Secretário", icon: Shield, variant: "default" },
};

function RoleBadge({ role }: { role: string }) {
  const meta = ROLE_META[role] ?? { label: role, icon: User, variant: "outline" };
  const Icon = meta.icon;
  const variant = meta.variant;

  const classes: Record<string, string> = {
    default:
      "bg-gradient-hero text-primary-foreground border-0 shadow-soft",
    gold:
      "bg-gradient-gold text-gold-foreground border-0 shadow-soft",
    secondary:
      "bg-secondary text-secondary-foreground border border-border",
    outline:
      "bg-transparent text-muted-foreground border border-border",
  };

  return (
    <Badge
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${classes[variant]}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </Badge>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="group flex items-center gap-3 rounded-lg border border-border/40 bg-muted/30 px-4 py-3 transition-all hover:border-border hover:bg-muted/50 hover:shadow-soft">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
          highlight
            ? "bg-gradient-gold text-gold-foreground"
            : "bg-gradient-hero text-primary-foreground"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function Configuracoes() {
  const { user } = useAuth();
  const { data } = useProfile(user?.id);

  const { data: roleCount } = useQuery({
    queryKey: ["admin-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin_sede");
      return count ?? 0;
    },
    enabled: !!data?.isSedeAdmin,
  });

  const initials = data?.profile?.full_name
    ?.split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() ??
    user?.email?.[0].toUpperCase() ??
    "U";

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Configurações"
        description="Gerencie seu perfil, permissões e entenda como funcionam os níveis de acesso do sistema."
      />

      {/* Profile hero card */}
      <Card className="relative overflow-hidden shadow-card">
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-primary to-[oklch(0.45_0.14_245)]" />
        <CardContent className="relative pt-10">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end">
            <Avatar className="h-20 w-20 border-4 border-card shadow-lg">
              <AvatarFallback className="bg-gradient-gold text-lg font-bold text-gold-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 pb-1">
              <h2 className="text-lg font-semibold tracking-tight">
                {data?.profile?.full_name ?? "Usuário"}
              </h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <div className="flex flex-wrap gap-2 pb-1">
              {(data?.roles ?? ["membro"]).map((r: string) => (
                <RoleBadge key={r} role={r} />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <InfoRow
          icon={Mail}
          label="E-mail"
          value={user?.email ?? "—"}
        />
        <InfoRow
          icon={Building2}
          label="Congregação"
          value={
            data?.profile?.congregations?.name ?? (
              <span className="italic text-muted-foreground">Sem congregação vinculada</span>
            )
          }
        />
        <InfoRow
          icon={Fingerprint}
          label="ID do Usuário"
          value={
            <span className="font-mono text-xs text-muted-foreground">
              {user?.id ?? "—"}
            </span>
          }
        />
        {data?.isSedeAdmin && (
          <InfoRow
            icon={Crown}
            label="Status Administrativo"
            value={`${roleCount ?? 0} admin(s) sede no sistema`}
            highlight
          />
        )}
        <InfoRow
          icon={UserCheck}
          label="Conta"
          value={data?.profile?.active === false ? "Inativa" : "Ativa"}
        />
        <InfoRow
          icon={KeyRound}
          label="Senha"
          value={
            <span className="text-xs text-muted-foreground">
              Alterada em — último acesso: —
            </span>
          }
        />
      </div>

      {/* Permissions section */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5 text-primary" />
            Hierarquia de Permissões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                role: "admin_sede",
                desc: "Acesso completo a todas as congregações, usuários, financeiro e configurações.",
                icon: Crown,
                color: "gold",
              },
              {
                role: "admin_congregacao",
                desc: "Gerencia usuários e dados da própria congregação, incluindo financeiro local.",
                icon: Shield,
                color: "primary",
              },
              {
                role: "lider_departamento",
                desc: "Coordena atividades do departamento vinculado, sem acesso administrativo.",
                icon: Users,
                color: "muted",
              },
              {
                role: "membro",
                desc: "Visualiza informações públicas e agenda pessoal. Não edita dados.",
                icon: User,
                color: "muted",
              },
            ].map((item) => {
              const meta = ROLE_META[item.role];
              const Icon = item.icon;
              const isActive = (data?.roles ?? []).includes(item.role);
              return (
                <div
                  key={item.role}
                  className={`flex items-start gap-3 rounded-xl border p-4 transition-all ${
                    isActive
                      ? "border-gold/40 bg-gradient-to-r from-gold/5 to-transparent shadow-soft"
                      : "border-border/40 bg-muted/20"
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      isActive
                        ? "bg-gradient-gold text-gold-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{meta.label}</span>
                      {isActive && (
                        <Badge
                          variant="outline"
                          className="border-gold/50 text-gold text-[10px] px-1.5 py-0"
                        >
                          <Sparkles className="mr-1 h-3 w-3" /> Seu papel
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* How to elevate permissions */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-5 w-5 text-primary" />
            Como elevar permissões
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-3 rounded-lg border border-border/40 bg-muted/20 p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-hero text-primary-foreground text-xs font-bold">
              1
            </div>
            <p>
              O primeiro acesso de cada usuário é cadastrado como{" "}
              <strong className="text-foreground">Membro</strong> automaticamente.
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-border/40 bg-muted/20 p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-hero text-primary-foreground text-xs font-bold">
              2
            </div>
            <p>
              Para promover alguém a <strong className="text-foreground">Admin Sede</strong>,{" "}
              <strong className="text-foreground">Admin de Congregação</strong> ou{" "}
              <strong className="text-foreground">Líder de Departamento</strong>, um administrador
              atual deve inserir o papel diretamente na tabela{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">user_roles</code>{" "}
              do banco.
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-border/40 bg-muted/20 p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-hero text-primary-foreground text-xs font-bold">
              3
            </div>
            <p>
              O primeiro <strong className="text-foreground">Admin Sede</strong> precisa ser criado
              manualmente no painel do banco de dados.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
