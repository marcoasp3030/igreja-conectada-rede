import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import * as fns from "@/lib/users.functions";

export const Route = createFileRoute("/_authenticated/app/auditoria")({
  component: Auditoria,
});

const ACTION_LABEL: Record<string, string> = {
  create: "Criação",
  update: "Edição",
  role_change: "Troca de perfil",
  password_reset: "Redefinição de senha",
  delete: "Exclusão",
};

const ACTION_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  create: "default",
  update: "secondary",
  role_change: "outline",
  password_reset: "outline",
  delete: "destructive",
};

const FIELD_LABEL: Record<string, string> = {
  full_name: "Nome",
  email: "E-mail",
  phone: "Telefone",
  congregation_id: "Congregação",
  role: "Perfil",
  roles: "Perfis",
  password: "Senha",
};

function fmtValue(v: any) {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  return String(v);
}

function ChangesCell({ changes }: { changes: Record<string, { from: any; to: any }> }) {
  const entries = Object.entries(changes ?? {});
  if (!entries.length) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="space-y-1 text-xs">
      {entries.map(([k, v]) => (
        <div key={k}>
          <span className="font-medium">{FIELD_LABEL[k] ?? k}:</span>{" "}
          <span className="text-muted-foreground line-through">{fmtValue(v.from)}</span>{" "}
          <span>→</span>{" "}
          <span className="text-foreground">{fmtValue(v.to)}</span>
        </div>
      ))}
    </div>
  );
}

function Auditoria() {
  const listLogs = useServerFn(fns.listUserAuditLogs);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState<string>("all");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["user-audit-logs"],
    queryFn: () => listLogs(),
  });

  const filtered = useMemo(() => {
    const t = search.toLowerCase();
    return (logs as any[]).filter((l) => {
      if (action !== "all" && l.action !== action) return false;
      if (!t) return true;
      return (
        l.target_user_name?.toLowerCase().includes(t) ||
        l.target_user_email?.toLowerCase().includes(t) ||
        l.actor_user_name?.toLowerCase().includes(t)
      );
    });
  }, [logs, search, action]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Log de Auditoria"
        description="Registro de criação, edição, troca de perfil, redefinição de senha e exclusão de usuários."
      />

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por usuário ou autor"
                className="pl-8"
              />
            </div>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                {Object.entries(ACTION_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-44">Data</TableHead>
                  <TableHead className="w-40">Ação</TableHead>
                  <TableHead>Usuário afetado</TableHead>
                  <TableHead>Autor</TableHead>
                  <TableHead>Mudanças</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(l.created_at).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ACTION_VARIANT[l.action] ?? "secondary"}>
                        {ACTION_LABEL[l.action] ?? l.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{l.target_user_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{l.target_user_email ?? ""}</div>
                    </TableCell>
                    <TableCell className="text-sm">{l.actor_user_name ?? "—"}</TableCell>
                    <TableCell><ChangesCell changes={l.changes ?? {}} /></TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {isLoading ? "Carregando..." : "Nenhum registro encontrado."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
