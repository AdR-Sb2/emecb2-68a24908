import { createFileRoute } from "@tanstack/react-router";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const filePath = resolve(process.cwd(), "src", "data", "equipe-overrides.json");

function readOverrides(): Record<string, string> {
  try {
    if (!existsSync(filePath)) return {};
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    return {};
  }
}

function writeOverrides(data: Record<string, string>) {
  const dir = resolve(filePath, "..");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export const Route = createFileRoute("/api/equipe-override")({
  server: {
    handlers: {
      GET: async () => {
        const data = readOverrides();
        return new Response(JSON.stringify(data), {
          headers: { "content-type": "application/json" },
        });
      },
      POST: async ({ request }) => {
        try {
          const { om, equipe } = (await request.json()) as { om: string; equipe: string };
          if (!om || !equipe) {
            return new Response(
              JSON.stringify({ ok: false, error: "om e equipe são obrigatórios" }),
              {
                status: 400,
                headers: { "content-type": "application/json" },
              },
            );
          }
          const data = readOverrides();
          data[om] = equipe;
          writeOverrides(data);
          return new Response(JSON.stringify({ ok: true, om, equipe }), {
            headers: { "content-type": "application/json" },
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Erro desconhecido";
          return new Response(JSON.stringify({ ok: false, error: msg }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
      },
      DELETE: async ({ request }) => {
        try {
          const { om } = (await request.json()) as { om: string };
          if (!om) {
            return new Response(JSON.stringify({ ok: false, error: "om é obrigatório" }), {
              status: 400,
              headers: { "content-type": "application/json" },
            });
          }
          const data = readOverrides();
          delete data[om];
          writeOverrides(data);
          return new Response(JSON.stringify({ ok: true, om }), {
            headers: { "content-type": "application/json" },
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Erro desconhecido";
          return new Response(JSON.stringify({ ok: false, error: msg }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
      },
    },
  },
});
