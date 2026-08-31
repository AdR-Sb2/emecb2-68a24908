-- ============================================================
-- Migration: Caop EMEC (Centro de Apoio Operacional)
-- ============================================================

-- 1. Tabela de dados do Caop
CREATE TABLE IF NOT EXISTS caop_emec (
  id BIGSERIAL PRIMARY KEY,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  orcamento NUMERIC(14,2) DEFAULT 0,
  custo_realizado NUMERIC(14,2) DEFAULT 0,
  total_os INTEGER DEFAULT 0,
  tipos_os JSONB DEFAULT '{}'::jsonb,
  detalhamento JSONB DEFAULT '{}'::jsonb,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE (ano, mes)
);

-- 2. Trigger: atualizar atualizado_em
CREATE OR REPLACE FUNCTION atualizar_atualizado_em_caop_emec()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_atualizado_em_caop_emec ON caop_emec;
CREATE TRIGGER trg_atualizado_em_caop_emec
  BEFORE UPDATE ON caop_emec
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_atualizado_em_caop_emec();

-- 3. Desabilitar RLS (conforme requisito)
ALTER TABLE public.caop_emec DISABLE ROW LEVEL SECURITY;

-- 4. Grants padrão
GRANT SELECT, INSERT, UPDATE, DELETE ON public.caop_emec TO authenticated;
GRANT ALL ON public.caop_emec TO service_role;

-- 5. Registrar painel no catálogo
INSERT INTO paineis (chave, nome_exibicao, descricao, icone) VALUES
  ('caop_emec', 'Caop EMEC', 'Centro de Apoio Operacional — orçamento, custos e O.S.', 'BarChart3')
ON CONFLICT (chave) DO NOTHING;

-- 6. Registrar permissão de visualização
INSERT INTO permissions (key, label, panel_key, is_generic) VALUES
  ('caop_emec.ver', 'Visualizar Caop EMEC', 'caop_emec', false)
ON CONFLICT (key) DO NOTHING;

-- 7. Atribuir painel aos cargos (Administrador, Supervisor, Técnico, Gerente)
INSERT INTO cargo_paineis (cargo_id, painel_id)
SELECT c.id, p.id FROM cargos c, paineis p
WHERE c.nome IN ('Administrador', 'Supervisor', 'Técnico', 'Gerente') AND p.chave = 'caop_emec'
ON CONFLICT DO NOTHING;

-- 8. Atribuir permissão caop_emec.ver aos cargos
INSERT INTO cargo_panel_permissions (cargo_id, permission_id)
SELECT c.id, p.id FROM cargos c, permissions p
WHERE c.nome IN ('Administrador', 'Supervisor', 'Técnico', 'Gerente') AND p.key = 'caop_emec.ver'
ON CONFLICT DO NOTHING;
