import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  Cpu,
  FlaskConical,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import logoHeader from "@/assets/logo-branca.png";
import { NavVoltarHome } from "@/components/nav-voltar-home";
import { useAuth } from "@/lib/auth";
import { getCargoPaineis } from "@/lib/permissoes";
import { getVisibleDashboardCards } from "@/lib/hub-navigation";

export const Route = createFileRoute("/dashboards")({
  head: () => ({
    meta: [
      { title: "Eletromecânica · Dashboards" },
      {
        name: "description",
        content: "Selecione o dashboard de Automação ou Testes & Aferições.",
      },
    ],
  }),
  component: DashboardsPage,
});

function DashboardsPage() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [panelKeys, setPanelKeys] = useState<string[]>([]);
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);

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

    if (!profile?.cargo_id) {
      setPanelKeys([]);
      setLoadingAccess(false);
      return;
    }

    let active = true;
    setLoadingAccess(true);
    setAccessError(null);

    void getCargoPaineis(profile.cargo_id, user.id)
      .then((panels) => {
        if (!active) return;
        setPanelKeys(panels.map((row) => row.paineis.chave));
      })
      .catch((error: unknown) => {
        console.error("Não foi possível carregar permissões dos dashboards:", error);
        if (active) {
          setPanelKeys([]);
          setAccessError("Não foi possível consultar suas permissões. Tente novamente.");
        }
      })
      .finally(() => {
        if (active) setLoadingAccess(false);
      });

    return () => {
      active = false;
    };
  }, [authLoading, user, profile?.cargo_id, profile?.status, navigate]);

  const cards = getVisibleDashboardCards(panelKeys);

  const pageShell =
    "min-h-screen bg-[#f4f7fc] px-3 py-4 text-[#0b2b55] dark:bg-slate-950 dark:text-slate-100 sm:px-6 sm:py-6 lg:px-8";
  const panelCard =
    "flex min-h-[250px] flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_28px_-20px_rgba(15,45,85,0.35)] transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_18px_36px_-20px_rgba(15,45,85,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f7ad6] dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-700 sm:p-7";

  return (
    <div className={pageShell}>
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-7 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#002d74] via-[#003087] to-[#00AEEF] px-4 py-3 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.6)] sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <img
                src={logoHeader}
                alt="Águas do Rio"
                className="h-10 w-auto shrink-0 object-contain sm:h-12"
                loading="eager"
              />
              <div className="min-w-0 text-white">
                <p className="truncate text-lg font-semibold">Águas do Rio</p>
                <p className="truncate text-sm text-cyan-50/90">Eletromecânica · Dashboards</p>
              </div>
            </div>
            <NavVoltarHome />
          </div>
        </header>

        <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[#1f7ad6] dark:text-blue-300">
              Central de indicadores
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-[#0b3a73] dark:text-white sm:text-3xl">
              Dashboards
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
              Escolha o painel que deseja consultar.
            </p>
          </div>
        </div>

        {authLoading || loadingAccess ? (
          <div className="grid gap-4 md:grid-cols-2" role="status" aria-label="Carregando permissões">
            {[0, 1].map((item) => (
              <div
                key={item}
                className="min-h-[250px] animate-pulse rounded-2xl border border-slate-200 bg-white p-7 dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="mb-6 h-12 w-12 rounded-xl bg-slate-200 dark:bg-slate-700" />
                <div className="mb-3 h-5 w-40 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="mb-2 h-3 w-3/4 rounded bg-slate-100 dark:bg-slate-800" />
                <div className="h-3 w-1/2 rounded bg-slate-100 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        ) : accessError ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-900/60 dark:bg-amber-950/30">
            <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-amber-600 dark:text-amber-300" />
            <h2 className="font-semibold text-amber-900 dark:text-amber-100">
              Não foi possível carregar os acessos
            </h2>
            <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">{accessError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-[#0b3a73] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1f7ad6]"
            >
              Tentar novamente
            </button>
          </section>
        ) : cards.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900">
            <ShieldAlert className="mx-auto mb-3 h-9 w-9 text-slate-400" />
            <h2 className="text-lg font-semibold text-[#0b3a73] dark:text-white">
              Nenhum dashboard disponível
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
              Seu cargo ainda não possui permissão para acessar Automação ou Testes & Aferições.
            </p>
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-2" aria-label="Dashboards disponíveis">
            {cards.map((card) => {
              const DashboardIcon = card.icon === "automation" ? Cpu : FlaskConical;
              return (
                <article key={card.key} className={panelCard}>
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#0b3a73] ring-1 ring-blue-100 dark:bg-blue-950/50 dark:text-blue-200 dark:ring-blue-900">
                      <DashboardIcon className="h-7 w-7" />
                    </span>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      Acesso liberado
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-[#0b3a73] dark:text-white">{card.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {card.description}
                  </p>
                  <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {card.detail}
                  </p>
                  <div className="mt-auto pt-7">
                    <Link
                      to={card.path}
                      className="group inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0b3a73] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f7ad6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f7ad6] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
                    >
                      Abrir
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        <footer className="mt-10 border-t border-slate-200 pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          Águas do Rio · Eletromecânica
        </footer>
      </div>
    </div>
  );
}

export default DashboardsPage;
