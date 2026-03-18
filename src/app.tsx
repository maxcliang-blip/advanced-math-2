"use client";

import { useState, useEffect, useCallback } from "react";
import { Shield, Lock, Settings, FileText, Globe, RefreshCw, ExternalLink } from "lucide-react";
import PasswordGate from "./components/PasswordGate";
import SecuritySettings from "./components/SecuritySettings";
import SecurityLog from "./components/SecurityLog";

const DISGUISE_PRESETS = [
  { label: "Google", icon: "https://www.google.com/favicon.ico", url: "https://google.com" },
  { label: "Google Classroom", icon: "https://ssl.gstatic.com/classroom/favicon.png", url: "https://classroom.google.com" },
  { label: "Google Docs", icon: "https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico", url: "https://docs.google.com" },
  { label: "Google Drive", icon: "https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png", url: "https://drive.google.com" },
  { label: "YouTube", icon: "https://www.youtube.com/favicon.ico", url: "https://youtube.com" },
  { label: "Khan Academy", icon: "https://www.khanacademy.org/favicon.ico", url: "https://khanacademy.org" },
  { label: "Wikipedia", icon: "https://en.wikipedia.org/favicon.ico", url: "https://en.wikipedia.org" },
  { label: "Desmos", icon: "https://www.desmos.com/favicon.ico", url: "https://desmos.com" },
];

