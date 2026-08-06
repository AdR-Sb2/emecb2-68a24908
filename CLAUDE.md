# EMEC BAIXADA 2 - Contexto para Agentes de IA

## Projeto

Sistema web interno da equipe de Eletromecanica da Baixada 2 (Aguas do Rio). React 19 + TypeScript + TanStack Start (SSR) + Supabase (PostgreSQL).

## Git / Deploy (IMPORTANTE)

- `origin` = HiBigGuy/emecb2-68a24908 (nosso). `upstream` = AdR-Sb2/emecb2-68a24908 (conectado ao Lovable).
- O deploy e gerado pelo Lovable a partir de `upstream/main`. Alteracoes no `main` local NAO vao para o deploy sozinhas: criar PR para `upstream` (base `main`) e pedir merge ao usuario.
- NAO reescrever historico publicado (force push / rebase / amend / squash de commits ja enviados) — o Lovable sincroniza pelo historico.
- Token GitHub com permissao limitada no repo AdR-Sb2: consegue criar/atualizar PRs, mas NAO mergear, fechar nem comentar (GraphQL "Resource not accessible by integration"). Merge/close ficam com o usuario.
- Se um PR de sync (merge do `main` inteiro) der conflito, portar os itens especificos: branch novo a partir de `upstream/main` + `git cherry-pick <commit>`. Feito assim para justificativa/nav (#36) e fixes de estoque (#38).
- PRs/commits no `upstream/main` em que se referem: #34 (supabase projeto antigo), #36 (justificativa + nav voltar-home), #38 (correcoes de estoque/compras).

## Supabase

- Cliente em `src/lib/supabase.ts`. Desde o fix (commits `02eb59d`/`13311f2`), o app FORCA o projeto com dados: `byxmnmebvqdxpzcuutak.supabase.co` (anon key `sb_publishable_...`). Se o ambiente apontar para o projeto vazio (`ncwqawuphmweiufkswjg`), o codigo volta para o projeto com dados. NAO reverter para o projeto vazio nem refatorar de forma que remova esse fallback.
- RLS permanece DESABILITADO em todas as tabelas; controle via aplicacao (permissoes de cargo).
- Executar migrations manualmente no SQL Editor do Supabase + `NOTIFY pgrst`.

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 8 |
| Roteamento | TanStack Router v1 (file-based em src/routes/) |
| SSR | TanStack Start + Nitro (Cloudflare) |
| Query | TanStack Query |
| Estilizacao | Tailwind CSS v4 + tw-animate-css |
| Componentes | shadcn/ui (Radix UI) |
| Graficos | Recharts |
| Mapas | Leaflet + react-leaflet |
| Icones | Lucide React |
| Formularios | React Hook Form + Zod |
| Planilhas | ExcelJS (export) + xlsx (import) |
| Word | docx (gerar .docx) |
| Toasts | Sonner |
| Banco | PostgreSQL via Supabase |
| Autenticacao | Supabase Auth (email/senha) |
| Storage | Supabase Storage |

## Estrutura de diretorios

```
src/
  routes/          # Rotas TanStack Router (file-based)
    __root.tsx     # Layout root (AuthProvider, TemaProvider, Toaster)
    index.tsx      # / - Hub com grid de cards
    cronograma.tsx # /cronograma - Cronograma de Instalacao
    cronograma/
      publico/
        $token.tsx # /cronograma/publico/:token - Modo apresentacao
    estoque.tsx    # /estoque - Estoque e Compras
    escala.tsx     # /escala - Escala de Trabalho
    oi.tsx         # /oi - Gerador de OI
    backlog.tsx    # /backlog - Backlog BI
    dashboard.tsx  # /dashboard - Dashboard Automacao
    elevatorias.tsx        # /elevatorias - Elevadores
    elevatorias_.$id.tsx   # /elevatorias/:id - Detalhe do elevador
    analitico.tsx  # /analitico - Analitico
    manuais-avaliacao.tsx  # /manuais-avaliacao
    registros.tsx  # /registros - Registros
    testes.tsx     # /testes - Testes e Afericoes
    relatorio.tsx  # /relatorio - Relatorios Tecnicos
    manuais.tsx    # /manuais - Manuais Tecnicos
    admin.tsx      # /admin - Painel Administrativo
    login.tsx      # /login
    register.tsx   # /register
    pending.tsx    # /pending
    bloqueado.tsx  # /bloqueado
  lib/
    auth.tsx       # AuthProvider, useAuth, Profile type
    supabase.ts    # Cliente Supabase (forca projeto com dados)
    permissoes.ts  # getPermissoesCargo(), temPermissao(), temPainel()
    tema.tsx       # TemaProvider (dark/light mode)
    utils.ts       # cn() helper
    cronograma-types.ts  # Tipos do modulo Cronograma
    estoque-types.ts     # Tipos do modulo Estoque
    estoque-permissoes.ts# Permissoes do modulo Estoque
  components/
    ui/            # 46 componentes shadcn/ui (Radix)
    backlog-map.tsx
    nav-voltar-home.tsx       # Botao voltar para o Hub
    analitico-manutencao.tsx  # Lista de manutencao do Analitico
  styles.css       # Tailwind v4 + design tokens
  routeTree.gen.ts # Auto-gerado - NAO editar manualmente

supabase/
  migrations/
    00001_auth_tables.sql
    00002_auth_tables_rls.sql
    ...
    00038_gerador_oi.sql
    00039_cronograma_instalacao.sql
    ...
    00054_analitico_justificativa_sem_preventiva.sql
    00055_backlog_observacoes.sql
    00056_backlog_obs_unica.sql
```

## Convencoes

### RLS
RLS deve permanecer DESABILITADO em todas as tabelas. Controle de acesso e via aplicacao (frontend + permissoes do cargo).

### Permissoes
- Cada modulo tem um painel (tabela `paineis`)
- Cargos tem paineis atribuidos (`cargo_paineis`)
- Permissoes especificas (`permissions`) atribuidas via `cargo_panel_permissions`
- `getPermissoesCargo(cargoId)` carrega permissoes em cache
- `temPermissao(perms, panelKey, permKey)` e `temPainel(perms, panelKey)` controlam UI
- Para adicionar modulo: migration com INSERT INTO paineis + permissions + cargo_paineis + cargo_panel_permissions

### Componentes
- shadcn/ui New York style (Radix + Tailwind + cn())
- Import via @/components/ui/nome-do-componente

### CSS
- Tema dark: classe `dark` no <html>
- Temas persistem em localStorage + coluna tema_preferido em profiles

### Formularios
- Controlled components com useState (NAO React Hook Form)
- Input classes padrao: inputCls, labelCls, cardCls (ver oi.tsx para referencia)

### Drag-and-drop
- Nativo HTML5 (NAO dnd-kit)
- Pattern: GripVertical + onDragStart/onDragOver/onDrop com indices

### Autosave
- Debounce setTimeout ~500ms + indicador salvando/salvo

### Exports
- ExcelJS (import dinamico: await import("exceljs")) para XLSX
- xlsx (import) para leitura de planilhas
- Blob + URL.createObjectURL para CSV (BOM "\uFEFF" + csv). No estoque o separador e "," e o import usa o parser robusto `parseCSV` (remove BOM, trata CRLF do Excel e campos com aspas) + `slugifyChave`/`normalizarLinha` com aliases de cabecalhos (`ALIASES_IMPORT_MATERIAIS` / `ALIASES_IMPORT_COMPRAS`).
- docx + Packer + file-saver para .docx
- window.print() para PDF (CSS @media print)

### Notificacoes
- Tabela `notificacoes` (migration 00039)
- Campos: usuario_id, tipo, referencia_tipo, referencia_id, mensagem, lida

## Modulos

| Modulo | Rota | Descricao |
|---|---|---|
| Hub | / | Grid de cards com acesso conforme permissao |
| Dashboard Automacao | /dashboard | KPIs elevatori
| Dashboard Automacao | /dashboard | KPIs de elevatoriárias, sensores CLP/PCP |
| Testes e Afericoes | /testes | Ensaios elétricos e hidráulicos |
| Backlog BI | /backlog | OS do Field/SAP com SLA, mapa Leaflet |
| Estoque / Almoxarifado | /estoque | Inventário, movimentações, compras |
| Escala de Trabalho | /escala | Escala semanal, importação/exportação XLSX |
| Manuais Técnicos | /manuais | Biblioteca de manuais com upload de PDF |
| Gerador de OI | /oi | Ordem de Intervenção / Relatório Fotográfico |
| Cronograma de Instalação | /cronograma | Planejamento com Gantt, drag-and-drop, autosave |
| Relatórios | /relatorio | Relatórios técnicos e de planta |
| Painel Administrativo | /admin | Gestão de usuários, cargos e permissões |

## Modulo Estoque / Compras (src/routes/estoque.tsx) - notas

- Import CSV de compras ("Atualizar Pedidos") usa `requisicao` + `item_rc` como chave de upsert (`onConflict: "requisicao,item_rc"`); colunas podem variar em nome/acentuacao (aliases). Ha botao "Baixar modelo do CSV" (`baixarModeloCompras`). O toast reporta linhas ignoradas.
- `AutoCompleteMaterial`: ao focar, limpa a busca; digitar o codigo SAP completo resolve no Enter ou ao sair do campo; dialogs de Entrada/Saida/Ajuste exigem material existente (valido = selected !== null).
- Botoes Entrada/Saida/Ajuste do topo resetam `materialSelecionado` (nao herdam o da linha).
- Renomear material (Novo Material com codigo SAP existente = upsert) tambem atualiza `compras.descricao_material` onde `rc_em_fila = true`.
- Dialog "Solicitar RC" (carrinho na linha do material) mostra historico de compras do codigo e avisa se ja esta em RC EM FILA. UI revisada: header com icone do carrinho em text-orange-500; saldo destaca com Badge variant="destructive" quando saldo_atual < estoque_minimo; historico como lista compacta com Badge semantico (amber "Em fila" / slate "Fora da fila"); secoes separadas por `<Separator>` do shadcn (sem cards empilhados); input de quantidade com foco laranja e hint "Mínimo recomendado: N" quando qtd digitada < deficit (estoque_minimo - saldo_atual); CTA bg-orange-500 e Cancelar com border-input + text-foreground.

## Modulo Backlog (src/routes/backlog.tsx) - notas

- Coluna "Observação" (input editavel direto na linha, ambas tabelas) salva observação única por O.S. na tabela `backlog_obs_unica` (migration 00056): om (PK), obs, atualizado_em. Autosave com debounce ~700ms + flush no blur (`atualizarObsUnica`/`flushObsUnica`/`salvarObsUnica`), carregada em lote por chunks de 200 (guarda em `obsUnica` + `obsUnicaLoaded` ref).
- Coluna "Comentários" abre dialog com comentarios multiplos por O.S. (tabela `backlog_observacoes`, migration 00055): id, om, texto, autor_id (FK profiles), criado_em. Consulta com join `profiles:autor_id(nome_completo)`.
- Carregamento em lote das observações/comentarios das O.S. visiveis (chunks de 200 com `.in("om", ...)`) e badge laranja com a contagem no botao. Insercao usa `.insert(...).select("*, profiles:autor_id(nome_completo)").single()` e adiciona ao topo da lista.
- O dialog de comentarios segue o padrao do modulo Registros (`ListaRegistros.tsx`): textarea + botao "Adicionar" (bg-[#0b3a73]), Enter adiciona (Shift+Enter quebra linha), lista com autor + data.

## Modulo Registros (src/components/registros/ListaRegistros.tsx) - notas de performance

- Aba "Atendimentos" e lazy: so carrega ao abrir a aba (`carregarAtendimentos` + `atendimentosCarregados`/`carregandoAtendimentos`). Enquanto nao carregado, badge do tab nao mostra contagem e o conteudo mostra spinner "Carregando atendimentos...".
- Carga inicial paralela (`Promise.all`): informacoes + elevatorias juntas. Quando `elevatoriaId != null` (ficha da elevatoria), busca so a elevatoria via `.eq("id", elevNum)` em vez de todas; o filtro por planta da query de atendimentos usa o state `elevatorias` (ja carregado quando a aba fica visivel).
- `buscarAtendimentos` usa `ATEND_COLUNAS` (colunas minimas, sem `profiles` join) em vez de `select("*")`; paginacao com `range()` em lotes de `TAMANHO_PAGINA` (1000). Tipo `AtendQuery` e estrutural (`{ range(from, to): unknown }`) para aceitar o builder com colunas especificas.
- Velocidade da aba Atendimentos: `buscarAtendimentos(query, total)` recebe o total exato (via `supabase.from(...).select("*", { count: "exact", head: true })` com os mesmos filtros de planta/elevatoria — o metodo `.count()` nao existe nessa versao do supabase-js) e busca as paginas em lotes paralelos de `CONCORRENCIA = 8` via `Promise.all`, em vez de ~33 requests sequenciais.
- UI do card de atendimento (apresentacao apenas): numero da OS em botao com copiar-ao-clicar (check verde temporario, `ordemCopiada`); badge de natureza e a unica solida/semantica; badge de prioridade so aparece se nao duplicar a natureza (mesmo texto ignorado); status sempre slate outline; linha de metadados com icones (Calendar data, Hash nota/PL, Building2 base, MapPin LI, User criado por) em `text-xs text-muted-foreground`; descricao com `line-clamp-2`; padding do card `px-3 py-2.5`.

## Validacao (antes de commitar)

- `npx tsc --noEmit` — erros PRE-EXISTENTES esperados (nao corrigir fora de escopo): `src/routes/elevatorias.tsx` linhas ~963 e ~1090 (tipo de Link de rota).
- `npx eslint <arquivo>` — ha ~1174 erros pre-existentes de prettier/any no codigo do Lovable; nao "corrigir" fora do escopo. No estoque.tsx os 4 erros pre-existentes sao: `any` (~linha 1950) e prettier (~4842/4868/4915).
- `npx vite build` — deve passar; regenera `src/routeTree.gen.ts` (reverter antes de commitar).
- Nao adicionar erros novos de lint/tsc nas alteracoes.

## Como criar um novo modulo

1. Criar migration em supabase/migrations/NNNNN_nome.sql com:
   - CREATE TABLE (RLS desabilitado)
   - Triggers (se aplicavel)
   - INSERT INTO paineis (chave, nome_exibicao, descricao, icone)
   - INSERT INTO permissions (key, label, panel_key, is_generic)
   - INSERT INTO cargo_paineis (atribuir painel aos cargos)
   - INSERT INTO cargo_panel_permissions (atribuir permissoes)
2. Criar rota em src/routes/modulo.tsx (createFileRoute)
3. Adicionar card no Hub (src/routes/index.tsx):
   - Import do icone Lucide
   - Adicionar cor em CARD_COLORS
   - Adicionar cor em getCardColor()
   - Adicionar shouldShow* + hasPanel()
   - Adicionar CardLink no grid
4. Executar migration manualmente no SQL Editor do Supabase
5. Rodar NOTIFY pgrst, reload schema apos migration
