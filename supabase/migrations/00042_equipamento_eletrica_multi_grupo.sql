-- ============================================================
-- Migration: Suporte a múltiplos grupos em elevatoria_equipamento
-- e elevatoria_eletrica (conjuntos motor/bomba/painel/acionamento)
-- ============================================================

-- 1. Adicionar coluna grupo em elevatoria_equipamento
ALTER TABLE elevatoria_equipamento ADD COLUMN IF NOT EXISTS grupo INTEGER NOT NULL DEFAULT 1;

-- 2. Adicionar coluna grupo em elevatoria_eletrica
ALTER TABLE elevatoria_eletrica ADD COLUMN IF NOT EXISTS grupo INTEGER NOT NULL DEFAULT 1;

-- 3. Remover UNIQUE constraint em elevatoria_id (era 1:1)
ALTER TABLE elevatoria_equipamento DROP CONSTRAINT IF EXISTS elevatoria_elevatoria_equipamento_elevatoria_id_key;
ALTER TABLE elevatoria_eletrica DROP CONSTRAINT IF EXISTS elevatoria_elevatoria_eletrica_elevatoria_id_key;

-- 4. Criar UNIQUE composto (elevatoria_id, grupo) para upsert por conjunto
ALTER TABLE elevatoria_equipamento ADD CONSTRAINT elevatoria_equipamento_elev_grupo_unique UNIQUE (elevatoria_id, grupo);
ALTER TABLE elevatoria_eletrica ADD CONSTRAINT elevatoria_eletrica_elev_grupo_unique UNIQUE (elevatoria_id, grupo);

-- 5. Adicionar índice para busca por grupo
CREATE INDEX IF NOT EXISTS idx_elev_equipamento_grupo ON elevatoria_equipamento(elevatoria_id, grupo);
CREATE INDEX IF NOT EXISTS idx_elev_eletrica_grupo ON elevatoria_eletrica(elevatoria_id, grupo);

-- 6. Atualizar trigger de auditoria para incluir grupo na comparação
-- (o trigger existente já compara todas as colunas via information_schema,
-- então automaticamente incluirá 'grupo' agora)
