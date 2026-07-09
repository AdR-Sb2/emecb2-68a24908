import { createClient } from "@supabase/supabase-js";

const readEnv = (...keys: string[]) => {
  for (const key of keys) {
    const value = import.meta.env[key as keyof ImportMetaEnv];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
};

const supabaseUrl = readEnv("VITE_SUPABASE_URL", "SUPABASE_URL", "PUBLIC_SUPABASE_URL");
const supabaseAnonKey = readEnv(
  "VITE_SUPABASE_ANON_KEY",
  "SUPABASE_ANON_KEY",
  "PUBLIC_SUPABASE_ANON_KEY",
);

const isLocalDev = import.meta.env.DEV && typeof window !== "undefined" && window.location.hostname === "localhost";
const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const supabaseConfigError = hasSupabaseConfig
  ? null
  : "As variáveis do Supabase não foram configuradas para esta implantação. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no Lovable Cloud para que o login funcione corretamente.";

const resolvedSupabaseUrl = supabaseUrl ?? "";
const resolvedSupabaseAnonKey = supabaseAnonKey ?? "";

export const supabaseConfigSummary = {
  url: resolvedSupabaseUrl,
  isConfigured: hasSupabaseConfig,
  error: supabaseConfigError,
  source: supabaseUrl ? "env" : "missing",
};

if (!hasSupabaseConfig && isLocalDev) {
  console.warn(supabaseConfigError);
} else if (!hasSupabaseConfig) {
  console.info(supabaseConfigError);
}

export const supabase = hasSupabaseConfig
  ? createClient(resolvedSupabaseUrl, resolvedSupabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : ({} as any);
