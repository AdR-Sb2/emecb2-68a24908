import { useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  buscarOsExecutadas,
  carregarDesconsideradas,
  ehSda,
  marcarDesconsiderada,
  type OsExecutada,
} from "@/lib/analitico-os";

function mesAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function ultimoDia(mes: string) {
  const [a, m] = mes.split("-").map(Number);
  return String(new Date(a, m, 0).getDate()).padStart(2, "0");
}
function fmt(d: string | null) {
  if (!d) return "—";
  const [a, m, dd] = d.slice(0, 10).split("-");
  return `${dd}/${m}/${a}`;
}

export function VerificarOSDialog({
  open,
  onOpenChange,
  onAlterado,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAlterado: () => void;
}) {
  const [inicio, setInicio] = useState(mesAtual());
  const [fim, setFim] = useState(mesAtual());
  const [rows, setRows] = useState<OsExecutada[]>([]);
  const [desc, setDesc] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const [soDesc, setSoDesc] = useState(false);
  const [alterou, setAlterou] = useState(false);

  useEffect(() => {
    if (!open || !/^\d{4}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}$/.test(fim)) return;
    let vivo = true;
    setLoading(true);
    Promise.all([buscarOsExecutadas(`${inicio}-01`, `${fim}-${ultimoDia(fim)}`), carregarDesconsideradas()])
      .then(([r, d]) => {
        if (!vivo) return;
        r.sort((a, b) =>
          (a.data_modificacao || a.data_entrada || "").localeCompare(
            b.data_modificacao || b.data_entrada || "",
          ),
        );
        setRows(r);
        setDesc(d);
      })
      .catch((e) => toast.error("Erro ao buscar O.S.: " + (e?.message ?? "desconhecido")))
      .finally(() => vivo && setLoading(false));
    return () => {
      vivo = false;
    };
  }, [open, inicio, fim]);

  const filtradas = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return rows.filter((r) => {
      if (soDesc && !desc.has(r.ordem ?? "")) return false;
      if (!t) return true;
      return (
        (r.ordem ?? "").toLowerCase().includes(t) || (r.texto_breve ?? "").toLowerCase().includes(t)
      );
    });
  }, [rows, busca, soDesc, desc]);

  const consideradas = rows.filter((r) => !desc.has(r.ordem ?? "")).length;

  const alternar = async (ordem: string, valor: boolean) => {
    setDesc((p) => {
      const n = new Set(p);
      if (valor) n.add(ordem);
      else n.delete(ordem);
      return n;
    });
    setAlterou(true);
    try {
      await marcarDesconsiderada(ordem, valor);
    } catch {
      toast.error("Não foi possível salvar.");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && alterou) {
          onAlterado();
          setAlterou(false);
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Verificar O.S. executadas</DialogTitle>
          <DialogDescription>
            Todas as O.S. do período (incluindo notas de SDA). Marque "Desconsiderar" para tirar a
            O.S. do total e do Exportar O.S.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid gap-1">
            <label className="text-xs text-slate-500">De</label>
            <Input type="month" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </div>
          <div className="grid gap-1">
            <label className="text-xs text-slate-500">Até</label>
            <Input type="month" value={fim} onChange={(e) => setFim(e.target.value)} />
          </div>
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              className="pl-8"
              placeholder="Buscar nº da O.S. ou texto breve..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <Switch checked={soDesc} onCheckedChange={setSoDesc} /> Só desconsideradas
          </label>
        </div>
        <div className="flex gap-4 text-xs text-slate-600 dark:text-slate-300">
          <span>
            Total no período: <b>{rows.length}</b>
          </span>
          <span className="text-emerald-600">
            Consideradas: <b>{consideradas}</b>
          </span>
          <span className="text-red-600">
            Desconsideradas: <b>{rows.length - consideradas}</b>
          </span>
        </div>
        <div className="flex-1 overflow-auto rounded-md border border-slate-200 dark:border-slate-700">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#1f7ad6]" />
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800">
                <tr>
                  <th className="p-2">O.S.</th>
                  <th className="p-2">Tipo</th>
                  <th className="p-2">Texto breve</th>
                  <th className="p-2">Local</th>
                  <th className="p-2">Data</th>
                  <th className="p-2 text-center">Desconsiderar</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.slice(0, 1500).map((r) => {
                  const o = r.ordem ?? "";
                  const d = desc.has(o);
                  return (
                    <tr
                      key={r.id}
                      className={`border-t border-slate-100 dark:border-slate-700 ${d ? "bg-red-50 text-slate-400 line-through dark:bg-red-950/30" : ""}`}
                    >
                      <td className="p-2 font-mono">{o || "—"}</td>
                      <td className="p-2">{r.tipo_ordem ?? "—"}</td>
                      <td className="p-2">{r.texto_breve ?? "—"}</td>
                      <td className="p-2">
                        {ehSda(r) && !r.elevatoria_id && (
                          <span className="mr-1 rounded bg-amber-100 px-1 text-[10px] font-bold text-amber-700">
                            SDA
                          </span>
                        )}
                        {r.planta || r.local_instalacao || "—"}
                      </td>
                      <td className="p-2 whitespace-nowrap">
                        {fmt(r.data_modificacao || r.data_entrada)}
                      </td>
                      <td className="p-2 text-center">
                        <Switch
                          checked={d}
                          disabled={!o}
                          onCheckedChange={(v) => void alternar(o, v)}
                        />
                      </td>
                    </tr>
                  );
                })}
                {filtradas.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400">
                      Nenhuma O.S. encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        {filtradas.length > 1500 && (
          <p className="text-[11px] text-slate-500">
            Mostrando 1500 de {filtradas.length}. Use a busca para refinar.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
