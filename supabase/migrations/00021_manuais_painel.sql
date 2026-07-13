-- Painel Manuais
INSERT INTO paineis (chave, nome_exibicao, descricao, icone) VALUES
  ('manuais', 'Manuais Técnicos', 'Manuais e documentação técnica', 'BookOpen')
ON CONFLICT (chave) DO NOTHING;

-- Permissão específica para editar arquivo de manual
INSERT INTO permissions (key, label, panel_key, is_generic) VALUES
  ('manuais.editar_arquivo', 'Editar arquivo do manual', 'manuais', false)
ON CONFLICT (key) DO NOTHING;

-- Atribuir painel ao Administrador
INSERT INTO cargo_paineis (cargo_id, painel_id)
SELECT c.id, p.id FROM cargos c, paineis p
WHERE c.nome = 'Administrador' AND p.chave = 'manuais'
ON CONFLICT DO NOTHING;

-- Atribuir permissão editar_arquivo ao Administrador
INSERT INTO cargo_panel_permissions (cargo_id, permission_id)
SELECT c.id, p.id FROM cargos c, permissions p
WHERE c.nome = 'Administrador' AND p.key = 'manuais.editar_arquivo'
ON CONFLICT DO NOTHING;

-- Atribuir painel ao Supervisor
INSERT INTO cargo_paineis (cargo_id, painel_id)
SELECT c.id, p.id FROM cargos c, paineis p
WHERE c.nome = 'Supervisor' AND p.chave = 'manuais'
ON CONFLICT DO NOTHING;

-- Atribuir permissão editar_arquivo ao Supervisor
INSERT INTO cargo_panel_permissions (cargo_id, permission_id)
SELECT c.id, p.id FROM cargos c, permissions p
WHERE c.nome = 'Supervisor' AND p.key = 'manuais.editar_arquivo'
ON CONFLICT DO NOTHING;
