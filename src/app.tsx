import { useState, useEffect, useCallback } from "react";
import { proxy } from "zite-endpoints-sdk";
import { encryptUrl } from "@/lib/cipher";
import { log as secLog } from "@/lib/securityLog";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2, ExternalLink, Shield, EyeOff, Globe,
  Lock, Settings, LogOut, MonitorSmartphone, ClipboardList,
} from "lucide-react";
import PasswordGate from "@/components/PasswordGate";
import SecuritySettings from "@/components/SecuritySettings";
import SecurityLog from "@/components/SecurityLog";
import InAppBrowser from "@/components/InAppBrowser";
import { usePanicKey, useAutoLock, getPanicUrl } from "@/hooks/useSecurity";
import { useDevToolsGuard, getDevToolsGuardEnabled } from "@/hooks/useDevToolsGuard";

// --- Disguise presets (title + favicon) ---
const DISGUISE_PRESETS = [
  { label: "Google",           icon: "https://www.google.com/favicon.ico",                           url: "https://google.com" },
  { label: "Google Classroom", icon: "https://ssl.gstatic.com/classroom/favicon.png",                url: "https://classroom.google.com" },
  { label: "Google Docs",      icon: "https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico", url: "https://docs.google.com" },
  { label: "Google Drive",     icon: "https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png", url: "https://drive.google.com" },
  { label: "Google Slides",    icon: "https://ssl.gstatic.com/docs/presentations/images/favicon5.ico", url: "https://slides.google.com" },
  { label: "YouTube",          icon: "https://www.youtube.com/favicon.ico",                           url: "https://youtube.com" },
  { label: "Khan Academy",     icon: "https://www.khanacademy.org/favicon.ico",                       url: "https://khanacademy.org" },
  { label: "Wikipedia",        icon: "https://en.wikipedia.org/favicon.ico",                          url: "https://en.wikipedia.org" },
  { label: "Desmos",           icon: "https://www.desmos.com/favicon.ico",                            url: "https://desmos.com" },
  { label: "Quizlet",          icon: "https://quizlet.com/favicon.ico",                               url: "https://quizlet.com" },
  { label: "Canvas",           icon: "https://du11hjcvx0uqb.cloudfront.net/dist/images/favicon-e10d657a73.ico", url: "https://instructure.com" },
  { label: "Schoology",        icon: "https://asset-cdn.schoology.com/sites/all/themes/schoology_theme/favicon.ico", url: "https://schoology.com" },
  { label: "Duolingo",         icon: "https://www.duolingo.com/favicon.ico",                          url: "https://duolingo.com" },
  { label: "Coolmathgames",    icon: "https://www.coolmathgames.com/favicon.ico",                     url: "https://coolmathgames.com" },
  { label: "Scratch",          icon: "https://scratch.mit.edu/favicon.ico",                           url: "https://scratch.mit.edu" },
  { label: "Code.org",         icon: "https://code.org/favicon.ico",                                  url: "https://code.org" },
];

