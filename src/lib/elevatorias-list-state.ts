export type StatusCarregamentoElevatorias = "loading" | "success" | "error";

export type EstadoVisualListaElevatorias =
  | "loading"
  | "error"
  | "empty"
  | "filtered-empty"
  | "data";

/**
 * Resolve which list state the page should render.
 * Previously loaded rows are kept visible during refreshes or failed revalidations.
 */
export function resolverEstadoVisualListaElevatorias(
  status: StatusCarregamentoElevatorias,
  totalRegistros: number,
  registrosFiltrados: number,
  possuiFiltrosAtivos: boolean,
): EstadoVisualListaElevatorias {
  const total = Math.max(0, totalRegistros);
  const filtrados = Math.max(0, registrosFiltrados);

  if (total === 0) {
    if (status === "loading") return "loading";
    if (status === "error") return "error";
    return "empty";
  }

  if (filtrados === 0 && possuiFiltrosAtivos) return "filtered-empty";

  // When data already exists, never replace it with skeleton/empty/error on refresh.
  return "data";
}
