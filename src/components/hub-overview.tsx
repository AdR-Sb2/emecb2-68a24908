import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckSquare,
  Clock3,
  Package,
  TrendingUp,
} from "lucide-react";
import { isOrdemServico } from "@/lib/produtividade-os";
import { metaProporcional, useProdutividadeConfig } from "@/lib/produtividade-config";
import { supabase } from "@/lib/supabase";

type KpiStatus = "loading" | "ready" | "error";
type Kpi = {
  status: KpiStatus;
  value: number | null;
  delta: number | null;
  trend: number[];
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
const COMPLETED_OS_STATUSES = ["Encerrada", "Encerrada Técnica"];

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
  const parsed = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/);
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

function toTrend(values: number[]) {
  return values.length > 14 ? values.slice(-14) : values;
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

function pretty(value: number | null, percent = false) {
  if (value === null) return "Sem dados";
  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: percent ? 0 : 0,
  }).format(value)}${percent ? "%" : ""}`;
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
      className="pointer-events-none absolute inset-x-4 bottom-8 h-10 w-[calc(100%-2rem)] opacity-20"
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
  const deltaGood = kpi.delta !== null && kpi.delta >= 0 === positiveIsGood;
  const DeltaIcon = kpi.delta !== null && kpi.delta < 0 ? ArrowDownRight : ArrowUpRight;
  return (
    <article className="relative min-w-0 overflow-hidden rounded-xl border border-[#e1e9f4] bg-white p-3.5 shadow-[0_6px_18px_-12px_rgba(16,54,102,0.4)] dark:border-slate-700 dark:bg-slate-900 sm:p-4">
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-5 w-5" />
        </span>
        <h3 className="min-h-10 pt-0.5 text-xs font-semibold leading-4 text-[#25466f] dark:text-slate-200 sm:text-sm">
          {title}
        </h3>
      </div>
      {kpi.status === "loading" ? (
        <div className="mt-3 h-9 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
      ) : kpi.status === "error" ? (
        <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
          Não foi possível carregar
        </p>
      ) : (
        <>
          <p
            className={`mt-2 text-2xl font-bold tracking-tight sm:text-[1.8rem] ${
              alert && (kpi.value ?? 0) > 0 ? "text-orange-600" : "text-[#102f5c] dark:text-white"
            }`}
          >
            {pretty(kpi.value, percent)}
          </p>
          <div className="mt-0.5 flex min-h-5 items-center gap-1 text-xs">
            {kpi.delta === null ? (
              <span className="text-slate-500 dark:text-slate-400">
                {kpi.note || "Sem base para comparação"}
              </span>
            ) : (
              <span
                className={`inline-flex items-center gap-0.5 font-semibold ${
                  deltaGood ? "text-emerald-600" : "text-red-600"
                }`}
              >
                <DeltaIcon className="h-3.5 w-3.5" />
                {Math.abs(kpi.delta).toFixed(0)}%
              </span>
            )}
          </div>
          <Sparkline values={kpi.trend} color={alert ? "#f97316" : "#1f7ad8"} />
          <Link
            to={href}
            className="relative z-[1] mt-3 inline-flex w-full items-center justify-end gap-1 text-xs font-semibold text-[#1768c4] hover:text-[#0b3a73] dark:text-blue-300"
          >
            Ver detalhes <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </>
      )}
    </article>
  );
}

function activityIcon(tipo: string) {
  const value = tipo.toLowerCase();
  if (value.includes("estoque") || value.includes("material") || value.includes("compra"))
    return Package;
  if (value.includes("escala") || value.includes("plant")) return Clock3;
  if (value.includes("os") || value.includes("ordem")) return CheckSquare;
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
  const { data: config, isLoading: loadingConfig, isError: configError } = useProdutividadeConfig();
  const [kpis, setKpis] = useState<Kpis>({
    executadas: { ...EMPTY_KPI },
    abertas: { ...EMPTY_KPI },
    produtividade: { ...EMPTY_KPI },
    atrasadas: { ...EMPTY_KPI },
    estoque: { ...EMPTY_KPI },
  });
  const [atividades, setAtividades] = useState<RecentActivity[] | null | undefined>(undefined);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    setKpis({
      executadas: { ...EMPTY_KPI },
      abertas: { ...EMPTY_KPI },
      produtividade: { ...EMPTY_KPI },
      atrasadas: { ...EMPTY_KPI },
      estoque: { ...EMPTY_KPI },
    });
    setAtividades(undefined);
    const update = (key: KpiKey, value: Omit<Kpi, "status">, error?: unknown) => {
      if (!active) return;
      setKpis((current) => ({
        ...current,
        [key]: error ? { ...EMPTY_KPI, status: "error" } : { ...value, status: "ready" },
      }));
    };

    const loadOs = async () => {
      if (!canViewRecords) {
        onOpenCount?.(null);
        update("executadas", {
          value: null,
          delta: null,
          trend: [],
          note: "Sem acesso aos registros.",
        });
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
      const currentStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const previousStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const previousEnd = shiftMonth(today, -1);
      const trendStart = new Date(today);
      trendStart.setDate(today.getDate() - 13);
      const rangeStart = dataISO(previousStart);

      const activeRes = await supabase
        .from("registros_atendimento")
        .select("id", { count: "exact", head: true })
        .in("status_simplificado", ACTIVE_OS_STATUSES);
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

      const closed: {
        id: number;
        status_simplificado: string | null;
        data_entrada: string | null;
        data_modificacao: string | null;
      }[] = [];
      let closedError: unknown = null;
      let from = 0;
      for (;;) {
        const { data, error } = await supabase
          .from("registros_atendimento")
          .select("id,status_simplificado,data_entrada,data_modificacao")
          .in("status_simplificado", COMPLETED_OS_STATUSES)
          .or(
            `and(data_modificacao.gte.${rangeStart},data_modificacao.lte.${todayIso}),and(data_modificacao.is.null,data_entrada.gte.${rangeStart},data_entrada.lte.${todayIso})`,
          )
          .order("id")
          .range(from, from + 999);
        if (error) {
          closedError = error;
          break;
        }
        if (!data?.length) break;
        closed.push(...data);
        if (data.length < 1000) break;
        from += 1000;
      }

      if (closedError) update("executadas", { value: null, delta: null, trend: [] }, closedError);
      else {
        const effectiveDate = (row: {
          data_entrada: string | null;
          data_modificacao: string | null;
        }) => row.data_modificacao || row.data_entrada;
        const currentCount = closed.filter((row) => {
          const date = effectiveDate(row);
          return !!date && date >= dataISO(currentStart) && date <= todayIso;
        }).length;
        const previousCount = closed.filter((row) => {
          const date = effectiveDate(row);
          return !!date && date >= rangeStart && date <= dataISO(previousEnd);
        }).length;
        const byDay = new Map<string, number>();
        for (const row of closed) {
          const date = effectiveDate(row);
          if (date && date >= dataISO(trendStart) && date <= todayIso) {
            byDay.set(date, (byDay.get(date) || 0) + 1);
          }
        }
        update("executadas", {
          value: currentCount,
          delta: percentChange(currentCount, previousCount),
          trend: daysBetween(trendStart, today).map((date) => byDay.get(date) || 0),
        });
      }

      if (activeRes.error) {
        onOpenCount?.(null);
        update("abertas", { value: null, delta: null, trend: [] }, activeRes.error);
      } else {
        onOpenCount?.(activeRes.count ?? 0);
        update("abertas", {
          value: activeRes.count ?? 0,
          delta: null,
          trend: [],
          note: "Sem histórico diário de status.",
        });
      }

      if (overdueError) update("atrasadas", { value: null, delta: null, trend: [] }, overdueError);
      else
        update("atrasadas", {
          value: overdue.filter((row) => {
            const due = parseSlaDate(row.fim_sla);
            return due !== null && dataISO(due) < todayIso;
          }).length,
          delta: null,
          trend: [],
          note: "Sem histórico de status anteriores.",
        });
    };

    const loadProductivity = async () => {
      if (loadingConfig) return;
      if (configError) {
        update("produtividade", { value: null, delta: null, trend: [] }, configError);
        return;
      }
      const today = new Date();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const previousStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const previousEnd = shiftMonth(today, -1);
      const { data: dayRows, error: daysError } = await supabase
        .from("field_dias")
        .select("id,data")
        .gte("data", dataISO(previousStart))
        .lte("data", dataISO(today))
        .order("data");
      if (daysError) {
        update("produtividade", { value: null, delta: null, trend: [] }, daysError);
        return;
      }
      const days = dayRows || [];
      const dayIds = days.map((row) => row.id);
      const activities: Array<{ dia_id: number; ordem_manutencao: number; status: string }> = [];
      for (let offset = 0; offset < dayIds.length; offset += 200) {
        const ids = dayIds.slice(offset, offset + 200);
        let from = 0;
        for (;;) {
          const { data, error } = await supabase
            .from("field_atividades")
            .select("dia_id,ordem_manutencao,status")
            .in("dia_id", ids)
            .order("id")
            .range(from, from + 999);
          if (error) {
            update("produtividade", { value: null, delta: null, trend: [] }, error);
            return;
          }
          if (!data?.length) break;
          activities.push(...data);
          if (data.length < 1000) break;
          from += 1000;
        }
      }
      const dayById = new Map(days.map((day) => [day.id, day.data]));
      const completedByMonth = new Map<string, Set<number>>();
      const completedByDate = new Map<string, Set<number>>();
      for (const activity of activities) {
        const status = activity.status.toLowerCase().trim();
        if (status !== "concluído" && status !== "concluido") continue;
        const order = Number(activity.ordem_manutencao);
        if (!isOrdemServico(order)) continue;
        const date = dayById.get(activity.dia_id);
        if (!date) continue;
        const month = date.slice(0, 7);
        const monthSet = completedByMonth.get(month) || new Set<number>();
        monthSet.add(order);
        completedByMonth.set(month, monthSet);
        const dateSet = completedByDate.get(date) || new Set<number>();
        dateSet.add(order);
        completedByDate.set(date, dateSet);
      }
      const configValue = config;
      const currentDays = daysBetween(monthStart, today);
      const previousDays = daysBetween(
        previousStart,
        new Date(previousEnd.getFullYear(), previousEnd.getMonth(), previousEnd.getDate()),
      );
      const currentGoal = configValue ? metaProporcional(configValue, currentDays) : 0;
      const previousGoal = configValue ? metaProporcional(configValue, previousDays) : 0;
      if (currentGoal <= 0) {
        update("produtividade", {
          value: null,
          delta: null,
          trend: [],
          note: "Meta mensal não configurada.",
        });
        return;
      }
      const currentMonth = dataISO(today).slice(0, 7);
      const previousMonth = dataISO(previousStart).slice(0, 7);
      const currentPercent = ((completedByMonth.get(currentMonth)?.size || 0) / currentGoal) * 100;
      const previousPercent =
        previousGoal > 0
          ? ((completedByMonth.get(previousMonth)?.size || 0) / previousGoal) * 100
          : 0;
      const seriesStart = new Date(today);
      seriesStart.setDate(today.getDate() - 13);
      update("produtividade", {
        value: currentPercent,
        delta: percentChange(currentPercent, previousPercent),
        trend: daysBetween(seriesStart, today).map((date) => completedByDate.get(date)?.size || 0),
        note: "O.S. executadas / meta proporcional",
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
      update("estoque", {
        value: data.filter((row) => Number(row.saldo_atual) < Number(row.estoque_minimo)).length,
        delta: null,
        trend: [],
        note: "Sem histórico de saldo mínimo.",
      });
    };

    const loadActivities = async () => {
      if (!userId) {
        if (active) setAtividades([]);
        return;
      }
      const { data, error } = await supabase
        .from("notificacoes")
        .select("id,tipo,mensagem,criado_em")
        .eq("usuario_id", userId)
        .order("criado_em", { ascending: false })
        .limit(4);
      if (!active) return;
      setAtividades(error ? null : ((data || []) as RecentActivity[]));
    };

    void loadOs().catch((error: unknown) => {
      onOpenCount?.(null);
      update("executadas", { value: null, delta: null, trend: [] }, error);
      update("abertas", { value: null, delta: null, trend: [] }, error);
      update("atrasadas", { value: null, delta: null, trend: [] }, error);
    });
    void loadProductivity().catch((error: unknown) => {
      update("produtividade", { value: null, delta: null, trend: [] }, error);
    });
    void loadInventory().catch((error: unknown) => {
      update("estoque", { value: null, delta: null, trend: [] }, error);
    });
    void loadActivities().catch((error: unknown) => {
      console.error("Erro ao consultar notificações recentes do HUB:", error);
      if (active) setAtividades(null);
    });
    return () => {
      active = false;
    };
  }, [canViewInventory, canViewRecords, config, configError, loadingConfig, onOpenCount, userId]);

  return (
    <>
      <section className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-5">
        <KpiCard
          title="O.S. Executadas (mês atual)"
          kpi={kpis.executadas}
          icon={CheckSquare}
          color="bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-300"
          href="/registros"
        />
        <KpiCard
          title="O.S. Abertas / Pendentes"
          kpi={kpis.abertas}
          icon={Clock3}
          color="bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300"
          href="/registros"
          alert
        />
        <KpiCard
          title="Produtividade da Equipe"
          kpi={kpis.produtividade}
          icon={TrendingUp}
          color="bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-300"
          href="/produtividade"
          percent
        />
        <KpiCard
          title="O.S. Atrasadas (SLA vencido)"
          kpi={kpis.atrasadas}
          icon={AlertTriangle}
          color="bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-300"
          href="/backlog"
          alert
        />
        <KpiCard
          title="Itens Abaixo do Estoque Mínimo"
          kpi={kpis.estoque}
          icon={Package}
          color="bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-300"
          href="/estoque"
          alert
        />
      </section>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">{children}</div>
        {atividades && atividades.length > 0 && (
          <aside className="rounded-xl border border-[#e1e9f4] bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold text-[#102f5c] dark:text-white">Atividades Recentes</h2>
              <span className="text-xs text-slate-500">Recentes</span>
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {atividades.map((activity) => {
                const Icon = activityIcon(`${activity.tipo} ${activity.mensagem}`);
                return (
                  <li key={activity.id} className="flex gap-3 py-3 first:pt-1 last:pb-1">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
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
        )}
        {atividades === null && (
          <aside className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            Não foi possível carregar as atividades recentes.
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
    <div className="flex items-center gap-4">
      <div className="h-12 w-1 shrink-0 rounded-full bg-cyan-300" />
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
