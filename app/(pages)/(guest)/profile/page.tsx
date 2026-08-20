"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import toast, { Toaster } from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  gender: string;
  photo: string;
  role: string;
  createdAt: string;
}

// ─── Password strength ────────────────────────────────────────────────────────

function getStrength(pw: string) {
  let score = 0;

  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(pw)) score++;

  const labels = ["", "Too weak", "Weak", "Fair", "Good", "Strong"];

  const colors = [
    "",
    "bg-red-500",
    "bg-orange-400",
    "bg-yellow-400",
    "bg-blue-400",
    "bg-emerald-500",
  ];

  return {
    score,
    label: labels[score] ?? "",
    color: colors[score] ?? "",
  };
}

const pwRules = (pw: string) => [
  {
    label: "At least 8 characters",
    met: pw.length >= 8,
  },
  {
    label: "One uppercase letter",
    met: /[A-Z]/.test(pw),
  },
  {
    label: "One lowercase letter",
    met: /[a-z]/.test(pw),
  },
  {
    label: "One number",
    met: /[0-9]/.test(pw),
  },
  {
    label: "One special character",
    met: /[!@#$%^&*(),.?":{}|<>]/.test(pw),
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GuestProfilePage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  // Profile state
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    gender: "",
  });

  const [photoPreview, setPhotoPreview] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState<"profile" | "password">(
    "profile"
  );

  // Password state
  const [pwForm, setPwForm] = useState({
    current: "",
    next: "",
    confirm: "",
  });

  const [showPw, setShowPw] = useState({
    current: false,
    next: false,
    confirm: false,
  });

  const [savingPw, setSavingPw] = useState(false);

  // ─── Auth guard ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // ─── Load profile ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!session) return;

    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setProfile(d.data);

          setForm({
            name: d.data.name ?? "",
            phone: d.data.phone ?? "",
            gender: d.data.gender ?? "prefer_not_to_say",
          });

          setPhotoPreview(d.data.photo ?? "");
        }
      })
      .catch(() => toast.error("Failed to load profile."))
      .finally(() => setLoadingData(false));
  }, [session]);

  // ─── Handle photo file pick ────────────────────────────────────────────────

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

  // ─── Upload to Cloudinary ──────────────────────────────────────────────────

  const uploadPhoto = async (file: File): Promise<string> => {
    const data = new FormData();

    data.append("file", file);
    data.append(
      "upload_preset",
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? ""
    );
    data.append("folder", "jluvstays/profiles");

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: data,
      }
    );

    if (!res.ok) {
      throw new Error("Upload failed");
    }

    return (await res.json()).secure_url as string;
  };

  // ─── Save profile ──────────────────────────────────────────────────────────

  const handleSaveProfile = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }

    setSaving(true);

    try {
      let photoUrl = profile?.photo ?? "";

      if (photoFile) {
        try {
          photoUrl = await uploadPhoto(photoFile);
        } catch {
          toast.error(
            "Photo upload failed. Saving without photo update."
          );
        }
      }

      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          photo: photoUrl,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              ...form,
              photo: photoUrl,
            }
          : prev
      );

      setPhotoFile(null);

      await updateSession({
        name: form.name,
        photo: photoUrl,
      });

      toast.success("Profile updated successfully.");
    } catch (e: unknown) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Failed to save profile."
      );
    } finally {
      setSaving(false);
    }
  };

  // ─── Change password ───────────────────────────────────────────────────────

  const handleChangePassword = async () => {
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) {
      toast.error("All password fields are required.");
      return;
    }

    if (pwForm.next !== pwForm.confirm) {
      toast.error("New passwords do not match.");
      return;
    }

    const strength = getStrength(pwForm.next);

    if (strength.score < 5) {
      toast.error("Password does not meet all requirements.");
      return;
    }

    setSavingPw(true);

    try {
      const res = await fetch("/api/profile/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: pwForm.current,
          newPassword: pwForm.next,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      toast.success("Password changed successfully.");

      setPwForm({
        current: "",
        next: "",
        confirm: "",
      });
    } catch (e: unknown) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Failed to change password."
      );
    } finally {
      setSavingPw(false);
    }
  };

  // ─── Styles ────────────────────────────────────────────────────────────────

  const inputCls =
    "w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7A1B0F]/20 focus:border-[#7A1B0F] bg-white text-gray-800 transition";

  const labelCls =
    "block text-sm font-semibold text-gray-700 mb-1.5";

  const ROLE_LABELS: Record<string, string> = {
    guest: "Guest",
    tenant: "Tenant",
    admin: "Administrator",
    staff: "Staff",
    property_manager: "Property Manager",
    receptionist: "Receptionist",
    caretaker: "Caretaker",
    accountant: "Accountant",
    security: "Security",
    maintenance: "Maintenance",
  };

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (status === "loading" || loadingData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center">
            <div className="w-9 h-9 border-[3px] border-[#7A1B0F] border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-sm text-gray-500">
              Loading your profile...
            </p>
          </div>
        </div>

        <Footer />
      </div>
    );
  }

  const strength = getStrength(pwForm.next);
  const rules = pwRules(pwForm.next);

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            borderRadius: "10px",
            background: "#1e293b",
            color: "#f8fafc",
            fontSize: "14px",
          },
          success: {
            iconTheme: {
              primary: "#22c55e",
              secondary: "#fff",
            },
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: "#fff",
            },
          },
        }}
      />

      <Navbar />

      {/* ────────────────────────────────────────────────────────────────────
          Header
      ──────────────────────────────────────────────────────────────────── */}

      <section className="bg-[#7A1B0F] py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div
              onClick={() => fileRef.current?.click()}
              className="relative w-20 h-20 rounded-full overflow-hidden bg-white/15 border-2 border-white/30 flex items-center justify-center cursor-pointer group flex-shrink-0 shadow-lg"
            >
              {photoPreview ? (
                <Image
                  src={photoPreview}
                  alt={form.name || "Profile"}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              ) : (
                <span className="text-3xl font-bold text-white">
                  {form.name?.charAt(0).toUpperCase() ?? "?"}
                </span>
              )}

              <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
              </div>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />

            <div>
              <p className="text-white/70 text-xs font-medium uppercase tracking-wider mb-1">
                My Account
              </p>

              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                {profile?.name}
              </h1>

              <p className="text-white/70 text-sm mt-1">
                {profile?.email}
              </p>

              <span className="inline-flex items-center mt-2 px-3 py-1 bg-white/15 border border-white/20 text-white text-xs font-semibold rounded-full">
                {ROLE_LABELS[profile?.role ?? ""] ??
                  profile?.role}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────
          Main
      ──────────────────────────────────────────────────────────────────── */}

      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1.5 w-fit shadow-sm mb-6">
          {[
            {
              key: "profile",
              label: "Personal Details",
            },
            {
              key: "password",
              label: "Change Password",
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() =>
                setActiveTab(
                  tab.key as "profile" | "password"
                )
              }
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.key
                  ? "bg-[#7A1B0F] text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ──────────────────────────────────────────────────────────────────
            Profile Tab
        ────────────────────────────────────────────────────────────────── */}

        {activeTab === "profile" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

            {/* Card header */}
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                Personal Details
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Update your personal information and profile photo.
              </p>
            </div>

            <div className="p-6 space-y-6">

              {/* Photo upload */}
              <div
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-4 p-4 border border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-[#7A1B0F]/50 hover:bg-[#7A1B0F]/5 transition group"
              >
                <div className="relative w-16 h-16 rounded-full overflow-hidden bg-[#7A1B0F]/10 border border-[#7A1B0F]/10 flex-shrink-0">
                  {photoPreview ? (
                    <Image
                      src={photoPreview}
                      alt="Profile preview"
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#7A1B0F] font-bold text-xl">
                      {form.name?.charAt(0).toUpperCase() ??
                        "?"}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-700 group-hover:text-[#7A1B0F] transition">
                    {photoFile
                      ? photoFile.name
                      : "Change profile photo"}
                  </p>

                  <p className="text-xs text-gray-400 mt-1">
                    PNG, JPG or WEBP — maximum 5 MB
                  </p>

                  <p className="text-xs text-[#7A1B0F] mt-1 font-medium">
                    Click anywhere here to choose a new photo
                  </p>
                </div>
              </div>

              {/* Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                {/* Full name */}
                <div className="sm:col-span-2">
                  <label className={labelCls}>
                    Full Name
                  </label>

                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        name: e.target.value,
                      }))
                    }
                    placeholder="Your full name"
                    className={inputCls}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className={labelCls}>
                    Email Address
                  </label>

                  <input
                    type="email"
                    value={profile?.email ?? ""}
                    disabled
                    className={`${inputCls} bg-gray-50 text-gray-400 cursor-not-allowed`}
                  />

                  <p className="text-xs text-gray-400 mt-1.5">
                    Email address cannot be changed.
                  </p>
                </div>

                {/* Phone */}
                <div>
                  <label className={labelCls}>
                    Phone Number
                  </label>

                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        phone: e.target.value,
                      }))
                    }
                    placeholder="+254 7XX XXX XXX"
                    className={inputCls}
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className={labelCls}>
                    Gender
                  </label>

                  <select
                    value={form.gender}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        gender: e.target.value,
                      }))
                    }
                    className={inputCls}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">
                      Prefer not to say
                    </option>
                  </select>
                </div>

                {/* Member since */}
                <div>
                  <label className={labelCls}>
                    Member Since
                  </label>

                  <input
                    type="text"
                    value={
                      profile?.createdAt
                        ? new Date(
                            profile.createdAt
                          ).toLocaleDateString("en-KE", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })
                        : "—"
                    }
                    disabled
                    className={`${inputCls} bg-gray-50 text-gray-400 cursor-not-allowed`}
                  />
                </div>
              </div>

              {/* Save button */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 px-7 py-3 bg-[#7A1B0F] hover:bg-[#64160C] text-white text-sm font-semibold rounded-xl transition shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving && (
                    <svg
                      className="w-4 h-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />

                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                  )}

                  {saving
                    ? "Saving Changes..."
                    : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────────────
            Password Tab
        ────────────────────────────────────────────────────────────────── */}

        {activeTab === "password" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                Change Password
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Keep your account secure by using a strong password.
              </p>
            </div>

            <div className="p-6 space-y-5">

              {/* Security notice */}
              <div className="flex gap-3 p-4 bg-[#7A1B0F]/5 border border-[#7A1B0F]/10 rounded-xl">
                <div className="w-9 h-9 rounded-lg bg-[#7A1B0F]/10 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-[#7A1B0F]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-5a2 2 0 00-2-2H6a2 2 0 00-2 2v5a2 2 0 002 2zm10-9V7a4 4 0 00-8 0v3h8z"
                    />
                  </svg>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    Account security
                  </p>

                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    Use a strong password that you do not use
                    on other websites.
                  </p>
                </div>
              </div>

              {/* Current password */}
              <div>
                <label className={labelCls}>
                  Current Password
                </label>

                <div className="relative">
                  <input
                    type={
                      showPw.current ? "text" : "password"
                    }
                    value={pwForm.current}
                    onChange={(e) =>
                      setPwForm((p) => ({
                        ...p,
                        current: e.target.value,
                      }))
                    }
                    placeholder="Enter current password"
                    className={`${inputCls} pr-11`}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPw((p) => ({
                        ...p,
                        current: !p.current,
                      }))
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#7A1B0F] transition"
                  >
                    {showPw.current ? (
                      <EyeOpen />
                    ) : (
                      <EyeOff />
                    )}
                  </button>
                </div>
              </div>

              {/* New password */}
              <div>
                <label className={labelCls}>
                  New Password
                </label>

                <div className="relative">
                  <input
                    type={showPw.next ? "text" : "password"}
                    value={pwForm.next}
                    onChange={(e) =>
                      setPwForm((p) => ({
                        ...p,
                        next: e.target.value,
                      }))
                    }
                    placeholder="Minimum 8 characters"
                    className={`${inputCls} pr-11`}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPw((p) => ({
                        ...p,
                        next: !p.next,
                      }))
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#7A1B0F] transition"
                  >
                    {showPw.next ? (
                      <EyeOpen />
                    ) : (
                      <EyeOff />
                    )}
                  </button>
                </div>

                {/* Strength meter */}
                {pwForm.next && (
                  <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">

                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-600">
                        Password strength
                      </p>

                      <p className="text-xs font-semibold text-gray-700">
                        {strength.label}
                      </p>
                    </div>

                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-all ${
                            i <= strength.score
                              ? strength.color
                              : "bg-gray-200"
                          }`}
                        />
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {rules.map((rule) => (
                        <p
                          key={rule.label}
                          className={`text-[11px] flex items-center gap-1.5 ${
                            rule.met
                              ? "text-emerald-600"
                              : "text-gray-400"
                          }`}
                        >
                          <span className="font-bold">
                            {rule.met ? "✓" : "✗"}
                          </span>

                          {rule.label}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className={labelCls}>
                  Confirm New Password
                </label>

                <div className="relative">
                  <input
                    type={
                      showPw.confirm ? "text" : "password"
                    }
                    value={pwForm.confirm}
                    onChange={(e) =>
                      setPwForm((p) => ({
                        ...p,
                        confirm: e.target.value,
                      }))
                    }
                    placeholder="Re-enter new password"
                    className={`${inputCls} pr-11 ${
                      pwForm.confirm &&
                      pwForm.next !== pwForm.confirm
                        ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                        : ""
                    }`}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPw((p) => ({
                        ...p,
                        confirm: !p.confirm,
                      }))
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#7A1B0F] transition"
                  >
                    {showPw.confirm ? (
                      <EyeOpen />
                    ) : (
                      <EyeOff />
                    )}
                  </button>
                </div>

                {pwForm.confirm &&
                  pwForm.next !== pwForm.confirm && (
                    <p className="text-xs text-red-500 mt-1.5">
                      Passwords do not match.
                    </p>
                  )}

                {pwForm.confirm &&
                  pwForm.next === pwForm.confirm && (
                    <p className="text-xs text-emerald-600 mt-1.5">
                      ✓ Passwords match.
                    </p>
                  )}
              </div>

              {/* Update password */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleChangePassword}
                  disabled={savingPw}
                  className="flex items-center justify-center gap-2 px-7 py-3 bg-[#7A1B0F] hover:bg-[#64160C] text-white text-sm font-semibold rounded-xl transition shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {savingPw && (
                    <svg
                      className="w-4 h-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />

                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                  )}

                  {savingPw
                    ? "Updating..."
                    : "Update Password"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

// ─── Eye icons ────────────────────────────────────────────────────────────────

function EyeOpen() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

function EyeOff() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
      />
    </svg>
  );
}