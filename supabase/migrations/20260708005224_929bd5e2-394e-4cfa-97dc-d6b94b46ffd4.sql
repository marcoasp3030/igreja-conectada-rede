
-- 1. Tabela de posts
CREATE TABLE public.prayer_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  congregation_id UUID NOT NULL REFERENCES public.congregations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('pedido','testemunho')),
  titulo TEXT NOT NULL CHECK (char_length(titulo) BETWEEN 1 AND 120),
  mensagem TEXT NOT NULL CHECK (char_length(mensagem) BETWEEN 1 AND 2000),
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  is_urgent BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','rejeitado')),
  rejection_reason TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX prayer_posts_cong_status_idx ON public.prayer_posts (congregation_id, status, created_at DESC);
CREATE INDEX prayer_posts_user_idx ON public.prayer_posts (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prayer_posts TO authenticated;
GRANT ALL ON public.prayer_posts TO service_role;
ALTER TABLE public.prayer_posts ENABLE ROW LEVEL SECURITY;

-- SELECT: aprovados da própria congregação OU o próprio autor OU moderador
CREATE POLICY "View approved in congregation or own"
  ON public.prayer_posts FOR SELECT TO authenticated
  USING (
    (status = 'aprovado' AND (
      public.is_sede_admin(auth.uid())
      OR congregation_id = public.user_congregation(auth.uid())
    ))
    OR user_id = auth.uid()
    OR public.can_moderate_business(auth.uid(), congregation_id)
  );

-- INSERT: usuário autenticado criando post próprio na própria congregação
CREATE POLICY "Insert own prayer post"
  ON public.prayer_posts FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (public.is_sede_admin(auth.uid()) OR congregation_id = public.user_congregation(auth.uid()))
  );

-- UPDATE: autor pode editar enquanto pendente/rejeitado; moderador pode aprovar/rejeitar
CREATE POLICY "Update own pending or moderator"
  ON public.prayer_posts FOR UPDATE TO authenticated
  USING (
    (user_id = auth.uid() AND status IN ('pendente','rejeitado'))
    OR public.can_moderate_business(auth.uid(), congregation_id)
  )
  WITH CHECK (
    (user_id = auth.uid() AND status IN ('pendente','rejeitado'))
    OR public.can_moderate_business(auth.uid(), congregation_id)
  );

-- DELETE: autor ou moderador
CREATE POLICY "Delete own or moderator"
  ON public.prayer_posts FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.can_moderate_business(auth.uid(), congregation_id)
  );

-- Trigger: força status pendente na inserção quando não for moderador; atualiza updated_at
CREATE OR REPLACE FUNCTION public.prayer_posts_before_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  IF NOT public.can_moderate_business(auth.uid(), NEW.congregation_id) THEN
    NEW.status := 'pendente';
    NEW.approved_at := NULL;
    NEW.approved_by := NULL;
    NEW.rejection_reason := NULL;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.prayer_posts_before_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  -- Se autor edita conteúdo e não é moderador, volta a pendente
  IF auth.uid() = OLD.user_id
     AND NOT public.can_moderate_business(auth.uid(), OLD.congregation_id)
     AND (
       NEW.titulo IS DISTINCT FROM OLD.titulo
       OR NEW.mensagem IS DISTINCT FROM OLD.mensagem
       OR NEW.tipo IS DISTINCT FROM OLD.tipo
       OR NEW.is_anonymous IS DISTINCT FROM OLD.is_anonymous
       OR NEW.is_urgent IS DISTINCT FROM OLD.is_urgent
     )
  THEN
    NEW.status := 'pendente';
    NEW.approved_at := NULL;
    NEW.approved_by := NULL;
    NEW.rejection_reason := NULL;
  END IF;
  -- Registra aprovador quando muda para aprovado
  IF NEW.status = 'aprovado' AND OLD.status IS DISTINCT FROM 'aprovado' THEN
    NEW.approved_by := auth.uid();
    NEW.approved_at := now();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER prayer_posts_before_insert_trg
  BEFORE INSERT ON public.prayer_posts
  FOR EACH ROW EXECUTE FUNCTION public.prayer_posts_before_insert();

CREATE TRIGGER prayer_posts_before_update_trg
  BEFORE UPDATE ON public.prayer_posts
  FOR EACH ROW EXECUTE FUNCTION public.prayer_posts_before_update();

REVOKE EXECUTE ON FUNCTION public.prayer_posts_before_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prayer_posts_before_update() FROM PUBLIC, anon, authenticated;

-- 2. Tabela de intercessões ("estou orando por você")
CREATE TABLE public.prayer_intercessions (
  post_id UUID NOT NULL REFERENCES public.prayer_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX prayer_intercessions_post_idx ON public.prayer_intercessions (post_id);

GRANT SELECT, INSERT, DELETE ON public.prayer_intercessions TO authenticated;
GRANT ALL ON public.prayer_intercessions TO service_role;
ALTER TABLE public.prayer_intercessions ENABLE ROW LEVEL SECURITY;

-- Ver todas as intercessões de posts que o usuário pode ver
CREATE POLICY "View intercessions of visible posts"
  ON public.prayer_intercessions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.prayer_posts p
      WHERE p.id = prayer_intercessions.post_id
        AND (
          (p.status = 'aprovado' AND (
            public.is_sede_admin(auth.uid())
            OR p.congregation_id = public.user_congregation(auth.uid())
          ))
          OR p.user_id = auth.uid()
          OR public.can_moderate_business(auth.uid(), p.congregation_id)
        )
    )
  );

CREATE POLICY "Insert own intercession on approved posts"
  ON public.prayer_intercessions FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.prayer_posts p
      WHERE p.id = post_id
        AND p.status = 'aprovado'
        AND (
          public.is_sede_admin(auth.uid())
          OR p.congregation_id = public.user_congregation(auth.uid())
        )
    )
  );

CREATE POLICY "Delete own intercession"
  ON public.prayer_intercessions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 3. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.prayer_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.prayer_intercessions;
