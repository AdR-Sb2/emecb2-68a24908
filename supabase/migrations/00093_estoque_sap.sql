CREATE TABLE IF NOT EXISTS estoque_setores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_estoque_setores_nome_lower
  ON estoque_setores (lower(nome));

INSERT INTO estoque_setores (nome) VALUES
  ('Eletromecânica'), ('Operação'), ('CDA')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS estoque_pep_vinculos (
  pep TEXT PRIMARY KEY,
  setor_id UUID REFERENCES estoque_setores(id) ON DELETE SET NULL,
  superintendencia TEXT,
  atualizado_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT estoque_pep_vinculos_superintendencia_check CHECK (
    superintendencia IS NULL OR superintendencia IN (
      'BAIXADA 1', 'BAIXADA 2', 'LESTE', 'NORTE', 'CENTRO-SUL', 'SEDE', 'CDA', 'COMUNIDADES'
    )
  )
);

CREATE TABLE IF NOT EXISTS estoque_pep_prioridades (
  pep TEXT PRIMARY KEY,
  motivo TEXT NOT NULL DEFAULT '',
  criado_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS estoque_sap_importacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arquivo_nome TEXT NOT NULL,
  importado_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  importado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_linhas INTEGER NOT NULL DEFAULT 0,
  valor_total_livre NUMERIC NOT NULL DEFAULT 0,
  qtd_peps INTEGER NOT NULL DEFAULT 0,
  ativa BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'processando'
    CHECK (status IN ('processando', 'concluida', 'erro'))
);

