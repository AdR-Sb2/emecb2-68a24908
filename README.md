# EMEC BAIXADA 2 — Sistema de Gestão de Eletromecânica

Sistema de uso interno da equipe de **Eletromecânica da Baixada 2** (empresa **Águas do Rio**). Unifica estoque, compras, escala de trabalho, backlog de OS, dashboards de automação/testes, relatórios técnicos, manuais, gerador de OI (Ordem de Intervenção / Relatório Fotográfico), cronograma de instalação e ficha técnica de elevatórias em uma única plataforma web.

---

## 1. Visão Geral

### Público-alvo

| Cargo             | Acesso principal                                                                        |
| ----------------- | --------------------------------------------------------------------------------------- |
| **Técnico**       | Estoque (entrada/saída), Escala, Backlog, Manuais, Ficha da Elevatória (dados básicos)  |
| **Almoxarife**    | Gestão completa de Estoque e Compras, Ficha da Elevatória (dados mestres completos)     |
| **Supervisor**    | Todos os módulos operacionais (sem painel admin)                                        |
| **Administrador** | Acesso total, incluindo Painel Administrativo (gestão de usuários, cargos e permissões) |

### Módulos existentes

| Módulo                       | Rota          | Descrição                                                                                                                                                |
| ---------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dashboard de Automação**   | `/dashboard`  | KPIs de elevatórias, sensores CLP/PCP, gráficos por município/tipo                                                                                       |
| **Testes & Aferições**       | `/testes`     | Ensaios elétricos e hidráulicos com KPIs BT/MT e recalque                                                                                                |
| **Backlog BI**               | `/backlog`    | OS do Field/SAP com SLA, mapa Leaflet, roteirização multi-parada                                                                                         |
| **Estoque / Almoxarifado**   | `/estoque`    | Inventário, movimentações (entrada/saída/ajuste), compras, registros                                                                                     |
| **Escala de Trabalho**       | `/escala`     | Escala semanal, fórmula automática de plantão, importação/exportação XLSX                                                                                |
| **Manuais Técnicos**         | `/manuais`    | Biblioteca de manuais com abas por categoria, upload de PDF, sugestões                                                                                   |
| **Gerador de OI**            | `/oi`         | Ordem de Intervenção / Relatório Fotográfico com wizard completo e geração de .docx                                                                      |
| **Cronograma de Instalação** | `/cronograma` | Planejamento e cronograma de instalações, obras e manutenções com Gantt interativo, drag-and-drop, autosave, exportação XLSX/CSV/PDF e modo apresentação |
| **Ficha da Elevatória**      | `/elevatorias` | Ficha técnica completa de elevatórias: dados de equipamento, elétrica/automação, hidráulica, rolamentos/selos, área de influência, implantação e histórico de alterações |
| **Relatórios**               | `/relatorio`  | Relatórios técnicos e de planta                                                                                                                          |
| **Painel Administrativo**    | `/admin`      | Gestão de usuários, cargos, painéis e permissões granulares                                                                                              |
| **Home (Hub)**               | `/`           | Grid de cards com acesso a todos os módulos conforme permissão do cargo                                                                                  |

---

## 2. Stack Técnica

### Frontend

| Camada             | Tecnologia                                                  |
| ------------------ | ----------------------------------------------------------- |
| Framework          | **React 19** + **TypeScript**                               |
| Build / Dev Server | **Vite 8** via `@lovable.dev/vite-tanstack-config`          |
| Roteamento         | **TanStack Start** (SSR) + **TanStack Router** (file-based) |
| Query / Cache      | **TanStack Query**                                          |
| Estilização        | **Tailwind CSS v4** + `tw-animate-css`                      |
| Componentes        | **Radix UI** (dialog, select, dropdown, tabs, etc.)         |
| Gráficos           | **Recharts**                                                |
| Mapas              | **Leaflet** + **react-leaflet**                             |
| Ícones             | **Lucide React**                                            |
| Formulários        | **React Hook Form** + **Zod**                               |
| Planilhas          | **ExcelJS** (export) + **xlsx** (import)                    |
| Toasts             | **Sonner**                                                  |

### Backend / Banco

