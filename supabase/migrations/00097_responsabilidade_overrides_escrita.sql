-- ============================================================
-- Migration: Responsabilidade Overrides — escrita com a publishable key
--
-- Mesmo padrão de equipe_overrides / backlog_observacoes (00057).
--
-- A 00030 criou a tabela já com RLS desligado, mas o RLS voltou a ficar
-- ligado nela e o INSERT/UPDATE do front passou a falhar com
--   42501 new row violates row-level security policy
-- Ou seja: nenhuma escolha manual de responsabilidade era gravada
-- (a tabela ficava com 0 linhas e o toast de erro aparecia).
--
-- Com RLS desligado + GRANT, o cliente com a publishable key lê e grava,
-- igual ao resto do Backlog. Rode no SQL Editor (as migrations deste
-- repositório são aplicadas manualmente — ver README).
-- ============================================================

-- Idempotente: se a tabela não existir (banco novo), cria igual à 00030.
CREATE TABLE IF NOT EXISTS responsabilidade_overrides (
  om TEXT PRIMARY KEY,
  responsabilidade TEXT NOT NULL CHECK (
    responsabilidade IN (
      'Planta Inativa',
      'Não atendemos',
      'CDA',
      'Baixada 1',
      'Baixada 2',
      'Outra SUP',
      'Ainda não identificado'
    )
  ),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sem RLS o papel anon (publishable key) consegue ler/gravar.
ALTER TABLE responsabilidade_overrides DISABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON responsabilidade_overrides
  TO anon, authenticated, service_role;
