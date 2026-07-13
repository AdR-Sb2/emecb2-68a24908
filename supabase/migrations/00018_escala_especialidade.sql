ALTER TABLE colaboradores_escala ADD COLUMN IF NOT EXISTS especialidade TEXT DEFAULT '';
ALTER TABLE colaboradores_escala DISABLE ROW LEVEL SECURITY;
