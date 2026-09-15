-- ============================================================
-- Migration: Planejamento de Rotas — Elevatórias pendentes GLOBAIS
-- ============================================================
-- Antes as pendentes ficavam dentro de cada `planejamentos.pendentes`
-- (JSONB por planejamento). Agora elas passam a ser um conceito geral
-- (compartilhado entre todos os planejamentos): uma lista única de
-- elevatórias marcadas como pendentes. Ao entrar numa rota, a
-- elevatória é "abatida" dessa lista.
--
-- A tabela usa `elevatoria_id UNIQUE` para garantir a lista única.
CREATE TABLE IF NOT EXISTS planejamentos_pendentes (
  id BIGSERIAL PRIMARY KEY,
  elevatoria_id BIGINT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  planta TEXT,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  autor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  autor_nome TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE planejamentos_pendentes DISABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON planejamentos_pendentes TO authenticated;
GRANT SELECT ON planejamentos_pendentes TO anon;

-- ============================================================
-- Backfill: migra as pendentes que já existiam dentro dos
-- planejamentos para a lista global (desduplicado por elevatória,
-- priorizando o planejamento mais recente).
-- ============================================================
INSERT INTO planejamentos_pendentes (elevatoria_id, nome, planta, lat, lon)
SELECT DISTINCT ON ((el->>'id')::bigint)
  (el->>'id')::bigint,
  COALESCE(el->>'nome', ''),
  el->>'planta',
  NULLIF(el->>'lat', '')::double precision,
  NULLIF(el->>'lon', '')::double precision
FROM planejamentos p,
     jsonb_array_elements(COALESCE(p.pendentes, '[]'::jsonb)) AS el
WHERE (el->>'id') IS NOT NULL
  AND (el->>'id') ~ '^-?[0-9]+$'
ORDER BY (el->>'id')::bigint, p.atualizado_em DESC NULLS LAST
ON CONFLICT (elevatoria_id) DO NOTHING;