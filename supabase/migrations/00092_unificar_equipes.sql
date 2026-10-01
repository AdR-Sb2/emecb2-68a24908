CREATE TABLE IF NOT EXISTS equipe_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unificacao_id UUID NOT NULL DEFAULT gen_random_uuid(),
  alias_chave TEXT NOT NULL UNIQUE,
  destino_chave TEXT NOT NULL,
  destino_rotulo TEXT NOT NULL,
  criado_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  anterior_destino_chave TEXT,
  anterior_destino_rotulo TEXT,
  anterior_unificacao_id UUID,
  anterior_criado_por UUID,
  anterior_criado_em TIMESTAMPTZ,
  CONSTRAINT equipe_aliases_diferentes CHECK (alias_chave <> destino_chave)
);

CREATE INDEX IF NOT EXISTS idx_equipe_aliases_destino ON equipe_aliases(destino_chave);
CREATE INDEX IF NOT EXISTS idx_equipe_aliases_unificacao ON equipe_aliases(unificacao_id);

CREATE TABLE IF NOT EXISTS integrante_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unificacao_id UUID NOT NULL DEFAULT gen_random_uuid(),
  alias_nome TEXT NOT NULL UNIQUE,
  destino_nome TEXT NOT NULL,
  criado_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  anterior_destino_nome TEXT,
  anterior_unificacao_id UUID,
  anterior_criado_por UUID,
  anterior_criado_em TIMESTAMPTZ,
  CONSTRAINT integrante_aliases_diferentes CHECK (alias_nome <> upper(destino_nome))
);

CREATE TABLE IF NOT EXISTS equipe_sugestoes_ignoradas (
  chave_a TEXT NOT NULL,
  chave_b TEXT NOT NULL,
  criado_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (chave_a, chave_b),
  CONSTRAINT equipe_sugestoes_ignoradas_ordem CHECK (chave_a < chave_b)
);

