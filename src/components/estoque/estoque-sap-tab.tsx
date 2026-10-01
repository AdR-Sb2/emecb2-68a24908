import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Loader2,
  Search,
  Settings,
  Star,
  Upload,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { getPermissoesCargo, temPermissao } from "@/lib/permissoes";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import EstoqueSapConfiguracoes from "@/components/estoque/estoque-sap-configuracoes";
import {
  CABECALHOS_MODELO_ESTOQUE_SAP,
  PAGINAS_ESTOQUE_SAP,
  type EstoqueSapAlteracao,
  type EstoqueSapComparacaoResumo,
  type EstoqueSapFiltros,
  type EstoqueSapImportacao,
  type EstoqueSapLinha,
  type EstoqueSapPrioritarioComparacao,
  type EstoqueSapResumo,
} from "@/lib/estoque-sap-types";

type PermissoesSap = { ver: boolean; importar: boolean; configurar: boolean };
type LinhaImportada = Omit<
  EstoqueSapLinha,
  | "id"
  | "importacao_id"
  | "setor_id"
  | "setor_nome"
  | "superintendencia"
  | "prioritario"
  | "motivo_prioridade"
>;
type FiltrosOpcoes = {
  depositos: string[];
  tipos_material: string[];
  setores: string[];
  superintendencias: string[];
};
type RascunhoImportacao = {
  arquivoNome: string;
  linhas: LinhaImportada[];
  linhasIgnoradas: number;
  valorTotal: number;
  peps: number;
  id?: string;
  progresso: number;
  comparacao?: EstoqueSapComparacaoResumo | null;
  novosPepsSemVinculo?: string[];
  erro?: string;
};

const QUERY_PREFIX = ["estoque-sap"] as const;
const FILTROS_INICIAIS: EstoqueSapFiltros = {
  busca: "",
  deposito: "",
  tipo_material: "",
  tipo_alteracao: "",
  setor: "",
  superintendencia: "",
  pep: "",
  somente_pep: false,
  somente_sem_vinculo: false,
  somente_prioritarios: false,
  com_bloqueado: false,
  ordem: "deposito",
  direcao: "asc",
};

const ALIASES_COLUNAS: Record<string, string[]> = {
  centro: ["centro", "centro_planejamento"],
  nome_1: ["nome_1", "nome1", "nome"],
  pep: ["elemento_pep", "pep"],
  estoque_especial: ["estoque_especial"],
  deposito: ["deposito", "deposito_armazenagem"],
  denominacao_deposito: ["denominacao_deposito", "denom_deposito"],
  material: ["material", "codigo_material"],
  texto_breve: ["texto_breve_material", "texto_breve", "descricao_material"],
  unidade: ["unid_medida_basica", "unidade_medida_basica", "unidade"],
  tipo_material: ["tipo_de_material", "tipo_material"],
  grupo_mercadorias: ["grupo_de_mercadorias", "grupo_mercadorias"],
  qtd_livre: ["utilizacao_livre", "utiliz_livre"],
  valor_livre: ["val_utiliz_livre", "valor_utiliz_livre", "val_utilizacao_livre"],
  qtd_bloqueada: ["bloqueado", "estoque_bloqueado"],
  valor_bloqueado: ["val_estoque_bloq", "valor_estoque_bloq", "val_estoque_bloqueado"],
};

function normalizarCabecalho(valor: unknown) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function numeroSeguro(valor: unknown): number {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
  let texto = String(valor ?? "")
    .trim()
    .replace(/\s/g, "");
  if (!texto) return 0;
  if (texto.startsWith("(") && texto.endsWith(")")) texto = `-${texto.slice(1, -1)}`;
  if (texto.includes(",")) texto = texto.replace(/\./g, "").replace(",", ".");
  const numero = Number(texto);
  return Number.isFinite(numero) ? numero : 0;
}

function parsearPlanilha(rows: unknown[][]): { linhas: LinhaImportada[]; ignoradas: number } {
  const cabecalhos = (rows[0] || []).map(normalizarCabecalho);
  const indices = Object.fromEntries(
    Object.entries(ALIASES_COLUNAS).map(([campo, aliases]) => [
      campo,
      cabecalhos.findIndex((header) => aliases.includes(header)),
    ]),
  ) as Record<keyof typeof ALIASES_COLUNAS, number>;
  const obrigatorias = ["deposito", "material", "qtd_livre"] as const;
  const faltantes = obrigatorias.filter((campo) => indices[campo] < 0);
  if (faltantes.length) {
    const nomes = faltantes.map((campo) => {
      if (campo === "qtd_livre") return "Utilização livre";
      return campo === "deposito" ? "Depósito" : "Material";
    });
    throw new Error(`Cabeçalho inválido. Colunas obrigatórias faltando: ${nomes.join(", ")}.`);
  }

  let ignoradas = 0;
  const linhas: LinhaImportada[] = [];
  for (const row of rows.slice(1)) {
    const centro = String(row[indices.centro] ?? "").trim();
    const material = String(row[indices.material] ?? "").trim();
    if (!centro || !material) {
      ignoradas++;
      continue;
    }
    const pepTexto = String(row[indices.pep] ?? "").trim();
    linhas.push({
      centro,
      deposito: String(row[indices.deposito] ?? "").trim(),
      denominacao_deposito: String(row[indices.denominacao_deposito] ?? "").trim(),
      material,
      texto_breve: String(row[indices.texto_breve] ?? "").trim(),
      unidade: String(row[indices.unidade] ?? "").trim(),
      tipo_material: String(row[indices.tipo_material] ?? "").trim(),
      grupo_mercadorias: String(row[indices.grupo_mercadorias] ?? "").trim(),
      estoque_especial: String(row[indices.estoque_especial] ?? "").trim(),
      pep: pepTexto || null,
      qtd_livre: numeroSeguro(row[indices.qtd_livre]),
      valor_livre: numeroSeguro(row[indices.valor_livre]),
      qtd_bloqueada: numeroSeguro(row[indices.qtd_bloqueada]),
      valor_bloqueado: numeroSeguro(row[indices.valor_bloqueado]),
    });
  }
  return { linhas, ignoradas };
}

