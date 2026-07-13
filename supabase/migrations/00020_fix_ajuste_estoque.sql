-- Corrige a função de recálculo de saldo para considerar movimentações AJUSTE.
-- Antes, ao deletar uma movimentação AJUSTE, o saldo não era recalculado corretamente
-- porque a função ignorava movimentações do tipo AJUSTE.
CREATE OR REPLACE FUNCTION recalcular_saldo_material()
RETURNS TRIGGER AS $$
DECLARE
  novo_saldo INTEGER := 0;
  mov RECORD;
BEGIN
  FOR mov IN
    SELECT tipo, quantidade FROM movimentacoes
    WHERE cod_sap = OLD.cod_sap
    ORDER BY data ASC
  LOOP
    IF mov.tipo = 'ENTRADA' THEN
      novo_saldo := novo_saldo + mov.quantidade;
    ELSIF mov.tipo = 'SAIDA' THEN
      novo_saldo := novo_saldo - mov.quantidade;
    ELSIF mov.tipo = 'AJUSTE' THEN
      novo_saldo := mov.quantidade;
    END IF;
  END LOOP;

  UPDATE materiais SET saldo_atual = novo_saldo, atualizado_em = now() WHERE cod_sap = OLD.cod_sap;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
