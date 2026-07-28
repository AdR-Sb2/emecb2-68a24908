-- ============================================================
-- Migration: Fix RLS e constraints das elevatorias
-- ============================================================

-- 1. Desabilitar RLS em todas as tabelas de elevatoria
ALTER TABLE elevatorias DISABLE ROW LEVEL SECURITY;
ALTER TABLE elevatoria_equipamento DISABLE ROW LEVEL SECURITY;
ALTER TABLE elevatoria_eletrica DISABLE ROW LEVEL SECURITY;
ALTER TABLE elevatoria_hidraulica DISABLE ROW LEVEL SECURITY;
ALTER TABLE elevatoria_area_influencia DISABLE ROW LEVEL SECURITY;
ALTER TABLE elevatoria_rolamentos_selos DISABLE ROW LEVEL SECURITY;
ALTER TABLE elevatoria_implantacao DISABLE ROW LEVEL SECURITY;
ALTER TABLE elevatoria_implantacao_etapas DISABLE ROW LEVEL SECURITY;
ALTER TABLE elevatoria_dados_mestres_auditoria DISABLE ROW LEVEL SECURITY;
ALTER TABLE elevatoria_campo_na DISABLE ROW LEVEL SECURITY;

-- 2. Remover duplicatas em elevatorias (manter o menor id de cada nome)
DELETE FROM elevatorias a
USING elevatorias b
WHERE a.nome = b.nome
  AND a.id > b.id;

-- 3. UNIQUE constraint na tabela elevatorias (necessário para upsert na importação)
ALTER TABLE elevatorias ADD CONSTRAINT elevatorias_nome_unique UNIQUE (nome);

-- 4. Adicionar coluna grupo se não existir
ALTER TABLE elevatoria_equipamento ADD COLUMN IF NOT EXISTS grupo INTEGER NOT NULL DEFAULT 1;
ALTER TABLE elevatoria_eletrica ADD COLUMN IF NOT EXISTS grupo INTEGER NOT NULL DEFAULT 1;

-- 5. Remover UNIQUE constraint antiga (era 1:1)
ALTER TABLE elevatoria_equipamento DROP CONSTRAINT IF EXISTS elevatoria_elevatoria_equipamento_elevatoria_id_key;
ALTER TABLE elevatoria_eletrica DROP CONSTRAINT IF EXISTS elevatoria_elevatoria_eletrica_elevatoria_id_key;

-- 6. Novo UNIQUE composto (elevatoria_id, grupo)
DROP INDEX IF EXISTS idx_elev_equipamento_elevatoria_id_grupo;
DROP INDEX IF EXISTS idx_elev_eletrica_elevatoria_id_grupo;
ALTER TABLE elevatoria_equipamento ADD CONSTRAINT elevatoria_equipamento_elev_grupo_unique UNIQUE (elevatoria_id, grupo);
ALTER TABLE elevatoria_eletrica ADD CONSTRAINT elevatoria_eletrica_elev_grupo_unique UNIQUE (elevatoria_id, grupo);
CREATE INDEX IF NOT EXISTS idx_elev_equipamento_grupo ON elevatoria_equipamento(elevatoria_id, grupo);
CREATE INDEX IF NOT EXISTS idx_elev_eletrica_grupo ON elevatoria_eletrica(elevatoria_id, grupo);

-- 7. Remover constraint antiga de elevatoria_hidraulica (era 1:1) se existir
ALTER TABLE elevatoria_hidraulica DROP CONSTRAINT IF EXISTS elevatoria_elevatoria_hidraulica_elevatoria_id_key;
ALTER TABLE elevatoria_area_influencia DROP CONSTRAINT IF EXISTS elevatoria_elevatoria_area_influencia_elevatoria_id_key;
ALTER TABLE elevatoria_implantacao DROP CONSTRAINT IF EXISTS elevatoria_elevatoria_implantacao_elevatoria_id_key;
