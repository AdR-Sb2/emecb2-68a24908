import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { NavVoltarHome } from "@/components/nav-voltar-home";
import logoHeader from "@/assets/logo-branca.png";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { AnaliticoManutencao } from "@/components/analitico-manutencao";
import { getPermissoesCargo, temPermissao } from "@/lib/permissoes";

export const Route = createFileRoute("/analitico")({
  head: () => ({
    meta: [{ title: "Eletromecânica · Analítico de Manutenção" }],
  }),
  component: AnaliticoPage,
});

function AnaliticoPage() {
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [podeVer, setPodeVer] = useState(false);

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
          .eq("paineis.chave", "registros")
          .maybeSingle();
        if (!panelData) {
          toast.error("Acesso não autorizado ao painel de Registros");
          navigate({ to: "/", replace: true });
          return;
        }
        const perms = await getPermissoesCargo(profile.cargo_id);
        setPodeVer(temPermissao(perms, "registros", "visualizar"));
      } catch (err) {
        toast.error(
          "Erro ao carregar analítico: " + (err instanceof Error ? err.message : "desconhecido"),
        );
        navigate({ to: "/", replace: true });
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [profile?.cargo_id, authLoading, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-3 md:p-6">
      {/* Header */}
      <div className="mb-4 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#002d74] via-[#003087] to-[#00AEEF] p-4 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.6)] print:hidden">
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
                Eletromecânica · Analítico de Manutenção
              </p>
            </div>
          </div>
          <NavVoltarHome />
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <Loader2 className="h-6 w-6 animate-spin text-[#1f7ad6]" />
        </div>
      ) : podeVer ? (
        <AnaliticoManutencao />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800">
          <ShieldAlert className="mb-2 h-8 w-8" />
          Você não tem permissão para visualizar o analítico de manutenção.
        </div>
      )}
    </div>
  );
}

export default AnaliticoPage;
