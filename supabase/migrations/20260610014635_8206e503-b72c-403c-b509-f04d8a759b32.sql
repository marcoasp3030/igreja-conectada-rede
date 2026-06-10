-- ============ EBD TABLES ============

-- 1. Classes/Turmas
CREATE TYPE public.ebd_category AS ENUM ('Adultos', 'Crianças', 'Jovens', 'Homens', 'Mulheres');

CREATE TABLE public.ebd_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  congregation_id UUID NOT NULL REFERENCES public.congregations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category public.ebd_category NOT NULL,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assistant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ebd_classes TO authenticated;
GRANT ALL ON public.ebd_classes TO service_role;
ALTER TABLE public.ebd_classes ENABLE ROW LEVEL SECURITY;

-- 2. Enrollments (Alunos/Matriculados)
CREATE TYPE public.ebd_student_status AS ENUM ('ativo', 'visitante', 'transferido', 'inativo');

CREATE TABLE public.ebd_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  congregation_id UUID NOT NULL REFERENCES public.congregations(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.ebd_classes(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE, -- Optional link to members
  full_name TEXT NOT NULL,
  phone TEXT,
  birth_date DATE,
  address TEXT,
  guardian_name TEXT, -- For children
  status public.ebd_student_status NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ebd_enrollments TO authenticated;
GRANT ALL ON public.ebd_enrollments TO service_role;
ALTER TABLE public.ebd_enrollments ENABLE ROW LEVEL SECURITY;

-- 3. Attendance Sessions (Aulas)
CREATE TABLE public.ebd_attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.ebd_classes(id) ON DELETE CASCADE,
  lesson_date DATE NOT NULL DEFAULT CURRENT_DATE,
  lesson_title TEXT,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ebd_attendance_sessions TO authenticated;
GRANT ALL ON public.ebd_attendance_sessions TO service_role;
ALTER TABLE public.ebd_attendance_sessions ENABLE ROW LEVEL SECURITY;

-- 4. Attendance Records (Presenças)
CREATE TABLE public.ebd_attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.ebd_attendance_sessions(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES public.ebd_enrollments(id) ON DELETE CASCADE,
  present BOOLEAN NOT NULL DEFAULT true,
  justification TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, enrollment_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ebd_attendance_records TO authenticated;
GRANT ALL ON public.ebd_attendance_records TO service_role;
ALTER TABLE public.ebd_attendance_records ENABLE ROW LEVEL SECURITY;

-- ============ POLICIES ============

-- ebd_classes
CREATE POLICY "view ebd_classes scope" ON public.ebd_classes FOR SELECT TO authenticated USING (
  public.is_sede_admin(auth.uid()) OR congregation_id = public.user_congregation(auth.uid())
);
CREATE POLICY "manage ebd_classes scope" ON public.ebd_classes FOR ALL TO authenticated USING (
  public.is_sede_admin(auth.uid()) OR public.can_admin_congregation(auth.uid(), congregation_id)
);

-- ebd_enrollments
CREATE POLICY "view ebd_enrollments scope" ON public.ebd_enrollments FOR SELECT TO authenticated USING (
  public.is_sede_admin(auth.uid()) OR congregation_id = public.user_congregation(auth.uid())
);
CREATE POLICY "manage ebd_enrollments scope" ON public.ebd_enrollments FOR ALL TO authenticated USING (
  public.is_sede_admin(auth.uid()) OR public.can_admin_congregation(auth.uid(), congregation_id)
);

-- ebd_attendance_sessions
CREATE POLICY "view ebd_attendance_sessions scope" ON public.ebd_attendance_sessions FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.ebd_classes c
    WHERE c.id = class_id AND (public.is_sede_admin(auth.uid()) OR c.congregation_id = public.user_congregation(auth.uid()))
  )
);
CREATE POLICY "manage ebd_attendance_sessions scope" ON public.ebd_attendance_sessions FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.ebd_classes c
    WHERE c.id = class_id AND (public.is_sede_admin(auth.uid()) OR public.can_admin_congregation(auth.uid(), c.congregation_id))
  )
);

-- ebd_attendance_records
CREATE POLICY "view ebd_attendance_records scope" ON public.ebd_attendance_records FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.ebd_attendance_sessions s
    JOIN public.ebd_classes c ON c.id = s.class_id
    WHERE s.id = session_id AND (public.is_sede_admin(auth.uid()) OR c.congregation_id = public.user_congregation(auth.uid()))
  )
);
CREATE POLICY "manage ebd_attendance_records scope" ON public.ebd_attendance_records FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.ebd_attendance_sessions s
    JOIN public.ebd_classes c ON c.id = s.class_id
    WHERE s.id = session_id AND (public.is_sede_admin(auth.uid()) OR public.can_admin_congregation(auth.uid(), c.congregation_id))
  )
);

-- ============ TRIGGERS ============
CREATE TRIGGER trg_ebd_classes_updated BEFORE UPDATE ON public.ebd_classes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_ebd_enrollments_updated BEFORE UPDATE ON public.ebd_enrollments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
