export type LogSeverity = "info" | "warning" | "danger" | "success";

export interface LogEntry {
  id: string;
  timestamp: number;
  type: string;
  message: string;
  severity: LogSeverity;
  detail?: string;
}

const STORAGE_KEY = "tabcloak_security_log";
const MAX_ENTRIES = 200;

export function getLog(): LogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addLog(entry: Omit<LogEntry, "id" | "timestamp">) {
  const entries = getLog();
  const newEntry: LogEntry = {
    ...entry,
    id: Math.random().toString(36).slice(2),
    timestamp: Date.now(),
  };
  const trimmed = [newEntry, ...entries].slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {}
}

export function clearLog() {
  localStorage.removeItem(STORAGE_KEY);
}

// Convenience helpers
export const log = {
  authSuccess: () => addLog({ type: "AUTH", message: "Successful login", severity: "success" }),
  authFail: (attemptsLeft: number) =>
    addLog({ type: "AUTH", message: `Failed login attempt`, detail: `${attemptsLeft} attempt(s) remaining`, severity: "warning" }),
  lockout: (lockoutNum: number) =>
    addLog({ type: "LOCKOUT", message: `Account locked out`, detail: `Lockout #${lockoutNum} of 3 — 30s cooldown`, severity: "danger" }),
  decoy: () =>
    addLog({ type: "DECOY", message: "Decoy 404 page displayed", detail: "Max lockouts exceeded", severity: "danger" }),
  panic: (url: string) =>
    addLog({ type: "PANIC", message: "Panic key triggered", detail: `Redirected to ${url}`, severity: "danger" }),
  autoLock: () =>
    addLog({ type: "AUTO_LOCK", message: "Session auto-locked due to inactivity", severity: "warning" }),
  manualLock: () =>
    addLog({ type: "LOCK", message: "Session manually locked", severity: "info" }),
  tabLaunched: (disguise: string) =>
    addLog({ type: "LAUNCH", message: "Cloaked tab opened", detail: `Disguised as "${disguise}"`, severity: "info" }),
  browserNav: (url: string) =>
    addLog({ type: "BROWSER", message: "In-app browser navigation", detail: url.slice(0, 80), severity: "info" }),
};
