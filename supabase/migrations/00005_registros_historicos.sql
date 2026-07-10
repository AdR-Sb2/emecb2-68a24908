-- Histórico de movimentações: origem, afeta_saldo, divergencia_cod_sap

ALTER TABLE movimentacoes
  ADD COLUMN IF NOT EXISTS origem TEXT NOT NULL DEFAULT 'SISTEMA'
    CHECK (origem IN ('HISTORICO_PLANILHA','SISTEMA')),
  ADD COLUMN IF NOT EXISTS afeta_saldo BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS divergencia_cod_sap BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS aba_origem TEXT DEFAULT '';

-- Atualizar trigger para respeitar afeta_saldo
CREATE OR REPLACE FUNCTION atualizar_saldo_material()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT NEW.afeta_saldo THEN
    RETURN NEW;
  END IF;
  IF NEW.tipo = 'ENTRADA' THEN
    UPDATE materiais SET saldo_atual = saldo_atual + NEW.quantidade, atualizado_em = now() WHERE cod_sap = NEW.cod_sap;
  ELSIF NEW.tipo = 'SAIDA' THEN
    UPDATE materiais SET saldo_atual = saldo_atual - NEW.quantidade, atualizado_em = now() WHERE cod_sap = NEW.cod_sap;
  ELSIF NEW.tipo = 'AJUSTE' THEN
    UPDATE materiais SET saldo_atual = NEW.quantidade, atualizado_em = now() WHERE cod_sap = NEW.cod_sap;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Também recalcula saldo apenas considerando afeta_saldo = true
CREATE OR REPLACE FUNCTION recalcular_saldo_material()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE materiais m
  SET saldo_atual = COALESCE(
    (SELECT SUM(CASE WHEN tipo = 'ENTRADA' THEN quantidade WHEN tipo = 'SAIDA' THEN -quantidade ELSE 0 END)
     FROM movimentacoes WHERE cod_sap = OLD.cod_sap AND afeta_saldo = true), m.saldo_atual),
    atualizado_em = now()
  WHERE m.cod_sap = OLD.cod_sap;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Função de entrada automática por compra deve gerar afeta_saldo = true
CREATE OR REPLACE FUNCTION criar_entrada_por_compra()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Entregue' AND OLD.status IS DISTINCT FROM 'Entregue' THEN
    INSERT INTO movimentacoes (cod_sap, tipo, quantidade, data, destino, responsavel, observacao, criado_por, origem, afeta_saldo)
    VALUES (
      NEW.cod_sap,
      'ENTRADA',
      NEW.quantidade_solicitada,
      now(),
      'Compra #' || NEW.id,
      NEW.solicitante,
      'Entrada automática - Pedido #' || NEW.numero_pedido || ' - Fornecedor: ' || NEW.fornecedor,
      'sistema',
      'SISTEMA',
      true
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
