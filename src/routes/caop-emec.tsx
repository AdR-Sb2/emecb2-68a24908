import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  ShieldAlert,
  Wallet,
  TrendingDown,
  ReceiptText,
  ClipboardList,
  Plus,
  X,
  BarChart3,
  PieChart as PieIcon,
  LineChart as LineIcon,
  Table2,
} from "lucide-react";
import logoHeader from "@/assets/logo-branca.png";
import { NavVoltarHome } from "@/components/nav-voltar-home";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { getPermissoesCargo, temPermissao } from "@/lib/permissoes";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import type { CaopEmec } from "@/lib/caop-emec-types";
import {
  MESES,
  nomeMes,
  TIPOS_OS_PADRAO,
  TIPOS_OS_CORES,
  DETALHAMENTO_PADRAO,
  DETALHAMENTO_CORES,
  formatBRL,
} from "@/lib/caop-emec-types";

export const Route = createFileRoute("/caop-emec")({
  head: () => ({
    meta: [{ title: "Eletromecânica · Caop EMEC" }],
  }),
  component: CaopEmecPage,
});

function CaopEmecPage() {
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [podeVer, setPodeVer] = useState(false);
  const [dados, setDados] = useState<CaopEmec[]>([]);
  const [filtroAno, setFiltroAno] = useState<number | "TODOS">("TODOS");
  const [mesesSelecionados, setMesesSelecionados] = useState<Set<number>>(new Set());
  const [categorias, setCategorias] = useState<string[]>([...DETALHAMENTO_PADRAO]);

  useEffect(() => {
    if (authLoading) return;
    const init = async () => {
      try {
        if (!profile?.cargo_id) {
          navigate({ to: "/", replace: true });
          return;
        }
        const { data: panelData } = await supabase
          .from("cargo_paineis")
          .select("paineis!inner(chave)")
          .eq("cargo_id", profile.cargo_id)
          .eq("paineis.chave", "caop_emec")
          .maybeSingle();
        if (!panelData) {
          toast.error("Acesso não autorizado ao painel Caop EMEC");
          navigate({ to: "/", replace: true });
          return;
        }
        const perms = await getPermissoesCargo(profile.cargo_id);
        setPodeVer(temPermissao(perms, "caop_emec", "ver"));

        const { data } = await supabase
          .from("caop_emec")
          .select("*")
          .order("ano", { ascending: false })
          .order("mes");
        if (data) setDados(data as CaopEmec[]);
      } catch (err) {
        toast.error(
          "Erro ao carregar Caop EMEC: " + (err instanceof Error ? err.message : "desconhecido"),
        );
        navigate({ to: "/", replace: true });
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [profile?.cargo_id, authLoading, navigate]);

  const anos = useMemo(() => {
    const s = new Set(dados.map((d) => d.ano));
    return Array.from(s).sort((a, b) => b - a);
  }, [dados]);

  const filtrados = useMemo(() => {
    let list = dados;
    if (filtroAno !== "TODOS") list = list.filter((d) => d.ano === filtroAno);
    if (mesesSelecionados.size > 0) {
      list = list.filter((d) => mesesSelecionados.has(d.mes));
    }
    return [...list].sort((a, b) => a.mes - b.mes);
  }, [dados, filtroAno, mesesSelecionados]);

  const kpis = useMemo(() => {
    const orcamento = filtrados.reduce((s, d) => s + (d.orcamento ?? 0), 0);
    const custo = filtrados.reduce((s, d) => s + (d.custo_realizado ?? 0), 0);
    const totalOs = filtrados.reduce((s, d) => s + (d.total_os ?? 0), 0);
    const custoPorEvento = totalOs > 0 ? custo / totalOs : 0;
    return { orcamento, custo, totalOs, custoPorEvento };
  }, [filtrados]);

  const tabelaCustoEvento = useMemo(() => {
    return filtrados.map((d) => ({
      mes: nomeMes(d.mes),
      totalOs: d.total_os ?? 0,
      custoOs: d.total_os && d.total_os > 0 ? (d.custo_realizado ?? 0) / d.total_os : 0,
    }));
  }, [filtrados]);

  const dadosDetalhamento = useMemo(() => {
    return filtrados.map((d) => {
      const row: Record<string, number | string> = { mes: nomeMes(d.mes) };
      for (const cat of categorias) {
        const val = d.detalhamento?.[cat] ?? 0;
        row[cat] = typeof val === "number" ? val : Number(val) || 0;
      }
      return row;
    });
  }, [filtrados, categorias]);

  const dadosFolha = useMemo(() => {
    return filtrados.map((d) => ({
      mes: nomeMes(d.mes),
      Orçado: d.orcamento ?? 0,
      Folha: typeof d.detalhamento?.Folha === "number" ? d.detalhamento.Folha : 0,
    }));
  }, [filtrados]);

  const dadosCusto = useMemo(() => {
    return filtrados.map((d) => ({ mes: nomeMes(d.mes), Realizado: d.custo_realizado ?? 0 }));
  }, [filtrados]);

  const dadosProdutividade = useMemo(() => {
    return filtrados.map((d) => ({ mes: nomeMes(d.mes), totalOs: d.total_os ?? 0 }));
  }, [filtrados]);

  const dadosPizza = useMemo(() => {
    const totalPorTipo = new Map<string, number>();
    for (const d of filtrados) {
      for (const t of TIPOS_OS_PADRAO) {
        const v = d.tipos_os?.[t] ?? 0;
        totalPorTipo.set(
          t,
          (totalPorTipo.get(t) ?? 0) + (typeof v === "number" ? v : Number(v) || 0),
        );
      }
    }
    return Array.from(totalPorTipo.entries()).map(([name, value]) => ({ name, value }));
  }, [filtrados]);

  function toggleMes(mes: number) {
    setMesesSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(mes)) next.delete(mes);
      else next.add(mes);
      return next;
    });
  }

  function toggleCategoria(cat: string) {
    setCategorias((prev) => {
      if (prev.includes(cat)) return prev.filter((c) => c !== cat);
      return [...prev, cat];
    });
  }

  const todasCategorias = useMemo(() => {
    const s = new Set<string>(DETALHAMENTO_PADRAO);
    for (const d of dados) {
      if (d.detalhamento) Object.keys(d.detalhamento).forEach((k) => s.add(k));
    }
    return Array.from(s);
  }, [dados]);

  const kpiCards = [
    {
      label: "Orçamento",
      value: formatBRL(kpis.orcamento),
      icon: <Wallet className="h-5 w-5" />,
      color: "bg-sky-100 text-sky-600",
    },
    {
      label: "Custo Realizado",
      value: formatBRL(kpis.custo),
      icon: <TrendingDown className="h-5 w-5" />,
      color: "bg-rose-100 text-rose-600",
    },
    {
      label: "Custo por Evento",
      value: formatBRL(kpis.custoPorEvento),
      icon: <ReceiptText className="h-5 w-5" />,
      color: "bg-amber-100 text-amber-600",
    },
    {
      label: "Total de O.S.",
      value: String(kpis.totalOs),
      icon: <ClipboardList className="h-5 w-5" />,
      color: "bg-emerald-100 text-emerald-600",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-3 md:p-6">
      <div className="mb-4 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#002d74] via-[#003087] to-[#00AEEF] p-4 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.6)] print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-14 shrink-0 items-center justify-center rounded-2xl">
              <img
                src={logoHeader}
                alt="Águas do Rio"
                className="h-14 w-auto object-contain"
                loading="eager"
              />
            </div>
            <div className="min-w-0 text-white">
              <p className="truncate text-lg font-semibold">Águas do Rio</p>
              <p className="truncate text-sm text-cyan-50/90">
                Eletromecânica · Caop EMEC (Centro de Apoio Operacional)
              </p>
            </div>
          </div>
          <NavVoltarHome />
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <Loader2 className="h-6 w-6 animate-spin text-[#1f7ad6]" />
        </div>
      ) : !podeVer ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800">
          <ShieldAlert className="mb-2 h-8 w-8" />
          Você não tem permissão para visualizar o Caop EMEC.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Ano
                </span>
                <select
                  value={filtroAno === "TODOS" ? "TODOS" : String(filtroAno)}
                  onChange={(e) =>
                    setFiltroAno(e.target.value === "TODOS" ? "TODOS" : Number(e.target.value))
                  }
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#1f7ad6] focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="TODOS">Todos os anos</option>
                  {anos.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Mês (múltiplo)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {MESES.map((m) => {
                    const ativo = mesesSelecionados.has(m.value);
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => toggleMes(m.value)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                          ativo
                            ? "border-[#1f7ad6] bg-[#1f7ad6] text-white"
                            : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {mesesSelecionados.size > 0 && (
                <button
                  type="button"
                  onClick={() => setMesesSelecionados(new Set())}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400"
                >
                  <X className="h-3.5 w-3.5" /> Limpar meses
                </button>
              )}
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {kpiCards.map((k) => (
              <div
                key={k.label}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <div
                  className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${k.color}`}
                >
                  {k.icon}
                </div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {k.label}
                </div>
                <div className="mt-0.5 text-xl font-bold text-[#0b3a73] dark:text-white">
                  {k.value}
                </div>
              </div>
            ))}
          </div>

          {/* Tabela Custo/Evento */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#0b3a73] dark:text-white">
              <Table2 className="h-4 w-4" /> Custo/Evento
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-slate-200 text-[12px] text-slate-500 dark:border-slate-700">
                    <th className="px-3 py-2 font-semibold">Mês</th>
                    <th className="px-3 py-2 font-semibold">Total OS</th>
                    <th className="px-3 py-2 font-semibold">Custo/OS</th>
                  </tr>
                </thead>
                <tbody>
                  {tabelaCustoEvento.map((r) => (
                    <tr
                      key={r.mes}
                      className="border-b border-slate-100 last:border-0 dark:border-slate-700"
                    >
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{r.mes}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{r.totalOs}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                        {formatBRL(r.custoOs)}
                      </td>
                    </tr>
                  ))}
                  {tabelaCustoEvento.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-6 text-center text-slate-400">
                        Nenhum dado para os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Gráfico de Barras Empilhadas - Detalhamento */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#0b3a73] dark:text-white">
                <BarChart3 className="h-4 w-4" /> Detalhamento
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {todasCategorias.map((cat) => {
                  const ativo = categorias.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategoria(cat)}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                        ativo
                          ? "border-[#1f7ad6] bg-[#1f7ad6] text-white"
                          : "border-slate-300 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {ativo ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dadosDetalhamento}
                  margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number | string) => formatBRL(Number(value) || 0)} />
                  <Legend />
                  {categorias.map((cat) => (
                    <Bar
                      key={cat}
                      dataKey={cat}
                      stackId="a"
                      fill={DETALHAMENTO_CORES[cat] ?? "#0b3a73"}
                      radius={
                        categorias[categorias.length - 1] === cat ? [4, 4, 0, 0] : [0, 0, 0, 0]
                      }
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Folha - Orçado x Realizado e Custo Realizado */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#0b3a73] dark:text-white">
                <LineIcon className="h-4 w-4" /> Folha - Orçado x Realizado
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dadosFolha} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number | string) => formatBRL(Number(value) || 0)}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="Orçado" stroke="#0b3a73" strokeWidth={2} />
                    <Line type="monotone" dataKey="Folha" stroke="#ef4444" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#0b3a73] dark:text-white">
                <LineIcon className="h-4 w-4" /> Custo - Realizado
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dadosCusto} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number | string) => formatBRL(Number(value) || 0)}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="Realizado" stroke="#f59e0b" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Produtividade e Exec/Tipo */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#0b3a73] dark:text-white">
                <BarChart3 className="h-4 w-4" /> Produtividade
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dadosProdutividade}
                    margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="totalOs" name="Total O.S." fill="#0b3a73" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#0b3a73] dark:text-white">
                <PieIcon className="h-4 w-4" /> Exec/Tipo
              </div>
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <div className="h-52 w-full sm:w-1/2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dadosPizza}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                        startAngle={90}
                        endAngle={-270}
                      >
                        {dadosPizza.map((d, i) => (
                          <Cell key={d.name} fill={TIPOS_OS_CORES[i % TIPOS_OS_CORES.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number | string, name: string) => {
                          const total = dadosPizza.reduce((s, d) => s + d.value, 0);
                          const v = Number(value) || 0;
                          const pct = total > 0 ? Math.round((v / total) * 100) : 0;
                          return [`${v} (${pct}%)`, name];
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-1/2">
                  {dadosPizza.map((d, i) => {
                    const total = dadosPizza.reduce((s, x) => s + x.value, 0);
                    const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
                    return (
                      <div
                        key={d.name}
                        className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-slate-700"
                      >
                        <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ background: TIPOS_OS_CORES[i % TIPOS_OS_CORES.length] }}
                          />
                          {d.name}
                        </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {d.value} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                  {dadosPizza.length === 0 && (
                    <p className="py-6 text-center text-sm text-slate-400">Sem dados.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CaopEmecPage;
