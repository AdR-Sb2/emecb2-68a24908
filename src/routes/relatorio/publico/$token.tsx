import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Link2Off } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { RelatorioPage } from "@/routes/relatorio";

export const Route = createFileRoute("/relatorio/publico/$token")({
  component: PublicoRelatorioPage,
  head: () => ({
    meta: [
      { title: "Relatórios · Visualização pública" },
      { name: "description", content: "Geração de Relatório Técnico e de Planta/Unidade" },
    ],
  }),
});

function PublicoRelatorioPage() {
  const { token } = Route.useParams();
  const [valido, setValido] = useState<boolean | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      let ok = false;
      try {
        const { data, error } = await supabase
          .from("field_config")
          .select("relatorio_link_publico_token")
          .eq("id", 1)
          .maybeSingle();
        ok =
          !error &&
          !!data?.relatorio_link_publico_token &&
          data.relatorio_link_publico_token === token;
      } catch {
        ok = false;
      }
      if (vivo) setValido(ok);
    })();
    return () => {
      vivo = false;
    };
  }, [token]);

  if (valido === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verificando o link…
      </div>
    );
  }

  if (!valido) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-6 text-center dark:bg-slate-900">
        <Link2Off className="h-8 w-8 text-slate-400" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          Link não encontrado ou revogado.
        </p>
        <p className="text-xs text-slate-400">Peça um novo link para a Eletromecânica.</p>
      </div>
    );
  }

  return <RelatorioPage publico />;
}