CREATE INDEX IF NOT EXISTS idx_estoque_sap_importacoes_data
  ON estoque_sap_importacoes(importado_em DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_estoque_sap_importacoes_ativa
  ON estoque_sap_importacoes(ativa) WHERE ativa;

CREATE TABLE IF NOT EXISTS estoque_sap_itens (
  id BIGSERIAL PRIMARY KEY,
  importacao_id UUID NOT NULL REFERENCES estoque_sap_importacoes(id) ON DELETE CASCADE,
  centro TEXT NOT NULL DEFAULT '',
  deposito TEXT NOT NULL DEFAULT '',
  denominacao_deposito TEXT NOT NULL DEFAULT '',
  material TEXT NOT NULL,
  texto_breve TEXT NOT NULL DEFAULT '',
  unidade TEXT NOT NULL DEFAULT '',
  tipo_material TEXT NOT NULL DEFAULT '',
  grupo_mercadorias TEXT NOT NULL DEFAULT '',
  estoque_especial TEXT NOT NULL DEFAULT '',
  pep TEXT,
  qtd_livre NUMERIC NOT NULL DEFAULT 0,
  valor_livre NUMERIC NOT NULL DEFAULT 0,
  qtd_bloqueada NUMERIC NOT NULL DEFAULT 0,
  valor_bloqueado NUMERIC NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_estoque_sap_itens_importacao
  ON estoque_sap_itens(importacao_id);
CREATE INDEX IF NOT EXISTS idx_estoque_sap_itens_importacao_pep
  ON estoque_sap_itens(importacao_id, pep);
CREATE INDEX IF NOT EXISTS idx_estoque_sap_itens_importacao_deposito
  ON estoque_sap_itens(importacao_id, deposito);
CREATE INDEX IF NOT EXISTS idx_estoque_sap_itens_importacao_material
  ON estoque_sap_itens(importacao_id, material);
CREATE INDEX IF NOT EXISTS idx_estoque_sap_itens_importacao_texto_lower
  ON estoque_sap_itens(importacao_id, lower(texto_breve));
CREATE INDEX IF NOT EXISTS idx_estoque_pep_vinculos_setor
  ON estoque_pep_vinculos(setor_id);

CREATE OR REPLACE FUNCTION atualizar_atualizado_em_estoque_pep_vinculos()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_atualizado_em_estoque_pep_vinculos ON estoque_pep_vinculos;
CREATE TRIGGER trg_atualizado_em_estoque_pep_vinculos
  BEFORE UPDATE ON estoque_pep_vinculos
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_atualizado_em_estoque_pep_vinculos();

ALTER TABLE estoque_setores DISABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_pep_vinculos DISABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_pep_prioridades DISABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_sap_importacoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_sap_itens DISABLE ROW LEVEL SECURITY;

GRANT SELECT ON estoque_setores, estoque_pep_vinculos, estoque_pep_prioridades,
  estoque_sap_importacoes, estoque_sap_itens TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON estoque_setores, estoque_pep_vinculos,
  estoque_pep_prioridades, estoque_sap_importacoes, estoque_sap_itens TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE estoque_sap_itens_id_seq TO authenticated;

CREATE OR REPLACE VIEW vw_estoque_sap AS
SELECT
  i.id,
  i.importacao_id,
  i.centro,
  i.deposito,
  i.denominacao_deposito,
  i.material,
  i.texto_breve,
  i.unidade,
  i.tipo_material,
  i.grupo_mercadorias,
  i.estoque_especial,
  i.pep,
  i.qtd_livre,
  i.valor_livre,
  i.qtd_bloqueada,
  i.valor_bloqueado,
  v.setor_id,
  s.nome AS setor_nome,
  v.superintendencia,
  (v.setor_id IS NOT NULL OR v.superintendencia IS NOT NULL) AS pep_vinculado,
  (p.pep IS NOT NULL) AS prioritario,
  COALESCE(p.motivo, '') AS motivo_prioridade
FROM estoque_sap_itens i
JOIN estoque_sap_importacoes imp ON imp.id = i.importacao_id AND imp.ativa
LEFT JOIN estoque_pep_vinculos v ON v.pep = i.pep
LEFT JOIN estoque_setores s ON s.id = v.setor_id
LEFT JOIN estoque_pep_prioridades p ON p.pep = i.pep;

GRANT SELECT ON vw_estoque_sap TO anon, authenticated;

CREATE OR REPLACE FUNCTION estoque_sap_filtros()
RETURNS JSONB
LANGUAGE SQL
STABLE
AS $$
  SELECT jsonb_build_object(
    'depositos', COALESCE((
      SELECT jsonb_agg(opcao ORDER BY opcao)
      FROM (SELECT DISTINCT deposito AS opcao FROM vw_estoque_sap WHERE deposito <> '') d
    ), '[]'::JSONB),
    'tipos_material', COALESCE((
      SELECT jsonb_agg(opcao ORDER BY opcao)
      FROM (SELECT DISTINCT tipo_material AS opcao FROM vw_estoque_sap WHERE tipo_material <> '') t
    ), '[]'::JSONB),
    'setores', COALESCE((
      SELECT jsonb_agg(opcao ORDER BY opcao)
      FROM (SELECT DISTINCT setor_nome AS opcao FROM vw_estoque_sap WHERE setor_nome IS NOT NULL) s
    ), '[]'::JSONB),
    'superintendencias', COALESCE((
      SELECT jsonb_agg(opcao ORDER BY opcao)
      FROM (SELECT DISTINCT superintendencia AS opcao FROM vw_estoque_sap WHERE superintendencia IS NOT NULL) u
    ), '[]'::JSONB)
  );
$$;

CREATE OR REPLACE FUNCTION estoque_sap_peps_novos_sem_vinculo(p_importacao_id UUID)
RETURNS TABLE (pep TEXT)
LANGUAGE SQL
STABLE
AS $$
  WITH importacao_anterior AS (
    SELECT id
    FROM estoque_sap_importacoes
    WHERE ativa AND status = 'concluida' AND id <> p_importacao_id
    ORDER BY importado_em DESC
    LIMIT 1
  )
  SELECT DISTINCT atual.pep
  FROM estoque_sap_itens atual
  WHERE atual.importacao_id = p_importacao_id
    AND atual.pep IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM estoque_pep_vinculos v
      WHERE v.pep = atual.pep
        AND (v.setor_id IS NOT NULL OR v.superintendencia IS NOT NULL)
    )
    AND NOT EXISTS (
      SELECT 1 FROM estoque_sap_itens anterior
      JOIN importacao_anterior ia ON ia.id = anterior.importacao_id
      WHERE anterior.pep = atual.pep
    )
  ORDER BY atual.pep;
$$;

CREATE OR REPLACE FUNCTION estoque_sap_ativar_importacao(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'É necessário estar autenticado para ativar uma importação.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM estoque_sap_importacoes
    WHERE id = p_id AND status = 'processando'
  ) THEN
    RAISE EXCEPTION 'A importação não existe ou não está pronta para ativação.';
  END IF;

  UPDATE estoque_sap_importacoes SET ativa = false WHERE ativa;
  UPDATE estoque_sap_importacoes
  SET ativa = true, status = 'concluida'
  WHERE id = p_id;

  DELETE FROM estoque_sap_importacoes
  WHERE id NOT IN (
    SELECT id FROM estoque_sap_importacoes
    ORDER BY importado_em DESC
    LIMIT 7
  );
END;
$$;

CREATE OR REPLACE FUNCTION estoque_sap_resumo()
RETURNS JSONB
LANGUAGE SQL
STABLE
AS $$
  SELECT jsonb_build_object(
    'linhas', count(*),
    'valor_total_livre', COALESCE(sum(valor_livre), 0),
    'qtd_peps', count(DISTINCT i.pep) FILTER (WHERE i.pep IS NOT NULL),
    'peps_sem_vinculo', count(DISTINCT i.pep) FILTER (
      WHERE i.pep IS NOT NULL
        AND (v.pep IS NULL OR (v.setor_id IS NULL AND v.superintendencia IS NULL))
    ),
    'peps_prioritarios', count(DISTINCT i.pep) FILTER (
      WHERE i.pep IS NOT NULL AND p.pep IS NOT NULL
    ),
    'novos_peps_sem_vinculo', (
      SELECT count(DISTINCT atual.pep)
      FROM estoque_sap_importacoes ativa
      JOIN estoque_sap_itens atual ON atual.importacao_id = ativa.id
      WHERE ativa.ativa AND ativa.status = 'concluida'
        AND atual.pep IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM estoque_pep_vinculos ev
          WHERE ev.pep = atual.pep
            AND (ev.setor_id IS NOT NULL OR ev.superintendencia IS NOT NULL)
        )
        AND NOT EXISTS (
          SELECT 1
          FROM estoque_sap_itens anterior
          WHERE anterior.pep = atual.pep
            AND anterior.importacao_id = (
              SELECT historica.id
              FROM estoque_sap_importacoes historica
              WHERE historica.status = 'concluida'
                AND historica.importado_em < ativa.importado_em
              ORDER BY historica.importado_em DESC
              LIMIT 1
            )
        )
    )
  )
  FROM vw_estoque_sap i
  LEFT JOIN estoque_pep_vinculos v ON v.pep = i.pep
  LEFT JOIN estoque_pep_prioridades p ON p.pep = i.pep;
