import { useEffect, useMemo, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  FORMULARIO_TESTE_VAZIO,
  LIMITE_CEDAE,
  TIPO_TESTE_ADR,
  TIPO_TESTE_ADR_LABEL,
  TIPO_TESTE_CEDAE,
  montarPayloadFormulario,
  normalizarCodigoElevatoria,
  normalizarTipoTeste,
  validarLimiteCedae,
  type FormularioTeste,
  type TipoTeste,
} from "@/lib/testes-tipos";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Tipos que podem ser criados nesta tela (dashboard: AdR + CEDAE; Ficha: CEDAE).
  tiposPermitidos?: TipoTeste[];
  // Elevatória inicial (na Ficha é fixa).
  elevatoriaInicial?: string;
  lockElevatoria?: boolean;
  // Quantos CEDAE já existem para a planta (para aplicar o limite de 2).
  qtdCedaePorPlanta?: (planta: string | null) => number;
  onSaved: () => void;
};

const CAMPOS: Array<{ key: keyof FormularioTeste; label: string; tipo?: string; wide?: boolean }> =
  [
    { key: "dataTeste", label: "Data do Teste", tipo: "date" },
    { key: "tipoServico", label: "Tipo de Serviço" },
    { key: "elevatoria", label: "Elevatória", wide: true },
    { key: "grupo", label: "Grupo" },
    { key: "tensao", label: "Tensão" },
    { key: "corrente", label: "Corrente" },
    { key: "retaguarda", label: "Retaguarda" },
    { key: "recalque", label: "Recalque" },
    { key: "correnteShutOff", label: "Corrente ShutOff" },
    { key: "retaguardaShutOff", label: "Retaguarda ShutOff" },
    { key: "recalqueShutOff", label: "Recalque ShutOff" },
    { key: "impossibilidade", label: "Impossibilidade", wide: true },
    { key: "servicoExecutado", label: "Serviço Executado", wide: true },
    { key: "nomeColaboradores", label: "Nome dos Colaboradores", wide: true },
    { key: "observacao", label: "Observação", wide: true },
    { key: "naChegada", label: "Na Chegada" },
    { key: "naSaida", label: "Na saída" },
    { key: "status", label: "Status" },
  ];

type ErroOperacaoTeste = {
  message?: unknown;
  details?: unknown;
  hint?: unknown;
  code?: unknown;
};

function extrairMensagemErroTeste(err: unknown): string {
  if (err instanceof Error) return err.message;

  if (err && typeof err === "object") {
    const erro = err as ErroOperacaoTeste;
    const mensagem =
      typeof erro.message === "string" && erro.message.trim()
        ? erro.message.trim()
        : "Erro não identificado pelo Supabase.";
    const detalhes = [erro.details, erro.hint]
      .filter((valor): valor is string => typeof valor === "string" && valor.trim().length > 0)
      .map((valor) => valor.trim());
    const codigo =
      typeof erro.code === "string" && erro.code.trim() ? ` (código ${erro.code.trim()})` : "";
    return [mensagem, ...detalhes].join(" — ") + codigo;
  }

  return typeof err === "string" && err.trim() ? err : "Erro não identificado ao salvar o teste.";
}

function rotuloTipo(t: TipoTeste): string {
  return t === TIPO_TESTE_CEDAE ? "CEDAE" : TIPO_TESTE_ADR_LABEL;
}

export function TesteFormDialog({
  open,
  onOpenChange,
  tiposPermitidos = [TIPO_TESTE_ADR, TIPO_TESTE_CEDAE],
  elevatoriaInicial = "",
  lockElevatoria = false,
  qtdCedaePorPlanta,
  onSaved,
}: Props) {
  const tipoInicial = tiposPermitidos[0] ?? TIPO_TESTE_ADR;
  const [tipo, setTipo] = useState<TipoTeste>(tipoInicial);
  const [form, setForm] = useState<FormularioTeste>(FORMULARIO_TESTE_VAZIO);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (open) {
      setTipo(tipoInicial);
      setForm({ ...FORMULARIO_TESTE_VAZIO, elevatoria: elevatoriaInicial });
      setSalvando(false);
    }
  }, [open, elevatoriaInicial, tipoInicial]);

  const planta = useMemo(
    () => normalizarCodigoElevatoria(form.elevatoria || elevatoriaInicial),
    [form.elevatoria, elevatoriaInicial],
  );
  const qtdCedae = tipo === TIPO_TESTE_CEDAE ? (qtdCedaePorPlanta?.(planta) ?? 0) : 0;
  const cedaeCheio = qtdCedae >= LIMITE_CEDAE;

  const salvar = async () => {
    if (!form.dataTeste) {
      toast.error("Informe a data do teste.");
      return;
    }
    if (tipo === TIPO_TESTE_CEDAE) {
      const validacao = validarLimiteCedae(qtdCedae, TIPO_TESTE_CEDAE);
      if (!validacao.ok) {
        toast.error(validacao.mensagem);
        return;
      }
    }
    setSalvando(true);
    try {
      const payload = montarPayloadFormulario(form, lockElevatoria ? elevatoriaInicial : "", tipo);
      const { error } = await supabase.from("testes_afericoes").insert(payload);
      if (error) throw error;
      toast.success(`Teste ${rotuloTipo(tipo)} cadastrado.`);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("testes-atualizados"));
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error("Erro ao salvar teste em testes_afericoes:", err);
      toast.error(`Falha ao salvar teste: ${extrairMensagemErroTeste(err)}`);
    } finally {
      setSalvando(false);
    }
  };

  const permiteEscolherTipo = tiposPermitidos.length > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#0b3a73] dark:text-white">
            <ShieldCheck className="h-4 w-4" />
            Adicionar teste
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {permiteEscolherTipo && (
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Tipo de Teste
              </span>
              <div className="flex gap-2">
                {tiposPermitidos.map((t) => {
                  const desabilitado = t === TIPO_TESTE_CEDAE && cedaeCheio && tipo !== t;
                  const ativo = tipo === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      disabled={desabilitado}
                      onClick={() => setTipo(t)}
                      className={`inline-flex min-h-9 items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        ativo
                          ? "border-[#0b3a73] bg-[#0b3a73] text-white"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                      }`}
                    >
                      {rotuloTipo(t)}
                    </button>
                  );
                })}
              </div>
              {cedaeCheio && (
                <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">
                  Limite de {LIMITE_CEDAE} testes CEDAE por elevatória atingido.
                </span>
              )}
            </label>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CAMPOS.map((campo) => {
              const bloqueado = campo.key === "elevatoria" && lockElevatoria;
              return (
                <label
                  key={campo.key}
                  className={`flex flex-col gap-1 ${campo.wide ? "sm:col-span-2" : ""}`}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {campo.label}
                  </span>
                  <input
                    type={campo.tipo ?? "text"}
                    value={(form[campo.key] as string) ?? ""}
                    disabled={bloqueado}
                    onChange={(e) => setForm((prev) => ({ ...prev, [campo.key]: e.target.value }))}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#1f7ad6] focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:disabled:bg-slate-800"
                  />
                </label>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-1">
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
              disabled={salvando || (tipo === TIPO_TESTE_CEDAE && cedaeCheio)}
              className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-[#0b3a73] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1f7ad6] disabled:opacity-50"
            >
              {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
