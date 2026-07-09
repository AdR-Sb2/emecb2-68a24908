import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Home,
  Send,
  Search,
  FileText,
  ClipboardCheck,
  MapPin,
  Settings2,
  Droplets,
  Gauge,
  Wrench,
  Building2,
  ShieldCheck,
  BarChart3,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import logoHeader from "@/assets/logo-branca.png";
import elevatorias from "@/data/elevatorias.json";

export const Route = createFileRoute("/relatorio")({
  head: () => ({
    meta: [
      { title: "Relatórios · Eletromecânica" },
      { name: "description", content: "Geração de Relatório Técnico e de Planta/Unidade." },
    ],
  }),
  component: RelatorioPage,
});

// URL do Apps Script publicado como Web App (deixe vazio se ainda não configurado).
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbz_0vMqu4tYfotpxaz5o7YTuzO6z3SUxOwum942JogrkiV8U186Ta3AqGo9R_TuWqX5sQ/exec";

// Elevatórias com regra de recalque duplo (JK Velho / JK Novo) + retaguarda pré-preenchida
const DUPLO_RECALQUE: Array<{
  match: (tag: string, nome: string) => boolean;
  labels: [string, string];
  retaguardaDefault: string;
}> = [
  {
    match: (tag, nome) => tag.includes("0746") || nome.toUpperCase().includes("JK"),
    labels: ["JK Velho (mca)", "JK Novo (mca)"],
    retaguardaDefault: "10MCA",
  },
];

type Elev = { ELEVATORIAS?: string | null; PLANTA?: string | null; MUNICIPIO?: string | null };
const BASE: Elev[] = elevatorias as Elev[];

function withMCA(v: string) {
  const t = (v || "").trim();
  if (!t) return "";
  return /mca/i.test(t) ? t.toUpperCase() : `${t} MCA`;
}

function todayBR() {
  const d = new Date();
  return d.toLocaleDateString("pt-BR");
}

async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return fallbackCopy(text);
    }
  }
  return fallbackCopy(text);
}
function fallbackCopy(text: string): boolean {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(ta);
  return ok;
}

async function copyAndPrompt(text: string) {
  const ok = await copyText(text);
  if (!ok) {
    toast.error("Não foi possível copiar o texto.");
    return;
  }
  toast.success("Texto copiado!", {
    description: "Deseja também enviar por WhatsApp?",
    duration: 10000,
    action: {
      label: "Enviar WhatsApp",
      onClick: () => openWhatsApp(text),
    },
  });
}

function openWhatsApp(text: string) {
  const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

async function postSheet(tipo: "tecnico" | "planta", payload: Record<string, unknown>) {
  if (!APPS_SCRIPT_URL) return;
  try {
    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ tipo, ...payload }),
    });
  } catch (e) {
    console.error("Falha ao enviar para planilha", e);
  }
}

function useLookup() {
  const [query, setQuery] = useState("");
  const [unidade, setUnidade] = useState("");
  const [planta, setPlanta] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [found, setFound] = useState<boolean | null>(null);

  const buscar = () => {
    const q = query.trim().toLowerCase();
    if (!q) {
      toast.error("Digite uma TAG ou nome para buscar.");
      return;
    }
    const hit = BASE.find(
      (e) =>
        (e.PLANTA || "").toLowerCase().includes(q) ||
        (e.ELEVATORIAS || "").toLowerCase().includes(q),
    );
    if (hit) {
      setUnidade(hit.ELEVATORIAS || "");
      setPlanta(hit.PLANTA || "");
      setMunicipio(hit.MUNICIPIO || "");
      setFound(true);
      toast.success(`Encontrado: ${hit.ELEVATORIAS}`);
    } else {
      setUnidade("Elevatória Operacional");
      setPlanta(query.trim());
      setMunicipio("");
      setFound(false);
      toast.warning("Não encontrado. Preencha manualmente.");
    }
  };

  return {
    query,
    setQuery,
    unidade,
    setUnidade,
    planta,
    setPlanta,
    municipio,
    setMunicipio,
    found,
    buscar,
  };
}

