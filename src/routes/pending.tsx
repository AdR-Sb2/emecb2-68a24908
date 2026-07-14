import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "../lib/auth";
import { useEffect } from "react";
import { Clock, LogOut } from "lucide-react";

export const Route = createFileRoute("/pending")({
  component: PendingPage,
});

function PendingPage() {
  const navigate = useNavigate();
  const { user, profile, loading, signOut } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login", replace: true });
    else if (profile?.status === "ativo") navigate({ to: "/", replace: true });
    else if (profile?.status === "bloqueado") navigate({ to: "/bloqueado", replace: true });
  }, [user, profile, loading, navigate]);

  if (loading || !user) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 dark:bg-[#0f172a]">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 text-center shadow-2xl dark:border-[#334155] dark:bg-[#1e293b]">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-500/20">
          <Clock className="h-7 w-7 text-yellow-500" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-[#f8fafc]">
          Aguardando aprovação
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-[#94a3b8]">
          Seu cadastro foi enviado e está pendente de aprovação por um administrador. Você receberá
          um e-mail quando seu acesso for liberado.
        </p>
        <button
          onClick={signOut}
          className="mt-6 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:border-[#334155] dark:text-[#94a3b8] dark:hover:bg-[#334155] cursor-pointer"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>
    </div>
  );
}
