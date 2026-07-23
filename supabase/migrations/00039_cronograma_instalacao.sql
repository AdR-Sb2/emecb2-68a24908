-- ============================================================
-- Migration: Cronograma de Instalação
-- ============================================================
-- 1. Tabela: cronograma_projetos (cabeçalho de cada cronograma)
CREATE TABLE IF NOT EXISTS cronograma_projetos (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  data_inicio_base DATE NOT NULL,
  duracao_padrao_dias NUMERIC NOT NULL DEFAULT 1,
  campo_agrupamento_label TEXT NOT NULL DEFAULT 'Município',
  visibilidade TEXT NOT NULL DEFAULT 'privado' CHECK (visibilidade IN ('privado', 'publico')),
  link_publico_token UUID UNIQUE,
  criado_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela: cronograma_itens (itens/unidades do cronograma)
CREATE TABLE IF NOT EXISTS cronograma_itens (
  id BIGSERIAL PRIMARY KEY,
  projeto_id BIGINT NOT NULL REFERENCES cronograma_projetos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  grupo TEXT NOT NULL DEFAULT '',
  ordem INT NOT NULL DEFAULT 0,
  duracao_dias NUMERIC,
  data_inicio_calculada DATE,
  data_termino_calculada DATE,
  data_inicio_travada BOOLEAN DEFAULT false,
  cor_grupo TEXT,
  status TEXT NOT NULL DEFAULT 'nao_iniciado' CHECK (status IN ('nao_iniciado', 'em_andamento', 'concluido', 'atrasado')),
  os_referencia TEXT,
  rc_referencia TEXT,
  responsavel_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  metadados JSONB,
  criado_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela: cronograma_comentarios
CREATE TABLE IF NOT EXISTS cronograma_comentarios (
  id BIGSERIAL PRIMARY KEY,
  item_id BIGINT NOT NULL REFERENCES cronograma_itens(id) ON DELETE CASCADE,
  autor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  conteudo TEXT NOT NULL,
  mencionados UUID[] DEFAULT '{}',
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabela: cronograma_auditoria
CREATE TABLE IF NOT EXISTS cronograma_auditoria (
  id BIGSERIAL PRIMARY KEY,
  item_id BIGINT REFERENCES cronograma_itens(id) ON DELETE SET NULL,
  projeto_id BIGINT NOT NULL REFERENCES cronograma_projetos(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  campo_alterado TEXT NOT NULL,
  valor_anterior TEXT,
  valor_novo TEXT,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 5. Tabela: notificacoes (genérica, reaproveitável por outros módulos)
CREATE TABLE IF NOT EXISTS notificacoes (
  id BIGSERIAL PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  referencia_tipo TEXT NOT NULL DEFAULT 'cronograma',
  referencia_id BIGINT,
  mensagem TEXT NOT NULL,
  lida BOOLEAN DEFAULT false,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 6. Índices
CREATE INDEX IF NOT EXISTS idx_cronograma_itens_projeto_id ON cronograma_itens(projeto_id);
CREATE INDEX IF NOT EXISTS idx_cronograma_itens_ordem ON cronograma_itens(projeto_id, ordem);
CREATE INDEX IF NOT EXISTS idx_cronograma_itens_grupo ON cronograma_itens(projeto_id, grupo);
CREATE INDEX IF NOT EXISTS idx_cronograma_comentarios_item_id ON cronograma_comentarios(item_id);
CREATE INDEX IF NOT EXISTS idx_cronograma_auditoria_projeto_id ON cronograma_auditoria(projeto_id);
CREATE INDEX IF NOT EXISTS idx_cronograma_auditoria_item_id ON cronograma_auditoria(item_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario_id ON notificacoes(usuario_id, lida);
CREATE INDEX IF NOT EXISTS idx_cronograma_projetos_criado_por ON cronograma_projetos(criado_por);
CREATE INDEX IF NOT EXISTS idx_cronograma_projetos_visibilidade ON cronograma_projetos(visibilidade);

-- 7. Trigger: atualizado_em para cronograma_projetos
CREATE OR REPLACE FUNCTION atualizar_atualizado_em_cronograma_projetos()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_atualizado_em_cronograma_projetos ON cronograma_projetos;
CREATE TRIGGER trg_atualizado_em_cronograma_projetos
  BEFORE UPDATE ON cronograma_projetos
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_atualizado_em_cronograma_projetos();

-- 8. Trigger: atualizado_em para cronograma_itens
CREATE OR REPLACE FUNCTION atualizar_atualizado_em_cronograma_itens()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_atualizado_em_cronograma_itens ON cronograma_itens;
CREATE TRIGGER trg_atualizado_em_cronograma_itens
  BEFORE UPDATE ON cronograma_itens
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_atualizado_em_cronograma_itens();

-- 9. Função: recalcular datas dos itens de um projeto
CREATE OR REPLACE FUNCTION recalcular_datas_cronograma(p_projeto_id BIGINT)
RETURNS void AS $$
DECLARE
  v_data_base DATE;
  v_duracao_padrao NUMERIC;
  v_item RECORD;
  v_data_atual DATE;
  v_duracao NUMERIC;
BEGIN
  SELECT data_inicio_base, duracao_padrao_dias INTO v_data_base, v_duracao_padrao
  FROM cronograma_projetos WHERE id = p_projeto_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Projeto não encontrado: %', p_projeto_id;
  END IF;

  v_data_atual := v_data_base;

  FOR v_item IN
    SELECT ci.id, ci.duracao_dias, ci.data_inicio_travada, ci.data_inicio_calculada
    FROM cronograma_itens ci
    WHERE ci.projeto_id = p_projeto_id
    ORDER BY ci.ordem ASC
  LOOP
    IF v_item.data_inicio_travada AND v_item.data_inicio_calculada IS NOT NULL THEN
      v_data_atual := v_item.data_inicio_calculada;
    END IF;

    v_duracao := COALESCE(v_item.duracao_dias, v_duracao_padrao);

    UPDATE cronograma_itens
    SET
      data_inicio_calculada = v_data_atual,
      data_termino_calculada = v_data_atual + ((v_duracao - 1)::integer)
    WHERE id = v_item.id;

    v_data_atual := v_data_atual + (v_duracao::integer);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 10. Trigger: recalcular datas após INSERT/UPDATE/DELETE em itens ou UPDATE no projeto
CREATE OR REPLACE FUNCTION trigger_recalcular_datas_cronograma()
RETURNS TRIGGER AS $$
DECLARE
  v_projeto_id BIGINT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_projeto_id := OLD.projeto_id;
  ELSE
    v_projeto_id := NEW.projeto_id;
  END IF;

  PERFORM recalcular_datas_cronograma(v_projeto_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recalcular_datas_itens_insert ON cronograma_itens;
CREATE TRIGGER trg_recalcular_datas_itens_insert
  AFTER INSERT ON cronograma_itens
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalcular_datas_cronograma();

DROP TRIGGER IF EXISTS trg_recalcular_datas_itens_update ON cronograma_itens;
CREATE TRIGGER trg_recalcular_datas_itens_update
  AFTER UPDATE OF ordem, duracao_dias, data_inicio_travada ON cronograma_itens
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalcular_datas_cronograma();

DROP TRIGGER IF EXISTS trg_recalcular_datas_itens_delete ON cronograma_itens;
CREATE TRIGGER trg_recalcular_datas_itens_delete
  AFTER DELETE ON cronograma_itens
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalcular_datas_cronograma();

DROP TRIGGER IF EXISTS trg_recalcular_datas_projeto ON cronograma_projetos;
CREATE TRIGGER trg_recalcular_datas_projeto
  AFTER UPDATE OF data_inicio_base, duracao_padrao_dias ON cronograma_projetos
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalcular_datas_cronograma();

-- 11. Trigger: auditoria para cronograma_itens
CREATE OR REPLACE FUNCTION trigger_auditoria_cronograma_itens()
RETURNS TRIGGER AS $$
DECLARE
  v_old_json JSONB := to_jsonb(OLD);
  v_new_json JSONB := to_jsonb(NEW);
  campos TEXT[] := ARRAY['nome', 'grupo', 'ordem', 'duracao_dias', 'data_inicio_calculada', 'data_termino_calculada', 'status', 'data_inicio_travada', 'cor_grupo', 'os_referencia', 'rc_referencia', 'responsavel_id'];
  v_campo TEXT;
  v_old_val TEXT;
  v_new_val TEXT;
BEGIN
  FOREACH v_campo IN ARRAY campos
  LOOP
    v_old_val := COALESCE(trim(v_old_json->>v_campo), '');
    v_new_val := COALESCE(trim(v_new_json->>v_campo), '');
    IF v_old_val IS DISTINCT FROM v_new_val THEN
      INSERT INTO cronograma_auditoria (item_id, projeto_id, usuario_id, campo_alterado, valor_anterior, valor_novo)
      VALUES (NEW.id, NEW.projeto_id, NEW.criado_por, v_campo, v_old_val, v_new_val);
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auditoria_cronograma_itens ON cronograma_itens;
CREATE TRIGGER trg_auditoria_cronograma_itens
  AFTER UPDATE ON cronograma_itens
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auditoria_cronograma_itens();

-- 12. Trigger: auditoria para cronograma_projetos
CREATE OR REPLACE FUNCTION trigger_auditoria_cronograma_projetos()
RETURNS TRIGGER AS $$
DECLARE
  v_old_json JSONB := to_jsonb(OLD);
  v_new_json JSONB := to_jsonb(NEW);
  campos TEXT[] := ARRAY['nome', 'descricao', 'data_inicio_base', 'duracao_padrao_dias', 'campo_agrupamento_label', 'visibilidade'];
  v_campo TEXT;
  v_old_val TEXT;
  v_new_val TEXT;
BEGIN
  FOREACH v_campo IN ARRAY campos
  LOOP
    v_old_val := COALESCE(trim(v_old_json->>v_campo), '');
    v_new_val := COALESCE(trim(v_new_json->>v_campo), '');
    IF v_old_val IS DISTINCT FROM v_new_val THEN
      INSERT INTO cronograma_auditoria (item_id, projeto_id, usuario_id, campo_alterado, valor_anterior, valor_novo)
      VALUES (NULL, NEW.id, NEW.criado_por, v_campo, v_old_val, v_new_val);
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auditoria_cronograma_projetos ON cronograma_projetos;
CREATE TRIGGER trg_auditoria_cronograma_projetos
  AFTER UPDATE ON cronograma_projetos
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auditoria_cronograma_projetos();

-- 13. Desabilitar RLS (mesmo padrão das outras tabelas do projeto)
ALTER TABLE cronograma_projetos DISABLE ROW LEVEL SECURITY;
ALTER TABLE cronograma_itens DISABLE ROW LEVEL SECURITY;
ALTER TABLE cronograma_comentarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE cronograma_auditoria DISABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes DISABLE ROW LEVEL SECURITY;

-- 14. Registrar painel no catálogo
INSERT INTO paineis (chave, nome_exibicao, descricao, icone) VALUES
  ('cronograma', 'Cronograma de Instalação', 'Planejamento e cronograma de instalações, obras e manutenções', 'CalendarRange')
ON CONFLICT (chave) DO NOTHING;

-- 15. Registrar permissões
INSERT INTO permissions (key, label, panel_key, is_generic) VALUES
  ('cronograma.ver', 'Visualizar cronogramas', 'cronograma', false),
  ('cronograma.criar_projeto', 'Criar projetos de cronograma', 'cronograma', false),
  ('cronograma.editar', 'Editar itens do cronograma', 'cronograma', false),
  ('cronograma.excluir', 'Excluir itens ou projetos', 'cronograma', false),
  ('cronograma.exportar', 'Exportar cronograma (PDF/XLSX)', 'cronograma', false),
  ('cronograma.comentar', 'Comentar em itens do cronograma', 'cronograma', false),
  ('cronograma.gerar_link_publico', 'Gerar link público de apresentação', 'cronograma', false)
ON CONFLICT (key) DO NOTHING;

-- 16. Atribuir painel aos cargos
INSERT INTO cargo_paineis (cargo_id, painel_id)
SELECT c.id, p.id FROM cargos c, paineis p
WHERE c.nome = 'Administrador' AND p.chave = 'cronograma'
ON CONFLICT DO NOTHING;

INSERT INTO cargo_paineis (cargo_id, painel_id)
SELECT c.id, p.id FROM cargos c, paineis p
WHERE c.nome = 'Supervisor' AND p.chave = 'cronograma'
ON CONFLICT DO NOTHING;

-- 17. Atribuir permissões ao Administrador (todas)
INSERT INTO cargo_panel_permissions (cargo_id, permission_id)
SELECT c.id, p.id FROM cargos c, permissions p
WHERE c.nome = 'Administrador' AND p.key LIKE 'cronograma.%'
ON CONFLICT DO NOTHING;

-- 18. Atribuir permissões ao Supervisor (todas exceto excluir)
INSERT INTO cargo_panel_permissions (cargo_id, permission_id)
SELECT c.id, p.id FROM cargos c, permissions p
WHERE c.nome = 'Supervisor' AND p.key IN ('cronograma.ver', 'cronograma.criar_projeto', 'cronograma.editar', 'cronograma.exportar', 'cronograma.comentar', 'cronograma.gerar_link_publico')
ON CONFLICT DO NOTHING;