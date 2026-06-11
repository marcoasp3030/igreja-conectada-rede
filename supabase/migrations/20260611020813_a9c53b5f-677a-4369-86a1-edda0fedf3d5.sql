
-- Adicionar estados ao enum finance_closing_status
ALTER TYPE public.finance_closing_status ADD VALUE IF NOT EXISTS 'em_revisao';
ALTER TYPE public.finance_closing_status ADD VALUE IF NOT EXISTS 'aprovado';
ALTER TYPE public.finance_closing_status ADD VALUE IF NOT EXISTS 'rejeitado';

-- Colunas de rastreamento de workflow
ALTER TABLE public.finance_closings
  ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Helper: pode revisar (secretário, admin_congregação ou sede)
CREATE OR REPLACE FUNCTION public.can_review_finance(_user_id uuid, _congregation_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_sede_admin(_user_id) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND congregation_id = _congregation_id
      AND role IN ('admin_congregacao', 'secretario')
  )
$$;

-- Tabela de histórico de fechamentos
CREATE TABLE IF NOT EXISTS public.finance_closing_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  closing_id uuid NOT NULL REFERENCES public.finance_closings(id) ON DELETE CASCADE,
  congregation_id uuid NOT NULL REFERENCES public.congregations(id) ON DELETE CASCADE,
  action text NOT NULL, -- created | updated | submitted | approved | rejected | closed | reopened | recomputed | deleted
  from_status text,
  to_status text,
  actor_id uuid REFERENCES auth.users(id),
  observacao text,
  diff jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.finance_closing_history TO authenticated;
GRANT ALL ON public.finance_closing_history TO service_role;

ALTER TABLE public.finance_closing_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY fch_sede_select ON public.finance_closing_history
  FOR SELECT USING (public.is_sede_admin(auth.uid()));
CREATE POLICY fch_cong_select ON public.finance_closing_history
  FOR SELECT USING (congregation_id = public.user_congregation(auth.uid()));
CREATE POLICY fch_insert ON public.finance_closing_history
  FOR INSERT WITH CHECK (public.can_manage_finance(auth.uid(), congregation_id));

CREATE INDEX IF NOT EXISTS idx_fch_closing ON public.finance_closing_history(closing_id, created_at DESC);

-- Trigger automático de histórico de mudanças de status
CREATE OR REPLACE FUNCTION public.finance_closings_history_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.finance_closing_history(closing_id, congregation_id, action, from_status, to_status, actor_id, diff)
    VALUES (NEW.id, NEW.congregation_id, 'created', NULL, NEW.status::text, auth.uid(), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status::text IS DISTINCT FROM OLD.status::text THEN
      INSERT INTO public.finance_closing_history(closing_id, congregation_id, action, from_status, to_status, actor_id, observacao)
      VALUES (NEW.id, NEW.congregation_id,
              CASE NEW.status::text
                WHEN 'em_revisao' THEN 'submitted'
                WHEN 'aprovado' THEN 'approved'
                WHEN 'rejeitado' THEN 'rejected'
                WHEN 'fechado' THEN 'closed'
                WHEN 'aberto' THEN CASE WHEN OLD.status::text = 'fechado' THEN 'reopened' ELSE 'reverted' END
                ELSE 'updated'
              END,
              OLD.status::text, NEW.status::text, auth.uid(), NEW.rejection_reason);
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_finance_closings_history ON public.finance_closings;
CREATE TRIGGER trg_finance_closings_history
AFTER INSERT OR UPDATE ON public.finance_closings
FOR EACH ROW EXECUTE FUNCTION public.finance_closings_history_trigger();

-- Atualizar proteção: só bloquear lançamentos quando status = 'fechado' (mantém comportamento)
-- A função is_finance_period_locked já checa 'fechado' — nada a alterar.

-- Atualizar finance_closings_protect: permitir reabertura apenas a partir de 'fechado' por sede.
-- A função existente já cobre isso.
