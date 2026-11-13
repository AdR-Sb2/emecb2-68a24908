import { createFileRoute, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import {
  LayoutDashboard,
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
  Globe2,
  ExternalLink,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { getCargoPaineis, getPermissoesCargo, temPermissao } from "../lib/permissoes";
import { HubOverview, HubWelcome } from "@/components/hub-overview";
import {
  HUB_PUBLIC_LINKS_GROUP,
  HUB_DASHBOARDS_ROUTE,
  canShowProcedimentosNavigation,
  getActiveHubGroup,
  getVisibleHubSidebarGroups,
} from "@/lib/hub-navigation";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Águas do Rio · Eletromecânica" },
      { name: "description", content: "Hub de dashboards e sistemas da Eletromecânica." },
    ],
  }),
  component: Index,
});

type Painel = {
  chave: string;
  nome_exibicao: string;
  descricao: string;
  icone: string;
};

type PublicLink = { key: string; nome: string; descricao: string; url: string };

function Index() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, loading, signOut } = useAuth();
  const [paineis, setPaineis] = useState<Painel[]>([]);
  const [loadingPaineis, setLoadingPaineis] = useState(true);
  const [openSidebarGroup, setOpenSidebarGroup] = useState<string | null>(null);
  const [categoryChoice, setCategoryChoice] = useState<string | null>(null);
  const [publicLinks, setPublicLinks] = useState<PublicLink[]>([]);
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
    setOpenSidebarGroup(getActiveHubGroup(location.pathname));
  }, [location.pathname]);

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
    let active = true;
    const loadPublicLinks = async () => {
      const [fieldConfig, elevatoriaConfig, cronogramas] = await Promise.all([
        supabase
          .from("field_config")
          .select("link_publico_token,backlog_link_publico_token")
          .eq("id", 1)
          .maybeSingle(),
        supabase
          .from("elevatorias_config")
          .select("link_publico_token")
          .eq("id", 1)
          .maybeSingle(),
        supabase
          .from("cronograma_projetos")
          .select("id,nome,link_publico_token")
          .eq("visibilidade", "publico")
          .not("link_publico_token", "is", null)
          .order("criado_em", { ascending: false }),
      ]);
      if (!active) return;
      const origin = window.location.origin;
      const links: PublicLink[] = [];
      const backlogToken = fieldConfig.data?.backlog_link_publico_token;
      const productivityToken = fieldConfig.data?.link_publico_token;
      const elevatorToken = elevatoriaConfig.data?.link_publico_token;
      if (backlogToken) {
        links.push({
          key: "public-backlog",
          nome: "Backlog Público",
          descricao: "Consulta pública das ordens de serviço do Backlog.",
          url: `${origin}/backlog/publico/${backlogToken}`,
        });
      }
      if (productivityToken) {
        links.push({
          key: "public-productivity",
          nome: "Dashboard de Produtividade",
          descricao: "Indicadores e acompanhamento da produtividade.",
          url: `${origin}/produtividade/publico/${productivityToken}`,
        });
      }
      if (elevatorToken) {
        links.push({
          key: "public-elevatorias",
          nome: "Fichas das Elevatórias",
          descricao: "Consulta pública das fichas técnicas das elevatórias.",
          url: `${origin}/elevatorias/publico/${elevatorToken}`,
        });
      }
      for (const project of cronogramas.data || []) {
        if (!project.link_publico_token) continue;
        links.push({
          key: `public-cronograma-${project.id}`,
          nome: `Cronograma · ${project.nome || "Projeto"}`,
          descricao: "Acompanhamento público do cronograma do projeto.",
          url: `${origin}/cronograma/publico/${project.link_publico_token}`,
        });
      }
      setPublicLinks(links);
    };
    void loadPublicLinks().catch((error) => {
      console.error("Erro ao carregar links públicos ativos do Hub:", error);
      if (active) setPublicLinks([]);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!supabaseConfigSummary.isConfigured || !profile?.cargo_id) {
      setLoadingPaineis(false);
      return;
    }
    (async () => {
      try {
        const [panels, perms] = await Promise.all([
          getCargoPaineis(profile.cargo_id, user?.id),
          getPermissoesCargo(profile.cargo_id, user?.id),
        ]);
        setPaineis(panels.map((r) => r.paineis as unknown as Painel));
        setPermissoes(perms);
      } catch (error) {
        console.warn("Não foi possível carregar os painéis do cargo:", error);
      } finally {
        setLoadingPaineis(false);
      }
    })();
  }, [profile?.cargo_id, user?.id]);

  if (loading) return null;

  const hasPanel = (chave: string) => paineis.some((p) => p.chave === chave);
  const hasFallbackPanels = paineis.length === 0;
  const shouldShowDashboard =
    hasPanel("dashboard_automacao") || hasPanel("dashboard_testes") || hasFallbackPanels;
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
  const shouldShowProcedimentos = canShowProcedimentosNavigation(
    hasPanel("procedimentos"),
    temPermissao(permissoes, "procedimentos", "ver"),
  );
  const canAdmin = hasPanel("admin");
  const categorias = [
    {
      id: "operacao",
      nome: "Operação",
      descricao: "Acesse as ferramentas operacionais.",
      icon: Activity,
      color: "bg-slate-100 text-[#245b8f]",
    },
    {
      id: "planejamento",
      nome: "Planejamento",
      descricao: "Organize e acompanhe o planejamento.",
      icon: CalendarRange,
      color: "bg-slate-100 text-[#245b8f]",
    },
    {
      id: "ativos",
      nome: "Ativos",
      descricao: "Consulte e mantenha os ativos da operação.",
      icon: Cog,
      color: "bg-slate-100 text-[#245b8f]",
    },
    {
      id: "documentacao",
      nome: "Documentação",
      descricao: "Consulte manuais e procedimentos.",
      icon: BookOpen,
      color: "bg-slate-100 text-[#245b8f]",
    },
    {
      id: "analises",
      nome: "Análises",
      descricao: "Acompanhe indicadores e dashboards.",
      icon: BarChart3,
      color: "bg-slate-100 text-[#245b8f]",
    },
    {
      id: "links-publicos",
      nome: "Links Públicos",
      descricao: "Acesse os painéis e sistemas com compartilhamento público ativo.",
      icon: Globe2,
      color: "bg-slate-100 text-[#087e8b]",
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
      to: "/elevatorias",
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
      nome: "Dashboards",
      descricao: "Acesse os painéis de automação e Testes & Aferições.",
      categoria: "analises",
      icon: LayoutDashboard,
      visible: shouldShowDashboard,
      to: HUB_DASHBOARDS_ROUTE,
    },
    {
      key: "relatorio",
      nome: "Relatório",
      descricao: "Relatórios técnicos e de Planta/Unidade.",
      categoria: "analises",
      icon: FileText,
      visible: shouldShowRelatorio,
      to: "/relatorio",
    },
    ...publicLinks.map((link) => ({
      key: link.key,
      nome: link.nome,
      sidebarNome: link.key.startsWith("public-cronograma-") ? "Cronograma público" : link.nome,
      descricao: link.descricao,
      categoria: "links-publicos",
      icon: ExternalLink,
      visible: true,
      onClick: () => window.open(link.url, "_blank", "noopener,noreferrer"),
    })),
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
  const categoriaSelecionada = categorias.find((category) => category.id === categoryChoice);
  const ferramentasCategoriaSelecionada = categoryChoice
    ? ferramentasVisiveis.filter((tool) => tool.categoria === categoryChoice)
    : [];
  const renderTool = (tool: (typeof ferramentas)[number]) => {
    const Icon = tool.icon;
    const label = "sidebarNome" in tool ? tool.sidebarNome : tool.nome;
    const destination = "to" in tool ? tool.to : undefined;
    const isActive =
      !!destination &&
      (location.pathname === destination || location.pathname.startsWith(`${destination}/`));
    const isPublic = tool.key.startsWith("public-");
    const rowClass = `group flex w-full min-w-0 items-start gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] leading-4 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06264d] ${
      isActive
        ? "bg-[#0b4a9d] font-semibold text-white shadow-inner"
        : "text-slate-100 hover:bg-white/10 hover:text-white"
    }`;
    const content = (
      <>
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${isActive ? "text-cyan-200" : "text-cyan-200"}`} />
        <span className="hidden min-w-0 flex-1 whitespace-normal break-words lg:block">
          {label}
        </span>
        {tool.key === "backlog" && openOsCount !== null && openOsCount > 0 && (
          <span
            className="hidden min-w-6 shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-center text-[11px] font-bold tabular-nums text-[#0b3a73] lg:inline"
            aria-label={`${openOsCount.toLocaleString("pt-BR")} O.S. abertas ou pendentes`}
          >
            {openOsCount.toLocaleString("pt-BR")}
          </span>
        )}
        {isPublic && (
          <ExternalLink
            className="mt-0.5 hidden h-3.5 w-3.5 shrink-0 text-cyan-200 lg:block"
            aria-hidden="true"
          />
        )}
      </>
    );

    if (tool.onClick) {
      return (
        <button
          key={tool.key}
          type="button"
          onClick={tool.onClick}
          title={tool.nome}
          aria-label={isPublic ? `${label}; abre em nova aba` : tool.nome}
          className={rowClass}
        >
          {content}
        </button>
      );
    }

    return (
      <Link
        key={tool.key}
        to={destination || "/"}
        className={rowClass}
        title={tool.nome}
        aria-current={isActive ? "page" : undefined}
      >
        {content}
      </Link>
    );
  };

  const sidebarPrimaryGroups = getVisibleHubSidebarGroups(
    ferramentasVisiveis
      .filter((tool) => !tool.key.startsWith("public-"))
      .map((tool) => tool.key),
  );
  const sidebarPublicItems = ferramentasVisiveis.filter((tool) => tool.key.startsWith("public-"));
  const activeSidebarGroup = getActiveHubGroup(location.pathname);

  const handleSidebarGroupKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    groupId: string,
  ) => {
    const triggers = Array.from(
      document.querySelectorAll<HTMLButtonElement>("[data-hub-group-trigger]"),
    );
    const currentIndex = triggers.indexOf(event.currentTarget);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      triggers[(currentIndex + delta + triggers.length) % triggers.length]?.focus();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setOpenSidebarGroup(groupId);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      setOpenSidebarGroup(null);
    }
  };

  const initials = (profile?.nome_completo || user?.email || "U")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toLocaleUpperCase("pt-BR");

  const renderCategoryCard = (category: (typeof categorias)[number]) => {
    const categoryTools = ferramentasVisiveis.filter((tool) => tool.categoria === category.id);
    const firstTool = categoryTools[0];
    if (!firstTool) return null;
    const Icon = category.icon;
    const cardClass =
      "group relative isolate flex min-h-[132px] items-center gap-4 overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 text-left shadow-[0_5px_18px_-12px_rgba(15,45,85,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_14px_28px_-14px_rgba(15,45,85,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#245b8f] dark:border-slate-700 dark:bg-slate-900";
    const categoryImages: Record<string, string> = {
      operacao: "https://images.unsplash.com/photo-1516937941344-00b4e0337589?auto=format&fit=crop&w=900&q=85",
      planejamento: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=900&q=85",
      ativos: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=900&q=85",
      documentacao: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=85",
      analises: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=85",
      relatorios: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=85",
    };
    const content = (
      <>
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 z-0 w-[48%] bg-cover bg-center opacity-90 transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: `url("${categoryImages[category.id] || categoryImages.operacao}")` }} />
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-r from-white via-white/95 via-55% to-white/15 dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-900/25" />
        <span className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ring-black/[0.03] ${category.color}`}>
          <Icon className="h-5 w-5" />
        </span>
        <span className="relative z-10 min-w-0 flex-1">
          <span className="block text-base font-bold text-[#102f5c] dark:text-white">{category.nome}</span>
          <span className="mt-1 block text-sm leading-5 text-slate-600 dark:text-slate-300">{category.descricao}</span>
          <span className="mt-2 block text-xs font-semibold text-[#45658e] dark:text-blue-300">{categoryTools.length > 1 ? `${categoryTools.length} ferramentas disponíveis · clique para escolher` : `Começar por: ${firstTool.nome}`}</span>
        </span>
        <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/90 text-[#1768c4] shadow-sm ring-1 ring-blue-100 transition group-hover:translate-x-1 dark:bg-slate-800">
          <ArrowRight className="h-4 w-4" />
        </span>
      </>
    );
    if (categoryTools.length > 1 || firstTool.onClick) {
      return (
        <button
          key={category.id}
          id={`categoria-${category.id}`}
          type="button"
          onClick={() => {
            setBusca("");
            if (categoryTools.length > 1) {
              setCategoryChoice(category.id);
            } else {
              firstTool.onClick?.();
            }
          }}
          className={cardClass}
          aria-haspopup={categoryTools.length > 1 ? "dialog" : undefined}
        >
          {content}
        </button>
      );
    }
    return (
      <Link
        key={category.id}
        id={`categoria-${category.id}`}
        to={firstTool.to || "/"}
        onClick={() => setBusca("")}
        className={cardClass}
      >
        {content}
      </Link>
    );
  };

  return (
    <div id="hub-top" className="min-h-screen bg-[#f4f7fc] text-[#0b2b55] dark:bg-slate-950 dark:text-slate-100">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[68px] flex-col bg-gradient-to-b from-[#082b55] via-[#06264d] to-[#041b3a] px-2 py-3 text-white shadow-[8px_0_30px_-20px_rgba(3,20,45,0.65)] sm:flex lg:w-64 lg:px-3 lg:py-4">
        <div className="mb-4 flex shrink-0 items-center justify-center lg:mb-5 lg:justify-start">
          <img
            src={logoHeader}
            alt="Águas do Rio"
            className="h-9 w-auto object-contain lg:h-12"
            loading="eager"
          />
        </div>

        <nav aria-label="Navegação principal" className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1">
          <Link
            to="/"
            title="Início"
            aria-current="page"
            className="flex min-h-10 items-center gap-3 rounded-xl bg-[#0b4a9d] px-2.5 py-2 text-sm font-semibold shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06264d]"
          >
            <Home className="h-4 w-4 shrink-0" />
            <span className="hidden lg:inline">Início</span>
          </Link>

          {sidebarPrimaryGroups.map((group) => {
            const expanded = openSidebarGroup === group.id;
            const groupIcon = categorias.find((category) => category.id === group.id)?.icon || Activity;
            const items = group.items
              .map((item) => ferramentasVisiveis.find((tool) => tool.key === item.key))
              .filter((tool): tool is (typeof ferramentas)[number] => !!tool);

            if (!group.showHeading) {
              return (
                <div key={group.id} role="group" aria-label={group.label} className="space-y-1">
                  {items.map(renderTool)}
                </div>
              );
            }

            const GroupIcon = groupIcon;
            return (
              <div key={group.id} className="space-y-1">
                <button
                  type="button"
                  data-hub-group-trigger
                  aria-label={`${group.label}, grupo de navegação, ${items.length} itens`}
                  aria-expanded={expanded}
                  aria-controls={`hub-sidebar-group-${group.id}`}
                  onClick={() => setOpenSidebarGroup((current) => current === group.id ? null : group.id)}
                  onKeyDown={(event) => handleSidebarGroupKeyDown(event, group.id)}
                  className={`flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06264d] ${
                    activeSidebarGroup === group.id
                      ? "bg-white/15 text-white"
                      : "text-blue-100 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <GroupIcon className="h-4 w-4 shrink-0 text-cyan-200 lg:hidden" aria-hidden="true" />
                  <span className="hidden min-w-0 flex-1 whitespace-normal lg:block">{group.label}</span>
                  <ChevronDown className={`ml-auto hidden h-4 w-4 shrink-0 transition-transform lg:block ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>
                {expanded && (
                  <div
                    id={`hub-sidebar-group-${group.id}`}
                    role="group"
                    aria-label={group.label}
                    className="space-y-0.5 pl-1"
                  >
                    {items.map(renderTool)}
                  </div>
                )}
              </div>
            );
          })}

          {sidebarPublicItems.length > 0 && (
            <section
              aria-labelledby="hub-sidebar-public-links-heading"
              className="mt-3 border-t border-white/15 pt-3"
            >
              <h2
                id="hub-sidebar-public-links-heading"
                className={`mb-1.5 flex items-center gap-2 px-2.5 text-[11px] font-bold uppercase tracking-wider ${
                  activeSidebarGroup === HUB_PUBLIC_LINKS_GROUP.id
                    ? "text-white"
                    : "text-cyan-100"
                }`}
              >
                <Globe2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="hidden lg:inline">{HUB_PUBLIC_LINKS_GROUP.label}</span>
              </h2>
              <div
                role="group"
                aria-label={HUB_PUBLIC_LINKS_GROUP.label}
                className="space-y-0.5"
              >
                {sidebarPublicItems.map(renderTool)}
              </div>
            </section>
          )}
        </nav>

        <div className="mt-3 shrink-0 border-t border-white/15 pt-2">
          {canAdmin && (
            <Link
              to="/admin"
              title="Painel Administrativo"
              aria-current={location.pathname === "/admin" ? "page" : undefined}
              className="flex min-h-10 items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-slate-100 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06264d]"
            >
              <Shield className="h-4 w-4 shrink-0" />
              <span className="hidden whitespace-normal lg:inline">Painel Administrativo</span>
            </Link>
          )}
          <div className="hidden items-center gap-2 px-2.5 pt-2 text-xs text-blue-100 lg:flex">
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
            Sistema Online
          </div>
        </div>
      </aside>

      <nav
        aria-label="Navegação rápida"
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch gap-1 overflow-x-auto border-t border-slate-200/90 bg-white/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-18px_rgba(15,45,85,0.4)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95 sm:hidden"
      >
        <a
          href="#hub-top"
          className="flex min-w-[58px] shrink-0 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1 text-[10px] font-semibold text-[#245b8f] dark:text-blue-200"
        >
          <Home className="h-5 w-5" />
          Início
        </a>
        {categoriasVisiveis.map((category) => {
          const CategoryIcon = category.icon;
          return (
            <a
              key={category.id}
              href={`#categoria-${category.id}`}
              title={category.nome}
              className="flex min-w-[66px] shrink-0 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1 text-[10px] font-semibold text-slate-500 transition-colors hover:bg-blue-50 hover:text-[#245b8f] dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <CategoryIcon className="h-5 w-5" />
              <span className="max-w-[72px] truncate">{category.nome}</span>
            </a>
          );
        })}
      </nav>

      <div className="ml-0 flex min-h-screen flex-col pb-20 sm:ml-[68px] sm:pb-0 lg:ml-64">
        <header className="sticky top-0 z-20 border-b border-[#d9e3f2]/80 bg-white/95 shadow-[0_4px_18px_-14px_rgba(12,44,82,0.32)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90">
          <div className="mx-auto flex w-full max-w-none flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-7 lg:px-8">
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
              <Avatar className="h-10 w-10 border border-[#d7e2f1] bg-slate-100 text-sm font-bold text-[#245b8f] dark:border-slate-700 dark:bg-slate-800 dark:text-blue-200">
                <AvatarFallback aria-label={profile?.nome_completo || "Perfil do usuário"}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden border-l border-[#d4deed] pl-3 text-right sm:block">
                <p className="max-w-48 truncate text-sm font-semibold text-[#0b2b55] dark:text-white">
                  {profile?.nome_completo}
                </p>
                {profile?.cargo_nome && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">{profile.cargo_nome}</p>
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

        <main className="relative mx-auto flex w-full max-w-none flex-1 flex-col overflow-hidden px-3 pb-24 pt-4 sm:px-7 sm:pb-7 sm:pt-7 lg:px-8 lg:pt-7">
          <div className="pointer-events-none absolute bottom-0 right-0 h-56 w-[70%] rounded-tl-[100%] bg-gradient-to-tl from-[#dceaff] via-[#eaf2ff]/70 to-transparent dark:from-blue-950/30 dark:via-transparent" />
          <section className="relative mb-5 flex min-h-[180px] items-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#062955] via-[#0b4b91] to-[#087eb2] px-4 py-5 text-white shadow-[0_18px_38px_-18px_rgba(0,45,116,0.72)] sm:mb-6 sm:min-h-[150px] sm:px-9 sm:py-6">
            <img aria-hidden="true" src="https://assets.website-files.com/601431572b2178db2d32c0f9/614d24b0dea064b511734405_IMG_0620_reduced-p-3200.jpeg" alt="" className="pointer-events-none absolute inset-y-0 right-0 h-full w-full object-cover object-center opacity-75 saturate-125 sm:w-[68%] sm:opacity-100" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#062955]/55 via-[#0b4b91]/70 to-[#062955]/95 sm:bg-gradient-to-r sm:from-[#062955] sm:via-[#0b4b91]/78 sm:via-42% sm:to-[#0b4b91]/5" />
            <div className="pointer-events-none absolute -right-10 -top-24 h-72 w-72 rounded-full border-[34px] border-white/5" />
            <div className="pointer-events-none absolute right-[18%] top-[-110px] h-72 w-72 rotate-45 rounded-[42px] bg-white/[0.045]" />
            <svg
              viewBox="0 0 520 150"
              preserveAspectRatio="xMidYMid slice"
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-[48%] opacity-25 lg:block"
            >
              <defs>
                <linearGradient id="hub-pipe" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#9cc4d5" />
                  <stop offset="0.5" stopColor="#5c8ca8" />
                  <stop offset="1" stopColor="#315d78" />
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
              {loadingPaineis ? (
                <div className="flex min-h-40 items-center justify-center">
                  <Loader2 className="h-7 w-7 animate-spin text-[#45658e]" />
                </div>
              ) : busca.trim() && ferramentasVisiveis.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#cbd9ed] bg-white/70 px-4 py-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400">
                  Nenhuma ferramenta encontrada para “{busca}”.
                </div>
              ) : (
                <section className="mb-5">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="h-7 w-1 rounded-full bg-[#45658e]" />
                    <h2 className="text-lg font-bold text-[#0b2b55] dark:text-white">
                      Ferramentas por Categoria
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                    {categoriasVisiveis.map(renderCategoryCard)}
                  </div>
                </section>
              )}
            </>
          </HubOverview>

          <footer className="relative mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-[#dce5f1] pt-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
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

      {/* ===== DIALOG: FERRAMENTAS DA CATEGORIA ===== */}
      <Dialog open={!!categoryChoice} onOpenChange={(open) => !open && setCategoryChoice(null)}>
        <DialogContent className="w-[calc(100vw-1rem)] max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-3xl border border-slate-200/80 bg-white p-0 shadow-[0_28px_90px_-28px_rgba(5,35,75,0.45)] dark:border-slate-700 dark:bg-slate-900 sm:max-h-[85vh] sm:w-full sm:max-w-xl">
          <div className="relative overflow-hidden bg-gradient-to-br from-[#082b55] via-[#0b4b91] to-[#087eb2] px-6 py-6 text-white sm:px-7">
            <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-20 h-56 w-56 rounded-full border-[28px] border-white/10" />
            <div className="relative flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/20">
                {categoriaSelecionada && (() => {
                  const CategoryIcon = categoriaSelecionada.icon;
                  return <CategoryIcon className="h-6 w-6" />;
                })()}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">Hub Operacional</p>
                <DialogTitle className="mt-1 text-xl font-bold text-white">
                  {categoriaSelecionada?.nome || "Escolha uma ferramenta"}
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-blue-100">
                  Selecione qual ferramenta deseja acessar.
                </DialogDescription>
              </div>
            </div>
          </div>
          <div className="grid gap-3 p-5 sm:p-6">
            {ferramentasCategoriaSelecionada.map((tool) => {
              const ToolIcon = tool.icon;
              const optionClass = "group flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/70 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-500 dark:hover:bg-slate-700";
              const optionContent = (
                <>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1768c4] ring-1 ring-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:ring-blue-900">
                    <ToolIcon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-[#123763] dark:text-white">{tool.nome}</span>
                    <span className="mt-0.5 block text-sm leading-5 text-slate-500 dark:text-slate-400">{tool.descricao}</span>
                  </span>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#1768c4] transition group-hover:translate-x-0.5 dark:bg-slate-700 dark:text-blue-300">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </>
              );
              return tool.onClick ? (
                <button
                  key={tool.key}
                  type="button"
                  className={optionClass}
                  onClick={() => {
                    setCategoryChoice(null);
                    setBusca("");
                    tool.onClick?.();
                  }}
                >
                  {optionContent}
                </button>
              ) : (
                <Link
                  key={tool.key}
                  to={tool.to || "/"}
                  className={optionClass}
                  onClick={() => {
                    setCategoryChoice(null);
                    setBusca("");
                  }}
                >
                  {optionContent}
                </Link>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default Index;
