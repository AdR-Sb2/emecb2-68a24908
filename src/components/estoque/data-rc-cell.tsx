import { useEffect, useState } from "react";
import { Hand, Pencil } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Compra } from "@/lib/estoque-types";
import { formatarDataPura, hojeISO, validarDataRc } from "@/lib/datas-puras";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    try {
      const ok = await onSalvar(compra, data, aplicarRc && !!compra.requisicao);
      if (ok) setAberto(false);
    } finally {
      setSalvando(false);
    }
  };

  const marcador = manual ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <Hand className="h-3 w-3 text-primary" aria-label="Data informada manualmente" />
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
      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
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
            <Button
              variant="ghost"
              type="button"
              className="group h-auto gap-1 p-0 text-[10px] text-muted-foreground hover:text-primary"
              title="Editar data de criação da RC"
            >
              <Pencil className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 group-focus:opacity-100" />
              {formatarDataPura(compra.dt_criacao_rc)}
            </Button>
          ) : (
            <Button
              variant="ghost"
              type="button"
              className="h-auto p-0 text-[10px] text-muted-foreground hover:text-primary hover:underline"
            >
              + Data da RC
            </Button>
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
            <span className="text-xs font-semibold text-foreground">
              Data de criação da RC
            </span>
            <Input
              type="date"
              autoFocus
              max={hojeISO()}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="min-h-9 text-[13px]"
            />
          </label>
          {erro && <p className="text-[11px] text-destructive">{erro}</p>}
          {compra.requisicao ? (
            <label className="flex items-start gap-2 text-[12px] text-muted-foreground">
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
            <p className="text-[11px] text-muted-foreground">Item sem RC: vale só para este item.</p>
          )}
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            {compra.dt_criacao_rc && (
              <Button
                variant="ghost"
                type="button"
                disabled={salvando}
                onClick={() => void salvar(null)}
                className="mr-auto h-auto p-0 text-[12px] text-destructive hover:underline"
              >
                Remover data
              </Button>
            )}
            <Button
              variant="outline"
              type="button"
              onClick={() => setAberto(false)}
              className="h-8 px-2 text-[12px]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={salvando || !valor || !!erro}
              className="h-8 px-3 text-[12px]"
            >
              Salvar
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
