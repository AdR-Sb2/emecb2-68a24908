import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard,
  Boxes,
  ArrowRight,
  FileText,
  ClipboardList,
  Shield,
  LogOut,
  Loader2,
  Package,
  CalendarCheck,
  BookOpen,
  FileImage,
  CalendarRange,
  Building2,
  Activity,
  ListChecks,
  Wrench,
  Search,
  Home,
  BarChart3,
  ChevronDown,
  Cog,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import logoHeader from "@/assets/logo-branca.png";
import { useAuth } from "../lib/auth";
import { supabase, supabaseConfigSummary } from "../lib/supabase";
import { getPermissoesCargo, temPermissao } from "../lib/permissoes";
import { HubOverview, HubWelcome } from "@/components/hub-overview";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Águas do Rio · Eletromecânica" },
      { name: "description", content: "Hub de dashboards e sistemas da Eletromecânica." },
    ],
  }),
  component: Index,
});

const SISTEMAS_OPERACIONAL_URL = "https://adr-sb2.github.io/Gest-o-de-Ativos/";
const SISTEMAS_ADMINISTRATIVO_URL = "https://adr-sb2.github.io/Gest-o-de-Ativos/adm/adm.html";

type Painel = {
  chave: string;
  nome_exibicao: string;
  descricao: string;
  icone: string;
};

const CARD_COLORS: Record<string, { bg: string; icon: string; ring: string }> = {
  dashboard: { bg: "bg-blue-100", icon: "text-blue-600", ring: "hover:ring-blue-300" },
  sistemas: { bg: "bg-emerald-100", icon: "text-emerald-600", ring: "hover:ring-emerald-300" },
  relatorio: { bg: "bg-amber-100", icon: "text-amber-600", ring: "hover:ring-amber-300" },
  backlog: { bg: "bg-violet-100", icon: "text-violet-600", ring: "hover:ring-violet-300" },
  estoque: { bg: "bg-cyan-100", icon: "text-cyan-600", ring: "hover:ring-cyan-300" },
  plano_manutencao: { bg: "bg-orange-100", icon: "text-orange-600", ring: "hover:ring-orange-300" },
  escala: { bg: "bg-rose-100", icon: "text-rose-600", ring: "hover:ring-rose-300" },
  manuais: { bg: "bg-orange-100", icon: "text-orange-600", ring: "hover:ring-orange-300" },
  oi: { bg: "bg-indigo-100", icon: "text-indigo-600", ring: "hover:ring-indigo-300" },
  cronograma: { bg: "bg-teal-100", icon: "text-teal-600", ring: "hover:ring-teal-300" },
  ficha_elevatoria: { bg: "bg-sky-100", icon: "text-sky-600", ring: "hover:ring-sky-300" },
  produtividade: { bg: "bg-fuchsia-100", icon: "text-fuchsia-600", ring: "hover:ring-fuchsia-300" },
  procedimentos: { bg: "bg-lime-100", icon: "text-lime-600", ring: "hover:ring-lime-300" },
};

function getCardColor(chave: string) {
  if (chave === "estoque") return CARD_COLORS.estoque;
  if (chave.startsWith("dashboard")) return CARD_COLORS.dashboard;
  if (chave.startsWith("sistemas")) return CARD_COLORS.sistemas;
  if (chave.startsWith("relatorio")) return CARD_COLORS.relatorio;
  if (chave.startsWith("dashboard_os")) return CARD_COLORS.backlog;
  if (chave.startsWith("escala")) return CARD_COLORS.escala;
  if (chave.startsWith("manuais")) return CARD_COLORS.manuais;
  if (chave === "oi" || chave === "gerador_oi") return CARD_COLORS.oi;
  if (chave === "cronograma") return CARD_COLORS.cronograma;
  if (chave === "ficha_elevatoria") return CARD_COLORS.ficha_elevatoria;
  if (chave === "plano_manutencao") return CARD_COLORS.plano_manutencao;
  if (chave === "produtividade") return CARD_COLORS.produtividade;
  if (chave === "procedimentos") return CARD_COLORS.procedimentos;
  return CARD_COLORS.dashboard;
}

const animations = `
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-card {
  animation: fadeSlideUp 0.5s ease-out forwards;
  opacity: 0;
}
`;