| Camada         | Tecnologia                                                     |
| -------------- | -------------------------------------------------------------- |
| Banco de dados | **PostgreSQL** via **Supabase**                                |
| Projeto        | `byxmnmebvqdxpzcuutak`                                         |
| Cliente        | `@supabase/supabase-js` com fallback para credenciais públicas |
| Autenticação   | Supabase Auth (email/senha) + tabela `profiles`                |
| Storage        | Supabase Storage (bucket `manuais` para PDFs)                  |

### Deploy

O projeto usa **TanStack Start** com SSR, empacotado via **Nitro** com alvo **Cloudflare**. O build gera um bundle server-side + client-side. O deploy é feito pelo Lovable.

### Estrutura do projeto

```
/
├── src/
│   ├── routes/          # Rotas do TanStack Router (file-based)
│   ├── lib/             # Bibliotecas (auth, supabase, permissoes, tema, etc.)
│   ├── components/      # Componentes reutilizáveis (shadcn/ui)
│   ├── assets/          # Imagens, ícones
│   ├── data/            # Dados estáticos (testes.json, backlog.json)
│   ├── styles.css       # Estilos globais
│   └── server.ts        # Entry point SSR com error handling
├── supabase/
│   └── migrations/      # Migrações SQL numeradas (00001 .. 00039)
├── AGENTS.md            # Instruções para agentes de IA
└── README.md            # Este arquivo
```

---

## 3. Módulo de Estoque (detalhado)

### 3.1 Estrutura das Tabelas

#### `materiais` — Cadastro mestre

| Coluna                        | Tipo                        | Descrição                                        |
| ----------------------------- | --------------------------- | ------------------------------------------------ |
| `id`                          | BIGSERIAL PK                |                                                  |
| `cod_sap`                     | TEXT UNIQUE                 | Código SAP do material                           |
| `descricao`                   | TEXT                        | Nome do material                                 |
| `unidade_medida`              | TEXT                        | `UN`, `PC`, `M`, `KG` etc.                       |
| `categoria_id`                | BIGINT FK → `categorias.id` | Categoria dinâmica (Elétrico, Mecânico, etc.)    |
| `fabricante`                  | TEXT                        |                                                  |
| `local_armazenagem`           | TEXT                        |                                                  |
| `estoque_minimo`              | NUMERIC                     | Gatilho para alerta de estoque baixo             |
| `material_critico`            | BOOLEAN                     | Se true, aparece destacado na interface          |
| `ativo`                       | BOOLEAN                     | Desativação lógica                               |
| `saldo_atual`                 | NUMERIC                     | **Saldo calculado automaticamente** por triggers |
| `custo_unitario`              | NUMERIC                     |                                                  |
| `criado_em` / `atualizado_em` | TIMESTAMPTZ                 |                                                  |

#### `movimentacoes` — Histórico de operações

| Coluna                | Tipo                          | Descrição                                                                          |
| --------------------- | ----------------------------- | ---------------------------------------------------------------------------------- |
| `cod_sap`             | TEXT FK → `materiais.cod_sap` |                                                                                    |
| `tipo`                | TEXT                          | `ENTRADA`, `SAIDA`, ou `AJUSTE`                                                    |
| `quantidade`          | NUMERIC                       | Quantidade (positiva para entrada, positiva para saída — o trigger decide o sinal) |
| `data`                | TIMESTAMPTZ                   | Data da movimentação                                                               |
| `destino`             | TEXT                          | Para onde o material foi (saídas)                                                  |
| `solicitante`         | TEXT                          | Quem solicitou                                                                     |
| `responsavel`         | TEXT                          | Quem retirou/entregou                                                              |
| `motivo_ajuste`       | TEXT                          | Justificativa do ajuste                                                            |
| `origem`              | TEXT                          | `SISTEMA` (movimentação real) ou `HISTORICO_PLANILHA` (dado importado)             |
| `afeta_saldo`         | BOOLEAN                       | Se `false`, a movimentação não altera `saldo_atual`                                |
| `divergencia_cod_sap` | BOOLEAN                       | Marcador para divergências detectadas em importação                                |
| `aba_origem`          | TEXT                          | Qual aba do sistema gerou (ex: "Registros", "Estoque")                             |

#### `compras` — Pedidos / Requisições de Compra

