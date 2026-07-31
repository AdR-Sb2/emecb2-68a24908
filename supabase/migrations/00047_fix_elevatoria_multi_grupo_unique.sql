-- ============================================================
-- Fix: constraints UNIQUE em elevatoria_id impediam múltiplos grupos
-- A migração 00042 tentou removê-las com nomes errados, então os
-- constraints (elevatoria_equipamento_elevatoria_id_key e
-- elevatoria_eletrica_elevatoria_id_key) continuam ativos e bloqueiam
-- o botão "+ Adicionar grupo" (duplicate key value violates unique constraint).
-- ============================================================

ALTER TABLE elevatoria_equipamento DROP CONSTRAINT IF EXISTS elevatoria_equipamento_elevatoria_id_key;
ALTER TABLE elevatoria_eletrica DROP CONSTRAINT IF EXISTS elevatoria_eletrica_elevatoria_id_key;

-- Garantir o UNIQUE composto (elevatoria_id, grupo) para o upsert por conjunto
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'elevatoria_equipamento_elev_grupo_unique'
  ) THEN
    ALTER TABLE elevatoria_equipamento ADD CONSTRAINT elevatoria_equipamento_elev_grupo_unique UNIQUE (elevatoria_id, grupo);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'elevatoria_eletrica_elev_grupo_unique'
  ) THEN
    ALTER TABLE elevatoria_eletrica ADD CONSTRAINT elevatoria_eletrica_elev_grupo_unique UNIQUE (elevatoria_id, grupo);
  END IF;
END $$;
