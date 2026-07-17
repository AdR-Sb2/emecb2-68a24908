import { useState, useEffect, useRef, useCallback } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import {
  Upload,
  Download,
  Plus,
  Trash2,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  FileImage,
  List,
  Edit3,
  Search,
  Copy,
  AlertTriangle,
  Image,
  Loader2,
  Eye,
  ArrowLeft,
  ArrowRight,
  X,
} from "lucide-react";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  ImageRun,
  HeadingLevel,
  Footer,
  Header,
  PageNumber,
  PageBreak,
  WidthType,
  AlignmentType,
  BorderStyle,
} from "docx";
import pkg from "file-saver";
const { saveAs } = pkg;

export const Route = createFileRoute("/oi")({
  component: OIPage,
});

/* ───────────────────────────── Types ───────────────────────────── */

interface OIRecord {
  id: number;
  numero_oi: string;
  bloco: string;
  periodo_inicio: string;
  periodo_fim: string;
  superintendencia: string | null;
  municipio: string | null;
  tipo_agua: boolean;
  tipo_esgoto: boolean;
  tipo_outros_investimentos: boolean;
  responsavel_aegea: string | null;
  responsavel_aguas_do_rio: string | null;
  objetivo_escopo_local: string | null;
  status: "rascunho" | "finalizado";
  criado_por: string | null;
  criado_em: string;
  atualizado_em: string;
}

interface IntervencaoRecord {
  id?: number;
  ordem_intervencao_id?: number;
  ordem: number;
  titulo_ativo: string;
  endereco_obra: string;
  rubrica_quf: string;
  fotos?: FotoRecord[];
}

interface FotoRecord {
  id?: number;
  intervencao_id?: number;
  ordem: number;
  storage_path: string;
  public_url?: string;
  evento: string;
  descricao: string;
  file?: File;
  local_url?: string;
}

interface PreviewData {
  novos: number;
  atualizados: number;
  ignorados: number;
}

/* ────────────────────── Month abbreviation map ──────────────────── */

const MESES: Record<number, string> = {
  1: "JAN",
  2: "FEV",
  3: "MAR",
  4: "ABR",
  5: "MAI",
  6: "JUN",
  7: "JUL",
  8: "AGO",
  9: "SET",
  10: "OUT",
  11: "NOV",
  12: "DEZ",
};

function pad(n: number, z = 3): string {
  return String(n).padStart(z, "0");
}

/* ──────────────────── Image compression helper ─────────────────── */

async function compressImage(file: File, maxDimension = 1200, quality = 0.8): Promise<Blob> {
  const img = await createImageBitmap(file);
  let { width, height } = img;
  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    } else {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, width, height);
  img.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error("compress failed"));
      },
      "image/jpeg",
      quality,
    );
  });
}

/* ──────────────────── Generate suggested OI number ─────────────── */