| Coluna                               | Tipo            | Descrição                                                              |
| ------------------------------------ | --------------- | ---------------------------------------------------------------------- |
| `requisicao` / `item_rc`             | BIGINT / BIGINT | Chave única composta                                                   |
| `cod_sap`                            | TEXT            | Material (snapshot — não é FK estrita)                                 |
| `descricao_material`                 | TEXT            |                                                                        |
| `qtde_rc`                            | NUMERIC         | Quantidade solicitada                                                  |
| `comprador_cotacao`                  | TEXT            |                                                                        |
| `deposito_rc`                        | TEXT            |                                                                        |
| `pedido`                             | TEXT            | Número do pedido                                                       |
| `fornecedor`                         | TEXT            |                                                                        |
| `status_geral`                       | TEXT            | Status livre (ex: "Aprovado", "A Caminho")                             |
| `chegou` / `data_chegou`             | BOOLEAN / DATE  | Controle físico de recebimento                                         |
| `foi_retirado` / `data_retirado`     | BOOLEAN / DATE  | **Dispara entrada automática no estoque**                              |
| `rc_em_fila`                         | BOOLEAN         | Se está na fila de acompanhamento                                      |
| `afeta_saldo`                        | BOOLEAN         | Se `true`, a entrada automática altera o saldo                         |
| `status_fila`                        | TEXT            | `Pendente`, `Visto`, `Em Processo`, `Aguardando Retorno`, `Finalizado` |
| `cobrado_via_email` / `dt_pagamento` | BOOLEAN / DATE  | Controle financeiro                                                    |
| `solicitante` / `previsao_uso`       | TEXT            |                                                                        |
| `data_prevista`                      | DATE            | Data prevista para entrega                                             |
| `valor_unitario`                     | NUMERIC         | Valor unitário do material na compra                                   |
| `valor_total`                        | NUMERIC         | Valor total do item na compra                                          |

#### `categorias` — Categorias de materiais

| Coluna  | Descrição                                                                 |
| ------- | ------------------------------------------------------------------------- |
| `id`    | BIGINT PK                                                                 |
| `nome`  | TEXT UNIQUE — ex: Elétrico, Mecânico, Hidráulico, EPI, Consumível, Outros |
| `ativo` | BOOLEAN                                                                   |

### 3.2 Lógica de Saldo

#### Trigger `atualizar_saldo_material` (AFTER INSERT on `movimentacoes`)

Executada após **toda inserção** em `movimentacoes`. A lógica:

```
SE afeta_saldo = false → não faz nada (RETURN)
SE tipo = 'ENTRADA'  → saldo_atual = saldo_atual + quantidade
SE tipo = 'SAIDA'    → saldo_atual = saldo_atual - quantidade
SE tipo = 'AJUSTE'   → saldo_atual = quantidade  (VALOR ABSOLUTO)
```

#### Trigger `recalcular_saldo_material` (AFTER DELETE on `movimentacoes`)

Ao deletar uma movimentação, recalcula o saldo do material somando todas as movimentações restantes com `afeta_saldo = true`.

### 3.3 O campo `afeta_saldo`

**Por que existe:** Durante a importação histórica de movimentações de planilhas, os saldos já estavam consolidados na planilha. As movimentações importadas servem apenas como **histórico/rastreabilidade**, sem modificar o saldo atual. Ao marcar `afeta_saldo = false`, a trigger de atualização de saldo pula aquela movimentação.

**Regra:** Movimentações criadas **pelo sistema** (entrada/saída pelos botões da interface, entrada automática de compras) sempre têm `afeta_saldo = true`. Movimentações importadas de planilha têm `afeta_saldo = false`.

### 3.4 Ajuste de Estoque

Diferente de entrada/saída, o **Ajuste define o saldo absoluto** do material, não um delta. Se o saldo atual é 10 e o técnico registra um ajuste de 5, o saldo passa a ser **5** (não 15 nem 10-5). O trigger executa `saldo_atual = quantidade` para operações do tipo `AJUSTE`.

### 3.5 Pipeline de Compras

#### Status e controle físico

Cada compra/RC passa por:

1. **Registro inicial** — dados da planilha SAP ou criação manual
2. **`chegou` = true** — marca que o material chegou fisicamente (não altera estoque)
3. **`foi_retirado` = true** — dispara a **entrada automática no estoque**