function DisguisePicker({
  selectedLabel,
  onSelect,
}: {
  selectedLabel: string;
  onSelect: (label: string, icon: string, url: string) => void;
}) {
  return (
    <div className="h-[140px] overflow-y-auto border border-gray-200 rounded-lg p-2 bg-gray-50">
      <div className="grid grid-cols-4 gap-1.5">
        {DISGUISE_PRESETS.map((p) => {
          const active = p.label === selectedLabel;
          return (
            <button
              key={p.label}
              onClick={() => onSelect(p.label, p.icon, p.url)}
              title={p.label}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg border cursor-pointer text-xs font-medium transition-colors ${
                active ? "border-blue-500 bg-blue-50 text-blue-600" : "border-transparent hover:bg-gray-100 text-gray-600"
              }`}
            >
              <img
                src={p.icon}
                alt={p.label}
                className="w-5 h-5 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <span className="overflow-hidden text-ellipsis whitespace-nowrap w-full text-center leading-tight">{p.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BrowserFrame({ url, disguise }: { url: string; disguise: { title: string; icon: string } }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
  }, [url]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white">
      <div className="h-10 bg-gray-100 border-b flex items-center px-3 gap-2 shrink-0">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 bg-white rounded-md h-6 px-2 flex items-center text-xs text-gray-500 gap-2 mx-2">
          <img src={disguise.icon} alt="" className="w-4 h-4" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <span className="truncate">{disguise.title}</span>
        </div>
      </div>
      
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        )}
        {!url && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Globe className="w-12 h-12 mx-auto mb-2" />
              <p>Enter a URL to browse privately</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MainApp({ onLock }: { onLock: () => void }) {
  const [url, setUrl] = useState("");
  const [activeUrl, setActiveUrl] = useState("");
  const [tabTitle, setTabTitle] = useState("Google Classroom");
  const [tabIcon, setTabIcon] = useState("https://ssl.gstatic.com/classroom/favicon.png");
  const [loading, setLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);
  const [panicMode, setPanicMode] = useState(false);

  const showMessage = (text: string, type: "error" | "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handlePanic = useCallback(() => {
    setPanicMode(true);
    setTimeout(() => {
      sessionStorage.removeItem("private_browser_auth");
      window.location.href = "https://google.com";
    }, 100);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handlePanic();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePanic]);

  const openCloakedTab = async () => {
    if (!url.trim()) { showMessage("Please enter a URL first", "error"); return; }
    
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = "https://" + normalizedUrl;
    }
    
    setLoading(true);
    try {
      const response = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl }),
      });
      
      if (!response.ok) throw new Error("Proxy request failed");
      
      setActiveUrl(normalizedUrl);
      showMessage("Private tab opened!", "success");
    } catch {
      showMessage("Failed to load URL. Try a different site.", "error");
    }
    setLoading(false);
  };

  if (panicMode) {
    return null;
  }

  return (
    <div className="h-screen bg-white text-gray-800 flex flex-col overflow-hidden">
      <header className="border-b border-gray-200 py-3 px-4 flex items-center gap-3 shrink-0">
        <span className="text-lg font-bold flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-500" />
          Private Browser
        </span>
        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">Stealth</span>
        
        <div className="ml-auto flex gap-2">
          <button onClick={() => setLogOpen(true)} className="px-3 py-1.5 text-xs border border-gray-200 rounded bg-white hover:bg-gray-50 flex items-center gap-1">
            <FileText className="w-3 h-3" /> Log
          </button>
          <button onClick={() => setSettingsOpen(true)} className="px-3 py-1.5 text-xs border border-gray-200 rounded bg-white hover:bg-gray-50 flex items-center gap-1">
            <Settings className="w-3 h-3" /> Security
          </button>
          <button onClick={onLock} className="px-3 py-1.5 text-xs border border-gray-200 rounded bg-white hover:bg-gray-50 flex items-center gap-1">
            <Lock className="w-3 h-3" /> Lock
          </button>
          <button onClick={handlePanic} className="px-3 py-1.5 text-xs border border-red-300 rounded bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-1">
            <ExternalLink className="w-3 h-3" /> Panic
          </button>
        </div>
      </header>

      {message && (
        <div className={`fixed top-16 right-5 px-4 py-2.5 rounded-lg shadow-lg z-50 text-sm ${
          message.type === "error" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
        }`}>
          {message.text}
        </div>
      )}

      <main className="flex-1 flex flex-col items-center justify-center p-8 gap-8 overflow-y-auto">
        <div className="text-center max-w-[400px]">
          <h1 className="text-4xl font-bold mb-3">Private Browser</h1>
          <p className="text-gray-500 text-base">
            Browse privately with a disguised interface. Your activity is hidden from prying eyes.
          </p>
        </div>

        <div className="w-full max-w-[500px] bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
          <div className="mb-5">
            <label className="text-sm font-medium block mb-2 flex items-center gap-1">
              <Globe className="w-4 h-4" /> Target URL
            </label>
            <input
              type="text"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && openCloakedTab()}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-5">
            <label className="text-sm font-medium block mb-2 flex items-center justify-between">
              <span>Tab Disguise</span>
              <span className="text-xs text-gray-500 font-normal">
                Selected: <span className="font-semibold">{tabTitle}</span>
              </span>
            </label>
            <DisguisePicker
              selectedLabel={tabTitle}
              onSelect={(label, icon) => { setTabTitle(label); setTabIcon(icon); }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div>
              <label className="text-xs text-gray-500 block mb-1.5">Custom title</label>
              <input
                type="text"
                placeholder="Tab Title"
                value={tabTitle}
                onChange={(e) => setTabTitle(e.target.value)}
                className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1.5">Favicon URL</label>
              <input
                type="text"
                placeholder="https://…/favicon.ico"
                value={tabIcon}
                onChange={(e) => setTabIcon(e.target.value)}
                className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button 
            onClick={openCloakedTab} 
            disabled={loading}
            className={`w-full py-3.5 text-base font-medium rounded-lg transition-colors ${
              loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"
            } text-white`}
          >
            {loading ? "Loading..." : "Open Private Tab"}
          </button>
        </div>

        {activeUrl && (
          <div className="w-full max-w-[900px] h-[500px] border border-gray-200 rounded-lg overflow-hidden shadow-lg">
            <BrowserFrame url={activeUrl} disguise={{ title: tabTitle, icon: tabIcon }} />
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200">
            <Shield className="w-3 h-3" /> Private browsing
          </span>
          <span className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200">
            <Globe className="w-3 h-3" /> Custom tab appearance
          </span>
        </div>
      </main>

      <SecuritySettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <SecurityLog open={logOpen} onClose={() => setLogOpen(false)} />
    </div>
  );
}

export default function App() {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("private_browser_auth") === "true") setUnlocked(true);
  }, []);

  const handleLock = useCallback(() => {
    sessionStorage.removeItem("private_browser_auth");
    setUnlocked(false);
  }, []);

  return (
    <>
      {unlocked
        ? <MainApp onLock={handleLock} />
        : <PasswordGate onUnlock={() => setUnlocked(true)} />
      }
    </>
  );
}
