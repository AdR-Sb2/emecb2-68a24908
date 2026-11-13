-- Testes & Aferições: valor canônico de tipo_teste, backfill dos registros de
-- importação e permissão de criação (testes.criar) aplicada no backend.
--
-- Contexto: a planilha de 24 colunas não classifica o teste; todo registro
-- importado é AdR. A coluna tipo_teste usa o valor canônico 'ADR' (exibido como
-- "AdR") e 'CEDAE'. Registros antigos/importados sem classificação viram 'ADR'.

-- 1) Canonicaliza tipo_teste (AdR/ADR/ausente -> ADR; cedae -> CEDAE).
--    Roda antes de qualquer trigger de permissão (ver passo 4).
UPDATE testes_afericoes
SET tipo_teste = 'ADR'
WHERE tipo_teste IS NULL
   OR btrim(tipo_teste) = ''
   OR upper(btrim(tipo_teste)) = 'ADR';

UPDATE testes_afericoes
SET tipo_teste = 'CEDAE'
WHERE upper(btrim(tipo_teste)) = 'CEDAE';

-- 2) Recalcula o código normalizado da planta onde ainda estiver nulo.
UPDATE testes_afericoes
SET elevatoria_codigo = normalizar_codigo_elevatoria(elevatoria)
WHERE elevatoria_codigo IS NULL;

-- 3) Permissão de criação/edição de testes, no painel existente dashboard_testes.
INSERT INTO permissions (key, label, panel_key, is_generic) VALUES
  ('testes.criar', 'Criar/editar testes e aferições', 'dashboard_testes', false)
ON CONFLICT (key) DO NOTHING;

-- Concede a todos os cargos que já enxergam o dashboard de Testes (admins podem
-- revogar depois para restringir). Administrador e Supervisor inclusos.
INSERT INTO cargo_panel_permissions (cargo_id, permission_id)
SELECT cp.cargo_id, p.id
FROM cargo_paineis cp
JOIN paineis pa ON pa.id = cp.painel_id AND pa.chave = 'dashboard_testes'
CROSS JOIN permissions p
WHERE p.key = 'testes.criar'
ON CONFLICT DO NOTHING;

-- 4) Backend: bloqueia INSERT/UPDATE em testes_afericoes sem a permissão.
--    PostgREST devolve 403 (insufficient_privilege) para quem não tem.
CREATE OR REPLACE FUNCTION usuario_tem_permissao(chave TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  ok BOOLEAN;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN true;
  END IF;
  SELECT EXISTS (
    SELECT 1
    FROM profiles pr
    JOIN cargo_panel_permissions cpp ON cpp.cargo_id = pr.cargo_id
    JOIN permissions p ON p.id = cpp.permission_id
    WHERE pr.id = auth.uid() AND p.key = chave
  ) INTO ok;
  RETURN COALESCE(ok, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION validar_permissao_teste()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT usuario_tem_permissao('testes.criar') THEN
    RAISE EXCEPTION 'Sem permissão para criar/editar testes e aferições (testes.criar).'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_validar_permissao_teste ON testes_afericoes;
CREATE TRIGGER trg_validar_permissao_teste
  BEFORE INSERT OR UPDATE ON testes_afericoes
  FOR EACH ROW
  EXECUTE FUNCTION validar_permissao_teste();

NOTIFY pgrst, 'reload schema';