#### Entrada automática via `trg_compras_retirada_entrada`

```sql
WHEN (NEW.foi_retirado = true AND OLD.foi_retirado IS DISTINCT FROM true)
```

- Cria uma `movimentacao` do tipo `ENTRADA` com `origem = 'SISTEMA'` e `afeta_saldo = true`
- A entrada SÓ acontece se `afeta_saldo = true` na compra (compras do histórico importado têm `afeta_saldo = false`)
- A entrada usa `qtde_rc` como quantidade

#### Fila de RC

O campo `rc_em_fila` + tabela separada de `status_fila` permite acompanhamento das RCs pendentes com estágios: Pendente → Visto → Em Processo → Aguardando Retorno → Finalizado.

---

## 4. Decisões e Cuidados Importantes

### RLS (Row Level Security)

**RLS deve permanecer DESABILITADO** em todas as tabelas do projeto (`materiais`, `movimentacoes`, `compras`, `profiles`, `cargos`, `permissions`, `cargo_panel_permissions`, `manuais_*`, `colaboradores_escala`, `escala_dias`, `cronograma_*`, `notificacoes`, etc.). O controle de acesso é feito **via aplicação** (frontend + funções server-side validando permissões do cargo).

**Motivo:** O controle de acesso é implementado pelo sistema de painéis e permissões no frontend (`temPermissao` / `temPainel`). Ativar RLS causa falha silenciosa em todas as queries — já aconteceu como bug.

### Alterações de Schema

Qualquer `ALTER TABLE`, criação de coluna, trigger ou função deve ser executada **manualmente no SQL Editor do Supabase** pelo dono do projeto. **Nunca compartilhe `service_role` key ou access token com a IA.**

### Recarregar Schema

Depois de criar/alterar tabelas via migration, sempre confirmar que as permissões de GRANT para `anon` e `authenticated` estão corretas. Em caso de schema desatualizado no client (erros 404/400), executar:

```sql
NOTIFY pgrst, 'reload schema';
```

Ou reiniciar o projeto pelo painel do Supabase.

### DROP TABLE

**Nunca fazer DROP TABLE em tabela com dados reais** sem confirmar backup antes.

### Tabela de backup

Foi criada manualmente a tabela **`backup_saldo_pre_migration`** para preservar os saldos dos materiais antes de migrations arriscadas que envolvem recálculo de saldo ou alteração de triggers.

---

## 5. Histórico de Mudanças

### [2026-07-23] — Cronograma de Instalação: módulo completo de planejamento

- **Migration `00039_cronograma_instalacao.sql`**: tabelas `cronograma_projetos`, `cronograma_itens`, `cronograma_comentarios`, `cronograma_auditoria`, `notificacoes` com triggers de recálculo de datas, auditoria e desabilitação de RLS
- **Painel `cronograma`** com permissões: `ver`, `criar_projeto`, `editar`, `excluir`, `exportar`, `comentar`, `gerar_link_publico`
- Rota `/cronograma` com Gantt interativo, drag-and-drop, edição inline, autosave, zoom semana/mês, legenda de grupos por cor, metric cards, excluir com confirmação, exportação XLSX/CSV/PDF e importação de planilha
- Rota `/cronograma/publico/$token` para modo apresentação (link público externo, somente leitura, sem login)
- Drawer lateral com abas Detalhes, Comentários (com @menção e autocomplete) e Histórico (audit log)
- Modelo genérico com `campo_agrupamento_label` configurável por projeto, permitindo reuso para qualquer tipo de cronograma
- Sistema de notificações (`notificacoes`) com menções e responsável
- Duplicar projeto, toggle público/privado, visibilidade somente leitura para cronogramas de outros usuários

### [2026-07-23] — Estoque: botão Revisar para unificar códigos duplicados

- Botão "Revisar" que unifica materiais com códigos SAP duplicados usando sufixo `_A` / `_B`, permitindo merge de saldos e movimentações
- Select nativo nos formulários substituindo Radix Select para melhor compatibilidade

### [2026-07-23] — OI: correção da chave do painel no hub

- **Commit:** `f1c5596`
- Card OI no hub não aparecia — corrigido: a chave do painel é `gerador_oi` (não `oi`)

