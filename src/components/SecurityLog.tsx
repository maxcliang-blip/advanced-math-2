import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle, CheckCircle2, Info, ShieldAlert,
  Trash2, RefreshCw, Filter,
} from "lucide-react";
import { getLog, clearLog, type LogEntry, type LogSeverity } from "@/lib/securityLog";
import { format } from "date-fns";

const SEVERITY_CONFIG: Record<LogSeverity, { icon: React.ReactNode; badge: string; dot: string }> = {
  success: {
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />,
    badge: "bg-green-500/10 text-green-500 border-green-500/20",
    dot: "bg-green-500",
  },
  info: {
    icon: <Info className="w-3.5 h-3.5 text-primary" />,
    badge: "bg-primary/10 text-primary border-primary/20",
    dot: "bg-primary",
  },
  warning: {
    icon: <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />,
    badge: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    dot: "bg-yellow-500",
  },
  danger: {
    icon: <ShieldAlert className="w-3.5 h-3.5 text-destructive" />,
    badge: "bg-destructive/10 text-destructive border-destructive/20",
    dot: "bg-destructive",
  },
};

type FilterType = "all" | LogSeverity;

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SecurityLog({ open, onClose }: Props) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");

  const refresh = () => setEntries(getLog());

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  const handleClear = () => {
    clearLog();
    setEntries([]);
  };

  const filtered = filter === "all" ? entries : entries.filter((e) => e.severity === filter);

  const counts = {
    danger: entries.filter((e) => e.severity === "danger").length,
    warning: entries.filter((e) => e.severity === "warning").length,
    success: entries.filter((e) => e.severity === "success").length,
    info: entries.filter((e) => e.severity === "info").length,
  };

  const filters: { value: FilterType; label: string }[] = [
    { value: "all", label: `All (${entries.length})` },
    { value: "danger", label: `Threats (${counts.danger})` },
    { value: "warning", label: `Warnings (${counts.warning})` },
    { value: "success", label: `Auth (${counts.success})` },
    { value: "info", label: `Activity (${counts.info})` },
  ];

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-primary" /> Security Log
              </SheetTitle>
              <SheetDescription className="mt-1">
                All security events for this device session
              </SheetDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={refresh}>
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={handleClear}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Summary pills */}
        <div className="px-6 pb-3 flex flex-wrap gap-2">
          {counts.danger > 0 && (
            <div className="flex items-center gap-1.5 text-xs bg-destructive/10 text-destructive border border-destructive/20 px-2.5 py-1 rounded-full">
              <ShieldAlert className="w-3 h-3" /> {counts.danger} threat{counts.danger !== 1 ? "s" : ""}
            </div>
          )}
          {counts.warning > 0 && (
            <div className="flex items-center gap-1.5 text-xs bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2.5 py-1 rounded-full">
              <AlertTriangle className="w-3 h-3" /> {counts.warning} warning{counts.warning !== 1 ? "s" : ""}
            </div>
          )}
          {entries.length === 0 && (
            <p className="text-xs text-muted-foreground">No events recorded yet.</p>
          )}
        </div>

        {/* Filter tabs */}
        <div className="px-6 pb-3 flex gap-1.5 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-muted-foreground self-center mr-0.5" />
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                filter === f.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground border-border hover:bg-accent"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <Separator />

        {/* Log entries */}
        <ScrollArea className="flex-1 px-4">
          <div className="py-3 space-y-1">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                <Info className="w-8 h-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No entries for this filter</p>
              </div>
            ) : (
              filtered.map((entry) => {
                const cfg = SEVERITY_CONFIG[entry.severity];
                return (
                  <div
                    key={entry.id}
                    className="flex gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex flex-col items-center gap-1 pt-0.5">
                      {cfg.icon}
                      <div className={`w-px flex-1 ${cfg.dot} opacity-20`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{entry.message}</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 h-4 font-mono ${cfg.badge}`}
                        >
                          {entry.type}
                        </Badge>
                      </div>
                      {entry.detail && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{entry.detail}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">
                        {format(entry.timestamp, "MMM d, yyyy — HH:mm:ss")}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
