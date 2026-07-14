-- Remover duplicatas de manuais e adicionar UNIQUE (titulo, categoria_id)

-- 1. Remover duplicatas mantendo o registro com menor id
DELETE FROM manuais a
USING manuais b
WHERE a.id > b.id
  AND a.titulo = b.titulo
  AND a.categoria_id = b.categoria_id;

-- 2. Adicionar UNIQUE para evitar futuras duplicatas
ALTER TABLE manuais ADD CONSTRAINT manuais_titulo_categoria_key UNIQUE (titulo, categoria_id);
