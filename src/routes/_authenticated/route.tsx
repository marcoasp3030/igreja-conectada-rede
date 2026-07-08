import { createFileRoute, Outlet, redirect, useRouterState, Link } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, Home } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

const ROUTE_LABELS: Record<string, string> = {
  app: "Painel",
  congregacoes: "Congregações",
  membros: "Membros",
  aniversariantes: "Aniversariantes",
  mapa: "Mapa",
  departamentos: "Departamentos",
  calendario: "Calendário",
  agenda: "Agenda",
  escalas: "Escalas",
  ebd: "EBD",
  avisos: "Avisos",
  "mural-oracao": "Mural de Oração",
  "mao-amiga": "Mão Amiga",
  empresarial: "Empresarial",
  financeiro: "Financeiro",
  lancamentos: "Lançamentos",
  despesas: "Despesas",
  fechamentos: "Fechamentos",
  relatorios: "Relatórios",
  usuarios: "Usuários",
  auditoria: "Auditoria",
  configuracoes: "Configurações",
};

function useBreadcrumbs() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const parts = pathname.split("/").filter(Boolean);
  return parts.map((slug, i) => {
    const href = "/" + parts.slice(0, i + 1).join("/");
    return { slug, href, label: ROUTE_LABELS[slug] ?? slug };
  });
}

function AuthenticatedLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <ShellHeader />
          <main className="relative flex-1 p-4 sm:p-6 lg:p-8">
            {/* subtle background accents */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--color-primary)_10%,transparent)_0%,transparent_60%)]"
            />
            <div className="mx-auto w-full max-w-[1400px] animate-fade-in">
              <Outlet />
            </div>
          </main>
        </div>
        <Toaster richColors position="top-right" />
      </div>
    </SidebarProvider>
  );
}

function ShellHeader() {
  const crumbs = useBreadcrumbs();
  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-5">
        <SidebarTrigger className="shrink-0" />
        <div className="mx-1 h-6 w-px bg-border/70" />

        <nav aria-label="breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
          <Link
            to="/app"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Painel"
          >
            <Home className="h-3.5 w-3.5" />
          </Link>
          {crumbs.slice(1).map((c, i, arr) => {
            const isLast = i === arr.length - 1;
            return (
              <div key={c.href} className="flex min-w-0 items-center gap-1.5">
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                {isLast ? (
                  <span className="truncate font-medium text-foreground">{c.label}</span>
                ) : (
                  <Link
                    to={c.href}
                    className="truncate text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {c.label}
                  </Link>
                )}
              </div>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden items-center gap-2 md:flex">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_var(--color-gold)]" />
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              AD Setor 70 · Belém
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
