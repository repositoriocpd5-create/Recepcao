-- ==============================================================================
-- Migration 02: PostgreSQL Atomic Functions & Stored Procedures (RPC)
-- ==============================================================================

-- 1. Função atômica para registro de entrada
CREATE OR REPLACE FUNCTION public.rpc_registrar_entrada(
    p_tipo_pessoa pessoa_tipo,
    p_pessoa_id UUID,
    p_departamento_destino_id UUID,
    p_setor_destino_id UUID,
    p_servidor_destino_id UUID DEFAULT NULL,
    p_cracha_numero VARCHAR DEFAULT NULL,
    p_motivo TEXT DEFAULT 'Atendimento',
    p_requer_autorizacao BOOLEAN DEFAULT false,
    p_recepcionista_id UUID DEFAULT NULL,
    p_observacoes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_servidor_id UUID := NULL;
    v_visitante_id UUID := NULL;
    v_movimentacao_id UUID;
    v_autorizacao_status autorizacao_status := 'dispensada';
    v_mov_status movimentacao_status := 'no_predio';
    v_movimentacao_record RECORD;
    v_ja_no_predio BOOLEAN;
BEGIN
    -- Determinar IDs corretos
    IF p_tipo_pessoa = 'servidor' THEN
        v_servidor_id := p_pessoa_id;
        -- Verificar se o servidor já está no prédio
        SELECT EXISTS (
            SELECT 1 FROM public.movimentacoes
            WHERE servidor_id = v_servidor_id
              AND status = 'no_predio'
        ) INTO v_ja_no_predio;
    ELSE
        v_visitante_id := p_pessoa_id;
        -- Verificar se o visitante já está no prédio
        SELECT EXISTS (
            SELECT 1 FROM public.movimentacoes
            WHERE visitante_id = v_visitante_id
              AND status = 'no_predio'
        ) INTO v_ja_no_predio;
    END IF;

    -- REGRA DE INTEGRIDADE: Impedir entrada duplicada
    IF v_ja_no_predio THEN
        RAISE EXCEPTION 'Atenção: Esta pessoa já possui uma entrada em andamento no prédio sem registro de saída.';
    END IF;

    -- Verificar necessidade de autorização
    IF p_requer_autorizacao THEN
        v_autorizacao_status := 'pendente';
        v_mov_status := 'pendente_autorizacao';
    END IF;

    -- Inserir movimentação atomicamente
    INSERT INTO public.movimentacoes (
        tipo_pessoa,
        servidor_id,
        visitante_id,
        departamento_destino_id,
        setor_destino_id,
        servidor_destino_id,
        cracha_numero,
        motivo,
        data_hora_entrada,
        status,
        autorizacao_status,
        recepcionista_entrada_id,
        observacoes
    ) VALUES (
        p_tipo_pessoa,
        v_servidor_id,
        v_visitante_id,
        p_departamento_destino_id,
        p_setor_destino_id,
        p_servidor_destino_id,
        p_cracha_numero,
        p_motivo,
        now(),
        v_mov_status,
        v_autorizacao_status,
        p_recepcionista_id,
        p_observacoes
    )
    RETURNING id INTO v_movimentacao_id;

    -- Se requer autorização, cria o registro de autorização
    IF p_requer_autorizacao AND p_servidor_destino_id IS NOT NULL THEN
        INSERT INTO public.autorizacoes (
            movimentacao_id,
            servidor_solicitado_id,
            status,
            solicitado_por
        ) VALUES (
            v_movimentacao_id,
            p_servidor_destino_id,
            'pendente',
            p_recepcionista_id
        );
    END IF;

    -- Gravação do log de auditoria
    INSERT INTO public.auditoria_logs (
        usuario_id,
        acao,
        tabela,
        registro_id,
        detalhes
    ) VALUES (
        auth.uid(),
        'REGISTRO_ENTRADA',
        'movimentacoes',
        v_movimentacao_id,
        jsonb_build_object(
            'tipo_pessoa', p_tipo_pessoa,
            'pessoa_id', p_pessoa_id,
            'cracha', p_cracha_numero,
            'status', v_mov_status,
            'requer_autorizacao', p_requer_autorizacao
        )
    );

    SELECT * INTO v_movimentacao_record FROM public.movimentacoes WHERE id = v_movimentacao_id;
    RETURN to_jsonb(v_movimentacao_record);
END;
$$;

-- 2. Função atômica para registro de saída
CREATE OR REPLACE FUNCTION public.rpc_registrar_saida(
    p_movimentacao_id UUID,
    p_recepcionista_id UUID DEFAULT NULL,
    p_observacoes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_movimentacao RECORD;
BEGIN
    SELECT * INTO v_movimentacao
    FROM public.movimentacoes
    WHERE id = p_movimentacao_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Movimentação não encontrada com ID %', p_movimentacao_id;
    END IF;

    IF v_movimentacao.status = 'finalizado' THEN
        RAISE EXCEPTION 'Esta movimentação já teve saída registrada anteriormente em %', v_movimentacao.data_hora_saida;
    END IF;

    UPDATE public.movimentacoes
    SET
        status = 'finalizado',
        data_hora_saida = now(),
        recepcionista_saida_id = p_recepcionista_id,
        observacoes = COALESCE(p_observacoes, observacoes),
        updated_at = now()
    WHERE id = p_movimentacao_id;

    -- Gravação do log de auditoria
    INSERT INTO public.auditoria_logs (
        usuario_id,
        acao,
        tabela,
        registro_id,
        detalhes
    ) VALUES (
        auth.uid(),
        'REGISTRO_SAIDA',
        'movimentacoes',
        p_movimentacao_id,
        jsonb_build_object(
            'data_hora_saida', now(),
            'recepcionista_saida_id', p_recepcionista_id
        )
    );

    SELECT * INTO v_movimentacao FROM public.movimentacoes WHERE id = p_movimentacao_id;
    RETURN to_jsonb(v_movimentacao);
END;
$$;

-- 3. Função de consulta segura de Servidor por Matrícula com Auditoria
CREATE OR REPLACE FUNCTION public.rpc_consultar_servidor(
    p_matricula VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_servidor RECORD;
    v_mov_aberta RECORD;
BEGIN
    SELECT 
        s.*,
        d.nome AS departamento_nome,
        d.sigla AS departamento_sigla,
        st.nome AS setor_nome,
        st.sigla AS setor_sigla,
        st.ramal AS setor_ramal
    INTO v_servidor
    FROM public.servidores s
    JOIN public.departamentos d ON d.id = s.departamento_id
    LEFT JOIN public.setores st ON st.id = s.setor_id
    WHERE LOWER(s.matricula) = LOWER(TRIM(p_matricula))
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('encontrado', false);
    END IF;

    -- Verificar se já está no prédio
    SELECT * INTO v_mov_aberta
    FROM public.movimentacoes
    WHERE servidor_id = v_servidor.id AND status = 'no_predio'
    ORDER BY data_hora_entrada DESC
    LIMIT 1;

    -- Auditoria de consulta restrita
    INSERT INTO public.auditoria_logs (
        usuario_id,
        acao,
        tabela,
        registro_id,
        detalhes
    ) VALUES (
        auth.uid(),
        'CONSULTA_MATRICULA',
        'servidores',
        v_servidor.id,
        jsonb_build_object('matricula', p_matricula)
    );

    RETURN jsonb_build_object(
        'encontrado', true,
        'servidor', to_jsonb(v_servidor),
        'no_predio', (v_mov_aberta.id IS NOT NULL),
        'movimentacao_atual', to_jsonb(v_mov_aberta)
    );
END;
$$;

-- 4. Função de consulta segura de Visitante por CPF com Auditoria
CREATE OR REPLACE FUNCTION public.rpc_consultar_visitante(
    p_cpf VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cpf_sanitizado VARCHAR;
    v_visitante RECORD;
    v_mov_aberta RECORD;
    v_ultimas_visitas JSONB;
BEGIN
    v_cpf_sanitizado := regexp_replace(p_cpf, '\D', '', 'g');

    SELECT * INTO v_visitante
    FROM public.visitantes
    WHERE regexp_replace(cpf, '\D', '', 'g') = v_cpf_sanitizado
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('encontrado', false);
    END IF;

    -- Verificar se já está no prédio
    SELECT * INTO v_mov_aberta
    FROM public.movimentacoes
    WHERE visitante_id = v_visitante.id AND status = 'no_predio'
    ORDER BY data_hora_entrada DESC
    LIMIT 1;

    -- Obter últimas visitas
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', m.id,
            'data_hora_entrada', m.data_hora_entrada,
            'data_hora_saida', m.data_hora_saida,
            'motivo', m.motivo,
            'departamento', d.sigla,
            'setor', st.sigla
        )
    ) INTO v_ultimas_visitas
    FROM (
        SELECT * FROM public.movimentacoes
        WHERE visitante_id = v_visitante.id
        ORDER BY data_hora_entrada DESC
        LIMIT 5
    ) m
    JOIN public.departamentos d ON d.id = m.departamento_destino_id
    JOIN public.setores st ON st.id = m.setor_destino_id;

    -- Auditoria de consulta de CPF (LGPD)
    INSERT INTO public.auditoria_logs (
        usuario_id,
        acao,
        tabela,
        registro_id,
        detalhes
    ) VALUES (
        auth.uid(),
        'CONSULTA_CPF',
        'visitantes',
        v_visitante.id,
        jsonb_build_object('cpf_pesquisado', v_cpf_sanitizado)
    );

    RETURN jsonb_build_object(
        'encontrado', true,
        'visitante', to_jsonb(v_visitante),
        'no_predio', (v_mov_aberta.id IS NOT NULL),
        'movimentacao_atual', to_jsonb(v_mov_aberta),
        'historico_recente', COALESCE(v_ultimas_visitas, '[]'::jsonb)
    );
END;
$$;
