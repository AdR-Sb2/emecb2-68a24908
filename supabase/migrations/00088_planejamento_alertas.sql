-- ============================================================
-- Migration: Planejamento — Alertas de Preventiva
-- ============================================================
-- Elevatórias sem OS preventiva executada há muito tempo ficam em
-- alerta, com prazos configuráveis por criticidade (global) e
-- override individual por elevatória.

-- 1. Campo criticidade na tabela elevatorias
ALTER TABLE elevatorias
  ADD COLUMN IF NOT EXISTS criticidade TEXT NOT NULL DEFAULT 'padrao'
    CHECK (criticidade IN ('critica', 'importante', 'padrao'));

-- 2. Tabela de configuração de alertas
--    - Registros com elevatoria_id NULL e criticidade NOT NULL = prazo padrão por criticidade.
--    - Registros com elevatoria_id NOT NULL e criticidade NULL = override individual.
CREATE TABLE IF NOT EXISTS planejamento_alerta_config (
  id BIGSERIAL PRIMARY KEY,
  elevatoria_id BIGINT REFERENCES elevatorias(id) ON DELETE CASCADE,
  criticidade TEXT CHECK (criticidade IN ('critica', 'importante', 'padrao')),
  prazo_dias INTEGER NOT NULL CHECK (prazo_dias > 0),
  atualizado_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (elevatoria_id IS NULL AND criticidade IS NOT NULL)
    OR (elevatoria_id IS NOT NULL AND criticidade IS NULL)
  ),
  CONSTRAINT planejamento_alerta_config_uniq
    UNIQUE NULLS NOT DISTINCT (elevatoria_id, criticidade)
);

ALTER TABLE planejamento_alerta_config DISABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON planejamento_alerta_config TO authenticated;
GRANT SELECT ON planejamento_alerta_config TO anon;

-- 3. Prazos padrão por criticidade
INSERT INTO planejamento_alerta_config (elevatoria_id, criticidade, prazo_dias) VALUES
  (NULL, 'critica', 30),
  (NULL, 'importante', 45),
  (NULL, 'padrao', 60)
ON CONFLICT ON CONSTRAINT planejamento_alerta_config_uniq DO NOTHING;

-- 4. RPC: última preventiva executada por elevatória
--    Tipo preventiva: ZTPF, ZTRE, ZTPC, ZTPD
--    Status executada: status_simplificado IN ('Encerrada', 'Encerrada Técnica')
DROP FUNCTION IF EXISTS alerta_ultima_preventiva();

CREATE OR REPLACE FUNCTION alerta_ultima_preventiva()
RETURNS TABLE (
  elevatoria_id bigint,
  ultima_preventiva date,
  dias_sem_preventiva integer,
  ultima_preventiva_ordem text
)
LANGUAGE sql STABLE
AS $$
  SELECT
    e.id,
    p.ultima,
    CASE WHEN p.ultima IS NULL THEN NULL ELSE (CURRENT_DATE - p.ultima)::integer END,
    p.ordem
  FROM elevatorias e
  LEFT JOIN LATERAL (
    SELECT
      MAX(COALESCE(a.data_modificacao, a.data_entrada))::date AS ultima,
      (
        SELECT b.ordem
        FROM registros_atendimento b
        WHERE b.elevatoria_id = e.id
          AND b.tipo_ordem IN ('ZTPF', 'ZTRE', 'ZTPC', 'ZTPD')
          AND b.status_simplificado IN ('Encerrada', 'Encerrada Técnica')
        ORDER BY COALESCE(b.data_modificacao, b.data_entrada) DESC NULLS LAST, b.id DESC
        LIMIT 1
      ) AS ordem
    FROM registros_atendimento a
    WHERE a.elevatoria_id = e.id
      AND a.tipo_ordem IN ('ZTPF', 'ZTRE', 'ZTPC', 'ZTPD')
      AND a.status_simplificado IN ('Encerrada', 'Encerrada Técnica')
  ) p ON true;
$$;

GRANT EXECUTE ON FUNCTION alerta_ultima_preventiva() TO authenticated, anon;
