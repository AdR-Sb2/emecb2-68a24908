-- ============================================================
-- Migration: Link compartilhável para Ficha da Elevatória
-- ============================================================

-- 1. Tabela de configuração global das elevatórias (1 row)
CREATE TABLE IF NOT EXISTS elevatorias_config (
  id BIGINT PRIMARY KEY DEFAULT 1,
  link_publico_token UUID UNIQUE,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT elevatorias_config_single_row CHECK (id = 1)
);

-- 2. Trigger: atualizar atualizado_em
CREATE OR REPLACE FUNCTION atualizar_atualizado_em_elevatorias_config()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_atualizado_em_elevatorias_config ON elevatorias_config;
CREATE TRIGGER trg_atualizado_em_elevatorias_config
  BEFORE UPDATE ON elevatorias_config
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_atualizado_em_elevatorias_config();

-- 3. Inserir row padrão
INSERT INTO elevatorias_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 4. Desabilitar RLS (padrão do projeto)
ALTER TABLE elevatorias_config DISABLE ROW LEVEL SECURITY;

-- 5. Registrar permissão
INSERT INTO permissions (key, label, panel_key, is_generic) VALUES
  ('ficha_elevatoria.gerar_link_publico', 'Gerar link público de apresentação', 'ficha_elevatoria', false)
ON CONFLICT (key) DO NOTHING;

-- 6. Atribuir ao Administrador
INSERT INTO cargo_panel_permissions (cargo_id, permission_id)
SELECT c.id, p.id FROM cargos c, permissions p
WHERE c.nome = 'Administrador' AND p.key = 'ficha_elevatoria.gerar_link_publico'
ON CONFLICT DO NOTHING;

-- 7. Atribuir ao Supervisor
INSERT INTO cargo_panel_permissions (cargo_id, permission_id)
SELECT c.id, p.id FROM cargos c, permissions p
WHERE c.nome = 'Supervisor' AND p.key = 'ficha_elevatoria.gerar_link_publico'
ON CONFLICT DO NOTHING;
