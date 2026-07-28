ALTER TABLE elevatorias ADD COLUMN IF NOT EXISTS obs TEXT;

CREATE TABLE IF NOT EXISTS elevatoria_registros (
  id BIGSERIAL PRIMARY KEY,
  elevatoria_id BIGINT NOT NULL REFERENCES elevatorias(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

ALTER TABLE elevatoria_registros DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_elevatoria_registros_elevatoria_id ON elevatoria_registros(elevatoria_id);
