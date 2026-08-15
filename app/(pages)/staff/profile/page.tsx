"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import toast, { Toaster } from "react-hot-toast";

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  gender: string;
  photo: string;
}

export default function StaffProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);

  const [profile,      setProfile]      = useState<ProfileData | null>(null);
  const [form,         setForm]         = useState({ name: "", phone: "", gender: "prefer_not_to_say" });
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoFile,    setPhotoFile]    = useState<File | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);

  const [pwForm,   setPwForm]   = useState({ current: "", next: "", confirm: "" });
  const [showPw,   setShowPw]   = useState({ current: false, next: false, confirm: false });
  const [savingPw, setSavingPw] = useState(false);

  const position = (session?.user as { role?: string })?.role ?? "";

  const POSITION_LABELS: Record<string, string> = {
    admin:            "Administrator",
    property_manager: "Property Manager",
    receptionist:     "Receptionist",
    caretaker:        "Caretaker",
    accountant:       "Accountant",
    security:         "Security",
    maintenance:      "Maintenance",
  };

  // ── Load profile and pre-populate form ──────────────────────────────────────
  useEffect(() => {
    fetch("/api/profile")
      .then(async r => {
        const text = await r.text();
        if (!text) throw new Error("Empty response from server.");
        return JSON.parse(text);
      })
      .then(d => {
        if (d.success) {
          setProfile(d.data);
          setForm({
            name:   d.data.name   ?? "",
            phone:  d.data.phone  ?? "",
            gender: d.data.gender ?? "prefer_not_to_say",
          });
          setPhotoPreview(d.data.photo ?? "");
        } else {
          toast.error(d.message ?? "Failed to load profile");
        }
      })
      .catch(e => toast.error(e.message ?? "Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Photo must be under 5 MB."); return; }
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file."); return; }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const uploadPhoto = async (file: File): Promise<string> => {
    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "");
    data.append("folder", "jluvstays/profiles");
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: "POST", body: data }
    );
    if (!res.ok) throw new Error("Upload failed");
    return (await res.json()).secure_url as string;
  };

  const handleSaveProfile = async () => {
    if (!form.name.trim()) { toast.error("Name is required."); return; }
    setSaving(true);
    try {
      let photoUrl = profile?.photo ?? "";
      if (photoFile) {
        try { photoUrl = await uploadPhoto(photoFile); }
        catch { toast.error("Photo upload failed. Saving without photo update."); }
      }
      const res  = await fetch("/api/profile", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...form, photo: photoUrl }),
      });
      const text = await res.text();
      if (!text) throw new Error("Server returned an empty response.");
      const data = JSON.parse(text);
      if (!data.success) throw new Error(data.message);
      setProfile(prev => prev ? { ...prev, ...form, photo: photoUrl } : prev);
      await updateSession({ name: form.name });
      toast.success("Profile updated.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) {
      toast.error("All password fields are required.");
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      toast.error("New passwords do not match.");
      return;
    }
    if (pwForm.next.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setSavingPw(true);
    try {
      const res  = await fetch("/api/profile/password", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      });
      const text = await res.text();
      if (!text) throw new Error("Server returned an empty response.");
      const data = JSON.parse(text);
      if (!data.success) throw new Error(data.message);
      toast.success("Password changed. A confirmation email has been sent.");
      setPwForm({ current: "", next: "", confirm: "" });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to change password.");
    } finally {
      setSavingPw(false);
    }
  };

  const EyeToggle = ({ field }: { field: keyof typeof showPw }) => (
    <button
      type="button"
      onClick={() => setShowPw(p => ({ ...p, [field]: !p[field] }))}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
    >
      {showPw[field] ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
      )}
    </button>
  );

  const inputCls = "w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white text-slate-800";
  const labelCls = "block text-sm font-medium text-slate-700 mb-1.5";

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-center" toastOptions={{
        style: { borderRadius: "10px", background: "#1e293b", color: "#f8fafc", fontSize: "14px" },
      }} />

      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">My Profile</h1>
          <p className="text-slate-500 text-sm mt-1">Update your personal details and password.</p>
        </div>

        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          <h2 className="font-semibold text-slate-800">Personal details</h2>

          {/* Photo */}
          <div className="flex items-center gap-5">
            <div
              onClick={() => fileRef.current?.click()}
              className="relative w-20 h-20 rounded-full overflow-hidden bg-violet-100 flex items-center justify-center cursor-pointer group flex-shrink-0"
            >
              {photoPreview ? (
                <Image src={photoPreview} alt="Photo" fill className="object-cover" />
              ) : (
                <span className="text-3xl font-bold text-violet-500">
                  {form.name?.charAt(0).toUpperCase() ?? "?"}
                </span>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            <div>
              <p className="font-semibold text-slate-800">{form.name}</p>
              <p className="text-sm text-slate-500">{POSITION_LABELS[position] ?? position}</p>
              <button
                onClick={() => fileRef.current?.click()}
                className="text-xs text-violet-600 hover:text-violet-700 mt-1"
              >
                Change photo
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
            </div>
          </div>

          {/* Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>Full name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                value={profile?.email ?? ""}
                disabled
                className={`${inputCls} bg-slate-50 text-slate-400 cursor-not-allowed`}
              />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="+254 7XX XXX XXX"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Gender</label>
              <select
                value={form.gender}
                onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}
                className={inputCls}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition disabled:opacity-60 flex items-center gap-2"
          >
            {saving && (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>

        {/* Password card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          <div>
            <h2 className="font-semibold text-slate-800">Change password</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              A confirmation email will be sent to {profile?.email} after changing.
            </p>
          </div>

          <div className="space-y-4">
            {([
              { field: "current" as const, label: "Current password",     placeholder: "Enter current password"  },
              { field: "next"    as const, label: "New password",          placeholder: "Min. 8 characters"        },
              { field: "confirm" as const, label: "Confirm new password",  placeholder: "Re-enter new password"   },
            ]).map(({ field, label, placeholder }) => (
              <div key={field}>
                <label className={labelCls}>{label}</label>
                <div className="relative">
                  <input
                    type={showPw[field] ? "text" : "password"}
                    value={pwForm[field]}
                    onChange={e => setPwForm(p => ({ ...p, [field]: e.target.value }))}
                    placeholder={placeholder}
                    className={`${inputCls} pr-10`}
                  />
                  <EyeToggle field={field} />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleChangePassword}
            disabled={savingPw}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-60 flex items-center gap-2"
          >
            {savingPw && (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {savingPw ? "Updating…" : "Update password"}
          </button>
        </div>
      </div>
    </>
  );
}