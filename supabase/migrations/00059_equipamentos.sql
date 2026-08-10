-- ============================================================
-- Migration: Módulo Equipamentos (controle físico de equipamentos)
-- ============================================================

-- 1. Categorias de equipamento (editável pelo usuário: criar/editar/remover)
CREATE TABLE IF NOT EXISTS equipamento_categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  ordem integer DEFAULT 0,
  criado_em timestamptz DEFAULT now()
);

INSERT INTO equipamento_categorias (nome, ordem) VALUES
  ('Motor', 1), ('Bomba', 2), ('Inversor', 3), ('Softstarter', 4)
ON CONFLICT (nome) DO NOTHING;

-- 2. Equipamentos
CREATE TABLE IF NOT EXISTS equipamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag text NOT NULL,
  descricao text NOT NULL,
  tipo text NOT NULL, -- Motor, Bomba Voluta, Bomba Submersa, Bomba Submersível, Inversor Danfoss, Inversor WEG, Softstart SS07
  categoria_id uuid REFERENCES equipamento_categorias(id),
  origem text,
  codigo_sap text,
  observacao text,
  critico boolean DEFAULT false,
  status text NOT NULL DEFAULT 'Operacional'
    CHECK (status IN ('Operacional', 'Em manutenção', 'Reserva', 'Baixado')),
  foto_url text, -- capa (última foto da galeria)
  criado_por uuid REFERENCES profiles(id),
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equipamentos_categoria ON equipamentos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_equipamentos_tag ON equipamentos(tag);

-- 3. Galeria de fotos (histórico visual por equipamento)
CREATE TABLE IF NOT EXISTS equipamento_fotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id uuid NOT NULL REFERENCES equipamentos(id) ON DELETE CASCADE,
  url text NOT NULL,
  autor_id uuid REFERENCES profiles(id),
  criado_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equipamento_fotos_equipamento ON equipamento_fotos(equipamento_id, criado_em DESC);

-- 4. Registros de manutenção/movimentação do equipamento
CREATE TABLE IF NOT EXISTS equipamento_registros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id uuid NOT NULL REFERENCES equipamentos(id) ON DELETE CASCADE,
  tipo text NOT NULL, -- Manutenção, Troca, Inspeção, Observação
  descricao text NOT NULL,
  autor_id uuid REFERENCES profiles(id),
  criado_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equipamento_registros_equipamento ON equipamento_registros(equipamento_id, criado_em DESC);

-- 5. RLS desabilitado (padrão do projeto)
ALTER TABLE equipamento_categorias DISABLE ROW LEVEL SECURITY;
ALTER TABLE equipamentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE equipamento_fotos DISABLE ROW LEVEL SECURITY;
ALTER TABLE equipamento_registros DISABLE ROW LEVEL SECURITY;

-- 6. Permissões específicas do módulo no painel Estoque (mesmo panel_key)
INSERT INTO permissions (key, label, panel_key, is_generic) VALUES
  ('estoque.equipamentos_ver', 'Ver equipamentos', 'estoque', false),
  ('estoque.equipamentos_criar', 'Criar equipamentos', 'estoque', false),
  ('estoque.equipamentos_editar', 'Editar equipamentos', 'estoque', false),
  ('estoque.equipamentos_remover', 'Remover equipamentos', 'estoque', false),
  ('estoque.equipamentos_categorias', 'Gerenciar categorias de equipamentos', 'estoque', false)
ON CONFLICT (key) DO NOTHING;

-- 7. Administrador: todas as permissões de equipamentos
INSERT INTO cargo_panel_permissions (cargo_id, permission_id)
SELECT c.id, p.id FROM cargos c, permissions p
WHERE c.nome = 'Administrador' AND p.panel_key = 'estoque' AND p.key LIKE 'estoque.equipamentos_%'
  AND NOT EXISTS (
    SELECT 1 FROM cargo_panel_permissions cpp
    WHERE cpp.cargo_id = c.id AND cpp.permission_id = p.id
  );

-- 8. Demais cargos que já têm o painel Estoque: ver + criar
INSERT INTO cargo_panel_permissions (cargo_id, permission_id)
SELECT DISTINCT cp.cargo_id, p.id
FROM cargo_paineis cp
JOIN cargos c ON c.id = cp.cargo_id AND c.nome != 'Administrador'
JOIN paineis pn ON pn.id = cp.painel_id AND pn.chave = 'estoque'
JOIN permissions p ON p.panel_key = 'estoque'
  AND p.key IN ('estoque.equipamentos_ver', 'estoque.equipamentos_criar')
  AND NOT EXISTS (
    SELECT 1 FROM cargo_panel_permissions cpp
    WHERE cpp.cargo_id = cp.cargo_id AND cpp.permission_id = p.id
  );

-- 9. editar/remover/categorias apenas para quem já tem estoque.gerenciar_categorias
INSERT INTO cargo_panel_permissions (cargo_id, permission_id)
SELECT DISTINCT cpp.cargo_id, p.id
FROM cargo_panel_permissions cpp
JOIN permissions p_src ON p_src.id = cpp.permission_id AND p_src.key = 'estoque.gerenciar_categorias'
JOIN permissions p ON p.panel_key = 'estoque'
  AND p.key IN ('estoque.equipamentos_editar', 'estoque.equipamentos_remover', 'estoque.equipamentos_categorias')
  AND NOT EXISTS (
    SELECT 1 FROM cargo_panel_permissions cpp2
    WHERE cpp2.cargo_id = cpp.cargo_id AND cpp2.permission_id = p.id
  );

-- 10. Bucket de storage para fotos de equipamentos (pasta equipamentos/)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('equipamentos', 'equipamentos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "equipamentos_select_public" ON storage.objects;
CREATE POLICY "equipamentos_select_public"
ON storage.objects FOR SELECT TO public USING (bucket_id = 'equipamentos');

DROP POLICY IF EXISTS "equipamentos_insert_public" ON storage.objects;
CREATE POLICY "equipamentos_insert_public"
ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'equipamentos');

DROP POLICY IF EXISTS "equipamentos_update_public" ON storage.objects;
CREATE POLICY "equipamentos_update_public"
ON storage.objects FOR UPDATE TO public USING (bucket_id = 'equipamentos') WITH CHECK (bucket_id = 'equipamentos');

DROP POLICY IF EXISTS "equipamentos_delete_public" ON storage.objects;
CREATE POLICY "equipamentos_delete_public"
ON storage.objects FOR DELETE TO public USING (bucket_id = 'equipamentos');
