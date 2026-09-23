-- ============================================================
-- Migration: Procedimentos (passo-a-passo com PDF)
-- ============================================================
-- Cards com título, descrição e PDF anexado, compartilhados por
-- todos os usuários com o painel (padrão do projeto: RLS
-- desabilitado, controle via permissões de cargo).

-- 1. Tabela de procedimentos
CREATE TABLE IF NOT EXISTS procedimentos (
  id BIGSERIAL PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT DEFAULT '',
  pdf_url TEXT,
  pdf_nome TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  criado_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  atualizado_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Trigger: atualizado_em
CREATE OR REPLACE FUNCTION atualizar_atualizado_em_procedimentos()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_atualizado_em_procedimentos ON procedimentos;
CREATE TRIGGER trg_atualizado_em_procedimentos
  BEFORE UPDATE ON procedimentos
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_atualizado_em_procedimentos();

-- 3. Desabilitar RLS (padrão do projeto)
ALTER TABLE procedimentos DISABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON procedimentos TO authenticated;
GRANT SELECT ON procedimentos TO anon;

-- 4. Painel
INSERT INTO paineis (chave, nome_exibicao, descricao, icone) VALUES
  ('procedimentos', 'Procedimentos', 'Procedimentos operacionais passo-a-passo com PDF', 'ListChecks')
ON CONFLICT (chave) DO NOTHING;

-- 5. Permissões
INSERT INTO permissions (key, label, panel_key, is_generic) VALUES
  ('procedimentos.ver', 'Ver procedimentos', 'procedimentos', false),
  ('procedimentos.gerenciar', 'Criar, editar e remover procedimentos', 'procedimentos', false)
ON CONFLICT (key) DO NOTHING;

-- 6. Painel aos cargos que já têm manuais (mesma lógica de acesso à documentação)
INSERT INTO cargo_paineis (cargo_id, painel_id)
SELECT DISTINCT cp.cargo_id, p2.id
FROM cargo_paineis cp
JOIN paineis p1 ON p1.id = cp.painel_id AND p1.chave = 'manuais'
JOIN paineis p2 ON p2.chave = 'procedimentos'
ON CONFLICT DO NOTHING;

-- 7. Administrador: painel + todas as permissões (inclui as novas)
INSERT INTO cargo_paineis (cargo_id, painel_id)
SELECT c.id, p.id FROM cargos c, paineis p
WHERE c.nome = 'Administrador' AND p.chave = 'procedimentos'
ON CONFLICT DO NOTHING;

INSERT INTO cargo_panel_permissions (cargo_id, permission_id)
SELECT c.id, p.id
FROM cargos c, permissions p
WHERE c.nome = 'Administrador' AND p.panel_key = 'procedimentos'
  AND NOT EXISTS (
    SELECT 1 FROM cargo_panel_permissions cpp
    WHERE cpp.cargo_id = c.id AND cpp.permission_id = p.id
  );

-- 8. Supervisor: painel + ver/gerenciar (mesmo nível dos manuais)
INSERT INTO cargo_paineis (cargo_id, painel_id)
SELECT c.id, p.id FROM cargos c, paineis p
WHERE c.nome = 'Supervisor' AND p.chave = 'procedimentos'
ON CONFLICT DO NOTHING;

INSERT INTO cargo_panel_permissions (cargo_id, permission_id)
SELECT c.id, p.id
FROM cargos c, permissions p
WHERE c.nome = 'Supervisor' AND p.key IN ('procedimentos.ver', 'procedimentos.gerenciar')
  AND NOT EXISTS (
    SELECT 1 FROM cargo_panel_permissions cpp
    WHERE cpp.cargo_id = c.id AND cpp.permission_id = p.id
  );

-- 9. Demais cargos (não-admin): apenas ver, para quem já tem o painel
INSERT INTO cargo_panel_permissions (cargo_id, permission_id)
SELECT DISTINCT cp.cargo_id, p.id
FROM cargo_paineis cp
JOIN cargos c ON c.id = cp.cargo_id AND c.nome NOT IN ('Administrador', 'Supervisor')
JOIN paineis pn ON pn.id = cp.painel_id AND pn.chave = 'procedimentos'
JOIN permissions p ON p.key = 'procedimentos.ver'
  AND NOT EXISTS (
    SELECT 1 FROM cargo_panel_permissions cpp
    WHERE cpp.cargo_id = cp.cargo_id AND cpp.permission_id = p.id
  );

-- 10. Bucket de storage para os PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('procedimentos', 'procedimentos', true, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "procedimentos_select_public" ON storage.objects;
CREATE POLICY "procedimentos_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'procedimentos');

DROP POLICY IF EXISTS "procedimentos_insert_public" ON storage.objects;
CREATE POLICY "procedimentos_insert_public"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'procedimentos');

DROP POLICY IF EXISTS "procedimentos_update_public" ON storage.objects;
CREATE POLICY "procedimentos_update_public"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'procedimentos')
WITH CHECK (bucket_id = 'procedimentos');

DROP POLICY IF EXISTS "procedimentos_delete_public" ON storage.objects;
CREATE POLICY "procedimentos_delete_public"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'procedimentos');
