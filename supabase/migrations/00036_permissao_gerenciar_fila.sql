-- ============================================================
-- Migration: Permissão gerenciar_fila para Estoque
-- ============================================================

-- 1. Adiciona permissão no catálogo
INSERT INTO permissions (key, label, panel_key, is_generic) VALUES
  ('estoque.gerenciar_fila', 'Gerenciar Fila de RC', 'estoque', false)
ON CONFLICT (key) DO NOTHING;

-- 2. Concede ao Administrador (para todos os painéis)
INSERT INTO cargo_panel_permissions (cargo_id, permission_id)
SELECT c.id, p.id
FROM cargos c, permissions p
WHERE c.nome = 'Administrador' AND p.key = 'estoque.gerenciar_fila'
ON CONFLICT DO NOTHING;

-- 3. Opcional: concede a outros cargos que já têm gerenciar_compras
-- (ajuste conforme necessário)
INSERT INTO cargo_panel_permissions (cargo_id, permission_id)
SELECT c.id, p.id
FROM cargos c, permissions p
WHERE c.nome IN ('Comprador', 'Almoxarife', 'Gerente') 
  AND p.key = 'estoque.gerenciar_fila'
ON CONFLICT DO NOTHING;