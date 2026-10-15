-- Campos funcionais do cadastro de servidores.
ALTER TABLE public.servidores
  ADD COLUMN IF NOT EXISTS lotacao TEXT,
  ADD COLUMN IF NOT EXISTS ramal VARCHAR(20);

-- A identificação operacional é a matrícula; CPF passa a ser complementar.
ALTER TABLE public.servidores
  ALTER COLUMN cpf DROP NOT NULL;
