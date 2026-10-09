import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Link2Off, Search, ClipboardList } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { computeEquipe, computeResponsabilidade, type Equipe } from "@/data/responsabilidade-rules";
import elevatoriasData from "@/data/elevatorias.json";
import logoHeader from "@/assets/logo-branca.png";

export const Route = createFileRoute("/backlog/publico/$token")({
  component: PublicoBacklogPage,
  head: () => ({
    meta: [
      { title: "Backlog BI · Visualização pública" },
      { name: "description", content: "Backlog de Ordens de Manutenção compartilhado" },
    ],
  }),
});

type Rec = Record<string, unknown>;

const STATUS_OPCOES = ["Pendente", "Executada", "Cancelada"] as const;
type StatusExecucao = (typeof STATUS_OPCOES)[number];

function statusDe(r: Rec): StatusExecucao {
  const v = String(r["Status da Execução"] ?? "").trim();
  return v === "Executada" || v === "Cancelada" ? v : "Pendente";
}

const plantaToElevatoria = new Map<string, string>();
(elevatoriasData as Array<{ PLANTA: string | null; ELEVATORIAS: string | null }>).forEach((i) => {
  if (i.PLANTA) plantaToElevatoria.set(i.PLANTA.trim().toUpperCase(), i.ELEVATORIAS || "");
});

function elevatoriaDe(planta: string): string {
  const code = planta.split(" - ")[0].trim().toUpperCase();
  return plantaToElevatoria.get(code) || "—";
}

function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

type Linha = {
  r: Rec;
  om: string;
  planta: string;
  elevatoria: string;
  cidade: string;
  inicioSla: string;
  fimSla: string;
  tipo: string;
  resp: string;
  equipe: Equipe;
  status: StatusExecucao;
  texto: string;
};

function enriquecer(rows: Rec[]): Linha[] {
  return rows.map((r) => {
    const om = str(r["Ordem de Manutenção"]).trim();
    const planta = str(r.PLANTA);
    const textoBreve = str(r["TEXTO BREVE"]);
    const responsabilidade = computeResponsabilidade({ om, planta, textoBreve });
    const equipe = computeEquipe({
      responsabilidade,
      descricaoEquipamento: str(r["DESCRIÇÃO EQUIPAMENTO"]),
      om,
    });
    return {
      r,
      om,
      planta,
      elevatoria: elevatoriaDe(planta),
      cidade: str(r.Cidade),
      inicioSla: str(r["Início do SLA"]),
      fimSla: str(r["Fim do SLA"]),
      tipo: str(r["Tipo de Atividade"]),
      resp: responsabilidade,
      equipe,
      status: statusDe(r),
      texto: textoBreve,
    };
  });
}

