import { supabase } from "@/lib/supabase";

// Regra única de "O.S. executada" usada no gráfico de tendência, no Verificar e
// no Exportar O.S.: vinculada a uma elevatória OU nota de SDA (planta/LI com
// "SDA"), data efetiva = COALESCE(data_modificacao, data_entrada), sem as O.S.
// marcadas como "Desconsiderar".

export type OsExecutada = {
  id: number;
  elevatoria_id: number | null;
  ordem: string | null;
  texto_breve: string | null;
  planta: string | null;
  local_instalacao: string | null;
  inicio_sla: string | null;
  fim_sla: string | null;
  data_entrada: string | null;
  data_modificacao: string | null;
  tipo_ordem: string | null;
};

const COLS =
  "id, elevatoria_id, ordem, texto_breve, planta, local_instalacao, inicio_sla, fim_sla, data_entrada, data_modificacao, tipo_ordem";

const LS_KEY = "analitico_os_desconsideradas_v1";

function proximoDia(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Busca todas as O.S. executadas no período (inicio/fim inclusivos, YYYY-MM-DD). */
export async function buscarOsExecutadas(inicio: string, fim: string): Promise<OsExecutada[]> {
  const ate = proximoDia(fim);
  const out: OsExecutada[] = [];
  let de = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("registros_atendimento")
      .select(COLS)
      .or("elevatoria_id.not.is.null,planta.ilike.*SDA*,local_instalacao.ilike.*SDA*")
      .or(
        `and(data_modificacao.gte.${inicio},data_modificacao.lt.${ate}),and(data_modificacao.is.null,data_entrada.gte.${inicio},data_entrada.lt.${ate})`,
      )
      .order("id", { ascending: true })
      .range(de, de + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    out.push(...(data as unknown as OsExecutada[]));
    if (data.length < 1000) break;
    de += 1000;
  }
  return out;
}

export function ehSda(r: Pick<OsExecutada, "planta" | "local_instalacao">): boolean {
  return /SDA/i.test(`${r.planta ?? ""} ${r.local_instalacao ?? ""}`);
}

let tabelaOk: boolean | null = null;

function lerLocal(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(LS_KEY) || "[]") as string[]);
  } catch {
    return new Set();
  }
}

export async function carregarDesconsideradas(): Promise<Set<string>> {
  const { data, error } = await supabase.from("analitico_os_desconsideradas").select("ordem");
  if (error) {
    tabelaOk = false;
    return lerLocal();
  }
  tabelaOk = true;
  return new Set((data ?? []).map((r: { ordem: string }) => r.ordem));
}

export async function marcarDesconsiderada(ordem: string, desconsiderar: boolean) {
  if (tabelaOk !== false) {
    const { error } = desconsiderar
      ? await supabase
          .from("analitico_os_desconsideradas")
          .upsert({ ordem }, { onConflict: "ordem" })
      : await supabase.from("analitico_os_desconsideradas").delete().eq("ordem", ordem);
    if (!error) return;
    tabelaOk = false;
  }
  const s = lerLocal();
  if (desconsiderar) s.add(ordem);
  else s.delete(ordem);
  localStorage.setItem(LS_KEY, JSON.stringify([...s]));
}
