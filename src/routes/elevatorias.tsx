import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import {
  Building2,
  Search,
  X,
  Upload,
  Download,
  Loader2,
  Home,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  HardHat,
} from "lucide-react";
import logoHeader from "@/assets/logo-branca.png";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPermissoesCargo, temPermissao, temPainel } from "@/lib/permissoes";
import type {
  Elevatoria,
  ElevatoriaCompletude,
  CompletudeNivel,
  StatusImplantacao,
  ElevatoriaImplantacao,
} from "@/lib/elevatoria-types";
import { IMPLANTACAO_STATUS_CORES, IMPLANTACAO_STATUS_OPCOES } from "@/lib/elevatoria-types";

export const Route = createFileRoute("/elevatorias")({
  head: () => ({
    meta: [{ title: "Eletromecânica · Ficha da Elevatória" }],
  }),
  component: ElevatoriasPage,
});

type PermissoesElev = {
  podeVer: boolean;
  podeEditar: boolean;
  podeVerMestres: boolean;
  podeEditarMestres: boolean;
  podeExportar: boolean;
  podeImportar: boolean;
};

const COMPLETUDE_OPCOES = [
  { value: "TODAS", label: "Todas" },
  { value: "critico", label: "Crítico (< 50%)" },
  { value: "atencao", label: "Atenção (50-79%)" },
  { value: "bom", label: "Bom (≥ 80%)" },
];

