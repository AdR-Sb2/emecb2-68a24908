-- ============================================================
-- Fix: recriar triggers de cronograma_itens para resolver
-- "record 'new' has no field 'projeto_id'"
-- ============================================================
-- O problema: a migration 00067 usou CREATE OR REPLACE FUNCTION
-- mas não recriou os triggers. No PostgreSQL, triggers existentes
-- podem manter referência à versão antiga da função.

-- 1. Trigger de recálculo de datas
DROP TRIGGER IF EXISTS trg_recalcular_datas_itens_insert ON cronograma_itens;
CREATE TRIGGER trg_recalcular_datas_itens_insert
  AFTER INSERT ON cronograma_itens
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalcular_datas_cronograma();

DROP TRIGGER IF EXISTS trg_recalcular_datas_itens_update ON cronograma_itens;
CREATE TRIGGER trg_recalcular_datas_itens_update
  AFTER UPDATE OF ordem, duracao_dias, data_inicio_travada ON cronograma_itens
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalcular_datas_cronograma();

DROP TRIGGER IF EXISTS trg_recalcular_datas_itens_delete ON cronograma_itens;
CREATE TRIGGER trg_recalcular_datas_itens_delete
  AFTER DELETE ON cronograma_itens
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalcular_datas_cronograma();

-- 2. Trigger de auditoria
DROP TRIGGER IF EXISTS trg_auditoria_cronograma_itens ON cronograma_itens;
CREATE TRIGGER trg_auditoria_cronograma_itens
  AFTER UPDATE ON cronograma_itens
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auditoria_cronograma_itens();

-- 3. Trigger de atualizado_em
DROP TRIGGER IF EXISTS trg_atualizado_em_cronograma_itens ON cronograma_itens;
CREATE TRIGGER trg_atualizado_em_cronograma_itens
  BEFORE UPDATE ON cronograma_itens
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_atualizado_em_cronograma_itens();
