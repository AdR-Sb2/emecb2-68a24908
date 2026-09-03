-- ============================================================
-- Migration: Produtividade de Campo (Field)
-- ============================================================

-- 1. field_dias — um registro por dia importado
CREATE TABLE IF NOT EXISTS field_dias (
  id BIGSERIAL PRIMARY KEY,
  data DATE NOT NULL UNIQUE,
  criado_em TIMESTAMPTZ DEFAULT now(),
  observacao_geral TEXT DEFAULT ''
);

-- 2. field_equipes — grupos de técnicos definidos no upload
CREATE TABLE IF NOT EXISTS field_equipes (
  id BIGSERIAL PRIMARY KEY,
  dia_id BIGINT NOT NULL REFERENCES field_dias(id) ON DELETE CASCADE,
  nome_equipe TEXT NOT NULL,
  tecnicos JSONB NOT NULL DEFAULT '[]'::jsonb,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 3. field_atividades — cada linha do CSV importado
CREATE TABLE IF NOT EXISTS field_atividades (
  id BIGSERIAL PRIMARY KEY,
  dia_id BIGINT NOT NULL REFERENCES field_dias(id) ON DELETE CASCADE,
  id_recurso INT,
  id_atividade INT,
  ordem_manutencao BIGINT,
  status TEXT,
  tipo_atividade TEXT,
  prioridade TEXT,
  area_trabalho TEXT,
  texto_breve TEXT,
  centro_trabalho TEXT,
  criticidade TEXT,
  parada BOOLEAN DEFAULT false,
  inicio TIME,
  fim TIME,
  motivo_paralisacao TEXT,
  planta TEXT,
  cidade TEXT
);

-- 4. field_justificativas — edições manuais por equipe
CREATE TABLE IF NOT EXISTS field_justificativas (
  id BIGSERIAL PRIMARY KEY,
  dia_id BIGINT NOT NULL REFERENCES field_dias(id) ON DELETE CASCADE,
  equipe_id BIGINT NOT NULL REFERENCES field_equipes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('suspensa', 'cancelada', 'observacao')),
  id_atividade INT,
  texto TEXT DEFAULT '',
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_field_dias_data ON field_dias(data);
CREATE INDEX IF NOT EXISTS idx_field_equipes_dia ON field_equipes(dia_id);
CREATE INDEX IF NOT EXISTS idx_field_atividades_dia ON field_atividades(dia_id);
CREATE INDEX IF NOT EXISTS idx_field_atividades_recurso ON field_atividades(id_recurso);
CREATE INDEX IF NOT EXISTS idx_field_atividades_status ON field_atividades(status);
CREATE INDEX IF NOT EXISTS idx_field_justificativas_dia ON field_justificativas(dia_id);
CREATE INDEX IF NOT EXISTS idx_field_justificativas_equipe ON field_justificativas(equipe_id);

-- RLS
ALTER TABLE field_dias ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_justificativas ENABLE ROW LEVEL SECURITY;

-- Políticas: leitura para todos autenticados, escrita para todos autenticados
CREATE POLICY "field_dias_select" ON field_dias FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "field_dias_insert" ON field_dias FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "field_dias_update" ON field_dias FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "field_dias_delete" ON field_dias FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "field_equipes_select" ON field_equipes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "field_equipes_insert" ON field_equipes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "field_equipes_update" ON field_equipes FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "field_equipes_delete" ON field_equipes FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "field_atividades_select" ON field_atividades FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "field_atividades_insert" ON field_atividades FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "field_atividades_update" ON field_atividades FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "field_atividades_delete" ON field_atividades FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "field_justificativas_select" ON field_justificativas FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "field_justificativas_insert" ON field_justificativas FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "field_justificativas_update" ON field_justificativas FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "field_justificativas_delete" ON field_justificativas FOR DELETE USING (auth.role() = 'authenticated');