### [2026-07-23] — OI: geração de DOCX idêntico ao modelo LAGOS

**Commits:** `2bc69c7`, `13d0bdd`, `5ae2b63`, `11110ba`, `a2d5673`

- Geração de DOCX visualmente idêntico ao modelo oficial RF-OI-B1-003-2026-FEV-2026-LAGOS
- Margens, cabeçalho/rodapé, capa com 7 colunas, checkboxes, sumário (TOC real), fotos 4253×4253, assinatura
- Fonte Arial, numeração Título 2, proporção de fotos, campos vazios, tabela capa 15 linhas

### [2026-07-23] — Gerador de OI / Relatório Fotográfico

**Commits:** `73d9468`, `4456c03`, `8cf196b`, `94a4f10`, `d4574a8`

- Página `/oi` com formulário completo para gerar Ordem de Intervenção / Relatório Fotográfico
- **5 passos integrados:** dados da OI (número, bloco, período, responsáveis), dados complementares (superintendência, município, tipo, objetivo), intervenções com ativos/endereço, fotos com evento/descrição, geração do documento
- Geração de `.docx` no navegador via `docx` + `file-saver`, sem backend
- Tabelas: `ordens_intervencao`, `oi_intervencoes`, `oi_fotos` — migration `00038`
- Bucket `oi-fotos` para upload de imagens (JPEG, PNG, WebP, 20MB)
- Painel `gerador_oi` com permissões: `criar`, `editar`, `excluir`, `gerar_docx`
- Atribuído a Administrador (todas) e Supervisor (criar, editar, gerar — sem excluir)

### [2026-07-23] — Testes: tabela no banco e importação do Forms

**Commits:** `6988410`, `3fb6777`

- Criação da tabela `testes_afericoes` no banco com todos os campos do formulário — migration `00037`
- Botão "Importar Planilha" que lê XLSX do Google Forms e envia para o Supabase
- Tratamento de erro SSR para `importPreview` nulo

### [2026-07-22] — Compras: valor e data prevista

**Commits:**

- Migração `00034_compras_data_prevista.sql`: coluna `data_prevista` (DATE) em `compras`
- Migração `00035_add_valor_compras.sql`: colunas `valor_unitario` e `valor_total` (NUMERIC) em `compras`
- Migração `00036_permissao_gerenciar_fila.sql`: permissão `estoque.gerenciar_fila` para Gerenciar Fila de RC (Administrador, Comprador, Almoxarife, Gerente)

### [2026-07-14] — Manuais: filtro PDF fixo por permissão

- Usuários com permissão `manuais.ver_com_pdf` veem **apenas** manuais com PDF (comportamento fixo, sem toggle)
- **Badge "APENAS COM PDF"** no cabeçalho quando o filtro está ativo
- `clearPermissoesCache()` chamado no mount para evitar cache stale
- Migration `00033` concede a permissão a Administrador, Supervisor e Técnico

### [2026-07-14] — Manuais: Inversores unificado, exclusão de categorias, filtro por fabricante

- **Manuais**: Unifica "Inversores WEG" + "Inversores Danfoss" em categoria única **"Inversores"** com filtro por fabricante (WEG, DANFOSS, SIEMENS, POWERELETRONICS) — migration `00032`
- **Manuais**: Adicionados dezenas de novos manuais (CFW100, CFW700, SINAMICS G120/G110/S120/V20, MICROMASTER, SD700/500/800, FR500/700, etc.)
- **Manuais**: Modo edição agora mostra **"X" ao lado do nome** de cada aba para **excluir categoria** com modal de confirmação (exclui manuais + PDFs em cascata)
- **Manuais**: **Filtro por fabricante** — pills de fabricantes logo abaixo das abas; em modo edição, botão **"Editar filtros"** abre modal para adicionar/remover fabricantes
- **Manuais**: Cada card exibe badge do fabricante; na edição inline, select para alterar fabricante com opção "+ Novo fabricante"
- **Manuais**: Histórico agora registra `removeu_categoria`

### [2026-07-14] — Manuais: Inversores, "Ver manuais", criação de cards, Backlog: responsável editável

