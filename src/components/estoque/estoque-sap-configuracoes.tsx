import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Loader2,
  Plus,
  Search,
  Settings,
  Star,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  SUPERINTENDENCIAS,
  type EstoqueSapImportacao,
  type EstoqueSapSetor,
  type EstoqueSapVinculo,
} from "@/lib/estoque-sap-types";

type Permissoes = { configurar: boolean; importar: boolean };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permissoes: Permissoes;
  importacoes: EstoqueSapImportacao[];
  alteracoesPrioritarias: Record<string, number>;
  onSelecionarArquivo: () => void;
  refreshKey: number;
  onAlterado: () => void;
};

type TelaConfig = "inicio" | "pep" | "responsavel" | "prioridades" | "importar";

const inputCls =
  "h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:border-[#1f7ad6] focus:outline-none focus:ring-2 focus:ring-[#1f7ad6]/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200";
const selectCls = `${inputCls} min-w-0`;

function normalizarNomeSetor(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

function formatarData(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function EstoqueSapConfiguracoes({
  open,
  onOpenChange,
  permissoes,
  importacoes,
  alteracoesPrioritarias,
  onSelecionarArquivo,
  refreshKey,
  onAlterado,
}: Props) {
  const { user } = useAuth();
  const [tela, setTela] = useState<TelaConfig>("inicio");
  const [busca, setBusca] = useState("");
  const [somenteSemVinculo, setSomenteSemVinculo] = useState(false);
  const [somentePrioritarios, setSomentePrioritarios] = useState(false);
  const [setores, setSetores] = useState<EstoqueSapSetor[]>([]);
  const [peps, setPeps] = useState<EstoqueSapVinculo[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [savingPep, setSavingPep] = useState<Record<string, boolean>>({});
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [setorLote, setSetorLote] = useState("");
  const [superLote, setSuperLote] = useState("");
  const [novoSetorOpen, setNovoSetorOpen] = useState(false);
  const [novoSetorNome, setNovoSetorNome] = useState("");
  const [setorEditando, setSetorEditando] = useState<EstoqueSapSetor | null>(null);
  const [setorEditandoNome, setSetorEditandoNome] = useState("");
  const [savingSetor, setSavingSetor] = useState(false);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pendingVinculos = useRef(new Map<string, Partial<EstoqueSapVinculo>>());

  const carregarConfiguracoes = async () => {
    setCarregando(true);
    const [setoresRes, pepsRes] = await Promise.all([
      supabase.from("estoque_setores").select("id, nome, ativo, criado_por").order("nome"),
      supabase.rpc("estoque_sap_peps"),
    ]);
    if (setoresRes.error || pepsRes.error) {
      toast.error(
        `Erro ao carregar configurações: ${setoresRes.error?.message || pepsRes.error?.message}`,
      );
    } else {
      setSetores((setoresRes.data || []) as EstoqueSapSetor[]);
      setPeps((pepsRes.data || []) as EstoqueSapVinculo[]);
    }
    setCarregando(false);
  };

  useEffect(() => {
    if (!open) return;
    void carregarConfiguracoes();
  }, [open, refreshKey]);

  useEffect(
    () => () => {
      timers.current.forEach((timer) => clearTimeout(timer));
      timers.current.clear();
    },
    [],
  );

  const pepsFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return peps.filter((item) => {
      if (termo && !item.pep.toLocaleLowerCase("pt-BR").includes(termo)) return false;
      if (
        somenteSemVinculo &&
        (tela === "responsavel"
          ? !!item.superintendencia
          : !item.setor_id || !item.superintendencia)
      )
        return false;
      if (somentePrioritarios && !item.prioritario) return false;
      return true;
    });
  }, [busca, peps, somenteSemVinculo, somentePrioritarios]);

  const setoresAtivos = setores.filter((setor) => setor.ativo);
  const totalVinculados = peps.filter((pep) => pep.setor_id && pep.superintendencia).length;
  const totalPrioritarios = peps.filter((pep) => pep.prioritario).length;

  const atualizarPepLocal = (pep: string, patch: Partial<EstoqueSapVinculo>) => {
    setPeps((atuais) => atuais.map((item) => (item.pep === pep ? { ...item, ...patch } : item)));
  };

  const agendarSalvarVinculo = (pep: string, patch: Partial<EstoqueSapVinculo>) => {
    const atual = peps.find((item) => item.pep === pep);
    if (!atual || !user) return;
    const patchesPendentes = { ...(pendingVinculos.current.get(pep) || {}), ...patch };
    pendingVinculos.current.set(pep, patchesPendentes);
    const proximo = { ...atual, ...patchesPendentes };
    atualizarPepLocal(pep, patch);
    const chave = `v:${pep}`;
    const anterior = timers.current.get(chave);
    if (anterior) clearTimeout(anterior);
    setSavingPep((estado) => ({ ...estado, [pep]: true }));
    const timer = setTimeout(async () => {
      const { error } = await supabase.from("estoque_pep_vinculos").upsert(
        {
          pep,
          setor_id: proximo.setor_id,
          superintendencia: proximo.superintendencia,
          atualizado_por: user.id,
        },
        { onConflict: "pep" },
      );
      setSavingPep((estado) => ({ ...estado, [pep]: false }));
      timers.current.delete(chave);
      pendingVinculos.current.delete(pep);
      if (error) {
        toast.error(`Erro ao salvar vínculo do PEP ${pep}: ${error.message}`);
        void carregarConfiguracoes();
      } else {
        onAlterado();
      }
    }, 500);
    timers.current.set(chave, timer);
  };

  const alternarPrioridade = async (pep: EstoqueSapVinculo, marcado: boolean) => {
    if (!user) return;
    setSavingPep((estado) => ({ ...estado, [pep.pep]: true }));
    setPeps((atuais) =>
      atuais.map((item) => (item.pep === pep.pep ? { ...item, prioritario: marcado } : item)),
    );
    const result = marcado
      ? await supabase
          .from("estoque_pep_prioridades")
          .upsert(
            { pep: pep.pep, motivo: pep.motivo || "", criado_por: user.id },
            { onConflict: "pep" },
          )
      : await supabase.from("estoque_pep_prioridades").delete().eq("pep", pep.pep);
    setSavingPep((estado) => ({ ...estado, [pep.pep]: false }));
    if (result.error) {
      toast.error(`Erro ao atualizar prioridade do PEP ${pep.pep}: ${result.error.message}`);
      void carregarConfiguracoes();
    } else {
      onAlterado();
    }
  };

  const agendarSalvarMotivo = (pep: string, motivo: string) => {
    if (!user) return;
    setPeps((atuais) => atuais.map((item) => (item.pep === pep ? { ...item, motivo } : item)));
    const chave = `m:${pep}`;
    const anterior = timers.current.get(chave);
    if (anterior) clearTimeout(anterior);
    setSavingPep((estado) => ({ ...estado, [pep]: true }));
    const timer = setTimeout(async () => {
      const { error } = await supabase
        .from("estoque_pep_prioridades")
        .update({ motivo })
        .eq("pep", pep);
      timers.current.delete(chave);
      setSavingPep((estado) => ({ ...estado, [pep]: false }));
      if (error) toast.error(`Erro ao salvar motivo do PEP ${pep}: ${error.message}`);
      else onAlterado();
    }, 500);
    timers.current.set(chave, timer);
  };

  const aplicarEmLote = async () => {
    if (!user || selecionados.length === 0) return;
    const updates = peps
      .filter((pep) => selecionados.includes(pep.pep))
      .map((pep) => ({
        pep: pep.pep,
        setor_id: setorLote === "__none__" ? null : setorLote || pep.setor_id,
        superintendencia:
          superLote === "__none__"
            ? null
            : (superLote as EstoqueSapVinculo["superintendencia"]) || pep.superintendencia,
        atualizado_por: user.id,
      }));
    setSalvandoLote(true);
    const { error } = await supabase
      .from("estoque_pep_vinculos")
      .upsert(updates, { onConflict: "pep" });
    setSalvandoLote(false);
    if (error) {
      toast.error(`Erro ao aplicar vínculos: ${error.message}`);
      return;
    }
    setSelecionados([]);
    setSetorLote("");
    setSuperLote("");
    toast.success(`Vínculos aplicados a ${updates.length} PEPs.`);
    onAlterado();
    void carregarConfiguracoes();
  };

  const [salvandoLote, setSalvandoLote] = useState(false);

  const aplicarPrioridadeEmLote = async (marcar: boolean) => {
    if (!user || selecionados.length === 0) return;
    setSalvandoLote(true);
    const result = marcar
      ? await supabase.from("estoque_pep_prioridades").upsert(
          selecionados.map((pep) => ({
            pep,
            motivo: peps.find((item) => item.pep === pep)?.motivo || "",
            criado_por: user.id,
          })),
          { onConflict: "pep" },
        )
      : await supabase.from("estoque_pep_prioridades").delete().in("pep", selecionados);
    setSalvandoLote(false);
    if (result.error) {
      toast.error(`Erro ao atualizar prioridades: ${result.error.message}`);
      return;
    }
    setSelecionados([]);
    toast.success(
      `${selecionados.length} PEPs ${marcar ? "marcados como" : "removidos de"} prioritários.`,
    );
    onAlterado();
    void carregarConfiguracoes();
  };

  const salvarNovoSetor = async () => {
    const nome = novoSetorNome.trim();
    if (!nome) return;
    if (setores.some((setor) => normalizarNomeSetor(setor.nome) === normalizarNomeSetor(nome))) {
      toast.error("Já existe um setor com esse nome.");
      return;
    }
    setSavingSetor(true);
    const { data, error } = await supabase
      .from("estoque_setores")
      .insert({ nome, criado_por: user?.id })
      .select("id, nome, ativo, criado_por")
      .single();
    setSavingSetor(false);
    if (error) {
      toast.error(`Erro ao cadastrar setor: ${error.message}`);
      return;
    }
    setSetores((atuais) =>
      [...atuais, data as EstoqueSapSetor].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    );
    setNovoSetorNome("");
    setNovoSetorOpen(false);
    toast.success("Setor cadastrado.");
    onAlterado();
  };

  const abrirEdicaoSetor = (setor: EstoqueSapSetor) => {
    setSetorEditando(setor);
    setSetorEditandoNome(setor.nome);
  };

  const salvarSetorEditado = async () => {
    if (!setorEditando) return;
    const nome = setorEditandoNome.trim();
    if (!nome) return;
    if (
      setores.some(
        (setor) =>
          setor.id !== setorEditando.id &&
          normalizarNomeSetor(setor.nome) === normalizarNomeSetor(nome),
      )
    ) {
      toast.error("Já existe um setor com esse nome.");
      return;
    }
    setSavingSetor(true);
    const { error } = await supabase
      .from("estoque_setores")
      .update({ nome })
      .eq("id", setorEditando.id);
    setSavingSetor(false);
    if (error) {
      toast.error(`Erro ao renomear setor: ${error.message}`);
      return;
    }
    setSetores((atuais) =>
      atuais.map((setor) => (setor.id === setorEditando.id ? { ...setor, nome } : setor)),
    );
    setSetorEditando(null);
    toast.success("Setor atualizado.");
    onAlterado();
  };

  const alternarSetorAtivo = async (setor: EstoqueSapSetor) => {
    const { error } = await supabase
      .from("estoque_setores")
      .update({ ativo: !setor.ativo })
      .eq("id", setor.id);
    if (error) toast.error(`Erro ao alterar setor: ${error.message}`);
    else {
      setSetores((atuais) =>
        atuais.map((item) => (item.id === setor.id ? { ...item, ativo: !setor.ativo } : item)),
      );
      onAlterado();
    }
  };

  const alternarSelecionado = (pep: string) => {
    setSelecionados((atuais) =>
      atuais.includes(pep) ? atuais.filter((item) => item !== pep) : [...atuais, pep],
    );
  };

  const mudarTela = (proxima: TelaConfig) => {
    setTela(proxima);
    setBusca("");
    setSelecionados([]);
    setSomenteSemVinculo(false);
    setSomentePrioritarios(false);
  };

  const tituloTela: Record<TelaConfig, string> = {
    inicio: "Configurações",
    pep: "Vincular PEP",
    responsavel: "Vincular Responsável",
    prioridades: "Prioridades",
    importar: "Importar",
  };

  const mostrarLista = tela === "pep" || tela === "responsavel" || tela === "prioridades";
  const pepFilter = tela === "prioridades" ? somentePrioritarios : somenteSemVinculo;
  const pepsVisiveis = peps.filter((item) => {
    if (
      busca &&
      !item.pep.toLocaleLowerCase("pt-BR").includes(busca.trim().toLocaleLowerCase("pt-BR"))
    )
      return false;
    if (
      pepFilter &&
      (tela === "prioridades"
        ? !item.prioritario
        : tela === "responsavel"
          ? !!item.superintendencia
          : !item.setor_id || !item.superintendencia)
    )
      return false;
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#0b3a73]">
            {tela !== "inicio" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => mudarTela("inicio")}
                aria-label="Voltar às configurações"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <Settings className="h-4 w-4" /> {tituloTela[tela]}
          </DialogTitle>
        </DialogHeader>

        {tela === "inicio" && (
          <div className="grid gap-3 py-2 sm:grid-cols-2">
            {permissoes.configurar && (
              <button
                onClick={() => mudarTela("pep")}
                className="flex items-center justify-between rounded-md border p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <span>
                  <strong className="block text-sm">Vincular PEP</strong>
                  <span className="text-xs text-slate-500">Setor e superintendência</span>
                </span>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
            {permissoes.configurar && (
              <button
                onClick={() => mudarTela("responsavel")}
                className="flex items-center justify-between rounded-md border p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <span>
                  <strong className="block text-sm">Vincular Responsável</strong>
                  <span className="text-xs text-slate-500">Superintendência por PEP</span>
                </span>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
            {permissoes.configurar && (
              <button
                onClick={() => mudarTela("prioridades")}
                className="flex items-center justify-between rounded-md border p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <span>
                  <strong className="block text-sm">Prioridades</strong>
                  <span className="text-xs text-slate-500">
                    {totalPrioritarios} PEPs prioritários
                  </span>
                </span>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
            {permissoes.importar && (
              <button
                onClick={() => mudarTela("importar")}
                className="flex items-center justify-between rounded-md border p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <span>
                  <strong className="block text-sm">Importar</strong>
                  <span className="text-xs text-slate-500">
                    Última importação: {formatarData(importacoes[0]?.importado_em)}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {mostrarLista && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder="Buscar PEP..."
                  className="pl-8"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <Checkbox
                  checked={tela === "prioridades" ? somentePrioritarios : somenteSemVinculo}
                  onCheckedChange={(value) =>
                    tela === "prioridades"
                      ? setSomentePrioritarios(!!value)
                      : setSomenteSemVinculo(!!value)
                  }
                />
                {tela === "prioridades" ? "Somente prioritários" : "Somente sem vínculo"}
              </label>
            </div>

            {permissoes.configurar && (
              <div className="flex flex-wrap items-center gap-2 rounded-md border bg-slate-50 p-2 dark:bg-slate-800/50">
                <Checkbox
                  checked={selecionados.length > 0 && selecionados.length === pepsVisiveis.length}
                  onCheckedChange={(value) =>
                    setSelecionados(value ? pepsVisiveis.map((item) => item.pep) : [])
                  }
                />
                <span className="text-xs text-slate-600">{selecionados.length} selecionados</span>
                {tela !== "prioridades" ? (
                  <>
                    <select
                      className={selectCls}
                      value={setorLote}
                      onChange={(event) => setSetorLote(event.target.value)}
                    >
                      <option value="">Manter setor</option>
                      <option value="__none__">Sem setor</option>
                      {setoresAtivos.map((setor) => (
                        <option key={setor.id} value={setor.id}>
                          {setor.nome}
                        </option>
                      ))}
                    </select>
                    <select
                      className={selectCls}
                      value={superLote}
                      onChange={(event) => setSuperLote(event.target.value)}
                    >
                      <option value="">Manter superintendência</option>
                      <option value="__none__">Sem superintendência</option>
                      {SUPERINTENDENCIAS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      onClick={() => void aplicarEmLote()}
                      disabled={!selecionados.length || salvandoLote}
                    >
                      Aplicar a {selecionados.length} PEPs
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void aplicarPrioridadeEmLote(true)}
                      disabled={!selecionados.length || salvandoLote}
                    >
                      Marcar prioridade
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void aplicarPrioridadeEmLote(false)}
                      disabled={!selecionados.length || salvandoLote}
                    >
                      Remover prioridade
                    </Button>
                  </>
                )}
              </div>
            )}

            {(tela === "pep" || tela === "responsavel") &&
              permissoes.configurar &&
              tela === "pep" && (
                <div className="flex items-center justify-between gap-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 dark:border-blue-900 dark:bg-blue-950/30">
                  <span className="text-xs text-blue-800 dark:text-blue-200">
                    {totalVinculados} de {peps.length} PEPs vinculados
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSetorEditando(null);
                      setNovoSetorNome("");
                      setNovoSetorOpen(true);
                    }}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Cadastrar Setor
                  </Button>
                </div>
              )}

            {tela === "prioridades" && (
              <p className="text-xs text-slate-500">
                {totalPrioritarios} PEPs prioritários. As alterações são compartilhadas em tempo
                real.
              </p>
            )}

            {carregando ? (
              <div className="flex justify-center py-10 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <div className="max-h-[55vh] overflow-auto rounded-md border">
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead className="sticky top-0 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <tr>
                      <th className="px-3 py-2">PEP</th>
                      <th className="px-3 py-2">Setor</th>
                      <th className="px-3 py-2">Superintendência</th>
                      {tela === "prioridades" && (
                        <>
                          <th className="px-3 py-2">Motivo</th>
                          <th className="px-3 py-2">Alterações recentes</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {pepsVisiveis.map((item) => (
                      <tr key={item.pep} className="border-t">
                        <td className="whitespace-nowrap px-3 py-2 font-mono">
                          {permissoes.configurar && (
                            <Checkbox
                              checked={selecionados.includes(item.pep)}
                              onCheckedChange={() => alternarSelecionado(item.pep)}
                              className="mr-2"
                            />
                          )}
                          {tela === "prioridades" && (
                            <Checkbox
                              checked={item.prioritario}
                              onCheckedChange={(value) => void alternarPrioridade(item, !!value)}
                              className="mr-2"
                            />
                          )}
                          {item.prioritario && (
                            <Star className="mr-1 inline h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                          )}
                          {item.pep}
                        </td>
                        <td className="px-3 py-2">
                          {tela === "responsavel" ? (
                            <span>{item.setor_nome || "—"}</span>
                          ) : (
                            <select
                              disabled={!permissoes.configurar}
                              className={selectCls}
                              value={item.setor_id || ""}
                              onChange={(event) =>
                                agendarSalvarVinculo(item.pep, {
                                  setor_id: event.target.value || null,
                                })
                              }
                            >
                              <option value="">Sem vínculo</option>
                              {setoresAtivos.map((setor) => (
                                <option key={setor.id} value={setor.id}>
                                  {setor.nome}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <select
                            disabled={!permissoes.configurar}
                            className={selectCls}
                            value={item.superintendencia || ""}
                            onChange={(event) =>
                              agendarSalvarVinculo(item.pep, {
                                superintendencia: (event.target.value ||
                                  null) as EstoqueSapVinculo["superintendencia"],
                              })
                            }
                          >
                            <option value="">Sem vínculo</option>
                            {SUPERINTENDENCIAS.map((superintendencia) => (
                              <option key={superintendencia} value={superintendencia}>
                                {superintendencia}
                              </option>
                            ))}
                          </select>
                        </td>
                        {tela === "prioridades" && (
                          <>
                            <td className="px-3 py-2">
                              <Input
                                disabled={!permissoes.configurar || !item.prioritario}
                                value={item.motivo || ""}
                                onChange={(event) =>
                                  agendarSalvarMotivo(item.pep, event.target.value)
                                }
                                className="h-8 min-w-[160px]"
                                placeholder="Motivo opcional"
                              />
                            </td>
                            <td className="px-3 py-2">
                              {alteracoesPrioritarias[item.pep] > 0 ? (
                                <Badge variant="outline">
                                  {alteracoesPrioritarias[item.pep]} alterações
                                </Badge>
                              ) : (
                                <span className="text-slate-400">Sem alterações</span>
                              )}
                            </td>
                          </>
                        )}
                        {savingPep[item.pep] && (
                          <td className="px-2 text-slate-400">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          </td>
                        )}
                      </tr>
                    ))}
                    {!pepsVisiveis.length && (
                      <tr>
                        <td
                          colSpan={tela === "prioridades" ? 5 : 3}
                          className="px-3 py-8 text-center text-slate-400"
                        >
                          Nenhum PEP encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tela === "importar" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
              <div>
                <p className="text-sm font-semibold">Importação em snapshot</p>
                <p className="text-xs text-slate-500">
                  A importação ativa continua disponível até a nova ser ativada.
                </p>
              </div>
              <Button onClick={onSelecionarArquivo}>
                <Upload className="mr-2 h-4 w-4" /> Selecionar planilha
              </Button>
            </div>
            <div className="rounded-md border">
              <div className="border-b px-3 py-2 text-xs font-semibold">Últimas importações</div>
              <div className="max-h-[42vh] overflow-auto">
                {importacoes.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2 text-xs last:border-0"
                  >
                    <span className="min-w-0 flex-1 truncate">{item.arquivo_nome}</span>
                    <span className="text-slate-500">
                      {formatarData(item.importado_em)} · {item.nome_importador || "Usuário"}
                    </span>
                    <span>
                      {item.total_linhas.toLocaleString("pt-BR")} linhas ·{" "}
                      {item.valor_total_livre.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </span>
                    {item.ativa && <Badge className="bg-emerald-100 text-emerald-800">Ativa</Badge>}
                    {item.status === "erro" && <Badge variant="destructive">Erro</Badge>}
                  </div>
                ))}
                {!importacoes.length && (
                  <p className="px-3 py-8 text-center text-xs text-slate-400">
                    Nenhuma importação registrada.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {tela === "inicio" && importacoes.length > 0 && (
          <p className="text-xs text-slate-500">
            Última importação: {formatarData(importacoes[0].importado_em)} ·{" "}
            {importacoes[0].nome_importador || "Usuário"}
          </p>
        )}
      </DialogContent>

      <Dialog open={novoSetorOpen} onOpenChange={setNovoSetorOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cadastrar setor</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={novoSetorNome}
              onChange={(event) => setNovoSetorNome(event.target.value)}
              placeholder="Nome do setor"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNovoSetorOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => void salvarNovoSetor()}
                disabled={savingSetor || !novoSetorNome.trim()}
              >
                {savingSetor && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar
              </Button>
            </div>
            <div className="space-y-1 border-t pt-3">
              {setores.map((setor) => (
                <div key={setor.id} className="flex items-center justify-between gap-2 text-xs">
                  {setorEditando?.id === setor.id ? (
                    <Input
                      value={setorEditandoNome}
                      onChange={(event) => setSetorEditandoNome(event.target.value)}
                      className="h-8"
                      onKeyDown={(event) => event.key === "Enter" && void salvarSetorEditado()}
                    />
                  ) : (
                    <span className={setor.ativo ? "" : "text-slate-400 line-through"}>
                      {setor.nome}
                    </span>
                  )}
                  <span className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7"
                      onClick={() =>
                        setorEditando?.id === setor.id
                          ? void salvarSetorEditado()
                          : abrirEdicaoSetor(setor)
                      }
                    >
                      {setorEditando?.id === setor.id ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        "Renomear"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7"
                      onClick={() => void alternarSetorAtivo(setor)}
                    >
                      {setor.ativo ? "Desativar" : "Ativar"}
                    </Button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
