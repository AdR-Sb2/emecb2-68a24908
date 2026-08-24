import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback, useContext, createContext } from "react";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Save,
  History,
  Wrench,
  Zap,
  Droplets,
  Users,
  HardHat,
  Cog,
  FileSpreadsheet,
  ExternalLink,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { NavVoltarHome } from "@/components/nav-voltar-home";
import logoHeader from "@/assets/logo-branca.png";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Badge } from "@/components/ui/badge";
import { ListaRegistros } from "@/components/registros/ListaRegistros";
import type { PermissoesRegistros } from "@/lib/registros-permissoes";
import { getPermissoesCargo, temPermissao } from "@/lib/permissoes";
import type {
  Elevatoria,
  ElevatoriaEquipamento,
  ElevatoriaEletrica,
  ElevatoriaEletricaGeral,
  ElevatoriaHidraulica,
  ElevatoriaAreaInfluencia,
  ElevatoriaRolamentoSelo,
  ElevatoriaImplantacao,
  ElevatoriaImplantacaoEtapa,
  ElevatoriaAuditoria,
  ElevatoriaCampoNA,
  StatusImplantacao,
} from "@/lib/elevatoria-types";
import { IMPLANTACAO_STATUS_OPCOES } from "@/lib/elevatoria-types";

export const Route = createFileRoute("/elevatorias_/$id")({
  head: () => ({
    meta: [{ title: "Eletromecânica · Ficha da Elevatória" }],
  }),
  component: ElevatoriaFichaPage,
});

type PermissoesElev = {
  podeVer: boolean;
  podeEditar: boolean;
  podeVerMestres: boolean;
  podeEditarMestres: boolean;
  podeExportar: boolean;
  podeVerRegistros: boolean;
  permissoesRegistros: PermissoesRegistros;
};

type AbaDadosMestres =
  | "equipamento"
  | "eletrica"
  | "hidraulica"
  | "rolamentos"
  | "area_influencia"
  | "implantacao"
  | "historico";

interface CampoEditavel {
  tabela: string;
  campo: string;
  label: string;
  tipo?: "text" | "select" | "date" | "number";
  opcoes?: string[];
}

type FichaContextValue = {
  isNA: (tabela: string, campo: string) => boolean;
  toggleNA: (tabela: string, campo: string, motivo?: string) => Promise<void>;
  handleFieldChange: (
    tabela: string,
    campo: string,
    valor: string,
    grupo?: number,
    rowId?: number,
  ) => void;
  editMode: boolean;
  permissoes: PermissoesElev;
};

const FichaContext = createContext<FichaContextValue | null>(null);

function InputField({
  tabela,
  campo,
  label,
  tipo = "text",
  opcoes,
  valor,
  onChange,
  editOnly,
  grupo,
  rowId,
}: {
  tabela: string;
  campo: string;
  label: string;
  tipo?: string;
  opcoes?: string[];
  valor: string | null | undefined;
  onChange?: (v: string) => void;
  editOnly?: boolean;
  grupo?: number;
  rowId?: number;
}) {
  const ctx = useContext(FichaContext);
  const { isNA, toggleNA, handleFieldChange, editMode, permissoes } = ctx!;
  const [localValor, setLocalValor] = useState(valor ?? "");
  const na = isNA(tabela, campo);
  useEffect(() => {
    setLocalValor(valor ?? "");
  }, [valor]);
  const podeEditarBase =
    tabela === "elevatoria" ? permissoes.podeEditar : permissoes.podeEditarMestres;
  const podeEditar = editOnly ? podeEditarBase && editMode : podeEditarBase;
  const podeVer = tabela === "elevatoria" ? permissoes.podeVer : permissoes.podeVerMestres;

  if (!podeVer) return null;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </label>
        {podeEditar && (
          <button
            type="button"
            onClick={() => toggleNA(tabela, campo)}
            className={`text-[10px] px-1.5 py-0.5 rounded font-semibold transition ${
              na
                ? "bg-slate-200 text-slate-500 dark:bg-slate-600 dark:text-slate-300"
                : "text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400"
            }`}
            title={na ? "Remover N/A" : "Marcar como não aplicável"}
          >
            N/A
          </button>
        )}
      </div>
      {na ? (
        <div className="w-full rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm italic text-slate-400 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-500">
          Não aplicável
        </div>
      ) : tipo === "select" && opcoes ? (
        <select
          value={localValor}
          onChange={(e) => {
            const newVal = e.target.value;
            setLocalValor(newVal);
            if (onChange) onChange(newVal);
            else handleFieldChange(tabela, campo, newVal, grupo, rowId);
          }}
          disabled={!podeEditar}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:disabled:bg-slate-800"
        >
          <option value="">—</option>
          {opcoes.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={tipo}
          value={localValor}
          onChange={(e) => {
            const newVal = e.target.value;
            setLocalValor(newVal);
            if (onChange) onChange(newVal);
            else handleFieldChange(tabela, campo, newVal, grupo, rowId);
          }}
          disabled={!podeEditar}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-400 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:disabled:bg-slate-800"
        />
      )}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h3 className="mb-4 text-sm font-bold text-[#0b3a73] dark:text-white">{title}</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {children}
      </div>
    </div>
  );
}

