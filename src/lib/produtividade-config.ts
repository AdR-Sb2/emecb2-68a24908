import { useCallback } from "react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// ─── Tipos ────────────────────────────────────────────────────

export type ProdutividadeConfig = {
  /** Meta mensal de OS por mês. Chave "AAAA-MM" → quantidade esperada. */
  metasMensais: Record<string, number>;
  /** Meta individual (mensal) por colaborador. Chave = id_recurso. */
  metasIndividuais: Record<string, number>;
  /** Máximo de corretivas esperado no mês (0 = não configurado). */
  maxCorretivasMes: number;
  /** Intervalo (segundos) da rotação das comparações dos KPIs. */
  intervaloKpisSeg: number;
};

export const CONFIG_PADRAO: ProdutividadeConfig = {
  metasMensais: {},
  metasIndividuais: {},
  maxCorretivasMes: 0,
  intervaloKpisSeg: 10,
};

export const OPCOES_INTERVALO_KPI = [5, 10, 15, 20, 30, 60] as const;

export const CONFIG_QUERY_KEY = ["produtividade-config"] as const;

// ─── Classificação de tipo de serviço ─────────────────────────

export const TIPO_SERVICO_MAP: Record<string, string> = {
  "MANUTENÇÃO PREVENTIVA POR FREQUÊNCIA": "Preventiva",
  "MANUTENÇÃO PREVENTIVA POR CONDIÇÃO": "Preventiva",
  "MANUTENÇÃO CORRETIVA EMERGENCIAL": "Corretiva Emergencial",
  "MANUTENÇÃO CORRETIVA PROGRAMADA": "Corretiva Programada",
  "ENGENHARIA DE MANUTENÇÃO": "Engenharia de Manutenção",
  "MANUTENÇÃO PREDITIVA": "Preditiva",
  SERVIÇOS: "Serviços",
};

/** Rótulo "mostrado" no dashboard (Preventiva une Frequência + Condição). */
export const TIPO_SERVICO_ROTULO: Record<string, string> = {
  "Preventiva por Frequência": "Preventiva",
  "Preventiva por Condição": "Preventiva",
  Preventiva: "Preventiva",
  "Corretiva Emergencial": "Corretiva",
  "Corretiva Programada": "Corretiva",
  "Engenharia de Manutenção": "Engenharia de Manutenção",
  Preditiva: "Preditiva",
  Serviços: "Serviços",
  Outro: "Outros",
};

export const TIPO_SERVICO_KEYS = Object.keys(TIPO_SERVICO_MAP);

export function normalizarTipo(tipo: string | null | undefined): string {
  return (tipo || "").toUpperCase().trim();
}

/** Corretiva = Corretiva Emergencial + Corretiva Programada. */
export function ehCorretiva(tipoNorm: string): boolean {
  return (
    tipoNorm === "MANUTENÇÃO CORRETIVA EMERGENCIAL" ||
    tipoNorm === "MANUTENÇÃO CORRETIVA PROGRAMADA"
  );
}

/** Preventiva = Frequência + Condição. */
export function ehPreventiva(tipoNorm: string): boolean {
  return (
    tipoNorm === "MANUTENÇÃO PREVENTIVA POR FREQUÊNCIA" ||
    tipoNorm === "MANUTENÇÃO PREVENTIVA POR CONDIÇÃO"
  );
}

/** Melhoria = Engenharia de Manutenção. */
export function ehMelhoria(tipoNorm: string): boolean {
  return tipoNorm === "ENGENHARIA DE MANUTENÇÃO";
}

export function rotuloTipo(tipoNorm: string): string {
  if (!tipoNorm) return "Outros";
  if (ehPreventiva(tipoNorm)) return "Preventiva";
  if (ehCorretiva(tipoNorm)) return "Corretiva";
  if (ehMelhoria(tipoNorm)) return "Engenharia de Manutenção";
  return TIPO_SERVICO_MAP[tipoNorm] || "Outros";
}

// ─── Datas / período ──────────────────────────────────────────

export function diasNoMes(ano: number, mes: number): number {
  return new Date(ano, mes, 0).getDate();
}

export function chaveMes(dataISO: string): string {
  return dataISO.slice(0, 7);
}

