import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "./supabase";
import { Sun, Moon } from "lucide-react";

type Tema = "light" | "dark";

type TemaContextType = {
  tema: Tema;
  alternarTema: () => void;
};

const TemaContext = createContext<TemaContextType>({
  tema: "light",
  alternarTema: () => {},
});

export function useTema() {
  return useContext(TemaContext);
}

export function TemaProvider({ children, userId }: { children: ReactNode; userId?: string | null }) {
  const [tema, setTema] = useState<Tema>(() => {
    const saved = localStorage.getItem("tema_preferido") as Tema | null;
    return saved || "light";
  });

  // Aplica a classe dark no <html>
  useEffect(() => {
    document.documentElement.classList.toggle("dark", tema === "dark");
  }, [tema]);

  // Carrega preferência do usuário do banco
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("tema_preferido")
        .eq("id", userId)
        .single();
      if (data?.tema_preferido && data.tema_preferido !== tema) {
        setTema(data.tema_preferido as Tema);
        localStorage.setItem("tema_preferido", data.tema_preferido);
      }
    })();
  }, [userId]);

  const alternarTema = useCallback(() => {
    setTema((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem("tema_preferido", next);
      if (userId) {
        supabase.from("profiles").update({ tema_preferido: next }).eq("id", userId).then();
      }
      return next;
    });
  }, [userId]);

  return (
    <TemaContext.Provider value={{ tema, alternarTema }}>
      {children}
    </TemaContext.Provider>
  );
}

export function ThemeToggle() {
  const { tema, alternarTema } = useTema();

  return (
    <button
      onClick={alternarTema}
      title={tema === "light" ? "Ativar modo escuro" : "Ativar modo claro"}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[#0b3a73] shadow-md ring-1 ring-black/10 backdrop-blur transition hover:scale-105 hover:bg-white"
    >
      {tema === "light" ? (
        <Moon className="h-5 w-5" />
      ) : (
        <Sun className="h-5 w-5" />
      )}
    </button>
  );
}
