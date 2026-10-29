-- Aplicar na base efetivamente usada pelo app. Não altera RLS nem permissões.
ALTER TABLE public.compras
  ADD COLUMN IF NOT EXISTS data_criacao_origem text DEFAULT 'importacao'
    CHECK (data_criacao_origem IN ('importacao', 'manual')),
  ADD COLUMN IF NOT EXISTS data_criacao_editada_por uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS data_criacao_editada_por_nome text,
  ADD COLUMN IF NOT EXISTS data_criacao_editada_em timestamptz;
NOTIFY pgrst, 'reload schema';