// =============================================================================
// Regras de "Responsabilidade" para o Backlog BI
// -----------------------------------------------------------------------------
// Ordem de avaliação: a PRIMEIRA regra que casar define o valor. Para
// alterar/adicionar OS ou PLANTAS, edite apenas os arrays abaixo — a lógica
// mora em `computeResponsabilidade()`.
// =============================================================================

// Normaliza um número de "Ordem de Manutenção" removendo zeros à esquerda.
// O CSV do Field pode vir com "000900243943" e o DAX/BI usa 900243943.
export function normOM(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v).trim().replace(/^0+/, "");
  return s;
}

// Normaliza string para comparação (trim + upper + sem acentos).
export function normStr(v: string | null | undefined): string {
  if (!v) return "";
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

// (a) Planta Inativa — lista de "Ordem de Manutenção"
export const OM_PLANTA_INATIVA: string[] = ["800390540"];

// (b) Não atendemos — lista de "Ordem de Manutenção"
export const OM_NAO_ATENDEMOS: string[] = [
  "900267482","900267503","900268086","900275668","800475352","800475353","800475422","800460665",
  "800479825","800479826","800490932","800490933","800490934","800490972","800490973","800490974",
  "800490975","800490977","800490978","800490979","800490980","800490981","800390551","800480050",
  "800460635","900218541","900226287","800658880","800658862","800658669","800664935","800673787",
  "800673788","800664849","800664916","800664917","800664918","800664919","900265470","800664873",
  "900266660","800673579","900269523","900269524","800686070","800686071","800686072","800686073",
  "800686074","800686075","800686076","800686077","800686078","800686079","800686080","800686081",
  "800686082","800685941",
];

// (c) CDA — lista de "Ordem de Manutenção"
export const OM_CDA: string[] = [
  "900251665","900251666","900256312","900262359","900265467","900265478","900267452","900267455",
  "900269084","900269478","900270578","900273670","900276068","800435915","800401129","800475257",
  "800475258","800460663","800475645","800455121","800455122","800533771","800563780","900235784",
  "800539937","800610280","800657071","900255355","800663179","800663201","800652890","900260979",
  "800669733","900261185","900262252","900262695","900262732","900264441","800684618","800679921",
  "800690473","800690536","800690537","900271425","900271852","800658866","900272370","900272444",
  "900279282","800717704","900278126","900273297","900271383","900262723","900260939","900254897",
  "900281938","900283848","800736187","800736295","800736296","900286756",
];

// (d) CDA por PLANTA contendo "ECT" — EXCETO as plantas abaixo:
export const PLANTAS_ECT_EXCECAO: string[] = [
  "PL-RJB-ECT0274","PL-RJB-ECT1006","PL-RJB-ECT0282",
  "PL-RJB-ECT0275","PL-RJB-ECT0278","PL-RJB-ECT0277",
];

// (e) Baixada 1 — PLANTAS (comparação por "contém substring", pois a PLANTA
// vem no CSV como "CÓDIGO - DESCRIÇÃO").
export const PLANTAS_BAIXADA_1: string[] = [
  "PL-RJB-EAB0001",
];

// (f) Outra SUP — PLANTAS (contém substring)
export const PLANTAS_OUTRA_SUP: string[] = [
  "PL-RJA-EAT0063",
];

// (g) Baixada 2 — PLANTAS (contém substring)
export const PLANTAS_BAIXADA_2: string[] = [
  "PL-RJB-EAT0011","PL-RJB-EAT0014","PL-RJB-EAT0017","PL-RJB-EAT0022","PL-RJB-EAT0024",
  "PL-RJB-EAT0030","PL-RJB-EAT0031","PL-RJB-EAT0032","PL-RJB-EAT0039","PL-RJB-EAT0040",
  "PL-RJB-EAT0042","PL-RJB-EAT0043","PL-RJB-EAT0044","PL-RJB-EAT0045","PL-RJB-EAT0046",
  "PL-RJB-EAT0048","PL-RJB-EAT0050","PL-RJB-EAT0053","PL-RJB-EAT0056","PL-RJB-EAT0059",
  "PL-RJB-EAT0061","PL-RJB-EAT0062","PL-RJB-EAT0065","PL-RJB-EAT0066","PL-RJB-EAT0068",
  "PL-RJB-EAT0069","PL-RJB-EAT0075","PL-RJB-EAT0082","PL-RJB-EAT0083","PL-RJB-EAT0086",
  "PL-RJB-EAT0087","PL-RJB-EAT0088","PL-RJB-EAT0093","PL-RJB-EAT0098","PL-RJB-EAT0099",
  "PL-RJB-EAT0102","PL-RJB-EAT0104","PL-RJB-EAT0108","PL-RJB-EAT0109","PL-RJB-EAT0110",
  "PL-RJB-EAT0113","PL-RJB-EAT0117","PL-RJB-EAT0122","PL-RJB-EAT0124","PL-RJB-EAT0684",
  "PL-RJB-EAT0687","PL-RJB-EAT0688","PL-RJB-EAT0689","PL-RJB-EAT0691","PL-RJB-EAT0692",
  "PL-RJB-EAT0693","PL-RJB-EAT0694","PL-RJB-EAT0695","PL-RJB-EAT0697","PL-RJB-EAT0723",
  "PL-RJB-EAT0724","PL-RJB-EAT0733","PL-RJB-EAT0735","PL-RJB-EAT0736","PL-RJB-EAT0737",
  "PL-RJB-EAT0738","PL-RJB-EAT0739","PL-RJB-EAT0741","PL-RJB-EAT0744","PL-RJB-EAT0745",
  "PL-RJB-EAT0746","PL-RJB-EAT0747","PL-RJB-EAT0748","PL-RJB-EAT0751","PL-RJB-EAT0761",
  "PL-RJB-EAT0774","PL-RJB-EAT0775","PL-RJB-EAT0811","PL-RJB-EAT0816","PL-RJB-EAT0817",
  "PL-RJB-EAT0821","PL-RJB-EAT0822","PL-RJB-EAT0823","PL-RJB-EAT0824","PL-RJB-EAT0825",
  "PL-RJB-EAT0828","PL-RJB-EAT0829","PL-RJB-EAT0830","PL-RJB-EAT0831","PL-RJB-EAT0832",
  "PL-RJB-EAT0833","PL-RJB-EAT0834","PL-RJB-EAT0835","PL-RJB-EAT0836","PL-RJB-EAT0837",
  "PL-RJB-EAT0847","PL-RJB-EAT0848","PL-RJB-EAT0849","PL-RJB-EAT0861","PL-RJB-EAT0928",
  "PL-RJB-EAT0929","PL-RJB-EAT0933","PL-RJB-EAT0934","PL-RJB-EAT0970","PL-RJB-EAT0971",
  "PL-RJB-EAT0972","PL-RJB-EAT0973","PL-RJB-EAT1005","PL-RJB-EAT1013","PL-RJB-EAT1014",
  "PL-RJB-EAT1016","PL-RJB-EEE0073","PL-RJB-EEE0082","PL-RJB-EEE0083","PL-RJB-EEE0100",
  "PL-RJB-EEE1006","PL-RJB-EEE1100","PL-RJB-ETE0040","PL-RJB-ETE1007","PL-RJB-RES0107",
  "PL-RJB-RES0113",
];

// (h) Baixada 2 — Ordens adicionais
export const OM_BAIXADA_2: string[] = [
  // (Colar aqui a lista extra de números — vazio por enquanto.)
];

// (j) Não atendemos — TEXTO BREVE exato/normalizado
export const TEXTO_BREVE_NAO_ATENDEMOS: string[] = [
  "PV MEC - VÁLVULA VENTOSA",
].map(normStr);

// (k) Não atendemos — PLANTAS (contém substring)
export const PLANTAS_NAO_ATENDEMOS: string[] = [
  "PL-RJB-ETR0582",
];

// (l) Baixada 2 — TEXTO BREVE
export const TEXTO_BREVE_BAIXADA_2: string[] = [
  "PV ELT - MOTOR ELÉTRICO",
  "PV ELT - PAINEL ELÉTRICO",
  "PV ELT - BOMBA SUBMERSÍVEL",
  "PV MEC - BOMBA CENTRÍFUGA",
  "PV ELT - INVERSOR DE FREQUENCIA",
  "PD ELT - MOTOR ELÉTRICO",
  "PD ELT - PAINEL ELÉTRICO",
  "PV MEC - BOMBA SUBMERSÍVEL",
  "PV ELT - BBA SUBMERSA - POÇO PROFUNDO",
  "PV ELT - BOMBA SUBMERSA",
  "PV MEC - REDUTOR DE VELOCIDADE",
  "PV ELT - SOFT STARTER",
  "PV MEC - SOPRADOR",
  "PV AUT - PAINEL DE AUTOMAÇÃO",
  "BOMBA PARADA",
  "PV MEC - BOMBA VERTICAL",
  "PV AUT - PAINEL AUTOMAÇÃO",
  "PV MEC - BOMBA AUTOESCORVANTE",
].map(normStr);

// ===== EQUIPE (aplica só quando Responsabilidade = "Baixada 2") =====
export const EQUIP_EMEC: string[] = [
  "BOMBA CENTRÍFUGA","PAINEL ELÉTRICO COMANDO OU DISTRIBUIÇÃO","INVERSOR DE FREQUÊNCIA",
  "BOMBA CENTRIFUGA SUBMERSÍVEL","MOTOR ELÉTRICO","BANCO CAPACITOR","GRADEAMENTO AUTOMÁTICO",
  "REDUTOR MECÂNICO DE VELOCIDADE","SOFT STARTER","BOMBA VERTICAL",
  "BOMBA CENTRIFUGA MULTIESTÁGIO SUBMERSA","COMPRESSOR","SOPRADOR",
  "BOMBA HORIZONTAL BIPARTIDA","MOTOREDUTOR","GERADOR","BOMBA CENTRIFUGA MULTIESTÁGIO",
  "BOMBA CENTRÍFUGA AUTOESCORVANTE","ROSCA TRANSPORTADORA HELICOIDAL",
  "BOMBA CENTRÍFUGA MONOBLOCO",
].map(normStr);

export const EQUIP_AUTOMACAO: string[] = [
  "ATUADOR ELÉTRICO","MACROMED VAZÃO ULTRASSÔNICO",
  "MACROMED VAZÃO ELETROMAGNÉTICO INSERÇÃO","MACROMED VAZÃO ELETROMAGNÉTICO",
  "PAINEL DE AUTOMAÇÃO","IHM","TRANSMISSOR DE NÍVEL",
].map(normStr);

// Ordens que forçam Equipe = "Automação"
export const OM_EQUIPE_AUTOMACAO: string[] = [
  // Colar aqui a lista extra.
];

export type Responsabilidade =
  | "Planta Inativa"
  | "Não atendemos"
  | "CDA"
  | "Baixada 1"
  | "Baixada 2"
  | "Outra SUP"
  | "Ainda não identificado";

export type Equipe = "EMEC" | "Automação" | "Não analisado" | "Sem equipamento";

function plantaContains(planta: string, list: string[]) {
  const p = planta.toUpperCase();
  return list.some((code) => p.includes(code.toUpperCase()));
}

export function computeResponsabilidade(row: {
  om: string;
  planta: string;
  textoBreve: string;
}): Responsabilidade {
  const om = normOM(row.om);
  const planta = row.planta || "";
  const plantaU = planta.toUpperCase();
  const tb = normStr(row.textoBreve);

  // a) Planta Inativa
  if (OM_PLANTA_INATIVA.includes(om)) return "Planta Inativa";
  // b) Não atendemos por OM
  if (OM_NAO_ATENDEMOS.includes(om)) return "Não atendemos";
  // c) CDA por OM
  if (OM_CDA.includes(om)) return "CDA";
  // d) CDA por planta contendo "ECT" (com exceções)
  if (plantaU.includes("ECT")) {
    const isExcecao = PLANTAS_ECT_EXCECAO.some((code) => plantaU.includes(code.toUpperCase()));
    if (!isExcecao) return "CDA";
  }
  // e) Baixada 1
  if (plantaContains(planta, PLANTAS_BAIXADA_1)) return "Baixada 1";
  // f) Outra SUP
  if (plantaContains(planta, PLANTAS_OUTRA_SUP)) return "Outra SUP";
  // g) Baixada 2 por PLANTA
  if (plantaContains(planta, PLANTAS_BAIXADA_2)) return "Baixada 2";
  // h) Baixada 2 por OM
  if (OM_BAIXADA_2.includes(om)) return "Baixada 2";
  // i) CDA por TEXTO BREVE contendo "CDA"
  if (tb.includes("CDA")) return "CDA";
  // j) Não atendemos por TEXTO BREVE
  if (TEXTO_BREVE_NAO_ATENDEMOS.includes(tb)) return "Não atendemos";
  // k) Não atendemos por PLANTA
  if (plantaContains(planta, PLANTAS_NAO_ATENDEMOS)) return "Não atendemos";
  // l) Baixada 2 por TEXTO BREVE
  if (TEXTO_BREVE_BAIXADA_2.includes(tb)) return "Baixada 2";
  // m) default
  return "Ainda não identificado";
}

export function computeEquipe(row: {
  responsabilidade: Responsabilidade;
  descricaoEquipamento: string;
  om: string;
}): Equipe {
  if (row.responsabilidade !== "Baixada 2") return "Sem equipamento";
  const om = normOM(row.om);
  if (OM_EQUIPE_AUTOMACAO.includes(om)) return "Automação";
  const desc = normStr(row.descricaoEquipamento);
  if (!desc) return "Não analisado";
  if (EQUIP_EMEC.includes(desc)) return "EMEC";
  if (EQUIP_AUTOMACAO.includes(desc)) return "Automação";
  // Debug: descrição não bateu com nenhuma lista.
  if (typeof console !== "undefined") {
    console.warn(`[Backlog] Equipamento sem match em Baixada 2: "${row.descricaoEquipamento}" (OM ${om})`);
  }
  return "Não analisado";
}