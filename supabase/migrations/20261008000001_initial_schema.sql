-- ==============================================================================
-- SECRETARIA MUNICIPAL DE EDUCAÇÃO (SME) - SISTEMA DE RECEPÇÃO E CONTROLE DE ACESSO
-- Migration 01: Initial Schema, Constraints, Indexes & Auditing
-- ==============================================================================

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tipos e Enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'recepcionista', 'gestor', 'atendente');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE pessoa_tipo AS ENUM ('servidor', 'visitante');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE servidor_status AS ENUM ('ativo', 'afastado', 'ferias', 'inativo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE movimentacao_status AS ENUM ('no_predio', 'finalizado', 'recusado', 'pendente_autorizacao');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE autorizacao_status AS ENUM ('dispensada', 'pendente', 'autorizado', 'recusado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE agendamento_status AS ENUM ('agendado', 'confirmado', 'cancelado', 'concluido');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Tabela de Perfis de Usuários (vinculada a auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    nome_completo TEXT NOT NULL,
    cargo TEXT DEFAULT 'Recepcionista',
    role user_role NOT NULL DEFAULT 'recepcionista',
    ativo BOOLEAN NOT NULL DEFAULT true,
    ultimo_acesso TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Tabela de Departamentos
CREATE TABLE IF NOT EXISTS public.departamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    sigla VARCHAR(20) NOT NULL UNIQUE,
    descricao TEXT,
    responsavel TEXT,
    ramal VARCHAR(20),
    localizacao TEXT,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Tabela de Setores
CREATE TABLE IF NOT EXISTS public.setores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    departamento_id UUID NOT NULL REFERENCES public.departamentos(id) ON DELETE RESTRICT,
    nome TEXT NOT NULL,
    sigla VARCHAR(20) NOT NULL,
    responsavel TEXT,
    ramal VARCHAR(20),
    sala VARCHAR(50),
    requer_autorizacao BOOLEAN NOT NULL DEFAULT false,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_setor_departamento_sigla UNIQUE (departamento_id, sigla)
);

-- 6. Tabela de Servidores
CREATE TABLE IF NOT EXISTS public.servidores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matricula VARCHAR(50) NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    cpf VARCHAR(14) NOT NULL UNIQUE,
    cargo TEXT NOT NULL,
    departamento_id UUID NOT NULL REFERENCES public.departamentos(id) ON DELETE RESTRICT,
    setor_id UUID REFERENCES public.setores(id) ON DELETE SET NULL,
    email TEXT,
    telefone VARCHAR(30),
    foto_url TEXT,
    status servidor_status NOT NULL DEFAULT 'ativo',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Tabela de Visitantes
CREATE TABLE IF NOT EXISTS public.visitantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cpf VARCHAR(14) NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    rg VARCHAR(30),
    orgao_emissor VARCHAR(20),
    telefone VARCHAR(30),
    email TEXT,
    empresa_orgao TEXT,
    foto_url TEXT,
    observacoes TEXT,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Tabela de Movimentações (Entradas e Saídas)
CREATE TABLE IF NOT EXISTS public.movimentacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_pessoa pessoa_tipo NOT NULL,
    servidor_id UUID REFERENCES public.servidores(id) ON DELETE RESTRICT,
    visitante_id UUID REFERENCES public.visitantes(id) ON DELETE RESTRICT,
    departamento_destino_id UUID NOT NULL REFERENCES public.departamentos(id) ON DELETE RESTRICT,
    setor_destino_id UUID NOT NULL REFERENCES public.setores(id) ON DELETE RESTRICT,
    servidor_destino_id UUID REFERENCES public.servidores(id) ON DELETE SET NULL,
    cracha_numero VARCHAR(30),
    motivo TEXT NOT NULL,
    data_hora_entrada TIMESTAMPTZ NOT NULL DEFAULT now(),
    data_hora_saida TIMESTAMPTZ,
    status movimentacao_status NOT NULL DEFAULT 'no_predio',
    autorizacao_status autorizacao_status NOT NULL DEFAULT 'dispensada',
    autorizador_id UUID REFERENCES public.servidores(id) ON DELETE SET NULL,
    autorizacao_observacao TEXT,
    recepcionista_entrada_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    recepcionista_saida_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_movimentacao_pessoa_valida CHECK (
        (tipo_pessoa = 'servidor' AND servidor_id IS NOT NULL AND visitante_id IS NULL) OR
        (tipo_pessoa = 'visitante' AND visitante_id IS NOT NULL AND servidor_id IS NULL)
    ),
    CONSTRAINT ck_movimentacao_horario_saida CHECK (
        data_hora_saida IS NULL OR data_hora_saida >= data_hora_entrada
    )
);

-- 9. Tabela de Autorizações
CREATE TABLE IF NOT EXISTS public.autorizacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movimentacao_id UUID REFERENCES public.movimentacoes(id) ON DELETE CASCADE,
    servidor_solicitado_id UUID NOT NULL REFERENCES public.servidores(id) ON DELETE RESTRICT,
    status autorizacao_status NOT NULL DEFAULT 'pendente',
    resposta_observacao TEXT,
    respondido_em TIMESTAMPTZ,
    solicitado_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Tabela de Agendamentos
CREATE TABLE IF NOT EXISTS public.agendamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_pessoa pessoa_tipo NOT NULL DEFAULT 'visitante',
    visitante_id UUID REFERENCES public.visitantes(id) ON DELETE CASCADE,
    servidor_visitante_id UUID REFERENCES public.servidores(id) ON DELETE CASCADE,
    departamento_id UUID NOT NULL REFERENCES public.departamentos(id) ON DELETE RESTRICT,
    setor_id UUID REFERENCES public.setores(id) ON DELETE RESTRICT,
    servidor_destino_id UUID REFERENCES public.servidores(id) ON DELETE SET NULL,
    data_hora_prevista TIMESTAMPTZ NOT NULL,
    motivo TEXT NOT NULL,
    status agendamento_status NOT NULL DEFAULT 'agendado',
    observacoes TEXT,
    criado_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Tabela de Auditoria e Logs de Segurança
CREATE TABLE IF NOT EXISTS public.auditoria_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    usuario_email TEXT,
    acao VARCHAR(50) NOT NULL,
    tabela VARCHAR(50),
    registro_id UUID,
    detalhes JSONB DEFAULT '{}'::jsonb,
    ip_origem TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Índices de Alta Eficiência
CREATE INDEX IF NOT EXISTS idx_servidores_matricula ON public.servidores(matricula);
CREATE INDEX IF NOT EXISTS idx_servidores_cpf ON public.servidores(cpf);
CREATE INDEX IF NOT EXISTS idx_servidores_nome ON public.servidores(nome);
CREATE INDEX IF NOT EXISTS idx_visitantes_cpf ON public.visitantes(cpf);
CREATE INDEX IF NOT EXISTS idx_visitantes_nome ON public.visitantes(nome);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_status ON public.movimentacoes(status);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_data_entrada ON public.movimentacoes(data_hora_entrada DESC);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_servidor ON public.movimentacoes(servidor_id) WHERE status = 'no_predio';
CREATE INDEX IF NOT EXISTS idx_movimentacoes_visitante ON public.movimentacoes(visitante_id) WHERE status = 'no_predio';
CREATE INDEX IF NOT EXISTS idx_auditoria_acao_data ON public.auditoria_logs(acao, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_setores_departamento ON public.setores(departamento_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON public.agendamentos(data_hora_prevista);