$$;

CREATE OR REPLACE FUNCTION estoque_sap_peps()
RETURNS TABLE (
  pep TEXT,
  setor_id UUID,
  setor_nome TEXT,
  superintendencia TEXT,
  prioritario BOOLEAN,
  motivo TEXT,
  qtd_linhas BIGINT
)
LANGUAGE SQL
STABLE
AS $$
  WITH peps AS (
    SELECT i.pep, count(*) AS qtd_linhas
    FROM vw_estoque_sap i
    WHERE i.pep IS NOT NULL
    GROUP BY i.pep
    UNION ALL
    SELECT v.pep, 0::BIGINT
    FROM estoque_pep_vinculos v
    WHERE NOT EXISTS (SELECT 1 FROM vw_estoque_sap i WHERE i.pep = v.pep)
    UNION ALL
    SELECT p.pep, 0::BIGINT
    FROM estoque_pep_prioridades p
    WHERE NOT EXISTS (SELECT 1 FROM vw_estoque_sap i WHERE i.pep = p.pep)
  ), agrupados AS (
    SELECT pep, sum(qtd_linhas)::BIGINT AS qtd_linhas
    FROM peps
    GROUP BY pep
  )
  SELECT a.pep, v.setor_id, s.nome, v.superintendencia,
    (p.pep IS NOT NULL), COALESCE(p.motivo, ''), a.qtd_linhas
  FROM agrupados a
  LEFT JOIN estoque_pep_vinculos v ON v.pep = a.pep
  LEFT JOIN estoque_setores s ON s.id = v.setor_id
  LEFT JOIN estoque_pep_prioridades p ON p.pep = a.pep
  ORDER BY a.pep;
