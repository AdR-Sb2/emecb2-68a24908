import { useEffect, useMemo, useState } from "react";
import { Check, GitMerge, Loader2, Search, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { equipeChaveFinal, normalizarIntegrante } from "@/lib/equipe-utils";
import { supabase } from "@/lib/supabase";
import type {
  EquipeAliasRegistro,
  IntegranteAliasRegistro,
  SugestaoEquipeIgnorada,
} from "@/hooks/use-equipe-aliases";

export type EquipeGerenciavel = {
  chave: string;
  rotulo: string;
  total: number;
  chavesOrigem: string[];
  integrantes: Array<{ chave: string; rotulo: string; total: number }>;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipes: EquipeGerenciavel[];
  aliasesEquipe: EquipeAliasRegistro[];
  aliasesIntegrante: IntegranteAliasRegistro[];
  sugestoesIgnoradas: SugestaoEquipeIgnorada[];
  userId: string | null;
  onAliasesChanged: () => void;
};

type Sugestao = { a: EquipeGerenciavel; b: EquipeGerenciavel; nomeA: string; nomeB: string };

function distanciaLevenshtein(a: string, b: string): number {
  const linha = Array.from({ length: b.length + 1 }, (_, indice) => indice);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = linha[0];
    linha[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const acima = linha[j];
      linha[j] = Math.min(
        linha[j] + 1,
        linha[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diagonal = acima;
    }
  }
  return linha[b.length];
}

function parOrdenado(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export function UnificarEquipesDialog({
  open,
  onOpenChange,
  equipes,
  aliasesEquipe,
  aliasesIntegrante,
  sugestoesIgnoradas,
  userId,
  onAliasesChanged,
}: Props) {
  const [aba, setAba] = useState("equipes");
  const [busca, setBusca] = useState("");
  const [ordenacao, setOrdenacao] = useState<"nome" | "quantidade">("quantidade");
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [confirmando, setConfirmando] = useState(false);
  const [destinoSelecionado, setDestinoSelecionado] = useState("");
  const [nomePersonalizado, setNomePersonalizado] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [buscaIntegrantes, setBuscaIntegrantes] = useState("");
  const [integrantesSelecionados, setIntegrantesSelecionados] = useState<string[]>([]);
  const [destinoIntegrante, setDestinoIntegrante] = useState("");
  const [nomeIntegrantePersonalizado, setNomeIntegrantePersonalizado] = useState("");
  const [autores, setAutores] = useState<Record<string, string>>({});
  const [confirmacao, setConfirmacao] = useState<{
    titulo: string;
    descricao: string;
    executar: () => Promise<void>;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    const ids = [
      ...new Set(
        [...aliasesEquipe, ...aliasesIntegrante]
          .map((alias) => alias.criado_por)
          .filter((id): id is string => !!id),
      ),
    ];
    if (ids.length === 0) {
      setAutores({});
      return;
    }
    let ativo = true;
    supabase
      .from("profiles")
      .select("id, nome_completo")
      .in("id", ids)
      .then(({ data }) => {
        if (ativo && data) {
          setAutores(Object.fromEntries(data.map((perfil) => [perfil.id, perfil.nome_completo])));
        }
      });
    return () => {
      ativo = false;
    };
  }, [open, aliasesEquipe, aliasesIntegrante]);

  const equipesFiltradas = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return equipes
      .filter((equipe) => !termo || equipe.rotulo.toLocaleLowerCase("pt-BR").includes(termo))
      .sort((a, b) =>
        ordenacao === "nome"
          ? a.rotulo.localeCompare(b.rotulo, "pt-BR")
          : b.total - a.total || a.rotulo.localeCompare(b.rotulo, "pt-BR"),
      );
  }, [busca, equipes, ordenacao]);

  const membros = useMemo(() => {
    const acumulados = new Map<string, { total: number; rotulos: Map<string, number> }>();
    for (const equipe of equipes) {
      for (const integrante of equipe.integrantes) {
        const atual = acumulados.get(integrante.chave) || {
          total: 0,
          rotulos: new Map<string, number>(),
        };
        atual.total += integrante.total;
        atual.rotulos.set(
          integrante.rotulo,
          (atual.rotulos.get(integrante.rotulo) || 0) + integrante.total,
        );
        acumulados.set(integrante.chave, atual);
      }
    }
    const aliasesExistentes = new Set(aliasesIntegrante.map((alias) => alias.alias_nome));
    return [...acumulados.entries()]
      .filter(([chave]) => !aliasesExistentes.has(chave))
      .map(([chave, item]) => ({
        chave,
        rotulo: [...item.rotulos.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || chave,
        total: item.total,
      }))
      .sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR"));
  }, [aliasesIntegrante, equipes]);

  const sugestoes = useMemo(() => {
    const ignoradas = new Set(
      sugestoesIgnoradas.map((item) => `${item.chave_a}\u0000${item.chave_b}`),
    );
    const encontradas: Sugestao[] = [];
    for (let i = 0; i < equipes.length; i++) {
      for (let j = i + 1; j < equipes.length; j++) {
        const a = equipes[i];
        const b = equipes[j];
        if (a.integrantes.length !== b.integrantes.length) continue;
        const membrosA = a.integrantes.map((pessoa) => pessoa.chave);
        const membrosB = b.integrantes.map((pessoa) => pessoa.chave);
        const diferentesA = membrosA.filter((nome) => !membrosB.includes(nome));
        const diferentesB = membrosB.filter((nome) => !membrosA.includes(nome));
        if (diferentesA.length !== 1 || diferentesB.length !== 1) continue;
        if (distanciaLevenshtein(diferentesA[0], diferentesB[0]) > 2) continue;
        const [chave_a, chave_b] = parOrdenado(a.chave, b.chave);
        if (ignoradas.has(`${chave_a}\u0000${chave_b}`)) continue;
        encontradas.push({
          a,
          b,
          nomeA: diferentesA[0],
          nomeB: diferentesB[0],
        });
      }
    }
    return encontradas.sort((a, b) => b.a.total + b.b.total - (a.a.total + a.b.total));
  }, [equipes, sugestoesIgnoradas]);

  const selecionadasRows = equipes.filter((equipe) => selecionadas.includes(equipe.chave));
  const destinoRow = selecionadasRows.find((equipe) => equipe.chave === destinoSelecionado);
  const rotuloDestino =
    destinoSelecionado === "__personalizado__"
      ? nomePersonalizado.trim()
      : destinoRow?.rotulo || "";
  const totalSelecionado = selecionadasRows.reduce((total, equipe) => total + equipe.total, 0);
  const totalAntes = equipes.reduce((total, equipe) => total + equipe.total, 0);

  const alternarEquipe = (chave: string) => {
    setSelecionadas((atuais) =>
      atuais.includes(chave) ? atuais.filter((item) => item !== chave) : [...atuais, chave],
    );
    setConfirmando(false);
  };

  const iniciarConfirmacao = (chaves: string[]) => {
    setSelecionadas(chaves);
    setDestinoSelecionado(chaves[0] || "");
    setNomePersonalizado("");
    setConfirmando(true);
  };

  const salvarUnificacao = async () => {
    if (selecionadasRows.length < 2 || !rotuloDestino || !userId) return;
    const destinoEquipe = destinoSelecionado === "__personalizado__" ? null : destinoRow;
    const destinoChave =
      destinoEquipe?.chave || equipeChaveFinal(rotuloDestino, aliasesEquipe, aliasesIntegrante);
    const conflito = equipes.find(
      (equipe) => equipe.chave === destinoChave && !selecionadas.includes(equipe.chave),
    );
    if (conflito) {
      toast.error("Esse destino já corresponde a outra equipe. Selecione-a antes de unificar.");
      return;
    }
    const aliasChaves = [
      ...new Set(selecionadasRows.flatMap((equipe) => [equipe.chave, ...equipe.chavesOrigem])),
    ].filter((chave) => chave !== destinoChave);
    if (aliasChaves.length === 0) {
      toast.error("Não há uma variante diferente para unificar.");
      return;
    }

    setSalvando(true);
    const { error } = await supabase.rpc("unificar_equipes_aliases", {
      p_alias_chaves: aliasChaves,
      p_destino_chave: destinoChave,
      p_destino_rotulo: rotuloDestino,
    });
    setSalvando(false);
    if (error) {
      toast.error(`Não foi possível unificar as equipes: ${error.message}`);
      return;
    }
    toast.success("Equipes unificadas para todos os usuários.");
    setConfirmando(false);
    setSelecionadas([]);
    onAliasesChanged();
  };

  const salvarAliasIntegrantes = async () => {
    if (integrantesSelecionados.length < 2 || !userId) return;
    const destino = membros.find((pessoa) => pessoa.chave === destinoIntegrante);
    const nomeDestino =
      destinoIntegrante === "__personalizado__"
        ? nomeIntegrantePersonalizado.trim()
        : destino?.rotulo || "";
    const chaveDestino = normalizarIntegrante(nomeDestino);
    if (!nomeDestino || !chaveDestino) return;

    const fontes = integrantesSelecionados.filter((chave) => chave !== chaveDestino);
    if (fontes.length === 0) {
      toast.error("Não há um nome diferente para unificar.");
      return;
    }
    const reapontarIds = aliasesIntegrante
      .filter((alias) => fontes.includes(normalizarIntegrante(alias.destino_nome)))
      .map((alias) => alias.id);

    setSalvando(true);
    const { error } = await supabase.rpc("unificar_aliases_integrantes", {
      p_alias_nomes: fontes,
      p_destino_chave: chaveDestino,
      p_destino_nome: nomeDestino,
      p_reapontar_ids: reapontarIds,
    });
    setSalvando(false);
    if (error) {
      toast.error(`Não foi possível unificar os integrantes: ${error.message}`);
      return;
    }
    toast.success("Nomes de integrantes unificados para todos os usuários.");
    setIntegrantesSelecionados([]);
    setDestinoIntegrante("");
    onAliasesChanged();
  };

  const ignorarSugestao = async (a: string, b: string) => {
    if (!userId) return;
    const [chave_a, chave_b] = parOrdenado(a, b);
    const { error } = await supabase
      .from("equipe_sugestoes_ignoradas")
      .upsert({ chave_a, chave_b, criado_por: userId }, { onConflict: "chave_a,chave_b" });
    if (error) toast.error(`Não foi possível ignorar a sugestão: ${error.message}`);
    else {
      toast.success("Sugestão ignorada.");
      onAliasesChanged();
    }
  };

  const separarEquipe = async (linha: EquipeAliasRegistro) => {
    const { error } = await supabase.rpc("separar_equipe_alias", { p_id: linha.id });
    if (error) {
      toast.error(`Não foi possível separar a variante: ${error.message}`);
      return;
    }
    toast.success("Variante separada.", {
      action: {
        label: "Desfazer",
        onClick: async () => {
          const { error: restoreError } = await supabase.rpc("unificar_equipes_aliases", {
            p_alias_chaves: [linha.alias_chave],
            p_destino_chave: linha.destino_chave,
            p_destino_rotulo: linha.destino_rotulo,
          });
          if (restoreError)
            toast.error(`Não foi possível restaurar o alias: ${restoreError.message}`);
          else onAliasesChanged();
        },
      },
    });
    onAliasesChanged();
  };

  const desfazerGrupo = async (grupoId: string) => {
    const linhas = aliasesEquipe.filter((alias) => alias.unificacao_id === grupoId);
    const { error } = await supabase.rpc("desfazer_equipes_aliases", {
      p_unificacao_id: grupoId,
    });
    if (error) {
      toast.error(`Não foi possível desfazer a unificação: ${error.message}`);
      return;
    }
    toast.success("Unificação desfeita.", {
      action: {
        label: "Desfazer",
        onClick: async () => {
          const { error: restoreError } = await supabase.rpc("unificar_equipes_aliases", {
            p_alias_chaves: linhas.map((linha) => linha.alias_chave),
            p_destino_chave: linhas[0]?.destino_chave || "",
            p_destino_rotulo: linhas[0]?.destino_rotulo || "",
          });
          if (restoreError)
            toast.error(`Não foi possível restaurar a unificação: ${restoreError.message}`);
          else onAliasesChanged();
        },
      },
    });
    onAliasesChanged();
  };

  const desfazerIntegrante = async (linha: IntegranteAliasRegistro) => {
    const { error } = await supabase.rpc("desfazer_integrante_alias", { p_id: linha.id });
    if (error) {
      toast.error(`Não foi possível desfazer o alias: ${error.message}`);
      return;
    }
    toast.success("Unificação de integrante desfeita.", {
      action: {
        label: "Desfazer",
        onClick: async () => {
          const { error: restoreError } = await supabase.rpc("unificar_aliases_integrantes", {
            p_alias_nomes: [linha.alias_nome],
            p_destino_chave: normalizarIntegrante(linha.destino_nome),
            p_destino_nome: linha.destino_nome,
            p_reapontar_ids: [],
          });
          if (restoreError)
            toast.error(`Não foi possível restaurar o alias: ${restoreError.message}`);
          else onAliasesChanged();
        },
      },
    });
    onAliasesChanged();
  };

  const executarConfirmacao = async () => {
    if (!confirmacao) return;
    setSalvando(true);
    await confirmacao.executar();
    setSalvando(false);
    setConfirmacao(null);
  };

  const gruposSalvos = useMemo(() => {
    const grupos = new Map<string, EquipeAliasRegistro[]>();
    for (const alias of aliasesEquipe) {
      const grupo = grupos.get(alias.unificacao_id) || [];
      grupo.push(alias);
      grupos.set(alias.unificacao_id, grupo);
    }
    return [...grupos.entries()];
  }, [aliasesEquipe]);

  const integrantesFiltrados = membros.filter((pessoa) =>
    pessoa.rotulo
      .toLocaleLowerCase("pt-BR")
      .includes(buscaIntegrantes.trim().toLocaleLowerCase("pt-BR")),
  );
  const selecionadasIntegrantes = membros.filter((pessoa) =>
    integrantesSelecionados.includes(pessoa.chave),
  );
  const nomeDestinoIntegrante =
    destinoIntegrante === "__personalizado__"
      ? nomeIntegrantePersonalizado.trim()
      : membros.find((pessoa) => pessoa.chave === destinoIntegrante)?.rotulo || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden p-0">
        <DialogHeader className="border-b px-5 py-4 pr-12">
          <DialogTitle className="flex items-center gap-2 text-base">
            <GitMerge className="h-4 w-4 text-[#0b3a73]" /> Unificar equipes
          </DialogTitle>
          <DialogDescription>
            Unificações afetam somente a leitura dos dados; os registros originais permanecem
            intactos.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={aba} onValueChange={setAba} className="flex min-h-0 flex-col">
          <TabsList className="mx-5 mt-3 grid w-auto grid-cols-3">
            <TabsTrigger value="equipes">Equipes</TabsTrigger>
            <TabsTrigger value="integrantes">Integrantes</TabsTrigger>
            <TabsTrigger value="salvas">Unificações salvas</TabsTrigger>
          </TabsList>

          <TabsContent value="equipes" className="mt-0 min-h-0 overflow-y-auto px-5 pb-5 pt-3">
            {confirmando ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Confirmar unificação</h3>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmando(false)}>
                    <X className="mr-1 h-4 w-4" /> Voltar à lista
                  </Button>
                </div>
                <fieldset className="space-y-2">
                  <legend className="mb-2 text-xs font-medium">Nome que vai ficar</legend>
                  {selecionadasRows.map((equipe) => (
                    <label key={equipe.chave} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="destino-equipe"
                        checked={destinoSelecionado === equipe.chave}
                        onChange={() => setDestinoSelecionado(equipe.chave)}
                      />
                      {equipe.rotulo}
                    </label>
                  ))}
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="destino-equipe"
                      checked={destinoSelecionado === "__personalizado__"}
                      onChange={() => setDestinoSelecionado("__personalizado__")}
                    />
                    Digitar outro nome
                  </label>
                  {destinoSelecionado === "__personalizado__" && (
                    <Input
                      autoFocus
                      value={nomePersonalizado}
                      onChange={(event) => setNomePersonalizado(event.target.value)}
                      placeholder="Nome do grupo"
                      className="max-w-md"
                    />
                  )}
                </fieldset>

                <div className="rounded-md border bg-muted/40 p-3 text-sm">
                  <p>
                    <strong>{selecionadasRows.map((equipe) => equipe.rotulo).join(", ")}</strong>{" "}
                    viram <strong>{rotuloDestino || "..."}</strong>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {totalSelecionado} O.S. antes → {totalSelecionado} O.S. depois. Total geral:{" "}
                    {totalAntes} → {totalAntes} O.S.
                  </p>
                </div>
                <Button
                  onClick={salvarUnificacao}
                  disabled={salvando || selecionadasRows.length < 2 || !rotuloDestino}
                  className="bg-[#0b3a73] hover:bg-[#082b57]"
                >
                  {salvando ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Confirmar unificação
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {sugestoes.length > 0 && (
                  <section className="space-y-2 rounded-md border border-amber-300 bg-amber-50/70 p-3 dark:bg-amber-950/20">
                    <h3 className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                      Possíveis duplicadas
                    </h3>
                    {sugestoes.slice(0, 8).map((sugestao) => (
                      <div
                        key={`${sugestao.a.chave}:${sugestao.b.chave}`}
                        className="flex flex-wrap items-center justify-between gap-2 border-t border-amber-200 pt-2 text-xs dark:border-amber-900"
                      >
                        <span>
                          {sugestao.a.rotulo}{" "}
                          <span className="text-muted-foreground">/ {sugestao.nomeA}</span>
                          <span className="mx-1">↔</span>
                          {sugestao.b.rotulo}{" "}
                          <span className="text-muted-foreground">/ {sugestao.nomeB}</span>
                        </span>
                        <span className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7"
                            onClick={() => iniciarConfirmacao([sugestao.a.chave, sugestao.b.chave])}
                          >
                            Unificar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7"
                            onClick={() => void ignorarSugestao(sugestao.a.chave, sugestao.b.chave)}
                          >
                            Ignorar
                          </Button>
                        </span>
                      </div>
                    ))}
                  </section>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-[200px] flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={busca}
                      onChange={(event) => setBusca(event.target.value)}
                      placeholder="Buscar equipe..."
                      className="pl-8"
                    />
                  </div>
                  <select
                    value={ordenacao}
                    onChange={(event) => setOrdenacao(event.target.value as "nome" | "quantidade")}
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    aria-label="Ordenar equipes"
                  >
                    <option value="quantidade">Maior quantidade</option>
                    <option value="nome">Nome</option>
                  </select>
                </div>

                <div className="max-h-[42vh] divide-y overflow-y-auto rounded-md border">
                  {equipesFiltradas.map((equipe) => (
                    <label
                      key={equipe.chave}
                      className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={selecionadas.includes(equipe.chave)}
                        onCheckedChange={() => alternarEquipe(equipe.chave)}
                      />
                      <span className="min-w-0 flex-1 truncate">{equipe.rotulo}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {equipe.total} O.S.
                      </span>
                    </label>
                  ))}
                  {equipesFiltradas.length === 0 && (
                    <p className="p-4 text-center text-sm text-muted-foreground">
                      Nenhuma equipe encontrada.
                    </p>
                  )}
                </div>
                {selecionadas.length >= 2 && (
                  <Button
                    onClick={() => iniciarConfirmacao(selecionadas)}
                    className="bg-[#0b3a73] hover:bg-[#082b57]"
                  >
                    <GitMerge className="mr-2 h-4 w-4" /> Unificar {selecionadas.length} equipes
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="integrantes" className="mt-0 min-h-0 overflow-y-auto px-5 pb-5 pt-3">
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={buscaIntegrantes}
                  onChange={(event) => setBuscaIntegrantes(event.target.value)}
                  placeholder="Buscar integrante..."
                  className="pl-8"
                />
              </div>
              <div className="max-h-[40vh] divide-y overflow-y-auto rounded-md border">
                {integrantesFiltrados.map((pessoa) => (
                  <label
                    key={pessoa.chave}
                    className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={integrantesSelecionados.includes(pessoa.chave)}
                      onCheckedChange={() =>
                        setIntegrantesSelecionados((atuais) =>
                          atuais.includes(pessoa.chave)
                            ? atuais.filter((item) => item !== pessoa.chave)
                            : [...atuais, pessoa.chave],
                        )
                      }
                    />
                    <span className="min-w-0 flex-1 truncate">{pessoa.rotulo}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {pessoa.total} O.S.
                    </span>
                  </label>
                ))}
                {integrantesFiltrados.length === 0 && (
                  <p className="p-4 text-center text-sm text-muted-foreground">
                    Nenhum integrante encontrado.
                  </p>
                )}
              </div>
              {integrantesSelecionados.length >= 2 && (
                <div className="space-y-3 rounded-md border bg-muted/30 p-3">
                  <p className="text-xs font-semibold">Escolha o nome correto</p>
                  {selecionadasIntegrantes.map((pessoa) => (
                    <label key={pessoa.chave} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="destino-integrante"
                        checked={destinoIntegrante === pessoa.chave}
                        onChange={() => setDestinoIntegrante(pessoa.chave)}
                      />
                      {pessoa.rotulo}
                    </label>
                  ))}
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="destino-integrante"
                      checked={destinoIntegrante === "__personalizado__"}
                      onChange={() => setDestinoIntegrante("__personalizado__")}
                    />
                    Digitar outro nome
                  </label>
                  {destinoIntegrante === "__personalizado__" && (
                    <Input
                      value={nomeIntegrantePersonalizado}
                      onChange={(event) => setNomeIntegrantePersonalizado(event.target.value)}
                      placeholder="Nome correto"
                      className="max-w-sm"
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    {selecionadasIntegrantes.map((pessoa) => pessoa.rotulo).join(", ")} viram{" "}
                    {nomeDestinoIntegrante || "..."}
                  </p>
                  <Button
                    onClick={() => void salvarAliasIntegrantes()}
                    disabled={salvando || !nomeDestinoIntegrante}
                    className="bg-[#0b3a73] hover:bg-[#082b57]"
                  >
                    {salvando ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-2 h-4 w-4" />
                    )}
                    Confirmar nomes
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="salvas" className="mt-0 min-h-0 overflow-y-auto px-5 pb-5 pt-3">
            <div className="space-y-5">
              <section className="space-y-2">
                <h3 className="text-xs font-semibold">Equipes</h3>
                {gruposSalvos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma unificação de equipe salva.
                  </p>
                ) : (
                  gruposSalvos.map(([grupoId, linhas]) => (
                    <div key={grupoId} className="rounded-md border">
                      <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
                        <span className="text-sm font-medium">{linhas[0].destino_rotulo}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7"
                          onClick={() =>
                            setConfirmacao({
                              titulo: "Desfazer unificação de equipe?",
                              descricao: `As variantes voltarão a aparecer separadamente.`,
                              executar: () => desfazerGrupo(grupoId),
                            })
                          }
                        >
                          <Undo2 className="mr-1 h-3.5 w-3.5" /> Desfazer grupo
                        </Button>
                      </div>
                      {linhas.map((linha) => (
                        <div
                          key={linha.id}
                          className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2 text-xs first:border-0"
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {linha.alias_chave} → {linha.destino_rotulo}
                          </span>
                          <span className="text-muted-foreground">
                            {(linha.criado_por && autores[linha.criado_por]) ||
                              linha.criado_por ||
                              "Usuário"}{" "}
                            · {new Date(linha.criado_em).toLocaleDateString("pt-BR")}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7"
                            onClick={() =>
                              setConfirmacao({
                                titulo: "Separar esta variante?",
                                descricao: `${linha.alias_chave} deixará de apontar para ${linha.destino_rotulo}.`,
                                executar: () => separarEquipe(linha),
                              })
                            }
                          >
                            <X className="mr-1 h-3.5 w-3.5" /> Separar
                          </Button>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-semibold">Integrantes</h3>
                {aliasesIntegrante.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma unificação de integrante salva.
                  </p>
                ) : (
                  aliasesIntegrante.map((linha) => (
                    <div
                      key={linha.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs"
                    >
                      <span>
                        {linha.alias_nome} → {linha.destino_nome}
                      </span>
                      <span className="text-muted-foreground">
                        {(linha.criado_por && autores[linha.criado_por]) ||
                          linha.criado_por ||
                          "Usuário"}{" "}
                        · {new Date(linha.criado_em).toLocaleDateString("pt-BR")}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7"
                        onClick={() =>
                          setConfirmacao({
                            titulo: "Desfazer unificação de integrante?",
                            descricao: `${linha.alias_nome} voltará a ser reconhecido como nome separado.`,
                            executar: () => desfazerIntegrante(linha),
                          })
                        }
                      >
                        <Undo2 className="mr-1 h-3.5 w-3.5" /> Desfazer
                      </Button>
                    </div>
                  ))
                )}
              </section>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
      <AlertDialog
        open={!!confirmacao}
        onOpenChange={(aberto) => !aberto && !salvando && setConfirmacao(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmacao?.titulo}</AlertDialogTitle>
            <AlertDialogDescription>{confirmacao?.descricao}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={salvando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={salvando}
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={(event) => {
                event.preventDefault();
                void executarConfirmacao();
              }}
            >
              {salvando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Undo2 className="mr-2 h-4 w-4" />
              )}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
