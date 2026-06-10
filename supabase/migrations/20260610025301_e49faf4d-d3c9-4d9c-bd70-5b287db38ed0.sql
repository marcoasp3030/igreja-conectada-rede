
CREATE TABLE public.user_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  target_user_id uuid,
  target_user_email text,
  target_user_name text,
  actor_user_id uuid,
  actor_user_name text,
  congregation_id uuid REFERENCES public.congregations(id) ON DELETE SET NULL,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.user_audit_logs TO authenticated;
GRANT ALL ON public.user_audit_logs TO service_role;

ALTER TABLE public.user_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sede admins view all audit logs"
  ON public.user_audit_logs FOR SELECT TO authenticated
  USING (public.is_sede_admin(auth.uid()));

CREATE POLICY "Local admins view own congregation audit logs"
  ON public.user_audit_logs FOR SELECT TO authenticated
  USING (
    congregation_id IS NOT NULL
    AND public.can_admin_congregation(auth.uid(), congregation_id)
  );

CREATE INDEX user_audit_logs_created_at_idx ON public.user_audit_logs (created_at DESC);
CREATE INDEX user_audit_logs_target_idx ON public.user_audit_logs (target_user_id);
CREATE INDEX user_audit_logs_cong_idx ON public.user_audit_logs (congregation_id);