/* ---------------- shared UI ---------------- */

const inputCls =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-[#1f7ad6] focus:outline-none focus:ring-2 focus:ring-[#1f7ad6]/20 disabled:bg-slate-50";
const labelCls = "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-600";
const cardCls = "rounded-md border border-slate-200 bg-white p-4 shadow-sm md:p-5";
const sectionTitleCls = "mb-3 flex items-center gap-2 text-sm font-semibold text-[#0b3a73]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <h2 className={sectionTitleCls}>
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#1f7ad6]/10 text-[#1f7ad6]">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="uppercase tracking-wide">{children}</span>
    </h2>
  );
}

function IdentificacaoBlock(l: ReturnType<typeof useLookup>) {
  return (
    <section className={cardCls}>
      <SectionTitle icon={MapPin}>Identificação</SectionTitle>
      <Field label="Buscar por TAG ou Nome">
        <div className="flex gap-2">
          <input
            className={inputCls}
            placeholder="Ex: PL-RJB-EAT0746 ou JK"
            value={l.query}
            onChange={(e) => l.setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), l.buscar())}
          />
          <button
            type="button"
            onClick={l.buscar}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[#1f7ad6] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0b3a73] active:scale-[0.98]"
          >
            <Search className="h-4 w-4" /> Buscar
          </button>
        </div>
      </Field>
      {l.found !== null && (l.unidade || l.planta) && (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4" />
          <span className="font-medium">
            {l.found ? "Ativo localizado na base." : "Não localizado — preenchimento manual."}
          </span>
        </div>
      )}
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Field label="Unidade">
          <input
            className={inputCls}
            value={l.unidade}
            onChange={(e) => l.setUnidade(e.target.value)}
          />
        </Field>
        <Field label="Planta">
          <input
            className={inputCls}
            value={l.planta}
            onChange={(e) => l.setPlanta(e.target.value)}
          />
        </Field>
        <Field label="Município">
          <input
            className={inputCls}
            value={l.municipio}
            onChange={(e) => l.setMunicipio(e.target.value)}
          />
        </Field>
      </div>
    </section>
  );
}

/* ---------------- Relatório Técnico ---------------- */

type Grupo = {
  nome: string;
  contatora: string;
  rpm: string;
  potencia: string;
  tensao: string;
  corrente: string;
  correnteShutoff: string;
};

function emptyGrupo(i: number): Grupo {
  return {
    nome: `G${i}`,
    contatora: "",
    rpm: "",
    potencia: "",
    tensao: "",
    corrente: "",
    correnteShutoff: "",
  };
}

