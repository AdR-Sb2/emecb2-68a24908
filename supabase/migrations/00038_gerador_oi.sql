-- ============================================================
-- Migration: Gerador de OI (Ordem de Intervenção / Relatório Fotográfico)
-- ============================================================
Q
-- 1. Tabela: ordens_intervencao (cabeçalho de cada OI)
CREATE TABLE IF NOT EXISTS ordens_intervencao (
  id BIGSERIAL PRIMARY KEY,
  numero_oi TEXT NOT NULL,
  bloco TEXT NOT NULL,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  superintendencia TEXT,
  municipio TEXT,
  tipo_agua BOOLEAN DEFAULT false,
  tipo_esgoto BOOLEAN DEFAULT false,
  tipo_outros_investimentos BOOLEAN DEFAULT false,
  responsavel_aegea TEXT,
  responsavel_aguas_do_rio TEXT,
  objetivo_escopo_local TEXT,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'finalizado')),
  criado_por UUID REFERENCES profiles(id),
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela: oi_intervencoes (ativos/intervenções dentro da OI)
CREATE TABLE IF NOT EXISTS oi_intervencoes (
  id BIGSERIAL PRIMARY KEY,
  ordem_intervencao_id BIGINT REFERENCES ordens_intervencao(id) ON DELETE CASCADE,
  ordem INT NOT NULL,
  titulo_ativo TEXT NOT NULL,
  endereco_obra TEXT,
  rubrica_quf TEXT
);

-- 3. Tabela: oi_fotos (fotos de cada intervenção)
CREATE TABLE IF NOT EXISTS oi_fotos (
  id BIGSERIAL PRIMARY KEY,
  intervencao_id BIGINT REFERENCES oi_intervencoes(id) ON DELETE CASCADE,
  ordem INT NOT NULL,
  storage_path TEXT NOT NULL,
  evento TEXT,
  descricao TEXT
);

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_oi_intervencoes_ordem_intervencao_id ON oi_intervencoes(ordem_intervencao_id);
CREATE INDEX IF NOT EXISTS idx_oi_fotos_intervencao_id ON oi_fotos(intervencao_id);
CREATE INDEX IF NOT EXISTS idx_ordens_intervencao_numero_oi ON ordens_intervencao(numero_oi);
CREATE INDEX IF NOT EXISTS idx_ordens_intervencao_bloco ON ordens_intervencao(bloco);
CREATE INDEX IF NOT EXISTS idx_ordens_intervencao_status ON ordens_intervencao(status);

-- 5. Trigger para atualizar atualizado_em automaticamente
CREATE OR REPLACE FUNCTION atualizar_atualizado_em_oi()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_atualizado_em_oi
  BEFORE UPDATE ON ordens_intervencao
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_atualizado_em_oi();

-- 6. Desabilitar RLS (mesmo padrão das outras tabelas do projeto)
ALTER TABLE ordens_intervencao DISABLE ROW LEVEL SECURITY;
ALTER TABLE oi_intervencoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE oi_fotos DISABLE ROW LEVEL SECURITY;

-- 7. Bucket de storage para fotos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('oi-fotos', 'oi-fotos', true, 20971520, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- 8. Políticas de storage (público — mesmo padrão do bucket manuais)
DROP POLICY IF EXISTS "oi_fotos_select_public" ON storage.objects;
CREATE POLICY "oi_fotos_select_public"
ON storage.objects FOR SELECT TO public USING (bucket_id = 'oi-fotos');

DROP POLICY IF EXISTS "oi_fotos_insert_public" ON storage.objects;
CREATE POLICY "oi_fotos_insert_public"
ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'oi-fotos');

DROP POLICY IF EXISTS "oi_fotos_update_public" ON storage.objects;
CREATE POLICY "oi_fotos_update_public"
ON storage.objects FOR UPDATE TO public USING (bucket_id = 'oi-fotos') WITH CHECK (bucket_id = 'oi-fotos');

DROP POLICY IF EXISTS "oi_fotos_delete_public" ON storage.objects;
CREATE POLICY "oi_fotos_delete_public"
ON storage.objects FOR DELETE TO public USING (bucket_id = 'oi-fotos');

-- 9. Registrar painel no catálogo
INSERT INTO paineis (chave, nome_exibicao, descricao, icone) VALUES
  ('gerador_oi', 'Gerador de OI', 'Ordem de Intervenção / Relatório Fotográfico', 'FileImage')
ON CONFLICT (chave) DO NOTHING;

-- 10. Registrar permissões
INSERT INTO permissions (key, label, panel_key, is_generic) VALUES
  ('gerador_oi.criar', 'Criar OI', 'gerador_oi', false),
  ('gerador_oi.editar', 'Editar OI', 'gerador_oi', false),
  ('gerador_oi.excluir', 'Excluir OI', 'gerador_oi', false),
  ('gerador_oi.gerar_docx', 'Gerar arquivo Word', 'gerador_oi', false)
ON CONFLICT (key) DO NOTHING;

-- 11. Atribuir painel aos cargos
INSERT INTO cargo_paineis (cargo_id, painel_id)
SELECT c.id, p.id FROM cargos c, paineis p
WHERE c.nome = 'Administrador' AND p.chave = 'gerador_oi'
ON CONFLICT DO NOTHING;

INSERT INTO cargo_paineis (cargo_id, painel_id)
SELECT c.id, p.id FROM cargos c, paineis p
WHERE c.nome = 'Supervisor' AND p.chave = 'gerador_oi'
ON CONFLICT DO NOTHING;

-- 12. Atribuir permissões ao Administrador
INSERT INTO cargo_panel_permissions (cargo_id, permission_id)
SELECT c.id, p.id FROM cargos c, permissions p
WHERE c.nome = 'Administrador' AND p.key = 'gerador_oi.criar'
ON CONFLICT DO NOTHING;

INSERT INTO cargo_panel_permissions (cargo_id, permission_id)
SELECT c.id, p.id FROM cargos c, permissions p
WHERE c.nome = 'Administrador' AND p.key = 'gerador_oi.editar'
ON CONFLICT DO NOTHING;

INSERT INTO cargo_panel_permissions (cargo_id, permission_id)
SELECT c.id, p.id FROM cargos c, permissions p
WHERE c.nome = 'Administrador' AND p.key = 'gerador_oi.excluir'
ON CONFLICT DO NOTHING;

INSERT INTO cargo_panel_permissions (cargo_id, permission_id)
SELECT c.id, p.id FROM cargos c, permissions p
WHERE c.nome = 'Administrador' AND p.key = 'gerador_oi.gerar_docx'
ON CONFLICT DO NOTHING;

-- 13. Atribuir permissões ao Supervisor (criar, editar, gerar — sem excluir)
INSERT INTO cargo_panel_permissions (cargo_id, permission_id)
SELECT c.id, p.id FROM cargos c, permissions p
WHERE c.nome = 'Supervisor' AND p.key = 'gerador_oi.criar'
ON CONFLICT DO NOTHING;

INSERT INTO cargo_panel_permissions (cargo_id, permission_id)
SELECT c.id, p.id FROM cargos c, permissions p
WHERE c.nome = 'Supervisor' AND p.key = 'gerador_oi.editar'
ON CONFLICT DO NOTHING;

INSERT INTO cargo_panel_permissions (cargo_id, permission_id)
SELECT c.id, p.id FROM cargos c, permissions p
WHERE c.nome = 'Supervisor' AND p.key = 'gerador_oi.gerar_docx'
ON CONFLICT DO NOTHING;
