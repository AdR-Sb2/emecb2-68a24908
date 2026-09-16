-- ============================================================
-- Migration: Modelos de O.S. — chave estável por modelo (uid)
-- ============================================================
-- A sync anterior gravava delete-all + insert-all a cada mudança,
-- o que perdia modelos em operações rápidas/concorrentes. Cada
-- modelo passa a ter um `uid` (uuid) estável gerado no cliente,
-- permitindo upsert/delete por linha (idempotente, sem corrida).
ALTER TABLE planejamento_os_modelos ADD COLUMN IF NOT EXISTS uid TEXT;

-- Backfill: linhas existentes ganham um uid derivado do id
UPDATE planejamento_os_modelos SET uid = 'legacy-' || id WHERE uid IS NULL;

ALTER TABLE planejamento_os_modelos ALTER COLUMN uid SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_planejamento_os_modelos_uid ON planejamento_os_modelos(uid);