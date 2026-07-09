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

export const isUsingFallbackSupabaseConfig = !supabaseUrl || !supabaseAnonKey;

export const supabaseConfigError =
  !supabaseUrl || !supabaseAnonKey
    ? "Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente do Lovable Cloud para este deploy."
    : null;

const resolvedSupabaseUrl = supabaseUrl || (isLocalDev ? "https://byxmnmebvqdxpzcuutak.supabase.co" : "");
const resolvedSupabaseAnonKey =
  supabaseAnonKey || (isLocalDev ? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5eG1ubWVidnFkeHB6Y3V1dGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NjM0OTAsImV4cCI6MjA5OTEzOTQ5MH0.TUDk4MlKXsrWz6VufIdQkoFH7RGwezgKSFeZ6nMwyQI" : "");

export const supabaseConfigSummary = {
  url: resolvedSupabaseUrl,
  isUsingFallback: isUsingFallbackSupabaseConfig,
  error: supabaseConfigError,
};

if (!resolvedSupabaseUrl || !resolvedSupabaseAnonKey) {
  console.error(supabaseConfigError);
}

export const supabase = createClient(resolvedSupabaseUrl, resolvedSupabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
