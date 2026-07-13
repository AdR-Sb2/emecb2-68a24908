-- ============================================================
-- Migration: Permissões Granulares por Painel
-- ============================================================

-- 1. Catálogo de permissões
CREATE TABLE IF NOT EXISTS permissions (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  panel_key TEXT NOT NULL REFERENCES paineis(chave) ON DELETE CASCADE,
  is_generic BOOLEAN NOT NULL DEFAULT false
);

-- 2. Permissões concedidas a cada cargo (por painel)
CREATE TABLE IF NOT EXISTS cargo_panel_permissions (
  id BIGSERIAL PRIMARY KEY,
  cargo_id BIGINT NOT NULL REFERENCES cargos(id) ON DELETE CASCADE,
  permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE (cargo_id, permission_id)
);

-- 3. Seed: catálogo de permissões

-- Permissões genéricas (reaproveitáveis em qualquer painel)
-- Nota: serão populadas por painel conforme existirem ações correspondentes

-- Estoque
INSERT INTO permissions (key, label, panel_key, is_generic) VALUES
  ('estoque.exportar', 'Exportar', 'estoque', true),
  ('estoque.importar', 'Importar', 'estoque', false),
  ('estoque.registrar_entrada', 'Lançar Entrada', 'estoque', false),
  ('estoque.registrar_saida', 'Lançar Saída', 'estoque', false),
  ('estoque.registrar_ajuste', 'Lançar Ajuste', 'estoque', false),
  ('estoque.solicitar_compra', 'Solicitar Compra', 'estoque', false),
  ('estoque.gerenciar_compras', 'Gerenciar Compras', 'estoque', false),
  ('estoque.editar_config_material', 'Editar Config. do Material', 'estoque', false),
  ('estoque.cadastrar_material', 'Cadastrar Material', 'estoque', false),
  ('estoque.gerenciar_categorias', 'Gerenciar Categorias', 'estoque', false)
ON CONFLICT (key) DO NOTHING;

-- 4. Seed: conceder TODAS as permissões ao Administrador (para todos os painéis)
INSERT INTO cargo_panel_permissions (cargo_id, permission_id)
SELECT c.id, p.id
FROM cargos c, permissions p
WHERE c.nome = 'Administrador'
ON CONFLICT DO NOTHING;
