-- ============================================================
-- Migration: Config para link público do Dashboard de Produtividade
-- Armazena o token secreto que libera a rota pública sem login.
-- Segue o mesmo padrão da elevatorias_config (row única, sem RLS).
-- ============================================================

CREATE TABLE IF NOT EXISTS field_config (
  id BIGINT PRIMARY KEY DEFAULT 1,
  link_publico_token TEXT,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT field_config_single_row CHECK (id = 1)
);

-- Trigger para atualizar atualizado_em
CREATE OR REPLACE FUNCTION atualizar_atualizado_em_field_config()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_atualizado_em_field_config ON field_config;
CREATE TRIGGER trg_atualizado_em_field_config
  BEFORE UPDATE ON field_config
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_atualizado_em_field_config();

-- Row padrão
INSERT INTO field_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Anônimos precisam ler o token para validar o link público.
-- (Segue o padrão da elevatorias_config: sem RLS, row única "chave-valor".)
ALTER TABLE field_config DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- Acesso anônimo de leitura para o Dashboard público.
-- Só libera SELECT quando existe um link ativo (token não-NULO).
-- Autenticados continuam com as políticas existentes.
-- ============================================================

DROP POLICY IF EXISTS "field_dias_select_anon_link" ON field_dias;
CREATE POLICY "field_dias_select_anon_link" ON field_dias FOR SELECT TO anon
USING (EXISTS (SELECT 1 FROM field_config WHERE id = 1 AND link_publico_token IS NOT NULL));

DROP POLICY IF EXISTS "field_equipes_select_anon_link" ON field_equipes;
CREATE POLICY "field_equipes_select_anon_link" ON field_equipes FOR SELECT TO anon
USING (EXISTS (SELECT 1 FROM field_config WHERE id = 1 AND link_publico_token IS NOT NULL));

DROP POLICY IF EXISTS "field_atividades_select_anon_link" ON field_atividades;
CREATE POLICY "field_atividades_select_anon_link" ON field_atividades FOR SELECT TO anon
USING (EXISTS (SELECT 1 FROM field_config WHERE id = 1 AND link_publico_token IS NOT NULL));
