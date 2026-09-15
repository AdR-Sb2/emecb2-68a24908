-- ============================================================
-- Migration: Planejamento de Rotas — Elevatórias pendentes
-- ============================================================
-- Lista de elevatórias marcadas como "pendentes" (para a próxima
-- rota). Guarda a elevação em JSONB, igual ao padrão de `paradas`.
ALTER TABLE planejamentos
  ADD COLUMN IF NOT EXISTS pendentes JSONB NOT NULL DEFAULT '[]'::jsonb;