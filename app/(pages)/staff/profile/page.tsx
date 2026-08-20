"use client";

import { useSession } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import toast, { Toaster } from "react-hot-toast";

// ─── Icons ────────────────────────────────────────────────────────────────────

const Icons = {
  Save: () => (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  ),

  Camera: () => (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),

  Eye: () => (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),

  EyeOff: () => (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ),

  Lock: () => (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  ),

  User: () => (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20v-1a8 8 0 0116 0v1" />
    </svg>
  ),

  Spinner: () => (
    <svg
      className="animate-spin"
      width="15"
      height="15"
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
  ),
};

// ─── Role labels ──────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  property_manager: "Property Manager",
  receptionist: "Receptionist",
  caretaker: "Caretaker",
  accountant: "Accountant",
  security: "Security",
  maintenance: "Maintenance",
  tenant: "Tenant",
  guest: "Guest",
};

// ─── Role colors ──────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-blue-100 text-blue-700",
  property_manager: "bg-emerald-100 text-emerald-700",
  receptionist: "bg-violet-100 text-violet-700",
  caretaker: "bg-amber-100 text-amber-700",
  accountant: "bg-rose-100 text-rose-700",
  security: "bg-orange-100 text-orange-700",
  maintenance: "bg-slate-100 text-slate-700",
  tenant: "bg-slate-100 text-slate-700",
  guest: "bg-slate-100 text-slate-700",
};

// ─── Password strength ────────────────────────────────────────────────────────

function passwordStrength(pw: string) {
  let score = 0;

  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  const map = [
    {
      label: "",
      color: "bg-slate-200",
    },
    {
      label: "Weak",
      color: "bg-red-400",
    },
    {
      label: "Fair",
      color: "bg-amber-400",
    },
    {
      label: "Good",
      color: "bg-blue-400",
    },
    {
      label: "Strong",
      color: "bg-emerald-500",
    },
  ];

  return {
    score,
    ...map[score],
  };
}

// ─── Password input ───────────────────────────────────────────────────────────

function PasswordInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7A1B0F] focus:border-transparent"
      />

      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#7A1B0F] transition"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <Icons.EyeOff /> : <Icons.Eye />}
      </button>
    </div>
  );
}

// ─── Cloudinary upload ────────────────────────────────────────────────────────

async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData();

  formData.append("file", file);
  formData.append(
    "upload_preset",
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? ""
  );
  formData.append("folder", "jluvstays/profiles");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!res.ok) {
    throw new Error("Photo upload failed");
  }

  return (await res.json()).secure_url as string;
}

// ─── Safe JSON fetch ──────────────────────────────────────────────────────────

