-- ============================================================
-- Migration: Correções Ficha da Elevatória
-- ============================================================

-- 1. Remover TODOS os registros duplicados (manter apenas o de menor id de cada nome)
DELETE FROM elevatorias a
USING elevatorias b
WHERE a.nome = b.nome
  AND a.id > b.id;

-- 2. UNIQUE constraint na tabela elevatorias (necessário para upsert na importação)
ALTER TABLE elevatorias ADD CONSTRAINT elevatorias_nome_unique UNIQUE (nome);

-- 3. Atualizar ícone do painel para Building2
UPDATE paineis SET icone = 'Building2' WHERE chave = 'ficha_elevatoria';
