import * as XLSX from "xlsx";
import { supabase } from "./supabase";
import { derivarNatureza, derivarStatusSimplificado } from "./registros-types";

export type ImportRegistrosResumo = {
  total: number;
  importados: number;
  atualizados: number;
  semElevatoria: number;
  semOrdem: number;
};

type RowRecord = Record<string, unknown>;

function normKey(s: string): string {
  return s
    .replace(/^\uFEFF/, "")
    .replace(/\n/g, "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

// Mapeia qualquer variação do nome da coluna SAP para o campo padrão
const FIELD_ALIASES: Record<string, string> = {
  ordem: "ordem",
  "n ordem": "ordem",
  "n. ordem": "ordem",
  "nº ordem": "ordem",
  "num ordem": "ordem",
  "numero da ordem": "ordem",
  os: "ordem",
  nota: "nota",
  "texto breve": "texto_breve",
  "texto descritivo": "texto_breve",
  descricao: "texto_breve",
  "texto longo": "texto_longo",
  "nome da lista": "lista",
  "nome lista": "lista",
  lista: "lista",
  "local de instalacao": "local_instalacao",
  "local instalacao": "local_instalacao",
  "local instal.": "local_instalacao",
  planta: "local_instalacao",
  local: "local_instalacao",
  "tipo de ordem": "tipo_ordem",
  "tipo ordem": "tipo_ordem",
  "tipo de atividade": "tipo_ordem",
  "tipo de atividade de manutencao": "tipo_ordem",
  "tipo de atividade manut": "tipo_ordem",
  "tipo atividade de manut.": "tipo_ordem",
  "tipo atividade de manutenção": "tipo_ordem",
  "tipo da atividade": "tipo_ordem",
  "tipo atividade": "tipo_ordem",
  "tipo atividade manut": "tipo_ordem",
  "texto prioridade": "prioridade",
  prioridade: "prioridade",
  "prioridade texto": "prioridade",
  "status do sistema": "status_sistema",
  "status da atividade": "status_sistema",
  "status sistema": "status_sistema",
  status: "status_sistema",
  "data de entrada": "data_entrada",
  "data entrada": "data_entrada",
  "data do documento": "data_entrada",
  data: "data_entrada",
  "dt entrada": "data_entrada",
  "data de modif.mestre ordens": "data_modificacao",
  "data de modif mestre ordens": "data_modificacao",
  "data de modif. mestre ordens": "data_modificacao",
  "data modif.mestre ordens": "data_modificacao",
  "data de modificacao do mestre de ordens": "data_modificacao",
  "data de modificacao": "data_modificacao",
  "data de modificaçao": "data_modificacao",
  "data modificacao": "data_modificacao",
  "data modif": "data_modificacao",
  "data da modificacao": "data_modificacao",
  "modificado em": "data_modificacao",
  "modificada em": "data_modificacao",
  "inicio do sla": "inicio_sla",
  "inicio sla": "inicio_sla",
  "fim do sla": "fim_sla",
  "fim sla": "fim_sla",
  "criado por": "criado_por",
  autor: "criado_por",
  "ultimo modificador": "modificado_por",
  "modificado por": "modificado_por",
};

function parseDate(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") {
    const s = String(v);
    if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
    if (v > 20000) {
      const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(v) * 86_400_000);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
    return null;
  }
  const s = String(v).trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})/);
  if (m) {
    let d = +m[1];
    let mo = +m[2];
    const y = +m[3] < 100 ? +m[3] + 2000 : +m[3];
    if (mo > 12 && d <= 12) [d, mo] = [mo, d];
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  return null;
}

function toText(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).trim();
  return s || null;
}

const CHUNK = 1000;

