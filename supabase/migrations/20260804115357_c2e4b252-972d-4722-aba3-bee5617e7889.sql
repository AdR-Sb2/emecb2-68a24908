-- Helper: is the user an admin (has a cargo linked to the 'admin' panel)?
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.cargo_paineis cp ON cp.cargo_id = p.cargo_id
    JOIN public.paineis pa ON pa.id = cp.painel_id
    WHERE p.id = _user_id
      AND p.status = 'ativo'
      AND pa.chave = 'admin'
  )
$$;

REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

-- Fix search_path + add authorization to delete_user
CREATE OR REPLACE FUNCTION public.delete_user(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  DELETE FROM public.profiles WHERE id = user_id;
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_user(uuid) TO authenticated, service_role;

-- handle_new_user is trigger-only: nobody should call it directly
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cargos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.paineis TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cargo_paineis TO authenticated;
GRANT ALL ON public.profiles, public.cargos, public.paineis, public.cargo_paineis TO service_role;
REVOKE ALL ON public.profiles, public.cargos, public.paineis, public.cargo_paineis FROM anon;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paineis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargo_paineis ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- cargos
CREATE POLICY "cargos_select_authenticated" ON public.cargos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "cargos_write_admin" ON public.cargos
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- paineis
CREATE POLICY "paineis_select_authenticated" ON public.paineis
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "paineis_write_admin" ON public.paineis
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- cargo_paineis
CREATE POLICY "cargo_paineis_select_authenticated" ON public.cargo_paineis
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "cargo_paineis_write_admin" ON public.cargo_paineis
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));