CREATE TABLE IF NOT EXISTS plano_manutencao_equipamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  elevatoria_id BIGINT NULL REFERENCES elevatorias(id) ON DELETE SET NULL,

  nome_elevatoria TEXT NOT NULL,
  planta TEXT NOT NULL,

  tag_equipamento TEXT NOT NULL,
  tipo_equipamento TEXT NOT NULL,

  plano_ativo BOOLEAN NOT NULL DEFAULT false,
  movimentado_corretamente BOOLEAN NOT NULL DEFAULT false,

  observacao TEXT NULL,

  criado_por UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  atualizado_por UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,

  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE plano_manutencao_equipamentos
  DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS plano_manutencao_modelos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  nome TEXT NOT NULL UNIQUE,
  tipo_equipamento TEXT NOT NULL,

  tag_sugerida TEXT NULL,
  plano_ativo_padrao BOOLEAN NOT NULL DEFAULT false,
  movimentado_corretamente_padrao BOOLEAN NOT NULL DEFAULT false,

  observacao_padrao TEXT NULL,

  criado_por UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE plano_manutencao_modelos
  DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS plano_manutencao_equipamentos_nome_idx
  ON plano_manutencao_equipamentos(nome_elevatoria);

CREATE INDEX IF NOT EXISTS plano_manutencao_equipamentos_planta_idx
  ON plano_manutencao_equipamentos(planta);

CREATE INDEX IF NOT EXISTS plano_manutencao_equipamentos_plano_ativo_idx
  ON plano_manutencao_equipamentos(plano_ativo);

CREATE INDEX IF NOT EXISTS plano_manutencao_equipamentos_tipo_idx
  ON plano_manutencao_equipamentos(tipo_equipamento);

CREATE OR REPLACE FUNCTION set_plano_manutencao_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_plano_manutencao_equipamentos_updated_at ON plano_manutencao_equipamentos;
CREATE TRIGGER trg_plano_manutencao_equipamentos_updated_at
BEFORE UPDATE ON plano_manutencao_equipamentos
FOR EACH ROW
EXECUTE FUNCTION set_plano_manutencao_updated_at();

DROP TRIGGER IF EXISTS trg_plano_manutencao_modelos_updated_at ON plano_manutencao_modelos;
CREATE TRIGGER trg_plano_manutencao_modelos_updated_at
BEFORE UPDATE ON plano_manutencao_modelos
FOR EACH ROW
EXECUTE FUNCTION set_plano_manutencao_updated_at();

INSERT INTO plano_manutencao_modelos (
  nome,
  tipo_equipamento,
  tag_sugerida,
  plano_ativo_padrao,
  movimentado_corretamente_padrao,
  observacao_padrao
)
VALUES
  ('Inversor', 'Inversor', NULL, false, false, NULL),
  ('Bomba', 'Bomba', NULL, false, false, NULL),
  ('Motor elétrico', 'Motor', NULL, false, false, NULL),
  ('Softstarter', 'Softstarter', NULL, false, false, NULL),
  ('CLP', 'CLP', NULL, false, false, NULL),
  ('Painel elétrico', 'Painel elétrico', NULL, false, false, NULL),
  ('Sensor de nível', 'Sensor', NULL, false, false, NULL),
  ('Válvula', 'Válvula', NULL, false, false, NULL)
ON CONFLICT (nome) DO NOTHING;

GRANT ALL ON TABLE plano_manutencao_equipamentos TO authenticated;
GRANT SELECT ON TABLE plano_manutencao_equipamentos TO anon;
GRANT ALL ON TABLE plano_manutencao_modelos TO authenticated;
GRANT SELECT ON TABLE plano_manutencao_modelos TO anon;
