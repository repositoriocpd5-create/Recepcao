# SME Recepção — Sistema de Gestão de Acesso e Atendimento

Sistema oficial de recepção, identificação de servidores, visitantes, autorizações e controle de fluxo da **Secretaria Municipal de Educação (SME)**.

---

## 1. Arquitetura e Stack Tecnológica

O sistema foi concebido para execução ágil e robusta sem necessidade de backend Django legado, operando na seguinte topologia:

```
[ Frontend: React + TypeScript + Vite + Tailwind CSS ]
                        │
                        ▼ (HTTPS / Supabase Client)
[ Backend: Supabase PostgreSQL + Auth + RLS + Functions (RPC) ]
                        ▲
                        │ (Deploy Contínuo / CI-CD)
[ GitHub Repository ] ──┴──► [ Netlify Hosting (SPA) ]
```

### Tecnologias:
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide React, React Router 7, TanStack Query, Recharts.
- **Backend:** Supabase PostgreSQL, Supabase Auth, Row Level Security (RLS), Funções Transacionais Atômicas (RPC).
- **Hospedagem & CI/CD:** Netlify e GitHub.

---

## 2. Estrutura do Repositório

```text
├── public/
│   └── assets/
│       └── favicon.svg
├── src/
│   ├── components/
│   │   ├── layout/       (Navbar, Sidebar, AppLayout)
│   │   ├── ui/           (Button, Input, Badge, Card, Modal, Select)
│   │   └── shared/
│   ├── pages/
│   │   ├── Login/        (Acesso institucional do operador)
│   │   ├── Recepcao/     (Balcão central: Servidor x Visitante, Entrada, Saída)
│   │   ├── Dashboard/    (Métricas, KPIs de ocupação e gráficos Recharts)
│   │   ├── Movimentacoes/(Histórico completo e encerramento de visitas)
│   │   ├── Visitantes/   (Cadastro de pessoas e busca por CPF)
│   │   ├── Servidores/   (Quadro funcional e busca por matrícula)
│   │   ├── Autorizacoes/ (Fila de liberação para setores com controle restrito)
│   │   ├── Agendamentos/ (Agenda oficial de audiências e atendimentos)
│   │   ├── Departamentos/(Organograma e regras de autorização dos setores)
│   │   ├── Setores/      (Mapeamento de setores)
│   │   ├── Relatorios/   (Trilha de auditoria LGPD e exportação CSV)
│   │   └── Administracao/(Diagnóstico de infraestrutura e simulação de perfis)
│   ├── contexts/         (AuthContext com Supabase Auth e modo de teste)
│   ├── services/         (dataService com RPCs atômicos e mockData inicial)
│   ├── types/            (Interfaces TypeScript do modelo de domínio)
│   ├── lib/              (supabase.ts e utils de formatação)
│   ├── routes/           (AppRoutes com rotas protegidas)
│   ├── App.tsx
│   └── main.tsx
├── supabase/
│   ├── migrations/       (01_initial_schema, 02_functions_and_rpc, 03_rls_and_security, 04_seed_test_data)
│   ├── functions/        (Edge Functions para operações administrativas privilegiadas)
│   └── tests/            (Script SQL de integridade e RLS)
├── .env.example
├── .gitignore
├── netlify.toml
├── package.json
└── README.md
```

---

## 3. Banco de Dados e Migrações (Supabase)

As migrações versionadas encontram-se em `supabase/migrations/`:

1. `20261008000001_initial_schema.sql`:
   - Enums: `user_role`, `pessoa_tipo`, `servidor_status`, `movimentacao_status`, `autorizacao_status`, `agendamento_status`.
   - Tabelas com UUID: `profiles`, `departamentos`, `setores`, `servidores`, `visitantes`, `movimentacoes`, `autorizacoes`, `agendamentos`, `auditoria_logs`.
   - Constraints de unicidade (Matrícula, CPF, Siglas) e índices de alta performance.

2. `20261008000002_functions_and_rpc.sql`:
   - `rpc_registrar_entrada`: Operação **atômica** que bloqueia tentativas de entradas duplicadas de pessoas já presentes no prédio e cria auditoria.
   - `rpc_registrar_saida`: Operação **atômica** que finaliza movimentação e devolve crachá.
   - `rpc_consultar_servidor`: Consulta por matrícula com registro de auditoria.
   - `rpc_consultar_visitante`: Consulta por CPF com conformidade LGPD e histórico recente.

3. `20261008000003_rls_and_security.sql`:
   - Row Level Security (RLS) habilitado em 100% das tabelas.
   - Restrição contra leitura de dados pessoais por usuários não autenticados (`anon`).
   - Políticas refinadas por papel (`admin`, `gestor`, `recepcionista`).

4. `20261008000004_seed_test_data.sql`:
   - Carga inicial reproduzível com departamentos reais da SME (Gabinete, RH, Pedagógico, Merenda, Transporte), servidores, visitantes e movimentações.

---

## 4. Como Executar Localmente

### Pré-requisitos
- Node.js >= 18
- npm ou yarn

### Instalação
```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento local
npm run dev
```

O aplicativo estará disponível em `http://localhost:3000`.

### Modo de Homologação / Testes Offline
Caso as credenciais do Supabase não estejam preenchidas em `.env`, a aplicação inicia automaticamente no **Modo Homologação Ativo**, operando com o banco de teste em memória / localStorage. Todas as regras (prevenção de entrada duplicada, autorizações, consultas de CPF e matrícula) funcionam perfeitamente.

Para conectar a um projeto real no Supabase:
```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 5. Publicação no Netlify

O repositório já conta com o arquivo `netlify.toml` pré-configurado:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

1. Vincule seu repositório GitHub ao painel do Netlify.
2. Adicione as variáveis de ambiente:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
3. O build é automático em cada push para a branch `main`.

---

## 6. Critérios de Homologação Validados

- [x] **1. Compilação sem erros:** TypeScript e bundle Vite compilam com zero falhas (`npm run build`).
- [x] **2. Publicação Netlify:** Arquivo `netlify.toml` presente com redirecionamentos SPA.
- [x] **3. Conexão com Supabase:** Cliente configurado em `src/lib/supabase.ts` com fallback gracioso.
- [x] **4. Autenticação:** Login institucional por perfil com Supabase Auth.
- [x] **5. Respeito aos perfis:** Validações no frontend e no banco (Admin, Gestor, Recepcionista).
- [x] **6. Consulta por matrícula:** Verificação atômica de lotação e presença no prédio.
- [x] **7. Consulta por CPF:** Verificação de visitante com sanitização e histórico de visitas.
- [x] **8. Cadastro de visitantes:** Modal dinâmico com salvamento imediato.
- [x] **9. Registro de entrada:** Definição de setor, crachá, anfitrião e motivo.
- [x] **10. Registro de saída:** Encerramento e desvinculação de crachá em um clique.
- [x] **11. Bloqueio de duplicidade:** Integridade atômica que impede registrar duas entradas ativas para a mesma pessoa.
- [x] **12. Autorizações no servidor:** Setores protegidos colocam a entrada em modo pendente até aprovação do responsável.
- [x] **13. Dashboard em tempo real:** Gráficos e indicadores alimentados com dados do banco.
- [x] **14. Auditoria e LGPD:** Registro de consultas e exportação de logs em CSV.
- [x] **15. Políticas RLS:** Migrações com scripts de teste pgTAP / SQL em `supabase/tests/`.
- [x] **16. Responsividade:** Layout adaptado para desktop, tablets e smartphones.
- [x] **17. CI/CD GitHub:** Branch `main` configurada com versionamento rastreável.
