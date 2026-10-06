import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, Target, Wrench, Gauge, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  CONFIG_PADRAO,
  OPCOES_INTERVALO_KPI,
  diasNoMes,
  useProdutividadeConfig,
  useSalvarConfig,
  type ProdutividadeConfig,
} from "@/lib/produtividade-config";

const MESES_BR = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

type RecursoRef = { id_recurso: number; nome: string };

export function ConfiguracoesDialog({
  open,
  onOpenChange,
  recursos,
  datasExistentes = [],
}: {
  open: boolean;
  onOpenChange: (aberto: boolean) => void;
  recursos: RecursoRef[];
  datasExistentes?: string[];
}) {
  const { data: config, isLoading } = useProdutividadeConfig();
  const salvar = useSalvarConfig();
  const [salvando, setSalvando] = useState(false);

  const [metasMensais, setMetasMensais] = useState<Record<string, number>>({});
  const [metasIndividuais, setMetasIndividuais] = useState<Record<string, number>>({});
  const [maxCorretivas, setMaxCorretivas] = useState(0);
  const [intervalo, setIntervalo] = useState(10);
  const [ano, setAno] = useState(() => new Date().getFullYear());
  const [busca, setBusca] = useState("");

  // Inicializa o rascunho sempre que o dialog abre (ou quando a config chega).
  useEffect(() => {
    if (!open) return;
    const cfg: ProdutividadeConfig = config || CONFIG_PADRAO;
    setMetasMensais({ ...cfg.metasMensais });
    setMetasIndividuais({ ...cfg.metasIndividuais });
    setMaxCorretivas(cfg.maxCorretivasMes || 0);
    setIntervalo(cfg.intervaloKpisSeg || 10);
    const maisRecente = [...datasExistentes].sort().pop();
    if (maisRecente) setAno(Number(maisRecente.slice(0, 4)) || new Date().getFullYear());
  }, [open, config, datasExistentes]);

  const recursosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const lista = [...recursos].sort((a, b) =>
      (a.nome || String(a.id_recurso)).localeCompare(b.nome || String(b.id_recurso), "pt-BR"),
    );
    if (!termo) return lista;
    return lista.filter(
      (r) => String(r.id_recurso).includes(termo) || (r.nome || "").toLowerCase().includes(termo),
    );
  }, [recursos, busca]);

  const metasDoAno = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const chave = `${ano}-${String(i + 1).padStart(2, "0")}`;
      return { chave, nome: MESES_BR[i], dias: diasNoMes(ano, i + 1) };
    });
  }, [ano]);

  const totalMesesAno = metasDoAno.reduce((acc, m) => acc + (metasMensais[m.chave] || 0), 0);
  const idsSemMeta = recursos.filter((r) => !metasIndividuais[r.id_recurso]);

  const setMetaMes = (chave: string, valor: number) =>
    setMetasMensais((prev) => {
      const next = { ...prev };
      if (!Number.isFinite(valor) || valor <= 0) delete next[chave];
      else next[chave] = valor;
      return next;
    });

  const setMetaId = (id: number, valor: number) =>
    setMetasIndividuais((prev) => {
      const next = { ...prev };
      if (!Number.isFinite(valor) || valor <= 0) delete next[String(id)];
      else next[String(id)] = valor;
      return next;
    });

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      await salvar({
        metasMensais,
        metasIndividuais,
        maxCorretivasMes: Math.max(0, Math.floor(maxCorretivas)),
        intervaloKpisSeg: intervalo,
      });
      toast.success("Configurações salvas!", {
        description: "Os novos valores já estão sendo usados no Dashboard.",
      });
      onOpenChange(false);
    } catch (err) {
      console.error("Erro ao salvar configurações:", err);
      toast.error(
        "Não foi possível salvar as configurações." +
          (err instanceof Error ? ` (${err.message})` : ""),
      );
    } finally {
      setSalvando(false);
    }
  };

  const limiteDiarioPreview =
    maxCorretivas > 0 ? maxCorretivas / (diasNoMes(ano, new Date().getMonth() + 1) || 30) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-4 w-4 text-[#0b3a73]" /> Configurações
          </DialogTitle>
          <DialogDescription>
            Metas, limites e intervalo de comparação dos KPIs. Tudo é persistido e usado nos
            cálculos do Dashboard.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex min-h-[220px] items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-[#1f7ad6]" />
          </div>
        ) : (
          <Tabs defaultValue="metas">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="metas">
                <Target className="mr-1 h-3.5 w-3.5" /> Metas
              </TabsTrigger>
              <TabsTrigger value="corretivas">
                <Wrench className="mr-1 h-3.5 w-3.5" /> Corretivas
              </TabsTrigger>
              <TabsTrigger value="kpis">
                <Gauge className="mr-1 h-3.5 w-3.5" /> KPIs
              </TabsTrigger>
            </TabsList>

            {/* ── Metas ─────────────────────────────────────── */}
            <TabsContent value="metas" className="space-y-5 pt-3">
              <section>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Meta mensal
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Quantidade esperada de OS no mês. É ela que alimenta a Meta Realizada, os
                      alertas e a linha de meta dos gráficos.
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setAno((a) => a - 1)}
                      aria-label="Ano anterior"
                    >
                      ‹
                    </Button>
                    <span className="w-12 text-center text-sm font-semibold">{ano}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setAno((a) => a + 1)}
                      aria-label="Próximo ano"
                    >
                      ›
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {metasDoAno.map((m) => (
                    <div
                      key={m.chave}
                      className="flex items-center justify-between gap-2 rounded-md border border-slate-200 px-2 py-1.5 dark:border-slate-700"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                          {m.nome}
                        </div>
                        <div className="text-[10px] text-slate-400">{m.dias} dias</div>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        value={metasMensais[m.chave] ?? ""}
                        placeholder="—"
                        onChange={(e) => setMetaMes(m.chave, parseInt(e.target.value, 10) || 0)}
                        className="h-7 w-16 shrink-0 text-center text-xs"
                      />
                    </div>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Total planejado em {ano}:{" "}
                  <strong className="text-[#0b3a73]">{totalMesesAno} OS</strong>
                </p>
              </section>

              <section>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Meta individual por colaborador (ID)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Usada no ranking, no % de meta, nos alertas e na meta de cada equipe (soma das
                      metas dos integrantes).
                    </p>
                  </div>
                  <Input
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar ID ou nome…"
                    className="h-7 w-44 text-xs"
                  />
                </div>

                <div className="max-h-72 space-y-1.5 overflow-y-auto rounded-md border border-slate-200 p-2 dark:border-slate-700">
                  {recursosFiltrados.length === 0 && (
                    <p className="py-4 text-center text-xs text-slate-400">
                      Nenhum colaborador cadastrado. Importe um dia na aba Dias.
                    </p>
                  )}
                  {recursosFiltrados.map((r) => (
                    <div
                      key={r.id_recurso}
                      className="flex items-center gap-2 rounded px-1 py-0.5 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    >
                      <span className="w-14 shrink-0 font-mono text-xs text-slate-500">
                        {String(r.id_recurso).padStart(3, "0")}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs text-slate-700 dark:text-slate-200">
                        {r.nome || `Recurso ${r.id_recurso}`}
                      </span>
                      <Input
                        type="number"
                        min={0}
                        value={metasIndividuais[r.id_recurso] ?? ""}
                        placeholder="—"
                        onChange={(e) => setMetaId(r.id_recurso, parseInt(e.target.value, 10) || 0)}
                        className="h-7 w-16 shrink-0 text-center text-xs"
                      />
                    </div>
                  ))}
                </div>

                {idsSemMeta.length > 0 && (
                  <p className="mt-1.5 flex items-start gap-1 text-[11px] text-amber-600">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {idsSemMeta.length} colaborador(es) sem meta individual — eles usam a quota
                    proporcional da meta mensal global como referência no % de meta.
                  </p>
                )}
              </section>
            </TabsContent>

            {/* ── Corretivas ────────────────────────────────── */}
            <TabsContent value="corretivas" className="space-y-4 pt-3">
              <section>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Máximo de corretivas no mês
                </h3>
                <p className="text-[11px] text-slate-500">
                  Considera <strong>Corretiva Emergencial + Corretiva Programada</strong>. O limite
                  diário é calculado automaticamente pela quantidade de dias do mês ou do período
                  analisado.
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <Input
                    type="number"
                    min={0}
                    value={maxCorretivas || ""}
                    placeholder="0"
                    onChange={(e) => setMaxCorretivas(parseInt(e.target.value, 10) || 0)}
                    className="h-9 w-28 text-center text-sm"
                  />
                  <span className="text-xs text-slate-500">corretivas / mês</span>
                </div>

                {maxCorretivas > 0 && (
                  <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
                    <strong>Limite diário</strong> = {maxCorretivas} ÷{" "}
                    {diasNoMes(ano, new Date().getMonth() + 1)} dias ={" "}
                    <strong>{limiteDiarioPreview.toFixed(2)} corretivas/dia</strong>.
                    <br />O Dashboard usa o limite proporcional aos dias realmente abertos no
                    período.
                  </div>
                )}

                {maxCorretivas <= 0 && (
                  <p className="mt-3 text-[11px] text-slate-500">
                    Sem valor configurado o alerta de corretivas fica desativado.
                  </p>
                )}
              </section>
            </TabsContent>

            {/* ── KPIs ─────────────────────────────────────── */}
            <TabsContent value="kpis" className="space-y-4 pt-3">
              <section>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Intervalo de comparação dos KPIs
                </h3>
                <p className="text-[11px] text-slate-500">
                  A cada intervalo a comparação secundária do KPI alterna automaticamente: dia
                  anterior → mesmo dia do mês anterior → média 7 dias → média 30 dias → meta →
                  resultado.
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {OPCOES_INTERVALO_KPI.map((seg) => (
                    <Button
                      key={seg}
                      variant={intervalo === seg ? "default" : "outline"}
                      size="sm"
                      className={`h-8 text-xs ${
                        intervalo === seg ? "bg-[#0b3a73] hover:bg-[#002d74]" : ""
                      }`}
                      onClick={() => setIntervalo(seg)}
                    >
                      {seg} segundos
                    </Button>
                  ))}
                </div>
              </section>
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button
            onClick={handleSalvar}
            disabled={salvando || isLoading}
            className="bg-[#0b3a73] hover:bg-[#002d74]"
          >
            {salvando ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1 h-4 w-4" />
            )}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