function RelatorioTecnico() {
  const l = useLookup();
  const [qtd, setQtd] = useState(1);
  const [grupos, setGrupos] = useState<Grupo[]>([emptyGrupo(1)]);
  const [retaguarda, setRetaguarda] = useState("");
  const [recalque, setRecalque] = useState("");
  const [recalqueA, setRecalqueA] = useState("");
  const [recalqueB, setRecalqueB] = useState("");
  const [retShutoff, setRetShutoff] = useState("");
  const [recShutoff, setRecShutoff] = useState("");
  const [tipoServ, setTipoServ] = useState<"Preventiva" | "Corretiva">("Preventiva");
  const [numOS, setNumOS] = useState("");
  const [servExec, setServExec] = useState("");
  const [obs, setObs] = useState("");
  const [naChegada, setNaChegada] = useState<"Ligado" | "Desligado">("Ligado");
  const [naSaida, setNaSaida] = useState<"Ligado" | "Desligado">("Ligado");
  const [status, setStatus] = useState<"Manual" | "Automático">("Automático");
  const [colab, setColab] = useState("");
  const [data, setData] = useState("");
  useEffect(() => setData(todayBR()), []);

  const excecao = useMemo(
    () => DUPLO_RECALQUE.find((r) => r.match(l.planta || "", l.unidade || "")),
    [l.planta, l.unidade],
  );

  useEffect(() => {
    if (excecao && !retaguarda) setRetaguarda(excecao.retaguardaDefault);
  }, [excecao]);

  useEffect(() => {
    setGrupos((prev) => {
      const next = [...prev];
      while (next.length < qtd) next.push(emptyGrupo(next.length + 1));
      while (next.length > qtd) next.pop();
      return next;
    });
  }, [qtd]);

  const updGrupo = (i: number, patch: Partial<Grupo>) =>
    setGrupos((g) => g.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  const gerarTexto = () => {
    const lines: string[] = [];
    lines.push(`📄 *RELATÓRIO TÉCNICO*`);
    lines.push(`🗓️ *Data:* ${data}`);
    lines.push(``);
    lines.push(`🏭 *Unidade:* ${l.unidade || "-"}`);
    lines.push(`🔖 *Planta:* ${l.planta || "-"}`);
    if (l.municipio) lines.push(`📍 *Município:* ${l.municipio}`);
    lines.push(``);
    grupos.forEach((g) => {
      lines.push(`⚙️ *${g.nome}*`);
      if (g.contatora) lines.push(`• Contatora/Soft/Inversor: ${g.contatora}`);
      if (g.rpm) lines.push(`• RPM: ${g.rpm}`);
      if (g.potencia) lines.push(`• Potência: ${g.potencia}`);
      if (g.tensao) lines.push(`• Tensão FF: ${g.tensao}`);
      if (g.corrente) lines.push(`• Corrente (Operação): ${g.corrente}`);
      if (g.correnteShutoff) lines.push(`• Corrente Shutoff: ${g.correnteShutoff}`);
      lines.push(``);
    });
    lines.push(`💧 *Parâmetros Hidráulicos (Operação)*`);
    lines.push(`• Retaguarda: ${withMCA(retaguarda) || "-"}`);
    if (excecao) {
      lines.push(
        `• Recalque ${excecao.labels[0].replace(" (mca)", "")}: ${withMCA(recalqueA) || "-"}`,
      );
      lines.push(
        `• Recalque ${excecao.labels[1].replace(" (mca)", "")}: ${withMCA(recalqueB) || "-"}`,
      );
    } else {
      lines.push(`• Recalque: ${withMCA(recalque) || "-"}`);
    }
    lines.push(``);
    lines.push(`🚱 *Teste em Shutoff*`);
    lines.push(`• Retaguarda Shutoff: ${withMCA(retShutoff) || "-"}`);
    lines.push(`• Recalque Shutoff: ${withMCA(recShutoff) || "-"}`);
    lines.push(``);
    lines.push(`🛠️ *Execução do Serviço*`);
    lines.push(`• Tipo: ${tipoServ}`);
    if (tipoServ === "Corretiva") lines.push(`• Nº O.S.: ${numOS || "-"}`);
    lines.push(`• Serviço Executado: ${servExec || "-"}`);
    if (obs) lines.push(`• Observações: ${obs}`);
    const chk = (v: boolean) => (v ? "(x)" : "( )");
    lines.push(
      `• Na Chegada: Ligado ${chk(naChegada === "Ligado")} Desligado ${chk(naChegada === "Desligado")}`,
    );
    lines.push(
      `• Na Saída: Ligado ${chk(naSaida === "Ligado")} Desligado ${chk(naSaida === "Desligado")}`,
    );
    lines.push(
      `• Status: Manual ${chk(status === "Manual")} Automático ${chk(status === "Automático")}`,
    );
    lines.push(``);
    lines.push(`👷 *Colaboradores:*`);
    const nomes = colab
      .split(/[,/]/)
      .map((s) => s.trim())
      .filter(Boolean);
    nomes.forEach((n) => lines.push(`• ${n}`));
    return lines.join("\n");
  };

  const validar = () => {
    if (!l.unidade || !l.planta) return "Preencha a identificação (busque pela TAG).";
    if (tipoServ === "Corretiva" && !numOS.trim()) return "Informe o Nº da O.S.";
    if (!servExec.trim()) return "Informe o Serviço Executado.";
    if (!colab.trim()) return "Informe o(s) colaborador(es).";
    return null;
  };

  const handleEnviar = async () => {
    const err = validar();
    if (err) return toast.error(err);
    const texto = gerarTexto();
    await copyAndPrompt(texto);
    await postSheet("tecnico", {
      data,
      tag: l.planta,
      unidade: l.unidade,
      planta: l.planta,
      municipio: l.municipio,
      qtdGrupos: qtd,
      grupos,
      retaguarda: withMCA(retaguarda),
      recalque: excecao ? "" : withMCA(recalque),
      recalqueA: excecao ? withMCA(recalqueA) : "",
      recalqueB: excecao ? withMCA(recalqueB) : "",
      retaguardaShutoff: withMCA(retShutoff),
      recalqueShutoff: withMCA(recShutoff),
      tipoServico: tipoServ,
      numOS,
      servicoExecutado: servExec,
      observacoes: obs,
      naChegada,
      naSaida,
      status,
      colaboradores: colab
        .split(/[,/]/)
        .map((s) => s.trim())
        .filter(Boolean),
    });
  };

  return (
    <div className="space-y-4">
      <IdentificacaoBlock {...l} />

      <section className={cardCls}>
        <div className="mb-3 flex items-center justify-between">
          <SectionTitle icon={Settings2}>Grupos Motor-Bomba</SectionTitle>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600">Quantidade</label>
            <select
              value={qtd}
              onChange={(e) => setQtd(Number(e.target.value))}
              className={inputCls + " w-20"}
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-4">
          {grupos.map((g, i) => (
            <div
              key={i}
              className="rounded-md border border-slate-200 bg-slate-50/60 p-3 transition hover:border-[#1f7ad6]/40"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-flex h-6 items-center rounded-full bg-[#0b3a73] px-2 text-[11px] font-bold uppercase tracking-wider text-white">
                  Grupo {i + 1}
                </span>
                <input
                  className={inputCls + " max-w-[140px] font-semibold"}
                  value={g.nome}
                  onChange={(e) => updGrupo(i, { nome: e.target.value })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Contatora / Soft / Inversor">
                  <input
                    className={inputCls}
                    value={g.contatora}
                    onChange={(e) => updGrupo(i, { contatora: e.target.value })}
                  />
                </Field>
                <Field label="RPM">
                  <input
                    className={inputCls}
                    value={g.rpm}
                    onChange={(e) => updGrupo(i, { rpm: e.target.value })}
                  />
                </Field>
                <Field label="Potência">
                  <input
                    className={inputCls}
                    value={g.potencia}
                    onChange={(e) => updGrupo(i, { potencia: e.target.value })}
                  />
                </Field>
                <Field label="Tensão FF">
                  <input
                    className={inputCls}
                    value={g.tensao}
                    onChange={(e) => updGrupo(i, { tensao: e.target.value })}
                  />
                </Field>
                <Field label="Corrente (Operação)">
                  <input
                    className={inputCls}
                    value={g.corrente}
                    onChange={(e) => updGrupo(i, { corrente: e.target.value })}
                  />
                </Field>
                <Field label="Corrente Shutoff">
                  <input
                    className={inputCls}
                    value={g.correnteShutoff}
                    onChange={(e) => updGrupo(i, { correnteShutoff: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={cardCls}>
        <SectionTitle icon={Droplets}>Parâmetros Hidráulicos (Operação)</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Retaguarda (mca)">
            <input
              className={inputCls}
              value={retaguarda}
              onChange={(e) => setRetaguarda(e.target.value)}
            />
          </Field>
          {excecao ? (
            <>
              <Field label={excecao.labels[0]}>
                <input
                  className={inputCls}
                  value={recalqueA}
                  onChange={(e) => setRecalqueA(e.target.value)}
                />
              </Field>
              <Field label={excecao.labels[1]}>
                <input
                  className={inputCls}
                  value={recalqueB}
                  onChange={(e) => setRecalqueB(e.target.value)}
                />
              </Field>
            </>
          ) : (
            <Field label="Recalque (mca)">
              <input
                className={inputCls}
                value={recalque}
                onChange={(e) => setRecalque(e.target.value)}
              />
            </Field>
          )}
        </div>
      </section>

      <section className={cardCls}>
        <SectionTitle icon={Gauge}>Teste em Shutoff (Válvula Fechada)</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Retaguarda Shutoff (mca)">
            <input
              className={inputCls}
              value={retShutoff}
              onChange={(e) => setRetShutoff(e.target.value)}
            />
          </Field>
          <Field label="Recalque Shutoff (mca)">
            <input
              className={inputCls}
              value={recShutoff}
              onChange={(e) => setRecShutoff(e.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className={cardCls}>
        <SectionTitle icon={Wrench}>Execução do Serviço</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tipo de Serviço">
            <select
              className={inputCls}
              value={tipoServ}
              onChange={(e) => setTipoServ(e.target.value as "Preventiva" | "Corretiva")}
            >
              <option>Preventiva</option>
              <option>Corretiva</option>
            </select>
          </Field>
          {tipoServ === "Corretiva" && (
            <Field label="Número da O.S.">
              <input
                className={inputCls}
                value={numOS}
                onChange={(e) => setNumOS(e.target.value)}
              />
            </Field>
          )}
          <Field label="Na Chegada">
            <select
              className={inputCls}
              value={naChegada}
              onChange={(e) => setNaChegada(e.target.value as "Ligado" | "Desligado")}
            >
              <option>Ligado</option>
              <option>Desligado</option>
            </select>
          </Field>
          <Field label="Na Saída">
            <select
              className={inputCls}
              value={naSaida}
              onChange={(e) => setNaSaida(e.target.value as "Ligado" | "Desligado")}
            >
              <option>Ligado</option>
              <option>Desligado</option>
            </select>
          </Field>
          <Field label="Status">
            <select
              className={inputCls}
              value={status}
              onChange={(e) => setStatus(e.target.value as "Manual" | "Automático")}
            >
              <option>Automático</option>
              <option>Manual</option>
            </select>
          </Field>
          <Field label="Colaboradores (separar por , ou /)">
            <input
              className={inputCls}
              value={colab}
              onChange={(e) => setColab(e.target.value)}
              placeholder="João, Maria / Pedro"
            />
          </Field>
        </div>
        <div className="mt-3 grid gap-3">
          <Field label="Serviço Executado">
            <textarea
              className={inputCls + " min-h-[90px]"}
              value={servExec}
              onChange={(e) => setServExec(e.target.value)}
            />
          </Field>
          <Field label="Observações">
            <textarea
              className={inputCls + " min-h-[70px]"}
              value={obs}
              onChange={(e) => setObs(e.target.value)}
            />
          </Field>
        </div>
      </section>

      <ActionBar onSend={handleEnviar} />
    </div>
  );
}

/* ---------------- Relatório de Planta ---------------- */

const OP_ESTRUTURA = ["Excelente", "Bom", "Regular", "Crítico", "Outros"];
const OP_VAZAMENTOS = ["Nenhum detectado", "Pequeno vazamento", "Vazamento crítico", "Outros"];
const OP_CERCAS = ["Conforme", "Sem cadeado-Portão aberto", "Sinais de invasão", "Outros"];
const OP_ILUMINACAO = ["100% Operacional", "Lâmpadas queimadas", "Sem iluminação", "Outros"];
const OP_STATUS = [
  "Operando em Condições Normais ✅",
  "Operando com Restrições ⚠️",
  "Paralisada ❌",
];

function outrosLabel(v: string) {
  return v === "Outros" ? "Outros (Ver parecer técnico abaixo) ⚠️" : v;
}

function RelatorioPlanta() {
  const l = useLookup();
  const [estrutura, setEstrutura] = useState(OP_ESTRUTURA[1]);
  const [vazamentos, setVazamentos] = useState(OP_VAZAMENTOS[0]);
  const [cercas, setCercas] = useState(OP_CERCAS[0]);
  const [iluminacao, setIluminacao] = useState(OP_ILUMINACAO[0]);
  const [statusGeral, setStatusGeral] = useState(OP_STATUS[0]);
  const [parecer, setParecer] = useState("");
  const [necessidades, setNecessidades] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [data, setData] = useState("");
  useEffect(() => setData(todayBR()), []);

  const gerarTexto = () => {
    const nec = necessidades.trim() || "Nenhuma pendência crítica";
    const lines: string[] = [];
    lines.push(`📋 *RELATÓRIO SITUACIONAL DE PLANTA/UNIDADE*`);
    lines.push(`🗓️ *Data:* ${data}`);
    lines.push(``);
    lines.push(`🏭 *Unidade:* ${l.unidade || "-"}`);
    lines.push(`🔖 *Planta:* ${l.planta || "-"}`);
    if (l.municipio) lines.push(`📍 *Município:* ${l.municipio}`);
    lines.push(``);
    lines.push(`🏗️ *Condições da Infraestrutura*`);
    lines.push(`• Estrutura Civil/Prédio: ${outrosLabel(estrutura)}`);
    lines.push(`• Vazamentos/Infiltrações: ${outrosLabel(vazamentos)}`);
    lines.push(``);
    lines.push(`🔐 *Segurança e Acesso*`);
    lines.push(`• Cercas, Portões e Cadeados: ${outrosLabel(cercas)}`);
    lines.push(`• Iluminação: ${outrosLabel(iluminacao)}`);
    lines.push(``);
    lines.push(`📊 *Resumo da Situação Geral*`);
    lines.push(`• Status Operacional: ${statusGeral}`);
    lines.push(`• Parecer Técnico: ${parecer || "-"}`);
    lines.push(`• Necessidades/Pendências: ${nec}`);
    lines.push(``);
    lines.push(`👤 *Responsável pela Inspeção:* ${responsavel || "-"}`);
    return lines.join("\n");
  };

  const validar = () => {
    if (!l.unidade || !l.planta) return "Preencha a identificação (busque pela TAG).";
    if (!parecer.trim()) return "Preencha o Parecer Técnico.";
    if (!responsavel.trim()) return "Informe o responsável pela inspeção.";
    return null;
  };

  const handleEnviar = async () => {
    const err = validar();
    if (err) return toast.error(err);
    await copyAndPrompt(gerarTexto());
    await postSheet("planta", {
      data,
      tag: l.planta,
      unidade: l.unidade,
      municipio: l.municipio,
      estrutura,
      vazamentos,
      cercas,
      iluminacao,
      statusGeral,
      parecer,
      necessidades: necessidades.trim() || "Nenhuma pendência crítica",
      responsavel,
    });
  };

  return (
    <div className="space-y-4">
      <IdentificacaoBlock {...l} />

      <section className={cardCls}>
        <SectionTitle icon={Building2}>Condições da Infraestrutura</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Estrutura Civil/Prédio">
            <select
              className={inputCls}
              value={estrutura}
              onChange={(e) => setEstrutura(e.target.value)}
            >
              {OP_ESTRUTURA.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Field>
          <Field label="Vazamentos/Infiltrações">
            <select
              className={inputCls}
              value={vazamentos}
              onChange={(e) => setVazamentos(e.target.value)}
            >
              {OP_VAZAMENTOS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section className={cardCls}>
        <SectionTitle icon={ShieldCheck}>Segurança e Acesso</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Cercas, Portões e Cadeados">
            <select className={inputCls} value={cercas} onChange={(e) => setCercas(e.target.value)}>
              {OP_CERCAS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Field>
          <Field label="Iluminação">
            <select
              className={inputCls}
              value={iluminacao}
              onChange={(e) => setIluminacao(e.target.value)}
            >
              {OP_ILUMINACAO.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section className={cardCls}>
        <SectionTitle icon={BarChart3}>Resumo da Situação Geral</SectionTitle>
        <div className="grid gap-3">
          <Field label="Status Operacional da Unidade">
            <select
              className={inputCls}
              value={statusGeral}
              onChange={(e) => setStatusGeral(e.target.value)}
            >
              {OP_STATUS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Field>
          <Field label="Parecer Técnico">
            <textarea
              className={inputCls + " min-h-[100px]"}
              value={parecer}
              onChange={(e) => setParecer(e.target.value)}
            />
          </Field>
          <Field label="Necessidades/Pendências Críticas">
            <textarea
              className={inputCls + " min-h-[70px]"}
              value={necessidades}
              onChange={(e) => setNecessidades(e.target.value)}
              placeholder="Nenhuma pendência crítica"
            />
          </Field>
          <Field label="Técnico/Responsável pela Inspeção">
            <input
              className={inputCls}
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
            />
          </Field>
        </div>
      </section>

      <ActionBar onSend={handleEnviar} />
    </div>
  );
}

function ActionBar({ onSend }: { onSend: () => void }) {
  return (
    <div className="sticky bottom-2 z-10 flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
      <span className="hidden text-xs text-slate-500 sm:inline">
        Revise os campos e envie — o texto será copiado e registrado na planilha.
      </span>
      <button
        type="button"
        onClick={onSend}
        className="ml-auto inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-[#1f7ad6] to-[#0b3a73] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110 hover:shadow-lg active:scale-[0.98]"
      >
        <Send className="h-4 w-4" /> Enviar Relatório
      </button>
      <Link
        to="/"
        className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
      >
        Voltar
      </Link>
    </div>
  );
}

function RelatorioPage() {
  const [aba, setAba] = useState<"tecnico" | "planta">("tecnico");
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Toaster richColors position="top-right" />
      <div className="mx-auto max-w-5xl p-4 md:p-6">
        {/* Header com logo — mesmo padrão do dashboard */}
        <div className="mb-4 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#002d74] via-[#003087] to-[#00AEEF] p-4 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.6)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl p-2">
                <img
                  src={logoHeader}
                  alt="Águas do Rio - Eletromecânica"
                  className="h-8 w-auto object-contain sm:h-10"
                  loading="eager"
                />
              </div>
              <div className="min-w-0 text-white">
                <p className="truncate text-base font-semibold">Águas do Rio</p>
                <p className="truncate text-xs text-cyan-50/90">Eletromecânica · Relatórios e comunicação</p>
              </div>
            </div>
            <Link
              to="/"
              title="Voltar ao Hub"
              aria-label="Voltar ao Hub"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[#0b3a73] shadow-md ring-1 ring-black/10 backdrop-blur transition hover:scale-105 hover:bg-white sm:h-9 sm:w-9"
            >
              <Home className="h-5 w-5 sm:h-4 sm:w-4" />
            </Link>
          </div>
        </div>

        {/* Título + tabs */}
        <div className="mb-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#0b3a73] text-white shadow-sm">
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-lg font-bold text-[#0b3a73] md:text-xl">Geração de Relatórios</h1>
              <p className="text-xs text-slate-500 md:text-sm">
                Técnico e de Planta/Unidade · pronto para WhatsApp e planilha
              </p>
            </div>
          </div>

          <div
            role="tablist"
            className="inline-flex w-full flex-wrap gap-1 rounded-md bg-slate-100 p-1 sm:w-auto"
          >
            <button
              role="tab"
              aria-selected={aba === "tecnico"}
              type="button"
              onClick={() => setAba("tecnico")}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition sm:flex-none ${
                aba === "tecnico"
                  ? "bg-white text-[#0b3a73] shadow-sm ring-1 ring-slate-200"
                  : "text-slate-600 hover:text-[#0b3a73]"
              }`}
            >
              <Wrench className="h-4 w-4" /> Técnico
            </button>
            <button
              role="tab"
              aria-selected={aba === "planta"}
              type="button"
              onClick={() => setAba("planta")}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition sm:flex-none ${
                aba === "planta"
                  ? "bg-white text-[#0b3a73] shadow-sm ring-1 ring-slate-200"
                  : "text-slate-600 hover:text-[#0b3a73]"
              }`}
            >
              <ClipboardCheck className="h-4 w-4" /> Planta
            </button>
          </div>
        </div>

        {aba === "tecnico" ? <RelatorioTecnico /> : <RelatorioPlanta />}
      </div>
    </div>
  );
}
