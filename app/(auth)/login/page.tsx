"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import toast, { Toaster } from "react-hot-toast";
import { useState } from "react";

// role is an access tier ("admin" | "staff" | "tenant" | "guest"), not a
// job title — the specific position a staff member holds (e.g. "Front
// Desk Lead") is free text on StaffProfile.position and never affects
// routing. See models/User.ts and app/api/staff/route.ts.
function getRoleRedirect(role: string): string {
  if (role === "admin") return "/admin";
  if (role === "staff") return "/staff";
  return "/";
}

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form     = e.currentTarget;
    const email    = (form.elements.namedItem("email")    as HTMLInputElement).value.trim();
    const password = (form.elements.namedItem("password") as HTMLInputElement).value.trim();

    if (!email || !password) {
      toast.error("Please enter both email and password.");
      return;
    }

    setLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (!res) {
        toast.error("Auth service unavailable. Check NEXTAUTH_SECRET in .env.local.");
        return;
      }

      if (res.error) {
        const code = res.error;
        if      (code === "USER_NOT_FOUND")       toast.error("No account found with that email.");
        else if (code === "INVALID_PASSWORD")      toast.error("Incorrect password. Try again.");
        else if (code === "MISSING_CREDENTIALS")   toast.error("Email and password are required.");
        else if (code === "DB_CONNECTION_FAILED")  toast.error("Database unavailable. Try again shortly.");
        else                                       toast.error("Invalid email or password.");
        return;
      }

      toast.success("Welcome back! Loading…");

      const session = await fetch("/api/auth/session").then(r => r.json());
      const role    = session?.user?.role ?? "";

      setTimeout(() => router.push(getRoleRedirect(role)), 1200);

    } catch (err) {
      console.error("Login error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            borderRadius: "10px",
            background: "#1e293b",
            color: "#f8fafc",
            fontSize: "14px",
            padding: "12px 18px",
          },
          success: { iconTheme: { primary: "#22c55e", secondary: "#fff" } },
          error:   { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
        }}
      />

      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl">

            {/* ICON */}
            <div className="flex justify-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-[#7A1B0F] flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
            </div>

            {/* HEADER */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-white tracking-tight">Welcome back</h1>
              <p className="text-slate-400 text-sm mt-1">Sign in to manage your room bookings</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>

              {/* EMAIL */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7A1B0F] focus:border-transparent transition text-sm"
                />
              </div>

              {/* PASSWORD */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7A1B0F] focus:border-transparent transition text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition p-1"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      // Password visible → plain eye (click to hide)
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      // Password hidden → crossed-out eye (click to reveal)
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* FORGOT */}
              <div className="flex justify-end -mt-1">
                <Link href="/forgot-password" className="text-xs text-[#7A1B0F] hover:opacity-80 transition">
                  Forgot password?
                </Link>
              </div>

              {/* SUBMIT */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#7A1B0F] hover:opacity-90 active:opacity-100 text-white font-semibold rounded-xl transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Signing in…
                  </>
                ) : "Sign in"}
              </button>
            </form>

            {/* DIVIDER */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-slate-500">New here?</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <Link
              href="/register"
              className="block w-full py-3 text-center border border-white/10 hover:border-white/20 text-slate-300 hover:text-white text-sm font-medium rounded-xl transition-all duration-150"
            >
              Create an account
            </Link>
          </div>

          <div className="text-center mt-6">
            <Link href="/" className="text-xs text-[#7A1B0F] hover:opacity-80 transition">
              Back Home
            </Link>
          </div>

          <p className="text-center text-xs text-slate-600 mt-3">
            © {new Date().getFullYear()} JluvStays. All rights reserved.
          </p>
        </div>
      </div>
    </>
  );
}