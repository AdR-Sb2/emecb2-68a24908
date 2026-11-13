import { describe, expect, it } from "vitest";
import {
  calcularMediaCompletudeElevatorias,
  calcularPercentualCompletude,
} from "./elevatoria-completude";

describe("calcularPercentualCompletude", () => {
  it("desconsidera campos N/A no numerador e no denominador", () => {
    // 4 preenchidos de 7 aplicáveis; outros 3 campos são N/A.
    expect(calcularPercentualCompletude(10, 4, 3)).toBe(57);
  });

  it("retorna 100% quando todos os campos são não aplicáveis", () => {
    expect(calcularPercentualCompletude(8, 0, 8)).toBe(100);
  });

  it("retorna zero quando nenhum campo aplicável foi preenchido", () => {
    expect(calcularPercentualCompletude(12, 0, 0)).toBe(0);
  });

  it("limita a quantidade de preenchidos ao número de campos aplicáveis", () => {
    expect(calcularPercentualCompletude(10, 10, 4)).toBe(100);
  });
});

describe("calcularMediaCompletudeElevatorias", () => {
  it("calcula a média simples dos percentuais das elevatórias", () => {
    expect(calcularMediaCompletudeElevatorias([40, 70, 100])).toBe(70);
  });

  it("dá o mesmo peso para cada elevatória, sem ponderar por quantidade de campos", () => {
    // A elevatória A pode ter muito mais campos que a B; cada percentual pesa 50%.
    expect(calcularMediaCompletudeElevatorias([20, 100])).toBe(60);
  });

  it("ignora valores ausentes e fora da faixa percentual", () => {
    expect(calcularMediaCompletudeElevatorias([80, null, undefined, 120, -2, 60])).toBe(70);
  });

  it("retorna zero quando não há elevatórias com percentual calculado", () => {
    expect(calcularMediaCompletudeElevatorias([])).toBe(0);
  });
});
