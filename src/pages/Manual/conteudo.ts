// Conteúdo do Manual de Uso, separado da apresentação.
// Para acrescentar um assunto: crie um guia em GUIAS e, se quiser, perguntas em PERGUNTAS,
// um card em TAREFAS_POR_PERFIL e um link em ASSUNTOS.
// Os nomes de telas, botões e campos devem ser os mesmos exibidos no sistema.

export type PerfilId = 'recepcionista' | 'gestor' | 'admin';

export type IconeId =
  | 'entrada'
  | 'saida'
  | 'pessoas'
  | 'autorizacao'
  | 'historico'
  | 'agenda'
  | 'cracha'
  | 'relatorio'
  | 'estrutura'
  | 'admin'
  | 'painel'
  | 'servidor';

export type IlustracaoId = 'identificacao' | 'cracha' | 'autorizacao' | 'devolucao';

export interface Passo {
  titulo: string;
  texto: string;
  ilustracao?: IlustracaoId;
  nota?: { tom: 'info' | 'aviso' | 'sucesso'; texto: string };
}

export interface Guia {
  id: string;
  titulo: string;
  categoria: string;
  /** Frase curta exibida abaixo do título do guia. */
  descricao: string;
  icone: IconeId;
  perfis: PerfilId[];
  paraQueServe: string;
  antesDeComecar: string[];
  ondeAcessar: { rotulo: string; rota: string };
  passos: Passo[];
  concluido: string;
  problemas: Array<{ problema: string; solucao: string }>;
  /** Termos relacionados usados pela busca. */
  palavrasChave: string[];
  /** Restrição de uso exibida em destaque (ex.: apenas administradores). */
  restricao?: string;
  /** Dica exibida em destaque ao final dos passos. */
  dicaFinal?: string;
}

export interface Pergunta {
  id: string;
  pergunta: string;
  resposta: string;
  perfis: PerfilId[];
  guiaId?: string;
  aviso?: string;
  palavrasChave: string[];
}

export interface Perfil {
  id: PerfilId;
  nome: string;
  resumo: string;
  responsabilidades: string[];
  guiaInicial: string;
  perguntaInicial: string;
}

export interface Tarefa {
  guiaId: string;
  titulo: string;
  resumo: string;
  acao: string;
  icone: IconeId;
  tom: 'azul' | 'verde' | 'roxo' | 'ambar';
}

export const PERFIS: Perfil[] = [
  {
    id: 'recepcionista',
    nome: 'Recepcionista',
    resumo: 'Atendimentos e crachás',
    responsabilidades: [
      'Identificar servidores e visitantes na Recepção.',
      'Registrar entradas, saídas e devoluções de crachá.',
      'Cadastrar e atualizar visitantes.',
      'Confirmar autorizações com o responsável do setor.',
    ],
    guiaInicial: 'registrar-entrada',
    perguntaInicial: 'cracha-em-uso',
  },
  {
    id: 'gestor',
    nome: 'Gestor',
    resumo: 'Indicadores e consultas',
    responsabilidades: [
      'Acompanhar o Dashboard e as pessoas presentes no prédio.',
      'Consultar movimentações, histórico e trilha de auditoria.',
      'Cadastrar e atualizar servidores do quadro.',
      'Decidir autorizações pendentes.',
    ],
    guiaInicial: 'painel',
    perguntaInicial: 'consultar-entradas',
  },
  {
    id: 'admin',
    nome: 'Administrador',
    resumo: 'Cadastros e configurações',
    responsabilidades: [
      'Manter departamentos, setores e regras de autorização.',
      'Cadastrar e editar crachás do inventário.',
      'Gerenciar operadores e perfis na Administração.',
      'Ter acesso a todas as funções de recepção e gestão.',
    ],
    guiaInicial: 'departamentos',
    perguntaInicial: 'perfis-acesso',
  },
];

