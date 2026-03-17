import { useState, useRef, useCallback, useEffect } from "react";
import { proxy, ProxyOutputType } from "zite-endpoints-sdk";
import { encryptUrl } from "@/lib/cipher";
import { log as secLog } from "@/lib/securityLog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, RotateCcw, Home, Search,
  Loader2, X, Globe, Plus, WifiOff, ShieldX,
  Clock, KeyRound, ServerCrash, FileX, AlertTriangle,
  EyeOff, ExternalLink, Zap,
} from "lucide-react";

interface BrowserTab {
  id: string;
  url: string;
  title: string;
  content: string | null;
  loading: boolean;
  errorReason: string | null;
  isJsHeavy?: boolean;
}

const HOME_URL = "https://google.com";
const HIDDEN_DISPLAY = "about:blank";

const ERROR_META: Record<string, { icon: React.ReactNode; title: string; detail: string; tip?: string }> = {
  DNS_FAILURE:   { icon: <WifiOff className="w-7 h-7 text-destructive" />,     title: "Site Not Found",          detail: "The domain doesn't exist or couldn't be resolved.",        tip: "Check the URL spelling." },
  TIMEOUT:       { icon: <Clock className="w-7 h-7 text-destructive" />,       title: "Connection Timed Out",    detail: "The site took too long to respond.",                         tip: "Try again or check your connection." },
  SSL_ERROR:     { icon: <ShieldX className="w-7 h-7 text-destructive" />,     title: "SSL / Certificate Error", detail: "The site has an invalid or expired security certificate.",  tip: "Try the http:// version instead." },
  BLOCKED_403:   { icon: <ShieldX className="w-7 h-7 text-destructive" />,     title: "Access Forbidden",        detail: "The site blocked the proxy request (403 Forbidden).",       tip: "Some sites actively detect and block proxies." },
  AUTH_REQUIRED: { icon: <KeyRound className="w-7 h-7 text-destructive" />,    title: "Login Required",          detail: "The site requires authentication before loading.",           tip: "You may need to log in on the real site first." },
  RATE_LIMITED:  { icon: <Clock className="w-7 h-7 text-destructive" />,       title: "Rate Limited",            detail: "Too many requests — the site is throttling access.",         tip: "Wait a moment and try again." },
  SERVER_ERROR:  { icon: <ServerCrash className="w-7 h-7 text-destructive" />, title: "Server Error",            detail: "The site returned a 5xx error — it may be down.",            tip: "Try again later." },
  NOT_FOUND:     { icon: <FileX className="w-7 h-7 text-destructive" />,       title: "Page Not Found",          detail: "The page returned a 404 — it may have moved or been deleted." },
  NETWORK_ERROR: { icon: <WifiOff className="w-7 h-7 text-destructive" />,     title: "Network Error",           detail: "Could not connect to the site.",                             tip: "Check the URL and try again." },
};

function newTab(url = ""): BrowserTab {
  return { id: Math.random().toString(36).slice(2), url, title: "New Tab", content: null, loading: false, errorReason: null };
}

