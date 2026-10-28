import { useEffect, useState } from "react";
import { Hand, Pencil } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Compra } from "@/lib/estoque-types";
import { formatarDataPura, hojeISO, validarDataRc } from "@/lib/datas-puras";

interface Props {
  compra: Compra;
  itensNaRc: number;
  podeEditar: boolean;
  onSalvar: (compra: Compra, data: string | null, aplicarRc: boolean) => Promise<boolean>;
}

export function DataRcCell({ compra, itensNaRc, podeEditar, onSalvar }: Props) {
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState(compra.dt_criacao_rc?.slice(0, 10) ?? "");
  const [aplicarRc, setAplicarRc] = useState(itensNaRc > 1);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (aberto) {
      setValor(compra.dt_criacao_rc?.slice(0, 10) ?? "");
      setAplicarRc(!!compra.requisicao && itensNaRc > 1);
    }
  }, [aberto, compra.dt_criacao_rc, compra.requisicao, itensNaRc]);

  const erro = valor ? validarDataRc(valor, compra.chegou ? compra.data_chegou : null) : null;
  const manual = compra.data_criacao_origem === "manual";

  const salvar = async (data: string | null) => {
    if (data && (erro || !valor)) return;
    setSalvando(true);
    const ok = await onSalvar(compra, data, aplicarRc && !!compra.requisicao);
    setSalvando(false);
    if (ok) setAberto(false);
  };

  const marcador = manual ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <Hand className="h-3 w-3 text-sky-500" aria-label="Data informada manualmente" />
      </TooltipTrigger>
      <TooltipContent>
        Informada manualmente
        {compra.data_criacao_editada_por_nome ? ` por ${compra.data_criacao_editada_por_nome}` : ""}
        {compra.data_criacao_editada_em
          ? ` em ${new Date(compra.data_criacao_editada_em).toLocaleDateString("pt-BR")}`
          : ""}
      </TooltipContent>
    </Tooltip>
  ) : null;

  if (!podeEditar) {
    return compra.dt_criacao_rc ? (
      <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
        {marcador}
        {formatarDataPura(compra.dt_criacao_rc)}
      </span>
    ) : null;
  }

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <div className="flex items-center gap-1">
        {marcador}
        <PopoverTrigger asChild>
          {compra.dt_criacao_rc ? (
            <button
              type="button"
              className="group flex items-center gap-1 text-[10px] text-slate-400 hover:text-[#1f7ad6] dark:text-slate-500"
              title="Editar data de criação da RC"
            >
              <Pencil className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 group-focus:opacity-100" />
              {formatarDataPura(compra.dt_criacao_rc)}
            </button>
          ) : (
            <button
              type="button"
              className="text-[10px] text-slate-400 hover:text-[#1f7ad6] hover:underline"
            >
              + Data da RC
            </button>
          )}
        </PopoverTrigger>
      </div>
      <PopoverContent className="w-64 p-3" align="end">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void salvar(valor || null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setAberto(false);
          }}
          className="grid gap-2 text-sm"
        >
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Data de criação da RC
            </span>
            <input
              type="date"
              autoFocus
              max={hojeISO()}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="min-h-9 rounded-md border border-slate-300 px-2 text-[13px] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            />
          </label>
          {erro && <p className="text-[11px] text-red-600">{erro}</p>}
          {compra.requisicao ? (
            <label className="flex items-start gap-2 text-[12px] text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={aplicarRc}
                onChange={(e) => setAplicarRc(e.target.checked)}
                className="mt-0.5"
              />
              Aplicar a todos os itens da RC {compra.requisicao} ({itensNaRc}{" "}
              {itensNaRc === 1 ? "item" : "itens"})
            </label>
          ) : (
            <p className="text-[11px] text-slate-400">Item sem RC: vale só para este item.</p>
          )}
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            {compra.dt_criacao_rc && (
              <button
                type="button"
                disabled={salvando}
                onClick={() => void salvar(null)}
                className="mr-auto text-[12px] text-red-600 hover:underline"
              >
                Remover data
              </button>
            )}
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="rounded-md border border-slate-300 px-2 py-1 text-[12px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando || !valor || !!erro}
              className="rounded-md bg-[#0b3a73] px-3 py-1 text-[12px] font-semibold text-white hover:bg-[#1f7ad6] disabled:opacity-50"
            >
              Salvar
            </button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