$$;

CREATE OR REPLACE FUNCTION estoque_sap_diferencas(p_base UUID, p_alvo UUID)
RETURNS TABLE (
  tipo TEXT,
  centro TEXT,
  pep TEXT,
  setor TEXT,
  superintendencia TEXT,
  prioritario BOOLEAN,
  motivo TEXT,
  deposito TEXT,
  denominacao_deposito TEXT,
  material TEXT,
  texto_breve TEXT,
  unidade TEXT,
  tipo_material TEXT,
  qtd_anterior NUMERIC,
  qtd_atual NUMERIC,
  delta_qtd NUMERIC,
  valor_anterior NUMERIC,
  valor_atual NUMERIC,
  delta_valor NUMERIC,
  delta_percent NUMERIC,
  bloqueado_anterior NUMERIC,
  bloqueado_atual NUMERIC
)
LANGUAGE SQL
STABLE
AS $$
  WITH base AS (
    SELECT i.centro, i.deposito, i.material, i.pep,
      max(i.denominacao_deposito) AS denominacao_deposito,
      max(i.texto_breve) AS texto_breve,
      max(i.unidade) AS unidade,
      max(i.tipo_material) AS tipo_material,
      sum(i.qtd_livre) AS qtd_livre,
      sum(i.valor_livre) AS valor_livre,
      sum(i.qtd_bloqueada) AS qtd_bloqueada
    FROM estoque_sap_itens i
    WHERE i.importacao_id = p_base
    GROUP BY i.centro, i.deposito, i.material, i.pep
  ), alvo AS (
    SELECT i.centro, i.deposito, i.material, i.pep,
      max(i.denominacao_deposito) AS denominacao_deposito,
      max(i.texto_breve) AS texto_breve,
      max(i.unidade) AS unidade,
      max(i.tipo_material) AS tipo_material,
      sum(i.qtd_livre) AS qtd_livre,
      sum(i.valor_livre) AS valor_livre,
      sum(i.qtd_bloqueada) AS qtd_bloqueada
    FROM estoque_sap_itens i
    WHERE i.importacao_id = p_alvo
    GROUP BY i.centro, i.deposito, i.material, i.pep
  ), comparado AS (
    SELECT
      COALESCE(a.centro, b.centro) AS centro,
      COALESCE(a.deposito, b.deposito) AS deposito,
      COALESCE(a.material, b.material) AS material,
      COALESCE(a.pep, b.pep) AS pep,
      COALESCE(a.denominacao_deposito, b.denominacao_deposito) AS denominacao_deposito,
      COALESCE(a.texto_breve, b.texto_breve) AS texto_breve,
      COALESCE(a.unidade, b.unidade) AS unidade,
      COALESCE(a.tipo_material, b.tipo_material) AS tipo_material,
      b.qtd_livre AS qtd_anterior,
      a.qtd_livre AS qtd_atual,
      b.valor_livre AS valor_anterior,
      a.valor_livre AS valor_atual,
      b.qtd_bloqueada AS bloqueado_anterior,
      a.qtd_bloqueada AS bloqueado_atual,
      b.material IS NULL AS era_novo
    FROM base b
    FULL OUTER JOIN alvo a
      ON a.centro = b.centro
      AND a.deposito = b.deposito
      AND a.material = b.material
      AND COALESCE(a.pep, '') = COALESCE(b.pep, '')
  )
  SELECT
    CASE
      WHEN c.era_novo THEN 'Novo'
      WHEN c.qtd_atual IS NULL OR c.qtd_atual = 0 THEN 'Zerado'
      WHEN c.qtd_atual > c.qtd_anterior THEN 'Aumentou'
      ELSE 'Reduziu'
    END,
    c.centro,
    c.pep,
    s.nome,
    v.superintendencia,
    (p.pep IS NOT NULL),
    COALESCE(p.motivo, ''),
    c.deposito,
    c.denominacao_deposito,
    c.material,
    c.texto_breve,
    c.unidade,
    c.tipo_material,
    c.qtd_anterior,
    c.qtd_atual,
    COALESCE(c.qtd_atual, 0) - COALESCE(c.qtd_anterior, 0),
    c.valor_anterior,
    c.valor_atual,
    COALESCE(c.valor_atual, 0) - COALESCE(c.valor_anterior, 0),
    CASE
      WHEN COALESCE(c.valor_anterior, 0) = 0 THEN NULL
      ELSE ((COALESCE(c.valor_atual, 0) - c.valor_anterior) / abs(c.valor_anterior)) * 100
    END,
    c.bloqueado_anterior,
    c.bloqueado_atual
  FROM comparado c
  LEFT JOIN estoque_pep_vinculos v ON v.pep = c.pep
  LEFT JOIN estoque_setores s ON s.id = v.setor_id
  LEFT JOIN estoque_pep_prioridades p ON p.pep = c.pep
  WHERE c.era_novo
    OR (COALESCE(c.qtd_anterior, 0) > 0 AND (c.qtd_atual IS NULL OR c.qtd_atual = 0))
    OR (c.qtd_atual IS NOT NULL AND c.qtd_anterior IS NOT NULL AND c.qtd_atual <> c.qtd_anterior);
