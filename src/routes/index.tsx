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

