import { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  Calendar,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ClipboardList,
  FileText,
  Hash,
  History,
  ImagePlus,
  Info,
  Link2,
  Loader2,
  MapPin,
  Paperclip,
  Plus,
  Search,
  Trash2,
  Upload,
  User,
  X,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getPermissoesRegistros, type PermissoesRegistros } from "@/lib/registros-permissoes";
import type {
  RegistroAtendimento,
  RegistroInformacao,
  RegistroInformacaoFoto,
} from "@/lib/registros-types";
import { TIPOS_ORDEM } from "@/lib/registros-types";
import { importarRegistrosSAP } from "@/lib/registros-import";

type Props = {
  elevatoriaId?: string | number;
  permissoes?: PermissoesRegistros;
};

const BUCKET_FOTOS = "registros";

function storagePathFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const marker = "/object/public/registros/";
    const idx = u.pathname.indexOf(marker);
    if (idx >= 0) return u.pathname.slice(idx + marker.length);
  } catch {
    /* url inválida */
  }
  return "";
}

function fotoStoragePath(registroId: number, arquivo: File): string {
  const nome = arquivo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `informacoes/${registroId}/${Date.now()}-${nome}`;
}

function formatDataHora(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

const NATUREZA_CORES: Record<string, string> = {
  EMERGENCIAL:
    "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800",
  PROGRAMADA:
    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800",
  SERVIÇOS:
    "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-800",
  "CONTROLE OPERACIONAL":
    "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800",
  MELHORIA:
    "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800",
  "PREV. CONDIÇÂO":
    "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-800",
  "PREV. FREQUENCIA":
    "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800",
  outras:
    "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600",
};

const STATUS_ENCERRADO = ["Encerrada", "Encerrada Técnica"];

const PLANTA_GUARDA_CHUVA = "PL-RJB-SDA1003";

const LOTE_CARGA = 1000;

const PADRAO_TAMANHO_PAGINA = 500;
const OPCOES_TAMANHO_PAGINA = [200, 500, 1000] as const;

type AtendQuery = {
  range(from: number, to: number): unknown;
  not(column: string, operator: string, value: string): unknown;
  is(column: string, value: null): unknown;
  eq(column: string, value: string): unknown;
  or(filters: string): unknown;
  in(column: string, values: string[]): unknown;
  order(column: string, options?: unknown): unknown;
};

const ATEND_COLUNAS =
  "id, elevatoria_id, planta, ordem, nota, texto_breve, texto_longo, tipo_ordem, natureza, prioridade, status_sistema, status_simplificado, data_entrada, data_modificacao, pdf_anexo_url, anexado_por, anexado_em, local_instalacao, criado_por";

async function buscarLoteAtendimentos(
  query: AtendQuery,
  offset: number,
  lote: number,
): Promise<RegistroAtendimento[] | null> {
  const { data, error } = (await query.range(offset, offset + lote - 1)) as {
    data: RegistroAtendimento[] | null;
    error: { message: string } | null;
  };
  if (error) {
    toast.error("Erro ao carregar atendimentos: " + error.message);
    return null;
  }
  return data ?? [];
}

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
  const [atendimentosCarregados, setAtendimentosCarregados] = useState(false);
  const [carregandoAtendimentos, setCarregandoAtendimentos] = useState(false);
  const [elevatorias, setElevatorias] = useState<ElevatoriaOpt[]>([]);
  const [novoTexto, setNovoTexto] = useState("");
  const [novasFotos, setNovasFotos] = useState<{ file: File; preview: string }[]>([]);
  const [salvandoInformacao, setSalvandoInformacao] = useState(false);
  const [removendoFoto, setRemovendoFoto] = useState<number | null>(null);
  const [cameraAberto, setCameraAberto] = useState(false);
  const [cameraPronta, setCameraPronta] = useState(false);
  const [cameraErro, setCameraErro] = useState<string | null>(null);
  const [capturando, setCapturando] = useState(false);
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [elevatoriaSelecionada, setElevatoriaSelecionada] = useState<number | null>(
    elevatoriaId != null && !isNaN(Number(elevatoriaId)) ? Number(elevatoriaId) : null,
  );
  const [loading, setLoading] = useState(true);
  const [importando, setImportando] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("TODOS");
  const [filtroNatureza, setFiltroNatureza] = useState("TODAS");
  const [buscaDebounced, setBuscaDebounced] = useState("");
  const [tamanhoPagina, setTamanhoPagina] = useState(PADRAO_TAMANHO_PAGINA);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalAtendimentos, setTotalAtendimentos] = useState<number | null>(null);
  const [anexando, setAnexando] = useState<number | null>(null);
  const [removendo, setRemovendo] = useState<number | null>(null);
  const [vinculando, setVinculando] = useState<number | null>(null);
  const [ordemCopiada, setOrdemCopiada] = useState<string | null>(null);
  const [selecao, setSelecao] = useState<Record<number, number | null>>({});
  const importRef = useRef<HTMLInputElement>(null);
  const anexoRef = useRef<Record<number, HTMLInputElement | null>>({});
  const atendReqId = useRef(0);
  const atendimentosLenRef = useRef(0);

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

      if (elevNum != null) infoQuery.eq("elevatoria_id", elevNum);

      const elevQuery =
        elevNum != null
          ? supabase.from("elevatorias").select("id, nome, planta").eq("id", elevNum)
          : supabase.from("elevatorias").select("id, nome, planta").order("nome");

      const [infoRes, elevRes] = await Promise.all([
        infoQuery.order("criado_em", { ascending: false }).limit(300),
        elevQuery,
      ]);

      if (!active) return;
      if (elevRes.error) console.warn("Falha ao carregar elevatórias: " + elevRes.error.message);
      else if (elevRes.data) setElevatorias(elevRes.data as ElevatoriaOpt[]);
      if (infoRes.error) toast.error("Erro ao carregar informações: " + infoRes.error.message);
      else {
        const lista = (
          (infoRes.data ?? []) as (RegistroInformacao & {
            profiles?: { nome_completo?: string } | null;
          })[]
        ).map((r) => ({
          ...r,
          autor_nome: r.profiles?.nome_completo ?? null,
          fotos: [] as RegistroInformacaoFoto[],
        })) as RegistroInformacao[];

        if (lista.length > 0) {
          const ids = lista.map((r) => r.id);
          const { data: fotos, error: fotosErr } = await supabase
            .from("registros_informacao_fotos")
            .select("*")
            .in("registro_id", ids)
            .order("criado_em", { ascending: false });
          if (fotosErr) {
            console.warn("Falha ao carregar fotos: " + fotosErr.message);
          } else if (fotos) {
            const porRegistro = new Map<number, RegistroInformacaoFoto[]>();
            for (const f of fotos as RegistroInformacaoFoto[]) {
              const arr = porRegistro.get(f.registro_id);
              if (arr) arr.push(f);
              else porRegistro.set(f.registro_id, [f]);
            }
            for (const r of lista) r.fotos = porRegistro.get(r.id) ?? [];
          }
        }
        setInformacoes(lista);
      }
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, [podeVisualizar, elevatoriaId]);

  const montarQueryAtendimentos = () => {
    const elevNum =
      elevatoriaId != null && !isNaN(Number(elevatoriaId)) ? Number(elevatoriaId) : null;

    let query = supabase.from("registros_atendimento").select(ATEND_COLUNAS);
    let countQuery = supabase.from("registros_atendimento").select("*", {
      count: "exact",
      head: true,
    });

    if (elevNum != null) {
      query = query.eq("elevatoria_id", elevNum);
      countQuery = countQuery.eq("elevatoria_id", elevNum);
    } else {
      const plantas = elevatorias.map((e) => e.planta).filter((p): p is string => Boolean(p));
      const lista = [...new Set([...plantas, PLANTA_GUARDA_CHUVA])];
      if (lista.length) {
        query = query.in("planta", lista);
        countQuery = countQuery.in("planta", lista);
      }
    }

    if (conferirAtivo) {
      query = query.is("elevatoria_id", null);
      countQuery = countQuery.is("elevatoria_id", null);
    }

    if (filtroStatus !== "TODOS") {
      query = query.eq("status_simplificado", filtroStatus);
      countQuery = countQuery.eq("status_simplificado", filtroStatus);
    }

    if (filtroNatureza !== "TODAS") {
      if (filtroNatureza === "outras") {
        query = query.not("natureza", "in", `(${TIPOS_ORDEM.join(",")})`);
        countQuery = countQuery.not("natureza", "in", `(${TIPOS_ORDEM.join(",")})`);
      } else {
        query = query.eq("natureza", filtroNatureza);
        countQuery = countQuery.eq("natureza", filtroNatureza);
      }
    }

    const termo = buscaDebounced
      .trim()
      .replace(/[%,()*"\\]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (termo) {
      const buscaStr = `ordem.ilike.%${termo}%,texto_breve.ilike.%${termo}%,nota.ilike.%${termo}%,planta.ilike.%${termo}%,local_instalacao.ilike.%${termo}%`;
      query = query.or(buscaStr);
      countQuery = countQuery.or(buscaStr);
    }

    query = query
      .order("data_entrada", { ascending: false, nullsFirst: false })
      .order("data_modificacao", { ascending: false, nullsFirst: false })
      .order("criado_em", { ascending: false });
    return { query, countQuery };
  };

  const recarregarAtendimentos = async () => {
    if (!podeVisualizar) return;
    if (elevatoriaId == null && elevatorias.length === 0) return;
    const reqId = ++atendReqId.current;
    setCarregandoAtendimentos(true);
    const { query, countQuery } = montarQueryAtendimentos();

    const { count, error: countError } = await countQuery;
    if (reqId !== atendReqId.current) return;
    if (countError) {
      toast.error("Erro ao carregar atendimentos: " + countError.message);
      setAtendimentosCarregados(true);
      setCarregandoAtendimentos(false);
      return;
    }

    setTotalAtendimentos(count ?? 0);
    const dados = await buscarLoteAtendimentos(query, 0, LOTE_CARGA);
    if (reqId !== atendReqId.current) return;
    if (dados) {
      atendimentosLenRef.current = dados.length;
      setAtendimentos(dados);
      setPaginaAtual(1);
    }
    setAtendimentosCarregados(true);
    setCarregandoAtendimentos(false);
  };

  const carregarProximoLote = async () => {
    if (carregandoAtendimentos) return;
    if (atendimentosLenRef.current >= (totalAtendimentos ?? 0)) return;
    const reqId = atendReqId.current;
    setCarregandoAtendimentos(true);
    const { query } = montarQueryAtendimentos();
    const dados = await buscarLoteAtendimentos(query, atendimentosLenRef.current, LOTE_CARGA);
    if (reqId !== atendReqId.current) return;
    if (dados && dados.length) {
      atendimentosLenRef.current += dados.length;
      setAtendimentos((prev) => [...prev, ...dados]);
    }
    setCarregandoAtendimentos(false);
  };

  useEffect(() => {
    if (aba !== "atendimentos") return;
    recarregarAtendimentos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba, buscaDebounced, filtroStatus, filtroNatureza, conferirAtivo, elevatoriaId, elevatorias]);

  useEffect(() => {
    if (aba !== "atendimentos" || !atendimentosCarregados) return;
    const fimDesejado = paginaAtual * tamanhoPagina;
    if (
      atendimentosLenRef.current < fimDesejado &&
      atendimentosLenRef.current < (totalAtendimentos ?? 0)
    ) {
      carregarProximoLote();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    aba,
    paginaAtual,
    tamanhoPagina,
    atendimentosCarregados,
    atendimentos.length,
    totalAtendimentos,
  ]);

  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca), 400);
    return () => clearTimeout(t);
  }, [busca]);

  useEffect(() => {
    const v = profile?.tamanho_pagina_atendimentos;
    if (v && v > 0) setTamanhoPagina(v);
  }, [profile?.tamanho_pagina_atendimentos]);

  const totalPaginas =
    totalAtendimentos != null ? Math.max(1, Math.ceil(totalAtendimentos / tamanhoPagina)) : 1;

  const atendimentosPagina = useMemo(() => {
    const inicio = (paginaAtual - 1) * tamanhoPagina;
    return atendimentos.slice(inicio, Math.min(paginaAtual * tamanhoPagina, atendimentos.length));
  }, [atendimentos, paginaAtual, tamanhoPagina]);

  const irParaPagina = (p: number) => {
    setPaginaAtual(Math.min(Math.max(1, p), totalPaginas));
  };

  const copiarOrdem = async (ordem: string) => {
    try {
      await navigator.clipboard.writeText(ordem);
      setOrdemCopiada(ordem);
      setTimeout(() => setOrdemCopiada((cur) => (cur === ordem ? null : cur)), 1500);
    } catch {
      toast.error("Não foi possível copiar a ordem.");
    }
  };

  const adicionarInformacao = async () => {
    if (!podeCriar || !novoTexto.trim()) return;
    if (elevatoriaSelecionada == null) {
      toast.error("Selecione a elevatória antes de adicionar uma informação.");
      return;
    }
    if (salvandoInformacao) return;
    setSalvandoInformacao(true);
    try {
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
      if (!reg) return;

      const fotosCriadas: RegistroInformacaoFoto[] = [];
      if (novasFotos.length > 0) {
        const urls: string[] = [];
        for (const f of novasFotos) {
          const path = fotoStoragePath(reg.id, f.file);
          const { error: upErr } = await supabase.storage
            .from(BUCKET_FOTOS)
            .upload(path, f.file, { upsert: false, contentType: f.file.type });
          if (upErr) {
            toast.error("Erro no upload da foto: " + upErr.message);
            continue;
          }
          const { data: pub } = supabase.storage.from(BUCKET_FOTOS).getPublicUrl(path);
          urls.push(pub?.publicUrl ?? path);
        }
        if (urls.length > 0) {
          const { data: rows, error: insErr } = await supabase
            .from("registros_informacao_fotos")
            .insert(urls.map((url) => ({ registro_id: reg.id, url, autor_id: user?.id ?? null })))
            .select();
          if (insErr) {
            toast.error("Erro ao salvar fotos: " + insErr.message);
          } else {
            fotosCriadas.push(...((rows as RegistroInformacaoFoto[]) ?? []));
          }
        }
      }

      setInformacoes((prev) => [
        {
          ...reg,
          autor_nome: profile?.nome_completo ?? null,
          fotos: fotosCriadas,
        },
        ...prev,
      ]);
      setNovoTexto("");
      setNovasFotos([]);
      if (fotoInputRef.current) fotoInputRef.current.value = "";
    } finally {
      setSalvandoInformacao(false);
    }
  };

  const adicionarFotosAoNovo = (files: FileList | null) => {
    if (!files) return;
    const aceitos: { file: File; preview: string }[] = [];
    for (const file of Array.from(files)) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
        toast.error(`"${file.name}" não é uma imagem JPG, PNG ou WEBP.`);
        continue;
      }
      aceitos.push({ file, preview: URL.createObjectURL(file) });
    }
    if (aceitos.length) {
      setNovasFotos((prev) => [...prev, ...aceitos]);
    }
  };

  const removerFotoNovo = (idx: number) => {
    setNovasFotos((prev) => {
      const alvo = prev[idx];
      if (alvo) URL.revokeObjectURL(alvo.preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const pararCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraPronta(false);
  };

  const iniciarCamera = async () => {
    setCameraErro(null);
    setCameraPronta(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {
          /* o play pode falhar se o vídeo ainda não estiver visível; ok */
        }
      }
      setCameraPronta(true);
    } catch {
      setCameraErro("Não foi possível acessar a câmera. Verifique a permissão do navegador.");
    }
  };

  const abrirCamera = () => {
    setCameraAberto(true);
    window.setTimeout(() => {
      void iniciarCamera();
    }, 80);
  };

  const fecharCamera = () => {
    pararCamera();
    setCameraAberto(false);
  };

  const capturarFoto = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || capturando) return;
    setCapturando(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")?.drawImage(video, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], `foto-${Date.now()}.jpg`, { type: "image/jpeg" });
            const preview = URL.createObjectURL(blob);
            setNovasFotos((prev) => [...prev, { file, preview }]);
            toast.success("Foto capturada. Clique em Adicionar para salvar.");
          }
          setCapturando(false);
        },
        "image/jpeg",
        0.85,
      );
    } catch {
      setCapturando(false);
      toast.error("Falha ao capturar a foto.");
    }
  };

  useEffect(() => {
    return () => pararCamera();
  }, []);

  const removerFoto = async (f: RegistroInformacaoFoto) => {
    if (!podeCriar || removendoFoto != null) return;
    setRemovendoFoto(f.id);
    try {
      const { error } = await supabase.from("registros_informacao_fotos").delete().eq("id", f.id);
      if (error) {
        toast.error("Erro ao remover foto: " + error.message);
        return;
      }
      const path = storagePathFromUrl(f.url);
      if (path) await supabase.storage.from(BUCKET_FOTOS).remove([path]);
      setInformacoes((prev) =>
        prev.map((i) =>
          i.id === f.registro_id
            ? { ...i, fotos: (i.fotos ?? []).filter((x) => x.id !== f.id) }
            : i,
        ),
      );
      toast.success("Foto removida.");
    } finally {
      setRemovendoFoto(null);
    }
  };

  const importar = async (file: File) => {
    try {
      setImportando(true);
      const resumo = await importarRegistrosSAP(file);
      toast.success(
        `Importação concluída: ${resumo.importados} novos, ${resumo.atualizados} atualizados, ${resumo.semElevatoria} sem elevatória.`,
      );
      if (aba === "atendimentos") {
        await recarregarAtendimentos();
      } else {
        atendimentosLenRef.current = 0;
        setAtendimentos([]);
        setAtendimentosCarregados(false);
        setTotalAtendimentos(null);
      }
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
      if (conferirAtivo) {
        setAtendimentos((prev) => prev.filter((a) => a.id !== atend.id));
        atendimentosLenRef.current = Math.max(0, atendimentosLenRef.current - 1);
        setTotalAtendimentos((cur) => (cur != null ? Math.max(0, cur - 1) : cur));
      } else {
        setAtendimentos((prev) =>
          prev.map((a) => (a.id === atend.id ? { ...a, elevatoria_id: elevId } : a)),
        );
      }
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
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5 dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
            <ClipboardList className="h-4 w-4" /> Atendimentos
            {atendimentosCarregados ? ` (${totalAtendimentos ?? atendimentos.length})` : ""}
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
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-700/40">
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
                  className="flex-1 resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#1f7ad6] focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                />
                <button
                  onClick={adicionarInformacao}
                  disabled={
                    !novoTexto.trim() || elevatoriaSelecionada == null || salvandoInformacao
                  }
                  className="inline-flex min-h-10 items-center gap-1 self-end rounded-lg bg-[#0b3a73] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1f7ad6] disabled:opacity-50"
                >
                  {salvandoInformacao ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Adicionar
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fotoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    adicionarFotosAoNovo(e.target.files);
                    if (fotoInputRef.current) fotoInputRef.current.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => abrirCamera()}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <Camera className="h-4 w-4" />
                  Tirar foto
                </button>
                <button
                  type="button"
                  onClick={() => fotoInputRef.current?.click()}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <ImagePlus className="h-4 w-4" />
                  Escolher da galeria
                  {novasFotos.length > 0 && (
                    <span className="rounded-full bg-[#1f7ad6] px-1.5 text-[10px] font-bold text-white">
                      {novasFotos.length}
                    </span>
                  )}
                </button>
                {novasFotos.length > 0 && (
                  <span className="text-[11px] text-slate-400">
                    As fotos serão enviadas junto com a informação.
                  </span>
                )}
              </div>
              {novasFotos.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {novasFotos.map((f, idx) => (
                    <div key={idx} className="group relative">
                      <img
                        src={f.preview}
                        alt=""
                        className="h-16 w-16 rounded-lg border border-slate-200 object-cover dark:border-slate-600"
                      />
                      <button
                        type="button"
                        onClick={() => removerFotoNovo(idx)}
                        title="Remover foto"
                        className="absolute -right-1.5 -top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition hover:bg-red-600 group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Dialog da câmera para tirar foto */}
          <Dialog open={cameraAberto} onOpenChange={(o) => !o && fecharCamera()}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-[#0b3a73] dark:text-white">
                  <Camera className="mr-1 inline h-4 w-4" /> Tirar foto
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-slate-200 bg-black dark:border-slate-600">
                  <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
                  {!cameraPronta && !cameraErro && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    </div>
                  )}
                  {cameraErro && (
                    <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-red-300">
                      {cameraErro}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={capturarFoto}
                    disabled={!cameraPronta || capturando}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[#0b3a73] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1f7ad6] disabled:opacity-50"
                  >
                    {capturando ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                    Capturar foto
                  </button>
                  <button
                    type="button"
                    onClick={fecharCamera}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Fechar
                  </button>
                </div>
                <p className="text-center text-[11px] text-slate-400">
                  A foto capturada entra na lista de fotos do registro. Pode tirar várias antes de
                  clicar em Adicionar.
                </p>
              </div>
            </DialogContent>
          </Dialog>

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
                    <span>{i.criado_em ? formatDataHora(i.criado_em) : ""}</span>
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
                  {(i.fotos ?? []).length > 0 && (
                    <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {(i.fotos ?? []).map((f) => (
                        <div key={f.id} className="group relative">
                          <a href={f.url} target="_blank" rel="noopener noreferrer">
                            <img
                              src={f.url}
                              alt=""
                              loading="lazy"
                              className="h-20 w-full rounded-md border border-slate-200 object-cover dark:border-slate-600"
                            />
                          </a>
                          {podeCriar && (
                            <button
                              type="button"
                              onClick={() => removerFoto(f)}
                              disabled={removendoFoto === f.id}
                              title="Remover foto"
                              className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition hover:bg-red-600 disabled:opacity-50 group-hover:opacity-100"
                            >
                              {removendoFoto === f.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <X className="h-3 w-3" />
                              )}
                            </button>
                          )}
                          <span className="mt-0.5 block truncate text-center text-[9px] text-slate-400">
                            {formatDataHora(f.criado_em)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
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

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative w-full min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por ordem, texto, nota..."
                className="min-h-10 w-full rounded-lg border border-slate-300 py-2 pl-8 pr-3 text-sm focus:border-[#1f7ad6] focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              />
            </div>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 sm:w-auto dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
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
              className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 sm:w-auto dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            >
              <option value="TODAS">Tipo de ordem: todos</option>
              {[...TIPOS_ORDEM, "outras"].map((t) => (
                <option key={t} value={t}>
                  {t === "outras" ? "Outras" : t}
                </option>
              ))}
            </select>
            <select
              value={tamanhoPagina}
              onChange={(e) => {
                const v = Number(e.target.value);
                setTamanhoPagina(v);
                setPaginaAtual(1);
                if (user) {
                  supabase
                    .from("profiles")
                    .update({ tamanho_pagina_atendimentos: v })
                    .eq("id", user.id)
                    .then();
                }
              }}
              title="O.S. por página"
              className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 sm:w-auto dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            >
              {OPCOES_TAMANHO_PAGINA.map((n) => (
                <option key={n} value={n}>
                  Por página: {n}
                </option>
              ))}
            </select>
          </div>

          {atendimentosCarregados && totalAtendimentos != null && totalAtendimentos > 0 && (
            <p className="text-xs text-muted-foreground">
              Página {paginaAtual} de {totalPaginas} · {totalAtendimentos}{" "}
              {totalAtendimentos === 1 ? "atendimento" : "atendimentos"}
              {busca.trim() ? " (filtrados)" : ""}
            </p>
          )}

          {!atendimentosCarregados ? (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-8 text-sm text-slate-400 dark:border-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando atendimentos...
            </div>
          ) : atendimentos.length === 0 ? (
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
            <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1 sm:max-h-[500px]">
              {atendimentosPagina.map((a) => {
                const natureza = a.natureza ?? "outras";
                const encerrado = STATUS_ENCERRADO.includes(a.status_simplificado ?? "");
                const semVinculo = a.elevatoria_id == null;
                return (
                  <div
                    key={a.id}
                    className={`rounded-lg border bg-slate-50 px-3 py-2.5 dark:bg-slate-700/40 ${
                      semVinculo
                        ? "border-amber-300 dark:border-amber-700"
                        : "border-slate-200 dark:border-slate-600"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            title="Copiar ordem"
                            onClick={() => a.ordem && copiarOrdem(a.ordem)}
                            className="inline-flex items-center gap-1 text-sm font-bold text-[#0b3a73] underline-offset-2 hover:text-[#1f7ad6] hover:underline dark:text-white dark:hover:text-[#1f7ad6]"
                          >
                            {a.ordem ?? "—"}
                            {ordemCopiada === a.ordem && (
                              <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            )}
                          </button>
                          <Badge
                            className={`border ${NATUREZA_CORES[natureza] ?? NATUREZA_CORES.outras}`}
                          >
                            {natureza === "outras" ? "Outras" : natureza}
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
                          {a.prioridade &&
                            a.prioridade.trim().toLowerCase() !== natureza.toLowerCase() && (
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
                          <p className="mt-1 line-clamp-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                            {a.texto_breve}
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
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {a.data_entrada && (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" />{" "}
                              {formatDate(a.data_entrada)}
                            </span>
                          )}
                          {encerrado && a.data_modificacao && (
                            <span
                              className="inline-flex items-center gap-1"
                              title="Data de fechamento da nota (coluna W 'Data de modif.mestre ordens' do SAP)"
                            >
                              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 opacity-70 dark:text-emerald-400" />{" "}
                              Fechada em {formatDate(a.data_modificacao)}
                            </span>
                          )}
                          {a.nota && (
                            <span className="inline-flex items-center gap-1">
                              <Hash className="h-3.5 w-3.5 shrink-0 opacity-70" /> Nota {a.nota}
                            </span>
                          )}
                          {nomeElevatoria(a.elevatoria_id) && (
                            <span className="inline-flex items-center gap-1">
                              <Building2 className="h-3.5 w-3.5 shrink-0 opacity-70" />{" "}
                              {nomeElevatoria(a.elevatoria_id)}
                            </span>
                          )}
                          {a.planta && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 shrink-0 opacity-70" /> {a.planta}
                            </span>
                          )}
                          {a.local_instalacao && a.local_instalacao !== a.planta && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 shrink-0 opacity-70" />{" "}
                              {a.local_instalacao}
                            </span>
                          )}
                          {a.criado_por && (
                            <span className="inline-flex items-center gap-1">
                              <User className="h-3.5 w-3.5 shrink-0 opacity-70" /> {a.criado_por}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex w-full shrink-0 flex-wrap items-center gap-1.5 sm:w-auto">
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
          {atendimentosCarregados && totalPaginas > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <button
                type="button"
                disabled={paginaAtual <= 1 || carregandoAtendimentos}
                onClick={() => irParaPagina(paginaAtual - 1)}
                className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <ChevronLeft className="h-4 w-4" /> Voltar
              </button>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                Página {paginaAtual} de {totalPaginas}
                {carregandoAtendimentos && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              </span>
              <button
                type="button"
                disabled={paginaAtual >= totalPaginas || carregandoAtendimentos}
                onClick={() => irParaPagina(paginaAtual + 1)}
                className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Próximo <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ListaRegistros;
