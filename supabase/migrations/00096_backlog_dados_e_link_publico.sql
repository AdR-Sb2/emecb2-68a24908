-- ============================================================
-- Migration: Backlog BI — dados compartilhados + link público
-- ============================================================
-- IMPORTANTE: esta migration NÃO é aplicada automaticamente.
-- Cole o conteúdo abaixo no SQL Editor do Supabase (projeto do app)
-- e clique em "Run". Tudo aqui é idempotente (pode rodar 2x).
--
-- 1) backlog_dados: onde o CSV do Bucket e o XLSX do Planejamento
--    semanal são gravados para todo mundo ver (linha única id = 1).
-- 2) field_config.backlog_link_publico_token: token que libera a
--    rota pública /backlog/publico/$token sem login.
-- ============================================================

-- 1) tabela de dados compartilhados -------------------------------------
CREATE TABLE IF NOT EXISTS backlog_dados (
  id integer PRIMARY KEY DEFAULT 1,
  dados jsonb NOT NULL,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE backlog_dados DISABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON backlog_dados TO authenticated;
GRANT SELECT ON backlog_dados TO anon;

-- 2) coluna do link público --------------------------------------------
ALTER TABLE field_config ADD COLUMN IF NOT EXISTS backlog_link_publico_token text;

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
