import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  CalendarRange,
  Plus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Trash2,
  Download,
  Upload,
  Copy,
  Share2,
  Link2,
  Link2Off,
  Eye,
  EyeOff,
  X,
  Check,
  AlertTriangle,
  MessageSquare,
  History,
  GanttChart,
  List,
  ZoomIn,
  ZoomOut,
  Edit3,
  Save,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { getPermissoesCargo, temPermissao, temPainel } from "@/lib/permissoes";
import type {
  CronogramaProjeto,
  CronogramaItem,
  CronogramaComentario,
  CronogramaAuditoria,
} from "@/lib/cronograma-types";
import { STATUS_OPCOES, STATUS_CORES } from "@/lib/cronograma-types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/cronograma")({
  component: CronogramaPage,
  head: () => ({
    meta: [
      { title: "Cronograma de Instalação · Eletromecânica" },
      { name: "description", content: "Planejamento e cronograma de instalações" },
    ],
  }),
});

const inputCls =
  "min-h-11 w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#1f7ad6] focus:outline-none focus:ring-2 focus:ring-[#1f7ad6]/20";
const labelCls = "block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1";
const cardCls =
  "rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm";

const CORES_GRUPO = [
  "#3b82f6",
  "#ef4444",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#84cc16",
  "#06b6d4",
  "#d946ef",
  "#eab308",
  "#64748b",
  "#0ea5e9",
];

function obterCorGrupo(grupo: string, cache: Map<string, string>): string {
  if (cache.has(grupo)) return cache.get(grupo)!;
  const idx = cache.size % CORES_GRUPO.length;
  const cor = CORES_GRUPO[idx];
  cache.set(grupo, cor);
  return cor;
}

function formatDate(d: string | null): string {
  if (!d) return "--";
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR");
}

