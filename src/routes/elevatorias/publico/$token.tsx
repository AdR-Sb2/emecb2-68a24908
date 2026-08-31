import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Building2, Loader2, Search, History, Calendar, HardHat, Eye } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ListaRegistros } from "@/components/registros/ListaRegistros";
import type { PermissoesRegistros } from "@/lib/registros-permissoes";
import type {
  Elevatoria,
  ElevatoriaEquipamento,
  ElevatoriaEletricaGeral,
  ElevatoriaImplantacao,
  StatusImplantacao,
} from "@/lib/elevatoria-types";
import { IMPLANTACAO_STATUS_CORES, IMPLANTACAO_STATUS_OPCOES } from "@/lib/elevatoria-types";

export const Route = createFileRoute("/elevatorias/publico/$token")({
  component: PublicoElevatoriasPage,
  head: () => ({
    meta: [{ title: "Ficha da Elevatória · Visualização Pública" }],
  }),
});

const PERMISOES_PUBLICAS: PermissoesRegistros = {
  visualizar: true,
  criar: false,
  importar: false,
  anexarPdf: false,
};

function PublicoElevatoriasPage() {
  const { token } = Route.useParams();
  const [elevatorias, setElevatorias] = useState<Elevatoria[]>([]);
  const [implantacoes, setImplantacoes] = useState<ElevatoriaImplantacao[]>([]);
  const [equipamentos, setEquipamentos] = useState<ElevatoriaEquipamento[]>([]);
  const [eletricaGeral, setEletricaGeral] = useState<ElevatoriaEletricaGeral[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filtroMunicipio, setFiltroMunicipio] = useState("TODAS");
  const [filtroTipo, setFiltroTipo] = useState("TODAS");
  const [filtroTipoConstrutivo, setFiltroTipoConstrutivo] = useState("TODAS");
  const [filtroImplantacao, setFiltroImplantacao] = useState("TODAS");
  const [filtroEndereco, setFiltroEndereco] = useState("TODAS");
  const [sortField, setSortField] = useState("nome");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [registrosDialog, setRegistrosDialog] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data: config, error: errConfig } = await supabase
        .from("elevatorias_config")
        .select("link_publico_token")
        .eq("id", 1)
        .maybeSingle();
      if (errConfig || !config?.link_publico_token || config.link_publico_token !== token) {
        setErro("Link não encontrado ou revogado.");
        setLoading(false);
        return;
      }

      const [elevRes, impRes, equipRes, egRes] = await Promise.all([
        supabase.from("elevatorias").select("*").order("nome"),
        supabase.from("elevatoria_implantacao").select("*"),
        supabase.from("elevatoria_equipamento").select("*"),
        supabase.from("elevatoria_eletrica_geral").select("*"),
      ]);
      if (elevRes.data) setElevatorias(elevRes.data as Elevatoria[]);
      if (impRes.data) setImplantacoes(impRes.data as ElevatoriaImplantacao[]);
      if (equipRes.data) setEquipamentos(equipRes.data as ElevatoriaEquipamento[]);
      if (egRes.data) setEletricaGeral(egRes.data as ElevatoriaEletricaGeral[]);

      setLoading(false);
    })();
  }, [token]);

  const municipios = useMemo(() => {
    const s = new Set(elevatorias.map((e) => e.municipio).filter(Boolean));
    return Array.from(s).sort() as string[];
  }, [elevatorias]);

  const tipos = useMemo(() => {
    const s = new Set(elevatorias.map((e) => e.tipo).filter(Boolean));
    return Array.from(s).sort() as string[];
  }, [elevatorias]);

  const enderecos = useMemo(() => {
    const s = new Set(elevatorias.map((e) => e.endereco).filter(Boolean));
    return Array.from(s).sort() as string[];
  }, [elevatorias]);

  const tiposConstrutivos = useMemo(() => {
    const s = new Set(equipamentos.map((e) => e.tipo_construtivo_elevatoria).filter(Boolean));
    return Array.from(s).sort() as string[];
  }, [equipamentos]);

  const filtered = useMemo(() => {
    let result = elevatorias;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((e) => {
        const eq = equipamentos.find((x) => x.elevatoria_id === e.id);
        const eg = eletricaGeral.find((x) => x.elevatoria_id === e.id);
        return (
          (e.nome ?? "").toLowerCase().includes(q) ||
          (e.planta ?? "").toLowerCase().includes(q) ||
          (e.municipio ?? "").toLowerCase().includes(q) ||
          (e.tipo ?? "").toLowerCase().includes(q) ||
          (e.endereco ?? "").toLowerCase().includes(q) ||
          (e.obs ?? "").toLowerCase().includes(q) ||
          (eg?.num_cliente ?? "").toLowerCase().includes(q) ||
          (eq?.tipo_construtivo_elevatoria ?? "").toLowerCase().includes(q) ||
          (eq?.potencia_motor_cv ?? "").toLowerCase().includes(q)
        );
      });
    }
    if (filtroMunicipio !== "TODAS") {
      result = result.filter((e) => e.municipio === filtroMunicipio);
    }
    if (filtroTipo !== "TODAS") {
      result = result.filter((e) => e.tipo === filtroTipo);
    }
    if (filtroEndereco !== "TODAS") {
      result = result.filter((e) => e.endereco === filtroEndereco);
    }
    if (filtroTipoConstrutivo !== "TODAS") {
      result = result.filter(
        (e) =>
          equipamentos.find((q) => q.elevatoria_id === e.id)?.tipo_construtivo_elevatoria ===
          filtroTipoConstrutivo,
      );
    }
    if (filtroImplantacao !== "TODAS") {
      result = result.filter((e) => {
        const imp = implantacoes.find((i) => i.elevatoria_id === e.id);
        return imp?.status === filtroImplantacao;
      });
    }
    result = [...result].sort((a, b) => {
      const va = String(a[sortField as keyof Elevatoria] ?? "");
      const vb = String(b[sortField as keyof Elevatoria] ?? "");
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    });
    return result;
  }, [
    elevatorias,
    search,
    filtroMunicipio,
    filtroTipo,
    filtroEndereco,
    filtroTipoConstrutivo,
    filtroImplantacao,
    sortField,
    sortDir,
    implantacoes,
    equipamentos,
    eletricaGeral,
  ]);

  const kpis = useMemo(() => {
    const total = elevatorias.length;
    let operacionais = 0;
    for (const e of elevatorias) {
      const imp = implantacoes.find((i) => i.elevatoria_id === e.id);
      if (imp?.status === "operacional") operacionais++;
    }
    return { total, operacionais };
  }, [elevatorias, implantacoes]);

  function toggleSort(field: string) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0b2d5e] via-[#0f4c8a] to-[#38a3d9]">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-white" />
          <p className="mt-4 text-sm text-white/80">Carregando ficha da elevatória…</p>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="text-center">
          <div className="mb-4 text-6xl">🔒</div>
          <h2 className="text-xl font-semibold text-slate-700">Link não encontrado</h2>
          <p className="mt-2 text-sm text-slate-500">{erro}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <style>{`
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <header className="bg-gradient-to-br from-[#0b2d5e] via-[#0f4c8a] to-[#38a3d9] px-4 pt-5 pb-5 md:px-8 md:pt-7 md:pb-6">
        <div className="mx-auto max-w-[90rem]">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-medium tracking-widest text-white/60 uppercase">
            <Eye className="h-2.5 w-2.5" />
            Visualização pública
          </div>
          <h1
            className="text-2xl font-extrabold text-white md:text-3xl"
            style={{ letterSpacing: "-0.03em" }}
          >
            Ficha da Elevatória
          </h1>
          <p className="mt-1 text-xs text-white/50">Águas do Rio · Eletromecânica Baixada 2</p>

          {/* KPIs */}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-2">
            {[
              { label: "Total", value: kpis.total, icon: <Building2 className="h-4 w-4" /> },
              {
                label: "Operacionais",
                value: kpis.operacionais,
                icon: <HardHat className="h-4 w-4" />,
                accent: "#60a5fa",
              },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 backdrop-blur-md"
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{ background: kpi.accent ? `${kpi.accent}25` : "rgba(255,255,255,0.12)" }}
                >
                  <span style={{ color: kpi.accent || "rgba(255,255,255,0.85)" }}>{kpi.icon}</span>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-white/45 leading-tight">{kpi.label}</p>
                  <p
                    className="text-base font-extrabold text-white leading-tight"
                    style={{ letterSpacing: "-0.02em" }}
                  >
                    {kpi.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md no-print">
        <div className="mx-auto flex max-w-[90rem] items-center gap-2 px-4 py-2 md:px-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, planta, município, UC, endereço..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none"
            />
          </div>
          <select
            value={filtroMunicipio}
            onChange={(e) => setFiltroMunicipio(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-600 focus:border-blue-400 focus:outline-none"
          >
            <option value="TODAS">Municípios</option>
            {municipios.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={filtroEndereco}
            onChange={(e) => setFiltroEndereco(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-600 focus:border-blue-400 focus:outline-none"
          >
            <option value="TODAS">Endereços</option>
            {enderecos.map((en) => (
              <option key={en} value={en}>
                {en}
              </option>
            ))}
          </select>
          <select
            value={filtroImplantacao}
            onChange={(e) => setFiltroImplantacao(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-600 focus:border-blue-400 focus:outline-none"
          >
            <option value="TODAS">Implantação</option>
            {IMPLANTACAO_STATUS_OPCOES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <main className="mx-auto max-w-[90rem] px-4 py-4 md:px-8">
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Building2 className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">Nenhuma elevatória encontrada</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="max-h-[70vh] overflow-auto">
              <table className="min-w-[1080px] w-full text-left text-[13px]">
                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-[#eaf3fb] text-[12px] text-[#0b3a73]">
                  <tr>
                    {[
                      { key: "nome", label: "Nome" },
                      { key: "planta", label: "Planta" },
                      { key: "tipo", label: "Tipo" },
                      { key: "municipio", label: "Município" },
                    ].map((col) => (
                      <th
                        key={col.key}
                        className="cursor-pointer whitespace-nowrap px-3 py-2.5 font-semibold select-none"
                        onClick={() => toggleSort(col.key)}
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {sortField === col.key && (
                            <span className="text-[#1f7ad6]">{sortDir === "asc" ? "↑" : "↓"}</span>
                          )}
                        </span>
                      </th>
                    ))}
                    <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Endereço</th>
                    <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Implantação</th>
                    <th className="whitespace-nowrap px-3 py-2.5 font-semibold">
                      Tipo Construtivo
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Potência Motor</th>
                    <th className="whitespace-nowrap px-3 py-2.5 font-semibold">UC</th>
                    <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Obs</th>
                    <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((elev) => {
                    const imp = implantacoes.find((i) => i.elevatoria_id === elev.id);
                    const equip = equipamentos.find((q) => q.elevatoria_id === elev.id);
                    const eg = eletricaGeral.find((g) => g.elevatoria_id === elev.id);
                    const stImp = imp?.status as StatusImplantacao | undefined;

                    return (
                      <tr
                        key={elev.id}
                        className="border-b border-slate-50 transition-colors hover:bg-blue-50/30"
                      >
                        <td className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-800">
                          {elev.nome}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                          {elev.planta || "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                          {elev.tipo || "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                          {elev.municipio || "—"}
                        </td>
                        <td
                          className="max-w-[220px] truncate px-3 py-2.5 text-slate-600"
                          title={elev.endereco || ""}
                        >
                          {elev.endereco || "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5">
                          {stImp ? (
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${IMPLANTACAO_STATUS_CORES[stImp] ?? ""}`}
                            >
                              {IMPLANTACAO_STATUS_OPCOES.find((o) => o.value === stImp)?.label ??
                                stImp}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                          {equip?.tipo_construtivo_elevatoria || "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                          {equip?.potencia_motor_cv || "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                          {eg?.num_cliente || "—"}
                        </td>
                        <td
                          className="max-w-[240px] truncate px-3 py-2.5 text-slate-600"
                          title={elev.obs || ""}
                        >
                          {elev.obs || "—"}
                        </td>

                        <td className="whitespace-nowrap px-3 py-2.5">
                          <button
                            onClick={() => setRegistrosDialog(elev.id)}
                            className="rounded-md bg-[#eaf3fb] px-2 py-1 text-[11px] font-semibold text-[#1f7ad6] transition hover:bg-[#d4e6f7]"
                            title="Registros"
                          >
                            <History className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Registros Dialog (read-only) */}
      <Dialog
        open={registrosDialog !== null}
        onOpenChange={(o) => {
          if (!o) setRegistrosDialog(null);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#0b3a73]">
              <History className="h-4 w-4" /> Registros da Elevatória
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {registrosDialog !== null && (
              <ListaRegistros elevatoriaId={registrosDialog} permissoes={PERMISOES_PUBLICAS} />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-4 py-4 text-center text-[10px] text-slate-400 md:px-8">
        Águas do Rio · Eletromecânica Baixada 2 · Visualização pública
      </footer>
    </div>
  );
}
