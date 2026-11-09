import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Boxes,
  ArrowRight,
  FileText,
  ClipboardList,
  MoreHorizontal,
  Shield,
  LogOut,
  Loader2,
  User,
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
  const matchesTool = (...termos: string[]) =>
    !busca.trim() ||
    termos.some((termo) =>
      termo.toLocaleLowerCase("pt-BR").includes(busca.trim().toLocaleLowerCase("pt-BR")),
    );
  const ferramentasBusca = [
    {
      visivel: shouldShowDashboard,
      termos: ["Dashboard", "Painéis de automação", "testes", "medições"],
    },
    { visivel: shouldShowSistema, termos: ["Sistemas", "Hubs administrativos e operacionais"] },
    {
      visivel: shouldShowRelatorio,
      termos: ["Relatório", "Técnico", "Planta", "Unidade", "WhatsApp"],
    },
    { visivel: shouldShowBacklog, termos: ["Backlog BI", "Field", "SAP", "SLA", "mapa"] },
    { visivel: true, termos: ["Produtividade", "Acompanhamento diário", "equipe de manutenção"] },
    {
      visivel: shouldShowEscala,
      termos: ["Escala de Trabalho", "Equipe", "plantões", "escala semanal"],
    },
    {
      visivel: shouldShowEstoque,
      termos: ["Almoxarifado", "Estoque", "materiais", "compras", "pedidos"],
    },
    { visivel: shouldShowOI, termos: ["Ordem de Início", "Relatório Fotográfico", "DOCX"] },
    {
      visivel: shouldShowManuais,
      termos: ["Manuais", "Normas", "manuais técnicos", "procedimentos"],
    },
    {
      visivel: shouldShowCronograma,
      termos: ["Cronograma", "Planejamento", "instalações", "obras", "manutenções"],
    },
    {
      visivel: shouldShowProcedimentos,
      termos: ["Procedimentos", "operacionais", "passo-a-passo", "PDF"],
    },
    {
      visivel: shouldShowFichaElevatoria,
      termos: ["Ficha da Elevatória", "Ficha técnica", "equipamentos", "elétrica", "hidráulica"],
    },
    {
      visivel: shouldShowPlanoManutencao,
      termos: ["Plano de Manutenção", "equipamentos", "planos ativos", "pendências"],
    },
  ];
  const temResultadoBusca = ferramentasBusca.some(
    ({ visivel, termos }) => visivel && matchesTool(...termos),
  );

  return (
    <div className="min-h-screen bg-[#f2f6fc] text-[#0b2b55] dark:bg-slate-950 dark:text-slate-100">
      <style>{animations}</style>

      <aside className="relative z-20 flex w-full items-center justify-between bg-gradient-to-b from-[#062955] to-[#041b3a] px-4 py-3 text-white shadow-lg lg:fixed lg:inset-y-0 lg:left-0 lg:w-[250px] lg:flex-col lg:items-stretch lg:px-5 lg:py-7 lg:shadow-xl">
        <div className="flex min-w-0 items-center gap-3 lg:flex-col lg:items-start lg:gap-8">
          <div className="flex h-10 shrink-0 items-center justify-center lg:h-16 lg:w-full lg:justify-start">
            <div className="flex h-full items-center justify-center">
              <img
                src={logoHeader}
                alt="Águas do Rio"
                className="h-10 w-auto object-contain lg:h-14"
                loading="eager"
              />
            </div>
          </div>

          <nav aria-label="Navegação principal" className="flex items-center lg:w-full">
            <span className="inline-flex items-center gap-2 rounded-xl bg-[#0b4a9d] px-4 py-2.5 text-sm font-semibold shadow-inner lg:w-full">
              <Home className="h-4 w-4" />
              Início
            </span>
          </nav>
        </div>
        <div className="hidden items-center gap-2 border-t border-white/10 pt-5 text-xs text-cyan-100/80 lg:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]" />
          Sistema operacional · Águas do Rio
        </div>
      </aside>

      <div className="min-h-screen lg:ml-[250px]">
        <header className="sticky top-0 z-10 border-b border-[#d9e3f2] bg-white/90 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-7 lg:px-9">
            <div>
              <p className="text-lg font-bold tracking-tight text-[#0b2b55] dark:text-white sm:text-xl">
                Hub Operacional
              </p>
              <p className="text-xs text-[#45658e] dark:text-slate-400 sm:text-sm">
                Eletromecânica
              </p>
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

        <main className="relative mx-auto min-h-[calc(100vh-65px)] max-w-[1440px] overflow-hidden px-4 pb-8 pt-5 sm:px-7 sm:pt-7 lg:px-9 lg:pt-8">
          <div className="pointer-events-none absolute bottom-0 right-0 h-56 w-[70%] rounded-tl-[100%] bg-gradient-to-tl from-[#dceaff] via-[#eaf2ff]/70 to-transparent dark:from-blue-950/30 dark:via-transparent" />
          <section className="relative mb-7 flex min-h-[132px] items-center overflow-hidden rounded-2xl bg-gradient-to-r from-[#062955] via-[#0b4b91] to-[#087eb2] px-6 py-6 text-white shadow-[0_16px_34px_-18px_rgba(0,45,116,0.8)] sm:px-8">
            <div className="pointer-events-none absolute -right-10 -top-24 h-72 w-72 rounded-full border-[34px] border-white/5" />
            <div className="pointer-events-none absolute right-[18%] top-[-110px] h-72 w-72 rotate-45 rounded-[42px] bg-white/[0.045]" />
            <div className="relative mr-5 hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-cyan-100 shadow-inner sm:flex">
              <Activity className="h-8 w-8" />
            </div>
            <div className="relative border-l-0 sm:border-l sm:border-white/30 sm:pl-6">
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                Bem-vindo{profile?.nome_completo ? `, ${profile.nome_completo.split(" ")[0]}` : ""}!
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-blue-50/90 sm:text-base">
                Acesse rapidamente as principais ferramentas da Eletromecânica.
              </p>
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[25%] bg-gradient-to-l from-cyan-300/10 to-transparent lg:block" />
          </section>

          <section className="relative">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="h-7 w-1 rounded-full bg-[#00a3d9]" />
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-[#0b2b55] dark:text-white">
                    Acesso Rápido
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ferramentas e módulos disponíveis para você
                  </p>
                </div>
              </div>
              <label className="flex w-full items-center gap-2 rounded-xl border border-[#cbd9ed] bg-white px-3 py-2.5 text-[#45658e] shadow-sm transition focus-within:border-[#3286d2] focus-within:ring-2 focus-within:ring-[#3286d2]/15 sm:w-64 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                <Search className="h-4 w-4 shrink-0" />
                <input
                  type="search"
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder="Buscar ferramenta..."
                  aria-label="Buscar ferramenta"
                  className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-white"
                />
              </label>
            </div>
            {/* Loading */}
            {loadingPaineis ? (
              <div className="flex min-h-56 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#1f7ad6] dark:text-[#38bdf8]" />
              </div>
            ) : busca.trim() && !temResultadoBusca ? (
              <div className="rounded-xl border border-dashed border-[#cbd9ed] bg-white/70 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400">
                Nenhuma ferramenta encontrada para “{busca}”.
              </div>
            ) : (
              /* ===== GRADE DE CARDS ===== */
              <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {/* Dashboard */}
                {shouldShowDashboard &&
                  matchesTool("Dashboard", "Painéis de automação", "testes", "medições") && (
                    <CardButton onClick={() => setDashOpen(true)} chave="dashboard" delay={0}>
                      <CardIcon chave="dashboard" icon={LayoutDashboard} />
                      <CardTitle>Dashboard</CardTitle>
                      <CardDesc>Painéis de automação, testes e medições.</CardDesc>
                      <CardCta>Escolher painel</CardCta>
                    </CardButton>
                  )}

                {/* Sistema */}
                {shouldShowSistema &&
                  matchesTool("Sistemas", "Hubs administrativos e operacionais") && (
                    <CardButton onClick={() => setSysOpen(true)} chave="sistemas" delay={1}>
                      <CardIcon chave="sistemas" icon={Boxes} />
                      <CardTitle>Sistemas</CardTitle>
                      <CardDesc>Hubs administrativos e operacionais.</CardDesc>
                      <CardCta>Escolher sistemas</CardCta>
                    </CardButton>
                  )}

                {/* Relatório Técnico */}
                {shouldShowRelatorio &&
                  matchesTool("Relatório", "Técnico", "Planta", "Unidade", "WhatsApp") && (
                    <CardLink to="/relatorio" chave="relatorio" delay={2}>
                      <CardIcon chave="relatorio" icon={FileText} />
                      <CardTitle>Relatório</CardTitle>
                      <CardDesc>Técnico e de Planta/Unidade para WhatsApp.</CardDesc>
                      <CardCta>Abrir relatórios</CardCta>
                    </CardLink>
                  )}

                {/* Backlog BI */}
                {shouldShowBacklog && matchesTool("Backlog BI", "Field", "SAP", "SLA", "mapa") && (
                  <CardLink to="/backlog" chave="backlog" delay={3}>
                    <CardIcon chave="backlog" icon={ClipboardList} />
                    <CardTitle>Backlog BI</CardTitle>
                    <CardDesc>O.S. do Field/SAP: SLA, mapa e programação semanal.</CardDesc>
                    <CardCta>Abrir backlog</CardCta>
                  </CardLink>
                )}

                {/* Produtividade de Campo */}
                {matchesTool("Produtividade", "Acompanhamento diário", "equipe de manutenção") && (
                  <CardLink to="/produtividade" chave="produtividade" delay={4}>
                    <CardIcon chave="produtividade" icon={Activity} />
                    <CardTitle>Produtividade</CardTitle>
                    <CardDesc>Acompanhamento diário da equipe de manutenção.</CardDesc>
                    <CardCta>Abrir produtividade</CardCta>
                  </CardLink>
                )}

                {/* Escala de Trabalho */}
                {shouldShowEscala &&
                  matchesTool("Escala de Trabalho", "Equipe", "plantões", "escala semanal") && (
                    <CardLink to="/escala" chave="escala" delay={4}>
                      <CardIcon chave="escala" icon={CalendarCheck} />
                      <CardTitle>Escala de Trabalho</CardTitle>
                      <CardDesc>Equipe, plantões e escala semanal de trabalho.</CardDesc>
                      <CardCta>Abrir escala</CardCta>
                    </CardLink>
                  )}

                {/* Estoque / Almoxarifado */}
                {shouldShowEstoque &&
                  matchesTool("Almoxarifado", "Estoque", "materiais", "compras", "pedidos") && (
                    <CardLink to="/estoque" chave="estoque" delay={5}>
                      <CardIcon chave="estoque" icon={Package} />
                      <CardTitle>Almoxarifado</CardTitle>
                      <CardDesc>Estoque de materiais, entrada/saída, compras e pedidos.</CardDesc>
                      <CardCta>Abrir estoque</CardCta>
                    </CardLink>
                  )}

                {/* OI — Ordem de Início */}
                {shouldShowOI &&
                  matchesTool("Ordem de Início", "Relatório Fotográfico", "DOCX") && (
                    <CardLink to="/oi" chave="oi" delay={6}>
                      <CardIcon chave="oi" icon={FileImage} />
                      <CardTitle>Ordem de Início</CardTitle>
                      <CardDesc>Relatório Fotográfico — gerar DOCX direto no navegador.</CardDesc>
                      <CardCta>Abrir gerador</CardCta>
                    </CardLink>
                  )}

                {/* Manuais */}
                {shouldShowManuais &&
                  matchesTool("Manuais", "Normas", "manuais técnicos", "procedimentos") && (
                    <CardLink to="/manuais" chave="manuais" delay={7}>
                      <CardIcon chave="manuais" icon={BookOpen} />
                      <CardTitle>Manuais</CardTitle>
                      <CardDesc>Normas, manuais técnicos e procedimentos.</CardDesc>
                      <CardCta>Abrir manuais</CardCta>
                    </CardLink>
                  )}

                {/* Cronograma */}
                {shouldShowCronograma &&
                  matchesTool(
                    "Cronograma",
                    "Planejamento",
                    "instalações",
                    "obras",
                    "manutenções",
                  ) && (
                    <CardLink to="/cronograma" chave="cronograma" delay={8}>
                      <CardIcon chave="cronograma" icon={CalendarRange} />
                      <CardTitle>Cronograma</CardTitle>
                      <CardDesc>
                        Planejamento e cronograma de instalações, obras e manutenções.
                      </CardDesc>
                      <CardCta>Abrir cronograma</CardCta>
                    </CardLink>
                  )}

                {/* Procedimentos */}
                {shouldShowProcedimentos &&
                  matchesTool("Procedimentos", "operacionais", "passo-a-passo", "PDF") && (
                    <CardLink to="/procedimentos" chave="procedimentos" delay={9}>
                      <CardIcon chave="procedimentos" icon={ListChecks} />
                      <CardTitle>Procedimentos</CardTitle>
                      <CardDesc>Procedimentos operacionais passo-a-passo com PDF.</CardDesc>
                      <CardCta>Abrir procedimentos</CardCta>
                    </CardLink>
                  )}

                {/* Ficha da Elevatória */}
                {shouldShowFichaElevatoria &&
                  matchesTool(
                    "Ficha da Elevatória",
                    "Ficha técnica",
                    "equipamentos",
                    "elétrica",
                    "hidráulica",
                  ) && (
                    <CardButton
                      onClick={() => setFichaChoiceOpen(true)}
                      chave="ficha_elevatoria"
                      delay={9}
                    >
                      <CardIcon chave="ficha_elevatoria" icon={Building2} />
                      <CardTitle>Ficha da Elevatória</CardTitle>
                      <CardDesc>
                        Ficha técnica completa de elevatórias, equipamentos, elétrica e hidráulica.
                      </CardDesc>
                      <CardCta>Escolher módulo</CardCta>
                    </CardButton>
                  )}

                {/* Plano de Manutenção */}
                {shouldShowPlanoManutencao &&
                  matchesTool(
                    "Plano de Manutenção",
                    "equipamentos",
                    "planos ativos",
                    "pendências",
                  ) && (
                    <CardLink to="/plano-manutencao" chave="plano_manutencao" delay={9}>
                      <CardIcon chave="plano_manutencao" icon={Wrench} />
                      <CardTitle>Plano de Manutenção</CardTitle>
                      <CardDesc>
                        Cadastre equipamentos, acompanhe planos ativos e identifique pendências.
                      </CardDesc>
                      <CardCta>Abrir plano</CardCta>
                    </CardLink>
                  )}
              </div>
            )}
          </section>

          {/* Footer */}
          <footer className="relative mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-[#dce5f1] pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Sistema Online
              <span className="mx-1 text-slate-300">|</span>
              Águas do Rio · Eletromecânica
            </span>
            <span>Hub Operacional</span>
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

function CardDisabled({ delay }: { delay: number }) {
  return (
    <div
      className="group flex animate-card cursor-not-allowed flex-col items-start gap-4 rounded-2xl border border-dashed border-slate-300 bg-white/50 p-6 text-left xl:p-5 opacity-60 shadow-sm dark:border-slate-600 dark:bg-slate-800/50"
      style={{ animationDelay: `${delay * 80}ms` }}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 text-slate-400 shadow-sm dark:bg-slate-700 dark:text-slate-500">
        <MoreHorizontal className="h-7 w-7" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-slate-400 dark:text-slate-500">
          Outros Sistemas
        </h2>
        <p className="text-sm leading-relaxed text-slate-400 dark:text-slate-500">
          Novos módulos serão adicionados aqui.
        </p>
      </div>
      <span className="mt-auto inline-flex items-center rounded-full border border-slate-300 bg-slate-100/70 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-600 dark:bg-slate-700/70 dark:text-slate-400">
        Em breve
      </span>
    </div>
  );
}

export default Index;
