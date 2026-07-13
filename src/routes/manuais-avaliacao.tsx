import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  FileText,
  Home,
  Loader2,
  ThumbsDown,
  ThumbsUp,
  X,
  BookOpen,
  Send,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { temPermissao } from "../lib/permissoes";
import logoHeader from "@/assets/logo-branca.png";

export const Route = createFileRoute("/manuais-avaliacao")({
  component: AvaliacaoPage,
});

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

type Categoria = {
  id: number;
  chave: string;
  nome_exibicao: string;
  ordem: number;
};

function AvaliacaoPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<"pendente" | "todas">("pendente");
  const [expandida, setExpandida] = useState<number | null>(null);
  const [acaoId, setAcaoId] = useState<number | null>(null);
  const [acaoTipo, setAcaoTipo] = useState<"aprovar" | "rejeitar" | null>(null);
  const [catDestino, setCatDestino] = useState("");
  const [novaCategoria, setNovaCategoria] = useState("");
  const [motivoRejeicao, setMotivoRejeicao] = useState("");
  const [saving, setSaving] = useState(false);

  const carregarDados = async () => {
    setLoading(true);
    const [sugRes, catRes] = await Promise.all([
      supabase.from("sugestoes").select("*").order("criado_em", { ascending: false }),
      supabase.from("manuais_categorias").select("*").eq("ativo", true).order("ordem"),
    ]);
    if (sugRes.data) setSugestoes(sugRes.data);
    if (catRes.data) setCategorias(catRes.data);
    setLoading(false);
  };

  useEffect(() => {
    if (!profile?.cargo_id) return;
    (async () => {
      const { getPermissoesCargo } = await import("../lib/permissoes");
      const perms = await getPermissoesCargo(profile.cargo_id);
      if (!temPermissao(perms, "manuais", "editar_arquivo")) {
        navigate({ to: "/manuais", replace: true });
        return;
      }
      carregarDados();
    })();
  }, [profile?.cargo_id]);

  const sugestoesFiltradas = useMemo(() => {
    if (filtroStatus === "todas") return sugestoes;
    return sugestoes.filter((s) => s.status === filtroStatus);
  }, [sugestoes, filtroStatus]);

  const handleAprovar = async (sug: Sugestao) => {
    if (!catDestino && !novaCategoria.trim()) {
      toast.error("Selecione uma categoria existente ou crie uma nova.");
      return;
    }
    setSaving(true);

    let categoriaId: number | null = null;

    if (novaCategoria.trim()) {
      const { data: catData, error: catErr } = await supabase
        .from("manuais_categorias")
        .insert({
          chave: novaCategoria.trim().toLowerCase().replace(/\s+/g, "_"),
          nome_exibicao: novaCategoria.trim(),
          ordem: categorias.length + 1,
        })
        .select("id")
        .single();
      if (catErr) {
        toast.error("Erro ao criar categoria: " + catErr.message);
        setSaving(false);
        return;
      }
      categoriaId = catData.id;
      setCategorias((prev) => [
        ...prev,
        { id: catData.id, chave: novaCategoria.trim().toLowerCase().replace(/\s+/g, "_"), nome_exibicao: novaCategoria.trim(), ordem: prev.length + 1 },
      ]);
    } else {
      categoriaId = Number(catDestino);
    }

    if (!categoriaId) {
      toast.error("Erro ao determinar categoria.");
      setSaving(false);
      return;
    }

    // Criar manual
    const titulo = sug.titulo_sugerido || "Manual sem título";
    const { error: manErr } = await supabase.from("manuais").insert({
      titulo,
      descricao: sug.comentario || "",
      categoria_id: categoriaId,
      arquivo_url: sug.arquivo_url,
    });

    if (manErr) {
      toast.error("Erro ao criar manual: " + manErr.message);
      setSaving(false);
      return;
    }

    // Atualizar sugestão
    await supabase
      .from("sugestoes")
      .update({ status: "aprovado" })
      .eq("id", sug.id);

    toast.success("Sugestão aprovada e manual criado!");
    setAcaoId(null);
    setAcaoTipo(null);
    setCatDestino("");
    setNovaCategoria("");
    setExpandida(null);
    setSaving(false);
    await carregarDados();
  };

  const handleRejeitar = async (sugId: number) => {
    setSaving(true);
    await supabase
      .from("sugestoes")
      .update({ status: "rejeitado", comentario: motivoRejeicao || sugestoes.find((s) => s.id === sugId)?.comentario })
      .eq("id", sugId);
    toast.success("Sugestão rejeitada.");
    setAcaoId(null);
    setAcaoTipo(null);
    setMotivoRejeicao("");
    setExpandida(null);
    setSaving(false);
    await carregarDados();
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
              <p className="truncate text-sm text-cyan-50/90">Eletromecânica · Avaliação de Sugestões</p>
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

      {/* Navegação */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            to="/manuais"
            className="inline-flex items-center gap-1 text-[13px] font-medium text-[#1f7ad6] hover:text-[#0b3a73] dark:text-blue-400"
          >
            <ArrowLeft className="h-4 w-4" /> Manuais
          </Link>
          <BookOpen className="ml-2 h-5 w-5 text-[#1f7ad6]" />
          <h2 className="text-lg font-bold text-[#0b3a73] dark:text-white">Avaliar Sugestões</h2>
        </div>
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as "pendente" | "todas")}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none ring-[#1f7ad6] focus:ring-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        >
          <option value="pendente">Pendentes</option>
          <option value="todas">Histórico (todas)</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#1f7ad6]" />
        </div>
      ) : sugestoesFiltradas.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-slate-400">
          <Send className="h-10 w-10" />
          <p className="text-sm font-medium">
            {filtroStatus === "pendente" ? "Nenhuma sugestão pendente." : "Nenhuma sugestão no histórico."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sugestoesFiltradas.map((sug) => (
            <div
              key={sug.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all dark:border-slate-700 dark:bg-slate-800"
            >
              <button
                onClick={() => setExpandida(expandida === sug.id ? null : sug.id)}
                className="flex w-full items-center gap-3 p-4 text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750"
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                    sug.status === "pendente"
                      ? "bg-amber-500"
                      : sug.status === "aprovado"
                        ? "bg-emerald-500"
                        : "bg-red-500"
                  }`}
                >
                  {sug.tipo === "pdf" ? <FileText className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {sug.titulo_sugerido || "Sugestão sem título"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {sug.tipo === "pdf" ? "PDF" : "Texto"} · {sug.enviado_por} ·{" "}
                    {new Date(sug.criado_em).toLocaleDateString("pt-BR")}
                    {sug.categoria_sugerida && ` · ${sug.categoria_sugerida}`}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    sug.status === "pendente"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      : sug.status === "aprovado"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }`}
                >
                  {sug.status === "pendente" ? "Pendente" : sug.status === "aprovado" ? "Aprovado" : "Rejeitado"}
                </span>
              </button>

              {expandida === sug.id && (
                <div className="border-t border-slate-100 p-4 dark:border-slate-700">
                  {/* Visualizador de PDF */}
                  {sug.tipo === "pdf" && sug.arquivo_url && (
                    <div className="mb-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600">
                      <iframe
                        src={sug.arquivo_url}
                        className="h-96 w-full"
                        title="Visualização do PDF"
                      />
                    </div>
                  )}

                  {/* Texto da sugestão */}
                  {sug.tipo === "texto" && sug.comentario && (
                    <div className="mb-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-700 dark:bg-slate-750 dark:text-slate-300">
                      {sug.comentario}
                    </div>
                  )}

                  {/* Metadados */}
                  <div className="mb-4 grid grid-cols-2 gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <div>
                      <span className="font-medium">Enviado por:</span> {sug.enviado_por}
                    </div>
                    <div>
                      <span className="font-medium">Data:</span>{" "}
                      {new Date(sug.criado_em).toLocaleDateString("pt-BR")}
                    </div>
                    {sug.categoria_sugerida && (
                      <div className="col-span-2">
                        <span className="font-medium">Categoria sugerida:</span> {sug.categoria_sugerida}
                      </div>
                    )}
                    {sug.tipo === "pdf" && sug.titulo_sugerido && (
                      <div className="col-span-2">
                        <span className="font-medium">Título:</span> {sug.titulo_sugerido}
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  {sug.status === "pendente" && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setAcaoId(sug.id);
                          setAcaoTipo("aprovar");
                          setCatDestino("");
                          setNovaCategoria("");
                        }}
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer"
                      >
                        <ThumbsUp className="h-3.5 w-3.5" /> Aprovar
                      </button>
                      <button
                        onClick={() => {
                          setAcaoId(sug.id);
                          setAcaoTipo("rejeitar");
                          setMotivoRejeicao("");
                        }}
                        className="inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 cursor-pointer"
                      >
                        <ThumbsDown className="h-3.5 w-3.5" /> Rejeitar
                      </button>
                    </div>
                  )}

                  {/* Painel de aprovação */}
                  {acaoId === sug.id && acaoTipo === "aprovar" && (
                    <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
                      <p className="mb-3 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                        Aprovar sugestão
                      </p>

                      <div className="mb-3">
                        <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                          Adicionar a categoria existente
                        </label>
                        <select
                          value={catDestino}
                          onChange={(e) => { setCatDestino(e.target.value); setNovaCategoria(""); }}
                          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none ring-emerald-400 focus:ring-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                        >
                          <option value="">Selecione...</option>
                          {categorias.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.nome_exibicao}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="mb-3">
                        <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                          Ou criar nova categoria
                        </label>
                        <input
                          type="text"
                          value={novaCategoria}
                          onChange={(e) => { setNovaCategoria(e.target.value); setCatDestino(""); }}
                          placeholder="Nome da nova categoria"
                          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none ring-emerald-400 focus:ring-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAprovar(sug)}
                          disabled={saving}
                          className="rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                        >
                          {saving ? "Salvando..." : "Confirmar Aprovação"}
                        </button>
                        <button
                          onClick={() => { setAcaoId(null); setAcaoTipo(null); }}
                          className="rounded-md border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Painel de rejeição */}
                  {acaoId === sug.id && acaoTipo === "rejeitar" && (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
                      <p className="mb-3 text-sm font-semibold text-red-800 dark:text-red-300">
                        Rejeitar sugestão
                      </p>
                      <textarea
                        value={motivoRejeicao}
                        onChange={(e) => setMotivoRejeicao(e.target.value)}
                        placeholder="Motivo da rejeição (opcional)"
                        rows={2}
                        className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none ring-red-400 focus:ring-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRejeitar(sug.id)}
                          disabled={saving}
                          className="rounded-md bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                        >
                          {saving ? "Salvando..." : "Confirmar Rejeição"}
                        </button>
                        <button
                          onClick={() => { setAcaoId(null); setAcaoTipo(null); }}
                          className="rounded-md border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
