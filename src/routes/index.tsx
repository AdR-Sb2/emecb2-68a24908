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
import logoAsset from "@/assets/logo-eletromecanica.png.asset.json";

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

const SISTEMAS_OPERACIONAL_URL = "https://adr-sb2.github.io/Gest-o-de-Ativos/";
const SISTEMAS_ADMINISTRATIVO_URL = "https://adr-sb2.github.io/Gest-o-de-Ativos/adm/adm.html";

function Index() {
  const [dashOpen, setDashOpen] = useState(false);
  const [sysOpen, setSysOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#eaf3fb] via-slate-50 to-[#dbeaf7] p-4 md:p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 overflow-hidden rounded-md shadow">
          <img
            src={logoAsset.url}
            alt="Águas do Rio - Eletromecânica"
            className="w-full object-cover"
            width={1024}
            height={160}
            loading="eager"
          />
        </div>

        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-[#0b3a73] md:text-3xl">Hub Eletromecânica</h1>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
            Escolha o que você quer acessar.
          </p>
        </div>

        <div className="grid w-full gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setDashOpen(true)}
            className="group flex flex-col items-start gap-3 rounded-xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#1f7ad6] hover:shadow-lg"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#1f7ad6]/10 text-[#0b3a73]">
              <LayoutDashboard className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#0b3a73]">Dashboard</h2>
              <p className="text-sm text-slate-600">
                Painéis de automação, testes e medições.
              </p>
            </div>
            <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-[#1f7ad6] opacity-0 transition group-hover:opacity-100">
              Escolher painel <ArrowRight className="h-4 w-4" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSysOpen(true)}
            className="group flex flex-col items-start gap-3 rounded-xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#1f7ad6] hover:shadow-lg"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#1f7ad6]/10 text-[#0b3a73]">
              <Boxes className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#0b3a73]">Sistemas</h2>
              <p className="text-sm text-slate-600">
                Hubs Administrativo e Operacional.
              </p>
            </div>
            <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-[#1f7ad6] opacity-0 transition group-hover:opacity-100">
              Escolher sistema <ArrowRight className="h-4 w-4" />
            </span>
          </button>
        </div>

        <p className="mt-8 text-center text-xs text-slate-500">
          Águas do Rio · Eletromecânica
        </p>
      </div>

      <Dialog open={dashOpen} onOpenChange={setDashOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0b3a73]">Escolha um dashboard</DialogTitle>
            <DialogDescription>Qual painel você quer abrir?</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Link
              to="/dashboard"
              onClick={() => setDashOpen(false)}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-[#1f7ad6] hover:bg-[#eaf3fb]"
            >
              <div>
                <div className="font-semibold text-[#0b3a73]">Automação</div>
                <div className="text-xs text-slate-500">
                  Elevatórias · sensores · CLP/PCP · ELIPSE
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-[#1f7ad6]" />
            </Link>

            <div
              aria-disabled
              className="flex cursor-not-allowed items-center justify-between rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-left opacity-70"
            >
              <div>
                <div className="font-semibold text-[#0b3a73]">Testes e Medições</div>
                <div className="text-xs text-slate-500">Em breve</div>
              </div>
              <Lock className="h-4 w-4 text-slate-400" />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={sysOpen} onOpenChange={setSysOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0b3a73]">Escolha um sistema</DialogTitle>
            <DialogDescription>Qual hub você quer abrir?</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <a
              href={SISTEMAS_ADMINISTRATIVO_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setSysOpen(false)}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-[#1f7ad6] hover:bg-[#eaf3fb]"
            >
              <div>
                <div className="font-semibold text-[#0b3a73]">Administrativo</div>
                <div className="text-xs text-slate-500">Gestão administrativa</div>
              </div>
              <ArrowRight className="h-4 w-4 text-[#1f7ad6]" />
            </a>
            <a
              href={SISTEMAS_OPERACIONAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setSysOpen(false)}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-[#1f7ad6] hover:bg-[#eaf3fb]"
            >
              <div>
                <div className="font-semibold text-[#0b3a73]">Operacional</div>
                <div className="text-xs text-slate-500">Gestão de Ativos</div>
              </div>
              <ArrowRight className="h-4 w-4 text-[#1f7ad6]" />
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