export async function importarRegistrosSAP(file: File): Promise<ImportRegistrosResumo> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<RowRecord>(ws, { defval: null });

  if (!rows.length) throw new Error("Planilha vazia ou inválida.");

  const headerMap: Record<string, string> = {};
  for (const h of Object.keys(rows[0] ?? {})) {
    const canon = FIELD_ALIASES[normKey(h)];
    if (canon && !headerMap[canon]) headerMap[canon] = h;
  }

  if (!headerMap["ordem"]) {
    throw new Error(
      "Coluna 'Ordem' não encontrada na planilha. A planilha precisa ter a coluna com o número da ordem.",
    );
  }

  const get = (r: RowRecord, field: string): unknown =>
    headerMap[field] ? r[headerMap[field]] : undefined;

  const { data: elevatorias } = await supabase.from("elevatorias").select("id, planta");
  const plantaToId = new Map<string, number>();
  for (const e of elevatorias ?? []) {
    if (e.planta) plantaToId.set(normKey(String(e.planta)), e.id as number);
  }

  const registros: Array<Record<string, unknown>> = [];
  let semElevatoria = 0;
  let semOrdem = 0;

  for (const r of rows) {
    const ordem = toText(get(r, "ordem"));
    const localInstalacao = toText(get(r, "local_instalacao"));
    const lista = toText(get(r, "lista"));
    const planta = lista ? lista.split(" - ")[0].trim() || null : localInstalacao;
    const textoBreve = toText(get(r, "texto_breve"));
    if (!ordem && !planta && !textoBreve && !toText(get(r, "nota"))) continue;

    if (!ordem) semOrdem++;
    const tipoOrdem = toText(get(r, "tipo_ordem"));
    const statusSistema = toText(get(r, "status_sistema"));
    const elevatoriaId = planta ? (plantaToId.get(normKey(planta)) ?? null) : null;
    if (!elevatoriaId) semElevatoria++;

    registros.push({
      elevatoria_id: elevatoriaId,
      planta,
      local_instalacao: localInstalacao,
      ordem,
      nota: toText(get(r, "nota")),
      texto_breve: textoBreve,
      texto_longo: toText(get(r, "texto_longo")),
      tipo_ordem: tipoOrdem,
      natureza: derivarNatureza(tipoOrdem),
      prioridade: toText(get(r, "prioridade")),
      status_sistema: statusSistema,
      status_simplificado: derivarStatusSimplificado(statusSistema),
      data_entrada: parseDate(get(r, "data_entrada")),
      data_modificacao: parseDate(get(r, "data_modificacao")),
      inicio_sla: toText(get(r, "inicio_sla")),
      fim_sla: toText(get(r, "fim_sla")),
      criado_por: toText(get(r, "criado_por")),
      modificado_por: toText(get(r, "modificado_por")),
      origem_import: "sap",
    });
  }

  if (!registros.length) throw new Error("Nenhum registro válido encontrado na planilha.");

  const ordens = [...new Set(registros.map((r) => r.ordem).filter((o): o is string => Boolean(o)))];
  const existingOrdens = new Set<string>();
  const dadosExistentes = new Map<
    string,
    {
      elevatoria_id: number | null;
      pdf_anexo_url: string | null;
      anexado_por: string | null;
      anexado_em: string | null;
    }
  >();
  for (let i = 0; i < ordens.length; i += CHUNK) {
    const { data } = await supabase
      .from("registros_atendimento")
      .select("ordem, elevatoria_id, pdf_anexo_url, anexado_por, anexado_em")
      .in("ordem", ordens.slice(i, i + CHUNK));
    for (const d of data ?? []) {
      existingOrdens.add(String(d.ordem));
      dadosExistentes.set(String(d.ordem), {
        elevatoria_id: (d.elevatoria_id as number | null) ?? null,
        pdf_anexo_url: (d.pdf_anexo_url as string | null) ?? null,
        anexado_por: (d.anexado_por as string | null) ?? null,
        anexado_em: (d.anexado_em as string | null) ?? null,
      });
    }
  }

  for (const r of registros) {
    if (!r.ordem) continue;
    const ex = dadosExistentes.get(String(r.ordem));
    if (!ex) continue;
    r.elevatoria_id = ex.elevatoria_id;
    r.pdf_anexo_url = ex.pdf_anexo_url;
    r.anexado_por = ex.anexado_por;
    r.anexado_em = ex.anexado_em;
  }

  const atualizados = registros.filter(
    (r) => r.ordem && existingOrdens.has(r.ordem as string),
  ).length;
  const importados = registros.length - atualizados;

  for (let i = 0; i < registros.length; i += CHUNK) {
    const { error } = await supabase
      .from("registros_atendimento")
      .upsert(registros.slice(i, i + CHUNK), { onConflict: "ordem" });
    if (error) throw new Error("Erro ao salvar registros: " + error.message);
  }

  return { total: registros.length, importados, atualizados, semElevatoria, semOrdem };
}