- **Manuais**: Novas categorias "Inversores WEG" e "Inversores Danfoss" com manuais (CFW500, CFW300, CFW900, CFW11, FC-51, FC-360, FC-302, VLT AQUA Drive) — migration `00031`
- **Manuais**: Botão "Novo Manual" no modo edição para criar cards diretamente na categoria ativa
- **Manuais**: Cards com múltiplos PDFs exibem botão "Ver manuais (N)" que abre modal centralizado com a lista de PDFs — UX focada em navegação
- **Backlog BI**: Coluna "Resp." agora é editável inline (exatamente como "Equipe"), com `<select>` de todas as opções, persistência em `localStorage` + Supabase (`responsabilidade_overrides`), e botão ↺ para reverter — migration `00030`
- **Backlog BI**: Exportação CSV do backlog e das rotas agora usa separador `;` (semicolongo) em vez de vírgula, adequado para o locale brasileiro

### [2026-07-14] — Correção do módulo Manuais Técnicos

**Commits:** `469ad7f`

Correções aplicadas no módulo de manuais:

- **Link "Avaliar" quebrado:** `to="/manuais/avaliacao"` → `to="/manuais-avaliacao"` (rota correta com hífen)
- **Sanitização de nome de arquivo no upload:** Remove espaços e caracteres especiais dos nomes de arquivo enviados ao Supabase Storage, evitando erro `Invalid key`
- **Preservação de comentário na rejeição:** `handleRejeitar` agora anexa o motivo da rejeição como `[Motivo da rejeição: ...]` ao invés de sobrescrever o `comentario` original da sugestão, e adiciona tratamento de erro na query
- **Migration `00024_manuais_rls_bucket.sql`:** Desabilita RLS nas tabelas `manuais_categorias`, `manuais` e `sugestoes` (seguindo padrão do projeto), e cria bucket público `manuais` no storage (PDF, 50MB)

### [2026-07-13] — Criação do módulo Manuais Técnicos e Tema Dark/Light

**Commits:** `55fd342`, `521b643`, `1dd970a`

- Página `/manuais` com abas dinâmicas por categoria (NRs etc.), busca por título, cards com cores específicas por NR, upload inline de PDF para administradores, e formulário de sugestão (PDF ou texto)
- Página `/manuais-avaliacao` para administradores aprovarem/rejeitarem sugestões com atribuição a categoria existente ou nova
- Tabelas: `manuais_categorias` (abas), `manuais` (documentos com `arquivo_url`), `sugestoes` (submissões de usuários)
- Painel `manuais` com permissão `manuais.editar_arquivo` (Administrador e Supervisor)
- **Tema dark/light:** `TemaProvider` com persistência em `localStorage` + coluna `tema_preferido` em `profiles`, e botão `ThemeToggle` no cabeçalho
- Card "Equipes Hoje" adicionado na escala
- Fix: guard contra `localStorage` undefined no SSR

### [2026-07-13] — Ajuste de Estoque: valor absoluto

**Commit:** `61516e8`

Corrige o trigger `atualizar_saldo_material` para que o tipo `AJUSTE` defina `saldo_atual = quantidade` (valor absoluto) em vez de tratar como delta. Anteriormente, o ajuste somava/subtraía, o que estava incorreto — ajuste deve definir o saldo exato.

### [2026-07-13] — Estoque: KPIs clicáveis, busca em compras, fila de RC

**Commits:** `c1b9f62`, `8534db7`, `5371ae0`

- KPIs (Sem Estoque, Baixo, Atenção, Parados, Crítico) agora filtram a tabela de materiais ao clicar
- Compras: busca por nome/descrição, detalhes em popup, atualização sem recarregar
- Fila de RC: esteira de status (Pendente → Visto → Em Processo → Aguardando Retorno → Finalizado), formulário Adicionar fila com `cod_sap` opcional, permissão `gerenciar_fila`

### [2026-07-13] — Escala de Trabalho: especialidade, export XLSX, KPI expandido

**Commits:** `15ae125`, `773210f`, `f7d19d8`

- Coluna `especialidade` em `colaboradores_escala`
- Export XLSX formatado com data
- KPI expandido (total, comercial, plantão, técnicos)
- Redesign: header corporativo gradiente com logo, 1 semana (seg-dom), tela cheia
- Drag-and-drop, add/delete técnico, dropdowns editáveis, aba Férias, ordenação

