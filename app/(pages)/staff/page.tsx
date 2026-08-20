"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface DashboardStats {
  totalUnits: number;
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  pendingBookings: number;
  pendingViewings: number;
  totalTenants: number;
}

interface Booking {
  _id: string;
  checkIn?: string;
  checkOut?: string;
  status: string;
  totalPrice?: number;
  user?: {
    name?: string;
    email?: string;
  };
  room?: {
    name?: string;
  };
}

interface ViewingRequest {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  preferredDate?: string;
  preferredTime?: string;
  status?: string;
  createdAt?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────────────────────

const Icon = {
  Units: () => (
    <svg
      width="22"
      height="22"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path d="M4 21V7l8-4 8 4v14" />
      <path d="M9 21v-6h6v6M4 11h16" />
    </svg>
  ),

  Rooms: () => (
    <svg
      width="22"
      height="22"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  ),

  Bookings: () => (
    <svg
      width="22"
      height="22"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <path d="M8 14h.01M12 14h.01M16 14h.01" />
    </svg>
  ),

  Users: () => (
    <svg
      width="22"
      height="22"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <circle cx="9" cy="7" r="4" />
      <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
      <path d="M16 3.13a4 4 0 010 7.75M21 21v-2a4 4 0 00-3-3.87" />
    </svg>
  ),

  Viewings: () => (
    <svg
      width="22"
      height="22"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),

  Arrow: () => (
    <svg
      width="16"
      height="16"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),

  Refresh: () => (
    <svg
      width="16"
      height="16"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path d="M20 11a8.1 8.1 0 00-15.5-2M4 5v4h4" />
      <path d="M4 13a8.1 8.1 0 0015.5 2M20 19v-4h-4" />
    </svg>
  ),

  Calendar: () => (
    <svg
      width="18"
      height="18"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),

  Clock: () => (
    <svg
      width="18"
      height="18"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const formatDate = (date?: string) => {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatCurrency = (amount?: number) => {
  if (amount == null) return "KSh 0";

  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(amount);
};

// ─────────────────────────────────────────────────────────────────────────────
// Overview Page
// ─────────────────────────────────────────────────────────────────────────────

export default function StaffOverviewPage() {
  const { data: session } = useSession();

  const [stats, setStats] =
    useState<DashboardStats>({
      totalUnits: 0,
      totalRooms: 0,
      occupiedRooms: 0,
      availableRooms: 0,
      pendingBookings: 0,
      pendingViewings: 0,
      totalTenants: 0,
    });

  const [bookings, setBookings] =
    useState<Booking[]>([]);

  const [viewings, setViewings] =
    useState<ViewingRequest[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const sessionUser = session?.user as
    | {
        name?: string;
      }
    | undefined;

  const firstName =
    sessionUser?.name?.split(" ")[0] ||
    "Staff";

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch Dashboard Data
  // ─────────────────────────────────────────────────────────────────────────

  const fetchDashboard = async (
    showRefresh = false
  ) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [
        unitsRes,
        roomsRes,
        bookingsRes,
        viewingsRes,
        usersRes,
      ] = await Promise.all([
        fetch("/api/units", {
          cache: "no-store",
        }),

        fetch("/api/rooms", {
          cache: "no-store",
        }),

        fetch("/api/bookings", {
          cache: "no-store",
        }),

        fetch("/api/viewing-request", {
          cache: "no-store",
        }),

        fetch("/api/users/count?role=tenant", {
          cache: "no-store",
        }),
      ]);

      const [
        units,
        rooms,
        bookingsData,
        viewingsData,
        usersData,
      ] = await Promise.all([
        unitsRes.json(),
        roomsRes.json(),
        bookingsRes.json(),
        viewingsRes.json(),
        usersRes.json(),
      ]);

      // ─────────────────────────────────────────────────────────────────────
      // Units
      // ─────────────────────────────────────────────────────────────────────

      const unitList = Array.isArray(units?.data)
        ? units.data
        : [];

      // ─────────────────────────────────────────────────────────────────────
      // Rooms
      // ─────────────────────────────────────────────────────────────────────

      const roomList = Array.isArray(rooms?.data)
        ? rooms.data
        : [];

      const availableRooms =
        roomList.filter(
          (room: {
            isAvailable?: boolean;
            status?: string;
          }) =>
            room.isAvailable === true ||
            room.status === "available" ||
            room.status === "active"
        ).length;

      const occupiedRooms =
        roomList.filter(
          (room: {
            isAvailable?: boolean;
            status?: string;
          }) =>
            room.isAvailable === false ||
            room.status === "occupied"
        ).length;

      // ─────────────────────────────────────────────────────────────────────
      // Bookings
      // ─────────────────────────────────────────────────────────────────────

      const bookingList: Booking[] =
        Array.isArray(bookingsData?.data)
          ? bookingsData.data
          : [];

      const pendingBookings =
        bookingList.filter(
          (booking) =>
            booking.status === "pending"
        ).length;

      // ─────────────────────────────────────────────────────────────────────
      // Viewings
      // ─────────────────────────────────────────────────────────────────────

      const viewingList: ViewingRequest[] =
        Array.isArray(viewingsData?.data)
          ? viewingsData.data
          : [];

      const pendingViewings =
        viewingList.filter(
          (viewing) =>
            viewing.status === "pending"
        ).length;

      // ─────────────────────────────────────────────────────────────────────
      // Tenants
      // ─────────────────────────────────────────────────────────────────────

      let tenantCount = 0;

      if (
        typeof usersData?.count === "number"
      ) {
        tenantCount = usersData.count;
      } else if (
        typeof usersData?.data?.count ===
        "number"
      ) {
        tenantCount =
          usersData.data.count;
      }

      setStats({
        totalUnits: unitList.length,
        totalRooms: roomList.length,
        occupiedRooms,
        availableRooms,
        pendingBookings,
        pendingViewings,
        totalTenants: tenantCount,
      });

      // Latest bookings
      setBookings(
        [...bookingList]
          .sort((a, b) => {
            const dateA = a.checkIn
              ? new Date(a.checkIn).getTime()
              : 0;

            const dateB = b.checkIn
              ? new Date(b.checkIn).getTime()
              : 0;

            return dateB - dateA;
          })
          .slice(0, 5)
      );

      // Latest viewing requests
      setViewings(
        [...viewingList]
          .sort((a, b) => {
            const dateA = a.createdAt
              ? new Date(
                  a.createdAt
                ).getTime()
              : 0;

            const dateB = b.createdAt
              ? new Date(
                  b.createdAt
                ).getTime()
              : 0;

            return dateB - dateA;
          })
          .slice(0, 5)
      );
    } catch (error) {
      console.error(
        "Failed to load staff dashboard:",
        error
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Initial Load
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchDashboard();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Loading
  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">

        <div>
          <div className="h-7 w-64 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-4 w-80 bg-slate-200 rounded mt-3 animate-pulse" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-32 bg-white rounded-2xl border border-slate-200 animate-pulse"
            />
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="h-80 bg-white rounded-2xl border border-slate-200 animate-pulse" />
          <div className="h-80 bg-white rounded-2xl border border-slate-200 animate-pulse" />
        </div>

      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Header */}
      {/* ─────────────────────────────────────────────────────────────────── */}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

        <div>
          <p className="text-sm text-slate-500 mb-1">
            Staff Dashboard
          </p>

          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
            Welcome back, {firstName} 👋
          </h1>

          <p className="text-slate-500 text-sm mt-2">
            Here's what's happening with Jluv
            Stays today.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            fetchDashboard(true)
          }
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
        >
          <span
            className={
              refreshing
                ? "animate-spin"
                : ""
            }
          >
            <Icon.Refresh />
          </span>

          {refreshing
            ? "Refreshing..."
            : "Refresh"}
        </button>

      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Statistics */}
      {/* ─────────────────────────────────────────────────────────────────── */}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">

        {/* Units */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">

          <div className="flex items-start justify-between">

            <div>
              <p className="text-sm text-slate-500">
                Total Units
              </p>

              <p className="text-3xl font-bold text-slate-900 mt-2">
                {stats.totalUnits}
              </p>
            </div>

            <div className="w-11 h-11 rounded-xl bg-[#7A1B0F]/10 text-[#7A1B0F] flex items-center justify-center">
              <Icon.Units />
            </div>

          </div>

          <Link
            href="/staff/units"
            className="flex items-center gap-1 text-xs font-medium text-[#7A1B0F] mt-4 hover:underline"
          >
            View units
            <Icon.Arrow />
          </Link>

        </div>

        {/* Rooms */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">

          <div className="flex items-start justify-between">

            <div>
              <p className="text-sm text-slate-500">
                Total Rooms
              </p>

              <p className="text-3xl font-bold text-slate-900 mt-2">
                {stats.totalRooms}
              </p>
            </div>

            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Icon.Rooms />
            </div>

          </div>

          <div className="flex gap-3 mt-4 text-xs">
            <span className="text-emerald-600 font-medium">
              {stats.availableRooms} available
            </span>

            <span className="text-slate-400">
              •
            </span>

            <span className="text-slate-500">
              {stats.occupiedRooms} occupied
            </span>
          </div>

        </div>

        {/* Bookings */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">

          <div className="flex items-start justify-between">

            <div>
              <p className="text-sm text-slate-500">
                Pending Bookings
              </p>

              <p className="text-3xl font-bold text-slate-900 mt-2">
                {stats.pendingBookings}
              </p>
            </div>

            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Icon.Bookings />
            </div>

          </div>

          <Link
            href="/staff/bookings"
            className="flex items-center gap-1 text-xs font-medium text-[#7A1B0F] mt-4 hover:underline"
          >
            Manage bookings
            <Icon.Arrow />
          </Link>

        </div>

        {/* Viewings */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">

          <div className="flex items-start justify-between">

            <div>
              <p className="text-sm text-slate-500">
                Viewing Requests
              </p>

              <p className="text-3xl font-bold text-slate-900 mt-2">
                {stats.pendingViewings}
              </p>
            </div>

            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Icon.Viewings />
            </div>

          </div>

          <Link
            href="/staff/viewings"
            className="flex items-center gap-1 text-xs font-medium text-[#7A1B0F] mt-4 hover:underline"
          >
            View requests
            <Icon.Arrow />
          </Link>

        </div>

      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Occupancy */}
      {/* ─────────────────────────────────────────────────────────────────── */}

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Room Occupancy
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Current room availability
            </p>
          </div>

          <Link
            href="/staff/rooms"
            className="text-sm font-medium text-[#7A1B0F] hover:underline"
          >
            Manage rooms
          </Link>

        </div>

        <div className="mt-6">

          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-slate-500">
              Occupied
            </span>

            <span className="font-semibold text-slate-800">
              {stats.totalRooms > 0
                ? Math.round(
                    (stats.occupiedRooms /
                      stats.totalRooms) *
                      100
                  )
                : 0}
              %
            </span>
          </div>

          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">

            <div
              className="h-full bg-[#7A1B0F] rounded-full transition-all duration-500"
              style={{
                width: `${
                  stats.totalRooms > 0
                    ? Math.min(
                        100,
                        Math.round(
                          (stats.occupiedRooms /
                            stats.totalRooms) *
                            100
                        )
                      )
                    : 0
                }%`,
              }}
            />

          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">

            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-[#7A1B0F]" />

              <div>
                <p className="text-xs text-slate-500">
                  Occupied
                </p>

                <p className="font-semibold text-slate-800">
                  {stats.occupiedRooms}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />

              <div>
                <p className="text-xs text-slate-500">
                  Available
                </p>

                <p className="font-semibold text-slate-800">
                  {stats.availableRooms}
                </p>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Recent Activity */}
      {/* ─────────────────────────────────────────────────────────────────── */}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Recent Bookings */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">

            <div>
              <h2 className="font-semibold text-slate-900">
                Recent Bookings
              </h2>

              <p className="text-xs text-slate-500 mt-1">
                Latest booking activity
              </p>
            </div>

            <Link
              href="/staff/bookings"
              className="text-xs font-medium text-[#7A1B0F] hover:underline"
            >
              View all
            </Link>

          </div>

          <div className="divide-y divide-slate-100">

            {bookings.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Icon.Bookings />

                <p className="text-sm font-medium text-slate-700 mt-3">
                  No bookings yet
                </p>

                <p className="text-xs text-slate-400 mt-1">
                  New bookings will appear here.
                </p>
              </div>
            ) : (
              bookings.map((booking) => (
                <div
                  key={booking._id}
                  className="px-6 py-4 flex items-center gap-4"
                >

                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">
                    <Icon.Calendar />
                  </div>

                  <div className="flex-1 min-w-0">

                    <p className="text-sm font-medium text-slate-800 truncate">
                      {booking.user?.name ||
                        booking.user?.email ||
                        "Guest"}
                    </p>

                    <p className="text-xs text-slate-500 mt-1">
                      {booking.room?.name ||
                        "Room"}{" "}
                      •{" "}
                      {formatDate(
                        booking.checkIn
                      )}
                    </p>

                  </div>

                  <div className="text-right flex-shrink-0">

                    <span
                      className={`
                        inline-flex items-center
                        px-2 py-1 rounded-full
                        text-[10px] font-semibold
                        capitalize

                        ${
                          booking.status ===
                          "pending"
                            ? "bg-amber-50 text-amber-700"
                            : booking.status ===
                              "confirmed"
                            ? "bg-emerald-50 text-emerald-700"
                            : booking.status ===
                              "cancelled"
                            ? "bg-red-50 text-red-700"
                            : "bg-slate-100 text-slate-600"
                        }
                      `}
                    >
                      {booking.status}
                    </span>

                    {booking.totalPrice !=
                      null && (
                      <p className="text-xs font-medium text-slate-700 mt-1">
                        {formatCurrency(
                          booking.totalPrice
                        )}
                      </p>
                    )}

                  </div>

                </div>
              ))
            )}

          </div>
        </div>

        {/* Viewing Requests */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">

            <div>
              <h2 className="font-semibold text-slate-900">
                Viewing Requests
              </h2>

              <p className="text-xs text-slate-500 mt-1">
                Latest property viewing requests
              </p>
            </div>

            <Link
              href="/staff/viewings"
              className="text-xs font-medium text-[#7A1B0F] hover:underline"
            >
              View all
            </Link>

          </div>

          <div className="divide-y divide-slate-100">

            {viewings.length === 0 ? (
              <div className="px-6 py-12 text-center">

                <Icon.Viewings />

                <p className="text-sm font-medium text-slate-700 mt-3">
                  No viewing requests
                </p>

                <p className="text-xs text-slate-400 mt-1">
                  New requests will appear here.
                </p>

              </div>
            ) : (
              viewings.map((viewing) => (
                <div
                  key={viewing._id}
                  className="px-6 py-4 flex items-center gap-4"
                >

                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                    <Icon.Viewings />
                  </div>

                  <div className="flex-1 min-w-0">

                    <p className="text-sm font-medium text-slate-800 truncate">
                      {viewing.name ||
                        viewing.email ||
                        "Visitor"}
                    </p>

                    <p className="text-xs text-slate-500 mt-1">
                      {viewing.preferredDate
                        ? formatDate(
                            viewing.preferredDate
                          )
                        : "Date not specified"}

                      {viewing.preferredTime &&
                        ` • ${viewing.preferredTime}`}
                    </p>

                  </div>

                  <div className="text-right flex-shrink-0">

                    <span
                      className={`
                        inline-flex items-center
                        px-2 py-1 rounded-full
                        text-[10px] font-semibold
                        capitalize

                        ${
                          viewing.status ===
                          "pending"
                            ? "bg-amber-50 text-amber-700"
                            : viewing.status ===
                              "approved"
                            ? "bg-emerald-50 text-emerald-700"
                            : viewing.status ===
                              "cancelled"
                            ? "bg-red-50 text-red-700"
                            : "bg-slate-100 text-slate-600"
                        }
                      `}
                    >
                      {viewing.status ||
                        "pending"}
                    </span>

                  </div>

                </div>
              ))
            )}

          </div>
        </div>

      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Quick Actions */}
      {/* ─────────────────────────────────────────────────────────────────── */}

      <div>

        <h2 className="text-base font-semibold text-slate-900 mb-4">
          Quick Actions
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          <Link
            href="/staff/bookings"
            className="group bg-white border border-slate-200 rounded-2xl p-5 hover:border-[#7A1B0F]/30 hover:shadow-md transition"
          >
            <Icon.Bookings />

            <p className="font-semibold text-slate-800 mt-4">
              Manage Bookings
            </p>

            <p className="text-xs text-slate-500 mt-1">
              Review and manage reservations.
            </p>

            <div className="mt-4 text-[#7A1B0F] group-hover:translate-x-1 transition">
              <Icon.Arrow />
            </div>
          </Link>

          <Link
            href="/staff/viewings"
            className="group bg-white border border-slate-200 rounded-2xl p-5 hover:border-[#7A1B0F]/30 hover:shadow-md transition"
          >
            <Icon.Viewings />

            <p className="font-semibold text-slate-800 mt-4">
              Viewing Requests
            </p>

            <p className="text-xs text-slate-500 mt-1">
              Handle property viewing requests.
            </p>

            <div className="mt-4 text-[#7A1B0F] group-hover:translate-x-1 transition">
              <Icon.Arrow />
            </div>
          </Link>

          <Link
            href="/staff/rooms"
            className="group bg-white border border-slate-200 rounded-2xl p-5 hover:border-[#7A1B0F]/30 hover:shadow-md transition"
          >
            <Icon.Rooms />

            <p className="font-semibold text-slate-800 mt-4">
              Manage Rooms
            </p>

            <p className="text-xs text-slate-500 mt-1">
              Check room availability and status.
            </p>

            <div className="mt-4 text-[#7A1B0F] group-hover:translate-x-1 transition">
              <Icon.Arrow />
            </div>
          </Link>

          <Link
            href="/staff/users"
            className="group bg-white border border-slate-200 rounded-2xl p-5 hover:border-[#7A1B0F]/30 hover:shadow-md transition"
          >
            <Icon.Users />

            <p className="font-semibold text-slate-800 mt-4">
              Manage Users
            </p>

            <p className="text-xs text-slate-500 mt-1">
              View tenants and user accounts.
            </p>

            <div className="mt-4 text-[#7A1B0F] group-hover:translate-x-1 transition">
              <Icon.Arrow />
            </div>
          </Link>

        </div>

      </div>

    </div>
  );
}