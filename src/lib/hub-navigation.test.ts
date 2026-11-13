import { describe, expect, it } from "vitest";
import {
  HUB_DASHBOARD_CARDS,
  HUB_DASHBOARDS_ROUTE,
  HUB_PUBLIC_LINKS_GROUP,
  canShowProcedimentosNavigation,
  HUB_SIDEBAR_GROUPS,
  getActiveHubGroup,
  getVisibleDashboardCards,
  getVisibleHubSidebarGroups,
} from "./hub-navigation";

describe("Hub sidebar navigation", () => {
  it('does not expose the removed "Sistemas" item', () => {
    const keys = HUB_SIDEBAR_GROUPS.flatMap((group) => group.items.map((item) => item.key));
    const labels = HUB_SIDEBAR_GROUPS.flatMap((group) => group.items.map((item) => item.label));
    expect(keys).not.toContain("sistemas");
    expect(labels).not.toContain("Sistemas");
  });

  it("groups the tools by the five requested tasks", () => {
    expect(HUB_SIDEBAR_GROUPS.map((group) => group.label)).toEqual([
      "Operação",
      "Planejamento",
      "Ativos",
      "Documentação",
      "Análises",
    ]);
    expect(HUB_SIDEBAR_GROUPS.map((group) => group.items.map((item) => item.key))).toEqual([
      ["backlog", "oi", "produtividade"],
      ["cronograma", "escala", "plano_manutencao"],
      ["ficha_elevatoria", "estoque"],
      ["manuais", "procedimentos"],
      ["dashboard", "relatorio"],
    ]);
  });

  it("omits a group heading when permissions leave only one item visible", () => {
    const groups = getVisibleHubSidebarGroups(["manuais", "backlog", "oi"]);
    const docs = groups.find((group) => group.id === "documentacao");
    const operation = groups.find((group) => group.id === "operacao");
    expect(docs?.items).toHaveLength(1);
    expect(docs?.showHeading).toBe(false);
    expect(operation?.showHeading).toBe(true);
  });

  it("automatically expands the group matching the current route", () => {
    expect(getActiveHubGroup("/backlog")).toBe("operacao");
    expect(getActiveHubGroup("/plano-manutencao")).toBe("planejamento");
    expect(getActiveHubGroup("/testes")).toBe("analises");
    expect(getActiveHubGroup("/estoque/equipamento/10")).toBe("ativos");
  });

  it("keeps Procedimentos visible only when panel and view permission are both granted", () => {
    expect(canShowProcedimentosNavigation(true, true)).toBe(true);
    expect(canShowProcedimentosNavigation(true, false)).toBe(false);
    expect(canShowProcedimentosNavigation(false, true)).toBe(false);
    expect(canShowProcedimentosNavigation(false, false)).toBe(false);
  });

  it("configures public links as a separate always-expanded section", () => {
    expect(HUB_PUBLIC_LINKS_GROUP.collapsible).toBe(false);
    expect(HUB_PUBLIC_LINKS_GROUP.expandedByDefault).toBe(true);
  });

  it("keeps Procedimentos as a visible standalone item when it is the only Documentation item", () => {
    const groups = getVisibleHubSidebarGroups(["procedimentos"]);
    const docs = groups.find((group) => group.id === "documentacao");
    expect(docs?.items.map((item) => item.key)).toEqual(["procedimentos"]);
    expect(docs?.showHeading).toBe(false);
  });

  it("identifies public links as their own active group", () => {
    expect(getActiveHubGroup("/cronograma/publico/abc123")).toBe(
      HUB_PUBLIC_LINKS_GROUP.id,
    );
  });

  it("points the sidebar Dashboards item to the cards page, not a modal", () => {
    expect(HUB_SIDEBAR_GROUPS.find((group) => group.id === "analises")?.items[0].path).toBe(
      HUB_DASHBOARDS_ROUTE,
    );
    expect(HUB_DASHBOARDS_ROUTE).toBe("/dashboards");
  });
});

describe("Dashboard card permissions", () => {
  it("shows only Automation when the role has only dashboard_automacao", () => {
    expect(getVisibleDashboardCards(["dashboard_automacao"]).map((card) => card.key)).toEqual([
      "dashboard_automacao",
    ]);
  });

  it("shows only Tests when the role has only dashboard_testes", () => {
    expect(getVisibleDashboardCards(["dashboard_testes"]).map((card) => card.key)).toEqual([
      "dashboard_testes",
    ]);
  });

  it("shows both cards when the role has both dashboard permissions", () => {
    expect(getVisibleDashboardCards(["dashboard_automacao", "dashboard_testes"])).toEqual(
      HUB_DASHBOARD_CARDS,
    );
  });

  it("shows no dashboard cards without a dashboard permission", () => {
    expect(getVisibleDashboardCards(["dashboard_os", "ficha_elevatoria"])).toEqual([]);
  });
});
