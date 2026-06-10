-- 1. Ministry Roles (Pregador, Cantor, etc)
CREATE TABLE public.ministry_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT SELECT ON public.ministry_roles TO authenticated;
GRANT ALL ON public.ministry_roles TO service_role;

-- Seed inicial
INSERT INTO public.ministry_roles (name) VALUES 
('Pregador'), ('Cantor'), ('Mídia'), ('Som'), ('Foto'), 
('Recepção'), ('Intercessão'), ('Professor'), ('Dirigente'), 
('Músico'), ('Apoio');

-- 2. Volunteers
CREATE TABLE public.volunteers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
    congregation_id UUID REFERENCES public.congregations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    availability TEXT, -- Pode ser JSON futuramente
    notes TEXT,
    status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteers TO authenticated;
GRANT ALL ON public.volunteers TO service_role;

ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all volunteers" ON public.volunteers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage volunteers" ON public.volunteers FOR ALL TO authenticated USING (public.is_sede_admin(auth.uid()) OR public.can_admin_congregation(auth.uid(), congregation_id));

-- 3. Volunteer Roles (Pivot)
CREATE TABLE public.volunteer_roles (
    volunteer_id UUID REFERENCES public.volunteers(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.ministry_roles(id) ON DELETE CASCADE,
    PRIMARY KEY (volunteer_id, role_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_roles TO authenticated;
GRANT ALL ON public.volunteer_roles TO service_role;

-- 4. Event Schedules (Header)
CREATE TABLE public.event_schedules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE UNIQUE,
    congregation_id UUID REFERENCES public.congregations(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_schedules TO authenticated;
GRANT ALL ON public.event_schedules TO service_role;

ALTER TABLE public.event_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all event schedules" ON public.event_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Congregation admins can manage their schedules" ON public.event_schedules FOR ALL TO authenticated USING (public.is_sede_admin(auth.uid()) OR public.can_admin_congregation(auth.uid(), congregation_id));

-- 5. Schedule Assignments (The Scale entries)
CREATE TABLE public.schedule_assignments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    schedule_id UUID REFERENCES public.event_schedules(id) ON DELETE CASCADE,
    volunteer_id UUID REFERENCES public.volunteers(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.ministry_roles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'recusado', 'concluido')),
    is_cross_congregation BOOLEAN DEFAULT false,
    requesting_congregation_id UUID REFERENCES public.congregations(id),
    approver_user_id UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_assignments TO authenticated;
GRANT ALL ON public.schedule_assignments TO service_role;

ALTER TABLE public.schedule_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view assignments" ON public.schedule_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage assignments" ON public.schedule_assignments FOR ALL TO authenticated USING (true); -- Refined via business logic in server functions or complex SQL

-- 6. Notifications
CREATE TABLE public.schedule_notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_notifications TO authenticated;
GRANT ALL ON public.schedule_notifications TO service_role;

ALTER TABLE public.schedule_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON public.schedule_notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.schedule_notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 7. Conflict Check Function
CREATE OR REPLACE FUNCTION public.check_volunteer_conflict(_volunteer_id UUID, _event_id UUID)
RETURNS TABLE (event_id UUID, title TEXT, starts_at TIMESTAMP WITH TIME ZONE, ends_at TIMESTAMP WITH TIME ZONE)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT e.id, e.title, e.starts_at, e.ends_at
    FROM public.events e
    JOIN public.event_schedules s ON s.event_id = e.id
    JOIN public.schedule_assignments a ON a.schedule_id = s.id
    WHERE a.volunteer_id = _volunteer_id
    AND a.status IN ('pendente', 'aprovado')
    AND e.id != _event_id
    AND (
        (e.starts_at, COALESCE(e.ends_at, e.starts_at + interval '2 hours')) OVERLAPS 
        ((SELECT starts_at FROM public.events WHERE id = _event_id), 
         (SELECT COALESCE(ends_at, starts_at + interval '2 hours') FROM public.events WHERE id = _event_id))
    );
$$;