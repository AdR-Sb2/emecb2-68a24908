ALTER TABLE colaboradores_escala ADD COLUMN IF NOT EXISTS telefone TEXT DEFAULT '';
ALTER TABLE colaboradores_escala ADD COLUMN IF NOT EXISTS ordem INT DEFAULT 0;
ALTER TABLE colaboradores_escala DISABLE ROW LEVEL SECURITY;

-- Atribuir ordem inicial baseada no id atual
UPDATE colaboradores_escala SET ordem = id WHERE ordem = 0;
