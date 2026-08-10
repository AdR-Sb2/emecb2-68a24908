-- ============================================================
-- Migration: Equipamentos — coluna "Local" vinculada às elevatórias
-- Renomeia a coluna livre "localizacao" para "local" (nomes vêm
-- da FICHA DE ELEVATÓRIA, tabela elevatorias, + "Oficina" na UI).
-- Idempotente.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipamentos' AND column_name = 'localizacao'
  ) THEN
    ALTER TABLE equipamentos RENAME COLUMN localizacao TO local;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipamentos' AND column_name = 'local'
  ) THEN
    ALTER TABLE equipamentos ADD COLUMN local text;
  END IF;
END $$;

ALTER TABLE equipamentos ALTER COLUMN local TYPE text;

-- Consistência com o restante do módulo.
ALTER TABLE equipamentos DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON equipamentos TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
