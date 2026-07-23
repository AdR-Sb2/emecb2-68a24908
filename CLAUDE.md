# EMEC BAIXADA 2 - Contexto para Agentes de IA

## Projeto

Sistema web interno da equipe de Eletromecanica da Baixada 2 (Aguas do Rio). React 19 + TypeScript + TanStack Start (SSR) + Supabase (PostgreSQL).

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
    supabase.ts    # Cliente Supabase
    permissoes.ts  # getPermissoesCargo(), temPermissao(), temPainel()
    tema.tsx       # TemaProvider (dark/light mode)
    utils.ts       # cn() helper
    cronograma-types.ts  # Tipos do modulo Cronograma
  components/
    ui/            # 46 componentes shadcn/ui (Radix)
    backlog-map.tsx
  styles.css       # Tailwind v4 + design tokens
  routeTree.gen.ts # Auto-gerado - NAO editar manualmente

supabase/
  migrations/
    00001_auth_tables.sql
    00002_auth_tables_rls.sql
    ...
    00038_gerador_oi.sql
    00039_cronograma_instalacao.sql
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
- Blob + URL.createObjectURL para CSV ("\uFEFF" + csv, separador ";")
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
