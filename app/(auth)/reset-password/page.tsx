// app/(auth)/reset-password/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";

function getStrength(pw: string) {
  let s = 0;
  if (pw.length >= 8)             s++;
  if (/[A-Z]/.test(pw))           s++;
  if (/[a-z]/.test(pw))           s++;
  if (/[0-9]/.test(pw))           s++;
  if (/[^A-Za-z0-9]/.test(pw))    s++;
  const map = ["", "bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-sky-400", "bg-emerald-500"];
  const lab  = ["", "Too weak",  "Weak",          "Fair",          "Good",       "Strong"];
  return { score: s, color: map[s], label: lab[s] };
}

function ResetForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const token        = searchParams.get("token") ?? "";

  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [showPw,    setShowPw]    = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [checking,  setChecking]  = useState(true);
  const [tokenOk,   setTokenOk]   = useState(false);
  const [done,      setDone]      = useState(false);

  // Verify token on mount
 useEffect(() => {
  if (!token) {
    setChecking(false);
    return;
  }
  fetch(`/api/reset-password?token=${encodeURIComponent(token)}`)
    .then(r => r.json())
    .then(d => setTokenOk(d.success))
    .catch(() => setTokenOk(false))
    .finally(() => setChecking(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const strength = getStrength(password);
    if (strength.score < 4)      { toast.error("Password is too weak."); return; }
    if (password !== confirm)     { toast.error("Passwords do not match."); return; }

    setLoading(true);
    try {
      const res  = await fetch("/api/reset-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message ?? "Reset failed");
      setDone(true);
      toast.success("Password reset! Redirecting to login…");
      setTimeout(() => router.push("/login"), 2000);
    } catch (e: any) {
      toast.error(e.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const strength = getStrength(password);

  const pwRules = [
    { label: "At least 8 characters",  met: password.length >= 8         },
    { label: "One uppercase letter",    met: /[A-Z]/.test(password)       },
    { label: "One lowercase letter",    met: /[a-z]/.test(password)       },
    { label: "One number",              met: /[0-9]/.test(password)       },
    { label: "One special character",   met: /[^A-Za-z0-9]/.test(password)},
  ];

  // ── Loading token check ──
  if (checking) {
    return (
      <div className="text-center space-y-3">
        <svg className="w-8 h-8 animate-spin text-[#7A1B0F] mx-auto" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
        <p className="text-slate-400 text-sm">Verifying reset link…</p>
      </div>
    );
  }

  // ── Invalid / expired token ──
  if (!token || !tokenOk) {
    return (
      <div className="text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto">
          <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white">Link expired or invalid</h2>
        <p className="text-slate-400 text-sm">This reset link has expired or already been used. Request a new one.</p>
        <Link href="/forgot-password"
          className="block w-full py-3 text-center bg-[#7A1B0F] hover:opacity-90 text-white text-sm font-semibold rounded-xl transition mt-2">
          Request new link
        </Link>
      </div>
    );
  }

  // ── Success ──
  if (done) {
    return (
      <div className="text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto">
          <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white">Password reset!</h2>
        <p className="text-slate-400 text-sm">Redirecting you to sign in…</p>
      </div>
    );
  }

  // ── Reset form ──
  return (
    <>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Set new password</h1>
        <p className="text-slate-400 text-sm mt-1">Choose a strong password for your account.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* New password */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">New Password</label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              autoComplete="new-password"
              className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7A1B0F] focus:border-transparent transition text-sm"
            />
            <button type="button" onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition p-1">
              {showPw ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
              )}
            </button>
          </div>

          {/* Strength bar */}
          {password && (
            <div className="mt-2 space-y-2">
              <div className="flex gap-1">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength.score ? strength.color : "bg-white/10"}`} />
                ))}
              </div>
              <p className="text-xs text-slate-400">Strength: <span className="font-medium text-slate-300">{strength.label}</span></p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {pwRules.map(r => (
                  <p key={r.label} className={`text-[11px] flex items-center gap-1 ${r.met ? "text-emerald-400" : "text-slate-500"}`}>
                    {r.met ? "✓" : "○"} {r.label}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Confirm */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm Password</label>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Re-enter password"
            autoComplete="new-password"
            className={`w-full px-4 py-3 bg-white/5 border text-white placeholder-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7A1B0F] focus:border-transparent transition text-sm ${
              confirm && password !== confirm ? "border-red-500/60" : "border-white/10"
            }`}
          />
          {confirm && password !== confirm && (
            <p className="text-xs text-red-400 mt-1.5">Passwords do not match.</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-[#7A1B0F] hover:opacity-90 text-white font-semibold rounded-xl transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Resetting…
            </>
          ) : "Reset Password"}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <>
      <Toaster position="top-center" toastOptions={{
        style: { borderRadius: "10px", background: "#1e293b", color: "#f8fafc", fontSize: "14px", padding: "12px 18px" },
        success: { iconTheme: { primary: "#22c55e", secondary: "#fff" } },
        error:   { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
      }} />

      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl">
            <div className="flex justify-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-[#7A1B0F] flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                </svg>
              </div>
            </div>
            <Suspense fallback={<p className="text-slate-400 text-sm text-center">Loading…</p>}>
              <ResetForm />
            </Suspense>
          </div>
          <p className="text-center text-xs text-slate-600 mt-6">
            © {new Date().getFullYear()} JluvStays. All rights reserved.
          </p>
        </div>
      </div>
    </>
  );
}