### [2026-07-13] — Escala de Trabalho: criação e importação de planilha

**Commits:** `74c2ca4`, `85d5e6c`, `08a66ad`, `65565cd`, `101f633`, `674f617`

- Criação do módulo de Escala com grid semanal, importação Excel e geração automática de dias
- Tabelas: `colaboradores_escala` (equipe, horário, escala, função) e `escala_dias` (data, status TRABALHA/FOLGA, `editado_manual`)
- Fórmula de cálculo automático: COMERCIAL = dias úteis, PLANTÃO 1/2 = ciclo 2x2
- RLS desabilitado nas tabelas de escala e permissões

### [2026-07-13] — Permissões Granulares

**Commit:** `e036776`

Criação do sistema de permissões granulares:

- Tabela `permissions` (`key`, `label`, `panel_key`, `is_generic`)
- Tabela `cargo_panel_permissions` (relacionamento cargo → permissão)
- UI no admin para gerenciar permissões por cargo com checkbox tree
- Cache em memória (`getPermissoesCargo`) com `clearPermissoesCache()`
- Permissões específicas do estoque: `ver`, `registrar_entrada`, `registrar_saida`, `registrar_ajuste`, `solicitar_compra`, `gerenciar_compras`, `editar_config_material`, `exportar`, `importar`, `cadastrar_material`, `gerenciar_categorias`, `gerenciar_fila`

### [2026-07-13] — Compras: reestruturação completa, importação e trigger

**Commits:** `1479d6d`, `d7e1bcb`, `9a34537`, `b2ab7fe`, `b950fd8`, `18d0757`, `75b368a`, `612b01b`, `676f6ab`, `918f669`, `b950fd8`, `8534db7`

- Migração `00009_compras_reestruturada.sql`: drop e recria da tabela `compras` com estrutura baseada na planilha oficial "COMPRAS 22.06"
- Campos: `requisicao`, `item_rc`, `cod_sap`, `descricao_material`, `qtde_rc`, `pedido`, `fornecedor`, `status_geral`, `chegou`, `foi_retirado`, `afeta_saldo`, etc.
- Trigger `trg_compras_entrada_por_retirada`: entrada automática no estoque quando `foi_retirado` vira `true`
- Trigger `trg_compras_updated_at`: atualiza `atualizado_em` automaticamente
- Importação de 179 registros históricos (migration `00010`)
- Cadastro de 158 materiais da planilha de compras (migration `00011`)
- Popup de furo de estoque (saldo negativo)
- Sugestões de destino/solicitante baseadas em saídas anteriores

### [2026-07-13] — Categorias dinâmicas e cargo Almoxarife

**Commits:** `3c8217c`, `30e522f`, `9ff5e9c`, `258ef65`, `74cf84c`, `7006f32`

- Tabela `categorias` com 6 categorias (Elétrico, Mecânico, Hidráulico, EPI, Consumível, Outros)
- Migração do campo `categoria` (texto) para `categoria_id` (FK)
- Criação dos cargos Técnico, Almoxarife, Supervisor com respectivos painéis
- Ranking de Destinos com filtros Métrica × Categoria
- Dropdown de `motivo_ajuste` no formulário
- Separação de ajustes do ranking de destinos
- Correção do trigger `recalcular_saldo_material` para preservar saldo ao invés de zerar

### [2026-07-23] — Módulo Ficha da Elevatória

**Migration:** `00040_ficha_elevatoria.sql`

- Tabelas: `elevatorias`, `elevatoria_equipamento`, `elevatoria_eletrica`, `elevatoria_hidraulica`, `elevatoria_area_influencia`, `elevatoria_rolamentos_selos`, `elevatoria_implantacao`, `elevatoria_implantacao_etapas`, `elevatoria_dados_mestres_auditoria`, `elevatoria_campo_na`
- RLS desabilitado (padrão do projeto)
- Triggers de `atualizado_em` e auditoria (`AFTER UPDATE`) em todas as tabelas de dados mestres
- Permissões: `ficha_elevatoria.ver`, `ficha_elevatoria.editar`, `ficha_elevatoria.dados_mestres.ver`, `ficha_elevatoria.dados_mestres.editar`, `ficha_elevatoria.exportar`, `ficha_elevatoria.importar`
- Rotas: `/elevatorias` (listagem) e `/elevatorias/:id` (ficha individual)
- Cards de métricas no topo (total, completude média, críticas, em implantação)
- Indicador de completude do cadastro por elevatória (badge verde/amarelo/vermelho)
- Abas de dados mestres: Equipamento, Elétrica & Automação, Hidráulica, Rolamentos & Selos, Área de Influência, Implantação e Histórico
- Edição inline com autosave e indicador discreto de salvamento
- Toggle "não aplicável" (N/A) por campo
- Importação de planilha Excel
- Mapa OpenStreetMap com coordenadas da elevatória
- Card no Hub condicionado à permissão `ficha_elevatoria`