function PublicoBacklogPage() {
  const { token } = Route.useParams();
  const [valido, setValido] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [atualizadoEm, setAtualizadoEm] = useState<string | null>(null);
  const [bucket, setBucket] = useState<Rec[]>([]);
  const [plano, setPlano] = useState<Rec[]>([]);
  const [fonte, setFonte] = useState<"bucket" | "planejamento">("bucket");
  const [busca, setBusca] = useState("");
  const [fResp, setFResp] = useState("TODAS");
  const [fEquipe, setFEquipe] = useState("TODAS");
  const [fStatus, setFStatus] = useState("TODOS");
  const [fCidade, setFCidade] = useState("TODAS");
  const [ordem, setOrdem] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    (async () => {
      const { data: cfg, error: errCfg } = await supabase
        .from("field_config")
        .select("backlog_link_publico_token")
        .eq("id", 1)
        .maybeSingle();
      if (errCfg || !cfg?.backlog_link_publico_token || cfg.backlog_link_publico_token !== token) {
        setValido(false);
        setLoading(false);
        return;
      }
      setValido(true);

      const { data, error } = await supabase
        .from("backlog_dados")
        .select("dados, atualizado_em")
        .eq("id", 1)
        .maybeSingle();
      if (!error && data?.dados) {
        const bruto = data.dados;
        if (Array.isArray(bruto)) {
          setBucket(bruto as Rec[]);
        } else if (bruto && typeof bruto === "object") {
          const o = bruto as { bucket?: unknown; plano?: unknown };
          if (Array.isArray(o.bucket)) setBucket(o.bucket as Rec[]);
          if (Array.isArray(o.plano)) setPlano(o.plano as Rec[]);
        }
        setAtualizadoEm(data.atualizado_em ?? null);
      }
      setLoading(false);
    })();
  }, [token]);

  const linhas = useMemo(() => {
    const base = fonte === "planejamento" ? plano : bucket;
    const q = busca.trim().toUpperCase();
    const filtradas = enriquecer(base).filter((l) => {
      if (fResp !== "TODAS" && l.resp !== fResp) return false;
      if (fEquipe !== "TODAS" && l.equipe !== fEquipe) return false;
      if (fStatus !== "TODOS" && l.status !== fStatus) return false;
      if (fCidade !== "TODAS" && l.cidade !== fCidade) return false;
      if (!q) return true;
      return (
        l.om.toUpperCase().includes(q) ||
        l.planta.toUpperCase().includes(q) ||
        l.elevatoria.toUpperCase().includes(q) ||
        l.texto.toUpperCase().includes(q)
      );
    });
    return filtradas.sort((a, b) =>
      ordem === "asc" ? a.om.localeCompare(b.om) : b.om.localeCompare(a.om),
    );
  }, [bucket, plano, fonte, busca, fResp, fEquipe, fStatus, fCidade, ordem]);

  const resumo = useMemo(() => {
    const base = fonte === "planejamento" ? plano : bucket;
    const all = enriquecer(base);
    return {
      total: all.length,
      pendente: all.filter((l) => l.status === "Pendente").length,
      executada: all.filter((l) => l.status === "Executada").length,
      cancelada: all.filter((l) => l.status === "Cancelada").length,
    };
  }, [bucket, plano, fonte]);

  const cidades = useMemo(
    () => Array.from(new Set(linhas.map((l) => l.cidade).filter(Boolean))).sort(),
    [linhas],
  );
  const resps = useMemo(() => Array.from(new Set(linhas.map((l) => l.resp))).sort(), [linhas]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando Backlog…
      </div>
    );
  }

  if (!valido) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-6 text-center">
        <Link2Off className="h-8 w-8 text-slate-400" />
        <p className="text-sm font-semibold text-slate-600">Link não encontrado ou revogado.</p>
        <p className="text-xs text-slate-400">Peça um novo link para a Eletromecânica.</p>
      </div>
    );
  }

  const selectCls =
    "min-h-9 rounded-md border border-slate-300 bg-white px-2 text-[13px] shadow-sm";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="bg-gradient-to-r from-[#0b3a73] to-[#1f7ad6] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <img src={logoHeader} alt="Águas do Rio" className="h-11 w-auto" loading="eager" />
            <div className="min-w-0 text-white">
              <p className="truncate text-base font-semibold">Backlog BI</p>
              <p className="truncate text-xs text-cyan-50/90">
                Eletromecânica · visualização pública
                {atualizadoEm
                  ? ` · atualizado ${new Date(atualizadoEm).toLocaleString("pt-BR")}`
                  : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <span className="rounded bg-white/15 px-2 py-1 text-[11px] font-semibold text-white">
              {resumo.total} O.S.
            </span>
            <span className="rounded bg-amber-400/90 px-2 py-1 text-[11px] font-semibold text-white">
              {resumo.pendente} pendentes
            </span>
            <span className="rounded bg-emerald-500/90 px-2 py-1 text-[11px] font-semibold text-white">
              {resumo.executada} executadas
            </span>
            <span className="rounded bg-slate-400/90 px-2 py-1 text-[11px] font-semibold text-white">
              {resumo.cancelada} canceladas
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
        {bucket.length > 0 && plano.length > 0 && (
          <div className="mb-3 inline-flex overflow-hidden rounded-md border border-slate-300">
            <button
              onClick={() => setFonte("bucket")}
              className={`px-3 py-2 text-[12px] font-semibold ${fonte === "bucket" ? "bg-[#0b3a73] text-white" : "bg-white"}`}
            >
              Bucket do Field ({bucket.length})
            </button>
            <button
              onClick={() => setFonte("planejamento")}
              className={`border-l border-slate-300 px-3 py-2 text-[12px] font-semibold ${fonte === "planejamento" ? "bg-[#0b3a73] text-white" : "bg-white"}`}
            >
              Planejamento semanal ({plano.length})
            </button>
          </div>
        )}

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar O.M., planta, elevatória ou texto…"
              className="min-h-9 w-full rounded-md border border-slate-300 bg-white pl-8 pr-2 text-[13px] shadow-sm"
            />
          </div>
          <select value={fResp} onChange={(e) => setFResp(e.target.value)} className={selectCls}>
            <option value="TODAS">Responsabilidade: todas</option>
            {resps.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            value={fEquipe}
            onChange={(e) => setFEquipe(e.target.value)}
            className={selectCls}
          >
            <option value="TODAS">Equipe: todas</option>
            <option value="EMEC">EMEC</option>
            <option value="Automação">Automação</option>
          </select>
          <select
            value={fStatus}
            onChange={(e) => setFStatus(e.target.value)}
            className={selectCls}
          >
            <option value="TODOS">Status: todos</option>
            {STATUS_OPCOES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={fCidade}
            onChange={(e) => setFCidade(e.target.value)}
            className={selectCls}
          >
            <option value="TODAS">Cidade: todas</option>
            {cidades.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-[12px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th
                  className="cursor-pointer whitespace-nowrap px-2 py-2 font-semibold hover:underline"
                  onClick={() => setOrdem(ordem === "asc" ? "desc" : "asc")}
                >
                  O.M. {ordem === "asc" ? "▲" : "▼"}
                </th>
                <th className="whitespace-nowrap px-2 py-2 font-semibold">Elevatória</th>
                <th className="whitespace-nowrap px-2 py-2 font-semibold">Planta</th>
                <th className="whitespace-nowrap px-2 py-2 font-semibold">Cidade</th>
                <th className="whitespace-nowrap px-2 py-2 font-semibold">Início SLA</th>
                <th className="whitespace-nowrap px-2 py-2 font-semibold">Tipo</th>
                <th className="whitespace-nowrap px-2 py-2 font-semibold">Resp.</th>
                <th className="whitespace-nowrap px-2 py-2 font-semibold">Equipe</th>
                <th className="whitespace-nowrap px-2 py-2 font-semibold">Status</th>
                <th className="px-2 py-2 font-semibold">Texto breve</th>
              </tr>
            </thead>
            <tbody>
              {linhas.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-6 text-center text-slate-400">
                    Nenhuma O.S. com os filtros atuais.
                  </td>
                </tr>
              )}
              {linhas.map((l, i) => (
                <tr
                  key={`${l.om}-${i}`}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                >
                  <td className="whitespace-nowrap px-2 py-1 font-mono font-bold text-[#0b3a73]">
                    {l.om}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1">{l.elevatoria}</td>
                  <td className="whitespace-nowrap px-2 py-1">{l.planta}</td>
                  <td className="whitespace-nowrap px-2 py-1">{l.cidade}</td>
                  <td className="whitespace-nowrap px-2 py-1">{l.inicioSla}</td>
                  <td className="whitespace-nowrap px-2 py-1">{l.tipo}</td>
                  <td className="whitespace-nowrap px-2 py-1">{l.resp}</td>
                  <td className="whitespace-nowrap px-2 py-1">{l.equipe}</td>
                  <td className="whitespace-nowrap px-2 py-1">
                    <span
                      className={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${
                        l.status === "Executada"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : l.status === "Cancelada"
                            ? "border-slate-300 bg-slate-100 text-slate-500"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                      }`}
                    >
                      {l.status}
                    </span>
                  </td>
                  <td className="max-w-[280px] truncate px-2 py-1" title={l.texto}>
                    {l.texto}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 flex items-center gap-1 text-[11px] text-slate-400">
          <ClipboardList className="h-3.5 w-3.5" /> Somente leitura · dados atualizados pela
          Eletromecânica.
        </p>
      </div>
    </div>
  );
}
