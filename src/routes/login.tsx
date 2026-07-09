import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { LogIn, Eye, EyeOff, Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (authLoading) return null;

  // Already logged in
  if (user && profile) {
    if (profile.status === "pendente") navigate({ to: "/pending", replace: true });
    else if (profile.status === "bloqueado") navigate({ to: "/bloqueado", replace: true });
    else navigate({ to: "/", replace: true });
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Preencha todos os campos.");
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
    <div className="flex min-h-screen items-center justify-center bg-[#0f172a] px-4">
      <div className="w-full max-w-sm rounded-xl bg-[#1e293b] p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-[#f8fafc]">Entrar</h1>
          <p className="mt-1 text-sm text-[#94a3b8]">Acesse o Hub Eletromecânica</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#94a3b8]">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2.5 text-[#f8fafc] outline-none ring-[#0ea5e9] focus:ring-2 text-[14px]"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#94a3b8]">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2.5 pr-10 text-[#f8fafc] outline-none ring-[#0ea5e9] focus:ring-2 text-[14px]"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#94a3b8] cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
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

        <div className="mt-4 text-center text-sm text-[#64748b]">
          <Link to="/register" className="text-[#0ea5e9] hover:underline">
            Criar conta
          </Link>
          <span className="mx-2">·</span>
          <button
            onClick={() => supabase.auth.resetPasswordForEmail(email)}
            className="text-[#0ea5e9] hover:underline cursor-pointer bg-transparent border-none text-sm"
          >
            Esqueci minha senha
          </button>
        </div>
      </div>
    </div>
  );
}
