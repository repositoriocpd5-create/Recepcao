-- Módulo de crachás físicos: cadastro e histórico de atribuição.
CREATE TABLE IF NOT EXISTS public.crachas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero VARCHAR(30) NOT NULL UNIQUE,
  situacao TEXT NOT NULL DEFAULT 'disponivel'
    CHECK (situacao IN ('disponivel', 'em_uso', 'extraviado', 'danificado', 'inativo')),
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.atribuicoes_cracha (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cracha_id UUID NOT NULL REFERENCES public.crachas(id) ON DELETE RESTRICT,
  movimentacao_id UUID REFERENCES public.movimentacoes(id) ON DELETE SET NULL,
  entregue_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  devolvido_em TIMESTAMPTZ,
  observacoes TEXT,
  CONSTRAINT ck_atribuicao_devolucao CHECK (devolvido_em IS NULL OR devolvido_em >= entregue_em)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_atribuicao_cracha_aberta
  ON public.atribuicoes_cracha(cracha_id) WHERE devolvido_em IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_atribuicao_movimentacao_aberta
  ON public.atribuicoes_cracha(movimentacao_id) WHERE devolvido_em IS NULL AND movimentacao_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_atribuicoes_cracha_movimentacao ON public.atribuicoes_cracha(movimentacao_id);

ALTER TABLE public.crachas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atribuicoes_cracha ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Crachas visiveis para operadores autenticados"
ON public.crachas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Crachas gerenciados por administradores"
ON public.crachas FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Atribuicoes de cracha visiveis para operadores autenticados"
ON public.atribuicoes_cracha FOR SELECT TO authenticated USING (true);
CREATE POLICY "Atribuicoes de cracha gerenciadas por operadores"
ON public.atribuicoes_cracha FOR ALL TO authenticated
USING (public.current_profile_role() IN ('admin', 'recepcionista'))
WITH CHECK (public.current_profile_role() IN ('admin', 'recepcionista'));
