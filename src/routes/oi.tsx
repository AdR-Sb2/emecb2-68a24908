import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Upload,
  Download,
  Plus,
  Trash2,
  GripVertical,
  AlertTriangle,
  Loader2,
  FileImage,
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
  Header,
  Footer,
  PageNumber,
  AlignmentType,
  WidthType,
} from "docx";
import saveAs from "file-saver";

export const Route = createFileRoute("/oi")({
  component: OIPage,
  head: () => ({
    meta: [
      { title: "Gerador de OI · Eletromecânica" },
      { name: "description", content: "Gerar Ordem de Início — Relatório Fotográfico" },
    ],
  }),
});

/* ─────────────────────────── Types ──────────────────────────────── */

interface Foto {
  id: string;
  ordem: number;
  evento: string;
  descricao: string;
  file?: File;
  local_url?: string;
}

interface Intervencao {
  id: string;
  ordem: number;
  titulo_ativo: string;
  endereco_obra: string;
  rubrica_quf: string;
  fotos: Foto[];
}

interface FormData {
  numero_oi: string;
  bloco: string;
  periodo_inicio: string;
  periodo_fim: string;
  superintendencia: string;
  municipio: string;
  tipo_agua: boolean;
  tipo_esgoto: boolean;
  tipo_outros_investimentos: boolean;
  responsavel_aegea: string;
  responsavel_aguas_do_rio: string;
  objetivo_escopo_local: string;
}

/* ────────────────────── Month abbreviation ──────────────────────── */

const MESES: Record<number, string> = {
  1: "JAN", 2: "FEV", 3: "MAR", 4: "ABR", 5: "MAI", 6: "JUN",
  7: "JUL", 8: "AGO", 9: "SET", 10: "OUT", 11: "NOV", 12: "DEZ",
};

let uidCounter = 0;
function uid(): string {
  return `id_${++uidCounter}_${Math.random().toString(36).slice(2, 8)}`;
}

/* ──────────────────── Image compression ─────────────────────────── */

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
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error("compress failed"));
    }, "image/jpeg", quality);
  });
}

/* ──────────────────── File name suggestion ──────────────────────── */

function sugerirNomeArquivo(data: FormData): string {
  const bloco = (data.bloco || "Bx").replace(/\D/g, "");
  const seq = (data.numero_oi || "000").split("-").slice(-2, -1)[0] || "000";
  const mes = data.periodo_inicio
    ? MESES[new Date(data.periodo_inicio + "T12:00:00").getMonth() + 1] || "MES"
    : "MES";
  const ano = data.periodo_inicio
    ? new Date(data.periodo_inicio).getFullYear()
    : new Date().getFullYear();
  const regiao = (data.superintendencia || "REGIÃO")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .toUpperCase();
  return `RF-OI-B${bloco}-${seq}-${mes}-${ano}-${regiao}.docx`;
}

/* ──────────────────── DOCX Generation ───────────────────────────── */

let logoBuffer: ArrayBuffer | null = null;

async function getLogoBuffer(): Promise<ArrayBuffer> {
  if (logoBuffer) return logoBuffer;
  const resp = await fetch("/logo-oi.png");
  logoBuffer = await resp.arrayBuffer();
  return logoBuffer;
}

function R(text: string, opts: Record<string, unknown> = {}) {
  return new TextRun({ text, size: 20, font: "Calibri", ...opts });
}

function P(children: TextRun[], opts: Record<string, unknown> = {}) {
  return new Paragraph({ children, spacing: { after: 60 }, ...opts });
}

function periodoFormatado(inicio: string, fim: string): string {
  if (!inicio || !fim) return "";
  return `${new Date(inicio + "T12:00:00").toLocaleDateString("pt-BR")} a ${new Date(fim + "T12:00:00").toLocaleDateString("pt-BR")}`;
}

function chk(v: boolean): string {
  return v ? "☒" : "☐";
}

/* ──────────────────── Build header table ────────────────────────── */

