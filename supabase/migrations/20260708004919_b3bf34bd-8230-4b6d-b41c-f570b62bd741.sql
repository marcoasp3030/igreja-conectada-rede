
-- 1. Enable RLS on unprotected tables + grants + policies

-- mao_amiga_categorias: readable by all authenticated; only sede admin can modify
ALTER TABLE public.mao_amiga_categorias ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.mao_amiga_categorias TO authenticated;
GRANT ALL ON public.mao_amiga_categorias TO service_role;
CREATE POLICY "Authenticated can view categorias"
  ON public.mao_amiga_categorias FOR SELECT TO authenticated USING (true);
CREATE POLICY "Sede admin manages categorias"
  ON public.mao_amiga_categorias FOR ALL TO authenticated
  USING (public.is_sede_admin(auth.uid()))
  WITH CHECK (public.is_sede_admin(auth.uid()));

-- ministry_roles: readable by all authenticated; only sede admin can modify
ALTER TABLE public.ministry_roles ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.ministry_roles TO authenticated;
GRANT ALL ON public.ministry_roles TO service_role;
CREATE POLICY "Authenticated can view ministry_roles"
  ON public.ministry_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Sede admin manages ministry_roles"
  ON public.ministry_roles FOR ALL TO authenticated
  USING (public.is_sede_admin(auth.uid()))
  WITH CHECK (public.is_sede_admin(auth.uid()));

-- volunteer_roles: only congregation admins can manage; view scoped by volunteer's congregation
ALTER TABLE public.volunteer_roles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_roles TO authenticated;
GRANT ALL ON public.volunteer_roles TO service_role;
CREATE POLICY "View volunteer_roles by congregation"
  ON public.volunteer_roles FOR SELECT TO authenticated
  USING (
    public.is_sede_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.volunteers v
      WHERE v.id = volunteer_roles.volunteer_id
        AND v.congregation_id = public.user_congregation(auth.uid())
    )
  );
CREATE POLICY "Manage volunteer_roles by admins"
  ON public.volunteer_roles FOR ALL TO authenticated
  USING (
    public.is_sede_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.volunteers v
      WHERE v.id = volunteer_roles.volunteer_id
        AND public.can_admin_congregation(auth.uid(), v.congregation_id)
    )
  )
  WITH CHECK (
    public.is_sede_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.volunteers v
      WHERE v.id = volunteer_roles.volunteer_id
        AND public.can_admin_congregation(auth.uid(), v.congregation_id)
    )
  );

-- 2. Tighten overly permissive policies

-- volunteers: replace USING(true) SELECT with congregation-scoped
DROP POLICY IF EXISTS "Users can view all volunteers" ON public.volunteers;
CREATE POLICY "View volunteers in own congregation"
  ON public.volunteers FOR SELECT TO authenticated
  USING (
    public.is_sede_admin(auth.uid())
    OR congregation_id = public.user_congregation(auth.uid())
  );

-- event_schedules: scope SELECT
DROP POLICY IF EXISTS "Users can view all event schedules" ON public.event_schedules;
CREATE POLICY "View schedules in own congregation"
  ON public.event_schedules FOR SELECT TO authenticated
  USING (
    public.is_sede_admin(auth.uid())
    OR congregation_id = public.user_congregation(auth.uid())
  );

-- schedule_assignments: replace permissive policies
DROP POLICY IF EXISTS "Users can view assignments" ON public.schedule_assignments;
DROP POLICY IF EXISTS "Manage assignments" ON public.schedule_assignments;

CREATE POLICY "View assignments by congregation"
  ON public.schedule_assignments FOR SELECT TO authenticated
  USING (
    public.is_sede_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.event_schedules s
      WHERE s.id = schedule_assignments.schedule_id
        AND s.congregation_id = public.user_congregation(auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.volunteers v
      WHERE v.id = schedule_assignments.volunteer_id
        AND v.congregation_id = public.user_congregation(auth.uid())
    )
  );

CREATE POLICY "Manage assignments by admins"
  ON public.schedule_assignments FOR ALL TO authenticated
  USING (
    public.is_sede_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.event_schedules s
      WHERE s.id = schedule_assignments.schedule_id
        AND public.can_admin_congregation(auth.uid(), s.congregation_id)
    )
  )
  WITH CHECK (
    public.is_sede_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.event_schedules s
      WHERE s.id = schedule_assignments.schedule_id
        AND public.can_admin_congregation(auth.uid(), s.congregation_id)
    )
  );

-- 3. Fix mutable search_path on trigger functions
CREATE OR REPLACE FUNCTION public.handle_mao_amiga_entrega()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.mao_amiga_estoque 
        WHERE congregation_id = NEW.congregation_id 
        AND categoria_id = NEW.categoria_id 
        AND descricao = NEW.descricao 
        AND quantidade >= NEW.quantidade
    ) THEN
        RAISE EXCEPTION 'Saldo insuficiente no estoque para este item.';
    END IF;

    UPDATE public.mao_amiga_estoque 
    SET quantidade = quantidade - NEW.quantidade, updated_at = now()
    WHERE congregation_id = NEW.congregation_id 
    AND categoria_id = NEW.categoria_id 
    AND descricao = NEW.descricao;

    INSERT INTO public.mao_amiga_estoque_movimentos (congregation_id, categoria_id, descricao, quantidade, tipo, referencia_id, created_by)
    VALUES (NEW.congregation_id, NEW.categoria_id, NEW.descricao, NEW.quantidade, 'saida', NEW.id, NEW.responsavel_id);

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_mao_amiga_doacao()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.mao_amiga_estoque (congregation_id, categoria_id, descricao, unidade, quantidade)
    VALUES (NEW.congregation_id, NEW.categoria_id, NEW.descricao, NEW.unidade, NEW.quantidade)
    ON CONFLICT (congregation_id, categoria_id, descricao, unidade)
    DO UPDATE SET quantidade = public.mao_amiga_estoque.quantidade + EXCLUDED.quantidade, updated_at = now();

    INSERT INTO public.mao_amiga_estoque_movimentos (congregation_id, categoria_id, descricao, quantidade, tipo, referencia_id, created_by)
    VALUES (NEW.congregation_id, NEW.categoria_id, NEW.descricao, NEW.quantidade, 'entrada', NEW.id, NEW.created_by);

    RETURN NEW;
END;
$function$;

-- 4. Restrict EXECUTE on SECURITY DEFINER functions.
-- Revoke from PUBLIC/anon; grant only to authenticated + service_role where needed.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon', r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated, service_role', r.proname, r.args);
  END LOOP;
END $$;

-- Trigger functions don't need any role EXECUTE (fired by table owner)
REVOKE EXECUTE ON FUNCTION public.handle_mao_amiga_doacao() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_mao_amiga_entrega() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.business_listings_reset_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.business_listings_before_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.finance_transactions_block_locked() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.finance_transactions_audit_trigger() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.finance_closings_history_trigger() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.finance_closings_protect() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
