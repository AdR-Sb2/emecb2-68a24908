-- Categorias dinâmicas de materiais

CREATE TABLE categorias (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO categorias (nome) VALUES
  ('Elétrico'),
  ('Mecânico'),
  ('Hidráulico'),
  ('EPI'),
  ('Consumível'),
  ('Outros');

CREATE TEMP TABLE _map_categoria (
  slug TEXT PRIMARY KEY,
  nome TEXT NOT NULL
);

INSERT INTO _map_categoria (slug, nome) VALUES
  ('eletrico', 'Elétrico'),
  ('mecanico', 'Mecânico'),
  ('hidraulico', 'Hidráulico'),
  ('epi', 'EPI'),
  ('consumivel', 'Consumível'),
  ('outros', 'Outros');

INSERT INTO categorias (nome)
SELECT DISTINCT COALESCE(mc.nome, m.categoria)
FROM materiais m
LEFT JOIN _map_categoria mc ON mc.slug = lower(trim(m.categoria))
WHERE COALESCE(mc.nome, m.categoria) IS NOT NULL
  AND COALESCE(mc.nome, m.categoria) <> ''
ON CONFLICT (nome) DO NOTHING;

ALTER TABLE materiais ADD COLUMN categoria_id BIGINT REFERENCES categorias(id);

UPDATE materiais m
SET categoria_id = sub.categoria_id
FROM (
  SELECT
    mat.id AS material_id,
    c.id AS categoria_id
  FROM materiais mat
  LEFT JOIN _map_categoria mc ON mc.slug = lower(trim(mat.categoria))
  INNER JOIN categorias c ON c.nome = COALESCE(mc.nome, mat.categoria)
) sub
WHERE m.id = sub.material_id;

UPDATE materiais
SET categoria_id = (SELECT id FROM categorias WHERE nome = 'Outros' LIMIT 1)
WHERE categoria_id IS NULL;

ALTER TABLE materiais ALTER COLUMN categoria_id SET NOT NULL;
ALTER TABLE materiais DROP COLUMN categoria;

CREATE INDEX idx_materiais_categoria_id ON materiais(categoria_id);

ALTER TABLE categorias DISABLE ROW LEVEL SECURITY;