async function criarTabelaCabecalho(data: FormData): Promise<Table> {
  const COL_W = [3111, 80, 345, 1174, 1519, 80, 4456];
  const FULL_W = COL_W.reduce((a, b) => a + b, 0);

  const cell = (text: string, span: number, opts: { bold?: boolean; size?: number } = {}) =>
    new TableCell({
      width: { size: COL_W.slice(0, span).reduce((a, b) => a + b, 0), type: WidthType.DXA },
      columnSpan: span,
      children: [P([R(text, { bold: opts.bold ?? false, size: opts.size ?? 18 })], { spacing: { after: 0 } })],
    });

  const emptyCell = (span: number = 1) =>
    new TableCell({
      width: { size: COL_W.slice(0, span).reduce((a, b) => a + b, 0), type: WidthType.DXA },
      columnSpan: span,
      children: [new Paragraph({ children: [], spacing: { after: 0 } })],
    });

  const logo = await getLogoBuffer();
  const logoCell = new TableCell({
    width: { size: COL_W[0] + COL_W[1] + COL_W[2] + COL_W[3] + COL_W[4], type: WidthType.DXA },
    columnSpan: 5,
    children: [
      new Paragraph({
        children: [
          new ImageRun({
            data: logo,
            transformation: { width: 310, height: 128 },
            type: "png",
          }),
        ],
        spacing: { after: 0 },
      }),
    ],
  });

  const rows: TableRow[] = [];

  /* Header section: logo + N° OI / Período */
  rows.push(
    new TableRow({
      children: [
        logoCell,
        emptyCell(1),
        cell(`N° Ordem de Início:\n${data.numero_oi}`, 1, { size: 18 }),
      ],
    }),
    new TableRow({
      children: [
        emptyCell(5),
        emptyCell(1),
        cell(`Período:\n${periodoFormatado(data.periodo_inicio, data.periodo_fim)}`, 1, { size: 18 }),
      ],
    }),
  );

  /* spacer row */
  rows.push(new TableRow({
    children: Array.from({ length: 7 }, (_, i) => emptyCell(1)),
  }));

  /* Superintendência / Bloco / Resp. AEGEA */
  rows.push(
    new TableRow({
      children: [
        cell(`Superintendência:\n${data.superintendencia || "—"}`, 1, { size: 18 }),
        emptyCell(1),
        cell(`Bloco: ${data.bloco || "—"}`, 2, { size: 18 }),
        emptyCell(1),
        cell(`Resp. Técnico AEGEA:\n${data.responsavel_aegea || "—"}`, 1, { size: 18 }),
      ],
    }),
  );

  /* spacer */
  rows.push(new TableRow({
    children: Array.from({ length: 7 }, (_, i) => emptyCell(1)),
  }));

  /* Município / Checkboxes / Resp. Águas do Rio */
  const checkboxText = `${chk(data.tipo_agua)} Água   ${chk(data.tipo_esgoto)} Esgoto   ${chk(data.tipo_outros_investimentos)} Outros Inv.`;
  rows.push(
    new TableRow({
      children: [
        cell(`Município:\n${data.municipio || "—"}`, 1, { size: 18 }),
        emptyCell(1),
        cell(checkboxText, 3, { size: 17 }),
        emptyCell(1),
        cell(`Resp. Técnico Águas do Rio:\n${data.responsavel_aguas_do_rio || "—"}`, 1, { size: 18 }),
      ],
    }),
  );

  /* spacer */
  rows.push(new TableRow({
    children: Array.from({ length: 7 }, (_, i) => emptyCell(1)),
  }));

  /* Objeto */
  rows.push(new TableRow({
    children: [
      new TableCell({
        width: { size: FULL_W, type: WidthType.DXA },
        columnSpan: 7,
        children: [P([R("Objeto:", { bold: true, size: 18 }), R(" Relatório Fotográfico – Contrato EPC AEGEA X Águas do Rio", { size: 18 })], { spacing: { after: 0 } })],
      }),
    ],
  }));

  /* spacer */
  rows.push(new TableRow({
    children: Array.from({ length: 7 }, (_, i) => emptyCell(1)),
  }));

  /* Objetivo/Escopo/Local */
  rows.push(new TableRow({
    children: [
      new TableCell({
        width: { size: FULL_W, type: WidthType.DXA },
        columnSpan: 7,
        children: [P([R("Objetivo/ Escopo / Local:", { bold: true, size: 18 }), R(` ${data.objetivo_escopo_local || "—"}`, { size: 18 })], { spacing: { after: 0 } })],
      }),
    ],
  }));

  /* spacer */
  rows.push(new TableRow({
    children: Array.from({ length: 7 }, (_, i) => emptyCell(1)),
  }));

  /* FOLHA (static) */
  rows.push(new TableRow({
    children: [
      new TableCell({
        width: { size: FULL_W, type: WidthType.DXA },
        columnSpan: 7,
        children: [P([R("FOLHA ", { size: 16 }), R("1/1", { size: 16 })], { spacing: { after: 0 } })],
      }),
    ],
  }));

  return new Table({
    width: { size: FULL_W, type: WidthType.DXA },
    columnWidths: COL_W,
    rows,
  });
}