function ElevatoriaFichaPage() {
  const { id } = Route.useParams() as { id: string };
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();

  const [elevatoria, setElevatoria] = useState<Elevatoria | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissoes, setPermissoes] = useState<PermissoesElev>({
    podeVer: false,
    podeEditar: false,
    podeVerMestres: false,
    podeEditarMestres: false,
    podeExportar: false,
    podeVerRegistros: false,
    permissoesRegistros: { visualizar: false, criar: false, importar: false, anexarPdf: false },
  });

  const [aba, setAba] = useState<AbaDadosMestres>("equipamento");
  const [editMode, setEditMode] = useState(false);
  const [editingNome, setEditingNome] = useState(false);
  const [nomeTemp, setNomeTemp] = useState("");

  const [equipamentos, setEquipamentos] = useState<ElevatoriaEquipamento[]>([]);
  const [eletricas, setEletricas] = useState<ElevatoriaEletrica[]>([]);
  const [eletricaGeral, setEletricaGeral] = useState<ElevatoriaEletricaGeral | null>(null);
  const [hidraulica, setHidraulica] = useState<ElevatoriaHidraulica | null>(null);
  const [areaInfluencia, setAreaInfluencia] = useState<ElevatoriaAreaInfluencia | null>(null);
  const [rolamentos, setRolamentos] = useState<ElevatoriaRolamentoSelo[]>([]);
  const [implantacao, setImplantacao] = useState<ElevatoriaImplantacao | null>(null);
  const [etapas, setEtapas] = useState<ElevatoriaImplantacaoEtapa[]>([]);
  const [auditoria, setAuditoria] = useState<ElevatoriaAuditoria[]>([]);
  const [camposNA, setCamposNA] = useState<ElevatoriaCampoNA[]>([]);

  const [salvando, setSalvando] = useState(false);
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const lastSavedNome = useRef<string>("");

  const elevId = Number(id);

  useEffect(() => {
    if (authLoading) return;
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
  }, [user, profile, authLoading, navigate]);

  useEffect(() => {
    if (!profile?.cargo_id || !elevId) return;
    const init = async () => {
      try {
        const { data: panelData } = await supabase
          .from("cargo_paineis")
          .select("paineis!inner(chave)")
          .eq("cargo_id", profile.cargo_id)
          .eq("paineis.chave", "ficha_elevatoria")
          .maybeSingle();
        if (!panelData) {
          toast.error("Acesso não autorizado ao painel Ficha da Elevatória");
          navigate({ to: "/", replace: true });
          return;
        }

        const perms = await getPermissoesCargo(profile.cargo_id);
        setPermissoes({
          podeVer: temPermissao(perms, "ficha_elevatoria", "ver"),
          podeEditar: temPermissao(perms, "ficha_elevatoria", "editar"),
          podeVerMestres: temPermissao(perms, "ficha_elevatoria", "dados_mestres.ver"),
          podeEditarMestres: temPermissao(perms, "ficha_elevatoria", "dados_mestres.editar"),
          podeExportar: temPermissao(perms, "ficha_elevatoria", "exportar"),
          podeVerRegistros: temPermissao(perms, "registros", "visualizar"),
          permissoesRegistros: {
            visualizar: temPermissao(perms, "registros", "visualizar"),
            criar: temPermissao(perms, "registros", "criar"),
            importar: temPermissao(perms, "registros", "importar"),
            anexarPdf: temPermissao(perms, "registros", "anexar_pdf"),
          },
        });

        await carregarTudo();
      } catch (err) {
        toast.error(
          "Erro ao carregar ficha: " + (err instanceof Error ? err.message : "desconhecido"),
        );
        setLoading(false);
      }
    };
    init();
  }, [profile?.cargo_id, elevId]);

  const carregarTudo = async () => {
    setLoading(true);
    try {
      const [
        elevRes,
        equipRes,
        eletRes,
        eletGeralRes,
        hidrRes,
        areaRes,
        rolaRes,
        impRes,
        etapasRes,
        audRes,
        naRes,
      ] = await Promise.all([
        supabase.from("elevatorias").select("*").eq("id", elevId).single(),
        supabase
          .from("elevatoria_equipamento")
          .select("*")
          .eq("elevatoria_id", elevId)
          .order("grupo"),
        supabase.from("elevatoria_eletrica").select("*").eq("elevatoria_id", elevId).order("grupo"),
        supabase
          .from("elevatoria_eletrica_geral")
          .select("*")
          .eq("elevatoria_id", elevId)
          .maybeSingle(),
        supabase
          .from("elevatoria_hidraulica")
          .select("*")
          .eq("elevatoria_id", elevId)
          .maybeSingle(),
        supabase
          .from("elevatoria_area_influencia")
          .select("*")
          .eq("elevatoria_id", elevId)
          .maybeSingle(),
        supabase
          .from("elevatoria_rolamentos_selos")
          .select("*")
          .eq("elevatoria_id", elevId)
          .order("id"),
        supabase
          .from("elevatoria_implantacao")
          .select("*")
          .eq("elevatoria_id", elevId)
          .maybeSingle(),
        supabase.from("elevatoria_implantacao_etapas").select("*").order("ordem"),
        supabase
          .from("elevatoria_dados_mestres_auditoria")
          .select("*, profiles:usuario_id(nome_completo)")
          .eq("elevatoria_id", elevId)
          .order("criado_em", { ascending: false })
          .limit(200),
        supabase.from("elevatoria_campo_na").select("*").eq("elevatoria_id", elevId),
      ]);

      if (elevRes.error) {
        console.error("Erro Supabase:", elevRes.error);
        toast.error("Erro ao buscar elevatória: " + elevRes.error.message);
        navigate({ to: "/elevatorias", replace: true });
        return;
      }

      if (elevRes.data) {
        setElevatoria(elevRes.data);
        lastSavedNome.current = elevRes.data.nome;
      }
      if (equipRes.data) setEquipamentos(equipRes.data);
      if (eletRes.data) setEletricas(eletRes.data);
      if (eletGeralRes.data) setEletricaGeral(eletGeralRes.data);
      if (hidrRes.data) setHidraulica(hidrRes.data);
      if (areaRes.data) setAreaInfluencia(areaRes.data);
      if (rolaRes.data && rolaRes.data.length > 0) {
        setRolamentos(rolaRes.data);
      } else if (rolaRes.data && rolaRes.data.length === 0 && elevRes.data) {
        const { data: newRol, error: rolErr } = await supabase
          .from("elevatoria_rolamentos_selos")
          .insert({ elevatoria_id: elevId })
          .select()
          .single();
        if (rolErr) console.error("Erro ao criar Grupo 1 rolamentos:", rolErr);
        if (newRol) setRolamentos([newRol]);
      } else {
        setRolamentos([]);
      }
      if (impRes.data) setImplantacao(impRes.data);
      if (etapasRes.data) setEtapas(etapasRes.data);

      if (audRes.data) {
        setAuditoria(
          audRes.data.map((a: Record<string, unknown>) => ({
            ...a,
            usuario_nome: (a.profiles as { nome_completo?: string } | null)?.nome_completo ?? null,
          })) as ElevatoriaAuditoria[],
        );
      }

      if (naRes.data) setCamposNA(naRes.data);

      if (!elevRes.data) {
        toast.error("Elevatória não encontrada no banco de dados");
        navigate({ to: "/elevatorias", replace: true });
        return;
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      toast.error("Erro inesperado ao carregar ficha");
    } finally {
      setLoading(false);
    }
  };

  const isNA = (tabela: string, campo: string) =>
    camposNA.some((c) => c.tabela === tabela && c.campo === campo && c.elevatoria_id === elevId);

  const toggleNA = async (tabela: string, campo: string, motivo?: string) => {
    if (isNA(tabela, campo)) {
      await supabase
        .from("elevatoria_campo_na")
        .delete()
        .eq("elevatoria_id", elevId)
        .eq("tabela", tabela)
        .eq("campo", campo);
      setCamposNA((prev) => prev.filter((c) => !(c.tabela === tabela && c.campo === campo)));
    } else {
      const { data, error } = await supabase
        .from("elevatoria_campo_na")
        .insert({ elevatoria_id: elevId, tabela, campo, motivo: motivo || "" })
        .select()
        .single();
      if (error) {
        toast.error("Erro ao marcar N/A: " + error.message);
        return;
      }
      if (data) setCamposNA((prev) => [...prev, data]);
    }
  };

  const salvarField = useCallback(
    async (tabela: string, campo: string, valor: string | null, grupo?: number, rowId?: number) => {
      if (!permissoes.podeEditarMestres) return;
      const tabelaReal = tabela === "elevatoria" ? "elevatorias" : tabela;

      if (tabela === "elevatoria" && campo === "nome" && (valor === null || valor === "")) {
        setElevatoria((prev) => (prev ? { ...prev, nome: lastSavedNome.current } : prev));
        toast.error("Este campo não pode ficar vazio");
        return;
      }

      setSalvando(true);
      const isMultiGrupo = tabela === "elevatoria_equipamento" || tabela === "elevatoria_eletrica";
      const isGeral = tabela === "elevatoria_eletrica_geral";

      let filtro: Record<string, unknown>;
      let onConflict: string;

      if (isMultiGrupo && grupo !== undefined) {
        filtro = { elevatoria_id: elevId, grupo };
        onConflict = "elevatoria_id,grupo";
      } else if (isGeral) {
        filtro = { elevatoria_id: elevId };
        onConflict = "elevatoria_id";
      } else if (rowId !== undefined) {
        filtro = { id: rowId };
        onConflict = "id";
      } else {
        filtro = { elevatoria_id: elevId };
        onConflict = "elevatoria_id";
      }

      let error;
      if (tabela === "elevatoria") {
        ({ error } = await supabase
          .from(tabelaReal)
          .update({ [campo]: valor || null })
          .eq("id", elevId));
      } else if (rowId !== undefined) {
        ({ error } = await supabase
          .from(tabelaReal)
          .update({ [campo]: valor || null })
          .eq("id", rowId));
      } else {
        ({ error } = await supabase
          .from(tabelaReal)
          .upsert({ ...filtro, [campo]: valor || null } as Record<string, unknown>, {
            onConflict,
            ignoreDuplicates: false,
          }));
      }

      if (!error) {
        const newVal = valor || null;
        if (tabela === "elevatoria") {
          setElevatoria((prev) => (prev ? { ...prev, [campo]: newVal } : prev));
          if (campo === "nome") lastSavedNome.current = valor || "";
        } else if (tabela === "elevatoria_equipamento" && grupo !== undefined) {
          setEquipamentos((prev) =>
            prev.map((e) => (e.grupo === grupo ? { ...e, [campo]: newVal } : e)),
          );
        } else if (tabela === "elevatoria_eletrica" && grupo !== undefined) {
          setEletricas((prev) =>
            prev.map((e) => (e.grupo === grupo ? { ...e, [campo]: newVal } : e)),
          );
        } else if (tabela === "elevatoria_eletrica_geral") {
          setEletricaGeral((prev) => (prev ? { ...prev, [campo]: newVal } : prev));
        } else if (tabela === "elevatoria_rolamentos_selos" && rowId !== undefined) {
          setRolamentos((prev) =>
            prev.map((r) => (r.id === rowId ? { ...r, [campo]: newVal } : r)),
          );
        } else if (tabela === "elevatoria_hidraulica") {
          setHidraulica((prev) => (prev ? { ...prev, [campo]: newVal } : prev));
        } else if (tabela === "elevatoria_area_influencia") {
          setAreaInfluencia((prev) => (prev ? { ...prev, [campo]: newVal } : prev));
        } else if (tabela === "elevatoria_implantacao") {
          setImplantacao((prev) => (prev ? { ...prev, [campo]: newVal } : prev));
        }
      } else {
        if (
          tabela === "elevatoria" &&
          campo === "nome" &&
          error.message?.includes("violates not-null constraint")
        ) {
          setElevatoria((prev) => (prev ? { ...prev, nome: lastSavedNome.current } : prev));
          toast.error("Este campo não pode ficar vazio");
        } else {
          toast.error("Erro ao salvar: " + error.message);
        }
      }
      setSalvando(false);
    },
    [
      elevId,
      permissoes.podeEditarMestres,
      setElevatoria,
      setEquipamentos,
      setEletricas,
      setEletricaGeral,
      setHidraulica,
      setAreaInfluencia,
      setRolamentos,
      setImplantacao,
    ],
  );

  const handleFieldChange = (
    tabela: string,
    campo: string,
    valor: string,
    grupo?: number,
    rowId?: number,
  ) => {
    const cacheKey = `${tabela}:${campo}:${grupo ?? ""}:${rowId ?? ""}`;
    if (saveTimers.current.has(cacheKey)) {
      clearTimeout(saveTimers.current.get(cacheKey));
    }
    saveTimers.current.set(
      cacheKey,
      setTimeout(() => {
        salvarField(tabela, campo, valor, grupo, rowId);
        saveTimers.current.delete(cacheKey);
      }, 600),
    );
  };

  const salvarImplantacaoStatus = async (status: StatusImplantacao) => {
    if (!permissoes.podeEditarMestres) return;
    setSalvando(true);
    const { error } = await supabase
      .from("elevatoria_implantacao")
      .upsert(
        { elevatoria_id: elevId, status },
        { onConflict: "elevatoria_id", ignoreDuplicates: false },
      );
    if (error) toast.error("Erro ao salvar: " + error.message);
    else toast.success("Status atualizado");
    setSalvando(false);
    await carregarTudo();
  };

  const toggleEtapa = async (etapaId: number, concluida: boolean) => {
    if (!permissoes.podeEditarMestres) return;
    await supabase.from("elevatoria_implantacao_etapas").update({ concluida }).eq("id", etapaId);
    setEtapas((prev) => prev.map((e) => (e.id === etapaId ? { ...e, concluida } : e)));
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f0f4f8] dark:bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-[#1f7ad6]" />
      </div>
    );
  }

  if (!elevatoria) return null;

  return (
    <FichaContext.Provider value={{ isNA, toggleNA, handleFieldChange, editMode, permissoes }}>
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
                <p className="truncate text-sm text-cyan-50/90">
                  Eletromecânica · Ficha da Elevatória
                </p>
              </div>
            </div>
            <NavVoltarHome />
          </div>
        </div>

        {/* Title + actions */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/elevatorias"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <h1
                className={`truncate text-lg font-bold text-[#0b3a73] dark:text-white ${editMode ? "cursor-pointer" : ""}`}
                onClick={() => {
                  if (editMode && permissoes.podeEditar) {
                    setEditingNome(true);
                    setNomeTemp(elevatoria.nome);
                  }
                }}
                title={editMode ? "Clique para editar o nome" : ""}
              >
                {editingNome ? (
                  <span className="flex items-center gap-1">
                    <input
                      autoFocus
                      value={nomeTemp}
                      onChange={(e) => setNomeTemp(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          if (!nomeTemp.trim()) {
                            toast.error("Nome não pode ficar vazio");
                            return;
                          }
                          salvarField("elevatoria", "nome", nomeTemp);
                          setElevatoria((prev) => (prev ? { ...prev, nome: nomeTemp } : prev));
                          setEditingNome(false);
                        } else if (e.key === "Escape") {
                          setEditingNome(false);
                        }
                      }}
                      className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-lg font-bold text-[#0b3a73] outline-none placeholder:text-slate-400"
                      placeholder="Nome..."
                    />
                    <button
                      onClick={() => {
                        if (!nomeTemp.trim()) {
                          toast.error("Nome não pode ficar vazio");
                          return;
                        }
                        salvarField("elevatoria", "nome", nomeTemp);
                        setElevatoria((prev) => (prev ? { ...prev, nome: nomeTemp } : prev));
                        setEditingNome(false);
                      }}
                      className="rounded-full bg-emerald-500 p-0.5 text-white hover:bg-emerald-600"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingNome(false)}
                      className="rounded-full bg-red-500 p-0.5 text-white hover:bg-red-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ) : (
                  elevatoria.nome
                )}
              </h1>
              {elevatoria.planta && (
                <Badge
                  variant="outline"
                  className="border-slate-300 bg-white text-[10px] text-slate-500 dark:border-slate-600 dark:bg-slate-800"
                >
                  {elevatoria.planta}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {salvando && (
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <Loader2 className="h-3 w-3 animate-spin" /> Salvando...
              </span>
            )}
            {permissoes.podeEditar && (
              <button
                onClick={() => setEditMode((prev) => !prev)}
                className={`inline-flex min-h-11 items-center gap-1 rounded-md border px-3 py-2 text-[13px] font-semibold shadow-sm transition ${
                  editMode
                    ? "border-amber-400 bg-amber-500 text-white hover:bg-amber-600"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                }`}
                title={editMode ? "Sair do modo edição" : "Ativar modo edição"}
              >
                <Pencil className="h-4 w-4" />
                {editMode ? "Editando" : "Editar"}
              </button>
            )}
            {permissoes.podeExportar && (
              <button
                onClick={() => {
                  try {
                    const wb = XLSX.utils.book_new();
                    const data: Record<string, string | number | null>[] = [];
                    const addFields = (prefix: string, fields: Record<string, unknown>) => {
                      for (const [k, v] of Object.entries(fields)) {
                        if (
                          k !== "id" &&
                          k !== "elevatoria_id" &&
                          k !== "criado_em" &&
                          k !== "atualizado_em"
                        ) {
                          const row: Record<string, string | number | null> = {};
                          row["Campo"] = prefix + " · " + k;
                          row["Valor"] = v as string | number | null;
                          data.push(row);
                        }
                      }
                    };
                    addFields("Básico", elevatoria || {});
                    for (const eq of equipamentos) addFields(`Equipamento G${eq.grupo}`, eq);
                    if (eletricaGeral) addFields("Elétrica Geral", eletricaGeral);
                    for (const el of eletricas) addFields(`Elétrica G${el.grupo}`, el);
                    if (hidraulica) addFields("Hidráulica", hidraulica);
                    if (areaInfluencia) addFields("Área Influência", areaInfluencia);
                    if (implantacao) addFields("Implantação", implantacao);
                    const ws = XLSX.utils.json_to_sheet(data);
                    XLSX.utils.book_append_sheet(wb, ws, elevatoria?.nome || "Ficha");
                    XLSX.writeFile(
                      wb,
                      `ficha_${elevatoria?.nome || "elevatoria"}_${new Date().toISOString().slice(0, 10)}.xlsx`,
                    );
                    toast.success("Exportação concluída!");
                  } catch (err) {
                    toast.error(
                      "Erro ao exportar: " + (err instanceof Error ? err.message : "desconhecido"),
                    );
                  }
                }}
                className="inline-flex min-h-11 items-center gap-1 rounded-md border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800 px-3 py-2 text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <FileSpreadsheet className="h-4 w-4" /> Exportar
              </button>
            )}
          </div>
        </div>

        <div className="mx-auto max-w-[1400px]">
          {/* Basic Info Card */}
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  <InputField
                    tabela="elevatoria"
                    campo="nome"
                    label="Nome"
                    valor={elevatoria.nome}
                    editOnly
                  />
                  <InputField
                    tabela="elevatoria"
                    campo="planta"
                    label="Planta"
                    valor={elevatoria.planta}
                  />
                  <InputField
                    tabela="elevatoria"
                    campo="tipo"
                    label="Tipo"
                    valor={elevatoria.tipo}
                    opcoes={["EAT", "Booster", "Container", "Condomínio"]}
                    tipo="select"
                    editOnly
                  />
                  <InputField
                    tabela="elevatoria"
                    campo="superintendencia"
                    label="Superintendência"
                    valor={elevatoria.superintendencia}
                  />
                  <InputField
                    tabela="elevatoria"
                    campo="endereco"
                    label="Endereço"
                    valor={elevatoria.endereco}
                  />
                  <InputField
                    tabela="elevatoria"
                    campo="bairro"
                    label="Bairro"
                    valor={elevatoria.bairro}
                  />
                  <InputField
                    tabela="elevatoria"
                    campo="municipio"
                    label="Município"
                    valor={elevatoria.municipio}
                  />
                  <InputField tabela="elevatoria" campo="cep" label="CEP" valor={elevatoria.cep} />
                  <InputField
                    tabela="elevatoria"
                    campo="inicio_operacao"
                    label="Início de Operação"
                    tipo="date"
                    valor={elevatoria.inicio_operacao}
                  />
                  <InputField
                    tabela="elevatoria"
                    campo="caracteristicas_area"
                    label="Características da Área"
                    valor={elevatoria.caracteristicas_area}
                    opcoes={["FORMAL", "INFORMAL"]}
                    tipo="select"
                  />
                  <InputField
                    tabela="elevatoria"
                    campo="grupo"
                    label="Grupo"
                    valor={elevatoria.grupo}
                  />
                  <InputField
                    tabela="elevatoria"
                    campo="funcao"
                    label="Função"
                    valor={elevatoria.funcao}
                  />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 sm:w-1/2 lg:w-1/3">
                  <InputField
                    tabela="elevatoria"
                    campo="latitude"
                    label="Latitude"
                    tipo="number"
                    valor={elevatoria.latitude?.toString()}
                  />
                  <InputField
                    tabela="elevatoria"
                    campo="longitude"
                    label="Longitude"
                    tipo="number"
                    valor={elevatoria.longitude?.toString()}
                  />
                  {elevatoria.latitude != null && elevatoria.longitude != null ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${elevatoria.latitude},${elevatoria.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="col-span-2 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-[#1f7ad6] bg-[#1f7ad6]/10 px-3 py-2 text-[13px] font-semibold text-[#1f7ad6] transition hover:bg-[#1f7ad6] hover:text-white dark:border-[#38bdf8] dark:bg-[#38bdf8]/10 dark:text-[#38bdf8] dark:hover:bg-[#38bdf8]"
                    >
                      <ExternalLink className="h-4 w-4" /> Abrir mapa
                    </a>
                  ) : null}
                </div>
              </div>
              <div className="xl:col-span-1">
                <div className="flex h-full min-h-[200px] items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700">
                  {elevatoria.latitude && elevatoria.longitude ? (
                    <iframe
                      title="Mapa"
                      width="100%"
                      height="100%"
                      style={{ minHeight: 200, borderRadius: 12 }}
                      loading="lazy"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${elevatoria.longitude - 0.01}%2C${elevatoria.latitude - 0.01}%2C${elevatoria.longitude + 0.01}%2C${elevatoria.latitude + 0.01}&layer=mapnik&marker=${elevatoria.latitude}%2C${elevatoria.longitude}`}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <MapPin className="h-8 w-8" />
                      <span className="text-xs">Coordenadas não informadas</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Registros (Informação + Atendimentos) */}
          {permissoes.podeVerRegistros && (
            <div className="mb-6">
              <ListaRegistros elevatoriaId={elevId} permissoes={permissoes.permissoesRegistros} />
            </div>
          )}

          {/* Dados Mestres Sections (only if user has permission) */}
          {permissoes.podeVerMestres && (
            <>
              {/* Tabs */}
              <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-700">
                {[
                  {
                    key: "equipamento" as AbaDadosMestres,
                    label: "Equipamento Instalado",
                    icon: Wrench,
                  },
                  { key: "eletrica" as AbaDadosMestres, label: "Elétrica & Automação", icon: Zap },
                  { key: "hidraulica" as AbaDadosMestres, label: "Hidráulica", icon: Droplets },
                  { key: "rolamentos" as AbaDadosMestres, label: "Rolamentos & Selos", icon: Cog },
                  {
                    key: "area_influencia" as AbaDadosMestres,
                    label: "Área de Influência",
                    icon: Users,
                  },
                  { key: "implantacao" as AbaDadosMestres, label: "Implantação", icon: HardHat },
                  { key: "historico" as AbaDadosMestres, label: "Histórico", icon: History },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setAba(tab.key)}
                    className={`inline-flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                      aba === tab.key
                        ? "border-[#1f7ad6] text-[#1f7ad6] dark:border-[#38bdf8] dark:text-[#38bdf8]"
                        : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {aba === "equipamento" && (
                <div className="space-y-4">
                  {equipamentos.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-600 dark:bg-slate-800">
                      <Wrench className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-500" />
                      <p className="text-sm text-slate-400">Nenhum equipamento registrado.</p>
                      {permissoes.podeEditarMestres && (
                        <p className="mt-1 text-xs text-slate-400">
                          Use o botão abaixo para adicionar.
                        </p>
                      )}
                    </div>
                  ) : (
                    equipamentos.map((eq) => (
                      <div key={eq.id} className="space-y-4">
                        <h4 className="text-sm font-bold text-[#0b3a73] dark:text-white">
                          Grupo {eq.grupo}
                        </h4>
                        <SectionCard title="Motor Elétrico">
                          <InputField
                            tabela="elevatoria_equipamento"
                            campo="potencia_motor_cv"
                            label="Potência do Motor (CV)"
                            valor={eq.potencia_motor_cv}
                            grupo={eq.grupo}
                          />
                          <InputField
                            tabela="elevatoria_equipamento"
                            campo="rpm"
                            label="RPM"
                            valor={eq.rpm}
                            grupo={eq.grupo}
                          />
                          <InputField
                            tabela="elevatoria_equipamento"
                            campo="marca_motor"
                            label="Marca do Motor"
                            valor={eq.marca_motor}
                            grupo={eq.grupo}
                          />
                          <InputField
                            tabela="elevatoria_equipamento"
                            campo="carcaca_motor"
                            label="Carcaça do Motor"
                            valor={eq.carcaca_motor}
                            grupo={eq.grupo}
                          />
                          <InputField
                            tabela="elevatoria_equipamento"
                            campo="tag_motor"
                            label="TAG do Motor"
                            valor={eq.tag_motor}
                            grupo={eq.grupo}
                          />
                          <InputField
                            tabela="elevatoria_equipamento"
                            campo="tensao_v"
                            label="Tensão (V)"
                            valor={eq.tensao_v}
                            grupo={eq.grupo}
                          />
                          <InputField
                            tabela="elevatoria_equipamento"
                            campo="corrente_a"
                            label="Corrente (A)"
                            valor={eq.corrente_a}
                            grupo={eq.grupo}
                          />
                          <InputField
                            tabela="elevatoria_equipamento"
                            campo="mancais_la"
                            label="Mancais (LA)"
                            valor={eq.mancais_la}
                            grupo={eq.grupo}
                          />
                          <InputField
                            tabela="elevatoria_equipamento"
                            campo="mancais_loa"
                            label="Mancais (LOA)"
                            valor={eq.mancais_loa}
                            grupo={eq.grupo}
                          />
                          <InputField
                            tabela="elevatoria_equipamento"
                            campo="ponta_eixo_motor"
                            label="Ponta do Eixo do Motor"
                            valor={eq.ponta_eixo_motor}
                            grupo={eq.grupo}
                          />
                          <InputField
                            tabela="elevatoria_equipamento"
                            campo="sentido_montagem_motor"
                            label="Sentido de Montagem do Motor"
                            valor={eq.sentido_montagem_motor}
                            grupo={eq.grupo}
                          />
                          <InputField
                            tabela="elevatoria_equipamento"
                            campo="cod_sap_motor"
                            label="Cód. SAP Motor"
                            valor={eq.cod_sap_motor}
                            grupo={eq.grupo}
                          />
                        </SectionCard>
                        <SectionCard title="Bomba">
                          <InputField
                            tabela="elevatoria_equipamento"
                            campo="modelo_bomba"
                            label="Modelo da Bomba"
                            valor={eq.modelo_bomba}
                            grupo={eq.grupo}
                          />
                          <InputField
                            tabela="elevatoria_equipamento"
                            campo="tag_bomba"
                            label="TAG da Bomba"
                            valor={eq.tag_bomba}
                            grupo={eq.grupo}
                          />
                          <InputField
                            tabela="elevatoria_equipamento"
                            campo="marca_bomba"
                            label="Marca da Bomba"
                            valor={eq.marca_bomba}
                            grupo={eq.grupo}
                          />
                          <InputField
                            tabela="elevatoria_equipamento"
                            campo="diametro_rotor_pol"
                            label="Ø Rotor (pol)"
                            valor={eq.diametro_rotor_pol}
                            grupo={eq.grupo}
                          />
                          <InputField
                            tabela="elevatoria_equipamento"
                            campo="diametro_rotor_mm"
                            label="Ø Rotor (mm)"
                            valor={eq.diametro_rotor_mm}
                            grupo={eq.grupo}
                          />
                          <InputField
                            tabela="elevatoria_equipamento"
                            campo="tipo_construtivo_elevatoria"
                            label="Tipo Construtivo"
                            valor={eq.tipo_construtivo_elevatoria}
                            tipo="select"
                            opcoes={["Abrigada", "Submersa", "Tubulão", "Casinha", "Container"]}
                            grupo={eq.grupo}
                          />
                          <InputField
                            tabela="elevatoria_equipamento"
                            campo="bomba_dreno"
                            label="Bomba Dreno"
                            valor={eq.bomba_dreno}
                            opcoes={["Sim", "Não"]}
                            tipo="select"
                            grupo={eq.grupo}
                          />
                          <InputField
                            tabela="elevatoria_equipamento"
                            campo="flange"
                            label="Flange"
                            valor={eq.flange}
                            grupo={eq.grupo}
                          />
                          <InputField
                            tabela="elevatoria_equipamento"
                            campo="forma_construtiva_bomba"
                            label="Forma Construtiva da Bomba"
                            valor={eq.forma_construtiva_bomba}
                            grupo={eq.grupo}
                          />
                          <InputField
                            tabela="elevatoria_equipamento"
                            campo="vazao_aproximada_m3h"
                            label="Vazão Aproximada (m³/h)"
                            valor={eq.vazao_aproximada_m3h}
                            grupo={eq.grupo}
                          />
                          <InputField
                            tabela="elevatoria_equipamento"
                            campo="amt_aproximada"
                            label="AMT Aproximada"
                            valor={eq.amt_aproximada}
                            grupo={eq.grupo}
                          />
                          <InputField
                            tabela="elevatoria_equipamento"
                            campo="capacidade_tratamento"
                            label="Capacidade de Tratamento"
                            valor={eq.capacidade_tratamento}
                            grupo={eq.grupo}
                          />
                          <InputField
                            tabela="elevatoria_equipamento"
                            campo="procedencia_mca"
                            label="Procedência do MCA"
                            valor={eq.procedencia_mca}
                            grupo={eq.grupo}
                          />
                          <InputField
                            tabela="elevatoria_equipamento"
                            campo="cod_sap_bomba"
                            label="Cód. SAP Bomba"
                            valor={eq.cod_sap_bomba}
                            grupo={eq.grupo}
                          />
                        </SectionCard>
                      </div>
                    ))
                  )}
                  {permissoes.podeEditarMestres && editMode && (
                    <button
                      onClick={async () => {
                        const nextGrupo =
                          equipamentos.length > 0
                            ? Math.max(...equipamentos.map((e) => e.grupo)) + 1
                            : 1;
                        const { data, error } = await supabase
                          .from("elevatoria_equipamento")
                          .insert({ elevatoria_id: elevId, grupo: nextGrupo })
                          .select()
                          .single();
                        if (error) {
                          toast.error("Erro ao adicionar grupo: " + error.message);
                          return;
                        }
                        if (data) {
                          setEquipamentos((prev) => [...prev, data]);
                          toast.success("Grupo de equipamento adicionado");
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-500 transition hover:border-[#1f7ad6] hover:text-[#1f7ad6] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    >
                      + Adicionar grupo
                    </button>
                  )}
                </div>
              )}

              {aba === "eletrica" && (
                <div className="space-y-4">
                  {/* Cards Gerais (fora do loop de grupo) */}
                  <SectionCard title="Alimentação">
                    <InputField
                      tabela="elevatoria_eletrica_geral"
                      campo="bt_mt"
                      label="BT/MT"
                      valor={eletricaGeral?.bt_mt}
                    />
                    <InputField
                      tabela="elevatoria_eletrica_geral"
                      campo="trafo_kva"
                      label="TRAFO (KVA)"
                      valor={eletricaGeral?.trafo_kva}
                    />
                  </SectionCard>
                  <SectionCard title="Concessionária de Energia">
                    <InputField
                      tabela="elevatoria_eletrica_geral"
                      campo="num_cliente"
                      label="N° Cliente"
                      valor={eletricaGeral?.num_cliente}
                    />
                    <InputField
                      tabela="elevatoria_eletrica_geral"
                      campo="medidor"
                      label="Medidor"
                      valor={eletricaGeral?.medidor}
                    />
                    <InputField
                      tabela="elevatoria_eletrica_geral"
                      campo="medidor_apurado"
                      label="Medidor Apurado"
                      valor={eletricaGeral?.medidor_apurado}
                    />
                    <InputField
                      tabela="elevatoria_eletrica_geral"
                      campo="medidor_apurado_data"
                      label="Data Medição"
                      tipo="date"
                      valor={eletricaGeral?.medidor_apurado_data}
                    />
                    <InputField
                      tabela="elevatoria_eletrica_geral"
                      campo="unidade_consumo"
                      label="Unidade de Consumo"
                      valor={eletricaGeral?.unidade_consumo}
                    />
                    <InputField
                      tabela="elevatoria_eletrica_geral"
                      campo="endereco_concessionaria"
                      label="Endereço (Concessionária)"
                      valor={eletricaGeral?.endereco_concessionaria}
                    />
                    <InputField
                      tabela="elevatoria_eletrica_geral"
                      campo="custo_medio_kwh"
                      label="Custo Médio (R$/kWh)"
                      valor={eletricaGeral?.custo_medio_kwh}
                    />
                    <InputField
                      tabela="elevatoria_eletrica_geral"
                      campo="meses_media_kwh"
                      label="Meses da Média (ex: Jan-Jun)"
                      valor={eletricaGeral?.meses_media_kwh}
                    />
                  </SectionCard>
                  <SectionCard title="Automação">
                    <InputField
                      tabela="elevatoria_eletrica_geral"
                      campo="tag_painel_aut"
                      label="TAG do Painel AUT"
                      valor={eletricaGeral?.tag_painel_aut}
                    />
                    <InputField
                      tabela="elevatoria_eletrica_geral"
                      campo="pcp"
                      label="PCP"
                      valor={eletricaGeral?.pcp}
                      opcoes={["Sim", "Não"]}
                      tipo="select"
                    />
                    <InputField
                      tabela="elevatoria_eletrica_geral"
                      campo="clp"
                      label="CLP"
                      valor={eletricaGeral?.clp}
                      opcoes={["Sim", "Não"]}
                      tipo="select"
                    />
                    <InputField
                      tabela="elevatoria_eletrica_geral"
                      campo="modelo_clp"
                      label="Modelo CLP"
                      valor={eletricaGeral?.modelo_clp}
                    />
                    <InputField
                      tabela="elevatoria_eletrica_geral"
                      campo="versao_tea_portal"
                      label="Versão TEA Portal"
                      valor={eletricaGeral?.versao_tea_portal}
                    />
                    <InputField
                      tabela="elevatoria_eletrica_geral"
                      campo="serial_chip"
                      label="Serial do CHIP"
                      valor={eletricaGeral?.serial_chip}
                    />
                    <InputField
                      tabela="elevatoria_eletrica_geral"
                      campo="operadora"
                      label="Operadora"
                      valor={eletricaGeral?.operadora}
                    />
                  </SectionCard>

                  {/* Cards por Grupo (Painéis + Setpoint) */}
                  {eletricas.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-600 dark:bg-slate-800">
                      <Zap className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-500" />
                      <p className="text-sm text-slate-400">Nenhum grupo de painéis registrado.</p>
                      {permissoes.podeEditarMestres && (
                        <p className="mt-1 text-xs text-slate-400">
                          Use o botão abaixo para adicionar.
                        </p>
                      )}
                    </div>
                  ) : (
                    eletricas.map((el) => (
                      <div key={el.id} className="space-y-4">
                        <h4 className="text-sm font-bold text-[#0b3a73] dark:text-white">
                          Grupo {el.grupo}
                        </h4>
                        <SectionCard title="Painéis">
                          <InputField
                            tabela="elevatoria_eletrica"
                            campo="fusivel_pc"
                            label="Fusível (PC)"
                            valor={el.fusivel_pc}
                            grupo={el.grupo}
                          />
                          <InputField
                            tabela="elevatoria_eletrica"
                            campo="disjuntor_pc"
                            label="Disjuntor (PC)"
                            valor={el.disjuntor_pc}
                            grupo={el.grupo}
                          />
                          <InputField
                            tabela="elevatoria_eletrica"
                            campo="regulagem_rele_termico_bimetálico"
                            label="Regulagem do Relé Térmico Bimetálico"
                            valor={el.regulagem_rele_termico_bimetálico}
                            grupo={el.grupo}
                          />
                          <InputField
                            tabela="elevatoria_eletrica"
                            campo="rele_tempo_delta_y"
                            label="Relé de Tempo ΔY"
                            valor={el.rele_tempo_delta_y}
                            grupo={el.grupo}
                          />
                          <InputField
                            tabela="elevatoria_eletrica"
                            campo="rele_eletrodo_nivel"
                            label="Relé de Eletrodo (Nível)"
                            valor={el.rele_eletrodo_nivel}
                            grupo={el.grupo}
                          />
                          <InputField
                            tabela="elevatoria_eletrica"
                            campo="monitor_corrente"
                            label="Monitor de Corrente"
                            valor={el.monitor_corrente}
                            grupo={el.grupo}
                          />
                          <InputField
                            tabela="elevatoria_eletrica"
                            campo="tamanho_fusivel_nh"
                            label="Tamanho do Fusível NH"
                            valor={el.tamanho_fusivel_nh}
                            grupo={el.grupo}
                          />
                          <InputField
                            tabela="elevatoria_eletrica"
                            campo="corrente_fusivel_nh"
                            label="Corrente do Fusível NH"
                            valor={el.corrente_fusivel_nh}
                            grupo={el.grupo}
                          />
                          <InputField
                            tabela="elevatoria_eletrica"
                            campo="corrente_fusivel_dz"
                            label="Corrente do Fusível DZ"
                            valor={el.corrente_fusivel_dz}
                            grupo={el.grupo}
                          />
                          <InputField
                            tabela="elevatoria_eletrica"
                            campo="tipo_acionamento"
                            label="Tipo de Acionamento"
                            valor={el.tipo_acionamento}
                            grupo={el.grupo}
                          />
                          <InputField
                            tabela="elevatoria_eletrica"
                            campo="fabricante_acionamento"
                            label="Fabricante do Acionamento"
                            valor={el.fabricante_acionamento}
                            grupo={el.grupo}
                          />
                          <InputField
                            tabela="elevatoria_eletrica"
                            campo="modelo_acionamento"
                            label="Modelo de Acionamento"
                            valor={el.modelo_acionamento}
                            grupo={el.grupo}
                          />
                          <InputField
                            tabela="elevatoria_eletrica"
                            campo="corrente_a_acionamento"
                            label="Corrente (A) do Acionamento"
                            valor={el.corrente_a_acionamento}
                            grupo={el.grupo}
                          />
                          <InputField
                            tabela="elevatoria_eletrica"
                            campo="tag_acionamento"
                            label="TAG do Acionamento"
                            valor={el.tag_acionamento}
                            grupo={el.grupo}
                          />
                          <InputField
                            tabela="elevatoria_eletrica"
                            campo="tag_painel"
                            label="TAG do Painel"
                            valor={el.tag_painel}
                            grupo={el.grupo}
                          />
                        </SectionCard>
                        <SectionCard title="Setpoint">
                          <InputField
                            tabela="elevatoria_eletrica"
                            campo="retaguarda_liga"
                            label="Retaguarda Liga"
                            valor={el.retaguarda_liga}
                            grupo={el.grupo}
                          />
                          <InputField
                            tabela="elevatoria_eletrica"
                            campo="retaguarda_desliga"
                            label="Retaguarda Desliga"
                            valor={el.retaguarda_desliga}
                            grupo={el.grupo}
                          />
                          <InputField
                            tabela="elevatoria_eletrica"
                            campo="recalque_setpoint"
                            label="Recalque (Setpoint)"
                            valor={el.recalque_setpoint}
                            grupo={el.grupo}
                          />
                        </SectionCard>
                      </div>
                    ))
                  )}
                  {permissoes.podeEditarMestres && editMode && (
                    <button
                      onClick={async () => {
                        const nextGrupo =
                          eletricas.length > 0 ? Math.max(...eletricas.map((e) => e.grupo)) + 1 : 1;
                        const { data, error } = await supabase
                          .from("elevatoria_eletrica")
                          .insert({ elevatoria_id: elevId, grupo: nextGrupo })
                          .select()
                          .single();
                        if (error) {
                          toast.error("Erro ao adicionar grupo: " + error.message);
                          return;
                        }
                        if (data) {
                          setEletricas((prev) => [...prev, data]);
                          toast.success("Grupo de painéis adicionado");
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-500 transition hover:border-[#1f7ad6] hover:text-[#1f7ad6] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    >
                      + Adicionar grupo
                    </button>
                  )}
                </div>
              )}

              {aba === "hidraulica" && (
                <SectionCard title="Dados Hidráulicos">
                  <InputField
                    tabela="elevatoria_hidraulica"
                    campo="succao"
                    label="Sucção"
                    valor={hidraulica?.succao}
                  />
                  <InputField
                    tabela="elevatoria_hidraulica"
                    campo="recalque"
                    label="Recalque"
                    valor={hidraulica?.recalque}
                  />
                  <InputField
                    tabela="elevatoria_hidraulica"
                    campo="tronco"
                    label="Tronco"
                    valor={hidraulica?.tronco}
                  />
                  <InputField
                    tabela="elevatoria_hidraulica"
                    campo="distancia_ate_elev"
                    label="Distância até a Elev."
                    valor={hidraulica?.distancia_ate_elev}
                  />
                  <InputField
                    tabela="elevatoria_hidraulica"
                    campo="tomada_retaguarda"
                    label="Tomada de Retaguarda"
                    valor={hidraulica?.tomada_retaguarda}
                  />
                  <InputField
                    tabela="elevatoria_hidraulica"
                    campo="tomada_recalque"
                    label="Tomada de Recalque"
                    valor={hidraulica?.tomada_recalque}
                  />
                  <InputField
                    tabela="elevatoria_hidraulica"
                    campo="eletrodo_superior"
                    label="Eletrodo Superior"
                    valor={hidraulica?.eletrodo_superior}
                    opcoes={["Sim", "Não"]}
                    tipo="select"
                  />
                  <InputField
                    tabela="elevatoria_hidraulica"
                    campo="eletrodo_inferior"
                    label="Eletrodo Inferior"
                    valor={hidraulica?.eletrodo_inferior}
                    opcoes={["Sim", "Não"]}
                    tipo="select"
                  />
                  <InputField
                    tabela="elevatoria_hidraulica"
                    campo="tipo_recalque"
                    label="Tipo de Recalque"
                    valor={hidraulica?.tipo_recalque}
                  />
                  <InputField
                    tabela="elevatoria_hidraulica"
                    campo="cota_elevatoria"
                    label="Cota na Elevatória"
                    valor={hidraulica?.cota_elevatoria}
                  />
                  <InputField
                    tabela="elevatoria_hidraulica"
                    campo="cota_maxima"
                    label="Cota Máxima"
                    valor={hidraulica?.cota_maxima}
                  />
                  <InputField
                    tabela="elevatoria_hidraulica"
                    campo="distancia_elev_coordenacao"
                    label="Distância da Elev. à Coordenação"
                    valor={hidraulica?.distancia_elev_coordenacao}
                  />
                </SectionCard>
              )}

              {aba === "rolamentos" && (
                <div className="space-y-4">
                  {rolamentos.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-600 dark:bg-slate-800">
                      <Cog className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-500" />
                      <p className="text-sm text-slate-400">
                        Nenhum conjunto motor/bomba registrado.
                      </p>
                      {permissoes.podeEditarMestres && (
                        <p className="mt-1 text-xs text-slate-400">
                          Use o botão abaixo para adicionar.
                        </p>
                      )}
                    </div>
                  ) : (
                    rolamentos.map((rol, idx) => (
                      <div key={rol.id}>
                        <SectionCard title={`Grupo ${idx + 1}`}>
                          <InputField
                            tabela="elevatoria_rolamentos_selos"
                            campo="tem_cadeado"
                            label="Tem Cadeado?"
                            valor={rol.tem_cadeado}
                            opcoes={["Sim", "Não"]}
                            tipo="select"
                            rowId={rol.id}
                          />
                          <InputField
                            tabela="elevatoria_rolamentos_selos"
                            campo="cadeado_padrao"
                            label="Cadeado Padrão?"
                            valor={rol.cadeado_padrao}
                            opcoes={["Sim", "Não"]}
                            tipo="select"
                            rowId={rol.id}
                          />
                          <InputField
                            tabela="elevatoria_rolamentos_selos"
                            campo="rolamento_la_motor"
                            label="Rolamento LA Motor"
                            valor={rol.rolamento_la_motor}
                            rowId={rol.id}
                          />
                          <InputField
                            tabela="elevatoria_rolamentos_selos"
                            campo="rolamento_loa_motor"
                            label="Rolamento LOA Motor"
                            valor={rol.rolamento_loa_motor}
                            rowId={rol.id}
                          />
                          <InputField
                            tabela="elevatoria_rolamentos_selos"
                            campo="rolamento_la_bomba"
                            label="Rolamento LA Bomba"
                            valor={rol.rolamento_la_bomba}
                            rowId={rol.id}
                          />
                          <InputField
                            tabela="elevatoria_rolamentos_selos"
                            campo="rolamento_loa_bomba"
                            label="Rolamento LOA Bomba"
                            valor={rol.rolamento_loa_bomba}
                            rowId={rol.id}
                          />
                          <InputField
                            tabela="elevatoria_rolamentos_selos"
                            campo="mm_bomba"
                            label="MM Rotor"
                            valor={rol.mm_bomba}
                            rowId={rol.id}
                          />
                          <InputField
                            tabela="elevatoria_rolamentos_selos"
                            campo="gaxeta"
                            label="Gaxeta"
                            valor={rol.gaxeta}
                            rowId={rol.id}
                          />
                          <InputField
                            tabela="elevatoria_rolamentos_selos"
                            campo="selo_mecanico"
                            label="Selo Mecânico"
                            valor={rol.selo_mecanico}
                            rowId={rol.id}
                          />
                          {permissoes.podeEditarMestres && editMode && (
                            <div className="flex items-end justify-end">
                              <button
                                onClick={async () => {
                                  if (!confirm("Excluir este conjunto permanentemente?")) return;
                                  const { error } = await supabase
                                    .from("elevatoria_rolamentos_selos")
                                    .delete()
                                    .eq("id", rol.id);
                                  if (error) {
                                    toast.error("Erro ao excluir: " + error.message);
                                    return;
                                  }
                                  setRolamentos((prev) => prev.filter((r) => r.id !== rol.id));
                                  toast.success("Conjunto excluído");
                                }}
                                className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 cursor-pointer"
                              >
                                <X className="mr-1 inline h-3 w-3" /> Excluir
                              </button>
                            </div>
                          )}
                        </SectionCard>
                      </div>
                    ))
                  )}
                  {permissoes.podeEditarMestres && editMode && (
                    <button
                      onClick={async () => {
                        const { data, error } = await supabase
                          .from("elevatoria_rolamentos_selos")
                          .insert({ elevatoria_id: elevId })
                          .select()
                          .single();
                        if (error) {
                          toast.error("Erro ao adicionar conjunto: " + error.message);
                          return;
                        }
                        if (data) {
                          setRolamentos((prev) => [...prev, data]);
                          toast.success("Conjunto adicionado");
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-500 transition hover:border-[#1f7ad6] hover:text-[#1f7ad6] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    >
                      + Adicionar conjunto
                    </button>
                  )}
                </div>
              )}

              {aba === "area_influencia" && (
                <SectionCard title="Área de Influência">
                  <InputField
                    tabela="elevatoria_area_influencia"
                    campo="populacao_beneficiada_habitantes"
                    label="População Beneficiada"
                    valor={areaInfluencia?.populacao_beneficiada_habitantes}
                  />
                  <InputField
                    tabela="elevatoria_area_influencia"
                    campo="domicilios"
                    label="Domicílios"
                    valor={areaInfluencia?.domicilios}
                  />
                  <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
                    <InputField
                      tabela="elevatoria_area_influencia"
                      campo="comunidades_hospitais_locais_importantes"
                      label="Comunidades/Hospitais/Localidades"
                      valor={areaInfluencia?.comunidades_hospitais_locais_importantes}
                    />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
                    <InputField
                      tabela="elevatoria_area_influencia"
                      campo="area_influencia"
                      label="Área de Influência"
                      valor={areaInfluencia?.area_influencia}
                    />
                  </div>
                </SectionCard>
              )}

              {aba === "implantacao" && (
                <div className="space-y-4">
                  <SectionCard title="Status de Implantação">
                    <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
                      <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Status
                      </label>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {IMPLANTACAO_STATUS_OPCOES.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => {
                              if (permissoes.podeEditarMestres && editMode)
                                salvarImplantacaoStatus(opt.value);
                            }}
                            disabled={!(permissoes.podeEditarMestres && editMode)}
                            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                              implantacao?.status === opt.value
                                ? "border-[#1f7ad6] bg-[#eaf3fb] text-[#1f7ad6] dark:border-[#38bdf8] dark:bg-slate-700 dark:text-[#38bdf8]"
                                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <InputField
                      tabela="elevatoria_implantacao"
                      campo="tipo"
                      label="Tipo"
                      valor={implantacao?.tipo}
                      opcoes={["EEAT", "Elevatória", "Booster", "Container"]}
                      tipo="select"
                      editOnly
                    />
                    <InputField
                      tabela="elevatoria_implantacao"
                      campo="segmento"
                      label="Segmento"
                      valor={implantacao?.segmento}
                      opcoes={["Água", "Esgoto"]}
                      tipo="select"
                      editOnly
                    />
                    <InputField
                      tabela="elevatoria_implantacao"
                      campo="fase_atual"
                      label="Fase Atual"
                      valor={implantacao?.fase_atual}
                      editOnly
                    />
                    <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
                      <InputField
                        tabela="elevatoria_implantacao"
                        campo="observacoes_inconformidades"
                        label="Observações/Inconformidades"
                        valor={implantacao?.observacoes_inconformidades}
                        editOnly
                      />
                    </div>
                  </SectionCard>

                  {implantacao && (
                    <SectionCard title="Etapas Restantes">
                      {etapas.filter((e) => e.implantacao_id === implantacao.id).length === 0 ? (
                        <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4 text-sm text-slate-400">
                          Nenhuma etapa cadastrada.
                        </div>
                      ) : (
                        etapas
                          .filter((e) => e.implantacao_id === implantacao.id)
                          .map((etapa) => (
                            <div
                              key={etapa.id}
                              className="flex items-center gap-3 sm:col-span-2 lg:col-span-3 xl:col-span-4"
                            >
                              <input
                                type="checkbox"
                                checked={etapa.concluida}
                                onChange={(e) => toggleEtapa(etapa.id, e.target.checked)}
                                disabled={!permissoes.podeEditarMestres}
                                className="h-4 w-4 rounded border-slate-300 text-[#1f7ad6] focus:ring-[#1f7ad6]"
                              />
                              <span
                                className={`text-sm ${etapa.concluida ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-200"}`}
                              >
                                {etapa.descricao}
                              </span>
                            </div>
                          ))
                      )}
                      {permissoes.podeEditarMestres && editMode && (
                        <button
                          onClick={async () => {
                            const desc = prompt("Descrição da etapa:");
                            if (!desc || !implantacao) return;
                            const { data, error } = await supabase
                              .from("elevatoria_implantacao_etapas")
                              .insert({
                                implantacao_id: implantacao.id,
                                descricao: desc,
                                ordem: etapas.length + 1,
                              })
                              .select()
                              .single();
                            if (error) {
                              toast.error("Erro ao adicionar etapa: " + error.message);
                              return;
                            }
                            if (data) {
                              setEtapas((prev) => [...prev, data]);
                              toast.success("Etapa adicionada");
                            }
                          }}
                          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-500 transition hover:border-[#1f7ad6] hover:text-[#1f7ad6] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 sm:col-span-2 lg:col-span-3"
                        >
                          + Adicionar etapa
                        </button>
                      )}
                    </SectionCard>
                  )}
                </div>
              )}

              {aba === "historico" && (
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <h3 className="mb-4 text-sm font-bold text-[#0b3a73] dark:text-white">
                    Histórico de Alterações
                  </h3>
                  {auditoria.length === 0 ? (
                    <p className="text-sm text-slate-400">Nenhuma alteração registrada ainda.</p>
                  ) : (
                    <div className="max-h-[500px] space-y-2 overflow-auto">
                      {auditoria.map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-700/50"
                        >
                          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                            <span className="font-semibold text-[#0b3a73] dark:text-white">
                              {entry.tabela}
                            </span>
                            <span>·</span>
                            <span className="font-mono">{entry.campo_alterado}</span>
                            <span>·</span>
                            <span>{new Date(entry.criado_em || "").toLocaleString("pt-BR")}</span>
                            {entry.usuario_nome && (
                              <>
                                <span>·</span>
                                <span>{entry.usuario_nome}</span>
                              </>
                            )}
                          </div>
                          <div className="mt-1 flex gap-4">
                            <span className="text-slate-400">
                              Anterior:{" "}
                              <span className="text-slate-600 dark:text-slate-300">
                                {entry.valor_anterior || "—"}
                              </span>
                            </span>
                            <span className="text-slate-400">
                              Novo:{" "}
                              <span className="font-semibold text-slate-700 dark:text-slate-200">
                                {entry.valor_novo || "—"}
                              </span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </FichaContext.Provider>
  );
}

export default ElevatoriaFichaPage;
