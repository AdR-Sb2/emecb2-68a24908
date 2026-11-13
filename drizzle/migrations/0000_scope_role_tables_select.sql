CREATE OR REPLACE FUNCTION public.current_user_cargo_id()
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cargo_id FROM public.profiles WHERE id = auth.uid()
$$;
REVOKE EXECUTE ON FUNCTION public.current_user_cargo_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_cargo_id() TO authenticated;

DROP POLICY IF EXISTS cargos_select_authenticated ON public.cargos;
CREATE POLICY cargos_select_own_or_admin ON public.cargos FOR SELECT TO authenticated
  USING (id = public.current_user_cargo_id() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS cargo_paineis_select_authenticated ON public.cargo_paineis;
CREATE POLICY cargo_paineis_select_own_or_admin ON public.cargo_paineis FOR SELECT TO authenticated
  USING (cargo_id = public.current_user_cargo_id() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS paineis_select_authenticated ON public.paineis;
CREATE POLICY paineis_select_own_or_admin ON public.paineis FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.cargo_paineis cp
    WHERE cp.painel_id = paineis.id AND cp.cargo_id = public.current_user_cargo_id()));