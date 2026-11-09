export function isOrdemServico(ordem: number | null | undefined): boolean {
  const numero = String(ordem ?? "").trim();
  return numero.startsWith("800") || numero.startsWith("900");
}
