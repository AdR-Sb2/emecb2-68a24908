import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Upload,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  CalendarDays,
  ClipboardList,
  CheckCircle2,
  PauseCircle,
  XCircle,
  AlertTriangle,
  MapPin,
  Filter,
  Save,
  BarChart3,
  Loader2,
  Plus,
  Trash2,
  Users,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { NavVoltarHome } from "@/components/nav-voltar-home";

const ProdutividadeMap = lazy(() => import("@/components/produtividade-map"));

export const Route = createFileRoute("/produtividade")({
  component: ProdutividadePage,
});

// ─── Types ────────────────────────────────────────────────────

type FieldDia = {
  id: number;
  data: string;
  criado_em: string;
  observacao_geral: string;
};

type FieldEquipe = {
  id: number;
  dia_id: number;
  nome_equipe: string;
  tecnicos: number[];
};

type FieldAtividade = {
  id: number;
  dia_id: number;
  id_recurso: number;
  id_atividade: number;
  ordem_manutencao: number;
  status: string;
  tipo_atividade: string;
  prioridade: string;
  area_trabalho: string;
  texto_breve: string;
  centro_trabalho: string;
  criticidade: string;
  parada: boolean;
  inicio: string | null;
  fim: string | null;
  motivo_paralisacao: string;
  planta: string;
  cidade: string;
};

type FieldJustificativa = {
  id: number;
  dia_id: number;
  equipe_id: number;
  tipo: string;
  id_atividade: number | null;
  texto: string;
};

type PlantaCoord = {
  planta: string;
  nome: string;
  lat: number;
  lon: number;
};

type FieldRecurso = {
  id: number;
  id_recurso: number;
  nome: string;
};

// ─── Constants ────────────────────────────────────────────────

const ATIVIDADES_ADMINISTRATIVAS = [
  "DDS",
  "ALMOÇO",
  "ALMOCO",
  "RETORNO PARA BASE",
  "MONTAR EQUIPE",
  "SEPARAR MATERIAL / FERRAMENTA",
  "SEPARAR MATERIAL / FERRAMENTAS",
  "FEEDBACK",
  "PROBLEMAS COM VEÍCULO",
  "PROBLEMAS COM VEICULO",
];

const STATUS_COLORS: Record<string, string> = {
  concluído: "#22c55e",
  concluido: "#22c55e",
  suspenso: "#eab308",
  cancelado: "#ef4444",
};

