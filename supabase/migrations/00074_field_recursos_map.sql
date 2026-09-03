-- ============================================================
-- Migration: Mapeamento ID Recurso → Nome do Técnico
-- ============================================================

CREATE TABLE IF NOT EXISTS field_recursos (
  id BIGSERIAL PRIMARY KEY,
  id_recurso INT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_field_recursos_id_recurso ON field_recursos(id_recurso);

ALTER TABLE field_recursos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "field_recursos_select" ON field_recursos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "field_recursos_insert" ON field_recursos FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "field_recursos_update" ON field_recursos FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "field_recursos_delete" ON field_recursos FOR DELETE USING (auth.role() = 'authenticated');