async function sugerirNumeroOI(bloco: string): Promise<string> {
  const ano = new Date().getFullYear();
  const prefixo = `OI-B${bloco.replace(/\D/g, "")}`;
  const { data } = await supabase
    .from("ordens_intervencao")
    .select("numero_oi")
    .like("numero_oi", `${prefixo}-%-${ano}`)
    .order("numero_oi", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return `${prefixo}-001-${ano}`;
  const parts = data.numero_oi.split("-");
  const seq = parseInt(parts[parts.length - 2] || "0", 10) + 1;
  return `${prefixo}-${pad(seq)}-${ano}`;
}

/* ──────────────────── Step Indicator Component ─────────────────── */

const STEPS = [
  { label: "Dados Gerais", icon: FileImage },
  { label: "Intervenções", icon: List },
  { label: "Fotos", icon: Image },
  { label: "Revisão", icon: Eye },
  { label: "Gerar", icon: Download },
];

function StepIndicator({ current, onStep }: { current: number; onStep?: (s: number) => void }) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between sm:justify-start sm:gap-0">
        {STEPS.map((s, i) => {
          const StepIcon = s.icon;
          const active = i + 1 === current;
          const done = i + 1 < current;
          return (
            <div key={i} className="flex flex-1 sm:flex-none items-center">
              <button
                type="button"
                onClick={() => onStep?.(i + 1)}
                className={`flex flex-col items-center gap-1 px-2 sm:px-4 transition ${
                  active ? "text-[#0b3a73]" : done ? "text-green-600" : "text-slate-400"
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold border-2 ${
                    active
                      ? "border-[#0b3a73] bg-[#0b3a73] text-white"
                      : done
                        ? "border-green-500 bg-green-50 text-green-600 dark:bg-green-900/30"
                        : "border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-800"
                  }`}
                >
                  {done ? <CheckCircle2 className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                </div>
                <span className="hidden sm:inline text-[10px] leading-tight text-center">
                  {s.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div
                  className={`hidden sm:block h-px flex-1 mx-1 ${
                    i + 1 < current ? "bg-green-400" : "bg-slate-200 dark:bg-slate-700"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ──────────────────── Sub-Component: Step 1 – General Data ─────── */

function StepDadosGerais({
  form,
  onChange,
  sugestoesResponsaveis,
}: {
  form: OIRecord;
  onChange: (d: Partial<OIRecord>) => void;
  sugestoesResponsaveis: { aegea: string[]; rio: string[] };
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Bloco
          </label>
          <select
            value={form.bloco}
            onChange={(e) => onChange({ bloco: e.target.value, numero_oi: "" })}
            className="min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="">Selecione</option>
            <option value="Bloco 1">Bloco 1</option>
            <option value="Bloco 4">Bloco 4</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Nº OI <span className="text-red-500">*</span>
          </label>
          <input
            value={form.numero_oi}
            onChange={(e) => onChange({ numero_oi: e.target.value })}
            placeholder="OI-B1-001-2026"
            className="min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 font-mono"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Período Início <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={form.periodo_inicio}
            onChange={(e) => onChange({ periodo_inicio: e.target.value })}
            className="min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Período Fim <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={form.periodo_fim}
            onChange={(e) => onChange({ periodo_fim: e.target.value })}
            className="min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Superintendência
          </label>
          <input
            value={form.superintendencia || ""}
            onChange={(e) => onChange({ superintendencia: e.target.value })}
            placeholder="Ex: Interior Lagos"
            className="min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Município
          </label>
          <input
            value={form.municipio || ""}
            onChange={(e) => onChange({ municipio: e.target.value })}
            placeholder="Ex: Araruama"
            className="min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          />
        </div>
      </div>

      <fieldset className="border border-slate-200 dark:border-slate-700 rounded-md p-3">
        <legend className="text-sm font-medium text-slate-700 dark:text-slate-300 px-1">
          Tipo
        </legend>
        <div className="flex gap-6">
          {[
            { key: "tipo_agua", label: "Água" },
            { key: "tipo_esgoto", label: "Esgoto" },
            { key: "tipo_outros_investimentos", label: "Outros Investimentos" },
          ].map((t) => (
            <label key={t.key} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={(form as unknown as Record<string, boolean>)[t.key] ?? false}
                onChange={(e) =>
                  onChange({ [t.key]: e.target.checked } as unknown as Partial<OIRecord>)
                }
                className="h-4 w-4 rounded border-slate-300 text-[#0b3a73] focus:ring-[#0b3a73]"
              />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Resp. Técnico AEGEA
          </label>
          <input
            value={form.responsavel_aegea || ""}
            onChange={(e) => onChange({ responsavel_aegea: e.target.value })}
            list="sugestoes-aegea"
            placeholder="Nome do responsável"
            className="min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          />
          <datalist id="sugestoes-aegea">
            {sugestoesResponsaveis.aegea.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Resp. Técnico Águas do Rio
          </label>
          <input
            value={form.responsavel_aguas_do_rio || ""}
            onChange={(e) => onChange({ responsavel_aguas_do_rio: e.target.value })}
            list="sugestoes-rio"
            placeholder="Nome do responsável"
            className="min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          />
          <datalist id="sugestoes-rio">
            {sugestoesResponsaveis.rio.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Objetivo/Escopo/Local
        </label>
        <textarea
          value={form.objetivo_escopo_local || ""}
          onChange={(e) => onChange({ objetivo_escopo_local: e.target.value })}
          rows={3}
          placeholder="Descreva o objetivo, escopo e local da intervenção..."
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        />
      </div>
    </div>
  );
}

/* ──────────────────── Sub-Component: Step 2 – Intervenções ─────── */

function StepIntervencoes({
  intervencoes,
  onChange,
}: {
  intervencoes: (IntervencaoRecord & { fotos: FotoRecord[] })[];
  onChange: (list: (IntervencaoRecord & { fotos: FotoRecord[] })[]) => void;
}) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const atualizar = (idx: number, data: Partial<IntervencaoRecord>) => {
    const next = [...intervencoes];
    next[idx] = { ...next[idx], ...data };
    onChange(next);
  };

  const adicionar = () => {
    onChange([
      ...intervencoes,
      {
        ordem: intervencoes.length + 1,
        titulo_ativo: "",
        endereco_obra: "",
        rubrica_quf: "",
        fotos: [],
      },
    ]);
  };

  const duplicar = (idx: number) => {
    const copy = { ...intervencoes[idx], id: undefined, ordem: intervencoes.length + 1, fotos: [] };
    onChange([...intervencoes, copy]);
  };

  const excluir = (idx: number) => {
    if (intervencoes[idx].fotos?.length) {
      if (!confirm("Esta intervenção possui fotos. Deseja excluir mesmo assim?")) return;
    }
    const next = intervencoes.filter((_, i) => i !== idx).map((iv, i) => ({ ...iv, ordem: i + 1 }));
    onChange(next);
  };

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) {
      setDragIdx(null);
      return;
    }
    const next = [...intervencoes];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(targetIdx, 0, moved);
    onChange(next.map((iv, i) => ({ ...iv, ordem: i + 1 })));
    setDragIdx(null);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {intervencoes.length} intervenção(ões) cadastrada(s). Arraste para reordenar.
      </p>
      {intervencoes.map((iv, idx) => (
        <div
          key={idx}
          draggable
          onDragStart={() => handleDragStart(idx)}
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(idx)}
          className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800 shadow-sm"
        >
          <div className="flex items-start gap-2">
            <div className="mt-2 cursor-grab text-slate-400 hover:text-slate-600">
              <GripVertical className="h-4 w-4" />
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Título do Ativo <span className="text-red-500">*</span>
                </label>
                <input
                  value={iv.titulo_ativo}
                  onChange={(e) => atualizar(idx, { titulo_ativo: e.target.value })}
                  placeholder="(EEAT) 1020 – MORRO DO GIL"
                  className="min-h-9 w-full rounded border border-slate-300 px-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Endereço da Obra
                </label>
                <input
                  value={iv.endereco_obra}
                  onChange={(e) => atualizar(idx, { endereco_obra: e.target.value })}
                  placeholder="Rua X, nº Y"
                  className="min-h-9 w-full rounded border border-slate-300 px-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                />
              </div>
              <div className="flex gap-1">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Rubrica QUF
                  </label>
                  <input
                    value={iv.rubrica_quf}
                    onChange={(e) => atualizar(idx, { rubrica_quf: e.target.value })}
                    placeholder="Código"
                    className="min-h-9 w-full rounded border border-slate-300 px-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                  />
                </div>
                <div className="flex flex-col gap-1 pt-5">
                  <button
                    type="button"
                    onClick={() => duplicar(idx)}
                    className="rounded p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                    title="Duplicar"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => excluir(idx)}
                    className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={adicionar}
        className="flex items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 p-3 w-full text-sm text-slate-500 hover:border-[#0b3a73] hover:text-[#0b3a73] transition dark:border-slate-600 dark:hover:border-[#1f7ad6]"
      >
        <Plus className="h-4 w-4" />
        Adicionar Intervenção
      </button>
    </div>
  );
}

/* ──────────────────── Sub-Component: Step 3 – Fotos ────────────── */

function StepFotos({
  intervencoes,
  onChange,
}: {
  intervencoes: (IntervencaoRecord & { fotos: FotoRecord[] })[];
  onChange: (list: (IntervencaoRecord & { fotos: FotoRecord[] })[]) => void;
}) {
  const [uploading, setUploading] = useState<number | null>(null);
  const [dragFotoIdx, setDragFotoIdx] = useState<{ iv: number; fi: number } | null>(null);

  const handleUpload = async (ivIdx: number, files: FileList) => {
    setUploading(ivIdx);
    const novos: FotoRecord[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const compressed = await compressImage(file);
      const local_url = URL.createObjectURL(compressed);
      novos.push({
        ordem: intervencoes[ivIdx].fotos.length + i + 1,
        storage_path: "",
        evento: "",
        descricao: "",
        file: new File([compressed], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }),
        local_url,
      });
    }
    const next = [...intervencoes];
    next[ivIdx] = { ...next[ivIdx], fotos: [...next[ivIdx].fotos, ...novos] };
    onChange(next);
    setUploading(null);
  };

  const atualizarFoto = (ivIdx: number, fi: number, data: Partial<FotoRecord>) => {
    const next = [...intervencoes];
    next[ivIdx] = {
      ...next[ivIdx],
      fotos: next[ivIdx].fotos.map((f, i) => (i === fi ? { ...f, ...data } : f)),
    };
    onChange(next);
  };

  const removerFoto = (ivIdx: number, fi: number) => {
    const next = [...intervencoes];
    next[ivIdx] = {
      ...next[ivIdx],
      fotos: next[ivIdx].fotos.filter((_, i) => i !== fi).map((f, i) => ({ ...f, ordem: i + 1 })),
    };
    onChange(next);
  };

  const usarTextoAnterior = (ivIdx: number, fi: number) => {
    if (fi === 0) return;
    const anterior = intervencoes[ivIdx].fotos[fi - 1];
    atualizarFoto(ivIdx, fi, { evento: anterior.evento, descricao: anterior.descricao });
  };

  const handleFotoDragStart = (iv: number, fi: number) => setDragFotoIdx({ iv, fi });
  const handleFotoDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleFotoDrop = (targetIv: number, targetFi: number) => {
    if (!dragFotoIdx || (dragFotoIdx.iv === targetIv && dragFotoIdx.fi === targetFi)) {
      setDragFotoIdx(null);
      return;
    }
    const next = [...intervencoes];
    const fotos = [...next[targetIv].fotos];
    const [moved] = fotos.splice(dragFotoIdx.fi, 1);
    fotos.splice(targetFi, 0, moved);
    next[targetIv] = { ...next[targetIv], fotos: fotos.map((f, i) => ({ ...f, ordem: i + 1 })) };
    onChange(next);
    setDragFotoIdx(null);
  };

  return (
    <div className="space-y-6">
      {intervencoes.map((iv, ivIdx) => (
        <div key={ivIdx} className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
            {iv.titulo_ativo || `Intervenção #${iv.ordem}`}
            <span className="ml-2 text-xs font-normal text-slate-400">
              ({iv.fotos.length} foto(s))
            </span>
          </h3>

          <label className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 p-4 text-sm text-slate-500 hover:border-[#0b3a73] hover:text-[#0b3a73] transition dark:border-slate-600">
            {uploading === ivIdx ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Upload className="h-5 w-5" />
            )}
            {uploading === ivIdx ? "Comprimindo..." : "Clique para selecionar fotos (múltiplos)"}
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              disabled={uploading !== null}
              onChange={(e) => e.target.files && handleUpload(ivIdx, e.target.files)}
            />
          </label>

          {iv.fotos.length === 0 && (
            <p className="mt-2 text-xs text-amber-500 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Nenhuma foto — esta intervenção ficará sem imagens no relatório.
            </p>
          )}

          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {iv.fotos.map((foto, fi) => (
              <div
                key={fi}
                draggable
                onDragStart={() => handleFotoDragStart(ivIdx, fi)}
                onDragOver={handleFotoDragOver}
                onDrop={() => handleFotoDrop(ivIdx, fi)}
                className="relative rounded border border-slate-200 bg-slate-50 p-2 dark:border-slate-600 dark:bg-slate-800/50 cursor-grab"
              >
                <button
                  type="button"
                  onClick={() => removerFoto(ivIdx, fi)}
                  className="absolute -right-1.5 -top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow"
                >
                  <X className="h-3 w-3" />
                </button>
                {foto.local_url && (
                  <img
                    src={foto.local_url}
                    alt={`Foto ${fi + 1}`}
                    className="w-full h-24 object-cover rounded mb-1"
                  />
                )}
                <div className="flex items-center gap-1 mb-1">
                  <GripVertical className="h-3 w-3 text-slate-400 shrink-0" />
                  <span className="text-[10px] text-slate-400">#{foto.ordem}</span>
                </div>
                <input
                  value={foto.evento}
                  onChange={(e) => atualizarFoto(ivIdx, fi, { evento: e.target.value })}
                  placeholder="Evento"
                  className="w-full rounded border border-slate-300 px-1 py-0.5 text-[11px] mb-1 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                />
                {fi > 0 && (
                  <button
                    type="button"
                    onClick={() => usarTextoAnterior(ivIdx, fi)}
                    className="text-[10px] text-blue-500 hover:underline mb-1 block"
                  >
                    ← usar mesmo texto da anterior
                  </button>
                )}
                <input
                  value={foto.descricao}
                  onChange={(e) => atualizarFoto(ivIdx, fi, { descricao: e.target.value })}
                  placeholder="Descrição"
                  className="w-full rounded border border-slate-300 px-1 py-0.5 text-[11px] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ──────────────────── Sub-Component: Step 4 – Preview ──────────── */

function StepRevisao({
  form,
  intervencoes,
}: {
  form: OIRecord;
  intervencoes: (IntervencaoRecord & { fotos: FotoRecord[] })[];
}) {
  const periodo =
    form.periodo_inicio && form.periodo_fim
      ? `${new Date(form.periodo_inicio + "T12:00:00").toLocaleDateString("pt-BR")} a ${new Date(form.periodo_fim + "T12:00:00").toLocaleDateString("pt-BR")}`
      : "—";
  const totalFotos = intervencoes.reduce((s, iv) => s + iv.fotos.length, 0);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Cabeçalho */}
      <div className="border-2 border-slate-300 dark:border-slate-600 rounded-lg p-4">
        <h1 className="text-lg font-bold text-[#0b3a73] dark:text-white text-center">
          RELATÓRIO FOTOGRÁFICO
        </h1>
        <table className="w-full mt-3 text-xs border-collapse">
          <tbody>
            <tr>
              <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 font-semibold w-40">
                N° Ordem de Início
              </td>
              <td className="border border-slate-300 dark:border-slate-600 px-2 py-1">
                {form.numero_oi}
              </td>
              <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 font-semibold w-20">
                Período
              </td>
              <td className="border border-slate-300 dark:border-slate-600 px-2 py-1">{periodo}</td>
            </tr>
            <tr>
              <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 font-semibold">
                Superintendência
              </td>
              <td className="border border-slate-300 dark:border-slate-600 px-2 py-1">
                {form.superintendencia || "—"}
              </td>
              <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 font-semibold">
                Município
              </td>
              <td className="border border-slate-300 dark:border-slate-600 px-2 py-1">
                {form.municipio || "—"}
              </td>
            </tr>
            <tr>
              <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 font-semibold">
                Tipo
              </td>
              <td className="border border-slate-300 dark:border-slate-600 px-2 py-1" colSpan={3}>
                {form.tipo_agua ? "☒" : "☐"} Água &nbsp;
                {form.tipo_esgoto ? "☒" : "☐"} Esgoto &nbsp;
                {form.tipo_outros_investimentos ? "☒" : "☐"} Outros Investimentos
              </td>
            </tr>
            <tr>
              <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 font-semibold">
                Resp. AEGEA
              </td>
              <td className="border border-slate-300 dark:border-slate-600 px-2 py-1">
                {form.responsavel_aegea || "—"}
              </td>
              <td className="border border-slate-300 dark:border-slate-600 px-2 py-1 font-semibold">
                Resp. Águas do Rio
              </td>
              <td className="border border-slate-300 dark:border-slate-600 px-2 py-1">
                {form.responsavel_aguas_do_rio || "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Objeto / Objetivo */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">OBJETO</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
          Relatório Fotográfico – Contrato EPC AEGEA X Águas do Rio
        </p>
      </div>
      <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">OBJETIVO</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
          O presente documento tem como objetivo evidenciar os serviços medidos no período de
          referência.
        </p>
      </div>

      {/* Sumário */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">SUMÁRIO</h2>
        <ol className="mt-2 text-xs text-slate-600 dark:text-slate-300 list-decimal list-inside space-y-0.5">
          <li>OBJETIVO</li>
          <li>INTERVENÇÕES</li>
          {intervencoes.map((iv) => (
            <li key={iv.ordem} className="ml-4">
              {iv.ordem + 2}. {iv.titulo_ativo}
            </li>
          ))}
        </ol>
      </div>

      {/* Intervenções */}
      {intervencoes.map((iv) => (
        <div
          key={iv.ordem}
          className="border border-slate-200 dark:border-slate-700 rounded-lg p-3"
        >
          <h3 className="text-sm font-bold text-[#0b3a73] dark:text-white">
            {iv.ordem + 2}. {iv.titulo_ativo}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{iv.endereco_obra}</p>
          <p className="text-xs text-slate-500">QUF: {iv.rubrica_quf}</p>

          {iv.fotos.length > 0 ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {iv.fotos.map((foto, fi) => (
                <div key={fi} className="border border-slate-200 dark:border-slate-700 rounded p-1">
                  {foto.local_url && (
                    <img src={foto.local_url} alt="" className="w-full h-32 object-cover rounded" />
                  )}
                  <p className="text-[10px] text-slate-600 dark:text-slate-300 mt-1">
                    <span className="font-semibold">Evento:</span> {foto.evento || "—"}
                  </p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-300">
                    <span className="font-semibold">Descrição:</span> {foto.descricao || "—"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-amber-500">Sem fotos</p>
          )}
        </div>
      ))}

      <p className="text-xs text-slate-400 text-center">
        Total estimado: {totalFotos} foto(s) em {intervencoes.length} intervenção(ões)
      </p>
    </div>
  );
}

/* ──────────────────── DOCX Generation ──────────────────────────── */

async function generateDocx(
  form: OIRecord,
  intervencoes: (IntervencaoRecord & { fotos: FotoRecord[] })[],
  _setProgress?: (p: number) => void,
): Promise<Blob> {
  const periodoStr =
    form.periodo_inicio && form.periodo_fim
      ? `${new Date(form.periodo_inicio + "T12:00:00").toLocaleDateString("pt-BR")} a ${new Date(form.periodo_fim + "T12:00:00").toLocaleDateString("pt-BR")}`
      : "";

  const totalFotos = intervencoes.reduce((s, iv) => s + iv.fotos.length, 0);

  interface ContentItem {
    type: "paragraph" | "table" | "pageBreak" | "heading";
    data: Paragraph | Paragraph[] | Table;
  }

  const content: ContentItem[] = [];

  content.push({ type: "pageBreak", data: new Paragraph({ children: [] }) });

  content.push({
    type: "table",
    data: criarTabelaCabecalho(form, periodoStr),
  });

  content.push({ type: "paragraph", data: new Paragraph({ spacing: { after: 200 } }) });

  content.push({
    type: "heading",
    data: new Paragraph({
      text: "OBJETO",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 100 },
    }),
  });
  content.push({
    type: "paragraph",
    data: new Paragraph({
      children: [
        new TextRun({
          text: "Relatório Fotográfico – Contrato EPC AEGEA X Águas do Rio",
          size: 22,
        }),
      ],
      spacing: { after: 200 },
    }),
  });

  content.push({
    type: "heading",
    data: new Paragraph({
      text: "OBJETIVO",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 100 },
    }),
  });
  content.push({
    type: "paragraph",
    data: new Paragraph({
      children: [
        new TextRun({
          text: "O presente documento tem como objetivo evidenciar os serviços medidos no período de referência.",
          size: 22,
        }),
      ],
      spacing: { after: 200 },
    }),
  });

  content.push({
    type: "heading",
    data: new Paragraph({
      text: "INTERVENÇÕES",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 100 },
    }),
  });

  for (const iv of intervencoes) {
    const tituloNum = `${iv.ordem + 2}. ${iv.titulo_ativo}`;
    content.push({
      type: "heading",
      data: new Paragraph({
        text: tituloNum,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 60 },
      }),
    });
    if (iv.endereco_obra) {
      content.push({
        type: "paragraph",
        data: new Paragraph({
          children: [
            new TextRun({ text: `Endereço: ${iv.endereco_obra}`, size: 20, italics: true }),
          ],
          spacing: { after: 40 },
        }),
      });
    }
    if (iv.rubrica_quf) {
      content.push({
        type: "paragraph",
        data: new Paragraph({
          children: [new TextRun({ text: `QUF: ${iv.rubrica_quf}`, size: 20 })],
          spacing: { after: 100 },
        }),
      });
    }
    if (iv.fotos.length === 0) {
      content.push({
        type: "paragraph",
        data: new Paragraph({
          children: [new TextRun({ text: "Sem fotos registradas.", size: 20, color: "999999" })],
          spacing: { after: 200 },
        }),
      });
    } else {
      for (let i = 0; i < iv.fotos.length; i += 2) {
        const f1 = iv.fotos[i];
        const f2 = iv.fotos[i + 1];
        const rowCells: TableCell[] = [];
        for (const f of [f1, f2]) {
          if (!f) {
            rowCells.push(
              new TableCell({
                width: { size: 4535, type: WidthType.DXA },
                children: [new Paragraph({ children: [] })],
              }),
            );
            continue;
          }
          let imgRun: ImageRun | null = null;
          if (f.file) {
            const ab = await f.file.arrayBuffer();
            const ext = f.file.type === "image/png" ? "png" : "jpg";
            imgRun = new ImageRun({
              data: ab,
              transformation: { width: 400, height: 300 },
              type: ext,
            });
          }
          const cellChildren: Paragraph[] = [];
          if (imgRun) {
            cellChildren.push(
              new Paragraph({
                children: [imgRun],
                alignment: AlignmentType.CENTER,
                spacing: { after: 40 },
              }),
            );
          }
          cellChildren.push(
            new Paragraph({
              children: [new TextRun({ text: `Evento: ${f.evento || "—"}`, size: 18, bold: true })],
              spacing: { after: 20 },
            }),
          );
          cellChildren.push(
            new Paragraph({
              children: [new TextRun({ text: `Descrição: ${f.descricao || "—"}`, size: 18 })],
              spacing: { after: 60 },
            }),
          );
          rowCells.push(
            new TableCell({
              width: { size: 4535, type: WidthType.DXA },
              children: cellChildren,
            }),
          );
        }
        content.push({
          type: "table",
          data: new Table({
            width: { size: 9070, type: WidthType.DXA },
            rows: [new TableRow({ children: rowCells })],
          }),
        });
        content.push({
          type: "paragraph",
          data: new Paragraph({ spacing: { after: 100 } }),
        });
      }
    }
  }

  const assinaturaChildren: Paragraph[] = [];
  assinaturaChildren.push(new Paragraph({ spacing: { before: 400 } }));
  assinaturaChildren.push(
    new Paragraph({
      children: [new TextRun({ text: "AEGEA - Águas do Rio", size: 22, bold: true })],
      alignment: AlignmentType.CENTER,
    }),
  );
  assinaturaChildren.push(new Paragraph({ spacing: { before: 200 } }));
  if (form.responsavel_aguas_do_rio) {
    assinaturaChildren.push(
      new Paragraph({
        children: [new TextRun({ text: form.responsavel_aguas_do_rio, size: 22 })],
        alignment: AlignmentType.CENTER,
      }),
    );
    assinaturaChildren.push(
      new Paragraph({
        children: [new TextRun({ text: "Responsável Técnico", size: 18, italics: true })],
        alignment: AlignmentType.CENTER,
      }),
    );
  }
  content.push({ type: "paragraph", data: assinaturaChildren });

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { size: 22, font: "Calibri" },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        headers: {
          default: new Header({ children: [] }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "FOLHA " }),
                  new TextRun({ children: [PageNumber.CURRENT] }),
                  new TextRun({ text: "/" }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES] }),
                ],
              }),
            ],
          }),
        },
        children: content.flatMap((c) => c.data),
      },
    ],
  });

  return await Packer.toBlob(doc);
}

