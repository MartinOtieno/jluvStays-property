"use client";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import toast, { Toaster } from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────
type TabKey = "general" | "contact" | "address" | "hours" | "social" | "branding" | "photos" | "highlights" | "rules" | "nearby";
interface BusinessHour { day: string; open: boolean; from: string; to: string; }
interface BuildingPhoto { src: string; label: string; }
interface Highlight { icon: string; title: string; description: string; }
interface NearbyPlace { icon: string; label: string; value: string; }
interface Settings {
  name: string; tagline: string; description: string;
  logo: string; primaryColor: string;
  phone: string; email: string; whatsapp: string;
  street: string; estate: string; city: string; mapsUrl: string;
  businessHours: BusinessHour[];
  facebook: string; instagram: string; twitter: string; tiktok: string;
  buildingPhotos: BuildingPhoto[];
  highlights: Highlight[];
  rules: string[];
  nearbyPlaces: NearbyPlace[];
}

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const DEFAULT: Settings = {
  name: "JluvStays", tagline: "", description: "",
  logo: "", primaryColor: "#7A1B0F",
  phone: "", email: "", whatsapp: "",
  street: "", estate: "", city: "Chicago", mapsUrl: "",
  businessHours: DAYS.map(day => ({ day, open: !["Saturday","Sunday"].includes(day), from: "08:00", to: "17:00" })),
  facebook: "", instagram: "", twitter: "", tiktok: "",
  buildingPhotos: [], highlights: [], rules: [], nearbyPlaces: [],
};

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icons = {
  Save: () => <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  Plus: () => <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14"/></svg>,
  Trash: () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>,
  Upload: () => <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>,
  Spinner: () => <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>,
};

// ─── Tab config ───────────────────────────────────────────────────────────────
const TABS: { key: TabKey; label: string; group: string }[] = [
  { key: "general", label: "General", group: "Property" },
  { key: "contact", label: "Contact", group: "Property" },
  { key: "address", label: "Address", group: "Property" },
  { key: "hours", label: "Hours", group: "Property" },
  { key: "social", label: "Social Media", group: "Property" },
  { key: "branding", label: "Branding", group: "Property" },
  { key: "photos", label: "Photos", group: "Content" },
  { key: "highlights", label: "Highlights", group: "Content" },
  { key: "rules", label: "House Rules", group: "Content" },
  { key: "nearby", label: "Nearby Places", group: "Content" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const inputCls = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7A1B0F] focus:border-transparent";

function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5">
      <label className="block text-xs font-semibold text-slate-700">{children}</label>
      {hint && <p className="text-[11px] text-slate-500 mt-0.5">{hint}</p>}
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h2 className="font-bold text-slate-900 text-base">{title}</h2>
      {description && <p className="text-sm text-slate-600 mt-0.5">{description}</p>}
    </div>
  );
}

