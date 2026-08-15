"use client";

import { useEffect, useState, Fragment } from "react";
import toast, { Toaster } from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Booking {
  _id: string;
  user: { name: string; email: string; phone?: string };
  room: { name: string; type: string; pricePerNight: number };
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  status: "pending" | "confirmed" | "cancelled";
  createdAt: string;
}

type FilterStatus = "all" | "pending" | "confirmed" | "cancelled";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(date: string) {
  return new Date(date).toLocaleDateString("en-KE", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function nights(checkIn: string, checkOut: string) {
  return Math.ceil(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:   "bg-amber-100 text-amber-700 border-amber-200",
    confirmed: "bg-emerald-100 text-emerald-700 border-emerald-200",
    cancelled: "bg-red-100 text-red-600 border-red-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold capitalize border ${map[status] ?? ""}`}>
      {status}
    </span>
  );
}

const LIMIT = 10;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StaffBookingsPage() {
  const [bookings,  setBookings]  = useState<Booking[]>([]);
  const [filter,    setFilter]    = useState<FilterStatus>("all");
  const [search,    setSearch]    = useState("");
  const [loading,   setLoading]   = useState(true);
  const [updating,  setUpdating]  = useState<string | null>(null);
  const [expanded,  setExpanded]  = useState<string | null>(null);
  const [page,      setPage]      = useState(1);

  useEffect(() => {
    fetch("/api/bookings")
      .then(r => r.json())
      .then(d => setBookings(d.data ?? []))
      .catch(() => toast.error("Failed to load bookings"))
      .finally(() => setLoading(false));
  }, []);

  // Reset to page 1 when filter or search changes
  useEffect(() => { setPage(1); }, [filter, search]);

  const updateStatus = async (id: string, status: "confirmed" | "cancelled") => {
    setUpdating(id);
    try {
      const res  = await fetch(`/api/bookings/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setBookings(prev => prev.map(b => b._id === id ? { ...b, status } : b));
      toast.success(`Booking ${status}.`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setUpdating(null);
    }
  };

  const counts = {
    all:       bookings.length,
    pending:   bookings.filter(b => b.status === "pending").length,
    confirmed: bookings.filter(b => b.status === "confirmed").length,
    cancelled: bookings.filter(b => b.status === "cancelled").length,
  };

  const tabs: { key: FilterStatus; label: string }[] = [
    { key: "all",       label: `All (${counts.all})`            },
    { key: "pending",   label: `Pending (${counts.pending})`    },
    { key: "confirmed", label: `Confirmed (${counts.confirmed})` },
    { key: "cancelled", label: `Cancelled (${counts.cancelled})` },
  ];

  const filtered = bookings.filter(b => {
    if (filter !== "all" && b.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        b.user?.name?.toLowerCase().includes(q) ||
        b.room?.name?.toLowerCase().includes(q) ||
        b.user?.email?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / LIMIT);
  const paginated  = filtered.slice((page - 1) * LIMIT, page * LIMIT);

  return (
    <>
      <Toaster position="top-center" toastOptions={{
        style: { borderRadius: "10px", background: "#1e293b", color: "#f8fafc", fontSize: "14px" },
      }} />

      <div className="space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Bookings</h1>
          <p className="text-slate-500 text-sm mt-1">Review and manage all room bookings.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 flex-wrap">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setFilter(t.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === t.key
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 max-w-xs ml-auto">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search guest or room…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-20 text-center">
            <p className="text-slate-400 text-sm">No bookings match your filters.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Guest</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Room</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Phone</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Dates</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Total</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginated.map(b => {
                    const isPending  = b.status === "pending";
                    const isUpdating = updating === b._id;

                    return (
                      <Fragment key={b._id}>
                        <tr
                          className="hover:bg-slate-50 transition-colors cursor-pointer"
                          onClick={() => setExpanded(expanded === b._id ? null : b._id)}
                        >
                          {/* Guest */}
                          <td className="px-5 py-4">
                            <p className="font-medium text-slate-800">{b.user?.name ?? "—"}</p>
                            <p className="text-xs text-slate-400">{b.user?.email}</p>
                          </td>

                          {/* Room */}
                          <td className="px-5 py-4 hidden sm:table-cell">
                            <p className="font-medium text-slate-800">{b.room?.name ?? "—"}</p>
                            <p className="text-xs text-slate-400 capitalize">{b.room?.type}</p>
                          </td>

                          {/* Phone */}
                          <td className="px-5 py-4 text-slate-500 hidden md:table-cell">
                            {b.user?.phone || "—"}
                          </td>

                          {/* Dates */}
                          <td className="px-5 py-4 hidden lg:table-cell">
                            <p className="text-slate-700">{fmt(b.checkIn)} → {fmt(b.checkOut)}</p>
                            <p className="text-xs text-slate-400">{nights(b.checkIn, b.checkOut)} night(s)</p>
                          </td>

                          {/* Total */}
                          <td className="px-5 py-4 font-medium text-slate-800 hidden lg:table-cell">
                            Ksh {b.totalPrice.toLocaleString()}
                          </td>

                          {/* Status */}
                          <td className="px-5 py-4">
                            <StatusBadge status={b.status} />
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4">
                            <div
                              className="flex items-center justify-end gap-2"
                              onClick={e => e.stopPropagation()}
                            >
                              {/* Confirm */}
                              <button
                                disabled={!isPending || isUpdating}
                                onClick={() => isPending && updateStatus(b._id, "confirmed")}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                                  b.status === "confirmed"
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-400 cursor-not-allowed"
                                    : isPending
                                    ? "bg-emerald-600 hover:bg-emerald-500 border-emerald-600 text-white"
                                    : "bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed"
                                }`}
                              >
                                {isUpdating ? "…" : "Confirm"}
                              </button>

                              {/* Cancel */}
                              <button
                                disabled={b.status === "cancelled" || isUpdating}
                                onClick={() => b.status !== "cancelled" && updateStatus(b._id, "cancelled")}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                                  b.status === "cancelled"
                                    ? "bg-red-50 border-red-200 text-red-300 cursor-not-allowed"
                                    : "bg-red-50 hover:bg-red-100 border-red-200 text-red-600"
                                }`}
                              >
                                Cancel
                              </button>

                              {/* WhatsApp */}
                              <a
                                href={`https://wa.me/${b.user?.phone?.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                title="WhatsApp guest"
                                onClick={e => e.stopPropagation()}
                                className={`w-7 h-7 flex items-center justify-center rounded-lg transition ${
                                  b.user?.phone
                                    ? "bg-green-50 hover:bg-green-100 text-green-600"
                                    : "bg-slate-50 text-slate-300 pointer-events-none"
                                }`}
                              >
                                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                </svg>
                              </a>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded row */}
                        {expanded === b._id && (
                          <tr className="bg-slate-50">
                            <td colSpan={7} className="px-5 py-3 text-sm text-slate-600">
                              <div className="flex flex-wrap gap-6">
                                <div>
                                  <span className="text-xs text-slate-400 uppercase tracking-wide font-medium block mb-0.5">Check-in</span>
                                  {fmt(b.checkIn)}
                                </div>
                                <div>
                                  <span className="text-xs text-slate-400 uppercase tracking-wide font-medium block mb-0.5">Check-out</span>
                                  {fmt(b.checkOut)}
                                </div>
                                <div>
                                  <span className="text-xs text-slate-400 uppercase tracking-wide font-medium block mb-0.5">Nights</span>
                                  {nights(b.checkIn, b.checkOut)}
                                </div>
                                <div>
                                  <span className="text-xs text-slate-400 uppercase tracking-wide font-medium block mb-0.5">Total</span>
                                  Ksh {b.totalPrice.toLocaleString()}
                                </div>
                                <div>
                                  <span className="text-xs text-slate-400 uppercase tracking-wide font-medium block mb-0.5">Booking ID</span>
                                  <span className="font-mono text-xs">{b._id}</span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>
              Page {page} of {totalPages} — showing {paginated.length} of {filtered.length} bookings
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}