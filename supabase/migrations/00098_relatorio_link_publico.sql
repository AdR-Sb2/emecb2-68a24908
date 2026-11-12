-- ============================================================
-- Migration: Relatórios — link público
-- ============================================================
-- IMPORTANTE: esta migration NÃO é aplicada automaticamente.
-- Cole o conteúdo abaixo no SQL Editor do Supabase (projeto do app)
-- e clique em "Run". Tudo aqui é idempotente (pode rodar 2x).
--
-- field_config.relatorio_link_publico_token: token que libera a
-- rota pública /relatorio/publico/$token sem login.
-- ============================================================

ALTER TABLE field_config ADD COLUMN IF NOT EXISTS relatorio_link_publico_token text;

-- Anônimo precisa ler o token para validar o link público
-- (mesma lógica da migration 00080 para link_publico_token).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'field_config'
  ) THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE field_config TO authenticated';
    EXECUTE 'GRANT SELECT ON TABLE field_config TO anon';
    EXECUTE 'ALTER TABLE field_config DISABLE ROW LEVEL SECURITY';
  END IF;
END $$;
