-- ============================================================
-- Migration: Ficha da Elevatória
-- ============================================================

-- 1. Tabela: elevatorias (identificação básica)
CREATE TABLE IF NOT EXISTS elevatorias (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  planta TEXT,
  tipo TEXT,
  superintendencia TEXT,
  endereco TEXT,
  bairro TEXT,
  municipio TEXT,
  cep TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  inicio_operacao DATE,
  caracteristicas_area TEXT,
  grupo TEXT,
  funcao TEXT,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela: elevatoria_equipamento (Dados do Equipamento Instalado)
CREATE TABLE IF NOT EXISTS elevatoria_equipamento (
  id BIGSERIAL PRIMARY KEY,
  elevatoria_id BIGINT NOT NULL REFERENCES elevatorias(id) ON DELETE CASCADE UNIQUE,
  potencia_motor_cv TEXT,
  rpm TEXT,
  marca_motor TEXT,
  carcaca_motor TEXT,
  tag_motor TEXT,
  tensao_v TEXT,
  corrente_a TEXT,
  mancais_la TEXT,
  mancais_loa TEXT,
  modelo_bomba TEXT,
  tag_bomba TEXT,
  marca_bomba TEXT,
  diametro_rotor_pol TEXT,
  diametro_rotor_mm TEXT,
  tipo_construtivo_elevatoria TEXT,
  bomba_dreno TEXT,
  ponta_eixo_motor TEXT,
  sentido_montagem_motor TEXT,
  flange TEXT,
  forma_construtiva_bomba TEXT,
  vazao_aproximada_m3h TEXT,
  amt_aproximada TEXT,
  capacidade_tratamento TEXT,
  procedencia_mca TEXT,
  cod_sap TEXT,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela: elevatoria_eletrica (Alimentação + Concessionária + Painéis + Automação + Setpoint)
CREATE TABLE IF NOT EXISTS elevatoria_eletrica (
  id BIGSERIAL PRIMARY KEY,
  elevatoria_id BIGINT NOT NULL REFERENCES elevatorias(id) ON DELETE CASCADE UNIQUE,
  bt_mt TEXT,
  trafo_kva TEXT,
  num_cliente TEXT,
  medidor TEXT,
  medidor_apurado TEXT,
  medidor_apurado_data DATE,
  unidade_consumo TEXT,
  endereco_concessionaria TEXT,
  fusivel_pc TEXT,
  disjuntor_pc TEXT,
  regulagem_rele_termico_bimetálico TEXT,
  rele_tempo_delta_y TEXT,
  rele_eletrodo_nivel TEXT,
  monitor_corrente TEXT,
  tamanho_fusivel_nh TEXT,
  corrente_fusivel_nh TEXT,
  corrente_fusivel_dz TEXT,
  tag_painel TEXT,
  tipo_acionamento TEXT,
  fabricante_acionamento TEXT,
  modelo_acionamento TEXT,
  corrente_a_acionamento TEXT,
  tag_acionamento TEXT,
  clp TEXT,
  pcp TEXT,
  retaguarda_liga TEXT,
  retaguarda_desliga TEXT,
  recalque_setpoint TEXT,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabela: elevatoria_hidraulica
CREATE TABLE IF NOT EXISTS elevatoria_hidraulica (
  id BIGSERIAL PRIMARY KEY,
  elevatoria_id BIGINT NOT NULL REFERENCES elevatorias(id) ON DELETE CASCADE UNIQUE,
  succao TEXT,
  recalque TEXT,
  tronco TEXT,
  distancia_ate_elev TEXT,
  tomada_retaguarda TEXT,
  tomada_recalque TEXT,
  eletrodo_superior TEXT,
  eletrodo_inferior TEXT,
  tipo_recalque TEXT,
  cota_elevatoria TEXT,
  cota_maxima TEXT,
  distancia_elev_coordenacao TEXT,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- 5. Tabela: elevatoria_area_influencia
CREATE TABLE IF NOT EXISTS elevatoria_area_influencia (
  id BIGSERIAL PRIMARY KEY,
  elevatoria_id BIGINT NOT NULL REFERENCES elevatorias(id) ON DELETE CASCADE UNIQUE,
  populacao_beneficiada_habitantes TEXT,
  domicilios TEXT,
  comunidades_hospitais_locais_importantes TEXT,
  area_influencia TEXT,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- 6. Tabela: elevatoria_rolamentos_selos (1:N — uma elevatória pode ter mais de um conjunto motor/bomba)
CREATE TABLE IF NOT EXISTS elevatoria_rolamentos_selos (
  id BIGSERIAL PRIMARY KEY,
  elevatoria_id BIGINT NOT NULL REFERENCES elevatorias(id) ON DELETE CASCADE,
  tipo TEXT,
  cadeados_padrao TEXT,
  quantidade_cadeados TEXT,
  rolamento_motor TEXT,
  rolamento_bomba TEXT,
  b_acoplamento TEXT,
  gaxeta TEXT,
  selo_mecanico TEXT,
  data_troca DATE,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- 7. Tabela: elevatoria_implantacao (apenas quando aplicável)
CREATE TABLE IF NOT EXISTS elevatoria_implantacao (
  id BIGSERIAL PRIMARY KEY,
  elevatoria_id BIGINT NOT NULL REFERENCES elevatorias(id) ON DELETE CASCADE UNIQUE,
  tipo TEXT,
  segmento TEXT,
  status TEXT NOT NULL DEFAULT 'planejada'
    CHECK (status IN ('planejada', 'em_construcao', 'instalada', 'em_testes', 'operacional')),
  fase_atual TEXT,
  observacoes_inconformidades TEXT,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- 8. Tabela: elevatoria_implantacao_etapas (checklist)
CREATE TABLE IF NOT EXISTS elevatoria_implantacao_etapas (
  id BIGSERIAL PRIMARY KEY,
  implantacao_id BIGINT NOT NULL REFERENCES elevatoria_implantacao(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  concluida BOOLEAN NOT NULL DEFAULT false,
  ordem INT NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- 9. Tabela: elevatoria_dados_mestres_auditoria
CREATE TABLE IF NOT EXISTS elevatoria_dados_mestres_auditoria (
  id BIGSERIAL PRIMARY KEY,
  elevatoria_id BIGINT NOT NULL REFERENCES elevatorias(id) ON DELETE CASCADE,
  tabela TEXT NOT NULL,
  campo_alterado TEXT NOT NULL,
  valor_anterior TEXT,
  valor_novo TEXT,
  usuario_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 10. Tabela: elevatoria_campo_na (campos marcados como "não aplicável" por elevatória)
CREATE TABLE IF NOT EXISTS elevatoria_campo_na (
  id BIGSERIAL PRIMARY KEY,
  elevatoria_id BIGINT NOT NULL REFERENCES elevatorias(id) ON DELETE CASCADE,
  tabela TEXT NOT NULL,
  campo TEXT NOT NULL,
  motivo TEXT DEFAULT '',
  criado_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE (elevatoria_id, tabela, campo)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_elevatorias_municipio ON elevatorias(municipio);
CREATE INDEX IF NOT EXISTS idx_elevatorias_nome ON elevatorias(nome);
CREATE INDEX IF NOT EXISTS idx_elevatorias_planta ON elevatorias(planta);
CREATE INDEX IF NOT EXISTS idx_elev_equipamento_elevatoria_id ON elevatoria_equipamento(elevatoria_id);
CREATE INDEX IF NOT EXISTS idx_elev_eletrica_elevatoria_id ON elevatoria_eletrica(elevatoria_id);
CREATE INDEX IF NOT EXISTS idx_elev_hidraulica_elevatoria_id ON elevatoria_hidraulica(elevatoria_id);
CREATE INDEX IF NOT EXISTS idx_elev_area_influencia_elevatoria_id ON elevatoria_area_influencia(elevatoria_id);
CREATE INDEX IF NOT EXISTS idx_elev_rolamentos_selos_elevatoria_id ON elevatoria_rolamentos_selos(elevatoria_id);
CREATE INDEX IF NOT EXISTS idx_elev_implantacao_elevatoria_id ON elevatoria_implantacao(elevatoria_id);
CREATE INDEX IF NOT EXISTS idx_elev_implantacao_status ON elevatoria_implantacao(status);
CREATE INDEX IF NOT EXISTS idx_elev_implantacao_etapas_implantacao_id ON elevatoria_implantacao_etapas(implantacao_id);
CREATE INDEX IF NOT EXISTS idx_elev_auditoria_elevatoria_id ON elevatoria_dados_mestres_auditoria(elevatoria_id);
CREATE INDEX IF NOT EXISTS idx_elev_auditoria_criado_em ON elevatoria_dados_mestres_auditoria(elevatoria_id, criado_em);
CREATE INDEX IF NOT EXISTS idx_elev_campo_na_elevatoria_id ON elevatoria_campo_na(elevatoria_id);

-- 11. Trigger: atualizado_em para elevatorias
CREATE OR REPLACE FUNCTION atualizar_atualizado_em_elevatoria()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_atualizado_em_elevatoria ON elevatorias;
CREATE TRIGGER trg_atualizado_em_elevatoria
  BEFORE UPDATE ON elevatorias
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_atualizado_em_elevatoria();

-- 12. Trigger: atualizado_em para elevatoria_equipamento
CREATE OR REPLACE FUNCTION atualizar_atualizado_em_elev_equipamento()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_atualizado_em_elev_equipamento ON elevatoria_equipamento;
CREATE TRIGGER trg_atualizado_em_elev_equipamento
  BEFORE UPDATE ON elevatoria_equipamento
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_atualizado_em_elev_equipamento();

-- 13. Trigger: atualizado_em para elevatoria_eletrica
CREATE OR REPLACE FUNCTION atualizar_atualizado_em_elev_eletrica()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_atualizado_em_elev_eletrica ON elevatoria_eletrica;
CREATE TRIGGER trg_atualizado_em_elev_eletrica
  BEFORE UPDATE ON elevatoria_eletrica
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_atualizado_em_elev_eletrica();

-- 14. Trigger: atualizado_em para elevatoria_hidraulica
CREATE OR REPLACE FUNCTION atualizar_atualizado_em_elev_hidraulica()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_atualizado_em_elev_hidraulica ON elevatoria_hidraulica;
CREATE TRIGGER trg_atualizado_em_elev_hidraulica
  BEFORE UPDATE ON elevatoria_hidraulica
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_atualizado_em_elev_hidraulica();

-- 15. Trigger: atualizado_em para elevatoria_area_influencia
CREATE OR REPLACE FUNCTION atualizar_atualizado_em_elev_area_influencia()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_atualizado_em_elev_area_influencia ON elevatoria_area_influencia;
CREATE TRIGGER trg_atualizado_em_elev_area_influencia
  BEFORE UPDATE ON elevatoria_area_influencia
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_atualizado_em_elev_area_influencia();

-- 16. Trigger: atualizado_em para elevatoria_rolamentos_selos
CREATE OR REPLACE FUNCTION atualizar_atualizado_em_elev_rolamentos_selos()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_atualizado_em_elev_rolamentos_selos ON elevatoria_rolamentos_selos;
CREATE TRIGGER trg_atualizado_em_elev_rolamentos_selos
  BEFORE UPDATE ON elevatoria_rolamentos_selos
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_atualizado_em_elev_rolamentos_selos();

-- 17. Trigger: atualizado_em para elevatoria_implantacao
CREATE OR REPLACE FUNCTION atualizar_atualizado_em_elev_implantacao()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_atualizado_em_elev_implantacao ON elevatoria_implantacao;
CREATE TRIGGER trg_atualizado_em_elev_implantacao
  BEFORE UPDATE ON elevatoria_implantacao
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_atualizado_em_elev_implantacao();

-- 18. Trigger: atualizado_em para elevatoria_implantacao_etapas
CREATE OR REPLACE FUNCTION atualizar_atualizado_em_elev_implantacao_etapas()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_atualizado_em_elev_implantacao_etapas ON elevatoria_implantacao_etapas;
CREATE TRIGGER trg_atualizado_em_elev_implantacao_etapas
  BEFORE UPDATE ON elevatoria_implantacao_etapas
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_atualizado_em_elev_implantacao_etapas();

-- 19. Trigger de auditoria para dados mestres
CREATE OR REPLACE FUNCTION trigger_auditoria_elevatoria_dados_mestres()
RETURNS TRIGGER AS $$
DECLARE
  v_old_json JSONB := to_jsonb(OLD);
  v_new_json JSONB := to_jsonb(NEW);
  v_campos TEXT[];
  v_campo TEXT;
  v_old_val TEXT;
  v_new_val TEXT;
  v_tabela TEXT;
  v_elevatoria_id BIGINT;
BEGIN
  v_tabela := TG_TABLE_NAME;
  v_elevatoria_id := COALESCE(NEW.elevatoria_id, OLD.elevatoria_id);

  SELECT array_agg(column_name::TEXT) INTO v_campos
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = v_tabela
    AND column_name NOT IN ('id', 'elevatoria_id', 'criado_em', 'atualizado_em');

  IF v_campos IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  FOREACH v_campo IN ARRAY v_campos
  LOOP
    v_old_val := COALESCE(trim(v_old_json->>v_campo), '');
    v_new_val := COALESCE(trim(v_new_json->>v_campo), '');
    IF v_old_val IS DISTINCT FROM v_new_val THEN
      INSERT INTO elevatoria_dados_mestres_auditoria (elevatoria_id, tabela, campo_alterado, valor_anterior, valor_novo, usuario_id)
      VALUES (v_elevatoria_id, v_tabela, v_campo, v_old_val, v_new_val, NULL);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auditoria_elev_equipamento ON elevatoria_equipamento;
CREATE TRIGGER trg_auditoria_elev_equipamento
  AFTER UPDATE ON elevatoria_equipamento
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auditoria_elevatoria_dados_mestres();

DROP TRIGGER IF EXISTS trg_auditoria_elev_eletrica ON elevatoria_eletrica;
CREATE TRIGGER trg_auditoria_elev_eletrica
  AFTER UPDATE ON elevatoria_eletrica
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auditoria_elevatoria_dados_mestres();

DROP TRIGGER IF EXISTS trg_auditoria_elev_hidraulica ON elevatoria_hidraulica;
CREATE TRIGGER trg_auditoria_elev_hidraulica
  AFTER UPDATE ON elevatoria_hidraulica
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auditoria_elevatoria_dados_mestres();

DROP TRIGGER IF EXISTS trg_auditoria_elev_area_influencia ON elevatoria_area_influencia;
CREATE TRIGGER trg_auditoria_elev_area_influencia
  AFTER UPDATE ON elevatoria_area_influencia
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auditoria_elevatoria_dados_mestres();

DROP TRIGGER IF EXISTS trg_auditoria_elev_rolamentos_selos ON elevatoria_rolamentos_selos;
CREATE TRIGGER trg_auditoria_elev_rolamentos_selos
  AFTER UPDATE ON elevatoria_rolamentos_selos
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auditoria_elevatoria_dados_mestres();

DROP TRIGGER IF EXISTS trg_auditoria_elev_implantacao ON elevatoria_implantacao;
CREATE TRIGGER trg_auditoria_elev_implantacao
  AFTER UPDATE ON elevatoria_implantacao
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auditoria_elevatoria_dados_mestres();

-- 20. Desabilitar RLS (mesmo padrão das outras tabelas do projeto)
ALTER TABLE elevatorias DISABLE ROW LEVEL SECURITY;
ALTER TABLE elevatoria_equipamento DISABLE ROW LEVEL SECURITY;
ALTER TABLE elevatoria_eletrica DISABLE ROW LEVEL SECURITY;
ALTER TABLE elevatoria_hidraulica DISABLE ROW LEVEL SECURITY;
ALTER TABLE elevatoria_area_influencia DISABLE ROW LEVEL SECURITY;
ALTER TABLE elevatoria_rolamentos_selos DISABLE ROW LEVEL SECURITY;
ALTER TABLE elevatoria_implantacao DISABLE ROW LEVEL SECURITY;
ALTER TABLE elevatoria_implantacao_etapas DISABLE ROW LEVEL SECURITY;
ALTER TABLE elevatoria_dados_mestres_auditoria DISABLE ROW LEVEL SECURITY;
ALTER TABLE elevatoria_campo_na DISABLE ROW LEVEL SECURITY;

-- 21. Registrar painel no catálogo (já existe de 00001, mas garantimos)
INSERT INTO paineis (chave, nome_exibicao, descricao, icone) VALUES
  ('ficha_elevatoria', 'Ficha da Elevatória', 'Ficha técnica completa de elevatórias', 'Building2')
ON CONFLICT (chave) DO NOTHING;

-- 22. Registrar permissões específicas do módulo
INSERT INTO permissions (key, label, panel_key, is_generic) VALUES
  ('ficha_elevatoria.ver', 'Ver fichas de elevatórias', 'ficha_elevatoria', false),
  ('ficha_elevatoria.editar', 'Editar dados básicos das elevatórias', 'ficha_elevatoria', false),
  ('ficha_elevatoria.dados_mestres.ver', 'Ver dados mestres técnicos', 'ficha_elevatoria', false),
  ('ficha_elevatoria.dados_mestres.editar', 'Editar dados mestres técnicos', 'ficha_elevatoria', false),
  ('ficha_elevatoria.exportar', 'Exportar fichas (PDF/XLSX)', 'ficha_elevatoria', false),
  ('ficha_elevatoria.importar', 'Importar planilha de elevatórias', 'ficha_elevatoria', false)
ON CONFLICT (key) DO NOTHING;

-- 23. Atribuir painel aos cargos
-- Administrador (já tem de 00001)
-- Supervisor (já tem de 00008)
-- Técnico: adicionar painel ficha_elevatoria (acesso básico)
INSERT INTO cargo_paineis (cargo_id, painel_id)
SELECT c.id, p.id FROM cargos c, paineis p
WHERE c.nome = 'Técnico' AND p.chave = 'ficha_elevatoria'
ON CONFLICT DO NOTHING;

-- Almoxarife: adicionar painel ficha_elevatoria (acesso a dados mestres)
INSERT INTO cargo_paineis (cargo_id, painel_id)
SELECT c.id, p.id FROM cargos c, paineis p
WHERE c.nome = 'Almoxarife' AND p.chave = 'ficha_elevatoria'
ON CONFLICT DO NOTHING;

-- 24. Atribuir permissões
-- Administrador: todas (já tem via 00012/00014)

-- Supervisor: todas
INSERT INTO cargo_panel_permissions (cargo_id, permission_id)
SELECT c.id, p.id FROM cargos c, permissions p
WHERE c.nome = 'Supervisor' AND p.key LIKE 'ficha_elevatoria.%'
  AND NOT EXISTS (
    SELECT 1 FROM cargo_panel_permissions cpp
    WHERE cpp.cargo_id = c.id AND cpp.permission_id = p.id
  );

-- Técnico: apenas ver dados básicos
INSERT INTO cargo_panel_permissions (cargo_id, permission_id)
SELECT c.id, p.id FROM cargos c, permissions p
WHERE c.nome = 'Técnico' AND p.key = 'ficha_elevatoria.ver'
  AND NOT EXISTS (
    SELECT 1 FROM cargo_panel_permissions cpp
    WHERE cpp.cargo_id = c.id AND cpp.permission_id = p.id
  );

-- Almoxarife: ver dados básicos + ver/editar dados mestres
INSERT INTO cargo_panel_permissions (cargo_id, permission_id)
SELECT c.id, p.id FROM cargos c, permissions p
WHERE c.nome = 'Almoxarife' AND p.key IN (
    'ficha_elevatoria.ver',
    'ficha_elevatoria.editar',
    'ficha_elevatoria.dados_mestres.ver',
    'ficha_elevatoria.dados_mestres.editar',
    'ficha_elevatoria.exportar',
    'ficha_elevatoria.importar'
  )
  AND NOT EXISTS (
    SELECT 1 FROM cargo_panel_permissions cpp
    WHERE cpp.cargo_id = c.id AND cpp.permission_id = p.id
  );
