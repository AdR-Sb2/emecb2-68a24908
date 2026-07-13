-- ============================================================
-- 1. Desabilitar RLS nas tabelas de escala
-- ============================================================
ALTER TABLE colaboradores_escala DISABLE ROW LEVEL SECURITY;
ALTER TABLE escala_dias DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Verificar se criou corretamente
-- ============================================================
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname IN ('colaboradores_escala', 'escala_dias');
-- relrowsecurity = false → RLS desabilitado
