// room-booking/app/(pages)/admin/page.tsx

"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatCard {
  label: string;
  value: string | number;
  sub: string;
  color: string;
  icon: React.ReactNode;
}

interface UnitApiShape {
  _id: string;
  status: "active" | "inactive" | "archived";
}

interface RoomApiShape {
  _id: string;
  status: "active" | "inactive";
  currentTenant: string | null;
}

interface BookingListItem {
  _id: string;
  status: string;
  rentalType: "long_term" | "mid_term" | "short_term";
  moveInDate: string;
  tenant?: { name?: string };
  unit?: { title?: string };
  room?: { label?: string };
  createdAt: string;
}

// Shape of ViewingRequest isn't available to me — kept loosely typed on
// purpose rather than guessing field names that might not match. Verify
// this against your actual ViewingRequest model if these fields are wrong.
type ViewingRequestItem = Record<string, any>;

// ─── Icons ────────────────────────────────────────────────────────────────────

const Icons = {
  Units: () => (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path d="M4 21V7l8-4 8 4v14" />
      <path d="M9 21v-6h6v6M4 11h16" />
    </svg>
  ),
  Rooms: () => (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  ),
  Bookings: () => (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  Users: () => (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="9" cy="7" r="4" />
      <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
      <path d="M16 3.13a4 4 0 010 7.75M21 21v-2a4 4 0 00-3-3.87" />
    </svg>
  ),
  Viewings: () => (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Clock: () => (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
    </svg>
  ),
  Check: () => (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path d="M5 13l4 4L19 7" />
    </svg>
  ),
  X: () => (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RENTAL_TYPE_LABEL: Record<string, string> = {
  long_term: "Long Term",
  mid_term: "Mid Term",
  short_term: "Short Term",
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    pending:   { label: "Pending",   cls: "bg-amber-100 text-amber-700",   icon: <Icons.Clock /> },
    confirmed: { label: "Confirmed", cls: "bg-emerald-100 text-emerald-700", icon: <Icons.Check /> },
    cancelled: { label: "Cancelled", cls: "bg-red-100 text-red-600",       icon: <Icons.X /> },
    approved:  { label: "Approved",  cls: "bg-[#7A1B0F]/10 text-[#7A1B0F]", icon: <Icons.Check /> },
  };
  const meta = map[status] ?? { label: status, cls: "bg-slate-100 text-slate-600", icon: null };
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${meta.cls}`}>
      {meta.icon}{meta.label}
    </span>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded-lg ${className}`} />;
}

// A booking's "listing" is either its unit (long/mid term) or its room
// (short term) — never both. Falls back gracefully if neither populated.
function bookingListingName(b: BookingListItem): string {
  return b.unit?.title ?? b.room?.label ?? "Listing";
}

export default function AdminOverviewPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    totalUnits: 0,
    availableUnits: 0,
    totalRooms: 0,
    availableRooms: 0,
    totalBookings: 0,
    pendingBookings: 0,
    totalUsers: 0,
    pendingViewings: 0,
  });

  const [recentBookings, setRecentBookings] = useState<BookingListItem[]>([]);
  const [recentViewings, setRecentViewings] = useState<ViewingRequestItem[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [unitsRes, roomsRes, bookingsRes, usersRes, viewingsRes] = await Promise.all([
          fetch("/api/units?status=all"),
          fetch("/api/rooms?status=all"),
          fetch("/api/bookings"),
          fetch("/api/users"),
          fetch("/api/viewing-request"),
        ]);

        const units    = await unitsRes.json();
        const rooms    = await roomsRes.json();
        const bookings = await bookingsRes.json();
        const users    = await usersRes.json();
        const viewings = await viewingsRes.json();

        const unitList    = units.success    ? (units.data as UnitApiShape[])    : [];
        const roomList    = rooms.success    ? (rooms.data as RoomApiShape[])    : [];
        const bookingList = bookings.success ? (bookings.data as BookingListItem[]) : [];
        const userList    = users.success    ? users.data : [];
        const viewingList = viewings.success ? (viewings.data as ViewingRequestItem[]) : [];

        setStats({
          totalUnits: unitList.length,
          availableUnits: unitList.filter((u) => u.status === "active").length,
          totalRooms: roomList.length,
          // "Available" here means listed and not currently assigned a
          // tenant — same heuristic used on the public listings/gallery
          // pages. It's a point-in-time signal, not a real date-range
          // availability check (that only happens via Booking.hasOverlap
          // when actual dates are supplied).
          availableRooms: roomList.filter((r) => r.status === "active" && r.currentTenant === null).length,
          totalBookings: bookingList.length,
          pendingBookings: bookingList.filter((b) => b.status === "pending").length,
          totalUsers: userList.length,
          pendingViewings: viewingList.filter((v) => v.status === "pending").length,
        });

        setRecentBookings(
          [...bookingList]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5)
        );
        setRecentViewings(
          [...viewingList]
            .sort(
              (a: ViewingRequestItem, b: ViewingRequestItem) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
            .slice(0, 5)
        );
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  const statCards: StatCard[] = [
    {
      label: "Total Units",
      value: loading ? "—" : stats.totalUnits,
      sub: loading ? "" : `${stats.availableUnits} active`,
      color: "bg-[#7A1B0F]/10 text-[#7A1B0F]",
      icon: <Icons.Units />,
    },
    {
      label: "Total Rooms",
      value: loading ? "—" : stats.totalRooms,
      sub: loading ? "" : `${stats.availableRooms} available`,
      color: "bg-blue-50 text-blue-600",
      icon: <Icons.Rooms />,
    },
    {
      label: "Total Bookings",
      value: loading ? "—" : stats.totalBookings,
      sub: loading ? "" : `${stats.pendingBookings} pending`,
      color: "bg-violet-50 text-violet-600",
      icon: <Icons.Bookings />,
    },
    {
      label: "Registered Users",
      value: loading ? "—" : stats.totalUsers,
      sub: "All time",
      color: "bg-emerald-50 text-emerald-600",
      icon: <Icons.Users />,
    },
    {
      label: "Viewing Requests",
      value: loading ? "—" : stats.pendingViewings,
      sub: "Awaiting review",
      color: "bg-amber-50 text-amber-600",
      icon: <Icons.Viewings />,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Good {getGreeting()}, {firstName} 👋
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Here&apos;s what&apos;s happening with JluvStays today.
        </p>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}>
              {card.icon}
            </div>
            <div>
              {loading ? (
                <>
                  <Skeleton className="h-7 w-16 mb-1" />
                  <Skeleton className="h-3.5 w-24" />
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{card.sub}</p>
                </>
              )}
            </div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{card.label}</p>
          </div>
        ))}
      </div>

      {/* ── Recent Activity ── */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Recent Bookings</h2>
            <a href="/admin/bookings" className="text-xs text-[#7A1B0F] hover:underline font-medium">
              View all
            </a>
          </div>
          <div className="divide-y divide-slate-50">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-6 py-3.5 flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))
            ) : recentBookings.length === 0 ? (
              <p className="px-6 py-8 text-center text-slate-400 text-sm">No bookings yet</p>
            ) : (
              recentBookings.map((b) => (
                <div key={b._id} className="px-6 py-3.5 flex items-center gap-3 hover:bg-slate-50 transition">
                  <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 font-bold text-xs flex items-center justify-center flex-shrink-0">
                    {(b.tenant?.name ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {b.tenant?.name ?? "Guest"}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {bookingListingName(b)} &middot; {RENTAL_TYPE_LABEL[b.rentalType] ?? b.rentalType} &middot;{" "}
                      {formatDate(b.moveInDate)}
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Viewing Requests */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Viewing Requests</h2>
            <a href="/admin/viewing-requests" className="text-xs text-[#7A1B0F] hover:underline font-medium">
              View all
            </a>
          </div>
          <div className="divide-y divide-slate-50">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-6 py-3.5 flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))
            ) : recentViewings.length === 0 ? (
              <p className="px-6 py-8 text-center text-slate-400 text-sm">No viewing requests yet</p>
            ) : (
              recentViewings.map((v: ViewingRequestItem) => (
                <div key={v._id} className="px-6 py-3.5 flex items-center gap-3 hover:bg-slate-50 transition">
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 font-bold text-xs flex items-center justify-center flex-shrink-0">
                    {(v.name ?? v.user?.name ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {v.name ?? v.user?.name ?? "Visitor"}
                    </p>
                    {/* NOTE: unit/room field names here are guesses — I don't
                        have your ViewingRequest schema. Verify these match. */}
                    <p className="text-xs text-slate-400 truncate">
                      {v.unit?.title ?? v.room?.label ?? "Listing"} &middot;{" "}
                      {formatDate(v.preferredDate ?? v.date ?? v.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={v.status} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Quick Links ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-800 mb-4">Quick actions</h2>
        <div className="flex flex-wrap gap-3">
          {[
            { label: "View Units",        href: "/admin/units",   color: "bg-[#7A1B0F] hover:opacity-90 text-white" },
            { label: "View Rooms",        href: "/admin/rooms",   color: "bg-blue-600 hover:bg-blue-700 text-white" },
            { label: "View all bookings", href: "/admin/bookings", color: "bg-slate-800 hover:bg-slate-900 text-white" },
            { label: "Manage staff",      href: "/admin/staff",    color: "bg-violet-600 hover:bg-violet-700 text-white" },
            { label: "View reports",      href: "/admin/reports",  color: "bg-emerald-600 hover:bg-emerald-700 text-white" },
          ].map((a) => (
            <a
              key={a.href}
              href={a.href}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${a.color}`}
            >
              {a.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function formatDate(raw: string | undefined) {
  if (!raw) return "—";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}