export const HUB_DASHBOARDS_ROUTE = "/dashboards" as const;

export type HubSidebarItem = {
  key: string;
  label: string;
  path: string;
};

export type HubSidebarGroup = {
  id: string;
  label: string;
  items: HubSidebarItem[];
  showHeading: boolean;
};

export const HUB_SIDEBAR_GROUPS: {
  id: string;
  label: string;
  items: HubSidebarItem[];
}[] = [
  {
    id: "operacao",
    label: "Operação",
    items: [
      { key: "backlog", label: "Backlog BI", path: "/backlog" },
      { key: "oi", label: "Ordem de Início", path: "/oi" },
      { key: "produtividade", label: "Produtividade", path: "/produtividade" },
    ],
  },
  {
    id: "planejamento",
    label: "Planejamento",
    items: [
      { key: "cronograma", label: "Cronograma", path: "/cronograma" },
      { key: "escala", label: "Escala de Trabalho", path: "/escala" },
      { key: "plano_manutencao", label: "Plano de Manutenção", path: "/plano-manutencao" },
    ],
  },
  {
    id: "ativos",
    label: "Ativos",
    items: [
      { key: "ficha_elevatoria", label: "Ficha da Elevatória", path: "/elevatorias" },
      { key: "estoque", label: "Almoxarifado", path: "/estoque" },
    ],
  },
  {
    id: "documentacao",
    label: "Documentação",
    items: [
      { key: "manuais", label: "Manuais", path: "/manuais" },
      { key: "procedimentos", label: "Procedimentos", path: "/procedimentos" },
    ],
  },
  {
    id: "analises",
    label: "Análises",
    items: [
      { key: "dashboard", label: "Dashboards", path: HUB_DASHBOARDS_ROUTE },
      { key: "relatorio", label: "Relatório", path: "/relatorio" },
    ],
  },
];

export const HUB_PUBLIC_LINKS_GROUP = {
  id: "links-publicos",
  label: "Links públicos",
  collapsible: false,
  expandedByDefault: true,
} as const;

/** The route requires both panel assignment and the granular view permission. */
export function canShowProcedimentosNavigation(
  hasPanel: boolean,
  hasViewPermission: boolean,
): boolean {
  return hasPanel && hasViewPermission;
}

export type HubDashboardCard = {
  key: "dashboard_automacao" | "dashboard_testes";
  title: string;
  description: string;
  detail: string;
  path: "/dashboard" | "/testes";
  icon: "automation" | "tests";
};

export const HUB_DASHBOARD_CARDS: HubDashboardCard[] = [
  {
    key: "dashboard_automacao",
    title: "Automação",
    description: "Dashboard de automação das elevatórias.",
    detail: "Elevatórias · sensores · CLP/PCP · ELIPSE",
    path: "/dashboard",
    icon: "automation",
  },
  {
    key: "dashboard_testes",
    title: "Testes & Aferições",
    description: "Indicadores dos testes e serviços realizados nos ativos.",
    detail: "Serviços · equipes · parâmetros · impossibilidade",
    path: "/testes",
    icon: "tests",
  },
];

export function getVisibleHubSidebarGroups(
  visibleKeys: readonly string[],
): HubSidebarGroup[] {
  const visible = new Set(visibleKeys);
  return HUB_SIDEBAR_GROUPS.map((group) => {
    const items = group.items.filter((item) => visible.has(item.key));
    return {
      ...group,
      items,
      showHeading: items.length > 1,
    };
  }).filter((group) => group.items.length > 0);
}

export function getActiveHubGroup(pathname: string): string | null {
  if (
    pathname.startsWith("/backlog/publico/") ||
    pathname.startsWith("/produtividade/publico/") ||
    pathname.startsWith("/elevatorias/publico/") ||
    pathname.startsWith("/cronograma/publico/")
  ) {
    return HUB_PUBLIC_LINKS_GROUP.id;
  }

  for (const group of HUB_SIDEBAR_GROUPS) {
    if (
      group.items.some(
        (item) => pathname === item.path || pathname.startsWith(`${item.path}/`),
      )
    ) {
      return group.id;
    }
  }

  if (pathname === "/dashboard" || pathname === "/testes") return "analises";
  return null;
}

export function getVisibleDashboardCards(
  panelKeys: readonly string[],
): HubDashboardCard[] {
  const allowed = new Set(panelKeys);
  return HUB_DASHBOARD_CARDS.filter((card) => allowed.has(card.key));
}