function criarTabelaCabecalho(form: OIRecord, periodo: string): Table {
  const periodoInicio = form.periodo_inicio
    ? new Date(form.periodo_inicio + "T12:00:00").toLocaleDateString("pt-BR")
    : "";
  const periodoFim = form.periodo_fim
    ? new Date(form.periodo_fim + "T12:00:00").toLocaleDateString("pt-BR")
    : "";
  const S = (t: string, opts: Record<string, unknown> = {}) =>
    new TextRun({ text: t, size: 18, ...opts });

  const cellStyle = (children: Paragraph[]) => ({
    width: { size: 0 as number, type: WidthType.PERCENTAGE },
    children,
  });
  const px = (t: string) => new Paragraph({ children: [new TextRun({ text: t, size: 18 })] });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [px("EMEC BAIXADA 2")],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [px(`N° OI: ${form.numero_oi}`)],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [px(`Período: ${periodoInicio} a ${periodoFim}`)],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [px(`Superintendência: ${form.superintendencia || ""}`)],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [px(`Município: ${form.municipio || ""}`)],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              px(
                `Tipo: ${form.tipo_agua ? "☒" : "☐"} Água  ${form.tipo_esgoto ? "☒" : "☐"} Esgoto  ${form.tipo_outros_investimentos ? "☒" : "☐"} Outros`,
              ),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [px(`Resp. AEGEA: ${form.responsavel_aegea || ""}`)],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [px(`Resp. Águas do Rio: ${form.responsavel_aguas_do_rio || ""}`)],
          }),
        ],
      }),
    ],
  });
}

