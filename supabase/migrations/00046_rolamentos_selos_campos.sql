ALTER TABLE elevatoria_rolamentos_selos
  ADD COLUMN IF NOT EXISTS tem_cadeado TEXT,
  ADD COLUMN IF NOT EXISTS cadeado_padrao TEXT,
  ADD COLUMN IF NOT EXISTS rolamento_la_motor TEXT,
  ADD COLUMN IF NOT EXISTS rolamento_loa_motor TEXT,
  ADD COLUMN IF NOT EXISTS rolamento_la_bomba TEXT,
  ADD COLUMN IF NOT EXISTS rolamento_loa_bomba TEXT,
  ADD COLUMN IF NOT EXISTS mm_bomba TEXT;
