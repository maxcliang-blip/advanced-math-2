import { useState, useEffect, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  saveSecuritySettings,
  getPanicKey,
  getPanicUrl,
  getAutoLockMins,
  DEFAULT_PANIC_KEY,
  DEFAULT_PANIC_URL,
  DEFAULT_AUTO_LOCK_MINS,
} from "@/hooks/useSecurity";
import {
  getDevToolsGuardEnabled,
  setDevToolsGuardEnabled,
} from "@/hooks/useDevToolsGuard";
import { Keyboard, Timer, ExternalLink, CheckCircle2, Info, Code } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SecuritySettings({ open, onClose }: Props) {
  const [panicKey, setPanicKey] = useState(DEFAULT_PANIC_KEY);
  const [panicUrl, setPanicUrl] = useState(DEFAULT_PANIC_URL);
  const [autoLockMins, setAutoLockMins] = useState(String(DEFAULT_AUTO_LOCK_MINS));
  const [devToolsGuard, setDevToolsGuard] = useState(false);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    if (open) {
      setPanicKey(getPanicKey());
      setPanicUrl(getPanicUrl());
      setAutoLockMins(String(getAutoLockMins()));
      setDevToolsGuard(getDevToolsGuardEnabled());
    }
  }, [open]);

  const handleKeyRecord = useCallback((e: React.KeyboardEvent) => {
    if (!recording) return;
    e.preventDefault();
    const modifiers: string[] = [];
    if (e.ctrlKey) modifiers.push("Control");
    if (e.altKey) modifiers.push("Alt");
    if (e.shiftKey) modifiers.push("Shift");
    const key = e.key === " " ? "Space" : e.key;
    const combo = [...modifiers, key].join("+");
    setPanicKey(combo);
    setRecording(false);
  }, [recording]);

  const handleSave = () => {
    const mins = parseInt(autoLockMins, 10);
    if (isNaN(mins) || mins < 0) {
      toast.error("Auto-lock must be a valid number (0 to disable)");
      return;
    }
    saveSecuritySettings(panicKey, panicUrl, mins);
    setDevToolsGuardEnabled(devToolsGuard);
    toast.success("Security settings saved");
    onClose();
  };

  const labelClass = "text-sm font-medium flex items-center gap-2";
  const descClass = "text-xs text-muted-foreground mt-0.5";

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Security Settings</SheetTitle>
          <SheetDescription>Configure panic key, auto-lock, and escape destination.</SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* Panic Key */}
          <div className="space-y-3">
            <div>
              <Label className={labelClass}><Keyboard className="w-4 h-4 text-primary" /> Panic Key</Label>
              <p className={descClass}>Press this key twice quickly to instantly flee to the escape URL.</p>
            </div>
            <div className="flex gap-2 items-center">
              <div
                className={`flex-1 flex items-center justify-between px-3 py-2 rounded-lg border text-sm font-mono cursor-pointer transition-colors ${recording ? "border-primary bg-primary/5 animate-pulse" : "border-border bg-muted"}`}
                onClick={() => setRecording(true)}
                onKeyDown={handleKeyRecord}
                tabIndex={0}
              >
                <span>{recording ? "Press any key…" : panicKey}</span>
                {!recording && <Badge variant="secondary" className="text-xs">Click to change</Badge>}
              </div>
              <Button variant="outline" size="sm" onClick={() => { setPanicKey(DEFAULT_PANIC_KEY); setRecording(false); }}>
                Reset
              </Button>
            </div>
          </div>

          <Separator />

          {/* Panic URL */}
          <div className="space-y-3">
            <div>
              <Label className={labelClass}><ExternalLink className="w-4 h-4 text-primary" /> Escape URL</Label>
              <p className={descClass}>Where to redirect when the panic key is pressed.</p>
            </div>
            <Input
              value={panicUrl}
              onChange={(e) => setPanicUrl(e.target.value)}
              placeholder="https://classroom.google.com"
            />
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Google Classroom", url: "https://classroom.google.com" },
                { label: "Google Docs", url: "https://docs.google.com" },
                { label: "Khan Academy", url: "https://khanacademy.org" },
              ].map((p) => (
                <button
                  key={p.label}
                  onClick={() => setPanicUrl(p.url)}
                  className={`px-2.5 py-1 rounded-md border text-xs transition-colors ${panicUrl === p.url ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted hover:bg-accent"}`}
                >
                  {panicUrl === p.url && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Auto-lock */}
          <div className="space-y-3">
            <div>
              <Label className={labelClass}><Timer className="w-4 h-4 text-primary" /> Auto-Lock</Label>
              <p className={descClass}>Lock the app after this many minutes of inactivity. Set to 0 to disable.</p>
            </div>
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                min="0"
                max="120"
                value={autoLockMins}
                onChange={(e) => setAutoLockMins(e.target.value)}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">minutes</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {["0", "5", "10", "15", "30"].map((v) => (
                <button
                  key={v}
                  onClick={() => setAutoLockMins(v)}
                  className={`px-2.5 py-1 rounded-md border text-xs transition-colors ${autoLockMins === v ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted hover:bg-accent"}`}
                >
                  {v === "0" ? "Off" : `${v}m`}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* DevTools Guard */}
          <div className="flex items-start justify-between gap-4 py-1">
            <div className="space-y-1">
              <Label className={labelClass}><Code className="w-4 h-4 text-primary" /> Block DevTools</Label>
              <p className={descClass}>
                Disables F12, Ctrl+Shift+I, right-click, and detects DevTools window — logs user out if opened.
              </p>
            </div>
            <Switch
              checked={devToolsGuard}
              onCheckedChange={setDevToolsGuard}
              className="shrink-0 mt-1"
            />
          </div>

          <Separator />

          {/* Info */}
          <div className="bg-muted/50 border border-border rounded-lg p-3 flex gap-2 text-xs text-muted-foreground">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
            <span>Brute-force protection: after <strong>5 failed attempts</strong>, access is locked for <strong>30 seconds</strong>. After <strong>3 lockouts</strong>, a decoy 404 page is shown.</span>
          </div>

          <Button className="w-full" onClick={handleSave}>Save Settings</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
