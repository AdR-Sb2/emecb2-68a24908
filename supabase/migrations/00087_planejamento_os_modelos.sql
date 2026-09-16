-- ============================================================
-- Migration: Modelos de O.S. do Planejamento de Rotas
-- ============================================================
-- Modelos reutilizáveis de O.S. ("Preventiva Padrão Bomba",
-- "Inspeção Elétrica Mensal", ...). Ao criar uma O.S. pendente,
-- o usuário pode partir de um modelo pré-preenchido e ajustar
-- o que precisar. São compartilhados por todos os usuários do
-- módulo (RLS desabilitado, padrão do projeto).
CREATE TABLE IF NOT EXISTS planejamento_os_modelos (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo_ordem TEXT NOT NULL,
  planta TEXT,
  equipamento TEXT,
  prioridade TEXT,
  texto_breve TEXT,
  observacoes TEXT,
  criado_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE planejamento_os_modelos DISABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON planejamento_os_modelos TO authenticated;
GRANT SELECT ON planejamento_os_modelos TO anon;