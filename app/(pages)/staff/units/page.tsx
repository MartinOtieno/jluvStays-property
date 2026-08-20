// room-booking/app/(pages)/admin/units/page.tsx

"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

type RentalType = "long_term" | "mid_term" | "short_term";

interface Unit {
  _id: string;
  title: string;
  description: string;
  rentalType: RentalType;
  bedrooms: number;
  pricePerMonth?: number;
  furnished?: boolean;
  images: string[];
  amenities: string[];
  status: "active" | "inactive" | "archived";
}

const RENTAL_TYPE_LABEL: Record<RentalType, string> = {
  long_term: "Long Term",
  mid_term: "Mid Term",
  short_term: "Short Term",
};

const emptyForm = {
  title: "",
  description: "",
  rentalType: "long_term" as RentalType,
  bedrooms: "2",
  pricePerMonth: "",
  furnished: false,
  amenities: "",
  status: "active" as "active" | "inactive" | "archived",
};

interface ImageEntry {
  url: string;
  preview: string;
}

const emptyImageEntry: ImageEntry = { url: "", preview: "" };

export default function AdminUnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [images, setImages] = useState<ImageEntry[]>([{ ...emptyImageEntry }]);
  const [saving, setSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [buildingAddress, setBuildingAddress] = useState("");

  useEffect(() => {
    loadUnits();
    loadBuildingAddress();
  }, []);

  const loadUnits = async () => {
    setLoading(true);
    try {
      // status=all bypasses the GET route's default "active"-only filter —
      // admins need to see inactive/archived units too.
      const res = await fetch("/api/units?status=all");
      const data = await res.json();
      if (data.success) setUnits(data.data);
    } catch {
      setError("Failed to load units.");
    } finally {
      setLoading(false);
    }
  };

  const loadBuildingAddress = async () => {
    try {
      const res = await fetch("/api/property-settings");
      const data = await res.json();
      // Adjust this line if your /api/property-settings response shape
      // differs from PropertySettings.address (street/estate/city/mapsUrl) —
      // I'm assuming the standard { success, data } wrapper your other
      // routes use, but haven't seen this route's actual response.
      const address = data?.data?.address ?? data?.address;
      if (address) {
        setBuildingAddress(
          [address.street, address.estate, address.city].filter(Boolean).join(", ")
        );
      }
    } catch {
      // non-fatal — the address note just stays empty
    }
  };

  const showMsg = (msg: string, isError = false) => {
    if (isError) {
      setError(msg);
      setTimeout(() => setError(""), 4000);
    } else {
      setSuccess(msg);
      setTimeout(() => setSuccess(""), 4000);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    });
  };

  // ---------------- IMAGE UPLOAD ----------------
  const handleImageUpload = async (file: File, index: number) => {
    setUploadingIndex(index);

    const reader = new FileReader();
    reader.onload = (e) => {
      setImages((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], preview: e.target?.result as string };
        return updated;
      });
    };
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append("files", file);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      const uploadedUrl = data?.images?.[0]?.url;

      if (!data.success || !uploadedUrl) {
        return showMsg("Upload failed or missing URL", true);
      }

      setImages((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], url: uploadedUrl };
        return updated;
      });
    } catch {
      showMsg("Upload error", true);
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleUrlChange = (index: number, url: string) => {
    setImages((prev) => {
      const updated = [...prev];
      updated[index] = { url, preview: url };
      return updated;
    });
  };

  const addImageSlot = () => setImages((prev) => [...prev, { ...emptyImageEntry }]);
  const removeImageSlot = (index: number) =>
    setImages((prev) => prev.filter((_, i) => i !== index));

  // ---------------- HANDLE EDIT ----------------
  const handleEdit = (unit: Unit) => {
    setEditingUnit(unit);

    setForm({
      title: unit.title,
      description: unit.description,
      rentalType: unit.rentalType,
      bedrooms: String(unit.bedrooms ?? 2),
      pricePerMonth: unit.pricePerMonth ? String(unit.pricePerMonth) : "",
      furnished: unit.furnished ?? false,
      amenities: unit.amenities?.join(", ") || "",
      status: unit.status,
    });

    setImages(
      unit.images?.length
        ? unit.images.map((url) => ({ url, preview: url }))
        : [{ ...emptyImageEntry }]
    );

    setShowForm(true);
  };

  // ---------------- SUBMIT ----------------
  const handleSubmit = async () => {
    if (!form.title) return showMsg("Title is required.", true);
    if (!form.description) return showMsg("Description is required.", true);

    const needsMonthlyPrice = form.rentalType === "long_term" || form.rentalType === "mid_term";
    if (needsMonthlyPrice && !form.pricePerMonth) {
      return showMsg("Price per month is required for Long/Mid Term units.", true);
    }

    setSaving(true);

    const validImageUrls = images.map((img) => img.url).filter((url) => url.trim() !== "");

    const body = {
      title: form.title,
      description: form.description,
      rentalType: form.rentalType,
      bedrooms: Number(form.bedrooms),
      pricePerMonth: needsMonthlyPrice ? Number(form.pricePerMonth) : undefined,
      // furnished only means anything for long/mid term — short_term
      // furnishing lives on each Room instead.
      furnished: form.rentalType !== "short_term" ? form.furnished : undefined,
      amenities: form.amenities.split(",").map((a) => a.trim()).filter(Boolean),
      images: validImageUrls,
      status: form.status,
    };

    try {
      const res = await fetch(
        editingUnit ? `/api/units/${editingUnit._id}` : "/api/units",
        {
          method: editingUnit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      const data = await res.json();

      if (data.success) {
        showMsg(editingUnit ? "Updated" : "Created");
        setShowForm(false);
        setEditingUnit(null);
        setForm(emptyForm);
        setImages([{ ...emptyImageEntry }]);
        loadUnits();
      } else {
        showMsg(data.message || "Failed", true);
      }
    } finally {
      setSaving(false);
    }
  };

  // DELETE soft-deletes by default (status -> "archived"), matching
  // /api/units/[id]'s behavior.
  const handleDelete = async (id: string) => {
    if (!confirm("Archive this unit? It will stop appearing in listings, but its booking history is kept.")) return;

    setDeletingId(id);

    try {
      await fetch(`/api/units/${id}`, { method: "DELETE" });
      loadUnits();
    } finally {
      setDeletingId(null);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingUnit(null);
    setForm(emptyForm);
    setImages([{ ...emptyImageEntry }]);
  };

  const showsMonthlyPrice = form.rentalType === "long_term" || form.rentalType === "mid_term";
  const showsFurnished = form.rentalType !== "short_term";

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Units</h1>
          <p className="text-gray-500 text-sm mt-1">
            {units.length} propert{units.length !== 1 ? "ies" : "y"} total
          </p>
        </div>
        <button
          onClick={() => (showForm ? handleCancel() : setShowForm(true))}
          className="px-4 py-2 bg-[#7A1B0F] hover:opacity-90 text-white text-sm font-semibold rounded-xl transition"
        >
          {showForm ? "✕ Cancel" : "+ Add Unit"}
        </button>
      </div>

      {/* ── Alerts ── */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-2">
          ✅ {success}
        </div>
      )}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
          ⚠️ {error}
        </div>
      )}

      {/* ── Form ── */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-8 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-100 px-6 py-4">
            <h2 className="text-lg font-bold text-gray-900">
              {editingUnit ? "✏️ Edit Unit" : "➕ Add New Unit"}
            </h2>
            <p className="text-gray-500 text-sm mt-0.5">
              {editingUnit
                ? "Update unit details and images"
                : "Fill in the details to add a new unit"}
            </p>
          </div>

          <div className="p-6 space-y-8">
            {/* ── Basic Details ── */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Unit Details
              </h3>
              {buildingAddress && (
                <p className="text-xs text-gray-400 mb-4">
                  📍 All units are in the same building: {buildingAddress}
                </p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    placeholder="Spacious 2BR Apartment"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#7A1B0F]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rental Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="rentalType"
                    value={form.rentalType}
                    onChange={handleChange}
                    disabled={Boolean(editingUnit)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#7A1B0F] disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    <option value="long_term">Long Term</option>
                    <option value="mid_term">Mid Term</option>
                    <option value="short_term">Short Term</option>
                  </select>
                  {editingUnit && (
                    <p className="text-xs text-gray-400 mt-1">
                      Rental type is fixed once a unit is created and can&apos;t be changed.
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Describe the unit..."
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#7A1B0F] resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
                  <input
                    name="bedrooms"
                    type="number"
                    value={form.bedrooms}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#7A1B0F]"
                  />
                </div>

                {showsMonthlyPrice && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price per Month ($) <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="pricePerMonth"
                      type="number"
                      value={form.pricePerMonth}
                      onChange={handleChange}
                      placeholder="1200"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#7A1B0F]"
                    />
                  </div>
                )}

                {form.rentalType === "short_term" && (
                  <div className="md:col-span-2 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
                    Short Term units aren&apos;t priced or booked directly — pricing and
                    booking happen per-room. Add rooms to this unit from the Rooms admin
                    page once it&apos;s created.
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amenities
                    <span className="text-gray-400 font-normal ml-1">(comma separated)</span>
                  </label>
                  <input
                    name="amenities"
                    value={form.amenities}
                    onChange={handleChange}
                    placeholder="Free WiFi, Air Conditioning, Washer/Dryer"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#7A1B0F]"
                  />
                </div>

                {showsFurnished && (
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                    <input
                      type="checkbox"
                      name="furnished"
                      id="furnished"
                      checked={form.furnished}
                      onChange={handleChange}
                      className="w-4 h-4 accent-[#7A1B0F]"
                    />
                    <div>
                      <label htmlFor="furnished" className="text-sm font-medium text-gray-700 cursor-pointer">
                        Furnished
                      </label>
                      <p className="text-xs text-gray-400">
                        {form.rentalType === "long_term"
                          ? "Long Term is usually unfurnished — check only if you're providing furniture"
                          : "Mid Term is usually furnished by the host"}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#7A1B0F]"
                  >
                    <option value="active">Active (visible in listings)</option>
                    <option value="inactive">Inactive (hidden)</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ── Images Section ── */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Unit Photos
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Upload photos for this unit</p>
                </div>
                <button
                  type="button"
                  onClick={addImageSlot}
                  className="px-3 py-1.5 text-xs bg-[#7A1B0F]/10 text-[#7A1B0F] hover:bg-[#7A1B0F]/20 border border-[#7A1B0F]/20 rounded-lg transition font-medium"
                >
                  + Add Photo
                </button>
              </div>

              <div className="space-y-4">
                {images.map((img, index) => (
                  <div key={index} className="border border-gray-200 rounded-2xl p-4 bg-gray-50">
                    <div className="flex items-start gap-4">
                      <div
                        className="relative w-28 h-28 flex-shrink-0 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 cursor-pointer group hover:border-[#7A1B0F] transition"
                        onClick={() => fileRefs.current[index]?.click()}
                      >
                        {img.preview ? (
                          <>
                            <Image
                              src={img.preview}
                              alt="Unit photo"
                              fill
                              sizes="112px"
                              className="object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                              <span className="text-white text-xs font-medium">Change</span>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-white group-hover:bg-[#7A1B0F]/5 transition">
                            {uploadingIndex === index ? (
                              <div className="w-6 h-6 border-2 border-[#7A1B0F] border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <span className="text-2xl mb-1">📷</span>
                                <span className="text-xs text-gray-400 text-center px-1">
                                  Click to upload
                                </span>
                              </>
                            )}
                          </div>
                        )}
                        <input
                          ref={(el) => {
                            fileRefs.current[index] = el;
                          }}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file, index);
                          }}
                        />
                      </div>

                      <div className="flex-1 space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Or paste image URL
                          </label>
                          <input
                            type="text"
                            value={img.url || ""}
                            onChange={(e) => handleUrlChange(index, e.target.value)}
                            placeholder="https://example.com/image.jpg"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#7A1B0F]"
                          />
                        </div>
                        {img.url && (
                          <p className="text-xs text-green-600 font-medium">✓ Photo added</p>
                        )}
                      </div>

                      {images.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeImageSlot(index)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition flex-shrink-0"
                          title="Remove this photo"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addImageSlot}
                className="mt-3 w-full py-3 border-2 border-dashed border-gray-200 hover:border-[#7A1B0F]/40 text-gray-400 hover:text-[#7A1B0F] text-sm rounded-2xl transition"
              >
                + Add Another Photo
              </button>
            </div>

            {/* ── Form Actions ── */}
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={handleSubmit}
                disabled={saving || uploadingIndex !== null}
                className="px-6 py-2.5 bg-[#7A1B0F] hover:opacity-90 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : editingUnit ? (
                  "💾 Update Unit"
                ) : (
                  "➕ Create Unit"
                )}
              </button>
              <button
                onClick={handleCancel}
                className="px-6 py-2.5 border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-xl transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Units Table ── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse flex gap-4">
              <div className="w-20 h-20 bg-gray-200 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-4 bg-gray-200 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : units.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <p className="text-4xl mb-3">🏠</p>
          <p className="text-gray-500 mb-4">No units yet. Add your first unit above.</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-2.5 bg-[#7A1B0F] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition"
          >
            + Add Unit
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Unit</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Price</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Bedrooms</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {units.map((unit) => (
                <tr key={unit._id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                        {unit.images && unit.images.length > 0 ? (
                          <Image
                            src={unit.images[0]}
                            alt={unit.title || "Unit photo"}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xl">🏠</div>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-900">{unit.title || "Untitled unit"}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-[#7A1B0F]/10 text-[#7A1B0F] text-xs font-semibold rounded-full">
                      {RENTAL_TYPE_LABEL[unit.rentalType]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {unit.rentalType === "short_term"
                      ? "Priced per room"
                      : `$${(unit.pricePerMonth ?? 0).toLocaleString()}/month`}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{unit.bedrooms}</td>
                  <td className="px-6 py-4">
                    <span
                      className={
                        "px-2 py-1 text-xs font-semibold rounded-full " +
                        (unit.status === "active"
                          ? "bg-green-100 text-green-700"
                          : unit.status === "inactive"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-200 text-gray-600")
                      }
                    >
                      {unit.status.charAt(0).toUpperCase() + unit.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(unit)}
                        className="px-3 py-1.5 text-xs border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg transition font-medium"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDelete(unit._id)}
                        disabled={deletingId === unit._id}
                        className="px-3 py-1.5 text-xs border border-red-200 text-red-500 hover:bg-red-50 rounded-lg transition font-medium disabled:opacity-50"
                      >
                        {deletingId === unit._id ? "..." : "🗑️ Archive"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}