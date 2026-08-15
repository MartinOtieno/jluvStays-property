"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Booking {
  _id: string;
  user: { name: string; email: string };
  room: { name: string; type: string };
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  status: "pending" | "confirmed" | "cancelled";
  createdAt: string;
}

interface ViewingRequest {
  _id: string;
  user: { name: string; email: string };
  room: { name: string; type: string };
  preferredDate: string;
  status: "pending" | "approved" | "rejected";
}

interface Room {
  _id: string;
  name: string;
  type: string;
  isAvailable: boolean;
  pricePerNight: number;
}

interface Stats {
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  pendingViewings: number;
  totalRooms: number;
  availableRooms: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(date: string) {
  return new Date(date).toLocaleDateString("en-KE", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:   "bg-amber-100 text-amber-700",
    confirmed: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-600",
    approved:  "bg-emerald-100 text-emerald-700",
    rejected:  "bg-red-100 text-red-600",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize ${map[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, accent,
}: { label: string; value: number | string; sub?: string; accent: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <p className="text-slate-500 text-sm">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${accent}`}>{value}</p>
      {sub && <p className="text-slate-400 text-xs mt-1">{sub}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StaffOverviewPage() {
  const { data: session } = useSession();
  const [bookings,  setBookings]  = useState<Booking[]>([]);
  const [viewings,  setViewings]  = useState<ViewingRequest[]>([]);
  const [rooms,     setRooms]     = useState<Room[]>([]);
  const [loading,   setLoading]   = useState(true);

  const position = (session?.user as { role?: string })?.role ?? "";

  // Which sections this position sees
  const canSeeBookings = ["property_manager", "receptionist", "accountant"].includes(position);
  const canSeeViewings = ["property_manager", "receptionist"].includes(position);
  const canSeeRooms    = ["property_manager", "caretaker", "maintenance"].includes(position);

  useEffect(() => {
    const load = async () => {
      try {
        const fetches: Promise<Response>[] = [];
        if (canSeeBookings) fetches.push(fetch("/api/bookings"));
        if (canSeeViewings) fetches.push(fetch("/api/viewing-request"));
        if (canSeeRooms)    fetches.push(fetch("/api/rooms"));

        const results = await Promise.all(fetches);
        const jsons   = await Promise.all(results.map(r => r.json()));

        let i = 0;
        if (canSeeBookings) { setBookings(jsons[i]?.data ?? []); i++; }
        if (canSeeViewings) { setViewings(jsons[i]?.data ?? []); i++; }
        if (canSeeRooms)    { setRooms(jsons[i]?.data ?? []);    i++; }
      } catch { /* silent */ } finally {
        setLoading(false);
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats: Stats = {
    totalBookings:    bookings.length,
    pendingBookings:  bookings.filter(b => b.status === "pending").length,
    confirmedBookings:bookings.filter(b => b.status === "confirmed").length,
    pendingViewings:  viewings.filter(v => v.status === "pending").length,
    totalRooms:       rooms.length,
    availableRooms:   rooms.filter(r => r.isAvailable).length,
  };

  const recentBookings  = [...bookings].slice(0, 5);
  const pendingViewings = viewings.filter(v => v.status === "pending").slice(0, 5);
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Good {getGreeting()}, {firstName} 👋
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Here's what's happening today.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {canSeeBookings && (
          <>
            <StatCard label="Total Bookings"     value={stats.totalBookings}     accent="text-slate-800" />
            <StatCard label="Pending Bookings"   value={stats.pendingBookings}   accent="text-amber-600"   sub="awaiting confirmation" />
            <StatCard label="Confirmed Bookings" value={stats.confirmedBookings} accent="text-emerald-600" />
          </>
        )}
        {canSeeViewings && (
          <StatCard label="Pending Viewings" value={stats.pendingViewings} accent="text-violet-600" sub="need scheduling" />
        )}
        {canSeeRooms && (
          <>
            <StatCard label="Total Rooms"     value={stats.totalRooms}     accent="text-slate-800" />
            <StatCard label="Available Rooms" value={stats.availableRooms} accent="text-emerald-600" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent bookings */}
        {canSeeBookings && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">Recent Bookings</h2>
              <a href="/staff/bookings" className="text-xs text-violet-600 hover:text-violet-700 font-medium">
                View all →
              </a>
            </div>
            {recentBookings.length === 0 ? (
              <p className="px-6 py-8 text-slate-400 text-sm text-center">No bookings yet.</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {recentBookings.map(b => (
                  <div key={b._id} className="px-6 py-3.5 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{b.user?.name}</p>
                      <p className="text-xs text-slate-400 truncate">{b.room?.name}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-slate-500">{fmt(b.checkIn)}</p>
                      <StatusBadge status={b.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pending viewing requests */}
        {canSeeViewings && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">Pending Viewings</h2>
              <a href="/staff/viewings" className="text-xs text-violet-600 hover:text-violet-700 font-medium">
                View all →
              </a>
            </div>
            {pendingViewings.length === 0 ? (
              <p className="px-6 py-8 text-slate-400 text-sm text-center">No pending viewing requests.</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {pendingViewings.map(v => (
                  <div key={v._id} className="px-6 py-3.5 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{v.user?.name}</p>
                      <p className="text-xs text-slate-400 truncate">{v.room?.name}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-slate-500">{fmt(v.preferredDate)}</p>
                      <StatusBadge status={v.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Room status — caretaker / maintenance */}
        {canSeeRooms && !canSeeBookings && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">Room Status</h2>
              <a href="/staff/rooms" className="text-xs text-violet-600 hover:text-violet-700 font-medium">
                View all →
              </a>
            </div>
            {rooms.length === 0 ? (
              <p className="px-6 py-8 text-slate-400 text-sm text-center">No rooms found.</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {rooms.slice(0, 6).map(r => (
                  <div key={r._id} className="px-6 py-3.5 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{r.name}</p>
                      <p className="text-xs text-slate-400 capitalize">{r.type}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${r.isAvailable ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                      {r.isAvailable ? "Available" : "Occupied"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}