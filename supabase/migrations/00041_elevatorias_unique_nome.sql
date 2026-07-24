-- ============================================================
-- Migration: Correções Ficha da Elevatória
-- ============================================================

-- 1. Remover registros duplicados "Nova Elevatória" (manter apenas o mais recente)
DELETE FROM elevatorias
WHERE nome = 'Nova Elevatória'
  AND id NOT IN (
    SELECT id FROM elevatorias
    WHERE nome = 'Nova Elevatória'
    ORDER BY id DESC
    LIMIT 1
  );

-- 2. UNIQUE constraint na tabela elevatorias (necessário para upsert na importação)
ALTER TABLE elevatorias ADD CONSTRAINT elevatorias_nome_unique UNIQUE (nome);

-- 3. Atualizar ícone do painel para Building2
UPDATE paineis SET icone = 'Building2' WHERE chave = 'ficha_elevatoria';
