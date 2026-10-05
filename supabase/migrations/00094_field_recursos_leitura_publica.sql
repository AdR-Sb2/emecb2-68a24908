-- ============================================================
-- Migration 00094: Leitura anônima de field_recursos
-- ============================================================
-- Sintoma: na rota pública /produtividade/publico/$token o gráfico
-- "OS Participadas por Técnico" exibia o ID do recurso no lugar do
-- nome. Causa: a tabela field_recursos está com RLS habilitado e
-- não existe policy para anon, então o PostgREST devolve 0 linhas
-- (sem erro HTTP) e o dashboard cai no fallback `String(recursoId)`.
--
-- A migration 00082, que faria isso, foi commitada com 0 bytes e
-- por isso nunca aplicou nada. Esta aqui é idempotente e pode ser
-- executada no SQL Editor quantas vezes for preciso.
--
-- Padrão do projeto (README §"RLS"): RLS desabilitado nas tabelas
-- do Dashboard de Produtividade, controle de acesso na aplicação.
-- ============================================================

CREATE TABLE IF NOT EXISTS field_recursos (
  id BIGSERIAL PRIMARY KEY,
  id_recurso INT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE field_recursos DISABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON field_recursos TO authenticated;
GRANT SELECT ON field_recursos TO anon;

NOTIFY pgrst, 'reload schema';