function addDays(date: string, days: number): string {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function diffDays(a: string, b: string): number {
  const d1 = new Date(a + "T12:00:00");
  const d2 = new Date(b + "T12:00:00");
  return Math.round((d2.getTime() - d1.getTime()) / 86400000);
}

function uid(): string {
  return `id_${Math.random().toString(36).slice(2, 10)}`;
}

function grupoLabel(grupo: string, label: string): string {
  return grupo || `(sem ${label.toLowerCase()})`;
}

function CronogramaPage() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const [projetos, setProjetos] = useState<CronogramaProjeto[]>([]);
  const [projetoAtivo, setProjetoAtivo] = useState<CronogramaProjeto | null>(null);
  const [itens, setItens] = useState<CronogramaItem[]>([]);
  const [loadingProjetos, setLoadingProjetos] = useState(true);
  const [loadingItens, setLoadingItens] = useState(false);
  const [permissoes, setPermissoes] = useState<Map<string, Set<string>>>(new Map());
  const [criarOpen, setCriarOpen] = useState(false);
  const [editNome, setEditNome] = useState("");
  const [editDataBase, setEditDataBase] = useState("");
  const [editDuracao, setEditDuracao] = useState("");
  const [editAgrupamento, setEditAgrupamento] = useState("");
  const [editDescricao, setEditDescricao] = useState("");
  const [itemDrawerOpen, setItemDrawerOpen] = useState(false);
  const [itemDrawerItem, setItemDrawerItem] = useState<CronogramaItem | null>(null);
  const [itemDrawerTab, setItemDrawerTab] = useState<"detalhes" | "comentarios" | "historico">(
    "detalhes",
  );
  const [comentarios, setComentarios] = useState<CronogramaComentario[]>([]);
  const [auditoria, setAuditoria] = useState<CronogramaAuditoria[]>([]);
  const [novoComentario, setNovoComentario] = useState("");
  const [buscandoUsuario, setBuscandoUsuario] = useState("");
  const [usuariosSugestoes, setUsuariosSugestoes] = useState<{ id: string; nome: string }[]>([]);
  const [zoom, setZoom] = useState<"semana" | "mes">("mes");
  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "salvando" | "salvo">("idle");
  const [excluirConfirmOpen, setExcluirConfirmOpen] = useState<number | null>(null);
  const [excluirProjetoConfirmOpen, setExcluirProjetoConfirmOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login", replace: true });
      return;
    }
    if (profile?.status === "pendente") {
      navigate({ to: "/pending", replace: true });
      return;
    }
    if (profile?.status === "bloqueado") {
      navigate({ to: "/bloqueado", replace: true });
      return;
    }
  }, [user, profile, loading, navigate]);

  useEffect(() => {
    if (!profile?.cargo_id) {
      setLoadingProjetos(false);
      return;
    }
    (async () => {
      const perms = await getPermissoesCargo(profile.cargo_id);
      setPermissoes(perms);
      if (!temPainel(perms, "cronograma") && !temPermissao(perms, "cronograma", "ver")) {
        setLoadingProjetos(false);
        return;
      }
      const { data } = await supabase
        .from("cronograma_projetos")
        .select("*, profiles!cronograma_projetos_criado_por_fkey(nome_completo)")
        .order("criado_em", { ascending: false });
      if (data) {
        const mapped = data.map((r: Record<string, unknown>) => ({
          ...r,
          criado_por_nome: (r.profiles as { nome_completo: string } | null)?.nome_completo ?? null,
        })) as unknown as CronogramaProjeto[];
        setProjetos(mapped);
      }
      setLoadingProjetos(false);
    })();
  }, [profile?.cargo_id]);

  async function carregarItens(projetoId: number) {
    setLoadingItens(true);
    const { data } = await supabase
      .from("cronograma_itens")
      .select("*, profiles!cronograma_itens_responsavel_id_fkey(nome_completo)")
      .eq("projeto_id", projetoId)
      .order("ordem", { ascending: true });
    if (data) {
      const mapped = data.map((r: Record<string, unknown>) => ({
        ...r,
        responsavel_nome: (r.profiles as { nome_completo: string } | null)?.nome_completo ?? null,
      })) as unknown as CronogramaItem[];
      setItens(mapped);
    }
    setLoadingItens(false);
  }

  function selecionarProjeto(p: CronogramaProjeto) {
    setProjetoAtivo(p);
    setEditNome(p.nome);
    setEditDataBase(p.data_inicio_base);
    setEditDuracao(String(p.duracao_padrao_dias));
    setEditAgrupamento(p.campo_agrupamento_label);
    setEditDescricao(p.descricao || "");
    carregarItens(p.id);
  }

  const podesVer = temPermissao(permissoes, "cronograma", "ver");
  const podesCriar = temPermissao(permissoes, "cronograma", "criar_projeto");
  const podesEditar = temPermissao(permissoes, "cronograma", "editar");
  const podesExcluir = temPermissao(permissoes, "cronograma", "excluir");
  const podesExportar = temPermissao(permissoes, "cronograma", "exportar");
  const podesComentar = temPermissao(permissoes, "cronograma", "comentar");
  const podesLink = temPermissao(permissoes, "cronograma", "gerar_link_publico");

  const isDono = !!(projetoAtivo && profile && projetoAtivo.criado_por === profile.id);
  const isReadonly = !!(projetoAtivo && !isDono);

  // Autosave helpers
  function autosave() {
    setAutosaveStatus("salvando");
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => setAutosaveStatus("salvo"), 800);
  }

  function debounce(fn: () => void, ms = 500) {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(fn, ms);
  }

  // Criar projeto
  async function handleCriarProjeto() {
    if (!editNome.trim() || !editDataBase || !editDuracao || !editAgrupamento.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    const { data, error } = await supabase
      .from("cronograma_projetos")
      .insert({
        nome: editNome.trim(),
        descricao: editDescricao.trim() || null,
        data_inicio_base: editDataBase,
        duracao_padrao_dias: Number(editDuracao),
        campo_agrupamento_label: editAgrupamento.trim(),
        criado_por: user?.id,
      })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setProjetos((prev) => [data as unknown as CronogramaProjeto, ...prev]);
    setCriarOpen(false);
    toast.success("Projeto criado");
    selecionarProjeto(data as unknown as CronogramaProjeto);
  }

  // Salvar parâmetros do projeto
  function salvarParametrosProjeto() {
    if (!projetoAtivo || !isDono) return;
    debounce(async () => {
      const { error } = await supabase
        .from("cronograma_projetos")
        .update({
          nome: editNome.trim(),
          descricao: editDescricao.trim() || null,
          data_inicio_base: editDataBase,
          duracao_padrao_dias: Number(editDuracao),
          campo_agrupamento_label: editAgrupamento.trim(),
        })
        .eq("id", projetoAtivo.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      autosave();
      setProjetos((prev) =>
        prev.map((p) =>
          p.id === projetoAtivo.id
            ? {
                ...p,
                nome: editNome.trim(),
                descricao: editDescricao.trim() || null,
                data_inicio_base: editDataBase,
                duracao_padrao_dias: Number(editDuracao),
                campo_agrupamento_label: editAgrupamento.trim(),
              }
            : p,
        ),
      );
    });
  }

  // Toggle visibilidade
  async function toggleVisibilidade() {
    if (!projetoAtivo || !isDono) return;
    const novaVis = projetoAtivo.visibilidade === "privado" ? "publico" : "privado";
    const { error } = await supabase
      .from("cronograma_projetos")
      .update({ visibilidade: novaVis })
      .eq("id", projetoAtivo.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setProjetoAtivo((prev) => (prev ? { ...prev, visibilidade: novaVis } : null));
    setProjetos((prev) =>
      prev.map((p) => (p.id === projetoAtivo.id ? { ...p, visibilidade: novaVis } : p)),
    );
    toast.success(novaVis === "publico" ? "Projeto agora é público" : "Projeto agora é privado");
  }

  // Gerar link público
  async function gerarLinkPublico() {
    if (!projetoAtivo || !isDono) return;
    const token = crypto.randomUUID();
    const { error } = await supabase
      .from("cronograma_projetos")
      .update({ link_publico_token: token })
      .eq("id", projetoAtivo.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setProjetoAtivo((prev) => (prev ? { ...prev, link_publico_token: token } : null));
    const url = `${window.location.origin}/cronograma/publico/${token}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado para área de transferência");
  }

  async function revogarLinkPublico() {
    if (!projetoAtivo || !isDono) return;
    const { error } = await supabase
      .from("cronograma_projetos")
      .update({ link_publico_token: null })
      .eq("id", projetoAtivo.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setProjetoAtivo((prev) => (prev ? { ...prev, link_publico_token: null } : null));
    toast.success("Link revogado");
  }

  // Adicionar item
  async function adicionarItem() {
    if (!projetoAtivo || !isDono) return;
    const maxOrdem = itens.reduce((max, i) => Math.max(max, i.ordem), 0);
    const { data, error } = await supabase
      .from("cronograma_itens")
      .insert({
        projeto_id: projetoAtivo.id,
        nome: "",
        grupo: "",
        ordem: maxOrdem + 1,
        duracao_dias: null,
        status: "nao_iniciado",
      })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    await carregarItens(projetoAtivo.id);
    autosave();
  }

  // Atualizar item inline
  function atualizarItemLocal(id: number, patch: Partial<CronogramaItem>) {
    setItens((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  function salvarItem(id: number, patch: Partial<CronogramaItem>) {
    if (!isDono) return;
    debounce(async () => {
      const { error } = await supabase.from("cronograma_itens").update(patch).eq("id", id);
      if (error) toast.error(error.message);
      else {
        autosave();
        await carregarItens(projetoAtivo!.id);
      }
    });
  }

  // Reordenar via drag-and-drop
  const [dragItemIdx, setDragItemIdx] = useState<number | null>(null);

  function handleDragStart(idx: number) {
    setDragItemIdx(idx);
  }
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }
  function handleDrop(targetIdx: number) {
    if (dragItemIdx === null || dragItemIdx === targetIdx || !isDono) {
      setDragItemIdx(null);
      return;
    }
    const next = [...itens];
    const [moved] = next.splice(dragItemIdx, 1);
    next.splice(targetIdx, 0, moved);
    const reordered = next.map((i, idx) => ({ ...i, ordem: idx + 1 }));
    setItens(reordered);
    setDragItemIdx(null);
    debounce(async () => {
      for (const item of reordered) {
        await supabase.from("cronograma_itens").update({ ordem: item.ordem }).eq("id", item.id);
      }
      autosave();
    });
  }

  // Excluir item
  async function excluirItem(id: number) {
    if (!isDono) return;
    const { error } = await supabase.from("cronograma_itens").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Item excluído");
    if (projetoAtivo) await carregarItens(projetoAtivo.id);
  }

  // Excluir projeto
  async function excluirProjeto() {
    if (!projetoAtivo || !isDono) return;
    const { error } = await supabase.from("cronograma_projetos").delete().eq("id", projetoAtivo.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Projeto excluído");
    setProjetos((prev) => prev.filter((p) => p.id !== projetoAtivo.id));
    setProjetoAtivo(null);
    setItens([]);
    setExcluirProjetoConfirmOpen(false);
  }

  // Duplicar projeto
  async function duplicarProjeto() {
    if (!projetoAtivo || !isDono) return;
    const { data: newProj, error: errProj } = await supabase
      .from("cronograma_projetos")
      .insert({
        nome: `${projetoAtivo.nome} (cópia)`,
        descricao: projetoAtivo.descricao,
        data_inicio_base: projetoAtivo.data_inicio_base,
        duracao_padrao_dias: projetoAtivo.duracao_padrao_dias,
        campo_agrupamento_label: projetoAtivo.campo_agrupamento_label,
        criado_por: user?.id,
      })
      .select()
      .single();
    if (errProj) {
      toast.error(errProj.message);
      return;
    }
    const newProjId = (newProj as unknown as CronogramaProjeto).id;
    const itensToCopy = itens.map((i) => ({
      projeto_id: newProjId,
      nome: i.nome,
      grupo: i.grupo,
      ordem: i.ordem,
      duracao_dias: i.duracao_dias,
      cor_grupo: i.cor_grupo,
      status: i.status,
      os_referencia: i.os_referencia,
      rc_referencia: i.rc_referencia,
      responsavel_id: i.responsavel_id,
      metadados: i.metadados,
    }));
    if (itensToCopy.length > 0) {
      const { error: errItems } = await supabase.from("cronograma_itens").insert(itensToCopy);
      if (errItems) {
        toast.error(errItems.message);
        return;
      }
    }
    setProjetos((prev) => [newProj as unknown as CronogramaProjeto, ...prev]);
    toast.success("Projeto duplicado");
    selecionarProjeto(newProj as unknown as CronogramaProjeto);
  }

  // Comentários
  async function carregarComentarios(itemId: number) {
    const { data } = await supabase
      .from("cronograma_comentarios")
      .select("*, profiles!cronograma_comentarios_autor_id_fkey(nome_completo)")
      .eq("item_id", itemId)
      .order("criado_em", { ascending: true });
    if (data) {
      setComentarios(
        data.map((r: Record<string, unknown>) => ({
          ...r,
          autor_nome: (r.profiles as { nome_completo: string } | null)?.nome_completo ?? null,
        })) as unknown as CronogramaComentario[],
      );
    }
  }

  async function carregarAuditoria(itemId: number) {
    const { data } = await supabase
      .from("cronograma_auditoria")
      .select("*, profiles!cronograma_auditoria_usuario_id_fkey(nome_completo)")
      .eq("item_id", itemId)
      .order("criado_em", { ascending: false });
    if (data) {
      setAuditoria(
        data.map((r: Record<string, unknown>) => ({
          ...r,
          usuario_nome: (r.profiles as { nome_completo: string } | null)?.nome_completo ?? null,
        })) as unknown as CronogramaAuditoria[],
      );
    }
  }

  function abrirDrawerItem(item: CronogramaItem) {
    setItemDrawerItem(item);
    setItemDrawerTab("detalhes");
    carregarComentarios(item.id);
    carregarAuditoria(item.id);
    setItemDrawerOpen(true);
  }

  async function enviarComentario() {
    if (!novoComentario.trim() || !itemDrawerItem || !user) return;
    const mencionados: string[] = [];
    const match = novoComentario.match(/@(\w+)/g);
    if (match) {
      for (const m of match) {
        const nome = m.slice(1);
        const { data } = await supabase
          .from("profiles")
          .select("id")
          .eq("nome_completo", nome)
          .maybeSingle();
        if (data) mencionados.push(data.id);
      }
    }
    const { error } = await supabase.from("cronograma_comentarios").insert({
      item_id: itemDrawerItem.id,
      autor_id: user.id,
      conteudo: novoComentario.trim(),
      mencionados,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    // Notificar mencionados
    for (const uid of mencionados) {
      await supabase.from("notificacoes").insert({
        usuario_id: uid,
        tipo: "mencao",
        referencia_tipo: "cronograma",
        referencia_id: itemDrawerItem.id,
        mensagem: `${profile?.nome_completo} mencionou você em "${itemDrawerItem.nome}"`,
      });
    }
    setNovoComentario("");
    toast.success("Comentário adicionado");
    await carregarComentarios(itemDrawerItem.id);
  }

  // Buscar usuários para autocomplete
  const buscarUsuarios = useCallback(async (query: string) => {
    if (query.length < 2) {
      setUsuariosSugestoes([]);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("id, nome_completo")
      .ilike("nome_completo", `%${query}%`)
      .limit(5);
    if (data)
      setUsuariosSugestoes(
        data.map((d: { id: string; nome_completo: string }) => ({
          id: d.id,
          nome: d.nome_completo,
        })),
      );
  }, []);

  // Export XLSX
  async function exportarXLSX() {
    if (!projetoAtivo || itens.length === 0) return;
    const { default: ExcelJS } = await import("exceljs");
    const wb = new ExcelJS.Workbook();
    wb.creator = "EMEC Baixada 2";
    const ws = wb.addWorksheet(projetoAtivo.nome.slice(0, 31));
    ws.columns = [
      { header: "Ordem", key: "ordem", width: 8 },
      { header: "Nome", key: "nome", width: 30 },
      { header: projetoAtivo.campo_agrupamento_label, key: "grupo", width: 20 },
      { header: "Duração (dias)", key: "duracao", width: 14 },
      { header: "Início", key: "inicio", width: 12 },
      { header: "Término", key: "termino", width: 12 },
      { header: "Status", key: "status", width: 14 },
      { header: "O.S.", key: "os", width: 15 },
      { header: "RC", key: "rc", width: 15 },
    ];
    itens.forEach((i) => {
      ws.addRow({
        ordem: i.ordem,
        nome: i.nome,
        grupo: i.grupo,
        duracao: i.duracao_dias ?? projetoAtivo.duracao_padrao_dias,
        inicio: formatDate(i.data_inicio_calculada),
        termino: formatDate(i.data_termino_calculada),
        status: STATUS_OPCOES.find((s) => s.value === i.status)?.label ?? i.status,
        os: i.os_referencia || "",
        rc: i.rc_referencia || "",
      });
    });
    ws.getRow(1).font = { bold: true };
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projetoAtivo.nome.replace(/\s+/g, "_")}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Planilha exportada");
  }

  // Export CSV
  function exportarCSV() {
    if (!projetoAtivo || itens.length === 0) return;
    const headers = [
      "Ordem",
      "Nome",
      projetoAtivo.campo_agrupamento_label,
      "Duração (dias)",
      "Início",
      "Término",
      "Status",
      "O.S.",
      "RC",
    ];
    const rows = itens.map((i) => [
      i.ordem,
      i.nome,
      i.grupo,
      i.duracao_dias ?? projetoAtivo.duracao_padrao_dias,
      formatDate(i.data_inicio_calculada),
      formatDate(i.data_termino_calculada),
      STATUS_OPCOES.find((s) => s.value === i.status)?.label ?? i.status,
      i.os_referencia || "",
      i.rc_referencia || "",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projetoAtivo.nome.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  }

  // Import XLSX
  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !projetoAtivo || !isDono) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const { default: XLSX } = await import("xlsx");
        const data = new Uint8Array(ev.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<string, unknown>[];
        const maxOrdem = itens.reduce((max, i) => Math.max(max, i.ordem), 0);
        const novos = rows.map((r: Record<string, unknown>, idx: number) => ({
          projeto_id: projetoAtivo!.id,
          nome: String(r["Nome"] || r["nome"] || ""),
          grupo: String(r[projetoAtivo!.campo_agrupamento_label] || r["grupo"] || ""),
          ordem: maxOrdem + idx + 1,
          duracao_dias: Number(
            r["Duração (dias)"] || r["duracao_dias"] || projetoAtivo!.duracao_padrao_dias,
          ),
          status: "nao_iniciado",
        }));
        const { error } = await supabase.from("cronograma_itens").insert(novos);
        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success(`${novos.length} itens importados`);
        await carregarItens(projetoAtivo!.id);
        setImportOpen(false);
      } catch (err) {
        toast.error("Erro ao importar: " + (err as Error).message);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  // PDF via impressão
  function exportarPDF() {
    window.print();
  }

  // Gantt data
  const cacheCores = new Map<string, string>();
  const grupos = [...new Set(itens.map((i) => i.grupo))].sort();
  const totalDias =
    itens.length > 0
      ? itens.reduce(
          (sum, i) => sum + (i.duracao_dias ?? projetoAtivo?.duracao_padrao_dias ?? 0),
          0,
        )
      : 0;
  const dataConclusao = itens.length > 0 ? itens[itens.length - 1]?.data_termino_calculada : null;
  const statusCount = {
    nao_iniciado: itens.filter((i) => i.status === "nao_iniciado").length,
    em_andamento: itens.filter((i) => i.status === "em_andamento").length,
    concluido: itens.filter((i) => i.status === "concluido").length,
    atrasado: itens.filter((i) => i.status === "atrasado").length,
  };
  const temAtrasoVisual = itens.filter((i) => {
    if (i.status === "concluido") return false;
    if (!i.data_termino_calculada) return false;
    return new Date(i.data_termino_calculada + "T12:00:00") < new Date();
  }).length;

  // Timeline dimensions
  const dataMin =
    itens.length > 0
      ? itens.reduce(
          (min, i) =>
            i.data_inicio_calculada && i.data_inicio_calculada < min
              ? i.data_inicio_calculada
              : min,
          itens[0]?.data_inicio_calculada || "",
        )
      : projetoAtivo?.data_inicio_base || "";
  const dataMax =
    itens.length > 0
      ? itens.reduce(
          (max, i) =>
            i.data_termino_calculada && i.data_termino_calculada > max
              ? i.data_termino_calculada
              : max,
          itens[0]?.data_termino_calculada || "",
        )
      : projetoAtivo
        ? addDays(projetoAtivo.data_inicio_base, Number(projetoAtivo.duracao_padrao_dias))
        : "";

  const diasTotais = dataMin && dataMax ? diffDays(dataMin, dataMax) + 1 : 1;
  const colWidth = zoom === "semana" ? 32 : 16;
  const ganttWidth = Math.max(diasTotais * colWidth, 600);

  function diaOffset(data: string): number {
    return dataMin ? diffDays(dataMin, data) : 0;
  }

  function renderHeader() {
    const headers: React.ReactNode[] = [];
    if (!dataMin) return null;
    const inicio = new Date(dataMin + "T12:00:00");
    const fim = new Date(dataMax + "T12:00:00");
    const dias: string[] = [];
    for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
      dias.push(d.toISOString().slice(0, 10));
    }

    if (zoom === "semana") {
      let currentWeek: string[] = [];
      const weeks: string[][] = [];
      dias.forEach((d) => {
        currentWeek.push(d);
        if (new Date(d + "T12:00:00").getDay() === 6) {
          weeks.push(currentWeek);
          currentWeek = [];
        }
      });
      if (currentWeek.length > 0) weeks.push(currentWeek);
      return weeks.map((week, wi) => (
        <div key={wi} className="flex" style={{ minWidth: week.length * colWidth }}>
          {week.map((d) => {
            const dt = new Date(d + "T12:00:00");
            const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;
            return (
              <div
                key={d}
                className={`flex-shrink-0 text-[10px] text-center leading-tight border-r border-slate-200 dark:border-slate-700 ${
                  isWeekend ? "bg-slate-100 dark:bg-slate-800/50 text-slate-400" : ""
                }`}
                style={{ width: colWidth, paddingTop: 2 }}
              >
                <div>{dt.getDate()}</div>
                <div className="text-[9px] text-slate-400">
                  {dt.toLocaleDateString("pt-BR", { month: "short" })}
                </div>
              </div>
            );
          })}
        </div>
      ));
    }

    // Monthly
    const months: { label: string; days: string[] }[] = [];
    let currentMonth = "";
    let currentDays: string[] = [];
    dias.forEach((d) => {
      const m = d.slice(0, 7);
      if (m !== currentMonth) {
        if (currentDays.length > 0) months.push({ label: currentMonth, days: currentDays });
        currentMonth = m;
        currentDays = [];
      }
      currentDays.push(d);
    });
    if (currentDays.length > 0) months.push({ label: currentMonth, days: currentDays });

    return months.map((m, mi) => {
      const dt = new Date(m.days[0] + "T12:00:00");
      const label = dt.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      return (
        <div key={mi} className="flex" style={{ minWidth: m.days.length * colWidth }}>
          {m.days.map((d) => {
            const dt2 = new Date(d + "T12:00:00");
            const isWeekend = dt2.getDay() === 0 || dt2.getDay() === 6;
            return (
              <div
                key={d}
                className={`flex-shrink-0 text-[10px] text-center leading-tight border-r border-slate-200 dark:border-slate-700 ${
                  isWeekend ? "bg-slate-100 dark:bg-slate-800/50 text-slate-400" : ""
                }`}
                style={{ width: colWidth, paddingTop: 2 }}
              >
                <div>{dt2.getDate()}</div>
                {dt2.getDate() === 1 && (
                  <div className="text-[9px] text-slate-400">
                    {dt2.toLocaleDateString("pt-BR", { month: "short" })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    });
  }

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1f7ad6]" />
      </div>
    );

  if (!podesVer && !temPainel(permissoes, "cronograma")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <div className="text-center">
          <CalendarRange className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
          <h2 className="mt-4 text-lg font-semibold text-slate-600 dark:text-slate-400">
            Sem acesso
          </h2>
          <p className="text-sm text-slate-400">Você não tem permissão para acessar este módulo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
      <div className="mx-auto max-w-7xl p-4 md:p-6">
        {/* Header */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#002d74] via-[#003087] to-[#00AEEF] p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
              <CalendarRange className="h-6 w-6 text-white" />
            </div>
            <div className="text-white flex-1">
              <h1 className="text-lg font-bold">Cronograma de Instalação</h1>
              <p className="text-sm text-cyan-50/80">
                Planejamento e cronograma de instalações, obras e manutenções
              </p>
            </div>
            <div className="flex items-center gap-2">
              {autosaveStatus !== "idle" && (
                <span
                  className={`text-xs flex items-center gap-1 ${autosaveStatus === "salvando" ? "text-yellow-300" : "text-green-300"}`}
                >
                  {autosaveStatus === "salvando" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                  {autosaveStatus === "salvando" ? "Salvando..." : "Salvo"}
                </span>
              )}
            </div>
          </div>
        </div>

        {!projetoAtivo ? (
          /* ── Lista de projetos ── */
          <div>
            {/* Projetos do usuário */}
            {projetos.filter((p) => p.criado_por === user?.id).length > 0 && (
              <section className="mb-8">
                <h2 className="mb-3 text-sm font-bold text-[#0b3a73] dark:text-white uppercase tracking-wide">
                  Meus cronogramas
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {projetos
                    .filter((p) => p.criado_por === user?.id)
                    .map((p) => (
                      <button
                        key={p.id}
                        onClick={() => selecionarProjeto(p)}
                        className="group flex flex-col items-start gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 text-left shadow-sm transition hover:border-[#1f7ad6] hover:shadow-md"
                      >
                        <div className="flex items-center gap-2 w-full">
                          <h3 className="font-semibold text-[#0b3a73] dark:text-white flex-1 truncate">
                            {p.nome}
                          </h3>
                          <Badge
                            variant={p.visibilidade === "publico" ? "default" : "secondary"}
                            className="text-[10px]"
                          >
                            {p.visibilidade === "publico" ? (
                              <Eye className="h-3 w-3 mr-1" />
                            ) : (
                              <EyeOff className="h-3 w-3 mr-1" />
                            )}
                            {p.visibilidade === "publico" ? "Público" : "Privado"}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400">
                          {p.campo_agrupamento_label} · {formatDate(p.data_inicio_base)}
                        </p>
                        <p className="text-xs text-slate-400">{p.descricao || "Sem descrição"}</p>
                      </button>
                    ))}
                </div>
              </section>
            )}

            {/* Projetos públicos de outros */}
            {projetos.filter((p) => p.criado_por !== user?.id && p.visibilidade === "publico")
              .length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-bold text-[#0b3a73] dark:text-white uppercase tracking-wide">
                  Cronogramas públicos
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {projetos
                    .filter((p) => p.criado_por !== user?.id && p.visibilidade === "publico")
                    .map((p) => (
                      <button
                        key={p.id}
                        onClick={() => selecionarProjeto(p)}
                        className="group flex flex-col items-start gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 text-left shadow-sm transition hover:border-[#1f7ad6] hover:shadow-md"
                      >
                        <div className="flex items-center gap-2 w-full">
                          <h3 className="font-semibold text-[#0b3a73] dark:text-white flex-1 truncate">
                            {p.nome}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-400">
                          por {p.criado_por_nome || "Desconhecido"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {p.campo_agrupamento_label} · {formatDate(p.data_inicio_base)}
                        </p>
                      </button>
                    ))}
                </div>
              </section>
            )}

            {/* Empty state */}
            {projetos.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <CalendarRange className="h-16 w-16 text-slate-300 dark:text-slate-600" />
                <h2 className="mt-4 text-lg font-semibold text-slate-600 dark:text-slate-400">
                  Nenhum cronograma ainda
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Crie seu primeiro cronograma para começar.
                </p>
                {podesCriar && (
                  <button
                    onClick={() => setCriarOpen(true)}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#0b3a73] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1f7ad6] transition"
                  >
                    <Plus className="h-4 w-4" /> Criar cronograma
                  </button>
                )}
              </div>
            )}

            {/* Botão criar (sempre visível no topo) */}
            {projetos.length > 0 && podesCriar && (
              <div className="mt-6">
                <button
                  onClick={() => setCriarOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0b3a73] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1f7ad6] transition"
                >
                  <Plus className="h-4 w-4" /> Novo cronograma
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ── Projeto ativo ── */
          <div>
            {/* Breadcrumb */}
            <button
              onClick={() => {
                setProjetoAtivo(null);
                setItens([]);
              }}
              className="mb-4 inline-flex items-center gap-1 text-sm text-[#1f7ad6] hover:underline"
            >
              <ChevronLeft className="h-4 w-4" /> Voltar para lista
            </button>

            {isReadonly && (
              <div className="mb-4 rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-3 text-xs text-amber-700 dark:text-amber-400">
                <Eye className="h-3.5 w-3.5 inline mr-1" />
                Somente leitura — cronograma público de{" "}
                {projetoAtivo.criado_por_nome || "outro usuário"}
              </div>
            )}

            {/* Parâmetros do projeto */}
            <section className={`${cardCls} mb-4`}>
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[200px]">
                  <label className={labelCls}>Nome do projeto</label>
                  <input
                    value={editNome}
                    onChange={(e) => {
                      setEditNome(e.target.value);
                      salvarParametrosProjeto();
                    }}
                    disabled={isReadonly}
                    className={inputCls + " min-h-9 font-semibold"}
                  />
                </div>
                <div className="w-[140px]">
                  <label className={labelCls}>Data base</label>
                  <input
                    type="date"
                    value={editDataBase}
                    onChange={(e) => {
                      setEditDataBase(e.target.value);
                      salvarParametrosProjeto();
                    }}
                    disabled={isReadonly}
                    className={inputCls + " min-h-9"}
                  />
                </div>
                <div className="w-[120px]">
                  <label className={labelCls}>Duração padrão (dias)</label>
                  <input
                    type="number"
                    value={editDuracao}
                    onChange={(e) => {
                      setEditDuracao(e.target.value);
                      salvarParametrosProjeto();
                    }}
                    disabled={isReadonly}
                    min={1}
                    className={inputCls + " min-h-9"}
                  />
                </div>
                <div className="w-[160px]">
                  <label className={labelCls}>Rótulo de agrupamento</label>
                  <input
                    value={editAgrupamento}
                    onChange={(e) => {
                      setEditAgrupamento(e.target.value);
                      salvarParametrosProjeto();
                    }}
                    disabled={isReadonly}
                    className={inputCls + " min-h-9"}
                  />
                </div>
                {isDono && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleVisibilidade}
                      title={
                        projetoAtivo.visibilidade === "privado"
                          ? "Tornar público"
                          : "Tornar privado"
                      }
                    >
                      {projetoAtivo.visibilidade === "privado" ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    {podesLink && (
                      <>
                        {projetoAtivo.link_publico_token ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={revogarLinkPublico}
                            title="Revogar link público"
                          >
                            <Link2Off className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={gerarLinkPublico}
                            title="Gerar link de apresentação"
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
                    {podesExcluir && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500 border-red-200 hover:bg-red-50"
                        onClick={() => setExcluirProjetoConfirmOpen(true)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <div className="mt-2">
                <textarea
                  value={editDescricao}
                  onChange={(e) => {
                    setEditDescricao(e.target.value);
                    salvarParametrosProjeto();
                  }}
                  disabled={isReadonly}
                  placeholder="Descrição do projeto..."
                  rows={2}
                  className={inputCls + " min-h-[50px] text-xs"}
                />
              </div>
            </section>

            {/* Metric cards */}
            <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-sm">
                <p className="text-xs text-slate-400">Total de itens</p>
                <p className="text-xl font-bold text-[#0b3a73] dark:text-white">{itens.length}</p>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-sm">
                <p className="text-xs text-slate-400">Total de dias</p>
                <p className="text-xl font-bold text-[#0b3a73] dark:text-white">{totalDias}</p>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-sm">
                <p className="text-xs text-slate-400">Previsão de conclusão</p>
                <p className="text-lg font-bold text-[#0b3a73] dark:text-white">
                  {formatDate(dataConclusao)}
                </p>
              </div>
              {STATUS_OPCOES.map((s) => (
                <div
                  key={s.value}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-sm"
                >
                  <p className="text-xs text-slate-400">{s.label}</p>
                  <p className={`text-xl font-bold ${STATUS_CORES[s.value].text}`}>
                    {s.value === "atrasado" && statusCount.atrasado > 0
                      ? `${statusCount.atrasado}`
                      : statusCount[s.value as keyof typeof statusCount]}
                  </p>
                </div>
              ))}
              {temAtrasoVisual > 0 && (
                <div className="rounded-lg border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 p-3 shadow-sm">
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Atraso visual
                  </p>
                  <p className="text-xl font-bold text-red-600">{temAtrasoVisual} itens</p>
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="mb-4 flex flex-wrap gap-2">
              {isDono && (
                <button
                  onClick={adicionarItem}
                  className="inline-flex items-center gap-1 rounded-md bg-[#0b3a73] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1f7ad6] transition"
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar item
                </button>
              )}
              {isDono && (
                <button
                  onClick={duplicarProjeto}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-600 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  <Copy className="h-3.5 w-3.5" /> Duplicar
                </button>
              )}
              <button
                onClick={() => setImportOpen(true)}
                disabled={!isDono || !podesExportar}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-600 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition disabled:opacity-40"
              >
                <Upload className="h-3.5 w-3.5" /> Importar
              </button>
              <button
                onClick={exportarCSV}
                disabled={!podesExportar}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-600 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition disabled:opacity-40"
              >
                <Download className="h-3.5 w-3.5" /> CSV
              </button>
              <button
                onClick={exportarXLSX}
                disabled={!podesExportar}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-600 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition disabled:opacity-40"
              >
                <Download className="h-3.5 w-3.5" /> XLSX
              </button>
              <button
                onClick={exportarPDF}
                disabled={!podesExportar}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-600 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition disabled:opacity-40"
              >
                <Download className="h-3.5 w-3.5" /> PDF
              </button>
              <div className="ml-auto flex gap-1">
                <button
                  onClick={() => setZoom("mes")}
                  className={`inline-flex items-center gap-1 rounded-md px-3 py-2 text-xs font-semibold transition ${zoom === "mes" ? "bg-[#1f7ad6] text-white" : "border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"}`}
                >
                  <ZoomOut className="h-3.5 w-3.5" /> Mês
                </button>
                <button
                  onClick={() => setZoom("semana")}
                  className={`inline-flex items-center gap-1 rounded-md px-3 py-2 text-xs font-semibold transition ${zoom === "semana" ? "bg-[#1f7ad6] text-white" : "border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"}`}
                >
                  <ZoomIn className="h-3.5 w-3.5" /> Semana
                </button>
              </div>
            </div>

            {loadingItens ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-[#1f7ad6]" />
              </div>
            ) : itens.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 rounded-lg border border-dashed border-slate-300 dark:border-slate-600">
                <List className="h-12 w-12 text-slate-300 dark:text-slate-600" />
                <h3 className="mt-3 text-sm font-semibold text-slate-500">Nenhum item ainda</h3>
                <p className="text-xs text-slate-400">Adicione itens ao cronograma para começar.</p>
                {isDono && (
                  <button
                    onClick={adicionarItem}
                    className="mt-3 inline-flex items-center gap-1 rounded-md bg-[#0b3a73] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1f7ad6] transition"
                  >
                    <Plus className="h-3.5 w-3.5" /> Adicionar primeiro item
                  </button>
                )}
              </div>
            ) : (
              <div>
                {/* Legenda de grupos */}
                <div className="mb-3 flex flex-wrap gap-2">
                  {grupos.map((g) => {
                    const cor = obterCorGrupo(g, cacheCores);
                    return (
                      <div
                        key={g}
                        className="flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs"
                      >
                        <div className="h-3 w-3 rounded" style={{ backgroundColor: cor }} />
                        <span className="text-slate-600 dark:text-slate-300">
                          {grupoLabel(g, projetoAtivo.campo_agrupamento_label)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Gantt + Table */}
                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                  {/* Gantt timeline header */}
                  <div className="sticky top-0 z-10 flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                    <div className="flex-shrink-0 w-[300px] p-2 text-xs font-semibold text-slate-500 uppercase tracking-wide border-r border-slate-200 dark:border-slate-700">
                      Item
                    </div>
                    <div className="flex overflow-hidden" style={{ minWidth: ganttWidth }}>
                      {renderHeader()}
                    </div>
                  </div>

                  {/* Gantt rows */}
                  {grupos.map((grupo) => {
                    const itensGrupo = itens.filter((i) => i.grupo === grupo);
                    if (itensGrupo.length === 0) return null;
                    const corGrupo = obterCorGrupo(grupo, cacheCores);
                    return (
                      <div key={grupo}>
                        {/* Grupo header */}
                        <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-700/50">
                          <div className="flex-shrink-0 w-[300px] p-2 text-xs font-bold text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700 flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded"
                              style={{ backgroundColor: corGrupo }}
                            />
                            {grupoLabel(grupo, projetoAtivo.campo_agrupamento_label)}
                          </div>
                          <div className="flex-1" style={{ minWidth: ganttWidth }} />
                        </div>

                        {/* Itens */}
                        {itensGrupo.map((item, idx) => {
                          const globalIdx = itens.indexOf(item);
                          const inicio =
                            item.data_inicio_calculada || projetoAtivo.data_inicio_base;
                          const termino =
                            item.data_termino_calculada ||
                            addDays(
                              inicio,
                              (item.duracao_dias ?? projetoAtivo.duracao_padrao_dias) - 1,
                            );
                          const offset = diaOffset(inicio);
                          const duracao = diffDays(inicio, termino) + 1;
                          const barWidth = duracao * colWidth;
                          const cor = item.cor_grupo || corGrupo;
                          const corStatus = STATUS_CORES[item.status];

                          return (
                            <div
                              key={item.id}
                              draggable={isDono}
                              onDragStart={() => handleDragStart(globalIdx)}
                              onDragOver={handleDragOver}
                              onDrop={() => handleDrop(globalIdx)}
                              className={`flex border-b border-slate-100 dark:border-slate-700/50 transition hover:bg-slate-50 dark:hover:bg-slate-700/30 ${dragItemIdx === globalIdx ? "opacity-50" : ""}`}
                            >
                              {/* Nome + campos */}
                              <div className="flex-shrink-0 w-[300px] p-2 border-r border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-1">
                                  {isDono && (
                                    <GripVertical className="h-3.5 w-3.5 flex-shrink-0 text-slate-400 cursor-grab" />
                                  )}
                                  <div
                                    className="flex-1 min-w-0 cursor-pointer"
                                    onClick={() => abrirDrawerItem(item)}
                                  >
                                    <input
                                      value={item.nome}
                                      onChange={(e) => {
                                        atualizarItemLocal(item.id, { nome: e.target.value });
                                        salvarItem(item.id, { nome: e.target.value });
                                      }}
                                      disabled={isReadonly}
                                      className="w-full bg-transparent text-sm font-medium text-slate-800 dark:text-slate-200 border-none p-0 focus:outline-none focus:ring-0 placeholder:text-slate-400"
                                      placeholder="Nome do item..."
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                  <button
                                    onClick={() => abrirDrawerItem(item)}
                                    className="flex-shrink-0 text-slate-400 hover:text-[#1f7ad6] transition"
                                  >
                                    <MessageSquare className="h-3 w-3" />
                                  </button>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <input
                                    value={item.grupo}
                                    onChange={(e) => {
                                      atualizarItemLocal(item.id, { grupo: e.target.value });
                                      salvarItem(item.id, { grupo: e.target.value });
                                    }}
                                    disabled={isReadonly}
                                    className="flex-1 bg-transparent text-[11px] text-slate-500 border border-dashed border-transparent hover:border-slate-300 dark:hover:border-slate-600 rounded px-1 py-0.5 focus:border-[#1f7ad6] focus:outline-none"
                                    placeholder={projetoAtivo.campo_agrupamento_label}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <select
                                    value={item.status}
                                    onChange={(e) => {
                                      const v = e.target.value as CronogramaItem["status"];
                                      atualizarItemLocal(item.id, { status: v });
                                      salvarItem(item.id, { status: v });
                                    }}
                                    disabled={isReadonly}
                                    className="text-[10px] border border-slate-200 dark:border-slate-600 rounded bg-transparent px-1 py-0.5 focus:outline-none"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {STATUS_OPCOES.map((s) => (
                                      <option key={s.value} value={s.value}>
                                        {s.label}
                                      </option>
                                    ))}
                                  </select>
                                  <span className="text-[10px] text-slate-400 w-[30px] text-right">
                                    {item.duracao_dias ?? projetoAtivo.duracao_padrao_dias}d
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <input
                                    type="number"
                                    value={item.duracao_dias ?? projetoAtivo.duracao_padrao_dias}
                                    onChange={(e) => {
                                      const v = Number(e.target.value);
                                      atualizarItemLocal(item.id, { duracao_dias: v });
                                      salvarItem(item.id, { duracao_dias: v });
                                    }}
                                    disabled={isReadonly}
                                    min={1}
                                    className="w-16 text-[10px] bg-transparent border border-slate-200 dark:border-slate-600 rounded px-1 py-0.5 focus:border-[#1f7ad6] focus:outline-none"
                                    title="Duração (dias)"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <span className="text-[10px] text-slate-400">
                                    {formatDate(inicio)} → {formatDate(termino)}
                                  </span>
                                </div>
                              </div>

                              {/* Barra do Gantt */}
                              <div
                                className="relative flex-1"
                                style={{ minWidth: ganttWidth, height: 64 }}
                              >
                                <div
                                  className="absolute top-2 rounded h-[48px] cursor-pointer transition-shadow hover:shadow-md group"
                                  style={{
                                    left: offset * colWidth,
                                    width: barWidth,
                                    backgroundColor: cor + "33",
                                    borderLeft: `3px solid ${cor}`,
                                    borderRight: corStatus.border,
                                  }}
                                  onClick={() => abrirDrawerItem(item)}
                                >
                                  {/* Status indicator */}
                                  <div
                                    className={`absolute right-0 top-0 bottom-0 w-[4px] ${corStatus.bg}`}
                                  />
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="h-full flex items-center px-2 gap-1 truncate">
                                          <span className="text-[11px] font-medium text-slate-700 dark:text-slate-200 truncate">
                                            {item.nome}
                                          </span>
                                          <span className={`text-[10px] ${corStatus.text}`}>
                                            {corStatus.icon}
                                          </span>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-xs">
                                          <strong>{item.nome}</strong>
                                        </p>
                                        <p className="text-xs">
                                          {projetoAtivo.campo_agrupamento_label}:{" "}
                                          {item.grupo || "—"}
                                        </p>
                                        <p className="text-xs">Início: {formatDate(inicio)}</p>
                                        <p className="text-xs">Término: {formatDate(termino)}</p>
                                        <p className="text-xs">
                                          Duração:{" "}
                                          {item.duracao_dias ?? projetoAtivo.duracao_padrao_dias}{" "}
                                          dias
                                        </p>
                                        <p className="text-xs">
                                          Status:{" "}
                                          {
                                            STATUS_OPCOES.find((s) => s.value === item.status)
                                              ?.label
                                          }
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>

                                {/* Excluir */}
                                {isDono && (
                                  <button
                                    onClick={() => setExcluirConfirmOpen(item.id)}
                                    className="absolute top-0 right-0 p-1 text-red-400 hover:text-red-600 opacity-0 hover:opacity-100 transition"
                                    title="Excluir item"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialog criar projeto */}
      <Dialog open={criarOpen} onOpenChange={setCriarOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0b3a73] dark:text-white">Novo cronograma</DialogTitle>
            <DialogDescription>Crie um novo projeto de cronograma.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>
                Nome <span className="text-red-500">*</span>
              </label>
              <input
                value={editNome}
                onChange={(e) => setEditNome(e.target.value)}
                className={inputCls}
                placeholder="Ex: Boosters Contêineres — Baixada 2"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>
                  Data base <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={editDataBase}
                  onChange={(e) => setEditDataBase(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Duração padrão (dias) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={editDuracao}
                  onChange={(e) => setEditDuracao(e.target.value)}
                  min={1}
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>
                Rótulo de agrupamento <span className="text-red-500">*</span>
              </label>
              <input
                value={editAgrupamento}
                onChange={(e) => setEditAgrupamento(e.target.value)}
                className={inputCls}
                placeholder="Ex: Município, Fase, Equipe"
              />
            </div>
            <div>
              <label className={labelCls}>Descrição</label>
              <textarea
                value={editDescricao}
                onChange={(e) => setEditDescricao(e.target.value)}
                rows={2}
                className={inputCls + " min-h-[60px]"}
                placeholder="Descrição opcional..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCriarOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCriarProjeto} className="bg-[#0b3a73] hover:bg-[#1f7ad6]">
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog importar */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#0b3a73] dark:text-white">Importar itens</DialogTitle>
            <DialogDescription>
              Selecione uma planilha XLSX ou CSV com colunas: Nome,{" "}
              {projetoAtivo?.campo_agrupamento_label || "Grupo"}, Duração (dias).
            </DialogDescription>
          </DialogHeader>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleImportFile}
            className={inputCls}
          />
        </DialogContent>
      </Dialog>

      {/* Confirmar exclusão item */}
      <Dialog
        open={excluirConfirmOpen !== null}
        onOpenChange={(o) => {
          if (!o) setExcluirConfirmOpen(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">Excluir item?</DialogTitle>
            <DialogDescription>Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExcluirConfirmOpen(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (excluirConfirmOpen) excluirItem(excluirConfirmOpen);
                setExcluirConfirmOpen(null);
              }}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar exclusão projeto */}
      <Dialog open={excluirProjetoConfirmOpen} onOpenChange={setExcluirProjetoConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">Excluir projeto?</DialogTitle>
            <DialogDescription>
              Todos os itens, comentários e histórico serão removidos permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExcluirProjetoConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={excluirProjeto}>
              Excluir projeto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drawer do item */}
      <Dialog open={itemDrawerOpen} onOpenChange={setItemDrawerOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          {itemDrawerItem && projetoAtivo && (
            <>
              <DialogHeader>
                <DialogTitle className="text-[#0b3a73] dark:text-white flex items-center gap-2">
                  <span>{itemDrawerItem.nome || "Item sem nome"}</span>
                  <Badge className={STATUS_CORES[itemDrawerItem.status].text}>
                    {STATUS_OPCOES.find((s) => s.value === itemDrawerItem.status)?.label}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              {/* Tabs */}
              <div className="flex border-b border-slate-200 dark:border-slate-700 mb-4">
                {(["detalhes", "comentarios", "historico"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setItemDrawerTab(tab)}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-b-2 transition ${
                      itemDrawerTab === tab
                        ? "border-[#1f7ad6] text-[#1f7ad6]"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {tab === "detalhes" && <Edit3 className="h-3.5 w-3.5" />}
                    {tab === "comentarios" && <MessageSquare className="h-3.5 w-3.5" />}
                    {tab === "historico" && <History className="h-3.5 w-3.5" />}
                    {tab === "detalhes"
                      ? "Detalhes"
                      : tab === "comentarios"
                        ? "Comentários"
                        : "Histórico"}
                  </button>
                ))}
              </div>

              {itemDrawerTab === "detalhes" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Nome</label>
                      <input
                        value={itemDrawerItem.nome}
                        disabled
                        className={inputCls + " min-h-9"}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>{projetoAtivo.campo_agrupamento_label}</label>
                      <input
                        value={itemDrawerItem.grupo}
                        disabled
                        className={inputCls + " min-h-9"}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Início</label>
                      <input
                        value={formatDate(itemDrawerItem.data_inicio_calculada)}
                        disabled
                        className={inputCls + " min-h-9"}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Término</label>
                      <input
                        value={formatDate(itemDrawerItem.data_termino_calculada)}
                        disabled
                        className={inputCls + " min-h-9"}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Duração (dias)</label>
                      <input
                        value={itemDrawerItem.duracao_dias ?? projetoAtivo.duracao_padrao_dias}
                        disabled
                        className={inputCls + " min-h-9"}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Status</label>
                      <input
                        value={
                          STATUS_OPCOES.find((s) => s.value === itemDrawerItem.status)?.label || ""
                        }
                        disabled
                        className={inputCls + " min-h-9"}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>O.S. Referência</label>
                      <input
                        value={itemDrawerItem.os_referencia || ""}
                        disabled
                        className={inputCls + " min-h-9"}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>RC Referência</label>
                      <input
                        value={itemDrawerItem.rc_referencia || ""}
                        disabled
                        className={inputCls + " min-h-9"}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Responsável</label>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400" />
                      <span className="text-sm">
                        {itemDrawerItem.responsavel_nome || "Não atribuído"}
                      </span>
                    </div>
                  </div>
                  {itemDrawerItem.metadados && (
                    <div>
                      <label className={labelCls}>Metadados</label>
                      <pre className="text-xs bg-slate-100 dark:bg-slate-700 p-2 rounded">
                        {JSON.stringify(itemDrawerItem.metadados, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {itemDrawerTab === "comentarios" && (
                <div>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto mb-4">
                    {comentarios.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-4">
                        Nenhum comentário ainda.
                      </p>
                    )}
                    {comentarios.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 p-3"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-[#0b3a73] dark:text-white">
                            {c.autor_nome || "Desconhecido"}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {c.criado_em ? new Date(c.criado_em).toLocaleString("pt-BR") : ""}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{c.conteudo}</p>
                      </div>
                    ))}
                  </div>
                  {!isReadonly && podesComentar && (
                    <div className="flex gap-2">
                      <input
                        value={novoComentario}
                        onChange={(e) => {
                          setNovoComentario(e.target.value);
                          const match = e.target.value.match(/@(\w+)$/);
                          if (match) {
                            setBuscandoUsuario(match[1]);
                            buscarUsuarios(match[1]);
                          } else {
                            setUsuariosSugestoes([]);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            enviarComentario();
                          }
                        }}
                        placeholder="Comentar... (use @nome para mencionar)"
                        className={inputCls + " min-h-9 flex-1"}
                      />
                      <button
                        onClick={enviarComentario}
                        disabled={!novoComentario.trim()}
                        className="rounded-md bg-[#0b3a73] px-3 py-2 text-white text-xs font-semibold hover:bg-[#1f7ad6] disabled:opacity-40"
                      >
                        Enviar
                      </button>
                    </div>
                  )}
                  {usuariosSugestoes.length > 0 && (
                    <div className="mt-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                      {usuariosSugestoes.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => {
                            setNovoComentario((prev) => prev.replace(/@\w+$/, `@${u.nome} `));
                            setUsuariosSugestoes([]);
                          }}
                          className="block w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          @{u.nome}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {itemDrawerTab === "historico" && (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {auditoria.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4">
                      Nenhuma alteração registrada.
                    </p>
                  )}
                  {auditoria.map((a) => {
                    const campoLabel: Record<string, string> = {
                      nome: "nome",
                      grupo: "grupo",
                      ordem: "ordem",
                      duracao_dias: "duração",
                      data_inicio_calculada: "data de início",
                      data_termino_calculada: "data de término",
                      status: "status",
                      data_inicio_travada: "trava de início",
                      cor_grupo: "cor do grupo",
                      os_referencia: "O.S.",
                      rc_referencia: "RC",
                      responsavel_id: "responsável",
                    };
                    return (
                      <div
                        key={a.id}
                        className="rounded border border-slate-200 dark:border-slate-700 p-2 text-xs"
                      >
                        <span className="font-semibold text-[#0b3a73] dark:text-white">
                          {a.usuario_nome || "Alguém"}
                        </span>
                        <span className="text-slate-500"> alterou </span>
                        <span className="font-medium">
                          {campoLabel[a.campo_alterado] || a.campo_alterado}
                        </span>
                        {a.valor_anterior && a.valor_novo ? (
                          <span className="text-slate-500"> de </span>
                        ) : a.valor_novo ? (
                          <span className="text-slate-500"> para </span>
                        ) : (
                          <span className="text-slate-500"> para </span>
                        )}
                        {a.valor_anterior && (
                          <span className="text-red-500 line-through">{a.valor_anterior}</span>
                        )}
                        {a.valor_anterior && a.valor_novo && (
                          <span className="text-slate-500"> → </span>
                        )}
                        {a.valor_novo && <span className="text-green-600">{a.valor_novo}</span>}
                        <span className="text-slate-400 ml-1">
                          {a.criado_em ? new Date(a.criado_em).toLocaleString("pt-BR") : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CronogramaPage;
