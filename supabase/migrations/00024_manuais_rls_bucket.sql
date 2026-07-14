-- Desabilitar RLS (mesmo padrão das outras tabelas do projeto)
ALTER TABLE manuais_categorias DISABLE ROW LEVEL SECURITY;
ALTER TABLE manuais DISABLE ROW LEVEL SECURITY;
ALTER TABLE sugestoes DISABLE ROW LEVEL SECURITY;

-- Criar bucket de storage para manuais
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('manuais', 'manuais', true, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;