/* ──────────────────── Main DOCX generator ──────────────────────── */

async function generateDocx(data: FormData, intervencoes: Intervencao[]): Promise<Blob> {
  const children: (Paragraph | Table)[] = [];

  /* ── Header table ───────────────────────────────────────────── */
  children.push(await criarTabelaCabecalho(data));
  children.push(new Paragraph({ spacing: { after: 200 } }));

  /* ── OBJETIVO ───────────────────────────────────────────────── */
  children.push(
    new Paragraph({
      children: [R("OBJETIVO", { bold: true, size: 22 })],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 100 },
    }),
  );
  children.push(
    new Paragraph({
      children: [R("O presente documento tem como objetivo evidenciar os serviços medidos no período de referência.")],
      spacing: { after: 200 },
    }),
  );

  /* ── INTERVENÇÕES ───────────────────────────────────────────── */
  children.push(
    new Paragraph({
      children: [R("INTERVENÇÕES", { bold: true, size: 22 })],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300, after: 200 },
    }),
  );

  for (const iv of intervencoes) {
    /* title */
    children.push(
      new Paragraph({
        children: [R(`TÍTULO DO ATIVO: ${iv.titulo_ativo}`, { bold: true, size: 22 })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 100 },
      }),
    );
    /* address */
    children.push(
      new Paragraph({
        children: [R(`Endereço da obra: ${iv.endereco_obra || "—"}`, { bold: false, size: 20 })],
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 40 },
      }),
    );
    /* QUF */
    children.push(
      new Paragraph({
        children: [R(`Rubrica QUF: ${iv.rubrica_quf || "—"}`, { size: 20 })],
        spacing: { after: 100 },
      }),
    );

    /* Photos */
    if (iv.fotos.length === 0) {
      children.push(
        new Paragraph({
          children: [R("Nenhuma foto registrada para esta intervenção.", { italics: true, color: "999999" })],
          spacing: { after: 200 },
        }),
      );
    } else {
      for (let i = 0; i < iv.fotos.length; i += 2) {
        const f1 = iv.fotos[i];
        const f2 = iv.fotos[i + 1];
        const rowCells: TableCell[] = [];

        for (const f of [f1, f2]) {
          if (!f) {
            rowCells.push(
              new TableCell({
                width: { size: 5200, type: WidthType.DXA },
                children: [new Paragraph({ children: [], spacing: { after: 0 } })],
              }),
            );
            continue;
          }

          const cellChildren: Paragraph[] = [];

          if (f.file) {
            const ab = await f.file.arrayBuffer();
            const ext = f.file.type === "image/png" ? "png" : "jpg";
            cellChildren.push(
              new Paragraph({
                children: [
                  new ImageRun({
                    data: ab,
                    transformation: { width: 450, height: 338 },
                    type: ext,
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 40 },
              }),
            );
          }

          cellChildren.push(
            new Paragraph({
              children: [R("Evento: ", { bold: true, size: 18 }), R(f.evento || "—", { size: 18 })],
              spacing: { after: 20 },
            }),
          );
          cellChildren.push(
            new Paragraph({
              children: [R("Descrição: ", { bold: true, size: 18 }), R(f.descricao || "—", { size: 18 })],
              spacing: { after: 60 },
            }),
          );

          rowCells.push(
            new TableCell({
              width: { size: 5200, type: WidthType.DXA },
              children: cellChildren,
            }),
          );
        }

        children.push(
          new Table({
            width: { size: 10400, type: WidthType.DXA },
            columnWidths: [5200, 5200],
            rows: [new TableRow({ children: rowCells })],
          }),
        );
        children.push(new Paragraph({ spacing: { after: 100 } }));
      }
    }
  }

  /* ── Signature ──────────────────────────────────────────────── */
  children.push(new Paragraph({ spacing: { before: 400 } }));
  children.push(
    new Paragraph({
      children: [R("AEGEA SANEAMENTO E PARTICIPAÇÕES S.A.", { bold: true, size: 22 })],
      alignment: AlignmentType.CENTER,
    }),
  );
  children.push(new Paragraph({ spacing: { before: 200 } }));
  if (data.responsavel_aguas_do_rio) {
    children.push(
      new Paragraph({
        children: [R(data.responsavel_aguas_do_rio, { size: 22 })],
        alignment: AlignmentType.CENTER,
      }),
    );
    children.push(
      new Paragraph({
        children: [R("Responsável Técnico", { italics: true, size: 18 })],
        alignment: AlignmentType.CENTER,
      }),
    );
  }

  /* ── Build document ─────────────────────────────────────────── */
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
          default: new Header({
            children: [
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        children: [
                          new Paragraph({
                            children: [R("RELATÓRIO FOTOGRÁFICO", { size: 16, bold: true }), new TextRun({ break: 1 }), R("CONTRATO EPC AEGEA X ÁGUAS DO RIO", { size: 14 })],
                            spacing: { after: 0 },
                          }),
                        ],
                      }),
                      new TableCell({
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        children: [
                          new Paragraph({
                            children: [R(`N° da O.I: ${data.numero_oi || ""}`, { size: 16 })],
                            alignment: AlignmentType.RIGHT,
                            spacing: { after: 0 },
                          }),
                          new Paragraph({
                            children: [R("Revisão: 00", { size: 14 })],
                            alignment: AlignmentType.RIGHT,
                            spacing: { after: 0 },
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 0 },
                children: [R("Relatório Fotográfico Contrato EPC AEGEA x Águas do Rio – Revisão 01", { size: 16 })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 0 },
                children: [
                  new TextRun({ text: "Página ", size: 16 }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16 }),
                  new TextRun({ text: " de ", size: 16 }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16 }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/* ──────────────────── Main Page Component ──────────────────────── */

const inputCls =
  "min-h-11 w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#1f7ad6] focus:outline-none focus:ring-2 focus:ring-[#1f7ad6]/20";
const labelCls = "block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1";
const cardCls =
  "rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm";

function OIPage() {
  const [data, setData] = useState<FormData>({
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
  });

  const [intervencoes, setIntervencoes] = useState<Intervencao[]>([]);
  const [generating, setGenerating] = useState(false);
  const [filename, setFilename] = useState("");
  const [dragIntervIdx, setDragIntervIdx] = useState<number | null>(null);

  function updateData(patch: Partial<FormData>) {
    setData((prev) => ({ ...prev, ...patch }));
  }

  /* ── Intervention management ──────────────────────────────────── */

  function addIntervencao() {
    setIntervencoes((prev) => [
      ...prev,
      {
        id: uid(),
        ordem: prev.length + 1,
        titulo_ativo: "",
        endereco_obra: "",
        rubrica_quf: "",
        fotos: [],
      },
    ]);
  }

  function updateIntervencao(idx: number, patch: Partial<Intervencao>) {
    setIntervencoes((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }

  function removeIntervencao(idx: number) {
    if (intervencoes[idx].fotos.length > 0) {
      if (!confirm("Esta intervenção possui fotos. Excluir mesmo assim?")) return;
    }
    setIntervencoes((prev) => prev.filter((_, i) => i !== idx).map((iv, i) => ({ ...iv, ordem: i + 1 })));
  }

  function handleIntervDragStart(idx: number) { setDragIntervIdx(idx); }
  function handleIntervDragOver(e: React.DragEvent) { e.preventDefault(); }
  function handleIntervDrop(targetIdx: number) {
    if (dragIntervIdx === null || dragIntervIdx === targetIdx) {
      setDragIntervIdx(null);
      return;
    }
    setIntervencoes((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIntervIdx, 1);
      next.splice(targetIdx, 0, moved);
      return next.map((iv, i) => ({ ...iv, ordem: i + 1 }));
    });
    setDragIntervIdx(null);
  }

  /* ── Photo management ─────────────────────────────────────────── */

  async function handlePhotoUpload(ivIdx: number, files: FileList) {
    const novos: Foto[] = [];
    for (let i = 0; i < files.length; i++) {
      const compressed = await compressImage(files[i]);
      const local_url = URL.createObjectURL(compressed);
      novos.push({
        id: uid(),
        ordem: intervencoes[ivIdx].fotos.length + i + 1,
        evento: "",
        descricao: "",
        file: new File([compressed], files[i].name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }),
        local_url,
      });
    }
    setIntervencoes((prev) => {
      const next = [...prev];
      next[ivIdx] = { ...next[ivIdx], fotos: [...next[ivIdx].fotos, ...novos] };
      return next;
    });
  }

  function updateFoto(ivIdx: number, fi: number, patch: Partial<Foto>) {
    setIntervencoes((prev) => {
      const next = [...prev];
      next[ivIdx] = {
        ...next[ivIdx],
        fotos: next[ivIdx].fotos.map((f, i) => (i === fi ? { ...f, ...patch } : f)),
      };
      return next;
    });
  }

  function removeFoto(ivIdx: number, fi: number) {
    setIntervencoes((prev) => {
      const next = [...prev];
      next[ivIdx] = {
        ...next[ivIdx],
        fotos: next[ivIdx].fotos.filter((_, i) => i !== fi).map((f, i) => ({ ...f, ordem: i + 1 })),
      };
      return next;
    });
  }

  /* ── Validation ───────────────────────────────────────────────── */

  function podeGerar(): boolean {
    if (!data.numero_oi.trim()) return false;
    if (!data.periodo_inicio || !data.periodo_fim) return false;
    if (intervencoes.length === 0) return false;
    return intervencoes.some((iv) => iv.titulo_ativo.trim().length > 0);
  }

  const semFotos = intervencoes.filter((iv) => iv.fotos.length === 0);

  /* ── Generate ─────────────────────────────────────────────────── */

  async function handleGerar() {
    if (!data.numero_oi.trim() || !data.periodo_inicio || !data.periodo_fim) return;
    if (intervencoes.length === 0) return;
    if (!intervencoes.some((iv) => iv.titulo_ativo.trim())) return;

    if (semFotos.length > 0) {
      if (!confirm(`${semFotos.length} intervenção(ões) sem foto. Gerar mesmo assim?`)) return;
    }

    setGenerating(true);
    try {
      const blob = await generateDocx(data, intervencoes);
      const name = filename.trim() || sugerirNomeArquivo(data);
      saveAs(blob, name);
    } catch (err: unknown) {
      alert("Erro ao gerar documento: " + ((err as Error)?.message || ""));
      console.error(err);
    }
    setGenerating(false);
  }

  /* ── Render ───────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
      <div className="mx-auto max-w-5xl p-4 md:p-6">
        {/* Header */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#002d74] via-[#003087] to-[#00AEEF] p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
              <FileImage className="h-6 w-6 text-white" />
            </div>
            <div className="text-white">
              <h1 className="text-lg font-bold">Gerador de OI</h1>
              <p className="text-sm text-cyan-50/80">Ordem de Início — Relatório Fotográfico</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* ── Dados Gerais ────────────────────────────────────── */}
          <section className={cardCls}>
            <h2 className="mb-4 text-sm font-bold text-[#0b3a73] dark:text-white uppercase tracking-wide">
              Dados Gerais
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>
                  Bloco <span className="text-red-500">*</span>
                </label>
                <select
                  value={data.bloco}
                  onChange={(e) => updateData({ bloco: e.target.value })}
                  className={inputCls}
                >
                  <option value="">Selecione</option>
                  <option value="Bloco 1">Bloco 1</option>
                  <option value="Bloco 4">Bloco 4</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>
                  N° Ordem de Início <span className="text-red-500">*</span>
                </label>
                <input
                  value={data.numero_oi}
                  onChange={(e) => updateData({ numero_oi: e.target.value })}
                  placeholder="OI-B1-003-2026"
                  className={inputCls + " font-mono"}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className={labelCls}>
                  Período Início <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={data.periodo_inicio}
                  onChange={(e) => updateData({ periodo_inicio: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Período Fim <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={data.periodo_fim}
                  onChange={(e) => updateData({ periodo_fim: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className={labelCls}>Superintendência</label>
                <input
                  value={data.superintendencia}
                  onChange={(e) => updateData({ superintendencia: e.target.value })}
                  placeholder="Ex: Interior Lagos"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Município</label>
                <input
                  value={data.municipio}
                  onChange={(e) => updateData({ municipio: e.target.value })}
                  placeholder="Ex: Araruama"
                  className={inputCls}
                />
              </div>
            </div>
            <fieldset className="mt-4 border border-slate-200 dark:border-slate-700 rounded-md p-3">
              <legend className="text-xs font-medium text-slate-600 dark:text-slate-300 px-1">
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
                      checked={(data as unknown as Record<string, boolean>)[t.key] ?? false}
                      onChange={(e) => updateData({ [t.key]: e.target.checked } as unknown as Partial<FormData>)}
                      className="h-4 w-4 rounded border-slate-300 text-[#0b3a73] focus:ring-[#0b3a73]"
                    />
                    {t.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className={labelCls}>Responsável Técnico AEGEA</label>
                <input
                  value={data.responsavel_aegea}
                  onChange={(e) => updateData({ responsavel_aegea: e.target.value })}
                  placeholder="Nome completo"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Responsável Técnico Águas do Rio</label>
                <input
                  value={data.responsavel_aguas_do_rio}
                  onChange={(e) => updateData({ responsavel_aguas_do_rio: e.target.value })}
                  placeholder="Nome completo"
                  className={inputCls}
                />
              </div>
            </div>
            <div className="mt-4">
              <label className={labelCls}>Objetivo / Escopo / Local</label>
              <textarea
                value={data.objetivo_escopo_local}
                onChange={(e) => updateData({ objetivo_escopo_local: e.target.value })}
                rows={3}
                placeholder="Descreva o objetivo, escopo e local..."
                className={inputCls + " min-h-[70px]"}
              />
            </div>
          </section>

          {/* ── Intervenções ────────────────────────────────────── */}
          <section className={cardCls}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#0b3a73] dark:text-white uppercase tracking-wide">
                Intervenções
              </h2>
              <span className="text-xs text-slate-400">{intervencoes.length} registrada(s)</span>
            </div>

            {intervencoes.length === 0 && (
              <p className="mb-3 text-xs text-slate-400">
                Nenhuma intervenção cadastrada. Clique no botão abaixo para adicionar.
              </p>
            )}

            <div className="space-y-3">
              {intervencoes.map((iv, idx) => (
                <div
                  key={iv.id}
                  draggable
                  onDragStart={() => handleIntervDragStart(idx)}
                  onDragOver={handleIntervDragOver}
                  onDrop={() => handleIntervDrop(idx)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/30 p-3 shadow-sm"
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-2 cursor-grab text-slate-400 hover:text-slate-600">
                      <GripVertical className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className={labelCls}>
                            Título do Ativo <span className="text-red-500">*</span>
                          </label>
                          <input
                            value={iv.titulo_ativo}
                            onChange={(e) => updateIntervencao(idx, { titulo_ativo: e.target.value })}
                            placeholder="(EEAT) 1020 – MORRO DO GIL"
                            className={inputCls + " min-h-9"}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Endereço da Obra</label>
                          <input
                            value={iv.endereco_obra}
                            onChange={(e) => updateIntervencao(idx, { endereco_obra: e.target.value })}
                            placeholder="Rua X, nº Y"
                            className={inputCls + " min-h-9"}
                          />
                        </div>
                        <div className="flex gap-1">
                          <div className="flex-1">
                            <label className={labelCls}>Rubrica QUF</label>
                            <input
                              value={iv.rubrica_quf}
                              onChange={(e) => updateIntervencao(idx, { rubrica_quf: e.target.value })}
                              placeholder="Código"
                              className={inputCls + " min-h-9"}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeIntervencao(idx)}
                            className="mt-5 rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                            title="Excluir intervenção"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* ── Photos ─────────────────────────────── */}
                      <div className="pl-1">
                        <div className="flex items-center gap-2 mb-2">
                          <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-md border border-dashed border-slate-300 dark:border-slate-600 px-3 py-1.5 text-xs text-slate-500 hover:border-[#0b3a73] hover:text-[#0b3a73] transition">
                            <Upload className="h-3.5 w-3.5" />
                            Adicionar Fotos
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => e.target.files && handlePhotoUpload(idx, e.target.files)}
                            />
                          </label>
                          <span className="text-xs text-slate-400">{iv.fotos.length} foto(s)</span>
                        </div>

                        {iv.fotos.length === 0 && (
                          <p className="text-xs text-amber-500 flex items-center gap-1 mb-1">
                            <AlertTriangle className="h-3 w-3" />
                            Sem fotos — a intervenção será gerada sem imagens.
                          </p>
                        )}

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {iv.fotos.map((foto, fi) => (
                            <div
                              key={foto.id}
                              className="relative rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-1.5"
                            >
                              <button
                                type="button"
                                onClick={() => removeFoto(idx, fi)}
                                className="absolute -right-1.5 -top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow"
                              >
                                <X className="h-3 w-3" />
                              </button>
                              {foto.local_url && (
                                <img
                                  src={foto.local_url}
                                  alt={`Foto ${fi + 1}`}
                                  className="w-full h-20 object-cover rounded mb-1"
                                />
                              )}
                              <span className="text-[10px] text-slate-400 block mb-1">#{foto.ordem}</span>
                              <input
                                value={foto.evento}
                                onChange={(e) => updateFoto(idx, fi, { evento: e.target.value })}
                                placeholder="Evento"
                                className="w-full rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 px-1 py-0.5 text-[11px] mb-1"
                              />
                              <input
                                value={foto.descricao}
                                onChange={(e) => updateFoto(idx, fi, { descricao: e.target.value })}
                                placeholder="Descrição"
                                className="w-full rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 px-1 py-0.5 text-[11px]"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addIntervencao}
              className="mt-3 flex items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 p-3 w-full text-sm text-slate-500 hover:border-[#0b3a73] hover:text-[#0b3a73] transition"
            >
              <Plus className="h-4 w-4" />
              Adicionar Intervenção
            </button>
          </section>

          {/* ── Gerar DOC ───────────────────────────────────────── */}
          <section className={cardCls + " border-2 border-dashed border-[#0b3a73]/20 dark:border-[#1f7ad6]/20"}>
            <h2 className="mb-3 text-sm font-bold text-[#0b3a73] dark:text-white uppercase tracking-wide">
              Gerar Documento
            </h2>

            <div className="mb-3">
              <label className={labelCls}>Nome do arquivo (opcional)</label>
              <input
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder={sugerirNomeArquivo(data)}
                className={inputCls + " font-mono text-xs"}
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Deixe em branco para usar o nome sugerido automaticamente.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleGerar}
                disabled={!podeGerar() || generating}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0b3a73] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1f7ad6] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Gerar DOC
                  </>
                )}
              </button>

              {semFotos.length > 0 && (
                <span className="text-xs text-amber-500 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {semFotos.length} intervenção(ões) sem foto
                </span>
              )}

              {!podeGerar() && (
                <span className="text-xs text-red-400">
                  Preencha N° OI, Período e ao menos 1 intervenção com Título do Ativo.
                </span>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
