-- ============================================================
-- Migration: Garantir privilégios na field_config e leitura anônima
-- O botão "Link" grava como authenticated, mas a validação do link
-- público lê como anon. Se os default privileges do projeto não
-- cobrirem a tabela criada pela migration (00078), o anon recebe
-- permissão negada e o link mostra "Link não encontrado ou revogado".
-- GRANT é idempotente: se já existir, nada é alterado.
-- Usa DO blocks para nunca quebrar o deploy se a tabela não existir.
-- ============================================================

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

-- Leitura anônima das tabelas do Dashboard (a política RLS de 00078
-- ainda exige link ativo; aqui garantimos apenas o privilégio de tabela).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'field_dias'
  ) THEN
    EXECUTE 'GRANT SELECT ON TABLE field_dias TO anon';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'field_equipes'
  ) THEN
    EXECUTE 'GRANT SELECT ON TABLE field_equipes TO anon';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'field_atividades'
  ) THEN
    EXECUTE 'GRANT SELECT ON TABLE field_atividades TO anon';
  END IF;
END $$;