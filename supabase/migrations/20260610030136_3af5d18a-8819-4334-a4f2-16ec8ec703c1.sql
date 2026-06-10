-- Categorias de itens
CREATE TABLE public.mao_amiga_categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT SELECT ON public.mao_amiga_categorias TO authenticated;
GRANT ALL ON public.mao_amiga_categorias TO service_role;

INSERT INTO public.mao_amiga_categorias (nome) VALUES 
('Alimentos'), ('Cestas Básicas'), ('Roupas'), ('Higiene'), ('Dinheiro'), ('Outros');

-- Doadores
CREATE TABLE public.mao_amiga_doadores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    congregation_id UUID NOT NULL REFERENCES public.congregations(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
    nome TEXT NOT NULL,
    telefone TEXT,
    email TEXT,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mao_amiga_doadores TO authenticated;
GRANT ALL ON public.mao_amiga_doadores TO service_role;
ALTER TABLE public.mao_amiga_doadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage doadores in their congregation" ON public.mao_amiga_doadores
    FOR ALL TO authenticated USING (public.is_sede_admin(auth.uid()) OR congregation_id = public.user_congregation(auth.uid()));

-- Doações
CREATE TABLE public.mao_amiga_doacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    congregation_id UUID NOT NULL REFERENCES public.congregations(id) ON DELETE CASCADE,
    doador_id UUID NOT NULL REFERENCES public.mao_amiga_doadores(id) ON DELETE CASCADE,
    categoria_id UUID NOT NULL REFERENCES public.mao_amiga_categorias(id),
    descricao TEXT NOT NULL,
    quantidade DECIMAL NOT NULL DEFAULT 1,
    unidade TEXT NOT NULL DEFAULT 'un',
    valor_dinheiro DECIMAL,
    data_doacao DATE NOT NULL DEFAULT CURRENT_DATE,
    observacoes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mao_amiga_doacoes TO authenticated;
GRANT ALL ON public.mao_amiga_doacoes TO service_role;
ALTER TABLE public.mao_amiga_doacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage doacoes in their congregation" ON public.mao_amiga_doacoes
    FOR ALL TO authenticated USING (public.is_sede_admin(auth.uid()) OR congregation_id = public.user_congregation(auth.uid()));

-- Estoque
CREATE TABLE public.mao_amiga_estoque (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    congregation_id UUID NOT NULL REFERENCES public.congregations(id) ON DELETE CASCADE,
    categoria_id UUID NOT NULL REFERENCES public.mao_amiga_categorias(id),
    descricao TEXT NOT NULL,
    unidade TEXT NOT NULL,
    quantidade DECIMAL NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(congregation_id, categoria_id, descricao, unidade)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mao_amiga_estoque TO authenticated;
GRANT ALL ON public.mao_amiga_estoque TO service_role;
ALTER TABLE public.mao_amiga_estoque ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view estoque in their congregation" ON public.mao_amiga_estoque
    FOR SELECT TO authenticated USING (public.is_sede_admin(auth.uid()) OR congregation_id = public.user_congregation(auth.uid()));

CREATE POLICY "Admins/Lideres can manage estoque in their congregation" ON public.mao_amiga_estoque
    FOR ALL TO authenticated USING (public.is_sede_admin(auth.uid()) OR (congregation_id = public.user_congregation(auth.uid()) AND public.has_role(auth.uid(), 'admin_congregacao') OR public.has_role(auth.uid(), 'lider_departamento')));

-- Movimentos de Estoque
CREATE TABLE public.mao_amiga_estoque_movimentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    congregation_id UUID NOT NULL REFERENCES public.congregations(id) ON DELETE CASCADE,
    categoria_id UUID NOT NULL REFERENCES public.mao_amiga_categorias(id),
    descricao TEXT NOT NULL,
    quantidade DECIMAL NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ajuste')),
    referencia_id UUID, -- ID da doação ou entrega
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT SELECT, INSERT ON public.mao_amiga_estoque_movimentos TO authenticated;
GRANT ALL ON public.mao_amiga_estoque_movimentos TO service_role;
ALTER TABLE public.mao_amiga_estoque_movimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view movements in their congregation" ON public.mao_amiga_estoque_movimentos
    FOR SELECT TO authenticated USING (public.is_sede_admin(auth.uid()) OR congregation_id = public.user_congregation(auth.uid()));

-- Famílias Assistidas
CREATE TABLE public.mao_amiga_familias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    congregation_id UUID NOT NULL REFERENCES public.congregations(id) ON DELETE CASCADE,
    nome_responsavel TEXT NOT NULL,
    telefone TEXT,
    endereco TEXT,
    qtd_pessoas INTEGER DEFAULT 1,
    necessidade_principal TEXT,
    observacoes TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mao_amiga_familias TO authenticated;
GRANT ALL ON public.mao_amiga_familias TO service_role;
ALTER TABLE public.mao_amiga_familias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage familias in their congregation" ON public.mao_amiga_familias
    FOR ALL TO authenticated USING (public.is_sede_admin(auth.uid()) OR congregation_id = public.user_congregation(auth.uid()));

-- Entregas realizadas
CREATE TABLE public.mao_amiga_entregas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    congregation_id UUID NOT NULL REFERENCES public.congregations(id) ON DELETE CASCADE,
    familia_id UUID NOT NULL REFERENCES public.mao_amiga_familias(id) ON DELETE CASCADE,
    categoria_id UUID NOT NULL REFERENCES public.mao_amiga_categorias(id),
    descricao TEXT NOT NULL,
    quantidade DECIMAL NOT NULL,
    data_entrega DATE NOT NULL DEFAULT CURRENT_DATE,
    responsavel_id UUID REFERENCES auth.users(id),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mao_amiga_entregas TO authenticated;
GRANT ALL ON public.mao_amiga_entregas TO service_role;
ALTER TABLE public.mao_amiga_entregas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage entregas in their congregation" ON public.mao_amiga_entregas
    FOR ALL TO authenticated USING (public.is_sede_admin(auth.uid()) OR congregation_id = public.user_congregation(auth.uid()));

-- Campanhas
CREATE TABLE public.mao_amiga_campanhas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    congregation_id UUID NOT NULL REFERENCES public.congregations(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    descricao TEXT,
    meta TEXT,
    starts_at TIMESTAMP WITH TIME ZONE,
    ends_at TIMESTAMP WITH TIME ZONE,
    tipo TEXT NOT NULL CHECK (tipo IN ('arrecadacao', 'mutirao', 'acao_social')),
    status TEXT NOT NULL DEFAULT 'planejado' CHECK (status IN ('planejado', 'ativo', 'concluido', 'cancelado')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mao_amiga_campanhas TO authenticated;
GRANT ALL ON public.mao_amiga_campanhas TO service_role;
ALTER TABLE public.mao_amiga_campanhas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view campanhas in their congregation" ON public.mao_amiga_campanhas
    FOR SELECT TO authenticated USING (public.is_sede_admin(auth.uid()) OR congregation_id = public.user_congregation(auth.uid()));

CREATE POLICY "Admins/Lideres can manage campanhas in their congregation" ON public.mao_amiga_campanhas
    FOR ALL TO authenticated USING (public.is_sede_admin(auth.uid()) OR (congregation_id = public.user_congregation(auth.uid()) AND public.has_role(auth.uid(), 'admin_congregacao') OR public.has_role(auth.uid(), 'lider_departamento')));

-- Avisos
CREATE TABLE public.mao_amiga_avisos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    congregation_id UUID NOT NULL REFERENCES public.congregations(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    urgente BOOLEAN DEFAULT false,
    campanha_id UUID REFERENCES public.mao_amiga_campanhas(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mao_amiga_avisos TO authenticated;
GRANT ALL ON public.mao_amiga_avisos TO service_role;
ALTER TABLE public.mao_amiga_avisos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view avisos in their congregation" ON public.mao_amiga_avisos
    FOR SELECT TO authenticated USING (public.is_sede_admin(auth.uid()) OR congregation_id = public.user_congregation(auth.uid()));

CREATE POLICY "Admins/Lideres can manage avisos in their congregation" ON public.mao_amiga_avisos
    FOR ALL TO authenticated USING (public.is_sede_admin(auth.uid()) OR (congregation_id = public.user_congregation(auth.uid()) AND public.has_role(auth.uid(), 'admin_congregacao') OR public.has_role(auth.uid(), 'lider_departamento')));

-- Triggers para Estoque
CREATE OR REPLACE FUNCTION public.handle_mao_amiga_doacao()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualiza ou insere no estoque
    INSERT INTO public.mao_amiga_estoque (congregation_id, categoria_id, descricao, unidade, quantidade)
    VALUES (NEW.congregation_id, NEW.categoria_id, NEW.descricao, NEW.unidade, NEW.quantidade)
    ON CONFLICT (congregation_id, categoria_id, descricao, unidade)
    DO UPDATE SET quantidade = public.mao_amiga_estoque.quantidade + EXCLUDED.quantidade, updated_at = now();

    -- Registra movimento
    INSERT INTO public.mao_amiga_estoque_movimentos (congregation_id, categoria_id, descricao, quantidade, tipo, referencia_id, created_by)
    VALUES (NEW.congregation_id, NEW.categoria_id, NEW.descricao, NEW.quantidade, 'entrada', NEW.id, NEW.created_by);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_mao_amiga_doacao AFTER INSERT ON public.mao_amiga_doacoes
FOR EACH ROW EXECUTE FUNCTION public.handle_mao_amiga_doacao();

CREATE OR REPLACE FUNCTION public.handle_mao_amiga_entrega()
RETURNS TRIGGER AS $$
BEGIN
    -- Verifica saldo
    IF NOT EXISTS (
        SELECT 1 FROM public.mao_amiga_estoque 
        WHERE congregation_id = NEW.congregation_id 
        AND categoria_id = NEW.categoria_id 
        AND descricao = NEW.descricao 
        AND quantidade >= NEW.quantidade
    ) THEN
        RAISE EXCEPTION 'Saldo insuficiente no estoque para este item.';
    END IF;

    -- Atualiza estoque
    UPDATE public.mao_amiga_estoque 
    SET quantidade = quantidade - NEW.quantidade, updated_at = now()
    WHERE congregation_id = NEW.congregation_id 
    AND categoria_id = NEW.categoria_id 
    AND descricao = NEW.descricao;

    -- Registra movimento
    INSERT INTO public.mao_amiga_estoque_movimentos (congregation_id, categoria_id, descricao, quantidade, tipo, referencia_id, created_by)
    VALUES (NEW.congregation_id, NEW.categoria_id, NEW.descricao, NEW.quantidade, 'saida', NEW.id, NEW.responsavel_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_mao_amiga_entrega BEFORE INSERT ON public.mao_amiga_entregas
FOR EACH ROW EXECUTE FUNCTION public.handle_mao_amiga_entrega();