import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  FileText,
  Loader2,
  ListChecks,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import logoHeader from "@/assets/logo-branca.png";
import { NavVoltarHome } from "@/components/nav-voltar-home";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { getPermissoesCargo, temPermissao } from "@/lib/permissoes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/procedimentos")({
  head: () => ({
    meta: [{ title: "Eletromecânica · Procedimentos" }],
  }),
  component: ProcedimentosPage,
});

type Procedimento = {
  id: number;
  titulo: string;
  descricao: string;
  pdf_url: string | null;
  pdf_nome: string | null;
  ordem: number;
};

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-[#1f7ad6] focus:ring-2 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-100";
const labelCls = "block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1";

const sanitizarNome = (nome: string) => nome.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");

function ProcedimentosPage() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [podeVer, setPodeVer] = useState(false);
  const [podeGerenciar, setPodeGerenciar] = useState(false);

  const [lista, setLista] = useState<Procedimento[]>([]);
  const [busca, setBusca] = useState("");
  const [carregandoLista, setCarregandoLista] = useState(false);

  // Dialog criar/editar
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [removerPdf, setRemoverPdf] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [excluirAlvo, setExcluirAlvo] = useState<Procedimento | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authLoading) return;
    const init = async () => {
      try {
        if (!profile?.cargo_id) {
          navigate({ to: "/", replace: true });
          return;
        }
        const { data: panelData } = await supabase
          .from("cargo_paineis")
          .select("paineis!inner(chave)")
          .eq("cargo_id", profile.cargo_id)
          .eq("paineis.chave", "procedimentos")
          .maybeSingle();
        if (!panelData) {
          toast.error("Acesso não autorizado ao painel de Procedimentos");
          navigate({ to: "/", replace: true });
          return;
        }

        const perms = await getPermissoesCargo(profile.cargo_id);
        const ver = temPermissao(perms, "procedimentos", "ver");
        const gerenciar = temPermissao(perms, "procedimentos", "gerenciar");
        setPodeVer(ver);
        setPodeGerenciar(gerenciar);
        if (ver) await carregarLista();
      } catch (err) {
        toast.error(
          "Erro ao carregar procedimentos: " +
            (err instanceof Error ? err.message : "desconhecido"),
        );
        navigate({ to: "/", replace: true });
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [profile?.cargo_id, authLoading, navigate]);

  const carregarLista = async () => {
    setCarregandoLista(true);
    const { data, error } = await supabase
      .from("procedimentos")
      .select("id, titulo, descricao, pdf_url, pdf_nome, ordem")
      .order("ordem", { ascending: true })
      .order("titulo", { ascending: true });
    if (error) {
      toast.error("Erro ao listar procedimentos: " + error.message);
    } else {
      setLista((data ?? []) as Procedimento[]);
    }
    setCarregandoLista(false);
  };

  const filtrados = lista.filter(
    (p) =>
      p.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      (p.descricao || "").toLowerCase().includes(busca.toLowerCase()),
  );

  const abrirNovo = () => {
    setEditandoId(null);
    setTitulo("");
    setDescricao("");
    setArquivo(null);
    setRemoverPdf(false);
    setDialogAberto(true);
  };

  const abrirEditar = (p: Procedimento) => {
    setEditandoId(p.id);
    setTitulo(p.titulo);
    setDescricao(p.descricao || "");
    setArquivo(null);
    setRemoverPdf(false);
    setDialogAberto(true);
  };

  const salvar = async () => {
    const tit = titulo.trim();
    if (!tit) {
      toast.error("Informe o título do procedimento.");
      return;
    }
    if (arquivo && arquivo.type !== "application/pdf") {
      toast.error("Anexe apenas arquivos PDF.");
      return;
    }
    setSalvando(true);
    try {
      let id = editandoId;
      const payload: Record<string, unknown> = {
        titulo: tit,
        descricao: descricao.trim(),
        atualizado_por: user?.id ?? null,
      };
      if (editandoId === null) {
        const { data, error } = await supabase
          .from("procedimentos")
          .insert({ ...payload, criado_por: user?.id ?? null })
          .select("id")
          .single();
        if (error) {
          toast.error("Erro ao criar: " + error.message);
          return;
        }
        id = data.id as number;
      } else {
        const { error } = await supabase.from("procedimentos").update(payload).eq("id", editandoId);
        if (error) {
          toast.error("Erro ao salvar: " + error.message);
          return;
        }
      }

      if (id != null && arquivo) {
        const path = `${id}_${Date.now()}_${sanitizarNome(arquivo.name)}`;
        const { error: upErr } = await supabase.storage
          .from("procedimentos")
          .upload(path, arquivo, { contentType: "application/pdf" });
        if (upErr) {
          toast.error("Erro no upload do PDF: " + upErr.message);
          return;
        }
        const { data: pub } = supabase.storage.from("procedimentos").getPublicUrl(path);
        const { error: updErr } = await supabase
          .from("procedimentos")
          .update({ pdf_url: pub?.publicUrl ?? null, pdf_nome: arquivo.name })
          .eq("id", id);
        if (updErr) {
          toast.error("Erro ao salvar o PDF: " + updErr.message);
          return;
        }
      } else if (id != null && removerPdf && editandoId !== null) {
        const atual = lista.find((p) => p.id === editandoId);
        if (atual?.pdf_url) {
          const parts = atual.pdf_url.split("/public/procedimentos/");
          if (parts.length > 1) await supabase.storage.from("procedimentos").remove([parts[1]]);
        }
        const { error: updErr } = await supabase
          .from("procedimentos")
          .update({ pdf_url: null, pdf_nome: null })
          .eq("id", id);
        if (updErr) {
          toast.error("Erro ao remover o PDF: " + updErr.message);
          return;
        }
      }

      toast.success(editandoId === null ? "Procedimento criado!" : "Procedimento salvo!");
      setDialogAberto(false);
      await carregarLista();
    } finally {
      setSalvando(false);
    }
  };

  const confirmarExcluir = async () => {
    if (!excluirAlvo) return;
    const parts = excluirAlvo.pdf_url?.split("/public/procedimentos/");
    if (parts && parts.length > 1) {
      await supabase.storage.from("procedimentos").remove([parts[1]]);
    }
    const { error } = await supabase.from("procedimentos").delete().eq("id", excluirAlvo.id);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
      return;
    }
    toast.success("Procedimento removido.");
    setExcluirAlvo(null);
    await carregarLista();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-[#1f7ad6] dark:text-[#38bdf8]" />
      </div>
    );
  }

  if (!podeVer) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-900">
        <div className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800">
          Você não tem permissão para visualizar procedimentos.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-3 md:p-6 dark:bg-slate-900">
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
              <p className="truncate text-sm text-cyan-50/90">Eletromecânica · Procedimentos</p>
            </div>
          </div>
          <NavVoltarHome />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-[#0b3a73] dark:text-white sm:text-2xl">
            <ListChecks className="h-5 w-5" /> Procedimentos
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Procedimentos operacionais passo-a-passo em PDF.
          </p>
        </div>
        {podeGerenciar && (
          <button
            type="button"
            onClick={abrirNovo}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1f7ad6] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0b3a73] active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" /> Novo procedimento
          </button>
        )}
      </div>

      {lista.length > 6 && (
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar procedimento..."
            className={`${inputCls} pl-9`}
          />
        </div>
      )}

      {carregandoLista ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <Loader2 className="h-6 w-6 animate-spin text-[#1f7ad6]" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800">
          {busca ? "Nenhum procedimento encontrado." : "Nenhum procedimento cadastrado ainda."}
          {podeGerenciar && !busca && (
            <div className="mt-3">
              <button
                type="button"
                onClick={abrirNovo}
                className="inline-flex items-center gap-2 rounded-lg bg-[#1f7ad6] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0b3a73]"
              >
                <Plus className="h-4 w-4" /> Criar o primeiro
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((p) => (
            <div
              key={p.id}
              className="group relative flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
            >
              {podeGerenciar && (
                <div className="absolute right-2 top-2 z-10 flex gap-1">
                  <button
                    type="button"
                    onClick={() => abrirEditar(p)}
                    title="Editar"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-slate-400 shadow-sm transition hover:bg-white hover:text-[#1f7ad6] opacity-0 group-hover:opacity-100 dark:bg-slate-700/80 dark:hover:bg-slate-700"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setExcluirAlvo(p)}
                    title="Excluir"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-slate-400 shadow-sm transition hover:bg-white hover:text-red-500 opacity-0 group-hover:opacity-100 dark:bg-slate-700/80 dark:hover:bg-slate-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-slate-700">
                  <ListChecks className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold text-[#0b3a73] dark:text-white">
                    {p.titulo}
                  </h2>
                  {p.descricao && (
                    <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      {p.descricao}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
                {p.pdf_url ? (
                  <a
                    href={p.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#1f7ad6]/10 px-3 py-1.5 text-xs font-semibold text-[#1f7ad6] transition hover:bg-[#1f7ad6]/20 dark:bg-[#38bdf8]/10 dark:text-[#38bdf8]"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    {p.pdf_nome || "Abrir PDF"}
                  </a>
                ) : (
                  <span className="text-xs text-slate-400 dark:text-slate-500">Sem PDF</span>
                )}
                {podeGerenciar && !p.pdf_url && (
                  <button
                    type="button"
                    onClick={() => abrirEditar(p)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-[#1f7ad6] hover:text-[#1f7ad6] dark:border-slate-600 dark:text-slate-400"
                  >
                    <Upload className="h-3.5 w-3.5" /> Anexar PDF
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog criar/editar */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0b3a73] dark:text-white">
              {editandoId === null ? "Novo procedimento" : "Editar procedimento"}
            </DialogTitle>
            <DialogDescription>
              {editandoId === null
                ? "Crie um procedimento com título, descrição e PDF."
                : "Atualize os dados ou troque o PDF do procedimento."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Título *</label>
              <input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className={inputCls}
                placeholder="Ex.: Troca de bomba submersa"
              />
            </div>
            <div>
              <label className={labelCls}>Descrição</label>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={3}
                className={`${inputCls} min-h-[70px]`}
                placeholder="Resumo curto do procedimento..."
              />
            </div>
            <div>
              <label className={labelCls}>PDF {editandoId === null ? "" : "(substituir)"}</label>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setArquivo(f);
                  setRemoverPdf(false);
                }}
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-[#1f7ad6] hover:text-[#1f7ad6] dark:border-slate-500 dark:text-slate-300"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {arquivo ? "Trocar arquivo" : "Selecionar PDF"}
                </button>
                {arquivo && (
                  <span className="inline-flex items-center gap-1 rounded bg-[#1f7ad6]/10 px-2 py-1 text-xs text-[#1f7ad6] dark:bg-[#38bdf8]/10 dark:text-[#38bdf8]">
                    {arquivo.name}
                    <button
                      type="button"
                      onClick={() => setArquivo(null)}
                      className="hover:text-red-500"
                      title="Remover seleção"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {editandoId !== null && !removerPdf && (
                  <button
                    type="button"
                    onClick={() => {
                      setRemoverPdf(true);
                      setArquivo(null);
                    }}
                    className="text-xs font-semibold text-red-500 hover:underline"
                  >
                    Remover PDF atual
                  </button>
                )}
                {removerPdf && (
                  <span className="text-xs font-semibold text-red-500">
                    PDF será removido ao salvar
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDialogAberto(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={salvar}
              disabled={salvando}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1f7ad6] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0b3a73] disabled:opacity-60"
            >
              {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog excluir */}
      <Dialog open={!!excluirAlvo} onOpenChange={(o) => !o && setExcluirAlvo(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#0b3a73] dark:text-white">
              Excluir procedimento?
            </DialogTitle>
            <DialogDescription>
              {excluirAlvo &&
                `"{excluirAlvo.titulo}" e seu PDF serão removidos. Esta ação não pode
              ser desfeita.`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setExcluirAlvo(null)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmarExcluir}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Excluir
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProcedimentosPage;
