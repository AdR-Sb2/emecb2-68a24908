import { createFileRoute, Link } from "@tanstack/react-router";
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
  CategoriaMaterial,
  StatusCompra,
  TipoMovimentacao,
  OrigemMovimentacao,
  CATEGORIAS,
  CATEGORIA_LABEL,
  STATUS_COMPRA_CORES,
  getStatusEstoque,
  getStatusCor,
  StatusEstoque,
} from "@/lib/estoque-types";
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
} from "recharts";

export const Route = createFileRoute("/estoque")({
  head: () => ({
    meta: [{ title: "Eletromecânica · Estoque e Compras" }],
  }),
  component: EstoquePage,
});

const ROUTE_COLORS = ["#0b3a73", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"];

function EstoquePage() {
  const { user, profile } = useAuth();
  const [aba, setAba] = useState<"estoque" | "compras" | "registros">("estoque");
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("TODAS");
  const [filtroStatus, setFiltroStatus] = useState<StatusEstoque | "TODAS">("TODAS");
  const [filtroCritico, setFiltroCritico] = useState(false);
  const [filtroElevatoria, setFiltroElevatoria] = useState("");
  const [sortKey, setSortKey] = useState<string>("cod_sap");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [materialSelecionado, setMaterialSelecionado] = useState<Material | null>(null);
  const [dialogMov, setDialogMov] = useState<"entrada" | "saida" | "ajuste" | null>(null);
  const [dialogHistorico, setDialogHistorico] = useState(false);
  const [dialogCompra, setDialogCompra] = useState(false);
  const [dialogImportar, setDialogImportar] = useState(false);
  const [editandoMinimo, setEditandoMinimo] = useState<string | null>(null);
  const [editandoValor, setEditandoValor] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const podeEditar =
    profile?.cargo_nome === "Supervisor" || profile?.cargo_nome === "Administrador";
  const podeAprovar = podeEditar;

  // --- Carregar dados ---
  const carregarDados = async () => {
    setLoading(true);
    try {
      const [matRes, movRes, compRes] = await Promise.all([
        supabase.from("materiais").select("*").order("cod_sap"),
        supabase.from("movimentacoes").select("*").order("data", { ascending: false }).limit(5000),
        supabase.from("compras").select("*").order("data_solicitacao", { ascending: false }),
      ]);
      if (matRes.data) setMateriais(matRes.data as Material[]);
      if (movRes.data) setMovimentacoes(movRes.data as Movimentacao[]);
      if (compRes.data) setCompras(compRes.data as Compra[]);
    } catch (err) {
      console.error("Erro ao carregar estoque", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    carregarDados();
  }, []);

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
    if (filtroCategoria !== "TODAS") list = list.filter((m) => m.categoria === filtroCategoria);
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

  const truncar = (s: string, max: number) =>
    s.length > max ? s.slice(0, max) + "…" : s;

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
        return { cod_sap, descricao: truncar(mat?.descricao || cod_sap, 30), qtd, descricaoCompleta: mat?.descricao || cod_sap };
      });
  }, [movimentacoes, materiais]);

  const topDestinos = useMemo(() => {
    const destinos = new Map<string, number>();
    const now = new Date();
    const mesPassado = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    movimentacoes
      .filter((m) => m.tipo === "SAIDA" && m.destino && m.data && new Date(m.data) >= mesPassado)
      .forEach((m) => {
        destinos.set(m.destino, (destinos.get(m.destino) || 0) + m.quantidade);
      });
    return Array.from(destinos.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([destino, qtd]) => ({ destino: truncar(destino, 25), qtd, destinoCompleto: destino }));
  }, [movimentacoes]);

  // --- Compras computed ---
  const comprasComAtraso = useMemo(
    () =>
      compras.filter((c) => {
        if (c.status === "Entregue") return false;
        if (!c.data_prevista_entrega) return false;
        return new Date(c.data_prevista_entrega) < new Date();
      }),
    [compras],
  );

  const itensCriticosSemPedido = useMemo(() => {
    const criticos = materiaisComStatus.filter(
      (m) => m._status === "sem_estoque" || m._status === "baixo",
    );
    const pedidosAbertos = new Set(
      compras.filter((c) => c.status !== "Entregue").map((c) => c.cod_sap),
    );
    return criticos.filter((m) => !pedidosAbertos.has(m.cod_sap));
  }, [materiaisComStatus, compras]);

  const comprasPorStatus = useMemo(() => {
    const map: Record<string, Compra[]> = {
      Solicitado: [],
      Aprovado: [],
      Comprado: [],
      "A Caminho": [],
      Entregue: [],
    };
    compras.forEach((c) => {
      if (map[c.status]) map[c.status].push(c);
    });
    return map;
  }, [compras]);

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

  const handleCompraStatus = async (id: number, status: StatusCompra) => {
    const update: Partial<Compra> = { status };
    if (status === "Entregue") update.data_entrega_real = new Date().toISOString().split("T")[0];
    const { error } = await supabase.from("compras").update(update).eq("id", id);
    if (error) {
      toast.error("Erro: " + error.message);
      return;
    }
    await carregarDados();
    toast.success("Status atualizado!");
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
      const { error } = await supabase.from("materiais").upsert(
        {
          cod_sap: d.cod_sap,
          descricao: d.descricao,
          unidade_medida: d.unidade_medida || "UN",
          categoria: (CATEGORIAS.includes(d.categoria as CategoriaMaterial)
            ? d.categoria
            : "outros") as CategoriaMaterial,
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
    const rows = materiais.map((m) =>
      headers.map((h) => `"${String((m as any)[h] ?? "").replace(/"/g, '""')}"`).join(","),
    );
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
      prev.map((mat) =>
        mat.cod_sap === m.cod_sap ? { ...mat, material_critico: novo } : mat,
      ),
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
      prev.map((mat) =>
        mat.cod_sap === cod_sap ? { ...mat, estoque_minimo: valor } : mat,
      ),
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
      s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

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
            <div className="fixed inset-0 z-30" onClick={() => { setOpen(false); if (!value) setQuery(""); }} />
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
      toast.success(`Entrada registrada! Novo saldo: ${selected.saldo_atual + qtd} ${selected.unidade_medida}`);
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
    const valido = selected !== null && qtd > 0 && destino.trim().length > 0 && solicitante.trim().length > 0 && resp.trim().length > 0 && !saldoInsuficiente;

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
      toast.success(`Saída registrada! Novo saldo: ${selected.saldo_atual - qtd} ${selected.unidade_medida}`);
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
              Saldo disponível: {selected.saldo_atual} {selected.unidade_medida} | Mínimo: {selected.estoque_minimo}
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

  const FormAjuste = () => {
    const [selected, setSelected] = useState<Material | null>(null);
    const [qtdNova, setQtdNova] = useState(0);
    const [motivo, setMotivo] = useState("");
    const [saving, setSaving] = useState(false);
    const qtdRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const valido = selected !== null && qtdNova >= 0 && motivo.trim().length > 0;
    const diff = selected !== null ? qtdNova - selected.saldo_atual : 0;

    const handleSalvar = async () => {
      if (!valido || !selected || saving) return;
      setSaving(true);
      const { error } = await supabase.from("movimentacoes").insert({
        cod_sap: selected.cod_sap,
        tipo: "AJUSTE",
        quantidade: diff,
        motivo_ajuste: motivo.trim(),
        criado_por: user?.email || "",
      });
      if (error) {
        toast.error("Erro ao registrar ajuste: " + error.message);
        setSaving(false);
        return;
      }
      await carregarDados();
      toast.success(`Saldo ajustado de ${selected.saldo_atual} para ${qtdNova} ${selected.unidade_medida} (diferença: ${diff > 0 ? "+" : ""}${diff})`);
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
              <span className="text-lg font-bold">{selected.saldo_atual} {selected.unidade_medida}</span>
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
            <span className={`text-[11px] ${diff !== 0 ? "font-semibold text-amber-600" : "text-slate-400"}`}>
              {diff === 0
                ? "Sem alteração"
                : `Diferença: ${diff > 0 ? "+" : ""}${diff} ${selected.unidade_medida} (${diff > 0 ? "aumento" : "redução"})`}
            </span>
          )}
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Motivo do ajuste *</span>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="min-h-20 rounded-md border border-slate-300 px-2 py-1.5 text-[14px] shadow-sm"
            placeholder="Ex: Inventário físico, correção de erro de lançamento..."
          />
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
    const [fornecedor, setFornecedor] = useState("");
    const [dataPrev, setDataPrev] = useState("");
    const [obs, setObs] = useState("");
    const qtdRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const mat = selected;

    const sugestao = useMemo(() => {
      if (!selected) return 0;
      const saidas = movimentacoes.filter((m) => m.cod_sap === selected.cod_sap && m.tipo === "SAIDA");
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
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-600">Fornecedor</span>
            <input
              value={fornecedor}
              onChange={(e) => setFornecedor(e.target.value)}
              className="min-h-11 rounded-md border border-slate-300 px-2 text-[14px] shadow-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-600">Data prevista entrega</span>
            <input
              type="date"
              value={dataPrev}
              onChange={(e) => setDataPrev(e.target.value)}
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
              quantidade_solicitada: qtd,
              fornecedor,
              data_prevista_entrega: dataPrev || null,
              observacao: obs,
              solicitante: profile?.nome_completo || user?.email || "",
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

  const AbaRegistros = ({
    movimentacoes: movs,
    materiais: mats,
  }: {
    movimentacoes: Movimentacao[];
    materiais: Material[];
  }) => {
    const [filtroTipo, setFiltroTipo] = useState<TipoMovimentacao | "TODAS">("TODAS");
    const [filtroOrigem, setFiltroOrigem] = useState<OrigemMovimentacao | "TODAS">("TODAS");
    const [dataInicio, setDataInicio] = useState("");
    const [dataFim, setDataFim] = useState("");
    const [search, setSearch] = useState("");
    const [destinoFilter, setDestinoFilter] = useState("");
    const [page, setPage] = useState(0);
    const pageSize = 50;

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
            mats.find((mat) => mat.cod_sap === m.cod_sap)?.descricao.toLowerCase().includes(q),
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
      movs.forEach((m) => { if (m.destino) set.add(m.destino); });
      return [...set].sort();
    }, [movs]);

    return (
      <div>
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
              <option key={d} value={d}>{d}</option>
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
                  <tr
                    key={m.id}
                    className="border-b border-slate-100 transition hover:bg-slate-50"
                  >
                    <td className="whitespace-nowrap px-3 py-2 text-slate-500">
                      {m.data
                        ? new Date(m.data).toLocaleDateString("pt-BR")
                        : <span className="italic text-slate-400">Não informada</span>}
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
    const movs = movimentacoes.filter((m) => m.cod_sap === material.cod_sap);
    return (
      <div className="text-sm">
        <div className="mb-3 flex items-center justify-between rounded-lg bg-slate-50 p-3">
          <div>
            <span className="font-mono text-lg font-bold text-[#0b3a73]">{material.cod_sap}</span>
            <p className="text-slate-600">{material.descricao}</p>
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
        <div className="max-h-80 space-y-1 overflow-auto">
          {movs.length === 0 && (
            <p className="text-slate-400 py-4 text-center">Nenhuma movimentação registrada.</p>
          )}
          {movs.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded border border-slate-100 px-3 py-2 text-[13px]"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white ${m.tipo === "ENTRADA" ? "bg-emerald-500" : m.tipo === "SAIDA" ? "bg-red-500" : "bg-amber-500"}`}
                >
                  {m.tipo === "ENTRADA" ? "+" : m.tipo === "SAIDA" ? "-" : "~"}
                </span>
                <span className="font-semibold">
                  {m.tipo === "AJUSTE"
                    ? m.quantidade
                    : m.tipo === "ENTRADA"
                      ? `+${m.quantidade}`
                      : `-${m.quantidade}`}
                </span>
                <span className="text-slate-500">{m.destino && `→ ${m.destino}`}</span>
              </div>
              <div className="flex items-center gap-2 text-right text-[11px] text-slate-400">
                <span
                  className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                    m.origem === "SISTEMA"
                      ? "bg-blue-100 text-blue-600"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {m.origem === "SISTEMA" ? "Sistema" : "Hist."}
                </span>
                <div>
                  <div>
                    {m.data
                      ? new Date(m.data).toLocaleDateString("pt-BR")
                      : <span className="italic text-slate-400">Sem data</span>}
                  </div>
                  {m.responsavel && <div>{m.responsavel}</div>}
                </div>
              </div>
            </div>
          ))}
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
            }`}
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
              <button
                onClick={() => setDialogMov("entrada")}
                className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-2 text-[13px] font-semibold text-white hover:bg-emerald-700 shadow"
              >
                <Plus className="h-4 w-4" /> Entrada
              </button>
              <button
                onClick={() => setDialogMov("saida")}
                className="inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-2 text-[13px] font-semibold text-white hover:bg-red-700 shadow"
              >
                <Minus className="h-4 w-4" /> Saída
              </button>
              <button
                onClick={() => setDialogMov("ajuste")}
                className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-3 py-2 text-[13px] font-semibold text-white hover:bg-amber-700 shadow"
              >
                <Edit3 className="h-4 w-4" /> Ajuste
              </button>
              <button
                onClick={exportarCSV}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
              >
                <Download className="h-4 w-4" /> Exportar
              </button>
              <button
                onClick={() => setDialogImportar(true)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
              >
                <Upload className="h-4 w-4" /> Importar
              </button>
            </>
          )}
          {aba === "compras" && (
            <button
              onClick={() => setDialogCompra(true)}
              className="inline-flex items-center gap-1 rounded-md bg-[#0b3a73] px-3 py-2 text-[13px] font-semibold text-white hover:bg-[#1f7ad6] shadow"
            >
              <Plus className="h-4 w-4" /> Novo Pedido
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

      {loading ? (
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
                        labelFormatter={(_l: string, payload: { payload?: { descricaoCompleta?: string } }[]) =>
                          payload?.[0]?.payload?.descricaoCompleta || _l
                        }
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
                        width={140}
                      />
                      <Tooltip
                        formatter={(value: number) => `${value} un`}
                        labelFormatter={(_l: string, payload: { payload?: { destinoCompleto?: string } }[]) =>
                          payload?.[0]?.payload?.destinoCompleto || _l
                        }
                      />
                      <Bar dataKey="qtd" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
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
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORIA_LABEL[c]}
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
                          {CATEGORIA_LABEL[m.categoria] || m.categoria}
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
                        {editandoMinimo === m.cod_sap ? (
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
                        ) : (
                          <button
                            onClick={() => iniciarEdicaoMinimo(m.cod_sap, m.estoque_minimo)}
                            className="cursor-pointer rounded px-1 py-0.5 text-slate-600 hover:bg-slate-100 hover:text-[#0b3a73]"
                            title="Clique para editar"
                          >
                            {m.estoque_minimo}
                          </button>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-slate-600">{m.fabricante}</td>
                      <td className="px-2 py-1.5 text-slate-600">{m.local_armazenagem}</td>
                      <td className="px-2 py-1.5 text-slate-600">{m.vinculo_elevatoria}</td>
                      <td className="whitespace-nowrap px-2 py-1.5">
                        <Semaforo saldo={m.saldo_atual} minimo={m.estoque_minimo} />
                      </td>
                      <td className="px-2 py-1.5">
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
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5">
                        <div className="flex items-center gap-1">
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
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
              <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-red-600">
                <AlertTriangle className="h-3 w-3" /> Críticos sem pedido
              </div>
              <div className="mt-1 text-3xl font-bold text-red-600">
                {itensCriticosSemPedido.length}
              </div>
              <div className="text-[11px] text-red-500">itens críticos sem compra</div>
            </div>
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 shadow-sm">
              <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-orange-600">
                <Clock className="h-3 w-3" /> Atrasados
              </div>
              <div className="mt-1 text-3xl font-bold text-orange-600">
                {comprasComAtraso.length}
              </div>
              <div className="text-[11px] text-orange-500">pedidos com data vencida</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <ShoppingCart className="h-3 w-3" /> Total Pedidos
              </div>
              <div className="mt-1 text-3xl font-bold text-[#0b3a73]">{compras.length}</div>
              <div className="text-[11px] text-slate-400">todos os pedidos</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <CheckCircle2 className="h-3 w-3" /> Entregues
              </div>
              <div className="mt-1 text-3xl font-bold text-emerald-600">
                {compras.filter((c) => c.status === "Entregue").length}
              </div>
              <div className="text-[11px] text-slate-400">pedidos entregues</div>
            </div>
          </div>

          {/* Kanban por status */}
          <div className="grid gap-3 sm:grid-cols-5">
            {(Object.entries(comprasPorStatus) as [StatusCompra, Compra[]][]).map(
              ([status, lista]) => (
                <div key={status} className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div
                    className={`rounded-t-xl px-3 py-2 text-xs font-bold uppercase tracking-wide ${STATUS_COMPRA_CORES[status]}`}
                  >
                    {status} <span className="ml-1 font-normal">({lista.length})</span>
                  </div>
                  <div className="max-h-[500px] space-y-1.5 overflow-auto p-2">
                    {lista.length === 0 && (
                      <p className="py-4 text-center text-[11px] text-slate-400">Nenhum</p>
                    )}
                    {lista.map((c) => {
                      const mat = materiais.find((m) => m.cod_sap === c.cod_sap);
                      const diasAtraso =
                        c.data_prevista_entrega && c.status !== "Entregue"
                          ? Math.ceil(
                              (Date.now() - new Date(c.data_prevista_entrega).getTime()) / 86400000,
                            )
                          : 0;
                      return (
                        <div
                          key={c.id}
                          className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-[12px]"
                        >
                          <div className="mb-1 flex items-center justify-between">
                            <span className="font-mono font-bold text-[#1f7ad6]">{c.cod_sap}</span>
                            <span className="font-bold">{c.quantidade_solicitada}</span>
                          </div>
                          <p className="truncate text-slate-600">{mat?.descricao || c.cod_sap}</p>
                          {c.fornecedor && (
                            <p className="text-[11px] text-slate-400">Fornecedor: {c.fornecedor}</p>
                          )}
                          {c.data_prevista_entrega && (
                            <p
                              className={`text-[11px] ${diasAtraso > 0 ? "text-red-500 font-semibold" : "text-slate-400"}`}
                            >
                              Prevista:{" "}
                              {new Date(c.data_prevista_entrega).toLocaleDateString("pt-BR")}
                              {diasAtraso > 0 && ` (${diasAtraso}d atraso)`}
                            </p>
                          )}
                          {c.status !== "Entregue" && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {status === "Solicitado" && podeAprovar && (
                                <button
                                  onClick={() => handleCompraStatus(c.id, "Aprovado")}
                                  className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 hover:bg-blue-200 cursor-pointer"
                                >
                                  Aprovar
                                </button>
                              )}
                              {status === "Aprovado" && (
                                <button
                                  onClick={() => handleCompraStatus(c.id, "Comprado")}
                                  className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 hover:bg-purple-200 cursor-pointer"
                                >
                                  Comprar
                                </button>
                              )}
                              {status === "Comprado" && (
                                <button
                                  onClick={() => handleCompraStatus(c.id, "A Caminho")}
                                  className="rounded bg-cyan-100 px-1.5 py-0.5 text-[10px] font-bold text-cyan-700 hover:bg-cyan-200 cursor-pointer"
                                >
                                  <Truck className="mr-0.5 inline h-3 w-3" /> A Caminho
                                </button>
                              )}
                              {["Comprado", "A Caminho"].includes(status) && (
                                <button
                                  onClick={() => handleCompraStatus(c.id, "Entregue")}
                                  className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-200 cursor-pointer"
                                >
                                  <CheckCircle2 className="mr-0.5 inline h-3 w-3" /> Entregue
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ),
            )}
          </div>
        </>
      ) : (
        /* ---------- ABA REGISTROS ---------- */
        <AbaRegistros
          movimentacoes={movimentacoes}
          materiais={materiais}
        />
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
        <DialogContent className="max-w-lg">
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
    </div>
  );
}