async function safeFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  const text = await res.text();

  if (!text) {
    throw new Error("Server returned an empty response.");
  }

  return {
    res,
    data: JSON.parse(text),
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();

  const user = session?.user as
    | {
        id?: string;
        name?: string;
        email?: string;
        role?: string;
        image?: string;
        phone?: string;
      }
    | undefined;

  // ── Profile state ────────────────────────────────────────────────────────

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("prefer_not_to_say");
  const [email, setEmail] = useState("");

  const [photoPreview, setPhotoPreview] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [profileSaving, setProfileSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // ── Password state ───────────────────────────────────────────────────────

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  // ── Load profile ─────────────────────────────────────────────────────────

  useEffect(() => {
    fetch("/api/profile")
      .then(async (r) => {
        const text = await r.text();

        if (!text) {
          throw new Error("Empty response from server.");
        }

        return JSON.parse(text);
      })
      .then((d) => {
        if (d.success) {
          const p = d.data;

          setName(p.name ?? "");
          setPhone(p.phone ?? "");
          setGender(p.gender ?? "prefer_not_to_say");
          setEmail(p.email ?? "");
          setPhotoPreview(p.photo ?? "");
        } else {
          toast.error(d.message ?? "Failed to load your profile.");
        }
      })
      .catch((e) =>
        toast.error(e.message ?? "Failed to load your profile.")
      )
      .finally(() => setLoadingProfile(false));
  }, []);

  // ── Photo selection ──────────────────────────────────────────────────────

  function handleAvatarChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];

    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Profile photo must be under 5 MB.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  // ── Save profile ─────────────────────────────────────────────────────────

  async function saveProfile() {
    if (!name.trim()) {
      toast.error("Please enter your full name.");
      return;
    }

    setProfileSaving(true);

    let photoUrl = photoPreview;

    try {
      if (photoFile) {
        setPhotoUploading(true);

        try {
          photoUrl = await uploadToCloudinary(photoFile);
          setPhotoFile(null);
        } catch {
          toast.error(
            "Your photo could not be uploaded. Your other profile changes will still be saved."
          );
        } finally {
          setPhotoUploading(false);
        }
      }

      const { data } = await safeFetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          gender,
          photo: photoUrl,
        }),
      });

      if (!data.success) {
        throw new Error(data.message ?? "Failed to save profile.");
      }

      setPhotoPreview(photoUrl);

      await updateSession({
        name: name.trim(),
        image: photoUrl,
      });

      toast.success("Your profile has been updated successfully.");
    } catch (e: unknown) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Failed to update your profile."
      );
    } finally {
      setProfileSaving(false);
    }
  }

  // ── Change password ─────────────────────────────────────────────────────

  async function changePassword() {
    if (!currentPw) {
      toast.error("Please enter your current password.");
      return;
    }

    if (newPw.length < 8) {
      toast.error("Your new password must be at least 8 characters.");
      return;
    }

    if (newPw !== confirmPw) {
      toast.error("Your new passwords do not match.");
      return;
    }

    setPwSaving(true);

    try {
      const { data } = await safeFetch("/api/profile/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: currentPw,
          newPassword: newPw,
        }),
      });

      if (!data.success) {
        throw new Error(
          data.message ?? "Failed to change your password."
        );
      }

      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");

      toast.success(
        "Password changed successfully. A confirmation email has been sent to " +
          email
      );
    } catch (e: unknown) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Failed to change your password."
      );
    } finally {
      setPwSaving(false);
    }
  }

  // ── Derived values ───────────────────────────────────────────────────────

  const strength = passwordStrength(newPw);

  const role = user?.role ?? "guest";

  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  const avatarBg = [
    "bg-blue-500",
    "bg-violet-500",
    "bg-emerald-500",
  ][(name.charCodeAt(0) ?? 0) % 3];

  // Main input style
  const inputCls =
    "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7A1B0F] focus:border-[#7A1B0F] bg-white";

  // Disabled input style
  const disabledCls =
    "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-600 cursor-not-allowed";

  if (loadingProfile) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#7A1B0F] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
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

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Header */}
      {/* ─────────────────────────────────────────────────────────────────── */}

      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          My Profile
        </h1>

        <p className="text-slate-600 text-sm mt-1">
          Manage your personal information, profile photo, password, and
          account details.
        </p>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Personal Information */}
      {/* ─────────────────────────────────────────────────────────────────── */}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-[#7A1B0F]/10 text-[#7A1B0F] flex items-center justify-center">
            <Icons.User />
          </div>

          <div>
            <h2 className="font-semibold text-slate-900">
              Personal Information
            </h2>

            <p className="text-xs text-slate-600 mt-0.5">
              Update the information associated with your account.
            </p>
          </div>
        </div>

        {/* ── Profile Photo ─────────────────────────────────────────────── */}

        <div className="mb-7">
          <div className="flex items-center gap-5">
            <div className="relative flex-shrink-0">
              <div
                className={`w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center ${
                  photoPreview ? "" : avatarBg
                }`}
              >
                {photoPreview ? (
                  <Image
                    src={photoPreview}
                    alt="Profile photo"
                    width={80}
                    height={80}
                    sizes="80px"
                    className="object-cover w-full h-full"
                    unoptimized={photoPreview.startsWith("blob:")}
                  />
                ) : (
                  <span className="text-white text-2xl font-bold">
                    {initials}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#7A1B0F] hover:opacity-90 text-white rounded-full flex items-center justify-center shadow-md transition"
                title="Change profile photo"
              >
                <Icons.Camera />
              </button>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            <div>
              <p className="font-semibold text-slate-900">
                {name || "Your Name"}
              </p>

              <p className="text-slate-600 text-sm mt-0.5">
                {email}
              </p>

              <span
                className={`inline-block mt-2 px-2.5 py-1 text-[11px] font-semibold rounded-full ${
                  ROLE_COLORS[role] ?? ROLE_COLORS.guest
                }`}
              >
                {ROLE_LABELS[role] ?? role}
              </span>

              {photoFile && (
                <p className="text-xs text-[#7A1B0F] font-medium mt-2">
                  New photo selected. Save your profile to upload it.
                </p>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-600 mt-3">
            Choose a clear profile photo. The image must be less than 5 MB.
          </p>
        </div>

        {/* ── Fields ────────────────────────────────────────────────────── */}

        <div className="space-y-5">
          {/* Full name */}

          <div>
            <label className="block text-xs font-semibold text-slate-900 mb-1.5">
              Full Name
            </label>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              className={inputCls}
            />

            <p className="text-[11px] text-slate-600 mt-1.5">
              Enter your name as you would like it to appear throughout the
              platform.
            </p>
          </div>

          {/* Email */}

          <div>
            <label className="block text-xs font-semibold text-slate-900 mb-1.5">
              Email Address
            </label>

            <input
              value={email}
              disabled
              className={disabledCls}
            />

            <p className="text-[11px] text-slate-600 mt-1.5">
              Your email identifies your account and cannot be changed here.
              Contact an administrator if you need to update it.
            </p>
          </div>

          {/* Phone */}

          <div>
            <label className="block text-xs font-semibold text-slate-900 mb-1.5">
              Phone Number
            </label>

            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+254 7XX XXX XXX"
              className={inputCls}
            />

            <p className="text-[11px] text-slate-600 mt-1.5">
              Add a phone number where you can be reached for important
              account or booking-related communication.
            </p>
          </div>

          {/* Gender */}

          <div>
            <label className="block text-xs font-semibold text-slate-900 mb-1.5">
              Gender
            </label>

            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className={inputCls}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">
                Prefer not to say
              </option>
            </select>

            <p className="text-[11px] text-slate-600 mt-1.5">
              Select the option that best represents your preference.
            </p>
          </div>

          {/* Role */}

          <div>
            <label className="block text-xs font-semibold text-slate-900 mb-1.5">
              Account Role
            </label>

            <input
              value={ROLE_LABELS[role] ?? role}
              disabled
              className={disabledCls}
            />

            <p className="text-[11px] text-slate-600 mt-1.5">
              Your role determines which areas of the platform you can
              access. Only an administrator can change your role.
            </p>
          </div>

          {/* Save */}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={saveProfile}
              disabled={profileSaving || photoUploading}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#7A1B0F] hover:opacity-90 text-white text-sm font-semibold rounded-xl transition shadow-sm shadow-[#7A1B0F]/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {profileSaving || photoUploading ? (
                <Icons.Spinner />
              ) : (
                <Icons.Save />
              )}

              {photoUploading
                ? "Uploading Photo..."
                : profileSaving
                ? "Saving..."
                : "Save Profile"}
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Change Password */}
      {/* ─────────────────────────────────────────────────────────────────── */}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-2 pb-6 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-[#7A1B0F]/10 text-[#7A1B0F] flex items-center justify-center">
            <Icons.Lock />
          </div>

          <div>
            <h2 className="font-semibold text-slate-900">
              Change Password
            </h2>

            <p className="text-xs text-slate-600 mt-0.5">
              Keep your account secure by regularly using a strong password.
            </p>
          </div>
        </div>

        <div className="space-y-5 mt-6">
          {/* Current password */}

          <div>
            <label className="block text-xs font-semibold text-slate-900 mb-1.5">
              Current Password
            </label>

            <PasswordInput
              value={currentPw}
              onChange={setCurrentPw}
              placeholder="Enter your current password"
            />
          </div>

          {/* New password */}

          <div>
            <label className="block text-xs font-semibold text-slate-900 mb-1.5">
              New Password
            </label>

            <PasswordInput
              value={newPw}
              onChange={setNewPw}
              placeholder="Enter a new password"
            />

            {newPw && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all ${
                        i <= strength.score
                          ? strength.color
                          : "bg-slate-200"
                      }`}
                    />
                  ))}
                </div>

                <p className="text-xs text-slate-600">
                  {strength.label &&
                    `Password strength: ${strength.label}`}
                </p>
              </div>
            )}
          </div>

          {/* Confirm password */}

          <div>
            <label className="block text-xs font-semibold text-slate-900 mb-1.5">
              Confirm New Password
            </label>

            <PasswordInput
              value={confirmPw}
              onChange={setConfirmPw}
              placeholder="Enter the new password again"
            />

            {confirmPw && newPw !== confirmPw && (
              <p className="text-xs text-red-600 font-medium mt-1.5">
                The passwords do not match.
              </p>
            )}

            {confirmPw && newPw === confirmPw && newPw.length >= 8 && (
              <p className="text-xs text-emerald-600 font-medium mt-1.5">
                ✓ Passwords match.
              </p>
            )}
          </div>

          {/* Password requirements */}

          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-4">
            <p className="font-semibold text-slate-900 text-sm mb-2">
              Password Requirements
            </p>

            <p className="text-xs text-slate-600 mb-3">
              Use a strong password that includes all of the following:
            </p>

            <div className="space-y-1.5 text-xs">
              {[
                {
                  rule: "At least 8 characters",
                  met: newPw.length >= 8,
                },
                {
                  rule: "At least one uppercase letter",
                  met: /[A-Z]/.test(newPw),
                },
                {
                  rule: "At least one number",
                  met: /[0-9]/.test(newPw),
                },
                {
                  rule: "At least one special character",
                  met: /[^A-Za-z0-9]/.test(newPw),
                },
              ].map(({ rule, met }) => (
                <p
                  key={rule}
                  className={
                    met && newPw
                      ? "text-emerald-700 font-medium"
                      : "text-slate-700"
                  }
                >
                  <span className="inline-block w-5">
                    {met && newPw ? "✓" : "○"}
                  </span>

                  {rule}
                </p>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-600">
            After changing your password, a confirmation email will be sent
            to <span className="font-semibold text-slate-900">{email}</span>.
          </p>

          {/* Change password button */}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={changePassword}
              disabled={pwSaving}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#7A1B0F] hover:opacity-90 text-white text-sm font-semibold rounded-xl transition shadow-sm shadow-[#7A1B0F]/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {pwSaving ? <Icons.Spinner /> : <Icons.Lock />}

              {pwSaving
                ? "Updating Password..."
                : "Change Password"}
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Session Information */}
      {/* ─────────────────────────────────────────────────────────────────── */}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-5">
        <div className="mb-4">
          <h3 className="font-semibold text-slate-900 text-sm">
            Session Information
          </h3>

          <p className="text-xs text-slate-600 mt-1">
            Basic information associated with your current account session.
          </p>
        </div>

        <div className="space-y-3 text-sm">
          {/* Signed in as */}

          <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100">
            <span className="text-slate-700 font-medium">
              Signed in as
            </span>

            <span className="font-medium text-slate-900 text-right break-all">
              {email || "—"}
            </span>
          </div>

          {/* Role */}

          <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100">
            <span className="text-slate-700 font-medium">
              Account Role
            </span>

            <span
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-full ${
                ROLE_COLORS[role] ?? ROLE_COLORS.guest
              }`}
            >
              {ROLE_LABELS[role] ?? role}
            </span>
          </div>

          {/* User ID */}

          <div className="flex items-center justify-between gap-4 py-2">
            <span className="text-slate-700 font-medium">
              User ID
            </span>

            <span className="font-mono text-xs text-slate-600 break-all text-right">
              {user?.id ?? "—"}
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Security note */}
      {/* ─────────────────────────────────────────────────────────────────── */}

      <div className="rounded-2xl border border-[#7A1B0F]/20 bg-[#7A1B0F]/5 px-5 py-4">
        <p className="text-sm font-semibold text-[#7A1B0F]">
          Keep your account secure
        </p>

        <p className="text-xs text-slate-700 mt-1 leading-5">
          Never share your password with anyone. If you believe someone has
          accessed your account without permission, change your password
          immediately and contact an administrator.
        </p>
      </div>
    </div>
  );
}