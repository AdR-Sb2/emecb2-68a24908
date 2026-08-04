import { createClient } from "@supabase/supabase-js";

const readEnv = (...keys: string[]) => {
  for (const key of keys) {
    const value = import.meta.env[key as keyof ImportMetaEnv];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
};

// Projeto com todos os dados (elevatórias, O.S., painéis).
const PROJECT_PADRAO_URL = "https://byxmnmebvqdxpzcuutak.supabase.co";
const PROJECT_PADRAO_ANON_KEY = "sb_publishable_ltY4BfcrdlBw91KH5BHfgg_ZHDurfuZ";
// Projeto vazio criado durante o ajuste da API key (sem as tabelas do app).
const PROJECT_VAZIO_URL = "https://ncwqawuphmweiufkswjg.supabase.co";

let supabaseUrl = readEnv("VITE_SUPABASE_URL", "SUPABASE_URL", "PUBLIC_SUPABASE_URL");
let supabaseAnonKey = readEnv(
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_ANON_KEY",
  "SUPABASE_ANON_KEY",
  "PUBLIC_SUPABASE_ANON_KEY",
);

// Sem credenciais no ambiente → usa o projeto com os dados.
if (!supabaseUrl || !supabaseAnonKey) {
  supabaseUrl = PROJECT_PADRAO_URL;
  supabaseAnonKey = PROJECT_PADRAO_ANON_KEY;
}
// Ambiente apontando para o projeto vazio → volta para o projeto com os dados.
if (supabaseUrl === PROJECT_VAZIO_URL) {
  supabaseUrl = PROJECT_PADRAO_URL;
  supabaseAnonKey = PROJECT_PADRAO_ANON_KEY;
}

const isLocalDev =
  import.meta.env.DEV && typeof window !== "undefined" && window.location.hostname === "localhost";

export const supabaseConfigSummary = {
  url: supabaseUrl,
  isConfigured: true,
  error: null,
  source: "env",
  isUsingFallback: false,
};

if (isLocalDev) {
  console.info("Supabase conectado a:", supabaseUrl);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
