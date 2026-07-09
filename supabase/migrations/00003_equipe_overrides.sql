-- ============================================================
-- Migration: Equipe Overrides (EMEC / Automação)
-- Persiste a escolha manual de equipe para cada O.S.
-- ============================================================

CREATE TABLE IF NOT EXISTS equipe_overrides (
  om TEXT PRIMARY KEY,
  equipe TEXT NOT NULL CHECK (equipe IN ('EMEC', 'Automação')),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE equipe_overrides DISABLE ROW LEVEL SECURITY;
