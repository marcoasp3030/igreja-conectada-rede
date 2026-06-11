## Módulo Financeiro — Plano de Implementação

Módulo completo de gestão financeira por congregação com consolidação na sede, integrado ao sistema existente (perfis, congregações, RLS por congregação, roles `admin_sede`, `admin_congregacao`, `membro`).

### 1. Banco de dados (migration única)

Tabelas novas em `public`:

- **`finance_categories`** — categorias de entrada/saída
  - `nome`, `tipo` (enum `entrada` | `saida`), `slug`, `ativo`, `congregation_id` (nullable = global), `cor`
  - Seed com as categorias pedidas: Dízimos, Oferta de Culto, Oferta da EBD, Círculo de Oração, Missões, Campanhas, Festividades, Especial, Outras receitas + saídas (Manutenção, Ajuda Social, Eventos, Materiais, Som, Mídia, Limpeza, Outros).

- **`finance_transactions`** — lançamentos (entradas e saídas unificados)
  - `congregation_id`, `category_id`, `tipo` (entrada/saida), `valor` (numeric 12,2), `data` (date), `forma_pagamento` (enum: dinheiro, pix, cartao, transferencia, outros), `event_id` (nullable → `events`), `member_id` (nullable → `members`), `contribuinte_nome` (texto livre para não-membros), `anonimo` (bool), `descricao`, `observacoes`, `comprovante_url` (nullable), `status` (enum: pendente, aprovado, rejeitado), `created_by`, `approved_by`, `approved_at`, `rejected_reason`.

- **`finance_closings`** — fechamentos
  - `congregation_id`, `periodo_tipo` (culto/semana/mes), `event_id` (nullable), `data_inicio`, `data_fim`, `total_entradas`, `total_saidas`, `saldo`, `status` (aberto/fechado), `closed_by`, `closed_at`, `observacoes`.

- **`finance_audit_logs`** — auditoria
  - `transaction_id`, `action` (created/updated/approved/rejected/deleted), `actor_id`, `diff` (jsonb), `created_at`.

Novo role: adicionar `tesoureiro` e `secretario` ao enum `app_role` (se ainda não existem). Manter `admin_sede` e `admin_congregacao`. "Visualizador" = `membro` com permissão de leitura via política.

Trigger `finance_transactions_audit` registra mudanças em `finance_audit_logs`. Trigger `set_updated_at` padrão.

**RLS** (usando helpers existentes `is_sede_admin`, `can_admin_congregation`, `user_congregation`):
- SELECT: sede vê tudo; demais veem apenas da própria congregação.
- INSERT: usuários autenticados da congregação (qualquer role exceto visualização pura).
- UPDATE/DELETE: criador (se pendente), admin_congregacao, tesoureiro ou sede.
- Aprovação: somente admin_congregacao/tesoureiro/sede.

GRANTs padrão em todas as tabelas.

### 2. Server functions (`src/lib/finance.functions.ts`)

Todas com `requireSupabaseAuth`:
- `listTransactions({ congregation_id?, data_inicio?, data_fim?, tipo?, category_id?, status?, forma_pagamento? })`
- `getTransaction(id)`
- `createTransaction(input)` / `updateTransaction(id, input)` / `deleteTransaction(id)`
- `approveTransaction(id)` / `rejectTransaction(id, motivo)`
- `listCategories({ tipo? })` / `createCategory` / `updateCategory`
- `getDashboardSummary({ congregation_id?, mes, ano })` → totais por categoria, comparativo mês anterior, saldo, top categorias
- `getSedeOverview({ mes, ano })` → consolidado por congregação
- `listClosings` / `createClosing` / `closeClosing`
- `getAuditLog(transaction_id)`
- `exportTransactionsCsv(filtros)` → retorna CSV string

### 3. Frontend — novas rotas em `src/routes/_authenticated/app/`

- `financeiro.tsx` — layout com tabs (Dashboard / Lançamentos / Despesas / Fechamentos / Relatórios / Categorias)
- `financeiro.index.tsx` — Dashboard:
  - Cards: Total Entradas, Total Saídas, Saldo, Dízimos do mês, Ofertas do mês, Comparativo vs mês anterior
  - Gráficos (recharts): linha de entradas/saídas por dia, barras por categoria, pizza por forma de pagamento
  - Filtros: mês/ano, congregação (somente sede)
- `financeiro.lancamentos.tsx` — tabela de entradas com filtros, busca, modal de novo/edição, badge de status, aprovar/rejeitar
- `financeiro.despesas.tsx` — análogo, tipo=saida
- `financeiro.fechamentos.tsx` — lista fechamentos, criar fechamento de período, ver detalhes
- `financeiro.relatorios.tsx` — relatórios com filtros, exportar CSV/PDF, visão consolidada da sede
- `financeiro.categorias.tsx` — CRUD de categorias (admin)

Componente compartilhado `TransactionForm` (modal) para entrada/saída.

Adicionar item "Financeiro" no `app-sidebar.tsx` com ícone `Wallet`/`DollarSign` e submenu.

### 4. Exportação

- **CSV**: gerado no server, download no cliente.
- **PDF**: usar `jspdf` + `jspdf-autotable` no cliente para relatórios formatados (cabeçalho da congregação, totais, tabela).

### 5. Permissões UI

Helper `useFinancePermissions(congregationId)` retornando `{ canCreate, canApprove, canDelete, canViewAll }` baseado em roles. Botões/abas escondidos conforme.

### Detalhes técnicos

- Valores: `numeric(12,2)` no DB, `number` no TS, formatação `Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' })`.
- Datas: `date` (sem timezone) para evitar deslocamentos.
- Status default `aprovado` quando criado por admin/tesoureiro/sede; `pendente` para outros roles.
- `attachSupabaseAuth` já registrado globalmente.
- Hooks via TanStack Query com `queryOptions` + `useSuspenseQuery` nos loaders.

### Entrega em duas fases

**Fase 1 (esta resposta)**: migration + server functions + dashboard + lançamentos + despesas + sidebar.
**Fase 2 (próxima)**: fechamentos, relatórios consolidados da sede, exportação PDF/Excel, auditoria visual, categorias CRUD.

Aprova para eu começar pela Fase 1?
