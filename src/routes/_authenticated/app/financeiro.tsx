import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/app/financeiro")({
  component: FinanceLayout,
});

function FinanceLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const tabs = [
    { value: "/app/financeiro", label: "Dashboard" },
    { value: "/app/financeiro/lancamentos", label: "Entradas" },
    { value: "/app/financeiro/despesas", label: "Despesas" },
    { value: "/app/financeiro/relatorios", label: "Relatórios" },
  ];
  const current = [...tabs].reverse().find((t) => path === t.value || path.startsWith(t.value + "/"))?.value ?? "/app/financeiro";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro"
        description="Gestão financeira por congregação com consolidado da sede."
      />
      <Tabs value={current}>
        <TabsList className="bg-card border">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} asChild>
              <Link to={t.value}>{t.label}</Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <Outlet />
    </div>
  );
}
