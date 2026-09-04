-- ============================================================
-- Migration: Limpa o campo planta de field_atividades
-- Extrai apenas o código da planta (antes do primeiro espaço),
-- ex: 'PL-RJB-EAT0046 - EAT LIBANEA' -> 'PL-RJB-EAT0046'
-- para permitir o join com a tabela de plantas do Backlog.
-- ============================================================

UPDATE field_atividades
SET planta = UPPER(TRIM(SPLIT_PART(planta, ' ', 1)))
WHERE planta IS NOT NULL
  AND planta <> ''
  AND planta <> UPPER(TRIM(SPLIT_PART(planta, ' ', 1)));
