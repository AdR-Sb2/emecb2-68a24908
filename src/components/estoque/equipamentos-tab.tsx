import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  ClipboardList,
  Edit3,
  Loader2,
  Plus,
  Search,
  Settings,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getPermissoesCargo, temPermissao } from "@/lib/permissoes";
import {
  STATUS_EQUIPAMENTO,
  TIPOS_EQUIPAMENTO,
  type Equipamento,
  type EquipamentoCategoria,
  type EquipamentoFoto,
  type EquipamentoRegistro,
  type StatusEquipamento,
} from "@/lib/estoque-equipamentos-types";

const CATEGORIA_CORES: Record<string, string> = {
  Motor:
    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800",
  Bomba:
    "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800",
  Inversor:
    "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800",
  Softstarter:
    "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800",
  outras:
    "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600",
};

const STATUS_CORES: Record<StatusEquipamento, string> = {
  Operacional:
    "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800",
  "Em manutenção":
    "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800",
  Reserva:
    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800",
  Baixado:
    "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
};

const TIPOS_REGISTRO = ["Manutenção", "Troca", "Inspeção", "Observação"];

const inputCls =
  "min-h-10 w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#1f7ad6] focus:outline-none focus:ring-2 focus:ring-[#1f7ad6]/20";
const labelCls = "block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1";
const selectCls =
  "min-h-10 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-2 text-[13px] text-slate-700 dark:text-slate-200 focus:border-[#1f7ad6] focus:outline-none";
const btnOutlineCls =
  "inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700";

function nomeCategoria(e: Equipamento): string {
  if (e.categorias?.nome) return e.categorias.nome;
  const t = e.tipo ?? "";
  if (t.includes("Inversor")) return "Inversor";
  if (t.toLowerCase().includes("soft")) return "Softstarter";
  if (t.includes("Bomba")) return "Bomba";
  if (t.includes("Motor")) return "Motor";
  return "outras";
}

function storagePathFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const marker = "/object/public/equipamentos/";
    const idx = u.pathname.indexOf(marker);
    if (idx >= 0) return u.pathname.slice(idx + marker.length);
  } catch {
    /* url inválida */
  }
  return "";
}

function formatData(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return "";
  }
}

function ObservacaoCell({
  equip,
  podeEditar,
  onSalvar,
}: {
  equip: Equipamento;
  podeEditar: boolean;
  onSalvar: (id: string, valor: string) => Promise<boolean>;
}) {
  const [valor, setValor] = useState(equip.observacao ?? "");
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValor(equip.observacao ?? "");
  }, [equip.observacao]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const salvar = async (v: string) => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setSalvando(true);
    const ok = await onSalvar(equip.id, v);
    setSalvando(false);
    if (!ok) setValor(equip.observacao ?? "");
  };

  const mudar = (v: string) => {
    setValor(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => salvar(v), 500);
  };

  if (!podeEditar) {
    return (
      <span className="line-clamp-1 block max-w-[220px] text-[13px] text-slate-600 dark:text-slate-300">
        {valor || "—"}
      </span>
    );
  }

  if (editando) {
    return (
      <textarea
        value={valor}
        onChange={(e) => mudar(e.target.value)}
        onBlur={() => {
          setEditando(false);
          salvar(valor);
        }}
        rows={2}
        autoFocus
        placeholder="Observação..."
        className="w-full min-w-[220px] resize-none rounded-md border border-slate-300 bg-white px-2 py-1 text-[13px] focus:border-[#1f7ad6] focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditando(true)}
      title="Editar observação"
      className="group flex max-w-[220px] items-start gap-1 text-left"
    >
      <span className="line-clamp-1 text-[13px] text-slate-600 group-hover:text-[#1f7ad6] dark:text-slate-300">
        {valor || "—"}
      </span>
      {salvando && <Loader2 className="mt-0.5 h-3 w-3 shrink-0 animate-spin text-slate-400" />}
    </button>
  );
}