export function adicionarDias(dataISO: string, dias: number): string {
  const [a, m, d] = dataISO.split("-").map(Number);
  const dt = new Date(a, m - 1, d + dias);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(
    dt.getDate(),
  ).padStart(2, "0")}`;
}

/** Desloca uma data ISO em meses calendário (clamp no dia do mês). */
export function adicionarMeses(dataISO: string, meses: number): string {
  const [a, m, d] = dataISO.split("-").map(Number);
  const alvo = new Date(a, m - 1 + meses, 1);
  const ultimo = diasNoMes(alvo.getFullYear(), alvo.getMonth() + 1);
  alvo.setDate(Math.min(d, ultimo));
  return `${alvo.getFullYear()}-${String(alvo.getMonth() + 1).padStart(2, "0")}-${String(
    alvo.getDate(),
  ).padStart(2, "0")}`;
}

function agruparPorMes(datas: string[]): Map<string, number> {
  const porMes = new Map<string, number>();
  for (const d of datas) {
    if (!d) continue;
    const mes = chaveMes(d);
    porMes.set(mes, (porMes.get(mes) || 0) + 1);
  }
  return porMes;
}

// ─── Metas proporcionais ao período ───────────────────────────

/**
 * Meta total proporcional ao período: para cada mês presente no período,
 * considera (dias do período naquele mês / dias do mês) × meta mensal.
 */
export function metaProporcional(config: ProdutividadeConfig, datas: string[]): number {
  let total = 0;
  for (const [mes, qtdDias] of agruparPorMes(datas)) {
    const meta = Number(config.metasMensais[mes]);
    if (!Number.isFinite(meta) || meta <= 0) continue;
    const [a, m] = mes.split("-").map(Number);
    total += meta * (qtdDias / diasNoMes(a, m));
  }
  return total;
}

function contarDiasValidos(datas: string[]): number {
  return datas.filter((d) => !!d).length;
}

/**
 * Meta individual proporcional ao período (por ID).
 * A meta individual é mensal: vale (dias do período no mês / dias do mês) × meta.
 * Quando o período cruza meses, soma a fração de cada mês.
 */
export function metaIndividualPeriodo(
  config: ProdutividadeConfig,
  idRecurso: number | string,
  datas: string[],
): number {
  const meta = Number(config.metasIndividuais[String(idRecurso)]);
  if (!Number.isFinite(meta) || meta <= 0) return 0;
  let total = 0;
  for (const [mes, qtdDias] of agruparPorMes(datas)) {
    const [a, m] = mes.split("-").map(Number);
    total += meta * (qtdDias / diasNoMes(a, m));
  }
  return total;
}

/** Meta diária proporcional (meta do período / dias do período). */
export function metaDiariaProporcional(config: ProdutividadeConfig, datas: string[]): number {
  const dias = contarDiasValidos(datas);
  if (dias === 0) return 0;
  return metaProporcional(config, datas) / dias;
}

/** Meta diária de um dia específico (meta mensal / dias do mês). */
export function metaDiariaDoDia(config: ProdutividadeConfig, dataISO: string): number {
  const mes = chaveMes(dataISO);
  const meta = Number(config.metasMensais[mes]);
  if (!Number.isFinite(meta) || meta <= 0) return 0;
  const [a, m] = mes.split("-").map(Number);
  return meta / diasNoMes(a, m);
}

/** Limite de corretivas proporcional ao período. */
export function limiteCorretivasPeriodo(config: ProdutividadeConfig, datas: string[]): number {
  if (!config.maxCorretivasMes || config.maxCorretivasMes <= 0) return 0;
  let total = 0;
  for (const [mes, qtdDias] of agruparPorMes(datas)) {
    const [a, m] = mes.split("-").map(Number);
    total += config.maxCorretivasMes * (qtdDias / diasNoMes(a, m));
  }
  return total;
}

/** Limite diário de corretivas (média no período). */
export function limiteCorretivasDiario(config: ProdutividadeConfig, datas: string[]): number {
  const dias = contarDiasValidos(datas);
  if (dias === 0) return 0;
  return limiteCorretivasPeriodo(config, datas) / dias;
}

export function temMetaConfigurada(config: ProdutividadeConfig, datas: string[]): boolean {
  return metaProporcional(config, datas) > 0;
}

// ─── Carga / persistência ─────────────────────────────────────

function numeroSeguro(valor: unknown, padrao: number): number {
  const n = Number(valor);
  return Number.isFinite(n) && n >= 0 ? n : padrao;
}

async function carregarConfig(): Promise<ProdutividadeConfig> {
  const config: ProdutividadeConfig = { ...CONFIG_PADRAO, metasMensais: {}, metasIndividuais: {} };

  const [cfgRes, mensaisRes, individuaisRes] = await Promise.all([
    supabase
      .from("field_config")
      .select("max_corretivas_mes, intervalo_kpis_seg")
      .eq("id", 1)
      .maybeSingle(),
    supabase.from("field_metas_mensais").select("mes, meta"),
    supabase.from("field_metas_individuais").select("id_recurso, meta"),
  ]);

  if (!cfgRes.error && cfgRes.data) {
    config.maxCorretivasMes = Math.floor(numeroSeguro(cfgRes.data.max_corretivas_mes, 0));
    config.intervaloKpisSeg = Math.floor(
      numeroSeguro(cfgRes.data.intervalo_kpis_seg, CONFIG_PADRAO.intervaloKpisSeg),
    );
  }

  if (!mensaisRes.error) {
    for (const row of mensaisRes.data || []) {
      const meta = numeroSeguro(row.meta, 0);
      if (meta > 0) config.metasMensais[row.mes] = meta;
    }
  }

  if (!individuaisRes.error) {
    for (const row of individuaisRes.data || []) {
      const meta = numeroSeguro(row.meta, 0);
      if (meta > 0) config.metasIndividuais[String(row.id_recurso)] = meta;
    }
  }

  return config;
}

export function useProdutividadeConfig() {
  return useQuery({
    queryKey: CONFIG_QUERY_KEY,
    queryFn: carregarConfig,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export type ConfigParcial = Partial<
  Pick<
    ProdutividadeConfig,
    "metasMensais" | "metasIndividuais" | "maxCorretivasMes" | "intervaloKpisSeg"
  >
>;

/**
 * Persiste alterações e atualiza o cache compartilhado, para que Dashboard e
 * dialog de Configurações enxerguem o novo valor imediatamente.
 */
export async function salvarConfig(
  client: QueryClient,
  patch: ConfigParcial,
): Promise<ProdutividadeConfig> {
  const atual = client.getQueryData<ProdutividadeConfig>(CONFIG_QUERY_KEY) ?? CONFIG_PADRAO;
  const proxima: ProdutividadeConfig = { ...atual, ...patch };

  const updates: Record<string, unknown> = {};
  if (patch.maxCorretivasMes !== undefined) updates.max_corretivas_mes = patch.maxCorretivasMes;
  if (patch.intervaloKpisSeg !== undefined) updates.intervalo_kpis_seg = patch.intervaloKpisSeg;

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from("field_config").upsert(
      {
        id: 1,
        ...updates,
      },
      { onConflict: "id" },
    );
    if (error) throw new Error(error.message);
  }

  if (patch.metasMensais) {
    const existentes = await supabase.from("field_metas_mensais").select("mes");
    if (existentes.error) throw new Error(existentes.error.message);
    const conhecidos = new Set((existentes.data || []).map((r) => r.mes));

    const linhas = Object.entries(patch.metasMensais)
      .filter(([, meta]) => Number.isFinite(meta))
      .map(([mes, meta]) => ({ mes, meta }));

    const remover = [...conhecidos].filter(
      (mes) => !(mes in patch.metasMensais!) || Number(patch.metasMensais![mes]) <= 0,
    );
    if (remover.length > 0) {
      const { error } = await supabase.from("field_metas_mensais").delete().in("mes", remover);
      if (error) throw new Error(error.message);
    }
    const gravar = linhas.filter((l) => l.meta > 0);
    if (gravar.length > 0) {
      const { error } = await supabase
        .from("field_metas_mensais")
        .upsert(gravar, { onConflict: "mes" });
      if (error) throw new Error(error.message);
    }
  }

  if (patch.metasIndividuais) {
    const existentes = await supabase.from("field_metas_individuais").select("id_recurso");
    if (existentes.error) throw new Error(existentes.error.message);
    const conhecidos = new Set((existentes.data || []).map((r) => Number(r.id_recurso)));

    const remover = [...conhecidos].filter(
      (id) =>
        !(String(id) in patch.metasIndividuais!) ||
        Number(patch.metasIndividuais![String(id)]) <= 0,
    );
    if (remover.length > 0) {
      const { error } = await supabase
        .from("field_metas_individuais")
        .delete()
        .in("id_recurso", remover);
      if (error) throw new Error(error.message);
    }
    const gravar = Object.entries(patch.metasIndividuais)
      .map(([id, meta]) => ({ id_recurso: Number(id), meta: Number(meta) }))
      .filter((l) => Number.isFinite(l.id_recurso) && l.meta > 0);
    if (gravar.length > 0) {
      const { error } = await supabase
        .from("field_metas_individuais")
        .upsert(gravar, { onConflict: "id_recurso" });
      if (error) throw new Error(error.message);
    }
  }

  client.setQueryData<ProdutividadeConfig>(CONFIG_QUERY_KEY, proxima);
  return proxima;
}

export function useSalvarConfig() {
  const client = useQueryClient();
  return useCallback((patch: ConfigParcial) => salvarConfig(client, patch), [client]);
}
