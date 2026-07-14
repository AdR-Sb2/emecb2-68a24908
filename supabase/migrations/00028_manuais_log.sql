-- Tabela de log/histórico de alterações do módulo Manuais
CREATE TABLE IF NOT EXISTS manuais_log (
  id BIGSERIAL PRIMARY KEY,
  acao TEXT NOT NULL,
  detalhes JSONB DEFAULT '{}',
  usuario TEXT NOT NULL DEFAULT '',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE manuais_log DISABLE ROW LEVEL SECURITY;
