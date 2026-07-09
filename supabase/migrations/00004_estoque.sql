-- Estoque / Inventory Module for Eletromecânica Baixada 2

-- 1) CADASTRO MESTRE DE MATERIAIS
CREATE TABLE materiais (
  id BIGSERIAL PRIMARY KEY,
  cod_sap TEXT NOT NULL UNIQUE,
  descricao TEXT NOT NULL,
  unidade_medida TEXT NOT NULL DEFAULT 'UN',
  categoria TEXT NOT NULL DEFAULT 'outros',
  fabricante TEXT DEFAULT '',
  local_armazenagem TEXT DEFAULT '',
  estoque_minimo NUMERIC NOT NULL DEFAULT 0,
  material_critico BOOLEAN NOT NULL DEFAULT false,
  vinculo_elevatoria TEXT DEFAULT '',
  ativo BOOLEAN NOT NULL DEFAULT true,
  saldo_atual NUMERIC NOT NULL DEFAULT 0,
  custo_unitario NUMERIC DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) MOVIMENTAÇÕES (entrada/saída/ajuste)
CREATE TABLE movimentacoes (
  id BIGSERIAL PRIMARY KEY,
  cod_sap TEXT NOT NULL REFERENCES materiais(cod_sap) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('ENTRADA','SAIDA','AJUSTE')),
  quantidade NUMERIC NOT NULL,
  data TIMESTAMPTZ NOT NULL DEFAULT now(),
  destino TEXT DEFAULT '',
  solicitante TEXT DEFAULT '',
  responsavel TEXT DEFAULT '',
  observacao TEXT DEFAULT '',
  motivo_ajuste TEXT DEFAULT '',
  criado_por TEXT DEFAULT '',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_movimentacoes_cod_sap ON movimentacoes(cod_sap);
CREATE INDEX idx_movimentacoes_data ON movimentacoes(data);

-- 3) COMPRAS (pedidos de compra)
CREATE TABLE compras (
  id BIGSERIAL PRIMARY KEY,
  cod_sap TEXT NOT NULL REFERENCES materiais(cod_sap) ON DELETE CASCADE,
  quantidade_solicitada NUMERIC NOT NULL,
  quantidade_recebida NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Solicitado' CHECK (status IN ('Solicitado','Aprovado','Comprado','A Caminho','Entregue')),
  data_solicitacao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_prevista_entrega DATE DEFAULT NULL,
  data_entrega_real DATE DEFAULT NULL,
  fornecedor TEXT DEFAULT '',
  numero_pedido TEXT DEFAULT '',
  solicitante TEXT DEFAULT '',
  observacao TEXT DEFAULT '',
  criado_por TEXT DEFAULT '',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_compras_cod_sap ON compras(cod_sap);
CREATE INDEX idx_compras_status ON compras(status);

-- Função: atualizar saldo_atual automaticamente após insert em movimentacoes
CREATE OR REPLACE FUNCTION atualizar_saldo_material()
RETURNS TRIGGER AS $$
BEGIN
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

CREATE TRIGGER trg_atualizar_saldo
  AFTER INSERT ON movimentacoes
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_saldo_material();

-- Também recalcula saldo ao deletar movimentação (útil para administradores)
CREATE OR REPLACE FUNCTION recalcular_saldo_material()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE materiais m
  SET saldo_atual = COALESCE(
    (SELECT SUM(CASE WHEN tipo = 'ENTRADA' THEN quantidade WHEN tipo = 'SAIDA' THEN -quantidade ELSE 0 END)
     FROM movimentacoes WHERE cod_sap = OLD.cod_sap), 0),
    atualizado_em = now()
  WHERE m.cod_sap = OLD.cod_sap;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recalcular_saldo
  AFTER DELETE ON movimentacoes
  FOR EACH ROW
  EXECUTE FUNCTION recalcular_saldo_material();

-- Insere automaticamente movimentação de ENTRADA quando compra é marcada como Entregue
CREATE OR REPLACE FUNCTION criar_entrada_por_compra()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Entregue' AND OLD.status IS DISTINCT FROM 'Entregue' THEN
    INSERT INTO movimentacoes (cod_sap, tipo, quantidade, data, destino, responsavel, observacao, criado_por)
    VALUES (
      NEW.cod_sap,
      'ENTRADA',
      NEW.quantidade_solicitada,
      now(),
      'Compra #' || NEW.id,
      NEW.solicitante,
      'Entrada automática - Pedido #' || NEW.numero_pedido || ' - Fornecedor: ' || NEW.fornecedor,
      'sistema'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_criar_entrada_compra
  AFTER UPDATE OF status ON compras
  FOR EACH ROW
  WHEN (NEW.status = 'Entregue')
  EXECUTE FUNCTION criar_entrada_por_compra();

-- Desabilitar RLS (mesmo padrão das outras tabelas do projeto)
ALTER TABLE materiais DISABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE compras DISABLE ROW LEVEL SECURITY;
