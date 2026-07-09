import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function warnMissingEnv() {
  console.warn(
    "[Supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não definidos. " +
      "Crie um arquivo .env na raiz com essas variáveis. " +
      "O app pode não funcionar corretamente sem o backend.",
  );
}

function createStubClient(): ReturnType<typeof createClient> {
  const stubResp = { data: null, error: new Error("Supabase não configurado") };
  const stubSession = { data: { session: null }, error: null };
  const stubSubscription = { data: { subscription: { unsubscribe: () => {} } }, error: null };
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop: string) {
      if (prop === "auth") {
        return {
          getSession: () => Promise.resolve(stubSession),
          onAuthStateChange: () => stubSubscription,
          signOut: () => Promise.resolve(),
          signInWithPassword: () => Promise.resolve(stubResp),
          signUp: () => Promise.resolve(stubResp),
          resetPasswordForEmail: () => Promise.resolve(stubResp),
        };
      }
      if (prop === "from") {
        return () => ({
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve(stubResp),
              order: () => Promise.resolve(stubResp),
              maybeSingle: () => Promise.resolve(stubResp),
            }),
            order: () => Promise.resolve(stubResp),
          }),
          insert: () => Promise.resolve(stubResp),
          update: () => ({
            eq: () => Promise.resolve(stubResp),
          }),
          delete: () => ({
            eq: () => Promise.resolve(stubResp),
          }),
        });
      }
      if (prop === "rpc") {
        return () => Promise.resolve(stubResp);
      }
      return () => Promise.resolve(stubResp);
    },
  };
  return new Proxy({}, handler) as unknown as ReturnType<typeof createClient>;
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : (warnMissingEnv(), createStubClient());
