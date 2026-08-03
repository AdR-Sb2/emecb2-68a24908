import { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  Calendar,
  Check,
  ChevronsUpDown,
  ClipboardList,
  FileText,
  History,
  Info,
  Link2,
  Loader2,
  Paperclip,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import type { RegistroAtendimento, RegistroInformacao } from "@/lib/registros-types";
import { importarRegistrosSAP } from "@/lib/registros-import";

type Props = {
  elevatoriaId?: string | number;
  permissoes?: PermissoesRegistros;
};

const NATUREZA_CORES: Record<string, string> = {
  corretiva:
    "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800",
  preventiva:
    "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800",
  outras:
    "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600",
};

const STATUS_ENCERRADO = ["Encerrada", "Encerrada Técnica"];

const PLANTA_GUARDA_CHUVA = "pl-rjb-sda1003";

type ElevatoriaOpt = {
  id: number;
  nome: string;
  planta: string | null;
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

export function ListaRegistros({ elevatoriaId, permissoes: permissoesProp }: Props) {
  const { user, profile } = useAuth();
  const [aba, setAba] = useState<"informacao" | "atendimentos">("informacao");
  const [conferirAtivo, setConferirAtivo] = useState(false);
  const [informacoes, setInformacoes] = useState<RegistroInformacao[]>([]);
  const [atendimentos, setAtendimentos] = useState<RegistroAtendimento[]>([]);
  const [elevatorias, setElevatorias] = useState<ElevatoriaOpt[]>([]);
  const [novoTexto, setNovoTexto] = useState("");
  const [elevatoriaSelecionada, setElevatoriaSelecionada] = useState<number | null>(
    elevatoriaId != null && !isNaN(Number(elevatoriaId)) ? Number(elevatoriaId) : null,
  );
  const [loading, setLoading] = useState(true);
  const [importando, setImportando] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("TODOS");
  const [filtroNatureza, setFiltroNatureza] = useState("TODAS");
  const [anexando, setAnexando] = useState<number | null>(null);
  const [removendo, setRemovendo] = useState<number | null>(null);
  const [vinculando, setVinculando] = useState<number | null>(null);
  const [selecao, setSelecao] = useState<Record<number, number | null>>({});
  const importRef = useRef<HTMLInputElement>(null);
  const anexoRef = useRef<Record<number, HTMLInputElement | null>>({});

  const permissoes = useMemo<PermissoesRegistros>(
    () => permissoesProp ?? getPermissoesRegistros(profile?.cargo_nome),
    [permissoesProp, profile?.cargo_nome],
  );

  const podeVisualizar = permissoes.visualizar;
  const podeCriar = permissoes.criar;
  const podeImportar = permissoes.importar;
  const podeAnexarPdf = permissoes.anexarPdf;

  useEffect(() => {
    if (!podeVisualizar) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      const elevNum =
        elevatoriaId != null && !isNaN(Number(elevatoriaId)) ? Number(elevatoriaId) : null;

      const infoQuery = supabase
        .from("registros_informacao")
        .select("*, profiles:autor_id(nome_completo)");
      const atendQuery = supabase.from("registros_atendimento").select("*");

      if (elevNum != null) {
        infoQuery.eq("elevatoria_id", elevNum);
        atendQuery.eq("elevatoria_id", elevNum);
      }

      const [infoRes, atendRes, elevRes] = await Promise.all([
        infoQuery.order("criado_em", { ascending: false }).limit(300),
        atendQuery.order("data_entrada", { ascending: false, nullsFirst: false }).limit(500),
        supabase.from("elevatorias").select("id, nome, planta").order("nome"),
      ]);

      if (!active) return;
      if (infoRes.error) toast.error("Erro ao carregar informações: " + infoRes.error.message);
      else {
        setInformacoes(
          (infoRes.data ?? []).map((r) => ({
            ...r,
            autor_nome: (r.profiles as { nome_completo?: string } | null)?.nome_completo ?? null,
          })) as RegistroInformacao[],
        );
      }
      if (atendRes.error) toast.error("Erro ao carregar atendimentos: " + atendRes.error.message);
      else setAtendimentos((atendRes.data ?? []) as RegistroAtendimento[]);
      if (elevRes.data) setElevatorias(elevRes.data as ElevatoriaOpt[]);
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, [podeVisualizar, elevatoriaId]);

  const plantasCadastradas = useMemo(() => {
    const s = new Set<string>();
    for (const e of elevatorias) {
      if (e.planta) s.add(e.planta.trim().toLowerCase());
    }
    return s;
  }, [elevatorias]);

  const atendimentosUniverso = useMemo(() => {
    if (elevatoriaId != null) return atendimentos;
    return atendimentos.filter((a) => {
      if (!a.planta) return false;
      const planta = a.planta.trim().toLowerCase();
      return plantasCadastradas.has(planta) || planta === PLANTA_GUARDA_CHUVA;
    });
  }, [atendimentos, elevatoriaId, plantasCadastradas]);

  const atendimentosFiltrados = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return atendimentosUniverso.filter((a) => {
      if (conferirAtivo && a.elevatoria_id != null) return false;
      if (filtroNatureza !== "TODAS" && (a.natureza ?? "outras") !== filtroNatureza) return false;
      if (filtroStatus !== "TODOS" && a.status_simplificado !== filtroStatus) return false;
      if (!b) return true;
      return [a.ordem, a.texto_breve, a.nota, a.planta, a.local_instalacao]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(b));
    });
  }, [atendimentosUniverso, conferirAtivo, busca, filtroStatus, filtroNatureza]);

  const adicionarInformacao = async () => {
    if (!podeCriar || !novoTexto.trim()) return;
    if (elevatoriaSelecionada == null) {
      toast.error("Selecione a elevatória antes de adicionar uma informação.");
      return;
    }
    const { data, error } = await supabase.rpc("adicionar_registro_informacao", {
      p_elevatoria_id: elevatoriaSelecionada,
      p_texto: novoTexto.trim(),
      p_autor_id: user?.id ?? null,
    });
    if (error) {
      toast.error("Erro ao adicionar informação: " + error.message);
      return;
    }
    const reg = data as RegistroInformacao | null;
    if (reg)
      setInformacoes((prev) => [{ ...reg, autor_nome: profile?.nome_completo ?? null }, ...prev]);
    setNovoTexto("");
  };

  const importar = async (file: File) => {
    try {
      setImportando(true);
      const resumo = await importarRegistrosSAP(file);
      toast.success(
        `Importação concluída: ${resumo.importados} novos, ${resumo.atualizados} atualizados, ${resumo.semElevatoria} sem elevatória.`,
      );
      const elevNum =
        elevatoriaId != null && !isNaN(Number(elevatoriaId)) ? Number(elevatoriaId) : null;
      let query = supabase.from("registros_atendimento").select("*");
      if (elevNum != null) query = query.eq("elevatoria_id", elevNum);
      const { data } = await query
        .order("data_entrada", { ascending: false, nullsFirst: false })
        .limit(500);
      if (data) setAtendimentos(data as RegistroAtendimento[]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao importar a planilha.");
    } finally {
      setImportando(false);
    }
  };

  const anexarPdf = async (atend: RegistroAtendimento, file: File) => {
    if (!podeAnexarPdf) return;
    if (file.type !== "application/pdf") {
      toast.error("Anexe apenas arquivos PDF.");
      return;
    }
    setAnexando(atend.id);
    try {
      const path = `atendimentos/${atend.id}.pdf`;
      const { error: upErr } = await supabase.storage
        .from("registros")
        .upload(path, file, { upsert: true, contentType: "application/pdf" });
      if (upErr) {
        toast.error("Erro no upload do PDF: " + upErr.message);
        return;
      }
      const { data: pub } = supabase.storage.from("registros").getPublicUrl(path);
      const url = pub?.publicUrl ?? null;
      const agora = new Date().toISOString();
      const { error } = await supabase
        .from("registros_atendimento")
        .update({ pdf_anexo_url: url, anexado_por: user?.id ?? null, anexado_em: agora })
        .eq("id", atend.id);
      if (error) {
        toast.error("Erro ao salvar anexo: " + error.message);
        return;
      }
      setAtendimentos((prev) =>
        prev.map((a) => (a.id === atend.id ? { ...a, pdf_anexo_url: url, anexado_em: agora } : a)),
      );
      toast.success("PDF anexado com sucesso");
    } finally {
      setAnexando(null);
    }
  };

  const removerPdf = async (atend: RegistroAtendimento) => {
    if (!podeAnexarPdf) return;
    setRemovendo(atend.id);
    try {
      await supabase.storage.from("registros").remove([`atendimentos/${atend.id}.pdf`]);
      const { error } = await supabase
        .from("registros_atendimento")
        .update({ pdf_anexo_url: null, anexado_por: null, anexado_em: null })
        .eq("id", atend.id);
      if (error) {
        toast.error("Erro ao remover o PDF: " + error.message);
        return;
      }
      setAtendimentos((prev) =>
        prev.map((a) =>
          a.id === atend.id
            ? { ...a, pdf_anexo_url: null, anexado_por: null, anexado_em: null }
            : a,
        ),
      );
      toast.success("PDF removido com sucesso");
    } finally {
      setRemovendo(null);
    }
  };

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
      setAtendimentos((prev) =>
        prev.map((a) => (a.id === atend.id ? { ...a, elevatoria_id: elevId } : a)),
      );
      setSelecao((prev) => {
        const next = { ...prev };
        delete next[atend.id];
        return next;
      });
      toast.success(`O.S. ${atend.ordem ?? ""} vinculada à elevatória.`);
    } finally {
      setVinculando(null);
    }
  };

  const alternarConferir = (on: boolean) => {
    setConferirAtivo(on);
    if (on) setAba("atendimentos");
  };

  const nomeElevatoria = (id: number | null) =>
    id == null ? null : (elevatorias.find((e) => e.id === id)?.nome ?? null);

  if (!podeVisualizar) return null;

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <Loader2 className="h-6 w-6 animate-spin text-[#1f7ad6]" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#0b3a73] dark:text-white">
          <History className="h-4 w-4" /> Registros
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          {elevatoriaId == null && (
            <label className="flex cursor-pointer items-center gap-2 text-[13px] font-semibold text-slate-600 dark:text-slate-300">
              <Switch checked={conferirAtivo} onCheckedChange={alternarConferir} />
              Conferir
            </label>
          )}
          {podeImportar && (
            <button
              onClick={() => importRef.current?.click()}
              disabled={importando}
              className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {importando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Importar planilha
            </button>
          )}
          <input
            ref={importRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              await importar(file);
              if (importRef.current) importRef.current.value = "";
            }}
          />
        </div>
      </div>

      <Tabs value={aba} onValueChange={(v) => setAba(v as "informacao" | "atendimentos")}>
        <TabsList className="bg-slate-100 dark:bg-slate-700">
          <TabsTrigger value="informacao" className="gap-1.5">
            <Info className="h-4 w-4" /> Informação
          </TabsTrigger>
          <TabsTrigger value="atendimentos" className="gap-1.5">
            <ClipboardList className="h-4 w-4" /> Atendimentos ({atendimentosUniverso.length})
          </TabsTrigger>
        </TabsList>

        {/* ---- Aba Informação ---- */}
        <TabsContent value="informacao" className="space-y-3">
          {elevatoriaId == null && (
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Elevatória
              </label>
              <select
                value={elevatoriaSelecionada ?? ""}
                onChange={(e) =>
                  setElevatoriaSelecionada(e.target.value ? Number(e.target.value) : null)
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              >
                <option value="">Selecione...</option>
                {elevatorias.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          {podeCriar && (
            <div className="flex gap-2">
              <textarea
                value={novoTexto}
                onChange={(e) => setNovoTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    adicionarInformacao();
                  }
                }}
                rows={2}
                placeholder="Digite uma informação sobre a elevatória..."
                className="flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1f7ad6] focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              />
              <button
                onClick={adicionarInformacao}
                disabled={!novoTexto.trim() || elevatoriaSelecionada == null}
                className="inline-flex min-h-10 items-center gap-1 self-end rounded-lg bg-[#0b3a73] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1f7ad6] disabled:opacity-50"
              >
                <Plus className="h-4 w-4" /> Adicionar
              </button>
            </div>
          )}

          {informacoes.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              Nenhuma informação registrada.
            </p>
          ) : (
            <div className="max-h-[400px] space-y-2 overflow-y-auto pr-1">
              {informacoes.map((i) => (
                <div
                  key={i.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-700/40"
                >
                  <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
                    {i.texto}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-400">
                    <span>{i.criado_em ? new Date(i.criado_em).toLocaleString("pt-BR") : ""}</span>
                    {i.autor_nome && <span>· {i.autor_nome}</span>}
                    {nomeElevatoria(i.elevatoria_id) && (
                      <>
                        <span>·</span>
                        <span className="font-semibold text-slate-500 dark:text-slate-300">
                          {nomeElevatoria(i.elevatoria_id)}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ---- Aba Atendimentos ---- */}
        <TabsContent value="atendimentos" className="space-y-3">
          {conferirAtivo && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[13px] text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
              Modo conferência: exibindo apenas O.S. sem elevatória vinculada.
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por ordem, texto, nota..."
                className="w-full rounded-lg border border-slate-300 py-2 pl-8 pr-3 text-sm focus:border-[#1f7ad6] focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              />
            </div>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            >
              <option value="TODOS">Status: todos</option>
              {["Aberta", "Liberada", "Encerrada", "Encerrada Técnica"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={filtroNatureza}
              onChange={(e) => setFiltroNatureza(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            >
              <option value="TODAS">Natureza: todas</option>
              <option value="corretiva">Corretiva</option>
              <option value="preventiva">Preventiva</option>
              <option value="outras">Outras</option>
            </select>
          </div>

          {atendimentosFiltrados.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 py-8 text-center text-sm text-slate-400 dark:border-slate-600">
              {conferirAtivo
                ? "Nenhuma O.S. pendente de conferência."
                : "Nenhum atendimento encontrado."}
              {podeImportar && (
                <button
                  onClick={() => importRef.current?.click()}
                  className="mx-auto mt-2 block font-semibold text-[#1f7ad6] hover:underline"
                >
                  Importar planilha do SAP
                </button>
              )}
            </div>
          ) : (
            <div className="max-h-[500px] space-y-2 overflow-y-auto pr-1">
              {atendimentosFiltrados.map((a) => {
                const natureza = a.natureza ?? "outras";
                const encerrado = STATUS_ENCERRADO.includes(a.status_simplificado ?? "");
                const semVinculo = a.elevatoria_id == null;
                return (
                  <div
                    key={a.id}
                    className={`rounded-lg border bg-slate-50 p-3 dark:bg-slate-700/40 ${
                      semVinculo
                        ? "border-amber-300 dark:border-amber-700"
                        : "border-slate-200 dark:border-slate-600"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-bold text-[#0b3a73] dark:text-white">
                            {a.ordem ?? "—"}
                          </span>
                          <Badge
                            className={`border ${NATUREZA_CORES[natureza] ?? NATUREZA_CORES.outras}`}
                          >
                            {natureza === "corretiva"
                              ? "Corretiva"
                              : natureza === "preventiva"
                                ? "Preventiva"
                                : "Outras"}
                          </Badge>
                          {a.status_simplificado ? (
                            <Badge
                              variant="outline"
                              className="border-slate-300 text-slate-600 dark:border-slate-500 dark:text-slate-300"
                            >
                              {a.status_simplificado}
                            </Badge>
                          ) : a.status_sistema ? (
                            <Badge
                              variant="outline"
                              className="border-slate-300 text-slate-500 dark:border-slate-500 dark:text-slate-400"
                            >
                              {a.status_sistema}
                            </Badge>
                          ) : null}
                          {a.prioridade && (
                            <Badge
                              variant="outline"
                              className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                            >
                              {a.prioridade}
                            </Badge>
                          )}
                          {semVinculo && (
                            <Badge
                              variant="outline"
                              className="border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300"
                            >
                              Sem elevatória
                            </Badge>
                          )}
                        </div>
                        {a.texto_breve && (
                          <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                            {a.texto_breve}
                          </p>
                        )}
                        {a.nota && (
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            Nota: {a.nota}
                          </p>
                        )}
                        {a.texto_longo && (
                          <p
                            className={`mt-1.5 whitespace-pre-wrap rounded-md border px-2.5 py-1.5 text-[13px] ${
                              semVinculo
                                ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-100"
                                : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            {a.texto_longo}
                          </p>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-400">
                          {a.data_entrada && (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> {formatDate(a.data_entrada)}
                            </span>
                          )}
                          {nomeElevatoria(a.elevatoria_id) && (
                            <span>· {nomeElevatoria(a.elevatoria_id)}</span>
                          )}
                          {a.planta && <span>· {a.planta}</span>}
                          {a.local_instalacao && a.local_instalacao !== a.planta && (
                            <span>· {a.local_instalacao}</span>
                          )}
                          {a.criado_por && <span>· Criado por {a.criado_por}</span>}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {a.pdf_anexo_url ? (
                          <>
                            <a
                              href={a.pdf_anexo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[#1f7ad6] bg-[#eaf3fb] px-2.5 py-1.5 text-[11px] font-semibold text-[#1f7ad6] transition hover:bg-[#d4e6f7] dark:border-[#38bdf8] dark:bg-slate-700 dark:text-[#38bdf8] dark:hover:bg-slate-600"
                            >
                              <FileText className="h-3.5 w-3.5" /> Ver PDF
                            </a>
                            {podeAnexarPdf && (
                              <button
                                onClick={() => removerPdf(a)}
                                disabled={removendo === a.id}
                                className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/40"
                              >
                                {removendo === a.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                                Remover
                              </button>
                            )}
                          </>
                        ) : podeAnexarPdf && encerrado ? (
                          <button
                            onClick={() => anexoRef.current[a.id]?.click()}
                            disabled={anexando === a.id}
                            className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                          >
                            {anexando === a.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Paperclip className="h-3.5 w-3.5" />
                            )}
                            Anexar PDF
                          </button>
                        ) : null}
                        <input
                          ref={(el) => {
                            anexoRef.current[a.id] = el;
                          }}
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            await anexarPdf(a, file);
                            if (anexoRef.current[a.id]) anexoRef.current[a.id]!.value = "";
                          }}
                        />
                      </div>
                    </div>

                    {semVinculo && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-dashed border-slate-200 pt-2.5 dark:border-slate-600">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Vincular à elevatória
                        </span>
                        <ElevatoriaCombobox
                          options={elevatorias}
                          value={selecao[a.id] ?? null}
                          onChange={(id) => setSelecao((prev) => ({ ...prev, [a.id]: id }))}
                          disabled={!podeCriar}
                        />
                        <button
                          onClick={() => vincular(a)}
                          disabled={vinculando === a.id || !podeCriar || selecao[a.id] == null}
                          title={!podeCriar ? "Sem permissão para vincular" : ""}
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
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ListaRegistros;
