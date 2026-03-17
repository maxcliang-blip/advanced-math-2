import { useEffect } from "react";

const DEVTOOLS_SHORTCUTS = [
  { key: "F12" },
  { key: "I", ctrl: true, shift: true },  // Chrome DevTools
  { key: "J", ctrl: true, shift: true },  // Chrome Console
  { key: "C", ctrl: true, shift: true },  // Chrome Inspector
  { key: "U", ctrl: true },               // View Source
  { key: "S", ctrl: true },               // Save Page
];

export function useDevToolsGuard(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    // Block keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of DEVTOOLS_SHORTCUTS) {
        const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : true;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey || !shortcut.shift;
        if (
          e.key === shortcut.key &&
          (shortcut.ctrl === undefined || ctrlMatch) &&
          (shortcut.shift === undefined || (shortcut.shift ? e.shiftKey : true))
        ) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }
    };

    // Block right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Detect devtools open via size difference
    const detectDevTools = () => {
      const threshold = 160;
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      if (widthDiff > threshold || heightDiff > threshold) {
        // DevTools likely open — clear and redirect
        sessionStorage.removeItem("tabcloak_auth");
        window.location.href = "about:blank";
      }
    };

    const interval = setInterval(detectDevTools, 1000);

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("contextmenu", handleContextMenu, true);

    return () => {
      clearInterval(interval);
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("contextmenu", handleContextMenu, true);
    };
  }, [enabled]);
}

export const DEVTOOLS_GUARD_KEY = "tabcloak_devtools_guard";

export function getDevToolsGuardEnabled(): boolean {
  return localStorage.getItem(DEVTOOLS_GUARD_KEY) === "true";
}

export function setDevToolsGuardEnabled(val: boolean) {
  localStorage.setItem(DEVTOOLS_GUARD_KEY, val ? "true" : "false");
}
