import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase, supabaseConfigSummary } from "./supabase";
import { clearPermissoesCache } from "./permissoes";
import type { User, Session } from "@supabase/supabase-js";

export type Profile = {
  id: string;
  nome_completo: string;
  email: string;
  cargo_id: number | null;
  status: "pendente" | "ativo" | "bloqueado";
  criado_em: string | null;
  ultimo_acesso: string | null;
  cargo_nome?: string | null;
  tamanho_pagina_atendimentos?: number | null;
  tema_preferido?: string | null;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  profileLoading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const profileQueryKey = (userId: string) => ["profiles", userId] as const;

function normalizarPerfil(data: Record<string, unknown>): Profile {
  return {
    ...data,
    cargo_nome: (data.cargos as { nome: string } | null)?.nome ?? null,
  } as Profile;
}

async function carregarPerfil(userId: string, authUser: User | null): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*, cargos!profiles_cargo_id_fkey(nome)")
    .eq("id", userId)
    .maybeSingle();

  if (data) return normalizarPerfil(data as Record<string, unknown>);

  if (error && error.code !== "PGRST116") {
    console.warn("Não foi possível carregar o perfil:", error.message);
  }

  if (!authUser) return null;

  const nomeCompleto = String(
    authUser.user_metadata?.nome_completo ??
      authUser.user_metadata?.full_name ??
      authUser.email ??
      "",
  );
  const email = authUser.email ?? "";
  const { data: createdProfile, error: upsertError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        nome_completo: nomeCompleto,
        email,
        cargo_id: null,
        status: "pendente",
        criado_em: new Date().toISOString(),
        ultimo_acesso: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("*, cargos!profiles_cargo_id_fkey(nome)")
    .maybeSingle();

  if (createdProfile && !upsertError) {
    return normalizarPerfil(createdProfile as Record<string, unknown>);
  }

  return {
    id: userId,
    nome_completo: nomeCompleto,
    email,
    cargo_id: null,
    status: "pendente",
    criado_em: null,
    ultimo_acesso: null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const profileRequestId = useRef(0);
  const sessionResolvedRef = useRef(false);
  const lastFetchedUserIdRef = useRef<string | null>(null);
  const queryClient = useQueryClient();

  const fetchProfile = async (userId: string, authUser: User | null = null, force = false) => {
    const requestId = ++profileRequestId.current;
    lastFetchedUserIdRef.current = userId;
    setProfileLoading(true);

    if (!supabaseConfigSummary.isConfigured) {
      if (requestId === profileRequestId.current) {
        setProfile(null);
        setProfileLoading(false);
      }
      return;
    }

    try {
      const data = await queryClient.fetchQuery({
        queryKey: profileQueryKey(userId),
        queryFn: () => carregarPerfil(userId, authUser),
        staleTime: force ? 0 : 5 * 60_000,
        retry: 1,
      });

      if (requestId !== profileRequestId.current) return;
      setProfile(data);
    } catch (error) {
      console.warn("Erro ao carregar o perfil do usuário:", error);
      if (requestId === profileRequestId.current) {
        setProfile(null);
      }
    } finally {
      if (requestId === profileRequestId.current) setProfileLoading(false);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      if (!supabaseConfigSummary.isConfigured) {
        setSession(null);
        setUser(null);
        setProfile(null);
        setProfileLoading(false);
        setLoading(false);
        return;
      }

      try {
        const result = await supabase.auth.getSession();
        const s = result?.data?.session ?? null;
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          await fetchProfile(s.user.id, s.user);
        } else {
          setProfile(null);
          setProfileLoading(false);
        }
      } catch (error) {
        console.warn("Erro ao inicializar a sessão do Supabase:", error);
        setSession(null);
        setUser(null);
        setProfile(null);
        setProfileLoading(false);
      } finally {
        sessionResolvedRef.current = true;
        setLoading(false);
      }
    };

    initializeAuth();

    if (!supabaseConfigSummary.isConfigured) return;

    const sub = supabase.auth.onAuthStateChange((_: string, s: Session | null) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        if (sessionResolvedRef.current && s.user.id !== lastFetchedUserIdRef.current) {
          fetchProfile(s.user.id, s.user);
        }
      } else {
        lastFetchedUserIdRef.current = null;
        setProfile(null);
        setProfileLoading(false);
      }
    });

    return () => sub?.data?.subscription?.unsubscribe?.();
  }, []);

  const signOut = async () => {
    if (!supabaseConfigSummary.isConfigured) {
      setUser(null);
      setSession(null);
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    await supabase.auth.signOut();
    lastFetchedUserIdRef.current = null;
    queryClient.clear();
    clearPermissoesCache();
    setUser(null);
    setSession(null);
    setProfile(null);
    setProfileLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        profileLoading,
        signOut,
        refreshProfile: () => (user ? fetchProfile(user.id, user, true) : Promise.resolve()),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
