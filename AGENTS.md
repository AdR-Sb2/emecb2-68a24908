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

### Lint & typecheck
- `npx eslint src/routes/cronograma.tsx`
- `npx tsc --noEmit`
- Build (`vite build`) may fail locally due to missing native rolldown — rely on Lovable deployment for verification.
