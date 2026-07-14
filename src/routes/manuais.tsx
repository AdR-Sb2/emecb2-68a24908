import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  BookOpen,
  Home,
  Upload,
  Search,
  AlertTriangle,
  Zap,
  Settings,
  Eye,
  CloudLightning,
  FileText,
  Plus,
  X,
  Download,
  Check,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Send,
  Pencil,
  Shield,
  ScrollText,
  FolderPlus,
  ArrowRight,
  Save,
  Trash2,
  Filter,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { temPermissao } from "../lib/permissoes";
import logoHeader from "@/assets/logo-branca.png";

export const Route = createFileRoute("/manuais")({
  component: ManuaisPage,
});

type Categoria = {
  id: number;
  chave: string;
  nome_exibicao: string;
  ordem: number;
};

type Manual = {
  id: number;
  titulo: string;
  descricao: string;
  categoria_id: number;
  fabricante: string | null;
};

type ManualArquivo = {
  id: number;
  manual_id: number;
  arquivo_url: string;
  nome_exibicao: string;
  status: string;
  criado_em: string;
  enviado_por: string;
};

type LogEntry = {
  id: number;
  acao: string;
  detalhes: Record<string, unknown>;
  usuario: string;
  criado_em: string;
};

type Sugestao = {
  id: number;
  tipo: "pdf" | "texto";
  arquivo_url: string | null;
  titulo_sugerido: string | null;
  categoria_sugerida: string | null;
  comentario: string | null;
  status: "pendente" | "aprovado" | "rejeitado";
  enviado_por: string;
  criado_em: string;
};

const NR_CORES: Record<
  string,
  { cor: string; bg: string; icon: React.ComponentType<{ className?: string }> }
> = {
  "NR-06": { cor: "text-amber-700", bg: "bg-amber-50 dark:bg-amber-950/30", icon: Shield },
  "NR-10": { cor: "text-blue-700", bg: "bg-blue-50 dark:bg-blue-950/30", icon: Zap },
  "NR-12": { cor: "text-red-700", bg: "bg-red-50 dark:bg-red-950/30", icon: Settings },
  "NR-33": {
    cor: "text-yellow-700",
    bg: "bg-yellow-50 dark:bg-yellow-950/30",
    icon: AlertTriangle,
  },
  "NR-35": {
    cor: "text-purple-700",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    icon: CloudLightning,
  },
};

function ManuaisPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [manuais, setManuais] = useState<Manual[]>([]);
  const [abaAtiva, setAbaAtiva] = useState("nrs");
  const [search, setSearch] = useState("");
  const [showSugestao, setShowSugestao] = useState(false);
  const [permissoes, setPermissoes] = useState<Map<string, Set<string>>>(new Map());
  const [arquivos, setArquivos] = useState<ManualArquivo[]>([]);

  // Sugestão form
  const [sugTipo, setSugTipo] = useState<"pdf" | "texto">("pdf");
  const [sugArquivo, setSugArquivo] = useState<File | null>(null);
  const [sugTitulo, setSugTitulo] = useState("");
  const [sugCategoria, setSugCategoria] = useState("");
  const [sugComentario, setSugComentario] = useState("");
  const [sugSaving, setSugSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gerenciar arquivos (admin)
  const [gerenciarManualId, setGerenciarManualId] = useState<number | null>(null);
  const [gerUploadFile, setGerUploadFile] = useState<File | null>(null);
  const [gerSaving, setGerSaving] = useState(false);
  const gerFileInputRef = useRef<HTMLInputElement>(null);

  // Modo editor
  const [editMode, setEditMode] = useState(false);
  const [editManualId, setEditManualId] = useState<number | null>(null);
  const [editTitulo, setEditTitulo] = useState("");
  const [editDescricao, setEditDescricao] = useState("");
  const [editCategoriaId, setEditCategoriaId] = useState<number | null>(null);
  const [editFabricante, setEditFabricante] = useState<string>("");

  // Nova categoria
  const [showNovaCategoria, setShowNovaCategoria] = useState(false);
  const [novaCatNome, setNovaCatNome] = useState("");
  const [novaCatSaving, setNovaCatSaving] = useState(false);

  // Novo manual
  const [showNovoManual, setShowNovoManual] = useState(false);
  const [novoManualTitulo, setNovoManualTitulo] = useState("");
  const [novoManualDescricao, setNovoManualDescricao] = useState("");
  const [novoManualSaving, setNovoManualSaving] = useState(false);

  // Ver manuais modal
  const [verManuaisManualId, setVerManuaisManualId] = useState<number | null>(null);

  // Delete categoria
  const [deleteCategoria, setDeleteCategoria] = useState<{
    id: number;
    nome: string;
    manuaisCount: number;
  } | null>(null);

  // Fabricante filter
  const [filtroFabricante, setFiltroFabricante] = useState<string>("TODOS");

  // Apenas com PDF (default baseado na permissão, mas qualquer um pode alternar)
  const [apenasComPdf, setApenasComPdf] = useState(false);
  useEffect(() => {
    const perms = permissoes;
    const temPerm = temPermissao(perms, "manuais", "ver_com_pdf");
    setApenasComPdf(temPerm);
  }, [permissoes]);

  // Gerenciar fabricantes
  const [showGerFabricantes, setShowGerFabricantes] = useState(false);
  const [novoFabricanteNome, setNovoFabricanteNome] = useState("");

  // Histórico
  const [showHistory, setShowHistory] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const sanitizarNome = (nome: string) => nome.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");

  const podeEditarArquivo = useMemo(() => {
    return temPermissao(permissoes, "manuais", "editar_arquivo");
  }, [permissoes]);

  const podeRemoverArquivo = useMemo(() => {
    return temPermissao(permissoes, "manuais", "remover_arquivo");
  }, [permissoes]);

  const podeVerApenasComPdf = useMemo(() => {
    return temPermissao(permissoes, "manuais", "ver_com_pdf");
  }, [permissoes]);

  // --- Carregar dados ---
  const carregarDados = async () => {
    setLoading(true);
    const [catRes, manRes, arqRes] = await Promise.all([
      supabase.from("manuais_categorias").select("*").eq("ativo", true).order("ordem"),
      supabase.from("manuais").select("*").order("titulo"),
      supabase.from("manuais_arquivos").select("*").order("criado_em"),
    ]);
    if (catRes.data) setCategorias(catRes.data);
    if (manRes.data) setManuais(manRes.data);
    if (arqRes.data) setArquivos(arqRes.data);
    setLoading(false);
  };

  // --- Carregar permissões ---
  useEffect(() => {
    if (!profile?.cargo_id) return;
    (async () => {
      const { getPermissoesCargo, clearPermissoesCache } = await import("../lib/permissoes");
      clearPermissoesCache();
      const perms = await getPermissoesCargo(profile.cargo_id);
      setPermissoes(perms);
    })();
  }, [profile?.cargo_id]);

  useEffect(() => {
    carregarDados();
  }, []);

  // --- Abas dinâmicas ---
  const abas = useMemo(() => {
    const list = categorias.map((c) => ({ chave: c.chave, label: c.nome_exibicao }));
    list.push({ chave: "__em_breve", label: "Em breve" });
    return list;
  }, [categorias]);

  const isEmBreve = abaAtiva === "__em_breve";

  // --- Enviar Sugestão ---
  const handleEnviarSugestao = async () => {
    if (sugTipo === "pdf") {
      if (!sugArquivo) {
        toast.error("Selecione um arquivo PDF.");
        return;
      }
      if (!sugTitulo.trim()) {
        toast.error("Informe um título sugerido.");
        return;
      }
    }
    if (sugTipo === "texto" && !sugComentario.trim()) {
      toast.error("Escreva sua sugestão.");
      return;
    }
    setSugSaving(true);

    let arquivoUrl: string | null = null;
    if (sugTipo === "pdf" && sugArquivo) {
      const nomeArquivo = `sugestoes/${Date.now()}_${sanitizarNome(sugArquivo.name)}`;
      const { error: uploadErr } = await supabase.storage
        .from("manuais")
        .upload(nomeArquivo, sugArquivo);
      if (uploadErr) {
        toast.error("Erro ao enviar arquivo: " + uploadErr.message);
        setSugSaving(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("manuais").getPublicUrl(nomeArquivo);
      arquivoUrl = urlData?.publicUrl || null;
    }

    const { error } = await supabase.from("sugestoes").insert({
      tipo: sugTipo,
      arquivo_url: arquivoUrl,
      titulo_sugerido: sugTipo === "pdf" ? sugTitulo.trim() : null,
      categoria_sugerida: sugCategoria.trim() || null,
      comentario: sugComentario.trim() || null,
      enviado_por: user?.email || "",
    });

    if (error) {
      toast.error("Erro ao enviar sugestão: " + error.message);
      setSugSaving(false);
      return;
    }

    toast.success("Sugestão enviada! Nossa equipe vai avaliar.");
    setSugTipo("pdf");
    setSugArquivo(null);
    setSugTitulo("");
    setSugCategoria("");
    setSugComentario("");
    setShowSugestao(false);
    setSugSaving(false);
  };

  // --- Upload PDF no manual (admin) ---
  const handleUploadArquivo = async (manualId: number) => {
    if (!gerUploadFile) {
      toast.error("Selecione um PDF.");
      return;
    }
    setGerSaving(true);
    const nomeArquivo = `manuais/${manualId}_${Date.now()}_${sanitizarNome(gerUploadFile.name)}`;
    const { error: uploadErr } = await supabase.storage
      .from("manuais")
      .upload(nomeArquivo, gerUploadFile);
    if (uploadErr) {
      toast.error("Erro ao enviar PDF: " + uploadErr.message);
      setGerSaving(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("manuais").getPublicUrl(nomeArquivo);
    const arquivoUrl = urlData?.publicUrl || null;

    const { error } = await supabase.from("manuais_arquivos").insert({
      manual_id: manualId,
      arquivo_url: arquivoUrl,
      nome_exibicao: gerUploadFile.name,
      status: "ativo",
      enviado_por: user?.email || "",
    });

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      setGerSaving(false);
      return;
    }

    const manual = manuais.find((m) => m.id === manualId);
    await adicionarLog("adicionou_pdf", {
      manual_id: manualId,
      titulo: manual?.titulo,
      nome_arquivo: gerUploadFile.name,
    });
    toast.success("PDF adicionado com sucesso!");
    setGerUploadFile(null);
    setGerSaving(false);
    await carregarDados();
  };

  // --- Remover arquivo ---
  const handleRemoverArquivo = async (arquivo: ManualArquivo) => {
    if (!podeRemoverArquivo) {
      toast.error("Sem permissão para remover arquivos.");
      return;
    }
    const parts = arquivo.arquivo_url.split("/public/manuais/");
    const storagePath = parts.length > 1 ? parts[1] : null;
    if (storagePath) {
      await supabase.storage.from("manuais").remove([storagePath]);
    }
    const { error } = await supabase.from("manuais_arquivos").delete().eq("id", arquivo.id);
    if (error) {
      toast.error("Erro ao remover: " + error.message);
      return;
    }
    const manual = manuais.find((m) => m.id === arquivo.manual_id);
    await adicionarLog("removeu_pdf", {
      manual_id: arquivo.manual_id,
      titulo: manual?.titulo,
      nome_arquivo: arquivo.nome_exibicao,
    });
    toast.success("Arquivo removido!");
    await carregarDados();
  };

  // --- Alternar status do arquivo (aprovar/rejeitar) ---
  const handleToggleStatus = async (arquivo: ManualArquivo, novoStatus: string) => {
    const { error } = await supabase
      .from("manuais_arquivos")
      .update({ status: novoStatus })
      .eq("id", arquivo.id);
    if (error) {
      toast.error("Erro ao atualizar: " + error.message);
      return;
    }
    toast.success(novoStatus === "ativo" ? "Arquivo ativado!" : "Arquivo rejeitado.");
    await carregarDados();
  };

  // --- Adicionar entrada no log ---
  const adicionarLog = async (acao: string, detalhes: Record<string, unknown> = {}) => {
    await supabase.from("manuais_log").insert({
      acao,
      detalhes,
      usuario: user?.email || "",
    });
  };

  // --- Salvar edição do manual ---
  const handleSalvarManual = async () => {
    if (editManualId === null) return;
    const manual = manuais.find((m) => m.id === editManualId);
    if (!manual) return;

    const updates: Record<string, unknown> = {};
    const detalhes: Record<string, unknown> = { manual_id: editManualId };

    if (editTitulo !== manual.titulo) {
      updates.titulo = editTitulo;
      detalhes.titulo_antigo = manual.titulo;
      detalhes.titulo_novo = editTitulo;
    }
    if (editDescricao !== manual.descricao) {
      updates.descricao = editDescricao;
      detalhes.descricao_antiga = manual.descricao;
      detalhes.descricao_nova = editDescricao;
    }
    if (editCategoriaId !== null && editCategoriaId !== manual.categoria_id) {
      updates.categoria_id = editCategoriaId;
      const catAntiga = categorias.find((c) => c.id === manual.categoria_id);
      const catNova = categorias.find((c) => c.id === editCategoriaId);
      detalhes.categoria_antiga = catAntiga?.nome_exibicao;
      detalhes.categoria_nova = catNova?.nome_exibicao;
    }
    if ((editFabricante || null) !== (manual.fabricante || null)) {
      updates.fabricante = editFabricante || null;
      detalhes.fabricante_antigo = manual.fabricante;
      detalhes.fabricante_novo = editFabricante || null;
    }

    if (Object.keys(updates).length === 0) {
      setEditManualId(null);
      return;
    }

    const { error } = await supabase.from("manuais").update(updates).eq("id", editManualId);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }

    await adicionarLog("editou_manual", detalhes);
    toast.success("Manual atualizado!");
    setEditManualId(null);
    await carregarDados();
  };

  // --- Abrir edição do manual ---
  const handleAbrirEdicao = (manual: Manual) => {
    setEditManualId(manual.id);
    setEditTitulo(manual.titulo);
    setEditDescricao(manual.descricao);
    setEditCategoriaId(manual.categoria_id);
    setEditFabricante(manual.fabricante ?? "");
  };

  // --- Mover manual para outra categoria (atalho rápido) ---
  const handleMoverCategoria = async (manualId: number, novaCategoriaId: number) => {
    const manual = manuais.find((m) => m.id === manualId);
    const catAntiga = categorias.find((c) => c.id === manual?.categoria_id);
    const catNova = categorias.find((c) => c.id === novaCategoriaId);
    if (!manual || !catNova || manual.categoria_id === novaCategoriaId) return;

    const { error } = await supabase
      .from("manuais")
      .update({ categoria_id: novaCategoriaId })
      .eq("id", manualId);
    if (error) {
      toast.error("Erro ao mover: " + error.message);
      return;
    }
    await adicionarLog("moveu_manual", {
      manual_id: manualId,
      titulo: manual.titulo,
      categoria_antiga: catAntiga?.nome_exibicao,
      categoria_nova: catNova.nome_exibicao,
    });
    toast.success(`"${manual.titulo}" movido para "${catNova.nome_exibicao}"`);
    await carregarDados();
  };

  // --- Criar nova categoria ---
  const handleCriarCategoria = async () => {
    if (!novaCatNome.trim()) {
      toast.error("Informe o nome da categoria.");
      return;
    }
    setNovaCatSaving(true);
    const chave = novaCatNome.trim().toLowerCase().replace(/\s+/g, "_");
    const { error } = await supabase.from("manuais_categorias").insert({
      chave,
      nome_exibicao: novaCatNome.trim(),
      ordem: categorias.length + 1,
    });
    if (error) {
      toast.error("Erro ao criar categoria: " + error.message);
      setNovaCatSaving(false);
      return;
    }
    await adicionarLog("criou_categoria", { nome: novaCatNome.trim(), chave });
    toast.success(`Categoria "${novaCatNome.trim()}" criada!`);
    setNovaCatNome("");
    setShowNovaCategoria(false);
    setNovaCatSaving(false);
    await carregarDados();
  };

  // --- Criar novo manual dentro da categoria atual ---
  const handleCriarManual = async () => {
    if (!novoManualTitulo.trim()) {
      toast.error("Informe o título do manual.");
      return;
    }
    const cat = categorias.find((c) => c.chave === abaAtiva);
    if (!cat) {
      toast.error("Selecione uma categoria.");
      return;
    }
    setNovoManualSaving(true);
    const { error } = await supabase.from("manuais").insert({
      titulo: novoManualTitulo.trim(),
      descricao: novoManualDescricao.trim(),
      categoria_id: cat.id,
    });
    if (error) {
      toast.error("Erro ao criar manual: " + error.message);
      setNovoManualSaving(false);
      return;
    }
    await adicionarLog("criou_manual", {
      titulo: novoManualTitulo.trim(),
      categoria: cat.nome_exibicao,
    });
    toast.success(`Manual "${novoManualTitulo.trim()}" criado!`);
    setNovoManualTitulo("");
    setNovoManualDescricao("");
    setShowNovoManual(false);
    setNovoManualSaving(false);
    await carregarDados();
  };

  // --- Excluir categoria ---
  const handleExcluirCategoria = async () => {
    if (!deleteCategoria) return;
    const { error } = await supabase
      .from("manuais_categorias")
      .delete()
      .eq("id", deleteCategoria.id);
    if (error) {
      toast.error("Erro ao excluir categoria: " + error.message);
      setDeleteCategoria(null);
      return;
    }
    await adicionarLog("removeu_categoria", { nome: deleteCategoria.nome });
    toast.success(`Categoria "${deleteCategoria.nome}" excluída!`);
    if (abaAtiva === categorias.find((c) => c.id === deleteCategoria.id)?.chave) {
      setAbaAtiva("nrs");
    }
    setDeleteCategoria(null);
    await carregarDados();
  };

  // --- Remover fabricante de todos os manuais ---
  const handleRemoverFabricante = async (fabricante: string) => {
    const count = manuais.filter((m) => m.fabricante === fabricante).length;
    if (!confirm(`Remover o filtro "${fabricante}" de todos os ${count} manuais?`)) return;
    const { error } = await supabase
      .from("manuais")
      .update({ fabricante: null })
      .eq("fabricante", fabricante);
    if (error) {
      toast.error("Erro ao remover fabricante: " + error.message);
      return;
    }
    toast.success(`Filtro "${fabricante}" removido de ${count} manuais.`);
    setShowGerFabricantes(false);
    await carregarDados();
  };

  const carregarLogs = async () => {
    const { data } = await supabase
      .from("manuais_log")
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(200);
    if (data) setLogs(data);
  };

  const podeMostrar = profile?.cargo_id && permissoes.size > 0;

  // --- Fabricantes únicos da categoria ativa ---
  const fabricantesDaCategoria = useMemo(() => {
    const cat = categorias.find((c) => c.chave === abaAtiva);
    if (!cat) return [];
    const set = new Set<string>();
    manuais
      .filter((m) => m.categoria_id === cat.id && m.fabricante)
      .forEach((m) => set.add(m.fabricante!));
    return Array.from(set).sort();
  }, [manuais, categorias, abaAtiva]);

  // --- Manuais filtrados (incluindo por fabricante e PDF) ---
  const manuaisFiltrados = useMemo(() => {
    const cat = categorias.find((c) => c.chave === abaAtiva);
    if (!cat) return [];
    let lista = manuais.filter((m) => m.categoria_id === cat.id);
    if (filtroFabricante !== "TODOS") {
      lista = lista.filter((m) => m.fabricante === filtroFabricante);
    }
    if (apenasComPdf) {
      const manualsComPdf = new Set(
        arquivos.filter((a) => a.status === "ativo").map((a) => a.manual_id),
      );
      lista = lista.filter((m) => manualsComPdf.has(m.id));
    }
    if (search) {
      const q = search.toLowerCase();
      lista = lista.filter((m) => m.titulo.toLowerCase().includes(q));
    }
    return lista;
  }, [manuais, categorias, abaAtiva, filtroFabricante, search, arquivos, apenasComPdf]);

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
              <p className="truncate text-sm text-cyan-50/90">Eletromecânica · Manuais e Normas</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {podeEditarArquivo && (
              <button
                onClick={() => {
                  setShowHistory(true);
                  carregarLogs();
                }}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[#0b3a73] shadow-md ring-1 ring-black/10 backdrop-blur transition hover:scale-105 hover:bg-white"
                title="Histórico de alterações"
              >
                <ScrollText className="h-5 w-5" />
              </button>
            )}
            <Link
              to="/"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[#0b3a73] shadow-md ring-1 ring-black/10 backdrop-blur transition hover:scale-105 hover:bg-white"
            >
              <Home className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Título e ações */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-[#1f7ad6]" />
          <h2 className="text-lg font-bold text-[#0b3a73] dark:text-white">Manuais Técnicos</h2>
          {editMode && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
              MODO EDIÇÃO
            </span>
          )}
          {apenasComPdf && (
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:bg-sky-900/40 dark:text-sky-400" title="Você está vendo apenas manuais que possuem PDF">
              APENAS COM PDF
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {podeEditarArquivo && (
            <Link
              to="/manuais-avaliacao"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <ThumbsUp className="h-4 w-4" />
              Avaliar
            </Link>
          )}
          {podeEditarArquivo && (
            <button
              onClick={() => setEditMode(!editMode)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-[13px] font-semibold shadow-sm cursor-pointer ${
                editMode
                  ? "bg-amber-500 text-white hover:bg-amber-600"
                  : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
              }`}
            >
              <Pencil className="h-4 w-4" />
              {editMode ? "Sair da Edição" : "Editar"}
            </button>
          )}
          <button
            onClick={() => setShowSugestao(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#1f7ad6] px-3 py-2 text-[13px] font-semibold text-white shadow-sm hover:bg-[#0b3a73] cursor-pointer"
          >
            <Send className="h-4 w-4" />
            Enviar Sugestão
          </button>
        </div>
      </div>

      {/* Busca */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título do manual..."
          className="h-10 w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm text-slate-700 outline-none ring-[#1f7ad6] focus:ring-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-400"
        />
      </div>

      {/* Abas */}
      <div className="mb-6 flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-700">
        {abas.map((aba) => {
          const isRealCategory = aba.chave !== "__em_breve";
          const cat = categorias.find((c) => c.chave === aba.chave);
          return (
            <div key={aba.chave} className="relative flex items-center">
              <button
                onClick={() => setAbaAtiva(aba.chave)}
                className={`px-4 py-2.5 text-[13px] font-semibold transition-colors cursor-pointer border-b-2 ${
                  abaAtiva === aba.chave
                    ? "border-[#1f7ad6] text-[#1f7ad6]"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {aba.label}
              </button>
              {editMode && isRealCategory && cat && (
                <button
                  onClick={() =>
                    setDeleteCategoria({
                      id: cat.id,
                      nome: cat.nome_exibicao,
                      manuaisCount: manuais.filter((m) => m.categoria_id === cat.id).length,
                    })
                  }
                  className="ml-0.5 rounded-full p-0.5 text-red-300 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/40 cursor-pointer"
                  title={`Excluir "${cat.nome_exibicao}"`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
        {editMode && (
          <button
            onClick={() => setShowNovaCategoria(true)}
            className="px-4 py-2.5 text-[13px] font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer border-b-2 border-transparent hover:border-emerald-400 flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Nova Categoria
          </button>
        )}
        {editMode && !isEmBreve && (
          <button
            onClick={() => {
              setNovoManualTitulo("");
              setNovoManualDescricao("");
              setShowNovoManual(true);
            }}
            className="px-4 py-2.5 text-[13px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer border-b-2 border-transparent hover:border-blue-400 flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Novo Manual
          </button>
        )}
      </div>

      {/* Fabricante filter pills + Apenas com PDF */}
      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        {fabricantesDaCategoria.length > 0 && (
          <>
            <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            {["TODOS", ...fabricantesDaCategoria].map((fab) => (
            <button
              key={fab}
              onClick={() => setFiltroFabricante(fab)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                filtroFabricante === fab
                  ? "bg-[#1f7ad6] text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
              }`}
            >
              {fab === "TODOS" ? "Todos" : fab}
            </button>
          ))}
          {editMode && (
            <button
              onClick={() => {
                setNovoFabricanteNome("");
                setShowGerFabricantes(true);
              }}
              className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition cursor-pointer"
              title="Gerenciar fabricantes"
            >
              <Plus className="h-3 w-3 inline" /> Editar filtros
            </button>
          )}
        </>
      )}
      <button
        onClick={() => setApenasComPdf((p) => !p)}
        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
          apenasComPdf
            ? "bg-sky-500 text-white shadow-sm"
            : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600"
        }`}
        title="Mostrar apenas manuais que possuem PDF"
      >
        {apenasComPdf ? "✓" : "○"} Apenas com PDF
      </button>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#1f7ad6]" />
        </div>
      ) : isEmBreve ? (
        <div className="flex flex-col items-center gap-3 py-20 text-slate-400 dark:text-slate-500">
          <BookOpen className="h-14 w-14" />
          <p className="text-lg font-semibold text-slate-500 dark:text-slate-400">
            Novas categorias de manuais chegando em breve
          </p>
          <p className="text-sm">Fique atento às novidades!</p>
        </div>
      ) : manuaisFiltrados.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-slate-400">
          <Search className="h-10 w-10" />
          <p className="text-sm font-medium">
            {search
              ? `Nenhum manual encontrado para "${search}"`
              : "Nenhum manual disponível nesta categoria."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {manuaisFiltrados.map((manual) => {
            const cor = NR_CORES[manual.titulo] || {
              cor: "text-slate-700",
              bg: "bg-slate-50 dark:bg-slate-800/50",
              icon: FileText,
            };
            const Icone = cor.icon;
            return (
              <div
                key={manual.id}
                className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
              >
                {/* Botão gerenciar arquivos */}
                {(podeEditarArquivo || editMode) && (
                  <button
                    onClick={() => setGerenciarManualId(manual.id)}
                    className={`absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-slate-400 shadow-sm transition hover:bg-white hover:text-[#1f7ad6] dark:bg-slate-700/80 dark:hover:bg-slate-700 ${
                      editMode ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                    title="Gerenciar arquivos"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
                <div className={`${cor.bg} p-4`}>
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${cor.bg}`}
                    >
                      <Icone className={`h-5 w-5 ${cor.cor}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      {editMode && editManualId === manual.id ? (
                        <div className="space-y-2">
                          <input
                            value={editTitulo}
                            onChange={(e) => setEditTitulo(e.target.value)}
                            className="w-full rounded border border-slate-300 px-2 py-1 text-sm font-bold text-slate-800 outline-none ring-[#1f7ad6] focus:ring-2 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-100"
                          />
                          <input
                            value={editDescricao}
                            onChange={(e) => setEditDescricao(e.target.value)}
                            className="w-full rounded border border-slate-300 px-2 py-1 text-[12px] text-slate-600 outline-none ring-[#1f7ad6] focus:ring-2 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-300"
                          />
                          <div className="flex flex-wrap gap-1">
                            <select
                              value={editCategoriaId ?? ""}
                              onChange={(e) => setEditCategoriaId(Number(e.target.value))}
                              className="flex-1 rounded border border-slate-300 px-1 py-1 text-[11px] outline-none dark:border-slate-500 dark:bg-slate-700 dark:text-slate-200"
                            >
                              {categorias.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.nome_exibicao}
                                </option>
                              ))}
                            </select>
                            <select
                              value={editFabricante}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "__novo") {
                                  const nome = prompt("Nome do novo fabricante:");
                                  if (nome && nome.trim()) {
                                    setEditFabricante(nome.trim().toUpperCase());
                                  }
                                } else {
                                  setEditFabricante(val);
                                }
                              }}
                              className="flex-1 rounded border border-slate-300 px-1 py-1 text-[11px] outline-none dark:border-slate-500 dark:bg-slate-700 dark:text-slate-200"
                            >
                              <option value="">Sem fabricante</option>
                              {[...new Set(manuais.map((m) => m.fabricante).filter((x): x is string => !!x))].sort().map((f) => (
                                <option key={f} value={f}>{f}</option>
                              ))}
                              <option value="__novo">+ Novo fabricante</option>
                            </select>
                            <button
                              onClick={handleSalvarManual}
                              className="rounded bg-emerald-600 px-2 py-1 text-white hover:bg-emerald-700"
                              title="Salvar"
                            >
                              <Save className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setEditManualId(null)}
                              className="rounded bg-slate-300 px-2 py-1 text-slate-600 hover:bg-slate-400 dark:bg-slate-600 dark:text-slate-300"
                              title="Cancelar"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                              {manual.titulo}
                            </h3>
                            <p className="text-[12px] text-slate-500 dark:text-slate-400">
                              {manual.descricao}
                            </p>
                            {manual.fabricante && (
                              <span className="mt-0.5 inline-block rounded bg-slate-200/60 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-600/60 dark:text-slate-300">
                                {manual.fabricante}
                              </span>
                            )}
                          </div>
                          {editMode && (
                            <button
                              onClick={() => handleAbrirEdicao(manual)}
                              className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-[#1f7ad6] dark:hover:bg-slate-600"
                              title="Editar manual"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-4 pt-3 space-y-1.5">
                  {(() => {
                    const ativos = arquivos.filter(
                      (a) => a.manual_id === manual.id && a.status === "ativo",
                    );
                    if (ativos.length === 0) {
                      return (
                        <div className="flex items-center justify-center gap-1.5 rounded-md bg-slate-100 px-3 py-2 text-[12px] font-medium text-slate-400 dark:bg-slate-700 dark:text-slate-500">
                          <FileText className="h-3.5 w-3.5" />
                          PDF pendente de upload
                        </div>
                      );
                    }
                    if (ativos.length === 1) {
                      const arq = ativos[0];
                      return (
                        <div className="flex items-center gap-1">
                          <a
                            href={arq.arquivo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 inline-flex items-center gap-1.5 rounded-md bg-[#1f7ad6] px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#0b3a73] overflow-hidden"
                          >
                            <Eye className="h-3 w-3 shrink-0" />
                            <span className="truncate">{arq.nome_exibicao || "Abrir PDF"}</span>
                          </a>
                          {podeRemoverArquivo && (
                            <button
                              onClick={() => handleRemoverArquivo(arq)}
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 dark:bg-red-950/30 dark:hover:bg-red-950/50"
                              title="Remover arquivo"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      );
                    }
                    return (
                      <button
                        onClick={() => setVerManuaisManualId(manual.id)}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-gradient-to-r from-[#1f7ad6] to-[#0b3a73] px-3 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
                      >
                        <Eye className="h-4 w-4" />
                        Ver manuais ({ativos.length})
                      </button>
                    );
                  })()}

                  {/* Mover para outra categoria (modo edição) */}
                  {editMode && editManualId !== manual.id && (
                    <div className="flex items-center gap-1 pt-1">
                      <ArrowRight className="h-3 w-3 shrink-0 text-slate-400" />
                      <select
                        value=""
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) handleMoverCategoria(manual.id, Number(val));
                        }}
                        className="flex-1 rounded border border-slate-200 px-1 py-1 text-[11px] text-slate-500 outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400"
                      >
                        <option value="">Mover para...</option>
                        {categorias
                          .filter((c) => c.id !== manual.categoria_id)
                          .map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.nome_exibicao}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Gerenciar Arquivos */}
      {gerenciarManualId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg dark:bg-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#0b3a73] dark:text-white">
                Gerenciar Arquivos
              </h3>
              <button
                onClick={() => {
                  setGerenciarManualId(null);
                  setGerUploadFile(null);
                }}
                className="cursor-pointer text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Upload novo arquivo */}
            <div className="mb-4 rounded-lg border-2 border-dashed border-slate-200 p-4 dark:border-slate-600">
              <p className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                Adicionar novo PDF
              </p>
              <input
                ref={gerFileInputRef}
                type="file"
                accept=".pdf"
                onChange={(e) => setGerUploadFile(e.target.files?.[0] || null)}
                className="mb-2 w-full text-sm file:mr-2 file:rounded file:border-0 file:bg-[#1f7ad6] file:px-2 file:py-1 file:text-xs file:text-white"
              />
              {gerUploadFile && (
                <div className="flex items-center gap-2">
                  <p className="flex-1 truncate text-[11px] text-slate-500">{gerUploadFile.name}</p>
                  <button
                    onClick={() => handleUploadArquivo(gerenciarManualId)}
                    disabled={gerSaving}
                    className="rounded-md bg-[#1f7ad6] px-3 py-1 text-xs font-semibold text-white hover:bg-[#0b3a73] disabled:opacity-50 cursor-pointer"
                  >
                    {gerSaving ? "Enviando..." : "Enviar"}
                  </button>
                </div>
              )}
            </div>

            {/* Lista de arquivos */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {arquivos
                .filter((a) => a.manual_id === gerenciarManualId)
                .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
                .map((arq) => (
                  <div
                    key={arq.id}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 dark:border-slate-600"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-slate-700 dark:text-slate-200">
                        {arq.nome_exibicao || "Sem nome"}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span
                          className={`rounded px-1 py-0.5 text-[10px] font-semibold ${
                            arq.status === "ativo"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                              : arq.status === "rejeitado"
                                ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                                : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400"
                          }`}
                        >
                          {arq.status}
                        </span>
                        <span>{new Date(arq.criado_em).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <a
                        href={arq.arquivo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-[#1f7ad6] dark:hover:bg-slate-600"
                        title="Visualizar"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </a>
                      {podeEditarArquivo && arq.status !== "ativo" && (
                        <button
                          onClick={() => handleToggleStatus(arq, "ativo")}
                          className="flex h-7 w-7 items-center justify-center rounded text-green-400 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-950/30"
                          title="Aprovar"
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {podeEditarArquivo && arq.status !== "rejeitado" && (
                        <button
                          onClick={() => handleToggleStatus(arq, "rejeitado")}
                          className="flex h-7 w-7 items-center justify-center rounded text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                          title="Rejeitar"
                        >
                          <ThumbsDown className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {podeRemoverArquivo && (
                        <button
                          onClick={() => handleRemoverArquivo(arq)}
                          className="flex h-7 w-7 items-center justify-center rounded text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                          title="Remover"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              {arquivos.filter((a) => a.manual_id === gerenciarManualId).length === 0 && (
                <p className="py-4 text-center text-sm text-slate-400">
                  Nenhum arquivo enviado ainda.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver Manuais */}
      {verManuaisManualId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg dark:bg-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#0b3a73] dark:text-white flex items-center gap-2">
                <Eye className="h-5 w-5 text-[#1f7ad6]" />
                {(() => {
                  const m = manuais.find((x) => x.id === verManuaisManualId);
                  return m ? m.titulo : "Manuais";
                })()}
              </h3>
              <button
                onClick={() => setVerManuaisManualId(null)}
                className="cursor-pointer text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {(() => {
                const ativos = arquivos.filter(
                  (a) => a.manual_id === verManuaisManualId && a.status === "ativo",
                );
                if (ativos.length === 0) {
                  return (
                    <p className="py-8 text-center text-sm text-slate-400">
                      Nenhum PDF disponível.
                    </p>
                  );
                }
                return ativos.map((arq) => (
                  <div
                    key={arq.id}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 transition hover:border-[#1f7ad6] hover:shadow-sm dark:border-slate-600"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eaf3fb] dark:bg-slate-700">
                      <FileText className="h-5 w-5 text-[#1f7ad6]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {arq.nome_exibicao || "Sem nome"}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {new Date(arq.criado_em).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <a
                      href={arq.arquivo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md bg-[#1f7ad6] px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#0b3a73]"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Abrir
                    </a>
                    {podeRemoverArquivo && (
                      <button
                        onClick={() => {
                          handleRemoverArquivo(arq);
                          setVerManuaisManualId(null);
                        }}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 dark:bg-red-950/30 dark:hover:bg-red-950/50"
                        title="Remover arquivo"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal Histórico */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-lg dark:bg-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#0b3a73] dark:text-white">
                <ScrollText className="mr-2 inline h-5 w-5" />
                Histórico de Alterações
              </h3>
              <button
                onClick={() => setShowHistory(false)}
                className="cursor-pointer text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">
                  Nenhuma alteração registrada.
                </p>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 rounded-lg border border-slate-100 p-3 dark:border-slate-700"
                  >
                    <div className="mt-0.5 shrink-0">
                      {log.acao === "adicionou_pdf" && <Upload className="h-4 w-4 text-blue-500" />}
                      {log.acao === "removeu_pdf" && <X className="h-4 w-4 text-red-500" />}
                      {log.acao === "editou_manual" && (
                        <Pencil className="h-4 w-4 text-amber-500" />
                      )}
                      {log.acao === "moveu_manual" && (
                        <ArrowRight className="h-4 w-4 text-purple-500" />
                      )}
                      {log.acao === "criou_categoria" && (
                        <FolderPlus className="h-4 w-4 text-emerald-500" />
                      )}
                      {log.acao === "criou_manual" && (
                        <Plus className="h-4 w-4 text-blue-500" />
                      )}
                      {log.acao === "removeu_categoria" && (
                        <Trash2 className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-slate-700 dark:text-slate-200">
                        {log.acao === "adicionou_pdf" &&
                          `Adicionou PDF "${log.detalhes?.nome_arquivo}" ao "${log.detalhes?.titulo}"`}
                        {log.acao === "removeu_pdf" &&
                          `Removeu PDF "${log.detalhes?.nome_arquivo}" do "${log.detalhes?.titulo}"`}
                        {log.acao === "editou_manual" && (
                          <>
                            Editou "{log.detalhes?.titulo_antigo || log.detalhes?.titulo_novo}"
                            {log.detalhes?.titulo_antigo !== log.detalhes?.titulo_novo &&
                              ` ("${log.detalhes?.titulo_antigo}" → "${log.detalhes?.titulo_novo}")`}
                          </>
                        )}
                        {log.acao === "moveu_manual" &&
                          `Moveu "${log.detalhes?.titulo}" de "${log.detalhes?.categoria_antiga}" para "${log.detalhes?.categoria_nova}"`}
                        {log.acao === "criou_categoria" &&
                          `Criou categoria "${log.detalhes?.nome}"`}
                        {log.acao === "criou_manual" &&
                          `Criou manual "${log.detalhes?.titulo}" em "${log.detalhes?.categoria}"`}
                        {log.acao === "removeu_categoria" &&
                          `Removeu categoria "${log.detalhes?.nome}"`}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {log.usuario} · {new Date(log.criado_em).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Categoria */}
      {showNovaCategoria && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg dark:bg-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#0b3a73] dark:text-white">
                <FolderPlus className="mr-2 inline h-5 w-5 text-emerald-500" />
                Nova Categoria
              </h3>
              <button
                onClick={() => {
                  setShowNovaCategoria(false);
                  setNovaCatNome("");
                }}
                className="cursor-pointer text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <input
              value={novaCatNome}
              onChange={(e) => setNovaCatNome(e.target.value)}
              placeholder="Nome da nova categoria (ex: NR's, Segurança, etc.)"
              className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-400 focus:ring-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCriarCategoria}
                disabled={novaCatSaving || !novaCatNome.trim()}
                className="flex-1 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
              >
                {novaCatSaving ? "Criando..." : "Criar Categoria"}
              </button>
              <button
                onClick={() => {
                  setShowNovaCategoria(false);
                  setNovaCatNome("");
                }}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Manual */}
      {showNovoManual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg dark:bg-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#0b3a73] dark:text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-500" />
                Novo Manual
              </h3>
              <button
                onClick={() => {
                  setShowNovoManual(false);
                  setNovoManualTitulo("");
                  setNovoManualDescricao("");
                }}
                className="cursor-pointer text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-[13px] text-slate-500 dark:text-slate-400">
              Adicionar novo manual em{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {categorias.find((c) => c.chave === abaAtiva)?.nome_exibicao || ""}
              </span>
            </p>
            <input
              value={novoManualTitulo}
              onChange={(e) => setNovoManualTitulo(e.target.value)}
              placeholder="Título do manual (ex: NR-10, CFW500, etc.)"
              className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-400 focus:ring-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            />
            <input
              value={novoManualDescricao}
              onChange={(e) => setNovoManualDescricao(e.target.value)}
              placeholder="Descrição (opcional)"
              className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-400 focus:ring-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCriarManual}
                disabled={novoManualSaving || !novoManualTitulo.trim()}
                className="flex-1 rounded-md bg-[#1f7ad6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b3a73] disabled:opacity-50 cursor-pointer"
              >
                {novoManualSaving ? "Criando..." : "Criar Manual"}
              </button>
              <button
                onClick={() => {
                  setShowNovoManual(false);
                  setNovoManualTitulo("");
                  setNovoManualDescricao("");
                }}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Excluir Categoria */}
      {deleteCategoria && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg dark:bg-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Excluir Categoria
              </h3>
              <button
                onClick={() => setDeleteCategoria(null)}
                className="cursor-pointer text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">
              Tem certeza que deseja excluir a categoria{" "}
              <span className="font-bold text-slate-800 dark:text-slate-100">
                "{deleteCategoria.nome}"
              </span>
              ?
            </p>
            <p className="mb-6 text-sm text-red-500">
              {deleteCategoria.manuaisCount > 0
                ? `${deleteCategoria.manuaisCount} manual(is) serão excluídos permanentemente, incluindo todos os PDFs vinculados.`
                : "Nenhum manual vinculado. A categoria vazia será removida."}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleExcluirCategoria}
                className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 cursor-pointer"
              >
                Sim, excluir
              </button>
              <button
                onClick={() => setDeleteCategoria(null)}
                className="flex-1 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gerenciar Fabricantes */}
      {showGerFabricantes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg dark:bg-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#0b3a73] dark:text-white flex items-center gap-2">
                <Filter className="h-5 w-5 text-[#1f7ad6]" />
                Gerenciar Fabricantes
              </h3>
              <button
                onClick={() => setShowGerFabricantes(false)}
                className="cursor-pointer text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
              {fabricantesDaCategoria.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">
                  Nenhum fabricante configurado. Adicione um novo abaixo.
                </p>
              ) : (
                fabricantesDaCategoria.map((fab) => {
                  const count = manuais.filter((m) => m.fabricante === fab).length;
                  return (
                    <div
                      key={fab}
                      className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600"
                    >
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {fab}
                        <span className="ml-2 text-[11px] text-slate-400">({count} manuais)</span>
                      </span>
                      <button
                        onClick={() => handleRemoverFabricante(fab)}
                        className="flex h-7 w-7 items-center justify-center rounded text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 cursor-pointer"
                        title={`Remover "${fab}" de todos os manuais`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
            <div className="flex gap-2">
              <input
                value={novoFabricanteNome}
                onChange={(e) => setNovoFabricanteNome(e.target.value.toUpperCase())}
                placeholder="Novo fabricante (ex: ABB)"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-400 focus:ring-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const nome = novoFabricanteNome.trim();
                    if (nome) {
                      const cat = categorias.find((c) => c.chave === abaAtiva);
                      if (cat) {
                        const manual = manuais.find((m) => m.categoria_id === cat.id);
                        if (manual) {
                          supabase
                            .from("manuais")
                            .update({ fabricante: nome })
                            .eq("id", manual.id)
                            .then(() => carregarDados());
                        }
                      }
                      setNovoFabricanteNome("");
                    }
                  }
                }}
              />
              <button
                onClick={async () => {
                  const nome = novoFabricanteNome.trim();
                  if (!nome) return;
                  const cat = categorias.find((c) => c.chave === abaAtiva);
                  if (!cat) return;
                  const algumManual = manuais.find((m) => m.categoria_id === cat.id);
                  if (algumManual) {
                    await supabase
                      .from("manuais")
                      .update({ fabricante: nome })
                      .eq("id", algumManual.id);
                    await carregarDados();
                  }
                  setNovoFabricanteNome("");
                  toast.success(`Fabricante "${nome}" adicionado à lista.`);
                }}
                className="rounded-md bg-[#1f7ad6] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0b3a73] cursor-pointer"
              >
                Adicionar
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Digite o nome e clique em "Adicionar" ou pressione Enter. O fabricante será atribuído
              ao primeiro manual da categoria para ficar disponível na lista.
            </p>
          </div>
        </div>
      )}

      {/* Modal Sugestão */}
      {showSugestao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg dark:bg-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#0b3a73] dark:text-white">Enviar Sugestão</h3>
              <button
                onClick={() => setShowSugestao(false)}
                className="cursor-pointer text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Abas de tipo */}
            <div className="mb-4 flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-700">
              <button
                onClick={() => setSugTipo("pdf")}
                className={`flex-1 rounded-md px-3 py-1.5 text-[13px] font-semibold transition cursor-pointer ${
                  sugTipo === "pdf"
                    ? "bg-white text-[#1f7ad6] shadow-sm dark:bg-slate-600 dark:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                }`}
              >
                Enviar PDF
              </button>
              <button
                onClick={() => setSugTipo("texto")}
                className={`flex-1 rounded-md px-3 py-1.5 text-[13px] font-semibold transition cursor-pointer ${
                  sugTipo === "texto"
                    ? "bg-white text-[#1f7ad6] shadow-sm dark:bg-slate-600 dark:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                }`}
              >
                Sugestão escrita
              </button>
            </div>

            {sugTipo === "pdf" ? (
              <div className="space-y-3">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 p-6 text-slate-400 transition hover:border-[#1f7ad6] hover:text-[#1f7ad6] dark:border-slate-600"
                >
                  <Upload className="h-8 w-8" />
                  <p className="text-sm font-medium">
                    {sugArquivo ? sugArquivo.name : "Clique para selecionar PDF"}
                  </p>
                  {sugArquivo && (
                    <p className="text-xs text-slate-400">
                      {(sugArquivo.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => setSugArquivo(e.target.files?.[0] || null)}
                />
                <input
                  type="text"
                  value={sugTitulo}
                  onChange={(e) => setSugTitulo(e.target.value)}
                  placeholder="Título sugerido *"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-[#1f7ad6] focus:ring-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                />
                <input
                  type="text"
                  value={sugCategoria}
                  onChange={(e) => setSugCategoria(e.target.value)}
                  placeholder="Categoria sugerida (opcional)"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-[#1f7ad6] focus:ring-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                />
                <textarea
                  value={sugComentario}
                  onChange={(e) => setSugComentario(e.target.value)}
                  placeholder="Comentário / justificativa (opcional)"
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-[#1f7ad6] focus:ring-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={sugComentario}
                  onChange={(e) => setSugComentario(e.target.value)}
                  placeholder="Descreva sua sugestão, melhoria ou pedido de manual..."
                  rows={5}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-[#1f7ad6] focus:ring-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                />
                <input
                  type="text"
                  value={sugTitulo}
                  onChange={(e) => setSugTitulo(e.target.value)}
                  placeholder="Título sugerido (opcional)"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-[#1f7ad6] focus:ring-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                />
                <input
                  type="text"
                  value={sugCategoria}
                  onChange={(e) => setSugCategoria(e.target.value)}
                  placeholder="Categoria sugerida (opcional)"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-[#1f7ad6] focus:ring-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                />
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                onClick={handleEnviarSugestao}
                disabled={sugSaving}
                className="flex-1 rounded-md bg-[#1f7ad6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b3a73] disabled:opacity-50 cursor-pointer"
              >
                {sugSaving ? "Enviando..." : "Enviar Sugestão"}
              </button>
              <button
                onClick={() => setShowSugestao(false)}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
