-- ==============================================================================
-- Migration 04: Seed Data - Ambiente de Testes Homologação SME
-- ==============================================================================

-- 1. Departamentos Fictícios da Secretaria Municipal de Educação
INSERT INTO public.departamentos (id, nome, sigla, descricao, responsavel, ramal, localizacao)
VALUES
  ('d1000000-0000-0000-0000-000000000001', 'Gabinete do Secretário', 'GAB', 'Gabinete e assessoria institucional', 'Carlos Eduardo Guimarães', '1001', '2º Andar - Ala Norte'),
  ('d1000000-0000-0000-0000-000000000002', 'Departamento de Gestão de Pessoas', 'DGP', 'Recursos humanos, folha e estágio probatório', 'Márcia Helena Ribeiro', '1015', '1º Andar - Bloco A'),
  ('d1000000-0000-0000-0000-000000000003', 'Departamento Pedagógico', 'DEPED', 'Coordenação de ensino, currículo e formação continuada', 'Prof. Arnaldo Silva', '1030', '3º Andar - Bloco B'),
  ('d1000000-0000-0000-0000-000000000004', 'Departamento de Alimentação Escolar', 'DAE', 'Supervisão de merenda e nutricionistas', 'Patrícia Alencar', '1045', 'Térreo - Setor Anexo'),
  ('d1000000-0000-0000-0000-000000000005', 'Departamento de Infraestrutura e Logística', 'DILOG', 'Obras escolares, transporte e patrimônio', 'Eng. Roberto Vasconcelos', '1060', 'Térreo - Galpão Operacional')
ON CONFLICT (nome) DO NOTHING;

-- 2. Setores Fictícios
INSERT INTO public.setores (id, departamento_id, nome, sigla, responsavel, ramal, sala, requer_autorizacao)
VALUES
  ('s1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'Assessoria Jurídica', 'ASJUR', 'Dra. Vanessa Lemos', '1005', 'Sala 204', true),
  ('s1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001', 'Chefia de Gabinete', 'CHEGAB', 'Renata Farias', '1002', 'Sala 201', true),
  ('s1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000002', 'Setor de Folha de Pagamento', 'SFOP', 'Wagner Silveira', '1018', 'Sala 105', false),
  ('s1000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000002', 'Atendimento ao Servidor', 'ATSERV', 'Juliana Rezende', '1020', 'Balcão RH', false),
  ('s1000000-0000-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000003', 'Coordenação de Ensino Fundamental', 'COEF', 'Profª Miriam Duarte', '1035', 'Sala 302', false),
  ('s1000000-0000-0000-0000-000000000006', 'd1000000-0000-0000-0000-000000000003', 'Educação Especial e Inclusiva', 'EEI', 'Lucas Nogueira', '1038', 'Sala 308', false),
  ('s1000000-0000-0000-0000-000000000007', 'd1000000-0000-0000-0000-000000000004', 'Controle e Nutrição Escolar', 'CNUT', 'Carla Botelho', '1048', 'Sala T-04', false),
  ('s1000000-0000-0000-0000-000000000008', 'd1000000-0000-0000-0000-000000000005', 'Transporte Escolar e Frotas', 'TRANS', 'Marcos Aurélio Dias', '1064', 'Sala T-12', false)
ON CONFLICT DO NOTHING;

-- 3. Servidores Fictícios
INSERT INTO public.servidores (id, matricula, nome, cpf, cargo, departamento_id, setor_id, email, telefone, status)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'SME-100201', 'Carlos Eduardo Guimarães', '111.222.333-44', 'Secretário Municipal de Educação', 'd1000000-0000-0000-0000-000000000001', 's1000000-0000-0000-0000-000000000002', 'gabinete@sme.gov.br', '(11) 98888-1001', 'ativo'),
  ('c1000000-0000-0000-0000-000000000002', 'SME-100452', 'Dra. Vanessa Lemos', '222.333.444-55', 'Procuradora Jurídica', 'd1000000-0000-0000-0000-000000000001', 's1000000-0000-0000-0000-000000000001', 'vanessa.lemos@sme.gov.br', '(11) 98888-1005', 'ativo'),
  ('c1000000-0000-0000-0000-000000000003', 'SME-200781', 'Márcia Helena Ribeiro', '333.444.555-66', 'Diretora de Gestão de Pessoas', 'd1000000-0000-0000-0000-000000000002', 's1000000-0000-0000-0000-000000000004', 'marcia.ribeiro@sme.gov.br', '(11) 98888-1015', 'ativo'),
  ('c1000000-0000-0000-0000-000000000004', 'SME-200994', 'Juliana Rezende', '444.555.666-77', 'Analista de Recursos Humanos', 'd1000000-0000-0000-0000-000000000002', 's1000000-0000-0000-0000-000000000004', 'juliana.rezende@sme.gov.br', '(11) 98888-1020', 'ativo'),
  ('c1000000-0000-0000-0000-000000000005', 'SME-300112', 'Prof. Arnaldo Silva', '555.666.777-88', 'Coordenador Pedagógico Geral', 'd1000000-0000-0000-0000-000000000003', 's1000000-0000-0000-0000-000000000005', 'arnaldo.pedagogico@sme.gov.br', '(11) 98888-1030', 'ativo'),
  ('c1000000-0000-0000-0000-000000000006', 'SME-400553', 'Patrícia Alencar', '666.777.888-99', 'Nutricionista Responsável Técnica', 'd1000000-0000-0000-0000-000000000004', 's1000000-0000-0000-0000-000000000007', 'patricia.nutricao@sme.gov.br', '(11) 98888-1045', 'ativo'),
  ('c1000000-0000-0000-0000-000000000007', 'SME-500881', 'Marcos Aurélio Dias', '777.888.999-00', 'Chefe de Transporte Escolar', 'd1000000-0000-0000-0000-000000000005', 's1000000-0000-0000-0000-000000000008', 'marcos.transporte@sme.gov.br', '(11) 98888-1064', 'ativo')
