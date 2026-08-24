-- ============================================================
-- Migration: Atualizar função analitico_tendencia_mensal com total
-- ============================================================

CREATE OR REPLACE FUNCTION analitico_tendencia_mensal(ultimos_meses integer DEFAULT 24, municipios text[] DEFAULT NULL)
RETURNS TABLE (
  mes text,
  preventiva bigint,
  corretiva bigint,
  total bigint
)
LANGUAGE sql STABLE
AS $$
  SELECT
    to_char(serie.mes, 'YYYY-MM') AS mes,
    COUNT(*) FILTER (WHERE a.tipo_ordem IN ('ZTPF', 'ZTPD')) AS preventiva,
    COUNT(*) FILTER (WHERE a.tipo_ordem IN ('ZNTE', 'ZNTP', 'ZTRE')) AS corretiva,
    COUNT(a.tipo_ordem) AS total
  FROM generate_series(
    date_trunc('month', CURRENT_DATE) - ((ultimos_meses - 1) * interval '1 month'),
    date_trunc('month', CURRENT_DATE),
    interval '1 month'
  ) AS serie(mes)
  LEFT JOIN registros_atendimento a
    ON a.elevatoria_id IS NOT NULL
    AND date_trunc('month', COALESCE(a.data_modificacao, a.data_entrada)::timestamp) = serie.mes
    AND (
      municipios IS NULL
      OR a.elevatoria_id IN (
        SELECT e.id FROM elevatorias e WHERE e.municipio = ANY(municipios)
      )
    )
  GROUP BY serie.mes
  ORDER BY serie.mes;
$$;

NOTIFY pgrst, 'reload schema';
