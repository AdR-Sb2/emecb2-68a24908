// Regras puras para o indicador de completude das fichas de elevatórias.
// Cada elevatória recebe um percentual próprio; a média geral dá o mesmo peso
// para cada elevatória, independentemente do número de campos em seu cadastro.

export function calcularPercentualCompletude(
  totalCampos: number,
  camposPreenchidos: number,
  camposNaoAplicaveis: number,
): number {
  const total = Math.max(0, Number.isFinite(totalCampos) ? totalCampos : 0);
  const naoAplicaveis = Math.min(
    total,
    Math.max(0, Number.isFinite(camposNaoAplicaveis) ? camposNaoAplicaveis : 0),
  );
  const aplicaveis = total - naoAplicaveis;

  if (aplicaveis === 0) return 100;

  // N/A sai do denominador; também não pode entrar no numerador.
  const preenchidos = Math.min(
    aplicaveis,
    Math.max(0, Number.isFinite(camposPreenchidos) ? camposPreenchidos : 0),
  );

  return Math.round((preenchidos / aplicaveis) * 100);
}

export function calcularMediaCompletudeElevatorias(
  percentuais: readonly (number | null | undefined)[],
): number {
  const validos = percentuais.filter(
    (percentual): percentual is number =>
      typeof percentual === "number" &&
      Number.isFinite(percentual) &&
      percentual >= 0 &&
      percentual <= 100,
  );

  if (validos.length === 0) return 0;

  const soma = validos.reduce((total, percentual) => total + percentual, 0);
  return Math.round(soma / validos.length);
}
