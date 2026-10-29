/** Lê números nativos do Excel e textos SAP em formato brasileiro ou decimal. */
export function numeroSap(valor: unknown): number {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
  let texto = String(valor ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(/^R\$/, "");
  if (!texto) return 0;
  if (texto.startsWith("(") && texto.endsWith(")")) texto = `-${texto.slice(1, -1)}`;
  if (texto.endsWith("-")) texto = `-${texto.slice(0, -1)}`;
  if (texto.includes(",")) {
    texto = texto.replace(/\./g, "").replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(texto)) {
    texto = texto.replace(/\./g, "");
  }
  const numero = Number(texto);
  return Number.isFinite(numero) ? numero : 0;
}
