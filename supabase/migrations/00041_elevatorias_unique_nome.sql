-- ============================================================
-- Migration: Correções Ficha da Elevatória
-- ============================================================

-- 1. UNIQUE constraint na tabela elevatorias (necessário para upsert na importação)
ALTER TABLE elevatorias ADD CONSTRAINT elevatorias_nome_unique UNIQUE (nome);

-- 2. Atualizar ícone do painel para Building2
UPDATE paineis SET icone = 'Building2' WHERE chave = 'ficha_elevatoria';
