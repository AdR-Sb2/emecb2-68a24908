-- Segue o padrão das demais tabelas do projeto:
-- desabilitar RLS para permitir operações com a chave anônima.
ALTER TABLE colaboradores_escala DISABLE ROW LEVEL SECURITY;
ALTER TABLE escala_dias DISABLE ROW LEVEL SECURITY;
