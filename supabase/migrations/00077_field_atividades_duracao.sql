-- ============================================================
-- Migration: Adiciona coluna duracao_min em field_atividades
-- Duração da OS/atividade em minutos, extraída da coluna
-- "Duração" (HH:MM) do CSV do FIELD.
-- ============================================================

ALTER TABLE field_atividades
ADD COLUMN IF NOT EXISTS duracao_min INT;