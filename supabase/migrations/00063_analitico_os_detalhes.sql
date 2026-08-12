-- ============================================================
-- Migration: Analítico — SLA das O.S. + detalhes por elevatória
-- ============================================================
-- 1. Colunas de SLA em registros_atendimento (preenchidas na importação
--    das planilhas SAP a partir de "Início do SLA" / "Fim do SLA").
ALTER TABLE registros_atendimento
  ADD COLUMN IF NOT EXISTS inicio_sla TEXT,
  ADD COLUMN IF NOT EXISTS fim_sla TEXT;

-- 2. Função que devolve as O.S. da janela por elevatória e categoria.
--    Categorias: 'preventiva' (ZTPF/ZTPD), 'corretiva' (ZNTE/ZNTP/ZTRE),
--    'ztpc' (ZTPC). Usada nos tooltips/menus das colunas Corretiva e
--    P. Condição do Analítico.
--    As O.S. são agregadas em JSONB por elevatória (1 linha por elevatória)
--    para não esbarrar no limite de 1000 linhas por resposta do PostgREST.
--    DROP antes do CREATE porque a versão anterior tinha outro retorno (42P13).
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
      'data_entrada', b.data_entrada
    ) ORDER BY b.data_entrada DESC NULLS LAST, b.ordem) FILTER (WHERE b.categoria = 'preventiva'), '[]'::jsonb) AS preventiva,
    COALESCE(jsonb_agg(jsonb_build_object(
      'ordem', b.ordem,
      'texto_breve', b.texto_breve,
      'inicio_sla', b.inicio_sla,
      'fim_sla', b.fim_sla,
      'data_entrada', b.data_entrada
    ) ORDER BY b.data_entrada DESC NULLS LAST, b.ordem) FILTER (WHERE b.categoria = 'corretiva'), '[]'::jsonb) AS corretiva,
    COALESCE(jsonb_agg(jsonb_build_object(
      'ordem', b.ordem,
      'texto_breve', b.texto_breve,
      'inicio_sla', b.inicio_sla,
      'fim_sla', b.fim_sla,
      'data_entrada', b.data_entrada
    ) ORDER BY b.data_entrada DESC NULLS LAST, b.ordem) FILTER (WHERE b.categoria = 'ztpc'), '[]'::jsonb) AS ztpc
  FROM (
    SELECT
      a.elevatoria_id,
      a.ordem,
      a.texto_breve,
      a.inicio_sla,
      a.fim_sla,
      a.data_entrada,
      CASE
        WHEN a.tipo_ordem IN ('ZTPF', 'ZTPD') THEN 'preventiva'
        WHEN a.tipo_ordem IN ('ZNTE', 'ZNTP', 'ZTRE') THEN 'corretiva'
        WHEN a.tipo_ordem = 'ZTPC' THEN 'ztpc'
        ELSE NULL
      END AS categoria
    FROM registros_atendimento a
    WHERE a.elevatoria_id IS NOT NULL
      AND a.data_entrada >= CURRENT_DATE - (janela_meses * interval '1 month')
      AND a.tipo_ordem IN ('ZTPF', 'ZTPD', 'ZNTE', 'ZNTP', 'ZTRE', 'ZTPC')
  ) 
  WHERE b.categoria IS NOT NULL
  GROUP BY b.elevatoria_id
$$;
