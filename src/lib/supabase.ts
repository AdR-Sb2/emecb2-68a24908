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
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_ANON_KEY",
  "SUPABASE_ANON_KEY",
  "PUBLIC_SUPABASE_ANON_KEY",
);

const isLocalDev =
  import.meta.env.DEV && typeof window !== "undefined" && window.location.hostname === "localhost";
const fallbackSupabaseUrl = "https://ncwqawuphmweiufkswjg.supabase.co";
const fallbackSupabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jd3Fhd3VwaG13ZWl1Zmtzd2pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NTc0OTMsImV4cCI6MjA5OTEzMzQ5M30.w1a5NOzWGnnQStOyqdyrw59cu5Wji-5jiM3ZD3gyqpw";
const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);
const shouldUseFallback = !hasSupabaseConfig;

const resolvedSupabaseUrl = supabaseUrl ?? fallbackSupabaseUrl;
const resolvedSupabaseAnonKey = supabaseAnonKey ?? fallbackSupabaseAnonKey;

export const supabaseConfigError = hasSupabaseConfig
  ? null
  : "As variáveis do Supabase não foram encontradas no ambiente atual; usando a configuração pública do projeto para manter o login funcionando.";

export const supabaseConfigSummary = {
  url: resolvedSupabaseUrl,
  isConfigured: true,
  error: supabaseConfigError,
  source: hasSupabaseConfig ? "env" : "fallback",
  isUsingFallback: shouldUseFallback,
};

if (shouldUseFallback && isLocalDev) {
  console.warn(supabaseConfigError);
} else if (shouldUseFallback) {
  console.info(supabaseConfigError);
}

export const supabase = createClient(resolvedSupabaseUrl, resolvedSupabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