async function openAsCloakedTab(url: string) {
  try {
    const result = await proxy({ enc: await encryptUrl(url) });
    if (result.errorReason || !result.content) { toast.error("Failed to open cloaked tab"); return; }
    const newTab = window.open("about:blank", "_blank");
    if (!newTab) { toast.error("Popup blocked — allow popups for this site"); return; }
    const escaped = result.content.replace(/"/g, "&quot;");
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Google</title>
<style>*{margin:0;padding:0;box-sizing:border-box;}html,body{width:100%;height:100%;overflow:hidden;}iframe{width:100%;height:100%;border:none;display:block;}</style>
</head><body><iframe srcdoc="${escaped}"></iframe></body></html>`;
    newTab.document.open(); newTab.document.write(html); newTab.document.close();
    toast.success("Opened as cloaked tab!");
  } catch { toast.error("Failed to open cloaked tab"); }
}

function JsHeavyBanner({ url }: { url: string }) {
  const [dismissed, setDismissed] = useState(false);
  const [opening, setOpening] = useState(false);
  if (dismissed) return null;
  const handleOpen = async () => {
    setOpening(true);
    await openAsCloakedTab(url);
    setOpening(false);
  };
  return (
    <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 bg-yellow-500/10 border-b border-yellow-500/20 text-xs">
      <Zap className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
      <span className="text-yellow-500/90 flex-1">
        This site uses heavy JavaScript and may not display correctly in the in-app browser.
      </span>
      <Button size="sm" variant="outline" className="h-6 px-2 text-xs border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10" onClick={handleOpen} disabled={opening}>
        {opening ? <Loader2 className="w-3 h-3 animate-spin" /> : <><ExternalLink className="w-3 h-3 mr-1" />Cloaked Tab</>}
      </Button>
      <button onClick={() => setDismissed(true)} className="text-yellow-500/50 hover:text-yellow-500 transition-colors">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function ErrorPage({ reason, url, onRetry }: { reason: string; url: string; onRetry: () => void }) {
  const [opening, setOpening] = useState(false);
  const meta = ERROR_META[reason] ?? {
    icon: <AlertTriangle className="w-7 h-7 text-destructive" />,
    title: "Failed to Load",
    detail: "An unknown error occurred while loading this page.",
  };
  const handleCloaked = async () => {
    setOpening(true);
    await openAsCloakedTab(url);
    setOpening(false);
  };
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 text-center px-8">
      <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
        {meta.icon}
      </div>
      <div className="space-y-1.5 max-w-sm">
        <p className="text-lg font-semibold">{meta.title}</p>
        <p className="text-sm text-muted-foreground">{meta.detail}</p>
        {meta.tip && (
          <p className="text-xs text-muted-foreground/70 mt-2">
            <span className="font-medium text-primary">Tip:</span> {meta.tip}
          </p>
        )}
      </div>
      <Badge variant="secondary" className="font-mono text-xs text-destructive border-destructive/20">{reason}</Badge>
      <div className="flex gap-2 flex-wrap justify-center">
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Retry
        </Button>
        <Button variant="outline" size="sm" onClick={handleCloaked} disabled={opening}>
          {opening ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5 mr-1.5" />}
          Try as Cloaked Tab
        </Button>
      </div>
    </div>
  );
}

export default function InAppBrowser() {
  const [tabs, setTabs] = useState<BrowserTab[]>([newTab()]);
  const [activeId, setActiveId] = useState(tabs[0].id);
  const [addressBar, setAddressBar] = useState("");
  const [addressFocused, setAddressFocused] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeTab = tabs.find((t) => t.id === activeId) ?? tabs[0];

  useEffect(() => {
    setAddressBar(activeTab.url);
  }, [activeId, activeTab.url]);

  const updateTab = useCallback((id: string, patch: Partial<BrowserTab>) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const navigate = useCallback(async (rawUrl: string, tabId?: string) => {
    const id = tabId ?? activeId;
    let url = rawUrl.trim();
    if (!url || url === HIDDEN_DISPLAY) return;

    if (!/^https?:\/\//i.test(url)) {
      if (/\s/.test(url) || !url.includes(".")) {
        url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
      } else {
        url = "https://" + url;
      }
    }

    updateTab(id, { url, loading: true, errorReason: null, title: "Loading…", isJsHeavy: false });
    inputRef.current?.blur();
    setAddressBar(url);

    setHistory((h) => {
      const trimmed = h.slice(0, historyIdx + 1);
      const next = [...trimmed, url];
      setHistoryIdx(next.length - 1);
      return next;
    });

    try {
      secLog.browserNav(url);
      const result: ProxyOutputType = await proxy({ enc: await encryptUrl(url) });

      if (result.errorReason) {
        updateTab(id, { loading: false, errorReason: result.errorReason, content: null, isJsHeavy: result.isJsHeavy });
        return;
      }

      const titleMatch = result.content.match(/<title[^>]*>([^<]*)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() || "Page" : "Page";
      const finalUrl = (result.finalUrl && result.finalUrl !== url) ? result.finalUrl : url;
      setAddressBar(finalUrl);
      updateTab(id, { url: finalUrl, content: result.content, loading: false, title, isJsHeavy: result.isJsHeavy });
    } catch {
      updateTab(id, { loading: false, errorReason: "NETWORK_ERROR", content: null });
      toast.error("Failed to load page");
    }
  }, [activeId, historyIdx, updateTab]);

  const handleAddressSubmit = (e: React.FormEvent) => { e.preventDefault(); navigate(addressBar); };

  const handleAddressFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setAddressFocused(true);
    setAddressBar(activeTab.url);
    setTimeout(() => e.target.select(), 0);
  };

  const handleAddressBlur = () => {
    setAddressFocused(false);
    setAddressBar(activeTab.url);
  };

  const goBack = () => {
    if (historyIdx <= 0) return;
    const i = historyIdx - 1; setHistoryIdx(i); navigate(history[i]);
  };
  const goForward = () => {
    if (historyIdx >= history.length - 1) return;
    const i = historyIdx + 1; setHistoryIdx(i); navigate(history[i]);
  };
  const reload = () => { if (activeTab.url) navigate(activeTab.url); };
  const goHome = () => navigate(HOME_URL);

  const addTab = () => {
    const t = newTab();
    setTabs((prev) => [...prev, t]);
    setActiveId(t.id);
    setHistory([]); setHistoryIdx(-1);
  };

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) { setTabs([newTab()]); return; }
    const idx = tabs.findIndex((t) => t.id === id);
    const remaining = tabs.filter((t) => t.id !== id);
    setTabs(remaining);
    if (id === activeId) setActiveId(remaining[Math.min(idx, remaining.length - 1)].id);
  };

  const quickLinks = [
    { label: "Google",        url: "https://google.com",        icon: "🔍" },
    { label: "YouTube",       url: "https://youtube.com",       icon: "▶️" },
    { label: "Wikipedia",     url: "https://en.wikipedia.org",  icon: "📖" },
    { label: "Khan Academy",  url: "https://khanacademy.org",   icon: "🎓" },
    { label: "Coolmathgames", url: "https://coolmathgames.com", icon: "🎮" },
  ];

  const canBack = historyIdx > 0;
  const canForward = historyIdx < history.length - 1;
  const displayValue = addressFocused ? addressBar : (activeTab.content || activeTab.errorReason ? HIDDEN_DISPLAY : "");

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-2 pt-2 bg-card border-b border-border overflow-x-auto shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveId(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-medium max-w-[160px] min-w-[80px] transition-colors shrink-0 group ${
              tab.id === activeId
                ? "bg-background text-foreground border border-b-background border-border"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {tab.loading ? <Loader2 className="w-3 h-3 animate-spin shrink-0" />
              : tab.errorReason ? <AlertTriangle className="w-3 h-3 shrink-0 text-destructive" />
              : <Globe className="w-3 h-3 shrink-0 opacity-60" />}
            <span className="truncate flex-1 text-left">{tab.loading ? "Loading…" : tab.title || "New Tab"}</span>
            <span onClick={(e) => closeTab(tab.id, e)} className="opacity-0 group-hover:opacity-100 hover:text-destructive ml-0.5 rounded p-0.5 transition-opacity cursor-pointer">
              <X className="w-3 h-3" />
            </span>
          </button>
        ))}
        <button onClick={addTab} className="flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0 mb-0.5">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-card border-b border-border shrink-0">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goBack} disabled={!canBack}><ArrowLeft className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goForward} disabled={!canForward}><ArrowRight className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={reload} disabled={activeTab.loading}>
            {activeTab.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goHome}><Home className="w-4 h-4" /></Button>
        </div>
        <form onSubmit={handleAddressSubmit} className="flex-1">
          <div className="relative">
            {addressFocused
              ? <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              : <EyeOff className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none" />}
            <Input
              ref={inputRef}
              value={displayValue}
              onChange={(e) => addressFocused && setAddressBar(e.target.value)}
              onFocus={handleAddressFocus}
              onBlur={handleAddressBlur}
              placeholder="Search or enter URL…"
              className={`pl-8 h-8 text-sm font-mono border-transparent focus-visible:bg-background transition-colors ${
                addressFocused ? "bg-background" : "bg-muted text-muted-foreground/60 cursor-default"
              }`}
            />
          </div>
        </form>
      </div>

      {/* JS-heavy site warning banner */}
      {activeTab.isJsHeavy && activeTab.content && (
        <JsHeavyBanner url={activeTab.url} />
      )}

      {/* Content */}
      <div className="flex-1 relative overflow-hidden min-h-0">
        {activeTab.loading && (
          <div className="absolute inset-0 bg-background z-10 p-6 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}

        {!activeTab.loading && activeTab.errorReason && (
          <ErrorPage reason={activeTab.errorReason} url={activeTab.url} onRetry={reload} />
        )}

        {!activeTab.loading && !activeTab.errorReason && !activeTab.content && (
          <div className="flex flex-col items-center justify-center h-full gap-6 px-8">
            <div className="text-center">
              <Globe className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-lg font-semibold">New Tab</p>
              <p className="text-sm text-muted-foreground mt-1">Search or enter a URL above</p>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 w-full max-w-md">
              {quickLinks.map((q) => (
                <button key={q.url} onClick={() => navigate(q.url)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border bg-card hover:bg-accent transition-colors text-xs font-medium">
                  <span className="text-2xl">{q.icon}</span>
                  <span className="text-muted-foreground truncate w-full text-center">{q.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {!activeTab.loading && !activeTab.errorReason && activeTab.content && (
          <iframe
            ref={iframeRef}
            srcDoc={activeTab.content}
            className="w-full h-full border-none"
            sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            title="browser"
          />
        )}
      </div>
    </div>
  );
}
