-- ============================================================
-- Migration: Analítico — separa "Sem dados" de "Crítico (só emergencial)"
-- ============================================================
-- Elevatórias sem NENHUMA O.S. no período (0 preventiva, 0 corretiva,
-- 0 ZTPC e ultima_preventiva NULL) agora caem em 'sem_dados' em vez de
-- 'critico_so_emergencial'. As duas categorias não se sobrepõem.

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
  status_plano text
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
    END
  FROM elevatorias e
  LEFT JOIN LATERAL (
    SELECT MAX(data_entrada) AS ultima,
           COUNT(*) FILTER (WHERE data_entrada >= CURRENT_DATE - (janela_meses * interval '1 month')) AS qtd_janela
    FROM registros_atendimento
    WHERE elevatoria_id = e.id AND tipo_ordem IN ('ZTPF', 'ZTPD')
  ) prev ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) FILTER (WHERE data_entrada >= CURRENT_DATE - (janela_meses * interval '1 month')) AS qtd_janela
    FROM registros_atendimento
    WHERE elevatoria_id = e.id AND tipo_ordem IN ('ZNTE', 'ZNTP', 'ZTRE')
  ) corr ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) FILTER (WHERE data_entrada >= CURRENT_DATE - (janela_meses * interval '1 month')) AS qtd_janela
    FROM registros_atendimento
    WHERE elevatoria_id = e.id AND tipo_ordem = 'ZTPC'
  ) ztpc ON true;
$$;
