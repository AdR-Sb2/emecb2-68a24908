-- ============================================================
-- Migration: Caop EMEC — permissão de edição de dados
-- ============================================================

-- 1. Registrar permissão de edição
INSERT INTO permissions (key, label, panel_key, is_generic) VALUES
  ('caop_emec.editar', 'Editar dados do Caop EMEC', 'caop_emec', false)
ON CONFLICT (key) DO NOTHING;

-- 2. Atribuir permissão caop_emec.editar aos cargos
INSERT INTO cargo_panel_permissions (cargo_id, permission_id)
SELECT c.id, p.id FROM cargos c, permissions p
WHERE c.nome IN ('Administrador', 'Supervisor', 'Gerente') AND p.key = 'caop_emec.editar'
ON CONFLICT DO NOTHING;
