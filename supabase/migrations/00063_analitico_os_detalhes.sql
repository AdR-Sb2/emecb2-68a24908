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
CREATE OR REPLACE FUNCTION analitico_os_detalhes(janela_meses integer DEFAULT 12)
RETURNS TABLE (
  elevatoria_id bigint,
  categoria text,
  ordem text,
  texto_breve text,
  inicio_sla text,
  fim_sla text,
  data_entrada date
)
LANGUAGE sql STABLE
AS $$
  SELECT
    a.elevatoria_id,
    CASE
      WHEN a.tipo_ordem IN ('ZTPF', 'ZTPD') THEN 'preventiva'
      WHEN a.tipo_ordem IN ('ZNTE', 'ZNTP', 'ZTRE') THEN 'corretiva'
      WHEN a.tipo_ordem = 'ZTPC' THEN 'ztpc'
      ELSE NULL
    END AS categoria,
    a.ordem,
    a.texto_breve,
    a.inicio_sla,
    a.fim_sla,
    a.data_entrada
  FROM registros_atendimento a
  WHERE a.elevatoria_id IS NOT NULL
    AND a.data_entrada >= CURRENT_DATE - (janela_meses * interval '1 month')
    AND a.tipo_ordem IN ('ZTPF', 'ZTPD', 'ZNTE', 'ZNTP', 'ZTRE', 'ZTPC')
  ORDER BY a.elevatoria_id, a.data_entrada DESC NULLS LAST, a.ordem
$$;
