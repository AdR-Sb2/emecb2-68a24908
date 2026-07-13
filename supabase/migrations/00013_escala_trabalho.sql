-- ============================================================
-- Migration: Escala de Trabalho
-- ============================================================

-- 1. Colaboradores
CREATE TABLE IF NOT EXISTS colaboradores_escala (
  id BIGSERIAL PRIMARY KEY,
  time_nome TEXT NOT NULL DEFAULT 'EMEC Baixada 2',
  equipe TEXT NOT NULL,          -- C1, C2, C3, C4, P1, P2, Férias
  horario TEXT NOT NULL,         -- Diurno / Noturno
  colaborador TEXT NOT NULL,     -- nome completo
  login_sap TEXT DEFAULT '',
  login_field TEXT DEFAULT '',
  funcao TEXT DEFAULT '',
  escala TEXT NOT NULL,          -- Comercial / Plantão 1 / Plantão 2 / Férias
  data_ancora DATE,              -- primeiro dia TRABALHA conhecido (para cálculo 2x2)
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 2. Dias de escala
CREATE TABLE IF NOT EXISTS escala_dias (
  id BIGSERIAL PRIMARY KEY,
  colaborador_id BIGINT NOT NULL REFERENCES colaboradores_escala(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('TRABALHA', 'FOLGA')),
  editado_manual BOOLEAN DEFAULT false,   -- true se foi sobrescrito manualmente
  UNIQUE (colaborador_id, data)
);

-- 3. Painel
INSERT INTO paineis (chave, nome_exibicao, descricao, icone) VALUES
  ('escala_trabalho', 'Escala de Trabalho', 'Equipe, plantões e escala semanal de trabalho.', 'CalendarCheck')
ON CONFLICT (chave) DO NOTHING;
