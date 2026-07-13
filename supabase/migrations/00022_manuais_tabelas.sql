-- Tabela de categorias de manuais (abas dinâmicas)
CREATE TABLE IF NOT EXISTS manuais_categorias (
  id BIGSERIAL PRIMARY KEY,
  chave TEXT NOT NULL UNIQUE,
  nome_exibicao TEXT NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Popula categoria inicial NRs
INSERT INTO manuais_categorias (chave, nome_exibicao, ordem) VALUES
  ('nrs', 'NR''s', 1)
ON CONFLICT (chave) DO NOTHING;

-- Tabela de manuais/documentos
CREATE TABLE IF NOT EXISTS manuais (
  id BIGSERIAL PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT DEFAULT '',
  categoria_id BIGINT NOT NULL REFERENCES manuais_categorias(id) ON DELETE CASCADE,
  arquivo_url TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Popula NRs iniciais
DO $$
DECLARE
  cat_id BIGINT;
BEGIN
  SELECT id INTO cat_id FROM manuais_categorias WHERE chave = 'nrs';
  IF cat_id IS NOT NULL THEN
    INSERT INTO manuais (titulo, descricao, categoria_id) VALUES
      ('NR-06', 'Equipamento de Proteção Individual (EPI)', cat_id),
      ('NR-10', 'Segurança em Instalações e Serviços em Eletricidade', cat_id),
      ('NR-12', 'Segurança no Trabalho em Máquinas e Equipamentos', cat_id),
      ('NR-33', 'Segurança e Saúde no Trabalho em Espaços Confinados', cat_id),
      ('NR-35', 'Trabalho em Altura', cat_id)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Tabela de sugestões de manuais
CREATE TABLE IF NOT EXISTS sugestoes (
  id BIGSERIAL PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('pdf', 'texto')),
  arquivo_url TEXT,
  titulo_sugerido TEXT,
  categoria_sugerida TEXT,
  comentario TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  enviado_por TEXT NOT NULL DEFAULT '',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