function moeda(valor: number | null | undefined) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function quantidade(valor: number | null | undefined) {
  return Number(valor || 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

function dataHora(valor: string | null | undefined) {
  if (!valor) return "—";
  return new Date(valor).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function atualizarFiltro(
  setFiltros: React.Dispatch<React.SetStateAction<EstoqueSapFiltros>>,
  patch: Partial<EstoqueSapFiltros>,
) {
  setFiltros((atuais) => ({ ...atuais, ...patch }));
}

async function carregarImportacoes(): Promise<EstoqueSapImportacao[]> {
  const { data, error } = await supabase
    .from("estoque_sap_importacoes")
    .select("*")
    .order("importado_em", { ascending: false })
    .limit(7);
  if (error) throw new Error(error.message);
  const importacoes = (data || []) as EstoqueSapImportacao[];
  const ids = [
    ...new Set(importacoes.map((item) => item.importado_por).filter((id): id is string => !!id)),
  ];
  if (!ids.length) return importacoes;
  const perfis = await supabase.from("profiles").select("id, nome_completo").in("id", ids);
  const nomes = new Map((perfis.data || []).map((perfil) => [perfil.id, perfil.nome_completo]));
  return importacoes.map((item) => ({
    ...item,
    nome_importador: item.importado_por ? nomes.get(item.importado_por) || null : null,
  }));
}

export default function EstoqueSapTab() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [permissoes, setPermissoes] = useState<PermissoesSap>({
    ver: false,
    importar: false,
    configurar: false,
  });
  const [permissoesCarregadas, setPermissoesCarregadas] = useState(false);
  const [visao, setVisao] = useState<"estoque" | "relatorio">("estoque");
  const [filtros, setFiltros] = useState<EstoqueSapFiltros>(FILTROS_INICIAIS);
  const [buscaDigitada, setBuscaDigitada] = useState("");
  const [pagina, setPagina] = useState(0);
  const [porPagina, setPorPagina] = useState<number>(200);
  const [refreshKey, setRefreshKey] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmarDuplicada, setConfirmarDuplicada] = useState(false);
  const [rascunho, setRascunho] = useState<RascunhoImportacao | null>(null);
  const [importando, setImportando] = useState(false);
  const [ativando, setAtivando] = useState(false);
  const [reportBase, setReportBase] = useState("");
  const [reportAlvo, setReportAlvo] = useState("");
  const [reportFiltros, setReportFiltros] = useState<EstoqueSapFiltros>(FILTROS_INICIAIS);
  const [reportBuscaDigitada, setReportBuscaDigitada] = useState("");
  const [reportPagina, setReportPagina] = useState(0);
  const [reportPorPagina, setReportPorPagina] = useState<number>(200);
  const [setorSelecionado, setSetorSelecionado] = useState("");
  const [superSelecionada, setSuperSelecionada] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const jaNotificado = useRef<string | null>(null);

  useEffect(() => {
    let ativo = true;
    if (!profile?.cargo_id) {
      setPermissoesCarregadas(true);
      return () => {
        ativo = false;
      };
    }
    getPermissoesCargo(profile.cargo_id)
      .then((perms) => {
        if (!ativo) return;
        setPermissoes({
          ver: temPermissao(perms, "estoque", "sap_ver"),
          importar: temPermissao(perms, "estoque", "sap_importar"),
          configurar: temPermissao(perms, "estoque", "sap_configurar"),
        });
      })
      .catch((error) => toast.error(`Erro ao carregar permissões SAP: ${String(error)}`))
      .finally(() => ativo && setPermissoesCarregadas(true));
    return () => {
      ativo = false;
    };
  }, [profile?.cargo_id]);

  const importacoesQuery = useQuery({
    queryKey: [...QUERY_PREFIX, "importacoes"],
    queryFn: carregarImportacoes,
    enabled: permissoes.ver,
    staleTime: 30_000,
  });
  const importacoes = importacoesQuery.data || [];
  const importacaoAtiva = importacoes.find((item) => item.ativa) || null;

  useEffect(() => {
    if (!importacoes.length) return;
    setReportAlvo((atual) =>
      importacoes.some((item) => item.id === atual) ? atual : importacaoAtiva?.id || "",
    );
    setReportBase((atual) => {
      if (importacoes.some((item) => item.id === atual)) return atual;
      return importacoes.find((item) => !item.ativa && item.status === "concluida")?.id || "";
    });
  }, [importacoes, importacaoAtiva?.id]);

  const resumoQuery = useQuery({
    queryKey: [...QUERY_PREFIX, "resumo", importacaoAtiva?.id, refreshKey],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("estoque_sap_resumo");
      if (error) throw new Error(error.message);
      return data as EstoqueSapResumo;
    },
    enabled: permissoes.ver && !!importacaoAtiva,
  });

  const opcoesQuery = useQuery({
    queryKey: [...QUERY_PREFIX, "filtros", refreshKey],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("estoque_sap_filtros");
      if (error) throw new Error(error.message);
      return data as FiltrosOpcoes;
    },
    enabled: permissoes.ver && !!importacaoAtiva,
  });
  const opcoes = opcoesQuery.data || {
    depositos: [],
    tipos_material: [],
    setores: [],
    superintendencias: [],
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setFiltros((atuais) =>
        atuais.busca === buscaDigitada ? atuais : { ...atuais, busca: buscaDigitada },
      );
      setPagina(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [buscaDigitada]);

  const itensQuery = useQuery({
    queryKey: [
      ...QUERY_PREFIX,
      "itens",
      importacaoAtiva?.id,
      filtros,
      pagina,
      porPagina,
      refreshKey,
    ],
    queryFn: async () => {
      if (!importacaoAtiva) return { rows: [] as EstoqueSapLinha[], count: 0 };
      let query = supabase
        .from("vw_estoque_sap")
        .select("*", { count: "exact" })
        .eq("importacao_id", importacaoAtiva.id);
      if (filtros.busca) {
        const termo = filtros.busca.replace(/[%_,()]/g, " ").trim();
        if (termo)
          query = query.or(
            `material.ilike.%${termo}%,texto_breve.ilike.%${termo}%,pep.ilike.%${termo}%,deposito.ilike.%${termo}%,denominacao_deposito.ilike.%${termo}%`,
          );
      }
      if (filtros.deposito) query = query.eq("deposito", filtros.deposito);
      if (filtros.tipo_material) query = query.eq("tipo_material", filtros.tipo_material);
      if (filtros.setor) query = query.eq("setor_nome", filtros.setor);
      if (filtros.superintendencia) query = query.eq("superintendencia", filtros.superintendencia);
      if (filtros.pep) query = query.ilike("pep", `%${filtros.pep}%`);
      if (filtros.somente_pep) query = query.not("pep", "is", null);
      if (filtros.somente_sem_vinculo) {
        query = query.not("pep", "is", null).eq("pep_vinculado", false);
      }
      if (filtros.somente_prioritarios) query = query.eq("prioritario", true);
      if (filtros.com_bloqueado) query = query.gt("qtd_bloqueada", 0);
      const columns: Record<string, string> = {
        deposito: "deposito",
        denominacao_deposito: "denominacao_deposito",
        material: "material",
        texto_breve: "texto_breve",
        unidade: "unidade",
        tipo_material: "tipo_material",
        qtd_livre: "qtd_livre",
        valor_livre: "valor_livre",
        qtd_bloqueada: "qtd_bloqueada",
        pep: "pep",
        setor_nome: "setor_nome",
        superintendencia: "superintendencia",
      };
      query = query.order(columns[filtros.ordem] || "deposito", {
        ascending: filtros.direcao === "asc",
        nullsFirst: false,
      });
      const inicio = pagina * porPagina;
      const { data, error, count } = await query.range(inicio, inicio + porPagina - 1);
      if (error) throw new Error(error.message);
      return { rows: (data || []) as EstoqueSapLinha[], count: count || 0 };
    },
    enabled: permissoes.ver && !!importacaoAtiva && visao === "estoque",
    placeholderData: (anterior) => anterior,
  });

  const setorChartQuery = useQuery({
    queryKey: [...QUERY_PREFIX, "valor-setor", importacaoAtiva?.id, refreshKey],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("estoque_sap_valor_por_setor");
      if (error) throw new Error(error.message);
      return data as Array<{ setor_nome: string; valor_total: number }>;
    },
    enabled: permissoes.ver && !!importacaoAtiva,
  });
  const superChartQuery = useQuery({
    queryKey: [...QUERY_PREFIX, "valor-super", importacaoAtiva?.id, refreshKey],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("estoque_sap_valor_por_superintendencia");
      if (error) throw new Error(error.message);
      return data as Array<{ superintendencia: string; valor_total: number }>;
    },
    enabled: permissoes.ver && !!importacaoAtiva,
  });

  const reportSummaryQuery = useQuery({
    queryKey: [...QUERY_PREFIX, "relatorio-resumo", reportBase, reportAlvo, refreshKey],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("estoque_sap_comparar_resumo", {
        p_base: reportBase,
        p_alvo: reportAlvo,
      });
      if (error) throw new Error(error.message);
      return data as EstoqueSapComparacaoResumo;
    },
    enabled:
      permissoes.ver &&
      visao === "relatorio" &&
      !!reportBase &&
      !!reportAlvo &&
      reportBase !== reportAlvo,
  });
  const reportPrioritariosQuery = useQuery({
    queryKey: [...QUERY_PREFIX, "relatorio-prioritarios", reportBase, reportAlvo, refreshKey],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("estoque_sap_comparar_prioritarios", {
        p_base: reportBase,
        p_alvo: reportAlvo,
      });
      if (error) throw new Error(error.message);
      return (data || []) as EstoqueSapPrioritarioComparacao[];
    },
    enabled:
      permissoes.ver &&
      visao === "relatorio" &&
      !!reportBase &&
      !!reportAlvo &&
      reportBase !== reportAlvo,
  });
  const importacaoAnterior = importacoes.find((item) => !item.ativa && item.status === "concluida");
  const resumoUltimaImportacaoQuery = useQuery({
    queryKey: [
      ...QUERY_PREFIX,
      "ultima-comparacao-resumo",
      importacaoAnterior?.id,
      importacaoAtiva?.id,
      refreshKey,
    ],
    queryFn: async () => {
      if (!importacaoAnterior || !importacaoAtiva) return null;
      const { data, error } = await supabase.rpc("estoque_sap_comparar_resumo", {
        p_base: importacaoAnterior.id,
        p_alvo: importacaoAtiva.id,
      });
      if (error) throw new Error(error.message);
      return data as EstoqueSapComparacaoResumo;
    },
    enabled: permissoes.ver && !!importacaoAnterior && !!importacaoAtiva,
  });
  const prioridadesUltimaImportacaoQuery = useQuery({
    queryKey: [
      ...QUERY_PREFIX,
      "ultima-comparacao-prioritarios",
      importacaoAnterior?.id,
      importacaoAtiva?.id,
      refreshKey,
    ],
    queryFn: async () => {
      if (!importacaoAnterior || !importacaoAtiva) return [];
      const { data, error } = await supabase.rpc("estoque_sap_comparar_prioritarios", {
        p_base: importacaoAnterior.id,
        p_alvo: importacaoAtiva.id,
      });
      if (error) throw new Error(error.message);
      return (data || []) as EstoqueSapPrioritarioComparacao[];
    },
    enabled: permissoes.ver && !!importacaoAnterior && !!importacaoAtiva,
  });
  useEffect(() => {
    const timer = setTimeout(() => {
      setReportFiltros((atuais) =>
        atuais.busca === reportBuscaDigitada ? atuais : { ...atuais, busca: reportBuscaDigitada },
      );
      setReportPagina(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [reportBuscaDigitada]);
  const reportQuery = useQuery({
    queryKey: [
      ...QUERY_PREFIX,
      "relatorio-linhas",
      reportBase,
      reportAlvo,
      reportFiltros,
      reportPagina,
      reportPorPagina,
      refreshKey,
    ],
    queryFn: async () => {
      if (!reportBase || !reportAlvo || reportBase === reportAlvo)
        return [] as EstoqueSapAlteracao[];
      const { data, error } = await supabase.rpc("estoque_sap_comparar", {
        p_base: reportBase,
        p_alvo: reportAlvo,
        p_filtros: {
          tipo: reportFiltros.tipo_alteracao,
          setor: reportFiltros.setor,
          superintendencia: reportFiltros.superintendencia,
          deposito: reportFiltros.deposito,
          pep: reportFiltros.pep,
          busca: reportFiltros.busca,
          somente_pep: reportFiltros.somente_pep,
          somente_sem_vinculo: reportFiltros.somente_sem_vinculo,
          somente_prioritarios: reportFiltros.somente_prioritarios,
          com_bloqueado: reportFiltros.com_bloqueado,
          ordem: reportFiltros.ordem,
          direcao: reportFiltros.direcao,
        },
        p_limit: reportPorPagina,
        p_offset: reportPagina * reportPorPagina,
      });
      if (error) throw new Error(error.message);
      return (data || []) as EstoqueSapAlteracao[];
    },
    enabled:
      permissoes.ver &&
      visao === "relatorio" &&
      !!reportBase &&
      !!reportAlvo &&
      reportBase !== reportAlvo,
    placeholderData: (anterior) => anterior,
  });

  useEffect(() => {
    const channel = supabase
      .channel("estoque-sap-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "estoque_sap_importacoes" },
        async (payload) => {
          setRefreshKey((key) => key + 1);
          void queryClient.invalidateQueries({ queryKey: QUERY_PREFIX });
          const registro = payload.new as {
            ativa?: boolean;
            status?: string;
            importado_por?: string;
            id?: string;
          };
          if (
            !registro.ativa ||
            registro.status !== "concluida" ||
            !registro.id ||
            jaNotificado.current === registro.id
          )
            return;
          jaNotificado.current = registro.id;
          if (registro.importado_por && registro.importado_por !== user?.id) {
            const { data } = await supabase
              .from("profiles")
              .select("nome_completo")
              .eq("id", registro.importado_por)
              .maybeSingle();
            const anterior =
              importacoes.find((item) => item.ativa && item.id !== registro.id) ||
              importacoes.find((item) => item.status === "concluida" && item.id !== registro.id);
            const comparacao = anterior
              ? await supabase.rpc("estoque_sap_comparar_resumo", {
                  p_base: anterior.id,
                  p_alvo: registro.id,
                })
              : { data: null, error: null };
            const alteracoes = (comparacao.data as EstoqueSapComparacaoResumo | null)
              ?.alteracoes_prioritarias;
            toast.success(
              `Estoque atualizado por ${data?.nome_completo || "outro usuário"}.`,
              alteracoes
                ? { description: `${alteracoes} alterações em PEPs prioritários.` }
                : undefined,
            );
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "estoque_pep_vinculos" },
        () => {
          setRefreshKey((key) => key + 1);
          void queryClient.invalidateQueries({ queryKey: QUERY_PREFIX });
        },
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "estoque_setores" }, () => {
        setRefreshKey((key) => key + 1);
        void queryClient.invalidateQueries({ queryKey: QUERY_PREFIX });
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "estoque_pep_prioridades" },
        () => {
          setRefreshKey((key) => key + 1);
          void queryClient.invalidateQueries({ queryKey: QUERY_PREFIX });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id, importacoes]);

  const podeConfigurar = permissoes.configurar || permissoes.importar;
  const resumo = resumoQuery.data;
  const rows = itensQuery.data?.rows || [];
  const totalLinhas = itensQuery.data?.count || 0;
  const totalPaginas = Math.max(1, Math.ceil(totalLinhas / porPagina));
  const reportRows = reportQuery.data || [];
  const reportCount = reportRows[0]?.total_count || 0;
  const reportSummary = reportSummaryQuery.data;
  const priorChanges = reportPrioritariosQuery.data || [];
  const resumoUltimaImportacao = resumoUltimaImportacaoQuery.data;
  const prioridadesUltimaImportacao = prioridadesUltimaImportacaoQuery.data || [];
  const hasActiveToday =
    !!importacaoAtiva &&
    new Date(importacaoAtiva.importado_em).toDateString() === new Date().toDateString();

  const invalidarDados = () => {
    setRefreshKey((key) => key + 1);
    void queryClient.invalidateQueries({ queryKey: QUERY_PREFIX });
  };

  const alterarFiltros = (patch: Partial<EstoqueSapFiltros>, relatorio = false) => {
    if (relatorio) {
      setReportFiltros((atual) => ({ ...atual, ...patch }));
      setReportPagina(0);
    } else {
      setFiltros((atual) => ({ ...atual, ...patch }));
      setPagina(0);
    }
  };

  const parsearArquivo = async (file: File) => {
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { cellDates: false });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) throw new Error("A planilha não contém uma aba válida.");
      const matrix = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: false,
        defval: "",
      }) as unknown[][];
      const parsed = parsearPlanilha(matrix);
      if (!parsed.linhas.length) throw new Error("Nenhuma linha válida foi encontrada.");
      const peps = new Set(
        parsed.linhas.map((linha) => linha.pep).filter((pep): pep is string => !!pep),
      );
      const rascunhoNovo: RascunhoImportacao = {
        arquivoNome: file.name,
        linhas: parsed.linhas,
        linhasIgnoradas: parsed.ignoradas,
        valorTotal: parsed.linhas.reduce((total, linha) => total + linha.valor_livre, 0),
        peps: peps.size,
        progresso: 0,
      };
      setRascunho(rascunhoNovo);
      setPreviewOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível ler a planilha.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const iniciarUpload = async (confirmado = false) => {
    if (!rascunho || !user) return;
    if (hasActiveToday && !confirmado && !rascunho.id) {
      setConfirmarDuplicada(true);
      return;
    }
    setImportando(true);
    let importacaoId = rascunho.id;
    try {
      if (!rascunho.id) {
        const { data, error } = await supabase
          .from("estoque_sap_importacoes")
          .insert({
            arquivo_nome: rascunho.arquivoNome,
            importado_por: user.id,
            total_linhas: rascunho.linhas.length,
            valor_total_livre: rascunho.valorTotal,
            qtd_peps: rascunho.peps,
            ativa: false,
            status: "processando",
          })
          .select("id")
          .single();
        if (error || !data)
          throw new Error(error?.message || "Não foi possível iniciar a importação.");
        importacaoId = data.id as string;
        setRascunho((atual) => (atual ? { ...atual, id: data.id } : atual));
        const id = data.id as string;
        for (let offset = 0; offset < rascunho.linhas.length; offset += 1000) {
          const lote = rascunho.linhas
            .slice(offset, offset + 1000)
            .map((linha) => ({ ...linha, importacao_id: id }));
          const { error: insertError } = await supabase.from("estoque_sap_itens").insert(lote);
          if (insertError) throw new Error(insertError.message);
          const progresso = Math.min(
            100,
            Math.round(((offset + lote.length) / rascunho.linhas.length) * 100),
          );
          setRascunho((atual) => (atual ? { ...atual, progresso } : atual));
        }

        let comparacao: EstoqueSapComparacaoResumo | null = null;
        if (importacaoAtiva) {
          const { data: diff, error: diffError } = await supabase.rpc(
            "estoque_sap_comparar_resumo",
            {
              p_base: importacaoAtiva.id,
              p_alvo: id,
            },
          );
          if (diffError) throw new Error(diffError.message);
          comparacao = diff as EstoqueSapComparacaoResumo;
        }
        const { data: novosPeps, error: pepsError } = await supabase.rpc(
          "estoque_sap_peps_novos_sem_vinculo",
          { p_importacao_id: id },
        );
        if (pepsError) throw new Error(pepsError.message);
        setRascunho((atual) =>
          atual
            ? {
                ...atual,
                id,
                progresso: 100,
                comparacao,
                novosPepsSemVinculo: (novosPeps || []).map((row: { pep: string }) => row.pep),
              }
            : atual,
        );
        toast.success("Snapshot carregado. Revise a prévia antes de ativar.");
      }
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : String(error);
      if (importacaoId) {
        await supabase.from("estoque_sap_itens").delete().eq("importacao_id", importacaoId);
        await supabase
          .from("estoque_sap_importacoes")
          .update({ status: "erro", ativa: false })
          .eq("id", importacaoId);
        setRascunho((atual) =>
          atual ? { ...atual, id: undefined, erro: mensagem, progresso: 0 } : atual,
        );
      }
      toast.error(`Falha ao importar. O snapshot ativo foi preservado: ${mensagem}`);
    } finally {
      setImportando(false);
    }
  };

  const notificarUsuariosPrioridade = async (resumoDiff: EstoqueSapComparacaoResumo | null) => {
    if (!resumoDiff?.alteracoes_prioritarias) return;
    const { data: permissaoRows } = await supabase
      .from("cargo_panel_permissions")
      .select("cargo_id, permissions!inner(key)")
      .eq("permissions.key", "estoque.sap_ver");
    const cargoIds = [...new Set((permissaoRows || []).map((row) => row.cargo_id))];
    if (!cargoIds.length) return;
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, cargo_id")
      .eq("status", "ativo")
      .in("cargo_id", cargoIds);
    const notificacoes = (profiles || []).map((item) => ({
      usuario_id: item.id,
      tipo: "estoque_sap_prioridade",
      referencia_tipo: "estoque_sap",
      referencia_id: null,
      mensagem: `Importação de ${new Date().toLocaleDateString("pt-BR")}: ${resumoDiff.alteracoes_prioritarias} alterações em PEPs prioritários.`,
      lida: false,
    }));
    if (notificacoes.length) {
      const { error } = await supabase.from("notificacoes").insert(notificacoes);
      if (error) toast.error(`Não foi possível enviar notificações: ${error.message}`);
    }
  };

  const ativarImportacao = async () => {
    if (!rascunho?.id) return;
    setAtivando(true);
    const { error } = await supabase.rpc("estoque_sap_ativar_importacao", { p_id: rascunho.id });
    if (error) {
      setAtivando(false);
      toast.error(`Não foi possível ativar o snapshot: ${error.message}`);
      return;
    }
    await notificarUsuariosPrioridade(rascunho.comparacao || null);
    const descricoes = [
      rascunho.novosPepsSemVinculo?.length
        ? `${rascunho.novosPepsSemVinculo.length} PEPs novos sem vínculo.`
        : "",
      rascunho.comparacao?.alteracoes_prioritarias
        ? `${rascunho.comparacao.alteracoes_prioritarias} alterações em PEPs prioritários.`
        : "",
    ].filter(Boolean);
    toast.success("Estoque SAP atualizado para todos os usuários.", {
      description: descricoes.join(" ") || undefined,
    });
    setAtivando(false);
    setPreviewOpen(false);
    setRascunho(null);
    invalidarDados();
  };

  const descartarSnapshot = async () => {
    if (rascunho?.id) {
      const { error } = await supabase
        .from("estoque_sap_importacoes")
        .delete()
        .eq("id", rascunho.id)
        .eq("ativa", false);
      if (error) {
        toast.error(`Não foi possível descartar o snapshot: ${error.message}`);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: QUERY_PREFIX });
    }
    setPreviewOpen(false);
    setRascunho(null);
  };

  const baixarModelo = async () => {
    const XLSX = await import("xlsx");
    const worksheet = XLSX.utils.aoa_to_sheet([CABECALHOS_MODELO_ESTOQUE_SAP]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, "modelo-estoque-sap.xlsx");
  };

  const exportarEstoque = async () => {
    if (!importacaoAtiva) return;
    const workbookModule = await import("exceljs");
    const workbook = new workbookModule.Workbook();
    const worksheet = workbook.addWorksheet("Estoque SAP");
    worksheet.columns = [
      { header: "Depósito", key: "deposito", width: 14 },
      { header: "Denominação depósito", key: "denominacao_deposito", width: 30 },
      { header: "Material", key: "material", width: 16 },
      { header: "Texto breve", key: "texto_breve", width: 42 },
      { header: "Unid.", key: "unidade", width: 10 },
      { header: "Tipo mat.", key: "tipo_material", width: 14 },
      { header: "Utilização livre", key: "qtd_livre", width: 18 },
      { header: "Valor livre", key: "valor_livre", width: 18 },
      { header: "Bloqueado", key: "qtd_bloqueada", width: 14 },
      { header: "Elemento PEP", key: "pep", width: 24 },
      { header: "Setor", key: "setor_nome", width: 24 },
      { header: "Superintendência", key: "superintendencia", width: 20 },
    ];
    for (let offset = 0; ; offset += 1000) {
      let query = supabase
        .from("vw_estoque_sap")
        .select("*")
        .eq("importacao_id", importacaoAtiva.id);
      if (filtros.busca) {
        const termo = filtros.busca.replace(/[%_,()]/g, " ").trim();
        if (termo)
          query = query.or(
            `material.ilike.%${termo}%,texto_breve.ilike.%${termo}%,pep.ilike.%${termo}%,deposito.ilike.%${termo}%,denominacao_deposito.ilike.%${termo}%`,
          );
      }
      if (filtros.deposito) query = query.eq("deposito", filtros.deposito);
      if (filtros.tipo_material) query = query.eq("tipo_material", filtros.tipo_material);
      if (filtros.setor) query = query.eq("setor_nome", filtros.setor);
      if (filtros.superintendencia) query = query.eq("superintendencia", filtros.superintendencia);
      if (filtros.pep) query = query.ilike("pep", `%${filtros.pep}%`);
      if (filtros.somente_pep) query = query.not("pep", "is", null);
      if (filtros.somente_sem_vinculo) {
        query = query.not("pep", "is", null).eq("pep_vinculado", false);
      }
      if (filtros.somente_prioritarios) query = query.eq("prioritario", true);
      if (filtros.com_bloqueado) query = query.gt("qtd_bloqueada", 0);
      const { data, error } = await query.range(offset, offset + 999);
      if (error) throw new Error(error.message);
      for (const row of (data || []) as EstoqueSapLinha[]) worksheet.addRow(row);
      if (!data || data.length < 1000) break;
    }
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "estoque-sap-filtrado.xlsx";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportarRelatorio = async () => {
    if (!reportBase || !reportAlvo || reportBase === reportAlvo) return;
    const workbookModule = await import("exceljs");
    const workbook = new workbookModule.Workbook();
    const resumoSheet = workbook.addWorksheet("Resumo");
    const baseMeta = importacoes.find((item) => item.id === reportBase);
    const alvoMeta = importacoes.find((item) => item.id === reportAlvo);
    resumoSheet.addRows([
      ["Base", `${baseMeta?.arquivo_nome || reportBase} · ${dataHora(baseMeta?.importado_em)}`],
      ["Atual", `${alvoMeta?.arquivo_nome || reportAlvo} · ${dataHora(alvoMeta?.importado_em)}`],
      ["Novos", reportSummary?.novos || 0],
      ["Zerados", reportSummary?.zerados || 0],
      ["Aumentaram", reportSummary?.aumentaram || 0],
      ["Reduziram", reportSummary?.reduziram || 0],
      ["Δ valor", reportSummary?.delta_valor || 0],
      ["Alterações em PEPs prioritários", reportSummary?.alteracoes_prioritarias || 0],
    ]);
    const todas: EstoqueSapAlteracao[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabase.rpc("estoque_sap_comparar", {
        p_base: reportBase,
        p_alvo: reportAlvo,
        p_filtros: {
          tipo: reportFiltros.tipo_alteracao,
          setor: reportFiltros.setor,
          superintendencia: reportFiltros.superintendencia,
          deposito: reportFiltros.deposito,
          pep: reportFiltros.pep,
          busca: reportFiltros.busca,
          somente_pep: reportFiltros.somente_pep,
          somente_sem_vinculo: reportFiltros.somente_sem_vinculo,
          somente_prioritarios: reportFiltros.somente_prioritarios,
          com_bloqueado: reportFiltros.com_bloqueado,
          ordem: reportFiltros.ordem,
          direcao: reportFiltros.direcao,
        },
        p_limit: 1000,
        p_offset: offset,
      });
      if (error) throw new Error(error.message);
      const page = (data || []) as EstoqueSapAlteracao[];
      todas.push(...page);
      if (page.length < 1000) break;
    }
    const colunas = [
      "Tipo",
      "PEP",
      "Setor",
      "Superintendência",
      "Depósito",
      "Material",
      "Texto breve",
      "Qtd anterior",
      "Qtd atual",
      "Δ Qtd",
      "Δ Valor",
      "Δ %",
    ];
    const formatRow = (row: EstoqueSapAlteracao) => [
      row.tipo,
      row.pep || "",
      row.setor || "",
      row.superintendencia || "",
      row.deposito,
      row.material,
      row.texto_breve,
      row.qtd_anterior,
      row.qtd_atual,
      row.delta_qtd,
      row.delta_valor,
      row.delta_percent,
    ];
    const priorSheet = workbook.addWorksheet("Prioritários");
    priorSheet.addRow(colunas);
    for (const change of todas.filter((row) => row.prioritario))
      priorSheet.addRow(formatRow(change));
    const allSheet = workbook.addWorksheet("Todas as alterações");
    allSheet.addRow(colunas);
    for (const change of todas) allSheet.addRow(formatRow(change));
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "relatorio-estoque-sap.xlsx";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (!permissoesCarregadas)
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  if (!permissoes.ver)
    return (
      <div className="rounded-md border p-8 text-center text-sm text-slate-500">
        Você não tem permissão para visualizar o Estoque SAP.
      </div>
    );

  return (
    <div className="space-y-4">
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void parsearArquivo(file);
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-medium">
            Última atualização: {dataHora(importacaoAtiva?.importado_em)}
          </span>
          {importacaoAtiva?.nome_importador && (
            <span className="text-slate-500">por {importacaoAtiva.nome_importador}</span>
          )}
          {importacaoAtiva &&
            (hasActiveToday ? (
              <Badge className="bg-emerald-100 text-emerald-800">Atualizado hoje</Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-800">
                Desatualizado ({new Date(importacaoAtiva.importado_em).toLocaleDateString("pt-BR")})
              </Badge>
            ))}
          {!!resumo?.novos_peps_sem_vinculo && (
            <Badge variant="destructive">
              {resumo.novos_peps_sem_vinculo} PEPs novos sem vínculo
            </Badge>
          )}
        </div>
        {podeConfigurar && (
          <Button size="sm" variant="outline" onClick={() => setSettingsOpen(true)}>
            <Settings className="mr-1.5 h-4 w-4" /> Configurações
            {resumo?.novos_peps_sem_vinculo ? (
              <Badge variant="destructive" className="ml-2">
                {resumo.novos_peps_sem_vinculo}
              </Badge>
            ) : null}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-md border bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
          <Button
            size="sm"
            variant={visao === "estoque" ? "default" : "ghost"}
            onClick={() => setVisao("estoque")}
          >
            Estoque
          </Button>
          <Button
            size="sm"
            variant={visao === "relatorio" ? "default" : "ghost"}
            onClick={() => setVisao("relatorio")}
          >
            Relatório
            {(resumoUltimaImportacao?.alteracoes_prioritarias || 0) > 0 && (
              <Badge variant="destructive" className="ml-1.5 h-5 min-w-5 px-1">
                {resumoUltimaImportacao?.alteracoes_prioritarias}
              </Badge>
            )}
          </Button>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void (visao === "estoque" ? exportarEstoque() : exportarRelatorio())}
          disabled={
            !importacaoAtiva ||
            (visao === "relatorio" && (!reportBase || !reportAlvo || reportBase === reportAlvo))
          }
        >
          <Download className="mr-1.5 h-4 w-4" /> Exportar
        </Button>
      </div>

      {!importacaoAtiva ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <FileSpreadsheet className="h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-600">Nenhuma importação SAP ativa.</p>
            {permissoes.importar && (
              <Button onClick={() => setSettingsOpen(true)}>
                <Upload className="mr-2 h-4 w-4" /> Configurar importação
              </Button>
            )}
          </CardContent>
        </Card>
      ) : visao === "estoque" ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi label="Linhas" value={(resumo?.linhas || 0).toLocaleString("pt-BR")} />
            <Kpi label="Valor total em estoque" value={moeda(resumo?.valor_total_livre)} />
            <Kpi label="PEPs" value={(resumo?.qtd_peps || 0).toLocaleString("pt-BR")} />
            <button
              onClick={() => {
                setFiltros((atual) => ({
                  ...atual,
                  somente_sem_vinculo: !atual.somente_sem_vinculo,
                }));
                setPagina(0);
              }}
              className={`rounded-md border p-3 text-left shadow-sm ${filtros.somente_sem_vinculo ? "border-amber-400 bg-amber-50" : "bg-white dark:bg-slate-800"}`}
            >
              <div className="text-[11px] font-medium text-amber-700">PEPs sem vínculo</div>
              <div className="mt-1 text-lg font-bold">
                {(resumo?.peps_sem_vinculo || 0).toLocaleString("pt-BR")}
              </div>
            </button>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <ChartCard
              title="Valor por Setor"
              rows={setorChartQuery.data || []}
              labelKey="setor_nome"
              onSelect={(value) => alterarFiltros({ setor: value === filtros.setor ? "" : value })}
            />
            <ChartCard
              title="Valor por Superintendência"
              rows={superChartQuery.data || []}
              labelKey="superintendencia"
              onSelect={(value) =>
                alterarFiltros({
                  superintendencia: value === filtros.superintendencia ? "" : value,
                })
              }
            />
          </div>

          <div className="space-y-3 rounded-md border bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  value={buscaDigitada}
                  onChange={(event) => setBuscaDigitada(event.target.value)}
                  placeholder="Material, texto, PEP ou depósito"
                  className="pl-8"
                />
              </div>
              <select
                className="h-9 rounded-md border px-2 text-xs"
                value={filtros.deposito}
                onChange={(event) => alterarFiltros({ deposito: event.target.value })}
              >
                <option value="">Todos os depósitos</option>
                {opcoes.depositos.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
              <select
                className="h-9 rounded-md border px-2 text-xs"
                value={filtros.tipo_alteracao}
                onChange={(event) => alterarFiltros({ tipo_alteracao: event.target.value })}
              >
                <option value="">Todos os tipos</option>
                {opcoes.tipos_material.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
              <select
                className="h-9 rounded-md border px-2 text-xs"
                value={filtros.setor}
                onChange={(event) => alterarFiltros({ setor: event.target.value })}
              >
                <option value="">Todos os setores</option>
                {opcoes.setores.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
              <select
                className="h-9 rounded-md border px-2 text-xs"
                value={filtros.superintendencia}
                onChange={(event) => alterarFiltros({ superintendencia: event.target.value })}
              >
                <option value="">Todas as superintendências</option>
                {opcoes.superintendencias.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-xs">
                <Checkbox
                  checked={filtros.somente_pep}
                  onCheckedChange={(value) => alterarFiltros({ somente_pep: !!value })}
                />{" "}
                Somente com PEP
              </label>
              <label className="flex items-center gap-2 text-xs">
                <Checkbox
                  checked={filtros.somente_sem_vinculo}
                  onCheckedChange={(value) => alterarFiltros({ somente_sem_vinculo: !!value })}
                />{" "}
                Somente sem vínculo
              </label>
              <label className="flex items-center gap-2 text-xs">
                <Checkbox
                  checked={filtros.somente_prioritarios}
                  onCheckedChange={(value) => alterarFiltros({ somente_prioritarios: !!value })}
                />{" "}
                Somente prioritários
              </label>
              <label className="flex items-center gap-2 text-xs">
                <Checkbox
                  checked={filtros.somente_pep}
                  onCheckedChange={(value) => alterarFiltros({ somente_pep: !!value })}
                />{" "}
                Somente com PEP
              </label>
              <label className="flex items-center gap-2 text-xs">
                <Checkbox
                  checked={filtros.somente_sem_vinculo}
                  onCheckedChange={(value) => alterarFiltros({ somente_sem_vinculo: !!value })}
                />{" "}
                Sem vínculo
              </label>
              <label className="flex items-center gap-2 text-xs">
                <Checkbox
                  checked={filtros.com_bloqueado}
                  onCheckedChange={(value) => alterarFiltros({ com_bloqueado: !!value })}
                />{" "}
                Com bloqueado
              </label>
              <label className="flex items-center gap-2 text-xs">
                <Checkbox
                  checked={filtros.com_bloqueado}
                  onCheckedChange={(value) => alterarFiltros({ com_bloqueado: !!value })}
                />{" "}
                Com bloqueado
              </label>
              {filtros.pep && (
                <div className="flex items-center gap-1 text-xs">
                  PEP: {filtros.pep}
                  <Button size="sm" variant="ghost" onClick={() => alterarFiltros({ pep: "" })}>
                    Limpar
                  </Button>
                </div>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="justify-self-start"
                onClick={() => {
                  setFiltros(FILTROS_INICIAIS);
                  setBuscaDigitada("");
                  setPagina(0);
                }}
              >
                Limpar filtros
              </Button>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[1620px] text-left text-xs">
                <thead className="sticky top-0 bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                  <tr>
                    <SortHead
                      label="Depósito"
                      sort="deposito"
                      filtros={filtros}
                      onSort={(sort) => alterarFiltros(sort)}
                    />
                    <SortHead
                      label="Denominação depósito"
                      sort="denominacao_deposito"
                      filtros={filtros}
                      onSort={(sort) => alterarFiltros(sort)}
                    />
                    <SortHead
                      label="Material"
                      sort="material"
                      filtros={filtros}
                      onSort={(sort) => alterarFiltros(sort)}
                    />
                    <SortHead
                      label="Texto breve"
                      sort="texto_breve"
                      filtros={filtros}
                      onSort={(sort) => alterarFiltros(sort)}
                    />
                    <SortHead
                      label="Unid."
                      sort="unidade"
                      filtros={filtros}
                      onSort={(sort) => alterarFiltros(sort)}
                    />
                    <SortHead
                      label="Tipo mat."
                      sort="tipo_material"
                      filtros={filtros}
                      onSort={(sort) => alterarFiltros(sort)}
                    />
                    <SortHead
                      label="Utilização livre"
                      sort="qtd_livre"
                      filtros={filtros}
                      onSort={(sort) => alterarFiltros(sort)}
                    />
                    <SortHead
                      label="Valor livre"
                      sort="valor_livre"
                      filtros={filtros}
                      onSort={(sort) => alterarFiltros(sort)}
                    />
                    <SortHead
                      label="Bloqueado"
                      sort="qtd_bloqueada"
                      filtros={filtros}
                      onSort={(sort) => alterarFiltros(sort)}
                    />
                    <SortHead
                      label="Elemento PEP"
                      sort="pep"
                      filtros={filtros}
                      onSort={(sort) => alterarFiltros(sort)}
                    />
                    <SortHead
                      label="Setor"
                      sort="setor_nome"
                      filtros={filtros}
                      onSort={(sort) => alterarFiltros(sort)}
                    />
                    <SortHead
                      label="Superintendência"
                      sort="superintendencia"
                      filtros={filtros}
                      onSort={(sort) => alterarFiltros(sort)}
                    />
                  </tr>
                </thead>
                <tbody>
                  {itensQuery.isFetching && (
                    <tr>
                      <td colSpan={12} className="px-3 py-1">
                        <div className="h-0.5 animate-pulse bg-blue-500" />
                      </td>
                    </tr>
                  )}
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className={`border-t ${row.prioritario ? "border-l-2 border-l-amber-500 bg-amber-50/40 dark:bg-amber-950/10" : ""}`}
                    >
                      <td className="px-2 py-2">{row.deposito}</td>
                      <td className="max-w-[190px] truncate px-2 py-2">
                        {row.denominacao_deposito}
                      </td>
                      <td className="px-2 py-2 font-mono">{row.material}</td>
                      <td className="max-w-[260px] truncate px-2 py-2">{row.texto_breve}</td>
                      <td className="px-2 py-2">{row.unidade}</td>
                      <td className="px-2 py-2">{row.tipo_material}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">
                        {quantidade(row.qtd_livre)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">
                        {moeda(row.valor_livre)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">
                        {quantidade(row.qtd_bloqueada)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 font-mono">
                        {row.pep ? (
                          <button
                            className="hover:underline"
                            onClick={() => alterarFiltros({ pep: row.pep || "" })}
                          >
                            {row.prioritario && (
                              <Star className="mr-1 inline h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                            )}
                            {row.pep}
                          </button>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-2 py-2">
                        {row.pep
                          ? row.setor_nome || (
                              <Badge className="bg-amber-100 text-amber-800">Sem vínculo</Badge>
                            )
                          : "—"}
                      </td>
                      <td className="px-2 py-2">
                        {row.pep
                          ? row.superintendencia || (
                              <Badge className="bg-amber-100 text-amber-800">Sem vínculo</Badge>
                            )
                          : "—"}
                      </td>
                    </tr>
                  ))}
                  {!rows.length && !itensQuery.isFetching && (
                    <tr>
                      <td colSpan={12} className="px-3 py-10 text-center text-slate-400">
                        Nenhum item encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Paginacao
              pagina={pagina}
              totalPaginas={totalPaginas}
              porPagina={porPagina}
              total={totalLinhas}
              setPagina={setPagina}
              setPorPagina={(value) => {
                setPorPagina(value);
                setPagina(0);
              }}
            />
          </div>
        </>
      ) : (
        <RelatorioEstoqueSap
          importacoes={importacoes}
          base={reportBase}
          alvo={reportAlvo}
          setBase={setReportBase}
          setAlvo={setReportAlvo}
          opcoes={opcoes}
          filtros={reportFiltros}
          alterarFiltros={(patch) => alterarFiltros(patch, true)}
          busca={reportBuscaDigitada}
          setBusca={setReportBuscaDigitada}
          resumo={reportSummary}
          priorizados={priorChanges}
          rows={reportRows}
          total={reportCount}
          pagina={reportPagina}
          porPagina={reportPorPagina}
          setPagina={setReportPagina}
          setPorPagina={(value) => {
            setReportPorPagina(value);
            setReportPagina(0);
          }}
          carregando={reportQuery.isFetching || reportSummaryQuery.isFetching}
        />
      )}

      <EstoqueSapConfiguracoes
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        permissoes={{ configurar: permissoes.configurar, importar: permissoes.importar }}
        importacoes={importacoes}
        alteracoesPrioritarias={Object.fromEntries(
          prioridadesUltimaImportacao.map((item) => [item.pep, item.alteracoes]),
        )}
        onSelecionarArquivo={() => {
          setSettingsOpen(false);
          fileRef.current?.click();
        }}
        refreshKey={refreshKey}
        onAlterado={invalidarDados}
      />

      <Dialog
        open={previewOpen}
        onOpenChange={(open) => {
          if (importando || ativando) return;
          if (!open && rascunho?.id) void descartarSnapshot();
          else setPreviewOpen(open);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prévia da importação SAP</DialogTitle>
            <DialogDescription>{rascunho?.arquivoNome}</DialogDescription>
          </DialogHeader>
          {rascunho && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <PreviewKpi
                  label="Linhas válidas"
                  value={rascunho.linhas.length.toLocaleString("pt-BR")}
                />
                <PreviewKpi
                  label="Linhas ignoradas"
                  value={rascunho.linhasIgnoradas.toLocaleString("pt-BR")}
                />
                <PreviewKpi label="Valor livre" value={moeda(rascunho.valorTotal)} />
                <PreviewKpi label="PEPs" value={rascunho.peps.toLocaleString("pt-BR")} />
              </div>
              {rascunho.progresso > 0 && rascunho.progresso < 100 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Enviando snapshot</span>
                    <span>{rascunho.progresso}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full bg-blue-600 transition-all"
                      style={{ width: `${rascunho.progresso}%` }}
                    />
                  </div>
                </div>
              )}
              {rascunho.novosPepsSemVinculo && (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  <strong>{rascunho.novosPepsSemVinculo.length} PEPs novos sem vínculo</strong>
                  {rascunho.novosPepsSemVinculo.length > 0 && (
                    <p className="mt-1 text-xs">
                      {rascunho.novosPepsSemVinculo.slice(0, 10).join(", ")}
                      {rascunho.novosPepsSemVinculo.length > 10 ? "…" : ""}
                    </p>
                  )}
                </div>
              )}
              {rascunho.comparacao && (
                <div className="rounded-md border p-3">
                  <p className="mb-2 text-sm font-semibold">Comparação com a importação ativa</p>
                  <p className="text-xs text-slate-600">
                    Novos {rascunho.comparacao.novos} · Zerados {rascunho.comparacao.zerados} ·
                    Aumentaram {rascunho.comparacao.aumentaram} · Reduziram{" "}
                    {rascunho.comparacao.reduziram} · Δ valor{" "}
                    {moeda(rascunho.comparacao.delta_valor)}
                  </p>
                  {rascunho.comparacao.alteracoes_prioritarias > 0 && (
                    <Badge variant="destructive" className="mt-2">
                      {rascunho.comparacao.alteracoes_prioritarias} alterações em PEPs prioritários
                    </Badge>
                  )}
                </div>
              )}
              {rascunho.erro && (
                <p className="text-sm text-red-600">Falha anterior: {rascunho.erro}</p>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                {!rascunho.id ? (
                  <Button onClick={() => void iniciarUpload()} disabled={importando}>
                    {importando ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    Enviar snapshot para comparação
                  </Button>
                ) : (
                  <Button onClick={() => void ativarImportacao()} disabled={ativando || importando}>
                    {ativando ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    Ativar importação para todos
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmarDuplicada} onOpenChange={setConfirmarDuplicada}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Já houve importação hoje</AlertDialogTitle>
            <AlertDialogDescription>
              Última importação por {importacaoAtiva?.nome_importador || "outro usuário"} às{" "}
              {importacaoAtiva
                ? new Date(importacaoAtiva.importado_em).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"}
              . Deseja substituir pelo novo snapshot?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                setConfirmarDuplicada(false);
                void iniciarUpload(true);
              }}
            >
              Substituir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-[11px] font-medium text-slate-500">{label}</div>
        <div className="mt-1 truncate text-base font-bold" title={value}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function PreviewKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-slate-50 p-3 dark:bg-slate-800">
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function Paginacao({
  pagina,
  totalPaginas,
  porPagina,
  total,
  setPagina,
  setPorPagina,
}: {
  pagina: number;
  totalPaginas: number;
  porPagina: number;
  total: number;
  setPagina: (page: number) => void;
  setPorPagina: (size: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
      <span>
        {total.toLocaleString("pt-BR")} registros · página {pagina + 1} de {totalPaginas}
      </span>
      <div className="flex items-center gap-2">
        <select
          value={porPagina}
          onChange={(event) => setPorPagina(Number(event.target.value))}
          className="h-8 rounded-md border bg-white px-2 dark:bg-slate-800"
        >
          {PAGINAS_ESTOQUE_SAP.map((size) => (
            <option key={size} value={size}>
              {size} por página
            </option>
          ))}
        </select>
        <Button
          size="sm"
          variant="outline"
          disabled={pagina === 0}
          onClick={() => setPagina(pagina - 1)}
        >
          Anterior
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pagina + 1 >= totalPaginas}
          onClick={() => setPagina(pagina + 1)}
        >
          Próxima
        </Button>
      </div>
    </div>
  );
}

function SortHead({
  label,
  sort,
  filtros,
  onSort,
}: {
  label: string;
  sort: string;
  filtros: EstoqueSapFiltros;
  onSort: (patch: Partial<EstoqueSapFiltros>) => void;
}) {
  return (
    <th className="px-2 py-2">
      <button
        className="inline-flex items-center gap-1"
        onClick={() =>
          onSort({
            ordem: sort,
            direcao: filtros.ordem === sort && filtros.direcao === "asc" ? "desc" : "asc",
          })
        }
      >
        {label}
        <ChevronDown
          className={`h-3 w-3 ${filtros.ordem === sort && filtros.direcao === "desc" ? "rotate-180" : ""}`}
        />
      </button>
    </th>
  );
}

function ChartCard({
  title,
  rows,
  labelKey,
  onSelect,
}: {
  title: string;
  rows: Array<Record<string, string | number>>;
  labelKey: string;
  onSelect: (value: string) => void;
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <h3 className="mb-2 text-xs font-semibold">{title}</h3>
        <ResponsiveContainer width="100%" height={Math.max(160, Math.min(300, rows.length * 30))}>
          <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 30 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey={labelKey} width={120} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(value: unknown) => moeda(Number(value))} />
            <Bar dataKey="valor_total" fill="#0b3a73" radius={[0, 4, 4, 0]}>
              {rows.map((row) => (
                <Cell
                  key={String(row[labelKey])}
                  cursor="pointer"
                  onClick={() => onSelect(String(row[labelKey]))}
                />
              ))}
              <LabelList
                dataKey="valor_total"
                position="right"
                formatter={(value: unknown) => moeda(Number(value))}
                fontSize={9}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function RelatorioEstoqueSap({
  importacoes,
  base,
  alvo,
  setBase,
  setAlvo,
  opcoes,
  filtros,
  alterarFiltros,
  busca,
  setBusca,
  resumo,
  priorizados,
  rows,
  total,
  pagina,
  porPagina,
  setPagina,
  setPorPagina,
  carregando,
}: {
  importacoes: EstoqueSapImportacao[];
  base: string;
  alvo: string;
  setBase: (value: string) => void;
  setAlvo: (value: string) => void;
  opcoes: FiltrosOpcoes;
  filtros: EstoqueSapFiltros;
  alterarFiltros: (patch: Partial<EstoqueSapFiltros>) => void;
  busca: string;
  setBusca: (value: string) => void;
  resumo?: EstoqueSapComparacaoResumo;
  priorizados: EstoqueSapPrioritarioComparacao[];
  rows: EstoqueSapAlteracao[];
  total: number;
  pagina: number;
  porPagina: number;
  setPagina: (page: number) => void;
  setPorPagina: (size: number) => void;
  carregando: boolean;
}) {
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  if (importacoes.filter((item) => item.status === "concluida").length < 2) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-slate-500">
          Sem importação anterior para comparar.
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-md border bg-white p-3 dark:bg-slate-800">
        <label className="text-xs">
          Base
          <select
            className="ml-2 h-9 rounded-md border px-2"
            value={base}
            onChange={(event) => setBase(event.target.value)}
          >
            {importacoes
              .filter((item) => item.status === "concluida")
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {dataHora(item.importado_em)} · {item.arquivo_nome}
                </option>
              ))}
          </select>
        </label>
        <label className="text-xs">
          Atual
          <select
            className="ml-2 h-9 rounded-md border px-2"
            value={alvo}
            onChange={(event) => setAlvo(event.target.value)}
          >
            {importacoes
              .filter((item) => item.status === "concluida")
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.ativa ? "Ativa · " : ""}
                  {dataHora(item.importado_em)} · {item.arquivo_nome}
                </option>
              ))}
          </select>
        </label>
      </div>
      {base === alvo ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-slate-500">
            Escolha duas importações diferentes.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <Kpi label="Novos" value={(resumo?.novos || 0).toLocaleString("pt-BR")} />
            <Kpi label="Zerados" value={(resumo?.zerados || 0).toLocaleString("pt-BR")} />
            <Kpi label="Aumentaram" value={(resumo?.aumentaram || 0).toLocaleString("pt-BR")} />
            <Kpi label="Reduziram" value={(resumo?.reduziram || 0).toLocaleString("pt-BR")} />
            <Kpi label="Δ valor total" value={moeda(resumo?.delta_valor)} />
          </div>
          <Card className="border-amber-300 bg-amber-50/40 dark:bg-amber-950/10">
            <CardContent className="space-y-3 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-100">
                <Star className="h-4 w-4 fill-amber-400 text-amber-500" /> PEPs prioritários com
                alterações
              </div>
              {priorizados
                .filter((item) => item.alteracoes > 0)
                .map((item) => (
                  <details
                    key={item.pep}
                    className="rounded-md border border-amber-200 bg-white p-2 dark:bg-slate-900"
                  >
                    <summary className="cursor-pointer text-xs">
                      <strong className="font-mono">{item.pep}</strong> ·{" "}
                      {item.setor || "Sem setor"} ·{" "}
                      {item.superintendencia || "Sem superintendência"} · {item.alteracoes}{" "}
                      alterações · Δ {moeda(item.delta_valor)}
                      {item.motivo && <span className="ml-2 text-slate-500">({item.motivo})</span>}
                    </summary>
                    <div className="mt-2 space-y-1">
                      {item.detalhes.map((detail, index) => (
                        <p
                          key={`${detail.material}-${detail.deposito}-${index}`}
                          className="text-[11px] text-slate-600 dark:text-slate-300"
                        >
                          {detail.tipo} · Depósito {detail.deposito} · Material {detail.material} ·
                          Δ qtd {quantidade(detail.delta_qtd)} · Δ {moeda(detail.delta_valor)}
                        </p>
                      ))}
                    </div>
                  </details>
                ))}
              <p className="text-[11px] text-slate-500">
                Sem alterações:{" "}
                {priorizados
                  .filter((item) => item.alteracoes === 0)
                  .map((item) => item.pep)
                  .join(", ") || "nenhum outro PEP prioritário"}
              </p>
            </CardContent>
          </Card>
          <div className="space-y-3 rounded-md border bg-white p-3 dark:bg-slate-800">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar texto, material ou PEP"
              />
              <select
                className="h-9 rounded-md border px-2 text-xs"
                value={filtros.tipo_material}
                onChange={(event) => alterarFiltros({ tipo_material: event.target.value })}
              >
                <option value="">Todos os tipos de alteração</option>
                {["Novo", "Zerado", "Aumentou", "Reduziu"].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <select
                className="h-9 rounded-md border px-2 text-xs"
                value={filtros.setor}
                onChange={(event) => alterarFiltros({ setor: event.target.value })}
              >
                <option value="">Todos os setores</option>
                {opcoes.setores.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <select
                className="h-9 rounded-md border px-2 text-xs"
                value={filtros.superintendencia}
                onChange={(event) => alterarFiltros({ superintendencia: event.target.value })}
              >
                <option value="">Todas as superintendências</option>
                {opcoes.superintendencias.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <select
                className="h-9 rounded-md border px-2 text-xs"
                value={filtros.deposito}
                onChange={(event) => alterarFiltros({ deposito: event.target.value })}
              >
                <option value="">Todos os depósitos</option>
                {opcoes.depositos.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <Input
                value={filtros.pep}
                onChange={(event) => alterarFiltros({ pep: event.target.value })}
                placeholder="Filtrar PEP"
              />
              <label className="flex items-center gap-2 text-xs">
                <Checkbox
                  checked={filtros.somente_prioritarios}
                  onCheckedChange={(value) => alterarFiltros({ somente_prioritarios: !!value })}
                />{" "}
                Somente prioritários
              </label>
            </div>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[1500px] text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                  <tr>
                    <th className="px-2 py-2">Tipo</th>
                    <th className="px-2 py-2">PEP</th>
                    <th className="px-2 py-2">Setor</th>
                    <th className="px-2 py-2">Superintendência</th>
                    <th className="px-2 py-2">Depósito</th>
                    <th className="px-2 py-2">Material</th>
                    <th className="px-2 py-2">Texto breve</th>
                    <th className="px-2 py-2">Qtd anterior</th>
                    <th className="px-2 py-2">Qtd atual</th>
                    <th className="px-2 py-2">Δ Qtd</th>
                    <th className="px-2 py-2">Δ Valor</th>
                    <th className="px-2 py-2">Δ %</th>
                  </tr>
                </thead>
                <tbody>
                  {carregando && (
                    <tr>
                      <td colSpan={12} className="px-3 py-1">
                        <div className="h-0.5 animate-pulse bg-blue-500" />
                      </td>
                    </tr>
                  )}
                  {rows.map((row, index) => (
                    <tr
                      key={`${row.centro}-${row.deposito}-${row.material}-${row.pep}-${index}`}
                      className={`border-t ${row.prioritario ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}`}
                    >
                      <td className="px-2 py-2">
                        <Badge
                          variant={
                            row.tipo === "Novo"
                              ? "default"
                              : row.tipo === "Zerado"
                                ? "destructive"
                                : "outline"
                          }
                        >
                          {row.tipo}
                        </Badge>
                      </td>
                      <td className="px-2 py-2 font-mono">
                        {row.prioritario && (
                          <Star className="mr-1 inline h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                        )}
                        {row.pep || "—"}
                      </td>
                      <td className="px-2 py-2">{row.setor || "—"}</td>
                      <td className="px-2 py-2">{row.superintendencia || "—"}</td>
                      <td className="px-2 py-2">{row.deposito}</td>
                      <td className="px-2 py-2 font-mono">{row.material}</td>
                      <td className="max-w-[240px] truncate px-2 py-2">{row.texto_breve}</td>
                      <td className="px-2 py-2 text-right">
                        {row.qtd_anterior === null ? "—" : quantidade(row.qtd_anterior)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {row.qtd_atual === null ? "—" : quantidade(row.qtd_atual)}
                      </td>
                      <td className="px-2 py-2 text-right">{quantidade(row.delta_qtd)}</td>
                      <td
                        className={`px-2 py-2 text-right ${row.delta_valor >= 0 ? "text-emerald-700" : "text-red-600"}`}
                      >
                        {moeda(row.delta_valor)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {row.delta_percent === null
                          ? "—"
                          : `${row.delta_percent.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`}
                      </td>
                    </tr>
                  ))}
                  {!rows.length && !carregando && (
                    <tr>
                      <td colSpan={12} className="px-3 py-8 text-center text-slate-400">
                        Nenhuma alteração encontrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Paginacao
              pagina={pagina}
              totalPaginas={totalPaginas}
              porPagina={porPagina}
              total={total}
              setPagina={setPagina}
              setPorPagina={setPorPagina}
            />
          </div>
        </>
      )}
    </div>
  );
}