export default function EquipamentosTab() {
  const { user, profile } = useAuth();
  const [perms, setPerms] = useState({
    ver: false,
    criar: false,
    editar: false,
    remover: false,
    categorias: false,
  });
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [categorias, setCategorias] = useState<EquipamentoCategoria[]>([]);
  const [fotos, setFotos] = useState<Record<string, EquipamentoFoto[]>>({});
  const [loading, setLoading] = useState(true);
  const [permLoading, setPermLoading] = useState(true);

  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("TODAS");
  const [filtroCritico, setFiltroCritico] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState("TODOS");

  const [dialogNovo, setDialogNovo] = useState(false);
  const [dialogEditar, setDialogEditar] = useState<Equipamento | null>(null);
  const [galeria, setGaleria] = useState<Equipamento | null>(null);
  const [registrosEq, setRegistrosEq] = useState<Equipamento | null>(null);
  const [dialogCategorias, setDialogCategorias] = useState(false);

  const [form, setForm] = useState({
    tag: "",
    descricao: "",
    tipo: TIPOS_EQUIPAMENTO[0] as string,
    categoria_id: "",
    origem: "",
    codigo_sap: "",
    observacao: "",
    critico: false,
    status: "Operacional" as StatusEquipamento,
  });
  const [salvandoForm, setSalvandoForm] = useState(false);
  const [salvandoCritico, setSalvandoCritico] = useState<string | null>(null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const fotoInputRef = useRef<HTMLInputElement>(null);

  const [registrosLista, setRegistrosLista] = useState<EquipamentoRegistro[]>([]);
  const [carregandoRegistros, setCarregandoRegistros] = useState(false);
  const [novoRegistroTipo, setNovoRegistroTipo] = useState("Observação");
  const [novoRegistroTexto, setNovoRegistroTexto] = useState("");
  const [salvandoRegistro, setSalvandoRegistro] = useState(false);

  const [novaCategoria, setNovaCategoria] = useState("");
  const [editCategoriaId, setEditCategoriaId] = useState<string | null>(null);
  const [editCategoriaNome, setEditCategoriaNome] = useState("");

  useEffect(() => {
    if (!profile?.cargo_id) return;
    (async () => {
      const permsMap = await getPermissoesCargo(profile.cargo_id);
      setPerms({
        ver: temPermissao(permsMap, "estoque", "equipamentos_ver"),
        criar: temPermissao(permsMap, "estoque", "equipamentos_criar"),
        editar: temPermissao(permsMap, "estoque", "equipamentos_editar"),
        remover: temPermissao(permsMap, "estoque", "equipamentos_remover"),
        categorias: temPermissao(permsMap, "estoque", "equipamentos_categorias"),
      });
      setPermLoading(false);
    })();
  }, [profile?.cargo_id]);

  const carregar = async () => {
    setLoading(true);
    const [eqRes, catRes, fotRes] = await Promise.all([
      supabase.from("equipamentos").select("*, categorias(id, nome, ordem)").order("tag"),
      supabase.from("equipamento_categorias").select("*").order("ordem"),
      supabase.from("equipamento_fotos").select("*").order("criado_em", { ascending: false }),
    ]);
    if (eqRes.error) toast.error("Erro ao carregar equipamentos: " + eqRes.error.message);
    if (catRes.error) console.warn("Erro ao carregar categorias:", catRes.error.message);
    if (eqRes.data) setEquipamentos(eqRes.data as Equipamento[]);
    if (catRes.data) setCategorias(catRes.data as EquipamentoCategoria[]);
    if (fotRes.data) {
      const map: Record<string, EquipamentoFoto[]> = {};
      for (const f of fotRes.data as EquipamentoFoto[]) {
        (map[f.equipamento_id] ??= []).push(f);
      }
      setFotos(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    carregar();
  }, [permLoading]);

  const equipamentosFiltrados = useMemo(() => {
    let list = equipamentos;
    const q = busca.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (e) =>
          e.tag.toLowerCase().includes(q) ||
          e.descricao.toLowerCase().includes(q) ||
          (e.codigo_sap ?? "").toLowerCase().includes(q),
      );
    }
    if (filtroCategoria !== "TODAS") list = list.filter((e) => e.categoria_id === filtroCategoria);
    if (filtroCritico) list = list.filter((e) => e.critico);
    if (filtroStatus !== "TODOS") list = list.filter((e) => e.status === filtroStatus);
    return [...list].sort((a, b) => {
      if (a.critico !== b.critico) return a.critico ? -1 : 1;
      return a.tag.localeCompare(b.tag);
    });
  }, [equipamentos, busca, filtroCategoria, filtroCritico, filtroStatus]);

  const alternarCritico = async (e: Equipamento) => {
    if (!perms.editar || salvandoCritico === e.id) return;
    const novoValor = !e.critico;
    setSalvandoCritico(e.id);
    setEquipamentos((prev) => prev.map((x) => (x.id === e.id ? { ...x, critico: novoValor } : x)));
    const { error } = await supabase
      .from("equipamentos")
      .update({ critico: novoValor })
      .eq("id", e.id);
    setSalvandoCritico(null);
    if (error) {
      setEquipamentos((prev) =>
        prev.map((x) => (x.id === e.id ? { ...x, critico: !novoValor } : x)),
      );
      toast.error("Erro ao marcar crítico: " + error.message);
    }
  };

  const atualizarStatus = async (e: Equipamento, status: StatusEquipamento) => {
    setEquipamentos((prev) => prev.map((x) => (x.id === e.id ? { ...x, status } : x)));
    const { error } = await supabase.from("equipamentos").update({ status }).eq("id", e.id);
    if (error) {
      setEquipamentos((prev) => prev.map((x) => (x.id === e.id ? { ...x, status: e.status } : x)));
      toast.error("Erro ao atualizar status: " + error.message);
    }
  };

  const salvarObservacao = async (id: string, valor: string): Promise<boolean> => {
    const { error } = await supabase
      .from("equipamentos")
      .update({ observacao: valor })
      .eq("id", id);
    if (error) {
      toast.error("Erro ao salvar observação: " + error.message);
      return false;
    }
    setEquipamentos((prev) => prev.map((x) => (x.id === id ? { ...x, observacao: valor } : x)));
    return true;
  };

  const abrirNovo = () => {
    setForm({
      tag: "",
      descricao: "",
      tipo: TIPOS_EQUIPAMENTO[0],
      categoria_id: "",
      origem: "",
      codigo_sap: "",
      observacao: "",
      critico: false,
      status: "Operacional",
    });
    setDialogNovo(true);
  };

  const abrirEditar = (e: Equipamento) => {
    setForm({
      tag: e.tag,
      descricao: e.descricao,
      tipo: e.tipo,
      categoria_id: e.categoria_id ?? "",
      origem: e.origem ?? "",
      codigo_sap: e.codigo_sap ?? "",
      observacao: e.observacao ?? "",
      critico: e.critico,
      status: e.status,
    });
    setDialogEditar(e);
  };

  const salvarEquipamento = async () => {
    if (!form.tag.trim() || !form.descricao.trim()) {
      toast.error("Tag e descrição são obrigatórias.");
      return;
    }
    const editando = dialogEditar != null;
    setSalvandoForm(true);
    const payload = {
      tag: form.tag.trim(),
      descricao: form.descricao.trim(),
      tipo: form.tipo,
      categoria_id: form.categoria_id || null,
      origem: form.origem.trim() || null,
      codigo_sap: form.codigo_sap.trim() || null,
      observacao: form.observacao,
      critico: form.critico,
      status: form.status,
    };
    const { error } = editando
      ? await supabase.from("equipamentos").update(payload).eq("id", dialogEditar.id)
      : await supabase.from("equipamentos").insert({ ...payload, criado_por: user?.id ?? null });
    setSalvandoForm(false);
    if (error) {
      toast.error(editando ? "Erro ao atualizar: " : "Erro ao criar: " + error.message);
      return;
    }
    if (editando) setDialogEditar(null);
    else setDialogNovo(false);
    await carregar();
    toast.success(editando ? "Equipamento atualizado!" : "Equipamento criado!");
  };

  const excluirEquipamento = async (e: Equipamento) => {
    if (!perms.remover) return;
    if (!window.confirm(`Excluir o equipamento ${e.tag}? Fotos e registros também serão apagados.`))
      return;
    const paths = (fotos[e.id] ?? [])
      .map((f) => storagePathFromUrl(f.url))
      .filter((p) => Boolean(p));
    if (paths.length) await supabase.storage.from("equipamentos").remove(paths);
    const { error } = await supabase.from("equipamentos").delete().eq("id", e.id);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
      return;
    }
    setDialogEditar(null);
    await carregar();
    toast.success("Equipamento excluído.");
  };

  const abrirGaleria = (e: Equipamento) => {
    setGaleria(e);
  };

  const uploadFoto = async (arquivo: File) => {
    if (!galeria) return;
    if (!/^image\/(jpeg|png|webp)$/.test(arquivo.type)) {
      toast.error("Apenas imagens JPG, PNG ou WEBP.");
      return;
    }
    setEnviandoFoto(true);
    const nome = arquivo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `equipamentos/${galeria.id}/${Date.now()}-${nome}`;
    const { error: upErr } = await supabase.storage
      .from("equipamentos")
      .upload(path, arquivo, { upsert: false, contentType: arquivo.type });
    if (upErr) {
      toast.error("Erro no upload: " + upErr.message);
      setEnviandoFoto(false);
      return;
    }
    const { data: pub } = supabase.storage.from("equipamentos").getPublicUrl(path);
    const url = pub?.publicUrl ?? path;
    const { error } = await supabase
      .from("equipamento_fotos")
      .insert({ equipamento_id: galeria.id, url, autor_id: user?.id ?? null });
    if (error) {
      toast.error("Erro ao salvar foto: " + error.message);
      setEnviandoFoto(false);
      return;
    }
    await supabase.from("equipamentos").update({ foto_url: url }).eq("id", galeria.id);
    setEnviandoFoto(false);
    await carregar();
  };

  const removerFoto = async (f: EquipamentoFoto) => {
    if (!galeria || !perms.editar) return;
    const { error } = await supabase.from("equipamento_fotos").delete().eq("id", f.id);
    if (error) {
      toast.error("Erro ao remover foto: " + error.message);
      return;
    }
    const path = storagePathFromUrl(f.url);
    if (path) await supabase.storage.from("equipamentos").remove([path]);
    await carregar();
  };

  const abrirRegistros = async (e: Equipamento) => {
    setRegistrosEq(e);
    setRegistrosLista([]);
    setNovoRegistroTexto("");
    setNovoRegistroTipo("Observação");
    setCarregandoRegistros(true);
    const { data } = await supabase
      .from("equipamento_registros")
      .select("*, profiles:autor_id(nome_completo)")
      .eq("equipamento_id", e.id)
      .order("criado_em", { ascending: false });
    setRegistrosLista(
      (
        (data ?? []) as Array<
          EquipamentoRegistro & { profiles?: { nome_completo?: string } | null }
        >
      ).map((r) => ({
        ...r,
        autor_nome: r.profiles?.nome_completo ?? null,
      })) as EquipamentoRegistro[],
    );
    setCarregandoRegistros(false);
  };

  const adicionarRegistro = async () => {
    if (!registrosEq || !novoRegistroTexto.trim()) return;
    setSalvandoRegistro(true);
    const { data, error } = await supabase
      .from("equipamento_registros")
      .insert({
        equipamento_id: registrosEq.id,
        tipo: novoRegistroTipo,
        descricao: novoRegistroTexto.trim(),
        autor_id: user?.id ?? null,
      })
      .select("*, profiles:autor_id(nome_completo)")
      .single();
    setSalvandoRegistro(false);
    if (error || !data) {
      toast.error("Erro ao salvar registro: " + (error?.message ?? "sem resposta"));
      return;
    }
    const novo = {
      ...data,
      autor_nome: (data.profiles as { nome_completo?: string } | null)?.nome_completo ?? null,
    } as EquipamentoRegistro;
    setRegistrosLista((prev) => [novo, ...prev]);
    setNovoRegistroTexto("");
    setNovoRegistroTipo("Observação");
  };

  const criarCategoria = async () => {
    const nome = novaCategoria.trim();
    if (!nome) return;
    const { error } = await supabase
      .from("equipamento_categorias")
      .insert({ nome, ordem: categorias.length + 1 });
    if (error) {
      toast.error("Erro ao criar categoria: " + error.message);
      return;
    }
    setNovaCategoria("");
    await carregar();
  };

  const renomearCategoria = async (id: string) => {
    const nome = editCategoriaNome.trim();
    if (!nome) {
      setEditCategoriaId(null);
      return;
    }
    const { error } = await supabase.from("equipamento_categorias").update({ nome }).eq("id", id);
    if (error) {
      toast.error("Erro ao renomear: " + error.message);
      return;
    }
    setEditCategoriaId(null);
    await carregar();
  };

  const removerCategoria = async (id: string, nome: string) => {
    const vinculados = equipamentos.filter((e) => e.categoria_id === id).length;
    if (vinculados > 0) {
      toast.error(`Categoria em uso por ${vinculados} equipamento(s). Remova o vínculo primeiro.`);
      return;
    }
    if (!window.confirm(`Remover a categoria "${nome}"?`)) return;
    const { error } = await supabase.from("equipamento_categorias").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover: " + error.message);
      return;
    }
    await carregar();
  };

  if (permLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-slate-400">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando permissões...
      </div>
    );
  }

  if (!perms.ver) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-400 dark:border-slate-600">
        Você não tem permissão para visualizar equipamentos.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por tag, descrição, SAP..."
              className="min-h-10 w-56 rounded-lg border border-slate-300 py-2 pl-8 pr-3 text-sm focus:border-[#1f7ad6] focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            />
          </div>
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className={selectCls}
          >
            <option value="TODAS">Categoria: todas</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className={selectCls}
          >
            <option value="TODOS">Status: todos</option>
            {STATUS_EQUIPAMENTO.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <label className="flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={filtroCritico}
              onChange={(e) => setFiltroCritico(e.target.checked)}
              className="h-4 w-4 accent-amber-500"
            />
            Somente críticos
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {perms.categorias && (
            <button onClick={() => setDialogCategorias(true)} className={btnOutlineCls}>
              <Settings className="h-4 w-4" /> Gerenciar Categorias
            </button>
          )}
          {perms.criar && (
            <button
              onClick={abrirNovo}
              className="inline-flex items-center gap-1 rounded-md bg-[#0b3a73] px-3 py-2 text-[13px] font-semibold text-white hover:bg-[#1f7ad6] shadow"
            >
              <Plus className="h-4 w-4" /> Novo Equipamento
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando...
        </div>
      ) : equipamentosFiltrados.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-400 dark:border-slate-600">
          Nenhum equipamento encontrado.
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {equipamentosFiltrados.length}{" "}
            {equipamentosFiltrados.length === 1 ? "equipamento" : "equipamentos"}
            {busca.trim() ||
            filtroCategoria !== "TODAS" ||
            filtroCritico ||
            filtroStatus !== "TODOS"
              ? " (filtrados)"
              : ""}
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                  <th className="px-3 py-2 text-center" title="Crítico">
                    ★
                  </th>
                  <th className="px-3 py-2">Tag</th>
                  <th className="px-3 py-2">Descrição</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Origem</th>
                  <th className="px-3 py-2">Cód. SAP</th>
                  <th className="px-3 py-2">Observação</th>
                  <th className="px-3 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {equipamentosFiltrados.map((e) => {
                  const capa = e.foto_url ?? fotos[e.id]?.[0]?.url ?? null;
                  return (
                    <tr
                      key={e.id}
                      className="border-b border-slate-100 align-middle last:border-0 hover:bg-slate-50 dark:border-slate-700/60 dark:hover:bg-slate-800/60"
                    >
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => alternarCritico(e)}
                          disabled={salvandoCritico === e.id || !perms.editar}
                          title={e.critico ? "Desmarcar crítico" : "Marcar crítico"}
                          className="inline-flex items-center justify-center disabled:opacity-60"
                        >
                          {salvandoCritico === e.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                          ) : (
                            <Star
                              className={`h-4 w-4 ${
                                e.critico ? "text-amber-500" : "text-slate-300 dark:text-slate-600"
                              }`}
                              fill={e.critico ? "currentColor" : "none"}
                            />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {capa && (
                            <img
                              src={capa}
                              alt=""
                              className="h-8 w-8 shrink-0 rounded-md border border-slate-200 object-cover dark:border-slate-600"
                            />
                          )}
                          <span className="font-mono text-[13px] font-semibold text-[#0b3a73] dark:text-white">
                            {e.tag}
                          </span>
                        </div>
                      </td>
                      <td className="max-w-[220px] px-3 py-2">
                        <span className="line-clamp-2 text-[13px] text-slate-700 dark:text-slate-200">
                          {e.descricao}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <Badge
                          className={`border ${CATEGORIA_CORES[nomeCategoria(e)] ?? CATEGORIA_CORES.outras}`}
                        >
                          {nomeCategoria(e)}
                        </Badge>
                        <div className="mt-0.5 text-[11px] text-slate-400">{e.tipo}</div>
                      </td>
                      <td className="px-3 py-2">
                        {perms.editar ? (
                          <select
                            value={e.status}
                            onChange={(ev) =>
                              atualizarStatus(e, ev.target.value as StatusEquipamento)
                            }
                            className={`min-h-7 rounded-md border px-1.5 py-1 text-[12px] font-semibold ${STATUS_CORES[e.status] ?? STATUS_CORES.Operacional}`}
                          >
                            {STATUS_EQUIPAMENTO.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Badge
                            className={`border ${STATUS_CORES[e.status] ?? STATUS_CORES.Operacional}`}
                          >
                            {e.status}
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2 text-[13px] text-slate-600 dark:text-slate-300">
                        {e.origem || "—"}
                      </td>
                      <td className="px-3 py-2 font-mono text-[12px] text-slate-600 dark:text-slate-300">
                        {e.codigo_sap || "—"}
                      </td>
                      <td className="px-3 py-2">
                        <ObservacaoCell
                          equip={e}
                          podeEditar={perms.editar}
                          onSalvar={salvarObservacao}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => abrirGaleria(e)}
                            title="Fotos"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-[#1f7ad6] dark:text-slate-400 dark:hover:bg-slate-700"
                          >
                            <Camera className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => abrirRegistros(e)}
                            title="Registros"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-[#1f7ad6] dark:text-slate-400 dark:hover:bg-slate-700"
                          >
                            <ClipboardList className="h-4 w-4" />
                          </button>
                          {perms.editar && (
                            <button
                              type="button"
                              onClick={() => abrirEditar(e)}
                              title="Editar"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-emerald-600 dark:text-slate-400 dark:hover:bg-slate-700"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                          )}
                          {perms.remover && (
                            <button
                              type="button"
                              onClick={() => excluirEquipamento(e)}
                              title="Excluir"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-900/30"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Dialog Novo / Editar */}
      <Dialog open={dialogNovo} onOpenChange={setDialogNovo}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#0b3a73]">
              <Plus className="mr-1 inline h-4 w-4" /> Novo Equipamento
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>Tag *</span>
              <input
                value={form.tag}
                onChange={(e) => setForm({ ...form, tag: e.target.value })}
                placeholder="Ex.: MOT-Q2A-01"
                className={inputCls + " font-mono"}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Tipo *</span>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className={inputCls}
              >
                {TIPOS_EQUIPAMENTO.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className={labelCls}>Descrição *</span>
              <input
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Descrição do equipamento"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Categoria</span>
              <select
                value={form.categoria_id}
                onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}
                className={inputCls}
              >
                <option value="">Sem categoria</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelCls}>Status</span>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as StatusEquipamento })}
                className={inputCls}
              >
                {STATUS_EQUIPAMENTO.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelCls}>Origem</span>
              <input
                value={form.origem}
                onChange={(e) => setForm({ ...form, origem: e.target.value })}
                placeholder="Origem / localização"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Código SAP</span>
              <input
                value={form.codigo_sap}
                onChange={(e) => setForm({ ...form, codigo_sap: e.target.value })}
                placeholder="Código no SAP"
                className={inputCls + " font-mono"}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className={labelCls}>Observação</span>
              <textarea
                value={form.observacao}
                onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                rows={2}
                placeholder="Observação geral sobre o equipamento"
                className={inputCls + " resize-none"}
              />
            </label>
            <label className="flex items-center gap-2 text-[13px] font-semibold text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={form.critico}
                onChange={(e) => setForm({ ...form, critico: e.target.checked })}
                className="h-4 w-4 accent-amber-500"
              />
              Equipamento crítico
            </label>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <button onClick={() => setDialogNovo(false)} className={btnOutlineCls}>
              Cancelar
            </button>
            <button
              onClick={salvarEquipamento}
              disabled={salvandoForm}
              className="inline-flex items-center gap-1 rounded-md bg-[#0b3a73] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#1f7ad6] disabled:opacity-50"
            >
              {salvandoForm && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar equipamento
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogEditar != null} onOpenChange={(o) => !o && setDialogEditar(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#0b3a73]">
              <Edit3 className="mr-1 inline h-4 w-4" /> Editar · {dialogEditar?.tag ?? ""}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>Tag *</span>
              <input
                value={form.tag}
                onChange={(e) => setForm({ ...form, tag: e.target.value })}
                className={inputCls + " font-mono"}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Tipo *</span>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className={inputCls}
              >
                {TIPOS_EQUIPAMENTO.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className={labelCls}>Descrição *</span>
              <input
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Categoria</span>
              <select
                value={form.categoria_id}
                onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}
                className={inputCls}
              >
                <option value="">Sem categoria</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelCls}>Status</span>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as StatusEquipamento })}
                className={inputCls}
              >
                {STATUS_EQUIPAMENTO.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelCls}>Origem</span>
              <input
                value={form.origem}
                onChange={(e) => setForm({ ...form, origem: e.target.value })}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Código SAP</span>
              <input
                value={form.codigo_sap}
                onChange={(e) => setForm({ ...form, codigo_sap: e.target.value })}
                className={inputCls + " font-mono"}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className={labelCls}>Observação</span>
              <textarea
                value={form.observacao}
                onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                rows={2}
                className={inputCls + " resize-none"}
              />
            </label>
            <label className="flex items-center gap-2 text-[13px] font-semibold text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={form.critico}
                onChange={(e) => setForm({ ...form, critico: e.target.checked })}
                className="h-4 w-4 accent-amber-500"
              />
              Equipamento crítico
            </label>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            {perms.remover && dialogEditar && (
              <button
                onClick={() => excluirEquipamento(dialogEditar)}
                className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-white px-3 py-2 text-[13px] font-semibold text-red-600 hover:bg-red-50 dark:border-red-700 dark:bg-slate-800 dark:text-red-400"
              >
                <Trash2 className="h-4 w-4" /> Excluir
              </button>
            )}
            <div className="ml-auto flex gap-2">
              <button onClick={() => setDialogEditar(null)} className={btnOutlineCls}>
                Cancelar
              </button>
              <button
                onClick={salvarEquipamento}
                disabled={salvandoForm}
                className="inline-flex items-center gap-1 rounded-md bg-[#0b3a73] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#1f7ad6] disabled:opacity-50"
              >
                {salvandoForm && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Galeria de Fotos */}
      <Dialog open={galeria != null} onOpenChange={(o) => !o && setGaleria(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#0b3a73]">
              <Camera className="mr-1 inline h-4 w-4" /> Fotos · {galeria?.tag ?? ""}
            </DialogTitle>
          </DialogHeader>
          {galeria && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {(fotos[galeria.id] ?? []).map((f) => (
                  <div key={f.id} className="group relative">
                    <img
                      src={f.url}
                      alt=""
                      className="h-40 w-full rounded-lg border border-slate-200 object-cover dark:border-slate-600"
                    />
                    {perms.editar && (
                      <button
                        type="button"
                        onClick={() => removerFoto(f)}
                        title="Remover foto"
                        className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition hover:bg-red-600 group-hover:opacity-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <span className="mt-0.5 block text-center text-[10px] text-slate-400">
                      {formatData(f.criado_em)}
                    </span>
                  </div>
                ))}
                {(fotos[galeria.id] ?? []).length === 0 && (
                  <p className="col-span-full py-6 text-center text-sm text-slate-400">
                    Nenhuma foto ainda. Adicione a primeira foto do equipamento.
                  </p>
                )}
              </div>
              {perms.editar && (
                <>
                  <input
                    ref={fotoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) await uploadFoto(file);
                      if (fotoInputRef.current) fotoInputRef.current.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fotoInputRef.current?.click()}
                    disabled={enviandoFoto}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {enviandoFoto ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Adicionar foto
                  </button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Registros */}
      <Dialog open={registrosEq != null} onOpenChange={(o) => !o && setRegistrosEq(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#0b3a73]">
              <ClipboardList className="mr-1 inline h-4 w-4" /> Registros · {registrosEq?.tag ?? ""}
            </DialogTitle>
          </DialogHeader>
          {registrosEq && (
            <div className="space-y-3">
              {perms.criar && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                  <select
                    value={novoRegistroTipo}
                    onChange={(e) => setNovoRegistroTipo(e.target.value)}
                    className={selectCls + " mb-2 w-full"}
                  >
                    {TIPOS_REGISTRO.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <textarea
                    value={novoRegistroTexto}
                    onChange={(e) => setNovoRegistroTexto(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        adicionarRegistro();
                      }
                    }}
                    rows={2}
                    placeholder="Descreva o registro..."
                    className="w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#1f7ad6] focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={adicionarRegistro}
                      disabled={!novoRegistroTexto.trim() || salvandoRegistro}
                      className="inline-flex items-center gap-1 rounded-md bg-[#0b3a73] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#1f7ad6] disabled:opacity-50"
                    >
                      {salvandoRegistro && <Loader2 className="h-4 w-4 animate-spin" />}
                      Adicionar
                    </button>
                  </div>
                </div>
              )}
              <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
                {carregandoRegistros ? (
                  <div className="flex items-center justify-center py-6 text-slate-400">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
                  </div>
                ) : registrosLista.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-400">
                    Nenhum registro até o momento.
                  </p>
                ) : (
                  registrosLista.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-700/40"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge
                          className={`border ${
                            r.tipo === "Manutenção"
                              ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800"
                              : r.tipo === "Troca"
                                ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800"
                                : r.tipo === "Inspeção"
                                  ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800"
                                  : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600"
                          }`}
                        >
                          {r.tipo}
                        </Badge>
                        <span className="text-[10px] text-slate-400">
                          {formatData(r.criado_em)}
                          {r.autor_nome ? ` · ${r.autor_nome}` : ""}
                        </span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-[13px] text-slate-700 dark:text-slate-200">
                        {r.descricao}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Gerenciar Categorias */}
      <Dialog open={dialogCategorias} onOpenChange={setDialogCategorias}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0b3a73]">
              <Settings className="mr-1 inline h-4 w-4" /> Gerenciar Categorias de Equipamento
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <div className="mb-4 flex gap-2">
              <input
                value={novaCategoria}
                onChange={(e) => setNovaCategoria(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && criarCategoria()}
                placeholder="Nome da nova categoria..."
                className="min-h-10 flex-1 rounded-md border border-slate-300 px-3 text-sm shadow-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              />
              <button
                onClick={criarCategoria}
                disabled={!novaCategoria.trim()}
                className="rounded-md bg-[#0b3a73] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#1f7ad6] disabled:opacity-50"
              >
                <Plus className="mr-1 inline h-4 w-4" /> Criar
              </button>
            </div>
            <div className="max-h-80 space-y-2 overflow-auto">
              {categorias.length === 0 && (
                <p className="py-4 text-center text-sm text-slate-400">
                  Nenhuma categoria cadastrada.
                </p>
              )}
              {categorias.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800"
                >
                  {editCategoriaId === c.id ? (
                    <input
                      value={editCategoriaNome}
                      onChange={(e) => setEditCategoriaNome(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") renomearCategoria(c.id);
                        if (e.key === "Escape") setEditCategoriaId(null);
                      }}
                      className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditCategoriaId(c.id);
                        setEditCategoriaNome(c.nome);
                      }}
                      title="Clique para renomear"
                      className="flex-1 text-left text-sm font-semibold text-slate-700 hover:text-[#1f7ad6] dark:text-slate-200"
                    >
                      {c.nome}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removerCategoria(c.id, c.nome)}
                    title="Remover"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
