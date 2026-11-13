-- Testes CEDAE x AdR na mesma base de Testes & Aferições.
-- Adiciona classificação (tipo_teste) e o código normalizado da elevatória
-- (elevatoria_codigo), garantindo a regra de no máximo 2 testes CEDAE por
-- elevatória no próprio banco (vale para formulário e importação).

-- 1) Extração da planta. Espelha src/lib/testes-tipos.ts:
--    "PL-RJB-EAT0053 - Ivo Miranda" -> "PL-RJB-EAT0053"
--    "PL-RJB-EEAT0073  - CHATUBA"   -> "PL-RJB-EEAT0073"
--    "  pl-rjb-sda1003"             -> "PL-RJB-SDA1003"
-- Prefixos diferentes NÃO são unificados (EAT0053 <> EEAT0053); sem planta -> NULL.
CREATE OR REPLACE FUNCTION normalizar_codigo_elevatoria(valor TEXT)
RETURNS TEXT AS $$
DECLARE
  m TEXT[];
BEGIN
  IF valor IS NULL OR btrim(valor) = '' THEN
    RETURN NULL;
  END IF;
  m := regexp_match(upper(valor), 'PL-RJB-[A-Z]+[[:space:]]*[0-9]+');
  IF m IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN regexp_replace(m[1], '[[:space:]]+', '', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2) Colunas de classificação e vínculo normalizado.
ALTER TABLE testes_afericoes
  ADD COLUMN IF NOT EXISTS tipo_teste TEXT NOT NULL DEFAULT 'ADR',
  ADD COLUMN IF NOT EXISTS elevatoria_codigo TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'testes_afericoes_tipo_teste_check'
  ) THEN
    ALTER TABLE testes_afericoes
      ADD CONSTRAINT testes_afericoes_tipo_teste_check
      CHECK (tipo_teste IN ('CEDAE', 'ADR'));
  END IF;
END $$;

-- 3) Backfill do código normalizado para os registros existentes.
UPDATE testes_afericoes
SET elevatoria_codigo = normalizar_codigo_elevatoria(elevatoria)
WHERE elevatoria_codigo IS NULL;

-- 4) Trigger: preenche o código normalizado e bloqueia o 3º teste CEDAE.
CREATE OR REPLACE FUNCTION validar_limite_cedae_testes()
RETURNS TRIGGER AS $$
DECLARE
  codigo TEXT;
  qtd INT;
BEGIN
  codigo := COALESCE(NEW.elevatoria_codigo, normalizar_codigo_elevatoria(NEW.elevatoria));
  NEW.elevatoria_codigo := codigo;

  IF NEW.tipo_teste = 'CEDAE' THEN
    SELECT count(*) INTO qtd
    FROM testes_afericoes
    WHERE tipo_teste = 'CEDAE'
      AND elevatoria_codigo = codigo
      AND id <> NEW.id;

    IF qtd >= 2 THEN
      RAISE EXCEPTION
        'Limite de 2 testes CEDAE por elevatória atingido (código %). Exclua um teste CEDAE para liberar uma vaga.',
        codigo
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validar_limite_cedae_testes ON testes_afericoes;
CREATE TRIGGER trg_validar_limite_cedae_testes
  BEFORE INSERT OR UPDATE ON testes_afericoes
  FOR EACH ROW
  EXECUTE FUNCTION validar_limite_cedae_testes();

-- 5) Índices para consultas do dashboard e do histórico da ficha.
CREATE INDEX IF NOT EXISTS idx_testes_tipo_teste ON testes_afericoes(tipo_teste);
CREATE INDEX IF NOT EXISTS idx_testes_elevatoria_codigo ON testes_afericoes(elevatoria_codigo);

-- 6) Grants e recarga de schema (padrão do projeto).
GRANT SELECT, INSERT, UPDATE, DELETE ON testes_afericoes TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
