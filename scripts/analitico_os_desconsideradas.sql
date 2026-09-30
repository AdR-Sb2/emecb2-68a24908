-- Rodar no SQL Editor: O.S. "Desconsiderar" + tendência mensal incluindo notas de SDA
CREATE TABLE IF NOT EXISTS public.analitico_os_desconsideradas (
  ordem TEXT PRIMARY KEY,
  criado_em TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analitico_os_desconsideradas TO authenticated;
GRANT SELECT ON public.analitico_os_desconsideradas TO anon;
GRANT ALL ON public.analitico_os_desconsideradas TO service_role;
ALTER TABLE public.analitico_os_desconsideradas DISABLE ROW LEVEL SECURITY;

DROP FUNCTION IF EXISTS analitico_tendencia_mensal(integer, text[]);
CREATE OR REPLACE FUNCTION analitico_tendencia_mensal(ultimos_meses integer DEFAULT 24, municipios text[] DEFAULT NULL)
RETURNS TABLE (mes text, preventiva bigint, corretiva bigint, total bigint)
LANGUAGE sql STABLE AS $$
  SELECT to_char(serie.mes, 'YYYY-MM'),
    COUNT(*) FILTER (WHERE a.tipo_ordem IN ('ZTPF','ZTPD')),
    COUNT(*) FILTER (WHERE a.tipo_ordem IN ('ZNTE','ZNTP','ZTRE')),
    COUNT(a.id)
  FROM generate_series(date_trunc('month', CURRENT_DATE) - ((ultimos_meses - 1) * interval '1 month'),
                       date_trunc('month', CURRENT_DATE), interval '1 month') AS serie(mes)
  LEFT JOIN registros_atendimento a
    ON date_trunc('month', COALESCE(a.data_modificacao, a.data_entrada)::timestamp) = serie.mes
    AND ((a.elevatoria_id IS NOT NULL AND (municipios IS NULL OR a.elevatoria_id IN
            (SELECT e.id FROM elevatorias e WHERE e.municipio = ANY(municipios))))
      OR (a.elevatoria_id IS NULL AND municipios IS NULL
          AND (a.planta ILIKE '%SDA%' OR a.local_instalacao ILIKE '%SDA%')))
    AND NOT EXISTS (SELECT 1 FROM analitico_os_desconsideradas d WHERE d.ordem = a.ordem)
  GROUP BY serie.mes ORDER BY serie.mes;
$$;
NOTIFY pgrst, 'reload schema';
