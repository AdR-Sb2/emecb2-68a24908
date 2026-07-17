-- Testes & Aferições de Ativos
CREATE TABLE testes_afericoes (
  id BIGINT PRIMARY KEY,
  hora_inicio TIMESTAMPTZ,
  hora_conclusao TIMESTAMPTZ,
  email TEXT,
  nome TEXT,
  data_teste DATE,
  tipo_servico TEXT,
  elevatoria TEXT,
  grupo TEXT,
  tensao_v TEXT,
  corrente_a TEXT,
  retaguarda TEXT,
  recalque TEXT,
  corrente_shutoff TEXT,
  retaguarda_shutoff TEXT,
  recalque_shutoff TEXT,
  impossibilidade TEXT,
  servico_executado TEXT,
  nome_colaboradores TEXT,
  observacao TEXT,
  na_chegada TEXT,
  na_saida TEXT,
  status TEXT,
  criado_por TEXT DEFAULT 'IMPORTACAO_PLANILHA',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_testes_data_teste ON testes_afericoes(data_teste);
CREATE INDEX idx_testes_elevatoria ON testes_afericoes(elevatoria);
CREATE INDEX idx_testes_tipo_servico ON testes_afericoes(tipo_servico);
CREATE INDEX idx_testes_grupo ON testes_afericoes(grupo);

-- Função para atualizar atualizado_em automaticamente
CREATE OR REPLACE FUNCTION atualizar_atualizado_em_testes()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_atualizado_em_testes
  BEFORE UPDATE ON testes_afericoes
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_atualizado_em_testes();

-- Desabilitar RLS (mesmo padrão das outras tabelas do projeto)
ALTER TABLE testes_afericoes DISABLE ROW LEVEL SECURITY;