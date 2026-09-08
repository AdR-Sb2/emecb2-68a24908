-- ============================================================
-- Migration: Capacidade diária por técnico (produtividade)
-- - field_capacidade_padrao: capacidade padrão por id_recurso
-- - field_capacidade_dia: capacidade configurada por técnico por dia
--   (sobrescreve o padrão quando necessário)
-- ============================================================

CREATE TABLE IF NOT EXISTS field_capacidade_padrao (
  id_recurso INTEGER PRIMARY KEY,
  capacidade_horas NUMERIC NOT NULL DEFAULT 10,
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS field_capacidade_dia (
  dia_id BIGINT NOT NULL,
  id_recurso INTEGER NOT NULL,
  capacidade_horas NUMERIC NOT NULL DEFAULT 10,
  PRIMARY KEY (dia_id, id_recurso)
);

-- Índice auxiliar para consultas por dia
CREATE INDEX IF NOT EXISTS idx_field_capacidade_dia_dia ON field_capacidade_dia(dia_id);

-- RLS no mesmo padrão das demais tabelas field (somente autenticado)
ALTER TABLE field_capacidade_padrao ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_capacidade_dia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "field_capacidade_padrao_select" ON field_capacidade_padrao
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "field_capacidade_padrao_insert" ON field_capacidade_padrao
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "field_capacidade_padrao_update" ON field_capacidade_padrao
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "field_capacidade_padrao_delete" ON field_capacidade_padrao
  FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "field_capacidade_dia_select" ON field_capacidade_dia
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "field_capacidade_dia_insert" ON field_capacidade_dia
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "field_capacidade_dia_update" ON field_capacidade_dia
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "field_capacidade_dia_delete" ON field_capacidade_dia
  FOR DELETE USING (auth.role() = 'authenticated');