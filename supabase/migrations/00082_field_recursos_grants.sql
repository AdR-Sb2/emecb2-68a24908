-- ============================================================
-- Migration: campo recursos de técnicos acessível ao dashboard
-- ============================================================
-- O Dashboard de Produtividade (incluindo a rota pública via token)
-- passeia a usar field_recursos para exibir nomes no gráfico de
-- "OS Participadas por Técnico". Garante a existência da tabela e
-- libera leitura para anon/authenticated.
CREATE TABLE IF NOT EXISTS field_recursos (
  id_recurso bigint PRIMARY KEY,
  nome text NOT NULL
);

ALTER TABLE field_recursos DISABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON field_recursos TO authenticated;
GRANT SELECT ON field_recursos TO anon;