import { supabase } from "./supabase";

type PermissaoRow = {
  key: string;
  label: string;
  panel_key: string;
  is_generic: boolean;
};

const cache = new Map<string, Set<string> | null>();

export async function getPermissoesCargo(
  cargoId: number | null | undefined,
): Promise<Map<string, Set<string>>> {
  const result = new Map<string, Set<string>>();
  if (!cargoId) return result;

  const cacheKey = `cargo_${cargoId}`;
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (cached) {
      for (const key of cached) {
        const panelKey = key.split(".")[0];
        if (!result.has(panelKey)) result.set(panelKey, new Set());
        result.get(panelKey)!.add(key);
      }
    }
    return result;
  }

  const { data } = await supabase
    .from("cargo_panel_permissions")
    .select("permission_id, permissions!inner(key, label, panel_key, is_generic)")
    .eq("cargo_id", cargoId);

  if (!data) {
    cache.set(cacheKey, null);
    return result;
  }

  const keys = new Set<string>();
  for (const row of data) {
    const p = row.permissions as unknown as PermissaoRow;
    keys.add(p.key);
    const panelKey = p.panel_key;
    if (!result.has(panelKey)) result.set(panelKey, new Set());
    result.get(panelKey)!.add(p.key);
  }

  cache.set(cacheKey, keys);
  return result;
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

export function clearPermissoesCache() {
  cache.clear();
}