$$;

CREATE OR REPLACE FUNCTION estoque_sap_comparar_resumo(p_base UUID, p_alvo UUID)
RETURNS JSONB
LANGUAGE SQL
STABLE
AS $$
  SELECT jsonb_build_object(
    'novos', count(*) FILTER (WHERE d.tipo = 'Novo'),
    'zerados', count(*) FILTER (WHERE d.tipo = 'Zerado'),
    'aumentaram', count(*) FILTER (WHERE d.tipo = 'Aumentou'),
    'reduziram', count(*) FILTER (WHERE d.tipo = 'Reduziu'),
    'delta_valor', COALESCE(sum(d.delta_valor), 0),
    'alteracoes_prioritarias', count(*) FILTER (WHERE d.prioritario),
    'delta_prioritarios', COALESCE(sum(d.delta_valor) FILTER (WHERE d.prioritario), 0)
  )
  FROM estoque_sap_diferencas(p_base, p_alvo) d;
$$;

CREATE OR REPLACE FUNCTION estoque_sap_comparar(
  p_base UUID,
  p_alvo UUID,
  p_filtros JSONB DEFAULT '{}'::JSONB,
  p_limit INTEGER DEFAULT 200,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  total_count BIGINT,
  tipo TEXT,
  centro TEXT,
  pep TEXT,
  setor TEXT,
  superintendencia TEXT,
  prioritario BOOLEAN,
  motivo TEXT,
  deposito TEXT,
  denominacao_deposito TEXT,
  material TEXT,
  texto_breve TEXT,
  unidade TEXT,
  tipo_material TEXT,
  qtd_anterior NUMERIC,
  qtd_atual NUMERIC,
  delta_qtd NUMERIC,
  valor_anterior NUMERIC,
  valor_atual NUMERIC,
  delta_valor NUMERIC,
  delta_percent NUMERIC,
  bloqueado_anterior NUMERIC,
  bloqueado_atual NUMERIC
)
LANGUAGE SQL
STABLE
AS $$
  WITH filtrado AS (
    SELECT d.*
    FROM estoque_sap_diferencas(p_base, p_alvo) d
    WHERE (COALESCE(p_filtros->>'tipo', '') = '' OR d.tipo = p_filtros->>'tipo')
      AND (COALESCE(p_filtros->>'setor', '') = '' OR d.setor = p_filtros->>'setor')
      AND (COALESCE(p_filtros->>'superintendencia', '') = '' OR d.superintendencia = p_filtros->>'superintendencia')
      AND (COALESCE(p_filtros->>'deposito', '') = '' OR d.deposito = p_filtros->>'deposito')
      AND (COALESCE(p_filtros->>'pep', '') = '' OR d.pep ILIKE '%' || (p_filtros->>'pep') || '%')
      AND (COALESCE((p_filtros->>'somente_pep')::BOOLEAN, false) = false OR d.pep IS NOT NULL)
      AND (COALESCE((p_filtros->>'somente_sem_vinculo')::BOOLEAN, false) = false
        OR (d.pep IS NOT NULL AND d.setor IS NULL AND d.superintendencia IS NULL))
      AND (COALESCE(p_filtros->>'busca', '') = '' OR (
        d.material ILIKE '%' || (p_filtros->>'busca') || '%'
        OR d.texto_breve ILIKE '%' || (p_filtros->>'busca') || '%'
        OR COALESCE(d.pep, '') ILIKE '%' || (p_filtros->>'busca') || '%'
        OR d.deposito ILIKE '%' || (p_filtros->>'busca') || '%'
      ))
      AND (COALESCE((p_filtros->>'somente_prioritarios')::BOOLEAN, false) = false OR d.prioritario)
      AND (COALESCE((p_filtros->>'com_bloqueado')::BOOLEAN, false) = false OR COALESCE(d.bloqueado_atual, 0) > 0)
  ), com_total AS (
    SELECT count(*) OVER () AS total_count, f.*
    FROM filtrado f
  )
  SELECT c.total_count, c.tipo, c.centro, c.pep, c.setor, c.superintendencia,
    c.prioritario, c.motivo, c.deposito, c.denominacao_deposito, c.material,
    c.texto_breve, c.unidade, c.tipo_material, c.qtd_anterior, c.qtd_atual,
    c.delta_qtd, c.valor_anterior, c.valor_atual, c.delta_valor,
    c.delta_percent,
    c.bloqueado_anterior, c.bloqueado_atual
  FROM com_total c
  ORDER BY c.prioritario DESC,
    CASE WHEN p_filtros->>'ordem' = 'tipo' AND p_filtros->>'direcao' = 'asc' THEN c.tipo END ASC,
    CASE WHEN p_filtros->>'ordem' = 'tipo' AND p_filtros->>'direcao' = 'desc' THEN c.tipo END DESC,
    CASE WHEN p_filtros->>'ordem' = 'pep' AND p_filtros->>'direcao' = 'asc' THEN c.pep END ASC,
    CASE WHEN p_filtros->>'ordem' = 'pep' AND p_filtros->>'direcao' = 'desc' THEN c.pep END DESC,
    CASE WHEN p_filtros->>'ordem' = 'setor' AND p_filtros->>'direcao' = 'asc' THEN c.setor END ASC,
    CASE WHEN p_filtros->>'ordem' = 'setor' AND p_filtros->>'direcao' = 'desc' THEN c.setor END DESC,
    CASE WHEN p_filtros->>'ordem' = 'superintendencia' AND p_filtros->>'direcao' = 'asc' THEN c.superintendencia END ASC,
    CASE WHEN p_filtros->>'ordem' = 'superintendencia' AND p_filtros->>'direcao' = 'desc' THEN c.superintendencia END DESC,
    CASE WHEN p_filtros->>'ordem' = 'deposito' AND p_filtros->>'direcao' = 'asc' THEN c.deposito END ASC,
    CASE WHEN p_filtros->>'ordem' = 'deposito' AND p_filtros->>'direcao' = 'desc' THEN c.deposito END DESC,
    CASE WHEN p_filtros->>'ordem' = 'texto_breve' AND p_filtros->>'direcao' = 'asc' THEN c.texto_breve END ASC,
    CASE WHEN p_filtros->>'ordem' = 'texto_breve' AND p_filtros->>'direcao' = 'desc' THEN c.texto_breve END DESC,
    CASE WHEN p_filtros->>'ordem' = 'material' AND p_filtros->>'direcao' = 'asc' THEN c.material END ASC,
    CASE WHEN p_filtros->>'ordem' = 'material' AND p_filtros->>'direcao' = 'desc' THEN c.material END DESC,
    CASE WHEN p_filtros->>'ordem' = 'qtd_anterior' AND p_filtros->>'direcao' = 'asc' THEN c.qtd_anterior END ASC,
    CASE WHEN p_filtros->>'ordem' = 'qtd_anterior' AND p_filtros->>'direcao' = 'desc' THEN c.qtd_anterior END DESC,
    CASE WHEN p_filtros->>'ordem' = 'qtd_atual' AND p_filtros->>'direcao' = 'asc' THEN c.qtd_atual END ASC,
    CASE WHEN p_filtros->>'ordem' = 'qtd_atual' AND p_filtros->>'direcao' = 'desc' THEN c.qtd_atual END DESC,
    CASE WHEN p_filtros->>'ordem' = 'valor_anterior' AND p_filtros->>'direcao' = 'asc' THEN c.valor_anterior END ASC,
    CASE WHEN p_filtros->>'ordem' = 'valor_anterior' AND p_filtros->>'direcao' = 'desc' THEN c.valor_anterior END DESC,
    CASE WHEN p_filtros->>'ordem' = 'valor_atual' AND p_filtros->>'direcao' = 'asc' THEN c.valor_atual END ASC,
    CASE WHEN p_filtros->>'ordem' = 'valor_atual' AND p_filtros->>'direcao' = 'desc' THEN c.valor_atual END DESC,
    CASE WHEN p_filtros->>'ordem' = 'delta_qtd' AND p_filtros->>'direcao' = 'asc' THEN c.delta_qtd END ASC,
    CASE WHEN p_filtros->>'ordem' = 'delta_qtd' AND p_filtros->>'direcao' = 'desc' THEN c.delta_qtd END DESC,
    CASE WHEN p_filtros->>'ordem' = 'delta_valor' AND p_filtros->>'direcao' = 'asc' THEN c.delta_valor END ASC,
    CASE WHEN p_filtros->>'ordem' = 'delta_valor' AND p_filtros->>'direcao' = 'desc' THEN c.delta_valor END DESC,
    c.deposito, c.material, c.pep
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 200), 1), 1000)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

