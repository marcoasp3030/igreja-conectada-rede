import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Cake,
  Phone,
  Search,
  Building2,
  Sparkles,
  CalendarDays,
  PartyPopper,
  Gift,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/aniversariantes")({
  component: Aniversariantes,
});

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

function Aniversariantes() {
  const now = new Date();
  const [mes, setMes] = useState<number>(now.getMonth() + 1);
  const [search, setSearch] = useState("");
  const [filterCong, setFilterCong] = useState<string>("all");
  const [tab, setTab] = useState<string>("mes");

  const { data: congregations } = useQuery({
    queryKey: ["congregations-list"],
    queryFn: async () =>
      (await supabase.from("congregations").select("id, name").order("name")).data ?? [],
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

  const todayDay = now.getDate();
  const todayMonth = now.getMonth() + 1;

  const enriched = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (members ?? [])
      .filter((m) => {
        if (!m.birth_date) return false;
        if (filterCong !== "all" && m.congregation_id !== filterCong) return false;
        if (q && !m.full_name.toLowerCase().includes(q)) return false;
        return true;
      })
      .map((m) => {
        const [y, mm, dd] = m.birth_date!.split("-").map(Number);
        const age =
          now.getFullYear() -
          y -
          (mm < todayMonth || (mm === todayMonth && todayDay < dd) ? 1 : 0);
        const turning = now.getFullYear() - y;
        return { ...m, day: dd, month: mm, age, turning };
      });
  }, [members, filterCong, search, todayMonth, todayDay, now]);

  const doMes = useMemo(
    () =>
      enriched
        .filter((m) => m.month === mes)
        .sort((a, b) => a.day - b.day || a.full_name.localeCompare(b.full_name)),
    [enriched, mes],
  );

  const hoje = useMemo(
    () => enriched.filter((m) => m.month === todayMonth && m.day === todayDay),
    [enriched, todayMonth, todayDay],
  );

  const proximos7 = useMemo(() => {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const items = enriched
      .map((m) => {
        let target = new Date(now.getFullYear(), m.month - 1, m.day);
        if (target < start) target = new Date(now.getFullYear() + 1, m.month - 1, m.day);
        const diff = Math.round((target.getTime() - start.getTime()) / 86400000);
        return { ...m, diff };
      })
      .filter((m) => m.diff >= 0 && m.diff <= 7)
      .sort((a, b) => a.diff - b.diff || a.full_name.localeCompare(b.full_name));
    return items;
  }, [enriched, now]);

  // counts per month for timeline
  const contagemMes = useMemo(() => {
    const arr = Array(12).fill(0);
    enriched.forEach((m) => (arr[m.month - 1] += 1));
    return arr;
  }, [enriched]);

  // group doMes by day
  const doMesPorDia = useMemo(() => {
    const map = new Map<number, typeof doMes>();
    doMes.forEach((m) => {
      const arr = map.get(m.day) ?? [];
      arr.push(m);
      map.set(m.day, arr);
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [doMes]);

  const totalAno = enriched.length;

  return (
    <div className="space-y-6">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-hero p-6 text-primary-foreground shadow-card sm:p-8">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gold/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-gold" />
              Celebre a vida
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Aniversariantes
            </h1>
            <p className="mt-2 max-w-xl text-sm text-primary-foreground/80 sm:text-base">
              Uma visão moderna dos aniversários da congregação — do dia de hoje ao ano inteiro.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <StatTile label="Hoje" value={hoje.length} icon={<PartyPopper className="h-4 w-4" />} highlight />
            <StatTile label="7 dias" value={proximos7.length} icon={<Gift className="h-4 w-4" />} />
            <StatTile label={MESES_CURTOS[mes - 1]} value={doMes.length} icon={<Cake className="h-4 w-4" />} />
          </div>
        </div>
      </div>

      {/* TIMELINE DE MESES */}
      <div className="rounded-2xl border bg-card p-3 shadow-card">
        <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
          {MESES_CURTOS.map((m, i) => {
            const active = i + 1 === mes;
            const isCurrent = i + 1 === todayMonth;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMes(i + 1)}
                className={[
                  "group relative flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-xs font-medium transition-all",
                  active
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                <span className="uppercase tracking-wide">{m}</span>
                <span
                  className={[
                    "inline-flex min-w-6 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold",
                    active
                      ? "bg-white/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground group-hover:bg-background",
                  ].join(" ")}
                >
                  {contagemMes[i]}
                </span>
                {isCurrent && (
                  <span className="absolute -top-1 right-1 h-2 w-2 rounded-full bg-gold shadow" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex flex-col gap-3 md:flex-row">
        <Select value={filterCong} onValueChange={setFilterCong}>
          <SelectTrigger className="md:w-72">
            <Building2 className="mr-1 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Congregação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as congregações</SelectItem>
            {(congregations ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
          <SelectTrigger className="md:w-48">
            <CalendarDays className="mr-1 h-4 w-4 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MESES.map((nome, i) => (
              <SelectItem key={i} value={String(i + 1)}>
                {nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* TABS */}
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-flex">
          <TabsTrigger value="hoje" className="gap-1.5">
            <PartyPopper className="h-3.5 w-3.5" />
            Hoje
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
              {hoje.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="semana" className="gap-1.5">
            <Gift className="h-3.5 w-3.5" />
            7 dias
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
              {proximos7.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="mes" className="gap-1.5">
            <Cake className="h-3.5 w-3.5" />
            {MESES_CURTOS[mes - 1]}
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
              {doMes.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* HOJE */}
        <TabsContent value="hoje" className="space-y-3">
          {isLoading ? (
            <SkeletonList />
          ) : hoje.length === 0 ? (
            <EmptyState
              icon={<PartyPopper className="h-6 w-6" />}
              title="Nenhum aniversariante hoje"
              description="Volte amanhã para novas comemorações."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {hoje.map((m) => (
                <FeaturedCard
                  key={m.id}
                  name={m.full_name}
                  age={m.turning}
                  phone={m.phone}
                  congregation={m.congregation_id ? congMap.get(m.congregation_id) : undefined}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* 7 DIAS */}
        <TabsContent value="semana" className="space-y-3">
          {isLoading ? (
            <SkeletonList />
          ) : proximos7.length === 0 ? (
            <EmptyState
              icon={<Gift className="h-6 w-6" />}
              title="Sem aniversários nos próximos 7 dias"
              description="Aproveite para organizar as próximas celebrações."
            />
          ) : (
            <div className="relative pl-6">
              <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
              <div className="space-y-4">
                {proximos7.map((m) => {
                  const isToday = m.diff === 0;
                  return (
                    <div key={m.id} className="relative animate-fade-in">
                      <span
                        className={[
                          "absolute -left-[18px] top-4 h-3 w-3 rounded-full ring-4 ring-background",
                          isToday ? "bg-gold" : "bg-primary/70",
                        ].join(" ")}
                      />
                      <TimelineCard
                        name={m.full_name}
                        day={m.day}
                        month={m.month}
                        age={m.turning}
                        phone={m.phone}
                        congregation={m.congregation_id ? congMap.get(m.congregation_id) : undefined}
                        diff={m.diff}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        {/* MÊS */}
        <TabsContent value="mes" className="space-y-4">
          {isLoading ? (
            <SkeletonList />
          ) : doMes.length === 0 ? (
            <EmptyState
              icon={<Cake className="h-6 w-6" />}
              title={`Sem aniversariantes em ${MESES[mes - 1]}`}
              description="Tente outro mês ou remova os filtros aplicados."
            />
          ) : (
            <div className="space-y-4">
              {doMesPorDia.map(([dia, lista]) => {
                const isToday = dia === todayDay && mes === todayMonth;
                return (
                  <Card
                    key={dia}
                    className={[
                      "overflow-hidden border-0 shadow-card",
                      isToday ? "ring-2 ring-gold/60" : "",
                    ].join(" ")}
                  >
                    <div className="grid gap-0 md:grid-cols-[140px_1fr]">
                      <div
                        className={[
                          "flex flex-row items-center justify-between gap-3 p-4 md:flex-col md:items-start md:justify-center",
                          isToday
                            ? "bg-gradient-gold text-gold-foreground"
                            : "bg-primary/5 text-primary",
                        ].join(" ")}
                      >
                        <div>
                          <div className="text-4xl font-black leading-none">
                            {String(dia).padStart(2, "0")}
                          </div>
                          <div className="mt-1 text-xs font-semibold uppercase tracking-wider opacity-80">
                            {MESES_CURTOS[mes - 1]}
                          </div>
                        </div>
                        <Badge
                          variant="secondary"
                          className={
                            isToday
                              ? "bg-white/30 text-gold-foreground border-0"
                              : "bg-primary/10 text-primary border-0"
                          }
                        >
                          {lista.length} {lista.length === 1 ? "pessoa" : "pessoas"}
                        </Badge>
                      </div>
                      <CardContent className="p-3 sm:p-4">
                        <div className="grid gap-2 sm:grid-cols-2">
                          {lista.map((m) => (
                            <MemberRow
                              key={m.id}
                              name={m.full_name}
                              age={m.age}
                              phone={m.phone}
                              congregation={
                                m.congregation_id ? congMap.get(m.congregation_id) : undefined
                              }
                            />
                          ))}
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {!isLoading && totalAno > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          {totalAno} {totalAno === 1 ? "aniversário" : "aniversários"} no total (após filtros)
        </p>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-xl border border-white/15 px-3 py-2.5 backdrop-blur",
        highlight ? "bg-gold/20" : "bg-white/10",
      ].join(" ")}
    >
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-primary-foreground/80">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold leading-none">{value}</div>
    </div>
  );
}

function Avatar({ name, accent }: { name: string; accent?: boolean }) {
  return (
    <div
      className={[
        "grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-semibold",
        accent
          ? "bg-gradient-gold text-gold-foreground shadow-soft"
          : "bg-primary/10 text-primary",
      ].join(" ")}
    >
      {initials(name)}
    </div>
  );
}

function MemberRow({
  name,
  age,
  phone,
  congregation,
}: {
  name: string;
  age: number;
  phone?: string | null;
  congregation?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border border-border/60 bg-background/50 p-2.5 transition-colors hover:bg-muted/50">
      <Avatar name={name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{name}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span>{age} anos</span>
          {phone && (
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3 w-3" /> {phone}
            </span>
          )}
        </div>
        {congregation && (
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
            <Building2 className="h-3 w-3 shrink-0" /> {congregation}
          </p>
        )}
      </div>
    </div>
  );
}

function FeaturedCard({
  name,
  age,
  phone,
  congregation,
}: {
  name: string;
  age: number;
  phone?: string | null;
  congregation?: string;
}) {
  return (
    <Card className="relative overflow-hidden border-0 shadow-card animate-fade-in">
      <div className="absolute inset-0 bg-gradient-hero opacity-95" />
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gold/30 blur-2xl" />
      <div className="relative flex items-center gap-4 p-5 text-primary-foreground">
        <Avatar name={name} accent />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-lg font-bold">{name}</p>
            <Badge className="shrink-0 bg-gold text-gold-foreground border-0">Hoje 🎉</Badge>
          </div>
          <p className="text-sm text-primary-foreground/85">Completa {age} anos hoje</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-primary-foreground/75">
            {phone && (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3" /> {phone}
              </span>
            )}
            {congregation && (
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3 w-3" /> {congregation}
              </span>
            )}
          </div>
        </div>
        {phone && (
          <Button
            asChild
            size="sm"
            className="hidden shrink-0 bg-white/20 text-primary-foreground hover:bg-white/30 sm:inline-flex"
          >
            <a
              href={`https://wa.me/${phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
            >
              Parabenizar
            </a>
          </Button>
        )}
      </div>
    </Card>
  );
}

function TimelineCard({
  name,
  day,
  month,
  age,
  phone,
  congregation,
  diff,
}: {
  name: string;
  day: number;
  month: number;
  age: number;
  phone?: string | null;
  congregation?: string;
  diff: number;
}) {
  const label =
    diff === 0 ? "Hoje" : diff === 1 ? "Amanhã" : `Em ${diff} dias`;
  return (
    <Card className="border border-border/60 shadow-sm transition-shadow hover:shadow-card">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
          <span className="text-xl font-black leading-none">
            {String(day).padStart(2, "0")}
          </span>
          <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider">
            {MESES_CURTOS[month - 1]}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold">{name}</p>
            <Badge
              variant="secondary"
              className={
                diff === 0
                  ? "bg-gold/20 text-gold-foreground border border-gold/40"
                  : ""
              }
            >
              {label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">Completa {age} anos</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {phone && (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3" /> {phone}
              </span>
            )}
            {congregation && (
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3 w-3" /> {congregation}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
        <p className="font-semibold">{title}</p>
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function SkeletonList() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-20 animate-pulse rounded-lg border border-border/60 bg-muted/40"
        />
      ))}
    </div>
  );
}
