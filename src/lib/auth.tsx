import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "./supabase";
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const profileRequestId = useRef(0);

  const fetchProfile = async (userId: string, authUser: User | null = null, attempt = 0) => {
    const requestId = ++profileRequestId.current;
    setProfileLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("*, cargos!profiles_cargo_id_fkey(nome)")
      .eq("id", userId)
      .maybeSingle();

    if (requestId !== profileRequestId.current) return;

    if (data) {
      setProfile({
        ...data,
        cargo_nome: (data.cargos as { nome: string } | null)?.nome ?? null,
      } as Profile);
      setProfileLoading(false);
      return;
    }

    if (error && error.code !== "PGRST116") {
      console.warn("Não foi possível carregar o perfil:", error.message);
    }

    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      if (requestId !== profileRequestId.current) return;
      return fetchProfile(userId, authUser, attempt + 1);
    }

    if (authUser) {
      const nomeCompleto = String(
        authUser.user_metadata?.nome_completo ?? authUser.user_metadata?.full_name ?? authUser.email ?? "",
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

      if (requestId !== profileRequestId.current) return;

      if (createdProfile && !upsertError) {
        setProfile({
          ...createdProfile,
          cargo_nome: (createdProfile.cargos as { nome: string } | null)?.nome ?? null,
        } as Profile);
      } else {
        setProfile({
          id: userId,
          nome_completo: nomeCompleto,
          email,
          cargo_id: null,
          status: "pendente",
          criado_em: null,
          ultimo_acesso: null,
        });
      }
    } else {
      setProfile(null);
    }
    setProfileLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then((result) => {
      const s = result?.data?.session ?? null;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id, s.user);
      } else {
        setProfile(null);
        setProfileLoading(false);
      }
      setLoading(false);
    });

    const sub = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id, s.user);
      } else {
        setProfile(null);
        setProfileLoading(false);
      }
    });

    return () => sub?.data?.subscription?.unsubscribe?.();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
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
        refreshProfile: () => (user ? fetchProfile(user.id, user) : Promise.resolve()),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
