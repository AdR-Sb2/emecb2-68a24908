import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, BarChart3, Link2Off } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DashboardComparacao } from "@/components/produtividade-dashboard";
import logoHeader from "@/assets/logo-branca.png";

export const Route = createFileRoute("/produtividade/publico/$token")({
  component: PublicoProdutividadePage,
  head: () => ({
    meta: [
      { title: "Dashboard Produtividade · Águas do Rio" },
      { name: "description", content: "Dashboard de produtividade compartilhado" },
    ],
  }),
});

function PublicoProdutividadePage() {
  const { token } = Route.useParams();
  const [valido, setValido] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("field_config")
        .select("link_publico_token")
        .eq("id", 1)
        .maybeSingle();
      if (error) {
        console.error("Validação do link público falhou:", error);
      }
      const ok = !error && data?.link_publico_token === token;
      setValido(ok);
      setLoading(false);
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-[#1f7ad6]" />
      </div>
    );
  }

  if (!valido) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center dark:bg-slate-900">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-500">
          <Link2Off className="h-7 w-7" />
        </div>
        <h1 className="text-lg font-bold text-slate-700 dark:text-slate-200">
          Link não encontrado ou revogado
        </h1>
        <p className="max-w-md text-sm text-slate-500">
          Este link público não é mais válido. Solicite um novo link a quem gerencia o Dashboard de
          Produtividade.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-3 dark:bg-slate-900 md:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#002d74] via-[#003087] to-[#00AEEF] p-4 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.6)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src={logoHeader}
                alt="Águas do Rio"
                className="h-12 w-auto object-contain"
                loading="eager"
              />
              <div className="text-white">
                <p className="text-lg font-semibold">Dashboard de Produtividade</p>
                <p className="text-sm text-cyan-50/90">Compartilhado · visualização pública</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-[11px] font-semibold text-cyan-50">
              <BarChart3 className="h-3.5 w-3.5" /> Sem necessidade de login
            </span>
          </div>
        </div>
        <DashboardComparacao />
      </div>
    </div>
  );
}