/* ──────────────────── Sugestão de nome de arquivo ──────────────── */

function sugerirNomeArquivo(form: OIRecord): string {
  const mes = form.periodo_inicio
    ? MESES[new Date(form.periodo_inicio + "T12:00:00").getMonth() + 1] || "MES"
    : "MES";
  const ano = form.periodo_inicio
    ? new Date(form.periodo_inicio).getFullYear()
    : new Date().getFullYear();
  const bloco = (form.bloco || "Bx").replace(/\D/g, "");
  const seq = (form.numero_oi || "000").split("-").slice(-2, -1)[0] || "000";
  const regiao = (form.superintendencia || "REGIÃO").replace(/\s+/g, "_").toUpperCase();
  return `RF-OI-B${bloco}-${seq}-${ano}-${mes}-${ano}-${regiao}.docx`;
}

/* ──────────────────── Main OIPage Component ────────────────────── */

function OIPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  /* ─── List vs Wizard ─── */
  const [view, setView] = useState<"list" | "wizard">("list");
  const [editandoId, setEditandoId] = useState<number | null>(null);

  /* ─── Wizard state ─── */
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  /* ─── Form Data ─── */
  const [form, setForm] = useState<OIRecord>({
    id: 0,
    numero_oi: "",
    bloco: "",
    periodo_inicio: "",
    periodo_fim: "",
    superintendencia: "",
    municipio: "",
    tipo_agua: false,
    tipo_esgoto: false,
    tipo_outros_investimentos: false,
    responsavel_aegea: "",
    responsavel_aguas_do_rio: "",
    objetivo_escopo_local: "",
    status: "rascunho",
    criado_por: null,
    criado_em: "",
    atualizado_em: "",
  });
  const [intervencoes, setIntervencoes] = useState<(IntervencaoRecord & { fotos: FotoRecord[] })[]>(
    [],
  );

  const [sugestoesResponsaveis, setSugestoesResponsaveis] = useState<{
    aegea: string[];
    rio: string[];
  }>({
    aegea: [],
    rio: [],
  });

  const [listaOIs, setListaOIs] = useState<OIRecord[]>([]);
  const [buscaOI, setBuscaOI] = useState("");
  const [carregandoLista, setCarregandoLista] = useState(true);

  const [nomeArquivo, setNomeArquivo] = useState("");
  const [duplicarModal, setDuplicarModal] = useState(false);
  const [oiParaDuplicar, setOiParaDuplicar] = useState<OIRecord[]>([]);
  const [duplicarSearch, setDuplicarSearch] = useState("");

  /* ─── Load list ─── */
  const carregarLista = useCallback(async () => {
    setCarregandoLista(true);
    const { data } = await supabase
      .from("ordens_intervencao")
      .select("*")
      .order("criado_em", { ascending: false });
    if (data) setListaOIs(data as OIRecord[]);
    setCarregandoLista(false);
  }, []);

  useEffect(() => {
    carregarLista();
  }, [carregarLista]);

  /* ─── Load suggestions ─── */
  useEffect(() => {
    (async () => {
      const { data: a } = await supabase
        .from("ordens_intervencao")
        .select("responsavel_aegea")
        .not("responsavel_aegea", "is", null);
      const { data: r } = await supabase
        .from("ordens_intervencao")
        .select("responsavel_aguas_do_rio")
        .not("responsavel_aguas_do_rio", "is", null);
      setSugestoesResponsaveis({
        aegea: [...new Set((a || []).map((x) => x.responsavel_aegea as string))],
        rio: [...new Set((r || []).map((x) => x.responsavel_aguas_do_rio as string))],
      });
    })();
  }, []);

  /* ─── Auto-save ─── */
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosave = useCallback(async () => {
    if (!editandoId) return;
    setSaving(true);
    await supabase
      .from("ordens_intervencao")
      .update({
        bloco: form.bloco,
        numero_oi: form.numero_oi,
        periodo_inicio: form.periodo_inicio,
        periodo_fim: form.periodo_fim,
        superintendencia: form.superintendencia,
        municipio: form.municipio,
        tipo_agua: form.tipo_agua,
        tipo_esgoto: form.tipo_esgoto,
        tipo_outros_investimentos: form.tipo_outros_investimentos,
        responsavel_aegea: form.responsavel_aegea,
        responsavel_aguas_do_rio: form.responsavel_aguas_do_rio,
        objetivo_escopo_local: form.objetivo_escopo_local,
      })
      .eq("id", editandoId);

    for (const iv of intervencoes) {
      if (iv.id) {
        await supabase
          .from("oi_intervencoes")
          .update({
            titulo_ativo: iv.titulo_ativo,
            endereco_obra: iv.endereco_obra,
            rubrica_quf: iv.rubrica_quf,
            ordem: iv.ordem,
          })
          .eq("id", iv.id);
      } else {
        const { data } = await supabase
          .from("oi_intervencoes")
          .insert({
            ordem_intervencao_id: editandoId,
            ordem: iv.ordem,
            titulo_ativo: iv.titulo_ativo,
            endereco_obra: iv.endereco_obra,
            rubrica_quf: iv.rubrica_quf,
          })
          .select("id")
          .single();
        if (data) iv.id = data.id;
      }
    }
    setSaving(false);
  }, [editandoId, form, intervencoes]);

  useEffect(() => {
    if (!editandoId) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(autosave, 3000);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [form, intervencoes, editandoId, autosave]);

  /* ─── Create new OI ─── */
  const criarNovo = async () => {
    const { data } = await supabase
      .from("ordens_intervencao")
      .insert({
        numero_oi: "",
        bloco: "",
        periodo_inicio: new Date().toISOString().slice(0, 10),
        periodo_fim: new Date().toISOString().slice(0, 10),
        status: "rascunho",
        criado_por: user?.id || null,
      })
      .select("id")
      .single();
    if (!data) {
      toast.error("Erro ao criar OI");
      return;
    }
    setEditandoId(data.id);
    setForm((prev) => ({ ...prev, id: data.id }));
    setStep(1);
    setView("wizard");
  };

  /* ─── Load existing OI ─── */
  const carregarOI = async (id: number) => {
    const { data: oi } = await supabase
      .from("ordens_intervencao")
      .select("*")
      .eq("id", id)
      .single();
    if (!oi) {
      toast.error("OI não encontrada");
      return;
    }
    setForm(oi as OIRecord);
    setEditandoId(id);
    const { data: ivs } = await supabase
      .from("oi_intervencoes")
      .select("*")
      .eq("ordem_intervencao_id", id)
      .order("ordem");
    const loaded: (IntervencaoRecord & { fotos: FotoRecord[] })[] = [];
    for (const iv of ivs || []) {
      const { data: fotos } = await supabase
        .from("oi_fotos")
        .select("*")
        .eq("intervencao_id", iv.id)
        .order("ordem");
      const fotosComUrl: FotoRecord[] = (fotos || []).map((f: Record<string, unknown>) => {
        const { data: urlData } = supabase.storage
          .from("oi-fotos")
          .getPublicUrl(f.storage_path as string);
        const foto: FotoRecord = {
          ordem: f.ordem as number,
          storage_path: f.storage_path as string,
          evento: (f.evento as string) ?? "",
          descricao: (f.descricao as string) ?? "",
          public_url: urlData?.publicUrl,
        };
        return foto;
      });
      loaded.push({ ...(iv as IntervencaoRecord & { fotos: FotoRecord[] }), fotos: fotosComUrl });
    }
    setIntervencoes(loaded);
    setStep(1);
    setView("wizard");
    setNomeArquivo("");
  };

  /* ─── Duplicate OI ─── */
  const handleDuplicar = async (oiOrigem: OIRecord) => {
    const bloco = oiOrigem.bloco;
    const novoNumero = await sugerirNumeroOI(bloco);
    const { data: novaOI } = await supabase
      .from("ordens_intervencao")
      .insert({
        numero_oi: novoNumero,
        bloco: oiOrigem.bloco,
        periodo_inicio: oiOrigem.periodo_inicio,
        periodo_fim: oiOrigem.periodo_fim,
        superintendencia: oiOrigem.superintendencia,
        municipio: oiOrigem.municipio,
        tipo_agua: oiOrigem.tipo_agua,
        tipo_esgoto: oiOrigem.tipo_esgoto,
        tipo_outros_investimentos: oiOrigem.tipo_outros_investimentos,
        responsavel_aegea: oiOrigem.responsavel_aegea,
        responsavel_aguas_do_rio: oiOrigem.responsavel_aguas_do_rio,
        objetivo_escopo_local: oiOrigem.objetivo_escopo_local,
        status: "rascunho",
        criado_por: user?.id || null,
      })
      .select("id, numero_oi")
      .single();
    if (!novaOI) {
      toast.error("Erro ao duplicar OI");
      return;
    }

    const { data: ivs } = await supabase
      .from("oi_intervencoes")
      .select("*")
      .eq("ordem_intervencao_id", oiOrigem.id)
      .order("ordem");
    for (const iv of ivs || []) {
      await supabase.from("oi_intervencoes").insert({
        ordem_intervencao_id: novaOI.id,
        ordem: iv.ordem,
        titulo_ativo: iv.titulo_ativo,
        endereco_obra: iv.endereco_obra,
        rubrica_quf: iv.rubrica_quf,
      });
    }

    toast.success(`OI duplicada: ${novaOI.numero_oi}`);
    setDuplicarModal(false);
    carregarOI(novaOI.id);
  };

  /* ─── Upload photos on save ─── */
  const fazerUploadFotosPendentes = async () => {
    for (let i = 0; i < intervencoes.length; i++) {
      const iv = intervencoes[i];
      if (!iv.id) continue;
      for (let j = 0; j < iv.fotos.length; j++) {
        const foto = iv.fotos[j];
        if (foto.storage_path) continue;
        if (!foto.file) continue;
        const path = `oi-fotos/${iv.id}/${Date.now()}_${j}.jpg`;
        const { error } = await supabase.storage.from("oi-fotos").upload(path, foto.file);
        if (error) {
          console.warn("Erro upload foto", error);
          continue;
        }
        const { data: urlData } = supabase.storage.from("oi-fotos").getPublicUrl(path);
        await supabase.from("oi_fotos").insert({
          intervencao_id: iv.id,
          ordem: foto.ordem,
          storage_path: path,
          evento: foto.evento,
          descricao: foto.descricao,
        });
        foto.storage_path = path;
        foto.public_url = urlData?.publicUrl;
        delete foto.file;
        delete foto.local_url;
      }
    }
  };

  /* ─── Generate Word ─── */
  const handleGerar = async () => {
    if (!form.numero_oi || !form.bloco || !form.periodo_inicio || !form.periodo_fim) {
      toast.error("Preencha todos os campos obrigatórios (Nº OI, Bloco, Período)");
      return;
    }
    if (intervencoes.length === 0) {
      toast.error("Cadastre pelo menos uma intervenção");
      return;
    }
    const semFotos = intervencoes.filter((iv) => iv.fotos.length === 0);
    if (semFotos.length > 0) {
      toast.warning(`${semFotos.length} intervenção(ões) sem foto. Deseja continuar?`, {
        action: { label: "Continuar", onClick: () => executarGeracao() },
        duration: 8000,
      });
      return;
    }
    await executarGeracao();
  };

  const executarGeracao = async () => {
    setGenerating(true);
    try {
      await fazerUploadFotosPendentes();
      toast.info("Gerando documento Word...");

      await supabase
        .from("ordens_intervencao")
        .update({ status: "finalizado" })
        .eq("id", editandoId);
      setForm((prev) => ({ ...prev, status: "finalizado" }));

      const blob = await generateDocx(form, intervencoes);
      const nome = nomeArquivo || sugerirNomeArquivo(form);
      saveAs(blob, nome);
      toast.success("Documento gerado com sucesso!");
    } catch (err: unknown) {
      toast.error("Erro ao gerar documento: " + ((err as Error)?.message || ""));
      console.error(err);
    }
    setGenerating(false);
  };

  const updateForm = (d: Partial<OIRecord>) => setForm((prev) => ({ ...prev, ...d }));
  const updateIntervencoes = (list: (IntervencaoRecord & { fotos: FotoRecord[] })[]) =>
    setIntervencoes(list);

  /* ─── Suggest OI number when bloco changes ─── */
  useEffect(() => {
    if (form.bloco && !form.numero_oi) {
      sugerirNumeroOI(form.bloco).then(setNumero);
    }
  }, [form.bloco]);

  const setNumero = (n: string) => setForm((prev) => ({ ...prev, numero_oi: n }));

  const listaFiltrada = listaOIs.filter((oi) => {
    const q = buscaOI.toLowerCase();
    return (
      oi.numero_oi.toLowerCase().includes(q) ||
      oi.bloco.toLowerCase().includes(q) ||
      (oi.municipio || "").toLowerCase().includes(q)
    );
  });

  const oisParaDuplicarFiltradas = oiParaDuplicar.filter((oi) => {
    const q = duplicarSearch.toLowerCase();
    return oi.numero_oi.toLowerCase().includes(q) || oi.bloco.toLowerCase().includes(q);
  });

  /* ─── Render ─── */
  return (
    <div className="mx-auto max-w-6xl px-3 py-4 sm:px-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {view === "wizard" && (
            <button
              type="button"
              onClick={() => {
                setView("list");
                setEditandoId(null);
                setStep(1);
                setNomeArquivo("");
                carregarLista();
              }}
              className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <h1 className="text-lg font-bold text-[#0b3a73] dark:text-white">
            {view === "list" ? "Gerador de OI" : `OI: ${form.numero_oi || "Novo"}`}
          </h1>
          {view === "wizard" && editandoId && (
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                form.status === "finalizado"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              }`}
            >
              {form.status === "finalizado" ? "Finalizado" : "Rascunho"}
            </span>
          )}
        </div>
        {view === "wizard" && editandoId && (
          <div className="flex items-center gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
          </div>
        )}
      </div>

      {view === "list" && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={buscaOI}
                onChange={(e) => setBuscaOI(e.target.value)}
                placeholder="Buscar por nº, bloco, município..."
                className="min-h-9 w-full rounded-lg border border-slate-300 pl-8 pr-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
            <button
              type="button"
              onClick={criarNovo}
              className="flex items-center gap-2 rounded-lg bg-[#0b3a73] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1f7ad6]"
            >
              <Plus className="h-4 w-4" />
              Nova OI
            </button>
            <button
              type="button"
              onClick={async () => {
                const { data } = await supabase
                  .from("ordens_intervencao")
                  .select("*")
                  .order("criado_em", { ascending: false })
                  .limit(50);
                if (data) setOiParaDuplicar(data as OIRecord[]);
                setDuplicarModal(true);
              }}
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Copy className="h-4 w-4" />
              Duplicar OI anterior
            </button>
          </div>

          {carregandoLista ? (
            <div className="py-20 text-center text-slate-400">
              <Loader2 className="mx-auto h-8 w-8 animate-spin" />
            </div>
          ) : listaFiltrada.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <FileImage className="mx-auto h-12 w-12 mb-2" />
              <p>Nenhuma OI encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">
                      Nº OI
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">
                      Bloco
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">
                      Período
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">
                      Município
                    </th>
                    <th className="px-3 py-2 text-center font-semibold text-slate-600 dark:text-slate-300">
                      Status
                    </th>
                    <th className="px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {listaFiltrada.map((oi) => (
                    <tr key={oi.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-3 py-2 font-mono text-xs text-[#0b3a73] dark:text-[#1f7ad6]">
                        {oi.numero_oi}
                      </td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{oi.bloco}</td>
                      <td className="px-3 py-2 text-xs text-slate-500">
                        {oi.periodo_inicio &&
                          new Date(oi.periodo_inicio + "T12:00:00").toLocaleDateString("pt-BR")}
                        {" — "}
                        {oi.periodo_fim &&
                          new Date(oi.periodo_fim + "T12:00:00").toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                        {oi.municipio || "—"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            oi.status === "finalizado"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          }`}
                        >
                          {oi.status === "finalizado" ? "Finalizado" : "Rascunho"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => carregarOI(oi.id)}
                          className="rounded px-2 py-1 text-xs font-medium text-[#0b3a73] hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          <Edit3 className="h-3.5 w-3.5 inline mr-1" />
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {view === "wizard" && editandoId && (
        <>
          <StepIndicator current={step} onStep={(s) => setStep(s)} />

          <div className="min-h-[300px]">
            {step === 1 && (
              <StepDadosGerais
                form={form}
                onChange={updateForm}
                sugestoesResponsaveis={sugestoesResponsaveis}
              />
            )}
            {step === 2 && (
              <StepIntervencoes intervencoes={intervencoes} onChange={updateIntervencoes} />
            )}
            {step === 3 && <StepFotos intervencoes={intervencoes} onChange={updateIntervencoes} />}
            {step === 4 && <StepRevisao form={form} intervencoes={intervencoes} />}
            {step === 5 && (
              <div className="space-y-6 max-w-xl mx-auto text-center">
                <div className="rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 p-8">
                  <Download className="mx-auto h-12 w-12 text-[#0b3a73] dark:text-[#1f7ad6] mb-4" />
                  <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-2">
                    Gerar Documento Word
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">
                    O documento será montado fielmente ao modelo de relatório fotográfico.
                  </p>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 text-left">
                      Nome do arquivo
                    </label>
                    <input
                      value={nomeArquivo || sugerirNomeArquivo(form)}
                      onChange={(e) => setNomeArquivo(e.target.value)}
                      className="min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm font-mono dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div className="flex flex-col gap-2 text-xs text-slate-400 mb-4">
                    <span>
                      {intervencoes.length} intervenção(ões),{" "}
                      {intervencoes.reduce((s, iv) => s + iv.fotos.length, 0)} foto(s)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleGerar}
                    disabled={generating}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#0b3a73] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1f7ad6] disabled:opacity-50"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Gerar Word
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-4">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
              className="flex items-center gap-1 rounded px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
            <span className="text-xs text-slate-400">Passo {step} de 5</span>
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(5, s + 1))}
              disabled={step === 5}
              className="flex items-center gap-1 rounded bg-[#0b3a73] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1f7ad6] disabled:opacity-30"
            >
              Avançar
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </>
      )}

      {/* Duplicate Modal */}
      {duplicarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-lg bg-white p-4 dark:bg-slate-800 shadow-xl max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Selecionar OI para duplicar
              </h3>
              <button
                type="button"
                onClick={() => setDuplicarModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={duplicarSearch}
                onChange={(e) => setDuplicarSearch(e.target.value)}
                placeholder="Buscar OI..."
                className="min-h-9 w-full rounded border border-slate-300 pl-8 pr-3 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              />
            </div>
            <div className="space-y-1 max-h-60 overflow-auto">
              {oisParaDuplicarFiltradas.map((oi) => (
                <button
                  key={oi.id}
                  type="button"
                  onClick={() => {
                    if (confirm(`Duplicar OI "${oi.numero_oi}"?`)) handleDuplicar(oi);
                  }}
                  className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <span className="font-mono text-xs text-[#0b3a73] dark:text-[#1f7ad6]">
                    {oi.numero_oi}
                  </span>
                  <span className="text-xs text-slate-400">
                    {oi.bloco} — {oi.municipio || "—"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
