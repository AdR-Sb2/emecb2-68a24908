import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Shield,
  ArrowLeft,
  Loader2,
  Check,
  X,
  Search,
  UserCheck,
  UserX,
  Trash2,
  Plus,
  Save,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { supabase, supabaseConfigSummary } from "../lib/supabase";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

type ProfileRow = {
  id: string;
  nome_completo: string;
  email: string;
  cargo_id: number | null;
  status: "pendente" | "ativo" | "bloqueado";
  criado_em: string | null;
  ultimo_acesso: string | null;
};

type CargoRow = {
  id: number;
  nome: string;
  descricao: string;
};

type PainelRow = {
  id: number;
  chave: string;
  nome_exibicao: string;
  descricao: string;
  icone: string;
};

type Tab = "usuarios" | "cargos" | "paineis";

function AdminPage() {
  const navigate = useNavigate();
  const { user, profile, loading, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("usuarios");
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [cargos, setCargos] = useState<CargoRow[]>([]);
  const [paineis, setPaineis] = useState<PainelRow[]>([]);
  const [cargoPaineis, setCargoPaineis] = useState<Record<number, number[]>>({});
  const [loadingData, setLoadingData] = useState(true);

  // Filtros
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("TODOS");
  const [filterCargo, setFilterCargo] = useState<string>("TODOS");

  // Edição de cargos
  const [editingCargo, setEditingCargo] = useState<CargoRow | null>(null);
  const [newCargoNome, setNewCargoNome] = useState("");
  const [newCargoDesc, setNewCargoDesc] = useState("");
  const [newCargoPaineis, setNewCargoPaineis] = useState<number[]>([]);
  const [showNewCargo, setShowNewCargo] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!supabaseConfigSummary.isConfigured) {
      navigate({ to: "/login", replace: true });
      return;
    }
    if (!user) {
      navigate({ to: "/login", replace: true });
      return;
    }
    if (profile?.status !== "ativo") {
      navigate({ to: "/", replace: true });
      return;
    }
    checkAdminAccess();
  }, [user, profile, loading, navigate]);

  const checkAdminAccess = async () => {
    if (!supabaseConfigSummary.isConfigured || !profile?.cargo_id) {
      navigate({ to: "/", replace: true });
      return;
    }
    const { data } = await supabase
      .from("cargo_paineis")
      .select("painel_id, paineis!inner(chave)")
      .eq("cargo_id", profile.cargo_id)
      .eq("paineis.chave", "admin")
      .maybeSingle();
    if (!data) navigate({ to: "/", replace: true });
    else loadData();
  };

  const loadData = async () => {
    if (!supabaseConfigSummary.isConfigured) {
      setLoadingData(false);
      return;
    }
    setLoadingData(true);
    const [profilesRes, cargosRes, paineisRes, cpRes] = await Promise.all([
      supabase.from("profiles").select("*").order("criado_em", { ascending: false }),
      supabase.from("cargos").select("*").order("nome"),
      supabase.from("paineis").select("*").order("nome_exibicao"),
      supabase.from("cargo_paineis").select("*"),
    ]);
    if (profilesRes.data) setProfiles(profilesRes.data);
    if (cargosRes.data) setCargos(cargosRes.data);
    if (paineisRes.data) setPaineis(paineisRes.data);
    if (cpRes.data) {
      const map: Record<number, number[]> = {};
      for (const row of cpRes.data) {
        if (!map[row.cargo_id]) map[row.cargo_id] = [];
        map[row.cargo_id].push(row.painel_id);
      }
      setCargoPaineis(map);
    }
    setLoadingData(false);
  };

  if (loading) return null;

  // ---- Ações ----

  const approveUser = async (id: string, cargoId: number) => {
    const { error } = await supabase
      .from("profiles")
      .update({ status: "ativo", cargo_id: cargoId })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Usuário aprovado!");
      loadData();
    }
  };

  const toggleBlock = async (id: string, current: string) => {
    const newStatus = current === "bloqueado" ? "ativo" : "bloqueado";
    const { error } = await supabase.from("profiles").update({ status: newStatus }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(newStatus === "bloqueado" ? "Usuário bloqueado!" : "Usuário desbloqueado!");
      loadData();
    }
  };

  const updateCargo = async (id: string, cargoId: number | null) => {
    const { error } = await supabase.from("profiles").update({ cargo_id: cargoId }).eq("id", id);
    if (error) toast.error(error.message);
    else loadData();
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Tem certeza? Essa ação não pode ser desfeita.")) return;
    const { error } = await supabase.rpc("delete_user", { user_id: id });
    if (error) toast.error(error.message);
    else {
      toast.success("Usuário excluído!");
      loadData();
    }
  };

  const saveCargo = async () => {
    if (!newCargoNome.trim()) {
      toast.error("Nome do cargo é obrigatório.");
      return;
    }
    if (editingCargo) {
      const { error } = await supabase
        .from("cargos")
        .update({ nome: newCargoNome.trim(), descricao: newCargoDesc.trim() })
        .eq("id", editingCargo.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      await supabase.from("cargo_paineis").delete().eq("cargo_id", editingCargo.id);
      if (newCargoPaineis.length) {
        await supabase
          .from("cargo_paineis")
          .insert(newCargoPaineis.map((p) => ({ cargo_id: editingCargo.id, painel_id: p })));
      }
      toast.success("Cargo atualizado!");
    } else {
      const { data, error } = await supabase
        .from("cargos")
        .insert({ nome: newCargoNome.trim(), descricao: newCargoDesc.trim() })
        .select("id")
        .single();
      if (error || !data) {
        toast.error(error?.message || "Erro ao criar");
        return;
      }
      if (newCargoPaineis.length) {
        await supabase
          .from("cargo_paineis")
          .insert(newCargoPaineis.map((p) => ({ cargo_id: data.id, painel_id: p })));
      }
      toast.success("Cargo criado!");
    }
    setEditingCargo(null);
    setShowNewCargo(false);
    setNewCargoNome("");
    setNewCargoDesc("");
    setNewCargoPaineis([]);
    loadData();
  };

  const deleteCargo = async (cargo: CargoRow) => {
    const inUse = profiles.some((p) => p.cargo_id === cargo.id);
    if (inUse) {
      toast.error(
        "Este cargo está atribuído a um ou mais usuários. Reatribua-os antes de excluir.",
      );
      return;
    }
    if (!confirm(`Excluir cargo "${cargo.nome}"?`)) return;
    const { error } = await supabase.from("cargos").delete().eq("id", cargo.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Cargo excluído!");
      loadData();
    }
  };

  const togglePainelCargo = (painelId: number) => {
    setNewCargoPaineis((prev) =>
      prev.includes(painelId) ? prev.filter((p) => p !== painelId) : [...prev, painelId],
    );
  };

  const filteredProfiles = profiles.filter((p) => {
    if (filterStatus !== "TODOS" && p.status !== filterStatus) return false;
    if (filterCargo !== "TODOS" && p.cargo_id !== Number(filterCargo)) return false;
    if (
      search &&
      !p.nome_completo.toLowerCase().includes(search.toLowerCase()) &&
      !p.email.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0f172a] text-[#f8fafc]">
      <div className="mx-auto max-w-6xl p-4 md:p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-[#94a3b8] hover:text-[#f8fafc]">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Shield className="h-6 w-6 text-[#0ea5e9]" />
            <h1 className="text-xl font-bold">Painel Administrativo</h1>
          </div>
          <button
            onClick={signOut}
            className="text-sm text-[#94a3b8] hover:text-[#f8fafc] cursor-pointer bg-transparent border-none"
          >
            Sair
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-lg bg-[#1e293b] p-1">
          {(
            [
              { k: "usuarios", label: "Usuários" },
              { k: "cargos", label: "Cargos" },
              { k: "paineis", label: "Painéis" },
            ] as const
          ).map(({ k, label }) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition cursor-pointer ${
                tab === k ? "bg-[#0ea5e9] text-white" : "text-[#94a3b8] hover:text-[#f8fafc]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loadingData ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#0ea5e9]" />
          </div>
        ) : tab === "usuarios" ? (
          <>
            {/* Filtros */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou e-mail..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-[#334155] bg-[#1e293b] py-2 pl-10 pr-3 text-sm text-[#f8fafc] outline-none ring-[#0ea5e9] focus:ring-2"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-lg border border-[#334155] bg-[#1e293b] px-3 py-2 text-sm text-[#f8fafc] outline-none ring-[#0ea5e9] focus:ring-2"
              >
                <option value="TODOS">Todos status</option>
                <option value="pendente">Pendente</option>
                <option value="ativo">Ativo</option>
                <option value="bloqueado">Bloqueado</option>
              </select>
              <select
                value={filterCargo}
                onChange={(e) => setFilterCargo(e.target.value)}
                className="rounded-lg border border-[#334155] bg-[#1e293b] px-3 py-2 text-sm text-[#f8fafc] outline-none ring-[#0ea5e9] focus:ring-2"
              >
                <option value="TODOS">Todos cargos</option>
                {cargos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Tabela */}
            <div className="overflow-x-auto rounded-lg border border-[#334155]">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#1e293b] text-[#94a3b8]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Nome</th>
                    <th className="px-4 py-3 font-semibold">E-mail</th>
                    <th className="px-4 py-3 font-semibold">Cargo</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Cadastro</th>
                    <th className="px-4 py-3 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155]">
                  {filteredProfiles.map((p) => (
                    <tr key={p.id} className="hover:bg-[#1e293b]/50">
                      <td className="px-4 py-3">{p.nome_completo}</td>
                      <td className="px-4 py-3 text-[#94a3b8]">{p.email}</td>
                      <td className="px-4 py-3">
                        <select
                          value={p.cargo_id ?? ""}
                          onChange={(e) =>
                            updateCargo(p.id, e.target.value ? Number(e.target.value) : null)
                          }
                          className="rounded border border-[#334155] bg-[#0f172a] px-2 py-1 text-xs text-[#f8fafc] outline-none"
                        >
                          <option value="">Sem cargo</option>
                          {cargos.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nome}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            p.status === "ativo"
                              ? "bg-[#10b981]/20 text-[#10b981]"
                              : p.status === "pendente"
                                ? "bg-[#f59e0b]/20 text-[#f59e0b]"
                                : "bg-[#ef4444]/20 text-[#ef4444]"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#64748b]">
                        {p.criado_em ? new Date(p.criado_em).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {p.status === "pendente" && (
                            <button
                              onClick={() => {
                                const cid = p.cargo_id;
                                if (!cid) {
                                  toast.error("Selecione um cargo antes de aprovar.");
                                  return;
                                }
                                approveUser(p.id, cid);
                              }}
                              className="rounded bg-[#10b981]/20 px-2 py-1 text-xs font-medium text-[#10b981] hover:bg-[#10b981]/30 cursor-pointer"
                              title="Aprovar"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => toggleBlock(p.id, p.status)}
                            className={`rounded px-2 py-1 text-xs font-medium cursor-pointer ${
                              p.status === "bloqueado"
                                ? "bg-[#10b981]/20 text-[#10b981] hover:bg-[#10b981]/30"
                                : "bg-[#ef4444]/20 text-[#ef4444] hover:bg-[#ef4444]/30"
                            }`}
                            title={p.status === "bloqueado" ? "Desbloquear" : "Bloquear"}
                          >
                            {p.status === "bloqueado" ? (
                              <UserCheck className="h-3.5 w-3.5" />
                            ) : (
                              <UserX className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => deleteUser(p.id)}
                            className="rounded bg-red-500/10 px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-500/20 cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : tab === "cargos" ? (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Cargos</h2>
              <button
                onClick={() => {
                  setShowNewCargo(true);
                  setEditingCargo(null);
                  setNewCargoNome("");
                  setNewCargoDesc("");
                  setNewCargoPaineis([]);
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-[#0ea5e9] px-3 py-2 text-sm font-medium text-white hover:bg-[#0284c7] cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Novo cargo
              </button>
            </div>

            <div className="grid gap-3">
              {cargos.map((c) => (
                <div key={c.id} className="rounded-lg border border-[#334155] bg-[#1e293b] p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{c.nome}</h3>
                      <p className="text-sm text-[#94a3b8]">{c.descricao || "Sem descrição"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingCargo(c);
                          setNewCargoNome(c.nome);
                          setNewCargoDesc(c.descricao);
                          setNewCargoPaineis(cargoPaineis[c.id] || []);
                          setShowNewCargo(true);
                        }}
                        className="rounded bg-[#0ea5e9]/20 px-2 py-1 text-xs font-medium text-[#0ea5e9] hover:bg-[#0ea5e9]/30 cursor-pointer"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => deleteCargo(c)}
                        className="rounded bg-red-500/10 px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-500/20 cursor-pointer"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(cargoPaineis[c.id] || []).map((pid) => {
                      const painel = paineis.find((p) => p.id === pid);
                      return painel ? (
                        <span
                          key={pid}
                          className="rounded-full bg-[#0ea5e9]/10 px-2 py-0.5 text-[11px] text-[#0ea5e9]"
                        >
                          {painel.nome_exibicao}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Criar/Editar Cargo */}
            {(showNewCargo || editingCargo) && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                <div className="w-full max-w-lg rounded-xl bg-[#1e293b] p-6 shadow-2xl">
                  <h2 className="mb-4 text-lg font-bold">
                    {editingCargo ? "Editar cargo" : "Novo cargo"}
                  </h2>
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#94a3b8]">
                        Nome
                      </label>
                      <input
                        type="text"
                        value={newCargoNome}
                        onChange={(e) => setNewCargoNome(e.target.value)}
                        className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2 text-[#f8fafc] outline-none ring-[#0ea5e9] focus:ring-2 text-[14px]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#94a3b8]">
                        Descrição
                      </label>
                      <input
                        type="text"
                        value={newCargoDesc}
                        onChange={(e) => setNewCargoDesc(e.target.value)}
                        className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2 text-[#f8fafc] outline-none ring-[#0ea5e9] focus:ring-2 text-[14px]"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-[#94a3b8]">
                        Painéis liberados
                      </label>
                      <div className="grid gap-2">
                        {paineis.map((p) => (
                          <label
                            key={p.id}
                            className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2 hover:border-[#0ea5e9]"
                          >
                            <input
                              type="checkbox"
                              checked={newCargoPaineis.includes(p.id)}
                              onChange={() => togglePainelCargo(p.id)}
                              className="h-4 w-4 accent-[#0ea5e9]"
                            />
                            <span className="text-sm text-[#f8fafc]">{p.nome_exibicao}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setShowNewCargo(false);
                        setEditingCargo(null);
                      }}
                      className="rounded-lg border border-[#334155] px-4 py-2 text-sm font-medium text-[#94a3b8] hover:bg-[#334155] cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={saveCargo}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#0ea5e9] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0284c7] cursor-pointer"
                    >
                      <Save className="h-4 w-4" /> Salvar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Painéis tab */
          <>
            <h2 className="mb-4 text-lg font-bold">Painéis do Sistema</h2>
            <div className="grid gap-3">
              {paineis.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-[#334155] bg-[#1e293b] p-4"
                >
                  <div>
                    <h3 className="font-semibold">{p.nome_exibicao}</h3>
                    <p className="text-xs text-[#64748b]">
                      Chave: <code className="text-[#0ea5e9]">{p.chave}</code>
                    </p>
                    <p className="text-sm text-[#94a3b8]">{p.descricao}</p>
                  </div>
                  <span className="rounded-full bg-[#0ea5e9]/10 px-2 py-0.5 text-[11px] text-[#0ea5e9]">
                    {p.icone}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
