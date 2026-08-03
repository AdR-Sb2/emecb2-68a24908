import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import {
  Building2,
  Search,
  X,
  Upload,
  Download,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  HardHat,
  Plus,
  Trash2,
  History,
  ArrowUpDown,
} from "lucide-react";
import { NavVoltarHome } from "@/components/nav-voltar-home";
import logoHeader from "@/assets/logo-branca.png";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListaRegistros } from "@/components/registros/ListaRegistros";
import type { PermissoesRegistros } from "@/lib/registros-permissoes";
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
  podeVerRegistros: boolean;
  permissoesRegistros: PermissoesRegistros;
};

const COMPLETUDE_OPCOES = [
  { value: "TODAS", label: "Todas" },
  { value: "critico", label: "Crítico (< 50%)" },
  { value: "atencao", label: "Atenção (50-79%)" },
  { value: "bom", label: "Bom (≥ 80%)" },
];

const SECOES_COMPLETUDE = [
  { value: "geral", label: "Geral" },
  { value: "elevatoria", label: "Elevatória" },
  { value: "equipamento", label: "Equipamento" },
  { value: "eletrica", label: "Elétrica" },
  { value: "eletrica_geral", label: "Elétrica Geral" },
  { value: "hidraulica", label: "Hidráulica" },
  { value: "rolamentos", label: "Rolamentos & Selos" },
  { value: "area_influencia", label: "Área de Influência" },
  { value: "implantacao", label: "Implantação" },
];

