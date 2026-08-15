"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PhoneInput from "react-phone-number-input";
import { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import toast, { Toaster } from "react-hot-toast";
import Image from "next/image";

// ─── Password strength ────────────────────────────────────────────────────────

function getStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8)                             score++;
  if (/[A-Z]/.test(password))                          score++;
  if (/[a-z]/.test(password))                          score++;
  if (/[0-9]/.test(password))                          score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password))        score++;

  if (score <= 1) return { score, label: "Too weak",  color: "bg-red-500"    };
  if (score === 2) return { score, label: "Weak",      color: "bg-orange-400" };
  if (score === 3) return { score, label: "Fair",      color: "bg-yellow-400" };
  if (score === 4) return { score, label: "Good",      color: "bg-sky-400"    };
  return              { score, label: "Strong",    color: "bg-emerald-500" };
}

const isStrongPassword = (p: string) => getStrength(p).score === 5;

// ─── Email domain validation (MX-style check via public API) ─────────────────
// We check the email format client-side, then verify the domain actually
// accepts mail via a free abstract-api call. Falls back gracefully if the
// API is unavailable so registration is never blocked by a network error.

async function validateEmailDomain(email: string): Promise<{ valid: boolean; reason?: string }> {
  // Basic format check first
  const fmt = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!fmt.test(email)) return { valid: false, reason: "Invalid email format." };

  try {
    const res = await fetch(
      `https://emailvalidation.abstractapi.com/v1/?api_key=REPLACE_WITH_YOUR_KEY&email=${encodeURIComponent(email)}`
    );
    if (!res.ok) throw new Error("API unavailable");
    const data = await res.json();
    // deliverability: "DELIVERABLE" | "UNDELIVERABLE" | "RISKY" | "UNKNOWN"
    if (data.deliverability === "UNDELIVERABLE") {
      return { valid: false, reason: "This email address doesn't exist or can't receive mail." };
    }
    if (!data.is_valid_format?.value) {
      return { valid: false, reason: "Invalid email format." };
    }
    return { valid: true };
  } catch {
    // API unavailable — allow submission (don't block users due to our API issue)
    return { valid: true };
  }
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const EyeOpen = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);
const EyeOff = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);
const UploadIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);
const CheckIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
const XIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    gender: "prefer_not_to_say",
  });

  const [phone,          setPhone]          = useState<string | undefined>();
  const [defaultCountry, setDefaultCountry] = useState<any>("KE");
  const [photoFile,      setPhotoFile]      = useState<File | null>(null);
  const [photoPreview,   setPhotoPreview]   = useState<string>("");
  const [showPw,         setShowPw]         = useState(false);
  const [showConfirm,    setShowConfirm]    = useState(false);
  const [loading,        setLoading]        = useState(false);
  const [emailChecking,  setEmailChecking]  = useState(false);
  const [emailError,     setEmailError]     = useState("");

  // Auto-detect country for phone input
  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then(r => r.json())
      .then(d => setDefaultCountry(d.country_code || "KE"))
      .catch(() => setDefaultCountry("KE"));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (e.target.name === "email") setEmailError(""); // clear on change
  };

  // Photo file pick
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo must be under 5 MB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  // Validate email on blur
  const handleEmailBlur = async () => {
    if (!form.email) return;
    setEmailChecking(true);
    const { valid, reason } = await validateEmailDomain(form.email);
    setEmailChecking(false);
    if (!valid) setEmailError(reason ?? "Invalid email.");
  };

  // Upload photo to Cloudinary and return the URL
  const uploadPhoto = async (file: File): Promise<string> => {
    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "");
    data.append("folder", "jluvstays/profiles");

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: "POST", body: data }
    );
    if (!res.ok) throw new Error("Photo upload failed");
    const json = await res.json();
    return json.secure_url as string;
  };

  const strength = getStrength(form.password);

  const pwRules = [
    { label: "At least 8 characters",           met: form.password.length >= 8                            },
    { label: "One uppercase letter",             met: /[A-Z]/.test(form.password)                         },
    { label: "One lowercase letter",             met: /[a-z]/.test(form.password)                         },
    { label: "One number",                       met: /[0-9]/.test(form.password)                         },
    { label: "One special character",            met: /[!@#$%^&*(),.?":{}|<>]/.test(form.password)       },
  ];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // ── Client-side validation ────────────────────────────────────────────────
    if (!form.name.trim()) { toast.error("Full name is required.");   return; }
    if (!form.email)       { toast.error("Email is required.");        return; }
    if (emailError)        { toast.error(emailError);                  return; }

    if (!phone || !isValidPhoneNumber(phone)) {
      toast.error("Please enter a valid phone number.");
      return;
    }

    if (!isStrongPassword(form.password)) {
      toast.error("Password does not meet all requirements.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      // Upload photo if selected
      let photoUrl = "";
      if (photoFile) {
        try {
          photoUrl = await uploadPhoto(photoFile);
        } catch {
          toast.error("Photo upload failed. Continuing without photo.");
        }
      }

      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:     form.name.trim(),
          email:    form.email.trim().toLowerCase(),
          password: form.password,
          phone,
          photo:    photoUrl,
          gender:   form.gender,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        toast.error(data.message || "Registration failed.");
        return;
      }

      toast.success("Account created! Redirecting to login…");
      setTimeout(() => router.push("/login"), 1500);

    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7A1B0F] focus:border-transparent transition text-sm";
  const labelCls = "block text-sm font-medium text-slate-300 mb-1.5";

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

      {/* Phone input dark-theme override */}
      <style>{`
        .PhoneInput { display: flex; align-items: center; gap: 8px; }
        .PhoneInputInput {
          flex: 1; background: transparent; border: none; outline: none;
          color: white; font-size: 14px; padding: 0;
        }
        .PhoneInputInput::placeholder { color: #64748b; }
        .PhoneInputCountrySelect { background: #0f172a; color: white; border: none; }
        .PhoneInputCountrySelectArrow { color: #94a3b8; }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-3xl">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 md:p-10 shadow-2xl">

            {/* Icon + header */}
            <div className="flex justify-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-[#7A1B0F] flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-white tracking-tight">Create your account</h1>
              <p className="text-slate-400 text-sm mt-1">Join JluvStays and start booking rooms in Chicago</p>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5" noValidate>

              {/* Photo upload — full width */}
              <div className="md:col-span-2">
                <label className={labelCls}>Profile Photo <span className="text-slate-500 font-normal">(optional)</span></label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-4 p-4 border border-dashed border-white/20 rounded-xl cursor-pointer hover:border-[#7A1B0F] hover:bg-white/5 transition group"
                >
                  {photoPreview ? (
                    <Image
                      src={photoPreview}
                      alt="Preview"
                      width={56}
                      height={56}
                      className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 group-hover:text-[#7A1B0F] transition flex-shrink-0">
                      <UploadIcon />
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-slate-300 font-medium">
                      {photoFile ? photoFile.name : "Click to upload a photo"}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">PNG, JPG, WEBP — max 5 MB</p>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Name */}
              <div>
                <label className={labelCls}>Full Name</label>
                <input
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Jane Doe"
                  autoComplete="name"
                  className={inputCls}
                />
              </div>

              {/* Email */}
              <div>
                <label className={labelCls}>Email address</label>
                <div className="relative">
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    onBlur={handleEmailBlur}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className={`${inputCls} ${emailError ? "border-red-500/60 focus:ring-red-500" : ""}`}
                  />
                  {emailChecking && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                      <svg className="w-4 h-4 animate-spin text-slate-400" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                    </span>
                  )}
                </div>
                {emailError && (
                  <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                    <XIcon /> {emailError}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className={labelCls}>Phone Number</label>
                <div className={`${inputCls} flex items-center`} style={{ padding: "0 16px" }}>
                  <PhoneInput
                    value={phone}
                    onChange={setPhone}
                    defaultCountry={defaultCountry}
                    international
                    countryCallingCodeEditable={false}
                    style={{ width: "100%", paddingTop: "10px", paddingBottom: "10px" }}
                  />
                </div>
                {phone && !isValidPhoneNumber(phone) && (
                  <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                    <XIcon /> This phone number is invalid.
                  </p>
                )}
              </div>

              {/* Gender */}
              <div>
                <label className={labelCls}>Gender</label>
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  className={`${inputCls} appearance-none`}
                >
                  <option value="male"              className="bg-slate-900">Male</option>
                  <option value="female"            className="bg-slate-900">Female</option>
                  <option value="other"             className="bg-slate-900">Other</option>
                  <option value="prefer_not_to_say" className="bg-slate-900">Prefer not to say</option>
                </select>
              </div>

              {/* Password */}
              <div>
                <label className={labelCls}>Password</label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPw ? "text" : "password"}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                    className={`${inputCls} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                  >
                    {showPw ? <EyeOpen /> : <EyeOff />}
                  </button>
                </div>

                {/* Strength bar */}
                {form.password && (
                  <div className="mt-2 space-y-2">
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(i => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all ${
                            i <= strength.score ? strength.color : "bg-white/10"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-slate-400">
                      Strength: <span className="font-medium text-slate-300">{strength.label}</span>
                    </p>
                    <div className="grid grid-cols-1 gap-y-1">
                      {pwRules.map(r => (
                        <p key={r.label} className={`text-[11px] flex items-center gap-1 ${r.met ? "text-emerald-400" : "text-slate-500"}`}>
                          {r.met ? <CheckIcon /> : <XIcon />} {r.label}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className={labelCls}>Confirm Password</label>
                <div className="relative">
                  <input
                    name="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    className={`${inputCls} pr-12 ${
                      form.confirmPassword && form.password !== form.confirmPassword
                        ? "border-red-500/60 focus:ring-red-500"
                        : ""
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                  >
                    {showConfirm ? <EyeOpen /> : <EyeOff />}
                  </button>
                </div>
                {form.confirmPassword && form.password !== form.confirmPassword && (
                  <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                    <XIcon /> Passwords do not match.
                  </p>
                )}
              </div>

              {/* Submit — full width */}
              <button
                type="submit"
                disabled={loading}
                className="md:col-span-2 w-full py-3 bg-[#7A1B0F] hover:opacity-90 active:opacity-100 text-white font-semibold rounded-xl transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm mt-2"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Creating account…
                  </>
                ) : "Create Account"}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-slate-500">Have an account?</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <Link
              href="/login"
              className="block w-full py-3 text-center border border-white/10 hover:border-white/20 text-slate-300 hover:text-white text-sm font-medium rounded-xl transition-all duration-150"
            >
              Sign in instead
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