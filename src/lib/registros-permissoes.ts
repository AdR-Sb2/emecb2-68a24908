export type PermissoesRegistros = {
  visualizar: boolean;
  criar: boolean;
  importar: boolean;
  anexarPdf: boolean;
};

export function getPermissoesRegistros(cargoNome: string | null | undefined): PermissoesRegistros {
  const cargo = cargoNome ?? "";

  if (cargo === "Administrador" || cargo === "Supervisor") {
    return { visualizar: true, criar: true, importar: true, anexarPdf: true };
  }

  if (cargo === "Almoxarife") {
    return { visualizar: true, criar: true, importar: true, anexarPdf: true };
  }

  if (cargo === "Técnico") {
    return { visualizar: true, criar: true, importar: false, anexarPdf: false };
  }

  return { visualizar: false, criar: false, importar: false, anexarPdf: false };
}
