import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin_sede" | "admin_congregacao" | "lider_departamento" | "membro";

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*, congregations(*)").eq("id", userId!).maybeSingle(),
        supabase.from("user_roles").select("*").eq("user_id", userId!),
      ]);
      const roles = (rolesRes.data ?? []).map((r) => r.role as AppRole);
      return {
        profile: profileRes.data,
        roles,
        isSedeAdmin: roles.includes("admin_sede"),
        isCongregacaoAdmin: roles.includes("admin_congregacao") || roles.includes("admin_sede"),
      };
    },
  });
}
