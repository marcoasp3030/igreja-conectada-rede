import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrandLogo } from "@/components/brand-logo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, Lock, User, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";

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
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Background ambient effects */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-hero opacity-95" />
        <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -right-32 bottom-1/4 h-[28rem] w-[28rem] rounded-full bg-gold/20 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
      </div>

      <div className="relative grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
        {/* Left brand panel */}
        <div className="relative hidden flex-col justify-between p-12 text-primary-foreground lg:flex">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/10 p-2 backdrop-blur-md ring-1 ring-white/20">
              <BrandLogo className="h-10 w-10" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-wide">AD Setor 70</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-primary-foreground/70">
                Sistema de gestão
              </p>
            </div>
          </div>

          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-gold backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5" /> Acesso seguro
            </span>
            <h2 className="mt-5 text-4xl font-semibold leading-tight tracking-tight">
              Gerencie sua igreja com{" "}
              <span className="bg-gradient-gold bg-clip-text text-transparent">clareza</span> e propósito.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-primary-foreground/75">
              Congregações, membros, finanças, EBD e escalas — tudo em uma plataforma moderna,
              construída para o ministério.
            </p>

            <div className="mt-8 grid grid-cols-3 gap-3 text-xs">
              {[
                { k: "100%", v: "Seguro" },
                { k: "24/7", v: "Disponível" },
                { k: "+8", v: "Módulos" },
              ].map((s) => (
                <div
                  key={s.v}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur"
                >
                  <p className="text-lg font-semibold text-gold">{s.k}</p>
                  <p className="mt-0.5 text-primary-foreground/70">{s.v}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-primary-foreground/60">
            © {new Date().getFullYear()} AD Setor 70 — Ministério do Belém
          </p>
        </div>

        {/* Right form panel */}
        <div className="flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-md">
            <div className="mb-6 flex flex-col items-center text-center lg:hidden">
              <div className="rounded-xl bg-white/10 p-2 ring-1 ring-white/20 backdrop-blur">
                <BrandLogo className="h-12 w-12" />
              </div>
              <p className="mt-2 text-sm font-semibold text-primary-foreground">AD Setor 70</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-card/80 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
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

                <TabsContent value="signin">
                  <form onSubmit={signIn} className="mt-5 space-y-4">
                    <Field id="email" label="E-mail" icon={Mail}>
                      <Input
                        id="email"
                        type="email"
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
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="h-11 pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                        aria-label="Mostrar senha"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </Field>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="group h-11 w-full bg-gradient-hero font-semibold shadow-lg shadow-primary/20 transition hover:opacity-95"
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

                <TabsContent value="signup">
                  <form onSubmit={signUp} className="mt-5 space-y-4">
                    <Field id="name" label="Nome completo" icon={User}>
                      <Input
                        id="name"
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
                        placeholder="Mínimo 6 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="h-11 pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                        aria-label="Mostrar senha"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </Field>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="h-11 w-full bg-gradient-hero font-semibold shadow-lg shadow-primary/20 transition hover:opacity-95"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando...
                        </>
                      ) : (
                        "Criar conta"
                      )}
                    </Button>

                    <p className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                      Após criar a conta, peça ao administrador para vincular sua congregação e perfil.
                    </p>
                  </form>
                </TabsContent>
              </Tabs>

              <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Conexão criptografada e protegida
              </div>
            </div>
          </div>
        </div>
      </div>
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
