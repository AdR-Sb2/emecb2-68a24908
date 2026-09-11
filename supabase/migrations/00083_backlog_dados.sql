-- ============================================================
-- Migration: Backlog — banco de dados compartilhado
-- ============================================================
-- O backlog deixa de depender do localStorage de cada navegador:
-- o upload do bucket do Field passa a ser armazenado nesta tabela
-- (linha única id = 1 com o dataset inteiro em JSONB) e lido por
-- todos os usuários.
CREATE TABLE IF NOT EXISTS backlog_dados (
  id integer PRIMARY KEY DEFAULT 1,
  dados jsonb NOT NULL,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE backlog_dados DISABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON backlog_dados TO authenticated;
GRANT SELECT ON backlog_dados TO anon;