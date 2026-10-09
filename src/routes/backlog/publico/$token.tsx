import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Link2Off } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { BacklogPage } from "@/routes/backlog";

export const Route = createFileRoute("/backlog/publico/$token")({
  component: PublicoBacklogPage,
  head: () => ({
    meta: [
      { title: "Backlog BI · Visualização pública" },
      { name: "description", content: "Backlog de Ordens de Manutenção compartilhado" },
    ],
  }),
});

// A página pública é a MESMA página interna do Backlog BI (importar Bucket e
// Planejamento, Exportar, Montar Rota, ordens programáveis, Status…), apenas
// protegida pelo token. Só o botão de gerir o link fica escondido.
function PublicoBacklogPage() {
  const { token } = Route.useParams();
  const [valido, setValido] = useState<boolean | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      let ok = false;
      try {
        const { data, error } = await supabase
          .from("field_config")
          .select("backlog_link_publico_token")
          .eq("id", 1)
          .maybeSingle();
        ok =
          !error && !!data?.backlog_link_publico_token && data.backlog_link_publico_token === token;
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verificando o link…
      </div>
    );
  }

  if (!valido) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-6 text-center">
        <Link2Off className="h-8 w-8 text-slate-400" />
        <p className="text-sm font-semibold text-slate-600">Link não encontrado ou revogado.</p>
        <p className="text-xs text-slate-400">Peça um novo link para a Eletromecânica.</p>
      </div>
    );
  }

  return <BacklogPage />;
}
