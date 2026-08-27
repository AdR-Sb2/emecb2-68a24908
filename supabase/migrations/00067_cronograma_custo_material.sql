-- ============================================================
-- Migration: Adicionar custo_material aos itens do cronograma
-- ============================================================
ALTER TABLE cronograma_itens
  ADD COLUMN IF NOT EXISTS custo_material NUMERIC DEFAULT 0;

-- Atualizar a função de auditoria para incluir o novo campo
CREATE OR REPLACE FUNCTION trigger_auditoria_cronograma_itens()
RETURNS TRIGGER AS $$
DECLARE
  v_old_json JSONB := to_jsonb(OLD);
  v_new_json JSONB := to_jsonb(NEW);
  campos TEXT[] := ARRAY['nome', 'grupo', 'ordem', 'duracao_dias', 'data_inicio_calculada', 'data_termino_calculada', 'status', 'data_inicio_travada', 'cor_grupo', 'os_referencia', 'rc_referencia', 'responsavel_id', 'custo_material'];
  v_campo TEXT;
  v_old_val TEXT;
  v_new_val TEXT;
BEGIN
  FOREACH v_campo IN ARRAY campos
  LOOP
    v_old_val := COALESCE(trim(v_old_json->>v_campo), '');
    v_new_val := COALESCE(trim(v_new_json->>v_campo), '');
    IF v_old_val IS DISTINCT FROM v_new_val THEN
      INSERT INTO cronograma_auditoria (item_id, projeto_id, usuario_id, campo_alterado, valor_anterior, valor_novo)
      VALUES (NEW.id, NEW.projeto_id, NEW.criado_por, v_campo, v_old_val, v_new_val);
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
