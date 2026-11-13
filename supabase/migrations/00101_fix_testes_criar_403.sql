-- Corrige a concessão de testes.criar para cargos com acesso ao dashboard.
-- Também garante que a checagem do backend use o mesmo vínculo profile -> cargo
-- utilizado pela aplicação, com search_path explícito.

-- 1) Garante que a chave continue vinculada ao painel correto.
INSERT INTO public.permissions (key, label, panel_key, is_generic)
VALUES ('testes.criar', 'Criar/editar testes e aferições', 'dashboard_testes', false)
ON CONFLICT (key) DO UPDATE
SET label = EXCLUDED.label,
    panel_key = EXCLUDED.panel_key,
    is_generic = EXCLUDED.is_generic;

-- 2) Concede a permissão aos cargos que já possuem acesso ao dashboard.
INSERT INTO public.cargo_panel_permissions (cargo_id, permission_id)
SELECT DISTINCT cp.cargo_id, p.id
FROM public.cargo_paineis cp
JOIN public.paineis pa ON pa.id = cp.painel_id
JOIN public.permissions p ON p.key = 'testes.criar'
WHERE pa.chave = 'dashboard_testes'
ON CONFLICT (cargo_id, permission_id) DO NOTHING;

-- 3) Garante a concessão também quando o painel for atribuído a um cargo
-- depois desta migration (o seed isolado da migration anterior não cobria isso).
CREATE OR REPLACE FUNCTION public.conceder_permissao_testes_ao_vincular_painel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.paineis pa
    WHERE pa.id = NEW.painel_id
      AND pa.chave = 'dashboard_testes'
  ) THEN
    INSERT INTO public.cargo_panel_permissions (cargo_id, permission_id)
    SELECT NEW.cargo_id, p.id
    FROM public.permissions p
    WHERE p.key = 'testes.criar'
    ON CONFLICT (cargo_id, permission_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_conceder_testes_criar_ao_vincular_painel
  ON public.cargo_paineis;
CREATE TRIGGER trg_conceder_testes_criar_ao_vincular_painel
AFTER INSERT ON public.cargo_paineis
FOR EACH ROW
EXECUTE FUNCTION public.conceder_permissao_testes_ao_vincular_painel();

-- 4) Recria a consulta de permissão com schema e search_path explícitos.
CREATE OR REPLACE FUNCTION public.usuario_tem_permissao(chave TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  usuario_id UUID := auth.uid();
  permitido BOOLEAN := false;
BEGIN
  IF COALESCE(auth.role(), '') = 'service_role' THEN
    RETURN true;
  END IF;

  IF usuario_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles pr
    JOIN public.cargo_panel_permissions cpp ON cpp.cargo_id = pr.cargo_id
    JOIN public.permissions p ON p.id = cpp.permission_id
    WHERE pr.id = usuario_id
      AND p.key = chave
  )
  INTO permitido;

  RETURN COALESCE(permitido, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.validar_permissao_teste()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  usuario_id UUID := auth.uid();
  cargo_usuario BIGINT;
BEGIN
  IF NOT public.usuario_tem_permissao('testes.criar') THEN
    SELECT pr.cargo_id INTO cargo_usuario
    FROM public.profiles pr
    WHERE pr.id = usuario_id;

    RAISE EXCEPTION
      'Sem permissão para criar/editar testes e aferições (testes.criar). Usuário: %, cargo: %.',
      COALESCE(usuario_id::TEXT, 'sem sessão autenticada'),
      COALESCE(cargo_usuario::TEXT, 'sem cargo')
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_permissao_teste ON public.testes_afericoes;
CREATE TRIGGER trg_validar_permissao_teste
BEFORE INSERT OR UPDATE ON public.testes_afericoes
FOR EACH ROW
EXECUTE FUNCTION public.validar_permissao_teste();

GRANT EXECUTE ON FUNCTION public.usuario_tem_permissao(TEXT) TO authenticated;
NOTIFY pgrst, 'reload schema';

-- Diagnóstico pós-migration:
-- SELECT pr.id, pr.email, pr.cargo_id, c.nome AS cargo,
--        p.key AS permissao, p.panel_key, (cpp.id IS NOT NULL) AS concedida
-- FROM public.profiles pr
-- LEFT JOIN public.cargos c ON c.id = pr.cargo_id
-- LEFT JOIN public.cargo_panel_permissions cpp ON cpp.cargo_id = pr.cargo_id
-- LEFT JOIN public.permissions p ON p.id = cpp.permission_id AND p.key = 'testes.criar'
-- WHERE pr.id = auth.uid();
