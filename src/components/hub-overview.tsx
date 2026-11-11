import { useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  CalendarRange,
  CheckSquare,
  Clock3,
  MessageSquare,
  Package,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { isOrdemServico } from "@/lib/produtividade-os";
import { useProdutividadeConfig } from "@/lib/produtividade-config";
import {
  contarOsExecutadasNoPeriodo,
  type FieldAtividade,
  type FieldDia,
  type FieldEquipe,
} from "@/components/produtividade-dashboard";
import { useEquipeAliases } from "@/hooks/use-equipe-aliases";
import { supabase } from "@/lib/supabase";
import rawBacklogData from "@/data/backlog.json";
import { computeResponsabilidade } from "@/data/responsabilidade-rules";

type KpiStatus = "loading" | "ready" | "error";
type Kpi = {
  status: KpiStatus;
  value: number | null;
  delta: number | null;
  trend: number[];
  precision?: number;
  unit?: string;
  note?: string;
};

type KpiKey = "executadas" | "abertas" | "produtividade" | "atrasadas" | "estoque";
type Kpis = Record<KpiKey, Kpi>;

type RecentActivity = {
  id: number;
  tipo: string;
  mensagem: string;
  criado_em: string;
};

const EMPTY_KPI: Kpi = {
  status: "loading",
  value: null,
  delta: null,
  trend: [],
};
const ACTIVE_OS_STATUSES = ["Aberta", "Liberada"];
const COMPLETED_ACTIVITY_STATUSES = ["concluído", "concluido"];

function dataISO(date: Date) {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const dia = String(date.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function shiftMonth(date: Date, amount: number) {
  const shifted = new Date(date.getFullYear(), date.getMonth() + amount, 1);
  const lastDay = new Date(shifted.getFullYear(), shifted.getMonth() + 1, 0).getDate();
  shifted.setDate(Math.min(date.getDate(), lastDay));
  return shifted;
}

function daysBetween(start: Date, end: Date) {
  const days: string[] = [];
  const current = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  while (current <= end) {
    days.push(dataISO(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

function parseSlaDate(value: string | null): Date | null {
  if (!value) return null;
  const raw = value.trim();
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{2}))?/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    const date = new Date(year, month - 1, day, Number(iso[4] || 0), Number(iso[5] || 0));
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
      ? date
      : null;
  }
  const parsed = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!parsed) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  let day = Number(parsed[1]);
  let month = Number(parsed[2]);
  let year = Number(parsed[3]);
  if (year < 100) year += 2000;
  if (month > 12 && day <= 12) [day, month] = [month, day];
  const hour = Number(parsed[4] || 0);
  const minute = Number(parsed[5] || 0);
  const date = new Date(year, month - 1, day, hour, minute);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
}

function relativeTime(value: string, now: number) {
  const minutes = Math.max(0, Math.floor((now - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return `há ${days} ${days === 1 ? "dia" : "dias"}`;
}

function pretty(value: number | null, precision = 0) {
  if (value === null) return "Sem dados";
  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: precision,
    minimumFractionDigits: precision,
  }).format(value)}`;
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 31 - ((value - min) / span) * 26;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg
      viewBox="0 0 100 36"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="pointer-events-none block h-full w-full opacity-70"
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

function KpiCard({
  title,
  kpi,
  icon: Icon,
  color,
  href,
  percent = false,
  alert = false,
}: {
  title: string;
  kpi: Kpi;
  icon: typeof CheckSquare;
  color: string;
  href: string;
  percent?: boolean;
  alert?: boolean;
}) {
  const positiveIsGood = !alert;
  const deltaGood = kpi.delta !== null && kpi.delta !== 0 && kpi.delta > 0 === positiveIsGood;
  const DeltaIcon = kpi.delta !== null && kpi.delta < 0 ? ArrowDownRight : ArrowUpRight;
  return (
    <article className="group relative flex min-h-[190px] min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_5px_18px_-10px_rgba(15,45,85,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_14px_28px_-14px_rgba(15,45,85,0.32)] dark:border-slate-700 dark:bg-slate-900 sm:p-5">
      <div className="flex items-start gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ring-black/[0.03] ${color}`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <h3 className="min-h-10 pt-0.5 text-sm font-semibold leading-5 text-[#25466f] dark:text-slate-200">
          {title}
        </h3>
      </div>
      {kpi.status === "loading" ? (
        <div className="mt-3 h-9 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
      ) : (
        <>
          <p
            className={`mt-3 text-[1.75rem] font-bold leading-tight tracking-[-0.035em] sm:text-[1.9rem] ${
              kpi.status === "error"
                ? "text-red-600 dark:text-red-400"
                : alert && (kpi.value ?? 0) > 0
                  ? "text-orange-600"
                  : "text-[#102f5c] dark:text-white"
            }`}
          >
            {kpi.value === null
              ? "Sem dados"
              : `${pretty(kpi.value, kpi.precision)}${kpi.unit ? ` ${kpi.unit}` : percent ? "%" : ""}`}
          </p>
          <div className="mt-0.5 flex min-h-5 items-center gap-1 text-xs">
            {kpi.delta === 0 ? (
              <span className="text-slate-500 dark:text-slate-400">— Estável</span>
            ) : kpi.delta === null ? (
              <span
                className={
                  kpi.status === "error"
                    ? "text-red-600 dark:text-red-400"
                    : "text-slate-500 dark:text-slate-400"
                }
              >
                {kpi.note || "—"}
              </span>
            ) : (
              <span
                className={`inline-flex items-center gap-0.5 font-semibold ${
                  deltaGood ? "text-emerald-600" : "text-red-600"
                }`}
              >
                <DeltaIcon className="h-3.5 w-3.5" />
                {new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(
                  Math.abs(kpi.delta),
                )}
                %
              </span>
            )}
          </div>
          {kpi.delta !== null && kpi.note && (
            <p className="mt-1 line-clamp-2 min-h-8 max-h-8 overflow-hidden text-xs leading-4 text-slate-500 dark:text-slate-400">
              {kpi.note}
            </p>
          )}
          <div className="mt-2 h-9 w-full shrink-0 overflow-hidden rounded-md bg-slate-50/70 px-1 dark:bg-slate-800/40">
            <Sparkline values={kpi.trend} color={alert ? "#f97316" : "#1f7ad8"} />
          </div>
          <a
            href={href}
            className="relative z-[1] mt-auto inline-flex w-full items-center justify-end gap-1 border-t border-slate-100 pt-3 text-xs font-semibold text-[#1768c4] transition-colors hover:text-[#0b3a73] dark:border-slate-800 dark:text-blue-300"
          >
            Ver detalhes <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </>
      )}
    </article>
  );
}

function activityIcon(tipo: string) {
  const value = tipo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (value.includes("mencao") || value.includes("coment") || value.includes("mensagem"))
    return MessageSquare;
  if (value.includes("alerta") || value.includes("prioridade")) return Bell;
  if (value.includes("estoque") || value.includes("material") || value.includes("compra"))
    return Package;
  if (value.includes("escala") || value.includes("plant")) return CalendarDays;
  if (value.includes("os") || value.includes("ordem")) return CheckSquare;
  if (value.includes("cronograma") || value.includes("prazo") || value.includes("etapa"))
    return CalendarRange;
  if (value.includes("manutenc") || value.includes("equipamento")) return Wrench;
  return Activity;
}

export function HubOverview({
  userId,
  onOpenCount,
  canViewRecords,
  canViewInventory,
  children,
}: {
  userId: string | undefined;
  onOpenCount?: (count: number | null) => void;
  canViewRecords: boolean;
  canViewInventory: boolean;
  children: ReactNode;
}) {
  const aliases = useEquipeAliases();
  const [kpis, setKpis] = useState<Kpis>({
    executadas: { ...EMPTY_KPI },
    abertas: { ...EMPTY_KPI },
    produtividade: { ...EMPTY_KPI },
    atrasadas: { ...EMPTY_KPI },
    estoque: { ...EMPTY_KPI },
  });
  const [atividades, setAtividades] = useState<RecentActivity[] | null | undefined>(undefined);
  const [now, setNow] = useState(() => Date.now());
  const {
    data: produtividadeConfig,
    isLoading: configLoading,
    isError: configError,
  } = useProdutividadeConfig();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (configLoading) return;
    let active = true;
    setKpis({
      executadas: { ...EMPTY_KPI },
      abertas: { ...EMPTY_KPI },
      produtividade: { ...EMPTY_KPI },
      atrasadas: { ...EMPTY_KPI },
      estoque: { ...EMPTY_KPI },
    });
    const update = (key: KpiKey, value: Omit<Kpi, "status">, error?: unknown) => {
      if (!active) return;
      if (error) {
        console.error(`Erro ao carregar o KPI "${key}" no Hub:`, error);
        const reason =
          error instanceof Error
            ? error.message
            : typeof error === "object" && error !== null && "message" in error
              ? String(error.message)
              : "Erro ao consultar a fonte de dados.";
        setKpis((current) => ({
          ...current,
          [key]: {
            ...EMPTY_KPI,
            status: "error",
            note: reason,
          },
        }));
        return;
      }
      setKpis((current) => ({
        ...current,
        [key]: { ...value, status: "ready" },
      }));
    };

    const loadOpenOsAndSla = async () => {
      if (!canViewRecords) {
        onOpenCount?.(null);
        update("abertas", {
          value: null,
          delta: null,
          trend: [],
          note: "Sem acesso aos registros.",
        });
        update("atrasadas", {
          value: null,
          delta: null,
          trend: [],
          note: "Sem acesso aos registros.",
        });
        return;
      }
      const today = new Date();
      const todayIso = dataISO(today);
      const [
        { data: backlogConfig, error: backlogError },
        { data: responsibilityRows, error: responsibilityError },
      ] = await Promise.all([
        supabase.from("backlog_dados").select("dados").eq("id", 1).maybeSingle(),
        supabase.from("responsabilidade_overrides").select("om,responsabilidade"),
      ]);
      if (backlogError || responsibilityError) {
        const error = backlogError || responsibilityError;
        onOpenCount?.(null);
        update("abertas", { value: null, delta: null, trend: [] }, error);
        update("atrasadas", { value: null, delta: null, trend: [] }, error);
        return;
      }
      const shared = backlogConfig?.dados as { bucket?: unknown } | unknown[] | null;
      const backlogRows = Array.isArray(shared)
        ? (shared as Record<string, unknown>[])
        : shared &&
            typeof shared === "object" &&
            Array.isArray((shared as { bucket?: unknown }).bucket)
          ? (shared as { bucket: Record<string, unknown>[] }).bucket
          : (rawBacklogData as Record<string, unknown>[]);
      const responsibilityByOm = new Map(
        (responsibilityRows || []).map((row) => [String(row.om), String(row.responsabilidade)]),
      );
      const correctiveTypes = new Set([
        "MANUTENÇÃO CORRETIVA EMERGENCIAL",
        "MANUTENÇÃO CORRETIVA PROGRAMADA",
      ]);
      const openStatuses = new Set(["PENDENTE"]);
      const correctiveOrders = new Set<string>();
      for (const row of backlogRows) {
        const om = String(row["Ordem de Manutenção"] ?? "").trim();
        if (!om) continue;
        const tipo = String(row["Tipo de Atividade"] ?? "")
          .trim()
          .toLocaleUpperCase("pt-BR");
        const status = String(row["Status da Atividade"] ?? "")
          .trim()
          .toLocaleUpperCase("pt-BR");
        if (!correctiveTypes.has(tipo) || !openStatuses.has(status)) continue;
        const responsabilidade =
          responsibilityByOm.get(om) ||
          computeResponsabilidade({
            om,
            planta: String(row.PLANTA ?? ""),
            textoBreve: String(row["TEXTO BREVE"] ?? ""),
          });
        if (responsabilidade === "Baixada 2") correctiveOrders.add(om.replace(/\s+/g, ""));
      }
      const correctiveCount = correctiveOrders.size;
      onOpenCount?.(correctiveCount);
      update("abertas", {
        value: correctiveCount,
        delta: null,
        trend: [],
        note: "Backlog · Corretivas emergenciais e programadas · Baixada 2.",
      });

      const activeRes = await supabase
        .from("registros_atendimento")
        .select("id", { count: "exact", head: true })
        .in("status_simplificado", ACTIVE_OS_STATUSES);
      if (activeRes.error) {
        update("atrasadas", { value: null, delta: null, trend: [] }, activeRes.error);
        return;
      }
      if (activeRes.count === null) {
        update(
          "atrasadas",
          { value: null, delta: null, trend: [] },
          new Error("A consulta de O.S. com SLA não retornou uma contagem."),
        );
        return;
      }

      const overdue: { id: number; fim_sla: string | null }[] = [];
      let overdueError: unknown = null;
      let overdueFrom = 0;
      for (;;) {
        const { data, error } = await supabase
          .from("registros_atendimento")
          .select("id,fim_sla")
          .in("status_simplificado", ACTIVE_OS_STATUSES)
          .not("fim_sla", "is", null)
          .order("id")
          .range(overdueFrom, overdueFrom + 999);
        if (error) {
          overdueError = error;
          break;
        }
        if (!data?.length) break;
        overdue.push(...data);
        if (data.length < 1000) break;
        overdueFrom += 1000;
      }

      if (overdueError) {
        update("atrasadas", { value: null, delta: null, trend: [] }, overdueError);
      } else {
        const validDeadlines = overdue
          .map((row) => parseSlaDate(row.fim_sla))
          .filter((date): date is Date => date !== null);
        if (activeRes.count > 0 && validDeadlines.length === 0) {
          update("atrasadas", {
            value: null,
            delta: null,
            trend: [],
            note: "Sem prazos de SLA registrados nas O.S. abertas.",
          });
          return;
        }
        update("atrasadas", {
          value:
            activeRes.count === 0
              ? 0
              : validDeadlines.filter((due) => dataISO(due) < todayIso).length,
          delta: null,
          trend: [],
          note: activeRes.count === 0 ? "Nenhuma O.S. aberta ou liberada no SAP." : undefined,
        });
      }
    };

    const loadProductivity = async () => {
      const today = new Date();
      const todayIso = dataISO(today);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const previousStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const previousEnd = shiftMonth(today, -1);
      const trendStart = new Date(today);
      trendStart.setDate(today.getDate() - 13);
      const { data: dayRows, error: daysError } = await supabase
        .from("field_dias")
        .select("*")
        .gte("data", dataISO(previousStart))
        .lte("data", todayIso)
        .order("data");
      if (daysError) {
        update("executadas", { value: null, delta: null, trend: [] }, daysError);
        update("produtividade", { value: null, delta: null, trend: [] }, daysError);
        return;
      }
      const days = dayRows || [];
      const currentDays = days.filter(
        (day) => day.data >= dataISO(monthStart) && day.data <= todayIso,
      );
      if (currentDays.length === 0) {
        const note = "Não há cargas de Produtividade para o mês atual.";
        update("executadas", { value: null, delta: null, trend: [], note });
        update("produtividade", { value: null, delta: null, trend: [], note });
        return;
      }
      const activities: FieldAtividade[] = [];
      let from = 0;
      for (;;) {
        const { data, error } = await supabase
          .from("field_atividades")
          .select(
            "id,dia_id,id_recurso,ordem_manutencao,status,tipo_atividade,texto_breve,planta,area_trabalho,duracao_min,field_dias!inner(data)",
          )
          .gte("field_dias.data", dataISO(previousStart))
          .lte("field_dias.data", todayIso)
          .order("id")
          .range(from, from + 999);
        if (error) {
          update("executadas", { value: null, delta: null, trend: [] }, error);
          update("produtividade", { value: null, delta: null, trend: [] }, error);
          return;
        }
        if (!data?.length) break;
        activities.push(
          ...data.map(
            ({ field_dias: _dia, ...atividade }) => atividade as unknown as FieldAtividade,
          ),
        );
        if (data.length < 1000) break;
        from += 1000;
      }
      const dayById = new Map(days.map((day) => [day.id, day.data]));
      const completedByDate = new Map<string, Set<number>>();
      for (const activity of activities) {
        const status = (activity.status || "").toLowerCase().trim();
        if (!COMPLETED_ACTIVITY_STATUSES.includes(status)) continue;
        const order = Number(activity.ordem_manutencao);
        if (!isOrdemServico(order)) continue;
        const date = dayById.get(activity.dia_id);
        if (!date) continue;
        const dateSet = completedByDate.get(date) || new Set<number>();
        dateSet.add(order);
        completedByDate.set(date, dateSet);
      }
      const ordersBetween = (start: string, end: string) => {
        const orders = new Set<number>();
        for (const [date, dateOrders] of completedByDate) {
          if (date >= start && date <= end) {
            for (const order of dateOrders) orders.add(order);
          }
        }
        return orders;
      };
      const previousOrders = ordersBetween(dataISO(previousStart), dataISO(previousEnd));
      const teams: Array<{
        id: number;
        dia_id: number;
        nome_equipe: string;
        tecnicos: unknown;
      }> = [];
      let teamsFrom = 0;
      for (;;) {
        const { data, error } = await supabase
          .from("field_equipes")
          .select("id,dia_id,nome_equipe,tecnicos,field_dias!inner(data)")
          .gte("field_dias.data", dataISO(monthStart))
          .lte("field_dias.data", todayIso)
          .order("id")
          .range(teamsFrom, teamsFrom + 999);
        if (error) {
          update("produtividade", { value: null, delta: null, trend: [] }, error);
          return;
        }
        if (!data?.length) break;
        teams.push(...data.map(({ field_dias: _dia, ...team }) => team as (typeof teams)[number]));
        if (data.length < 1000) break;
        teamsFrom += 1000;
      }

      const currentCount = contarOsExecutadasNoPeriodo(
        currentDays as FieldDia[],
        activities,
        teams as FieldEquipe[],
        aliases.equipes,
        aliases.integrantes,
      );
      const previousCount = previousOrders.size;
      const executionDelta = percentChange(currentCount, previousCount);
      const previousDays = days.filter(
        (day) => day.data >= dataISO(previousStart) && day.data <= dataISO(previousEnd),
      );
      update("executadas", {
        value: currentCount,
        delta: executionDelta,
        trend: daysBetween(trendStart, today).map((date) => completedByDate.get(date)?.size || 0),
        note:
          executionDelta === null
            ? "Sem base no período equivalente para calcular a variação."
            : `Fonte: Produtividade · cargas no período: ${currentDays.length}/${daysBetween(monthStart, today).length} dias; mês anterior: ${previousDays.length}/${daysBetween(previousStart, previousEnd).length}.`,
      });

      const teamsByDay = new Map<string, { diaId: number; recursos: Set<number> }>();
      for (const team of teams) {
        const normalizedName = team.nome_equipe.trim().toLocaleLowerCase("pt-BR");
        const key = `${team.dia_id}:${normalizedName || `id-${team.id}`}`;
        const teamDay = teamsByDay.get(key) || {
          diaId: team.dia_id,
          recursos: new Set<number>(),
        };
        if (Array.isArray(team.tecnicos)) {
          for (const resource of team.tecnicos) {
            const id = Number(resource);
            if (Number.isFinite(id)) teamDay.recursos.add(id);
          }
        }
        teamsByDay.set(key, teamDay);
      }

      const activitiesByDay = new Map<number, typeof activities>();
      for (const activity of activities) {
        const dayActivities = activitiesByDay.get(activity.dia_id) || [];
        dayActivities.push(activity);
        activitiesByDay.set(activity.dia_id, dayActivities);
      }
      const dailyTeamCounts = new Map<string, { os: number; teams: number }>();
      for (const teamDay of teamsByDay.values()) {
        const date = dayById.get(teamDay.diaId);
        if (!date || date < dataISO(monthStart) || date > todayIso) continue;
        const orders = new Set<number>();
        for (const activity of activitiesByDay.get(teamDay.diaId) || []) {
          const status = (activity.status || "").toLowerCase().trim();
          const order = Number(activity.ordem_manutencao);
          if (
            activity.id_recurso !== null &&
            teamDay.recursos.has(Number(activity.id_recurso)) &&
            COMPLETED_ACTIVITY_STATUSES.includes(status) &&
            isOrdemServico(order)
          ) {
            orders.add(order);
          }
        }
        const daily = dailyTeamCounts.get(date) || { os: 0, teams: 0 };
        daily.os += orders.size;
        daily.teams += 1;
        dailyTeamCounts.set(date, daily);
      }
      if (teamsByDay.size === 0) {
        update("produtividade", {
          value: null,
          delta: null,
          trend: [],
          note: "Não há equipes registradas na Produtividade neste mês.",
        });
        return;
      }

      const totalTeamOrders = [...dailyTeamCounts.values()].reduce((sum, day) => sum + day.os, 0);
      const monthKey = todayIso.slice(0, 7);
      let note = "Meta mensal não configurada.";
      if (configError) {
        note = "Meta mensal indisponível.";
      } else {
        const goal = Number(produtividadeConfig?.metasMensais[monthKey] ?? 0);
        if (Number.isFinite(goal) && goal > 0) {
          const percentOfGoal = Math.round((currentCount / goal) * 100);
          note = `${percentOfGoal}% da meta mensal · ${pretty(currentCount)} de ${pretty(goal)} O.S.`;
        }
      }
      update("produtividade", {
        value: totalTeamOrders / teamsByDay.size,
        precision: 1,
        unit: "O.S./equipe/dia",
        delta: null,
        trend: daysBetween(trendStart, today).map((date) => {
          const daily = dailyTeamCounts.get(date);
          return daily?.teams ? daily.os / daily.teams : 0;
        }),
        note,
      });
    };

    const loadInventory = async () => {
      if (!canViewInventory) {
        update("estoque", {
          value: null,
          delta: null,
          trend: [],
          note: "Sem acesso ao almoxarifado.",
        });
        return;
      }
      const data: { saldo_atual: number; estoque_minimo: number }[] = [];
      let from = 0;
      for (;;) {
        const { data: page, error } = await supabase
          .from("materiais")
          .select("id,saldo_atual,estoque_minimo")
          .eq("ativo", true)
          .order("id")
          .range(from, from + 999);
        if (error) {
          update("estoque", { value: null, delta: null, trend: [] }, error);
          return;
        }
        if (!page?.length) break;
        data.push(...page);
        if (page.length < 1000) break;
        from += 1000;
      }
      if (data.length === 0) {
        update("estoque", {
          value: null,
          delta: null,
          trend: [],
          note: "Nenhum material ativo cadastrado no almoxarifado.",
        });
        return;
      }
      update("estoque", {
        value: data.filter((row) => Number(row.saldo_atual) < Number(row.estoque_minimo)).length,
        delta: null,
        trend: [],
      });
    };

    void loadOpenOsAndSla().catch((error: unknown) => {
      onOpenCount?.(null);
      update("abertas", { value: null, delta: null, trend: [] }, error);
      update("atrasadas", { value: null, delta: null, trend: [] }, error);
    });
    void loadProductivity().catch((error: unknown) => {
      update("executadas", { value: null, delta: null, trend: [] }, error);
      update("produtividade", { value: null, delta: null, trend: [] }, error);
    });
    void loadInventory().catch((error: unknown) => {
      update("estoque", { value: null, delta: null, trend: [] }, error);
    });
    return () => {
      active = false;
    };
  }, [
    canViewInventory,
    canViewRecords,
    onOpenCount,
    configLoading,
    configError,
    produtividadeConfig,
  ]);

  useEffect(() => {
    let active = true;
    setAtividades(undefined);
    if (!userId) {
      setAtividades([]);
      return;
    }
    const loadActivities = async () => {
      const { data, error } = await supabase
        .from("notificacoes")
        .select("id,tipo,mensagem,criado_em")
        .eq("usuario_id", userId)
        .order("criado_em", { ascending: false })
        .limit(4);
      if (!active) return;
      if (error) {
        console.error("Erro ao consultar notificações recentes do HUB:", error);
        setAtividades(null);
      } else {
        setAtividades((data || []) as RecentActivity[]);
      }
    };
    void loadActivities().catch((error: unknown) => {
      console.error("Erro ao consultar notificações recentes do HUB:", error);
      if (active) setAtividades(null);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  return (
    <>
      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          title="O.S. Executadas (mês atual)"
          kpi={kpis.executadas}
          icon={CheckSquare}
          color="bg-slate-100 text-[#245b8f] dark:bg-slate-800 dark:text-blue-300"
          href="/produtividade?aba=dashboard&periodo=mes"
        />
        <KpiCard
          title="Corretivas Abertas / Pendentes"
          kpi={kpis.abertas}
          icon={Clock3}
          color="bg-slate-100 text-[#245b8f] dark:bg-slate-800 dark:text-blue-300"
          href="/backlog?hubFiltro=corretivas"
          alert
        />
        <KpiCard
          title="Produtividade da Equipe"
          kpi={kpis.produtividade}
          icon={TrendingUp}
          color="bg-slate-100 text-[#245b8f] dark:bg-slate-800 dark:text-blue-300"
          href="/produtividade"
        />
        <KpiCard
          title="O.S. Atrasadas (SLA vencido)"
          kpi={kpis.atrasadas}
          icon={AlertTriangle}
          color="bg-slate-100 text-[#245b8f] dark:bg-slate-800 dark:text-blue-300"
          href="/backlog"
          alert
        />
        <KpiCard
          title="Itens Abaixo do Estoque Mínimo"
          kpi={kpis.estoque}
          icon={Package}
          color="bg-slate-100 text-[#245b8f] dark:bg-slate-800 dark:text-blue-300"
          href="/estoque"
          alert
        />
      </section>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">{children}</div>
        {atividades === undefined ? (
          <aside className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_5px_18px_-12px_rgba(15,45,85,0.24)] dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-3 h-5 w-40 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            <div className="space-y-4">
              {[0, 1, 2].map((item) => (
                <div key={item} className="flex gap-3">
                  <span className="h-8 w-8 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
                  <span className="h-10 flex-1 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                </div>
              ))}
            </div>
          </aside>
        ) : atividades === null ? (
          <aside className="rounded-2xl border border-red-200 bg-red-50/80 p-5 text-sm text-red-700 shadow-sm dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            <h2 className="mb-2 text-base font-bold">Atividades Recentes</h2>
            Não foi possível carregar as atividades recentes.
          </aside>
        ) : atividades.length > 0 ? (
          <aside className="rounded-xl border border-[#e1e9f4] bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-[#102f5c] dark:text-white">
                Atividades Recentes
              </h2>
              <span className="text-xs text-slate-500">Recentes</span>
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {atividades.map((activity) => {
                const Icon = activityIcon(`${activity.tipo} ${activity.mensagem}`);
                return (
                  <li key={activity.id} className="flex gap-3 py-3 first:pt-1 last:pb-1">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-blue-950 dark:text-blue-300">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {activity.mensagem}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {relativeTime(activity.criado_em, now)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </aside>
        ) : (
          <aside className="rounded-xl border border-[#e1e9f4] bg-white p-4 text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            <h2 className="mb-2 text-base font-bold text-[#102f5c] dark:text-white">
              Atividades Recentes
            </h2>
            Sem atividades recentes.
          </aside>
        )}
      </div>
    </>
  );
}

export function HubWelcome() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const dateLabel = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(now);
  return (
    <div className="flex items-center gap-4 sm:gap-5">
      <div className="h-14 w-1 shrink-0 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.45)]" />
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          Bem-vindo ao Hub Operacional!
        </h1>
        <p className="mt-1 flex items-center gap-2 text-sm text-blue-50/90">
          <Clock3 className="h-4 w-4" />
          Resumo da operação de hoje, {dateLabel}
        </p>
      </div>
    </div>
  );
}
