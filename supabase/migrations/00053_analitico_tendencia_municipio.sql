-- ============================================================
-- Migration: Tendência mensal com filtro opcional por município
-- ============================================================
-- Adiciona o parâmetro opcional municipios text[] a
-- analitico_tendencia_mensal (NULL = todos os municípios).
-- Permite que o gráfico de tendência e os cards de razão
-- (mês/período/anual) reflitam somente os municípios
-- selecionados no filtro do Analítico.

CREATE OR REPLACE FUNCTION analitico_tendencia_mensal(ultimos_meses integer DEFAULT 24, municipios text[] DEFAULT NULL)
RETURNS TABLE (
  mes text,
  preventiva bigint,
  corretiva bigint
)
LANGUAGE sql STABLE
AS $$
  SELECT
    to_char(serie.mes, 'YYYY-MM') AS mes,
    COUNT(*) FILTER (WHERE a.tipo_ordem IN ('ZTPF', 'ZTPD')) AS preventiva,
    COUNT(*) FILTER (WHERE a.tipo_ordem IN ('ZNTE', 'ZNTP', 'ZTRE')) AS corretiva
  FROM generate_series(
    date_trunc('month', CURRENT_DATE) - ((ultimos_meses - 1) * interval '1 month'),
    date_trunc('month', CURRENT_DATE),
    interval '1 month'
  ) AS serie(mes)
  LEFT JOIN registros_atendimento a
    ON a.elevatoria_id IS NOT NULL
    AND date_trunc('month', a.data_entrada::timestamp) = serie.mes
    AND (
      municipios IS NULL
      OR a.elevatoria_id IN (
        SELECT e.id FROM elevatorias e WHERE e.municipio = ANY(municipios)
      )
    )
  GROUP BY serie.mes
  ORDER BY serie.mes;
$$;
