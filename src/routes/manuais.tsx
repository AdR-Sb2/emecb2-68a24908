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
  arquivo_url: string | null;
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

const NR_CORES: Record<string, { cor: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  "NR-06": { cor: "text-amber-700", bg: "bg-amber-50 dark:bg-amber-950/30", icon: Shield },
  "NR-10": { cor: "text-blue-700", bg: "bg-blue-50 dark:bg-blue-950/30", icon: Zap },
  "NR-12": { cor: "text-red-700", bg: "bg-red-50 dark:bg-red-950/30", icon: Settings },
  "NR-33": { cor: "text-yellow-700", bg: "bg-yellow-50 dark:bg-yellow-950/30", icon: AlertTriangle },
  "NR-35": { cor: "text-purple-700", bg: "bg-purple-50 dark:bg-purple-950/30", icon: CloudLightning },
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

  // Sugestão form
  const [sugTipo, setSugTipo] = useState<"pdf" | "texto">("pdf");
  const [sugArquivo, setSugArquivo] = useState<File | null>(null);
  const [sugTitulo, setSugTitulo] = useState("");
  const [sugCategoria, setSugCategoria] = useState("");
  const [sugComentario, setSugComentario] = useState("");
  const [sugSaving, setSugSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload PDF (admin)
  const [uploadManualId, setUploadManualId] = useState<number | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadSaving, setUploadSaving] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const sanitizarNome = (nome: string) =>
    nome.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");

  const podeEditarArquivo = useMemo(() => {
    return temPermissao(permissoes, "manuais", "editar_arquivo");
  }, [permissoes]);

  // --- Carregar dados ---
  const carregarDados = async () => {
    setLoading(true);
    const [catRes, manRes] = await Promise.all([
      supabase.from("manuais_categorias").select("*").eq("ativo", true).order("ordem"),
      supabase.from("manuais").select("*").order("titulo"),
    ]);
    if (catRes.data) setCategorias(catRes.data);
    if (manRes.data) setManuais(manRes.data);
    setLoading(false);
  };

  // --- Carregar permissões ---
  useEffect(() => {
    if (!profile?.cargo_id) return;
    (async () => {
      const { getPermissoesCargo } = await import("../lib/permissoes");
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

  // --- Manuais filtrados ---
  const manuaisFiltrados = useMemo(() => {
    const cat = categorias.find((c) => c.chave === abaAtiva);
    if (!cat) return [];
    let lista = manuais.filter((m) => m.categoria_id === cat.id);
    if (search) {
      const q = search.toLowerCase();
      lista = lista.filter((m) => m.titulo.toLowerCase().includes(q));
    }
    return lista;
  }, [manuais, categorias, abaAtiva, search]);

  const isEmBreve = abaAtiva === "__em_breve";

  // --- Enviar Sugestão ---
  const handleEnviarSugestao = async () => {
    if (sugTipo === "pdf") {
      if (!sugArquivo) { toast.error("Selecione um arquivo PDF."); return; }
      if (!sugTitulo.trim()) { toast.error("Informe um título sugerido."); return; }
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
  const handleUploadManual = async (manualId: number) => {
    if (!uploadFile) { toast.error("Selecione um PDF."); return; }
    setUploadSaving(true);
    const nomeArquivo = `manuais/${manualId}_${Date.now()}_${uploadFile.name}`;
    const { error: uploadErr } = await supabase.storage
      .from("manuais")
      .upload(nomeArquivo, uploadFile);
    if (uploadErr) {
      toast.error("Erro ao enviar PDF: " + uploadErr.message);
      setUploadSaving(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("manuais").getPublicUrl(nomeArquivo);
    const arquivoUrl = urlData?.publicUrl || null;

    const { error } = await supabase
      .from("manuais")
      .update({ arquivo_url: arquivoUrl })
      .eq("id", manualId);

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      setUploadSaving(false);
      return;
    }

    toast.success("PDF atualizado com sucesso!");
    setUploadManualId(null);
    setUploadFile(null);
    setUploadSaving(false);
    await carregarDados();
  };

  const podeMostrar = profile?.cargo_id && permissoes.size > 0;

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
          <Link
            to="/"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[#0b3a73] shadow-md ring-1 ring-black/10 backdrop-blur transition hover:scale-105 hover:bg-white"
          >
            <Home className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {/* Título e ações */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-[#1f7ad6]" />
          <h2 className="text-lg font-bold text-[#0b3a73] dark:text-white">Manuais Técnicos</h2>
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
      <div className="mb-6 flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {abas.map((aba) => (
          <button
            key={aba.chave}
            onClick={() => setAbaAtiva(aba.chave)}
            className={`px-4 py-2.5 text-[13px] font-semibold transition-colors cursor-pointer border-b-2 ${
              abaAtiva === aba.chave
                ? "border-[#1f7ad6] text-[#1f7ad6]"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {aba.label}
          </button>
        ))}
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
                {/* Botão editar PDF (só para quem tem permissão) */}
                {podeEditarArquivo && (
                  <button
                    onClick={() => setUploadManualId(manual.id)}
                    className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-slate-400 opacity-0 shadow-sm transition hover:bg-white hover:text-[#1f7ad6] group-hover:opacity-100 dark:bg-slate-700/80 dark:hover:bg-slate-700"
                    title={manual.arquivo_url ? "Trocar PDF" : "Adicionar PDF"}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
                <div className={`${cor.bg} p-4`}>
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${cor.bg}`}>
                      <Icone className={`h-5 w-5 ${cor.cor}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        {manual.titulo}
                      </h3>
                      <p className="text-[12px] text-slate-500 dark:text-slate-400">
                        {manual.descricao}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4 pt-3">
                  {manual.arquivo_url ? (
                    <a
                      href={manual.arquivo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-[#1f7ad6] px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-[#0b3a73]"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Abrir PDF
                    </a>
                  ) : (
                    <div className="flex items-center justify-center gap-1.5 rounded-md bg-slate-100 px-3 py-2 text-[12px] font-medium text-slate-400 dark:bg-slate-700 dark:text-slate-500">
                      <FileText className="h-3.5 w-3.5" />
                      PDF pendente de upload
                    </div>
                  )}
                </div>

                {/* Modal de upload inline */}
                {uploadManualId === manual.id && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/95 backdrop-blur-sm dark:bg-slate-800/95">
                    <div className="w-full max-w-xs p-4 text-center">
                      <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {manual.arquivo_url ? "Trocar PDF" : "Adicionar PDF"}
                      </p>
                      <input
                        ref={uploadInputRef}
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        className="mb-2 w-full text-sm file:mr-2 file:rounded file:border-0 file:bg-[#1f7ad6] file:px-2 file:py-1 file:text-xs file:text-white"
                      />
                      {uploadFile && (
                        <p className="mb-2 text-[11px] text-slate-500 truncate">{uploadFile.name}</p>
                      )}
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleUploadManual(manual.id)}
                          disabled={!uploadFile || uploadSaving}
                          className="rounded-md bg-[#1f7ad6] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0b3a73] disabled:opacity-50 cursor-pointer"
                        >
                          {uploadSaving ? "Salvando..." : "Salvar"}
                        </button>
                        <button
                          onClick={() => { setUploadManualId(null); setUploadFile(null); }}
                          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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