ON CONFLICT (matricula) DO NOTHING;

-- 4. Visitantes Fictícios
INSERT INTO public.visitantes (id, cpf, nome, rg, orgao_emissor, telefone, email, empresa_orgao, observacoes)
VALUES
  ('v1000000-0000-0000-0000-000000000001', '123.456.789-01', 'Fernanda Lima Montes', '29.887.654-2', 'SSP/SP', '(11) 97123-4567', 'fernanda.montes@editoraaprenda.com.br', 'Editora Aprenda Mais Ltda', 'Representante de livros didáticos'),
  ('v1000000-0000-0000-0000-000000000002', '987.654.321-00', 'Rogério Santos de Oliveira', '34.567.123-9', 'SSP/SP', '(11) 99876-5432', 'rogerio.nutri@fornecedora.com', 'Distribuidora Sabor & Nutrição', 'Fornecedor de gêneros da merenda'),
  ('v1000000-0000-0000-0000-000000000003', '555.444.333-22', 'Beatriz Castilho Ramos', '41.222.333-1', 'SSP/SP', '(11) 98222-3344', 'beatriz.castilho@gmail.com', 'Comunidade Escolar / Pais', 'Mãe de aluno - Solicitação de transferência'),
  ('v1000000-0000-0000-0000-000000000004', '333.222.111-99', 'Cláudio Ferreira Lima', '18.999.444-5', 'SSP/SP', '(11) 99333-2211', 'c.ferreira@engepredial.com.br', 'EngePredial Manutenção', 'Técnico de laudo de climatização')
ON CONFLICT (cpf) DO NOTHING;

-- 5. Movimentações de Exemplo (Entradas e Saídas em andamento e finalizadas)
INSERT INTO public.movimentacoes (
    id, tipo_pessoa, visitante_id, departamento_destino_id, setor_destino_id, servidor_destino_id,
    cracha_numero, motivo, data_hora_entrada, data_hora_saida, status, autorizacao_status, observacoes
) VALUES
  (
    'm1000000-0000-0000-0000-000000000001', 'visitante', 'v1000000-0000-0000-0000-000000000001',
    'd1000000-0000-0000-0000-000000000003', 's1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000005',
    'CR-014', 'Reunião pedagógica sobre catálogo do ano letivo', now() - INTERVAL '45 minutes', NULL,
    'no_predio', 'dispensada', 'Portando notebook e amostras de livros'
  ),
  (
    'm1000000-0000-0000-0000-000000000002', 'visitante', 'v1000000-0000-0000-0000-000000000002',
    'd1000000-0000-0000-0000-000000000004', 's1000000-0000-0000-0000-000000000007', 'c1000000-0000-0000-0000-000000000006',
    'CR-022', 'Entrega e conferência de amostras de lote de hortifruti', now() - INTERVAL '3 hours', now() - INTERVAL '1 hour',
    'finalizado', 'dispensada', 'Acompanhado do fiscal de contratos'
  ),
  (
    'm1000000-0000-0000-0000-000000000003', 'visitante', 'v1000000-0000-0000-0000-000000000004',
    'd1000000-0000-0000-0000-000000000001', 's1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000002',
    'CR-007', 'Vistoria no forro acústico do gabinete jurídico', now() - INTERVAL '15 minutes', NULL,
    'pendente_autorizacao', 'pendente', 'Aguardando autorização da Dra. Vanessa'
  )
ON CONFLICT DO NOTHING;

-- 6. Autorização vinculada à movimentação 3
INSERT INTO public.autorizacoes (
    id, movimentacao_id, servidor_solicitado_id, status, resposta_observacao
) VALUES (
    'a1000000-0000-0000-0000-000000000001',
    'm1000000-0000-0000-0000-000000000003',
    'c1000000-0000-0000-0000-000000000002',
    'pendente',
    'Solicitação de entrada enviada pelo balcão da recepção'
)
ON CONFLICT DO NOTHING;

-- 7. Agendamentos de exemplo
INSERT INTO public.agendamentos (
    id, tipo_pessoa, visitante_id, departamento_id, setor_id, servidor_destino_id, data_hora_prevista, motivo, status, observacoes
) VALUES (
    'ag100000-0000-0000-0000-000000000001',
    'visitante',
    'v1000000-0000-0000-0000-000000000003',
    'd1000000-0000-0000-0000-000000000002',
    's1000000-0000-0000-0000-000000000004',
    'c1000000-0000-0000-0000-000000000004',
    now() + INTERVAL '2 hours',
    'Esclarecimento sobre pontuação e remanejamento docente',
    'agendado',
    'Comparecer com comprovante de residência'
)
ON CONFLICT DO NOTHING;
