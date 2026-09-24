import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Copy,
  Edit3,
  Loader2,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { getPermissoesCargo, temPainel } from "@/lib/permissoes";
import { supabase } from "@/lib/supabase";
import type {
  PlanoManutencaoEquipamento,
  PlanoManutencaoModelo,
} from "@/lib/plano-manutencao-types";
import { toast } from "sonner";

export const Route = createFileRoute("/plano-manutencao")({
  head: () => ({
    meta: [{ title: "Eletromecânica · Plano de Manutenção" }],
  }),
  component: PlanoManutencaoPage,
});

const MODELOS_INICIAIS: PlanoManutencaoModelo[] = [
  {
    nome: "Inversor",
    tipo_equipamento: "Inversor",
    plano_ativo_padrao: false,
    movimentado_corretamente_padrao: false,
  },
  {
    nome: "Bomba",
    tipo_equipamento: "Bomba",
    plano_ativo_padrao: false,
    movimentado_corretamente_padrao: false,
  },
  {
    nome: "Motor elétrico",
    tipo_equipamento: "Motor",
    plano_ativo_padrao: false,
    movimentado_corretamente_padrao: false,
  },
  {
    nome: "Softstarter",
    tipo_equipamento: "Softstarter",
    plano_ativo_padrao: false,
    movimentado_corretamente_padrao: false,
  },
  {
    nome: "CLP",
    tipo_equipamento: "CLP",
    plano_ativo_padrao: false,
    movimentado_corretamente_padrao: false,
  },
];

const emptyForm = {
  elevatoria_id: null as number | null,
  nome_elevatoria: "",
  planta: "",
  tag_equipamento: "",
  tipo_equipamento: "",
  plano_ativo: false,
  movimentado_corretamente: false,
  observacao: "",
};