CREATE OR REPLACE FUNCTION estoque_sap_comparar_prioritarios(p_base UUID, p_alvo UUID)
RETURNS TABLE (
  pep TEXT,
  setor TEXT,
  superintendencia TEXT,
  motivo TEXT,
  alteracoes BIGINT,
  delta_valor NUMERIC,
  detalhes JSONB
)
LANGUAGE SQL
STABLE
AS $$
  SELECT p.pep, s.nome, v.superintendencia, p.motivo,
    count(d.material) AS alteracoes,
    COALESCE(sum(d.delta_valor), 0) AS delta_valor,
    COALESCE(jsonb_agg(jsonb_build_object(
      'tipo', d.tipo, 'centro', d.centro, 'deposito', d.deposito,
      'material', d.material, 'texto_breve', d.texto_breve,
      'qtd_anterior', d.qtd_anterior, 'qtd_atual', d.qtd_atual,
      'delta_qtd', d.delta_qtd, 'delta_valor', d.delta_valor,
      'delta_percent', d.delta_percent
    ) ORDER BY d.tipo, d.deposito, d.material) FILTER (WHERE d.material IS NOT NULL), '[]'::JSONB)
  FROM estoque_pep_prioridades p
  LEFT JOIN estoque_pep_vinculos v ON v.pep = p.pep
  LEFT JOIN estoque_setores s ON s.id = v.setor_id
  LEFT JOIN estoque_sap_diferencas(p_base, p_alvo) d ON d.pep = p.pep
  GROUP BY p.pep, s.nome, v.superintendencia, p.motivo
  ORDER BY count(d.material) DESC, p.pep;