function ElevatoriasPage() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [elevatorias, setElevatorias] = useState<Elevatoria[]>([]);
  const [implantacoes, setImplantacoes] = useState<ElevatoriaImplantacao[]>([]);
  const [completudes, setCompletudes] = useState<Map<string, ElevatoriaCompletude>>(new Map());
  const [filtroSecaoCompletude, setFiltroSecaoCompletude] = useState("geral");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroMunicipio, setFiltroMunicipio] = useState("TODAS");
  const [filtroCompletude, setFiltroCompletude] = useState("TODAS");
  const [filtroTipo, setFiltroTipo] = useState("TODAS");
  const [filtroImplantacao, setFiltroImplantacao] = useState("TODAS");
  const [filtroKpi, setFiltroKpi] = useState("");
  const [editandoTipo, setEditandoTipo] = useState<number | null>(null);
  const [editandoImplantacao, setEditandoImplantacao] = useState<number | null>(null);
  const [sortField, setSortField] = useState(() => localStorage.getItem("elev_sort") || "nome");
  const [sortDir, setSortDir] = useState<"asc" | "desc">(() => (localStorage.getItem("elev_sort_dir") as "asc" | "desc") || "asc");
  const [registrosDialog, setRegistrosDialog] = useState<number | null>(null);
  const [pendentesRegistros, setPendentesRegistros] = useState(0);
  const [permissoes, setPermissoes] = useState<PermissoesElev>({
    podeVer: false,
    podeEditar: false,
    podeVerMestres: false,
    podeEditarMestres: false,
    podeExportar: false,
    podeImportar: false,
    podeVerRegistros: false,
    permissoesRegistros: { visualizar: false, criar: false, importar: false, anexarPdf: false },
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
      const podeVerRegistros = temPermissao(perms, "registros", "visualizar");
      setPermissoes({
        podeVer: temPermissao(perms, "ficha_elevatoria", "ver"),
        podeEditar: temPermissao(perms, "ficha_elevatoria", "editar"),
        podeVerMestres: temPermissao(perms, "ficha_elevatoria", "dados_mestres.ver"),
        podeEditarMestres: temPermissao(perms, "ficha_elevatoria", "dados_mestres.editar"),
        podeExportar: temPermissao(perms, "ficha_elevatoria", "exportar"),
        podeImportar: temPermissao(perms, "ficha_elevatoria", "importar"),
        podeVerRegistros,
        permissoesRegistros: {
          visualizar: podeVerRegistros,
          criar: temPermissao(perms, "registros", "criar"),
          importar: temPermissao(perms, "registros", "importar"),
          anexarPdf: temPermissao(perms, "registros", "anexar_pdf"),
        },
      });

      if (podeVerRegistros) {
        const elevRes = await supabase.from("elevatorias").select("planta");
        const plantas = (elevRes.data ?? [])
          .map((e) => (e as { planta?: string | null }).planta)
          .filter((p): p is string => Boolean(p));
        const lista = [...new Set([...plantas, "PL-RJB-SDA1003"])];
        let q = supabase
          .from("registros_atendimento")
          .select("*", { count: "exact", head: true })
          .is("elevatoria_id", null);
        if (lista.length) q = q.in("planta", lista);
        const { count } = await q;
        setPendentesRegistros(count ?? 0);
      }

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

    if (elevRes.data) {
      await calcularCompletudes(elevRes.data);
    }
    setLoading(false);
  };

  const calcularCompletudes = async (elevs: Elevatoria[]) => {
    const tabs: { key: string; table: string | null; multi: boolean }[] = [
      { key: "elevatoria", table: null, multi: false },
      { key: "equipamento", table: "elevatoria_equipamento", multi: true },
      { key: "eletrica", table: "elevatoria_eletrica", multi: true },
      { key: "eletrica_geral", table: "elevatoria_eletrica_geral", multi: false },
      { key: "hidraulica", table: "elevatoria_hidraulica", multi: false },
      { key: "rolamentos", table: "elevatoria_rolamentos_selos", multi: true },
      { key: "area_influencia", table: "elevatoria_area_influencia", multi: false },
      { key: "implantacao", table: "elevatoria_implantacao", multi: false },
    ];

    const dbTabs = tabs.filter(t => t.table !== null).map(t => t.table!);
    const promises = dbTabs.map(t => supabase.from(t).select("*"));
    const results = await Promise.all(promises);
    const resultsByTable = new Map<string, typeof results[number]>();
    dbTabs.forEach((t, i) => resultsByTable.set(t, results[i]));

    const naRes = await supabase.from("elevatoria_campo_na").select("*");
    const naMap = new Map<string, Set<string>>();
    if (naRes.data) {
      for (const r of naRes.data) {
        const key = `${r.elevatoria_id}:${r.tabela}`;
        if (!naMap.has(key)) naMap.set(key, new Set());
        naMap.get(key)!.add(r.campo);
      }
    }

    const metaFields = ["id", "elevatoria_id", "criado_em", "atualizado_em", "grupo"];
    const elevFields = ["nome", "planta", "tipo", "superintendencia", "endereco", "bairro", "municipio", "cep",
      "latitude", "longitude", "inicio_operacao", "caracteristicas_area", "grupo", "funcao"];

    const calc = (total: number, preenchidos: number, naAplicaveis: number): ElevatoriaCompletude => {
      const aplicaveis = total - naAplicaveis;
      const pct = aplicaveis > 0 ? (preenchidos / aplicaveis) * 100 : 100;
      const nivel: CompletudeNivel = pct >= 80 ? "bom" : pct >= 50 ? "atencao" : "critico";
      return { elevatoria_id: 0, total_campos: total, preenchidos, na_aplicaveis: naAplicaveis, percentual: Math.round(pct), nivel };
    };

    const map = new Map<string, ElevatoriaCompletude>();
    for (const elev of elevs) {
      const secos: { key: string; total: number; preenchidos: number; na: number }[] = [];

      let elevTotal = 0, elevPreenchidos = 0;
      for (const field of elevFields) {
        elevTotal++;
        if (elev[field as keyof Elevatoria] !== null && elev[field as keyof Elevatoria] !== "" && elev[field as keyof Elevatoria] !== undefined) {
          elevPreenchidos++;
        }
      }
      secos.push({ key: "elevatoria", total: elevTotal, preenchidos: elevPreenchidos, na: 0 });

      for (let i = 0; i < tabs.length; i++) {
        if (!tabs[i].table) continue;
        const tabData = resultsByTable.get(tabs[i].table!)?.data?.filter((r: Record<string, unknown>) => r.elevatoria_id === elev.id) ?? [];
        if (tabData.length === 0) { secos.push({ key: tabs[i].key, total: 0, preenchidos: 0, na: 0 }); continue; }

        const naFields = naMap.get(`${elev.id}:${tabs[i].table}`) ?? new Set();
        let total = 0, preenchidos = 0, naAplicaveis = 0;

        if (tabs[i].multi) {
          for (const row of tabData) {
            const fields = Object.keys(row as Record<string, unknown>).filter(k => !metaFields.includes(k));
            for (const field of fields) {
              total++;
              if (naFields.has(field)) { naAplicaveis++; preenchidos++; }
              else if ((row as Record<string, unknown>)[field] !== null && (row as Record<string, unknown>)[field] !== "" && (row as Record<string, unknown>)[field] !== undefined) { preenchidos++; }
            }
          }
        } else {
          const row = tabData[0];
          const fields = Object.keys(row as Record<string, unknown>).filter(k => !metaFields.includes(k));
          for (const field of fields) {
            total++;
            if (naFields.has(field)) { naAplicaveis++; preenchidos++; }
            else if ((row as Record<string, unknown>)[field] !== null && (row as Record<string, unknown>)[field] !== "" && (row as Record<string, unknown>)[field] !== undefined) { preenchidos++; }
          }
        }
        secos.push({ key: tabs[i].key, total, preenchidos, na: naAplicaveis });
      }

      let geralTotal = 0, geralPreenchidos = 0, geralNa = 0;
      for (const s of secos) {
        const comp = calc(s.total, s.preenchidos, s.na);
        if (s.total === 0) {
          comp.percentual = 0;
          comp.nivel = "critico";
        }
        map.set(`${elev.id}:${s.key}`, comp);
        geralTotal += s.total;
        geralPreenchidos += s.preenchidos;
        geralNa += s.na;
      }
      map.set(`${elev.id}:geral`, calc(geralTotal, geralPreenchidos, geralNa));
    }
    setCompletudes(map);
  };

  const municipios = useMemo(() => {
    const s = new Set(elevatorias.map(e => e.municipio).filter(Boolean));
    return Array.from(s).sort();
  }, [elevatorias]);

  const tipos = useMemo(() => {
    const s = new Set(elevatorias.map(e => e.tipo).filter(Boolean));
    return Array.from(s).sort();
  }, [elevatorias]);

  const kpis = useMemo(() => {
    const total = elevatorias.length;
    let completudeMedia = 0;
    let criticas = 0;
    let emImplantacao = 0;
    for (const e of elevatorias) {
      const c = completudes.get(`${e.id}:geral`);
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
    if (filtroTipo !== "TODAS") list = list.filter(e => e.tipo === filtroTipo);
    if (filtroCompletude !== "TODAS") list = list.filter(e => completudes.get(`${e.id}:${filtroSecaoCompletude}`)?.nivel === filtroCompletude);
    if (filtroImplantacao !== "TODAS") {
      if (filtroImplantacao === "operacional") {
        const idsComImplantacao = new Set(implantacoes.filter(i => i.status === "operacional").map(i => i.elevatoria_id));
        list = list.filter(e => !idsComImplantacao.has(e.id));
      } else {
        const idsFiltro = new Set(implantacoes.filter(i => i.status === filtroImplantacao).map(i => i.elevatoria_id));
        list = list.filter(e => idsFiltro.has(e.id));
      }
    }
    if (filtroKpi === "criticas") list = list.filter(e => completudes.get(`${e.id}:geral`)?.nivel === "critico");
    if (filtroKpi === "implantacao") {
      const idsImplantacao = new Set(implantacoes.filter(i => i.status !== "operacional").map(i => i.elevatoria_id));
      list = list.filter(e => idsImplantacao.has(e.id));
    }
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === "completude") {
        const aVal = completudes.get(`${a.id}:${filtroSecaoCompletude}`)?.percentual ?? -1;
        const bVal = completudes.get(`${b.id}:${filtroSecaoCompletude}`)?.percentual ?? -1;
        cmp = aVal - bVal;
      } else if (sortField === "implantacao") {
        const aImp = implantacoes.find(i => i.elevatoria_id === a.id);
        const bImp = implantacoes.find(i => i.elevatoria_id === b.id);
        const aVal = aImp ? IMPLANTACAO_STATUS_OPCOES.findIndex(o => o.value === aImp.status) : -1;
        const bVal = bImp ? IMPLANTACAO_STATUS_OPCOES.findIndex(o => o.value === bImp.status) : -1;
        cmp = aVal - bVal;
      } else {
        const aVal = a[sortField as keyof Elevatoria];
        const bVal = b[sortField as keyof Elevatoria];
        if (aVal === null || aVal === undefined) cmp = 1;
        else if (bVal === null || bVal === undefined) cmp = -1;
        else cmp = String(aVal).localeCompare(String(bVal), "pt-BR", { numeric: true });
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [elevatorias, search, filtroMunicipio, filtroTipo, filtroCompletude, filtroSecaoCompletude, filtroImplantacao, filtroKpi, completudes, implantacoes, sortField, sortDir]);

  const handleSort = (field: string) => {
    const newDir = sortField === field && sortDir === "asc" ? "desc" : "asc";
    setSortField(field);
    setSortDir(newDir);
    localStorage.setItem("elev_sort", field);
    localStorage.setItem("elev_sort_dir", newDir);
  };

  const excluirElevatoria = async (elev: Elevatoria) => {
    if (!confirm(`Tem certeza que deseja excluir "${elev.nome}"? Esta ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from("elevatorias").delete().eq("id", elev.id);
    if (error) { toast.error("Erro ao excluir: " + error.message); return; }
    setElevatorias(prev => prev.filter(e => e.id !== elev.id));
    toast.success("Elevatória excluída");
  };

  const abrirRegistros = (elevId: number) => {
    setRegistrosDialog(elevId);
  };

  const salvarObs = async (elev: Elevatoria, obs: string | null) => {
    setElevatorias(prev => prev.map(e => e.id === elev.id ? { ...e, obs } : e));
    const { error } = await supabase.from("elevatorias").update({ obs }).eq("id", elev.id);
    if (error) { toast.error("Erro ao salvar OBS"); setElevatorias(prev => prev.map(e => e.id === elev.id ? { ...e, obs: elev.obs } : e)); }
  };

  const criarElevatoria = async () => {
    if (!permissoes.podeEditar) return;
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    const nome = `Nova Elevatória ${rand}`;
    const { data, error } = await supabase.from("elevatorias").insert({ nome }).select().single();
    if (error) { toast.error("Erro ao criar: " + error.message); return; }
    if (data) { toast.success("Elevatória criada"); navigate({ to: `/elevatorias/${data.id}` }); }
  };

  const importarPlanilha = async (file: File) => {
    try {
      setLoading(true);
      toast.info("Importando planilha...");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames.find(n => n.toUpperCase().includes("RELAÇÃO DE ELEVATÓRIAS") || n.toUpperCase().includes("RELAÇÃO"));
      if (!sheetName) { toast.error("Aba 'RELAÇÃO DE ELEVATÓRIAS' não encontrada"); setLoading(false); return; }

      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: "" }) as unknown[][];
      if (rows.length < 3) { toast.error("Planilha vazia ou formato inválido"); setLoading(false); return; }

      const dataRows = rows.slice(2);

      const toStr = (v: unknown): string | null => {
        if (v === null || v === undefined || v === "") return null;
        return String(v).trim() || null;
      };

      const isZeroPlaceholder = (v: unknown): boolean => {
        const s = String(v ?? "").trim();
        return s === "0" || s === "0.0" || s === "0,0";
      };

      type RowData = { raw: unknown[]; nome: string; grupo: number };
      const allRows: RowData[] = [];

      for (const row of dataRows) {
        const nome = toStr(row[0]);
        if (!nome || nome.toUpperCase().includes("TOTAL") || nome.toUpperCase().includes("SUBTOTAL")) continue;
        const grupoNum = parseInt(String(row[12] || "1"), 10) || 1;
        allRows.push({ raw: row, nome, grupo: grupoNum });
      }

      if (allRows.length === 0) { toast.error("Nenhuma elevatória válida encontrada na planilha"); setLoading(false); return; }

      const rowsByNome = new Map<string, RowData[]>();
      for (const r of allRows) {
        if (!rowsByNome.has(r.nome)) rowsByNome.set(r.nome, []);
        rowsByNome.get(r.nome)!.push(r);
      }

      const elevRecords: Array<Record<string, unknown>> = [];
      const equipRecords: Array<Record<string, unknown>> = [];
      const eletRecords: Array<Record<string, unknown>> = [];
      const eletGeralRecords: Array<Record<string, unknown>> = [];
      const hidrRecords: Array<Record<string, unknown>> = [];
      const areaRecords: Array<Record<string, unknown>> = [];

      const pickFirstNonEmpty = (rows: RowData[], idx: number, treatZeroAsEmpty = false): string | null => {
        for (const r of rows) {
          const v = toStr(r.raw[idx]);
          if (!v) continue;
          if (treatZeroAsEmpty && isZeroPlaceholder(r.raw[idx])) continue;
          return v;
        }
        return null;
      };

      const pickFirstNonEmptyNum = (rows: RowData[], idx: number): number | null => {
        for (const r of rows) {
          const v = parseFloat(String(r.raw[idx] || ""));
          if (!isNaN(v)) return v;
        }
        return null;
      };

      const pickFirstNonEmptyDate = (rows: RowData[], idx: number): string | null => {
        for (const r of rows) {
          const v = toStr(r.raw[idx]);
          if (!v || v.includes("/")) continue;
          const d = new Date(v);
          if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
        }
        return null;
      };

      for (const [nome, rows] of rowsByNome) {
        const first = rows[0];

        elevRecords.push({
          nome,
          planta: pickFirstNonEmpty(rows, 1),
          tipo: pickFirstNonEmpty(rows, 2),
          superintendencia: pickFirstNonEmpty(rows, 3),
          endereco: pickFirstNonEmpty(rows, 4, true),
          bairro: pickFirstNonEmpty(rows, 5, true),
          municipio: pickFirstNonEmpty(rows, 6),
          cep: pickFirstNonEmpty(rows, 7),
          latitude: pickFirstNonEmptyNum(rows, 8),
          longitude: pickFirstNonEmptyNum(rows, 9),
          inicio_operacao: pickFirstNonEmptyDate(rows, 10),
          caracteristicas_area: pickFirstNonEmpty(rows, 11),
          grupo: toStr(first.raw[12]),
          funcao: pickFirstNonEmpty(rows, 13),
        });

        for (const r of rows) {
          const g = r.grupo;

          equipRecords.push({
            nome,
            grupo: g,
            potencia_motor_cv: toStr(r.raw[14]),
            rpm: toStr(r.raw[15]),
            marca_motor: toStr(r.raw[16]),
            carcaca_motor: toStr(r.raw[17]),
            tag_motor: toStr(r.raw[18]),
            tensao_v: toStr(r.raw[19]),
            corrente_a: toStr(r.raw[20]),
            mancais_la: toStr(r.raw[21]),
            mancais_loa: toStr(r.raw[22]),
            modelo_bomba: toStr(r.raw[23]),
            tag_bomba: toStr(r.raw[24]),
            marca_bomba: toStr(r.raw[25]),
            diametro_rotor_pol: toStr(r.raw[26]),
            diametro_rotor_mm: toStr(r.raw[27]),
            tipo_construtivo_elevatoria: toStr(r.raw[28]),
            bomba_dreno: toStr(r.raw[29]),
            ponta_eixo_motor: toStr(r.raw[30]),
            sentido_montagem_motor: toStr(r.raw[31]),
            flange: toStr(r.raw[32]),
            forma_construtiva_bomba: toStr(r.raw[33]),
            vazao_aproximada_m3h: toStr(r.raw[34]),
            amt_aproximada: toStr(r.raw[35]),
            capacidade_tratamento: toStr(r.raw[36]),
            procedencia_mca: toStr(r.raw[37]),
          });

          eletRecords.push({
            nome,
            grupo: g,
            fusivel_pc: toStr(r.raw[52]),
            disjuntor_pc: toStr(r.raw[53]),
            regulagem_rele_termico_bimetálico: toStr(r.raw[54]),
            rele_tempo_delta_y: toStr(r.raw[55]),
            rele_eletrodo_nivel: toStr(r.raw[56]),
            monitor_corrente: toStr(r.raw[57]),
            tamanho_fusivel_nh: toStr(r.raw[58]),
            corrente_fusivel_nh: toStr(r.raw[59]),
            corrente_fusivel_dz: toStr(r.raw[60]),
            tag_painel: toStr(r.raw[61]),
            tipo_acionamento: toStr(r.raw[62]),
            fabricante_acionamento: toStr(r.raw[63]),
            modelo_acionamento: toStr(r.raw[64]),
            corrente_a_acionamento: toStr(r.raw[65]),
            tag_acionamento: toStr(r.raw[66]),
            retaguarda_liga: toStr(r.raw[69]),
            retaguarda_desliga: toStr(r.raw[70]),
            recalque_setpoint: toStr(r.raw[71]),
          });
        }

        hidrRecords.push({
          nome,
          succao: pickFirstNonEmpty(rows, 46),
          recalque: pickFirstNonEmpty(rows, 47),
          tronco: pickFirstNonEmpty(rows, 48),
          distancia_ate_elev: pickFirstNonEmpty(rows, 49),
        });

        areaRecords.push({
          nome,
          populacao_beneficiada_habitantes: pickFirstNonEmpty(rows, 50),
          domicilios: pickFirstNonEmpty(rows, 51),
        });

        eletGeralRecords.push({
          nome,
          bt_mt: pickFirstNonEmpty(rows, 39),
          trafo_kva: pickFirstNonEmpty(rows, 40),
          num_cliente: pickFirstNonEmpty(rows, 41),
          medidor: pickFirstNonEmpty(rows, 42),
          medidor_apurado: pickFirstNonEmpty(rows, 43),
          unidade_consumo: pickFirstNonEmpty(rows, 44),
          endereco_concessionaria: pickFirstNonEmpty(rows, 45),
          clp: pickFirstNonEmpty(rows, 67),
          pcp: pickFirstNonEmpty(rows, 68),
        });
      }

      const { data: insertedElevs, error: elevErr } = await supabase.from("elevatorias").upsert(elevRecords, { onConflict: "nome", ignoreDuplicates: false }).select("id, nome");
      if (elevErr) { toast.error("Erro ao inserir elevatorias: " + elevErr.message); setLoading(false); return; }

      const nameToId = new Map<string, number>();
      if (insertedElevs) insertedElevs.forEach(e => nameToId.set(e.nome, e.id));

      const upsertChild = async (table: string, records: Array<Record<string, unknown>>, dbFields: string[], conflictCols: string) => {
        const payload = records.filter(r => nameToId.has(r.nome as string)).map(r => {
          const elevId = nameToId.get(r.nome as string)!;
          const rec: Record<string, unknown> = { elevatoria_id: elevId };
          for (const f of dbFields) {
            if (r[f] !== undefined && r[f] !== null) rec[f] = r[f];
          }
          return rec;
        });
        if (payload.length === 0) return;
        const { error } = await supabase.from(table).upsert(payload, { onConflict: conflictCols, ignoreDuplicates: false });
        if (error) console.error(`Erro upsert ${table}:`, error);
      };

      const equipFields = [
        "grupo","potencia_motor_cv","rpm","marca_motor","carcaca_motor","tag_motor","tensao_v","corrente_a",
        "mancais_la","mancais_loa","modelo_bomba","tag_bomba","marca_bomba","diametro_rotor_pol",
        "diametro_rotor_mm","tipo_construtivo_elevatoria","bomba_dreno","ponta_eixo_motor",
        "sentido_montagem_motor","flange","forma_construtiva_bomba","vazao_aproximada_m3h",
        "amt_aproximada","capacidade_tratamento","procedencia_mca",
      ];
      const eletFields = [
        "grupo","fusivel_pc","disjuntor_pc","regulagem_rele_termico_bimetálico",
        "rele_tempo_delta_y","rele_eletrodo_nivel","monitor_corrente","tamanho_fusivel_nh",
        "corrente_fusivel_nh","corrente_fusivel_dz","tag_painel","tipo_acionamento",
        "fabricante_acionamento","modelo_acionamento","corrente_a_acionamento","tag_acionamento",
        "retaguarda_liga","retaguarda_desliga","recalque_setpoint",
      ];
      const eletGeralFields = [
        "bt_mt","trafo_kva","num_cliente","medidor","medidor_apurado","unidade_consumo",
        "endereco_concessionaria","clp","pcp",
      ];

      await Promise.all([
        upsertChild("elevatoria_equipamento", equipRecords, equipFields, "elevatoria_id,grupo"),
        upsertChild("elevatoria_eletrica", eletRecords, eletFields, "elevatoria_id,grupo"),
        upsertChild("elevatoria_eletrica_geral", eletGeralRecords, eletGeralFields, "elevatoria_id"),
        upsertChild("elevatoria_hidraulica", hidrRecords, [
          "succao","recalque","tronco","distancia_ate_elev",
        ], "elevatoria_id"),
        upsertChild("elevatoria_area_influencia", areaRecords, [
          "populacao_beneficiada_habitantes","domicilios",
        ], "elevatoria_id"),
      ]);

      const pendencias: string[] = [];
      const nomesPendencia = ["CHATUBA", "DA SERRA", "SÃO JORGE", "ETE LAGOINHA"];
      for (const [nome, rows] of rowsByNome) {
        if (rows.length > 1 && nomesPendencia.some(p => nome.toUpperCase().includes(p))) {
          pendencias.push(nome);
        }
      }

      const totalGrupos = equipRecords.length;
      const totalElevs = rowsByNome.size;
      let msg = `${totalElevs} elevatória(s) importada(s) com ${totalGrupos} grupo(s) de equipamento/eletrica.`;
      if (pendencias.length > 0) {
        msg += `\n\n⚠️ Pendências para conciliação manual: ${pendencias.join(", ")} — dados básicos divergentes entre linhas (endereço/bairro/coordenadas).`;
      }
      toast.success(msg, { duration: 8000 });
      await carregarDados();
    } catch (err) {
      toast.error("Erro ao processar planilha: " + (err instanceof Error ? err.message : "desconhecido"));
      setLoading(false);
    }
  };

  const exportarPlanilha = async () => {
    try {
      toast.info("Gerando exportação...");
      const wb = XLSX.utils.book_new();

      const basicData = filtered.map(e => {
        const imp = implantacoes.find(i => i.elevatoria_id === e.id);
        return {
          "Nome": e.nome,
          "Planta": e.planta || "",
          "Tipo": e.tipo || "",
          "Superintendência": e.superintendencia || "",
          "Endereço": e.endereco || "",
          "Bairro": e.bairro || "",
          "Município": e.municipio || "",
          "CEP": e.cep || "",
          "Latitude": e.latitude || "",
          "Longitude": e.longitude || "",
          "Início Operação": e.inicio_operacao || "",
          "Característica Área": e.caracteristicas_area || "",
          "Grupo": e.grupo || "",
          "Função": e.funcao || "",
          "Implantação": imp ? (IMPLANTACAO_STATUS_OPCOES.find(o => o.value === imp.status)?.label || imp.status) : "",
          "Completude %": completudes.get(`${e.id}:geral`)?.percentual ?? "",
        };
      });
      const ws1 = XLSX.utils.json_to_sheet(basicData);
      XLSX.utils.book_append_sheet(wb, ws1, "Elevatórias");

      XLSX.writeFile(wb, `elevatorias_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success("Exportação concluída!");
    } catch (err) {
      toast.error("Erro ao exportar: " + (err instanceof Error ? err.message : "desconhecido"));
    }
  };

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-3 md:p-6">
      {/* Header */}
      <div className="mb-4 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#002d74] via-[#003087] to-[#00AEEF] p-4 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.6)]">
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
              <p className="truncate text-sm text-cyan-50/90">Eletromecânica · Ficha da Elevatória</p>
            </div>
          </div>
          <NavVoltarHome />
        </div>
      </div>

      {/* Title + actions */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0b3a73] dark:text-white sm:text-2xl">
            Ficha da Elevatória
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {permissoes.podeEditar && (
            <button
              onClick={criarElevatoria}
              className="inline-flex min-h-11 items-center gap-1 rounded-md bg-[#0b3a73] px-3 py-2 text-[13px] font-semibold text-white shadow hover:bg-[#1f7ad6]"
            >
              <Plus className="h-4 w-4" /> Nova Elevatória
            </button>
          )}
          {permissoes.podeImportar && (
            <button
              onClick={() => setDialogImportar(true)}
              className="inline-flex min-h-11 items-center gap-1 rounded-md border border-[#1f7ad6] bg-white dark:bg-slate-800 px-3 py-2 text-[13px] font-semibold text-[#0b3a73] dark:text-white hover:bg-[#eaf3fb]"
            >
              <Upload className="h-4 w-4" /> Importar
            </button>
          )}
          {permissoes.podeExportar && (
            <button
              onClick={exportarPlanilha}
              className="inline-flex min-h-11 items-center gap-1 rounded-md border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800 px-3 py-2 text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <Download className="h-4 w-4" /> Exportar
            </button>
          )}
          {permissoes.podeVerRegistros && (
            <button
              onClick={() => navigate({ to: "/registros" })}
              className="inline-flex min-h-11 items-center gap-1 rounded-md border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800 px-3 py-2 text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <History className="h-4 w-4" /> Registros
              {pendentesRegistros > 0 && (
                <span className="ml-0.5 inline-flex min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">
                  {pendentesRegistros}
                </span>
              )}
            </button>
          )}
          {permissoes.podeVerRegistros && (
            <button
              onClick={() => navigate({ to: "/analitico" })}
              className="inline-flex min-h-11 items-center gap-1 rounded-md border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800 px-3 py-2 text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <TrendingUp className="h-4 w-4" /> Analítico
            </button>
          )}
        </div>
      </div>

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
              {permissoes.podeEditar && (
                <button
                  onClick={criarElevatoria}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-[#0b3a73] transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                >
                  <Plus className="h-4 w-4" /> Cadastrar manualmente
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
                  <Building2 className="h-3 w-3" /> Total (filtradas)
                </div>
                <div className="mt-1 text-3xl font-bold text-blue-700">{filtered.length}</div>
                <div className="text-[11px] text-blue-500">de {kpis.total} elevatórias cadastradas</div>
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

              <select
                value={filtroTipo}
                onChange={e => setFiltroTipo(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#1f7ad6] focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="TODAS">Todos os tipos</option>
                {tipos.map(t => <option key={t} value={t!}>{t}</option>)}
              </select>

              {permissoes.podeVerMestres && (
                <select
                  value={filtroSecaoCompletude}
                  onChange={e => setFiltroSecaoCompletude(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#1f7ad6] focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                >
                  {SECOES_COMPLETUDE.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              )}
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
                      {(["nome", "planta", "tipo", "municipio"] as const).map(f => (
                        <th key={f} className="whitespace-nowrap px-3 py-2.5 font-semibold cursor-pointer hover:text-[#1f7ad6]" onClick={() => handleSort(f)}>
                          <span className="inline-flex items-center gap-1">
                            {f === "nome" ? "Nome" : f === "planta" ? "Planta" : f === "tipo" ? "Tipo" : "Município"}
                            {sortField === f && <ArrowUpDown className="h-3 w-3" />}
                          </span>
                        </th>
                      ))}
                      {permissoes.podeVerMestres && (
                        <th className="whitespace-nowrap px-3 py-2.5 font-semibold cursor-pointer hover:text-[#1f7ad6]" onClick={() => handleSort("completude")}>
                          <span className="inline-flex items-center gap-1">
                            Completude {sortField === "completude" && <ArrowUpDown className="h-3 w-3" />}
                          </span>
                        </th>
                      )}
                      <th className="whitespace-nowrap px-3 py-2.5 font-semibold cursor-pointer hover:text-[#1f7ad6]" onClick={() => handleSort("implantacao")}>
                        <span className="inline-flex items-center gap-1">
                          Implantação {sortField === "implantacao" && <ArrowUpDown className="h-3 w-3" />}
                        </span>
                      </th>
                      <th className="whitespace-nowrap px-3 py-2.5 font-semibold">OBS</th>
                      <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((elev, idx) => {
                      const comp = completudes.get(`${elev.id}:${filtroSecaoCompletude}`);
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
                            {permissoes.podeEditar && editandoTipo === elev.id ? (
                              <select
                                value={elev.tipo || ""}
                                onChange={async e => {
                                  const newTipo = e.target.value || null;
                                  setElevatorias(prev => prev.map(el => el.id === elev.id ? { ...el, tipo: newTipo } : el));
                                  setEditandoTipo(null);
                                  const { error } = await supabase.from("elevatorias").update({ tipo: newTipo }).eq("id", elev.id);
                                  if (error) {
                                    toast.error("Erro ao salvar tipo");
                                    setElevatorias(prev => prev.map(el => el.id === elev.id ? { ...el, tipo: elev.tipo } : el));
                                  }
                                }}
                                onBlur={() => setEditandoTipo(null)}
                                className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 focus:border-[#1f7ad6] focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                                autoFocus
                              >
                                <option value="">—</option>
                                <option value="EAT">EAT</option>
                                <option value="Booster">Booster</option>
                                <option value="Container">Container</option>
                              </select>
                            ) : permissoes.podeEditar ? (
                              <span
                                onClick={() => setEditandoTipo(elev.id)}
                                className="cursor-pointer rounded px-1 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-700"
                              >
                                <Badge variant="outline" className="text-[11px]">{elev.tipo || "—"}</Badge>
                              </span>
                            ) : (
                              <Badge variant="outline" className="text-[11px]">{elev.tipo || "—"}</Badge>
                            )}
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
                            {permissoes.podeEditarMestres && editandoImplantacao === elev.id ? (
                              <select
                                value={imp?.status || ""}
                                onChange={async e => {
                                  const newStatus = e.target.value as StatusImplantacao;
                                  if (!newStatus) return;
                                  setEditandoImplantacao(null);
                                  setImplantacoes(prev => {
                                    const idx = prev.findIndex(i => i.elevatoria_id === elev.id);
                                    if (idx >= 0) {
                                      const updated = [...prev];
                                      updated[idx] = { ...updated[idx], status: newStatus };
                                      return updated;
                                    }
                                    return [...prev, { elevatoria_id: elev.id, status: newStatus, tipo: null, segmento: null, fase_atual: null, observacoes_inconformidades: null } as ElevatoriaImplantacao];
                                  });
                                  const { error } = await supabase.from("elevatoria_implantacao").upsert(
                                    { elevatoria_id: elev.id, status: newStatus },
                                    { onConflict: "elevatoria_id", ignoreDuplicates: false }
                                  );
                                  if (error) {
                                    toast.error("Erro ao salvar implantação");
                                    const { data } = await supabase.from("elevatoria_implantacao").select("*");
                                    if (data) setImplantacoes(data);
                                  }
                                }}
                                onBlur={() => setEditandoImplantacao(null)}
                                className="rounded border px-2 py-1 text-[11px] font-semibold focus:outline-none"
                                autoFocus
                              >
                                <option value="">—</option>
                                {IMPLANTACAO_STATUS_OPCOES.map(o => (
                                  <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                              </select>
                            ) : permissoes.podeEditarMestres ? (
                              <span
                                onClick={() => setEditandoImplantacao(elev.id)}
                                className="cursor-pointer rounded px-1 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-700"
                              >
                                {imp ? (
                                  <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${IMPLANTACAO_STATUS_CORES[imp.status] || ""}`}>
                                    {IMPLANTACAO_STATUS_OPCOES.find(o => o.value === imp.status)?.label || imp.status}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </span>
                            ) : (
                              imp ? (
                                <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${IMPLANTACAO_STATUS_CORES[imp.status] || ""}`}>
                                  {IMPLANTACAO_STATUS_OPCOES.find(o => o.value === imp.status)?.label || imp.status}
                                </span>
                              ) : (
                                "—"
                              )
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 max-w-[150px]">
                            {permissoes.podeEditar ? (
                              <input
                                value={elev.obs || ""}
                                onChange={e => {
                                  const newObs = e.target.value;
                                  setElevatorias(prev => prev.map(el => el.id === elev.id ? { ...el, obs: newObs || null } : el));
                                }}
                                onBlur={e => salvarObs(elev, e.target.value || null)}
                                placeholder="Clique para editar..."
                                className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-[11px] text-slate-600 placeholder-slate-300 hover:border-slate-200 focus:border-[#1f7ad6] focus:bg-white focus:outline-none dark:text-slate-300 dark:placeholder-slate-500"
                              />
                            ) : (
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">{elev.obs || "—"}</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <Link
                                to={`/elevatorias/${elev.id}`}
                                className="rounded-md bg-[#eaf3fb] px-2.5 py-1 text-[11px] font-semibold text-[#1f7ad6] transition hover:bg-[#d4e6f7] dark:bg-slate-700 dark:text-[#38bdf8] dark:hover:bg-slate-600"
                              >
                                Abrir ficha
                              </Link>
                              <button
                                onClick={() => abrirRegistros(elev.id)}
                                className="rounded-md bg-[#eaf3fb] px-2 py-1 text-[11px] font-semibold text-[#1f7ad6] transition hover:bg-[#d4e6f7] dark:bg-slate-700 dark:text-[#38bdf8] dark:hover:bg-slate-600"
                                title="Registros"
                              >
                                <History className="h-3.5 w-3.5" />
                              </button>
                              {permissoes.podeEditar && (
                                <button
                                  onClick={() => excluirElevatoria(elev)}
                                  className="rounded-md px-2 py-1 text-[11px] font-semibold text-red-500 transition hover:bg-red-50 dark:hover:bg-red-900/30"
                                  title="Excluir"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={permissoes.podeVerMestres ? 9 : 8} className="px-3 py-8 text-center text-sm text-slate-400">
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

      {/* Registros Dialog */}
      <Dialog open={registrosDialog !== null} onOpenChange={o => { if (!o) setRegistrosDialog(null); }}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-[#0b3a73] dark:text-white flex items-center gap-2">
              <History className="h-4 w-4" /> Registros da Elevatória
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {registrosDialog !== null && (
              <ListaRegistros elevatoriaId={registrosDialog} permissoes={permissoes.permissoesRegistros} />
            )}
          </div>
        </DialogContent>
      </Dialog>

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
                setDialogImportar(false);
                await importarPlanilha(file);
                if (fileInputRef.current) fileInputRef.current.value = "";
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
