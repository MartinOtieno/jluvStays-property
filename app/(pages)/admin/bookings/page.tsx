// room-booking/app/(pages)/admin/bookings/page.tsx

"use client";

import { useEffect, useState, Fragment } from "react";

interface Booking {
  _id: string;
  rentalType: "long_term" | "mid_term" | "short_term";
  unit?: { title: string } | null;
  room?: { label: string } | null;
  tenant: { name: string; email: string; phone?: string };
  moveInDate: string;
  moveOutDate: string;
  price: number;
  priceUnit: "month" | "night";
  status: "pending" | "confirmed" | "cancelled";
  createdAt: string;
}

const STATUS_STYLES = {
  pending:   "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const RENTAL_TYPE_LABEL: Record<Booking["rentalType"], string> = {
  long_term: "Long Term",
  mid_term: "Mid Term",
  short_term: "Short Term",
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", {
    day: "numeric", month: "short", year: "numeric",
  });

// A booking's listing is either its unit (long/mid term) or its room
// (short term) — never both.
const listingName = (b: Booking) => b.unit?.title ?? b.room?.label ?? "Listing";

const LIMIT = 10;

export default function AdminBookingsPage() {
  const [bookings, setBookings]     = useState<Booking[]>([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState<"all" | "pending" | "confirmed" | "cancelled">("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [success, setSuccess]       = useState("");
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [page, setPage]             = useState(1);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/bookings");
      const data = await res.json();
      if (data.success) setBookings(data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBookings(); }, []);
  useEffect(() => { setPage(1); }, [activeTab]);

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      const res  = await fetch(`/api/bookings/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to update booking");
      setBookings((prev) =>
        prev.map((b) => b._id === id ? { ...b, status: status as Booking["status"] } : b)
      );
      setSuccess(`Booking ${status} successfully!`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const counts = {
    all:       bookings.length,
    pending:   bookings.filter((b) => b.status === "pending").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
  };

  const filtered   = activeTab === "all" ? bookings : bookings.filter((b) => b.status === activeTab);
  const totalPages = Math.ceil(filtered.length / LIMIT);
  const paginated  = filtered.slice((page - 1) * LIMIT, page * LIMIT);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Bookings</h1>
        <p className="text-sm text-slate-400 mt-0.5">{bookings.length} total bookings</p>
      </div>

      {success && (
        <div className="p-3.5 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 bg-white rounded-xl p-1.5 border border-slate-100 shadow-sm w-fit">
        {(["all", "pending", "confirmed", "cancelled"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize flex items-center gap-1.5 ${
              activeTab === tab ? "bg-[#7A1B0F] text-white" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab}
            <span className={`px-1.5 py-0.5 rounded-full text-xs ${
              activeTab === tab ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
            }`}>
              {counts[tab]}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="divide-y divide-slate-50">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="h-3 bg-slate-100 rounded w-1/5" />
                <div className="h-3 bg-slate-100 rounded w-1/6" />
                <div className="h-3 bg-slate-100 rounded w-1/6" />
                <div className="h-6 bg-slate-100 rounded-full w-20 ml-auto" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            <p className="text-3xl mb-3">📅</p>
            No {activeTab === "all" ? "" : activeTab} bookings found.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400 uppercase tracking-wide">
                <th className="px-5 py-3.5 text-left font-medium">Guest</th>
                <th className="px-5 py-3.5 text-left font-medium hidden sm:table-cell">Listing</th>
                <th className="px-5 py-3.5 text-left font-medium hidden md:table-cell">Phone</th>
                <th className="px-5 py-3.5 text-left font-medium hidden lg:table-cell">Dates</th>
                <th className="px-5 py-3.5 text-left font-medium hidden lg:table-cell">Total</th>
                <th className="px-5 py-3.5 text-left font-medium">Status</th>
                <th className="px-5 py-3.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginated.map((booking) => {
                const isPending  = booking.status === "pending";
                const isUpdating = updatingId === booking._id;

                return (
                  <Fragment key={booking._id}>
                    <tr
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                      onClick={() => setExpanded(expanded === booking._id ? null : booking._id)}
                    >
                      {/* Guest */}
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-800">{booking.tenant?.name}</p>
                        <p className="text-xs text-slate-400">{booking.tenant?.email}</p>
                      </td>

                      {/* Listing */}
                      <td className="px-5 py-3.5 hidden sm:table-cell">
                        <p className="text-slate-700 font-medium">{listingName(booking)}</p>
                        <p className="text-xs text-slate-400">{RENTAL_TYPE_LABEL[booking.rentalType]}</p>
                      </td>

                      {/* Phone */}
                      <td className="px-5 py-3.5 text-slate-500 hidden md:table-cell">
                        {booking.tenant?.phone || "—"}
                      </td>

                      {/* Dates */}
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        <p className="text-slate-700">{formatDate(booking.moveInDate)}</p>
                        <p className="text-xs text-slate-400">to {formatDate(booking.moveOutDate)}</p>
                      </td>

                      {/* Total */}
                      <td className="px-5 py-3.5 font-medium text-slate-800 hidden lg:table-cell">
                        ${booking.price?.toLocaleString()}
                        <span className="text-xs text-slate-400 font-normal">/{booking.priceUnit}</span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[booking.status]}`}>
                          {booking.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5">
                        <div
                          className="flex items-center justify-end gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Confirm */}
                          <button
                            onClick={() => isPending && updateStatus(booking._id, "confirmed")}
                            disabled={!isPending || isUpdating}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                              booking.status === "confirmed"
                                ? "bg-green-50 border-green-200 text-green-400 cursor-not-allowed"
                                : isPending
                                ? "bg-green-600 hover:bg-green-700 border-green-600 text-white"
                                : "bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed"
                            }`}
                          >
                            {isUpdating ? "…" : "Confirm"}
                          </button>

                          {/* Cancel */}
                          <button
                            onClick={() => booking.status !== "cancelled" && updateStatus(booking._id, "cancelled")}
                            disabled={booking.status === "cancelled" || isUpdating}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                              booking.status === "cancelled"
                                ? "bg-red-50 border-red-200 text-red-300 cursor-not-allowed"
                                : "border-red-200 text-red-500 hover:bg-red-50"
                            }`}
                          >
                            Cancel
                          </button>

                          {/* WhatsApp */}
                          <a
                            href={`https://wa.me/${booking.tenant?.phone?.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            title="WhatsApp guest"
                            className={`w-7 h-7 flex items-center justify-center rounded-lg transition ${
                              booking.tenant?.phone
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

                    {/* Expanded row — shows dates + total on mobile, always shows booking id */}
                    {expanded === booking._id && (
                      <tr className="bg-slate-50">
                        <td colSpan={7} className="px-5 py-3 text-sm text-slate-600">
                          <div className="flex flex-wrap gap-6">
                            <div>
                              <span className="text-xs text-slate-400 uppercase tracking-wide font-medium block mb-0.5">Move-in</span>
                              {formatDate(booking.moveInDate)}
                            </div>
                            <div>
                              <span className="text-xs text-slate-400 uppercase tracking-wide font-medium block mb-0.5">Move-out</span>
                              {formatDate(booking.moveOutDate)}
                            </div>
                            <div>
                              <span className="text-xs text-slate-400 uppercase tracking-wide font-medium block mb-0.5">Total</span>
                              ${booking.price?.toLocaleString()}/{booking.priceUnit}
                            </div>
                            <div>
                              <span className="text-xs text-slate-400 uppercase tracking-wide font-medium block mb-0.5">Booking ID</span>
                              <span className="font-mono text-xs">{booking._id}</span>
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
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            Page {page} of {totalPages} — showing {paginated.length} of {filtered.length} bookings
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}