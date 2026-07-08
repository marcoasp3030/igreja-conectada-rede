import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Cake, Phone, Search, Building2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/aniversariantes")({
  component: Aniversariantes,
});

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function Aniversariantes() {
  const now = new Date();
  const [mes, setMes] = useState<number>(now.getMonth() + 1);
  const [search, setSearch] = useState("");
  const [filterCong, setFilterCong] = useState<string>("all");

  const { data: congregations } = useQuery({
    queryKey: ["congregations-list"],
    queryFn: async () => (await supabase.from("congregations").select("id, name").order("name")).data ?? [],
  });

  const { data: members, isLoading } = useQuery({
    queryKey: ["aniversariantes-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, birth_date, phone, congregation_id, active")
        .not("birth_date", "is", null)
        .eq("active", true);
      if (error) throw error;
      return data ?? [];
    },
  });

  const congMap = useMemo(() => {
    const m = new Map<string, string>();
    (congregations ?? []).forEach((c) => m.set(c.id, c.name));
    return m;
  }, [congregations]);

  const aniversariantes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (members ?? [])
      .filter((m) => {
        if (!m.birth_date) return false;
        const [, mm] = m.birth_date.split("-");
        if (parseInt(mm, 10) !== mes) return false;
        if (filterCong !== "all" && m.congregation_id !== filterCong) return false;
        if (q && !m.full_name.toLowerCase().includes(q)) return false;
        return true;
      })
      .map((m) => {
        const [y, mm, dd] = m.birth_date!.split("-").map(Number);
        const age = now.getFullYear() - y - (mes < now.getMonth() + 1 || (mes === now.getMonth() + 1 && now.getDate() < dd) ? 1 : 0);
        return { ...m, day: dd, month: mm, age };
      })
      .sort((a, b) => a.day - b.day || a.full_name.localeCompare(b.full_name));
  }, [members, mes, filterCong, search, now]);

  const todayDay = now.getDate();
  const todayMonth = now.getMonth() + 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aniversariantes do Mês"
        description="Celebre a vida dos irmãos que aniversariam"
        icon={Cake}
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
          <SelectTrigger className="md:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MESES.map((nome, i) => (
              <SelectItem key={i} value={String(i + 1)}>{nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCong} onValueChange={setFilterCong}>
          <SelectTrigger className="md:w-64"><SelectValue placeholder="Congregação" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as congregações</SelectItem>
            {(congregations ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{MESES[mes - 1]}</span>
            <Badge variant="secondary">{aniversariantes.length} {aniversariantes.length === 1 ? "aniversariante" : "aniversariantes"}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Carregando...</p>
          ) : aniversariantes.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum aniversariante neste mês.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {aniversariantes.map((m) => {
                const isToday = m.day === todayDay && m.month === todayMonth;
                return (
                  <div
                    key={m.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${isToday ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
                  >
                    <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                      <span className="text-lg font-bold leading-none">{String(m.day).padStart(2, "0")}</span>
                      <span className="text-[10px] uppercase leading-none mt-0.5">{MESES[m.month - 1].slice(0, 3)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{m.full_name}</p>
                        {isToday && <Badge className="shrink-0">Hoje 🎉</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{m.age} anos</p>
                      {m.phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3" /> {m.phone}
                        </p>
                      )}
                      {m.congregation_id && congMap.get(m.congregation_id) && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" /> {congMap.get(m.congregation_id)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
