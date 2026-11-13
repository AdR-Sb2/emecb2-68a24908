import { describe, expect, it } from "vitest";
import { resolverEstadoVisualListaElevatorias } from "./elevatorias-list-state";

describe("resolverEstadoVisualListaElevatorias", () => {
  it("mantém skeleton enquanto a primeira requisição está pendente", () => {
    expect(resolverEstadoVisualListaElevatorias("loading", 0, 0, false)).toBe("loading");
  });

  it("mostra vazio somente após sucesso com zero registros", () => {
    expect(resolverEstadoVisualListaElevatorias("success", 0, 0, false)).toBe("empty");
  });

  it("mostra erro quando a requisição falha sem dados anteriores", () => {
    expect(resolverEstadoVisualListaElevatorias("error", 0, 0, false)).toBe("error");
  });

  it("diferencia zero resultados de filtros de uma lista sem cadastros", () => {
    expect(resolverEstadoVisualListaElevatorias("success", 12, 0, true)).toBe(
      "filtered-empty",
    );
  });

  it("mantém os últimos dados visíveis enquanto revalida", () => {
    expect(resolverEstadoVisualListaElevatorias("loading", 12, 12, false)).toBe("data");
  });

  it("mantém os últimos dados visíveis se a revalidação falhar", () => {
    expect(resolverEstadoVisualListaElevatorias("error", 12, 12, false)).toBe("data");
  });
});
