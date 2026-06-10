CREATE TABLE public.departamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    descricao TEXT,
    sigla TEXT,
    cor TEXT DEFAULT 'from-blue-600 to-blue-400',
    icone TEXT DEFAULT 'Users2',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS
ALTER TABLE public.departamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Departamentos are viewable by everyone" 
ON public.departamentos FOR SELECT 
USING (true);

CREATE POLICY "Departamentos are manageable by admins" 
ON public.departamentos FOR ALL 
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin_sede', 'admin_congregacao')))
WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin_sede', 'admin_congregacao')));

-- Grants
GRANT SELECT ON public.departamentos TO anon, authenticated;
GRANT ALL ON public.departamentos TO authenticated;
GRANT ALL ON public.departamentos TO service_role;

-- Seeding
INSERT INTO public.departamentos (nome, sigla, descricao, cor, icone) VALUES
('UMADB', 'UMADB', 'União da Mocidade da Assembleia de Deus Belém', 'from-blue-600 to-blue-400', 'Users2'),
('UFADEB', 'UFADEB', 'União Feminina da AD Belém', 'from-pink-600 to-pink-400', 'Heart'),
('Alpha Kids', 'Alpha Kids', 'Ministério Infantil', 'from-amber-500 to-yellow-400', 'Baby'),
('CREIO', 'CREIO', 'Crianças e Adolescentes', 'from-purple-600 to-purple-400', 'Sparkles'),
('Missões', 'Missões', 'Departamento de Missões', 'from-emerald-600 to-teal-400', 'Globe'),
('Assistência Social', 'Assistência Social', 'Ação Social', 'from-rose-600 to-rose-400', 'HandHelping'),
('EBD', 'EBD', 'Escola Bíblica Dominical', 'from-indigo-600 to-indigo-400', 'BookOpen'),
('Teologia FAESP', 'Teologia FAESP', 'Formação Teológica', 'from-slate-700 to-slate-500', 'GraduationCap');