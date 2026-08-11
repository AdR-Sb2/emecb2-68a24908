-- ============================================================
-- Migration: Fotos em registros de informação da elevatória
-- ============================================================

-- 1. Tabela: fotos vinculadas a um registro de informação
CREATE TABLE IF NOT EXISTS registros_informacao_fotos (
  id BIGSERIAL PRIMARY KEY,
  registro_id BIGINT NOT NULL REFERENCES registros_informacao(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  autor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_registros_informacao_fotos_registro_id
  ON registros_informacao_fotos(registro_id);

-- 2. Desabilitar RLS (mesmo padrão das outras tabelas do projeto)
ALTER TABLE registros_informacao_fotos DISABLE ROW LEVEL SECURITY;

-- 3. Bucket 'registros' passa a aceitar também imagens (fotos dos registros)
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
WHERE id = 'registros'
  AND allowed_mime_types IS NOT DISTINCT FROM ARRAY['application/pdf'];

-- As políticas públicas do bucket 'registros' já cobrem SELECT/INSERT/UPDATE/DELETE.
