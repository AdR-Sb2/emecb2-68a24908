import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel Power BI" },
      { name: "description", content: "Visualize seu dashboard do Power BI incorporado." },
      { property: "og:title", content: "Painel Power BI" },
      { property: "og:description", content: "Visualize seu dashboard do Power BI incorporado." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6 text-center">
      <h1 className="text-4xl font-bold text-foreground">Painel Power BI</h1>
      <p className="max-w-md text-muted-foreground">
        Acesse o dashboard incorporado do Power BI para visualizar seus relatórios.
      </p>
      <Link
        to="/dashboard"
        className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Abrir dashboard
      </Link>
    </div>
  );
}
