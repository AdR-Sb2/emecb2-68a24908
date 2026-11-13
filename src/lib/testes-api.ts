// Consulta única de Testes & Aferições. Dashboard e Ficha da elevatória usam
// esta MESMA função; a diferença entre as telas é apenas o filtro aplicado
// depois (planta na Ficha, planta + tipo no dashboard).

import rawData from "@/data/testes.json";
import { supabase } from "./supabase";
import { mapearTesteDb, type TesteRow } from "./testes-data";

// Dados legados (planilha importada) usados como contingência quando a tabela
// `testes_afericoes` ainda não existe/está vazia. Dashboard e Ficha usam o
// MESMO fallback para nunca divergirem entre si.
const FALLBACK = rawData as unknown as TesteRow[];

export async function fetchTestes(): Promise<TesteRow[]> {
  const { data, error } = await supabase
    .from("testes_afericoes")
    .select("*")
    .order("data_teste", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map(mapearTesteDb);
}

// Consulta usada pelas telas: banco quando disponível, senão os dados legados.
export async function fetchTestesComFallback(): Promise<TesteRow[]> {
  try {
    const rows = await fetchTestes();
    if (rows.length > 0) return rows;
  } catch {
    // Tabela/colunas ainda não migradas: segue para os dados legados.
  }
  return FALLBACK;
}