### [2026-07-13] — Várias melhorias no estoque

**Commits:** `5a68d9b` até `9b6dd66`

- Abas no estoque (Estoque, Compras, Registros)
- Importação/exportação CSV
- Auto-complete na busca de materiais
- Semáforo de status (estoque normal, baixo, crítico, sem estoque)
- Tooltips em descrição e fornecedor
- Edição inline de colunas de compras

### [2026-07-13] — Módulo de Estoque: criação inicial

**Commits:** `5a20779` a `7f09bf8`

- Criação das tabelas `materiais`, `movimentacoes`, `compras`
- Trigger `atualizar_saldo_material` (AFTER INSERT)
- Trigger `recalcular_saldo_material` (AFTER DELETE)
- Trigger `criar_entrada_por_compra` (entrada automática quando compra → "Entregue")
- RLS desabilitado nas tabelas
- Migrações posteriores adicionaram colunas `origem`, `afeta_saldo`, `divergencia_cod_sap`, `aba_origem`
- Aprimoramento da trigger para respeitar `afeta_saldo`

### [Data indefinida] — Criação do sistema de autenticação e base

**Commits iniciais**

- Tabelas `cargos`, `paineis`, `cargo_paineis`, `profiles` com status (pendente/ativo/bloqueado)
- Autenticação por email/senha via Supabase Auth
- Criação automática de profile no primeiro login
- Cargos: Administrador (acesso total)
- RLS desabilitado nas tabelas de autenticação
- Tabela `equipe_overrides` para overrides de equipe por ordem de manutenção

---

## 6. Sistema de Autenticação e Permissões

### Fluxo de login

1. Usuário faz login com email/senha via `supabase.auth.signInWithPassword`
2. `AuthProvider` escuta `onAuthStateChange` e carrega o profile da tabela `profiles` (com join em `cargos`)
3. Se não existir profile para o usuário autenticado, é criado automaticamente via `upsert` com `status = 'pendente''
4. O status do profile determina a rota:
   - `pendente` → `/pending` (aguardando aprovação do admin)
   - `bloqueado` → `/bloqueado`
   - `ativo` → acesso normal ao hub

### Sistema de painéis e permissões

- Cada módulo é um **painel** (tabela `paineis`)
- Cargos têm painéis atribuídos (tabela `cargo_paineis`)
- Cada painel pode ter **permissões específicas** (tabela `permissions`) atribuídas a cargos via `cargo_panel_permissions`
- O frontend carrega as permissões do cargo logado com `getPermissoesCargo(cargoId)` e as armazena em cache
- Funções `temPermissao(perms, panelKey, permissionKey)` e `temPainel(perms, panelKey)` controlam visibilidade de UI

---

## 7. Tema Dark/Light

Implementado via `TemaProvider` em `src/lib/tema.tsx`:

- Preferência salva em `localStorage` (chave `tema_preferido`) e no banco (coluna `tema_preferido` em `profiles`)
- A classe `dark` é aplicada/removida no `<html>` element
- Tema carregado do banco no login do usuário
- Botão `ThemeToggle` (lua/sol) disponível em todas as páginas via root layout

---

## 8. Manutenção

### Rodar lint

```bash
npm run lint
```

### Rodar dev

```bash
npm run dev
```

### Aplicar migrations

As migrations SQL estão em `supabase/migrations/` e devem ser executadas no **SQL Editor do Supabase** na ordem numérica. Após aplicar migrations, recarregar o schema com `NOTIFY pgrst, 'reload schema';`.
