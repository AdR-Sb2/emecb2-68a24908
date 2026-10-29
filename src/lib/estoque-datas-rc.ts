import type { Compra } from "./estoque-types";

/** Data manual prevalece, salvo quando removida (origem deixa de ser manual). */
export function preservarDataRcImportada(row: Record<string, unknown>, existente?: Compra): boolean {
  if (existente?.data_criacao_origem !== "manual" || !existente.dt_criacao_rc) return false;
  const diferente = typeof row.dt_criacao_rc === "string" && row.dt_criacao_rc !== existente.dt_criacao_rc;
  delete row.dt_criacao_rc;
  return diferente;
}