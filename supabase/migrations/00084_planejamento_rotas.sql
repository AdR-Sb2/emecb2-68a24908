-- ============================================================
-- Migration: Backlog — Planejamento de Rotas
-- ============================================================
-- Roteiro de campo: rota de visitas entre elevatórias com O.S.
-- associadas a cada parada. As paradas ficam em JSONB para manter
-- a flexibilidade (mapa + dados da O.S./pendente por parada).
CREATE TABLE IF NOT EXISTS planejamentos (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  autor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  autor_nome TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  paradas JSONB NOT NULL DEFAULT '[]'::jsonb
);

ALTER TABLE planejamentos DISABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON planejamentos TO authenticated;
GRANT SELECT ON planejamentos TO anon;