export const GUIAS: Guia[] = [
  {
    id: 'registrar-entrada',
    titulo: 'Como registrar uma entrada',
    categoria: 'Recepção',
    descricao: 'Siga estas etapas durante o atendimento.',
    icone: 'entrada',
    perfis: ['recepcionista', 'gestor', 'admin'],
    paraQueServe: 'Registrar quem entra no prédio, para onde vai e qual crachá recebeu.',
    antesDeComecar: [
      'Tenha em mãos a matrícula (servidor) ou o CPF (visitante).',
      'Separe um crachá com situação “Disponível”.',
      'Atalhos: Alt + S (servidor) e Alt + V (visitante).',
    ],
    ondeAcessar: { rotulo: 'Recepção (Atendimento)', rota: '/recepcao' },
    passos: [
      {
        titulo: 'Identifique a pessoa',
        texto: 'Na Recepção, escolha Servidor ou Visitante. Informe a matrícula ou o CPF e confira os dados.',
        ilustracao: 'identificacao',
      },
      {
        titulo: 'Vincule um crachá disponível',
        texto: 'Leia o código de barras com o leitor USB, digite o código ou use “Ler com a câmera”. Confira se o crachá está disponível.',
        ilustracao: 'cracha',
      },
      {
        titulo: 'Informe o destino',
        texto: 'Selecione o departamento e o setor. Se necessário, procure o responsável da lotação.',
        nota: { tom: 'info', texto: 'Departamento e setor são obrigatórios.' },
      },
      {
        titulo: 'Confira e conclua',
        texto: 'Confira os dados da pessoa, o crachá e o destino antes de confirmar o registro.',
      },
    ],
    concluido: 'Aparece a mensagem “Entrada registrada com sucesso! Crachá atribuído.” e a pessoa passa a constar em Presentes no Prédio em Tempo Real.',
    dicaFinal: 'Na saída, use Devolução rápida para ler o crachá e encerrar a entrada.',
    problemas: [
      { problema: 'Pessoa não encontrada', solucao: 'Para visitante, use “Cadastrar Visitante Agora”. Para servidor, use “Cadastrar servidor” (exige perfil de gestor ou administrador).' },
      { problema: 'Crachá em uso ou não localizado', solucao: 'Faça a Devolução rápida do crachá ou escolha outro com situação “Disponível”.' },
      { problema: 'Responsável aparece em vermelho', solucao: 'Ele exige autorização prévia. Siga o guia de Autorizações.' },
    ],
    palavrasChave: ['entrada', 'atendimento', 'registrar', 'servidor', 'visitante', 'matricula', 'cpf', 'destino', 'setor', 'departamento', 'responsavel', 'multiplos destinos'],
  },
  {
    id: 'registrar-saida',
    titulo: 'Como registrar uma saída',
    categoria: 'Recepção',
    descricao: 'Finalize a visita e receba o crachá de volta.',
    icone: 'saida',
    perfis: ['recepcionista', 'gestor', 'admin'],
    paraQueServe: 'Encerrar a permanência da pessoa e liberar o crachá para um novo atendimento.',
    antesDeComecar: ['Receba o crachá entregue na entrada.'],
    ondeAcessar: { rotulo: 'Recepção (Atendimento)', rota: '/recepcao' },
    passos: [
      {
        titulo: 'Abra a Devolução rápida',
        texto: 'Na Recepção, clique em “Devolução rápida” ou use Alt + D.',
        ilustracao: 'devolucao',
      },
      {
        titulo: 'Leia o crachá devolvido',
        texto: 'Aproxime o leitor ou digite o código em “Código de barras do crachá devolvido”. Também é possível usar “Ler com câmera do celular”.',
        nota: { tom: 'aviso', texto: 'A leitura apenas preenche o código. A saída só acontece após a confirmação.' },
      },
      {
        titulo: 'Confirme a devolução',
        texto: 'Mantenha marcado “Confirmo a devolução do crachá.” e clique em “Registrar devolução”.',
      },
      {
        titulo: 'Outra forma: pela lista de presentes',
        texto: 'Em Presentes no Prédio em Tempo Real, clique em “Saída” na linha da pessoa, preencha “Observações da Saída” se precisar e clique em “Confirmar Saída”.',
      },
    ],
    concluido: 'Aparece “Saída registrada com sucesso! Crachá liberado para o inventário.” e a pessoa sai da lista de presentes.',
    problemas: [
      { problema: '“Não há uma entrada em andamento vinculada a este crachá.”', solucao: 'Confira o código lido. O crachá pode já ter sido devolvido.' },
      { problema: 'Crachá em uso sem entrada aberta', solucao: 'Avise o administrador para conferir o inventário em Crachás.' },
      { problema: 'Pessoa saiu sem devolver o crachá', solucao: 'Registre a saída pela lista de presentes e desmarque a confirmação de devolução. O crachá segue como pendência.' },
    ],
    palavrasChave: ['saida', 'devolucao', 'devolver', 'cracha', 'encerrar', 'liberar', 'alt d'],
  },
  {
    id: 'visitantes-servidores',
    titulo: 'Visitantes e servidores',
    categoria: 'Cadastros',
    descricao: 'Consulte e confira os cadastros antes do atendimento.',
    icone: 'pessoas',
    perfis: ['recepcionista', 'gestor', 'admin'],
    paraQueServe: 'Manter os dados de visitantes corretos e localizar servidores do quadro.',
    antesDeComecar: ['Para cadastrar visitante: nome completo, CPF e telefone são obrigatórios.'],
    ondeAcessar: { rotulo: 'Visitantes', rota: '/visitantes' },
    passos: [
      {
        titulo: 'Pesquise o visitante',
        texto: 'Em Visitantes, digite em “Pesquisar por nome ou CPF...”. Use “Editar” para corrigir dados.',
      },
      {
        titulo: 'Cadastre um novo visitante',
        texto: 'Clique em “Novo Visitante” e preencha Nome Completo, CPF e Telefone / Celular. Os demais campos são opcionais.',
        nota: { tom: 'info', texto: 'Na Recepção, quando o CPF não é encontrado, use “Cadastrar Visitante Agora”.' },
      },
      {
        titulo: 'Localize um servidor',
        texto: 'Em Servidores, pesquise por nome, matrícula ou CPF. A lista mostra cargo, lotação e status.',
      },
      {
        titulo: 'Cadastre um servidor',
        texto: 'Clique em “Cadastrar Servidor” e informe Matrícula Institucional, Nome, Cargo / Função, Lotação e Departamento.',
        nota: { tom: 'aviso', texto: 'Somente gestores e administradores podem salvar servidores.' },
      },
    ],
    concluido: 'O cadastro aparece na lista e pode ser usado na Recepção.',
    problemas: [
      { problema: 'Erro de segurança ao salvar servidor', solucao: 'Sua conta não tem permissão. Peça a um gestor ou administrador.' },
      { problema: 'CPF já cadastrado', solucao: 'Pesquise pelo CPF e use “Editar” no cadastro existente.' },
    ],
    palavrasChave: ['visitante', 'servidor', 'cadastro', 'cadastrar', 'editar', 'cpf', 'matricula', 'pessoa nao encontrada', 'lgpd'],
  },
  {
    id: 'autorizacoes',
    titulo: 'Autorizações de acesso',
    categoria: 'Recepção',
    descricao: 'Confirme com o responsável e acompanhe os acessos pendentes.',
    icone: 'autorizacao',
    perfis: ['recepcionista', 'gestor', 'admin'],
    paraQueServe: 'Garantir que visitas a responsáveis com restrição só sejam liberadas com permissão.',
    antesDeComecar: ['Tenha o ramal ou a sala do responsável (aparecem na tela de autorização).'],
    ondeAcessar: { rotulo: 'Autorizações', rota: '/autorizacoes' },
    passos: [
      {
        titulo: 'Reconheça a restrição',
        texto: 'No campo Diretor / Servidor, nomes em vermelho exigem autorização prévia. O botão passa a ser “Confirmar autorização”.',
        ilustracao: 'autorizacao',
      },
      {
        titulo: 'Fale com o responsável',
        texto: 'Na tela Autorização do responsável, use o ramal ou a sala indicados e escolha como a autorização foi obtida.',
      },
      {
        titulo: 'Confirme ou deixe pendente',
        texto: 'Marque “Confirmo que … autorizou a entrada” e clique em “Confirmar entrada”. Sem resposta, use “Sem resposta? Deixar pendente”.',
        nota: { tom: 'sucesso', texto: 'A confirmação fica registrada com seu nome e o horário.' },
      },
      {
        titulo: 'Acompanhe a fila',
        texto: 'Em Autorizações, a Fila de Autorizações de Acesso mostra os pedidos. Use “Autorizar Entrada” ou “Recusar” e registre a justificativa.',
      },
    ],
    concluido: 'A entrada confirmada fica “No prédio”. A pendente aparece como “Aguardando Autorização” até a decisão.',
    problemas: [
      { problema: 'Responsável não atende', solucao: 'Use “Sem resposta? Deixar pendente” e acompanhe pela fila de Autorizações.' },
      { problema: 'Não há responsável cadastrado no setor', solucao: 'Deixe o Diretor / Servidor sem seleção para atendimento no balcão do setor.' },
    ],
    palavrasChave: ['autorizacao', 'pendente', 'aprovacao', 'liberar', 'recusar', 'restricao', 'vermelho', 'responsavel'],
  },
  {
    id: 'movimentacoes',
    titulo: 'Movimentações e histórico',
    categoria: 'Consultas',
    descricao: 'Consulte entradas, saídas e o histórico de cada pessoa.',
    icone: 'historico',
    perfis: ['recepcionista', 'gestor', 'admin'],
    paraQueServe: 'Saber quem entrou, para onde foi, quando saiu e quanto tempo ficou.',
    antesDeComecar: ['Tenha o nome, o crachá ou o documento da pessoa.'],
    ondeAcessar: { rotulo: 'Movimentações', rota: '/movimentacoes' },
    passos: [
      { titulo: 'Pesquise', texto: 'Digite em “Buscar por nome, crachá ou documento...”. Os filtros No Prédio, Finalizado e Pendente refinam a lista.' },
      { titulo: 'Abra o histórico', texto: 'Pressione Enter na busca ou clique no nome para ver o histórico completo do visitante.' },
      { titulo: 'Registre a saída, se preciso', texto: 'Em registros “No Prédio”, use “Saída” e depois “Confirmar Saída”.' },
      { titulo: 'Gere o relatório', texto: 'Clique em “Gerar PDF” para baixar a lista filtrada.' },
    ],
    concluido: 'A lista mostra horário de entrada, saída, tempo de permanência e status.',
    problemas: [
      { problema: 'Editar ou excluir um registro', solucao: 'Ainda não disponível: a alteração de movimentações depende de confirmação administrativa.' },
    ],
    palavrasChave: ['movimentacao', 'historico', 'entradas', 'saidas', 'consultar', 'permanencia', 'visitas anteriores'],
  },
  {
    id: 'agendamentos',
    titulo: 'Agendamentos',
    categoria: 'Consultas',
    descricao: 'Cadastre atendimentos previstos na Secretaria.',
    icone: 'agenda',
    perfis: ['recepcionista', 'gestor', 'admin'],
    paraQueServe: 'Deixar a recepção ciente de visitas e audiências marcadas.',
    antesDeComecar: ['O visitante precisa estar cadastrado.'],
    ondeAcessar: { rotulo: 'Agendamentos', rota: '/agendamentos' },
    passos: [
      { titulo: 'Crie o agendamento', texto: 'Clique em “Novo Agendamento” e informe Visitante, Data e Hora Prevista, Departamento e Motivo.' },
      { titulo: 'Detalhe se necessário', texto: 'Escolha o Setor, o Servidor Responsável (Opcional) e a documentação exigida.' },
      {
        titulo: 'No dia da visita',
        texto: 'Registre a entrada normalmente pela Recepção.',
        nota: { tom: 'aviso', texto: 'O agendamento ainda não gera a entrada automaticamente.' },
      },
    ],
    concluido: 'O agendamento aparece na Lista de Agendamentos com o status “agendado”.',
    problemas: [{ problema: 'Visitante não aparece na lista', solucao: 'Cadastre-o antes em Visitantes.' }],
    palavrasChave: ['agendamento', 'agenda', 'audiencia', 'marcar', 'previsto', 'horario'],
  },
  {
    id: 'crachas',
    titulo: 'Crachás e devoluções',
    categoria: 'Recepção',
    descricao: 'Entenda as situações do crachá e mantenha o inventário.',
    icone: 'cracha',
    perfis: ['recepcionista', 'gestor', 'admin'],
    paraQueServe: 'Garantir que cada crachá esteja com apenas uma pessoa por vez.',
    antesDeComecar: ['Confira o código de barras impresso no crachá.'],
    ondeAcessar: { rotulo: 'Crachás', rota: '/crachas' },
    passos: [
      { titulo: 'Consulte o inventário', texto: 'Em Crachás, pesquise por número ou descrição e veja a Situação de cada um.', ilustracao: 'cracha' },
      { titulo: 'Devolva antes de reutilizar', texto: 'Crachá “Em uso” não pode ser vinculado. Faça a Devolução rápida primeiro.' },
      {
        titulo: 'Cadastre ou edite (administrador)',
        texto: 'Clique em “Novo crachá”, informe o código de barras e a legenda impressa e escolha a Situação.',
        nota: { tom: 'aviso', texto: 'Crachás extraviados ou danificados não podem ser atribuídos.' },
      },
    ],
    concluido: 'O crachá devolvido volta a “Disponível” e pode ser usado em nova entrada.',
    problemas: [{ problema: '“Crachá não localizado ou inativo.”', solucao: 'Confira o código impresso. Se não estiver cadastrado, peça ao administrador.' }],
    palavrasChave: ['cracha', 'devolucao', 'inventario', 'disponivel', 'em uso', 'codigo de barras', 'extraviado'],
  },
  {
    id: 'relatorios',
    titulo: 'Relatórios e PDF',
    categoria: 'Gestão',
    descricao: 'Gere documentos e consulte a trilha de auditoria.',
    icone: 'relatorio',
    perfis: ['recepcionista', 'gestor', 'admin'],
    paraQueServe: 'Entregar relatórios institucionais e comprovar quem fez cada operação.',
    antesDeComecar: ['Aplique os filtros desejados antes de gerar o documento.'],
    ondeAcessar: { rotulo: 'Relatórios & Auditoria', rota: '/relatorios' },
    passos: [
      { titulo: 'PDF de atendimento', texto: 'Use “Gerar PDF” na Recepção (Alt + P), em Movimentações ou em Visitantes.' },
      { titulo: 'Trilha de auditoria', texto: 'Em Relatórios & Auditoria, filtre por Consulta CPF, Consulta Matrícula, Entradas ou Saídas.' },
      { titulo: 'Exporte', texto: 'Clique em “Exportar CSV” para abrir os dados em planilha.' },
    ],
    concluido: 'O arquivo é baixado pelo navegador.',
    problemas: [{ problema: 'O PDF saiu vazio', solucao: 'Limpe a busca e os filtros da tela e gere novamente.' }],
    palavrasChave: ['relatorio', 'pdf', 'csv', 'exportar', 'auditoria', 'planilha', 'imprimir'],
  },
  {
    id: 'painel',
    titulo: 'Painel de indicadores',
    categoria: 'Gestão',
    descricao: 'Acompanhe a ocupação do prédio em tempo real.',
    icone: 'painel',
    perfis: ['gestor', 'admin'],
    paraQueServe: 'Ver rapidamente quantas pessoas estão no prédio e para onde foram.',
    antesDeComecar: ['Nenhum preparo: os dados vêm das entradas registradas.'],
    ondeAcessar: { rotulo: 'Dashboard', rota: '/dashboard' },
    passos: [
      { titulo: 'Leia os indicadores', texto: 'Confira Presentes Agora, Visitantes Hoje, Servidores em Trânsito e Autorizações Pendentes.' },
      { titulo: 'Analise o fluxo', texto: 'Os gráficos mostram o Fluxo por Departamento (Hoje) e a proporção entre visitantes e servidores.' },
      { titulo: 'Atualize', texto: 'Clique em “Atualizar Indicadores” para ver os números mais recentes.' },
    ],
    concluido: 'As Últimas Movimentações Registradas aparecem no fim do painel.',
    problemas: [{ problema: 'Números desatualizados', solucao: 'Clique em “Atualizar Indicadores”.' }],
    palavrasChave: ['dashboard', 'painel', 'indicadores', 'grafico', 'ocupacao', 'presentes'],
  },
  {
    id: 'departamentos',
    titulo: 'Departamentos e setores',
    categoria: 'Administração',
    descricao: 'Mantenha a estrutura e as regras de acesso.',
    icone: 'estrutura',
    perfis: ['gestor', 'admin'],
    paraQueServe: 'Definir os destinos disponíveis na Recepção e quais exigem autorização.',
    antesDeComecar: ['Tenha nome, sigla, sala e ramal do setor.'],
    ondeAcessar: { rotulo: 'Departamentos & Setores', rota: '/departamentos' },
    restricao: 'Criar, editar e excluir é exclusivo do administrador. Os demais perfis consultam.',
    passos: [
      { titulo: 'Crie um departamento', texto: 'Clique em “Departamento” e informe Nome do Departamento e Sigla.' },
      { titulo: 'Crie um setor', texto: 'Clique em “Novo Setor”, escolha o Departamento Vinculado e preencha Nome do Setor, Sigla, Sala e Ramal.' },
      { titulo: 'Defina a regra de acesso', texto: 'Marque “Requer autorização prévia para entrada” quando o setor exigir. Sem a marcação, o setor é de Livre Acesso.' },
    ],
    concluido: 'O setor passa a aparecer em “Departamento de destino” na Recepção.',
    problemas: [{ problema: 'Não consigo excluir um departamento', solucao: 'Exclua ou realoque antes os setores vinculados.' }],
    palavrasChave: ['departamento', 'setor', 'estrutura', 'sigla', 'sala', 'ramal', 'livre acesso', 'regra'],
  },
  {
    id: 'administracao',
    titulo: 'Administração e permissões',
    categoria: 'Administração',
    descricao: 'Gerencie operadores e perfis de acesso.',
    icone: 'admin',
    perfis: ['admin'],
    paraQueServe: 'Controlar quem opera o sistema e com qual perfil.',
    antesDeComecar: ['Acesso exclusivo do perfil Administrador.'],
    ondeAcessar: { rotulo: 'Administração', rota: '/administracao' },
    restricao: 'Disponível apenas para administradores.',
    passos: [
      { titulo: 'Confira os operadores', texto: 'Em Operadores Homologados & Controle de Acesso, veja nome, e-mail institucional e Papel (Role).' },
      { titulo: 'Teste um perfil', texto: 'Use “Simular este Perfil” para ver o sistema como recepcionista ou gestor.' },
      {
        titulo: 'Cuidado com a base de testes',
        texto: '“Restaurar Base de Testes (Seed)” substitui os dados de teste.',
        nota: { tom: 'aviso', texto: 'Não use em produção.' },
      },
    ],
    concluido: 'O papel ativo aparece como “Ativo Atualmente”.',
    problemas: [{ problema: 'Usuário novo sem acesso', solucao: 'O perfil é criado no primeiro acesso como recepcionista. Ajuste o papel no Supabase.' }],
    palavrasChave: ['administracao', 'permissao', 'perfil', 'operador', 'usuario', 'role', 'acesso'],
  },
];

