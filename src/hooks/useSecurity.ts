import { useEffect, useCallback, useRef } from "react";

const PANIC_KEY_STORAGE = "tabcloak_panic_key";
const PANIC_URL_STORAGE = "tabcloak_panic_url";
const AUTO_LOCK_STORAGE = "tabcloak_auto_lock_mins";

export const DEFAULT_PANIC_KEY = "Escape";
export const DEFAULT_PANIC_URL = "https://classroom.google.com";
export const DEFAULT_AUTO_LOCK_MINS = 10;

export function getPanicKey() {
  return sessionStorage.getItem(PANIC_KEY_STORAGE) || localStorage.getItem(PANIC_KEY_STORAGE) || DEFAULT_PANIC_KEY;
}
export function getPanicUrl() {
  return localStorage.getItem(PANIC_URL_STORAGE) || DEFAULT_PANIC_URL;
}
export function getAutoLockMins(): number {
  const v = localStorage.getItem(AUTO_LOCK_STORAGE);
  return v ? parseInt(v, 10) : DEFAULT_AUTO_LOCK_MINS;
}
export function saveSecuritySettings(panicKey: string, panicUrl: string, autoLockMins: number) {
  localStorage.setItem(PANIC_KEY_STORAGE, panicKey);
  localStorage.setItem(PANIC_URL_STORAGE, panicUrl);
  localStorage.setItem(AUTO_LOCK_STORAGE, String(autoLockMins));
}

export function usePanicKey(onPanic: () => void) {
  const lastKeyRef = useRef<{ key: string; time: number } | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const panicKey = getPanicKey();
      const now = Date.now();
      if (e.key === panicKey) {
        if (lastKeyRef.current && lastKeyRef.current.key === panicKey && now - lastKeyRef.current.time < 500) {
          import("@/lib/securityLog").then(({ log }) => log.panic(getPanicUrl()));
          onPanic();
        }
        lastKeyRef.current = { key: e.key, time: now };
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onPanic]);
}

export function useAutoLock(onLock: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const mins = getAutoLockMins();
    if (mins <= 0) return;
    timerRef.current = setTimeout(() => {
      import("@/lib/securityLog").then(({ log }) => log.autoLock());
      onLock();
    }, mins * 60 * 1000);
  }, [onLock]);

  useEffect(() => {
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [reset]);
}
