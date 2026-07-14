-- Permissões para os links do hub Sistemas (Administrativo / Operacional)

-- 1. Criar permissões
INSERT INTO permissions (key, label, panel_key, is_generic) VALUES
  ('sistemas.administrativo', 'Acessar hub Administrativo', 'sistemas', false),
  ('sistemas.operacional', 'Acessar hub Operacional', 'sistemas', false)
ON CONFLICT (key) DO NOTHING;

-- 2. Atribuir ao Administrador
INSERT INTO cargo_panel_permissions (cargo_id, permission_id)
SELECT c.id, p.id FROM cargos c, permissions p
WHERE c.nome = 'Administrador' AND p.key IN ('sistemas.administrativo', 'sistemas.operacional')
ON CONFLICT DO NOTHING;

-- 3. Atribuir ao Supervisor
INSERT INTO cargo_panel_permissions (cargo_id, permission_id)
SELECT c.id, p.id FROM cargos c, permissions p
WHERE c.nome = 'Supervisor' AND p.key IN ('sistemas.administrativo', 'sistemas.operacional')
ON CONFLICT DO NOTHING;
