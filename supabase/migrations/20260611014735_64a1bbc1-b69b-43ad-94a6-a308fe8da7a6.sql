
CREATE OR REPLACE FUNCTION public.is_finance_period_locked(_congregation_id uuid, _data date)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.finance_closings
    WHERE congregation_id = _congregation_id
      AND status = 'fechado'
      AND _data BETWEEN data_inicio AND data_fim
  )
$$;

CREATE OR REPLACE FUNCTION public.finance_transactions_block_locked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_sede boolean;
BEGIN
  -- Sede admin pode sobrescrever lançamentos em períodos travados (auditoria)
  v_sede := public.is_sede_admin(auth.uid());

  IF TG_OP = 'DELETE' THEN
    IF public.is_finance_period_locked(OLD.congregation_id, OLD.data) AND NOT v_sede THEN
      RAISE EXCEPTION 'Período financeiro está fechado para % e não pode ser alterado.', OLD.data;
    END IF;
    RETURN OLD;
  ELSE
    IF public.is_finance_period_locked(NEW.congregation_id, NEW.data) AND NOT v_sede THEN
      RAISE EXCEPTION 'Período financeiro está fechado para % e não pode receber novos lançamentos ou alterações.', NEW.data;
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.data <> NEW.data
       AND public.is_finance_period_locked(OLD.congregation_id, OLD.data) AND NOT v_sede THEN
      RAISE EXCEPTION 'Lançamento original está em período fechado e não pode ser movido.';
    END IF;
    RETURN NEW;
  END IF;
END $$;

DROP TRIGGER IF EXISTS finance_transactions_block_locked ON public.finance_transactions;
CREATE TRIGGER finance_transactions_block_locked
BEFORE INSERT OR UPDATE OR DELETE ON public.finance_transactions
FOR EACH ROW EXECUTE FUNCTION public.finance_transactions_block_locked();

-- Bloquear edição de fechamentos que já estão "fechado" (somente sede pode reabrir)
CREATE OR REPLACE FUNCTION public.finance_closings_protect()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = 'fechado' AND NOT public.is_sede_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Fechamento já está consolidado. Apenas a sede pode reabrir.';
  END IF;
  IF TG_OP = 'DELETE' AND OLD.status = 'fechado' AND NOT public.is_sede_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Fechamento consolidado não pode ser excluído.';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS finance_closings_protect ON public.finance_closings;
CREATE TRIGGER finance_closings_protect
BEFORE UPDATE OR DELETE ON public.finance_closings
FOR EACH ROW EXECUTE FUNCTION public.finance_closings_protect();
