"use client";

import { useState, useEffect, useCallback } from "react";
import { Lock, Eye, EyeOff, AlertCircle } from "lucide-react";

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;
const MAX_LOCKOUTS = 3;

function DecoyPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4 text-center">
      <p className="text-[80px] font-black text-gray-300 mb-4">404</p>
      <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
      <p className="text-gray-500 text-sm max-w-[300px]">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <a href="https://google.com" className="mt-6 text-blue-500 text-sm">
        Go back to Google
      </a>
    </div>
  );
}

export default function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [lockouts, setLockouts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    setAttempts(parseInt(sessionStorage.getItem("tc_attempts") || "0", 10));
    setLockouts(parseInt(sessionStorage.getItem("tc_lockouts") || "0", 10));
    const v = sessionStorage.getItem("tc_locked_until");
    setLockedUntil(v ? parseInt(v, 10) : null);
  }, []);

  useEffect(() => {
    if (!lockedUntil) return;
    const tick = () => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(null);
        setAttempts(0);
        sessionStorage.removeItem("tc_locked_until");
        sessionStorage.setItem("tc_attempts", "0");
        setCountdown(0);
      } else {
        setCountdown(remaining);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || lockedUntil) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/checkPassword", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json();
      if (result.success) {
        sessionStorage.setItem("private_browser_auth", "true");
        sessionStorage.removeItem("tc_attempts");
        sessionStorage.removeItem("tc_lockouts");
        onUnlock();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        sessionStorage.setItem("tc_attempts", String(newAttempts));
        setPassword("");

        if (newAttempts >= MAX_ATTEMPTS) {
          const newLockouts = lockouts + 1;
          setLockouts(newLockouts);
          sessionStorage.setItem("tc_lockouts", String(newLockouts));
          const until = Date.now() + LOCKOUT_SECONDS * 1000;
          setLockedUntil(until);
          sessionStorage.setItem("tc_locked_until", String(until));
          setError("");
        } else {
          const remaining = MAX_ATTEMPTS - newAttempts;
          setError(`Incorrect password. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`);
        }
      }
    } catch {
      setError("Something went wrong. Try again.");
    }
    setLoading(false);
  }, [password, lockedUntil, attempts, lockouts, onUnlock]);

  if (lockouts >= MAX_LOCKOUTS) return <DecoyPage />;

  const isLocked = !!lockedUntil && countdown > 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
      <div className="w-full max-w-[320px]">
        <div className="text-center mb-6">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3 border-2 ${isLocked ? "border-red-500 bg-red-50" : "border-blue-500 bg-blue-50"}`}>
            {isLocked ? (
              <span className="text-2xl">🚫</span>
            ) : (
              <Lock className={`w-7 h-7 ${isLocked ? "text-red-500" : "text-blue-500"}`} />
            )}
          </div>
          <h1 className="text-2xl font-bold">{isLocked ? "Access Locked" : "Access Required"}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {isLocked ? "Too many failed attempts" : "Enter the password to continue"}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
          {isLocked ? (
            <div>
              <div className="flex flex-col items-center gap-2 py-6">
                <div className="text-5xl font-black text-red-500">{countdown}s</div>
                <p className="text-gray-500 text-sm text-center">
                  Too many failed attempts. Please wait before trying again.
                </p>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-red-500 h-full transition-all duration-1000"
                  style={{ width: `${(countdown / LOCKOUT_SECONDS) * 100}%` }}
                />
              </div>
              {lockouts > 0 && (
                <p className="text-center text-gray-500 text-xs mt-3">
                  Lockout {lockouts} of {MAX_LOCKOUTS}
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="text-sm font-medium block mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter access password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    autoFocus
                    disabled={loading}
                    className={`w-full px-3 py-2.5 pr-10 text-sm rounded-lg border ${error ? "border-red-500" : "border-gray-300"} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {error && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {error}
                  </p>
                )}
                {attempts > 0 && !error && (
                  <div className="flex gap-1 mt-2">
                    {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                      <div key={i} className={`flex-1 h-1 rounded-full ${i < attempts ? "bg-red-500" : "bg-gray-200"}`} />
                    ))}
                  </div>
                )}
              </div>
              <button 
                type="submit" 
                disabled={loading || !password.trim()}
                className={`w-full py-3 text-base font-medium rounded-lg transition-colors ${loading || !password.trim() ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"} text-white`}
              >
                {loading ? "Verifying..." : "Unlock"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-gray-400 text-xs mt-6">Unauthorized access is prohibited.</p>
      </div>
    </div>
  );
}