function Index() {
  const navigate = useNavigate();
  const { user, profile, loading, signOut } = useAuth();
  const [paineis, setPaineis] = useState<Painel[]>([]);
  const [loadingPaineis, setLoadingPaineis] = useState(true);
  const [dashOpen, setDashOpen] = useState(false);
  const [sysOpen, setSysOpen] = useState(false);
  const [fichaChoiceOpen, setFichaChoiceOpen] = useState(false);
  const [permissoes, setPermissoes] = useState<Map<string, Set<string>>>(new Map());
  const [busca, setBusca] = useState("");
  const [buscaRemota, setBuscaRemota] = useState("");
  const [resultadosRemotos, setResultadosRemotos] = useState<
    { tipo: "O.S." | "Equipamento"; titulo: string; detalhe: string; destino: string }[]
  >([]);
  const [erroBuscaRemota, setErroBuscaRemota] = useState(false);
  const [carregandoBuscaRemota, setCarregandoBuscaRemota] = useState(false);
  const [horaAtual, setHoraAtual] = useState(() => new Date());
  const [openOsCount, setOpenOsCount] = useState<number | null>(null);
  const updateOpenOsCount = useCallback((count: number | null) => setOpenOsCount(count), []);
  const canViewRecords = temPermissao(permissoes, "registros", "visualizar");
  const canViewEquipment = temPermissao(permissoes, "estoque", "equipamentos_ver");

  useEffect(() => {
    const timer = window.setInterval(() => setHoraAtual(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setBuscaRemota(busca.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [busca]);

  useEffect(() => {
    let active = true;
    const term = buscaRemota
      .replace(/[%,_*()"]/g, " ")
      .replaceAll("\\", " ")
      .trim();
    if (term.length < 2) {
      setResultadosRemotos([]);
      setErroBuscaRemota(false);
      setCarregandoBuscaRemota(false);
      return () => {
        active = false;
      };
    }

    setCarregandoBuscaRemota(true);
    void Promise.all([
      canViewRecords
        ? supabase
            .from("registros_atendimento")
            .select("ordem,texto_breve,planta")
            .or(`ordem.ilike.%${term}%,texto_breve.ilike.%${term}%,planta.ilike.%${term}%`)
            .limit(5)
        : Promise.resolve({ data: [], error: null }),
      canViewEquipment
        ? supabase
            .from("equipamentos")
            .select("tag,descricao")
            .or(`tag.ilike.%${term}%,descricao.ilike.%${term}%`)
            .limit(5)
        : Promise.resolve({ data: [], error: null }),
    ])
      .then(([osRes, equipamentoRes]) => {
        if (!active) return;
        setErroBuscaRemota(!!osRes.error || !!equipamentoRes.error);
        setResultadosRemotos([
          ...(osRes.data || []).map((row) => ({
            tipo: "O.S." as const,
            titulo: `O.S. ${row.ordem || "sem número"}`,
            detalhe: row.texto_breve || row.planta || "Registro de atendimento",
            destino: "/registros",
          })),
          ...(equipamentoRes.data || []).map((row) => ({
            tipo: "Equipamento" as const,
            titulo: row.tag,
            detalhe: row.descricao,
            destino: "/estoque",
          })),
        ]);
        setCarregandoBuscaRemota(false);
      })
      .catch((error: unknown) => {
        console.error("Erro na busca global do HUB:", error);
        if (!active) return;
        setErroBuscaRemota(true);
        setCarregandoBuscaRemota(false);
      });

    return () => {
      active = false;
    };
  }, [buscaRemota, canViewEquipment, canViewRecords]);

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
    if (!supabaseConfigSummary.isConfigured || !profile?.cargo_id) {
      setLoadingPaineis(false);
      return;
    }
    (async () => {
      const [panelsRes, perms] = await Promise.all([
        supabase
          .from("cargo_paineis")
          .select("painel_id, paineis!inner(chave, nome_exibicao, descricao, icone)")
          .eq("cargo_id", profile.cargo_id),
        getPermissoesCargo(profile.cargo_id),
      ]);
      if (panelsRes.data) {
        setPaineis(panelsRes.data.map((r: { paineis: unknown }) => r.paineis as unknown as Painel));
      }
      setPermissoes(perms);
      setLoadingPaineis(false);
    })();
  }, [profile?.cargo_id]);

  if (loading) return null;

  const hasPanel = (chave: string) => paineis.some((p) => p.chave === chave);
  const hasFallbackPanels = paineis.length === 0;
  const shouldShowDashboard =
    hasPanel("dashboard_automacao") || hasPanel("dashboard_testes") || hasFallbackPanels;
  const shouldShowSistema = hasPanel("sistemas") || hasFallbackPanels;
  const shouldShowRelatorio = hasPanel("relatorio_tecnico") || hasFallbackPanels;
  const shouldShowBacklog = hasPanel("dashboard_os") || hasFallbackPanels;
  const shouldShowEscala = hasPanel("escala_trabalho") || hasFallbackPanels;
  const shouldShowEstoque = hasPanel("estoque");
  const shouldShowManuais = hasPanel("manuais") || hasFallbackPanels;
  const shouldShowOI = hasPanel("gerador_oi") || hasFallbackPanels;
  const shouldShowCronograma = hasPanel("cronograma") || hasFallbackPanels;
  const shouldShowFichaElevatoria = hasPanel("ficha_elevatoria");
  const shouldShowPlanoManutencao =
    hasPanel("plano_manutencao") || hasPanel("ficha_elevatoria") || hasPanel("estoque");
  const shouldShowProcedimentos = hasPanel("procedimentos");
  const canAdmin = hasPanel("admin");
  const categorias = [
    {
      id: "operacao",
      nome: "Operação",
      descricao: "Acesse as ferramentas operacionais.",
      icon: Activity,
      color: "bg-blue-100 text-blue-600",
    },
    {
      id: "planejamento",
      nome: "Planejamento",
      descricao: "Organize e acompanhe o planejamento.",
      icon: CalendarRange,
      color: "bg-emerald-100 text-emerald-600",
    },
    {
      id: "ativos",
      nome: "Ativos e Recursos",
      descricao: "Gerencie os ativos da operação.",
      icon: Cog,
      color: "bg-violet-100 text-violet-600",
    },
    {
      id: "documentacao",
      nome: "Documentação",
      descricao: "Consulte manuais e procedimentos.",
      icon: BookOpen,
      color: "bg-orange-100 text-orange-600",
    },
    {
      id: "analises",
      nome: "Análises",
      descricao: "Acompanhe indicadores e dashboards.",
      icon: BarChart3,
      color: "bg-teal-100 text-teal-600",
    },
    {
      id: "relatorios",
      nome: "Relatórios",
      descricao: "Gere relatórios e exporte dados.",
      icon: FileText,
      color: "bg-sky-100 text-sky-600",
    },
  ];
  const ferramentas = [
    {
      key: "backlog",
      nome: "Backlog BI",
      descricao: "O.S. do Field/SAP: SLA, mapa e programação semanal.",
      categoria: "operacao",
      icon: ClipboardList,
      visible: shouldShowBacklog,
      to: "/backlog",
    },
    {
      key: "oi",
      nome: "Ordem de Início",
      descricao: "Relatório Fotográfico — gerar DOCX direto no navegador.",
      categoria: "operacao",
      icon: FileImage,
      visible: shouldShowOI,
      to: "/oi",
    },
    {
      key: "produtividade",
      nome: "Produtividade",
      descricao: "Acompanhamento diário da equipe de manutenção.",
      categoria: "operacao",
      icon: Activity,
      visible: true,
      to: "/produtividade",
    },
    {
      key: "cronograma",
      nome: "Cronograma",
      descricao: "Planejamento de instalações, obras e manutenções.",
      categoria: "planejamento",
      icon: CalendarRange,
      visible: shouldShowCronograma,
      to: "/cronograma",
    },
    {
      key: "escala",
      nome: "Escala de Trabalho",
      descricao: "Equipe, plantões e escala semanal de trabalho.",
      categoria: "planejamento",
      icon: CalendarCheck,
      visible: shouldShowEscala,
      to: "/escala",
    },
    {
      key: "plano_manutencao",
      nome: "Plano de Manutenção",
      descricao: "Equipamentos, planos ativos e pendências.",
      categoria: "planejamento",
      icon: Wrench,
      visible: shouldShowPlanoManutencao,
      to: "/plano-manutencao",
    },
    {
      key: "ficha_elevatoria",
      nome: "Ficha da Elevatória",
      descricao: "Ficha técnica de elevatórias e equipamentos.",
      categoria: "ativos",
      icon: Building2,
      visible: shouldShowFichaElevatoria,
      onClick: () => setFichaChoiceOpen(true),
    },
    {
      key: "estoque",
      nome: "Almoxarifado",
      descricao: "Estoque de materiais, entrada/saída, compras e pedidos.",
      categoria: "ativos",
      icon: Package,
      visible: shouldShowEstoque,
      to: "/estoque",
    },
    {
      key: "sistemas",
      nome: "Sistemas",
      descricao: "Hubs administrativos e operacionais.",
      categoria: "ativos",
      icon: Boxes,
      visible: shouldShowSistema,
      onClick: () => setSysOpen(true),
    },
    {
      key: "manuais",
      nome: "Manuais",
      descricao: "Normas e manuais técnicos.",
      categoria: "documentacao",
      icon: BookOpen,
      visible: shouldShowManuais,
      to: "/manuais",
    },
    {
      key: "procedimentos",
      nome: "Procedimentos",
      descricao: "Procedimentos operacionais passo-a-passo com PDF.",
      categoria: "documentacao",
      icon: ListChecks,
      visible: shouldShowProcedimentos,
      to: "/procedimentos",
    },
    {
      key: "dashboard",
      nome: "Dashboard",
      descricao: "Painéis de automação, testes e medições.",
      categoria: "analises",
      icon: LayoutDashboard,
      visible: shouldShowDashboard,
      onClick: () => setDashOpen(true),
    },
    {
      key: "relatorio",
      nome: "Relatório",
      descricao: "Relatórios técnicos e de Planta/Unidade.",
      categoria: "relatorios",
      icon: FileText,
      visible: shouldShowRelatorio,
      to: "/relatorio",
    },
  ];
  const ferramentasVisiveis = ferramentas.filter(
    (tool) =>
      tool.visible &&
      (!busca.trim() ||
        tool.nome.toLocaleLowerCase("pt-BR").includes(busca.trim().toLocaleLowerCase("pt-BR"))),
  );
  const categoriasVisiveis = categorias.filter((category) =>
    ferramentasVisiveis.some((tool) => tool.categoria === category.id),
  );
  const renderTool = (tool: (typeof ferramentas)[number], delay: number, sidebar = false) => {
    const Icon = tool.icon;
    const color = getCardColor(tool.key);
    const content = sidebar ? (
      <>
        <Icon className="h-4 w-4 shrink-0" />
        <span className="hidden truncate lg:inline">{tool.nome}</span>
        {tool.key === "backlog" && openOsCount !== null && openOsCount > 0 && (
          <span className="hidden min-w-5 rounded-full bg-[#1f5bd8] px-1.5 py-0.5 text-center text-[10px] font-bold text-white lg:inline">
            {openOsCount}
          </span>
        )}
      </>
    ) : (
      <>
        <CardIcon chave={tool.key} icon={Icon} />
        <CardTitle>{tool.nome}</CardTitle>
        <CardDesc>{tool.descricao}</CardDesc>
        <CardCta>{tool.onClick ? "Abrir opções" : "Abrir ferramenta"}</CardCta>
      </>
    );
    if (tool.onClick && sidebar) {
      return (
        <button
          key={tool.key}
          type="button"
          onClick={tool.onClick}
          title={tool.nome}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs text-blue-50/80 transition hover:bg-white/10 hover:text-white"
        >
          {content}
        </button>
      );
    }
    if (tool.onClick) {
      return (
        <CardButton key={tool.key} onClick={tool.onClick} chave={tool.key} delay={delay}>
          {content}
        </CardButton>
      );
    }
    return sidebar ? (
      <Link
        key={tool.key}
        to={tool.to || "/"}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-blue-50/80 transition hover:bg-white/10 hover:text-white ${color.icon}`}
        title={tool.nome}
      >
        {content}
      </Link>
    ) : (
      <CardLink key={tool.key} to={tool.to || "/"} chave={tool.key} delay={delay}>
        {content}
      </CardLink>
    );
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f4f8ff_0%,#eaf2ff_55%,#f7faff_100%)] text-[#0b2b55] dark:bg-slate-950 dark:text-slate-100">
      <style>{animations}</style>

      <aside className="fixed inset-y-0 left-0 z-30 flex w-[68px] flex-col bg-gradient-to-b from-[#082b59] via-[#06234b] to-[#041a38] px-2 py-4 text-white shadow-[8px_0_28px_-18px_rgba(4,27,58,0.8)] lg:w-[230px] lg:px-4 lg:py-6">
        <div className="mb-5 flex items-center justify-center border-b border-white/10 pb-5 lg:mb-8 lg:justify-start lg:pb-6">
          <img
            src={logoHeader}
            alt="Águas do Rio"
            className="h-9 w-auto object-contain lg:h-14"
            loading="eager"
          />
        </div>
        <nav aria-label="Navegação principal" className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          <Link
            to="/"
            title="Início"
            className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-[#1261c4] to-[#0b4a9d] px-3 py-2.5 text-sm font-semibold shadow-[0_6px_18px_-10px_rgba(0,100,220,0.9)] ring-1 ring-white/10"
          >
            <Home className="h-4 w-4 shrink-0" />
            <span className="hidden lg:inline">Início</span>
          </Link>
          {categorias.map((category) => {
            const CategoryIcon = category.icon;
            const items = ferramentasVisiveis.filter((tool) => tool.categoria === category.id);
            if (!items.length) return null;
            return (
              <div key={category.id} className="space-y-1">
                <a
                  href={`#categoria-${category.id}`}
                  title={category.nome}
                  className="flex items-center gap-2 px-2 py-1 text-[11px] font-semibold text-cyan-100/65 hover:text-white"
                >
                  <CategoryIcon className="h-4 w-4 shrink-0 lg:hidden" />
                  <span className="hidden lg:inline">{category.nome}</span>
                  <ChevronDown className="ml-auto hidden h-3 w-3 lg:block" />
                </a>
                {items.map((tool, index) => renderTool(tool, index, true))}
              </div>
            );
          })}
        </nav>
        <div className="mt-4 border-t border-white/15 pt-3">
          {canAdmin && (
            <Link
              to="/admin"
              title="Painel Administrativo"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-blue-50/80 hover:bg-white/10 hover:text-white"
            >
              <Shield className="h-4 w-4 shrink-0" />
              <span className="hidden lg:inline">Painel Administrativo</span>
            </Link>
          )}
          <div className="hidden items-center gap-2 px-3 pt-2 text-[11px] text-cyan-100/80 lg:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Sistema Online
          </div>
        </div>
      </aside>

      <div className="min-h-screen ml-[68px] lg:ml-[230px]">
        <header className="sticky top-0 z-10 border-b border-[#d9e3f2] bg-white/95 shadow-[0_4px_18px_-14px_rgba(16,54,102,0.45)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-7 lg:px-8 lg:py-3.5">
            <div>
              <p className="text-lg font-bold tracking-tight text-[#0b2b55] dark:text-white sm:text-xl">
                Hub Operacional
              </p>
              <p className="text-xs text-[#45658e] dark:text-slate-400 sm:text-sm">
                Eletromecânica
              </p>
            </div>
            <div className="relative order-3 w-full sm:order-none sm:mx-4 sm:max-w-sm sm:flex-1">
              <label className="flex items-center gap-2 rounded-full border border-[#d5e0ee] bg-white px-3.5 py-2 text-[#45658e] shadow-sm focus-within:border-[#3286d2] focus-within:ring-2 focus-within:ring-[#3286d2]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                <Search className="h-4 w-4 shrink-0" />
                <input
                  type="search"
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder="Buscar ferramenta, O.S. ou equipamento..."
                  aria-label="Buscar ferramenta, O.S. ou equipamento"
                  className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-white"
                />
              </label>
              {busca.trim().length >= 2 && (
                <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  {ferramentasVisiveis.slice(0, 5).map((tool) => {
                    const Icon = tool.icon;
                    const content = (
                      <>
                        <Icon className="h-4 w-4 text-[#1f5bd8]" />
                        <span className="truncate">{tool.nome}</span>
                      </>
                    );
                    return tool.onClick ? (
                      <button
                        key={tool.key}
                        onClick={() => {
                          tool.onClick?.();
                          setBusca("");
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-blue-50 dark:hover:bg-slate-800"
                      >
                        {content}
                      </button>
                    ) : (
                      <Link
                        key={tool.key}
                        to={tool.to || "/"}
                        onClick={() => setBusca("")}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-slate-800"
                      >
                        {content}
                      </Link>
                    );
                  })}
                  {carregandoBuscaRemota && (
                    <p className="px-3 py-2 text-xs text-slate-500">
                      Buscando O.S. e equipamentos…
                    </p>
                  )}
                  {erroBuscaRemota && (
                    <p className="px-3 py-2 text-xs text-red-600">
                      Não foi possível consultar O.S. e equipamentos.
                    </p>
                  )}
                  {!carregandoBuscaRemota &&
                    resultadosRemotos.map((result, index) => (
                      <Link
                        key={`${result.tipo}-${result.titulo}-${index}`}
                        to={result.destino}
                        onClick={() => setBusca("")}
                        className="flex items-start gap-2 rounded-lg px-3 py-2 hover:bg-blue-50 dark:hover:bg-slate-800"
                      >
                        <span className="mt-0.5 text-[10px] font-bold uppercase text-slate-400">
                          {result.tipo}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">
                            {result.titulo}
                          </span>
                          <span className="block truncate text-xs text-slate-500">
                            {result.detalhe}
                          </span>
                        </span>
                      </Link>
                    ))}
                  {!carregandoBuscaRemota &&
                    !erroBuscaRemota &&
                    ferramentasVisiveis.length === 0 &&
                    resultadosRemotos.length === 0 && (
                      <p className="px-3 py-2 text-xs text-slate-500">
                        Nenhuma ferramenta, O.S. ou equipamento encontrado.
                      </p>
                    )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden border-l border-[#d4deed] pl-3 text-right sm:block">
                <p className="max-w-48 truncate text-sm font-semibold text-[#0b2b55] dark:text-white">
                  {profile?.nome_completo}
                </p>
                {profile?.cargo_nome && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">{profile.cargo_nome}</p>
                )}
              </div>
              {canAdmin && (
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#d7e2f1] bg-white px-3 py-2 text-xs font-semibold text-[#174879] transition hover:bg-[#eff6ff] active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  <Shield className="h-3.5 w-3.5" /> Admin
                </Link>
              )}
              <button
                onClick={signOut}
                className="inline-flex items-center justify-center rounded-lg border border-[#d7e2f1] bg-white p-2 text-[#174879] transition hover:bg-[#eff6ff] active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                title="Sair"
                aria-label="Sair"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="relative mx-auto min-h-[calc(100vh-65px)] max-w-[1600px] overflow-hidden px-4 pb-8 pt-5 sm:px-7 sm:pt-6 lg:px-7 lg:pt-6">
          <div className="pointer-events-none absolute bottom-0 right-0 h-56 w-[70%] rounded-tl-[100%] bg-gradient-to-tl from-[#dceaff] via-[#eaf2ff]/70 to-transparent dark:from-blue-950/30 dark:via-transparent" />
          <section className="relative mb-5 flex min-h-[124px] items-center overflow-hidden rounded-[15px] border border-white/10 bg-gradient-to-r from-[#062955] via-[#0b4b91] to-[#087eb2] px-5 py-5 text-white shadow-[0_16px_34px_-18px_rgba(0,45,116,0.8)] sm:px-8">
            <div className="pointer-events-none absolute -right-10 -top-24 h-72 w-72 rounded-full border-[34px] border-white/5" />
            <div className="pointer-events-none absolute right-[18%] top-[-110px] h-72 w-72 rotate-45 rounded-[42px] bg-white/[0.045]" />
            <svg
              viewBox="0 0 520 150"
              preserveAspectRatio="xMidYMid slice"
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-[48%] opacity-40 lg:block"
            >
              <defs>
                <linearGradient id="hub-pipe" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#52b9ff" />
                  <stop offset="0.5" stopColor="#0875cc" />
                  <stop offset="1" stopColor="#034584" />
                </linearGradient>
              </defs>
              <path d="M25 92h390" fill="none" stroke="#bce6ff" strokeWidth="48" opacity=".35" />
              <path d="M25 88h390" fill="none" stroke="url(#hub-pipe)" strokeWidth="38" />
              <path d="M25 77h390" fill="none" stroke="#a9ddff" strokeWidth="3" opacity=".55" />
              <path
                d="M180 87v-55h115v55M194 31v-9h87v9"
                fill="none"
                stroke="url(#hub-pipe)"
                strokeWidth="24"
              />
              <path
                d="M164 67h148M164 58h148"
                fill="none"
                stroke="#c3eaff"
                strokeWidth="5"
                opacity=".5"
              />
              <path d="M86 111v39m272-39v39" stroke="#c2e9ff" strokeWidth="13" opacity=".55" />
              <path d="M69 145h34m238 0h34" stroke="#c2e9ff" strokeWidth="5" opacity=".55" />
              <path d="M25 104h390" stroke="#032f62" strokeWidth="4" opacity=".45" />
            </svg>
            <div className="relative z-[1]">
              <HubWelcome />
            </div>
          </section>

          <HubOverview
            userId={user?.id}
            onOpenCount={updateOpenOsCount}
            canViewRecords={canViewRecords}
            canViewInventory={shouldShowEstoque}
          >
            <>
              <section className="mb-5">
                <div className="mb-3 flex items-center gap-3">
                  <span className="h-7 w-1 rounded-full bg-[#1f5bd8]" />
                  <h2 className="text-lg font-bold text-[#0b2b55] dark:text-white">
                    Ferramentas por Categoria
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {categoriasVisiveis.map((category) => {
                    const Icon = category.icon;
                    return (
                      <a
                        key={category.id}
                        href={`#categoria-${category.id}`}
                        className="group flex min-h-[92px] items-center gap-3 rounded-xl border border-[#e1e9f4] bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 sm:p-4"
                      >
                        <span
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${category.color}`}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold text-[#102f5c] dark:text-white">
                            {category.nome}
                          </span>
                          <span className="mt-1 line-clamp-2 block text-xs text-slate-500 dark:text-slate-400">
                            {category.descricao}
                          </span>
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-[#1768c4] transition group-hover:translate-x-1" />
                      </a>
                    );
                  })}
                </div>
              </section>

              {loadingPaineis ? (
                <div className="flex min-h-40 items-center justify-center">
                  <Loader2 className="h-7 w-7 animate-spin text-[#1f7ad6]" />
                </div>
              ) : busca.trim() && ferramentasVisiveis.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#cbd9ed] bg-white/70 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400">
                  Nenhuma ferramenta encontrada para “{busca}”.
                </div>
              ) : (
                <div className="space-y-6">
                  {categoriasVisiveis.map((category) => {
                    const categoryTools = ferramentasVisiveis.filter(
                      (tool) => tool.categoria === category.id,
                    );
                    const Icon = category.icon;
                    return (
                      <section
                        key={category.id}
                        id={`categoria-${category.id}`}
                        className="scroll-mt-24"
                      >
                        <div className="mb-3 flex items-center gap-2">
                          <Icon className="h-4 w-4 text-[#1f5bd8]" />
                          <h3 className="text-sm font-bold text-[#25466f] dark:text-slate-200">
                            {category.nome}
                          </h3>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {categoryTools.map((tool, index) =>
                            renderTool(tool, index + category.id.length),
                          )}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}
            </>
          </HubOverview>

          <footer className="relative mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-[#dce5f1] pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Sistema Online
              <span className="mx-1 text-slate-300">|</span>
              Águas do Rio · Eletromecânica
            </span>
            <span>
              {new Intl.DateTimeFormat("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }).format(horaAtual)}
            </span>
          </footer>
        </main>
      </div>

      {/* ===== DIALOG: DASHBOARDS ===== */}
      <Dialog open={dashOpen} onOpenChange={setDashOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0b3a73] dark:text-white">
              Escolha um dashboard
            </DialogTitle>
            <DialogDescription>Qual painel você quer abrir?</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            {hasPanel("dashboard_automacao") && (
              <Link
                to="/dashboard"
                onClick={() => setDashOpen(false)}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-[#1f7ad6] hover:bg-[#eaf3fb] dark:border-slate-600 dark:bg-slate-800 dark:hover:border-[#38bdf8] dark:hover:bg-slate-700"
              >
                <div>
                  <div className="font-semibold text-[#0b3a73] dark:text-white">Automação</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Elevatórias · sensores · CLP/PCP · ELIPSE
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#1f7ad6] dark:text-[#38bdf8]" />
              </Link>
            )}
            {hasPanel("dashboard_testes") && (
              <Link
                to="/testes"
                onClick={() => setDashOpen(false)}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-[#1f7ad6] hover:bg-[#eaf3fb] dark:border-slate-600 dark:bg-slate-800 dark:hover:border-[#38bdf8] dark:hover:bg-slate-700"
              >
                <div>
                  <div className="font-semibold text-[#0b3a73] dark:text-white">
                    Testes & Aferições
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Serviços · equipes · parâmetros · impossibilidade
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#1f7ad6] dark:text-[#38bdf8]" />
              </Link>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== DIALOG: FICHA / PLANO ===== */}
      <Dialog open={fichaChoiceOpen} onOpenChange={setFichaChoiceOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-[#0b3a73] dark:text-white">Escolha o módulo</DialogTitle>
            <DialogDescription>
              Acesse a ficha técnica da elevatória ou o controle de manutenção por equipamento.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <Link
              to="/elevatorias"
              onClick={() => setFichaChoiceOpen(false)}
              className="flex min-h-[144px] flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-[#1f7ad6] hover:bg-[#eaf3fb] dark:border-slate-600 dark:bg-slate-800 dark:hover:border-[#38bdf8] dark:hover:bg-slate-700"
            >
              <div>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="text-lg font-semibold text-[#0b3a73] dark:text-white">
                  Ficha de Elevatórias
                </div>
              </div>
              <div className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                Consulte o cadastro técnico, informações e histórico das elevatórias.
              </div>
            </Link>

            <Link
              to="/plano-manutencao"
              onClick={() => setFichaChoiceOpen(false)}
              className="flex min-h-[144px] flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-[#f59e0b] hover:bg-orange-50 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-[#f59e0b] dark:hover:bg-slate-700"
            >
              <div>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                  <Wrench className="h-5 w-5" />
                </div>
                <div className="text-lg font-semibold text-[#0b3a73] dark:text-white">
                  Plano de Manutenção
                </div>
              </div>
              <div className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                Cadastre equipamentos, acompanhe planos ativos e identifique pendências de
                manutenção.
              </div>
            </Link>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== DIALOG: SISTEMAS ===== */}
      <Dialog open={sysOpen} onOpenChange={setSysOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0b3a73] dark:text-white">Escolha um sistema</DialogTitle>
            <DialogDescription>Qual hub você quer abrir?</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            {temPermissao(permissoes, "sistemas", "administrativo") && (
              <a
                href={SISTEMAS_ADMINISTRATIVO_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setSysOpen(false)}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-[#1f7ad6] hover:bg-[#eaf3fb] dark:border-slate-600 dark:bg-slate-800 dark:hover:border-[#38bdf8] dark:hover:bg-slate-700"
              >
                <div>
                  <div className="font-semibold text-[#0b3a73] dark:text-white">Administrativo</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Gestão administrativa
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#1f7ad6] dark:text-[#38bdf8]" />
              </a>
            )}
            {temPermissao(permissoes, "sistemas", "operacional") && (
              <a
                href={SISTEMAS_OPERACIONAL_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setSysOpen(false)}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-[#1f7ad6] hover:bg-[#eaf3fb] dark:border-slate-600 dark:bg-slate-800 dark:hover:border-[#38bdf8] dark:hover:bg-slate-700"
              >
                <div>
                  <div className="font-semibold text-[#0b3a73] dark:text-white">Operacional</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Gestão de Ativos</div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#1f7ad6] dark:text-[#38bdf8]" />
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ===== SUB-COMPONENTES DOS CARDS ===== */

function CardIcon({ chave, icon: Icon }: { chave: string; icon: typeof LayoutDashboard }) {
  const color = getCardColor(chave);
  return (
    <div
      className={`row-span-3 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${color.bg} ${color.icon} shadow-sm dark:bg-slate-700 dark:text-slate-300`}
    >
      <Icon className="h-6 w-6" />
    </div>
  );
}

function CardTitle({ children }: { children: string }) {
  return (
    <h2 className="pr-7 pt-1 text-sm font-semibold leading-5 text-[#0b3a73] dark:text-white">
      {children}
    </h2>
  );
}

function CardDesc({ children }: { children: string }) {
  return (
    <p className="line-clamp-2 pr-7 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
      {children}
    </p>
  );
}

function CardCta({ children }: { children: string }) {
  return (
    <span className="absolute bottom-3 right-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#eff5ff] text-[#1768c4] transition group-hover:bg-[#dceaff] group-hover:translate-x-0.5 dark:bg-slate-700 dark:text-blue-300 dark:group-hover:bg-slate-600">
      <span className="sr-only">{children}</span>
      <ArrowRight aria-hidden="true" className="h-4 w-4" />
    </span>
  );
}

function CardButton({
  onClick,
  chave,
  delay,
  children,
}: {
  onClick: () => void;
  chave: string;
  delay: number;
  children: React.ReactNode;
}) {
  const color = getCardColor(chave);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative grid min-h-[112px] w-full animate-card grid-cols-[48px_minmax(0,1fr)] grid-rows-[auto_auto_1fr] items-start gap-x-3 gap-y-1.5 rounded-xl border border-[#e1e9f4] bg-white/95 p-4 text-left shadow-[0_5px_16px_-10px_rgba(16,54,102,0.35)] transition-all duration-200 hover:-translate-y-1 hover:border-[#c5d9f3] hover:shadow-[0_12px_24px_-14px_rgba(16,54,102,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f7ad6] active:scale-[0.99] ${color.ring} dark:border-slate-700 dark:bg-slate-900`}
      style={{ animationDelay: `${delay * 80}ms` }}
    >
      {children}
    </button>
  );
}

function CardLink({
  to,
  chave,
  delay,
  children,
}: {
  to: string;
  chave: string;
  delay: number;
  children: React.ReactNode;
}) {
  const color = getCardColor(chave);
  return (
    <Link
      to={to}
      className={`group relative grid min-h-[112px] w-full animate-card grid-cols-[48px_minmax(0,1fr)] grid-rows-[auto_auto_1fr] items-start gap-x-3 gap-y-1.5 rounded-xl border border-[#e1e9f4] bg-white/95 p-4 text-left shadow-[0_5px_16px_-10px_rgba(16,54,102,0.35)] transition-all duration-200 hover:-translate-y-1 hover:border-[#c5d9f3] hover:shadow-[0_12px_24px_-14px_rgba(16,54,102,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f7ad6] active:scale-[0.99] ${color.ring} dark:border-slate-700 dark:bg-slate-900`}
      style={{ animationDelay: `${delay * 80}ms` }}
    >
      {children}
    </Link>
  );
}

export default Index;
