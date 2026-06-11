
CREATE TABLE public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sede admins can view system settings"
  ON public.system_settings FOR SELECT
  TO authenticated
  USING (public.is_sede_admin(auth.uid()));

CREATE POLICY "Sede admins can insert system settings"
  ON public.system_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_sede_admin(auth.uid()));

CREATE POLICY "Sede admins can update system settings"
  ON public.system_settings FOR UPDATE
  TO authenticated
  USING (public.is_sede_admin(auth.uid()))
  WITH CHECK (public.is_sede_admin(auth.uid()));

CREATE POLICY "Sede admins can delete system settings"
  ON public.system_settings FOR DELETE
  TO authenticated
  USING (public.is_sede_admin(auth.uid()));
