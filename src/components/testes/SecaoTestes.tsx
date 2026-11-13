import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, History, Loader2, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TesteFormDialog } from "@/components/testes/TesteFormDialog";
import { fetchTestes } from "@/lib/testes-api";
import {
  filtrarTestesPorPlanta,
  filtrarTestesPorTipo,
  testesDaFicha,
  type TesteRow,
} from "@/lib/testes-data";
import { LIMITE_CEDAE, TIPO_TESTE_CEDAE, normalizarCodigoElevatoria } from "@/lib/testes-tipos";

type Props = {
  planta: string | null;
  nome: string;
  podeEditar: boolean;
  podeCriarTeste: boolean;
};

function fmtData(iso: string | null): string {
  if (!iso) return "N/A";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

function mesKey(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function TabelaTestes({
  registros,
  onExcluir,
  mensagemVazia,
}: {
  registros: TesteRow[];
  onExcluir?: (id: number) => void;
  mensagemVazia?: string;
}) {
  if (registros.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-400 dark:border-slate-600 dark:bg-slate-800">
        {mensagemVazia ?? "Nenhum teste registrado."}
      </div>
    );
  }
  return (
    <div className="max-h-[60vh] overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="w-full min-w-[900px] text-left text-xs">
        <thead className="sticky top-0 bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
          <tr>
            <th className="px-2 py-1.5">Data</th>
            <th className="px-2 py-1.5">Grupo</th>
            <th className="px-2 py-1.5">Tipo</th>
            <th className="px-2 py-1.5">Colaboradores</th>
            <th className="px-2 py-1.5">Serviço Executado</th>
            <th className="px-2 py-1.5">Observação</th>
            <th className="px-2 py-1.5">Tensão (V)</th>
            <th className="px-2 py-1.5">Corrente (A)</th>
            <th className="px-2 py-1.5">Recalque</th>
            <th className="px-2 py-1.5">Retaguarda</th>
            {onExcluir && <th className="px-2 py-1.5 text-right">Ações</th>}
          </tr>
        </thead>
        <tbody>
          {registros.map((r) => (
            <tr
              key={r.Id}
              className="border-t border-slate-100 align-top hover:bg-slate-50 dark:border-slate-700"
            >
              <td className="px-2 py-1 whitespace-nowrap">{fmtData(r["Data do Teste"])}</td>
              <td className="px-2 py-1">{r.Grupo ?? "N/A"}</td>
              <td className="px-2 py-1">{r["Tipo de Serviço"] ?? "N/A"}</td>
              <td className="px-2 py-1">{r["Nome dos Colaboradores:"] ?? "N/A"}</td>
              <td className="px-2 py-1 whitespace-normal">{r["Serviço Executado:"] ?? "N/A"}</td>
              <td className="px-2 py-1 whitespace-normal">{r["Observação:"] ?? "N/A"}</td>
              <td className="px-2 py-1 whitespace-nowrap">{r["Tensão ( V )"] ?? "N/A"}</td>
              <td className="px-2 py-1 whitespace-nowrap">{r["Corrente ( A )"] ?? "N/A"}</td>
              <td className="px-2 py-1 whitespace-nowrap">{r.Recalque ?? "N/A"}</td>
              <td className="px-2 py-1 whitespace-nowrap">{r.Retaguarda ?? "N/A"}</td>
              {onExcluir && (
                <td className="px-2 py-1 text-right">
                  <button
                    type="button"
                    title="Excluir teste CEDAE"
                    onClick={() => r.Id != null && onExcluir(r.Id)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SecaoTestes({ planta, nome, podeEditar, podeCriarTeste }: Props) {
  const codigo = useMemo(() => normalizarCodigoElevatoria(planta), [planta]);
  // Rótulo gravado no campo "Elevatória" dos CEDAE (inclui a planta para o vínculo).
  const elevatoriaLabel = codigo ? `${codigo} - ${nome}` : nome;

  const [registros, setRegistros] = useState<TesteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState<"adr" | "cedae">("adr");
  const [dialogOpen, setDialogOpen] = useState(false);

  const [mesIni, setMesIni] = useState("");
  const [mesFim, setMesFim] = useState("");
  const [tipoServico, setTipoServico] = useState("TODOS");

  // Mesma consulta do dashboard; o filtro por planta é aplicado aqui.
  const carregar = useCallback(async () => {
    if (!codigo) {
      setRegistros([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setRegistros(await fetchTestes());
    } catch (err) {
      console.error("Erro ao carregar testes da elevatória:", err);
      setRegistros([]);
    } finally {
      setLoading(false);
    }
  }, [codigo]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // Atualiza o histórico automaticamente quando o dashboard cadastra/importa
  // (mesma base de dados — fonte única).
  useEffect(() => {
    const handler = () => void carregar();
    window.addEventListener("testes-atualizados", handler);
    return () => window.removeEventListener("testes-atualizados", handler);
  }, [carregar]);

  const cedaeBase = useMemo(
    () => filtrarTestesPorPlanta(filtrarTestesPorTipo(registros, TIPO_TESTE_CEDAE), planta),
    [registros, planta],
  );
  const qtdCedae = cedaeBase.length;

  const tiposDisponiveis = useMemo(() => {
    const s = new Set<string>();
    for (const r of registros) {
      const t = r["Tipo de Serviço"];
      if (t) s.add(t);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [registros]);

  const aplicarFiltros = useCallback(
    (base: TesteRow[]) =>
      base.filter((r) => {
        if (tipoServico !== "TODOS" && r["Tipo de Serviço"] !== tipoServico) return false;
        const mk = mesKey(r["Data do Teste"]);
        if (mesIni && (!mk || mk < mesIni)) return false;
        if (mesFim && (!mk || mk > mesFim)) return false;
        return true;
      }),
    [tipoServico, mesIni, mesFim],
  );

  const adr = useMemo(
    () => aplicarFiltros(testesDaFicha(registros, planta)),
    [aplicarFiltros, registros, planta],
  );
  const cedae = useMemo(() => aplicarFiltros(cedaeBase), [aplicarFiltros, cedaeBase]);

  const excluirCedae = async (id: number) => {
    const { error } = await supabase.from("testes_afericoes").delete().eq("id", id);
    if (error) {
      toast.error("Falha ao excluir o teste CEDAE.");
      return;
    }
    toast.success("Teste CEDAE excluído. Vaga liberada.");
    void carregar();
  };

  const barraFiltros = (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="month"
        value={mesIni}
        onChange={(e) => setMesIni(e.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        aria-label="Mês inicial"
      />
      <span className="text-xs text-slate-400">até</span>
      <input
        type="month"
        value={mesFim}
        onChange={(e) => setMesFim(e.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        aria-label="Mês final"
      />
      <select
        value={tipoServico}
        onChange={(e) => setTipoServico(e.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        aria-label="Tipo de serviço"
      >
        <option value="TODOS">Todos os tipos</option>
        {tiposDisponiveis.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5 dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#0b3a73] dark:text-white">
          <ShieldCheck className="h-4 w-4" /> Testes &amp; Aferições
        </h3>
        {podeCriarTeste && (
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            disabled={!codigo}
            className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-[#0b3a73] px-3 py-2 text-[13px] font-semibold text-white transition hover:bg-[#1f7ad6] disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Adicionar teste CEDAE
          </button>
        )}
      </div>

      {!codigo ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Elevatória sem planta (código <strong>PL-RJB-…</strong>) no cabeçalho. Os testes não
            podem ser vinculados e nenhum teste de outra elevatória é exibido.
          </span>
        </div>
      ) : loading ? (
        <div className="flex min-h-[120px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#1f7ad6]" />
        </div>
      ) : (
        <Tabs value={aba} onValueChange={(v) => setAba(v as "adr" | "cedae")}>
          <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <TabsList className="bg-slate-100 dark:bg-slate-700">
              <TabsTrigger value="adr" className="gap-1.5">
                <History className="h-4 w-4" /> Testes AdR ({adr.length})
              </TabsTrigger>
              <TabsTrigger value="cedae" className="gap-1.5">
                <ShieldCheck className="h-4 w-4" /> Testes CEDAE ({qtdCedae}/{LIMITE_CEDAE})
              </TabsTrigger>
            </TabsList>
            {barraFiltros}
          </div>

          <TabsContent value="adr" className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <p className="text-[11px] text-slate-400">
                Somente leitura · mesma base da aba Testes (dashboard), filtrada pela planta{" "}
                <span className="font-semibold text-slate-500 dark:text-slate-300">{codigo}</span>,
                mais recente primeiro.
              </p>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-300">
                Mostrando {adr.length} teste{adr.length === 1 ? "" : "s"}
              </span>
            </div>
            <TabelaTestes
              registros={adr}
              mensagemVazia={`Nenhum teste AdR encontrado para a planta ${codigo}.`}
            />
          </TabsContent>

          <TabsContent value="cedae" className="space-y-2">
            <p className="text-[11px] text-slate-400">
              Testes CEDAE desta elevatória (máximo de {LIMITE_CEDAE}). Não entram nos KPIs/gráficos
              do dashboard e não aparecem no histórico AdR.
            </p>
            <TabelaTestes
              registros={cedae}
              onExcluir={podeEditar ? excluirCedae : undefined}
              mensagemVazia={`Nenhum teste CEDAE cadastrado para ${codigo}.`}
            />
          </TabsContent>
        </Tabs>
      )}

      <TesteFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tiposPermitidos={[TIPO_TESTE_CEDAE]}
        elevatoriaInicial={elevatoriaLabel}
        lockElevatoria
        qtdCedaePorPlanta={(plantaAlvo) =>
          filtrarTestesPorPlanta(filtrarTestesPorTipo(registros, TIPO_TESTE_CEDAE), plantaAlvo)
            .length
        }
        onSaved={carregar}
      />
    </div>
  );
}
