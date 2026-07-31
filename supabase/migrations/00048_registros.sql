-- ============================================================
-- Migration: Módulo Registros (Informações e Atendimentos)
-- ============================================================

-- 1. Tabela: registros_informacao (notas livres por elevatória)
CREATE TABLE IF NOT EXISTS registros_informacao (
  id BIGSERIAL PRIMARY KEY,
  elevatoria_id BIGINT REFERENCES elevatorias(id),
  texto TEXT NOT NULL,
  autor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela: registros_atendimento (ordens de atendimento, importadas do SAP)
CREATE TABLE IF NOT EXISTS registros_atendimento (
  id BIGSERIAL PRIMARY KEY,
  elevatoria_id BIGINT REFERENCES elevatorias(id),
  planta TEXT,
  ordem TEXT UNIQUE,
  nota TEXT,
  texto_breve TEXT,
  texto_longo TEXT,
  tipo_ordem TEXT,
  natureza TEXT,
  prioridade TEXT,
  status_sistema TEXT,
  status_simplificado TEXT,
  data_entrada DATE,
  data_modificacao DATE,
  criado_por TEXT,
  modificado_por TEXT,
  pdf_anexo_url TEXT,
  anexado_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  anexado_em TIMESTAMPTZ,
  origem_import TEXT,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_registros_informacao_elevatoria_id ON registros_informacao(elevatoria_id);
CREATE INDEX IF NOT EXISTS idx_registros_informacao_criado_em ON registros_informacao(elevatoria_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_registros_atendimento_elevatoria_id ON registros_atendimento(elevatoria_id);
CREATE INDEX IF NOT EXISTS idx_registros_atendimento_data_entrada ON registros_atendimento(elevatoria_id, data_entrada DESC);
CREATE INDEX IF NOT EXISTS idx_registros_atendimento_ordem ON registros_atendimento(ordem);

-- 4. Trigger: atualizado_em para registros_atendimento
CREATE OR REPLACE FUNCTION atualizar_atualizado_em_registros_atendimento()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_atualizado_em_registros_atendimento ON registros_atendimento;
CREATE TRIGGER trg_atualizado_em_registros_atendimento
  BEFORE UPDATE ON registros_atendimento
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_atualizado_em_registros_atendimento();

-- 5. Trigger: desvincular registros quando a elevatória for excluída
-- (mantém o histórico, igual ao campo obs da elevatória)
CREATE OR REPLACE FUNCTION registros_desvincular_elevatoria()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE registros_informacao SET elevatoria_id = NULL WHERE elevatoria_id = OLD.id;
  UPDATE registros_atendimento SET elevatoria_id = NULL WHERE elevatoria_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_registros_desvincular_elevatoria ON elevatorias;
CREATE TRIGGER trg_registros_desvincular_elevatoria
  BEFORE DELETE ON elevatorias
  FOR EACH ROW
  EXECUTE FUNCTION registros_desvincular_elevatoria();

-- 6. Função: adicionar registro de informação (retorna o novo registro)
CREATE OR REPLACE FUNCTION adicionar_registro_informacao(p_elevatoria_id BIGINT, p_texto TEXT, p_autor_id UUID)
RETURNS registros_informacao AS $$
DECLARE
  v_reg registros_informacao;
BEGIN
  INSERT INTO registros_informacao (elevatoria_id, texto, autor_id)
  VALUES (p_elevatoria_id, p_texto, p_autor_id)
  RETURNING * INTO v_reg;
  RETURN v_reg;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Desabilitar RLS (mesmo padrão das outras tabelas do projeto)
ALTER TABLE registros_informacao DISABLE ROW LEVEL SECURITY;
ALTER TABLE registros_atendimento DISABLE ROW LEVEL SECURITY;

-- 8. Registrar painel no catálogo
INSERT INTO paineis (chave, nome_exibicao, descricao, icone) VALUES
  ('registros', 'Registros', 'Informações e atendimentos das elevatórias', 'FileText')
ON CONFLICT (chave) DO NOTHING;

-- 9. Registrar permissões específicas do módulo
INSERT INTO permissions (key, label, panel_key, is_generic) VALUES
  ('registros.visualizar', 'Visualizar registros', 'registros', false),
  ('registros.criar', 'Criar registros', 'registros', false),
  ('registros.importar', 'Importar planilha de atendimentos', 'registros', false),
  ('registros.anexar_pdf', 'Anexar PDF de atendimento', 'registros', false)
ON CONFLICT (key) DO NOTHING;

-- 10. Painel aos cargos que já têm ficha_elevatoria (mesma lógica de acesso)
INSERT INTO cargo_paineis (cargo_id, painel_id)
SELECT DISTINCT cp.cargo_id, p2.id
FROM cargo_paineis cp
JOIN paineis p1 ON p1.id = cp.painel_id AND p1.chave = 'ficha_elevatoria'
JOIN paineis p2 ON p2.chave = 'registros'
ON CONFLICT DO NOTHING;

-- 11. Administrador: painel + todas as permissões
INSERT INTO cargo_paineis (cargo_id, painel_id)
SELECT c.id, p.id FROM cargos c, paineis p
WHERE c.nome = 'Administrador' AND p.chave = 'registros'
ON CONFLICT DO NOTHING;

INSERT INTO cargo_panel_permissions (cargo_id, permission_id)
SELECT c.id, p.id FROM cargos c, permissions p
WHERE c.nome = 'Administrador' AND p.panel_key = 'registros'
  AND NOT EXISTS (
    SELECT 1 FROM cargo_panel_permissions cpp
    WHERE cpp.cargo_id = c.id AND cpp.permission_id = p.id
  );

-- 12. Demais cargos (não-admin): visualizar + criar para quem tem o painel
INSERT INTO cargo_panel_permissions (cargo_id, permission_id)
SELECT DISTINCT cp.cargo_id, p.id
FROM cargo_paineis cp
JOIN cargos c ON c.id = cp.cargo_id AND c.nome != 'Administrador'
JOIN paineis pn ON pn.id = cp.painel_id AND pn.chave = 'registros'
JOIN permissions p ON p.panel_key = 'registros' AND p.key IN ('registros.visualizar', 'registros.criar')
  AND NOT EXISTS (
    SELECT 1 FROM cargo_panel_permissions cpp
    WHERE cpp.cargo_id = cp.cargo_id AND cpp.permission_id = p.id
  );

-- 13. importar + anexar_pdf apenas para quem tem ficha_elevatoria.importar
INSERT INTO cargo_panel_permissions (cargo_id, permission_id)
SELECT DISTINCT cpp.cargo_id, p.id
FROM cargo_panel_permissions cpp
JOIN permissions p_src ON p_src.id = cpp.permission_id AND p_src.key = 'ficha_elevatoria.importar'
JOIN permissions p ON p.panel_key = 'registros' AND p.key IN ('registros.importar', 'registros.anexar_pdf')
  AND NOT EXISTS (
    SELECT 1 FROM cargo_panel_permissions cpp2
    WHERE cpp2.cargo_id = cpp.cargo_id AND cpp2.permission_id = p.id
  );

-- 14. Bucket de storage para anexos de atendimento (PDF)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('registros', 'registros', true, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "registros_select_public" ON storage.objects;
CREATE POLICY "registros_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'registros');

DROP POLICY IF EXISTS "registros_insert_public" ON storage.objects;
CREATE POLICY "registros_insert_public"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'registros');

DROP POLICY IF EXISTS "registros_update_public" ON storage.objects;
CREATE POLICY "registros_update_public"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'registros')
WITH CHECK (bucket_id = 'registros');

DROP POLICY IF EXISTS "registros_delete_public" ON storage.objects;
CREATE POLICY "registros_delete_public"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'registros');
