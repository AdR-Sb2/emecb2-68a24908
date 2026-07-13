-- ============================================================
-- Migration: Permissões genéricas para todos os painéis
-- ============================================================

-- Adiciona permissões genéricas (Ver, Editar, Excluir, Exportar) para
-- todos os painéis que ainda não têm nenhuma permissão cadastrada.

DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN SELECT chave, nome_exibicao FROM paineis WHERE chave != 'estoque' LOOP
    INSERT INTO permissions (key, label, panel_key, is_generic) VALUES
      (p.chave || '.ver', 'Ver', p.chave, true),
      (p.chave || '.editar', 'Editar', p.chave, true),
      (p.chave || '.excluir', 'Excluir', p.chave, true),
      (p.chave || '.exportar', 'Exportar', p.chave, true)
    ON CONFLICT (key) DO NOTHING;
  END LOOP;
END $$;

-- Concede todas as permissões ao Administrador (incluindo as novas)
INSERT INTO cargo_panel_permissions (cargo_id, permission_id)
SELECT c.id, p.id
FROM cargos c, permissions p
WHERE c.nome = 'Administrador'
  AND NOT EXISTS (
    SELECT 1 FROM cargo_panel_permissions cpp
    WHERE cpp.cargo_id = c.id AND cpp.permission_id = p.id
  );
