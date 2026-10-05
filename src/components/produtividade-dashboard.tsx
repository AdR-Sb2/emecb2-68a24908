import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
  LabelList,
} from "recharts";
import {
  ClipboardList,
  CheckCircle2,
  Activity,
  Wrench,
  Users,
  Loader2,
  Trophy,
  GitMerge,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import {
  equipeChaveFinal,
  equipeIndiceCor,
  equipeRotuloFinal,
  integranteChaveFinal,
  integranteRotuloFinal,
} from "@/lib/equipe-utils";
import { useEquipeAliases } from "@/hooks/use-equipe-aliases";
import { useAuth } from "@/lib/auth";
import { getPermissoesCargo, temPermissao } from "@/lib/permissoes";
import {
  UnificarEquipesDialog,
  type EquipeGerenciavel,
} from "@/components/unificar-equipes-dialog";

// ─── Tipos ────────────────────────────────────────────────────

export type FieldDia = {
  id: number;
  data: string;
  criado_em: string;
  observacao_geral: string;
};

export type FieldEquipe = {
  id: number;
  dia_id: number;
  nome_equipe: string;
  tecnicos: number[];
};

export type FieldAtividade = {
  id: number;
  dia_id: number;
  id_recurso: number;
  id_atividade: number;
  ordem_manutencao: number;
  status: string;
  tipo_atividade: string;
  prioridade: string;
  area_trabalho: string;
  texto_breve: string;
  centro_trabalho: string;
  criticidade: string;
  parada: boolean;
  inicio: string | null;
  fim: string | null;
  duracao_min: number | null;
  motivo_paralisacao: string;
  planta: string;
  cidade: string;
};

// ─── Constantes / helpers ─────────────────────────────────────

const ATIVIDADES_ADMINISTRATIVAS = [
  "DDS",
  "ALMOÇO",
  "ALMOCO",
  "RETORNO PARA BASE",
  "MONTAR EQUIPE",
  "SEPARAR MATERIAL / FERRAMENTA",
  "SEPARAR MATERIAL / FERRAMENTAS",
  "FEEDBACK",
  "PROBLEMAS COM VEÍCULO",
  "PROBLEMAS COM VEICULO",
  "REUNIÃO",
  "REUNIÕES",
  "REUNIAO",
  "TREINAMENTO",
];

const EQUIPE_COLORS = [
  { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", hex: "#3b82f6" },
  { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", hex: "#10b981" },
  { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", hex: "#8b5cf6" },
  { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", hex: "#f59e0b" },
  { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", hex: "#f43f5e" },
  { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200", hex: "#06b6d4" },
  { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", hex: "#f97316" },
  { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200", hex: "#14b8a6" },
];

const TIPO_SERVICO_MAP: Record<string, string> = {
  "MANUTENÇÃO PREVENTIVA POR FREQUÊNCIA": "Preventiva por Frequência",
  "MANUTENÇÃO PREVENTIVA POR CONDIÇÃO": "Preventiva por Condição",
  "MANUTENÇÃO CORRETIVA EMERGENCIAL": "Corretiva Emergencial",
  "ENGENHARIA DE MANUTENÇÃO": "Engenharia de Manutenção",
  SERVIÇOS: "Serviços",
};

const TIPO_SERVICO_KEYS = Object.keys(TIPO_SERVICO_MAP);
const TIPO_SERVICO_COLORS = ["#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6"];

function getEquipeColor(chave: string) {
  return EQUIPE_COLORS[equipeIndiceCor(chave, EQUIPE_COLORS.length)];
}

function normalizeStatus(s: string): string {
  const lower = (s || "").toLowerCase().trim();
  if (lower === "concluído" || lower === "concluido") return "concluido";
  if (lower === "suspenso" || lower === "pendente") return "suspenso";
  if (lower === "cancelado") return "cancelado";
  return lower;
}

function isAtividadeAdministrativa(tipo: string | null | undefined): boolean {
  if (!tipo) return false;
  return ATIVIDADES_ADMINISTRATIVAS.includes(tipo.toUpperCase().trim());
}

function dedupOS(atividades: FieldAtividade[]) {
  const groups = new Map<number, string[]>();
  for (const a of atividades) {
    if (isAtividadeAdministrativa(a.tipo_atividade)) continue;
    if (!a.ordem_manutencao) continue;
    const om = a.ordem_manutencao;
    const arr = groups.get(om);
    if (arr) arr.push(normalizeStatus(a.status));
    else groups.set(om, [normalizeStatus(a.status)]);
  }
  let exec = 0;
  let susp = 0;
  let canc = 0;
  for (const statuses of groups.values()) {
    if (statuses.includes("concluido")) exec++;
    else if (statuses.every((s) => s === "suspenso")) susp++;
    else if (statuses.every((s) => s === "cancelado")) canc++;
  }
  return { total: exec + susp + canc, exec, susp, canc, osIds: [...groups.keys()] };
}

function formatDataBR(d: string): string {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

const MESES_BR = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function formatMesBR(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${MESES_BR[m - 1] || m}/${y}`;
}

function formatMinutos(mins: number): string {
  if (!mins) return "00:00";
  const total = Math.round(mins);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ─── Período ──────────────────────────────────────────────────

type Periodo = { type: "day" | "7" | "30" | "mes"; date?: string; mes?: string };

// ─── Dashboard ────────────────────────────────────────────────

export function DashboardComparacao({ diaInicial }: { diaInicial?: string }) {
  const { user, profile } = useAuth();
  const aliases = useEquipeAliases();
  const [dias, setDias] = useState<FieldDia[]>([]);
  const [atividades, setAtividades] = useState<FieldAtividade[]>([]);
  const [equipes, setEquipes] = useState<FieldEquipe[]>([]);
  const [recursosList, setRecursosList] = useState<Array<{ id_recurso: number; nome: string }>>([]);
  const [periodo, setPeriodo] = useState<Periodo>(() =>
    diaInicial ? { type: "day", date: diaInicial } : { type: "7" },
  );
  const [todasDatas, setTodasDatas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [podeUnificarEquipes, setPodeUnificarEquipes] = useState(false);
  const [unificarAberto, setUnificarAberto] = useState(false);
  const [equipeDetalhe, setEquipeDetalhe] = useState<(typeof osPorEquipe)[number] | null>(null);

  useEffect(() => {
    let ativo = true;
    if (!user || !profile?.cargo_id) {
      setPodeUnificarEquipes(false);
      return () => {
        ativo = false;
      };
    }
    getPermissoesCargo(profile.cargo_id)
      .then((permissoes) => {
        if (ativo) {
          setPodeUnificarEquipes(temPermissao(permissoes, "produtividade", "unificar_equipes"));
        }
      })
      .catch(() => {
        if (ativo) setPodeUnificarEquipes(false);
      });
    return () => {
      ativo = false;
    };
  }, [profile?.cargo_id, user]);

  useEffect(() => {
    if (diaInicial) setPeriodo({ type: "day", date: diaInicial });
  }, [diaInicial]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const now = new Date();
      let startDate: string | undefined;
      let endDate: string | undefined;
      if (periodo.type === "7") {
        startDate = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
      } else if (periodo.type === "30") {
        startDate = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);
      } else if (periodo.type === "mes") {
        const [a, m] = periodo.mes
          ? periodo.mes.split("-").map(Number)
          : [now.getFullYear(), now.getMonth() + 1];
        startDate = `${a}-${String(m).padStart(2, "0")}-01`;
        endDate = `${a}-${String(m).padStart(2, "0")}-${new Date(a, m, 0).getDate()}`;
      }

      const datesRes = await supabase
        .from("field_dias")
        .select("data")
        .order("data", { ascending: false })
        .limit(1000);
      setTodasDatas([...new Set((datesRes.data || []).map((d: { data: string }) => d.data))]);

      let diasRes;
      if (periodo.type === "day") {
        diasRes = periodo.date
          ? await supabase
              .from("field_dias")
              .select("*")
              .eq("data", periodo.date)
              .order("data", { ascending: false })
          : { data: [] as FieldDia[] };
      } else {
        let q = supabase
          .from("field_dias")
          .select("*")
          .gte("data", startDate!)
          .order("data", { ascending: false });
        if (endDate) q = q.lte("data", endDate);
        diasRes = await q;
      }
      const diasData = (diasRes.data || []) as FieldDia[];
      setDias(diasData);

      const recRes = await supabase.from("field_recursos").select("*");
      if (recRes.error) {
        console.warn(
          "Falha ao carregar field_recursos (nomes de técnicos virarão IDs):",
          recRes.error.message,
        );
      } else {
        setRecursosList((recRes.data || []) as Array<{ id_recurso: number; nome: string }>);
      }

      if (diasData.length > 0) {
        const diaIds = diasData.map((d) => d.id);
        const buscarTudo = async <T,>(tabela: string, pagina = 1000): Promise<T[]> => {
          const linhas: T[] = [];
          let inicio = 0;
          for (;;) {
            const { data, error } = await supabase
              .from(tabela)
              .select("*")
              .in("dia_id", diaIds)
              .range(inicio, inicio + pagina - 1);
            if (error) break;
            if (!data || data.length === 0) break;
            linhas.push(...(data as T[]));
            if (data.length < pagina) break;
            inicio += pagina;
          }
          return linhas;
        };
        const [ativs, eqs] = await Promise.all([
          buscarTudo<FieldAtividade>("field_atividades"),
          buscarTudo<FieldEquipe>("field_equipes"),
        ]);
        setAtividades(ativs);
        setEquipes(eqs);
      } else {
        setAtividades([]);
        setEquipes([]);
      }
      setLoading(false);
    };
    load();
  }, [periodo]);

  const mesesDisponiveis = useMemo(() => {
    const vistos = new Set<string>();
    for (const d of todasDatas) vistos.add(d.slice(0, 7));
    return [...vistos].sort().reverse();
  }, [todasDatas]);

  // Só contam atividades de técnicos que estão em alguma equipe no dia.
  const tecsPorDia = useMemo(() => {
    const m = new Map<number, Set<number>>();
    for (const eq of equipes) {
      const s = m.get(eq.dia_id) || new Set<number>();
      eq.tecnicos.forEach((t) => s.add(t));
      m.set(eq.dia_id, s);
    }
    return m;
  }, [equipes]);

  const atividadesEquipe = useMemo(() => {
    return atividades.filter((a) => tecsPorDia.get(a.dia_id)?.has(a.id_recurso) ?? false);
  }, [atividades, tecsPorDia]);

  const osPorDia = useMemo(() => {
    return dias
      .map((d) => {
        const dayAtiv = atividadesEquipe.filter(
          (a) => a.dia_id === d.id && !isAtividadeAdministrativa(a.tipo_atividade),
        );
        const dedup = dedupOS(dayAtiv);
        const byEqNome = new Map<string, { exec: number; variantes: Map<string, number> }>();
        for (const eq of equipes) {
          if (eq.dia_id !== d.id) continue;
          const techSet = new Set(eq.tecnicos);
          const teamAtiv = atividadesEquipe.filter(
            (a) =>
              a.dia_id === d.id &&
              !isAtividadeAdministrativa(a.tipo_atividade) &&
              techSet.has(a.id_recurso),
          );
          const chave = equipeChaveFinal(eq.nome_equipe, aliases.equipes, aliases.integrantes);
          const exec = dedupOS(teamAtiv).exec;
          const grupo = byEqNome.get(chave) || { exec: 0, variantes: new Map<string, number>() };
          grupo.exec += exec;
          grupo.variantes.set(eq.nome_equipe, (grupo.variantes.get(eq.nome_equipe) || 0) + exec);
          byEqNome.set(chave, grupo);
        }
        return {
          data: d.data.slice(5),
          dataCompleta: d.data,
          exec: dedup.exec,
          total: dedup.total,
          equipes: [...byEqNome.entries()]
            .map(([chave, grupo]) => ({
              chave,
              nome: equipeRotuloFinal(
                chave,
                [...grupo.variantes].map(([texto, qtd]) => ({ texto, qtd })),
                aliases.equipes,
                aliases.integrantes,
              ),
              exec: grupo.exec,
            }))
            .sort((a, b) => b.exec - a.exec),
        };
      })
      .reverse();
  }, [dias, atividadesEquipe, equipes, aliases.equipes, aliases.integrantes]);

  const osPorEquipe = useMemo(() => {
    const byNome = new Map<
      string,
      {
        chave: string;
        variantes: Map<string, number>;
        chavesOrigem: Set<string>;
        integrantes: Map<string, { total: number; rotulos: Map<string, number> }>;
        exec: number;
        susp: number;
        canc: number;
        total: number;
        tecSet: Set<number>;
        tipos: Record<string, number>;
        corretivas: number;
      }
    >();
    for (const eq of equipes) {
      const techSet = new Set(eq.tecnicos);
      const teamAtiv = atividades.filter(
        (a) => a.dia_id === eq.dia_id && techSet.has(a.id_recurso),
      );
      const dedup = dedupOS(teamAtiv);
      const chave = equipeChaveFinal(eq.nome_equipe, aliases.equipes, aliases.integrantes);
      const cur = byNome.get(chave) || {
        chave,
        variantes: new Map<string, number>(),
        chavesOrigem: new Set<string>(),
        integrantes: new Map<string, { total: number; rotulos: Map<string, number> }>(),
        exec: 0,
        susp: 0,
        canc: 0,
        total: 0,
        tecSet: new Set<number>(),
        tipos: {} as Record<string, number>,
        corretivas: 0,
      };
      cur.exec += dedup.exec;
      cur.susp += dedup.susp;
      cur.canc += dedup.canc;
      cur.total += dedup.total;
      cur.variantes.set(
        eq.nome_equipe,
        (cur.variantes.get(eq.nome_equipe) || 0) + (dedup.total || 1),
      );
      cur.chavesOrigem.add(equipeChaveFinal(eq.nome_equipe, [], aliases.integrantes));
      const integrantesVistos = new Set<string>();
      for (const nome of eq.nome_equipe
        .split(/[&/+,]/)
        .map((parte) => parte.trim())
        .filter(Boolean)) {
        const chaveIntegrante = integranteChaveFinal(nome, aliases.integrantes);
        if (integrantesVistos.has(chaveIntegrante)) continue;
        integrantesVistos.add(chaveIntegrante);
        const atual = cur.integrantes.get(chaveIntegrante) || {
          total: 0,
          rotulos: new Map<string, number>(),
        };
        const quantidade = dedup.total || 1;
        atual.total += quantidade;
        const rotulo = integranteRotuloFinal(nome, aliases.integrantes);
        atual.rotulos.set(rotulo, (atual.rotulos.get(rotulo) || 0) + quantidade);
        cur.integrantes.set(chaveIntegrante, atual);
      }
      eq.tecnicos.forEach((t) => cur.tecSet.add(t));
      const vistos = new Set<string>();
      for (const a of teamAtiv) {
        const norm = (a.tipo_atividade || "").toUpperCase().trim();
        if (normalizeStatus(a.status) !== "concluido") continue;
        const key = a.ordem_manutencao ? `om:${a.ordem_manutencao}` : `at:${a.id_atividade}`;
        if (vistos.has(key)) continue;
        vistos.add(key);
        const label = TIPO_SERVICO_MAP[norm] || norm || "Outro";
        cur.tipos[label] = (cur.tipos[label] || 0) + 1;
        if (norm === "MANUTENÇÃO CORRETIVA EMERGENCIAL") cur.corretivas++;
      }
      byNome.set(chave, cur);
    }
    return [...byNome.values()]
      .map((r) => ({
        chave: r.chave,
        chavesOrigem: [...r.chavesOrigem],
        integrantes: [...r.integrantes].map(([chave, integrante]) => ({
          chave,
          rotulo: [...integrante.rotulos.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || chave,
          total: integrante.total,
        })),
        variantes: [...r.variantes].map(([texto, qtd]) => ({ texto, qtd })),
        nome: equipeRotuloFinal(
          r.chave,
          [...r.variantes].map(([texto, qtd]) => ({ texto, qtd })),
          aliases.equipes,
          aliases.integrantes,
        ),
        exec: r.exec,
        susp: r.susp,
        canc: r.canc,
        total: r.total,
        tecnicos: r.tecSet.size,
        topTipo: (Object.entries(r.tipos).sort(([, a], [, b]) => b - a)[0]?.[0] as string) || "—",
        corretivas: r.corretivas,
      }))
      .filter((r) => r.total > 0)
      .sort((a, b) => b.exec - a.exec);
  }, [atividades, equipes, aliases.equipes, aliases.integrantes]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const gruposUnificados = osPorEquipe
      .filter((equipe) => equipe.variantes.length > 1)
      .map(({ chave, variantes, total }) => ({ chave, variantes, total }));
    if (gruposUnificados.length > 0) {
      console.info(
        "[produtividade] equipes unificadas (chave, variantes, total):",
        gruposUnificados,
      );
    }
  }, [osPorEquipe]);

  const recursosMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const r of recursosList) m.set(Number(r.id_recurso), r.nome);
    return m;
  }, [recursosList]);

  // Média de OS executadas por dia para cada técnico (usada no tooltip
  // do KPI "Média por Equipe").
  const mediaPorTecnico = useMemo(() => {
    const chavesPorTecDia = new Map<string, Set<string>>();
    for (const a of atividadesEquipe) {
      if (isAtividadeAdministrativa(a.tipo_atividade)) continue;
      if (normalizeStatus(a.status) !== "concluido") continue;
      const key = a.ordem_manutencao ? `om:${a.ordem_manutencao}` : `at:${a.id_atividade}`;
      const tk = `${a.id_recurso}:${a.dia_id}`;
      const s = chavesPorTecDia.get(tk) || new Set<string>();
      s.add(key);
      chavesPorTecDia.set(tk, s);
    }
    const totals = new Map<number, number>();
    for (const [tk, s] of chavesPorTecDia) {
      const recurso = Number(tk.split(":")[0]);
      totals.set(recurso, (totals.get(recurso) || 0) + s.size);
    }
    const numDias = dias.length || 1;
    return [...totals.entries()]
      .map(([recurso, total]) => ({
        nome: recursosMap.get(recurso) || `Técnico ${recurso}`,
        media: total / numDias,
        total,
      }))
      .sort((a, b) => b.media - a.media);
  }, [atividadesEquipe, recursosMap, dias]);

  const corPorEquipe = useMemo(() => {
    const m = new Map<string, { hex: string }>();
    for (const eq of equipes) {
      const chave = equipeChaveFinal(eq.nome_equipe, aliases.equipes, aliases.integrantes);
      if (!m.has(chave)) m.set(chave, getEquipeColor(chave));
    }
    return m;
  }, [equipes, aliases.equipes, aliases.integrantes]);

  const participadasPorTecnico = useMemo(() => {
    type Acum = {
      participadas: number;
      dias: number;
      equipeDias: Map<string, number>;
      tipos: Record<string, { count: number; minutos: number }>;
    };
    const acum = new Map<number, Acum>();
    for (const d of dias) {
      const equipesDia = equipes.filter((e) => e.dia_id === d.id);
      const tecsDia = new Set<number>();
      for (const eq of equipesDia) eq.tecnicos.forEach((t) => tecsDia.add(t));
      for (const tecId of tecsDia) {
        const minhasEqs = equipesDia.filter((eq) => eq.tecnicos.includes(tecId));
        const eqSet = new Set<number>();
        for (const eq of minhasEqs) eq.tecnicos.forEach((t) => eqSet.add(t));
        const dayAtiv = atividades.filter(
          (a) =>
            a.dia_id === d.id &&
            !isAtividadeAdministrativa(a.tipo_atividade) &&
            eqSet.has(a.id_recurso),
        );
        const exec = dedupOS(dayAtiv).exec;
        const a = acum.get(tecId) || {
          participadas: 0,
          dias: 0,
          equipeDias: new Map<string, number>(),
          tipos: {},
        };
        a.participadas += exec;
        a.dias++;
        const vistos = new Set<string>();
        for (const ativ of dayAtiv) {
          if (normalizeStatus(ativ.status) !== "concluido") continue;
          const key = ativ.ordem_manutencao
            ? `om:${ativ.ordem_manutencao}`
            : `at:${ativ.id_atividade}`;
          if (vistos.has(key)) continue;
          vistos.add(key);
          const norm = (ativ.tipo_atividade || "").toUpperCase().trim();
          const label = TIPO_SERVICO_MAP[norm] || norm || "Outro";
          if (!a.tipos[label]) a.tipos[label] = { count: 0, minutos: 0 };
          a.tipos[label].count++;
          a.tipos[label].minutos += ativ.duracao_min ?? 0;
        }
        for (const eq of minhasEqs) {
          const chave = equipeChaveFinal(eq.nome_equipe, aliases.equipes, aliases.integrantes);
          a.equipeDias.set(chave, (a.equipeDias.get(chave) || 0) + 1);
        }
        acum.set(tecId, a);
      }
    }
    return [...acum.entries()]
      .map(([tecId, a]) => {
        const pred = [...a.equipeDias.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] || "";
        return {
          tecId,
          nome: recursosMap.get(tecId) || String(tecId),
          participadas: a.participadas,
          diasTrabalhados: a.dias,
          cor: corPorEquipe.get(pred)?.hex || "#64748b",
          tipos: a.tipos,
        };
      })
      .filter((r) => r.participadas > 0)
      .sort((x, y) => y.participadas - x.participadas);
  }, [dias, equipes, atividades, recursosMap, corPorEquipe, aliases.equipes, aliases.integrantes]);

  const composicaoPorDia = useMemo(() => {
    return dias
      .map((d) => {
        const dayAtiv = atividadesEquipe.filter(
          (a) => a.dia_id === d.id && !isAtividadeAdministrativa(a.tipo_atividade),
        );
        const row: Record<string, number | string> = { data: d.data.slice(5) };
        for (const k of TIPO_SERVICO_KEYS) {
          row[TIPO_SERVICO_MAP[k]] = 0;
        }
        for (const a of dayAtiv) {
          const norm = (a.tipo_atividade || "").toUpperCase().trim();
          const label = TIPO_SERVICO_MAP[norm];
          if (label && typeof row[label] === "number") row[label] = (row[label] as number) + 1;
        }
        return row;
      })
      .reverse();
  }, [dias, atividadesEquipe]);

  const kpis = useMemo(() => {
    const todasOs = atividadesEquipe.filter((a) => !isAtividadeAdministrativa(a.tipo_atividade));
    const totalExec = dedupOS(todasOs).exec;
    const numDias = dias.length;

    const chave = (a: FieldAtividade) =>
      a.ordem_manutencao ? `om:${a.ordem_manutencao}` : `at:${a.id_atividade}`;
    const executadas = new Set<string>();
    for (const a of todasOs) {
      if (normalizeStatus(a.status) !== "concluido") continue;
      executadas.add(chave(a));
    }

    let horasExec = 0;
    let corretivas = 0;
    let corretivasMin = 0;
    const corretivasVistas = new Set<string>();
    for (const a of todasOs) {
      const key = chave(a);
      const ehCorretiva =
        (a.tipo_atividade || "").toUpperCase().trim() === "MANUTENÇÃO CORRETIVA EMERGENCIAL";
      const executada = executadas.has(key);
      if (executada) horasExec += Number(a.duracao_min) || 0;
      if (ehCorretiva) {
        if (!corretivasVistas.has(key)) {
          corretivasVistas.add(key);
          corretivas++;
        }
        if (executada) corretivasMin += Number(a.duracao_min) || 0;
      }
    }
    const horasMediaDia = numDias > 0 ? horasExec / numDias : 0;
    const corretivasMinMedia = numDias > 0 ? corretivasMin / numDias : 0;

    const numEquipes = new Set(
      equipes.map((e) => equipeChaveFinal(e.nome_equipe, aliases.equipes, aliases.integrantes)),
    ).size;
    const mediaPorEquipe = numEquipes > 0 ? totalExec / numEquipes : 0;

    return { totalExec, corretivas, horasMediaDia, corretivasMinMedia, mediaPorEquipe };
  }, [atividadesEquipe, dias, equipes, aliases.equipes, aliases.integrantes]);

  const destaques = useMemo(() => {
    if (osPorEquipe.length === 0) return null;
    const maisProdutiva = osPorEquipe[0];
    const maisCorretivas = [...osPorEquipe].sort((a, b) => b.corretivas - a.corretivas)[0];
    return { maisProdutiva, maisCorretivas };
  }, [osPorEquipe]);

  const equipesGerenciaveis = useMemo<EquipeGerenciavel[]>(
    () =>
      osPorEquipe.map((equipe) => ({
        chave: equipe.chave,
        rotulo: equipe.nome,
        total: equipe.exec,
        chavesOrigem: equipe.chavesOrigem,
        integrantes: equipe.integrantes,
      })),
    [osPorEquipe],
  );

  const equipeDetalheOS = useMemo(() => {
    if (!equipeDetalhe) return [];
    const linhas: Array<{
      chave: string;
      data: string;
      ordem: number;
      origem: string;
      atividade: FieldAtividade;
    }> = [];

    for (const equipe of equipes) {
      if (
        equipeChaveFinal(equipe.nome_equipe, aliases.equipes, aliases.integrantes) !==
        equipeDetalhe.chave
      ) {
        continue;
      }
      const tecnicos = new Set(equipe.tecnicos);
      const concluidas = new Map<number, FieldAtividade>();
      for (const atividade of atividades) {
        if (
          atividade.dia_id !== equipe.dia_id ||
          !tecnicos.has(atividade.id_recurso) ||
          isAtividadeAdministrativa(atividade.tipo_atividade) ||
          !atividade.ordem_manutencao ||
          normalizeStatus(atividade.status) !== "concluido"
        ) {
          continue;
        }
        if (!concluidas.has(atividade.ordem_manutencao)) {
          concluidas.set(atividade.ordem_manutencao, atividade);
        }
      }
      const data = dias.find((dia) => dia.id === equipe.dia_id)?.data || "";
      for (const [ordem, atividade] of concluidas) {
        linhas.push({
          chave: `${equipe.id}:${equipe.dia_id}:${ordem}`,
          data,
          ordem,
          origem: equipe.nome_equipe,
          atividade,
        });
      }
    }
    return linhas.sort((a, b) => b.data.localeCompare(a.data) || a.ordem - b.ordem);
  }, [equipeDetalhe, equipes, atividades, dias, aliases.equipes, aliases.integrantes]);

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1f7ad6]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controles de período */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500">Período:</span>
        {(["day", "7", "30", "mes"] as const).map((p) => (
          <Button
            key={p}
            variant={periodo.type === p ? "default" : "outline"}
            size="sm"
            className="h-7 text-[11px]"
            onClick={() => setPeriodo({ type: p, date: periodo.date, mes: periodo.mes })}
          >
            {p === "day"
              ? "Dia específico"
              : p === "7"
                ? "Últimos 7 dias"
                : p === "30"
                  ? "Últimos 30 dias"
                  : "Mês"}
          </Button>
        ))}
        {periodo.type === "mes" && (
          <select
            value={periodo.mes || ""}
            onChange={(e) => setPeriodo({ type: "mes", mes: e.target.value })}
            className="min-h-7 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 text-[11px] text-slate-700 dark:text-slate-200"
          >
            <option value="">
              Mês atual ({new Date().getMonth() + 1}/{new Date().getFullYear()})
            </option>
            {mesesDisponiveis.map((m) => (
              <option key={m} value={m}>
                {formatMesBR(m)}
              </option>
            ))}
          </select>
        )}
        {periodo.type === "day" && (
          <select
            value={periodo.date || ""}
            onChange={(e) => setPeriodo({ type: "day", date: e.target.value })}
            className="min-h-7 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 text-[11px] text-slate-700 dark:text-slate-200"
          >
            <option value="">Selecione um dia…</option>
            {todasDatas.map((d) => (
              <option key={d} value={d}>
                {formatDataBR(d)}
              </option>
            ))}
          </select>
        )}
      </div>

      {osPorDia.length === 0 ? (
        <p className="text-center py-8 text-sm text-slate-400">
          Nenhum dado encontrado para o período selecionado.
        </p>
      ) : (
        <>
          {/* KPIs do período */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Card className="shadow-sm">
              <CardContent className="flex items-center gap-3 p-3">
                <ClipboardList className="h-8 w-8 shrink-0 text-[#0b3a73]" />
                <div>
                  <div className="text-2xl font-bold">{kpis.totalExec}</div>
                  <div className="text-[11px] text-slate-500">OS Executadas</div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="flex items-center gap-3 p-3">
                <Activity className="h-8 w-8 shrink-0 text-violet-600" />
                <div>
                  <div className="text-2xl font-bold">{formatMinutos(kpis.horasMediaDia)}</div>
                  <div className="text-[11px] text-slate-500">Média diária em horas</div>
                  <div className="text-[10px] text-slate-400">
                    ({formatMinutos(kpis.horasMediaDia)} gastos por dia)
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="flex items-center gap-3 p-3">
                <Wrench className="h-8 w-8 shrink-0 text-red-500" />
                <div>
                  <div className="text-2xl font-bold">{kpis.corretivas}</div>
                  <div className="text-[11px] text-slate-500">Corretivas emerg.</div>
                  <div className="text-[10px] text-slate-400">
                    ({formatMinutos(kpis.corretivasMinMedia)} gastos por dia)
                  </div>
                </div>
              </CardContent>
            </Card>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="cursor-help shadow-sm">
                    <CardContent className="flex items-center gap-3 p-3">
                      <Users className="h-8 w-8 shrink-0 text-teal-600" />
                      <div>
                        <div className="text-2xl font-bold">{kpis.mediaPorEquipe.toFixed(1)}</div>
                        <div className="text-[11px] text-slate-500">Média por Equipe</div>
                        <div className="text-[10px] text-slate-400">(OS executadas por equipe)</div>
                      </div>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  align="start"
                  className="max-h-72 w-60 overflow-auto rounded-lg bg-white p-3 shadow-xl ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-600"
                >
                  <p className="mb-2 border-b border-slate-100 pb-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
                    Média de O.S./dia por técnico
                  </p>
                  {mediaPorTecnico.length === 0 ? (
                    <p className="text-[11px] text-slate-400">Sem dados no período</p>
                  ) : (
                    mediaPorTecnico.map((t) => (
                      <div
                        key={t.nome}
                        className="flex items-center justify-between gap-3 py-0.5 text-[11px] text-slate-600 dark:text-slate-300"
                      >
                        <span className="truncate">{t.nome}</span>
                        <span className="shrink-0 font-semibold text-slate-800 dark:text-slate-100">
                          {t.media.toFixed(1)}
                        </span>
                      </div>
                    ))
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">OS Executadas por Dia</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={osPorDia}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const row = payload[0].payload as (typeof osPorDia)[number];
                      return (
                        <div className="min-w-[200px] rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-xl dark:border-slate-600 dark:bg-slate-800">
                          <p className="mb-2 font-semibold text-slate-700 dark:text-slate-200">
                            {formatDataBR(row.dataCompleta)}
                          </p>
                          <p className="mb-2 text-slate-600 dark:text-slate-300">
                            Executadas: <strong>{row.exec}</strong>
                            <span className="text-slate-400"> · {row.total} O.S. no dia</span>
                          </p>
                          <div className="border-t border-slate-100 pt-1 dark:border-slate-700">
                            {row.equipes.length === 0 ? (
                              <p className="text-slate-400">Sem equipes cadastradas</p>
                            ) : (
                              row.equipes.map((eq, i) => (
                                <div
                                  key={`${row.data}-${eq.nome}`}
                                  className="flex items-center justify-between gap-3 py-0.5"
                                >
                                  <span className="flex items-center gap-1.5 text-slate-500">
                                    <span
                                      className="h-2 w-2 shrink-0 rounded-full"
                                      style={{ backgroundColor: getEquipeColor(eq.chave).hex }}
                                    />
                                    {eq.nome}
                                  </span>
                                  <strong className="text-slate-700 dark:text-slate-200">
                                    {eq.exec}
                                  </strong>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="exec"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Executadas"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-semibold">OS Executadas por Equipe</CardTitle>
              {podeUnificarEquipes && (
                <Button variant="outline" size="sm" onClick={() => setUnificarAberto(true)}>
                  <GitMerge className="mr-1.5 h-4 w-4" /> Unificar equipes
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(150, osPorEquipe.length * 35)}>
                <BarChart data={osPorEquipe} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="nome" width={120} tick={{ fontSize: 11 }} />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as (typeof osPorEquipe)[number];
                      return (
                        <div className="min-w-[190px] rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-xl dark:border-slate-600 dark:bg-slate-800">
                          <div className="mb-1 font-bold text-slate-800 dark:text-slate-100">
                            {d.nome}
                          </div>
                          <div className="space-y-0.5 text-slate-600 dark:text-slate-300">
                            <div>
                              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />
                              Executadas: <strong>{d.exec}</strong>
                            </div>
                            <div>
                              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-500" />
                              Suspensas: <strong>{d.susp}</strong>
                            </div>
                            <div>
                              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-red-500" />
                              Canceladas: <strong>{d.canc}</strong>
                            </div>
                            <div className="pt-1 text-slate-500">
                              Tipo mais executado: <strong>{d.topTipo}</strong>
                            </div>
                            <div className="text-slate-500">
                              Técnicos: <strong>{d.tecnicos}</strong>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="exec" radius={[0, 4, 4, 0]}>
                    {osPorEquipe.map((equipe) => (
                      <Cell
                        key={equipe.chave}
                        fill={getEquipeColor(equipe.chave).hex}
                        cursor="pointer"
                        onClick={() => setEquipeDetalhe(equipe)}
                      />
                    ))}
                    <LabelList
                      dataKey="exec"
                      position="right"
                      className="fill-slate-700 dark:fill-slate-200"
                      fontSize={12}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* OS Participadas por Técnico */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">OS Participadas por Técnico</CardTitle>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Considera apenas O.S. executadas. As O.S. únicas da equipe no dia contam como
                participadas para cada técnico da equipe.
              </p>
            </CardHeader>
            <CardContent>
              {participadasPorTecnico.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">
                  Sem técnicos em equipe no período selecionado.
                </p>
              ) : (
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(150, participadasPorTecnico.length * 35)}
                >
                  <BarChart
                    data={participadasPorTecnico}
                    layout="vertical"
                    margin={{ left: 10, right: 40 }}
                  >
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="nome" width={150} tick={{ fontSize: 11 }} />
                    <RechartsTooltip
                      cursor={{ fill: "transparent" }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as (typeof participadasPorTecnico)[number];
                        return (
                          <div className="min-w-[220px] rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-xl dark:border-slate-600 dark:bg-slate-800">
                            <div className="mb-1 font-bold text-slate-800 dark:text-slate-100">
                              {d.nome}
                            </div>
                            <div className="space-y-0.5 text-slate-600 dark:text-slate-300">
                              <div>
                                O.S. participadas: <strong>{d.participadas}</strong>
                              </div>
                              <div>
                                Dias trabalhados: <strong>{d.diasTrabalhados}</strong>
                              </div>
                            </div>
                            <div className="mt-1.5 border-t border-slate-100 pt-1 dark:border-slate-700">
                              {Object.entries(d.tipos).length === 0 ? (
                                <p className="text-slate-400">Sem O.S. executadas</p>
                              ) : (
                                Object.entries(d.tipos).map(([tipo, info]) => (
                                  <div
                                    key={tipo}
                                    className="flex items-center justify-between gap-3 py-0.5"
                                  >
                                    <span className="text-slate-500">{tipo}</span>
                                    <strong className="shrink-0 text-slate-700 dark:text-slate-200">
                                      {info.count} O.S. · {formatMinutos(info.minutos)}
                                    </strong>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="participadas" radius={[0, 4, 4, 0]}>
                      {participadasPorTecnico.map((r) => (
                        <Cell key={r.tecId} fill={r.cor} />
                      ))}
                      <LabelList
                        dataKey="participadas"
                        position="right"
                        className="fill-slate-700 dark:fill-slate-200"
                        fontSize={12}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Composição por tipo no período */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Composição de OS por Tipo de Serviço
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={composicaoPorDia}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="data" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RechartsTooltip />
                  <Legend />
                  {TIPO_SERVICO_KEYS.map((k, i) => (
                    <Bar
                      key={k}
                      dataKey={TIPO_SERVICO_MAP[k]}
                      stackId="tipo"
                      fill={TIPO_SERVICO_COLORS[i]}
                      radius={i === TIPO_SERVICO_KEYS.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Destaques */}
          {destaques && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="shadow-sm border-amber-200 bg-amber-50">
                <CardContent className="flex items-start gap-3 p-4">
                  <Trophy className="mt-0.5 h-8 w-8 shrink-0 text-amber-600" />
                  <div>
                    <div className="text-xs font-semibold text-amber-800">
                      Mais corretivas emergenciais
                    </div>
                    <div className="text-lg font-bold text-amber-700">
                      {destaques.maisCorretivas.nome}
                    </div>
                    <div className="text-xs text-amber-600">
                      {destaques.maisCorretivas.corretivas} corretivas
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-blue-200 bg-blue-50">
                <CardContent className="flex items-start gap-3 p-4">
                  <CheckCircle2 className="mt-0.5 h-8 w-8 shrink-0 text-blue-600" />
                  <div>
                    <div className="text-xs font-semibold text-blue-800">Equipe mais produtiva</div>
                    <div className="text-lg font-bold text-blue-700">
                      {destaques.maisProdutiva.nome}
                    </div>
                    <div className="text-xs text-blue-600">
                      {destaques.maisProdutiva.exec} OS executadas no período
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
      <UnificarEquipesDialog
        open={unificarAberto}
        onOpenChange={setUnificarAberto}
        equipes={equipesGerenciaveis}
        aliasesEquipe={aliases.equipes}
        aliasesIntegrante={aliases.integrantes}
        sugestoesIgnoradas={aliases.ignoradas}
        userId={user?.id || null}
        onAliasesChanged={() => void aliases.recarregar()}
      />
      <Dialog open={!!equipeDetalhe} onOpenChange={(aberto) => !aberto && setEquipeDetalhe(null)}>
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{equipeDetalhe?.nome}</DialogTitle>
            <DialogDescription>
              {equipeDetalheOS.length} OS na lista · {equipeDetalhe?.exec || 0} executadas na barra
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">O.S.</th>
                  <th className="px-3 py-2">Equipe original</th>
                  <th className="px-3 py-2">Tipo / atividade</th>
                  <th className="px-3 py-2">Planta</th>
                </tr>
              </thead>
              <tbody>
                {equipeDetalheOS.map((linha) => (
                  <tr key={linha.chave} className="border-t">
                    <td className="whitespace-nowrap px-3 py-2">
                      {linha.data ? formatDataBR(linha.data) : "—"}
                    </td>
                    <td className="px-3 py-2 font-mono">{linha.ordem}</td>
                    <td className="px-3 py-2">{linha.origem}</td>
                    <td className="max-w-[320px] px-3 py-2">
                      {linha.atividade.texto_breve || linha.atividade.tipo_atividade || "—"}
                    </td>
                    <td className="px-3 py-2">{linha.atividade.planta || "—"}</td>
                  </tr>
                ))}
                {equipeDetalheOS.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                      Nenhuma O.S. executada encontrada para esta equipe.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
