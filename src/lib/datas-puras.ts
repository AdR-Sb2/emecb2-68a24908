// Datas "puras" (AAAA-MM-DD), sem fuso: evita o deslocamento de um dia no Brasil.
export function diaUTC(iso: string | null | undefined): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ""));
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function hojeISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function diasEntre(inicio: string | null | undefined, fim: string | null | undefined) {
  const a = diaUTC(inicio);
  const b = diaUTC(fim);
  if (a === null || b === null) return null;
  return Math.round((b - a) / 86400000);
}

export function formatarDataPura(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ""));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso ?? "");
}

/** Retorna mensagem de erro ou null se a data de criação da RC for válida. */
export function validarDataRc(criacao: string, chegada?: string | null): string | null {
  const c = diaUTC(criacao);
  if (c === null) return "Data inválida.";
  if (c > (diaUTC(hojeISO()) as number)) return "A data de criação não pode ser futura.";
  const h = diaUTC(chegada);
  if (h !== null && c > h) return "A data de criação não pode ser posterior à data de chegada.";
  return null;
}
