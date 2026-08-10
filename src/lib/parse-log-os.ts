export interface LogEntry {
  data: string;
  hora: string;
  autor: string;
  campos: { chave: string; valor: string }[];
  textoLivre: string[];
}

const ENTRY_HEADER = /\*\s*(\d{2}\.\d{2}\.\d{4})\s+(\d{2}:\d{2}:\d{2})\s+BRAZIL\s*\(([A-Z0-9]+)\)/g;

export function parseLogOS(raw: string | null | undefined): LogEntry[] {
  if (!raw?.trim()) return [];

  const matches = [...raw.matchAll(ENTRY_HEADER)];
  if (matches.length === 0) return [];

  const entries: LogEntry[] = [];

  matches.forEach((match, i) => {
    const start = match.index! + match[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : raw.length;
    const body = raw.slice(start, end);

    const linhas = body
      .replace(/\*\*/g, "")
      .split("*")
      .map((l) => l.trim())
      .filter(Boolean);

    const campos: LogEntry["campos"] = [];
    const textoLivre: string[] = [];

    for (const linha of linhas) {
      const kv = linha.match(/^([A-ZÀ-Ú0-9 /.º]{3,40}):\s*(.+)$/);
      if (kv) {
        campos.push({ chave: kv[1].trim(), valor: kv[2].trim() });
      } else {
        textoLivre.push(linha);
      }
    }

    entries.push({ data: match[1], hora: match[2], autor: match[3], campos, textoLivre });
  });

  return entries.reverse();
}

export function getCriticidade(entry: LogEntry): string | null {
  return entry.campos.find((c) => c.chave === "CRITICIDADE")?.valor ?? null;
}

export function getTextoBreve(entry: LogEntry): string | null {
  return entry.campos.find((c) => c.chave === "TEXTO BREVE" || c.chave === "TÍTULO")?.valor ?? null;
}
