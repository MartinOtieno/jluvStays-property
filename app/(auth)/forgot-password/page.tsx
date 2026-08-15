"use client";

import { useState } from "react";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [email,     setEmail]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const val = email.trim();
    if (!val) { toast.error("Please enter your email address."); return; }

    setLoading(true);
    try {
      // ✅ FIXED: pointing to /api/forgot-password not /api/auth/forgot-password
      const res  = await fetch("/api/forgot-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: val }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message ?? "Request failed");
      setSubmitted(true);
    } catch (e: any) {
      toast.error(e.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Toaster position="top-center" toastOptions={{
        style: { borderRadius: "10px", background: "#1e293b", color: "#f8fafc", fontSize: "14px", padding: "12px 18px" },
        error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
      }} />

      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl">

            <div className="flex justify-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-[#7A1B0F] flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
            </div>

            {submitted ? (
              <div className="text-center space-y-4">
                <h1 className="text-2xl font-bold text-white">Check your email</h1>
                <p className="text-slate-400 text-sm leading-relaxed">
                  If an account exists for <span className="text-white font-medium">{email}</span>,
                  we have sent a password reset link. Check your inbox and spam folder.
                </p>
                <div className="pt-2">
                  <Link href="/login"
                    className="block w-full py-3 text-center bg-[#7A1B0F] hover:opacity-90 text-white text-sm font-semibold rounded-xl transition">
                    Back to Sign in
                  </Link>
                </div>
                <button
                  onClick={() => { setSubmitted(false); setEmail(""); }}
                  className="text-xs text-slate-500 hover:text-slate-300 transition"
                >
                  Try a different email
                </button>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-bold text-white tracking-tight">Forgot password?</h1>
                  <p className="text-slate-400 text-sm mt-1">
                    Enter your email and we will send you a reset link.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7A1B0F] focus:border-transparent transition text-sm"
                    />
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
                        Sending…
                      </>
                    ) : "Send Reset Link"}
                  </button>
                </form>

                <div className="flex items-center gap-3 my-6">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-xs text-slate-500">Remember it?</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                <Link href="/login"
                  className="block w-full py-3 text-center border border-white/10 hover:border-white/20 text-slate-300 hover:text-white text-sm font-medium rounded-xl transition">
                  Back to Sign in
                </Link>
              </>
            )}
          </div>
          <p className="text-center text-xs text-slate-600 mt-6">
            © {new Date().getFullYear()} JluvStays. All rights reserved.
          </p>
        </div>
      </div>
    </>
  );
}