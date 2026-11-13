import { QueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";

type PermissaoRow = {
  key: string;
  label: string;
  panel_key: string;
  is_generic: boolean;
};

export type CargoPainelRow = {
  painel_id: number;
  paineis: {
    chave: string;
    nome_exibicao?: string | null;
    descricao?: string | null;
    icone?: string | null;
  };
};

const configClient = new QueryClient({
  defaultOptions: { queries: { staleTime: Infinity, retry: false } },
});

export const permissoesCargoQueryKey = (
  userId: string | null | undefined,
  cargoId: number | null | undefined,
) => ["cargo_panel_permissions", userId ?? null, cargoId ?? null] as const;

export const cargoPaineisQueryKey = (
  userId: string | null | undefined,
  cargoId: number | null | undefined,
) => ["cargo_paineis", userId ?? null, cargoId ?? null] as const;

async function carregarPermissoes(cargoId: number): Promise<Map<string, Set<string>>> {
  const result = new Map<string, Set<string>>();
  const { data } = await supabase
    .from("cargo_panel_permissions")
    .select("permission_id, permissions!inner(key, label, panel_key, is_generic)")
    .eq("cargo_id", cargoId);

  if (!data) return result;

  for (const row of data) {
    const p = row.permissions as unknown as PermissaoRow;
    const panelKey = p.panel_key;
    if (!result.has(panelKey)) result.set(panelKey, new Set());
    result.get(panelKey)!.add(p.key);
  }

  return result;
}

export async function getPermissoesCargo(
  cargoId: number | null | undefined,
  userId: string | null | undefined,
): Promise<Map<string, Set<string>>> {
  if (!cargoId) return new Map();
  return configClient.fetchQuery({
    queryKey: permissoesCargoQueryKey(userId, cargoId),
    queryFn: () => carregarPermissoes(cargoId),
    staleTime: Infinity,
  });
}

export async function getCargoPaineis(
  cargoId: number | null | undefined,
  userId: string | null | undefined,
): Promise<CargoPainelRow[]> {
  if (!cargoId) return [];
  return configClient.fetchQuery({
    queryKey: cargoPaineisQueryKey(userId, cargoId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cargo_paineis")
        .select("painel_id, paineis!inner(chave, nome_exibicao, descricao, icone)")
        .eq("cargo_id", cargoId);
      if (error) throw error;
      return (data || []) as unknown as CargoPainelRow[];
    },
    staleTime: Infinity,
  });
}

export async function cargoTemPainel(
  cargoId: number | null | undefined,
  userId: string | null | undefined,
  chave: string,
): Promise<boolean> {
  try {
    const paineis = await getCargoPaineis(cargoId, userId);
    return paineis.some((p) => p.paineis?.chave === chave);
  } catch {
    return false;
  }
}

export function temPermissao(
  permissoes: Map<string, Set<string>>,
  panelKey: string,
  permissionKey: string,
): boolean {
  const panelPerms = permissoes.get(panelKey);
  if (!panelPerms) return false;
  return panelPerms.has(`${panelKey}.${permissionKey}`);
}

export function temPainel(permissoes: Map<string, Set<string>>, panelKey: string): boolean {
  return permissoes.has(panelKey);
}

// Verifica uma chave de permissão completa (ex.: "testes.criar") dentro de um
// painel, útil quando a chave não segue o padrão "<painel>.<ação>".
export function temPermissaoChave(
  permissoes: Map<string, Set<string>>,
  panelKey: string,
  chaveCompleta: string,
): boolean {
  const panelPerms = permissoes.get(panelKey);
  if (!panelPerms) return false;
  return panelPerms.has(chaveCompleta);
}

export function clearPermissoesCache() {
  configClient.clear();
}
