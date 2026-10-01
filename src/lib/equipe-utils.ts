export type VarianteEquipe = { texto: string; qtd: number };
export type AliasEquipe = {
  alias_chave: string;
  destino_chave: string;
  destino_rotulo: string;
};
export type AliasIntegrante = { alias_nome: string; destino_nome: string };

function normalizarEspacos(texto: string): string {
  return texto.trim().replace(/\s+/g, " ");
}

export function normalizarIntegrante(raw: string | null | undefined): string {
  return (raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function resolverNomeIntegrante(
  raw: string,
  aliases: AliasIntegrante[],
): { chave: string; rotulo: string } {
  const mapa = new Map(
    aliases.map((alias) => [normalizarIntegrante(alias.alias_nome), alias.destino_nome]),
  );
  let chave = normalizarIntegrante(raw);
  let rotulo = normalizarEspacos(raw);
  const visitados = new Set<string>();

  while (mapa.has(chave) && !visitados.has(chave)) {
    visitados.add(chave);
    rotulo = normalizarEspacos(mapa.get(chave) || rotulo);
    chave = normalizarIntegrante(rotulo);
  }

  return { chave, rotulo };
}

export function integranteChaveFinal(
  raw: string | null | undefined,
  aliases: AliasIntegrante[] = [],
): string {
  return resolverNomeIntegrante(raw || "", aliases).chave;
}

export function integranteRotuloFinal(
  raw: string | null | undefined,
  aliases: AliasIntegrante[] = [],
): string {
  return resolverNomeIntegrante(raw || "", aliases).rotulo;
}

function equipeChaveComIntegrantes(raw: string, aliases: AliasIntegrante[]): string {
  const nomes = raw
    .split(/[&/+,]/)
    .map((nome) => resolverNomeIntegrante(nome, aliases).chave)
    .filter(Boolean);
  return [...new Set(nomes)].sort().join(" & ");
}

export function equipeChave(raw: string | null | undefined): string {
  if (!raw) return "";

  const integrantes = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .split(/[&/+,]/)
    .map(normalizarEspacos)
    .filter(Boolean);

  return [...new Set(integrantes)].sort().join(" & ");
}

export function equipeChaveFinal(
  raw: string | null | undefined,
  aliasesEquipe: AliasEquipe[] = [],
  aliasesIntegrante: AliasIntegrante[] = [],
): string {
  if (!raw) return "";
  let chave = equipeChaveComIntegrantes(raw, aliasesIntegrante);
  const mapa = new Map<string, string>();

  for (const alias of aliasesEquipe) {
    const origem = equipeChaveComIntegrantes(alias.alias_chave, aliasesIntegrante);
    const destino = equipeChaveComIntegrantes(alias.destino_chave, aliasesIntegrante);
    if (origem && destino && origem !== destino) mapa.set(origem, destino);
  }

  const visitados = new Set<string>();
  while (mapa.has(chave) && !visitados.has(chave)) {
    visitados.add(chave);
    chave = mapa.get(chave) || chave;
  }
  return chave;
}

export function equipeRotulo(variantes: VarianteEquipe[]): string {
  return (
    variantes
      .map((variante, indice) => ({
        texto: normalizarEspacos(variante.texto),
        qtd: Number.isFinite(variante.qtd) ? variante.qtd : 0,
        temAcento: /[\u0300-\u036f]/.test(variante.texto.normalize("NFD")),
        indice,
      }))
      .filter((variante) => variante.texto)
      .sort(
        (a, b) => b.qtd - a.qtd || Number(b.temAcento) - Number(a.temAcento) || a.indice - b.indice,
      )[0]?.texto ?? ""
  );
}

export function equipeRotuloFinal(
  chaveFinal: string,
  variantes: VarianteEquipe[],
  aliasesEquipe: AliasEquipe[] = [],
  aliasesIntegrante: AliasIntegrante[] = [],
): string {
  const rotuloDestino = aliasesEquipe.find(
    (alias) => equipeChaveComIntegrantes(alias.destino_chave, aliasesIntegrante) === chaveFinal,
  )?.destino_rotulo;
  if (rotuloDestino) return normalizarEspacos(rotuloDestino);

  const rotuloBase = equipeRotulo(variantes);
  const integrantes = rotuloBase
    .split(/[&/+,]/)
    .map((nome) => resolverNomeIntegrante(nome, aliasesIntegrante))
    .filter((nome) => nome.chave);
  const vistos = new Set<string>();
  return integrantes
    .filter((nome) => {
      if (vistos.has(nome.chave)) return false;
      vistos.add(nome.chave);
      return true;
    })
    .map((nome) => nome.rotulo)
    .join(" & ");
}

export function equipeIndiceCor(chave: string, quantidade: number): number {
  if (quantidade <= 0) return 0;
  let hash = 2166136261;
  for (let indice = 0; indice < chave.length; indice++) {
    hash ^= chave.charCodeAt(indice);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % quantidade;
}
