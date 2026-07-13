import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  Home,
  Package,
  ShoppingCart,
  Plus,
  Minus,
  AlertTriangle,
  TrendingUp,
  Search,
  X,
  Download,
  Upload,
  Filter,
  Star,
  Clock,
  Building2,
  ArrowUpDown,
  FileSpreadsheet,
  RefreshCw,
  Eye,
  Edit3,
  CheckCircle2,
  Truck,
  AlertCircle,
  Box,
  BarChart3,
  List,
  Settings,
  ArrowUp,
  ArrowDown,
  Tag,
} from "lucide-react";
import logoHeader from "@/assets/logo-branca.png";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Material,
  Movimentacao,
  Compra,
  Categoria,
  StatusCompra,
  TipoMovimentacao,
  OrigemMovimentacao,
  STATUS_COMPRA_CORES,
  getStatusEstoque,
  getStatusCor,
  getCategoriaNome,
  StatusEstoque,
} from "@/lib/estoque-types";
import { getPermissoesEstoque } from "@/lib/estoque-permissoes";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  LabelList,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";

export const Route = createFileRoute("/estoque")({
  head: () => ({
    meta: [{ title: "Eletromecânica · Estoque e Compras" }],
  }),
  component: EstoquePage,
});

const ROUTE_COLORS = ["#0b3a73", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"];

function EstoquePage() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [aba, setAba] = useState<"estoque" | "compras" | "registros">("estoque");
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("TODAS");
  const [filtroStatus, setFiltroStatus] = useState<StatusEstoque | "TODAS">("TODAS");
  const [filtroCritico, setFiltroCritico] = useState(false);
  const [filtroElevatoria, setFiltroElevatoria] = useState("");
  const [metricaDestino, setMetricaDestino] = useState<"movimentacoes" | "quantidade">(
    "movimentacoes",
  );
  const [filtroCategoriaDestino, setFiltroCategoriaDestino] = useState<string>("TODAS");
  const [sortKey, setSortKey] = useState<string>("cod_sap");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [materialSelecionado, setMaterialSelecionado] = useState<Material | null>(null);
  const [dialogMov, setDialogMov] = useState<"entrada" | "saida" | "ajuste" | null>(null);
  const [dialogHistorico, setDialogHistorico] = useState(false);
  const [dialogCompra, setDialogCompra] = useState(false);
  const [dialogDataRetirada, setDialogDataRetirada] = useState<number | null>(null);
  const [dataRetiradaInput, setDataRetiradaInput] = useState("");
  const [filtroStatusCompra, setFiltroStatusCompra] = useState<string>("TODOS");
  const [filtroCompradorCompra, setFiltroCompradorCompra] = useState<string>("TODOS");
  const [filtroChegou, setFiltroChegou] = useState<"TODOS" | "sim" | "nao">("TODOS");
  const [filtroRetirado, setFiltroRetirado] = useState<"TODOS" | "sim" | "nao">("TODOS");
  const [filtroFila, setFiltroFila] = useState<"TODOS" | "sim" | "nao">("TODOS");
  const [filtroAguardandoRetirada, setFiltroAguardandoRetirada] = useState(false);
  const [editandoCompraId, setEditandoCompraId] = useState<number | null>(null);
  const [editandoCampo, setEditandoCampo] = useState<string | null>(null);
  const [editandoValorCompra, setEditandoValorCompra] = useState("");
  const [dialogImportar, setDialogImportar] = useState(false);
  const [dialogImportarCompras, setDialogImportarCompras] = useState(false);
  const [dialogRcEmFila, setDialogRcEmFila] = useState(false);
  const fileInputRefCompras = useRef<HTMLInputElement>(null);
  const [dialogCategorias, setDialogCategorias] = useState(false);
  const [dialogMaterial, setDialogMaterial] = useState(false);
  const [editandoMinimo, setEditandoMinimo] = useState<string | null>(null);
  const [editandoValor, setEditandoValor] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const permissoes = useMemo(
    () => getPermissoesEstoque(profile?.cargo_nome),
    [profile?.cargo_nome],
  );
  const [acessoVerificado, setAcessoVerificado] = useState(false);

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
        .select("paineis!inner(chave)")
        .eq("cargo_id", profile.cargo_id)
        .eq("paineis.chave", "estoque")
        .maybeSingle();
      if (!data || !permissoes.acessarModulo) {
        navigate({ to: "/", replace: true });
        return;
      }
      setAcessoVerificado(true);
    })();
  }, [authLoading, user, profile, navigate, permissoes.acessarModulo]);

  useEffect(() => {
    if (!acessoVerificado) return;
    if (!permissoes.solicitarCompra && aba === "compras") {
      setAba("estoque");
    }
  }, [acessoVerificado, permissoes.solicitarCompra, aba]);

  // --- Carregar dados ---
  const carregarDados = async () => {
    setLoading(true);
    try {
      const [matRes, catRes, movRes, compRes] = await Promise.all([
        supabase.from("materiais").select("*, categorias(id, nome, ativo)").order("cod_sap"),
        supabase.from("categorias").select("*").order("nome"),
        supabase.from("movimentacoes").select("*").order("data", { ascending: false }).limit(5000),
        supabase.from("compras").select("*").order("dt_criacao_rc", { ascending: false }),
      ]);
      if (matRes.error) console.error("Erro ao carregar materiais:", matRes.error.message);
      if (catRes.error) console.error("Erro ao carregar categorias:", catRes.error.message);
      if (movRes.error) console.error("Erro ao carregar movimentações:", movRes.error.message);
      if (compRes.error) {
        console.error("Erro ao carregar compras:", compRes.error.message);
        toast.error("Erro ao carregar compras: " + compRes.error.message);
      }
      if (matRes.data) setMateriais(matRes.data as Material[]);
      if (catRes.data) setCategorias(catRes.data as Categoria[]);
      if (movRes.data) setMovimentacoes(movRes.data as Movimentacao[]);
      if (compRes.data) setCompras(compRes.data as Compra[]);
    } catch (err) {
      console.error("Erro ao carregar estoque", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!acessoVerificado) return;
    carregarDados();
  }, [acessoVerificado]);

  // --- Computed ---
  const materiaisComStatus = useMemo(
    () =>
      materiais.map((m) => ({
        ...m,
        _status: getStatusEstoque(m.saldo_atual, m.estoque_minimo),
      })),
    [materiais],
  );

  const materiaisFiltrados = useMemo(() => {
    let list = materiaisComStatus;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) => m.cod_sap.toLowerCase().includes(q) || m.descricao.toLowerCase().includes(q),
      );
    }
    if (filtroCategoria !== "TODAS")
      list = list.filter((m) => String(m.categoria_id) === filtroCategoria);
    if (filtroStatus !== "TODAS") list = list.filter((m) => m._status === filtroStatus);
    if (filtroCritico) list = list.filter((m) => m.material_critico);
    if (filtroElevatoria) list = list.filter((m) => m.vinculo_elevatoria === filtroElevatoria);
    list.sort((a, b) => {
      const av = a[sortKey as keyof typeof a] ?? "";
      const bv = b[sortKey as keyof typeof b] ?? "";
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [
    materiaisComStatus,
    search,
    filtroCategoria,
    filtroStatus,
    filtroCritico,
    filtroElevatoria,
    sortKey,
    sortDir,
  ]);

  const kpis = useMemo(() => {
    const semEstoque = materiaisComStatus.filter((m) => m._status === "sem_estoque");
    const baixo = materiaisComStatus.filter((m) => m._status === "baixo");
    const atencao = materiaisComStatus.filter((m) => m._status === "atencao");
    const total = materiais.length;
    const valorTotal = materiais.reduce((s, m) => s + m.saldo_atual * m.custo_unitario, 0);
    const tresMesesAtras = new Date();
    tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3);
    const parados = materiais.filter((m) => {
      const movs = movimentacoes.filter((mv) => mv.cod_sap === m.cod_sap);
      return movs.length === 0 || new Date(movs[0].data) < tresMesesAtras;
    });
    return { semEstoque, baixo, atencao, total, valorTotal, parados };
  }, [materiaisComStatus, materiais, movimentacoes]);

  const truncar = (s: string, max: number) => (s.length > max ? s.slice(0, max) + "…" : s);

  const topConsumidos = useMemo(() => {
    const consumo = new Map<string, number>();
    const now = new Date();
    const mesPassado = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    movimentacoes
      .filter((m) => m.tipo === "SAIDA" && m.data && new Date(m.data) >= mesPassado)
      .forEach((m) => {
        consumo.set(m.cod_sap, (consumo.get(m.cod_sap) || 0) + m.quantidade);
      });
    return Array.from(consumo.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cod_sap, qtd]) => {
        const mat = materiais.find((m) => m.cod_sap === cod_sap);
        return {
          cod_sap,
          descricao: truncar(mat?.descricao || cod_sap, 30),
          qtd,
          descricaoCompleta: mat?.descricao || cod_sap,
        };
      });
  }, [movimentacoes, materiais]);

  const topDestinos = useMemo(() => {
    const now = new Date();
    const mesPassado = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    let movs = movimentacoes.filter(
      (m) =>
        m.tipo === "SAIDA" &&
        m.destino &&
        m.destino.toUpperCase() !== "AJUSTE" &&
        m.data &&
        new Date(m.data) >= mesPassado,
    );
    if (filtroCategoriaDestino !== "TODAS") {
      const codsCategoria = new Set(
        materiais
          .filter((mat) => String(mat.categoria_id) === filtroCategoriaDestino)
          .map((mat) => mat.cod_sap),
      );
      movs = movs.filter((m) => codsCategoria.has(m.cod_sap));
    }
    if (metricaDestino === "movimentacoes") {
      const destinos = new Map<string, number>();
      movs.forEach((m) => {
        destinos.set(m.destino, (destinos.get(m.destino) || 0) + 1);
      });
      return Array.from(destinos.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([destino, qtd]) => ({
          destino: truncar(destino, 25),
          qtd,
          destinoCompleto: destino,
        }));
    } else {
      const grupos = new Map<string, { nome: string; unidade: string; qtd: number }>();
      movs.forEach((m) => {
        const mat = materiais.find((mat) => mat.cod_sap === m.cod_sap);
        const un = mat?.unidade_medida || "";
        const key = `${m.destino}||${un}`;
        const g = grupos.get(key);
        if (g) {
          g.qtd += m.quantidade;
        } else {
          grupos.set(key, { nome: m.destino, unidade: un, qtd: m.quantidade });
        }
      });
      return Array.from(grupos.entries())
        .sort((a, b) => b[1].qtd - a[1].qtd)
        .slice(0, 5)
        .map(([, v]) => ({
          destino: truncar(v.unidade ? `${v.nome} (${v.unidade})` : v.nome, 30),
          qtd: v.qtd,
          destinoCompleto: `${v.nome} (${v.unidade})`,
        }));
    }
  }, [movimentacoes, materiais, metricaDestino, filtroCategoriaDestino]);

  const ajustesMes = useMemo(() => {
    const now = new Date();
    const mesPassado = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    return movimentacoes.filter(
      (m) => m.tipo === "AJUSTE" && m.data && new Date(m.data) >= mesPassado,
    );
  }, [movimentacoes]);

  const ajustesPorMotivo = useMemo(() => {
    const motivos = new Map<string, number>();
    ajustesMes.forEach((m) => {
      const key = m.motivo_ajuste || "Sem motivo";
      motivos.set(key, (motivos.get(key) || 0) + 1);
    });
    return Array.from(motivos.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([motivo, qtd]) => ({ motivo: truncar(motivo, 40), qtd, motivoCompleto: motivo }));
  }, [ajustesMes]);

  // --- Compras computed ---
  const comprasComAtraso = useMemo(
    () =>
      compras.filter((c) => {
        if (c.foi_retirado) return false;
        if (!c.dt_remessa_pedido) return false;
        return new Date(c.dt_remessa_pedido) < new Date();
      }),
    [compras],
  );

  const itensCriticosSemPedido = useMemo(() => {
    const criticos = materiaisComStatus.filter(
      (m) => m._status === "sem_estoque" || m._status === "baixo",
    );
    const pedidosAbertos = new Set(compras.filter((c) => !c.foi_retirado).map((c) => c.cod_sap));
    return criticos.filter((m) => !pedidosAbertos.has(m.cod_sap));
  }, [materiaisComStatus, compras]);

  const comprasPorStatus = useMemo(() => {
    const map: Record<string, Compra[]> = {};
    compras.forEach((c) => {
      const s = c.status_geral || "Sem status";
      if (!map[s]) map[s] = [];
      map[s].push(c);
    });
    return map;
  }, [compras]);

  const compradoresCompra = useMemo(
    () => Array.from(new Set(compras.map((c) => c.comprador_cotacao).filter(Boolean))).sort(),
    [compras],
  );

  const comprasFiltradas = useMemo(() => {
    return compras.filter((c) => {
      if (filtroStatusCompra !== "TODOS" && c.status_geral !== filtroStatusCompra) return false;
      if (filtroCompradorCompra !== "TODOS" && c.comprador_cotacao !== filtroCompradorCompra)
        return false;
      if (filtroChegou === "sim" && !c.chegou) return false;
      if (filtroChegou === "nao" && c.chegou) return false;
      if (filtroRetirado === "sim" && !c.foi_retirado) return false;
      if (filtroRetirado === "nao" && c.foi_retirado) return false;
      if (filtroFila === "sim" && !c.rc_em_fila) return false;
      if (filtroFila === "nao" && c.rc_em_fila) return false;
      if (filtroAguardandoRetirada && (!c.chegou || c.foi_retirado)) return false;
      return true;
    });
  }, [
    compras,
    filtroStatusCompra,
    filtroCompradorCompra,
    filtroChegou,
    filtroRetirado,
    filtroFila,
    filtroAguardandoRetirada,
  ]);

  const handleToggleChegou = async (id: number, current: boolean) => {
    const { error } = await supabase.from("compras").update({ chegou: !current }).eq("id", id);
    if (error) {
      toast.error("Erro: " + error.message);
      return;
    }
    await carregarDados();
  };

  const handleToggleFoiRetirado = async (id: number, current: boolean, afeta_saldo: boolean) => {
    if (!current) {
      setDialogDataRetirada(id);
      setDataRetiradaInput(new Date().toISOString().split("T")[0]);
      return;
    }
    const { error } = await supabase
      .from("compras")
      .update({ foi_retirado: false, data_retirado: null })
      .eq("id", id);
    if (error) {
      toast.error("Erro: " + error.message);
      return;
    }
    await carregarDados();
  };

  const confirmarRetirada = async () => {
    if (!dialogDataRetirada) return;
    const { error } = await supabase
      .from("compras")
      .update({
        foi_retirado: true,
        data_retirado: dataRetiradaInput || null,
      })
      .eq("id", dialogDataRetirada);
    if (error) {
      toast.error("Erro: " + error.message);
      return;
    }
    const reg = compras.find((c) => c.id === dialogDataRetirada);
    if (reg?.afeta_saldo) {
      toast.success("Compra marcada como retirada! Entrada automática no estoque registrada.");
    } else {
      toast.success("Compra marcada como retirada (histórico, sem efeito no estoque).");
    }
    setDialogDataRetirada(null);
    await carregarDados();
  };

  const elevatoriaOptions = useMemo(
    () => Array.from(new Set(materiais.map((m) => m.vinculo_elevatoria).filter(Boolean))).sort(),
    [materiais],
  );

  // --- Ações ---
  const handleNovaCompra = async (data: Partial<Compra>) => {
    const { error } = await supabase.from("compras").insert({
      ...data,
      criado_por: user?.email || "",
    });
    if (error) {
      toast.error("Erro ao criar pedido: " + error.message);
      return;
    }
    await carregarDados();
    toast.success("Pedido de compra criado!");
    setDialogCompra(false);
  };

  const handleCompraStatus = async (id: number, status_geral: StatusCompra) => {
    const update: Partial<Compra> = { status_geral };
    const { error } = await supabase.from("compras").update(update).eq("id", id);
    if (error) {
      toast.error("Erro: " + error.message);
      return;
    }
    await carregarDados();
    toast.success("Status atualizado!");
  };

  const handleUpdateCompra = async (id: number, data: Partial<Compra>) => {
    const { error } = await supabase.from("compras").update(data).eq("id", id);
    if (error) {
      toast.error("Erro: " + error.message);
      return;
    }
    await carregarDados();
    toast.success("Atualizado!");
    setEditandoCompraId(null);
    setEditandoCampo(null);
  };

  const categoriasAtivas = useMemo(() => categorias.filter((c) => c.ativo), [categorias]);

  const resolverCategoriaId = (valor: string): number | null => {
    const v = valor.trim().toLowerCase();
    if (!v) return categorias.find((c) => c.nome === "Outros")?.id ?? null;
    const porId = categorias.find((c) => String(c.id) === v);
    if (porId) return porId.id;
    const porNome = categorias.find((c) => c.nome.toLowerCase() === v);
    if (porNome) return porNome.id;
    const slugMap: Record<string, string> = {
      eletrico: "Elétrico",
      mecanico: "Mecânico",
      hidraulico: "Hidráulico",
      epi: "EPI",
      consumivel: "Consumível",
      outros: "Outros",
    };
    const nome = slugMap[v];
    if (nome) return categorias.find((c) => c.nome === nome)?.id ?? null;
    return categorias.find((c) => c.nome === "Outros")?.id ?? null;
  };

  const handleImportarCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split("\n").filter(Boolean);
    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    const dados = lines.slice(1).map((line) => {
      const vals = line.split(",").map((v) => v.trim().replace(/"/g, ""));
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = vals[i] || "";
      });
      return obj;
    });
    let importados = 0;
    for (const d of dados) {
      if (!d.cod_sap || !d.descricao) continue;
      const categoriaId = resolverCategoriaId(d.categoria || d.categoria_id || "");
      if (!categoriaId) continue;
      const { error } = await supabase.from("materiais").upsert(
        {
          cod_sap: d.cod_sap,
          descricao: d.descricao,
          unidade_medida: d.unidade_medida || "UN",
          categoria_id: categoriaId,
          fabricante: d.fabricante || "",
          local_armazenagem: d.local_armazenagem || "",
          estoque_minimo: Number(d.estoque_minimo) || 0,
          material_critico: d.material_critico === "true" || d.material_critico === "sim",
          vinculo_elevatoria: d.vinculo_elevatoria || "",
          ativo: d.ativo !== "false",
          saldo_atual: Number(d.saldo_atual) || 0,
        },
        { onConflict: "cod_sap" },
      );
      if (!error) importados++;
    }
    toast.success(`${importados} materiais importados/atualizados com sucesso!`);
    await carregarDados();
    setDialogImportar(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImportarComprasCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split("\n").filter(Boolean);
    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    const dados = lines.slice(1).map((line) => {
      const vals = line.split(",").map((v) => v.trim().replace(/"/g, ""));
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = vals[i] || "";
      });
      return obj;
    });
    let importados = 0;
    for (const d of dados) {
      const requisicao = Number(d.requisicao) || null;
      const item_rc = Number(d.item_rc) || null;
      if (!requisicao || !item_rc) continue;
      const { error } = await supabase.from("compras").upsert(
        {
          requisicao,
          item_rc,
          cod_sap: d.cod_sap || null,
          descricao_material: d.descricao_material || d.descricao || "",
          qtde_rc: Number(d.qtde_rc) || 0,
          comprador_cotacao: d.comprador_cotacao || null,
          pedido: d.pedido || null,
          fornecedor: d.fornecedor || null,
          deposito_rc: d.deposito_rc || null,
          status_geral: d.status_geral || null,
          dt_criacao_rc: d.dt_criacao_rc || null,
          dt_aprovacao_rc: d.dt_aprovacao_rc || null,
          dt_criacao_pedido: d.dt_criacao_pedido || null,
          dt_remessa_pedido: d.dt_remessa_pedido || null,
          data_confirmada: d.data_confirmada || d.dt_prevista_entrega || null,
          emissao_nf: d.emissao_nf || null,
          dt_pagamento: d.dt_pagamento || null,
          chegou: d.chegou === "true" || d.chegou === "sim",
          data_chegou: d.data_chegou || null,
          foi_retirado: d.foi_retirado === "true" || d.foi_retirado === "sim",
          data_retirado: d.data_retirado || null,
          cobrado_via_email: d.cobrado_via_email === "true" || d.cobrado_via_email === "sim",
          observacao: d.observacao || null,
          rc_em_fila: d.rc_em_fila === "true" || d.rc_em_fila === "sim",
          afeta_saldo: d.afeta_saldo === "true" || d.afeta_saldo === "sim",
          criado_por: "IMPORTACAO_PLANILHA",
        },
        { onConflict: "requisicao,item_rc" },
      );
      if (!error) importados++;
    }
    toast.success(`${importados} pedidos importados/atualizados com sucesso!`);
    await carregarDados();
    setDialogImportarCompras(false);
    if (fileInputRefCompras.current) fileInputRefCompras.current.value = "";
  };

  const exportarCSV = () => {
    const headers = [
      "cod_sap",
      "descricao",
      "unidade_medida",
      "categoria",
      "fabricante",
      "local_armazenagem",
      "estoque_minimo",
      "material_critico",
      "vinculo_elevatoria",
      "saldo_atual",
      "custo_unitario",
    ];
    const rows = materiais.map((m) => {
      const row: Record<string, string | number | boolean> = {
        cod_sap: m.cod_sap,
        descricao: m.descricao,
        unidade_medida: m.unidade_medida,
        categoria: getCategoriaNome(m),
        fabricante: m.fabricante,
        local_armazenagem: m.local_armazenagem,
        estoque_minimo: m.estoque_minimo,
        material_critico: m.material_critico,
        vinculo_elevatoria: m.vinculo_elevatoria,
        saldo_atual: m.saldo_atual,
        custo_unitario: m.custo_unitario,
      };
      return headers.map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `materiais-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // --- Ações inline ---
  const toggleCritico = async (m: Material) => {
    const novo = !m.material_critico;
    const { error } = await supabase
      .from("materiais")
      .update({ material_critico: novo })
      .eq("cod_sap", m.cod_sap);
    if (error) {
      toast.error("Erro ao alternar crítico: " + error.message);
      return;
    }
    setMateriais((prev) =>
      prev.map((mat) => (mat.cod_sap === m.cod_sap ? { ...mat, material_critico: novo } : mat)),
    );
  };

  const salvarMinimo = async (cod_sap: string, valor: number) => {
    const { error } = await supabase
      .from("materiais")
      .update({ estoque_minimo: valor })
      .eq("cod_sap", cod_sap);
    if (error) {
      toast.error("Erro ao salvar mínimo: " + error.message);
      return;
    }
    setMateriais((prev) =>
      prev.map((mat) => (mat.cod_sap === cod_sap ? { ...mat, estoque_minimo: valor } : mat)),
    );
    toast.success("Mínimo atualizado!");
  };

  const iniciarEdicaoMinimo = (cod_sap: string, valorAtual: number) => {
    setEditandoMinimo(cod_sap);
    setEditandoValor(String(valorAtual));
  };

  // --- Material autocomplete ---
  const AutoCompleteMaterial = ({
    value,
    onChange,
    onSelect,
    placeholder = "Buscar material...",
    inputRef,
  }: {
    value: Material | null;
    onChange: (m: Material | null) => void;
    onSelect?: () => void;
    placeholder?: string;
    inputRef?: React.RefObject<HTMLInputElement | null>;
  }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");

    const normalize = (s: string) =>
      s
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

    const filtered = query
      ? materiais.filter(
          (m) =>
            normalize(m.cod_sap).includes(normalize(query)) ||
            normalize(m.descricao).includes(normalize(query)),
        )
      : [];

    const MAX = 8;
    const shown = filtered.slice(0, MAX);
    const remaining = filtered.length - MAX;

    const displayText = value ? `${value.cod_sap} - ${value.descricao}` : "";

    return (
      <div className="relative">
        <input
          ref={inputRef}
          value={open ? query : displayText}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (value) onChange(null);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery(displayText || "");
          }}
          placeholder={placeholder}
          className="min-h-11 w-full rounded-md border border-slate-300 px-2 text-[14px] shadow-sm"
        />
        {open && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => {
                setOpen(false);
                if (!value) setQuery("");
              }}
            />
            <div className="absolute z-40 mt-1 max-h-64 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
              {!query && (
                <div className="px-2 py-3 text-center text-sm text-slate-400">
                  Digite para buscar...
                </div>
              )}
              {query && shown.length === 0 && (
                <div className="px-2 py-3 text-center text-sm text-slate-400">
                  Nenhum material encontrado
                </div>
              )}
              {shown.map((m) => (
                <button
                  key={m.cod_sap}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(m);
                    setOpen(false);
                    setQuery(`${m.cod_sap} - ${m.descricao}`);
                    onSelect?.();
                  }}
                  className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-slate-50 ${value?.cod_sap === m.cod_sap ? "bg-blue-50" : ""}`}
                >
                  <span className="font-mono text-[#1f7ad6]">{m.cod_sap}</span>
                  <span className="truncate text-slate-600">{m.descricao}</span>
                  <span className="ml-auto shrink-0 text-xs text-slate-400">
                    {m.saldo_atual} {m.unidade_medida}
                  </span>
                </button>
              ))}
              {remaining > 0 && (
                <div className="border-t border-slate-100 px-2 py-1.5 text-center text-xs text-slate-400">
                  +{remaining} resultado{remaining > 1 ? "s" : ""}, refine sua busca
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  // --- Renderizações ---
  const Semaforo = ({ saldo, minimo }: { saldo: number; minimo: number }) => {
    const s = getStatusEstoque(saldo, minimo);
    if (s === "sem_estoque")
      return (
        <span className="inline-flex items-center gap-1 text-red-700 font-bold">
          <span className="h-2.5 w-2.5 rounded-full bg-red-600" /> Sem Estoque
        </span>
      );
    if (s === "baixo")
      return (
        <span className="inline-flex items-center gap-1 text-orange-600 font-bold">
          <span className="h-2.5 w-2.5 rounded-full bg-orange-500" /> Baixo Estoque
        </span>
      );
    if (s === "atencao")
      return (
        <span className="inline-flex items-center gap-1 text-amber-600 font-bold">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Atenção
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Normal
      </span>
    );
  };

  // --- Formulários em Dialog ---
  const FormEntrada = () => {
    const [selected, setSelected] = useState<Material | null>(null);
    const [qtd, setQtd] = useState(1);
    const [resp, setResp] = useState("");
    const [obs, setObs] = useState("");
    const [saving, setSaving] = useState(false);
    const qtdRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const valido = selected !== null && qtd > 0 && resp.trim().length > 0;

    const handleSalvar = async () => {
      if (!valido || !selected || saving) return;
      setSaving(true);
      const { error } = await supabase.from("movimentacoes").insert({
        cod_sap: selected.cod_sap,
        tipo: "ENTRADA",
        quantidade: qtd,
        responsavel: resp.trim(),
        observacao: obs.trim(),
        criado_por: user?.email || "",
      });
      if (error) {
        toast.error("Erro ao registrar entrada: " + error.message);
        setSaving(false);
        return;
      }
      await carregarDados();
      toast.success(
        `Entrada registrada! Novo saldo: ${selected.saldo_atual + qtd} ${selected.unidade_medida}`,
      );
      setDialogMov(null);
    };

    return (
      <div className="grid gap-3 py-2 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Material *</span>
          <AutoCompleteMaterial
            value={selected}
            onChange={(m) => {
              setSelected(m);
              if (m) setTimeout(() => qtdRef.current?.focus(), 0);
            }}
            inputRef={inputRef}
          />
          {selected && (
            <span className="text-[10px] text-slate-400">
              Saldo atual: {selected.saldo_atual} {selected.unidade_medida}
            </span>
          )}
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Quantidade *</span>
          <input
            ref={qtdRef}
            type="number"
            min={1}
            value={qtd}
            onChange={(e) => setQtd(Number(e.target.value) || 0)}
            className="min-h-11 rounded-md border border-slate-300 px-2 text-[14px] shadow-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Quem recebeu *</span>
          <input
            value={resp}
            onChange={(e) => setResp(e.target.value)}
            className="min-h-11 rounded-md border border-slate-300 px-2 text-[14px] shadow-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Observação</span>
          <textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            className="min-h-20 rounded-md border border-slate-300 px-2 py-1.5 text-[14px] shadow-sm"
          />
        </label>
        <button
          onClick={handleSalvar}
          disabled={!valido || saving}
          className="rounded-md bg-emerald-600 px-3 py-2 text-[13px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Registrar Entrada"}
        </button>
      </div>
    );
  };

  const FormSaida = () => {
    const [selected, setSelected] = useState<Material | null>(null);
    const [qtd, setQtd] = useState(1);
    const [destino, setDestino] = useState("");
    const [solicitante, setSolicitante] = useState("");
    const [resp, setResp] = useState("");
    const [obs, setObs] = useState("");
    const [saving, setSaving] = useState(false);
    const qtdRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const saldoInsuficiente = selected !== null && qtd > selected.saldo_atual;
    const valido =
      selected !== null &&
      qtd > 0 &&
      destino.trim().length > 0 &&
      solicitante.trim().length > 0 &&
      resp.trim().length > 0 &&
      !saldoInsuficiente;

    const handleSalvar = async () => {
      if (!valido || !selected || saving) return;
      setSaving(true);
      const { error } = await supabase.from("movimentacoes").insert({
        cod_sap: selected.cod_sap,
        tipo: "SAIDA",
        quantidade: qtd,
        destino: destino.trim(),
        solicitante: solicitante.trim(),
        responsavel: resp.trim(),
        observacao: obs.trim(),
        criado_por: user?.email || "",
      });
      if (error) {
        toast.error("Erro ao registrar saída: " + error.message);
        setSaving(false);
        return;
      }
      await carregarDados();
      toast.success(
        `Saída registrada! Novo saldo: ${selected.saldo_atual - qtd} ${selected.unidade_medida}`,
      );
      setDialogMov(null);
    };

    return (
      <div className="grid gap-3 py-2 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Material *</span>
          <AutoCompleteMaterial
            value={selected}
            onChange={(m) => {
              setSelected(m);
              if (m) setTimeout(() => qtdRef.current?.focus(), 0);
            }}
            inputRef={inputRef}
          />
          {selected && (
            <span className="text-[10px] text-slate-400">
              Saldo disponível: {selected.saldo_atual} {selected.unidade_medida} | Mínimo:{" "}
              {selected.estoque_minimo}
            </span>
          )}
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Quantidade *</span>
          <input
            ref={qtdRef}
            type="number"
            min={1}
            max={selected?.saldo_atual || 1}
            value={qtd}
            onChange={(e) => setQtd(Number(e.target.value) || 0)}
            className="min-h-11 rounded-md border border-slate-300 px-2 text-[14px] shadow-sm"
          />
          {saldoInsuficiente && (
            <span className="text-[11px] font-semibold text-red-600">
              Saldo insuficiente: disponível {selected!.saldo_atual}, solicitado {qtd}
            </span>
          )}
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Destino (elevatória/local) *</span>
          <input
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
            className="min-h-11 rounded-md border border-slate-300 px-2 text-[14px] shadow-sm"
            placeholder="Ex: PL-RJB-EAT1005"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Solicitante *</span>
          <input
            value={solicitante}
            onChange={(e) => setSolicitante(e.target.value)}
            className="min-h-11 rounded-md border border-slate-300 px-2 text-[14px] shadow-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Responsável pela saída *</span>
          <input
            value={resp}
            onChange={(e) => setResp(e.target.value)}
            className="min-h-11 rounded-md border border-slate-300 px-2 text-[14px] shadow-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Observação</span>
          <textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            className="min-h-20 rounded-md border border-slate-300 px-2 py-1.5 text-[14px] shadow-sm"
          />
        </label>
        <button
          onClick={handleSalvar}
          disabled={!valido || saving}
          className="rounded-md bg-red-600 px-3 py-2 text-[13px] font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Registrar Saída"}
        </button>
      </div>
    );
  };

  const MOTIVOS_AJUSTE = [
    "Retirada não registrada (contagem física divergente)",
    "Erro de contagem anterior",
    "Material danificado/descartado",
    "Outro",
  ] as const;

  const FormAjuste = () => {
    const [selected, setSelected] = useState<Material | null>(null);
    const [qtdNova, setQtdNova] = useState(0);
    const [motivoOpcao, setMotivoOpcao] = useState("");
    const [motivoOutro, setMotivoOutro] = useState("");
    const [saving, setSaving] = useState(false);
    const qtdRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const motivoFinal = motivoOpcao === "Outro" ? motivoOutro.trim() : motivoOpcao;
    const valido =
      selected !== null &&
      qtdNova >= 0 &&
      motivoOpcao.length > 0 &&
      (motivoOpcao !== "Outro" || motivoOutro.trim().length > 0);
    const diff = selected !== null ? qtdNova - selected.saldo_atual : 0;

    const handleSalvar = async () => {
      if (!valido || !selected || saving) return;
      setSaving(true);
      const { error } = await supabase.from("movimentacoes").insert({
        cod_sap: selected.cod_sap,
        tipo: "AJUSTE",
        quantidade: diff,
        motivo_ajuste: motivoFinal,
        criado_por: user?.email || "",
      });
      if (error) {
        toast.error("Erro ao registrar ajuste: " + error.message);
        setSaving(false);
        return;
      }
      await carregarDados();
      toast.success(
        `Saldo ajustado de ${selected.saldo_atual} para ${qtdNova} ${selected.unidade_medida} (diferença: ${diff > 0 ? "+" : ""}${diff})`,
      );
      setDialogMov(null);
    };

    return (
      <div className="grid gap-3 py-2 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Material *</span>
          <AutoCompleteMaterial
            value={selected}
            onChange={(m) => {
              setSelected(m);
              if (m) {
                setQtdNova(m.saldo_atual);
                setTimeout(() => qtdRef.current?.focus(), 0);
              }
            }}
            inputRef={inputRef}
          />
        </label>
        {selected && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Saldo atual no sistema:</span>
              <span className="text-lg font-bold">
                {selected.saldo_atual} {selected.unidade_medida}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-slate-400">{selected.descricao}</div>
          </div>
        )}
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Novo saldo (físico real) *</span>
          <input
            ref={qtdRef}
            type="number"
            min={0}
            value={qtdNova}
            onChange={(e) => setQtdNova(Number(e.target.value) || 0)}
            className="min-h-11 rounded-md border border-slate-300 px-2 text-[14px] shadow-sm"
          />
          {selected && (
            <span
              className={`text-[11px] ${diff !== 0 ? "font-semibold text-amber-600" : "text-slate-400"}`}
            >
              {diff === 0
                ? "Sem alteração"
                : `Diferença: ${diff > 0 ? "+" : ""}${diff} ${selected.unidade_medida} (${diff > 0 ? "aumento" : "redução"})`}
            </span>
          )}
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Motivo do ajuste *</span>
          <select
            value={motivoOpcao}
            onChange={(e) => setMotivoOpcao(e.target.value)}
            className="min-h-11 rounded-md border border-slate-300 bg-white px-2 text-[14px] shadow-sm"
          >
            <option value="">Selecione o motivo...</option>
            {MOTIVOS_AJUSTE.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          {motivoOpcao === "Outro" && (
            <input
              value={motivoOutro}
              onChange={(e) => setMotivoOutro(e.target.value)}
              placeholder="Descreva o motivo..."
              className="mt-1 min-h-11 rounded-md border border-slate-300 px-2 text-[14px] shadow-sm"
            />
          )}
        </label>
        <button
          onClick={handleSalvar}
          disabled={!valido || saving}
          className="rounded-md bg-amber-600 px-3 py-2 text-[13px] font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Registrar Ajuste"}
        </button>
      </div>
    );
  };

  const FormNovaCompra = () => {
    const [selected, setSelected] = useState<Material | null>(null);
    const [qtd, setQtd] = useState(1);
    const [deposito, setDeposito] = useState("DP98");
    const [previsaoUso, setPrevisaoUso] = useState("");
    const [solicitante, setSolicitante] = useState("");
    const [obs, setObs] = useState("");
    const qtdRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const mat = selected;

    const sugestao = useMemo(() => {
      if (!selected) return 0;
      const saidas = movimentacoes.filter(
        (m) => m.cod_sap === selected.cod_sap && m.tipo === "SAIDA",
      );
      if (saidas.length < 2) return 0;
      const total = saidas.reduce((s, m) => s + m.quantidade, 0);
      const meses = Math.max(
        1,
        Math.ceil(
          (Date.now() - new Date(saidas[saidas.length - 1].data).getTime()) / 30 / 86400000,
        ),
      );
      return Math.ceil(total / meses);
    }, [selected, movimentacoes]);

    return (
      <div className="grid gap-3 py-2 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Material *</span>
          <AutoCompleteMaterial
            value={selected}
            onChange={(m) => {
              setSelected(m);
              if (m) setTimeout(() => qtdRef.current?.focus(), 0);
            }}
            inputRef={inputRef}
          />
          {mat && (
            <div className="flex flex-wrap gap-2 text-[10px] text-slate-400">
              <span>
                Saldo: {mat.saldo_atual} {mat.unidade_medida}
              </span>
              <span>Mínimo: {mat.estoque_minimo}</span>
              {mat.material_critico && <span className="text-red-500 font-semibold">Crítico</span>}
              {sugestao > 0 && (
                <span className="text-blue-500 font-semibold">Consumo médio: {sugestao}/mês</span>
              )}
            </div>
          )}
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-600">
              Quantidade solicitada{" "}
              {sugestao > 0 && (
                <span className="text-blue-500 font-normal">(sugestão: {sugestao})</span>
              )}
            </span>
            <input
              ref={qtdRef}
              type="number"
              min={1}
              value={qtd}
              onChange={(e) => setQtd(Number(e.target.value) || 0)}
              className="min-h-11 rounded-md border border-slate-300 px-2 text-[14px] shadow-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-600">Depósito destino</span>
            <select
              value={deposito}
              onChange={(e) => setDeposito(e.target.value)}
              className="min-h-11 rounded-md border border-slate-300 bg-white px-2 text-[14px] shadow-sm"
            >
              <option value="DP98">DP98</option>
              <option value="DP96">DP96</option>
            </select>
          </label>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-600">Solicitante</span>
            <input
              value={solicitante}
              onChange={(e) => setSolicitante(e.target.value)}
              placeholder={profile?.nome_completo || user?.email || ""}
              className="min-h-11 rounded-md border border-slate-300 px-2 text-[14px] shadow-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-600">Previsão de uso</span>
            <input
              value={previsaoUso}
              onChange={(e) => setPrevisaoUso(e.target.value)}
              className="min-h-11 rounded-md border border-slate-300 px-2 text-[14px] shadow-sm"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Observação</span>
          <textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            className="min-h-20 rounded-md border border-slate-300 px-2 py-1.5 text-[14px] shadow-sm"
          />
        </label>
        <button
          onClick={() =>
            selected &&
            qtd > 0 &&
            handleNovaCompra({
              cod_sap: selected.cod_sap,
              descricao_material: selected.descricao,
              qtde_rc: qtd,
              deposito_rc: deposito,
              previsao_uso: previsaoUso,
              solicitante: solicitante || profile?.nome_completo || user?.email || "",
              observacao: obs,
              rc_em_fila: true,
              afeta_saldo: true,
            })
          }
          disabled={!selected || qtd <= 0}
          className="rounded-md bg-[#0b3a73] px-3 py-2 text-[13px] font-semibold text-white hover:bg-[#1f7ad6] disabled:opacity-50"
        >
          Solicitar Compra
        </button>
      </div>
    );
  };

  const FormNovoMaterial = () => {
    const [codSap, setCodSap] = useState("");
    const [descricao, setDescricao] = useState("");
    const [unidade, setUnidade] = useState("UN");
    const [categoriaId, setCategoriaId] = useState(() =>
      String(
        categoriasAtivas.find((c) => c.nome === "Outros")?.id ?? categoriasAtivas[0]?.id ?? "",
      ),
    );
    const [fabricante, setFabricante] = useState("");
    const [local, setLocal] = useState("");
    const [minimo, setMinimo] = useState(0);
    const [critico, setCritico] = useState(false);
    const [elevatoria, setElevatoria] = useState("");
    const [saldo, setSaldo] = useState(0);
    const [saving, setSaving] = useState(false);

    const valido = codSap.trim() && descricao.trim() && categoriaId;

    const handleSalvar = async () => {
      if (!valido) return;
      setSaving(true);
      const { error } = await supabase.from("materiais").upsert(
        {
          cod_sap: codSap.trim(),
          descricao: descricao.trim(),
          unidade_medida: unidade.trim() || "UN",
          categoria_id: Number(categoriaId),
          fabricante: fabricante.trim(),
          local_armazenagem: local.trim(),
          estoque_minimo: minimo,
          material_critico: critico,
          vinculo_elevatoria: elevatoria.trim(),
          saldo_atual: saldo,
          ativo: true,
        },
        { onConflict: "cod_sap" },
      );
      setSaving(false);
      if (error) {
        toast.error("Erro ao salvar material: " + error.message);
        return;
      }
      await carregarDados();
      toast.success("Material cadastrado!");
      setDialogMaterial(false);
    };

    return (
      <div className="grid gap-3 py-2 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Código SAP *</span>
          <input
            value={codSap}
            onChange={(e) => setCodSap(e.target.value)}
            className="min-h-11 rounded-md border border-slate-300 px-2 text-[14px] shadow-sm"
            placeholder="Ex: 12345678"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Descrição *</span>
          <input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="min-h-11 rounded-md border border-slate-300 px-2 text-[14px] shadow-sm"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-600">Unidade</span>
            <input
              value={unidade}
              onChange={(e) => setUnidade(e.target.value)}
              className="min-h-11 rounded-md border border-slate-300 px-2 text-[14px] shadow-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-600">Categoria *</span>
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="min-h-11 rounded-md border border-slate-300 bg-white px-2 text-[14px] shadow-sm"
            >
              {categoriasAtivas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-600">Fabricante</span>
            <input
              value={fabricante}
              onChange={(e) => setFabricante(e.target.value)}
              className="min-h-11 rounded-md border border-slate-300 px-2 text-[14px] shadow-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-600">Local de armazenagem</span>
            <input
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              className="min-h-11 rounded-md border border-slate-300 px-2 text-[14px] shadow-sm"
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-600">Estoque mínimo</span>
            <input
              type="number"
              min={0}
              value={minimo}
              onChange={(e) => setMinimo(Number(e.target.value))}
              className="min-h-11 rounded-md border border-slate-300 px-2 text-[14px] shadow-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-600">Saldo inicial</span>
            <input
              type="number"
              min={0}
              value={saldo}
              onChange={(e) => setSaldo(Number(e.target.value))}
              className="min-h-11 rounded-md border border-slate-300 px-2 text-[14px] shadow-sm"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Elevatória vinculada</span>
          <input
            value={elevatoria}
            onChange={(e) => setElevatoria(e.target.value)}
            className="min-h-11 rounded-md border border-slate-300 px-2 text-[14px] shadow-sm"
          />
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input type="checkbox" checked={critico} onChange={(e) => setCritico(e.target.checked)} />
          <Star className="h-3.5 w-3.5 text-amber-500" /> Material crítico
        </label>
        <button
          onClick={handleSalvar}
          disabled={!valido || saving}
          className="rounded-md bg-[#0b3a73] px-3 py-2 text-[13px] font-semibold text-white hover:bg-[#1f7ad6] disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Cadastrar Material"}
        </button>
      </div>
    );
  };

  const GerenciarCategorias = () => {
    const [novaNome, setNovaNome] = useState("");
    const [editandoId, setEditandoId] = useState<number | null>(null);
    const [editandoNome, setEditandoNome] = useState("");
    const [saving, setSaving] = useState(false);

    const handleCriar = async () => {
      const nome = novaNome.trim();
      if (!nome) return;
      setSaving(true);
      const { error } = await supabase.from("categorias").insert({ nome });
      setSaving(false);
      if (error) {
        toast.error("Erro ao criar categoria: " + error.message);
        return;
      }
      setNovaNome("");
      await carregarDados();
      toast.success("Categoria criada!");
    };

    const handleSalvarEdicao = async (id: number) => {
      const nome = editandoNome.trim();
      if (!nome) return;
      setSaving(true);
      const { error } = await supabase.from("categorias").update({ nome }).eq("id", id);
      setSaving(false);
      if (error) {
        toast.error("Erro ao atualizar: " + error.message);
        return;
      }
      setEditandoId(null);
      await carregarDados();
      toast.success("Categoria atualizada!");
    };

    const handleToggleAtivo = async (cat: Categoria) => {
      const { error } = await supabase
        .from("categorias")
        .update({ ativo: !cat.ativo })
        .eq("id", cat.id);
      if (error) {
        toast.error("Erro: " + error.message);
        return;
      }
      await carregarDados();
      toast.success(cat.ativo ? "Categoria desativada" : "Categoria reativada");
    };

    return (
      <div className="py-2">
        <div className="mb-4 flex gap-2">
          <input
            value={novaNome}
            onChange={(e) => setNovaNome(e.target.value)}
            placeholder="Nome da nova categoria..."
            className="min-h-10 flex-1 rounded-md border border-slate-300 px-3 text-sm shadow-sm"
            onKeyDown={(e) => e.key === "Enter" && handleCriar()}
          />
          <button
            onClick={handleCriar}
            disabled={!novaNome.trim() || saving}
            className="rounded-md bg-[#0b3a73] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#1f7ad6] disabled:opacity-50"
          >
            <Plus className="mr-1 inline h-4 w-4" /> Criar
          </button>
        </div>
        <div className="max-h-80 space-y-2 overflow-auto">
          {categorias.length === 0 && (
            <p className="py-4 text-center text-sm text-slate-400">Nenhuma categoria cadastrada.</p>
          )}
          {categorias.map((cat) => (
            <div
              key={cat.id}
              className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${
                cat.ativo ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 opacity-60"
              }`}
            >
              {editandoId === cat.id ? (
                <div className="flex flex-1 items-center gap-2">
                  <input
                    value={editandoNome}
                    onChange={(e) => setEditandoNome(e.target.value)}
                    className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSalvarEdicao(cat.id);
                      if (e.key === "Escape") setEditandoId(null);
                    }}
                  />
                  <button
                    onClick={() => handleSalvarEdicao(cat.id)}
                    className="rounded bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-700"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => setEditandoId(null)}
                    className="rounded bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-[#0b3a73]" />
                    <span className="font-medium text-slate-800">{cat.nome}</span>
                    {!cat.ativo && (
                      <Badge variant="outline" className="text-[10px] text-slate-400">
                        Inativa
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditandoId(cat.id);
                        setEditandoNome(cat.nome);
                      }}
                      className="rounded bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-200"
                    >
                      <Edit3 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleToggleAtivo(cat)}
                      className={`rounded px-2 py-1 text-[11px] font-bold ${
                        cat.ativo
                          ? "bg-red-50 text-red-600 hover:bg-red-100"
                          : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                      }`}
                    >
                      {cat.ativo ? "Desativar" : "Reativar"}
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const AbaRegistros = ({
    movimentacoes: movs,
    materiais: mats,
    categorias: cats,
  }: {
    movimentacoes: Movimentacao[];
    materiais: Material[];
    categorias: Categoria[];
  }) => {
    const [filtroTipo, setFiltroTipo] = useState<TipoMovimentacao | "TODAS">("TODAS");
    const [filtroOrigem, setFiltroOrigem] = useState<OrigemMovimentacao | "TODAS">("TODAS");
    const [filtroCategoriaGrafico, setFiltroCategoriaGrafico] = useState<string>("TODAS");
    const [dataInicio, setDataInicio] = useState("");
    const [dataFim, setDataFim] = useState("");
    const [search, setSearch] = useState("");
    const [destinoFilter, setDestinoFilter] = useState("");
    const [page, setPage] = useState(0);
    const pageSize = 50;

    const codsNaCategoria = useMemo(() => {
      if (filtroCategoriaGrafico === "TODAS") return null;
      return new Set(
        mats.filter((m) => String(m.categoria_id) === filtroCategoriaGrafico).map((m) => m.cod_sap),
      );
    }, [mats, filtroCategoriaGrafico]);

    const movsGrafico = useMemo(() => {
      let list = movs.filter((m) => m.afeta_saldo !== false);
      if (codsNaCategoria) list = list.filter((m) => codsNaCategoria.has(m.cod_sap));
      return list;
    }, [movs, codsNaCategoria]);

    const mesLabel = (d: Date) =>
      d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });

    const ultimos12Meses = useMemo(() => {
      const meses: { key: string; label: string; inicio: Date; fim: Date }[] = [];
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const inicio = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const fim = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
        const key = `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, "0")}`;
        meses.push({ key, label: mesLabel(inicio), inicio, fim });
      }
      return meses;
    }, []);

    const dadosBarras = useMemo(() => {
      return ultimos12Meses.map((mes) => {
        const noMes = movsGrafico.filter((m) => {
          if (!m.data) return false;
          const d = new Date(m.data);
          return d >= mes.inicio && d <= mes.fim;
        });
        const entradas = noMes
          .filter((m) => m.tipo === "ENTRADA")
          .reduce((s, m) => s + m.quantidade, 0);
        const saidas = noMes
          .filter((m) => m.tipo === "SAIDA")
          .reduce((s, m) => s + m.quantidade, 0);
        return { mes: mes.label, entradas, saidas };
      });
    }, [movsGrafico, ultimos12Meses]);

    const dadosSaldoLinha = useMemo(() => {
      const cods = codsNaCategoria ?? new Set(mats.map((m) => m.cod_sap));
      const matsFiltrados = mats.filter((m) => cods.has(m.cod_sap));
      const saldos = new Map(matsFiltrados.map((m) => [m.cod_sap, m.saldo_atual]));

      const movsRelevantes = movsGrafico
        .filter((m) => m.data && cods.has(m.cod_sap))
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

      const pontos: { mes: string; saldo: number }[] = [];

      for (let i = ultimos12Meses.length - 1; i >= 0; i--) {
        const mes = ultimos12Meses[i];
        const total = Array.from(saldos.values()).reduce((s, v) => s + v, 0);
        pontos.unshift({ mes: mes.label, saldo: Math.round(total * 100) / 100 });

        const noMes = movsRelevantes.filter((m) => {
          const d = new Date(m.data);
          return d >= mes.inicio && d <= mes.fim;
        });

        for (const mov of noMes) {
          const atual = saldos.get(mov.cod_sap) ?? 0;
          if (mov.tipo === "ENTRADA") saldos.set(mov.cod_sap, atual - mov.quantidade);
          else if (mov.tipo === "SAIDA") saldos.set(mov.cod_sap, atual + mov.quantidade);
          else if (mov.tipo === "AJUSTE") {
            const anteriores = movsGrafico
              .filter(
                (m) =>
                  m.cod_sap === mov.cod_sap &&
                  m.data &&
                  new Date(m.data) < new Date(mov.data) &&
                  m.afeta_saldo !== false,
              )
              .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
            let saldoAntes = 0;
            for (const ant of anteriores) {
              if (ant.tipo === "ENTRADA") saldoAntes += ant.quantidade;
              else if (ant.tipo === "SAIDA") saldoAntes -= ant.quantidade;
              else if (ant.tipo === "AJUSTE") {
                saldoAntes = ant.quantidade;
                break;
              }
            }
            saldos.set(mov.cod_sap, saldoAntes);
          }
        }
      }

      return pontos;
    }, [movsGrafico, mats, codsNaCategoria, ultimos12Meses]);

    const comparativoMes = useMemo(() => {
      const now = new Date();
      const inicioAtual = new Date(now.getFullYear(), now.getMonth(), 1);
      const inicioAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const fimAnterior = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

      const noPeriodo = (inicio: Date, fim: Date) =>
        movsGrafico.filter((m) => {
          if (!m.data) return false;
          const d = new Date(m.data);
          return d >= inicio && d <= fim;
        });

      const atual = noPeriodo(inicioAtual, now);
      const anterior = noPeriodo(inicioAnterior, fimAnterior);

      const sumTipo = (list: Movimentacao[], tipo: TipoMovimentacao) =>
        list.filter((m) => m.tipo === tipo).reduce((s, m) => s + m.quantidade, 0);

      const entradasAtual = sumTipo(atual, "ENTRADA");
      const saidasAtual = sumTipo(atual, "SAIDA");
      const entradasAnterior = sumTipo(anterior, "ENTRADA");
      const saidasAnterior = sumTipo(anterior, "SAIDA");

      const variacao = (atual: number, anterior: number) =>
        anterior === 0 ? (atual > 0 ? 100 : 0) : Math.round(((atual - anterior) / anterior) * 100);

      return {
        entradasAtual,
        saidasAtual,
        varEntradas: variacao(entradasAtual, entradasAnterior),
        varSaidas: variacao(saidasAtual, saidasAnterior),
      };
    }, [movsGrafico]);

    const filtered = useMemo(() => {
      let list = [...movs];
      if (filtroTipo !== "TODAS") list = list.filter((m) => m.tipo === filtroTipo);
      if (filtroOrigem !== "TODAS") list = list.filter((m) => m.origem === filtroOrigem);
      if (dataInicio) list = list.filter((m) => new Date(m.data) >= new Date(dataInicio));
      if (dataFim) {
        const fim = new Date(dataFim);
        fim.setDate(fim.getDate() + 1);
        list = list.filter((m) => new Date(m.data) < fim);
      }
      if (search) {
        const q = search.toLowerCase();
        list = list.filter(
          (m) =>
            m.cod_sap.toLowerCase().includes(q) ||
            mats
              .find((mat) => mat.cod_sap === m.cod_sap)
              ?.descricao.toLowerCase()
              .includes(q),
        );
      }
      if (destinoFilter) {
        const q = destinoFilter.toLowerCase();
        list = list.filter((m) => m.destino.toLowerCase().includes(q));
      }
      list.sort((a, b) => {
        const ta = a.data ? new Date(a.data).getTime() : 0;
        const tb = b.data ? new Date(b.data).getTime() : 0;
        return tb - ta;
      });
      return list;
    }, [movs, filtroTipo, filtroOrigem, dataInicio, dataFim, search, destinoFilter, mats]);

    const totalPages = Math.ceil(filtered.length / pageSize);
    const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize);

    useEffect(() => setPage(0), [filtroTipo, filtroOrigem, search, destinoFilter]);

    const destinos = useMemo(() => {
      const set = new Set<string>();
      movs.forEach((m) => {
        if (m.destino) set.add(m.destino);
      });
      return [...set].sort();
    }, [movs]);

    return (
      <div>
        {/* Dashboard */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[#0b3a73]">
              <BarChart3 className="mr-1 inline h-4 w-4" /> Resumo de Movimentações
            </h2>
            <select
              value={filtroCategoriaGrafico}
              onChange={(e) => setFiltroCategoriaGrafico(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[13px] shadow-sm"
            >
              <option value="TODAS">Todas categorias</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Card>
              <CardContent className="flex items-center justify-around py-4">
                <div className="text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
                    Entradas (mês atual)
                  </p>
                  <p className="mt-1 text-2xl font-bold text-emerald-700">
                    {comparativoMes.entradasAtual}
                  </p>
                  <p
                    className={`mt-0.5 flex items-center justify-center gap-0.5 text-[12px] font-semibold ${
                      comparativoMes.varEntradas >= 0 ? "text-emerald-600" : "text-red-500"
                    }`}
                  >
                    {comparativoMes.varEntradas >= 0 ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )}
                    {Math.abs(comparativoMes.varEntradas)}% vs mês anterior
                  </p>
                </div>
                <div className="h-12 w-px bg-slate-200" />
                <div className="text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-red-600">
                    Saídas (mês atual)
                  </p>
                  <p className="mt-1 text-2xl font-bold text-red-700">
                    {comparativoMes.saidasAtual}
                  </p>
                  <p
                    className={`mt-0.5 flex items-center justify-center gap-0.5 text-[12px] font-semibold ${
                      comparativoMes.varSaidas <= 0 ? "text-emerald-600" : "text-red-500"
                    }`}
                  >
                    {comparativoMes.varSaidas >= 0 ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )}
                    {Math.abs(comparativoMes.varSaidas)}% vs mês anterior
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-semibold text-slate-600">
                  Saldo total acumulado
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={dadosSaldoLinha}
                      margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} width={40} />
                      <Tooltip formatter={(v: number) => [`${v} un.`, "Saldo"]} />
                      <Line
                        type="monotone"
                        dataKey="saldo"
                        stroke="#0b3a73"
                        strokeWidth={2}
                        dot={{ r: 3, fill: "#0b3a73" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-semibold text-slate-600">
                Entradas x Saídas por mês (últimos 12 meses)
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosBarras} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} width={40} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar
                      dataKey="entradas"
                      name="Entradas"
                      stackId="a"
                      fill="#10b981"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      dataKey="saidas"
                      name="Saídas"
                      stackId="a"
                      fill="#ef4444"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value as TipoMovimentacao | "TODAS")}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[13px] shadow-sm"
          >
            <option value="TODAS">Todos os tipos</option>
            <option value="ENTRADA">Entrada</option>
            <option value="SAIDA">Saída</option>
            <option value="AJUSTE">Ajuste</option>
          </select>
          <select
            value={filtroOrigem}
            onChange={(e) => setFiltroOrigem(e.target.value as OrigemMovimentacao | "TODAS")}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[13px] shadow-sm"
          >
            <option value="TODAS">Todas origens</option>
            <option value="SISTEMA">Sistema</option>
            <option value="HISTORICO_PLANILHA">Histórico</option>
          </select>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar código ou descrição..."
            className="w-48 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[13px] shadow-sm placeholder:text-slate-400"
          />
          <select
            value={destinoFilter}
            onChange={(e) => setDestinoFilter(e.target.value)}
            className="max-w-40 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[13px] shadow-sm"
          >
            <option value="">Todos destinos</option>
            {destinos.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[13px] shadow-sm"
            title="Data inicial"
          />
          <span className="text-[11px] text-slate-400">até</span>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[13px] shadow-sm"
            title="Data final"
          />
          <span className="ml-auto text-[12px] text-slate-400">
            {filtered.length} registro{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Cód. SAP</th>
                <th className="px-3 py-2">Descrição</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Qtd</th>
                <th className="px-3 py-2">Destino</th>
                <th className="px-3 py-2">Solicitante/Resp.</th>
                <th className="px-3 py-2">Origem</th>
                <th className="px-3 py-2">Observação</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-slate-400">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              )}
              {paginated.map((m) => {
                const mat = mats.find((mat) => mat.cod_sap === m.cod_sap);
                return (
                  <tr key={m.id} className="border-b border-slate-100 transition hover:bg-slate-50">
                    <td className="whitespace-nowrap px-3 py-2 text-slate-500">
                      {m.data ? (
                        new Date(m.data).toLocaleDateString("pt-BR")
                      ) : (
                        <span className="italic text-slate-400">Não informada</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-[#0b3a73]">
                      {m.cod_sap}
                    </td>
                    <td className="max-w-56 truncate px-3 py-2 text-slate-700">
                      {mat?.descricao || m.cod_sap}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          m.tipo === "ENTRADA"
                            ? "bg-emerald-100 text-emerald-700"
                            : m.tipo === "SAIDA"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {m.tipo === "ENTRADA" ? "Entrada" : m.tipo === "SAIDA" ? "Saída" : "Ajuste"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-semibold">
                      <span
                        className={
                          m.tipo === "ENTRADA"
                            ? "text-emerald-600"
                            : m.tipo === "SAIDA"
                              ? "text-red-600"
                              : "text-amber-600"
                        }
                      >
                        {m.tipo === "AJUSTE"
                          ? m.quantidade
                          : m.tipo === "ENTRADA"
                            ? `+${m.quantidade}`
                            : `-${m.quantidade}`}
                      </span>
                    </td>
                    <td className="max-w-28 truncate px-3 py-2 text-slate-600">
                      {m.destino || "—"}
                    </td>
                    <td className="max-w-28 truncate px-3 py-2 text-slate-600">
                      {m.solicitante || m.responsavel || "—"}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          m.origem === "SISTEMA"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {m.origem === "SISTEMA" ? "Sistema" : "Histórico"}
                      </span>
                    </td>
                    <td className="max-w-40 truncate px-3 py-2 text-slate-400">
                      {m.observacao || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="mt-3 flex items-center justify-between text-[13px] text-slate-500">
            <span>
              Página {page + 1} de {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="rounded-md border border-slate-300 bg-white px-3 py-1 text-[13px] font-semibold transition hover:bg-slate-100 disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="rounded-md border border-slate-300 bg-white px-3 py-1 text-[13px] font-semibold transition hover:bg-slate-100 disabled:opacity-40"
              >
                Próximo
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const HistoricoMaterial = ({ material }: { material: Material }) => {
    const movs = movimentacoes
      .filter((m) => m.cod_sap === material.cod_sap)
      .sort((a, b) => {
        const ta = a.data ? new Date(a.data).getTime() : 0;
        const tb = b.data ? new Date(b.data).getTime() : 0;
        return tb - ta;
      });

    const tipoIcon = (tipo: TipoMovimentacao) => {
      if (tipo === "ENTRADA") return { bg: "bg-emerald-500", symbol: "+", label: "Entrada" };
      if (tipo === "SAIDA") return { bg: "bg-red-500", symbol: "−", label: "Saída" };
      return { bg: "bg-orange-500", symbol: "~", label: "Ajuste" };
    };

    return (
      <div className="text-sm">
        {/* Topo */}
        <div className="mb-6 flex items-center justify-between rounded-xl bg-slate-50 p-4">
          <div>
            <span className="font-mono text-lg font-bold text-[#0b3a73]">{material.cod_sap}</span>
            <p className="mt-0.5 text-slate-700">{material.descricao}</p>
          </div>
          <div className="text-right">
            <div
              className="text-2xl font-bold"
              style={{
                color: material.saldo_atual <= material.estoque_minimo ? "#ef4444" : "#10b981",
              }}
            >
              {material.saldo_atual}
            </div>
            <div className="text-[11px] text-slate-400">{material.unidade_medida}</div>
          </div>
        </div>

        {/* Dados Cadastrais */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#0b3a73]">
            Dados Cadastrais
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-medium text-slate-400">Categoria</p>
              <p className="font-medium text-slate-800">{getCategoriaNome(material)}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-400">Estoque mínimo</p>
              <p className="font-medium text-slate-800">
                {material.estoque_minimo} {material.unidade_medida}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-400">Fabricante</p>
              <p className="text-slate-700">{material.fabricante || "—"}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-400">Local de armazenagem</p>
              <p className="text-slate-700">{material.local_armazenagem || "—"}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-400">Elevatória vinculada</p>
              <p className="text-slate-700">{material.vinculo_elevatoria || "—"}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-400">Status crítico</p>
              <p className="flex items-center gap-1 font-medium text-slate-800">
                {material.material_critico ? (
                  <>
                    <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" /> Crítico
                  </>
                ) : (
                  <span className="text-slate-500">Não</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Histórico de Movimentações */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#0b3a73]">
            Histórico de Movimentações
          </h3>
          <div className="max-h-80 space-y-3 overflow-auto">
            {movs.length === 0 && (
              <p className="py-6 text-center text-slate-400">Nenhuma movimentação registrada.</p>
            )}
            {movs.map((m) => {
              const icon = tipoIcon(m.tipo);
              return (
                <div
                  key={m.id}
                  className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3"
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${icon.bg}`}
                  >
                    {icon.symbol}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span
                        className={`text-base font-bold ${
                          m.tipo === "ENTRADA"
                            ? "text-emerald-600"
                            : m.tipo === "SAIDA"
                              ? "text-red-600"
                              : "text-orange-600"
                        }`}
                      >
                        {m.tipo === "AJUSTE"
                          ? m.quantidade
                          : m.tipo === "ENTRADA"
                            ? `+${m.quantidade}`
                            : `−${m.quantidade}`}{" "}
                        <span className="text-[11px] font-normal text-slate-400">
                          {material.unidade_medida}
                        </span>
                      </span>
                      <span className="text-[12px] text-slate-500">
                        {m.data ? (
                          new Date(m.data).toLocaleDateString("pt-BR")
                        ) : (
                          <em className="text-slate-400">sem data</em>
                        )}
                      </span>
                    </div>
                    {(m.responsavel || m.solicitante) && (
                      <p className="mt-1 text-[13px] text-slate-700">
                        <span className="text-[11px] font-medium text-slate-400">
                          Responsável:{" "}
                        </span>
                        {m.responsavel || m.solicitante}
                      </p>
                    )}
                    {m.destino && (
                      <p className="mt-0.5 text-[13px] text-slate-600">
                        <span className="text-[11px] font-medium text-slate-400">Origem: </span>
                        {m.destino}
                      </p>
                    )}
                    {m.observacao && (
                      <p className="mt-1 text-[12px] italic text-slate-500">{m.observacao}</p>
                    )}
                    <span
                      className={`mt-1.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                        m.origem === "SISTEMA"
                          ? "bg-blue-100 text-blue-600"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {m.origem === "SISTEMA" ? "Sistema" : "Histórico"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-3 md:p-6">
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
              <p className="truncate text-sm text-cyan-50/90">Eletromecânica · Almoxarifado</p>
            </div>
          </div>
          <Link
            to="/"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[#0b3a73] shadow-md ring-1 ring-black/10 backdrop-blur transition hover:scale-105 hover:bg-white"
          >
            <Home className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {/* Toggle e ações */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          <button
            onClick={() => setAba("estoque")}
            className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-[13px] font-semibold transition ${
              aba === "estoque"
                ? "bg-[#0b3a73] text-white shadow"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Package className="h-4 w-4" /> Estoque
          </button>
          <button
            onClick={() => setAba("compras")}
            className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-[13px] font-semibold transition ${
              aba === "compras"
                ? "bg-[#0b3a73] text-white shadow"
                : "text-slate-600 hover:bg-slate-100"
            } ${!permissoes.solicitarCompra ? "hidden" : ""}`}
          >
            <ShoppingCart className="h-4 w-4" /> Compras
          </button>
          <button
            onClick={() => setAba("registros")}
            className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-[13px] font-semibold transition ${
              aba === "registros"
                ? "bg-[#0b3a73] text-white shadow"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <List className="h-4 w-4" /> Registros
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {aba === "estoque" && (
            <>
              {permissoes.registrarEntrada && (
                <button
                  onClick={() => setDialogMov("entrada")}
                  className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-2 text-[13px] font-semibold text-white hover:bg-emerald-700 shadow"
                >
                  <Plus className="h-4 w-4" /> Entrada
                </button>
              )}
              {permissoes.registrarSaida && (
                <button
                  onClick={() => setDialogMov("saida")}
                  className="inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-2 text-[13px] font-semibold text-white hover:bg-red-700 shadow"
                >
                  <Minus className="h-4 w-4" /> Saída
                </button>
              )}
              {permissoes.registrarAjuste && (
                <button
                  onClick={() => setDialogMov("ajuste")}
                  className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-3 py-2 text-[13px] font-semibold text-white hover:bg-amber-700 shadow"
                >
                  <Edit3 className="h-4 w-4" /> Ajuste
                </button>
              )}
              {permissoes.exportar && (
                <button
                  onClick={exportarCSV}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
                >
                  <Download className="h-4 w-4" /> Exportar
                </button>
              )}
              {permissoes.importar && (
                <button
                  onClick={() => setDialogImportar(true)}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
                >
                  <Upload className="h-4 w-4" /> Importar
                </button>
              )}
              {permissoes.cadastrarMaterial && (
                <button
                  onClick={() => setDialogMaterial(true)}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
                >
                  <Plus className="h-4 w-4" /> Novo Material
                </button>
              )}
              {permissoes.gerenciarCategorias && (
                <button
                  onClick={() => setDialogCategorias(true)}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
                >
                  <Settings className="h-4 w-4" /> Gerenciar Categorias
                </button>
              )}
            </>
          )}
          {aba === "compras" && permissoes.solicitarCompra && (
            <button
              onClick={() => setDialogCompra(true)}
              className="inline-flex items-center gap-1 rounded-md bg-[#0b3a73] px-3 py-2 text-[13px] font-semibold text-white hover:bg-[#1f7ad6] shadow"
            >
              <Plus className="h-4 w-4" /> Novo Pedido
            </button>
          )}
          {aba === "compras" && (
            <button
              onClick={() => setDialogImportarCompras(true)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
            >
              <Upload className="h-4 w-4" /> Atualizar Pedidos
            </button>
          )}
          <button
            onClick={carregarDados}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading || !acessoVerificado ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Carregando...
        </div>
      ) : aba === "estoque" ? (
        <>
          {/* KPIs */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-6">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
              <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-red-700">
                <AlertTriangle className="h-3 w-3" /> Crítico (Sem Estoque)
              </div>
              <div className="mt-1 text-3xl font-bold text-red-700">{kpis.semEstoque.length}</div>
              <div className="text-[11px] text-red-500">ruptura total, saldo = 0</div>
            </div>
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 shadow-sm">
              <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-orange-600">
                <AlertTriangle className="h-3 w-3" /> Baixo Estoque
              </div>
              <div className="mt-1 text-3xl font-bold text-orange-600">{kpis.baixo.length}</div>
              <div className="text-[11px] text-orange-500">abaixo do mínimo, mas &gt; 0</div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-amber-600">
                <AlertCircle className="h-3 w-3" /> Atenção
              </div>
              <div className="mt-1 text-3xl font-bold text-amber-600">{kpis.atencao.length}</div>
              <div className="text-[11px] text-amber-500">próximos do mínimo</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Box className="mr-1 inline h-3 w-3" /> Total Itens
              </div>
              <div className="mt-1 text-3xl font-bold text-[#0b3a73]">{kpis.total}</div>
              <div className="text-[11px] text-slate-400">materiais cadastrados</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                <BarChart3 className="mr-1 inline h-3 w-3" /> Parados
              </div>
              <div className="mt-1 text-3xl font-bold text-slate-600">{kpis.parados.length}</div>
              <div className="text-[11px] text-slate-400">sem mov. há 3+ meses</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Star className="mr-1 inline h-3 w-3" /> Críticos marcados
              </div>
              <div className="mt-1 text-3xl font-bold text-amber-500">
                {materiais.filter((m) => m.material_critico).length}
              </div>
              <div className="text-[11px] text-slate-400">com flag manual</div>
            </div>
          </div>

          {/* Gráficos */}
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-[#0b3a73]">
                  Top 5 Mais Consumidos (mês)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topConsumidos}
                      layout="vertical"
                      margin={{ left: 20, right: 20 }}
                      barCategoryGap={8}
                    >
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="descricao"
                        tick={{ fontSize: 10, width: 150 }}
                        width={150}
                      />
                      <Tooltip
                        formatter={(value: number) => `${value} un`}
                        labelFormatter={(
                          _l: string,
                          payload: { payload?: { descricaoCompleta?: string } }[],
                        ) => payload?.[0]?.payload?.descricaoCompleta || _l}
                      />
                      <Bar dataKey="qtd" fill="#0b3a73" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-[#0b3a73]">
                  Ranking de Destinos (mês)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <select
                    value={metricaDestino}
                    onChange={(e) =>
                      setMetricaDestino(e.target.value as "movimentacoes" | "quantidade")
                    }
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[12px] shadow-sm"
                  >
                    <option value="movimentacoes">Movimentações</option>
                    <option value="quantidade">Quantidade</option>
                  </select>
                  <select
                    value={filtroCategoriaDestino}
                    onChange={(e) => setFiltroCategoriaDestino(e.target.value)}
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[12px] shadow-sm"
                  >
                    <option value="TODAS">Todas categorias</option>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-slate-400">
                    {metricaDestino === "movimentacoes"
                      ? "contagem de saídas"
                      : "soma de quantidades"}
                  </span>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topDestinos}
                      layout="vertical"
                      margin={{ left: 20, right: 20 }}
                      barCategoryGap={8}
                    >
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="destino"
                        tick={{ fontSize: 10 }}
                        width={160}
                      />
                      <Tooltip
                        formatter={(value: number) =>
                          metricaDestino === "movimentacoes"
                            ? `${value} movimentações`
                            : `${value} unidades`
                        }
                        labelFormatter={(
                          _l: string,
                          payload: { payload?: { destinoCompleto?: string } }[],
                        ) => payload?.[0]?.payload?.destinoCompleto || _l}
                      />
                      <Bar
                        dataKey="qtd"
                        fill={metricaDestino === "movimentacoes" ? "#1f7ad6" : "#f59e0b"}
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ajustes do Mês */}
          <div className="mb-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-[#0b3a73]">
                  <Edit3 className="mr-1 inline h-4 w-4" /> Ajustes do Mês
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 text-3xl font-bold text-amber-600">{ajustesMes.length}</div>
                {ajustesPorMotivo.length === 0 ? (
                  <p className="text-sm text-slate-400">Nenhum ajuste no período.</p>
                ) : (
                  <div className="space-y-2">
                    {ajustesPorMotivo.map((item) => (
                      <div key={item.motivo} className="flex items-center justify-between text-sm">
                        <span className="truncate text-slate-600" title={item.motivoCompleto}>
                          {item.motivo}
                        </span>
                        <span className="font-semibold text-slate-800">{item.qtd}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por código ou descrição..."
                  className="min-h-11 w-full rounded-md border border-slate-300 pl-8 pr-8 text-[14px] shadow-sm"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className="min-h-11 rounded-md border border-slate-300 bg-white px-2 text-[14px] shadow-sm"
              >
                <option value="TODAS">Todas categorias</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value as StatusEstoque | "TODAS")}
                className="min-h-11 rounded-md border border-slate-300 bg-white px-2 text-[14px] shadow-sm"
              >
                <option value="TODAS">Todos status</option>
                <option value="sem_estoque">Sem Estoque</option>
                <option value="baixo">Baixo Estoque</option>
                <option value="atencao">Atenção</option>
                <option value="normal">Normal</option>
              </select>
              {elevatoriaOptions.length > 0 && (
                <select
                  value={filtroElevatoria}
                  onChange={(e) => setFiltroElevatoria(e.target.value)}
                  className="min-h-11 rounded-md border border-slate-300 bg-white px-2 text-[14px] shadow-sm"
                >
                  <option value="">Todas elevatórias</option>
                  {elevatoriaOptions.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              )}
              <label className="inline-flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filtroCritico}
                  onChange={(e) => setFiltroCritico(e.target.checked)}
                />
                <Star className="h-3.5 w-3.5 text-amber-500" /> Só críticos
              </label>
            </div>
          </div>

          {/* Tabela */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="max-h-[600px] overflow-auto">
              <table className="min-w-[900px] w-full text-left text-[13px]">
                <thead className="sticky top-0 bg-[#eaf3fb] text-[12px] text-[#0b3a73] z-10">
                  <tr>
                    {[
                      ["cod_sap", "Código SAP"],
                      ["descricao", "Descrição"],
                      ["categoria", "Categoria"],
                      ["saldo_atual", "Saldo"],
                      ["estoque_minimo", "Mínimo"],
                      ["fabricante", "Fabricante"],
                      ["local_armazenagem", "Local"],
                      ["vinculo_elevatoria", "Elevatória"],
                    ].map(([k, label]) => (
                      <th
                        key={k}
                        className="cursor-pointer whitespace-nowrap px-2 py-2 font-semibold hover:underline"
                        onClick={() => toggleSort(k)}
                      >
                        {label} {sortKey === k ? (sortDir === "asc" ? "▲" : "▼") : ""}
                      </th>
                    ))}
                    <th className="px-2 py-2 font-semibold">Status</th>
                    <th className="px-2 py-2 font-semibold">Crítico</th>
                    <th className="px-2 py-2 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {materiaisFiltrados.map((m) => (
                    <tr key={m.cod_sap} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="whitespace-nowrap px-2 py-1.5 font-mono text-[12px] text-[#1f7ad6] font-bold">
                        {m.cod_sap}
                      </td>
                      <td className="px-2 py-1.5">
                        <button
                          onClick={() => {
                            setMaterialSelecionado(m);
                            setDialogHistorico(true);
                          }}
                          className="hover:underline text-left"
                        >
                          {m.descricao}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5">
                        <Badge variant="outline" className="text-[10px]">
                          {getCategoriaNome(m)}
                        </Badge>
                      </td>
                      <td
                        className={`whitespace-nowrap px-2 py-1.5 font-bold text-base ${m.saldo_atual === 0 ? "text-red-700" : m.saldo_atual <= m.estoque_minimo ? "text-orange-600" : m.saldo_atual <= m.estoque_minimo * 1.2 ? "text-amber-600" : "text-emerald-600"}`}
                      >
                        {m.saldo_atual}{" "}
                        <span className="text-[10px] font-normal text-slate-400">
                          {m.unidade_medida}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5">
                        {permissoes.editarConfigMaterial && editandoMinimo === m.cod_sap ? (
                          <input
                            type="number"
                            value={editandoValor}
                            onChange={(e) => setEditandoValor(e.target.value)}
                            onBlur={() => {
                              const v = parseFloat(editandoValor);
                              if (!isNaN(v) && v >= 0) {
                                salvarMinimo(m.cod_sap, v);
                              }
                              setEditandoMinimo(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                              if (e.key === "Escape") setEditandoMinimo(null);
                            }}
                            className="w-16 rounded border border-slate-300 px-1.5 py-0.5 text-[13px] text-slate-700"
                            autoFocus
                          />
                        ) : permissoes.editarConfigMaterial ? (
                          <button
                            onClick={() => iniciarEdicaoMinimo(m.cod_sap, m.estoque_minimo)}
                            className="cursor-pointer rounded px-1 py-0.5 text-slate-600 hover:bg-slate-100 hover:text-[#0b3a73]"
                            title="Clique para editar"
                          >
                            {m.estoque_minimo}
                          </button>
                        ) : (
                          <span className="text-slate-600">{m.estoque_minimo}</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-slate-600">{m.fabricante}</td>
                      <td className="px-2 py-1.5 text-slate-600">{m.local_armazenagem}</td>
                      <td className="px-2 py-1.5 text-slate-600">{m.vinculo_elevatoria}</td>
                      <td className="whitespace-nowrap px-2 py-1.5">
                        <Semaforo saldo={m.saldo_atual} minimo={m.estoque_minimo} />
                      </td>
                      <td className="px-2 py-1.5">
                        {permissoes.editarConfigMaterial ? (
                          <button
                            onClick={() => toggleCritico(m)}
                            className="cursor-pointer"
                            title={m.material_critico ? "Remover crítico" : "Marcar como crítico"}
                          >
                            {m.material_critico ? (
                              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                            ) : (
                              <Star className="h-4 w-4 text-slate-300 hover:text-amber-400" />
                            )}
                          </button>
                        ) : m.material_critico ? (
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                        ) : (
                          <Star className="h-4 w-4 text-slate-300" />
                        )}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5">
                        <div className="flex items-center gap-1">
                          {permissoes.registrarEntrada && (
                            <button
                              onClick={() => {
                                setMaterialSelecionado(m);
                                setDialogMov("entrada");
                              }}
                              className="rounded bg-emerald-100 px-1.5 py-1 text-[10px] font-bold text-emerald-700 hover:bg-emerald-200 cursor-pointer"
                              title="Entrada"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          )}
                          {permissoes.registrarSaida && (
                            <button
                              onClick={() => {
                                setMaterialSelecionado(m);
                                setDialogMov("saida");
                              }}
                              className="rounded bg-red-100 px-1.5 py-1 text-[10px] font-bold text-red-700 hover:bg-red-200 cursor-pointer"
                              title="Saída"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setMaterialSelecionado(m);
                              setDialogHistorico(true);
                            }}
                            className="rounded bg-blue-100 px-1.5 py-1 text-[10px] font-bold text-blue-700 hover:bg-blue-200 cursor-pointer"
                            title="Histórico"
                          >
                            <Eye className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {materiaisFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400">
                        Nenhum material encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : aba === "compras" ? (
        /* ---------- ABA COMPRAS ---------- */
        <>
          {/* KPIs Compras */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <button
              onClick={() => setDialogRcEmFila(true)}
              className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm text-left hover:bg-blue-100 transition-all"
            >
              <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-blue-600">
                <ShoppingCart className="h-3 w-3" /> RC em Fila
              </div>
              <div className="mt-1 text-3xl font-bold text-blue-600">
                {compras.filter((c) => c.rc_em_fila).length}
              </div>
              <div className="text-[11px] text-blue-500">solicitações pendentes</div>
            </button>
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
              <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-red-600">
                <AlertTriangle className="h-3 w-3" /> Críticos sem pedido
              </div>
              <div className="mt-1 text-3xl font-bold text-red-600">
                {itensCriticosSemPedido.length}
              </div>
              <div className="text-[11px] text-red-500">itens críticos sem compra</div>
            </div>
            <button
              onClick={() => setFiltroAguardandoRetirada((v) => !v)}
              className={`rounded-xl border p-4 shadow-sm text-left transition-all ${filtroAguardandoRetirada ? "border-amber-400 bg-amber-100 ring-2 ring-amber-300" : "border-amber-200 bg-amber-50 hover:bg-amber-100"}`}
            >
              <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-amber-600">
                <Package className="h-3 w-3" /> Aguardando retirada
              </div>
              <div className="mt-1 text-3xl font-bold text-amber-600">
                {compras.filter((c) => c.chegou && !c.foi_retirado).length}
              </div>
              <div className="text-[11px] text-amber-500">chegou, não retirado</div>
            </button>
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 shadow-sm">
              <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-orange-600">
                <Clock className="h-3 w-3" /> Atrasados
              </div>
              <div className="mt-1 text-3xl font-bold text-orange-600">
                {comprasComAtraso.length}
              </div>
              <div className="text-[11px] text-orange-500">remessa vencida</div>
            </div>
          </div>

          {/* Filtros */}
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <select
              value={filtroStatusCompra}
              onChange={(e) => setFiltroStatusCompra(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-[12px]"
            >
              <option value="TODOS">Todos os status</option>
              {Object.keys(comprasPorStatus)
                .sort()
                .map((s) => (
                  <option key={s} value={s}>
                    {s} ({comprasPorStatus[s].length})
                  </option>
                ))}
            </select>
            <select
              value={filtroCompradorCompra}
              onChange={(e) => setFiltroCompradorCompra(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-[12px]"
            >
              <option value="TODOS">Todos os compradores</option>
              {compradoresCompra.map((c) => (
                <option key={c} value={c!}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={filtroChegou}
              onChange={(e) => setFiltroChegou(e.target.value as typeof filtroChegou)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-[12px]"
            >
              <option value="TODOS">Chegou: Todos</option>
              <option value="sim">Chegou: Sim</option>
              <option value="nao">Chegou: Não</option>
            </select>
            <select
              value={filtroRetirado}
              onChange={(e) => setFiltroRetirado(e.target.value as typeof filtroRetirado)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-[12px]"
            >
              <option value="TODOS">Retirado: Todos</option>
              <option value="sim">Retirado: Sim</option>
              <option value="nao">Retirado: Não</option>
            </select>
            <select
              value={filtroFila}
              onChange={(e) => setFiltroFila(e.target.value as typeof filtroFila)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-[12px]"
            >
              <option value="TODOS">Fila: Todos</option>
              <option value="sim">Em fila: Sim</option>
              <option value="nao">Em fila: Não</option>
            </select>
            <span className="self-center text-[11px] text-slate-400">
              {comprasFiltradas.length} de {compras.length} registros
            </span>
          </div>

          {/* Tabela de Compras */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2">Requisição</th>
                  <th className="px-2 py-2">Pedido</th>
                  <th className="px-2 py-2">Item</th>
                  <th className="px-2 py-2">Cód. SAP</th>
                  <th className="px-2 py-2">Descrição</th>
                  <th className="px-2 py-2 text-right">Qtde</th>
                  <th className="px-2 py-2">Status Geral</th>
                  <th className="px-2 py-2">Fornecedor</th>
                  <th className="px-2 py-2 text-center">Chegou?</th>
                  <th className="px-2 py-2 text-center">Retirado?</th>
                  <th className="px-2 py-2 text-center">Data Prevista</th>
                  <th className="px-2 py-2 text-right">Dias aberto</th>
                </tr>
              </thead>
              <tbody>
                {comprasFiltradas.map((c) => {
                  const diasAberto =
                    !c.foi_retirado && c.dt_criacao_rc
                      ? Math.floor((Date.now() - new Date(c.dt_criacao_rc).getTime()) / 86400000)
                      : null;
                  const editando = editandoCompraId === c.id;
                  return (
                    <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-2 py-1.5 font-mono text-[#1f7ad6]">
                        {c.requisicao || "—"}
                      </td>
                      <td className="px-2 py-1.5">
                        {editando && editandoCampo === "pedido" ? (
                          <input
                            type="text"
                            value={editandoValorCompra}
                            onChange={(e) => setEditandoValorCompra(e.target.value)}
                            onBlur={() => handleUpdateCompra(c.id, { pedido: editandoValorCompra || null })}
                            onKeyDown={(e) => e.key === "Enter" && handleUpdateCompra(c.id, { pedido: editandoValorCompra || null })}
                            className="w-full min-w-[100px] rounded border border-blue-300 px-1 py-0.5 text-[12px]"
                            autoFocus
                          />
                        ) : (
                          <span
                            className="cursor-pointer text-blue-600 hover:underline"
                            onClick={() => { setEditandoCompraId(c.id); setEditandoCampo("pedido"); setEditandoValorCompra(c.pedido || ""); }}
                          >
                            {c.pedido || "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">{c.item_rc || "—"}</td>
                      <td className="px-2 py-1.5 font-mono font-bold">{c.cod_sap || "—"}</td>
                      <td className="max-w-[200px] truncate px-2 py-1.5 text-slate-600">
                        {c.descricao_material || "—"}
                      </td>
                      <td className="px-2 py-1.5 text-right font-bold">{c.qtde_rc ?? "—"}</td>
                      <td className="px-2 py-1.5">
                        <select
                          value={c.status_geral || ""}
                          onChange={(e) => handleCompraStatus(c.id, e.target.value as StatusCompra)}
                          className={`max-w-[140px] rounded border px-1 py-0.5 text-[10px] font-semibold ${(c.status_geral && STATUS_COMPRA_CORES[c.status_geral]) || "bg-slate-100 text-slate-600"} cursor-pointer`}
                        >
                          <option value="">Sem status</option>
                          {Object.keys(STATUS_COMPRA_CORES).sort().map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="max-w-[150px] truncate px-2 py-1.5 text-slate-500">
                        {c.fornecedor || "—"}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {permissoes.gerenciarCompras ? (
                          <input
                            type="checkbox"
                            checked={c.chegou}
                            onChange={() => handleToggleChegou(c.id, c.chegou)}
                            className="cursor-pointer"
                          />
                        ) : (
                          <span>{c.chegou ? "✓" : "—"}</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {permissoes.gerenciarCompras ? (
                          <input
                            type="checkbox"
                            checked={c.foi_retirado}
                            onChange={() =>
                              handleToggleFoiRetirado(c.id, c.foi_retirado, c.afeta_saldo)
                            }
                            className="cursor-pointer"
                          />
                        ) : (
                          <span>{c.foi_retirado ? "✓" : "—"}</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {editando && editandoCampo === "data_confirmada" ? (
                          <input
                            type="date"
                            value={editandoValorCompra}
                            onChange={(e) => setEditandoValorCompra(e.target.value)}
                            onBlur={() => handleUpdateCompra(c.id, { data_confirmada: editandoValorCompra || null })}
                            onKeyDown={(e) => e.key === "Enter" && handleUpdateCompra(c.id, { data_confirmada: editandoValorCompra || null })}
                            className="w-full rounded border border-blue-300 px-1 py-0.5 text-[12px]"
                            autoFocus
                          />
                        ) : (
                          <span
                            className="cursor-pointer text-slate-600 hover:underline"
                            onClick={() => { setEditandoCompraId(c.id); setEditandoCampo("data_confirmada"); setEditandoValorCompra(c.data_confirmada || ""); }}
                          >
                            {c.data_confirmada || "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {diasAberto !== null ? (
                          <span
                            className={
                              diasAberto > 30
                                ? "font-bold text-red-600"
                                : diasAberto > 15
                                  ? "text-orange-500"
                                  : "text-slate-500"
                            }
                          >
                            {diasAberto}d
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {comprasFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-slate-400">
                      Nenhuma compra encontrada com os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        /* ---------- ABA REGISTROS ---------- */
        <AbaRegistros movimentacoes={movimentacoes} materiais={materiais} categorias={categorias} />
      )}

      {/* Dialogs */}
      <Dialog open={dialogMov === "entrada"} onOpenChange={(o) => !o && setDialogMov(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-emerald-700">
              <Plus className="mr-1 inline h-4 w-4" /> Registrar Entrada
            </DialogTitle>
          </DialogHeader>
          <FormEntrada />
        </DialogContent>
      </Dialog>

      <Dialog open={dialogMov === "saida"} onOpenChange={(o) => !o && setDialogMov(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-700">
              <Minus className="mr-1 inline h-4 w-4" /> Registrar Saída
            </DialogTitle>
          </DialogHeader>
          <FormSaida />
        </DialogContent>
      </Dialog>

      <Dialog open={dialogMov === "ajuste"} onOpenChange={(o) => !o && setDialogMov(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-700">
              <Edit3 className="mr-1 inline h-4 w-4" /> Ajuste de Estoque
            </DialogTitle>
          </DialogHeader>
          <FormAjuste />
        </DialogContent>
      </Dialog>

      <Dialog open={dialogHistorico} onOpenChange={setDialogHistorico}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#0b3a73]">
              <Eye className="mr-1 inline h-4 w-4" /> Histórico do Material
            </DialogTitle>
          </DialogHeader>
          {materialSelecionado && <HistoricoMaterial material={materialSelecionado} />}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogCompra} onOpenChange={setDialogCompra}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0b3a73]">
              <ShoppingCart className="mr-1 inline h-4 w-4" /> Nova Solicitação de Compra
            </DialogTitle>
          </DialogHeader>
          <FormNovaCompra />
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogDataRetirada !== null}
        onOpenChange={(o) => {
          if (!o) setDialogDataRetirada(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#0b3a73]">
              <CheckCircle2 className="mr-1 inline h-4 w-4" /> Confirmar Retirada
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2 text-sm">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-600">Data da retirada</span>
              <input
                type="date"
                value={dataRetiradaInput}
                onChange={(e) => setDataRetiradaInput(e.target.value)}
                className="min-h-11 rounded-md border border-slate-300 px-2 text-[14px] shadow-sm"
              />
            </label>
            {(() => {
              const reg = compras.find((c) => c.id === dialogDataRetirada);
              if (reg?.afeta_saldo) {
                return (
                  <p className="rounded-md bg-emerald-50 p-2 text-[12px] text-emerald-700">
                    Esta compra afeta o estoque. Uma entrada automática será registrada ao
                    confirmar.
                  </p>
                );
              }
              return (
                <p className="rounded-md bg-slate-50 p-2 text-[12px] text-slate-500">
                  Esta é uma compra importada (histórico). Nenhuma entrada no estoque será gerada.
                </p>
              );
            })()}
            <button
              onClick={confirmarRetirada}
              className="rounded-md bg-[#0b3a73] px-3 py-2 text-[13px] font-semibold text-white hover:bg-[#1f7ad6]"
            >
              Confirmar Retirada
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogImportar} onOpenChange={setDialogImportar}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0b3a73]">
              <Upload className="mr-1 inline h-4 w-4" /> Importar Materiais (CSV)
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-slate-600">
            <p className="mb-2">
              Formato esperado:{" "}
              <code className="rounded bg-slate-100 px-1 text-xs">
                cod_sap, descricao, unidade_medida, categoria, fabricante, local_armazenagem,
                estoque_minimo, material_critico, vinculo_elevatoria, saldo_atual
              </code>
            </p>
            <p className="mb-4 text-xs text-slate-400">
              O campo <code>categoria</code> aceita o nome da categoria (ex: Elétrico) ou ID.
              Materiais com mesmo <code>cod_sap</code> serão atualizados.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleImportarCSV}
              className="block w-full text-sm file:mr-2 file:rounded file:border-0 file:bg-[#0b3a73] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-[#1f7ad6]"
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogCategorias} onOpenChange={setDialogCategorias}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0b3a73]">
              <Tag className="mr-1 inline h-4 w-4" /> Gerenciar Categorias
            </DialogTitle>
          </DialogHeader>
          <GerenciarCategorias />
        </DialogContent>
      </Dialog>

      <Dialog open={dialogMaterial} onOpenChange={setDialogMaterial}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#0b3a73]">
              <Package className="mr-1 inline h-4 w-4" /> Cadastrar Material
            </DialogTitle>
          </DialogHeader>
          <FormNovoMaterial />
        </DialogContent>
      </Dialog>

      {/* Dialog RC em Fila */}
      <Dialog open={dialogRcEmFila} onOpenChange={setDialogRcEmFila}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-blue-700">
              <ShoppingCart className="mr-1 inline h-4 w-4" /> RCs em Fila
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 text-sm">
            {compras.filter((c) => c.rc_em_fila).length === 0 ? (
              <p className="text-slate-400">Nenhuma RC em fila no momento.</p>
            ) : (
              compras
                .filter((c) => c.rc_em_fila)
                .sort((a, b) => (b.dt_criacao_rc || "") > (a.dt_criacao_rc || "") ? 1 : -1)
                .map((c) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                    <span className="font-mono text-sm font-bold text-blue-600">
                      {c.requisicao || "—"}
                    </span>
                    <span className="text-xs text-slate-400">Item {c.item_rc}</span>
                    <span className="flex-1 truncate text-slate-600">
                      {c.descricao_material || "—"}
                    </span>
                    <span className="font-bold">{c.qtde_rc ?? "—"}</span>
                    <span className="text-xs text-slate-400">
                      {c.dt_criacao_rc || "—"}
                    </span>
                  </div>
                ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Importar Compras */}
      <Dialog open={dialogImportarCompras} onOpenChange={setDialogImportarCompras}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0b3a73]">
              <Upload className="mr-1 inline h-4 w-4" /> Atualizar Pedidos (CSV)
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-slate-600">
            <p className="mb-2">
              Importe um arquivo CSV com os dados atualizados dos pedidos.
              O formato esperado é similar ao "Export" da planilha COMPRAS.
            </p>
            <p className="mb-4 text-xs text-slate-400">
              Colunas principais: <code>requisicao</code>, <code>item_rc</code>,{' '}
              <code>pedido</code>, <code>status_geral</code>, <code>dt_remessa_pedido</code>,{' '}
              <code>data_confirmada</code>, <code>fornecedor</code>, etc.
              Registros com mesma <code>requisicao</code> + <code>item_rc</code> serão atualizados.
            </p>
            <input
              ref={fileInputRefCompras}
              type="file"
              accept=".csv"
              onChange={handleImportarComprasCSV}
              className="block w-full text-sm file:mr-2 file:rounded file:border-0 file:bg-[#0b3a73] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-[#1f7ad6]"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
