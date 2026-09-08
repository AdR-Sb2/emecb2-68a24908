-- ============================================================
-- Migration: Analítico — lista de O.S. por período (exportação Excel)
-- ============================================================
-- A exportação da lista de ordens de serviço precisa filtrar por um
-- período arbitrário: um mês específico, vários meses ou um ano inteiro.
-- A função analitico_os_detalhes passa a aceitar data_inicio/data_fim
-- (comportamento do janela_meses preservado quando as datas são nulas).
DROP FUNCTION IF EXISTS analitico_os_detalhes(integer);

CREATE OR REPLACE FUNCTION analitico_os_detalhes(
  janela_meses integer DEFAULT 12,
  data_inicio date DEFAULT NULL,
  data_fim date DEFAULT NULL
)
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
      COALESCE(a.data_modificacao, a.data_entrada) AS data_fechada,
      COALESCE(a.data_modificacao, a.data_entrada) AS data_efetiva,
      CASE
        WHEN a.tipo_ordem IN ('ZTPF', 'ZTPD') THEN 'preventiva'
        WHEN a.tipo_ordem IN ('ZNTE', 'ZNTP', 'ZTRE') THEN 'corretiva'
        WHEN a.tipo_ordem = 'ZTPC' THEN 'ztpc'
        ELSE NULL
      END AS categoria
    FROM registros_atendimento a
    WHERE a.elevatoria_id IS NOT NULL
      AND a.tipo_ordem IN ('ZTPF', 'ZTPD', 'ZNTE', 'ZNTP', 'ZTRE', 'ZTPC')
      AND (
        (data_inicio IS NOT NULL AND data_fim IS NOT NULL
          AND a.data_entrada >= data_inicio AND a.data_entrada <= data_fim)
        OR
        (data_inicio IS NULL
          AND a.data_entrada >= CURRENT_DATE - (janela_meses * interval '1 month'))
      )
  ) b
  WHERE b.categoria IS NOT NULL
  GROUP BY b.elevatoria_id
$$;

GRANT EXECUTE ON FUNCTION analitico_os_detalhes(integer, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION analitico_os_detalhes(integer, date, date) TO anon;