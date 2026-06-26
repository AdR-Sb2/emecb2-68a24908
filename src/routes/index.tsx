import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { LayoutDashboard, Boxes, ArrowRight, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Águas do Rio · Eletromecânica" },
      { name: "description", content: "Hub de dashboards e sistemas da Eletromecânica." },
      { property: "og:title", content: "Águas do Rio · Eletromecânica" },
      { property: "og:description", content: "Hub de dashboards e sistemas da Eletromecânica." },
    ],
  }),
  component: Index,
});

const SISTEMAS_URL = "https://adr-sb2.github.io/Gest-o-de-Ativos/";

function Index() {
  const [dashOpen, setDashOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-background p-6 text-center">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">Águas do Rio · Eletromecânica</h1>
        <p className="max-w-md text-muted-foreground mx-auto">
          Escolha o que você quer acessar.
        </p>
      </div>

      <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setDashOpen(true)}
          className="group flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-6 text-left shadow-sm transition hover:border-primary hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <LayoutDashboard className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Dashboard</h2>
            <p className="text-sm text-muted-foreground">
              Painéis de automação, testes e medições.
            </p>
          </div>
          <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition group-hover:opacity-100">
            Escolher painel <ArrowRight className="h-4 w-4" />
          </span>
        </button>

        <a
          href={SISTEMAS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-6 text-left shadow-sm transition hover:border-primary hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Boxes className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Sistemas</h2>
            <p className="text-sm text-muted-foreground">
              Hub dos sistemas (Gestão de Ativos).
            </p>
          </div>
          <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition group-hover:opacity-100">
            Abrir hub <ArrowRight className="h-4 w-4" />
          </span>
        </a>
      </div>

      <Dialog open={dashOpen} onOpenChange={setDashOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Escolha um dashboard</DialogTitle>
            <DialogDescription>Qual painel você quer abrir?</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Link
              to="/dashboard"
              onClick={() => setDashOpen(false)}
              className="flex items-center justify-between rounded-lg border border-border bg-card p-4 text-left transition hover:border-primary hover:bg-accent"
            >
              <div>
                <div className="font-semibold text-foreground">Automação</div>
                <div className="text-xs text-muted-foreground">
                  Elevatórias · sensores · CLP/PCP · ELIPSE
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-primary" />
            </Link>

            <div
              aria-disabled
              className="flex cursor-not-allowed items-center justify-between rounded-lg border border-dashed border-border bg-muted/30 p-4 text-left opacity-70"
            >
              <div>
                <div className="font-semibold text-foreground">Testes e Medições</div>
                <div className="text-xs text-muted-foreground">Em breve</div>
              </div>
              <Lock className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
