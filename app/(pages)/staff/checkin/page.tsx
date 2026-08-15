"use client";

import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Booking {
  _id: string;
  user: { name: string; email: string; phone?: string };
  room: { name: string; type: string };
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  status: "pending" | "confirmed" | "cancelled";
}

type Tab = "arrivals" | "departures" | "inhouse";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const tomorrow = () => {
  const d = today();
  d.setDate(d.getDate() + 1);
  return d;
};

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  );
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString("en-KE", {
    weekday: "short", day: "numeric", month: "short",
  });
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="w-9 h-9 rounded-full bg-violet-100 text-violet-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
      {name?.charAt(0).toUpperCase() ?? "?"}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StaffCheckinPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState<Tab>("arrivals");
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/bookings")
      .then(r => r.json())
      .then(d => setBookings(d.data ?? []))
      .catch(() => toast.error("Failed to load bookings"))
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id: string, status: "confirmed" | "cancelled") => {
    setUpdating(id);
    try {
      const res  = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setBookings(prev => prev.map(b => b._id === id ? { ...b, status } : b));
      toast.success(status === "confirmed" ? "Guest checked in ✓" : "Booking cancelled.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setUpdating(null);
    }
  };

  const t0 = today();
  const t1 = tomorrow();

  // Arrivals = check-in today, confirmed or pending
  const arrivals = bookings.filter(b =>
    isSameDay(new Date(b.checkIn), t0) &&
    ["confirmed", "pending"].includes(b.status)
  );

  // Departures = check-out today, confirmed
  const departures = bookings.filter(b =>
    isSameDay(new Date(b.checkOut), t0) && b.status === "confirmed"
  );

  // In-house = checked in already, not yet checked out, confirmed
  const inhouse = bookings.filter(b => {
    const ci = new Date(b.checkIn);
    const co = new Date(b.checkOut);
    return b.status === "confirmed" && ci <= t0 && co >= t1;
  });

  const lists: Record<Tab, Booking[]> = { arrivals, departures, inhouse };
  const current = lists[tab];

  const TABS: { key: Tab; label: string; color: string }[] = [
    { key: "arrivals",   label: `Arrivals (${arrivals.length})`,    color: "text-emerald-600" },
    { key: "departures", label: `Departures (${departures.length})`,color: "text-amber-600"   },
    { key: "inhouse",    label: `In-house (${inhouse.length})`,     color: "text-violet-600"  },
  ];

  return (
    <>
      <Toaster position="top-center" toastOptions={{
        style: { borderRadius: "10px", background: "#1e293b", color: "#f8fafc", fontSize: "14px" },
      }} />

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Check-in / Check-out</h1>
          <p className="text-slate-500 text-sm mt-1">
            Today — {new Date().toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Arriving today",   value: arrivals.length,    bg: "bg-emerald-50",  text: "text-emerald-700", border: "border-emerald-100" },
            { label: "Departing today",  value: departures.length,  bg: "bg-amber-50",    text: "text-amber-700",   border: "border-amber-100"   },
            { label: "Currently in-house", value: inhouse.length,   bg: "bg-violet-50",   text: "text-violet-700",  border: "border-violet-100"  },
          ].map(c => (
            <div key={c.label} className={`${c.bg} border ${c.border} rounded-2xl p-5 text-center`}>
              <p className={`text-3xl font-bold ${c.text}`}>{c.value}</p>
              <p className="text-sm text-slate-600 mt-1">{c.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t.key
                  ? `bg-white shadow-sm ${t.color}`
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : current.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-20 text-center">
            <p className="text-slate-400 text-sm">
              {tab === "arrivals"   && "No arrivals today."}
              {tab === "departures" && "No departures today."}
              {tab === "inhouse"    && "No guests currently in-house."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {current.map(b => (
              <div
                key={b._id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-4 flex items-center gap-4"
              >
                <Avatar name={b.user?.name} />

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800">{b.user?.name}</p>
                  <p className="text-xs text-slate-400 truncate">{b.user?.email}</p>
                </div>

                <div className="hidden sm:block text-center px-4">
                  <p className="text-sm font-medium text-slate-700">{b.room?.name}</p>
                  <p className="text-xs text-slate-400 capitalize">{b.room?.type}</p>
                </div>

                <div className="hidden md:block text-right">
                  <p className="text-xs text-slate-500">
                    {fmt(b.checkIn)} → {fmt(b.checkOut)}
                  </p>
                  <p className="text-xs font-medium text-slate-700">
                    Ksh {b.totalPrice.toLocaleString()}
                  </p>
                </div>

                <div className="flex-shrink-0 ml-2">
                  {tab === "arrivals" && b.status === "pending" && (
                    <button
                      disabled={updating === b._id}
                      onClick={() => updateStatus(b._id, "confirmed")}
                      className="px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition disabled:opacity-50"
                    >
                      {updating === b._id ? "…" : "Check In"}
                    </button>
                  )}
                  {tab === "arrivals" && b.status === "confirmed" && (
                    <span className="px-3 py-1.5 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-lg">
                      Checked In ✓
                    </span>
                  )}
                  {tab === "departures" && (
                    <button
                      disabled={updating === b._id}
                      onClick={() => updateStatus(b._id, "cancelled")}
                      className="px-4 py-2 text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white rounded-xl transition disabled:opacity-50"
                    >
                      {updating === b._id ? "…" : "Check Out"}
                    </button>
                  )}
                  {tab === "inhouse" && (
                    <span className="px-3 py-1.5 text-xs font-semibold bg-violet-100 text-violet-700 rounded-lg">
                      In-house
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}