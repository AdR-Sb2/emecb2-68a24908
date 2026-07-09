import { createClient } from "@supabase/supabase-js";

const readEnv = (...keys: string[]) => {
  for (const key of keys) {
    const value = import.meta.env[key as keyof ImportMetaEnv];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
};

const supabaseUrl =
  readEnv("VITE_SUPABASE_URL", "SUPABASE_URL", "PUBLIC_SUPABASE_URL") ||
  "https://byxmnmebvqdxpzcuutak.supabase.co";

const supabaseAnonKey =
  readEnv("VITE_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY", "PUBLIC_SUPABASE_ANON_KEY") ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5eG1ubWVidnFkeHB6Y3V1dGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NjM0OTAsImV4cCI6MjA5OTEzOTQ5MH0.TUDk4MlKXsrWz6VufIdQkoFH7RGwezgKSFeZ6nMwyQI";

export const isUsingFallbackSupabaseConfig =
  !readEnv("VITE_SUPABASE_URL", "SUPABASE_URL", "PUBLIC_SUPABASE_URL") ||
  !readEnv("VITE_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY", "PUBLIC_SUPABASE_ANON_KEY");

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
