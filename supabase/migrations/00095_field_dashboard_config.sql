-- ============================================================
-- Migration 00095: Configurações do Dashboard de Produtividade
-- Persiste as configurações usadas pelo painel operacional:
--   * meta mensal por mês          (field_metas_mensais)
--   * meta individual por ID       (field_metas_individuais)
--   * máximo de corretivas/mês     (field_config.max_corretivas_mes)
--   * intervalo de comparação KPI  (field_config.intervalo_kpis_seg)
-- Segue o padrão das demais tabelas field_*: row única/consulta
-- simples, RLS desabilitado e controle de acesso feito na
-- aplicação (mesmo padrão da field_config / field_recursos).
-- ============================================================

ALTER TABLE field_config
  ADD COLUMN IF NOT EXISTS max_corretivas_mes INTEGER NOT NULL DEFAULT 0;

ALTER TABLE field_config
  ADD COLUMN IF NOT EXISTS intervalo_kpis_seg INTEGER NOT NULL DEFAULT 10;

CREATE TABLE IF NOT EXISTS field_metas_mensais (
  mes TEXT PRIMARY KEY,
  meta NUMERIC NOT NULL DEFAULT 0,
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS field_metas_individuais (
  id_recurso INTEGER PRIMARY KEY,
  meta NUMERIC NOT NULL DEFAULT 0,
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE field_metas_mensais DISABLE ROW LEVEL SECURITY;
ALTER TABLE field_metas_individuais DISABLE ROW LEVEL SECURITY;
ALTER TABLE field_config DISABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON field_metas_mensais TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON field_metas_individuais TO authenticated;
GRANT SELECT ON field_metas_mensais TO anon;
GRANT SELECT ON field_metas_individuais TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON field_config TO authenticated;
GRANT SELECT ON field_config TO anon;

NOTIFY pgrst, 'reload schema';
