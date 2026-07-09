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
};

function getCardColor(chave: string) {
  if (chave.startsWith("dashboard")) return CARD_COLORS.dashboard;
  if (chave.startsWith("sistemas")) return CARD_COLORS.sistemas;
  if (chave.startsWith("relatorio")) return CARD_COLORS.relatorio;
  if (chave.startsWith("dashboard_os")) return CARD_COLORS.backlog;
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
      const { data } = await supabase
        .from("cargo_paineis")
        .select("painel_id, paineis!inner(chave, nome_exibicao, descricao, icone)")
        .eq("cargo_id", profile.cargo_id);
      if (data) {
        setPaineis(data.map((r: { paineis: unknown }) => r.paineis as unknown as Painel));
      }
      setLoadingPaineis(false);
    })();
  }, [profile?.cargo_id]);

  if (loading) return null;

  const hasPanel = (chave: string) => paineis.some((p) => p.chave === chave);
  const hasFallbackPanels = paineis.length === 0;
  const shouldShowDashboard = hasPanel("dashboard_automacao") || hasPanel("dashboard_testes") || hasFallbackPanels;
  const shouldShowSistema = hasPanel("sistemas") || hasFallbackPanels;
  const shouldShowRelatorio = hasPanel("relatorio_tecnico") || hasFallbackPanels;
  const shouldShowBacklog = hasPanel("dashboard_os") || hasFallbackPanels;
  const canAdmin = hasPanel("admin") || profile?.cargo_id === 1 || profile?.email?.toLowerCase() === "admin@gmail.com";

  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      <style>{animations}</style>

      <header className="sticky top-0 z-50 border-b border-white/10 bg-gradient-to-r from-[#002d74] via-[#003087] to-[#00AEEF] text-white shadow-[0_18px_40px_-24px_rgba(0,0,0,0.65)]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl p-2">
              <img
                src={logoHeader}
                alt="Águas do Rio"
                className="h-9 w-auto object-contain"
                loading="eager"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold tracking-[0.02em]">Águas do Rio</p>
              <p className="truncate text-xs text-cyan-50/90">Eletromecânica · Hub operacional</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm backdrop-blur-sm sm:flex">
              <span className="font-medium">{profile?.nome_completo}</span>
              {profile?.cargo_nome && (
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-cyan-50">
                  {profile.cargo_nome}
                </span>
              )}
            </div>
            {canAdmin && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/15 active:scale-95"
              >
                <Shield className="h-3.5 w-3.5" /> Admin
              </Link>
            )}
            <button
              onClick={signOut}
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 p-2 text-white transition hover:bg-white/15 active:scale-95"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 pt-8 md:px-6 md:pt-12">

        {/* Loading */}
        {loadingPaineis ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#1f7ad6]" />
          </div>
        ) : (
          /* ===== GRADE DE CARDS ===== */
          <div className="grid w-full gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {/* Dashboard */}
            {shouldShowDashboard && (
              <CardButton onClick={() => setDashOpen(true)} chave="dashboard" delay={0}>
                <CardIcon chave="dashboard" icon={LayoutDashboard} />
                <CardTitle>Dashboard</CardTitle>
                <CardDesc>Painéis de automação, testes e medições.</CardDesc>
                <CardCta>Escolher painel</CardCta>
              </CardButton>
            )}

            {/* Sistema */}
            {shouldShowSistema && (
              <CardButton onClick={() => setSysOpen(true)} chave="sistemas" delay={1}>
                <CardIcon chave="sistemas" icon={Boxes} />
                <CardTitle>Sistemas</CardTitle>
                <CardDesc>Hubs administrativos e operacionais.</CardDesc>
                <CardCta>Escolher sistemas</CardCta>
              </CardButton>
            )}

            {/* Relatório Técnico */}
            {shouldShowRelatorio && (
              <CardLink to="/relatorio" chave="relatorio" delay={2}>
                <CardIcon chave="relatorio" icon={FileText} />
                <CardTitle>Relatório</CardTitle>
                <CardDesc>Técnico e de Planta/Unidade para WhatsApp.</CardDesc>
                <CardCta>Abrir relatórios</CardCta>
              </CardLink>
            )}

            {/* Backlog BI */}
            {shouldShowBacklog && (
              <CardLink to="/backlog" chave="backlog" delay={3}>
                <CardIcon chave="backlog" icon={ClipboardList} />
                <CardTitle>Backlog BI</CardTitle>
                <CardDesc>O.S. do Field/SAP: SLA, mapa e programação semanal.</CardDesc>
                <CardCta>Abrir backlog</CardCta>
              </CardLink>
            )}

            {/* Em breve — sempre visível, mas desabilitado */}
            <CardDisabled delay={4} />
          </div>
        )}

        {/* Footer */}
        <p className="mt-10 text-center text-xs text-slate-400 md:mt-16">
          Águas do Rio · Eletromecânica
        </p>
      </div>

      {/* ===== DIALOG: DASHBOARDS ===== */}
      <Dialog open={dashOpen} onOpenChange={setDashOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0b3a73]">Escolha um dashboard</DialogTitle>
            <DialogDescription>Qual painel você quer abrir?</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            {hasPanel("dashboard_automacao") && (
              <Link
                to="/dashboard"
                onClick={() => setDashOpen(false)}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-[#1f7ad6] hover:bg-[#eaf3fb]"
              >
                <div>
                  <div className="font-semibold text-[#0b3a73]">Automação</div>
                  <div className="text-xs text-slate-500">
                    Elevatórias · sensores · CLP/PCP · ELIPSE
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#1f7ad6]" />
              </Link>
            )}
            {hasPanel("dashboard_testes") && (
              <Link
                to="/testes"
                onClick={() => setDashOpen(false)}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-[#1f7ad6] hover:bg-[#eaf3fb]"
              >
                <div>
                  <div className="font-semibold text-[#0b3a73]">Testes & Aferições</div>
                  <div className="text-xs text-slate-500">
                    Serviços · equipes · parâmetros · impossibilidade
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#1f7ad6]" />
              </Link>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== DIALOG: SISTEMAS ===== */}
      <Dialog open={sysOpen} onOpenChange={setSysOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0b3a73]">Escolha um sistema</DialogTitle>
            <DialogDescription>Qual hub você quer abrir?</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <a
              href={SISTEMAS_ADMINISTRATIVO_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setSysOpen(false)}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-[#1f7ad6] hover:bg-[#eaf3fb]"
            >
              <div>
                <div className="font-semibold text-[#0b3a73]">Administrativo</div>
                <div className="text-xs text-slate-500">Gestão administrativa</div>
              </div>
              <ArrowRight className="h-4 w-4 text-[#1f7ad6]" />
            </a>
            <a
              href={SISTEMAS_OPERACIONAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setSysOpen(false)}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-[#1f7ad6] hover:bg-[#eaf3fb]"
            >
              <div>
                <div className="font-semibold text-[#0b3a73]">Operacional</div>
                <div className="text-xs text-slate-500">Gestão de Ativos</div>
              </div>
              <ArrowRight className="h-4 w-4 text-[#1f7ad6]" />
            </a>
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
      className={`flex h-14 w-14 items-center justify-center rounded-xl ${color.bg} ${color.icon} shadow-sm`}
    >
      <Icon className="h-7 w-7" />
    </div>
  );
}

function CardTitle({ children }: { children: string }) {
  return <h2 className="text-lg font-semibold text-[#0b3a73]">{children}</h2>;
}

function CardDesc({ children }: { children: string }) {
  return <p className="text-sm leading-relaxed text-slate-500">{children}</p>;
}

function CardCta({ children }: { children: string }) {
  return (
    <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-[#1f7ad6] opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-1">
      {children} <ArrowRight className="h-4 w-4" />
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
      className={`group flex animate-card flex-col items-start gap-4 rounded-2xl border border-slate-200 bg-white p-7 text-left shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f7ad6] active:scale-[0.98] ${color.ring} hover:ring-2`}
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
      className={`group flex animate-card flex-col items-start gap-4 rounded-2xl border border-slate-200 bg-white p-7 text-left shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f7ad6] active:scale-[0.98] ${color.ring} hover:ring-2`}
      style={{ animationDelay: `${delay * 80}ms` }}
    >
      {children}
    </Link>
  );
}

function CardDisabled({ delay }: { delay: number }) {
  return (
    <div
      className="group flex animate-card cursor-not-allowed flex-col items-start gap-4 rounded-2xl border border-dashed border-slate-300 bg-white/50 p-7 text-left opacity-60 shadow-sm"
      style={{ animationDelay: `${delay * 80}ms` }}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 text-slate-400 shadow-sm">
        <MoreHorizontal className="h-7 w-7" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-slate-400">Outros Sistemas</h2>
        <p className="text-sm leading-relaxed text-slate-400">Novos módulos serão adicionados aqui.</p>
      </div>
      <span className="mt-auto inline-flex items-center rounded-full border border-slate-300 bg-slate-100/70 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Em breve
      </span>
    </div>
  );
}

export default Index;