const EQUIPE_COLORS = [
  { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", hex: "#3b82f6" },
  { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", hex: "#10b981" },
  { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", hex: "#8b5cf6" },
  { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", hex: "#f59e0b" },
  { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", hex: "#f43f5e" },
  { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200", hex: "#06b6d4" },
  { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", hex: "#f97316" },
  { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200", hex: "#14b8a6" },
];

const TIPO_SERVICO_MAP: Record<string, string> = {
  "MANUTENÇÃO PREVENTIVA POR FREQUÊNCIA": "Preventiva por Frequência",
  "MANUTENÇÃO PREVENTIVA POR CONDIÇÃO": "Preventiva por Condição",
  "MANUTENÇÃO CORRETIVA EMERGENCIAL": "Corretiva Emergencial",
  "ENGENHARIA DE MANUTENÇÃO": "Engenharia de Manutenção",
  SERVIÇOS: "Serviços",
};

const TIPO_SERVICO_KEYS = Object.keys(TIPO_SERVICO_MAP);

const TIPO_SERVICO_COLORS = ["#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6"];

function getEquipeColor(idx: number) {
  return EQUIPE_COLORS[idx % EQUIPE_COLORS.length];
}

function normalizeStatus(s: string): string {
  const lower = (s || "").toLowerCase().trim();
  if (lower === "concluído" || lower === "concluido") return "concluido";
  if (lower === "suspenso" || lower === "pendente") return "suspenso";
  if (lower === "cancelado") return "cancelado";
  return lower;
}

function isAtividadeAdministrativa(tipo: string | null | undefined): boolean {
  if (!tipo) return false;
  return ATIVIDADES_ADMINISTRATIVAS.includes(tipo.toUpperCase().trim());
}

function formatTime(h: string | null | undefined): string {
  if (!h) return "—";
  return h.slice(0, 5);
}

function diffMinutes(inicio: string | null, fim: string | null): number {
  if (!inicio || !fim) return 0;
  const [h1, m1] = inicio.split(":").map(Number);
  const [h2, m2] = fim.split(":").map(Number);
  return Math.max(0, h2 * 60 + m2 - (h1 * 60 + m1));
}

// ─── CSV Parsing ──────────────────────────────────────────────

function parseCsvData(rows: Record<string, unknown>[]): {
  atividades: Omit<FieldAtividade, "id" | "dia_id">[];
  recursos: Set<number>;
  data: string | null;
} {
  const recursos = new Set<number>();
  const atividades: Omit<FieldAtividade, "id" | "dia_id">[] = [];
  let dataDia: string | null = null;

  for (const row of rows) {
    const get = (key: string) =>
      (row[key] ?? row[key.toLowerCase()] ?? row[key.toUpperCase()] ?? "") as string;

    const idRecurso = parseInt(
      String(get("ID do Recurso") || get("Id do Recurso") || get("id_recurso") || "0"),
      10,
    );
    if (idRecurso) recursos.add(idRecurso);

    const rawDate = get("Data") || get("data");
    if (rawDate && !dataDia) {
      const parsed = parseFieldDate(rawDate);
      if (parsed) dataDia = parsed;
    }

    const tipoAtividade = get("Tipo de Atividade") || get("Tipo de atividade") || "";
    const paradaRaw = get("PARADA") || get("Parada") || "";
    const parada = paradaRaw === "X" || paradaRaw.toLowerCase() === "true" || paradaRaw === "1";

    atividades.push({
      id_recurso: idRecurso,
      id_atividade: parseInt(
        String(get("ID da Atividade") || get("Id da Atividade") || get("id_atividade") || "0"),
        10,
      ),
      ordem_manutencao: parseInt(
        String(
          get("Ordem de Manutenção") ||
            get("Ordem de manutenção") ||
            get("ordem_manutencao") ||
            "0",
        ),
        10,
      ),
      status: get("Status da Atividade") || get("Status") || "",
      tipo_atividade: tipoAtividade,
      prioridade: get("Prioridade") || "",
      area_trabalho: get("Área de Trabalho") || get("Area de Trabalho") || "",
      texto_breve: get("TEXTO BREVE") || get("Texto Breve") || "",
      centro_trabalho: get("Centro de Trabalho") || get("Centro de trabalho") || "",
      criticidade: get("Criticidade") || "",
      parada,
      inicio: normalizeTime(get("INÍCIO") || get("Inicio") || get("início") || ""),
      fim: normalizeTime(get("FIM") || get("Fim") || ""),
      motivo_paralisacao: get("Motivo da Paralisação") || get("Motivo da paralisação") || "",
      planta: get("PLANTA") || get("Planta") || "",
      cidade: get("Cidade") || get("CIDADE") || "",
    });
  }

  return { atividades, recursos, data: dataDia };
}

function parseFieldDate(raw: string): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  const parts = raw.split(/[/-]/);
  if (parts.length === 3) {
    const [a, b, c] = parts.map(Number);
    if (a > 1900) return `${a}-${String(b).padStart(2, "0")}-${String(c).padStart(2, "0")}`;
    if (c > 1900) return `${c}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`;
  }
  return null;
}

function normalizeTime(raw: string): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(t)) return t.slice(0, 5);
  return null;
}

// ─── Summary Cards ────────────────────────────────────────────

function SummaryCards({ atividades }: { atividades: FieldAtividade[] }) {
  const total = atividades.filter((a) => !isAtividadeAdministrativa(a.tipo_atividade)).length;
  const executadas = atividades.filter((a) => normalizeStatus(a.status) === "concluido").length;
  const suspensas = atividades.filter((a) => normalizeStatus(a.status) === "suspenso").length;
  const canceladas = atividades.filter((a) => normalizeStatus(a.status) === "cancelado").length;
  const paradas = atividades.filter((a) => a.parada).length;

  const cards = [
    { label: "Total O.S.", value: total, icon: ClipboardList, color: "text-[#0b3a73]" },
    { label: "Executadas", value: executadas, icon: CheckCircle2, color: "text-emerald-600" },
    { label: "Suspensas", value: suspensas, icon: PauseCircle, color: "text-amber-600" },
    { label: "Canceladas", value: canceladas, icon: XCircle, color: "text-red-600" },
    { label: "Equip. Parado", value: paradas, icon: AlertTriangle, color: "text-orange-600" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c) => (
        <Card key={c.label} className="shadow-sm">
          <CardContent className="flex items-center gap-3 p-3">
            <c.icon className={`h-8 w-8 shrink-0 ${c.color}`} />
            <div>
              <div className="text-2xl font-bold">{c.value}</div>
              <div className="text-[11px] text-slate-500">{c.label}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Tipo de Serviço Chart ────────────────────────────────────

function TipoServicoChart({ atividades }: { atividades: FieldAtividade[] }) {
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const k of TIPO_SERVICO_KEYS) map[k] = 0;
    for (const a of atividades) {
      const norm = (a.tipo_atividade || "").toUpperCase().trim();
      if (map[norm] !== undefined) map[norm]++;
    }
    return TIPO_SERVICO_KEYS.map((k, i) => ({
      name: TIPO_SERVICO_MAP[k],
      value: map[k],
      color: TIPO_SERVICO_COLORS[i],
    }));
  }, [atividades]);

  const maxVal = Math.max(...counts.map((c) => c.value), 1);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <BarChart3 className="h-4 w-4 text-[#0b3a73]" /> Distribuição por Tipo de Serviço
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(180, counts.length * 40)}>
          <BarChart data={counts} layout="vertical" margin={{ left: 10, right: 30 }}>
            <XAxis type="number" domain={[0, maxVal]} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} />
            <RechartsTooltip />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {counts.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Equipe Section ───────────────────────────────────────────

function EquipeSection({
  equipe,
  atividades,
  equipeIdx,
  justificativas,
  onSalvar,
  recursosMap,
}: {
  equipe: FieldEquipe;
  atividades: FieldAtividade[];
  equipeIdx: number;
  justificativas: FieldJustificativa[];
  onSalvar: (equipeId: number, tipo: string, idAtividade: number | null, texto: string) => void;
  recursosMap: Map<number, string>;
}) {
  const [expanded, setExpanded] = useState(false);
  const color = getEquipeColor(equipeIdx);

  const equipeAtividades = useMemo(() => {
    const techSet = new Set(equipe.tecnicos);
    return atividades.filter((a) => techSet.has(a.id_recurso));
  }, [atividades, equipe.tecnicos]);

  const stats = useMemo(() => {
    const exec = equipeAtividades.filter((a) => normalizeStatus(a.status) === "concluido").length;
    const susp = equipeAtividades.filter((a) => normalizeStatus(a.status) === "suspenso").length;
    const canc = equipeAtividades.filter((a) => normalizeStatus(a.status) === "cancelado").length;
    const tipos: Record<string, number> = {};
    for (const a of equipeAtividades) {
      const norm = (a.tipo_atividade || "").toUpperCase().trim();
      const label = TIPO_SERVICO_MAP[norm] || norm || "Outro";
      tipos[label] = (tipos[label] || 0) + 1;
    }
    const areas = new Set(equipeAtividades.map((a) => a.area_trabalho).filter(Boolean));
    let almocoMin = 0;
    for (const a of equipeAtividades) {
      if (
        isAtividadeAdministrativa(a.tipo_atividade) &&
        (a.tipo_atividade || "").toUpperCase().includes("ALMOÇO")
      ) {
        almocoMin += diffMinutes(a.inicio, a.fim);
      }
    }
    return { exec, susp, canc, tipos, areas: [...areas], almocoMin };
  }, [equipeAtividades]);

  const suspensas = equipeAtividades.filter((a) => normalizeStatus(a.status) === "suspenso");
  const canceladas = equipeAtividades.filter((a) => normalizeStatus(a.status) === "cancelado");

  const getJustText = (tipo: string, idAtividade: number | null) =>
    justificativas.find(
      (j) => j.equipe_id === equipe.id && j.tipo === tipo && j.id_atividade === idAtividade,
    )?.texto || "";

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        <Badge className={`${color.bg} ${color.text} ${color.border} border`}>
          {equipe.nome_equipe}
        </Badge>
        <span className="text-xs text-slate-500">
          {equipe.tecnicos.length} técnico(s) · {stats.exec} exec · {stats.susp} susp · {stats.canc}{" "}
          canc
        </span>
      </button>
      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-700 p-3 space-y-3">
          <div className="text-xs text-slate-600 dark:text-slate-400">
            <strong>Técnicos:</strong>{" "}
            {equipe.tecnicos.map((t) => recursosMap.get(t) || String(t)).join(", ")}
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">Áreas: {stats.areas.join(", ") || "—"}</Badge>
            <Badge variant="outline">Almoço: {stats.almocoMin} min</Badge>
          </div>
          {Object.keys(stats.tipos).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {Object.entries(stats.tipos).map(([k, v]) => (
                <Badge key={k} variant="secondary" className="text-[10px]">
                  {k}: {v}
                </Badge>
              ))}
            </div>
          )}

          {/* Justificativas */}
          {suspensas.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-semibold text-amber-700">OS Suspensas</div>
              {suspensas.map((a) => (
                <div key={a.id} className="flex items-center gap-2">
                  <span className="w-28 shrink-0 font-mono text-[11px] text-slate-600">
                    {a.ordem_manutencao}
                  </span>
                  <Input
                    defaultValue={getJustText("suspensa", a.id)}
                    onBlur={(e) => onSalvar(equipe.id, "suspensa", a.id, e.target.value)}
                    placeholder="Justificativa..."
                    className="h-7 text-[11px]"
                  />
                </div>
              ))}
            </div>
          )}
          {canceladas.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-semibold text-red-700">OS Canceladas</div>
              {canceladas.map((a) => (
                <div key={a.id} className="flex items-center gap-2">
                  <span className="w-28 shrink-0 font-mono text-[11px] text-slate-600">
                    {a.ordem_manutencao}
                  </span>
                  <Input
                    defaultValue={getJustText("cancelada", a.id)}
                    onBlur={(e) => onSalvar(equipe.id, "cancelada", a.id, e.target.value)}
                    placeholder="Justificativa..."
                    className="h-7 text-[11px]"
                  />
                </div>
              ))}
            </div>
          )}
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-600">Observação Geral</div>
            <Textarea
              defaultValue={getJustText("observacao", null)}
              onBlur={(e) => onSalvar(equipe.id, "observacao", null, e.target.value)}
              placeholder="Observação sobre a equipe no dia..."
              className="text-[11px]"
              rows={2}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Upload Modal ─────────────────────────────────────────────

function UploadModal({
  open,
  onClose,
  onSaved,
  existingDates,
  recursosMap,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  existingDates: Set<string>;
  recursosMap: Map<number, string>;
}) {
  const [step, setStep] = useState<"upload" | "equipes">("upload");
  const [isSaving, setIsSaving] = useState(false);
  const [atividades, setAtividades] = useState<Omit<FieldAtividade, "id" | "dia_id">[]>([]);
  const [recursos, setRecursos] = useState<number[]>([]);
  const [dataDia, setDataDia] = useState<string | null>(null);
  const [equipes, setEquipes] = useState<{ nome: string; tecnicos: number[] }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setError(null);

      try {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

        if (rows.length === 0) {
          setError("Arquivo vazio ou formato inválido.");
          return;
        }

        const parsed = parseCsvData(rows);
        if (!parsed.data) {
          setError("Não foi possível detectar a data no arquivo.");
          return;
        }
        if (existingDates.has(parsed.data)) {
          setError(`Data ${parsed.data} já foi importada.`);
          return;
        }

        setAtividades(parsed.atividades);
        setRecursos([...parsed.recursos].sort((a, b) => a - b));
        setDataDia(parsed.data);
        setEquipes([{ nome: "Equipe 1", tecnicos: [] }]);
        setStep("equipes");
      } catch {
        setError("Erro ao processar o arquivo. Verifique o formato.");
      }
    },
    [existingDates],
  );

  const moveTecnico = (recurso: number, fromIdx: number | -1, toIdx: number) => {
    setEquipes((prev) => {
      const next = prev.map((e) => ({ ...e, tecnicos: [...e.tecnicos] }));
      if (fromIdx >= 0) {
        next[fromIdx].tecnicos = next[fromIdx].tecnicos.filter((t) => t !== recurso);
      }
      next[toIdx].tecnicos.push(recurso);
      next[toIdx].tecnicos.sort((a, b) => a - b);
      return next;
    });
  };

  const removeTecnico = (recurso: number, fromIdx: number) => {
    setEquipes((prev) => {
      const next = prev.map((e) => ({ ...e, tecnicos: [...e.tecnicos] }));
      next[fromIdx].tecnicos = next[fromIdx].tecnicos.filter((t) => t !== recurso);
      return next;
    });
  };

  const assigned = new Set(equipes.flatMap((e) => e.tecnicos));
  const unassigned = recursos.filter((r) => !assigned.has(r));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: diaData, error: diaErr } = await supabase
        .from("field_dias")
        .insert({ data: dataDia })
        .select()
        .single();
      if (diaErr || !diaData) throw new Error(diaErr?.message || "Erro ao salvar dia");

      const equipeRows = equipes.map((e) => ({
        dia_id: diaData.id,
        nome_equipe: e.nome,
        tecnicos: e.tecnicos,
      }));
      const { error: eqErr } = await supabase.from("field_equipes").insert(equipeRows);
      if (eqErr) throw new Error(eqErr.message);

      const ativRows = atividades.map((a) => ({ ...a, dia_id: diaData.id }));
      const CHUNK = 500;
      for (let i = 0; i < ativRows.length; i += CHUNK) {
        const { error } = await supabase
          .from("field_atividades")
          .insert(ativRows.slice(i, i + CHUNK));
        if (error) throw new Error(error.message);
      }

      // Registrar IDs de recurso novos com o próprio ID como nome provisório
      for (const r of recursos) {
        if (!recursosMap.has(r)) {
          await supabase
            .from("field_recursos")
            .upsert({ id_recurso: r, nome: String(r) }, { onConflict: "id_recurso" });
        }
      }

      toast.success("Dia salvo com sucesso!");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(String(err));
      setIsSaving(false);
    }
  };

  const reset = () => {
    setStep("upload");
    setIsSaving(false);
    setAtividades([]);
    setRecursos([]);
    setDataDia(null);
    setEquipes([]);
    setError(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Dia</DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Selecione o arquivo CSV exportado do FIELD.</p>
            <Input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} />
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        )}

        {step === "equipes" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Data: {dataDia}</div>
                <div className="text-xs text-slate-500">
                  {atividades.length} atividades, {recursos.length} técnicos
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setEquipes((p) => [...p, { nome: `Equipe ${p.length + 1}`, tecnicos: [] }])
                }
              >
                <Plus className="h-3 w-3 mr-1" /> Nova Equipe
              </Button>
            </div>

            {/* Unassigned */}
            {unassigned.length > 0 && (
              <div className="rounded-lg border border-dashed border-slate-300 p-3">
                <div className="mb-2 text-xs font-semibold text-slate-500">
                  Sem equipe ({unassigned.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {unassigned.map((r) => (
                    <div key={r} className="flex items-center gap-1">
                      <Badge variant="outline" className="text-[10px]">
                        {recursosMap.get(r) || r}
                      </Badge>
                      <select
                        className="rounded border border-slate-200 px-1 py-0.5 text-[10px]"
                        value=""
                        onChange={(e) => {
                          if (e.target.value === "") return;
                          const idx = parseInt(e.target.value, 10);
                          moveTecnico(r, -1, idx);
                        }}
                      >
                        <option value="">Mover para...</option>
                        {equipes.map((eq, i) => (
                          <option key={i} value={i}>
                            {eq.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Teams */}
            <div className="space-y-3">
              {equipes.map((eq, eqIdx) => (
                <div
                  key={eqIdx}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 p-3"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Input
                      value={eq.nome}
                      onChange={(e) => {
                        const next = [...equipes];
                        next[eqIdx] = { ...next[eqIdx], nome: e.target.value };
                        setEquipes(next);
                      }}
                      className="h-7 w-40 text-xs font-semibold"
                    />
                    <span className="text-[10px] text-slate-400">{eq.tecnicos.length} téc.</span>
                    {equipes.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-500"
                        onClick={() => setEquipes((p) => p.filter((_, i) => i !== eqIdx))}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {eq.tecnicos.map((r) => (
                      <div key={r} className="flex items-center gap-1">
                        <Badge
                          className={`${getEquipeColor(eqIdx).bg} ${getEquipeColor(eqIdx).text} text-[10px]`}
                        >
                          {recursosMap.get(r) || r}
                        </Badge>
                        <select
                          className="rounded border border-slate-200 px-1 py-0.5 text-[10px]"
                          value={eqIdx}
                          onChange={(e) => moveTecnico(r, eqIdx, parseInt(e.target.value, 10))}
                        >
                          {equipes.map((e2, i) => (
                            <option key={i} value={i}>
                              {e2.nome}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => removeTecnico(r, eqIdx)}
                          className="text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))}
                    {eq.tecnicos.length === 0 && (
                      <span className="text-[10px] text-slate-400 italic">
                        Arraste técnicos para esta equipe
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep("upload")}>
                Voltar
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Salvar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Day Detail ───────────────────────────────────────────────

function DayDetail({
  dia,
  onBack,
  recursosMap,
}: {
  dia: FieldDia;
  onBack: () => void;
  recursosMap: Map<number, string>;
}) {
  const [atividades, setAtividades] = useState<FieldAtividade[]>([]);
  const [equipes, setEquipes] = useState<FieldEquipe[]>([]);
  const [justificativas, setJustificativas] = useState<FieldJustificativa[]>([]);
  const [plantas, setPlantas] = useState<PlantaCoord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEquipes, setFiltroEquipes] = useState<string[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<string[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [ativRes, eqRes, justRes, plantRes] = await Promise.all([
        supabase.from("field_atividades").select("*").eq("dia_id", dia.id),
        supabase.from("field_equipes").select("*").eq("dia_id", dia.id),
        supabase.from("field_justificativas").select("*").eq("dia_id", dia.id),
        supabase.from("elevatorias").select("planta, nome, latitude, longitude"),
      ]);
      if (ativRes.data) setAtividades(ativRes.data as FieldAtividade[]);
      if (eqRes.data) setEquipes(eqRes.data as FieldEquipe[]);
      if (justRes.data) setJustificativas(justRes.data as FieldJustificativa[]);
      if (plantRes.data) {
        setPlantas(
          (
            plantRes.data as Array<{
              planta: string | null;
              nome: string;
              latitude: number | null;
              longitude: number | null;
            }>
          )
            .filter((p) => p.planta && p.latitude && p.longitude)
            .map((p) => ({
              planta: p.planta!.trim().toUpperCase(),
              nome: p.nome,
              lat: p.latitude!,
              lon: p.longitude!,
            })),
        );
      }
      setLoading(false);
    };
    load();
  }, [dia.id]);

  const plantaMap = useMemo(() => {
    const m = new Map<string, PlantaCoord>();
    for (const p of plantas) m.set(p.planta, p);
    return m;
  }, [plantas]);

  const handleSalvarJust = async (
    equipeId: number,
    tipo: string,
    idAtividade: number | null,
    texto: string,
  ) => {
    const existing = justificativas.find(
      (j) => j.equipe_id === equipeId && j.tipo === tipo && j.id_atividade === idAtividade,
    );
    if (existing) {
      const { error } = await supabase
        .from("field_justificativas")
        .update({ texto })
        .eq("id", existing.id);
      if (!error) {
        setJustificativas((prev) => prev.map((j) => (j.id === existing.id ? { ...j, texto } : j)));
      }
    } else {
      const { data, error } = await supabase
        .from("field_justificativas")
        .insert({ dia_id: dia.id, equipe_id: equipeId, tipo, id_atividade: idAtividade, texto })
        .select()
        .single();
      if (!error && data) {
        setJustificativas((prev) => [...prev, data as FieldJustificativa]);
      }
    }
  };

  const dateStr = new Date(dia.data + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1f7ad6]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <div>
          <h2 className="text-lg font-bold capitalize">{dateStr}</h2>
          <p className="text-xs text-slate-500">{atividades.length} atividades carregadas</p>
        </div>
      </div>

      {/* Summary Cards */}
      <SummaryCards atividades={atividades} />

      {/* Map */}
      <ProdutividadeMap
        atividades={atividades}
        plantaMap={plantaMap}
        equipes={equipes}
        recursosMap={recursosMap}
        filtroEquipes={filtroEquipes}
        setFiltroEquipes={setFiltroEquipes}
        filtroStatus={filtroStatus}
        setFiltroStatus={setFiltroStatus}
        filtroTipo={filtroTipo}
        setFiltroTipo={setFiltroTipo}
      />

      {/* Tipo de Serviço Chart */}
      <TipoServicoChart atividades={atividades} />

      {/* Equipes */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Distribuição por Equipe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {equipes.length === 0 ? (
            <p className="text-xs text-slate-400">Nenhuma equipe configurada para este dia.</p>
          ) : (
            equipes.map((eq, i) => (
              <EquipeSection
                key={eq.id}
                equipe={eq}
                atividades={atividades}
                equipeIdx={i}
                justificativas={justificativas}
                onSalvar={handleSalvarJust}
                recursosMap={recursosMap}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Dashboard Comparison ─────────────────────────────────────

function DashboardComparacao() {
  const [dias, setDias] = useState<FieldDia[]>([]);
  const [atividades, setAtividades] = useState<FieldAtividade[]>([]);
  const [equipes, setEquipes] = useState<FieldEquipe[]>([]);
  const [periodo, setPeriodo] = useState<"7" | "30" | "mes">("7");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const now = new Date();
      let startDate: string;
      if (periodo === "7") {
        startDate = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
      } else if (periodo === "30") {
        startDate = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);
      } else {
        startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      }

      const diasRes = await supabase
        .from("field_dias")
        .select("*")
        .gte("data", startDate)
        .order("data", { ascending: false });
      const diasData = (diasRes.data || []) as FieldDia[];
      setDias(diasData);

      if (diasData.length > 0) {
        const diaIds = diasData.map((d) => d.id);
        const [ativRes, eqRes] = await Promise.all([
          supabase.from("field_atividades").select("*").in("dia_id", diaIds),
          supabase.from("field_equipes").select("*").in("dia_id", diaIds),
        ]);
        setAtividades((ativRes.data || []) as FieldAtividade[]);
        setEquipes((eqRes.data || []) as FieldEquipe[]);
      } else {
        setAtividades([]);
        setEquipes([]);
      }
      setLoading(false);
    };
    load();
  }, [periodo]);

  const osPorDia = useMemo(() => {
    return dias
      .map((d) => {
        const dayAtiv = atividades.filter(
          (a) => a.dia_id === d.id && !isAtividadeAdministrativa(a.tipo_atividade),
        );
        const exec = dayAtiv.filter((a) => normalizeStatus(a.status) === "concluido").length;
        return { data: d.data.slice(5), exec };
      })
      .reverse();
  }, [dias, atividades]);

  const osPorEquipe = useMemo(() => {
    const map = new Map<number, { nome: string; exec: number }>();
    for (const eq of equipes) map.set(eq.id, { nome: eq.nome_equipe, exec: 0 });
    for (const a of atividades) {
      if (normalizeStatus(a.status) !== "concluido") continue;
      for (const eq of equipes) {
        if (eq.dia_id === a.dia_id && eq.tecnicos.includes(a.id_recurso)) {
          const entry = map.get(eq.id);
          if (entry) entry.exec++;
        }
      }
    }
    return [...map.values()].filter((e) => e.exec > 0).sort((a, b) => b.exec - a.exec);
  }, [atividades, equipes]);

  const ranking = osPorEquipe.length > 0 ? osPorEquipe[0] : null;

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1f7ad6]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Período:</span>
        {(["7", "30", "mes"] as const).map((p) => (
          <Button
            key={p}
            variant={periodo === p ? "default" : "outline"}
            size="sm"
            className="h-7 text-[11px]"
            onClick={() => setPeriodo(p)}
          >
            {p === "7" ? "Últimos 7 dias" : p === "30" ? "Últimos 30 dias" : "Este mês"}
          </Button>
        ))}
      </div>

      {osPorDia.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">
          Nenhum dado encontrado para o período.
        </p>
      ) : (
        <>
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">OS Executadas por Dia</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={osPorDia}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RechartsTooltip />
                  <Line
                    type="monotone"
                    dataKey="exec"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Executadas"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">OS Executadas por Equipe</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(150, osPorEquipe.length * 35)}>
                <BarChart data={osPorEquipe} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="nome" width={120} tick={{ fontSize: 11 }} />
                  <RechartsTooltip />
                  <Bar dataKey="exec" radius={[0, 4, 4, 0]}>
                    {osPorEquipe.map((_, i) => (
                      <Cell key={i} fill={getEquipeColor(i).hex} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {ranking && (
            <Card className="shadow-sm border-emerald-200 bg-emerald-50">
              <CardContent className="flex items-center gap-4 p-4">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                <div>
                  <div className="text-sm font-bold text-emerald-800">Equipe mais produtiva</div>
                  <div className="text-2xl font-bold text-emerald-700">{ranking.nome}</div>
                  <div className="text-xs text-emerald-600">
                    {ranking.exec} OS executadas no período
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────

function ProdutividadePage() {
  const [dias, setDias] = useState<FieldDia[]>([]);
  const [recursos, setRecursos] = useState<FieldRecurso[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedDia, setSelectedDia] = useState<FieldDia | null>(null);
  const [tab, setTab] = useState<"dias" | "dashboard">("dias");
  const [gerenciarOpen, setGerenciarOpen] = useState(false);
  const [recursosToSave, setRecursosToSave] = useState<Record<string, string>>({});

  const loadDias = useCallback(async () => {
    setLoading(true);
    const [diasRes, recRes] = await Promise.all([
      supabase.from("field_dias").select("*").order("data", { ascending: false }),
      supabase.from("field_recursos").select("*").order("id_recurso"),
    ]);
    if (diasRes.data) setDias(diasRes.data as FieldDia[]);
    if (recRes.data) setRecursos(recRes.data as FieldRecurso[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDias();
  }, [loadDias]);

  const existingDates = useMemo(() => new Set(dias.map((d) => d.data)), [dias]);

  const recursosMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const r of recursos) m.set(r.id_recurso, r.nome);
    return m;
  }, [recursos]);

  const handleSalvarRecursos = async () => {
    const entries = Object.entries(recursosToSave).filter(([, nome]) => nome.trim());
    if (entries.length === 0) return;
    try {
      for (const [idRecurso, nome] of entries) {
        await supabase
          .from("field_recursos")
          .upsert(
            { id_recurso: Number(idRecurso), nome: nome.trim() },
            { onConflict: "id_recurso" },
          );
      }
      setRecursosToSave({});
      setGerenciarOpen(false);
      await loadDias();
      toast.success("Nomes salvos! Eles serão aplicados nas próximas importações.");
    } catch {
      toast.error("Erro ao salvar nomes.");
    }
  };

  if (selectedDia) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-3 md:p-6">
        <DayDetail
          dia={selectedDia}
          onBack={() => setSelectedDia(null)}
          recursosMap={recursosMap}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-3 md:p-6">
      {/* Header */}
      <div className="mb-4 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#002d74] via-[#003087] to-[#00AEEF] p-4 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.6)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-14 shrink-0 items-center justify-center rounded-2xl">
              <img
                src="/logo.png"
                alt="Águas do Rio"
                className="h-14 w-auto object-contain"
                loading="eager"
              />
            </div>
            <div className="min-w-0 text-white">
              <p className="truncate text-lg font-semibold">Águas do Rio</p>
              <p className="truncate text-sm text-cyan-50/90">Produtividade de Campo</p>
            </div>
          </div>
          <NavVoltarHome />
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "dias" | "dashboard")}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="dias">
              <CalendarDays className="mr-1 h-3.5 w-3.5" /> Dias
            </TabsTrigger>
            <TabsTrigger value="dashboard">
              <BarChart3 className="mr-1 h-3.5 w-3.5" /> Dashboard
            </TabsTrigger>
          </TabsList>
          {tab === "dias" && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setGerenciarOpen(true)}
                className="border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200"
              >
                <Users className="mr-1 h-4 w-4" /> Gerenciar IDs
              </Button>
              <Button
                onClick={() => setUploadOpen(true)}
                className="bg-[#0b3a73] hover:bg-[#002d74]"
              >
                <Upload className="mr-1 h-4 w-4" /> Adicionar Dia
              </Button>
            </div>
          )}
        </div>

        <TabsContent value="dias">
          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#1f7ad6]" />
            </div>
          ) : dias.length === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarDays className="mb-3 h-12 w-12 text-slate-300" />
                <p className="text-sm text-slate-500">Nenhum dia importado ainda.</p>
                <Button
                  onClick={() => setUploadOpen(true)}
                  className="mt-4 bg-[#0b3a73] hover:bg-[#002d74]"
                >
                  <Upload className="mr-1 h-4 w-4" /> Importar primeiro dia
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {dias.map((d) => {
                const dateObj = new Date(d.data + "T12:00:00");
                const label = dateObj.toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                });
                return (
                  <Card
                    key={d.id}
                    className="cursor-pointer shadow-sm transition hover:shadow-md hover:border-[#1f7ad6]"
                    onClick={() => setSelectedDia(d)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold capitalize">{label}</div>
                          <div className="text-[11px] text-slate-500">
                            {d.observacao_geral || "Sem observação"}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="dashboard">
          <DashboardComparacao />
        </TabsContent>
      </Tabs>

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSaved={loadDias}
        existingDates={existingDates}
        recursosMap={recursosMap}
      />

      <Dialog
        open={gerenciarOpen}
        onOpenChange={(v) => {
          if (!v) {
            setRecursosToSave({});
            setGerenciarOpen(false);
          }
        }}
      >
        <DialogContent className="max-w-md max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerenciar IDs de Recurso</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500">
            Atribua um nome a cada ID. Esses nomes aparecerão automaticamente nas próximas
            importações e nos detalhes do dia.
          </p>
          <div className="space-y-2">
            {recursos.map((r) => (
              <div key={r.id_recurso} className="flex items-center gap-2">
                <span className="w-16 shrink-0 font-mono text-xs text-slate-500">
                  {r.id_recurso}
                </span>
                <Input
                  value={recursosToSave[r.id_recurso] ?? r.nome}
                  onChange={(e) =>
                    setRecursosToSave((prev) => ({
                      ...prev,
                      [r.id_recurso]: e.target.value,
                    }))
                  }
                  className="h-8 text-xs"
                  placeholder="Nome do técnico"
                />
              </div>
            ))}
            {recursos.length === 0 && (
              <p className="text-xs text-slate-400">
                Nenhum ID cadastrado ainda. Importe um dia primeiro ou cadastre manualmente abaixo.
              </p>
            )}
            <div className="flex items-center gap-2 pt-1">
              <span className="w-16 shrink-0 font-mono text-xs text-slate-500">Novo</span>
              <Input
                value={recursosToSave["novo_id"] ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setRecursosToSave((prev) => ({ ...prev, novo_id: v }));
                }}
                className="h-8 w-20 text-xs"
                placeholder="ID"
              />
              <Input
                value={recursosToSave["novo_nome"] ?? ""}
                onChange={(e) =>
                  setRecursosToSave((prev) => ({ ...prev, novo_nome: e.target.value }))
                }
                className="h-8 flex-1 text-xs"
                placeholder="Nome do técnico"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setRecursosToSave({});
                setGerenciarOpen(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                const novosNomes: string[] = [];
                for (const [k, v] of Object.entries(recursosToSave)) {
                  if (k === "novo_id" || k === "novo_nome") continue;
                  if (v.trim()) novosNomes.push(`${k}=${v.trim()}`);
                }
                const novoId = recursosToSave["novo_id"];
                const novoNome = recursosToSave["novo_nome"];
                if (novoId && novoNome) novosNomes.push(`${novoId}=${novoNome}`);
                if (novosNomes.length > 0) {
                  try {
                    for (const pair of novosNomes) {
                      const [id, nome] = pair.split("=");
                      await supabase
                        .from("field_recursos")
                        .upsert({ id_recurso: Number(id), nome }, { onConflict: "id_recurso" });
                    }
                    await loadDias();
                    setRecursosToSave({});
                    setGerenciarOpen(false);
                    toast.success("Nomes salvos!");
                  } catch {
                    toast.error("Erro ao salvar nomes.");
                  }
                }
              }}
              className="bg-[#0b3a73] hover:bg-[#002d74]"
            >
              Salvar Nomes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
