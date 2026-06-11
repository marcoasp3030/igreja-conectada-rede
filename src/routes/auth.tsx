import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrandLogo } from "@/components/brand-logo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, Lock, User, ShieldCheck, ArrowRight, Loader2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — AD Setor 70" },
      { name: "description", content: "Acesse o sistema de gestão da Assembleia de Deus Setor 70." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo(a)!");
    navigate({ to: "/app" });
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: { full_name: fullName },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Cadastro criado! Verifique seu e-mail.");
  };

  return (
    <div className="min-h-screen bg-muted/30 lg:grid lg:grid-cols-[1.1fr_1fr] xl:grid-cols-[1.2fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-gradient-hero lg:block">
        {/* decorative orbs */}
        <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-gold/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-primary-foreground/10 blur-3xl" />
        {/* grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative flex h-full flex-col justify-between p-10 text-primary-foreground xl:p-14">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/10 p-2 ring-1 ring-white/20 backdrop-blur-sm">
              <BrandLogo className="h-9 w-9" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">AD Setor 70</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-primary-foreground/70">
                Sistema de gestão
              </p>
            </div>
          </div>

          {/* Headline */}
          <div className="max-w-lg">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-gold backdrop-blur">
              <Sparkles className="h-3 w-3" /> Plataforma eclesiástica
            </span>
            <h2 className="mt-5 text-4xl font-semibold leading-tight tracking-tight xl:text-[2.65rem]">
              Gerencie sua igreja com{" "}
              <span className="bg-gradient-gold bg-clip-text text-transparent">clareza</span> e propósito.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-primary-foreground/80">
              Congregações, membros, finanças, EBD e escalas — tudo em uma plataforma moderna construída para o ministério.
            </p>

            <dl className="mt-8 grid grid-cols-3 gap-3">
              {[
                { k: "100%", v: "Seguro" },
                { k: "24/7", v: "Disponível" },
                { k: "+8", v: "Módulos" },
              ].map((s) => (
                <div
                  key={s.v}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-sm"
                >
                  <dt className="text-lg font-bold text-gold">{s.k}</dt>
                  <dd className="mt-0.5 text-xs text-primary-foreground/75">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-[11px] text-primary-foreground/60">
            <span>© {new Date().getFullYear()} AD Setor 70</span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Conexão segura
            </span>
          </div>
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex min-h-screen items-center justify-center p-4 sm:p-8 lg:min-h-0">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-6 flex flex-col items-center text-center lg:hidden">
            <div className="rounded-xl bg-gradient-hero p-2.5 shadow-lg">
              <BrandLogo className="h-10 w-10" />
            </div>
            <p className="mt-2 text-sm font-semibold">AD Setor 70</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Sistema de gestão
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-xl sm:p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold tracking-tight">Acessar o sistema</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Entre com sua conta ou solicite um novo acesso.
              </p>
            </div>

            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-lg bg-muted/60 p-1">
                <TabsTrigger value="signin" className="rounded-md">Entrar</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-md">Cadastrar</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-5">
                <form onSubmit={signIn} className="space-y-4">
                  <Field id="email" label="E-mail" icon={Mail}>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="voce@igreja.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-11 pl-10"
                    />
                  </Field>

                  <Field id="password" label="Senha" icon={Lock}>
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="h-11 pl-10 pr-10"
                    />
                    <PasswordToggle show={showPassword} onToggle={() => setShowPassword((v) => !v)} />
                  </Field>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="group h-11 w-full bg-gradient-hero font-semibold shadow-md shadow-primary/20 transition hover:opacity-95"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando...
                      </>
                    ) : (
                      <>
                        Entrar
                        <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-0.5" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-5">
                <form onSubmit={signUp} className="space-y-4">
                  <Field id="name" label="Nome completo" icon={User}>
                    <Input
                      id="name"
                      autoComplete="name"
                      placeholder="Seu nome"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="h-11 pl-10"
                    />
                  </Field>

                  <Field id="email2" label="E-mail" icon={Mail}>
                    <Input
                      id="email2"
                      type="email"
                      autoComplete="email"
                      placeholder="voce@igreja.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-11 pl-10"
                    />
                  </Field>

                  <Field id="password2" label="Senha" icon={Lock}>
                    <Input
                      id="password2"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="h-11 pl-10 pr-10"
                    />
                    <PasswordToggle show={showPassword} onToggle={() => setShowPassword((v) => !v)} />
                  </Field>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-11 w-full bg-gradient-hero font-semibold shadow-md shadow-primary/20 transition hover:opacity-95"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando...
                      </>
                    ) : (
                      "Criar conta"
                    )}
                  </Button>

                  <p className="rounded-lg border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    Após criar a conta, peça ao administrador para vincular sua congregação e perfil.
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </div>

          <p className="mt-6 text-center text-[11px] text-muted-foreground">
            Ao continuar, você concorda com as políticas internas da igreja.
          </p>
        </div>
      </main>
    </div>
  );
}

function Field({
  id,
  label,
  icon: Icon,
  children,
}: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        {children}
      </div>
    </div>
  );
}

function PasswordToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
      aria-label={show ? "Ocultar senha" : "Mostrar senha"}
    >
      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}