export const PERGUNTAS: Pergunta[] = [
  {
    id: 'cracha-em-uso',
    pergunta: 'Posso usar um crachá em uso?',
    resposta: 'Não. Faça a devolução antes de vinculá-lo a uma nova entrada.',
    aviso: 'Atenção ao status do crachá',
    perfis: ['recepcionista', 'gestor', 'admin'],
    guiaId: 'crachas',
    palavrasChave: ['cracha', 'em uso', 'disponivel'],
  },
  {
    id: 'entrada-servidor',
    pergunta: 'Como registrar a entrada de um servidor?',
    resposta: 'Na Recepção, escolha Servidor, digite a matrícula e clique em “Consultar Matrícula”. Depois use “Iniciar registro de entrada”.',
    perfis: ['recepcionista', 'gestor', 'admin'],
    guiaId: 'registrar-entrada',
    palavrasChave: ['servidor', 'matricula', 'entrada'],
  },
  {
    id: 'entrada-visitante',
    pergunta: 'Como registrar a entrada de um visitante?',
    resposta: 'Escolha Visitante, digite o CPF e clique em “Consultar CPF”. Um visitante pode ter até 10 destinos com “Adicionar outro destino”.',
    perfis: ['recepcionista', 'gestor', 'admin'],
    guiaId: 'registrar-entrada',
    palavrasChave: ['visitante', 'cpf', 'entrada', 'destinos'],
  },
  {
    id: 'nao-encontrada',
    pergunta: 'O que fazer quando a pessoa não é encontrada?',
    resposta: 'Visitante: use “Cadastrar Visitante Agora”. Servidor: use “Cadastrar servidor” (gestor ou administrador).',
    perfis: ['recepcionista', 'gestor', 'admin'],
    guiaId: 'visitantes-servidores',
    palavrasChave: ['nao encontrado', 'cadastro', 'cadastrar'],
  },
  {
    id: 'devolver-cracha',
    pergunta: 'Como devolver um crachá?',
    resposta: 'Clique em “Devolução rápida” (Alt + D), leia o código, confirme a devolução e clique em “Registrar devolução”.',
    perfis: ['recepcionista', 'gestor', 'admin'],
    guiaId: 'registrar-saida',
    palavrasChave: ['devolver', 'devolucao', 'saida', 'cracha'],
  },
  {
    id: 'consultar-entradas',
    pergunta: 'Onde consulto entradas e saídas?',
    resposta: 'Em Movimentações. Pesquise por nome, crachá ou documento e use os filtros de status.',
    perfis: ['recepcionista', 'gestor', 'admin'],
    guiaId: 'movimentacoes',
    palavrasChave: ['consultar', 'entradas', 'saidas', 'movimentacoes'],
  },
  {
    id: 'encontrar-servidor',
    pergunta: 'Como encontro um servidor?',
    resposta: 'Em Servidores, pesquise por nome, matrícula ou CPF. Na Recepção, o campo Diretor / Servidor lista quem atende no setor escolhido.',
    perfis: ['recepcionista', 'gestor', 'admin'],
    guiaId: 'visitantes-servidores',
    palavrasChave: ['servidor', 'encontrar', 'buscar', 'lotacao'],
  },
  {
    id: 'sem-responsavel',
    pergunta: 'E se não houver responsável?',
    resposta: 'Deixe o Diretor / Servidor como “Selecione uma pessoa”: o atendimento fica no balcão do setor escolhido.',
    perfis: ['recepcionista', 'gestor', 'admin'],
    guiaId: 'registrar-entrada',
    palavrasChave: ['responsavel', 'sem responsavel', 'diretor', 'balcao'],
  },
  {
    id: 'autorizacao-pendente',
    pergunta: 'Como acompanho uma autorização pendente?',
    resposta: 'Em Autorizações, na Fila de Autorizações de Acesso. Use “Autorizar Entrada” ou “Recusar” e registre a justificativa.',
    perfis: ['recepcionista', 'gestor', 'admin'],
    guiaId: 'autorizacoes',
    palavrasChave: ['autorizacao', 'pendente', 'fila'],
  },
  {
    id: 'historico-visitas',
    pergunta: 'Como consulto o histórico de visitas?',
    resposta: 'Em Movimentações, digite o nome e pressione Enter. O histórico também aparece ao identificar o visitante na Recepção.',
    perfis: ['recepcionista', 'gestor', 'admin'],
    guiaId: 'movimentacoes',
    palavrasChave: ['historico', 'visitas anteriores', 'visitante'],
  },
  {
    id: 'gerar-pdf',
    pergunta: 'Como gero relatórios em PDF?',
    resposta: 'Use “Gerar PDF” na Recepção (Alt + P), em Movimentações ou em Visitantes. Para planilha, use “Exportar CSV” em Relatórios & Auditoria.',
    perfis: ['recepcionista', 'gestor', 'admin'],
    guiaId: 'relatorios',
    palavrasChave: ['pdf', 'relatorio', 'csv', 'exportar'],
  },
  {
    id: 'perfis-acesso',
    pergunta: 'O que cada perfil pode acessar?',
    resposta: 'Recepcionista opera atendimentos e crachás. Gestor também cadastra servidores e acompanha indicadores. Administrador gerencia estrutura, crachás e operadores.',
    perfis: ['recepcionista', 'gestor', 'admin'],
    guiaId: 'administracao',
    palavrasChave: ['perfil', 'permissao', 'acesso', 'gestor', 'administrador', 'recepcionista'],
  },
  {
    id: 'indicadores-atualizar',
    pergunta: 'Como atualizo os indicadores do Dashboard?',
    resposta: 'Clique em “Atualizar Indicadores” no topo do Dashboard.',
    perfis: ['gestor', 'admin'],
    guiaId: 'painel',
    palavrasChave: ['dashboard', 'indicadores', 'atualizar'],
  },
  {
    id: 'setor-autorizacao',
    pergunta: 'Como faço um setor exigir autorização?',
    resposta: 'Em Departamentos & Setores, edite o setor e marque “Requer autorização prévia para entrada”. Exclusivo do administrador.',
    perfis: ['gestor', 'admin'],
    guiaId: 'departamentos',
    palavrasChave: ['setor', 'autorizacao', 'regra', 'restricao'],
  },
];

