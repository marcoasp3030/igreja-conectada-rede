import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Entrar — AD Setor 70" },
      { name: "description", content: "Acesse o sistema de gestão da Assembleia de Deus Setor 70." },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") throw redirect({ to: "/auth" });
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/app" });
    throw redirect({ to: "/auth" });
  },
  component: () => null,
});

function Landing() {
  const features = [
    { icon: Church, title: "Congregações", desc: "Cadastro completo com pastores, horários e endereço." },
    { icon: Users, title: "Membros", desc: "Gestão de membros, departamentos e aniversariantes." },
    { icon: Calendar, title: "Agenda", desc: "Cultos, escalas, eventos e festividades em um só lugar." },
    { icon: BookOpen, title: "EBD", desc: "Lições, leitura diária e avisos para todos." },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/50 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <BrandLogo className="h-10 w-10" />
            <div className="leading-tight">
              <p className="text-sm font-semibold">AD Setor 70</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ministério do Belém</p>
            </div>
          </div>
          <Button asChild variant="default">
            <Link to="/auth">Entrar</Link>
          </Button>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-95" />
        <div className="container relative mx-auto grid gap-10 px-4 py-20 md:grid-cols-2 md:py-28">
          <div className="text-primary-foreground">
            <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-gold">
              Gestão eclesiástica
            </span>
            <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
              A casa do Senhor, <span className="text-gold">organizada</span> em uma só plataforma.
            </h1>
            <p className="mt-4 max-w-lg text-base text-primary-foreground/85">
              Gerencie congregações, membros, cultos, escalas, EBD e departamentos do Setor 70 com clareza, segurança e simplicidade.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-gradient-gold text-gold-foreground hover:opacity-95">
                <Link to="/auth">Acessar o sistema <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
          <div className="hidden items-center justify-center md:flex">
            <div className="rounded-3xl bg-white/10 p-10 shadow-soft backdrop-blur">
              <BrandLogo className="h-56 w-56" />
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <h2 className="mb-8 text-center text-2xl font-semibold">Tudo o que sua igreja precisa</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-5 shadow-card transition hover:-translate-y-0.5">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-hero text-primary-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/60 py-6">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Assembleia de Deus — Ministério do Belém — Setor 70
        </div>
      </footer>
    </div>
  );
}
