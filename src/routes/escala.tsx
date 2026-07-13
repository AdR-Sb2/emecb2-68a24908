import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Loader2,
  Search,
  Sun,
  Moon,
  Upload,
  Users,
  Edit3,
  Phone,
  Trash2,
  Plus,
  GripVertical,
  Home,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import logoHeader from "@/assets/logo-branca.png";

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
  telefone: string;
  especialidade: string;
  ordem: number;
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

function getWeekDates(ref: Date): Date[] {
  const dow = ref.getDay();
  const monday = new Date(ref);
  monday.setDate(ref.getDate() - ((dow + 6) % 7));
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
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
  const esc = escala.toUpperCase();
  if (esc === "COMERCIAL") {
    return isWeekend(data) ? "FOLGA" : "TRABALHA";
  }
  if (esc === "PLANTÃO 1" || esc === "PLANTÃO 2") {
    if (!col.data_ancora) return null;
    const ancora = new Date(col.data_ancora);
    const diff = Math.floor((data.getTime() - ancora.getTime()) / 86400000);
    if (diff < 0) return null;
    // Ciclo 2x2: dias 0-1 TRABALHA, dias 2-3 FOLGA
    // Plantão 2 tem offset de +2 dias (complementar)
    const offset = esc === "PLANTÃO 2" ? 2 : 0;
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

  // Sort
  const [sortPor, setSortPor] = useState("equipe");

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
      supabase.from("colaboradores_escala").select("*").eq("ativo", true).order("ordem"),
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
    let result = colaboradores.filter((c) => {
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
    if (sortPor === "equipe") result.sort((a, b) => a.equipe.localeCompare(b.equipe));
    else if (sortPor === "nome") result.sort((a, b) => a.colaborador.localeCompare(b.colaborador));
    else if (sortPor === "escala") result.sort((a, b) => a.escala.localeCompare(b.escala));
    else if (sortPor === "ordem") result.sort((a, b) => a.ordem - b.ordem);
    return result;
  }, [colaboradores, filtroEquipe, filtroEscala, filtroFuncao, searchNome, sortPor]);

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
    const ordem = ["COMERCIAL", "PLANTÃO 1", "PLANTÃO 2", "FÉRIAS"];
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

  const hojeISO = formatDateISO(hoje);

  const diurnosHoje = useMemo(
    () => trabalhaHoje.filter((c) => c.horario.toUpperCase() === "DIURNO"),
    [trabalhaHoje],
  );
  const noturnosHoje = useMemo(
    () => trabalhaHoje.filter((c) => c.horario.toUpperCase() === "NOTURNO"),
    [trabalhaHoje],
  );

  const equipesHoje = useMemo(
    () => new Set(trabalhaHoje.map((c) => c.equipe)).size,
    [trabalhaHoje],
  );

  // --- Estatísticas por escala ---
  const statsEscala = useMemo(() => {
    const comercial = colaboradores.filter((c) => c.escala.toUpperCase() === "COMERCIAL");
    const plantao1 = colaboradores.filter((c) => c.escala.toUpperCase() === "PLANTÃO 1");
    const plantao2 = colaboradores.filter((c) => c.escala.toUpperCase() === "PLANTÃO 2");
    return {
      comercial: {
        tecnicos: comercial.length,
        equipes: new Set(comercial.map((c) => c.equipe)).size,
      },
      plantao: {
        tecnicos: plantao1.length + plantao2.length,
        equipes: new Set([...plantao1, ...plantao2].map((c) => c.equipe)).size,
      },
      totalEquipes: new Set(colaboradores.map((c) => c.equipe)).size,
    };
  }, [colaboradores]);

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
      const wb = XLSX.read(buf, { type: "array", cellDates: false });
      const ws = wb.Sheets["ESCALA EQUIPES"] || wb.Sheets[wb.SheetNames[0]];
      const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { defval: null, header: 1 });

      // Encontrar linha de cabeçalho (EQUIPE, HORARIO, COLABORADOR...)
      let headerRow = -1;
      let dateRow = -1;
      for (let i = 0; i < Math.min(10, rows.length); i++) {
        const r = rows[i];
        if (r && String(r[0] || "").trim().toUpperCase() === "EQUIPE") headerRow = i;
      }
      if (headerRow < 0) {
        toast.error("Formato de planilha não reconhecido. Procure a aba 'ESCALA EQUIPES'.");
        setImportando(false);
        return;
      }
      dateRow = headerRow + 1;

      const headers = rows[headerRow] as unknown[];
      const dateSerials = rows[dateRow] as (number | null)[];

      // Identificar colunas fixas e colunas de data
      const colunasFixas = ["EQUIPE", "HORARIO", "COLABORADOR", "LOGIN SAP", "LOGIN FIELD", "FUNÇÃO", "ESCALA"];
      const colunasData: { index: number; date: Date }[] = [];
      for (let i = 7; i < headers.length; i++) {
        const serial = dateSerials[i];
        if (typeof serial === "number") {
          const d = new Date((serial - 25569) * 86400000);
          if (!isNaN(d.getTime())) colunasData.push({ index: i, date: d });
        }
      }

      if (!colunasData.length) {
        toast.error("Nenhuma coluna de data encontrada na planilha.");
        setImportando(false);
        return;
      }

      let importados = 0;
      for (let i = dateRow + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !Array.isArray(row)) continue;
        const colaboradorNome = String(row[2] || "").trim();
        if (!colaboradorNome || colaboradorNome === "VAGO" || colaboradorNome === "-") continue;

        const equipe = String(row[0] || "").trim() || "—";
        const horario = String(row[1] || "").trim();
        const loginSap = String(row[3] || "").trim();
        const loginField = String(row[4] || "").trim();
        const funcao = String(row[5] || "").trim();
        const escala = String(row[6] || "").trim();

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

        // Encontrar data_ancora
        let dataAncora: string | null = null;
        if (escala.toUpperCase() === "PLANTÃO 1" || escala.toUpperCase() === "PLANTÃO 2") {
          for (const cd of colunasData) {
            const val = String(row[cd.index] || "").trim().toUpperCase();
            if (val === "TRABALHA") {
              dataAncora = formatDateISO(cd.date);
              break;
            }
          }
        }

        // Inserir dias
        const diasParaInserir: { colaborador_id: number; data: string; status: string }[] = [];
        for (const cd of colunasData) {
          const val = String(row[cd.index] || "").trim().toUpperCase();
          const status = val === "TRABALHA" ? "TRABALHA" : "FOLGA";
          diasParaInserir.push({
            colaborador_id: colId,
            data: formatDateISO(cd.date),
            status,
          });
        }

        if (diasParaInserir.length) {
          const { error: upsertErr } = await supabase
            .from("escala_dias")
            .upsert(diasParaInserir, { onConflict: "colaborador_id,data" });
          if (upsertErr) console.error("Erro ao inserir dias:", upsertErr);
        }

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

  // --- Exportar Excel ---
  const handleExportar = async () => {
    const diasExport = diasSemana;
    if (!diasExport.length) { toast.error("Nenhum dia para exportar."); return; }

    const dataInicial = formatDateISO(diasExport[0]);
    const dataFinal = formatDateISO(diasExport[6]);

    const { default: ExcelJS } = await import("exceljs");

    const wb = new ExcelJS.Workbook();
    wb.creator = "EMEC Baixada 2";
    const ws = wb.addWorksheet("ESCALA EQUIPES");

    const DIAS_ABREV = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];

    // Cores
    const AZUL_CLARO = "003087";
    const AZUL_MEDIO = "002d74";
    const VERDE_FUNDO = "d4edda";
    const VERMELHO_TEXTO = "FF0000";
    const BRANCO = "FFFFFF";

    // ---- CABEÇALHO PRINCIPAL (linha 1) ----
    const numColunas = 7 + diasExport.length;
    ws.mergeCells(1, 1, 1, numColunas);

    const tituloCell = ws.getCell("A1");
    tituloCell.value = "INFORMAÇÕES TIME EMEC - BAIXADA 2";
    tituloCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: BRANCO } };
    tituloCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL_CLARO } };
    tituloCell.alignment = { horizontal: "left", vertical: "middle" };

    // Título "ESCALA DE TRABALHO" na mesma linha, à direita
    const escalaCell = ws.getCell(1, numColunas);
    escalaCell.value = "ESCALA DE TRABALHO";
    escalaCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: BRANCO } };
    escalaCell.alignment = { horizontal: "right", vertical: "middle" };

    // ---- CABEÇALHO DE COLUNAS (linha 2) ----
    const colunasFixas = ["EQUIPE", "HORARIO", "COLABORADOR", "LOGIN SAP", "Login Field", "FUNÇÃO", "ESCALA"];

    // Primeira linha do cabeçalho: cabeçalhos fixos + dias (abreviados)
    for (let i = 0; i < colunasFixas.length; i++) {
      const cell = ws.getCell(2, i + 1);
      cell.value = colunasFixas[i];
      cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: BRANCO } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL_CLARO } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    }

    for (let i = 0; i < diasExport.length; i++) {
      const colIdx = 8 + i;
      const d = diasExport[i];
      const abrev = DIAS_ABREV[d.getDay()];
      const cell = ws.getCell(2, colIdx);
      cell.value = abrev;
      cell.font = { name: "Calibri", size: 9, bold: true, color: { argb: BRANCO } };
      cell.alignment = { horizontal: "center", vertical: "middle" };

      if (d.getDay() === 0 || d.getDay() === 6) {
        cell.font = { name: "Calibri", size: 9, bold: true, color: { argb: VERMELHO_TEXTO } };
      }

      // Data na linha 3
      const dataCell = ws.getCell(3, colIdx);
      dataCell.value = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
      dataCell.font = { name: "Calibri", size: 9, color: { argb: BRANCO } };
      dataCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL_CLARO } };
      dataCell.alignment = { horizontal: "center", vertical: "middle" };
    }

    // Preencher o restante da linha 3 para colunas fixas com fundo azul
    for (let i = 0; i < colunasFixas.length; i++) {
      const cell = ws.getCell(3, i + 1);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL_CLARO } };
    }

    // ---- DADOS ----
    let linhaAtual = 4;
    const ordem = ["COMERCIAL", "PLANTÃO 1", "PLANTÃO 2", "FÉRIAS"];

    for (const label of ordem) {
      const cols = colaboradoresFiltrados.filter((c) => c.escala === label);
      if (!cols.length) continue;

      // Linha de separação entre grupos
      if (linhaAtual > 4) {
        linhaAtual++;
      }

      for (const col of cols) {
        const row = ws.getRow(linhaAtual);
        row.getCell(1).value = col.equipe;
        row.getCell(2).value = col.horario;
        row.getCell(3).value = col.colaborador;
        row.getCell(4).value = col.login_sap;
        row.getCell(5).value = col.login_field;
        row.getCell(6).value = col.funcao;
        row.getCell(7).value = col.escala;

        // Estilo básico das células fixas
        for (let i = 1; i <= 7; i++) {
          const cell = row.getCell(i);
          cell.font = { name: "Calibri", size: 10 };
          cell.border = {
            top: { style: "thin", color: { argb: "d0d0d0" } },
            left: { style: "thin", color: { argb: "d0d0d0" } },
            bottom: { style: "thin", color: { argb: "d0d0d0" } },
            right: { style: "thin", color: { argb: "d0d0d0" } },
          };
        }

        for (let i = 0; i < diasExport.length; i++) {
          const colIdx = 8 + i;
          const d = diasExport[i];
          const iso = formatDateISO(d);
          const status = gridStatus[col.id]?.[iso] || "FOLGA";
          const cell = row.getCell(colIdx);
          cell.value = status === "TRABALHA" ? "TRABALHA" : "FOLGA";
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.font = { name: "Calibri", size: 10 };

          if (status === "TRABALHA") {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VERDE_FUNDO } };
          }

          cell.border = {
            top: { style: "thin", color: { argb: "d0d0d0" } },
            left: { style: "thin", color: { argb: "d0d0d0" } },
            bottom: { style: "thin", color: { argb: "d0d0d0" } },
            right: { style: "thin", color: { argb: "d0d0d0" } },
          };
        }

        linhaAtual++;
      }
    }

    // ---- LARGURAS DAS COLUNAS ----
    ws.getColumn(1).width = 10;  // EQUIPE
    ws.getColumn(2).width = 10;  // HORARIO
    ws.getColumn(3).width = 35;  // COLABORADOR
    ws.getColumn(4).width = 20;  // LOGIN SAP
    ws.getColumn(5).width = 35;  // Login Field
    ws.getColumn(6).width = 25;  // FUNÇÃO
    ws.getColumn(7).width = 15;  // ESCALA
    for (let i = 0; i < diasExport.length; i++) {
      ws.getColumn(8 + i).width = 14;
    }

    // ---- CONGELAR PAINEL (freeze) ----
    ws.views = [
      { state: "frozen", xSplit: 7, ySplit: 3, activeCell: "H4" },
    ];

    // ---- ALTURA DAS LINHAS ----
    ws.getRow(1).height = 30;
    ws.getRow(2).height = 20;
    ws.getRow(3).height = 20;

    // ---- GERAR ARQUIVO ----
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Escala_Trabalho_BXD2_${dataInicial}_a_${dataFinal}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Escala exportada com formatação!");
  };

  // --- Marcar data_ancora automaticamente para plantonistas sem ancora ---
  useEffect(() => {
    if (!colaboradores.length || !escalaDias.length) return;
    const semAncora = colaboradores.filter(
      (c) => (c.escala.toUpperCase() === "PLANTÃO 1" || c.escala.toUpperCase() === "PLANTÃO 2") && !c.data_ancora,
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

  // --- Edição inline ---
  const [editando, setEditando] = useState<{ colId: number; campo: string } | null>(null);
  const edicoesRef = useRef<Map<string, number>>(new Map());

  const salvarCampo = async (colId: number, campo: string, valor: string) => {
    const key = `${colId}_${campo}`;
    const now = Date.now();
    const last = edicoesRef.current.get(key) || 0;
    if (now - last < 300) return; // debounce
    edicoesRef.current.set(key, now);

    const { error } = await supabase
      .from("colaboradores_escala")
      .update({ [campo]: valor })
      .eq("id", colId);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    setColaboradores((prev) =>
      prev.map((c) => (c.id === colId ? { ...c, [campo]: valor } : c)),
    );
    setEditando(null);
    if (campo === "escala") {
      // recalcular data_ancora se mudou para plantão
      if (valor.toUpperCase() === "PLANTÃO 1" || valor.toUpperCase() === "PLANTÃO 2") {
        const col = colaboradores.find((c) => c.id === colId);
        if (col) {
          const dias = escalaDias
            .filter((ed) => ed.colaborador_id === colId && ed.status === "TRABALHA")
            .sort((a, b) => a.data.localeCompare(b.data));
          if (dias.length) {
            await supabase
              .from("colaboradores_escala")
              .update({ data_ancora: dias[0].data })
              .eq("id", colId);
          }
        }
      }
      await carregarDados();
    }
  };

  const toggleEdit = (colId: number, campo: string) => {
    if (editando?.colId === colId && editando?.campo === campo) {
      setEditando(null);
    } else {
      setEditando({ colId, campo });
    }
  };

  const opcoesEscala = ["COMERCIAL", "PLANTÃO 1", "PLANTÃO 2", "FÉRIAS"];
  const opcoesHorario = ["DIURNO", "NOTURNO"];
  const opcoesEspecialidade = ["AUTOMAÇÃO", "ELÉTRICA", "MECÂNICA", "MULTIFUNCIONAL"];

  // --- Drag & drop (swap) ---
  const [dragId, setDragId] = useState<number | null>(null);

  const handleDragStart = (colId: number) => {
    setDragId(colId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetId: number) => {
    if (dragId === null || dragId === targetId) {
      setDragId(null);
      return;
    }
    setDragId(null);

    const colDrag = colaboradores.find((c) => c.id === dragId);
    const colTarget = colaboradores.find((c) => c.id === targetId);
    if (!colDrag || !colTarget) return;

    const tempOrdem = colDrag.ordem;
    const { error: err1 } = await supabase
      .from("colaboradores_escala")
      .update({ ordem: colTarget.ordem })
      .eq("id", colDrag.id);
    const { error: err2 } = await supabase
      .from("colaboradores_escala")
      .update({ ordem: tempOrdem })
      .eq("id", colTarget.id);
    if (err1 || err2) {
      toast.error("Erro ao trocar posição.");
      return;
    }
    await carregarDados();
    toast.success("Posição trocada!");
  };

  // --- Excluir técnico ---
  const excluirTecnico = async (colId: number, nome: string) => {
    if (!confirm(`Excluir "${nome}"?`)) return;
    const { error } = await supabase
      .from("colaboradores_escala")
      .update({ ativo: false })
      .eq("id", colId);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
      return;
    }
    await carregarDados();
    toast.success(`${nome} excluído.`);
  };

  // --- Adicionar técnico ---
  const [showAddForm, setShowAddForm] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoEquipe, setNovoEquipe] = useState("");
  const [novoHorario, setNovoHorario] = useState("DIURNO");
  const [novoEscala, setNovoEscala] = useState("COMERCIAL");
  const [novoLoginSap, setNovoLoginSap] = useState("");
  const [novoLoginField, setNovoLoginField] = useState("");
  const [novoFuncao, setNovoFuncao] = useState("");
  const [novoTelefone, setNovoTelefone] = useState("");

  const adicionarTecnico = async () => {
    if (!novoNome.trim()) {
      toast.error("Nome é obrigatório.");
      return;
    }
    const { error } = await supabase.from("colaboradores_escala").insert({
      time_nome: "EMEC Baixada 2",
      equipe: novoEquipe || "—",
      horario: novoHorario,
      colaborador: novoNome.trim(),
      login_sap: novoLoginSap,
      login_field: novoLoginField,
      funcao: novoFuncao,
      escala: novoEscala,
      telefone: novoTelefone,
      ativo: true,
    });
    if (error) {
      toast.error("Erro ao adicionar: " + error.message);
      return;
    }
    setShowAddForm(false);
    setNovoNome("");
    setNovoEquipe("");
    setNovoHorario("DIURNO");
    setNovoEscala("COMERCIAL");
    setNovoLoginSap("");
    setNovoLoginField("");
    setNovoFuncao("");
    setNovoTelefone("");
    await carregarDados();
    toast.success(`${novoNome.trim()} adicionado!`);
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="p-3 md:p-6">
        {/* Header corporativo */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#002d74] via-[#003087] to-[#00AEEF] p-4 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.6)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-14 shrink-0 items-center justify-center rounded-2xl">
                <img
                  src={logoHeader}
                  alt="Águas do Rio - Eletromecânica"
                  className="h-14 w-auto object-contain"
                  loading="eager"
                />
              </div>
              <div className="min-w-0 text-white">
                <p className="truncate text-lg font-semibold">Águas do Rio</p>
                <p className="truncate text-sm text-cyan-50/90">Eletromecânica · Escala e Equipes</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/"
                title="Voltar ao Hub"
                aria-label="Voltar ao Hub"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[#0b3a73] shadow-md ring-1 ring-black/10 backdrop-blur transition hover:scale-105 hover:bg-white sm:h-9 sm:w-9"
              >
                <Home className="h-5 w-5 sm:h-4 sm:w-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Botões superiores */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-[#1f7ad6]" />
            <h2 className="text-lg font-bold text-[#0b3a73]">Escala de Trabalho</h2>
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
              className="inline-flex items-center gap-1.5 rounded-md bg-[#1f7ad6] px-3 py-2 text-[13px] font-semibold text-white shadow-sm hover:bg-[#0b3a73] disabled:opacity-50 cursor-pointer"
            >
              {importando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Importar (Excel)
            </button>
            <button
              onClick={handleExportar}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-[13px] font-semibold text-white shadow-sm hover:bg-emerald-700 cursor-pointer"
            >
              <Download className="h-4 w-4" />
              Exportar
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-[13px] font-semibold text-white shadow-sm hover:bg-emerald-700 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Adicionar técnico
            </button>
          </div>
        </div>

        {showAddForm && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-bold text-emerald-800">Novo técnico</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Nome *" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-[#1f7ad6] focus:ring-2" />
              <input value={novoEquipe} onChange={(e) => setNovoEquipe(e.target.value)} placeholder="Equipe (ex: C1)" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-[#1f7ad6] focus:ring-2" />
              <select value={novoHorario} onChange={(e) => setNovoHorario(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-[#1f7ad6] focus:ring-2">
                <option value="DIURNO">DIURNO</option>
                <option value="NOTURNO">NOTURNO</option>
              </select>
              <select value={novoEscala} onChange={(e) => setNovoEscala(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-[#1f7ad6] focus:ring-2">
                {opcoesEscala.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <input value={novoFuncao} onChange={(e) => setNovoFuncao(e.target.value)} placeholder="Função" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-[#1f7ad6] focus:ring-2" />
              <input value={novoLoginSap} onChange={(e) => setNovoLoginSap(e.target.value)} placeholder="Login SAP" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-[#1f7ad6] focus:ring-2" />
              <input value={novoLoginField} onChange={(e) => setNovoLoginField(e.target.value)} placeholder="E-mail" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-[#1f7ad6] focus:ring-2" />
              <input value={novoTelefone} onChange={(e) => setNovoTelefone(e.target.value)} placeholder="Telefone" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-[#1f7ad6] focus:ring-2" />
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={adicionarTecnico} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 cursor-pointer">
                <Plus className="mr-1 inline h-4 w-4" />
                Adicionar
              </button>
              <button onClick={() => setShowAddForm(false)} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#1f7ad6]" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="mb-6 grid gap-4 sm:grid-cols-5">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="h-1 bg-gradient-to-r from-amber-400 to-amber-500" />
                <div className="p-4">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                    <Sun className="h-4 w-4" />
                    Total Hoje
                  </div>
                  <div className="mt-1 text-3xl font-bold text-[#0b3a73]">{trabalhaHoje.length}</div>
                </div>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="h-1 bg-gradient-to-r from-cyan-400 to-cyan-500" />
                <div className="p-4">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-cyan-700">
                    <Users className="h-4 w-4" />
                    Equipes Hoje
                  </div>
                  <div className="mt-1 text-3xl font-bold text-[#0b3a73]">{equipesHoje}</div>
                </div>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="h-1 bg-gradient-to-r from-green-400 to-green-500" />
                <div className="p-4">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-green-700">
                    <CalendarCheck className="h-4 w-4" />
                    Comercial
                  </div>
                  <div className="mt-1 text-3xl font-bold text-[#0b3a73]">
                    {colaboradores.filter(c => c.escala.toUpperCase() === "COMERCIAL" && gridStatus[c.id]?.[hojeISO] === "TRABALHA").length}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500">
                    {statsEscala.comercial.tecnicos} técnico{statsEscala.comercial.tecnicos !== 1 && "s"} · {statsEscala.comercial.equipes} equipe{statsEscala.comercial.equipes !== 1 && "s"}
                  </div>
                </div>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="h-1 bg-gradient-to-r from-indigo-400 to-indigo-500" />
                <div className="p-4">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
                    <Moon className="h-4 w-4" />
                    Plantão
                  </div>
                  <div className="mt-1 text-3xl font-bold text-[#0b3a73]">
                    {colaboradores.filter(c => (c.escala.toUpperCase() === "PLANTÃO 1" || c.escala.toUpperCase() === "PLANTÃO 2") && gridStatus[c.id]?.[hojeISO] === "TRABALHA").length}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500">
                    {statsEscala.plantao.tecnicos} técnico{statsEscala.plantao.tecnicos !== 1 && "s"} · {statsEscala.plantao.equipes} equipe{statsEscala.plantao.equipes !== 1 && "s"}
                  </div>
                </div>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="h-1 bg-gradient-to-r from-blue-400 to-blue-500" />
                <div className="p-4">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                    <Users className="h-4 w-4" />
                    Total Técnicos
                  </div>
                  <div className="mt-1 text-3xl font-bold text-[#0b3a73]">{colaboradores.length}</div>
                  <div className="mt-0.5 text-[11px] text-slate-500">
                    {statsEscala.totalEquipes} equipe{statsEscala.totalEquipes !== 1 && "s"}
                  </div>
                </div>
              </div>
            </div>

            {/* Filtros */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                <input
                  type="text"
                  placeholder="Buscar por nome..."
                  value={searchNome}
                  onChange={(e) => setSearchNome(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm text-slate-700 outline-none ring-[#1f7ad6] focus:ring-2"
                />
              </div>
              <select
                value={filtroEquipe}
                onChange={(e) => setFiltroEquipe(e.target.value)}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-[#1f7ad6] focus:ring-2"
              >
                <option value="TODAS">Todas equipes</option>
                {equipes.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
              <select
                value={filtroEscala}
                onChange={(e) => setFiltroEscala(e.target.value)}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-[#1f7ad6] focus:ring-2"
              >
                <option value="TODAS">Todas escalas</option>
                <option value="COMERCIAL">Comercial</option>
                <option value="PLANTÃO 1">Plantão 1</option>
                <option value="PLANTÃO 2">Plantão 2</option>
                <option value="FÉRIAS">Férias</option>
              </select>
              <select
                value={filtroFuncao}
                onChange={(e) => setFiltroFuncao(e.target.value)}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-[#1f7ad6] focus:ring-2"
              >
                <option value="TODAS">Todas funções</option>
                {funcoes.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              <select
                value={sortPor}
                onChange={(e) => setSortPor(e.target.value)}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-[#1f7ad6] focus:ring-2"
              >
                <option value="equipe">Por equipe</option>
                <option value="nome">Por nome</option>
                <option value="escala">Por escala</option>
                <option value="ordem">Ordem padrão</option>
              </select>
              <Filter className="h-4 w-4 text-slate-400" />
            </div>

            {/* Navegação de semanas */}
            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={() => setSemanaOffset((p) => p - 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" /> Semana anterior
              </button>
              <span className="text-sm font-bold text-[#0b3a73]">
                {diasSemana[0].toLocaleDateString("pt-BR")} — {diasSemana[6].toLocaleDateString("pt-BR")}
              </span>
              <button
                onClick={() => setSemanaOffset((p) => p + 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer"
              >
                Próxima semana <ChevronRight className="h-4 w-4" />
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
                    <tr className="bg-[#f1f5f9] text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                      <th className="w-6 px-1 py-2.5"></th>
                      <th className="sticky left-0 z-10 bg-[#f1f5f9] px-2 py-2.5 text-left min-w-[70px]">Equipe</th>
                      <th className="sticky left-[70px] z-10 bg-[#f1f5f9] px-2 py-2.5 text-left min-w-[65px]">Turno</th>
                      <th className="sticky left-[135px] z-10 bg-[#f1f5f9] px-2 py-2.5 text-left min-w-[180px]">Colaborador</th>
                      <th className="px-2 py-2.5 text-left min-w-[80px]">Função</th>
                      <th className="px-2 py-2.5 text-left min-w-[65px]">Escala</th>
                      <th className="px-2 py-2.5 text-left min-w-[85px]">Especialidade</th>
                      <th className="px-2 py-2.5 text-left min-w-[80px]">SAP ID</th>
                      <th className="px-2 py-2.5 text-left min-w-[100px]">Telefone</th>
                      <th className="w-6 px-1 py-2.5"></th>
                      {diasSemana.map((d) => {
                        const iso = formatDateISO(d);
                        const header = formatDateHeader(d);
                        const isHoje = iso === formatDateISO(new Date());
                        const isFds = isWeekend(d);
                        return (
                          <th
                            key={iso}
                            className={`px-2 py-2.5 text-center text-[11px] min-w-[90px] ${
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
                        <tr key={`sep-${grupo.label}`} className="bg-[#f8fafc]">
                          <td
                            colSpan={10 + diasSemana.length}
                            className="px-2 py-1.5 text-[12px] font-bold text-[#0b3a73]"
                          >
                            {grupo.label}
                          </td>
                        </tr>
                        {grupo.cols.map((col) => {
                          const esc = col.escala.toUpperCase();
                          const hor = col.horario.toUpperCase();
                          return (
                            <tr
                              key={col.id}
                              className="hover:bg-slate-50 transition-colors"
                              draggable
                              onDragStart={() => handleDragStart(col.id)}
                              onDragOver={handleDragOver}
                              onDrop={() => handleDrop(col.id)}
                            >
                              <td className="cursor-grab px-1 py-1.5 text-slate-300 hover:text-slate-500">
                                <GripVertical className="h-3.5 w-3.5" />
                              </td>
                              <td className="sticky left-0 z-10 bg-white px-2 py-1.5">
                                {editando?.colId === col.id && editando?.campo === "equipe" ? (
                                  <input
                                    autoFocus
                                    defaultValue={col.equipe}
                                    className="w-16 rounded border border-[#1f7ad6] px-1 py-0.5 text-xs outline-none"
                                    onBlur={(e) => {
                                      const v = e.target.value.trim();
                                      if (v && v !== col.equipe) salvarCampo(col.id, "equipe", v);
                                      else setEditando(null);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                      if (e.key === "Escape") setEditando(null);
                                    }}
                                  />
                                ) : (
                                  <span
                                    className="cursor-pointer rounded px-1 py-0.5 font-mono text-xs text-slate-600 hover:bg-slate-100"
                                    onClick={() => toggleEdit(col.id, "equipe")}
                                    title="Clique para renomear"
                                  >
                                    {col.equipe}
                                  </span>
                                )}
                              </td>
                              <td className="sticky left-[70px] z-10 bg-white px-2 py-1.5 text-xs">
                                {editando?.colId === col.id && editando?.campo === "horario" ? (
                                  <select
                                    autoFocus
                                    defaultValue={hor}
                                    className="rounded border border-[#1f7ad6] px-1 py-0.5 text-xs outline-none"
                                    onChange={(e) => salvarCampo(col.id, "horario", e.target.value)}
                                    onBlur={() => setEditando(null)}
                                  >
                                    {opcoesHorario.map((o) => (
                                      <option key={o} value={o}>{o}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <span
                                    className={`inline-flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 hover:bg-slate-100 ${
                                      hor === "DIURNO"
                                        ? "bg-amber-50 text-amber-700"
                                        : "bg-indigo-50 text-indigo-700"
                                    }`}
                                    onClick={() => toggleEdit(col.id, "horario")}
                                  >
                                    {hor === "DIURNO" ? (
                                      <Sun className="h-3 w-3" />
                                    ) : (
                                      <Moon className="h-3 w-3" />
                                    )}
                                    {col.horario}
                                  </span>
                                )}
                              </td>
                              <td className="sticky left-[135px] z-10 bg-white px-2 py-1.5 text-sm font-medium text-slate-800">
                                {col.colaborador}
                                {(esc === "PLANTÃO 1" || esc === "PLANTÃO 2") && col.data_ancora && (
                                  <span className="ml-1 text-[10px] text-slate-400">
                                    (ref: {new Date(col.data_ancora + "T12:00:00").toLocaleDateString("pt-BR")})
                                  </span>
                                )}
                              </td>
                              <td className="px-2 py-1.5 text-xs text-slate-500">
                                {editando?.colId === col.id && editando?.campo === "funcao" ? (
                                  <input
                                    autoFocus
                                    defaultValue={col.funcao}
                                    className="w-28 rounded border border-[#1f7ad6] px-1 py-0.5 text-xs outline-none"
                                    onBlur={(e) => {
                                      const v = e.target.value.trim();
                                      if (v && v !== col.funcao) salvarCampo(col.id, "funcao", v);
                                      else setEditando(null);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                      if (e.key === "Escape") setEditando(null);
                                    }}
                                  />
                                ) : (
                                  <span
                                    className="cursor-pointer rounded px-1 py-0.5 hover:bg-slate-100"
                                    onClick={() => toggleEdit(col.id, "funcao")}
                                  >
                                    {col.funcao}
                                  </span>
                                )}
                              </td>
                              <td className="px-2 py-1.5">
                                {editando?.colId === col.id && editando?.campo === "escala" ? (
                                  <select
                                    autoFocus
                                    defaultValue={esc}
                                    className="rounded border border-[#1f7ad6] px-1 py-0.5 text-[10px] outline-none"
                                    onChange={(e) => salvarCampo(col.id, "escala", e.target.value)}
                                    onBlur={() => setEditando(null)}
                                  >
                                    {opcoesEscala.map((o) => (
                                      <option key={o} value={o}>{o}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <span
                                    className={`cursor-pointer rounded-full px-1.5 py-0.5 text-[10px] font-semibold hover:ring-2 hover:ring-[#1f7ad6] ${
                                      esc === "COMERCIAL"
                                        ? "bg-green-100 text-green-700"
                                        : esc === "PLANTÃO 1"
                                          ? "bg-blue-100 text-blue-700"
                                          : esc === "PLANTÃO 2"
                                            ? "bg-purple-100 text-purple-700"
                                            : "bg-orange-100 text-orange-700"
                                    }`}
                                    onClick={() => toggleEdit(col.id, "escala")}
                                  >
                                    {col.escala}
                                  </span>
                                )}
                              </td>
                              <td className="px-2 py-1.5 text-xs text-slate-500">
                                {editando?.colId === col.id && editando?.campo === "especialidade" ? (
                                  <select
                                    autoFocus
                                    defaultValue={col.especialidade}
                                    className="rounded border border-[#1f7ad6] px-1 py-0.5 text-xs outline-none"
                                    onChange={(e) => salvarCampo(col.id, "especialidade", e.target.value)}
                                    onBlur={() => setEditando(null)}
                                  >
                                    {opcoesEspecialidade.map((o) => (
                                      <option key={o} value={o}>{o}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <span
                                    className="cursor-pointer rounded px-1 py-0.5 hover:bg-slate-100"
                                    onClick={() => toggleEdit(col.id, "especialidade")}
                                  >
                                    {col.especialidade || "—"}
                                  </span>
                                )}
                              </td>
                              <td className="px-2 py-1.5 font-mono text-[11px] text-slate-500">{col.login_sap || "—"}</td>
                              <td className="px-2 py-1.5 text-[11px] text-slate-500">
                                {editando?.colId === col.id && editando?.campo === "telefone" ? (
                                  <input
                                    autoFocus
                                    defaultValue={col.telefone}
                                    className="w-24 rounded border border-[#1f7ad6] px-1 py-0.5 text-xs outline-none"
                                    onBlur={(e) => {
                                      const v = e.target.value.trim();
                                      if (v !== col.telefone) salvarCampo(col.id, "telefone", v);
                                      else setEditando(null);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                      if (e.key === "Escape") setEditando(null);
                                    }}
                                  />
                                ) : (
                                  <span
                                    className={`inline-flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 hover:bg-slate-100 ${
                                      col.telefone ? "text-slate-600" : "text-slate-300"
                                    }`}
                                    onClick={() => toggleEdit(col.id, "telefone")}
                                  >
                                    {col.telefone ? (
                                      <><Phone className="h-3 w-3" />{col.telefone}</>
                                    ) : "—"}
                                  </span>
                                )}
                              </td>
                              <td className="px-1 py-1.5">
                                <button
                                  onClick={() => excluirTecnico(col.id, col.colaborador)}
                                  className="cursor-pointer text-slate-300 hover:text-red-500 transition-colors"
                                  title="Excluir técnico"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
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
