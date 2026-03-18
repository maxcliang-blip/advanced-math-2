"use client";

import { useState, useEffect } from "react";
import { Check, AlertCircle } from "lucide-react";

const DEFAULT_PANIC_KEY = "Escape";
const DEFAULT_PANIC_URL = "https://classroom.google.com";
const DEFAULT_AUTO_LOCK_MINS = 5;

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
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);

  useEffect(() => {
    if (open) {
      const storedPanicKey = sessionStorage.getItem("panic_key") || DEFAULT_PANIC_KEY;
      const storedPanicUrl = sessionStorage.getItem("panic_url") || DEFAULT_PANIC_URL;
      const storedAutoLock = sessionStorage.getItem("auto_lock_mins") || String(DEFAULT_AUTO_LOCK_MINS);
      const storedDevTools = sessionStorage.getItem("devtools_guard") === "true";
      
      setPanicKey(storedPanicKey);
      setPanicUrl(storedPanicUrl);
      setAutoLockMins(storedAutoLock);
      setDevToolsGuard(storedDevTools);
    }
  }, [open]);

  const handleKeyRecord = (e: React.KeyboardEvent) => {
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
  };

  const showMessage = (text: string, type: "error" | "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSave = () => {
    const mins = parseInt(autoLockMins, 10);
    if (isNaN(mins) || mins < 0) {
      showMessage("Auto-lock must be a valid number (0 to disable)", "error");
      return;
    }
    sessionStorage.setItem("panic_key", panicKey);
    sessionStorage.setItem("panic_url", panicUrl);
    sessionStorage.setItem("auto_lock_mins", String(mins));
    sessionStorage.setItem("devtools_guard", String(devToolsGuard));
    showMessage("Security settings saved", "success");
    setTimeout(onClose, 1000);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-[450px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {message && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-lg mb-4 text-sm ${
            message.type === "error" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
          }`}>
            {message.type === "error" ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
            {message.text}
          </div>
        )}

        <h2 className="text-xl font-bold mb-1">Security Settings</h2>
        <p className="text-sm text-gray-500 mb-6">
          Configure panic key, auto-lock, and escape destination.
        </p>

        <div className="mb-6">
          <label className="text-sm font-medium block mb-2">Panic Key</label>
          <p className="text-xs text-gray-500 mb-2">
            Press this key to instantly flee to the escape URL.
          </p>
          <div className="flex gap-2 items-center">
            <div
              onClick={() => setRecording(true)}
              onKeyDown={handleKeyRecord}
              tabIndex={0}
              className={`flex-1 flex items-center justify-between px-3 py-2 rounded-lg border cursor-pointer font-mono text-sm ${
                recording ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-gray-50"
              }`}
            >
              <span>{recording ? "Press any key…" : panicKey}</span>
              {!recording && <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded">Click to change</span>}
            </div>
            <button 
              onClick={() => { setPanicKey(DEFAULT_PANIC_KEY); setRecording(false); }}
              className="px-4 py-2 text-xs border border-gray-200 rounded-md bg-white hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="border-t border-gray-200 my-6" />

        <div className="mb-6">
          <label className="text-sm font-medium block mb-2">Escape URL</label>
          <p className="text-xs text-gray-500 mb-2">
            Where to redirect when the panic key is pressed.
          </p>
          <input
            value={panicUrl}
            onChange={(e) => setPanicUrl(e.target.value)}
            placeholder="https://classroom.google.com"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: "Google Classroom", url: "https://classroom.google.com" },
              { label: "Google Docs", url: "https://docs.google.com" },
              { label: "Khan Academy", url: "https://khanacademy.org" },
            ].map((p) => (
              <button
                key={p.label}
                onClick={() => setPanicUrl(p.url)}
                className={`px-2.5 py-1 rounded-md border text-xs cursor-pointer ${
                  panicUrl === p.url ? "border-blue-500 bg-blue-50 text-blue-600" : "border-gray-200 bg-gray-50 text-gray-600"
                }`}
              >
                {panicUrl === p.url && "✓ "}{p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-200 my-6" />

        <div className="mb-6">
          <label className="text-sm font-medium block mb-2">Auto-Lock</label>
          <p className="text-xs text-gray-500 mb-2">
            Lock the app after this many minutes of inactivity. Set to 0 to disable.
          </p>
          <div className="flex gap-2 items-center mb-2">
            <input
              type="number"
              min="0"
              max="120"
              value={autoLockMins}
              onChange={(e) => setAutoLockMins(e.target.value)}
              className="w-20 px-2 py-2 text-sm border border-gray-300 rounded-md"
            />
            <span className="text-sm text-gray-500">minutes</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["0", "5", "10", "15", "30"].map((v) => (
              <button
                key={v}
                onClick={() => setAutoLockMins(v)}
                className={`px-2.5 py-1 rounded-md border text-xs cursor-pointer ${
                  autoLockMins === v ? "border-blue-500 bg-blue-50 text-blue-600" : "border-gray-200 bg-gray-50 text-gray-600"
                }`}
              >
                {v === "0" ? "Off" : `${v}m`}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-200 my-6" />

        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <label className="text-sm font-medium block mb-1">Block DevTools</label>
            <p className="text-xs text-gray-500">
              Disables F12, Ctrl+Shift+I, right-click, and detects DevTools window.
            </p>
          </div>
          <input
            type="checkbox"
            checked={devToolsGuard}
            onChange={(e) => setDevToolsGuard(e.target.checked)}
            className="w-5 h-5 mt-0.5"
          />
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-500 mb-6">
          ℹ️ Brute-force protection: after <strong>5 failed attempts</strong>, access is locked for <strong>30 seconds</strong>. After <strong>3 lockouts</strong>, a decoy 404 page is shown.
        </div>

        <button 
          onClick={handleSave}
          className="w-full py-3 text-base font-medium rounded-lg bg-blue-500 hover:bg-blue-600 text-white"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
