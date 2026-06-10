import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin } from "lucide-react";

export const Route = createFileRoute("/_authenticated/mapa")({
  component: Mapa,
});

function Mapa() {
  const { data } = useQuery({
    queryKey: ["map-data"],
    queryFn: async () => {
      const [members, congs] = await Promise.all([
        supabase.from("members").select("id, full_name, address, city, neighborhood, congregation_id").limit(500),
        supabase.from("congregations").select("id, name, address, city, latitude, longitude"),
      ]);
      return { members: members.data ?? [], congs: congs.data ?? [] };
    },
  });

  const byCong = new Map<string, number>();
  for (const m of data?.members ?? []) byCong.set(m.congregation_id, (byCong.get(m.congregation_id) ?? 0) + 1);

  return (
    <div>
      <PageHeader title="Mapa de Membros" description="Distribuição geográfica das congregações e membros." />

      <Card className="shadow-card">
        <CardContent className="p-0">
          <div className="relative flex h-[420px] items-center justify-center overflow-hidden rounded-t-xl bg-gradient-hero">
            <div className="absolute inset-0 opacity-20"
              style={{ backgroundImage: "radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 70% 60%, white 1px, transparent 1px), radial-gradient(circle at 40% 80%, white 1px, transparent 1px)", backgroundSize: "120px 120px" }}
            />
            <div className="relative text-center text-primary-foreground">
              <MapPin className="mx-auto h-12 w-12 text-gold" />
              <p className="mt-2 text-lg font-semibold">Mapa interativo</p>
              <p className="mt-1 max-w-md text-sm text-primary-foreground/80">
                Em breve: visualização das congregações e membros em mapa real (Mapbox/Google Maps).
                Atualmente exibimos a distribuição agregada.
              </p>
            </div>
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
            {data?.congs.map((c) => (
              <div key={c.id} className="rounded-xl border bg-card p-4 shadow-card">
                <p className="font-semibold">{c.name}</p>
                <p className="text-xs text-muted-foreground">{[c.address, c.city].filter(Boolean).join(", ") || "Sem endereço"}</p>
                <p className="mt-3 text-xs">
                  <span className="rounded-full bg-secondary px-2 py-0.5 font-semibold text-secondary-foreground">
                    {byCong.get(c.id) ?? 0} membros
                  </span>
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