function DisguisePicker({
  selectedLabel,
  onSelect,
}: {
  selectedLabel: string;
  onSelect: (label: string, icon: string) => void;
}) {
  return (
    <ScrollArea className="h-36 rounded-lg border border-border bg-muted/30">
      <div className="grid grid-cols-4 gap-1.5 p-2">
        {DISGUISE_PRESETS.map((p) => {
          const active = p.label === selectedLabel;
          return (
            <button
              key={p.label}
              onClick={() => onSelect(p.label, p.icon)}
              title={p.label}
              className={`flex flex-col items-center gap-1 px-1 py-2 rounded-lg border text-[10px] font-medium transition-colors ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-transparent hover:border-border hover:bg-accent text-muted-foreground"
              }`}
            >
              <img
                src={p.icon}
                alt={p.label}
                className="w-5 h-5 object-contain"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
              <span className="truncate w-full text-center leading-tight">{p.label}</span>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}

function MainApp({ onLock }: { onLock: () => void }) {
  const [url, setUrl] = useState("");
  const [tabTitle, setTabTitle] = useState("Google Classroom");
  const [tabIcon, setTabIcon] = useState("https://ssl.gstatic.com/classroom/favicon.png");
  const [loading, setLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [view, setView] = useState<"launcher" | "browser">("launcher");

  const [devToolsGuardEnabled] = useState(() => getDevToolsGuardEnabled());

  const panic = useCallback(() => {
    sessionStorage.removeItem("tabcloak_auth");
    window.location.href = getPanicUrl();
  }, []);

  usePanicKey(panic);
  useAutoLock(onLock);
  useDevToolsGuard(devToolsGuardEnabled);

  const openCloakedTab = async () => {
    if (!url.trim()) { toast.error("Please enter a URL first"); return; }
    setLoading(true);
    try {
      const result = await proxy({ enc: await encryptUrl(url) });
      const newTab = window.open("about:blank", "_blank");
      if (!newTab) {
        toast.error("Popup blocked — please allow popups for this site");
        setLoading(false);
        return;
      }
      secLog.tabLaunched(tabTitle);
      const escaped = result.content.replace(/"/g, "&quot;");
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${tabTitle}</title>
  <link rel="icon" href="${tabIcon}" type="image/x-icon">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    iframe { width: 100%; height: 100%; border: none; display: block; }
  </style>
</head>
<body><iframe srcdoc="${escaped}"></iframe></body>
</html>`;
      newTab.document.open();
      newTab.document.write(html);
      newTab.document.close();
      toast.success("Cloaked tab opened!");
    } catch {
      toast.error("Failed to load URL. Try a different site.");
    }
    setLoading(false);
  };

  return (
    <TooltipProvider>
      <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b border-border px-4 sm:px-6 py-3 flex items-center gap-3 shrink-0">
          <Shield className="w-5 h-5 text-primary" />
          <span className="text-lg font-bold tracking-tight">TabCloak</span>
          <Badge variant="secondary" className="ml-1 hidden sm:inline-flex">Stealth</Badge>

          {/* View Switcher */}
          <Tabs value={view} onValueChange={(v) => setView(v as "launcher" | "browser")} className="mx-auto">
            <TabsList className="h-8">
              <TabsTrigger value="launcher" className="text-xs px-3 h-6">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Launcher
              </TabsTrigger>
              <TabsTrigger value="browser" className="text-xs px-3 h-6">
                <MonitorSmartphone className="w-3.5 h-3.5 mr-1.5" /> Browser
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-2.5" onClick={() => setLogOpen(true)}>
                  <ClipboardList className="w-3.5 h-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline text-xs">Log</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Security event log</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-2.5" onClick={() => setSettingsOpen(true)}>
                  <Settings className="w-3.5 h-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline text-xs">Security</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Security settings</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-2.5" onClick={() => { secLog.manualLock(); onLock(); }}>
                  <Lock className="w-3.5 h-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline text-xs">Lock</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Lock session</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="destructive" size="sm" className="h-8 px-2.5" onClick={panic}>
                  <LogOut className="w-3.5 h-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline text-xs">Panic</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Instantly flee (double-press panic key)</TooltipContent>
            </Tooltip>
          </div>
        </header>

        {/* Views */}
        {view === "launcher" && (
          <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 gap-8 overflow-y-auto">
            <div className="text-center max-w-lg">
              <h1 className="text-4xl font-bold mb-3 tracking-tight">Tab Cloaker</h1>
              <p className="text-muted-foreground text-base">
                Open any website in a disguised{" "}
                <code className="bg-muted px-1 rounded text-sm">about:blank</code> tab,
                bypassing X-Frame restrictions via server-side proxy.
              </p>
            </div>

            <div className="w-full max-w-xl bg-card border border-border rounded-2xl p-6 shadow-lg space-y-5">
              {/* URL */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" /> Target URL
                </label>
                <Input
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && openCloakedTab()}
                />
              </div>

              {/* Disguise picker */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <EyeOff className="w-4 h-4 text-primary" /> Tab Disguise
                  <span className="text-xs text-muted-foreground font-normal ml-auto">
                    Selected: <span className="text-foreground font-medium">{tabTitle}</span>
                  </span>
                </label>
                <DisguisePicker
                  selectedLabel={tabTitle}
                  onSelect={(label, icon) => { setTabTitle(label); setTabIcon(icon); }}
                />
              </div>

              {/* Manual overrides */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Custom title override</label>
                  <Input
                    placeholder="Tab Title"
                    value={tabTitle}
                    onChange={(e) => setTabTitle(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Custom favicon URL</label>
                  <Input
                    placeholder="https://…/favicon.ico"
                    value={tabIcon}
                    onChange={(e) => setTabIcon(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              <Button className="w-full" size="lg" onClick={openCloakedTab} disabled={loading}>
                {loading
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading...</>
                  : <><ExternalLink className="w-4 h-4 mr-2" /> Open Cloaked Tab</>
                }
              </Button>
            </div>

            <div className="flex flex-wrap justify-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full border border-border">
                <Shield className="w-3.5 h-3.5 text-primary" /> XFrame bypass via proxy
              </div>
              <div className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full border border-border">
                <EyeOff className="w-3.5 h-3.5 text-primary" /> about:blank URL cloaking
              </div>
              <div className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full border border-border">
                <Globe className="w-3.5 h-3.5 text-primary" /> Custom tab title & icon
              </div>
            </div>
          </main>
        )}

        {view === "browser" && (
          <div className="flex-1 min-h-0">
            <InAppBrowser />
          </div>
        )}
      </div>

      <SecuritySettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <SecurityLog open={logOpen} onClose={() => setLogOpen(false)} />
    </TooltipProvider>
  );
}

export default function App() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem("tabcloak_auth") === "true");

  useEffect(() => {
    if (sessionStorage.getItem("tabcloak_auth") === "true") setUnlocked(true);
  }, []);

  const handleLock = useCallback(() => {
    sessionStorage.removeItem("tabcloak_auth");
    setUnlocked(false);
    toast("Session locked");
  }, []);

  return (
    <>
      <Toaster />
      {unlocked
        ? <MainApp onLock={handleLock} />
        : <PasswordGate onUnlock={() => setUnlocked(true)} />
      }
    </>
  );
}
