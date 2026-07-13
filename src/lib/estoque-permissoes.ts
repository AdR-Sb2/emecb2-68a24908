const CARGOS_ESTOQUE = ["Técnico", "Almoxarife", "Supervisor", "Administrador"] as const;

export type CargoEstoque = (typeof CARGOS_ESTOQUE)[number];

export type PermissoesEstoque = {
  acessarModulo: boolean;
  registrarEntrada: boolean;
  registrarSaida: boolean;
  registrarAjuste: boolean;
  solicitarCompra: boolean;
  gerenciarCompras: boolean;
  editarConfigMaterial: boolean;
  exportar: boolean;
  importar: boolean;
  cadastrarMaterial: boolean;
  gerenciarCategorias: boolean;
  gerenciarFila: boolean;
};

export function getPermissoesEstoque(cargoNome: string | null | undefined): PermissoesEstoque {
  const cargo = cargoNome ?? "";

  if (cargo === "Administrador") {
    return {
      acessarModulo: true,
      registrarEntrada: true,
      registrarSaida: true,
      registrarAjuste: true,
      solicitarCompra: true,
      gerenciarCompras: true,
      editarConfigMaterial: true,
      exportar: true,
      importar: true,
      cadastrarMaterial: true,
      gerenciarCategorias: true,
      gerenciarFila: true,
    };
  }

  if (cargo === "Supervisor") {
    return {
      acessarModulo: true,
      registrarEntrada: true,
      registrarSaida: true,
      registrarAjuste: true,
      solicitarCompra: true,
      gerenciarCompras: true,
      editarConfigMaterial: true,
      exportar: true,
      importar: true,
      cadastrarMaterial: true,
      gerenciarCategorias: true,
      gerenciarFila: true,
    };
  }

  if (cargo === "Almoxarife") {
    return {
      acessarModulo: true,
      registrarEntrada: true,
      registrarSaida: true,
      registrarAjuste: true,
      solicitarCompra: true,
      gerenciarCompras: true,
      editarConfigMaterial: true,
      exportar: true,
      importar: false,
      cadastrarMaterial: false,
      gerenciarCategorias: false,
      gerenciarFila: true,
    };
  }

  if (cargo === "Técnico") {
    return {
      acessarModulo: true,
      registrarEntrada: true,
      registrarSaida: true,
      registrarAjuste: false,
      solicitarCompra: false,
      gerenciarCompras: false,
      editarConfigMaterial: false,
      exportar: false,
      importar: false,
      cadastrarMaterial: false,
      gerenciarCategorias: false,
      gerenciarFila: false,
    };
  }

  return {
    acessarModulo: false,
    registrarEntrada: false,
    registrarSaida: false,
    registrarAjuste: false,
    solicitarCompra: false,
    gerenciarCompras: false,
    editarConfigMaterial: false,
    exportar: false,
    importar: false,
    cadastrarMaterial: false,
    gerenciarCategorias: false,
    gerenciarFila: false,
  };
}

export const PAINEIS_TECNICOS = [
  "dashboard_testes",
  "dashboard_automacao",
  "dashboard_os",
  "relatorio_tecnico",
  "relatorio_planta",
  "verificacao_ia",
  "ficha_elevatoria",
  "sistemas",
] as const;