function PlanoManutencaoPage() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<PlanoManutencaoEquipamento[]>([]);
  const [elevatorias, setElevatorias] = useState<
    Array<{ id: number; nome: string; planta: string | null }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroPlano, setFiltroPlano] = useState<"todos" | "sim" | "nao">("todos");
  const [filtroMovimentado, setFiltroMovimentado] = useState<"todos" | "sim" | "nao">("todos");
  const [filtroPlanta, setFiltroPlanta] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroNomeElevatoria, setFiltroNomeElevatoria] = useState("todos");
  const [formOpen, setFormOpen] = useState(false);
  const [modelsOpen, setModelsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login", replace: true });
      return;
    }
    if (profile?.status === "pendente") {
      navigate({ to: "/pending", replace: true });
      return;
    }
    if (profile?.status === "bloqueado") {
      navigate({ to: "/bloqueado", replace: true });
      return;
    }
    if (!profile?.cargo_id) return;

    const validarAcesso = async () => {
      const permissoes = await getPermissoesCargo(profile.cargo_id);
      const podeVer =
        temPainel(permissoes, "plano_manutencao") ||
        temPainel(permissoes, "ficha_elevatoria") ||
        temPainel(permissoes, "estoque");

      if (!podeVer) {
        navigate({ to: "/", replace: true });
        return;
      }

      await Promise.all([loadElevatorias(), loadRows()]);
    };

    void validarAcesso();
  }, [authLoading, navigate, profile?.cargo_id, profile?.status, user]);

  const loadElevatorias = async () => {
    const { data, error } = await supabase
      .from("elevatorias")
      .select("id, nome, planta")
      .order("nome");
    if (error) {
      console.warn("Falha ao carregar elevatórias para Plano de Manutenção:", error.message);
      setElevatorias([]);
      return;
    }
    setElevatorias((data ?? []) as Array<{ id: number; nome: string; planta: string | null }>);
  };

  const loadRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("plano_manutencao_equipamentos")
      .select("*")
      .order("plano_ativo", { ascending: true })
      .order("atualizado_em", { ascending: false });

    if (error) {
      console.warn("Falha ao carregar plano de manutenção:", error.message);
      setRows([]);
      setLoading(false);
      return;
    }

    setRows((data ?? []) as PlanoManutencaoEquipamento[]);
    setLoading(false);
  };

  const plantas = useMemo(
    () => Array.from(new Set(rows.map((row) => row.planta).filter(Boolean))).sort(),
    [rows],
  );

  const tipos = useMemo(
    () => Array.from(new Set(rows.map((row) => row.tipo_equipamento).filter(Boolean))).sort(),
    [rows],
  );

  const nomeElevatorias = useMemo(
    () => Array.from(new Set(rows.map((row) => row.nome_elevatoria).filter(Boolean))).sort(),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch =
        !term ||
        [row.nome_elevatoria, row.planta, row.tag_equipamento, row.tipo_equipamento]
          .join(" ")
          .toLowerCase()
          .includes(term);
      const matchesPlano =
        filtroPlano === "todos" ||
        (filtroPlano === "sim" && row.plano_ativo) ||
        (filtroPlano === "nao" && !row.plano_ativo);
      const matchesMovimento =
        filtroMovimentado === "todos" ||
        (filtroMovimentado === "sim" && row.movimentado_corretamente) ||
        (filtroMovimentado === "nao" && !row.movimentado_corretamente);
      const matchesPlanta = filtroPlanta === "todos" || row.planta === filtroPlanta;
      const matchesTipo = filtroTipo === "todos" || row.tipo_equipamento === filtroTipo;
      const matchesNome =
        filtroNomeElevatoria === "todos" || row.nome_elevatoria === filtroNomeElevatoria;

      return (
        matchesSearch &&
        matchesPlano &&
        matchesMovimento &&
        matchesPlanta &&
        matchesTipo &&
        matchesNome
      );
    });
  }, [
    rows,
    search,
    filtroPlano,
    filtroMovimentado,
    filtroPlanta,
    filtroTipo,
    filtroNomeElevatoria,
  ]);

  const summary = useMemo(() => {
    const total = rows.length;
    const semPlano = rows.filter((row) => !row.plano_ativo).length;
    const comPlano = rows.filter((row) => row.plano_ativo).length;
    const movimentacaoPendente = rows.filter((row) => !row.movimentado_corretamente).length;
    const elevatoriasSemCobertura = new Set(
      rows.filter((row) => !row.plano_ativo).map((row) => row.nome_elevatoria),
    ).size;

    return { total, semPlano, comPlano, movimentacaoPendente, elevatoriasSemCobertura };
  }, [rows]);

  const openNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setFormOpen(true);
  };

  const openModel = (model: PlanoManutencaoModelo) => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      tipo_equipamento: model.tipo_equipamento,
      plano_ativo: Boolean(model.plano_ativo_padrao),
      movimentado_corretamente: Boolean(model.movimentado_corretamente_padrao),
      observacao: model.observacao_padrao ?? "",
    });
    setModelsOpen(false);
    setFormOpen(true);
  };

  const openEdit = (row: PlanoManutencaoEquipamento) => {
    setEditingId(row.id ?? null);
    setForm({
      elevatoria_id: row.elevatoria_id ?? null,
      nome_elevatoria: row.nome_elevatoria,
      planta: row.planta,
      tag_equipamento: row.tag_equipamento,
      tipo_equipamento: row.tipo_equipamento,
      plano_ativo: row.plano_ativo,
      movimentado_corretamente: row.movimentado_corretamente,
      observacao: row.observacao ?? "",
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (
      !form.nome_elevatoria.trim() ||
      !form.planta.trim() ||
      !form.tag_equipamento.trim() ||
      !form.tipo_equipamento.trim()
    ) {
      toastError("Preencha nome da elevatória, planta, TAG e tipo do equipamento.");
      return;
    }

    setSaving(true);
    const payload = {
      elevatoria_id: form.elevatoria_id ?? null,
      nome_elevatoria: form.nome_elevatoria.trim(),
      planta: form.planta.trim(),
      tag_equipamento: form.tag_equipamento.trim(),
      tipo_equipamento: form.tipo_equipamento.trim(),
      plano_ativo: form.plano_ativo,
      movimentado_corretamente: form.movimentado_corretamente,
      observacao: form.observacao.trim() || null,
      atualizado_por: user?.id ?? null,
      ...(editingId ? {} : { criado_por: user?.id ?? null }),
    };

    const query = editingId
      ? supabase.from("plano_manutencao_equipamentos").update(payload).eq("id", editingId)
      : supabase.from("plano_manutencao_equipamentos").insert(payload);

    const { error } = await query;
    setSaving(false);

    if (error) {
      console.error(error);
      toastError("Não foi possível salvar o equipamento. " + (error.message ?? ""));
      return;
    }

    setFormOpen(false);
    setEditingId(null);
    setForm({ ...emptyForm });
    await loadRows();
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    const confirmed = window.confirm("Deseja excluir este equipamento do plano de manutenção?");
    if (!confirmed) return;

    const { error } = await supabase.from("plano_manutencao_equipamentos").delete().eq("id", id);
    if (error) {
      console.error(error);
      toastError("Não foi possível excluir o equipamento.");
      return;
    }

    await loadRows();
  };

  const handleDuplicateFromElevatoria = (row: PlanoManutencaoEquipamento) => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      elevatoria_id: row.elevatoria_id ?? null,
      nome_elevatoria: row.nome_elevatoria,
      planta: row.planta,
      plano_ativo: false,
      movimentado_corretamente: false,
    });
    setFormOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-[#0b3a73] dark:text-cyan-300">
                <Building2 className="h-7 w-7" />
                <h1 className="text-2xl font-bold md:text-3xl">Plano de Manutenção</h1>
              </div>
              <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                Controle de equipamentos das elevatórias e cobertura de planos preventivos.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={openNew} className="bg-[#0b3a73] text-white hover:bg-[#0c4f9d]">
                <Plus className="h-4 w-4" /> Novo equipamento
              </Button>
              <Button variant="outline" onClick={() => setModelsOpen(true)}>
                <Wrench className="h-4 w-4" /> Adicionar por modelo
              </Button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Total de equipamentos" value={summary.total} accent="blue" />
          <StatCard label="Sem plano ativo" value={summary.semPlano} accent="red" />
          <StatCard label="Com plano ativo" value={summary.comPlano} accent="green" />
          <StatCard
            label="Movimentação pendente"
            value={summary.movimentacaoPendente}
            accent="amber"
          />
          <StatCard
            label="Elevatórias sem cobertura"
            value={summary.elevatoriasSemCobertura}
            accent="orange"
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar elevatória, planta, TAG ou tipo..."
                className="pl-9"
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              <select
                value={filtroPlano}
                onChange={(e) => setFiltroPlano(e.target.value as typeof filtroPlano)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="todos">Plano ativo: Todos</option>
                <option value="sim">Plano ativo: Sim</option>
                <option value="nao">Plano ativo: Não</option>
              </select>

              <select
                value={filtroMovimentado}
                onChange={(e) => setFiltroMovimentado(e.target.value as typeof filtroMovimentado)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="todos">Movimentado: Todos</option>
                <option value="sim">Movimentado: Sim</option>
                <option value="nao">Movimentado: Não</option>
              </select>

              <select
                value={filtroPlanta}
                onChange={(e) => setFiltroPlanta(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="todos">Todas as plantas</option>
                {plantas.map((planta) => (
                  <option key={planta} value={planta}>
                    {planta}
                  </option>
                ))}
              </select>

              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="todos">Todos os tipos</option>
                {tipos.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>

              <select
                value={filtroNomeElevatoria}
                onChange={(e) => setFiltroNomeElevatoria(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="todos">Todas as elevatórias</option>
                {nomeElevatorias.map((nome) => (
                  <option key={nome} value={nome}>
                    {nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900 md:p-4">
          {loading ? (
            <div className="flex min-h-[220px] items-center justify-center gap-2 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" /> Carregando registros...
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="flex min-h-[220px] items-center justify-center text-slate-500">
              Nenhum equipamento encontrado com os filtros atuais.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2 text-sm">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400">
                    <th className="px-3 py-2 font-medium">Elevatória</th>
                    <th className="px-3 py-2 font-medium">Planta</th>
                    <th className="px-3 py-2 font-medium">TAG</th>
                    <th className="px-3 py-2 font-medium">Tipo</th>
                    <th className="px-3 py-2 font-medium">Plano ativo</th>
                    <th className="px-3 py-2 font-medium">Movimentado</th>
                    <th className="px-3 py-2 font-medium">Atualizado em</th>
                    <th className="px-3 py-2 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr
                      key={row.id ?? row.tag_equipamento}
                      className={
                        !row.plano_ativo
                          ? "rounded-xl border-l-4 border-l-orange-500 bg-orange-50/70 dark:bg-slate-800/80"
                          : "bg-slate-50 dark:bg-slate-800/50"
                      }
                    >
                      <td className="px-3 py-3 align-middle">
                        <div className="font-medium">{row.nome_elevatoria}</div>
                        {!row.plano_ativo && !row.movimentado_corretamente && (
                          <Badge variant="destructive" className="mt-1">
                            Crítico
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-3 align-middle">{row.planta}</td>
                      <td className="px-3 py-3 align-middle font-mono text-xs">
                        {row.tag_equipamento}
                      </td>
                      <td className="px-3 py-3 align-middle">{row.tipo_equipamento}</td>
                      <td className="px-3 py-3 align-middle">
                        {row.plano_ativo ? (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200">
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Plano ativo
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <AlertTriangle className="mr-1 h-3 w-3" /> Sem plano
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-3 align-middle">
                        {row.movimentado_corretamente ? (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200">
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Corretamente
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200">
                            <ShieldAlert className="mr-1 h-3 w-3" /> Pendente
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-3 align-middle text-slate-500">
                        {row.atualizado_em ? formatDate(row.atualizado_em) : "—"}
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicateFromElevatoria(row)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(row.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar equipamento" : "Novo equipamento"}</DialogTitle>
            <DialogDescription>
              Cadastre equipamentos vinculados à elevatória e acompanhe o status do plano.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="elevatoria">Nome da elevatória</Label>
              <input
                id="elevatoria"
                list="elevatoria-options"
                value={form.nome_elevatoria}
                onChange={(e) => {
                  const value = e.target.value;
                  const selected = elevatorias.find((el) => el.nome === value);
                  setForm((prev) => ({
                    ...prev,
                    nome_elevatoria: value,
                    elevatoria_id: selected?.id ?? prev.elevatoria_id ?? null,
                    planta: selected?.planta ?? prev.planta,
                  }));
                }}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
                placeholder="Ex.: EEB-012"
              />
              <datalist id="elevatoria-options">
                {elevatorias.map((elev) => (
                  <option key={elev.id} value={elev.nome} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2">
              <Label htmlFor="planta">Planta</Label>
              <Input
                id="planta"
                value={form.planta}
                onChange={(e) => setForm((prev) => ({ ...prev, planta: e.target.value }))}
                placeholder="Ex.: ETA Pavuna"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tag">TAG do equipamento</Label>
              <Input
                id="tag"
                value={form.tag_equipamento}
                onChange={(e) => setForm((prev) => ({ ...prev, tag_equipamento: e.target.value }))}
                placeholder="Ex.: INV-EEB012-01"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="tipo">Tipo do equipamento</Label>
              <Input
                id="tipo"
                value={form.tipo_equipamento}
                onChange={(e) => setForm((prev) => ({ ...prev, tipo_equipamento: e.target.value }))}
                placeholder="Ex.: Inversor, Bomba, Motor..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plano">Plano ativo</Label>
              <select
                id="plano"
                value={form.plano_ativo ? "sim" : "nao"}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, plano_ativo: e.target.value === "sim" }))
                }
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mov">Movimentado corretamente</Label>
              <select
                id="mov"
                value={form.movimentado_corretamente ? "sim" : "nao"}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    movimentado_corretamente: e.target.value === "sim",
                  }))
                }
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="observacao">Observações</Label>
              <Textarea
                id="observacao"
                value={form.observacao}
                onChange={(e) => setForm((prev) => ({ ...prev, observacao: e.target.value }))}
                placeholder="Informações técnicas, motivo, pendência ou observação geral."
                rows={4}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-[#0b3a73] text-white hover:bg-[#0c4f9d]"
            >
              {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Salvar equipamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modelsOpen} onOpenChange={setModelsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar por modelo</DialogTitle>
            <DialogDescription>
              Use modelos rápidos para preencher o cadastro do equipamento.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            {MODELOS_INICIAIS.map((model) => (
              <button
                key={model.nome}
                type="button"
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-[#1f7ad6] hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                onClick={() => openModel(model)}
              >
                <div>
                  <div className="font-semibold">{model.nome}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {model.tipo_equipamento}
                  </div>
                </div>
                <Plus className="h-4 w-4 text-slate-500" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "blue" | "red" | "green" | "amber" | "orange";
}) {
  const palette = {
    blue: "border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-200",
    red: "border-red-100 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200",
    green:
      "border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200",
    amber:
      "border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
    orange:
      "border-orange-100 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/50 dark:text-orange-200",
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${palette[accent]}`}>
      <div className="text-xs font-medium uppercase tracking-[0.08em] opacity-75">{label}</div>
      <div className="mt-3 text-3xl font-bold">{value}</div>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function toastError(message: string) {
  toast.error(message);
}
