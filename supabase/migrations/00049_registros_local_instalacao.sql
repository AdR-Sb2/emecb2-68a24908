-- ============================================================
-- Migration: Coluna local_instalacao em registros_atendimento
-- Preserva o "Local de instalação" do SAP, já que planta passa a
-- guardar o código da elevatória (coluna "Nome da lista").
-- ============================================================

ALTER TABLE registros_atendimento
  ADD COLUMN IF NOT EXISTS local_instalacao TEXT;
