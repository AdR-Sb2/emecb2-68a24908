import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { AliasEquipe, AliasIntegrante } from "@/lib/equipe-utils";

export type EquipeAliasRegistro = AliasEquipe & {
  id: string;
  unificacao_id: string;
  criado_por: string | null;
  criado_em: string;
};

export type IntegranteAliasRegistro = AliasIntegrante & {
  id: string;
  criado_por: string | null;
  criado_em: string;
};

export type SugestaoEquipeIgnorada = {
  chave_a: string;
  chave_b: string;
  criado_por: string | null;
  criado_em: string;
};

const QUERY_KEY = ["equipe-aliases"] as const;

async function carregarAliases() {
  const [equipes, integrantes, ignoradas] = await Promise.all([
    supabase.from("equipe_aliases").select("*").order("criado_em"),
    supabase.from("integrante_aliases").select("*").order("criado_em"),
    supabase.from("equipe_sugestoes_ignoradas").select("*"),
  ]);
  const erro = equipes.error || integrantes.error || ignoradas.error;
  if (erro) throw new Error(erro.message);

  return {
    equipes: (equipes.data || []) as EquipeAliasRegistro[],
    integrantes: (integrantes.data || []) as IntegranteAliasRegistro[],
    ignoradas: (ignoradas.data || []) as SugestaoEquipeIgnorada[],
  };
}

export function useEquipeAliases() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: carregarAliases,
    staleTime: Infinity,
    retry: false,
  });

  useEffect(() => {
    const channel = supabase
      .channel("equipe-aliases-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "equipe_aliases" }, () =>
        queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "integrante_aliases" }, () =>
        queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "equipe_sugestoes_ignoradas" },
        () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    equipes: query.data?.equipes || [],
    integrantes: query.data?.integrantes || [],
    ignoradas: query.data?.ignoradas || [],
    carregando: query.isPending,
    erro: query.error,
    recarregar: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  };
}