CREATE OR REPLACE FUNCTION unificar_equipes_aliases(
  p_alias_chaves TEXT[],
  p_destino_chave TEXT,
  p_destino_rotulo TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  novo_grupo UUID := gen_random_uuid();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'É necessário estar autenticado para unificar equipes.';
  END IF;
  IF COALESCE(trim(p_destino_chave), '') = '' OR COALESCE(trim(p_destino_rotulo), '') = '' THEN
    RAISE EXCEPTION 'Informe o destino da unificação.';
  END IF;
  IF EXISTS (SELECT 1 FROM equipe_aliases WHERE alias_chave = p_destino_chave) THEN
    RAISE EXCEPTION 'O destino informado já é um alias; escolha a equipe final.';
  END IF;
  IF p_destino_chave = ANY(COALESCE(p_alias_chaves, ARRAY[]::TEXT[])) THEN
    RAISE EXCEPTION 'O destino também foi selecionado como variante.';
  END IF;

  UPDATE equipe_aliases
    SET anterior_destino_chave = destino_chave,
      anterior_destino_rotulo = destino_rotulo,
      anterior_unificacao_id = unificacao_id,
      anterior_criado_por = criado_por,
      anterior_criado_em = criado_em,
      destino_chave = p_destino_chave,
      destino_rotulo = p_destino_rotulo,
      unificacao_id = novo_grupo,
      criado_por = auth.uid(),
      criado_em = now()
  WHERE destino_chave = ANY(COALESCE(p_alias_chaves, ARRAY[]::TEXT[]))
    AND alias_chave <> p_destino_chave;

  INSERT INTO equipe_aliases (
    unificacao_id, alias_chave, destino_chave, destino_rotulo, criado_por, criado_em,
    anterior_destino_chave, anterior_destino_rotulo, anterior_unificacao_id,
    anterior_criado_por, anterior_criado_em
  )
  SELECT novo_grupo, alias_chave, p_destino_chave, p_destino_rotulo, auth.uid(), now(),
         NULL, NULL, NULL, NULL, NULL
  FROM (
    SELECT DISTINCT unnest(COALESCE(p_alias_chaves, ARRAY[]::TEXT[])) AS alias_chave
  ) AS aliases
  WHERE COALESCE(trim(alias_chave), '') <> ''
    AND alias_chave <> p_destino_chave
  ON CONFLICT (alias_chave) DO UPDATE
  SET unificacao_id = EXCLUDED.unificacao_id,
      destino_chave = EXCLUDED.destino_chave,
      destino_rotulo = EXCLUDED.destino_rotulo,
      criado_por = EXCLUDED.criado_por,
        criado_em = EXCLUDED.criado_em,
        anterior_destino_chave = CASE WHEN equipe_aliases.unificacao_id = novo_grupo THEN equipe_aliases.anterior_destino_chave ELSE equipe_aliases.destino_chave END,
        anterior_destino_rotulo = CASE WHEN equipe_aliases.unificacao_id = novo_grupo THEN equipe_aliases.anterior_destino_rotulo ELSE equipe_aliases.destino_rotulo END,
        anterior_unificacao_id = CASE WHEN equipe_aliases.unificacao_id = novo_grupo THEN equipe_aliases.anterior_unificacao_id ELSE equipe_aliases.unificacao_id END,
        anterior_criado_por = CASE WHEN equipe_aliases.unificacao_id = novo_grupo THEN equipe_aliases.anterior_criado_por ELSE equipe_aliases.criado_por END,
        anterior_criado_em = CASE WHEN equipe_aliases.unificacao_id = novo_grupo THEN equipe_aliases.anterior_criado_em ELSE equipe_aliases.criado_em END;
END;
$$;

CREATE OR REPLACE FUNCTION desfazer_equipes_aliases(p_unificacao_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  linha equipe_aliases%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'É necessário estar autenticado para desfazer unificações.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM equipe_aliases WHERE unificacao_id = p_unificacao_id) THEN
    RAISE EXCEPTION 'A unificação não existe mais.';
  END IF;

  FOR linha IN
    SELECT * FROM equipe_aliases WHERE unificacao_id = p_unificacao_id FOR UPDATE
  LOOP
    IF linha.anterior_destino_chave IS NULL THEN
      DELETE FROM equipe_aliases WHERE id = linha.id;
    ELSE
      UPDATE equipe_aliases
      SET destino_chave = linha.anterior_destino_chave,
          destino_rotulo = linha.anterior_destino_rotulo,
          unificacao_id = linha.anterior_unificacao_id,
          criado_por = linha.anterior_criado_por,
          criado_em = linha.anterior_criado_em,
          anterior_destino_chave = NULL,
          anterior_destino_rotulo = NULL,
          anterior_unificacao_id = NULL,
          anterior_criado_por = NULL,
          anterior_criado_em = NULL
      WHERE id = linha.id;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION separar_equipe_alias(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  linha equipe_aliases%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'É necessário estar autenticado para separar equipes.';
  END IF;
  SELECT * INTO linha FROM equipe_aliases WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'A variante não existe mais.';
  END IF;
  IF linha.anterior_destino_chave IS NULL THEN
    DELETE FROM equipe_aliases WHERE id = p_id;
  ELSE
    UPDATE equipe_aliases
    SET destino_chave = linha.anterior_destino_chave,
        destino_rotulo = linha.anterior_destino_rotulo,
        unificacao_id = linha.anterior_unificacao_id,
        criado_por = linha.anterior_criado_por,
        criado_em = linha.anterior_criado_em,
        anterior_destino_chave = NULL,
        anterior_destino_rotulo = NULL,
        anterior_unificacao_id = NULL,
        anterior_criado_por = NULL,
        anterior_criado_em = NULL
    WHERE id = p_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION unificar_aliases_integrantes(
  p_alias_nomes TEXT[],
  p_destino_chave TEXT,
  p_destino_nome TEXT,
  p_reapontar_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  novo_grupo UUID := gen_random_uuid();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'É necessário estar autenticado para unificar integrantes.';
  END IF;
  IF COALESCE(trim(p_destino_chave), '') = '' OR COALESCE(trim(p_destino_nome), '') = '' THEN
    RAISE EXCEPTION 'Informe o nome correto do integrante.';
  END IF;
  IF EXISTS (SELECT 1 FROM integrante_aliases WHERE alias_nome = p_destino_chave) THEN
    RAISE EXCEPTION 'O destino informado já é um alias; escolha o nome final.';
  END IF;

  UPDATE integrante_aliases
      SET anterior_destino_nome = destino_nome,
        anterior_unificacao_id = unificacao_id,
        anterior_criado_por = criado_por,
        anterior_criado_em = criado_em,
      destino_nome = p_destino_nome,
      unificacao_id = novo_grupo,
      criado_por = auth.uid(),
      criado_em = now()
  WHERE id = ANY(COALESCE(p_reapontar_ids, ARRAY[]::UUID[]))
    AND alias_nome <> p_destino_chave;

  INSERT INTO integrante_aliases (
    unificacao_id, alias_nome, destino_nome, criado_por, criado_em,
    anterior_destino_nome, anterior_unificacao_id, anterior_criado_por, anterior_criado_em
  )
  SELECT novo_grupo, alias_nome, p_destino_nome, auth.uid(), now(), NULL, NULL, NULL, NULL
  FROM (
    SELECT DISTINCT unnest(COALESCE(p_alias_nomes, ARRAY[]::TEXT[])) AS alias_nome
  ) AS aliases
  WHERE COALESCE(trim(alias_nome), '') <> ''
    AND alias_nome <> p_destino_chave
  ON CONFLICT (alias_nome) DO UPDATE
  SET destino_nome = EXCLUDED.destino_nome,
      unificacao_id = EXCLUDED.unificacao_id,
      criado_por = EXCLUDED.criado_por,
      criado_em = EXCLUDED.criado_em,
      anterior_destino_nome = CASE WHEN integrante_aliases.unificacao_id = novo_grupo THEN integrante_aliases.anterior_destino_nome ELSE integrante_aliases.destino_nome END,
      anterior_unificacao_id = CASE WHEN integrante_aliases.unificacao_id = novo_grupo THEN integrante_aliases.anterior_unificacao_id ELSE integrante_aliases.unificacao_id END,
      anterior_criado_por = CASE WHEN integrante_aliases.unificacao_id = novo_grupo THEN integrante_aliases.anterior_criado_por ELSE integrante_aliases.criado_por END,
      anterior_criado_em = CASE WHEN integrante_aliases.unificacao_id = novo_grupo THEN integrante_aliases.anterior_criado_em ELSE integrante_aliases.criado_em END;
END;
$$;

CREATE OR REPLACE FUNCTION desfazer_integrante_alias(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  linha integrante_aliases%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'É necessário estar autenticado para desfazer aliases.';
  END IF;
  SELECT * INTO linha FROM integrante_aliases WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'O alias não existe mais.';
  END IF;
  IF linha.anterior_destino_nome IS NULL THEN
    DELETE FROM integrante_aliases WHERE id = p_id;
  ELSE
    UPDATE integrante_aliases
    SET destino_nome = linha.anterior_destino_nome,
        unificacao_id = linha.anterior_unificacao_id,
        criado_por = linha.anterior_criado_por,
        criado_em = linha.anterior_criado_em,
        anterior_destino_nome = NULL,
        anterior_unificacao_id = NULL,
        anterior_criado_por = NULL,
        anterior_criado_em = NULL
    WHERE id = p_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION unificar_equipes_aliases(TEXT[], TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION desfazer_equipes_aliases(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION separar_equipe_alias(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION unificar_aliases_integrantes(TEXT[], TEXT, TEXT, UUID[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION desfazer_integrante_alias(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION unificar_equipes_aliases(TEXT[], TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION desfazer_equipes_aliases(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION separar_equipe_alias(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION unificar_aliases_integrantes(TEXT[], TEXT, TEXT, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION desfazer_integrante_alias(UUID) TO authenticated;

ALTER TABLE equipe_aliases DISABLE ROW LEVEL SECURITY;
ALTER TABLE integrante_aliases DISABLE ROW LEVEL SECURITY;
ALTER TABLE equipe_sugestoes_ignoradas DISABLE ROW LEVEL SECURITY;

GRANT SELECT ON equipe_aliases, integrante_aliases, equipe_sugestoes_ignoradas TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON equipe_aliases, integrante_aliases, equipe_sugestoes_ignoradas TO authenticated;

INSERT INTO paineis (chave, nome_exibicao, descricao, icone)
VALUES ('produtividade', 'Produtividade de Campo', 'Indicadores de produtividade e equipes', 'Activity')
ON CONFLICT (chave) DO NOTHING;

INSERT INTO permissions (key, label, panel_key, is_generic)
VALUES ('produtividade.unificar_equipes', 'Unificar equipes e integrantes', 'produtividade', false)
ON CONFLICT (key) DO NOTHING;

INSERT INTO cargo_paineis (cargo_id, painel_id)
SELECT c.id, p.id
FROM cargos c
CROSS JOIN paineis p
WHERE c.nome IN ('Administrador', 'Supervisor')
  AND p.chave = 'produtividade'
ON CONFLICT DO NOTHING;

INSERT INTO cargo_panel_permissions (cargo_id, permission_id)
SELECT c.id, p.id
FROM cargos c
CROSS JOIN permissions p
WHERE c.nome IN ('Administrador', 'Supervisor')
  AND p.key = 'produtividade.unificar_equipes'
  AND NOT EXISTS (
    SELECT 1 FROM cargo_panel_permissions cpp
    WHERE cpp.cargo_id = c.id AND cpp.permission_id = p.id
  );

DO $$
DECLARE
  tabela TEXT;
BEGIN
  FOREACH tabela IN ARRAY ARRAY[
    'equipe_aliases',
    'integrante_aliases',
    'equipe_sugestoes_ignoradas'
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