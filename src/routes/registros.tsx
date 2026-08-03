import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { History, Home, Loader2 } from "lucide-react";
import logoHeader from "@/assets/logo-branca.png";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { ListaRegistros } from "@/components/registros/ListaRegistros";
import type { PermissoesRegistros } from "@/lib/registros-permissoes";
import { getPermissoesCargo, temPermissao } from "@/lib/permissoes";

export const Route = createFileRoute("/registros")({
  head: () => ({
    meta: [{ title: "Eletromecânica · Registros" }],
  }),
  component: RegistrosPage,
});

function RegistrosPage() {
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [permissoesRegistros, setPermissoesRegistros] = useState<PermissoesRegistros>({
    visualizar: false,
    criar: false,
    importar: false,
    anexarPdf: false,
  });

  const podeVerRegistros = useMemo(() => permissoesRegistros.visualizar, [permissoesRegistros]);

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
        setPermissoesRegistros({
          visualizar: temPermissao(perms, "registros", "visualizar"),
          criar: temPermissao(perms, "registros", "criar"),
          importar: temPermissao(perms, "registros", "importar"),
          anexarPdf: temPermissao(perms, "registros", "anexar_pdf"),
        });
      } catch (err) {
        toast.error(
          "Erro ao carregar registros: " + (err instanceof Error ? err.message : "desconhecido"),
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
              <p className="truncate text-sm text-cyan-50/90">Eletromecânica · Registros</p>
            </div>
          </div>
          <Link
            to="/"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[#0b3a73] shadow-md ring-1 ring-black/10 backdrop-blur transition hover:scale-105 hover:bg-white"
          >
            <Home className="h-5 w-5" />
          </Link>
        </div>
      </div>

      <div className="mb-4">
        <h1 className="flex items-center gap-2 text-xl font-bold text-[#0b3a73] dark:text-white sm:text-2xl">
          <History className="h-5 w-5" /> Registros
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Informações, atendimentos e conferência de O.S. das elevatórias.
        </p>
      </div>

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <Loader2 className="h-6 w-6 animate-spin text-[#1f7ad6]" />
        </div>
      ) : podeVerRegistros ? (
        <ListaRegistros permissoes={permissoesRegistros} />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800">
          Você não tem permissão para visualizar registros.
        </div>
      )}
    </div>
  );
}

export default RegistrosPage;
