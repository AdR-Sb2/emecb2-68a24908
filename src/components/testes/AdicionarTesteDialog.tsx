import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, History } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  FORMULARIO_TESTE_VAZIO,
  LIMITE_CEDAE,
  TIPO_TESTE_ADR,
  TIPO_TESTE_CEDAE,
  montarPayloadFormulario,
  type FormularioTeste,
  type TipoTeste,
} from "@/lib/testes-tipos";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  elevatoriaNome: string;
  qtdCedae: number;
  onSaved: () => void;
};

const CAMPOS: Array<{ key: keyof FormularioTeste; label: string; tipo?: string; wide?: boolean }> =
  [
    { key: "dataTeste", label: "Data do Teste", tipo: "date" },
    { key: "tipoServico", label: "Tipo de Serviço" },
    { key: "grupo", label: "Grupo" },
    { key: "nomeColaboradores", label: "Nome dos Colaboradores", wide: true },
    { key: "servicoExecutado", label: "Serviço Executado", wide: true },
    { key: "observacao", label: "Observação", wide: true },
    { key: "tensao", label: "Tensão (V)" },
    { key: "corrente", label: "Corrente (A)" },
    { key: "recalque", label: "Recalque" },
    { key: "retaguarda", label: "Retaguarda" },
    { key: "correnteShutOff", label: "Corrente ShutOff" },
    { key: "retaguardaShutOff", label: "Retaguarda ShutOff" },
    { key: "recalqueShutOff", label: "Recalque ShutOff" },
    { key: "naChegada", label: "Na Chegada" },
    { key: "naSaida", label: "Na Saída" },
  ];

export function AdicionarTesteDialog({
  open,
  onOpenChange,
  elevatoriaNome,
  qtdCedae,
  onSaved,
}: Props) {
  const [tipo, setTipo] = useState<TipoTeste | null>(null);
  const [form, setForm] = useState<FormularioTeste>(FORMULARIO_TESTE_VAZIO);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) {
      setTipo(null);
      setForm(FORMULARIO_TESTE_VAZIO);
      setSalvando(false);
    }
  }, [open]);

  const cedaeCheio = qtdCedae >= LIMITE_CEDAE;

  const salvar = async () => {
    if (!tipo) return;
    if (!form.dataTeste) {
      toast.error("Informe a data do teste.");
      return;
    }
    setSalvando(true);
    try {
      const payload = montarPayloadFormulario(form, elevatoriaNome, tipo);
      const { error } = await supabase.from("testes_afericoes").insert(payload);
      if (error) throw error;
      toast.success(
        tipo === TIPO_TESTE_CEDAE ? "Teste CEDAE cadastrado." : "Teste AdR cadastrado.",
      );
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("testes-atualizados"));
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : "Falha ao salvar o teste.";
      toast.error(mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#0b3a73] dark:text-white">
            <ShieldCheck className="h-4 w-4" />
            Adicionar teste
          </DialogTitle>
        </DialogHeader>

        {tipo === null ? (
          <div className="grid gap-3 py-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={cedaeCheio}
              onClick={() => setTipo(TIPO_TESTE_CEDAE)}
              className="flex flex-col items-start gap-1 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-[#1f7ad6] hover:bg-[#1f7ad6]/5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800"
            >
              <span className="flex items-center gap-2 text-sm font-bold text-[#0b3a73] dark:text-white">
                <ShieldCheck className="h-4 w-4" /> Testes CEDAE
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Máximo de {LIMITE_CEDAE} por elevatória. Uso histórico/regulatório.
              </span>
              <span
                className={`mt-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  cedaeCheio
                    ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200"
                }`}
              >
                {qtdCedae}/{LIMITE_CEDAE}
              </span>
              {cedaeCheio && (
                <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">
                  Limite atingido. Exclua um teste CEDAE para liberar vaga.
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setTipo(TIPO_TESTE_ADR)}
              className="flex flex-col items-start gap-1 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-[#1f7ad6] hover:bg-[#1f7ad6]/5 dark:border-slate-600 dark:bg-slate-800"
            >
              <span className="flex items-center gap-2 text-sm font-bold text-[#0b3a73] dark:text-white">
                <History className="h-4 w-4" /> Testes AdR
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Histórico completo da elevatória, sem limite. Aparece também no dashboard.
              </span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#0b3a73] dark:text-white">
                {tipo === TIPO_TESTE_CEDAE ? "Testes CEDAE" : "Testes AdR"}
              </span>
              <button
                type="button"
                onClick={() => setTipo(null)}
                className="text-xs font-semibold text-[#1f7ad6] hover:underline"
              >
                Trocar tipo
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {CAMPOS.map((campo) => (
                <label
                  key={campo.key}
                  className={`flex flex-col gap-1 ${campo.wide ? "sm:col-span-2" : ""}`}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {campo.label}
                  </span>
                  <input
                    type={campo.tipo ?? "text"}
                    value={form[campo.key]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [campo.key]: e.target.value }))}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#1f7ad6] focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                  />
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvar}
                disabled={salvando}
                className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-[#0b3a73] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1f7ad6] disabled:opacity-50"
              >
                {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
