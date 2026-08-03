import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Check, ChevronsUpDown, ClipboardList, Link2, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { getPermissoesRegistros, type PermissoesRegistros } from "@/lib/registros-permissoes";
import type { RegistroAtendimento } from "@/lib/registros-types";

type ElevatoriaOpt = {
  id: number;
  nome: string;
  planta: string | null;
};

type Props = {
  permissoes?: PermissoesRegistros;
};

function formatDate(d: string | null): string {
  if (!d) return "";
  const parts = d.slice(0, 10).split("-");
  if (parts.length !== 3) return d;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function ElevatoriaCombobox({
  options,
  value,
  onChange,
  disabled,
}: {
  options: ElevatoriaOpt[];
  value: number | null;
  onChange: (id: number | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find((o) => o.id === value);

  const filtradas = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.nome.toLowerCase().includes(q) || (o.planta ?? "").toLowerCase().includes(q),
    );
  }, [options, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full max-w-[280px] justify-between px-3"
        >
          {selected ? (
            <span className="truncate text-slate-700 dark:text-slate-200">
              {selected.nome}
              {selected.planta ? ` · ${selected.planta}` : ""}
            </span>
          ) : (
            <span className="truncate text-slate-400">Selecionar elevatória...</span>
          )}
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar por nome ou planta..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>Nenhuma elevatória encontrada.</CommandEmpty>
            <CommandGroup>
              {filtradas.map((o) => (
                <CommandItem
                  key={o.id}
                  value={String(o.id)}
                  onSelect={() => {
                    onChange(o.id);
                    setOpen(false);
                  }}
                >
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  <span className="truncate">{o.nome}</span>
                  {o.planta && (
                    <span className="ml-auto shrink-0 text-[10px] text-slate-400">{o.planta}</span>
                  )}
                  <Check
                    className={cn(
                      "ml-1 h-3.5 w-3.5 shrink-0",
                      value === o.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function ConferirPendentes({ permissoes: permissoesProp }: Props) {
  const [pendentes, setPendentes] = useState<RegistroAtendimento[]>([]);
  const [elevatorias, setElevatorias] = useState<ElevatoriaOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [vinculando, setVinculando] = useState<number | null>(null);
  const [selecao, setSelecao] = useState<Record<number, number | null>>({});

  const permissoes = useMemo<PermissoesRegistros>(
    () => permissoesProp ?? getPermissoesRegistros(null),
    [permissoesProp],
  );
  const podeVincular = permissoes.criar;

  const carregar = useCallback(async () => {
    setLoading(true);
    const [pendRes, elevRes] = await Promise.all([
      supabase
        .from("registros_atendimento")
        .select("*")
        .is("elevatoria_id", null)
        .order("data_entrada", { ascending: false, nullsFirst: false }),
      supabase.from("elevatorias").select("id, nome, planta").order("nome"),
    ]);
    if (pendRes.error) toast.error("Erro ao carregar pendentes: " + pendRes.error.message);
    else setPendentes((pendRes.data ?? []) as RegistroAtendimento[]);
    if (elevRes.error) toast.error("Erro ao carregar elevatórias: " + elevRes.error.message);
    else setElevatorias((elevRes.data ?? []) as ElevatoriaOpt[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const vincular = async (atend: RegistroAtendimento) => {
    const elevId = selecao[atend.id];
    if (elevId == null) {
      toast.error("Selecione uma elevatória antes de vincular.");
      return;
    }
    setVinculando(atend.id);
    try {
      const { error } = await supabase
        .from("registros_atendimento")
        .update({ elevatoria_id: elevId })
        .eq("id", atend.id);
      if (error) {
        toast.error("Erro ao vincular: " + error.message);
        return;
      }
      setPendentes((prev) => prev.filter((a) => a.id !== atend.id));
      toast.success(`O.S. ${atend.ordem ?? ""} vinculada à elevatória.`);
    } finally {
      setVinculando(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <Loader2 className="h-6 w-6 animate-spin text-[#1f7ad6]" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          O.S. sem elevatória definida — vincule cada registro individualmente.
        </p>
        <Badge
          variant="outline"
          className="border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300"
        >
          {pendentes.length} pendente{pendentes.length === 1 ? "" : "s"}
        </Badge>
      </div>

      {pendentes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 py-10 text-center text-sm text-slate-400 dark:border-slate-600">
          Nenhuma O.S. pendente de conferência.
        </div>
      ) : (
        <div className="space-y-3">
          {pendentes.map((a) => {
            const sel = selecao[a.id] ?? null;
            return (
              <div
                key={a.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-700/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-bold text-[#0b3a73] dark:text-white">
                        {a.ordem ?? "—"}
                      </span>
                      {a.planta && (
                        <Badge
                          variant="outline"
                          className="border-slate-300 text-[10px] text-slate-500 dark:border-slate-500 dark:text-slate-400"
                        >
                          {a.planta}
                        </Badge>
                      )}
                      <span className="text-[10px] text-slate-400">
                        {formatDate(a.data_entrada)}
                      </span>
                    </div>
                    {a.texto_breve && (
                      <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                        {a.texto_breve}
                      </p>
                    )}
                    {a.texto_longo && (
                      <p className="mt-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[13px] text-amber-900 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-100">
                        {a.texto_longo}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    <ElevatoriaCombobox
                      options={elevatorias}
                      value={sel}
                      onChange={(id) => setSelecao((prev) => ({ ...prev, [a.id]: id }))}
                    />
                    <button
                      onClick={() => vincular(a)}
                      disabled={vinculando === a.id || !podeVincular || sel == null}
                      title={!podeVincular ? "Sem permissão para vincular" : ""}
                      className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-[#0b3a73] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#1f7ad6] disabled:opacity-50"
                    >
                      {vinculando === a.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Link2 className="h-3.5 w-3.5" />
                      )}
                      Vincular
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ConferirPendentes;