// ─── Cloudinary upload ────────────────────────────────────────────────────────
async function uploadToCloudinary(file: File): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !preset) {
    console.error("Missing Cloudinary env variables");
    throw new Error("Cloudinary not configured");
  }
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", preset);
  fd.append("folder", "jluvstays/property");
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: fd }
  );
  const data = await res.json();
  if (!res.ok) {
    console.error("Cloudinary error:", data);
    throw new Error(data.error?.message || "Upload failed");
  }
  return data.secure_url;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PropertySettingsPage() {
  const [tab, setTab] = useState<TabKey>("general");
  const [settings, setSettings] = useState<Settings>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  // ── Load ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/property-settings")
      .then(r => r.json())
      .then(({ success, data: d }) => {
        if (!success || !d) return;
        setSettings({
          name: d.name ?? DEFAULT.name,
          tagline: d.tagline ?? "",
          description: d.description ?? "",
          logo: d.logo ?? "",
          primaryColor: d.primaryColor ?? "#7A1B0F",
          phone: d.phone ?? "",
          email: d.email ?? "",
          whatsapp: d.whatsapp ?? "",
          street: d.address?.street ?? "",
          estate: d.address?.estate ?? "",
          city: d.address?.city ?? "Chicago",
          mapsUrl: d.address?.mapsUrl ?? "",
          businessHours: d.businessHours?.length ? d.businessHours : DEFAULT.businessHours,
          facebook: d.social?.facebook ?? "",
          instagram: d.social?.instagram ?? "",
          twitter: d.social?.twitter ?? "",
          tiktok: d.social?.tiktok ?? "",
          buildingPhotos: d.buildingPhotos ?? [],
          highlights: d.highlights ?? [],
          rules: d.rules ?? [],
          nearbyPlaces: d.nearbyPlaces ?? [],
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Save ───────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/property-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: settings.name, tagline: settings.tagline, description: settings.description,
          logo: settings.logo, primaryColor: settings.primaryColor,
          phone: settings.phone, email: settings.email, whatsapp: settings.whatsapp,
          address: { street: settings.street, estate: settings.estate, city: settings.city, mapsUrl: settings.mapsUrl },
          businessHours: settings.businessHours,
          social: { facebook: settings.facebook, instagram: settings.instagram, twitter: settings.twitter, tiktok: settings.tiktok },
          buildingPhotos: settings.buildingPhotos,
          highlights: settings.highlights,
          rules: settings.rules,
          nearbyPlaces: settings.nearbyPlaces,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message ?? "Save failed");
      toast.success("Settings saved successfully.");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  // ── Field helpers ──────────────────────────────────────────────────────────
  const set = (field: keyof Settings) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setSettings(p => ({ ...p, [field]: e.target.value }));

  function setHour(i: number, field: keyof BusinessHour, value: string | boolean) {
    setSettings(p => {
      const h = [...p.businessHours];
      h[i] = { ...h[i], [field]: value };
      return { ...p, businessHours: h };
    });
  }

  // ── Logo upload ────────────────────────────────────────────────────────────
  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Logo must be under 5 MB."); return; }
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setSettings(p => ({ ...p, logo: url }));
      toast.success("Logo uploaded.");
    } catch { toast.error("Logo upload failed."); }
    finally { setUploading(false); }
  }

  // ── Building photo upload ──────────────────────────────────────────────────
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(files.map(uploadToCloudinary));
      const newPhotos: BuildingPhoto[] = urls.map(src => ({ src, label: "" }));
      setSettings(p => ({ ...p, buildingPhotos: [...p.buildingPhotos, ...newPhotos] }));
      toast.success(`${urls.length} photo${urls.length > 1 ? "s" : ""} uploaded.`);
    } catch { toast.error("Photo upload failed."); }
    finally { setUploading(false); if (photoRef.current) photoRef.current.value = ""; }
  }

  function updatePhoto(i: number, label: string) {
    setSettings(p => { const a = [...p.buildingPhotos]; a[i] = { ...a[i], label }; return { ...p, buildingPhotos: a }; });
  }
  function removePhoto(i: number) {
    setSettings(p => ({ ...p, buildingPhotos: p.buildingPhotos.filter((_, idx) => idx !== i) }));
  }

  // ── Highlights ─────────────────────────────────────────────────────────────
  function addHighlight() {
    setSettings(p => ({ ...p, highlights: [...p.highlights, { icon: "⭐", title: "", description: "" }] }));
  }
  function updateHighlight(i: number, field: keyof Highlight, value: string) {
    setSettings(p => { const a = [...p.highlights]; a[i] = { ...a[i], [field]: value }; return { ...p, highlights: a }; });
  }
  function removeHighlight(i: number) {
    setSettings(p => ({ ...p, highlights: p.highlights.filter((_, idx) => idx !== i) }));
  }

  // ── Rules ──────────────────────────────────────────────────────────────────
  function addRule() { setSettings(p => ({ ...p, rules: [...p.rules, ""] })); }
  function updateRule(i: number, v: string) {
    setSettings(p => { const a = [...p.rules]; a[i] = v; return { ...p, rules: a }; });
  }
  function removeRule(i: number) { setSettings(p => ({ ...p, rules: p.rules.filter((_, idx) => idx !== i) })); }

  // ── Nearby places ──────────────────────────────────────────────────────────
  function addNearby() {
    setSettings(p => ({ ...p, nearbyPlaces: [...p.nearbyPlaces, { icon: "📍", label: "", value: "" }] }));
  }
  function updateNearby(i: number, field: keyof NearbyPlace, value: string) {
    setSettings(p => { const a = [...p.nearbyPlaces]; a[i] = { ...a[i], [field]: value }; return { ...p, nearbyPlaces: a }; });
  }
  function removeNearby(i: number) {
    setSettings(p => ({ ...p, nearbyPlaces: p.nearbyPlaces.filter((_, idx) => idx !== i) }));
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse max-w-4xl">
        <div className="h-8 w-56 bg-slate-200 rounded-lg" />
        <div className="h-12 bg-slate-100 rounded-2xl" />
        <div className="h-72 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  const groups = Array.from(new Set(TABS.map(t => t.group)));

  return (
    <div className="space-y-6 max-w-4xl pb-24">
      <Toaster position="top-center" toastOptions={{
        style: { borderRadius: "10px", background: "#1e293b", color: "#f8fafc", fontSize: "14px" },
        success: { iconTheme: { primary: "#22c55e", secondary: "#fff" } },
        error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
      }} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Property Settings</h1>
          <p className="text-slate-600 text-sm mt-0.5">Manage your property profile, contact info, content and branding</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || uploading}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#7A1B0F] hover:opacity-90 text-white text-sm font-semibold rounded-xl transition shadow-sm shadow-[#7A1B0F]/20 disabled:opacity-60 disabled:cursor-not-allowed flex-shrink-0"
        >
          {saving ? <Icons.Spinner /> : <Icons.Save />}
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {/* Tab bar — grouped */}
      <div className="space-y-1">
        {groups.map(group => (
          <div key={group}>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1 mb-1">{group}</p>
            <div className="flex gap-1 flex-wrap">
              {TABS.filter(t => t.group === group).map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                    tab === t.key
                      ? "bg-[#7A1B0F] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">

        {/* ── General ── */}
        {tab === "general" && (
          <div className="space-y-5">
            <SectionHeader title="General Information" />
            <div>
              <Label>Property Name</Label>
              <input value={settings.name} onChange={set("name")} placeholder="JluvStays" className={inputCls} />
            </div>
            <div>
              <Label hint="Short line shown on the homepage hero">Tagline</Label>
              <input value={settings.tagline} onChange={set("tagline")} placeholder="Find your perfect room in Chicago" className={inputCls} />
            </div>
            <div>
              <Label>Description</Label>
              <textarea value={settings.description} onChange={set("description")} rows={5}
                placeholder="Tell guests about your property…" className={`${inputCls} resize-none`} />
            </div>
          </div>
        )}

        {/* ── Contact ── */}
        {tab === "contact" && (
          <div className="space-y-5">
            <SectionHeader title="Contact Details" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div><Label>Phone Number</Label><input value={settings.phone} onChange={set("phone")} placeholder="+1 (312) 000-0000" className={inputCls} /></div>
              <div><Label>Email Address</Label><input type="email" value={settings.email} onChange={set("email")} placeholder="info@jluvstays.com" className={inputCls} /></div>
              <div><Label hint="Used for WhatsApp chat button">WhatsApp Number</Label><input value={settings.whatsapp} onChange={set("whatsapp")} placeholder="+1 (312) 000-0000" className={inputCls} /></div>
            </div>
          </div>
        )}

        {/* ── Address ── */}
        {tab === "address" && (
          <div className="space-y-5">
            <SectionHeader title="Property Address" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div><Label>Street / Road</Label><input value={settings.street} onChange={set("street")} placeholder="e.g. 6142 S Rhodes Ave" className={inputCls} /></div>
              <div><Label>Estate / Neighbourhood</Label><input value={settings.estate} onChange={set("estate")} placeholder="e.g. Woodlawn" className={inputCls} /></div>
              <div><Label>City</Label><input value={settings.city} onChange={set("city")} placeholder="Chicago" className={inputCls} /></div>
              <div><Label hint="Paste Google Maps share link">Google Maps Link</Label><input value={settings.mapsUrl} onChange={set("mapsUrl")} placeholder="https://maps.google.com/…" className={inputCls} /></div>
            </div>
            {settings.mapsUrl && (
              <a href={settings.mapsUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-[#7A1B0F] hover:underline">
                View on Google Maps →
              </a>
            )}
          </div>
        )}

        {/* ── Business Hours ── */}
        {tab === "hours" && (
          <div className="space-y-5">
            <SectionHeader title="Business Hours" description="Set operating hours for each day of the week." />
            <div className="space-y-2">
              {settings.businessHours.map((bh, i) => (
                <div key={bh.day} className="flex items-center gap-4 py-3 border-b border-slate-50 last:border-0">
                  <button
                    onClick={() => setHour(i, "open", !bh.open)}
                    className={`relative w-10 rounded-full transition flex-shrink-0 ${bh.open ? "bg-[#7A1B0F]" : "bg-slate-200"}`}
                    style={{ height: 22 }}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${bh.open ? "translate-x-5" : "translate-x-0.5"}`} />
                  </button>
                  <span className={`w-24 text-sm font-medium flex-shrink-0 ${bh.open ? "text-slate-900" : "text-slate-400"}`}>{bh.day}</span>
                  {bh.open ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={bh.from}
                        onChange={e => setHour(i, "from", e.target.value)}
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7A1B0F]"
                      />
                      <span className="text-slate-500 text-sm">to</span>
                      <input
                        type="time"
                        value={bh.to}
                        onChange={e => setHour(i, "to", e.target.value)}
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7A1B0F]"
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">Closed</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Social ── */}
        {tab === "social" && (
          <div className="space-y-5">
            <SectionHeader title="Social Media Links" description="Leave blank if not applicable." />
            {([
              { field: "facebook" as const, label: "Facebook", placeholder: "https://facebook.com/yourpage" },
              { field: "instagram" as const, label: "Instagram", placeholder: "https://instagram.com/yourprofile"},
              { field: "twitter" as const, label: "X (Twitter)", placeholder: "https://x.com/yourhandle" },
              { field: "tiktok" as const, label: "TikTok", placeholder: "https://tiktok.com/@yourprofile" },
            ]).map(({ field, label, placeholder }) => (
              <div key={field}>
                <Label>{label}</Label>
                <input value={settings[field]} onChange={set(field)} placeholder={placeholder} className={inputCls} />
              </div>
            ))}
          </div>
        )}

        {/* ── Branding ── */}
        {tab === "branding" && (
          <div className="space-y-6">
            <SectionHeader title="Branding" />
            <div>
              <Label hint="Recommended: PNG or SVG, min 200×200 px">Property Logo</Label>
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50 flex-shrink-0">
                  {settings.logo
                    ? <Image src={settings.logo} alt="Logo" width={80} height={80} className="object-contain" />
                    : <span className="text-3xl">🏠</span>}
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => logoRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-sm text-slate-700 rounded-xl hover:bg-slate-50 transition disabled:opacity-60"
                  >
                    {uploading ? <Icons.Spinner /> : <Icons.Upload />}
                    {uploading ? "Uploading…" : "Upload Logo"}
                  </button>
                  {settings.logo && (
                    <button onClick={() => setSettings(p => ({ ...p, logo: "" }))} className="block text-xs text-red-500 hover:underline">
                      Remove logo
                    </button>
                  )}
                  <input ref={logoRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </div>
              </div>
            </div>
            <div>
              <Label hint="Primary accent colour across the site">Primary Colour</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={settings.primaryColor}
                  onChange={e => setSettings(p => ({ ...p, primaryColor: e.target.value }))}
                  className="w-12 h-10 rounded-xl border border-slate-200 cursor-pointer p-1" />
                <input value={settings.primaryColor}
                  onChange={e => setSettings(p => ({ ...p, primaryColor: e.target.value }))}
                  className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm w-36 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7A1B0F] font-mono" />
                <div className="w-10 h-10 rounded-xl border border-slate-200 flex-shrink-0" style={{ background: settings.primaryColor }} />
              </div>
            </div>
          </div>
        )}

        {/* ── Building Photos ── */}
        {tab === "photos" && (
          <div className="space-y-5">
            <SectionHeader title="Building Photos" description="Photos shown on the About / homepage gallery." />
            <div>
              <button
                onClick={() => photoRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 bg-[#7A1B0F] hover:opacity-90 text-white text-sm font-semibold rounded-xl transition disabled:opacity-60"
              >
                {uploading ? <Icons.Spinner /> : <Icons.Upload />}
                {uploading ? "Uploading…" : "Upload Photos"}
              </button>
              <input ref={photoRef} type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
            </div>
            {settings.buildingPhotos.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                <p className="text-slate-500 text-sm">No photos yet. Click Upload Photos to add some.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {settings.buildingPhotos.map((photo, i) => (
                  <div key={i} className="group relative rounded-xl overflow-hidden border border-slate-200">
                    <div className="aspect-video relative bg-slate-100">
                      <Image src={photo.src} alt={photo.label || `Photo ${i+1}`} fill className="object-cover" />
                    </div>
                    <div className="p-2">
                      <input
                        value={photo.label}
                        onChange={e => updatePhoto(i, e.target.value)}
                        placeholder="Add a caption…"
                        className="w-full text-xs text-slate-900 border border-slate-200 rounded-lg px-2 py-1.5 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#7A1B0F]"
                      />
                    </div>
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow"
                    >
                      <Icons.Trash />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Highlights ── */}
        {tab === "highlights" && (
          <div className="space-y-5">
            <SectionHeader title="Property Highlights" description="Key features shown on the About page." />
            <button onClick={addHighlight}
              className="flex items-center gap-2 px-4 py-2 border border-[#7A1B0F]/30 text-[#7A1B0F] text-sm font-semibold rounded-xl hover:bg-[#7A1B0F]/5 transition">
              <Icons.Plus /> Add Highlight
            </button>
            {settings.highlights.length === 0 ? (
              <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                <p className="text-slate-500 text-sm">No highlights yet. Add some features to showcase.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {settings.highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 border border-slate-200 rounded-xl">
                    <input value={h.icon} onChange={e => updateHighlight(i, "icon", e.target.value)}
                      placeholder="⭐" className="w-12 text-center border border-slate-200 rounded-lg px-2 py-2 text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7A1B0F] flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <input value={h.title} onChange={e => updateHighlight(i, "title", e.target.value)}
                        placeholder="Feature title" className={inputCls} />
                      <input value={h.description} onChange={e => updateHighlight(i, "description", e.target.value)}
                        placeholder="Short description" className={inputCls} />
                    </div>
                    <button onClick={() => removeHighlight(i)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition flex-shrink-0">
                      <Icons.Trash />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Rules ── */}
        {tab === "rules" && (
          <div className="space-y-5">
            <SectionHeader title="House Rules" description="Rules shown to guests before and after booking." />
            <button onClick={addRule}
              className="flex items-center gap-2 px-4 py-2 border border-[#7A1B0F]/30 text-[#7A1B0F] text-sm font-semibold rounded-xl hover:bg-[#7A1B0F]/5 transition">
              <Icons.Plus /> Add Rule
            </button>
            {settings.rules.length === 0 ? (
              <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                <p className="text-slate-500 text-sm">No rules yet. Add some to help guests understand expectations.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {settings.rules.map((rule, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-slate-500 text-sm w-5 text-right flex-shrink-0">{i+1}.</span>
                    <input value={rule} onChange={e => updateRule(i, e.target.value)}
                      placeholder="e.g. No smoking on the premises"
                      className={`${inputCls} flex-1`} />
                    <button onClick={() => removeRule(i)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition flex-shrink-0">
                      <Icons.Trash />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Nearby Places ── */}
        {tab === "nearby" && (
          <div className="space-y-5">
            <SectionHeader title="Nearby Places" description="Points of interest displayed on the location section." />
            <button onClick={addNearby}
              className="flex items-center gap-2 px-4 py-2 border border-[#7A1B0F]/30 text-[#7A1B0F] text-sm font-semibold rounded-xl hover:bg-[#7A1B0F]/5 transition">
              <Icons.Plus /> Add Place
            </button>
            {settings.nearbyPlaces.length === 0 ? (
              <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                <p className="text-slate-500 text-sm">No nearby places yet. Add shops, schools, hospitals etc.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {settings.nearbyPlaces.map((np, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl">
                    <input value={np.icon} onChange={e => updateNearby(i, "icon", e.target.value)}
                      placeholder="📍" className="w-12 text-center border border-slate-200 rounded-lg px-2 py-2 text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7A1B0F] flex-shrink-0" />
                    <input value={np.label} onChange={e => updateNearby(i, "label", e.target.value)}
                      placeholder="e.g. Supermarket" className={`${inputCls} flex-1`} />
                    <input value={np.value} onChange={e => updateNearby(i, "value", e.target.value)}
                      placeholder="e.g. 5 min walk" className={`${inputCls} flex-1`} />
                    <button onClick={() => removeNearby(i)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition flex-shrink-0">
                      <Icons.Trash />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky mobile save bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 z-30">
        <button onClick={handleSave} disabled={saving || uploading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-[#7A1B0F] hover:opacity-90 text-white text-sm font-semibold rounded-xl transition disabled:opacity-60">
          {saving ? <Icons.Spinner /> : <Icons.Save />}
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}