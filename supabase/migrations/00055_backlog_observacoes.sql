-- ============================================================
-- Migration: Observações por O.S. no Backlog
-- ============================================================

-- Tabela: backlog_observacoes (comentários livres por Ordem de Manutenção)
CREATE TABLE IF NOT EXISTS backlog_observacoes (
  id BIGSERIAL PRIMARY KEY,
  om TEXT NOT NULL,
  texto TEXT NOT NULL,
  autor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_backlog_observacoes_om ON backlog_observacoes(om);
CREATE INDEX IF NOT EXISTS idx_backlog_observacoes_om_criado_em ON backlog_observacoes(om, criado_em DESC);
