import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  Search,
  Sun,
  Moon,
  Upload,
  Users,
  Edit3,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";

export const Route = createFileRoute("/escala")({
  component: EscalaPage,
});

// -------- Types --------

type Colaborador = {
  id: number;
  time_nome: string;
  equipe: string;
  horario: string;
  colaborador: string;
  login_sap: string;
  login_field: string;
  funcao: string;
  escala: string;
  data_ancora: string | null;
  ativo: boolean;
};

type EscalaDia = {
  id: number;
  colaborador_id: number;
  data: string;
  status: "TRABALHA" | "FOLGA";
  editado_manual: boolean;
};

// -------- Helpers --------

const DIAS_SEMANA = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];

function formatDateHeader(d: Date): string {
  const dia = DIAS_SEMANA[d.getDay()];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dia} ${dd}/${mm}/${yyyy}`;
}

function formatDateISO(d: Date): string {
  return d.toISOString().split("T")[0];
}

function parseDateFromHeader(header: string): Date | null {
  const m = header.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}

function getWeekDates(ref: Date): Date[] {
  const dow = ref.getDay();
  const monday = new Date(ref);
  monday.setDate(ref.getDate() - ((dow + 6) % 7));
  const dates: Date[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function isWeekend(d: Date): boolean {
  return d.getDay() === 0 || d.getDay() === 6;
}

function calcularStatusPorFormula(
  col: Colaborador,
  data: Date,
): "TRABALHA" | "FOLGA" | null {
  const escala = col.escala;
  if (escala === "Comercial") {
    return isWeekend(data) ? "FOLGA" : "TRABALHA";
  }
  if (escala === "Plantão 1" || escala === "Plantão 2") {
    if (!col.data_ancora) return null;
    const ancora = new Date(col.data_ancora);
    const diff = Math.floor((data.getTime() - ancora.getTime()) / 86400000);
    if (diff < 0) return null;
    // Ciclo 2x2: dias 0-1 TRABALHA, dias 2-3 FOLGA
    // Plantão 2 tem offset de +2 dias (complementar)
    const offset = escala === "Plantão 2" ? 2 : 0;
    const phase = (diff + offset) % 4;
    return phase < 2 ? "TRABALHA" : "FOLGA";
  }
  // Férias: não tem fórmula, depende do que foi importado/cadastrado manualmente
  return null;
}

// -------- Component --------

function EscalaPage() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [acessoVerificado, setAcessoVerificado] = useState(false);

  // Dados
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [escalaDias, setEscalaDias] = useState<EscalaDia[]>([]);
  const [semanaOffset, setSemanaOffset] = useState(0); // 0 = esta semana
  const [importando, setImportando] = useState(false);

  // Filtros
  const [filtroEquipe, setFiltroEquipe] = useState("TODAS");
  const [filtroEscala, setFiltroEscala] = useState("TODAS");
  const [filtroFuncao, setFiltroFuncao] = useState("TODAS");
  const [searchNome, setSearchNome] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Auth check ---
  useEffect(() => {
    if (authLoading) return;
    if (!user || profile?.status !== "ativo") {
      navigate({ to: "/login", replace: true });
      return;
    }
    if (!profile?.cargo_id) {
      navigate({ to: "/", replace: true });
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("cargo_paineis")
        .select("painel_id, paineis!inner(chave)")
        .eq("cargo_id", profile.cargo_id)
        .eq("paineis.chave", "escala_trabalho")
        .maybeSingle();
      if (!data) {
        navigate({ to: "/", replace: true });
        return;
      }
      setAcessoVerificado(true);
    })();
  }, [authLoading, user, profile, navigate]);

  // --- Carregar dados ---
  const carregarDados = async () => {
    setLoading(true);
    const [colRes, diasRes] = await Promise.all([
      supabase.from("colaboradores_escala").select("*").eq("ativo", true).order("id"),
      supabase.from("escala_dias").select("*"),
    ]);
    if (colRes.data) setColaboradores(colRes.data);
    if (diasRes.data) setEscalaDias(diasRes.data);
    setLoading(false);
  };

  useEffect(() => {
    if (acessoVerificado) carregarDados();
  }, [acessoVerificado]);

  // --- Semana atual ---
  const hoje = new Date();
  const semanaRef = useMemo(() => {
    const ref = new Date(hoje);
    ref.setDate(ref.getDate() + semanaOffset * 7);
    return ref;
  }, [semanaOffset]);

  const diasSemana = useMemo(() => getWeekDates(semanaRef), [semanaRef]);

  // --- Status de cada colaborador em cada dia da semana ---
  const gridStatus = useMemo(() => {
    const map: Record<string, Record<string, "TRABALHA" | "FOLGA">> = {};
    for (const col of colaboradores) {
      const row: Record<string, "TRABALHA" | "FOLGA"> = {};
      for (const d of diasSemana) {
        const iso = formatDateISO(d);
        // 1. Verifica se há registro manual/editado
        const manual = escalaDias.find(
          (ed) => ed.colaborador_id === col.id && ed.data === iso,
        );
        if (manual) {
          row[iso] = manual.status;
          continue;
        }
        // 2. Calcula por fórmula
        const formula = calcularStatusPorFormula(col, d);
        if (formula) {
          row[iso] = formula;
          continue;
        }
        // 3. Se não tem fórmula (Férias sem dados), marca FOLGA
        row[iso] = "FOLGA";
      }
      map[col.id] = row;
    }
    return map;
  }, [colaboradores, escalaDias, diasSemana]);

  // --- Colaboradores filtrados ---
  const colaboradoresFiltrados = useMemo(() => {
    return colaboradores.filter((c) => {
      if (filtroEquipe !== "TODAS" && c.equipe !== filtroEquipe) return false;
      if (filtroEscala !== "TODAS" && c.escala !== filtroEscala) return false;
      if (filtroFuncao !== "TODAS" && c.funcao !== filtroFuncao) return false;
      if (
        searchNome &&
        !c.colaborador.toLowerCase().includes(searchNome.toLowerCase())
      )
        return false;
      return true;
    });
  }, [colaboradores, filtroEquipe, filtroEscala, filtroFuncao, searchNome]);

  // --- Opções únicas para filtros ---
  const equipes = useMemo(
    () => [...new Set(colaboradores.map((c) => c.equipe))].sort(),
    [colaboradores],
  );
  const funcoes = useMemo(
    () => [...new Set(colaboradores.map((c) => c.funcao))].sort(),
    [colaboradores],
  );

  // --- Agrupar por escala ---
  const grupos = useMemo(() => {
    const grupos: { label: string; cols: Colaborador[] }[] = [];
    const ordem = ["Comercial", "Plantão 1", "Plantão 2", "Férias"];
    for (const label of ordem) {
      const cols = colaboradoresFiltrados.filter((c) => c.escala === label);
      if (cols.length) grupos.push({ label, cols });
    }
    return grupos;
  }, [colaboradoresFiltrados]);

  // --- Quem trabalha hoje ---
  const trabalhaHoje = useMemo(() => {
    const hojeISO = formatDateISO(hoje);
    return colaboradores.filter((c) => {
      const status = gridStatus[c.id]?.[hojeISO];
      return status === "TRABALHA";
    });
  }, [colaboradores, gridStatus]);

  const diurnosHoje = useMemo(
    () => trabalhaHoje.filter((c) => c.horario === "Diurno"),
    [trabalhaHoje],
  );
  const noturnosHoje = useMemo(
    () => trabalhaHoje.filter((c) => c.horario === "Noturno"),
    [trabalhaHoje],
  );

  // --- Alternar status (edição manual) ---
  const alternarStatus = async (colId: number, data: string) => {
    const col = colaboradores.find((c) => c.id === colId);
    if (!col) return;
    const atual = gridStatus[colId]?.[data] || "FOLGA";
    const novoStatus = atual === "TRABALHA" ? "FOLGA" : "TRABALHA";
    const existente = escalaDias.find(
      (ed) => ed.colaborador_id === colId && ed.data === data,
    );

    if (existente) {
      const { error } = await supabase
        .from("escala_dias")
        .update({ status: novoStatus, editado_manual: true })
        .eq("id", existente.id);
      if (error) {
        toast.error("Erro ao salvar: " + error.message);
        return;
      }
      setEscalaDias((prev) =>
        prev.map((ed) =>
          ed.id === existente.id ? { ...ed, status: novoStatus, editado_manual: true } : ed,
        ),
      );
    } else {
      const { data: insertResult, error } = await supabase
        .from("escala_dias")
        .insert({
          colaborador_id: colId,
          data: data,
          status: novoStatus,
          editado_manual: true,
        })
        .select("id")
        .single();
      if (error || !insertResult) {
        toast.error("Erro ao salvar: " + (error?.message || ""));
        return;
      }
      setEscalaDias((prev) => [
        ...prev,
        { id: insertResult.id, colaborador_id: colId, data, status: novoStatus, editado_manual: true },
      ]);
    }
    toast.success(`${col.colaborador}: ${novoStatus} em ${formatDateHeader(new Date(data + "T12:00:00"))}`);
  };

  // --- Importar Excel ---
  const handleImportar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportando(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
      if (!json.length) {
        toast.error("Planilha vazia ou inválida.");
        setImportando(false);
        return;
      }

      // Identificar colunas fixas vs colunas de data
      const headers = Object.keys(json[0]);
      const colunasFixas = ["Equipe", "Horário", "Colaborador", "Login SAP", "Login Field", "Função", "Escala"];
      const colunasData = headers.filter((h) => !colunasFixas.includes(h) && parseDateFromHeader(h));

      let importados = 0;
      for (const row of json) {
        const equipe = String(row["Equipe"] || "").trim();
        const horario = String(row["Horário"] || "").trim();
        const colaboradorNome = String(row["Colaborador"] || "").trim();
        const loginSap = String(row["Login SAP"] || "").trim();
        const loginField = String(row["Login Field"] || "").trim();
        const funcao = String(row["Função"] || "").trim();
        const escala = String(row["Escala"] || "").trim();
        if (!colaboradorNome) continue;

        // Inserir/atualizar colaborador
        const { data: colData, error: colErr } = await supabase
          .from("colaboradores_escala")
          .upsert(
            {
              time_nome: "EMEC Baixada 2",
              equipe,
              horario,
              colaborador: colaboradorNome,
              login_sap: loginSap,
              login_field: loginField,
              funcao,
              escala,
              ativo: true,
            },
            { onConflict: "id" },
          )
          .select("id")
          .maybeSingle();

        if (colErr || !colData) continue;
        const colId = colData.id;

        // Encontrar data_ancora para Plantão
        let dataAncora: string | null = null;
        if (escala === "Plantão 1" || escala === "Plantão 2") {
          for (const ch of colunasData) {
            const d = parseDateFromHeader(ch);
            if (!d) continue;
            const val = String(row[ch] || "").trim().toUpperCase();
            if (val === "TRABALHA") {
              dataAncora = formatDateISO(d);
              break;
            }
          }
        }

        // Inserir dias
        const diasParaInserir: { colaborador_id: number; data: string; status: string }[] = [];
        for (const ch of colunasData) {
          const d = parseDateFromHeader(ch);
          if (!d) continue;
          const val = String(row[ch] || "").trim().toUpperCase();
          const status = val === "TRABALHA" || val === "T" ? "TRABALHA" : "FOLGA";
          diasParaInserir.push({
            colaborador_id: colId,
            data: formatDateISO(d),
            status,
          });
        }

        if (diasParaInserir.length) {
          await supabase.from("escala_dias").upsert(diasParaInserir, {
            onConflict: "colaborador_id,data",
          });
        }

        // Atualizar data_ancora se encontrada
        if (dataAncora) {
          await supabase
            .from("colaboradores_escala")
            .update({ data_ancora: dataAncora })
            .eq("id", colId);
        }

        importados++;
      }

      toast.success(`${importados} colaboradores importados com sucesso!`);
      await carregarDados();
    } catch (err) {
      console.error(err);
      toast.error("Falha ao ler o arquivo. Verifique o formato da planilha.");
    }
    setImportando(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- Marcar data_ancora automaticamente para plantonistas sem ancora ---
  useEffect(() => {
    if (!colaboradores.length || !escalaDias.length) return;
    const semAncora = colaboradores.filter(
      (c) => (c.escala === "Plantão 1" || c.escala === "Plantão 2") && !c.data_ancora,
    );
    for (const col of semAncora) {
      const dias = escalaDias
        .filter((ed) => ed.colaborador_id === col.id && ed.status === "TRABALHA")
        .sort((a, b) => a.data.localeCompare(b.data));
      if (dias.length) {
        supabase
          .from("colaboradores_escala")
          .update({ data_ancora: dias[0].data })
          .eq("id", col.id)
          .then(() => carregarDados());
      }
    }
  }, [colaboradores, escalaDias]);

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="mx-auto max-w-7xl p-4 md:p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-[#64748b] hover:text-[#0b3a73]">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <CalendarCheck className="h-6 w-6 text-[#1f7ad6]" />
            <h1 className="text-xl font-bold text-[#0b3a73]">Escala de Trabalho</h1>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleImportar}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importando}
              className="inline-flex items-center gap-1 rounded-md bg-[#1f7ad6] px-3 py-2 text-[13px] font-semibold text-white hover:bg-[#0b3a73] disabled:opacity-50 cursor-pointer"
            >
              {importando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Importar escala (Excel)
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#1f7ad6]" />
          </div>
        ) : (
          <>
            {/* Quem trabalha hoje */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#0b3a73]">
                  <Sun className="h-4 w-4 text-amber-500" />
                  Diurno — Hoje ({hoje.toLocaleDateString("pt-BR")})
                </div>
                <div className="mt-2 text-2xl font-bold text-[#1f7ad6]">{diurnosHoje.length}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {diurnosHoje.map((c) => (
                    <span
                      key={c.id}
                      className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] text-[#0b3a73]"
                    >
                      {c.colaborador}
                    </span>
                  ))}
                  {diurnosHoje.length === 0 && (
                    <span className="text-xs text-slate-400">Nenhum diurno escalado hoje</span>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Moon className="h-4 w-4 text-indigo-500" />
                  Noturno — Hoje ({hoje.toLocaleDateString("pt-BR")})
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-600">{noturnosHoje.length}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {noturnosHoje.map((c) => (
                    <span
                      key={c.id}
                      className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] text-slate-700"
                    >
                      {c.colaborador}
                    </span>
                  ))}
                  {noturnosHoje.length === 0 && (
                    <span className="text-xs text-slate-400">Nenhum noturno escalado hoje</span>
                  )}
                </div>
              </div>
            </div>

            {/* Filtros */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                <input
                  type="text"
                  placeholder="Buscar por nome..."
                  value={searchNome}
                  onChange={(e) => setSearchNome(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm text-slate-700 outline-none ring-[#1f7ad6] focus:ring-2"
                />
              </div>
              <select
                value={filtroEquipe}
                onChange={(e) => setFiltroEquipe(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-[#1f7ad6] focus:ring-2"
              >
                <option value="TODAS">Todas equipes</option>
                {equipes.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
              <select
                value={filtroEscala}
                onChange={(e) => setFiltroEscala(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-[#1f7ad6] focus:ring-2"
              >
                <option value="TODAS">Todas escalas</option>
                <option value="Comercial">Comercial</option>
                <option value="Plantão 1">Plantão 1</option>
                <option value="Plantão 2">Plantão 2</option>
                <option value="Férias">Férias</option>
              </select>
              <select
                value={filtroFuncao}
                onChange={(e) => setFiltroFuncao(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-[#1f7ad6] focus:ring-2"
              >
                <option value="TODAS">Todas funções</option>
                {funcoes.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              <Filter className="h-4 w-4 text-slate-400" />
            </div>

            {/* Navegação de semanas */}
            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={() => setSemanaOffset((p) => p - 1)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" /> 2 semanas anteriores
              </button>
              <span className="text-sm font-semibold text-[#0b3a73]">
                {diasSemana[0].toLocaleDateString("pt-BR")} — {diasSemana[13].toLocaleDateString("pt-BR")}
              </span>
              <button
                onClick={() => setSemanaOffset((p) => p + 1)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Próximas 2 semanas <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {colaboradoresFiltrados.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-20 text-slate-400">
                <Users className="h-10 w-10" />
                <p>Nenhum colaborador encontrado.</p>
                <p className="text-xs">Importe uma planilha ou ajuste os filtros.</p>
              </div>
            ) : (
              /* Grid principal */
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    {/* Cabeçalho: info do colaborador */}
                    <tr className="bg-[#f1f5f9] text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                      <th className="sticky left-0 z-10 bg-[#f1f5f9] px-2 py-2 text-left min-w-[80px]">Equipe</th>
                      <th className="sticky left-[80px] z-10 bg-[#f1f5f9] px-2 py-2 text-left min-w-[70px]">Horário</th>
                      <th className="sticky left-[150px] z-10 bg-[#f1f5f9] px-2 py-2 text-left min-w-[180px]">Colaborador</th>
                      <th className="px-2 py-2 text-left min-w-[80px]">Função</th>
                      <th className="px-2 py-2 text-left min-w-[60px]">Escala</th>
                      {diasSemana.map((d) => {
                        const iso = formatDateISO(d);
                        const header = formatDateHeader(d);
                        const isHoje = iso === formatDateISO(new Date());
                        const isFds = isWeekend(d);
                        return (
                          <th
                            key={iso}
                            className={`px-2 py-2 text-center text-[11px] min-w-[95px] ${
                              isHoje
                                ? "bg-[#1f7ad6] text-white"
                                : isFds
                                  ? "bg-red-50 text-red-600"
                                  : "text-slate-500"
                            }`}
                          >
                            {header.split(" ")[0]}
                            <br />
                            <span className="text-[10px]">{header.split(" ")[1]}</span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {grupos.map((grupo) => (
                      <Fragment key={grupo.label}>
                        {/* Separador de grupo */}
                        <tr key={`sep-${grupo.label}`} className="bg-[#f8fafc]">
                          <td
                            colSpan={5 + diasSemana.length}
                            className="px-2 py-1.5 text-[12px] font-bold text-[#0b3a73]"
                          >
                            {grupo.label}
                          </td>
                        </tr>
                        {grupo.cols.map((col) => {
                          const isPlantao = col.escala === "Plantão 1" || col.escala === "Plantão 2";
                          return (
                            <tr key={col.id} className="hover:bg-slate-50">
                              <td className="sticky left-0 z-10 bg-white px-2 py-1.5 font-mono text-xs text-slate-600">
                                {col.equipe}
                              </td>
                              <td className="sticky left-[80px] z-10 bg-white px-2 py-1.5 text-xs">
                                <span
                                  className={`inline-flex items-center gap-1 ${
                                    col.horario === "Diurno"
                                      ? "text-amber-600"
                                      : "text-indigo-600"
                                  }`}
                                >
                                  {col.horario === "Diurno" ? (
                                    <Sun className="h-3 w-3" />
                                  ) : (
                                    <Moon className="h-3 w-3" />
                                  )}
                                  {col.horario}
                                </span>
                              </td>
                              <td className="sticky left-[150px] z-10 bg-white px-2 py-1.5 text-sm font-medium text-slate-800">
                                {col.colaborador}
                                {isPlantao && col.data_ancora && (
                                  <span className="ml-1 text-[10px] text-slate-400">
                                    (ref: {new Date(col.data_ancora + "T12:00:00").toLocaleDateString("pt-BR")})
                                  </span>
                                )}
                              </td>
                              <td className="px-2 py-1.5 text-xs text-slate-500">{col.funcao}</td>
                              <td className="px-2 py-1.5">
                                <span
                                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                                    col.escala === "Comercial"
                                      ? "bg-green-100 text-green-700"
                                      : col.escala === "Plantão 1"
                                        ? "bg-blue-100 text-blue-700"
                                        : col.escala === "Plantão 2"
                                          ? "bg-purple-100 text-purple-700"
                                          : "bg-orange-100 text-orange-700"
                                  }`}
                                >
                                  {col.escala}
                                </span>
                              </td>
                              {diasSemana.map((d) => {
                                const iso = formatDateISO(d);
                                const status = gridStatus[col.id]?.[iso] || "FOLGA";
                                const manual = escalaDias.find(
                                  (ed) => ed.colaborador_id === col.id && ed.data === iso,
                                );
                                const isHoje = iso === formatDateISO(new Date());
                                const isFds = isWeekend(d);
                                return (
                                  <td
                                    key={iso}
                                    className={`px-2 py-1.5 text-center text-[11px] font-semibold cursor-pointer transition-colors ${
                                      isHoje
                                        ? "ring-2 ring-inset ring-[#1f7ad6]"
                                        : ""
                                    } ${
                                      status === "TRABALHA"
                                        ? "bg-green-50 text-green-700 hover:bg-green-100"
                                        : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                                    } ${isFds && status === "TRABALHA" ? "bg-green-100" : ""}`}
                                    onClick={() => alternarStatus(col.id, iso)}
                                    title={
                                      (manual?.editado_manual ? "Editado manualmente — " : "") +
                                      `Clique para alternar`
                                    }
                                  >
                                    {status === "TRABALHA" ? "TRABALHA" : "FOLGA"}
                                    {manual?.editado_manual && (
                                      <Edit3 className="ml-0.5 inline h-2.5 w-2.5 text-slate-400" />
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
