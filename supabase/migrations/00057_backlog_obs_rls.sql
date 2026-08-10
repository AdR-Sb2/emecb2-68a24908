-- ============================================================
-- Migration: Desabilita RLS nas tabelas de observações do Backlog
-- Consistente com equipe_overrides / responsabilidade_overrides
-- (sem RLS, o cliente com publishable key consegue ler/gravar).
-- Sem isso, as observações não persistem (erro 401 "new row
-- violates row-level security policy") e somem após recarregar.
-- ============================================================

ALTER TABLE backlog_obs_unica DISABLE ROW LEVEL SECURITY;
ALTER TABLE backlog_observacoes DISABLE ROW LEVEL SECURITY;
