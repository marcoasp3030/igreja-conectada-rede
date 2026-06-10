import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { supabase } from "@/integrations/supabase/client";
import { Users, Church, Calendar, Cake, Megaphone, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [congs, members, events, announcements, ebd] = await Promise.all([
        supabase.from("congregations").select("id, name, is_headquarters"),
        supabase.from("members").select("id, full_name, birth_date, congregation_id, department, active"),
        supabase.from("events").select("id, title, starts_at, event_type, location").gte("starts_at", new Date().toISOString()).order("starts_at").limit(5),
        supabase.from("announcements").select("id, title, body, published_at").order("published_at", { ascending: false }).limit(4),
        supabase.from("ebd_lessons").select("id, title, lesson_date").order("lesson_date", { ascending: false }).limit(1),
      ]);
      return { congs: congs.data ?? [], members: members.data ?? [], events: events.data ?? [], announcements: announcements.data ?? [], ebd: ebd.data ?? [] };
    },
  });

  const today = new Date();
  const birthdays = (data?.members ?? []).filter((m) => {
    if (!m.birth_date) return false;
    const d = new Date(m.birth_date);
    return d.getMonth() === today.getMonth();
  });

  const membersByCong = new Map<string, number>();
  for (const m of data?.members ?? []) {
    membersByCong.set(m.congregation_id, (membersByCong.get(m.congregation_id) ?? 0) + 1);
  }

  const stats = [
    { label: "Congregações", value: data?.congs.length ?? 0, icon: Church, accent: "bg-gradient-hero text-primary-foreground" },
    { label: "Membros", value: data?.members.length ?? 0, icon: Users, accent: "bg-gradient-gold text-gold-foreground" },
    { label: "Eventos próximos", value: data?.events.length ?? 0, icon: Calendar, accent: "bg-secondary text-secondary-foreground" },
    { label: "Aniversariantes do mês", value: birthdays.length, icon: Cake, accent: "bg-accent text-accent-foreground" },
  ];

  return (
    <div>
      <PageHeader
        title="Painel da Sede"
        description="Visão geral de todas as congregações do Setor 70."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="shadow-card">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${s.accent}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold leading-none">{isLoading ? "…" : s.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Church className="h-4 w-4 text-primary" /> Membros por congregação</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.congs.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma congregação cadastrada ainda.</p>
            )}
            <ul className="divide-y">
              {data?.congs.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{c.name}</span>
                    {c.is_headquarters && (
                      <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold">
                        Sede
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">{membersByCong.get(c.id) ?? 0} membros</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> Próximos eventos</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.events.length === 0 && <p className="text-sm text-muted-foreground">Nada agendado.</p>}
            <ul className="space-y-3">
              {data?.events.map((e) => (
                <li key={e.id} className="rounded-lg border bg-card p-3">
                  <p className="text-sm font-semibold">{e.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(e.starts_at), "PPP p", { locale: ptBR })}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Megaphone className="h-4 w-4 text-primary" /> Últimos avisos</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.announcements.length === 0 && <p className="text-sm text-muted-foreground">Sem avisos recentes.</p>}
            <ul className="space-y-3">
              {data?.announcements.map((a) => (
                <li key={a.id}>
                  <p className="text-sm font-semibold">{a.title}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{a.body}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> EBD — Lição mais recente</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.ebd[0] ? (
              <div>
                <p className="text-base font-semibold">{data.ebd[0].title}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(data.ebd[0].lesson_date), "PPP", { locale: ptBR })}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma lição cadastrada.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