$$;

CREATE OR REPLACE FUNCTION estoque_sap_valor_por_setor()
RETURNS TABLE (setor_nome TEXT, valor_total NUMERIC)
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(s.nome, 'Sem vínculo'), sum(i.valor_livre)
  FROM vw_estoque_sap i
  LEFT JOIN estoque_setores s ON s.id = i.setor_id
  GROUP BY s.nome
  ORDER BY sum(i.valor_livre) DESC;
$$;

CREATE OR REPLACE FUNCTION estoque_sap_valor_por_superintendencia()
RETURNS TABLE (superintendencia TEXT, valor_total NUMERIC)
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(i.superintendencia, 'Sem vínculo'), sum(i.valor_livre)
  FROM vw_estoque_sap i
  GROUP BY i.superintendencia
  ORDER BY sum(i.valor_livre) DESC;
$$;

REVOKE ALL ON FUNCTION estoque_sap_ativar_importacao(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION estoque_sap_ativar_importacao(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION estoque_sap_resumo() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION estoque_sap_filtros() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION estoque_sap_peps_novos_sem_vinculo(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION estoque_sap_peps() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION estoque_sap_diferencas(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION estoque_sap_comparar_resumo(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION estoque_sap_comparar(UUID, UUID, JSONB, INTEGER, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION estoque_sap_comparar_prioritarios(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION estoque_sap_valor_por_setor() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION estoque_sap_valor_por_superintendencia() TO anon, authenticated;

INSERT INTO permissions (key, label, panel_key, is_generic) VALUES
  ('estoque.sap_ver', 'Ver Estoque SAP e relatórios', 'estoque', false),
  ('estoque.sap_importar', 'Importar snapshots do Estoque SAP', 'estoque', false),
  ('estoque.sap_configurar', 'Configurar vínculos e prioridades do Estoque SAP', 'estoque', false)
ON CONFLICT (key) DO NOTHING;

INSERT INTO cargo_panel_permissions (cargo_id, permission_id)
SELECT DISTINCT cp.cargo_id, p.id
FROM cargo_paineis cp
JOIN paineis pn ON pn.id = cp.painel_id AND pn.chave = 'estoque'
JOIN permissions p ON p.key = 'estoque.sap_ver'
WHERE NOT EXISTS (
  SELECT 1 FROM cargo_panel_permissions cpp
  WHERE cpp.cargo_id = cp.cargo_id AND cpp.permission_id = p.id
);

INSERT INTO cargo_panel_permissions (cargo_id, permission_id)
SELECT c.id, p.id
FROM cargos c
CROSS JOIN permissions p
WHERE c.nome IN ('Administrador', 'Supervisor')
  AND p.key IN ('estoque.sap_importar', 'estoque.sap_configurar')
  AND NOT EXISTS (
    SELECT 1 FROM cargo_panel_permissions cpp
    WHERE cpp.cargo_id = c.id AND cpp.permission_id = p.id
  );

DO $$
DECLARE
  tabela TEXT;
BEGIN
  FOREACH tabela IN ARRAY ARRAY[
    'estoque_sap_importacoes',
    'estoque_pep_vinculos',
    'estoque_setores',
    'estoque_pep_prioridades'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = tabela
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tabela);
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';