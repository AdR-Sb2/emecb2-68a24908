import { ArrowLeft, Home } from "lucide-react";
import { Link, useRouter } from "@tanstack/react-router";

const BTN =
  "inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[#0b3a73] shadow-md ring-1 ring-black/10 backdrop-blur transition hover:scale-105 hover:bg-white dark:text-white sm:h-9 sm:w-9";

export function NavVoltarHome() {
  const router = useRouter();
  const voltar = () => {
    if (router.history.canGoBack()) {
      router.history.back();
    } else {
      router.navigate({ to: "/" });
    }
  };
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={voltar} title="Voltar" aria-label="Voltar" className={BTN}>
        <ArrowLeft className="h-5 w-5 sm:h-4 sm:w-4" />
      </button>
      <Link to="/" title="Voltar ao Hub" aria-label="Voltar ao Hub" className={BTN}>
        <Home className="h-5 w-5 sm:h-4 sm:w-4" />
      </Link>
    </div>
  );
}
