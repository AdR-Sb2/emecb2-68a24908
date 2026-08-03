export type RegistroInformacao = {
  id: number;
  elevatoria_id: number | null;
  texto: string;
  autor_id: string | null;
  autor_nome: string | null;
  criado_em: string;
};

export type RegistroAtendimento = {
  id: number;
  elevatoria_id: number | null;
  planta: string | null;
  local_instalacao: string | null;
  ordem: string | null;
  nota: string | null;
  texto_breve: string | null;
  texto_longo: string | null;
  tipo_ordem: string | null;
  natureza: string | null;
  prioridade: string | null;
  status_sistema: string | null;
  status_simplificado: string | null;
  data_entrada: string | null;
  data_modificacao: string | null;
  criado_por: string | null;
  modificado_por: string | null;
  pdf_anexo_url: string | null;
  anexado_por: string | null;
  anexado_em: string | null;
  origem_import: string | null;
  criado_em: string;
  atualizado_em: string;
};

const TIPOS_CORRETIVA = ["ZNTE", "ZNTP", "ZTRE"];
const TIPOS_PREVENTIVA = ["ZTPC", "ZTPD", "ZTPF"];

export function derivarNatureza(tipoOrdem: string | null | undefined): string {
  const t = (tipoOrdem ?? "").toUpperCase().trim();
  if (TIPOS_CORRETIVA.includes(t)) return "corretiva";
  if (TIPOS_PREVENTIVA.includes(t)) return "preventiva";
  return "outras";
}

export function derivarStatusSimplificado(status: string | null | undefined): string | null {
  const s = (status ?? "").toUpperCase().trim();
  if (s.startsWith("ABER")) return "Aberta";
  if (s.startsWith("LIB")) return "Liberada";
  if (s.startsWith("ENTE")) return "Encerrada Técnica";
  if (s.startsWith("ENCE")) return "Encerrada";
  return null;
}
