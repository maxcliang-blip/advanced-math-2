import { useState, useEffect, useCallback } from "react";
import { checkPassword } from "zite-endpoints-sdk";
import { log as secLog } from "@/lib/securityLog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Lock, Eye, EyeOff, AlertTriangle, ShieldOff } from "lucide-react";

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;
const MAX_LOCKOUTS = 3;

function DecoyPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center">
      <p className="text-8xl font-black text-muted-foreground/20 mb-4">404</p>
      <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
      <p className="text-muted-foreground text-sm max-w-sm">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <a href="https://google.com" className="mt-6 text-primary text-sm underline underline-offset-4">
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
  const [attempts, setAttempts] = useState(() => parseInt(sessionStorage.getItem("tc_attempts") || "0", 10));
  const [lockouts, setLockouts] = useState(() => parseInt(sessionStorage.getItem("tc_lockouts") || "0", 10));
  const [lockedUntil, setLockedUntil] = useState<number | null>(() => {
    const v = sessionStorage.getItem("tc_locked_until");
    return v ? parseInt(v, 10) : null;
  });
  const [countdown, setCountdown] = useState(0);

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
      const result = await checkPassword({ password });
      if (result.success) {
        secLog.authSuccess();
        sessionStorage.setItem("tabcloak_auth", "true");
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
          secLog.lockout(newLockouts);
          if (newLockouts >= MAX_LOCKOUTS) secLog.decoy();
          sessionStorage.setItem("tc_lockouts", String(newLockouts));
          const until = Date.now() + LOCKOUT_SECONDS * 1000;
          setLockedUntil(until);
          sessionStorage.setItem("tc_locked_until", String(until));
          setError("");
        } else {
          const remaining = MAX_ATTEMPTS - newAttempts;
          secLog.authFail(remaining);
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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-3">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mx-auto border ${isLocked ? "bg-destructive/10 border-destructive/20" : "bg-primary/10 border-primary/20"}`}>
            {isLocked ? <ShieldOff className="w-7 h-7 text-destructive" /> : <Lock className="w-7 h-7 text-primary" />}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{isLocked ? "Access Locked" : "Access Required"}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {isLocked ? `Too many failed attempts` : "Enter the password to continue"}
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-lg">
          {isLocked ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2 py-4">
                <div className="text-5xl font-black text-destructive tabular-nums">{countdown}s</div>
                <p className="text-sm text-muted-foreground text-center">
                  Too many failed attempts. Please wait before trying again.
                </p>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-destructive h-full transition-all duration-1000"
                  style={{ width: `${(countdown / LOCKOUT_SECONDS) * 100}%` }}
                />
              </div>
              {lockouts > 0 && (
                <p className="text-xs text-center text-muted-foreground">
                  Lockout {lockouts} of {MAX_LOCKOUTS}
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter access password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    className={`pr-10 ${error ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    autoFocus
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {error && (
                  <p className="text-destructive text-xs flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {error}
                  </p>
                )}
                {attempts > 0 && !error && (
                  <div className="flex gap-1 mt-1">
                    {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full ${i < attempts ? "bg-destructive" : "bg-muted"}`} />
                    ))}
                  </div>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loading || !password.trim()}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</> : "Unlock"}
              </Button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">Unauthorized access is prohibited.</p>
      </div>
    </div>
  );
}
