import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { UserPlus, Eye, EyeOff, Loader2 } from "lucide-react";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, profileLoading } = useAuth();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (success || authLoading || profileLoading || !user) return;

    if (profile?.status === "pendente") {
      navigate({ to: "/pending", replace: true });
    } else if (profile?.status === "bloqueado") {
      navigate({ to: "/bloqueado", replace: true });
    } else {
      navigate({ to: "/", replace: true });
    }
  }, [authLoading, navigate, profile, profileLoading, success, user]);

  if (authLoading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f172a] px-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#0ea5e9]" />
      </div>
    );
  }

  if (user && !success) return null;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!nome || !email || !password || !confirm) {
      setError("Preencha todos os campos.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    setSubmitting(true);
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome_completo: nome }, emailRedirectTo: redirectTo },
    });
    setSubmitting(false);
    if (err) {
      setError(JSON.stringify(err, null, 2));
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f172a] px-4">
        <div className="w-full max-w-sm rounded-xl bg-[#1e293b] p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#0ea5e9]/20">
            <UserPlus className="h-7 w-7 text-[#0ea5e9]" />
          </div>
          <h1 className="text-xl font-bold text-[#f8fafc]">Cadastro enviado!</h1>
          <p className="mt-2 text-sm text-[#94a3b8]">
            Um administrador precisa aprovar seu acesso antes que você possa entrar.
          </p>
          <Link
            to="/login"
            className="mt-4 inline-block rounded-lg bg-[#0ea5e9] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0284c7]"
          >
            Voltar para o login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f172a] px-4">
      <div className="w-full max-w-sm rounded-xl bg-[#1e293b] p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-[#f8fafc]">Criar Conta</h1>
          <p className="mt-1 text-sm text-[#94a3b8]">Cadastre-se no Hub Eletromecânica</p>
        </div>

        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#94a3b8]">Nome completo</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2.5 text-[#f8fafc] outline-none ring-[#0ea5e9] focus:ring-2 text-[14px]"
              placeholder="Seu nome"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#94a3b8]">
              E-mail corporativo
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2.5 text-[#f8fafc] outline-none ring-[#0ea5e9] focus:ring-2 text-[14px]"
              placeholder="seu@empresa.com"
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

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#94a3b8]">
              Confirmar senha
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2.5 text-[#f8fafc] outline-none ring-[#0ea5e9] focus:ring-2 text-[14px]"
              placeholder="••••••••"
            />
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
              <UserPlus className="h-4 w-4" />
            )}
            Cadastrar
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-[#64748b]">
          Já tem conta?{" "}
          <Link to="/login" className="text-[#0ea5e9] hover:underline">
            Entrar
          </Link>
        </div>
      </div>
    </div>
  );
}
