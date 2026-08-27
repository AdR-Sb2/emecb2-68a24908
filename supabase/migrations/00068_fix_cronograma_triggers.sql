-- ============================================================
-- Fix: corrigir trigger_recalcular_datas_cronograma
-- ============================================================
-- O problema: a função trigger_recalcular_datas_cronograma() assume
-- que sempre é chamada de cronograma_itens (usa NEW.projeto_id), mas
-- o trigger trg_recalcular_datas_projeto dispara ela a partir de
-- cronograma_projetos, onde o campo é NEW.id (não NEW.projeto_id).

CREATE OR REPLACE FUNCTION trigger_recalcular_datas_cronograma()
RETURNS TRIGGER AS $$
DECLARE
  v_projeto_id BIGINT;
BEGIN
  IF TG_TABLE_NAME = 'cronograma_projetos' THEN
    -- Disparado a partir de cronograma_projetos: o ID do projeto é NEW.id / OLD.id
    IF TG_OP = 'DELETE' THEN
      v_projeto_id := OLD.id;
    ELSE
      v_projeto_id := NEW.id;
    END IF;
  ELSE
    -- Disparado a partir de cronograma_itens: o ID do projeto é NEW.projeto_id / OLD.projeto_id
    IF TG_OP = 'DELETE' THEN
      v_projeto_id := OLD.projeto_id;
    ELSE
      v_projeto_id := NEW.projeto_id;
    END IF;
  END IF;

  PERFORM recalcular_datas_cronograma(v_projeto_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recriar todos os triggers para garantir referência à versão corrigida

-- Trigger de recálculo de datas (itens)
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

-- Trigger de recálculo de datas (projeto)
DROP TRIGGER IF EXISTS trg_recalcular_datas_projeto ON cronograma_projetos;
CREATE TRIGGER trg_recalcular_datas_projeto
  AFTER UPDATE OF data_inicio_base, duracao_padrao_dias ON cronograma_projetos
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalcular_datas_cronograma();

-- Trigger de auditoria (itens)
DROP TRIGGER IF EXISTS trg_auditoria_cronograma_itens ON cronograma_itens;
CREATE TRIGGER trg_auditoria_cronograma_itens
  AFTER UPDATE ON cronograma_itens
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auditoria_cronograma_itens();

-- Trigger de atualizado_em (itens)
DROP TRIGGER IF EXISTS trg_atualizado_em_cronograma_itens ON cronograma_itens;
CREATE TRIGGER trg_atualizado_em_cronograma_itens
  BEFORE UPDATE ON cronograma_itens
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_atualizado_em_cronograma_itens();