export const TAREFAS_POR_PERFIL: Record<PerfilId, Tarefa[]> = {
  recepcionista: [
    { guiaId: 'registrar-entrada', titulo: 'Registrar entrada', resumo: 'Identifique e encaminhe a pessoa.', acao: 'Ver passo a passo', icone: 'entrada', tom: 'azul' },
    { guiaId: 'registrar-saida', titulo: 'Registrar saída', resumo: 'Finalize a visita e receba o crachá.', acao: 'Ver guia', icone: 'saida', tom: 'verde' },
    { guiaId: 'visitantes-servidores', titulo: 'Visitantes e servidores', resumo: 'Consulte e confira os cadastros.', acao: 'Ver guia', icone: 'pessoas', tom: 'roxo' },
    { guiaId: 'autorizacoes', titulo: 'Autorizações', resumo: 'Acompanhe acessos pendentes.', acao: 'Ver guia', icone: 'autorizacao', tom: 'ambar' },
  ],
  gestor: [
    { guiaId: 'painel', titulo: 'Painel de indicadores', resumo: 'Acompanhe a ocupação do prédio.', acao: 'Ver guia', icone: 'painel', tom: 'azul' },
    { guiaId: 'movimentacoes', titulo: 'Movimentações', resumo: 'Consulte entradas, saídas e histórico.', acao: 'Ver guia', icone: 'historico', tom: 'verde' },
    { guiaId: 'visitantes-servidores', titulo: 'Servidores', resumo: 'Cadastre e atualize o quadro.', acao: 'Ver guia', icone: 'servidor', tom: 'roxo' },
    { guiaId: 'relatorios', titulo: 'Relatórios e auditoria', resumo: 'Gere PDF e exporte CSV.', acao: 'Ver guia', icone: 'relatorio', tom: 'ambar' },
  ],
  admin: [
    { guiaId: 'departamentos', titulo: 'Departamentos e setores', resumo: 'Mantenha a estrutura e as regras.', acao: 'Ver guia', icone: 'estrutura', tom: 'azul' },
    { guiaId: 'crachas', titulo: 'Crachás', resumo: 'Cadastre e edite o inventário.', acao: 'Ver guia', icone: 'cracha', tom: 'verde' },
    { guiaId: 'visitantes-servidores', titulo: 'Servidores', resumo: 'Cadastre e atualize o quadro.', acao: 'Ver guia', icone: 'servidor', tom: 'roxo' },
    { guiaId: 'administracao', titulo: 'Administração', resumo: 'Gerencie operadores e perfis.', acao: 'Ver guia', icone: 'admin', tom: 'ambar' },
  ],
};

export const TOPICOS_POPULARES: Array<{ rotulo: string; guiaId: string; icone: IconeId }> = [
  { rotulo: 'Registrar entrada', guiaId: 'registrar-entrada', icone: 'entrada' },
  { rotulo: 'Devolver crachá', guiaId: 'registrar-saida', icone: 'cracha' },
  { rotulo: 'Autorizações', guiaId: 'autorizacoes', icone: 'autorizacao' },
];

/** Ordem dos links em "Explore outros assuntos"; só aparecem os guias do perfil escolhido. */
export const ASSUNTOS: string[] = [
  'crachas',
  'movimentacoes',
  'relatorios',
  'visitantes-servidores',
  'autorizacoes',
  'agendamentos',
  'departamentos',
  'painel',
  'administracao',
];

export const SUGESTOES_BUSCA = ['entrada', 'crachá', 'saída', 'visitante', 'autorização', 'relatório'];
