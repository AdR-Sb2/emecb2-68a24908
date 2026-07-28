-- ============================================================
-- Migration: Reestruturar abas Equipamento e Elétrica da Ficha
-- 1. Criar elevatoria_eletrica_geral (1:1) com Alimentação, Concessionária e novo Automação
-- 2. Remover colunas gerais de elevatoria_eletrica (ficam só Painéis + Setpoint por grupo)
-- 3. Remover cod_sap duplicado de elevatoria_equipamento
-- ============================================================

-- ============================================================
-- 1. Criar tabela elevatoria_eletrica_geral
-- ============================================================
CREATE TABLE IF NOT EXISTS elevatoria_eletrica_geral (
  id BIGSERIAL PRIMARY KEY,
  elevatoria_id BIGINT NOT NULL REFERENCES elevatorias(id) ON DELETE CASCADE UNIQUE,
  -- Alimentação
  bt_mt TEXT,
  trafo_kva TEXT,
  -- Concessionária de Energia
  num_cliente TEXT,
  medidor TEXT,
  medidor_apurado TEXT,
  medidor_apurado_data DATE,
  unidade_consumo TEXT,
  endereco_concessionaria TEXT,
  custo_medio_kwh TEXT,
  meses_media_kwh TEXT,
  -- Automação
  tag_painel_aut TEXT,
  pcp TEXT,
  clp TEXT,
  modelo_clp TEXT,
  versao_tea_portal TEXT,
  serial_chip TEXT,
  operadora TEXT,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_elev_eletrica_geral_elevatoria_id ON elevatoria_eletrica_geral(elevatoria_id);

-- Trigger: atualizado_em
CREATE OR REPLACE FUNCTION atualizar_atualizado_em_elev_eletrica_geral()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_atualizado_em_elev_eletrica_geral ON elevatoria_eletrica_geral;
CREATE TRIGGER trg_atualizado_em_elev_eletrica_geral
  BEFORE UPDATE ON elevatoria_eletrica_geral
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_atualizado_em_elev_eletrica_geral();

-- Migrar dados existentes (grupo 1 de cada elevatória) para a nova tabela
INSERT INTO elevatoria_eletrica_geral (
  elevatoria_id,
  bt_mt, trafo_kva,
  num_cliente, medidor, medidor_apurado, medidor_apurado_data,
  unidade_consumo, endereco_concessionaria, custo_medio_kwh, meses_media_kwh,
  pcp, clp
)
SELECT DISTINCT ON (elevatoria_id)
  elevatoria_id,
  bt_mt, trafo_kva,
  num_cliente, medidor, medidor_apurado, medidor_apurado_data,
  unidade_consumo, endereco_concessionaria, custo_medio_kwh, meses_media_kwh,
  pcp, clp
FROM elevatoria_eletrica
ON CONFLICT (elevatoria_id) DO NOTHING;

-- ============================================================
-- 2. Remover colunas gerais de elevatoria_eletrica
-- ============================================================
ALTER TABLE elevatoria_eletrica DROP COLUMN IF EXISTS bt_mt;
ALTER TABLE elevatoria_eletrica DROP COLUMN IF EXISTS trafo_kva;
ALTER TABLE elevatoria_eletrica DROP COLUMN IF EXISTS num_cliente;
ALTER TABLE elevatoria_eletrica DROP COLUMN IF EXISTS medidor;
ALTER TABLE elevatoria_eletrica DROP COLUMN IF EXISTS medidor_apurado;
ALTER TABLE elevatoria_eletrica DROP COLUMN IF EXISTS medidor_apurado_data;
ALTER TABLE elevatoria_eletrica DROP COLUMN IF EXISTS unidade_consumo;
ALTER TABLE elevatoria_eletrica DROP COLUMN IF EXISTS endereco_concessionaria;
ALTER TABLE elevatoria_eletrica DROP COLUMN IF EXISTS custo_medio_kwh;
ALTER TABLE elevatoria_eletrica DROP COLUMN IF EXISTS meses_media_kwh;
ALTER TABLE elevatoria_eletrica DROP COLUMN IF EXISTS clp;
ALTER TABLE elevatoria_eletrica DROP COLUMN IF EXISTS pcp;

-- ============================================================
-- 3. Remover cod_sap duplicado de elevatoria_equipamento
-- ============================================================
ALTER TABLE elevatoria_equipamento DROP COLUMN IF EXISTS cod_sap;

-- ============================================================
-- 4. RLS (mesmo padrão)
-- ============================================================
ALTER TABLE elevatoria_eletrica_geral DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. Trigger de auditoria para a nova tabela
-- ============================================================
DROP TRIGGER IF EXISTS trg_auditoria_elev_eletrica_geral ON elevatoria_eletrica_geral;
CREATE TRIGGER trg_auditoria_elev_eletrica_geral
  AFTER UPDATE ON elevatoria_eletrica_geral
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auditoria_elevatoria_dados_mestres();
