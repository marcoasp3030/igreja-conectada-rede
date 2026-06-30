
CREATE TYPE public.business_listing_status AS ENUM ('pendente', 'aprovado', 'rejeitado');

CREATE TABLE public.business_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  congregation_id uuid REFERENCES public.congregations(id) ON DELETE SET NULL,
  nome text NOT NULL,
  profissao text NOT NULL,
  categoria text,
  descricao text NOT NULL,
  telefone text,
  whatsapp text,
  email text,
  website text,
  instagram text,
  endereco text,
  foto_url text,
  status public.business_listing_status NOT NULL DEFAULT 'pendente',
  rejection_reason text,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_business_listings_status ON public.business_listings(status);
CREATE INDEX idx_business_listings_user ON public.business_listings(user_id);
CREATE INDEX idx_business_listings_congregation ON public.business_listings(congregation_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_listings TO authenticated;
GRANT ALL ON public.business_listings TO service_role;

ALTER TABLE public.business_listings ENABLE ROW LEVEL SECURITY;

-- Helper: pode moderar (sede, admin_congregacao, secretario)
CREATE OR REPLACE FUNCTION public.can_moderate_business(_user_id uuid, _congregation_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_sede_admin(_user_id) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin_congregacao', 'secretario')
      AND (congregation_id = _congregation_id OR congregation_id IS NULL)
  )
$$;

-- SELECT: aprovados visíveis a todos autenticados; próprio dono vê tudo; moderadores veem tudo
CREATE POLICY "View approved or own or moderate"
ON public.business_listings FOR SELECT TO authenticated
USING (
  status = 'aprovado'
  OR user_id = auth.uid()
  OR public.can_moderate_business(auth.uid(), congregation_id)
);

-- INSERT: próprio usuário, sempre como pendente (forçado em app); aqui só garantimos user_id = auth.uid()
CREATE POLICY "Insert own listing"
ON public.business_listings FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- UPDATE: dono pode editar; moderadores podem editar (para aprovar/rejeitar)
CREATE POLICY "Update own or moderate"
ON public.business_listings FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR public.can_moderate_business(auth.uid(), congregation_id)
)
WITH CHECK (
  user_id = auth.uid()
  OR public.can_moderate_business(auth.uid(), congregation_id)
);

-- DELETE: dono ou moderador
CREATE POLICY "Delete own or moderate"
ON public.business_listings FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR public.can_moderate_business(auth.uid(), congregation_id)
);

-- Trigger: edição pelo dono volta para pendente
CREATE OR REPLACE FUNCTION public.business_listings_reset_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Se quem está atualizando é o próprio dono e NÃO é moderador, e o status não foi explicitamente alterado por moderação,
  -- e algum campo de conteúdo mudou, volta para pendente.
  IF auth.uid() = OLD.user_id
     AND NOT public.can_moderate_business(auth.uid(), OLD.congregation_id)
     AND (
       NEW.nome IS DISTINCT FROM OLD.nome OR
       NEW.profissao IS DISTINCT FROM OLD.profissao OR
       NEW.categoria IS DISTINCT FROM OLD.categoria OR
       NEW.descricao IS DISTINCT FROM OLD.descricao OR
       NEW.telefone IS DISTINCT FROM OLD.telefone OR
       NEW.whatsapp IS DISTINCT FROM OLD.whatsapp OR
       NEW.email IS DISTINCT FROM OLD.email OR
       NEW.website IS DISTINCT FROM OLD.website OR
       NEW.instagram IS DISTINCT FROM OLD.instagram OR
       NEW.endereco IS DISTINCT FROM OLD.endereco OR
       NEW.foto_url IS DISTINCT FROM OLD.foto_url
     )
  THEN
    NEW.status := 'pendente';
    NEW.approved_at := NULL;
    NEW.approved_by := NULL;
    NEW.rejection_reason := NULL;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER business_listings_before_update
BEFORE UPDATE ON public.business_listings
FOR EACH ROW EXECUTE FUNCTION public.business_listings_reset_status();

-- Trigger insert: força status pendente para não-moderadores
CREATE OR REPLACE FUNCTION public.business_listings_before_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_moderate_business(auth.uid(), NEW.congregation_id) THEN
    NEW.status := 'pendente';
    NEW.approved_at := NULL;
    NEW.approved_by := NULL;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER business_listings_before_insert
BEFORE INSERT ON public.business_listings
FOR EACH ROW EXECUTE FUNCTION public.business_listings_before_insert();
