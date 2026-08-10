-- ============================================================
-- Correção do módulo Equipamentos (aplicar no SQL editor do Supabase)
-- Cobre: RLS ativo (erro "new row violates row-level security policy"),
-- permissões faltando, bucket/políticas de storage e schema cache desatualizado.
-- Script idempotente: pode rodar quantas vezes quiser.
-- ============================================================

-- 1. RLS desabilitado nas 4 tabelas do módulo.
--    (Tabelas criadas pelo Table Editor nascem com RLS ATIVO — por isso
--    leituras/inserções falham com "violates row-level security policy".)
ALTER TABLE equipamento_categorias DISABLE ROW LEVEL SECURITY;
ALTER TABLE equipamentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE equipamento_fotos DISABLE ROW LEVEL SECURITY;
ALTER TABLE equipamento_registros DISABLE ROW LEVEL SECURITY;

-- 2. Garantir permissão de acesso das roles usadas pelo client
--    (seguro mesmo se os default privileges não tiverem sido aplicados).
GRANT SELECT, INSERT, UPDATE, DELETE ON
  equipamentos, equipamento_categorias, equipamento_fotos, equipamento_registros
TO anon, authenticated, service_role;

-- 3. Garantir as permissões do módulo no painel estoque (idempotente).
INSERT INTO permissions (key, label, panel_key, is_generic) VALUES
  ('estoque.equipamentos_ver', 'Ver equipamentos', 'estoque', false),
  ('estoque.equipamentos_criar', 'Criar equipamentos', 'estoque', false),
  ('estoque.equipamentos_editar', 'Editar equipamentos', 'estoque', false),
  ('estoque.equipamentos_remover', 'Remover equipamentos', 'estoque', false),
  ('estoque.equipamentos_categorias', 'Gerenciar categorias de equipamentos', 'estoque', false)
ON CONFLICT (key) DO NOTHING;

-- 4. Administrador: todas as permissões de equipamentos.
INSERT INTO cargo_panel_permissions (cargo_id, permission_id)
SELECT c.id, p.id FROM cargos c, permissions p
WHERE c.nome = 'Administrador' AND p.panel_key = 'estoque' AND p.key LIKE 'estoque.equipamentos_%'
  AND NOT EXISTS (
    SELECT 1 FROM cargo_panel_permissions cpp
    WHERE cpp.cargo_id = c.id AND cpp.permission_id = p.id
  );

-- 5. Quem já tem o painel Estoque (não-admin): ver + criar.
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

-- 6. editar/remover/categorias: quem já tem estoque.gerenciar_categorias.
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

-- 7. Bucket de fotos (público) + políticas. Reforça caso o bucket
--    tenha sido criado sem public ou com limites diferentes.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('equipamentos', 'equipamentos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

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

-- 8. Recarregar o schema do PostgREST para ele enxergar tabelas,
--    colunas e relacionamentos novos (o alias categorias:equipamento_categorias
--    depende disso para o join funcionar).
NOTIFY pgrst, 'reload schema';
