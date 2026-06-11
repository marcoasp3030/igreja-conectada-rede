
CREATE TABLE IF NOT EXISTS public.member_departments (
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  departamento_id uuid NOT NULL REFERENCES public.departamentos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (member_id, departamento_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_departments TO authenticated;
GRANT ALL ON public.member_departments TO service_role;
ALTER TABLE public.member_departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view member_departments in scope" ON public.member_departments
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.members m WHERE m.id = member_id
      AND (public.is_sede_admin(auth.uid()) OR m.congregation_id = public.user_congregation(auth.uid())))
  );
CREATE POLICY "manage member_departments in scope" ON public.member_departments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members m WHERE m.id = member_id AND public.can_admin_congregation(auth.uid(), m.congregation_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.members m WHERE m.id = member_id AND public.can_admin_congregation(auth.uid(), m.congregation_id)));

CREATE TABLE IF NOT EXISTS public.member_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  contact_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_member_skills_member ON public.member_skills(member_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_skills TO authenticated;
GRANT ALL ON public.member_skills TO service_role;
ALTER TABLE public.member_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view member_skills in scope" ON public.member_skills
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.members m WHERE m.id = member_id
      AND (public.is_sede_admin(auth.uid()) OR m.congregation_id = public.user_congregation(auth.uid())))
  );
CREATE POLICY "manage member_skills in scope" ON public.member_skills
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members m WHERE m.id = member_id AND public.can_admin_congregation(auth.uid(), m.congregation_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.members m WHERE m.id = member_id AND public.can_admin_congregation(auth.uid(), m.congregation_id)));
CREATE TRIGGER trg_member_skills_updated BEFORE UPDATE ON public.member_skills
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
