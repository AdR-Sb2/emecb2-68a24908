-- ============================================================
-- Migration: Responsabilidade Overrides
-- Persiste a escolha manual de responsabilidade para cada O.S.
-- Exatamente igual ao equipe_overrides, mas para responsabilidade.
-- ============================================================

CREATE TABLE IF NOT EXISTS responsabilidade_overrides (
  om TEXT PRIMARY KEY,
  responsabilidade TEXT NOT NULL CHECK (
    responsabilidade IN (
      'Planta Inativa',
      'Não atendemos',
      'CDA',
      'Baixada 1',
      'Baixada 2',
      'Outra SUP',
      'Ainda não identificado'
    )
  ),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE responsabilidade_overrides DISABLE ROW LEVEL SECURITY;
