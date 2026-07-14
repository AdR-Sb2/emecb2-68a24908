import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase, supabaseConfigSummary } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { LogIn, Eye, EyeOff, Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, profileLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading || profileLoading || !user) return;

    if (profile?.status === "pendente") {
      navigate({ to: "/pending", replace: true });
    } else if (profile?.status === "bloqueado") {
      navigate({ to: "/bloqueado", replace: true });
    } else {
      navigate({ to: "/", replace: true });
    }
  }, [authLoading, navigate, profile, profileLoading, user]);

  if (authLoading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4 dark:bg-[#0f172a]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0ea5e9]" />
      </div>
    );
  }

  if (user) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Preencha todos os campos.");
      return;
    }
    if (supabaseConfigSummary.error) {
      setError(supabaseConfigSummary.error);
      return;
    }

    setSubmitting(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (err) {
      if (err.message.includes("Invalid login")) setError("E-mail ou senha inválidos.");
      else setError(err.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 dark:bg-[#0f172a]">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-2xl dark:border-[#334155] dark:bg-[#1e293b]">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-[#f8fafc]">Entrar</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-[#94a3b8]">
            Acesse o Hub Eletromecânica
          </p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-[#94a3b8]">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none ring-[#0ea5e9] focus:ring-2 text-[14px] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#f8fafc]"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-[#94a3b8]">
              Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-10 text-slate-900 outline-none ring-[#0ea5e9] focus:ring-2 text-[14px] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#f8fafc]"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-[#64748b] dark:hover:text-[#94a3b8] cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {supabaseConfigSummary.error && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-600 dark:text-amber-300">
              {supabaseConfigSummary.error}
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-[#334155] dark:bg-[#0f172a]/80 dark:text-[#94a3b8]">
            <div className="font-medium text-slate-700 dark:text-[#e2e8f0]">Supabase ativo</div>
            <div className="mt-1 break-all text-slate-400 dark:text-[#94a3b8]">
              {supabaseConfigSummary.url || "não configurado"}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0ea5e9] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0284c7] disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            Entrar
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-slate-400 dark:text-[#64748b]">
          <Link to="/register" className="text-[#0ea5e9] hover:underline">
            Criar conta
          </Link>
          <span className="mx-2">·</span>
          <button
            onClick={() => {
              const redirectTo =
                typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;
              supabase.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
            }}
            className="text-[#0ea5e9] hover:underline cursor-pointer bg-transparent border-none text-sm"
          >
            Esqueci minha senha
          </button>
        </div>
      </div>
    </div>
  );
}
