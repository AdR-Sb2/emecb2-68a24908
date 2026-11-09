// Regra única de "isto é uma O.S." para os indicadores do Hub que vêm de
// field_atividades: linhas de atividade administrativa (DDS, almoço,
// deslocamento...) chegam sem ordem de manutenção, então o número vem vazio,
// zero ou inválido e não pode entrar na contagem de O.S. executadas.

/**
 * Verdadeiro quando `ordem_manutencao` representa uma O.S. real:
 * número finito, inteiro e maior que zero.
 */
export function isOrdemServico(ordem: unknown): boolean {
  const numero = typeof ordem === "number" ? ordem : Number(ordem);
  return Number.isFinite(numero) && Number.isInteger(numero) && numero > 0;
}

/**
 * Chave de deduplicação de uma atividade: pela O.S. quando ela existe,
 * senão pelo próprio id da atividade (atividades sem O.S. não se agrupam).
 */
export function chaveDaAtividade(
  atividade: { id_atividade?: number | null; ordem_manutencao?: number | null },
  fallbackId: number | string,
): string {
  return isOrdemServico(atividade.ordem_manutencao)
    ? `om:${atividade.ordem_manutencao}`
    : `at:${atividade.id_atividade ?? fallbackId}`;
}
