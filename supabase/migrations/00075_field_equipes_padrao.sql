-- ============================================================
-- Migration: Configuração padrão de equipes de produtividade
-- ============================================================

CREATE TABLE IF NOT EXISTS field_equipes_padrao (
  id BIGSERIAL PRIMARY KEY,
  nome_equipe TEXT NOT NULL,
  tecnicos JSONB NOT NULL DEFAULT '[]'::jsonb,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE field_equipes_padrao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "field_equipes_padrao_select" ON field_equipes_padrao FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "field_equipes_padrao_insert" ON field_equipes_padrao FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "field_equipes_padrao_update" ON field_equipes_padrao FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "field_equipes_padrao_delete" ON field_equipes_padrao FOR DELETE USING (auth.role() = 'authenticated');
