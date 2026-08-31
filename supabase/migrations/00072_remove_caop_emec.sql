-- ============================================================
-- Migration: Remover módulo Caop EMEC
-- ============================================================

-- 1. Remover permissões do painel
DELETE FROM cargo_panel_permissions
WHERE permission_id IN (
  SELECT id FROM permissions WHERE panel_key = 'caop_emec'
);

DELETE FROM permissions WHERE panel_key = 'caop_emec';

-- 2. Remover associação do painel aos cargos
DELETE FROM cargo_paineis
WHERE painel_id IN (
  SELECT id FROM paineis WHERE chave = 'caop_emec'
);

-- 3. Remover painel do catálogo
DELETE FROM paineis WHERE chave = 'caop_emec';

-- 4. Dropar a tabela de dados
DROP TABLE IF EXISTS public.caop_emec;
