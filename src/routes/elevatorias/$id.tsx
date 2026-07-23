import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  Home,
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
} from "lucide-react";
import logoHeader from "@/assets/logo-branca.png";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { getPermissoesCargo, temPermissao } from "@/lib/permissoes";
import type {
  Elevatoria,
  ElevatoriaEquipamento,
  ElevatoriaEletrica,
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

export const Route = createFileRoute("/elevatorias/$id")({
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
};

type AbaDadosMestres = "equipamento" | "eletrica" | "hidraulica" | "rolamentos" | "area_influencia" | "implantacao" | "historico";

interface CampoEditavel {
  tabela: string;
  campo: string;
  label: string;
  tipo?: "text" | "select" | "date" | "number";
  opcoes?: string[];
}

function ElevatoriaFichaPage() {
  const { id } = Route.useParams() as { id: string };
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();

  const [elevatoria, setElevatoria] = useState<Elevatoria | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissoes, setPermissoes] = useState<PermissoesElev>({
    podeVer: false, podeEditar: false, podeVerMestres: false, podeEditarMestres: false, podeExportar: false,
  });

  const [aba, setAba] = useState<AbaDadosMestres>("equipamento");

  const [equipamento, setEquipamento] = useState<ElevatoriaEquipamento | null>(null);
  const [eletrica, setEletrica] = useState<ElevatoriaEletrica | null>(null);
  const [hidraulica, setHidraulica] = useState<ElevatoriaHidraulica | null>(null);
  const [areaInfluencia, setAreaInfluencia] = useState<ElevatoriaAreaInfluencia | null>(null);
  const [rolamentos, setRolamentos] = useState<ElevatoriaRolamentoSelo[]>([]);
  const [implantacao, setImplantacao] = useState<ElevatoriaImplantacao | null>(null);
  const [etapas, setEtapas] = useState<ElevatoriaImplantacaoEtapa[]>([]);
  const [auditoria, setAuditoria] = useState<ElevatoriaAuditoria[]>([]);
  const [camposNA, setCamposNA] = useState<ElevatoriaCampoNA[]>([]);

  const [salvando, setSalvando] = useState(false);
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const elevId = Number(id);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate({ to: "/login", replace: true }); return; }
    if (profile?.status === "pendente") { navigate({ to: "/pending", replace: true }); return; }
    if (profile?.status === "bloqueado") { navigate({ to: "/bloqueado", replace: true }); return; }
  }, [user, profile, authLoading, navigate]);

  useEffect(() => {
    if (!profile?.cargo_id || !elevId) return;
    const init = async () => {
      const { data: panelData } = await supabase
        .from("cargo_paineis")
        .select("paineis!inner(chave)")
        .eq("cargo_id", profile.cargo_id)
        .eq("paineis.chave", "ficha_elevatoria")
        .maybeSingle();
      if (!panelData) { navigate({ to: "/", replace: true }); return; }

      const perms = await getPermissoesCargo(profile.cargo_id);
      setPermissoes({
        podeVer: temPermissao(perms, "ficha_elevatoria", "ver"),
        podeEditar: temPermissao(perms, "ficha_elevatoria", "editar"),
        podeVerMestres: temPermissao(perms, "ficha_elevatoria", "dados_mestres.ver"),
        podeEditarMestres: temPermissao(perms, "ficha_elevatoria", "dados_mestres.editar"),
        podeExportar: temPermissao(perms, "ficha_elevatoria", "exportar"),
      });

      await carregarTudo();
    };
    init();
  }, [profile?.cargo_id, elevId]);

  const carregarTudo = async () => {
    setLoading(true);
    const [elevRes, equipRes, eletRes, hidrRes, areaRes, rolaRes, impRes, etapasRes, audRes, naRes] = await Promise.all([
      supabase.from("elevatorias").select("*").eq("id", elevId).single(),
      supabase.from("elevatoria_equipamento").select("*").eq("elevatoria_id", elevId).maybeSingle(),
      supabase.from("elevatoria_eletrica").select("*").eq("elevatoria_id", elevId).maybeSingle(),
      supabase.from("elevatoria_hidraulica").select("*").eq("elevatoria_id", elevId).maybeSingle(),
      supabase.from("elevatoria_area_influencia").select("*").eq("elevatoria_id", elevId).maybeSingle(),
      supabase.from("elevatoria_rolamentos_selos").select("*").eq("elevatoria_id", elevId).order("id"),
      supabase.from("elevatoria_implantacao").select("*").eq("elevatoria_id", elevId).maybeSingle(),
      supabase.from("elevatoria_implantacao_etapas").select("*").order("ordem"),
      supabase.from("elevatoria_dados_mestres_auditoria").select("*, profiles:usuario_id(nome_completo)").eq("elevatoria_id", elevId).order("criado_em", { ascending: false }).limit(200),
      supabase.from("elevatoria_campo_na").select("*").eq("elevatoria_id", elevId),
    ]);

    if (elevRes.data) setElevatoria(elevRes.data);
    if (equipRes.data) setEquipamento(equipRes.data);
    if (eletRes.data) setEletrica(eletRes.data);
    if (hidrRes.data) setHidraulica(hidrRes.data);
    if (areaRes.data) setAreaInfluencia(areaRes.data);
    if (rolaRes.data) setRolamentos(rolaRes.data);
    if (impRes.data) setImplantacao(impRes.data);
    if (etapasRes.data) setEtapas(etapasRes.data);

    if (audRes.data) {
      setAuditoria(audRes.data.map((a: Record<string, unknown>) => ({
        ...a,
        usuario_nome: (a.profiles as { nome_completo?: string } | null)?.nome_completo ?? null,
      })) as ElevatoriaAuditoria[]);
    }

    if (naRes.data) setCamposNA(naRes.data);

    if (!elevRes.data) {
      toast.error("Elevatória não encontrada");
      navigate({ to: "/elevatorias", replace: true });
      return;
    }
    setLoading(false);
  };

  const isNA = (tabela: string, campo: string) =>
    camposNA.some(c => c.tabela === tabela && c.campo === campo && c.elevatoria_id === elevId);

  const toggleNA = async (tabela: string, campo: string, motivo?: string) => {
    if (isNA(tabela, campo)) {
      await supabase.from("elevatoria_campo_na").delete().eq("elevatoria_id", elevId).eq("tabela", tabela).eq("campo", campo);
      setCamposNA(prev => prev.filter(c => !(c.tabela === tabela && c.campo === campo)));
    } else {
      const { data } = await supabase.from("elevatoria_campo_na").insert({ elevatoria_id: elevId, tabela, campo, motivo: motivo || "" }).select().single();
      if (data) setCamposNA(prev => [...prev, data]);
    }
  };

  const salvarField = useCallback(async (tabela: string, campo: string, valor: string | null) => {
    if (!permissoes.podeEditarMestres) return;
    setSalvando(true);
    const tabelaReal = tabela === "elevatoria" ? "elevatorias" : tabela;
    const filtro = tabela === "elevatoria" ? { id: elevId } : { elevatoria_id: elevId };

    const { error } = await supabase.from(tabelaReal).upsert({ ...filtro, [campo]: valor || null } as Record<string, unknown>, {
      onConflict: tabela === "elevatoria" ? "id" : "elevatoria_id",
      ignoreDuplicates: false,
    });

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    }
    setSalvando(false);
  }, [elevId, permissoes.podeEditarMestres]);

  const handleFieldChange = (tabela: string, campo: string, valor: string) => {
    const cacheKey = `${tabela}:${campo}`;
    if (saveTimers.current.has(cacheKey)) {
      clearTimeout(saveTimers.current.get(cacheKey));
    }
    saveTimers.current.set(cacheKey, setTimeout(() => {
      salvarField(tabela, campo, valor);
      saveTimers.current.delete(cacheKey);
    }, 600));
  };

  const salvarImplantacaoStatus = async (status: StatusImplantacao) => {
    if (!permissoes.podeEditarMestres) return;
    setSalvando(true);
    const { error } = await supabase.from("elevatoria_implantacao").upsert(
      { elevatoria_id: elevId, status },
      { onConflict: "elevatoria_id", ignoreDuplicates: false }
    );
    if (error) toast.error("Erro ao salvar: " + error.message);
    else toast.success("Status atualizado");
    setSalvando(false);
    await carregarTudo();
  };

  const toggleEtapa = async (etapaId: number, concluida: boolean) => {
    if (!permissoes.podeEditarMestres) return;
    await supabase.from("elevatoria_implantacao_etapas").update({ concluida }).eq("id", etapaId);
    setEtapas(prev => prev.map(e => e.id === etapaId ? { ...e, concluida } : e));
  };

  const InputField = ({ tabela, campo, label, tipo = "text", opcoes, valor, onChange }: {
    tabela: string; campo: string; label: string; tipo?: string; opcoes?: string[];
    valor: string | null | undefined; onChange?: (v: string) => void;
  }) => {
    const na = isNA(tabela, campo);
    const podeEditar = tabela === "elevatoria" ? permissoes.podeEditar : permissoes.podeEditarMestres;
    const podeVer = tabela === "elevatoria" ? permissoes.podeVer : permissoes.podeVerMestres;

    if (!podeVer) return null;

    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</label>
          {podeEditar && (
            <button
              type="button"
              onClick={() => toggleNA(tabela, campo)}
              className={`text-[10px] px-1.5 py-0.5 rounded font-semibold transition ${
                na ? "bg-slate-200 text-slate-500 dark:bg-slate-600 dark:text-slate-300" : "text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400"
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
            value={valor || ""}
            onChange={e => {
              if (onChange) onChange(e.target.value);
              else handleFieldChange(tabela, campo, e.target.value);
            }}
            disabled={!podeEditar}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:disabled:bg-slate-800"
          >
            <option value="">—</option>
            {opcoes.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input
            type={tipo}
            value={valor || ""}
            onChange={e => {
              if (onChange) onChange(e.target.value);
              else handleFieldChange(tabela, campo, e.target.value);
            }}
            disabled={!podeEditar}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-400 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:disabled:bg-slate-800"
          />
        )}
      </div>
    );
  };

  const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h3 className="mb-4 text-sm font-bold text-[#0b3a73] dark:text-white">{title}</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f0f4f8] dark:bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-[#1f7ad6]" />
      </div>
    );
  }

  if (!elevatoria) return null;

  return (
    <div className="min-h-screen bg-[#f0f4f8] dark:bg-slate-900">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-gradient-to-r from-[#002d74] via-[#003087] to-[#00AEEF] text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <img src={logoHeader} alt="Águas do Rio" className="h-10 w-auto shrink-0" />
            <Link to="/" className="rounded-full border border-white/20 bg-white/10 p-1.5 transition hover:bg-white/20 shrink-0">
              <Home className="h-4 w-4" />
            </Link>
            <Link to="/elevatorias" className="rounded-full border border-white/20 bg-white/10 p-1.5 transition hover:bg-white/20 shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="truncate text-lg font-semibold">{elevatoria.nome}</h1>
            {elevatoria.planta && (
              <Badge variant="outline" className="border-white/20 bg-white/10 text-white text-[10px] shrink-0">
                {elevatoria.planta}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {salvando && (
              <span className="flex items-center gap-1 text-[11px] text-cyan-200">
                <Loader2 className="h-3 w-3 animate-spin" /> Salvando...
              </span>
            )}
            {permissoes.podeExportar && (
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1.5 text-xs font-medium transition hover:bg-white/25"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" /> Exportar
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        {/* Basic Info Card */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <InputField tabela="elevatoria" campo="nome" label="Nome" valor={elevatoria.nome} />
                <InputField tabela="elevatoria" campo="planta" label="Planta" valor={elevatoria.planta} />
                <InputField tabela="elevatoria" campo="tipo" label="Tipo" valor={elevatoria.tipo} opcoes={["EAT", "Booster", "Container"]} tipo="select" />
                <InputField tabela="elevatoria" campo="superintendencia" label="Superintendência" valor={elevatoria.superintendencia} />
                <InputField tabela="elevatoria" campo="endereco" label="Endereço" valor={elevatoria.endereco} />
                <InputField tabela="elevatoria" campo="bairro" label="Bairro" valor={elevatoria.bairro} />
                <InputField tabela="elevatoria" campo="municipio" label="Município" valor={elevatoria.municipio} />
                <InputField tabela="elevatoria" campo="cep" label="CEP" valor={elevatoria.cep} />
                <InputField tabela="elevatoria" campo="inicio_operacao" label="Início de Operação" tipo="date" valor={elevatoria.inicio_operacao} />
                <InputField tabela="elevatoria" campo="caracteristicas_area" label="Características da Área" valor={elevatoria.caracteristicas_area} opcoes={["FORMAL", "INFORMAL"]} tipo="select" />
                <InputField tabela="elevatoria" campo="grupo" label="Grupo" valor={elevatoria.grupo} />
                <InputField tabela="elevatoria" campo="funcao" label="Função" valor={elevatoria.funcao} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:w-1/2">
                <InputField tabela="elevatoria" campo="latitude" label="Latitude" tipo="number" valor={elevatoria.latitude?.toString()} />
                <InputField tabela="elevatoria" campo="longitude" label="Longitude" tipo="number" valor={elevatoria.longitude?.toString()} />
              </div>
            </div>
            <div className="lg:col-span-1">
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

        {/* Dados Mestres Sections (only if user has permission) */}
        {permissoes.podeVerMestres && (
          <>
            {/* Tabs */}
            <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-700">
              {[
                { key: "equipamento" as AbaDadosMestres, label: "Equipamento Instalado", icon: Wrench },
                { key: "eletrica" as AbaDadosMestres, label: "Elétrica & Automação", icon: Zap },
                { key: "hidraulica" as AbaDadosMestres, label: "Hidráulica", icon: Droplets },
                { key: "rolamentos" as AbaDadosMestres, label: "Rolamentos & Selos", icon: Cog },
                { key: "area_influencia" as AbaDadosMestres, label: "Área de Influência", icon: Users },
                { key: "implantacao" as AbaDadosMestres, label: "Implantação", icon: HardHat },
                { key: "historico" as AbaDadosMestres, label: "Histórico", icon: History },
              ].map(tab => (
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
                <SectionCard title="Motor Elétrico">
                  <InputField tabela="elevatoria_equipamento" campo="potencia_motor_cv" label="Potência do Motor (CV)" valor={equipamento?.potencia_motor_cv} />
                  <InputField tabela="elevatoria_equipamento" campo="rpm" label="RPM" valor={equipamento?.rpm} />
                  <InputField tabela="elevatoria_equipamento" campo="marca_motor" label="Marca do Motor" valor={equipamento?.marca_motor} />
                  <InputField tabela="elevatoria_equipamento" campo="carcaca_motor" label="Carcaça do Motor" valor={equipamento?.carcaca_motor} />
                  <InputField tabela="elevatoria_equipamento" campo="tag_motor" label="TAG do Motor" valor={equipamento?.tag_motor} />
                  <InputField tabela="elevatoria_equipamento" campo="tensao_v" label="Tensão (V)" valor={equipamento?.tensao_v} />
                  <InputField tabela="elevatoria_equipamento" campo="corrente_a" label="Corrente (A)" valor={equipamento?.corrente_a} />
                  <InputField tabela="elevatoria_equipamento" campo="mancais_la" label="Mancais (LA)" valor={equipamento?.mancais_la} />
                  <InputField tabela="elevatoria_equipamento" campo="mancais_loa" label="Mancais (LOA)" valor={equipamento?.mancais_loa} />
                  <InputField tabela="elevatoria_equipamento" campo="ponta_eixo_motor" label="Ponta do Eixo do Motor" valor={equipamento?.ponta_eixo_motor} />
                  <InputField tabela="elevatoria_equipamento" campo="sentido_montagem_motor" label="Sentido de Montagem do Motor" valor={equipamento?.sentido_montagem_motor} />
                </SectionCard>
                <SectionCard title="Bomba">
                  <InputField tabela="elevatoria_equipamento" campo="modelo_bomba" label="Modelo da Bomba" valor={equipamento?.modelo_bomba} />
                  <InputField tabela="elevatoria_equipamento" campo="tag_bomba" label="TAG da Bomba" valor={equipamento?.tag_bomba} />
                  <InputField tabela="elevatoria_equipamento" campo="marca_bomba" label="Marca da Bomba" valor={equipamento?.marca_bomba} />
                  <InputField tabela="elevatoria_equipamento" campo="diametro_rotor_pol" label="Ø Rotor (pol)" valor={equipamento?.diametro_rotor_pol} />
                  <InputField tabela="elevatoria_equipamento" campo="diametro_rotor_mm" label="Ø Rotor (mm)" valor={equipamento?.diametro_rotor_mm} />
                  <InputField tabela="elevatoria_equipamento" campo="tipo_construtivo_elevatoria" label="Tipo Construtivo" valor={equipamento?.tipo_construtivo_elevatoria} />
                  <InputField tabela="elevatoria_equipamento" campo="bomba_dreno" label="Bomba Dreno" valor={equipamento?.bomba_dreno} opcoes={["Sim", "Não"]} tipo="select" />
                  <InputField tabela="elevatoria_equipamento" campo="flange" label="Flange" valor={equipamento?.flange} />
                  <InputField tabela="elevatoria_equipamento" campo="forma_construtiva_bomba" label="Forma Construtiva da Bomba" valor={equipamento?.forma_construtiva_bomba} />
                </SectionCard>
                <SectionCard title="Desempenho">
                  <InputField tabela="elevatoria_equipamento" campo="vazao_aproximada_m3h" label="Vazão Aproximada (m³/h)" valor={equipamento?.vazao_aproximada_m3h} />
                  <InputField tabela="elevatoria_equipamento" campo="amt_aproximada" label="AMT Aproximada" valor={equipamento?.amt_aproximada} />
                  <InputField tabela="elevatoria_equipamento" campo="capacidade_tratamento" label="Capacidade de Tratamento" valor={equipamento?.capacidade_tratamento} />
                  <InputField tabela="elevatoria_equipamento" campo="procedencia_mca" label="Procedência do MCA" valor={equipamento?.procedencia_mca} />
                  <InputField tabela="elevatoria_equipamento" campo="cod_sap" label="Cód. SAP" valor={equipamento?.cod_sap} />
                </SectionCard>
              </div>
            )}

            {aba === "eletrica" && (
              <div className="space-y-4">
                <SectionCard title="Alimentação">
                  <InputField tabela="elevatoria_eletrica" campo="bt_mt" label="BT/MT" valor={eletrica?.bt_mt} />
                  <InputField tabela="elevatoria_eletrica" campo="trafo_kva" label="TRAFO (KVA)" valor={eletrica?.trafo_kva} />
                </SectionCard>
                <SectionCard title="Concessionária de Energia">
                  <InputField tabela="elevatoria_eletrica" campo="num_cliente" label="N° Cliente" valor={eletrica?.num_cliente} />
                  <InputField tabela="elevatoria_eletrica" campo="medidor" label="Medidor" valor={eletrica?.medidor} />
                  <InputField tabela="elevatoria_eletrica" campo="medidor_apurado" label="Medidor Apurado" valor={eletrica?.medidor_apurado} />
                  <InputField tabela="elevatoria_eletrica" campo="medidor_apurado_data" label="Data Medição" tipo="date" valor={eletrica?.medidor_apurado_data} />
                  <InputField tabela="elevatoria_eletrica" campo="unidade_consumo" label="Unidade de Consumo" valor={eletrica?.unidade_consumo} />
                  <InputField tabela="elevatoria_eletrica" campo="endereco_concessionaria" label="Endereço (Concessionária)" valor={eletrica?.endereco_concessionaria} />
                </SectionCard>
                <SectionCard title="Painéis">
                  <InputField tabela="elevatoria_eletrica" campo="fusivel_pc" label="Fusível (PC)" valor={eletrica?.fusivel_pc} />
                  <InputField tabela="elevatoria_eletrica" campo="disjuntor_pc" label="Disjuntor (PC)" valor={eletrica?.disjuntor_pc} />
                  <InputField tabela="elevatoria_eletrica" campo="regulagem_rele_termico_bimetálico" label="Regulagem do Relé Térmico Bimetálico" valor={eletrica?.regulagem_rele_termico_bimetálico} />
                  <InputField tabela="elevatoria_eletrica" campo="rele_tempo_delta_y" label="Relé de Tempo ΔY" valor={eletrica?.rele_tempo_delta_y} />
                  <InputField tabela="elevatoria_eletrica" campo="rele_eletrodo_nivel" label="Relé de Eletrodo (Nível)" valor={eletrica?.rele_eletrodo_nivel} />
                  <InputField tabela="elevatoria_eletrica" campo="monitor_corrente" label="Monitor de Corrente" valor={eletrica?.monitor_corrente} />
                  <InputField tabela="elevatoria_eletrica" campo="tamanho_fusivel_nh" label="Tamanho do Fusível NH" valor={eletrica?.tamanho_fusivel_nh} />
                  <InputField tabela="elevatoria_eletrica" campo="corrente_fusivel_nh" label="Corrente do Fusível NH" valor={eletrica?.corrente_fusivel_nh} />
                  <InputField tabela="elevatoria_eletrica" campo="corrente_fusivel_dz" label="Corrente do Fusível DZ" valor={eletrica?.corrente_fusivel_dz} />
                </SectionCard>
                <SectionCard title="Automação">
                  <InputField tabela="elevatoria_eletrica" campo="tag_painel" label="TAG Painel" valor={eletrica?.tag_painel} />
                  <InputField tabela="elevatoria_eletrica" campo="tipo_acionamento" label="Tipo de Acionamento" valor={eletrica?.tipo_acionamento} />
                  <InputField tabela="elevatoria_eletrica" campo="fabricante_acionamento" label="Fabricante do Acionamento" valor={eletrica?.fabricante_acionamento} />
                  <InputField tabela="elevatoria_eletrica" campo="modelo_acionamento" label="Modelo de Acionamento" valor={eletrica?.modelo_acionamento} />
                  <InputField tabela="elevatoria_eletrica" campo="corrente_a_acionamento" label="Corrente (A) do Acionamento" valor={eletrica?.corrente_a_acionamento} />
                  <InputField tabela="elevatoria_eletrica" campo="tag_acionamento" label="TAG do Acionamento" valor={eletrica?.tag_acionamento} />
                  <InputField tabela="elevatoria_eletrica" campo="clp" label="CLP" valor={eletrica?.clp} opcoes={["Sim", "Não"]} tipo="select" />
                  <InputField tabela="elevatoria_eletrica" campo="pcp" label="PCP" valor={eletrica?.pcp} />
                </SectionCard>
                <SectionCard title="Setpoint">
                  <InputField tabela="elevatoria_eletrica" campo="retaguarda_liga" label="Retaguarda Liga" valor={eletrica?.retaguarda_liga} />
                  <InputField tabela="elevatoria_eletrica" campo="retaguarda_desliga" label="Retaguarda Desliga" valor={eletrica?.retaguarda_desliga} />
                  <InputField tabela="elevatoria_eletrica" campo="recalque_setpoint" label="Recalque (Setpoint)" valor={eletrica?.recalque_setpoint} />
                </SectionCard>
              </div>
            )}

            {aba === "hidraulica" && (
              <SectionCard title="Dados Hidráulicos">
                <InputField tabela="elevatoria_hidraulica" campo="succao" label="Sucção" valor={hidraulica?.succao} />
                <InputField tabela="elevatoria_hidraulica" campo="recalque" label="Recalque" valor={hidraulica?.recalque} />
                <InputField tabela="elevatoria_hidraulica" campo="tronco" label="Tronco" valor={hidraulica?.tronco} />
                <InputField tabela="elevatoria_hidraulica" campo="distancia_ate_elev" label="Distância até a Elev." valor={hidraulica?.distancia_ate_elev} />
                <InputField tabela="elevatoria_hidraulica" campo="tomada_retaguarda" label="Tomada de Retaguarda" valor={hidraulica?.tomada_retaguarda} />
                <InputField tabela="elevatoria_hidraulica" campo="tomada_recalque" label="Tomada de Recalque" valor={hidraulica?.tomada_recalque} />
                <InputField tabela="elevatoria_hidraulica" campo="eletrodo_superior" label="Eletrodo Superior" valor={hidraulica?.eletrodo_superior} opcoes={["Sim", "Não"]} tipo="select" />
                <InputField tabela="elevatoria_hidraulica" campo="eletrodo_inferior" label="Eletrodo Inferior" valor={hidraulica?.eletrodo_inferior} opcoes={["Sim", "Não"]} tipo="select" />
                <InputField tabela="elevatoria_hidraulica" campo="tipo_recalque" label="Tipo de Recalque" valor={hidraulica?.tipo_recalque} />
                <InputField tabela="elevatoria_hidraulica" campo="cota_elevatoria" label="Cota na Elevatória" valor={hidraulica?.cota_elevatoria} />
                <InputField tabela="elevatoria_hidraulica" campo="cota_maxima" label="Cota Máxima" valor={hidraulica?.cota_maxima} />
                <InputField tabela="elevatoria_hidraulica" campo="distancia_elev_coordenacao" label="Distância da Elev. à Coordenação" valor={hidraulica?.distancia_elev_coordenacao} />
              </SectionCard>
            )}

            {aba === "rolamentos" && (
              <div className="space-y-4">
                {rolamentos.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-600 dark:bg-slate-800">
                    <Cog className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-500" />
                    <p className="text-sm text-slate-400">Nenhum conjunto motor/bomba registrado.</p>
                    {permissoes.podeEditarMestres && (
                      <p className="mt-1 text-xs text-slate-400">Use o botão abaixo para adicionar.</p>
                    )}
                  </div>
                ) : (
                  rolamentos.map(rol => (
                    <SectionCard key={rol.id} title={`Conjunto #${rol.id}`}>
                      <InputField tabela="elevatoria_rolamentos_selos" campo="tipo" label="Tipo" valor={rol.tipo} />
                      <InputField tabela="elevatoria_rolamentos_selos" campo="cadeados_padrao" label="Cadeados Padrão" valor={rol.cadeados_padrao} opcoes={["Sim", "Não"]} tipo="select" />
                      <InputField tabela="elevatoria_rolamentos_selos" campo="quantidade_cadeados" label="Quantidade de Cadeados" valor={rol.quantidade_cadeados} />
                      <InputField tabela="elevatoria_rolamentos_selos" campo="rolamento_motor" label="Rolamento Motor" valor={rol.rolamento_motor} />
                      <InputField tabela="elevatoria_rolamentos_selos" campo="rolamento_bomba" label="Rolamento Bomba" valor={rol.rolamento_bomba} />
                      <InputField tabela="elevatoria_rolamentos_selos" campo="b_acoplamento" label="B. Acoplamento" valor={rol.b_acoplamento} />
                      <InputField tabela="elevatoria_rolamentos_selos" campo="gaxeta" label="Gaxeta" valor={rol.gaxeta} />
                      <InputField tabela="elevatoria_rolamentos_selos" campo="selo_mecanico" label="Selo Mecânico" valor={rol.selo_mecanico} />
                      <InputField tabela="elevatoria_rolamentos_selos" campo="data_troca" label="Data da Troca" tipo="date" valor={rol.data_troca} />
                    </SectionCard>
                  ))
                )}
                {permissoes.podeEditarMestres && (
                  <button
                    onClick={async () => {
                      const { data } = await supabase.from("elevatoria_rolamentos_selos").insert({ elevatoria_id: elevId }).select().single();
                      if (data) {
                        setRolamentos(prev => [...prev, data]);
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
                <InputField tabela="elevatoria_area_influencia" campo="populacao_beneficiada_habitantes" label="População Beneficiada" valor={areaInfluencia?.populacao_beneficiada_habitantes} />
                <InputField tabela="elevatoria_area_influencia" campo="domicilios" label="Domicílios" valor={areaInfluencia?.domicilios} />
                <div className="sm:col-span-2 lg:col-span-3">
                  <InputField tabela="elevatoria_area_influencia" campo="comunidades_hospitais_locais_importantes" label="Comunidades/Hospitais/Localidades" valor={areaInfluencia?.comunidades_hospitais_locais_importantes} />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <InputField tabela="elevatoria_area_influencia" campo="area_influencia" label="Área de Influência" valor={areaInfluencia?.area_influencia} />
                </div>
              </SectionCard>
            )}

            {aba === "implantacao" && (
              <div className="space-y-4">
                <SectionCard title="Status de Implantação">
                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {IMPLANTACAO_STATUS_OPCOES.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => salvarImplantacaoStatus(opt.value)}
                          disabled={!permissoes.podeEditarMestres}
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
                  <InputField tabela="elevatoria_implantacao" campo="tipo" label="Tipo" valor={implantacao?.tipo} opcoes={["EEAT", "Elevatória", "Booster", "Container"]} tipo="select" />
                  <InputField tabela="elevatoria_implantacao" campo="segmento" label="Segmento" valor={implantacao?.segmento} opcoes={["Água", "Esgoto"]} tipo="select" />
                  <InputField tabela="elevatoria_implantacao" campo="fase_atual" label="Fase Atual" valor={implantacao?.fase_atual} />
                  <div className="sm:col-span-2 lg:col-span-3">
                    <InputField tabela="elevatoria_implantacao" campo="observacoes_inconformidades" label="Observações/Inconformidades" valor={implantacao?.observacoes_inconformidades} />
                  </div>
                </SectionCard>

                {implantacao && (
                  <SectionCard title="Etapas Restantes">
                    {etapas.filter(e => e.implantacao_id === implantacao.id).length === 0 ? (
                      <div className="sm:col-span-2 lg:col-span-3 text-sm text-slate-400">Nenhuma etapa cadastrada.</div>
                    ) : (
                      etapas.filter(e => e.implantacao_id === implantacao.id).map(etapa => (
                        <div key={etapa.id} className="flex items-center gap-3 sm:col-span-2 lg:col-span-3">
                          <input
                            type="checkbox"
                            checked={etapa.concluida}
                            onChange={e => toggleEtapa(etapa.id, e.target.checked)}
                            disabled={!permissoes.podeEditarMestres}
                            className="h-4 w-4 rounded border-slate-300 text-[#1f7ad6] focus:ring-[#1f7ad6]"
                          />
                          <span className={`text-sm ${etapa.concluida ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-200"}`}>
                            {etapa.descricao}
                          </span>
                        </div>
                      ))
                    )}
                    {permissoes.podeEditarMestres && (
                      <button
                        onClick={async () => {
                          const desc = prompt("Descrição da etapa:");
                          if (!desc || !implantacao) return;
                          const { data } = await supabase.from("elevatoria_implantacao_etapas").insert({
                            implantacao_id: implantacao.id,
                            descricao: desc,
                            ordem: etapas.length + 1,
                          }).select().single();
                          if (data) {
                            setEtapas(prev => [...prev, data]);
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
                <h3 className="mb-4 text-sm font-bold text-[#0b3a73] dark:text-white">Histórico de Alterações</h3>
                {auditoria.length === 0 ? (
                  <p className="text-sm text-slate-400">Nenhuma alteração registrada ainda.</p>
                ) : (
                  <div className="max-h-[500px] space-y-2 overflow-auto">
                    {auditoria.map(entry => (
                      <div key={entry.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-700/50">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                          <span className="font-semibold text-[#0b3a73] dark:text-white">{entry.tabela}</span>
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
                          <span className="text-slate-400">Anterior: <span className="text-slate-600 dark:text-slate-300">{entry.valor_anterior || "—"}</span></span>
                          <span className="text-slate-400">Novo: <span className="font-semibold text-slate-700 dark:text-slate-200">{entry.valor_novo || "—"}</span></span>
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
  );
}

export default ElevatoriaFichaPage;
