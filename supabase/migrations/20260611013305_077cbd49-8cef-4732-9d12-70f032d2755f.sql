
-- Enums
DO $$ BEGIN CREATE TYPE public.finance_tipo AS ENUM ('entrada', 'saida');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.finance_forma_pagamento AS ENUM ('dinheiro', 'pix', 'cartao', 'transferencia', 'outros');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.finance_status AS ENUM ('pendente', 'aprovado', 'rejeitado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.finance_closing_periodo AS ENUM ('culto', 'semana', 'mes');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.finance_closing_status AS ENUM ('aberto', 'fechado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Helpers
CREATE OR REPLACE FUNCTION public.can_manage_finance(_user_id uuid, _congregation_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_sede_admin(_user_id) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND congregation_id = _congregation_id
      AND role IN ('admin_congregacao', 'tesoureiro', 'secretario')
  )
$$;

CREATE OR REPLACE FUNCTION public.can_approve_finance(_user_id uuid, _congregation_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_sede_admin(_user_id) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND congregation_id = _congregation_id
      AND role IN ('admin_congregacao', 'tesoureiro')
  )
$$;

-- Categorias
CREATE TABLE public.finance_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text NOT NULL,
  tipo public.finance_tipo NOT NULL,
  cor text DEFAULT '#6366f1',
  ativo boolean NOT NULL DEFAULT true,
  congregation_id uuid REFERENCES public.congregations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (congregation_id, slug, tipo)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_categories TO authenticated;
GRANT ALL ON public.finance_categories TO service_role;
ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "finance_cat_select" ON public.finance_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "finance_cat_sede" ON public.finance_categories FOR ALL TO authenticated
  USING (public.is_sede_admin(auth.uid())) WITH CHECK (public.is_sede_admin(auth.uid()));
CREATE POLICY "finance_cat_local" ON public.finance_categories FOR ALL TO authenticated
  USING (congregation_id IS NOT NULL AND public.can_manage_finance(auth.uid(), congregation_id))
  WITH CHECK (congregation_id IS NOT NULL AND public.can_manage_finance(auth.uid(), congregation_id));
CREATE TRIGGER finance_categories_updated_at BEFORE UPDATE ON public.finance_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Lançamentos
CREATE TABLE public.finance_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  congregation_id uuid NOT NULL REFERENCES public.congregations(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.finance_categories(id),
  tipo public.finance_tipo NOT NULL,
  valor numeric(12,2) NOT NULL CHECK (valor >= 0),
  data date NOT NULL DEFAULT CURRENT_DATE,
  forma_pagamento public.finance_forma_pagamento NOT NULL DEFAULT 'dinheiro',
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  contribuinte_nome text,
  anonimo boolean NOT NULL DEFAULT false,
  descricao text,
  observacoes text,
  comprovante_url text,
  status public.finance_status NOT NULL DEFAULT 'pendente',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejected_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ftx_cong_data ON public.finance_transactions (congregation_id, data DESC);
CREATE INDEX idx_ftx_tipo ON public.finance_transactions (tipo);
CREATE INDEX idx_ftx_cat ON public.finance_transactions (category_id);
CREATE INDEX idx_ftx_status ON public.finance_transactions (status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_transactions TO authenticated;
GRANT ALL ON public.finance_transactions TO service_role;
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ftx_sede_select" ON public.finance_transactions FOR SELECT TO authenticated
  USING (public.is_sede_admin(auth.uid()));
CREATE POLICY "ftx_cong_select" ON public.finance_transactions FOR SELECT TO authenticated
  USING (congregation_id = public.user_congregation(auth.uid()));
CREATE POLICY "ftx_insert" ON public.finance_transactions FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_finance(auth.uid(), congregation_id));
CREATE POLICY "ftx_update" ON public.finance_transactions FOR UPDATE TO authenticated
  USING (public.can_manage_finance(auth.uid(), congregation_id))
  WITH CHECK (public.can_manage_finance(auth.uid(), congregation_id));
CREATE POLICY "ftx_delete" ON public.finance_transactions FOR DELETE TO authenticated
  USING (public.can_approve_finance(auth.uid(), congregation_id));
CREATE TRIGGER finance_transactions_updated_at BEFORE UPDATE ON public.finance_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Fechamentos
CREATE TABLE public.finance_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  congregation_id uuid NOT NULL REFERENCES public.congregations(id) ON DELETE CASCADE,
  periodo_tipo public.finance_closing_periodo NOT NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  total_entradas numeric(12,2) NOT NULL DEFAULT 0,
  total_saidas numeric(12,2) NOT NULL DEFAULT 0,
  saldo numeric(12,2) NOT NULL DEFAULT 0,
  status public.finance_closing_status NOT NULL DEFAULT 'aberto',
  observacoes text,
  closed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  closed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_fcl_cong ON public.finance_closings (congregation_id, data_inicio DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_closings TO authenticated;
GRANT ALL ON public.finance_closings TO service_role;
ALTER TABLE public.finance_closings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fcl_sede_select" ON public.finance_closings FOR SELECT TO authenticated
  USING (public.is_sede_admin(auth.uid()));
CREATE POLICY "fcl_cong_select" ON public.finance_closings FOR SELECT TO authenticated
  USING (congregation_id = public.user_congregation(auth.uid()));
CREATE POLICY "fcl_manage" ON public.finance_closings FOR ALL TO authenticated
  USING (public.can_approve_finance(auth.uid(), congregation_id))
  WITH CHECK (public.can_approve_finance(auth.uid(), congregation_id));
CREATE TRIGGER finance_closings_updated_at BEFORE UPDATE ON public.finance_closings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auditoria
CREATE TABLE public.finance_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES public.finance_transactions(id) ON DELETE CASCADE,
  congregation_id uuid REFERENCES public.congregations(id) ON DELETE CASCADE,
  action text NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  diff jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_faud_tx ON public.finance_audit_logs (transaction_id);
CREATE INDEX idx_faud_cong ON public.finance_audit_logs (congregation_id, created_at DESC);
GRANT SELECT, INSERT ON public.finance_audit_logs TO authenticated;
GRANT ALL ON public.finance_audit_logs TO service_role;
ALTER TABLE public.finance_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faud_sede_select" ON public.finance_audit_logs FOR SELECT TO authenticated
  USING (public.is_sede_admin(auth.uid()));
CREATE POLICY "faud_cong_select" ON public.finance_audit_logs FOR SELECT TO authenticated
  USING (congregation_id = public.user_congregation(auth.uid()));
CREATE POLICY "faud_insert" ON public.finance_audit_logs FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- Trigger de auditoria
CREATE OR REPLACE FUNCTION public.finance_transactions_audit_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_action text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.finance_audit_logs (transaction_id, congregation_id, action, actor_id, diff)
    VALUES (NEW.id, NEW.congregation_id, 'created', auth.uid(), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := CASE
      WHEN NEW.status::text IS DISTINCT FROM OLD.status::text AND NEW.status = 'aprovado' THEN 'approved'
      WHEN NEW.status::text IS DISTINCT FROM OLD.status::text AND NEW.status = 'rejeitado' THEN 'rejected'
      ELSE 'updated' END;
    INSERT INTO public.finance_audit_logs (transaction_id, congregation_id, action, actor_id, diff)
    VALUES (NEW.id, NEW.congregation_id, v_action, auth.uid(),
            jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW)));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.finance_audit_logs (transaction_id, congregation_id, action, actor_id, diff)
    VALUES (OLD.id, OLD.congregation_id, 'deleted', auth.uid(), to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER finance_transactions_audit
AFTER INSERT OR UPDATE OR DELETE ON public.finance_transactions
FOR EACH ROW EXECUTE FUNCTION public.finance_transactions_audit_trigger();

-- Seed categorias globais
INSERT INTO public.finance_categories (nome, slug, tipo, cor, congregation_id) VALUES
  ('Dízimos', 'dizimos', 'entrada', '#10b981', NULL),
  ('Oferta de Culto', 'oferta-culto', 'entrada', '#3b82f6', NULL),
  ('Oferta da EBD', 'oferta-ebd', 'entrada', '#8b5cf6', NULL),
  ('Círculo de Oração', 'circulo-oracao', 'entrada', '#ec4899', NULL),
  ('Missões', 'missoes', 'entrada', '#f59e0b', NULL),
  ('Campanhas', 'campanhas', 'entrada', '#ef4444', NULL),
  ('Festividades', 'festividades', 'entrada', '#06b6d4', NULL),
  ('Oferta Especial', 'oferta-especial', 'entrada', '#84cc16', NULL),
  ('Outras Receitas', 'outras-receitas', 'entrada', '#6b7280', NULL),
  ('Manutenção', 'manutencao', 'saida', '#dc2626', NULL),
  ('Ajuda Social', 'ajuda-social', 'saida', '#f97316', NULL),
  ('Eventos', 'eventos', 'saida', '#a855f7', NULL),
  ('Materiais', 'materiais', 'saida', '#0891b2', NULL),
  ('Som', 'som', 'saida', '#7c3aed', NULL),
  ('Mídia', 'midia', 'saida', '#db2777', NULL),
  ('Limpeza', 'limpeza', 'saida', '#65a30d', NULL),
  ('Outros', 'outros-despesas', 'saida', '#525252', NULL)
ON CONFLICT DO NOTHING;
