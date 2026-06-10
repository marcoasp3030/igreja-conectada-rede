
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin_sede', 'admin_congregacao', 'lider_departamento', 'membro');
CREATE TYPE public.department_type AS ENUM ('UMADB', 'UFADEB', 'Alpha Kids', 'CREIO', 'Missoes', 'Assistencia Social', 'EBD', 'Teologia FAESP');
CREATE TYPE public.event_type AS ENUM ('culto', 'evento', 'festividade', 'reuniao', 'escala', 'ensaio');

-- ============ CONGREGATIONS ============
CREATE TABLE public.congregations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_headquarters BOOLEAN NOT NULL DEFAULT false,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  lead_pastor TEXT,
  assistant_pastors TEXT,
  phone TEXT,
  service_schedule JSONB DEFAULT '[]'::jsonb,
  active_departments TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.congregations TO authenticated;
GRANT ALL ON public.congregations TO service_role;
ALTER TABLE public.congregations ENABLE ROW LEVEL SECURITY;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  congregation_id UUID REFERENCES public.congregations(id) ON DELETE SET NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  congregation_id UUID REFERENCES public.congregations(id) ON DELETE CASCADE,
  department public.department_type,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role, congregation_id, department)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer functions (avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_sede_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin_sede')
$$;

CREATE OR REPLACE FUNCTION public.user_congregation(_user_id UUID)
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT congregation_id FROM public.profiles WHERE id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.can_admin_congregation(_user_id UUID, _congregation_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_sede_admin(_user_id) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin_congregacao' AND congregation_id = _congregation_id
  )
$$;

-- ============ MEMBERS ============
CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  congregation_id UUID NOT NULL REFERENCES public.congregations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  birth_date DATE,
  position TEXT,
  department public.department_type,
  address TEXT,
  address_number TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_members_congregation ON public.members(congregation_id);
CREATE INDEX idx_members_birth_date ON public.members(birth_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.members TO authenticated;
GRANT ALL ON public.members TO service_role;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- ============ EVENTS ============
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  congregation_id UUID REFERENCES public.congregations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_type public.event_type NOT NULL DEFAULT 'evento',
  department public.department_type,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  location TEXT,
  is_global BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_starts_at ON public.events(starts_at);
CREATE INDEX idx_events_congregation ON public.events(congregation_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- ============ ANNOUNCEMENTS ============
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  congregation_id UUID REFERENCES public.congregations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  department public.department_type,
  is_global BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_announcements_published_at ON public.announcements(published_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- ============ EBD LESSONS ============
CREATE TABLE public.ebd_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  reference TEXT,
  lesson_date DATE NOT NULL,
  daily_readings JSONB DEFAULT '[]'::jsonb,
  content TEXT,
  notice TEXT,
  congregation_id UUID REFERENCES public.congregations(id) ON DELETE CASCADE,
  is_global BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ebd_lessons_date ON public.ebd_lessons(lesson_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ebd_lessons TO authenticated;
GRANT ALL ON public.ebd_lessons TO service_role;
ALTER TABLE public.ebd_lessons ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============

-- Congregations: everyone authenticated reads; sede admin manages all; congregation admin updates own
CREATE POLICY "auth read congregations" ON public.congregations FOR SELECT TO authenticated USING (true);
CREATE POLICY "sede insert congregations" ON public.congregations FOR INSERT TO authenticated WITH CHECK (public.is_sede_admin(auth.uid()));
CREATE POLICY "sede or own admin update congregations" ON public.congregations FOR UPDATE TO authenticated USING (public.can_admin_congregation(auth.uid(), id));
CREATE POLICY "sede delete congregations" ON public.congregations FOR DELETE TO authenticated USING (public.is_sede_admin(auth.uid()));

-- Profiles: self read/update; sede reads all
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_sede_admin(auth.uid()));
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_sede_admin(auth.uid()));

-- User roles: user sees own roles; sede manages all
CREATE POLICY "view own roles or sede" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_sede_admin(auth.uid()));
CREATE POLICY "sede manage roles insert" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.is_sede_admin(auth.uid()));
CREATE POLICY "sede manage roles update" ON public.user_roles FOR UPDATE TO authenticated USING (public.is_sede_admin(auth.uid()));
CREATE POLICY "sede manage roles delete" ON public.user_roles FOR DELETE TO authenticated USING (public.is_sede_admin(auth.uid()));

-- Members
CREATE POLICY "view members in scope" ON public.members FOR SELECT TO authenticated USING (
  public.is_sede_admin(auth.uid()) OR congregation_id = public.user_congregation(auth.uid())
);
CREATE POLICY "manage members in scope insert" ON public.members FOR INSERT TO authenticated WITH CHECK (
  public.can_admin_congregation(auth.uid(), congregation_id)
);
CREATE POLICY "manage members in scope update" ON public.members FOR UPDATE TO authenticated USING (
  public.can_admin_congregation(auth.uid(), congregation_id)
);
CREATE POLICY "manage members in scope delete" ON public.members FOR DELETE TO authenticated USING (
  public.can_admin_congregation(auth.uid(), congregation_id)
);

-- Events
CREATE POLICY "view events in scope" ON public.events FOR SELECT TO authenticated USING (
  is_global OR public.is_sede_admin(auth.uid()) OR congregation_id = public.user_congregation(auth.uid())
);
CREATE POLICY "manage events in scope insert" ON public.events FOR INSERT TO authenticated WITH CHECK (
  public.is_sede_admin(auth.uid()) OR public.can_admin_congregation(auth.uid(), congregation_id)
);
CREATE POLICY "manage events in scope update" ON public.events FOR UPDATE TO authenticated USING (
  public.is_sede_admin(auth.uid()) OR public.can_admin_congregation(auth.uid(), congregation_id)
);
CREATE POLICY "manage events in scope delete" ON public.events FOR DELETE TO authenticated USING (
  public.is_sede_admin(auth.uid()) OR public.can_admin_congregation(auth.uid(), congregation_id)
);

-- Announcements
CREATE POLICY "view announcements in scope" ON public.announcements FOR SELECT TO authenticated USING (
  is_global OR public.is_sede_admin(auth.uid()) OR congregation_id = public.user_congregation(auth.uid())
);
CREATE POLICY "manage announcements insert" ON public.announcements FOR INSERT TO authenticated WITH CHECK (
  public.is_sede_admin(auth.uid()) OR public.can_admin_congregation(auth.uid(), congregation_id)
);
CREATE POLICY "manage announcements update" ON public.announcements FOR UPDATE TO authenticated USING (
  public.is_sede_admin(auth.uid()) OR public.can_admin_congregation(auth.uid(), congregation_id)
);
CREATE POLICY "manage announcements delete" ON public.announcements FOR DELETE TO authenticated USING (
  public.is_sede_admin(auth.uid()) OR public.can_admin_congregation(auth.uid(), congregation_id)
);

-- EBD lessons
CREATE POLICY "view ebd in scope" ON public.ebd_lessons FOR SELECT TO authenticated USING (
  is_global OR public.is_sede_admin(auth.uid()) OR congregation_id = public.user_congregation(auth.uid())
);
CREATE POLICY "manage ebd insert" ON public.ebd_lessons FOR INSERT TO authenticated WITH CHECK (
  public.is_sede_admin(auth.uid()) OR public.can_admin_congregation(auth.uid(), congregation_id)
);
CREATE POLICY "manage ebd update" ON public.ebd_lessons FOR UPDATE TO authenticated USING (
  public.is_sede_admin(auth.uid()) OR public.can_admin_congregation(auth.uid(), congregation_id)
);
CREATE POLICY "manage ebd delete" ON public.ebd_lessons FOR DELETE TO authenticated USING (
  public.is_sede_admin(auth.uid()) OR public.can_admin_congregation(auth.uid(), congregation_id)
);

-- ============ TRIGGERS ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_congregations_updated BEFORE UPDATE ON public.congregations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_members_updated BEFORE UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_events_updated BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_ebd_updated BEFORE UPDATE ON public.ebd_lessons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
  -- Default role: membro
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'membro');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
