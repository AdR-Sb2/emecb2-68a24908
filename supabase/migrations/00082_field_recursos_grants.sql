-- ============================================================
-- Migration: campo recursos de técnicos acessível ao dashboard
-- ============================================================
-- O Dashboard de Produtividade (incluindo a rota pública via token)
-- usa field_recursos para exibir nomes no gráfico de
-- "OS Participadas por Técnico". Sem este acesso o anon recebe
-- 0 linhas e a tela mostra o ID do recurso no lugar do nome.
--
-- A tabela é criada pela migration 00074; aqui apenas garantimos
-- a forma dela (idempotente), desligamos o RLS — conforme a regra
-- do projeto: RLS desabilitado, controle de acesso na aplicação —
-- e liberamos leitura para anon/authenticated.
-- ============================================================

CREATE TABLE IF NOT EXISTS field_recursos (
  id BIGSERIAL PRIMARY KEY,
  id_recurso INT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE field_recursos DISABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON field_recursos TO authenticated;
GRANT SELECT ON field_recursos TO anon;

NOTIFY pgrst, 'reload schema';
