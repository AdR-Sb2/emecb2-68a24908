-- ==========================================================
-- MIGRAÇÃO: Reestruturação completa da tabela "compras"
-- Baseado na planilha oficial "COMPRAS 22.06 (ultima 08.06).xlsx"
-- ==========================================================

-- 1) DROP da tabela antiga e recriação com nova estrutura
-- (Preserva dados existentes com ALTER se necessário, mas como a estrutura
-- muda completamente, faremos DROP + recriação)
-- Se houver dados na tabela antiga, faça backup antes!

DROP TABLE IF EXISTS compras CASCADE;

CREATE TABLE compras (
  id BIGSERIAL PRIMARY KEY,

  -- Chave de cruzamento (identificador único)
  requisicao BIGINT,
  item_rc BIGINT,
  UNIQUE (requisicao, item_rc),

  -- Dados do material (snapshot da compra)
  cod_sap TEXT,
  descricao_material TEXT,

  -- Dados da requisição
  qtde_rc NUMERIC,
  comprador_cotacao TEXT,
  deposito_rc TEXT,

  -- Dados do pedido
  pedido TEXT,
  fornecedor TEXT,

  -- Status
  status_geral TEXT,

  -- Datas do ciclo de compra
  dt_criacao_rc DATE,
  dt_aprovacao_rc DATE,
  dt_criacao_pedido DATE,
  dt_remessa_pedido DATE,
  data_confirmada DATE,
  emissao_nf DATE,
  dt_pagamento DATE,

  -- Rastreio físico (aba 08.06)
  chegou BOOLEAN NOT NULL DEFAULT false,
  data_chegou DATE,
  foi_retirado BOOLEAN NOT NULL DEFAULT false,
  data_retirado DATE,
  cobrado_via_email BOOLEAN NOT NULL DEFAULT false,

  -- Observação
  observacao TEXT,

  -- Campos internos (preenchidos daqui pra frente)
  solicitante TEXT,
  previsao_uso TEXT,
  rc_em_fila BOOLEAN NOT NULL DEFAULT false,

  -- Controle de saldo
  afeta_saldo BOOLEAN NOT NULL DEFAULT false,

  -- Metadados
  criado_por TEXT DEFAULT '',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_compras_requisicao ON compras(requisicao);
CREATE INDEX idx_compras_item_rc ON compras(item_rc);
CREATE INDEX idx_compras_cod_sap ON compras(cod_sap);
CREATE INDEX idx_compras_status_geral ON compras(status_geral);
CREATE INDEX idx_compras_fornecedor ON compras(fornecedor);
CREATE INDEX idx_compras_comprador ON compras(comprador_cotacao);
CREATE INDEX idx_compras_chegou ON compras(chegou);
CREATE INDEX idx_compras_foi_retirado ON compras(foi_retirado);
CREATE INDEX idx_compras_rc_em_fila ON compras(rc_em_fila);
CREATE INDEX idx_compras_dt_criacao_rc ON compras(dt_criacao_rc);
CREATE INDEX idx_compras_dt_remessa_pedido ON compras(dt_remessa_pedido);

-- 2) Trigger: entrada automática no estoque quando "foi_retirado" vira true
-- Só entra se afeta_saldo = true (compras novas do botão, não histórico)

CREATE OR REPLACE FUNCTION trg_compras_entrada_por_retirada()
RETURNS TRIGGER AS $$
BEGIN
  -- Só dispara se foi_retirado mudou de false para true
  IF NEW.foi_retirado = true AND (OLD.foi_retirado IS DISTINCT FROM true) THEN
    -- Só entra no estoque se afeta_saldo = true
    IF NEW.afeta_saldo = true AND NEW.cod_sap IS NOT NULL THEN
      INSERT INTO movimentacoes (
        cod_sap, tipo, quantidade, data, destino, solicitante,
        observacao, criado_por, origem, afeta_saldo
      ) VALUES (
        NEW.cod_sap,
        'ENTRADA',
        NEW.qtde_rc,
        now(),
        'Compra RC ' || COALESCE(NEW.requisicao::TEXT, '') || ' Item ' || COALESCE(NEW.item_rc::TEXT, ''),
        COALESCE(NEW.solicitante, ''),
        'Entrada automática - Retirada de compra. Fornecedor: ' || COALESCE(NEW.fornecedor, 'N/D'),
        COALESCE(NEW.criado_por, 'sistema'),
        'SISTEMA',
        true
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_compras_retirada_entrada
  AFTER UPDATE OF foi_retirado ON compras
  FOR EACH ROW
  WHEN (NEW.foi_retirado = true AND OLD.foi_retirado IS DISTINCT FROM true)
  EXECUTE FUNCTION trg_compras_entrada_por_retirada();

-- 3) Trigger: atualizar automaticamente "atualizado_em"

CREATE OR REPLACE FUNCTION trg_compras_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_compras_set_updated_at
  BEFORE UPDATE ON compras
  FOR EACH ROW
  EXECUTE FUNCTION trg_compras_updated_at();

-- 4) Desabilitar RLS (mesmo padrão das outras tabelas)
ALTER TABLE compras DISABLE ROW LEVEL SECURITY;
