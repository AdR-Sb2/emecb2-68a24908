-- ============================================================
-- Migration: Analítico — data de fechamento da nota
-- ============================================================
-- A data em que a nota foi fechada é a coluna W do SAP
-- 'Data de modif.mestre ordens' (campo registros_atendimento.data_modificacao).
-- Nesta migration o Analítico passa a usar COALESCE(data_modificacao,
-- data_entrada) como data efetiva nos cálculos de status/contagens e expõe
-- a coluna 'Data nota fechada' (fechamento mais recente da elevatória).

-- 1. Analítico por elevatória: usa a data de fechamento da nota
DROP FUNCTION IF EXISTS analitico_manutencao(integer);

CREATE OR REPLACE FUNCTION analitico_manutencao(janela_meses integer DEFAULT 12)
RETURNS TABLE (
  elevatoria_id bigint,
  nome text,
  planta text,
  municipio text,
  ultima_preventiva_valida date,
  dias_sem_preventiva_valida integer,
  qtd_preventiva_valida_janela bigint,
  qtd_corretiva_janela bigint,
  qtd_ztpc_janela bigint,
  razao_corretiva_preventiva numeric,
  status_plano text,
  justificativa_sem_preventiva text,
  data_nota_fechada date
)
LANGUAGE sql STABLE
AS $$
  SELECT
    e.id,
    e.nome,
    e.planta,
    e.municipio,
    prev.ultima,
    CASE WHEN prev.ultima IS NULL THEN NULL ELSE (CURRENT_DATE - prev.ultima) END,
    COALESCE(prev.qtd_janela, 0),
    COALESCE(corr.qtd_janela, 0),
    COALESCE(ztpc.qtd_janela, 0),
    CASE WHEN COALESCE(prev.qtd_janela, 0) = 0 THEN NULL
         ELSE ROUND(COALESCE(corr.qtd_janela, 0)::numeric / prev.qtd_janela, 2)
    END,
    CASE
      WHEN COALESCE(prev.qtd_janela, 0) = 0 AND COALESCE(corr.qtd_janela, 0) = 0 AND prev.ultima IS NULL THEN 'sem_dados'
      WHEN COALESCE(prev.qtd_janela, 0) = 0 AND COALESCE(corr.qtd_janela, 0) > 0 THEN 'critico_so_emergencial'
      WHEN prev.ultima IS NULL THEN 'critico_so_emergencial'
      WHEN (CURRENT_DATE - prev.ultima) >= 90 THEN 'parado'
      WHEN (CURRENT_DATE - prev.ultima) >= 45 THEN 'atrasado'
      ELSE 'normal'
    END,
    e.justificativa_sem_preventiva,
    fech.ultima_fechada
  FROM elevatorias e
  LEFT JOIN LATERAL (
    SELECT MAX(a.data_efetiva) AS ultima,
           COUNT(*) FILTER (WHERE a.data_efetiva >= CURRENT_DATE - (janela_meses * interval '1 month')) AS qtd_janela
    FROM (
      SELECT COALESCE(data_modificacao, data_entrada) AS data_efetiva
      FROM registros_atendimento
      WHERE elevatoria_id = e.id AND tipo_ordem IN ('ZTPF', 'ZTPD')
    ) a
  ) prev ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) FILTER (WHERE a.data_efetiva >= CURRENT_DATE - (janela_meses * interval '1 month')) AS qtd_janela
    FROM (
      SELECT COALESCE(data_modificacao, data_entrada) AS data_efetiva
      FROM registros_atendimento
      WHERE elevatoria_id = e.id AND tipo_ordem IN ('ZNTE', 'ZNTP', 'ZTRE')
    ) a
  ) corr ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) FILTER (WHERE a.data_efetiva >= CURRENT_DATE - (janela_meses * interval '1 month')) AS qtd_janela
    FROM (
      SELECT COALESCE(data_modificacao, data_entrada) AS data_efetiva
      FROM registros_atendimento
      WHERE elevatoria_id = e.id AND tipo_ordem = 'ZTPC'
    ) a
  ) ztpc ON true
  LEFT JOIN LATERAL (
    SELECT MAX(COALESCE(data_modificacao, data_entrada)) AS ultima_fechada
    FROM registros_atendimento
    WHERE elevatoria_id = e.id
  ) fech ON true;
$$;

-- 2. Detalhes das O.S. do Analítico: inclui a data de fechamento da nota
DROP FUNCTION IF EXISTS analitico_os_detalhes(integer);

CREATE OR REPLACE FUNCTION analitico_os_detalhes(janela_meses integer DEFAULT 12)
RETURNS TABLE (
  elevatoria_id bigint,
  preventiva jsonb,
  corretiva jsonb,
  ztpc jsonb
)
LANGUAGE sql STABLE
AS $$
  SELECT
    b.elevatoria_id,
    COALESCE(jsonb_agg(jsonb_build_object(
      'ordem', b.ordem,
      'texto_breve', b.texto_breve,
      'inicio_sla', b.inicio_sla,
      'fim_sla', b.fim_sla,
      'data_entrada', b.data_entrada,
      'data_fechada', b.data_fechada
    ) ORDER BY b.data_efetiva DESC NULLS LAST, b.ordem) FILTER (WHERE b.categoria = 'preventiva'), '[]'::jsonb) AS preventiva,
    COALESCE(jsonb_agg(jsonb_build_object(
      'ordem', b.ordem,
      'texto_breve', b.texto_breve,
      'inicio_sla', b.inicio_sla,
      'fim_sla', b.fim_sla,
      'data_entrada', b.data_entrada,
      'data_fechada', b.data_fechada
    ) ORDER BY b.data_efetiva DESC NULLS LAST, b.ordem) FILTER (WHERE b.categoria = 'corretiva'), '[]'::jsonb) AS corretiva,
    COALESCE(jsonb_agg(jsonb_build_object(
      'ordem', b.ordem,
      'texto_breve', b.texto_breve,
      'inicio_sla', b.inicio_sla,
      'fim_sla', b.fim_sla,
      'data_entrada', b.data_entrada,
      'data_fechada', b.data_fechada
    ) ORDER BY b.data_efetiva DESC NULLS LAST, b.ordem) FILTER (WHERE b.categoria = 'ztpc'), '[]'::jsonb) AS ztpc
  FROM (
    SELECT
      a.elevatoria_id,
      a.ordem,
      a.texto_breve,
      a.inicio_sla,
      a.fim_sla,
      a.data_entrada,
      a.data_modificacao AS data_fechada,
      COALESCE(a.data_modificacao, a.data_entrada) AS data_efetiva,
      CASE
        WHEN a.tipo_ordem IN ('ZTPF', 'ZTPD') THEN 'preventiva'
        WHEN a.tipo_ordem IN ('ZNTE', 'ZNTP', 'ZTRE') THEN 'corretiva'
        WHEN a.tipo_ordem = 'ZTPC' THEN 'ztpc'
        ELSE NULL
      END AS categoria
    FROM registros_atendimento a
    WHERE a.elevatoria_id IS NOT NULL
      AND COALESCE(a.data_modificacao, a.data_entrada) >= CURRENT_DATE - (janela_meses * interval '1 month')
      AND a.tipo_ordem IN ('ZTPF', 'ZTPD', 'ZNTE', 'ZNTP', 'ZTRE', 'ZTPC')
  ) b
  WHERE b.categoria IS NOT NULL
  GROUP BY b.elevatoria_id
$$;