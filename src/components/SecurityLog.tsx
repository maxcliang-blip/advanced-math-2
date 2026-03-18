"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Trash2, AlertTriangle, CheckCircle, Info, AlertCircle as AlertIcon } from "lucide-react";

export type LogSeverity = "success" | "info" | "warning" | "danger";

export interface LogEntry {
  id: string;
  type: string;
  message: string;
  severity: LogSeverity;
  timestamp: number;
  detail?: string;
}

const SEVERITY_CONFIG: Record<LogSeverity, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
  success: { color: "text-green-600", bg: "bg-green-100", border: "border-green-200", icon: <CheckCircle className="w-4 h-4" /> },
  info: { color: "text-blue-600", bg: "bg-blue-100", border: "border-blue-200", icon: <Info className="w-4 h-4" /> },
  warning: { color: "text-yellow-600", bg: "bg-yellow-100", border: "border-yellow-200", icon: <AlertTriangle className="w-4 h-4" /> },
  danger: { color: "text-red-600", bg: "bg-red-100", border: "border-red-200", icon: <AlertIcon className="w-4 h-4" /> },
};

type FilterType = "all" | LogSeverity;

interface Props {
  open: boolean;
  onClose: () => void;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", { 
    month: "short", day: "numeric", year: "numeric", 
    hour: "2-digit", minute: "2-digit", second: "2-digit" 
  });
}

export default function SecurityLog({ open, onClose }: Props) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");

  const getLog = (): LogEntry[] => {
    try {
      const stored = sessionStorage.getItem("security_log");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const refresh = () => setEntries(getLog());

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  const handleClear = () => {
    sessionStorage.removeItem("security_log");
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-[550px] max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <AlertIcon className="w-5 h-5 text-blue-500" />
              Security Log
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              All security events for this device session
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={refresh} className="p-2 border border-gray-200 rounded-md bg-white hover:bg-gray-50">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={handleClear} className="p-2 border border-red-300 rounded-md bg-red-50 text-red-600 hover:bg-red-100">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {counts.danger > 0 && (
            <div className="flex items-center gap-1.5 text-xs bg-red-100 text-red-600 border border-red-200 px-2.5 py-1 rounded-full">
              <AlertIcon className="w-3 h-3" />
              {counts.danger} threat{counts.danger !== 1 ? "s" : ""}
            </div>
          )}
          {counts.warning > 0 && (
            <div className="flex items-center gap-1.5 text-xs bg-yellow-100 text-yellow-700 border border-yellow-200 px-2.5 py-1 rounded-full">
              <AlertTriangle className="w-3 h-3" />
              {counts.warning} warning{counts.warning !== 1 ? "s" : ""}
            </div>
          )}
          {entries.length === 0 && (
            <p className="text-xs text-gray-400">No events recorded yet.</p>
          )}
        </div>

        <div className="flex gap-1.5 flex-wrap mb-4">
          <span className="text-xs text-gray-400 self-center mr-1">Filter:</span>
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                filter === f.value 
                  ? "bg-blue-500 text-white border border-blue-500" 
                  : "border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="border-t border-gray-200 mb-4" />

        <div className="flex-1 overflow-y-auto px-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <Info className="w-8 h-8 text-gray-300" />
              <p className="text-sm text-gray-400">No entries for this filter</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filtered.map((entry) => {
                const cfg = SEVERITY_CONFIG[entry.severity];
                return (
                  <div
                    key={entry.id}
                    className="flex gap-3 p-2.5 rounded-lg bg-gray-50"
                  >
                    <div className={`flex-shrink-0 ${cfg.color}`}>
                      {cfg.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{entry.message}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                          {entry.type}
                        </span>
                      </div>
                      {entry.detail && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{entry.detail}</p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-1 font-mono">
                        {formatDate(entry.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
