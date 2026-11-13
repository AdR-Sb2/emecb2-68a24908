<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

## Project: EMEC Baixada 2

Stack: React + TanStack Router (file-based routing) + Supabase + Tailwind + shadcn/ui.

### Routing
- Routes are in `src/routes/`. The file `src/routeTree.gen.ts` is **auto-generated** — never edit it manually.
- Nested routes use layout wrappers (e.g. `CronogramaLayout` in `cronograma.tsx` wraps child routes).
- Public routes bypass auth by checking `location.pathname` in the layout.

### Supabase
- Client config: `src/lib/supabase.ts`
- Auth provider: `src/lib/auth.tsx` (wraps the app in root layout)
- RLS is enabled on all tables. Deletes use `.delete().eq("id", id)`.

### Key patterns
- Purchase RC date editing uses a shared cell and pure calendar-date helpers; manual-origin dates are omitted from import upserts to preserve user corrections.
- SAP imports read native spreadsheet numbers and keep CSV numeric text raw until the dedicated numeric parser; this prevents locale formatting from truncating amounts.
- Inline editing with debounced saves (`src/lib/debounce.ts`)
- Toast notifications via `sonner`
- Dialogs via `src/components/ui/dialog.tsx` (shadcn)
- ExcelJS for XLSX exports (dynamic import: `await import("exceljs")`)
- Canvas-based Gantt rendering for PDF export

### Cronograma module
- Main file: `src/routes/cronograma.tsx` (~2600 lines)
- Types: `src/lib/cronograma-types.ts`
- Public view: `src/routes/cronograma/publico/$token.tsx`
- DB migrations: `supabase/migrations/`
- Status colors: `nao_iniciado=#94a3b8`, `em_andamento=#3b82f6`, `concluido=#22c55e`, `atrasado=#ef4444`
- Year colors: 2026=`#378ADD`, 2027=`#E24B4A`, 2028=`#639922`, 2029=`#BA7517`

### Testes & Aferições (CEDAE x AdR)
- Single source of truth: table `testes_afericoes`. Classification column `tipo_teste` (`CEDAE` | `ADR`); link column `elevatoria_codigo` (normalized plant code).
- Pure logic (tested): `src/lib/testes-tipos.ts` — `normalizarCodigoElevatoria`, `validarLimiteCedae`, 24-column model, payload builders.
- UI: `src/components/testes/SecaoTestes.tsx` (Registros of the Ficha) and `AdicionarTesteDialog.tsx` (modal "Testes CEDAE" / "Testes AdR"). Dashboard `/testes` filters by `tipo_teste` (default `ADR`; CEDAE only with explicit filter).
- Rule: max **2 CEDAE per elevatoria**, enforced in the DB by trigger `trg_validar_limite_cedae_testes` (migration `00099_testes_tipo_teste.sql`) — also in import.
- Cross-component refresh uses the browser event `testes-atualizados` (dispatched after import/manual save; `SecaoTestes` re-queries).

### Assumptions (Testes CEDAE/AdR)
- The 24-column import sheet has no classification field, so **imports always create `ADR`**; the DB trigger still blocks CEDAE if one is ever provided via an optional column.
- Elevatorias are matched by **normalized plant code** (e.g. `PL-RJB-EAT0053`), never by name (origin names are inconsistent: `EAT`/`EEAT`, extra spaces, trailing name).
- Manual test rows use `Date.now()` as `id` (PK is BIGINT with no identity/sequence).
- CEDAE tests live in the same table but are excluded from dashboard KPIs/charts unless the `TIPO DE TESTE` filter is set to CEDAE.
- Automated tests use fictitious fixtures only (`src/lib/testes-tipos.test.ts`); no real collaborator data or credentials are logged.

### Lint & typecheck
- `npx eslint src/routes/cronograma.tsx`
- `npx tsc --noEmit`
- `npx vitest run`
- Build (`vite build`) may fail locally due to missing native rolldown — rely on Lovable deployment for verification.