function ElevatoriasPage() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [elevatorias, setElevatorias] = useState<Elevatoria[]>([]);
  const [implantacoes, setImplantacoes] = useState<ElevatoriaImplantacao[]>([]);
  const [completudes, setCompletudes] = useState<Map<number, ElevatoriaCompletude>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroMunicipio, setFiltroMunicipio] = useState("TODAS");
  const [filtroCompletude, setFiltroCompletude] = useState("TODAS");
  const [filtroImplantacao, setFiltroImplantacao] = useState("TODAS");
  const [filtroKpi, setFiltroKpi] = useState("");
  const [permissoes, setPermissoes] = useState<PermissoesElev>({
    podeVer: false,
    podeEditar: false,
    podeVerMestres: false,
    podeEditarMestres: false,
    podeExportar: false,
    podeImportar: false,
  });
  const [dialogImportar, setDialogImportar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate({ to: "/login", replace: true }); return; }
    if (profile?.status === "pendente") { navigate({ to: "/pending", replace: true }); return; }
    if (profile?.status === "bloqueado") { navigate({ to: "/bloqueado", replace: true }); return; }
  }, [user, profile, authLoading, navigate]);

  useEffect(() => {
    if (!profile?.cargo_id) return;
    const init = async () => {
      const { data: panelData } = await supabase
        .from("cargo_paineis")
        .select("paineis!inner(chave)")
        .eq("cargo_id", profile.cargo_id)
        .eq("paineis.chave", "ficha_elevatoria")
        .maybeSingle();
      if (!panelData) { navigate({ to: "/", replace: true }); return; }

      const perms = await getPermissoesCargo(profile.cargo_id);
      setPermissoes({
        podeVer: temPermissao(perms, "ficha_elevatoria", "ver"),
        podeEditar: temPermissao(perms, "ficha_elevatoria", "editar"),
        podeVerMestres: temPermissao(perms, "ficha_elevatoria", "dados_mestres.ver"),
        podeEditarMestres: temPermissao(perms, "ficha_elevatoria", "dados_mestres.editar"),
        podeExportar: temPermissao(perms, "ficha_elevatoria", "exportar"),
        podeImportar: temPermissao(perms, "ficha_elevatoria", "importar"),
      });

      await carregarDados();
    };
    init();
  }, [profile?.cargo_id]);

  const carregarDados = async () => {
    setLoading(true);
    const [elevRes, impRes] = await Promise.all([
      supabase.from("elevatorias").select("*").order("nome"),
      supabase.from("elevatoria_implantacao").select("*"),
    ]);
    if (elevRes.data) setElevatorias(elevRes.data);
    if (impRes.data) setImplantacoes(impRes.data);

    if (elevRes.data && permissoes.podeVerMestres) {
      await calcularCompletudes(elevRes.data);
    }
    setLoading(false);
  };

  const calcularCompletudes = async (elevs: Elevatoria[]) => {
    const tabs = ["elevatoria_equipamento", "elevatoria_eletrica", "elevatoria_hidraulica",
      "elevatoria_rolamentos_selos", "elevatoria_area_influencia", "elevatoria_implantacao"];

    const promises = tabs.map(t => supabase.from(t).select("*"));
    const results = await Promise.all(promises);

    const naRes = await supabase.from("elevatoria_campo_na").select("*");
    const naMap = new Map<string, Set<string>>();
    if (naRes.data) {
      for (const r of naRes.data) {
        const key = `${r.elevatoria_id}:${r.tabela}`;
        if (!naMap.has(key)) naMap.set(key, new Set());
        naMap.get(key)!.add(r.campo);
      }
    }

    const map = new Map<number, ElevatoriaCompletude>();
    for (const elev of elevs) {
      let total = 0;
      let preenchidos = 0;
      let naAplicaveis = 0;

      for (let i = 0; i < tabs.length; i++) {
        const tabData = results[i].data?.filter(r => r.elevatoria_id === elev.id) ?? [];
        if (tabData.length === 0) continue;

        const row = tabData[0];
        const naFields = naMap.get(`${elev.id}:${tabs[i]}`) ?? new Set();
        const fields = Object.keys(row).filter(k =>
          !["id", "elevatoria_id", "criado_em", "atualizado_em"].includes(k)
        );

        for (const field of fields) {
          total++;
          if (naFields.has(field)) {
            naAplicaveis++;
            preenchidos++;
          } else if (row[field] !== null && row[field] !== "" && row[field] !== undefined) {
            preenchidos++;
          }
        }
      }

      const aplicaveis = total - naAplicaveis;
      const pct = aplicaveis > 0 ? (preenchidos / aplicaveis) * 100 : 100;
      const nivel: CompletudeNivel = pct >= 80 ? "bom" : pct >= 50 ? "atencao" : "critico";

      map.set(elev.id, { elevatoria_id: elev.id, total_campos: total, preenchidos, na_aplicaveis: naAplicaveis, percentual: Math.round(pct), nivel });
    }
    setCompletudes(map);
  };

  const municipios = useMemo(() => {
    const s = new Set(elevatorias.map(e => e.municipio).filter(Boolean));
    return Array.from(s).sort();
  }, [elevatorias]);

  const kpis = useMemo(() => {
    const total = elevatorias.length;
    let completudeMedia = 0;
    let criticas = 0;
    let emImplantacao = 0;
    for (const e of elevatorias) {
      const c = completudes.get(e.id);
      if (c) {
        completudeMedia += c.percentual;
        if (c.nivel === "critico") criticas++;
      }
      const imp = implantacoes.find(i => i.elevatoria_id === e.id);
      if (imp && imp.status !== "operacional") emImplantacao++;
    }
    completudeMedia = total > 0 ? Math.round(completudeMedia / total) : 0;
    return { total, completudeMedia, criticas, emImplantacao };
  }, [elevatorias, completudes, implantacoes]);

  const filtered = useMemo(() => {
    let list = elevatorias;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.nome.toLowerCase().includes(q) ||
        (e.planta?.toLowerCase().includes(q)) ||
        (e.municipio?.toLowerCase().includes(q))
      );
    }
    if (filtroMunicipio !== "TODAS") list = list.filter(e => e.municipio === filtroMunicipio);
    if (filtroCompletude !== "TODAS") list = list.filter(e => completudes.get(e.id)?.nivel === filtroCompletude);
    if (filtroImplantacao !== "TODAS") {
      if (filtroImplantacao === "operacional") {
        const idsComImplantacao = new Set(implantacoes.filter(i => i.status === "operacional").map(i => i.elevatoria_id));
        list = list.filter(e => !idsComImplantacao.has(e.id));
      } else {
        const idsFiltro = new Set(implantacoes.filter(i => i.status === filtroImplantacao).map(i => i.elevatoria_id));
        list = list.filter(e => idsFiltro.has(e.id));
      }
    }
    if (filtroKpi === "criticas") list = list.filter(e => completudes.get(e.id)?.nivel === "critico");
    if (filtroKpi === "implantacao") {
      const idsImplantacao = new Set(implantacoes.filter(i => i.status !== "operacional").map(i => i.elevatoria_id));
      list = list.filter(e => idsImplantacao.has(e.id));
    }
    return list;
  }, [elevatorias, search, filtroMunicipio, filtroCompletude, filtroImplantacao, filtroKpi, completudes, implantacoes]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f0f4f8] dark:bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-[#1f7ad6]" />
      </div>
    );
  }

  const BadgeCompletude = ({ nivel, percentual }: { nivel: CompletudeNivel; percentual: number }) => {
    const cls = nivel === "bom" ? "bg-emerald-100 text-emerald-700 border-emerald-300"
      : nivel === "atencao" ? "bg-amber-100 text-amber-700 border-amber-300"
      : "bg-red-100 text-red-700 border-red-300";
    return (
      <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
        <span className={`h-2 w-2 rounded-full ${nivel === "bom" ? "bg-emerald-500" : nivel === "atencao" ? "bg-amber-500" : "bg-red-500"}`} />
        {percentual}%
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] dark:bg-slate-900">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-gradient-to-r from-[#002d74] via-[#003087] to-[#00AEEF] text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <img src={logoHeader} alt="Águas do Rio" className="h-10 w-auto" />
            <Link to="/" className="rounded-full border border-white/20 bg-white/10 p-1.5 transition hover:bg-white/20">
              <Home className="h-4 w-4" />
            </Link>
            <h1 className="text-lg font-semibold tracking-tight">Ficha da Elevatória</h1>
          </div>
          <div className="flex items-center gap-2">
            {permissoes.podeImportar && (
              <button
                onClick={() => setDialogImportar(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-4 py-1.5 text-sm font-medium transition hover:bg-white/25"
              >
                <Upload className="h-4 w-4" /> Importar
              </button>
            )}
            {permissoes.podeExportar && (
              <button
                onClick={() => toast.success("Exportação iniciada")}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-4 py-1.5 text-sm font-medium transition hover:bg-white/25"
              >
                <Download className="h-4 w-4" /> Exportar
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        {elevatorias.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-16 text-center dark:border-slate-600 dark:bg-slate-800">
            <Building2 className="mb-4 h-16 w-16 text-slate-300 dark:text-slate-500" />
            <h2 className="text-xl font-bold text-[#0b3a73] dark:text-white">Nenhuma elevatória cadastrada</h2>
            <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
              Importe a planilha com os dados das elevatórias ou cadastre a primeira manualmente.
            </p>
            <div className="mt-6 flex gap-3">
              {permissoes.podeImportar && (
                <button
                  onClick={() => setDialogImportar(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#1f7ad6] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1665b3]"
                >
                  <Upload className="h-4 w-4" /> Importar Planilha
                </button>
              )}

            </div>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div
                onClick={() => setFiltroKpi("")}
                className={`cursor-pointer rounded-xl border p-4 shadow-sm transition-all hover:shadow-md ${
                  filtroKpi === "" ? "border-blue-400 bg-blue-100 ring-2 ring-blue-300" : "border-blue-200 bg-blue-50"
                }`}
              >
                <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                  <Building2 className="h-3 w-3" /> Total
                </div>
                <div className="mt-1 text-3xl font-bold text-blue-700">{kpis.total}</div>
                <div className="text-[11px] text-blue-500">elevatórias cadastradas</div>
              </div>

              {permissoes.podeVerMestres && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                  <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    <TrendingUp className="h-3 w-3" /> Completude Média
                  </div>
                  <div className="mt-1 text-3xl font-bold text-emerald-700">{kpis.completudeMedia}%</div>
                  <div className="text-[11px] text-emerald-500">do cadastro preenchido</div>
                </div>
              )}

              {permissoes.podeVerMestres && (
                <div
                  onClick={() => setFiltroKpi(filtroKpi === "criticas" ? "" : "criticas")}
                  className={`cursor-pointer rounded-xl border p-4 shadow-sm transition-all hover:shadow-md ${
                    filtroKpi === "criticas" ? "border-red-400 bg-red-100 ring-2 ring-red-300" : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-red-700">
                    <AlertTriangle className="h-3 w-3" /> Críticas
                  </div>
                  <div className="mt-1 text-3xl font-bold text-red-700">{kpis.criticas}</div>
                  <div className="text-[11px] text-red-500">completude &lt; 50%</div>
                </div>
              )}

              <div
                onClick={() => setFiltroKpi(filtroKpi === "implantacao" ? "" : "implantacao")}
                className={`cursor-pointer rounded-xl border p-4 shadow-sm transition-all hover:shadow-md ${
                  filtroKpi === "implantacao" ? "border-amber-400 bg-amber-100 ring-2 ring-amber-300" : "border-amber-200 bg-amber-50"
                }`}
              >
                <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                  <HardHat className="h-3 w-3" /> Em Implantação
                </div>
                <div className="mt-1 text-3xl font-bold text-amber-700">{kpis.emImplantacao}</div>
                <div className="text-[11px] text-amber-500">não operacionais</div>
              </div>
            </div>

            {/* Filters */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por nome, planta ou município..."
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-8 text-sm text-slate-700 placeholder-slate-400 focus:border-[#1f7ad6] focus:outline-none focus:ring-2 focus:ring-[#1f7ad6]/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <select
                value={filtroMunicipio}
                onChange={e => setFiltroMunicipio(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#1f7ad6] focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="TODAS">Todos os municípios</option>
                {municipios.map(m => <option key={m} value={m!}>{m}</option>)}
              </select>

              {permissoes.podeVerMestres && (
                <select
                  value={filtroCompletude}
                  onChange={e => setFiltroCompletude(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#1f7ad6] focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                >
                  {COMPLETUDE_OPCOES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              )}

              <select
                value={filtroImplantacao}
                onChange={e => setFiltroImplantacao(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#1f7ad6] focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="TODAS">Status de implantação</option>
                <option value="operacional">Operacional</option>
                {IMPLANTACAO_STATUS_OPCOES.filter(o => o.value !== "operacional").map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="max-h-[600px] overflow-auto">
                <table className="min-w-[800px] w-full text-left text-[13px]">
                  <thead className="sticky top-0 bg-[#eaf3fb] text-[12px] text-[#0b3a73] z-10 dark:bg-slate-700 dark:text-slate-200">
                    <tr>
                      <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Nome</th>
                      <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Planta</th>
                      <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Tipo</th>
                      <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Município</th>
                      {permissoes.podeVerMestres && (
                        <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Completude</th>
                      )}
                      <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Implantação</th>
                      <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((elev, idx) => {
                      const comp = completudes.get(elev.id);
                      const imp = implantacoes.find(i => i.elevatoria_id === elev.id);
                      return (
                        <tr
                          key={elev.id}
                          className="border-b border-slate-100 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50"
                        >
                          <td className="whitespace-nowrap px-3 py-2 font-medium text-[#0b3a73] dark:text-white">
                            <Link to={`/elevatorias/${elev.id}`} className="hover:text-[#1f7ad6] hover:underline">
                              {elev.nome}
                            </Link>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 font-mono text-[12px] text-slate-600 dark:text-slate-300">
                            {elev.planta || "—"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2">
                            <Badge variant="outline" className="text-[11px]">{elev.tipo || "—"}</Badge>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">
                            {elev.municipio || "—"}
                          </td>
                          {permissoes.podeVerMestres && (
                            <td className="whitespace-nowrap px-3 py-2">
                              {comp ? <BadgeCompletude nivel={comp.nivel} percentual={comp.percentual} /> : "—"}
                            </td>
                          )}
                          <td className="whitespace-nowrap px-3 py-2">
                            {imp ? (
                              <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${IMPLANTACAO_STATUS_CORES[imp.status] || ""}`}>
                                {IMPLANTACAO_STATUS_OPCOES.find(o => o.value === imp.status)?.label || imp.status}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">—</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2">
                            <Link
                              to={`/elevatorias/${elev.id}`}
                              className="rounded-md bg-[#eaf3fb] px-2.5 py-1 text-[11px] font-semibold text-[#1f7ad6] transition hover:bg-[#d4e6f7] dark:bg-slate-700 dark:text-[#38bdf8] dark:hover:bg-slate-600"
                            >
                              Abrir ficha
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={permissoes.podeVerMestres ? 7 : 6} className="px-3 py-8 text-center text-sm text-slate-400">
                          Nenhuma elevatória encontrada com os filtros atuais.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Import Dialog */}
      <Dialog open={dialogImportar} onOpenChange={setDialogImportar}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0b3a73] dark:text-white">
              <Upload className="mr-1 inline h-4 w-4" /> Importar Planilha de Elevatórias
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-slate-600 dark:text-slate-300">
            <p className="mb-3">
              Formatos aceitos: <code>.xlsx</code> (planilha Excel).
            </p>
            <p className="mb-3">
              A planilha deve conter as abas "RELAÇÃO DE ELEVATÓRIAS" e opcionalmente "ELEVATÓRIAS BXD2".
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                toast.success("Arquivo recebido. Iniciando importação...");
                setDialogImportar(false);
              }}
              className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-[#eaf3fb] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#1f7ad6] hover:file:bg-[#d4e6f7]"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ElevatoriasPage;
