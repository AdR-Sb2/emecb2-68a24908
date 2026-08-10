import { useState } from "react";
import { Info } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { parseLogOS, getCriticidade, getTextoBreve, type LogEntry } from "@/lib/parse-log-os";

function badgeCriticidade(valor: string | null) {
  if (!valor) return null;
  const v = valor.toUpperCase();
  const variant = v.includes("EMERG") ? "destructive" : v.includes("URG") ? "default" : "secondary";
  return (
    <Badge variant={variant} className="text-[10px]">
      {valor}
    </Badge>
  );
}

interface OsInfoIconProps {
  textoLongo: string | null | undefined;
  numeroOs: string;
  textoBreve?: string;
}

export function OsInfoIcon({ textoLongo, numeroOs, textoBreve }: OsInfoIconProps) {
  const [aberto, setAberto] = useState(false);
  const entries = parseLogOS(textoLongo);

  if (entries.length === 0) return null;

  const ultima = entries[0];

  return (
    <>
      <HoverCard openDelay={200}>
        <HoverCardTrigger asChild>
          <button
            type="button"
            onClick={() => setAberto(true)}
            className="text-slate-400 hover:text-[#1f7ad6] dark:text-slate-500 dark:hover:text-[#1f7ad6] shrink-0"
            title="Histórico de anotações da O.S."
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </HoverCardTrigger>
        <HoverCardContent className="w-80 text-xs space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">
              {ultima.data} {ultima.hora} · {ultima.autor}
            </span>
            {badgeCriticidade(getCriticidade(ultima))}
          </div>
          <p className="line-clamp-4">
            {getTextoBreve(ultima) ?? ultima.textoLivre.join(" ") ?? "Sem descrição"}
          </p>
          {entries.length > 1 && (
            <p className="text-[10px] text-muted-foreground pt-1">
              Clique para ver histórico completo ({entries.length} registros)
            </p>
          )}
        </HoverCardContent>
      </HoverCard>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              O.S. {numeroOs}
              {textoBreve ? ` — ${textoBreve}` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {entries.map((e, i) => (
              <LogEntryCard key={i} entry={e} />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function LogEntryCard({ entry }: { entry: LogEntry }) {
  return (
    <div className="border rounded-md p-3 space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {entry.data} {entry.hora} · {entry.autor}
        </span>
        {badgeCriticidade(getCriticidade(entry))}
      </div>
      {entry.campos.map((c, j) => (
        <p key={j} className="text-sm">
          <span className="font-medium">{c.chave}:</span> {c.valor}
        </p>
      ))}
      {entry.textoLivre.map((t, j) => (
        <p key={j} className="text-sm text-muted-foreground">
          {t}
        </p>
      ))}
    </div>
  );
}
