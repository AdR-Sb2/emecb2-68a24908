-- Migration: Novas categorias de tipo de ordem em registros_atendimento
-- Mapeia os códigos SAP para as novas categorias e faz backfill das linhas existentes.

UPDATE registros_atendimento
SET natureza = CASE tipo_ordem
  WHEN 'ZNTE' THEN 'EMERGENCIAL'
  WHEN 'ZNTP' THEN 'PROGRAMADA'
  WHEN 'ZNTS' THEN 'SERVIÇOS'
  WHEN 'ZTCO' THEN 'CONTROLE OPERACIONAL'
  WHEN 'ZTEN' THEN 'MELHORIA'
  WHEN 'ZTPC' THEN 'PREV. CONDIÇÂO'
  WHEN 'ZTPD' THEN 'PREV. FREQUENCIA'
  WHEN 'ZTPF' THEN 'PREV. FREQUENCIA'
  WHEN 'ZTRE' THEN 'PREV. FREQUENCIA'
  ELSE natureza
END;
