"use client";

import { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type BookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed";

type RentalType =
  | "long_term"
  | "mid_term"
  | "short_term";

interface Booking {
  _id: string;

  rentalType: RentalType;

  tenant?: {
    _id?: string;
    name?: string;
    email?: string;
    phone?: string;
  } | null;

  unit?: {
    _id?: string;
    title?: string;
    pricePerMonth?: number;
    images?: string[];
    rentalType?: RentalType;
  } | null;

  room?: {
    _id?: string;
    label?: string;
    pricePerNight?: number;
    images?: string[];
  } | null;

  moveInDate: string;
  moveOutDate: string;

  status: BookingStatus;

  price: number;
  priceUnit: "month" | "night";
  currency: string;

  createdAt?: string;
  updatedAt?: string;
}

type Tab =
  | "arrivals"
  | "departures"
  | "inhouse";

// ─────────────────────────────────────────────────────────────────────────────
// Brand colors
// ─────────────────────────────────────────────────────────────────────────────

const PRIMARY = "#7A1B0F";
const PRIMARY_LIGHT = "#F7E9E6";
const PRIMARY_BORDER = "#E6C5BF";

// ─────────────────────────────────────────────────────────────────────────────
// Date helpers
// ─────────────────────────────────────────────────────────────────────────────

function startOfToday(): Date {
  const date = new Date();

  date.setHours(0, 0, 0, 0);

  return date;
}

function startOfTomorrow(): Date {
  const date = startOfToday();

  date.setDate(date.getDate() + 1);

  return date;
}

/**
 * Convert a date into a local calendar day.
 *
 * We intentionally compare calendar dates rather than exact timestamps.
 * This is important because bookings normally represent dates such as:
 *
 * 2026-08-20
 *
 * rather than an exact check-in time.
 */
function isToday(dateString: string): boolean {
  const date = new Date(dateString);
  const today = startOfToday();

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

/**
 * Current in-house rule:
 *
 * moveInDate <= today
 * AND
 * moveOutDate > today
 *
 * Someone whose move-out date is today belongs to departures,
 * not in-house.
 */
function isCurrentlyInHouse(
  moveInDate: string,
  moveOutDate: string
): boolean {
  const moveIn = new Date(moveInDate);
  const moveOut = new Date(moveOutDate);

  const today = startOfToday();
  const tomorrow = startOfTomorrow();

  return moveIn < tomorrow && moveOut > today;
}

/**
 * Full date.
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Short date.
 */
function formatShortDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Booking helpers
// ─────────────────────────────────────────────────────────────────────────────

function getGuestName(booking: Booking): string {
  return booking.tenant?.name || "Unknown guest";
}

function getGuestEmail(booking: Booking): string {
  return booking.tenant?.email || "No email";
}

function getGuestPhone(booking: Booking): string {
  return booking.tenant?.phone || "";
}

function getAccommodationName(
  booking: Booking
): string {
  if (booking.unit) {
    return booking.unit.title || "Unit";
  }

  if (booking.room) {
    return booking.room.label || "Room";
  }

  return "Accommodation";
}

function getRentalLabel(
  rentalType: RentalType
): string {
  switch (rentalType) {
    case "short_term":
      return "Short-term";

    case "mid_term":
      return "Mid-term";

    case "long_term":
      return "Long-term";

    default:
      return rentalType;
  }
}

function getAccommodationType(
  booking: Booking
): string {
  if (booking.rentalType === "short_term") {
    return "Room";
  }

  if (booking.rentalType === "long_term") {
    return "Long-term Unit";
  }

  if (booking.rentalType === "mid_term") {
    return "Mid-term Unit";
  }

  return "Accommodation";
}

// ─────────────────────────────────────────────────────────────────────────────
// Avatar
// ─────────────────────────────────────────────────────────────────────────────

function Avatar({
  name,
}: {
  name: string;
}) {
  const initial =
    name?.trim().charAt(0).toUpperCase() || "?";

  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
      style={{
        backgroundColor: PRIMARY_LIGHT,
        color: PRIMARY,
      }}
    >
      {initial}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Status badge
// ─────────────────────────────────────────────────────────────────────────────

function BookingStatusBadge({
  status,
}: {
  status: BookingStatus;
}) {
  const styles: Record<
    BookingStatus,
    {
      background: string;
      text: string;
      border: string;
      dot: string;
    }
  > = {
    pending: {
      background: "#FFFBEB",
      text: "#B45309",
      border: "#FDE68A",
      dot: "#F59E0B",
    },

    confirmed: {
      background: "#ECFDF5",
      text: "#047857",
      border: "#A7F3D0",
      dot: "#10B981",
    },

    cancelled: {
      background: "#FEF2F2",
      text: "#DC2626",
      border: "#FECACA",
      dot: "#EF4444",
    },

    completed: {
      background: "#F8FAFC",
      text: "#475569",
      border: "#E2E8F0",
      dot: "#94A3B8",
    },
  };

  const style = styles[status];

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold capitalize"
      style={{
        backgroundColor: style.background,
        color: style.text,
        borderColor: style.border,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{
          backgroundColor: style.dot,
        }}
      />

      {status}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function StaffCheckinPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("arrivals");

  // ──────────────────────────────────────────────────────────────────────────
  // Fetch bookings
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    let mounted = true;

    const fetchBookings = async () => {
      try {
        setLoading(true);

        const response = await fetch("/api/bookings", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(
            `Failed to fetch bookings (${response.status})`
          );
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(
            data.message || "Failed to fetch bookings"
          );
        }

        const bookingData: Booking[] =
          Array.isArray(data.data)
            ? data.data
            : [];

        if (mounted) {
          setBookings(bookingData);
        }
      } catch (error) {
        console.error(
          "Failed to load check-in/check-out bookings:",
          error
        );

        if (mounted) {
          toast.error("Failed to load bookings");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchBookings();

    return () => {
      mounted = false;
    };
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // ONLY CONFIRMED BOOKINGS
  //
  // This intentionally does NOT check the user's role.
  //
  // Your Booking schema stores the person making the booking as:
  //
  // tenant: ObjectId -> User
  //
  // Therefore all users who have bookings can appear here, regardless
  // of whether their User.role is guest, tenant, staff, admin, etc.
  // ──────────────────────────────────────────────────────────────────────────

  const confirmedBookings = useMemo(() => {
    return bookings.filter(
      (booking) => booking.status === "confirmed"
    );
  }, [bookings]);

  // ──────────────────────────────────────────────────────────────────────────
  // ARRIVALS
  //
  // Confirmed bookings where moveInDate is TODAY.
  // ──────────────────────────────────────────────────────────────────────────

  const arrivals = useMemo(() => {
    return confirmedBookings.filter((booking) =>
      isToday(booking.moveInDate)
    );
  }, [confirmedBookings]);

  // ──────────────────────────────────────────────────────────────────────────
  // DEPARTURES
  //
  // Confirmed bookings where moveOutDate is TODAY.
  // ──────────────────────────────────────────────────────────────────────────

  const departures = useMemo(() => {
    return confirmedBookings.filter((booking) =>
      isToday(booking.moveOutDate)
    );
  }, [confirmedBookings]);

  // ──────────────────────────────────────────────────────────────────────────
  // IN-HOUSE
  //
  // Confirmed bookings where:
  //
  // moveInDate <= today
  // moveOutDate > today
  //
  // A guest departing today is therefore NOT included here.
  // ──────────────────────────────────────────────────────────────────────────

  const inhouse = useMemo(() => {
    return confirmedBookings.filter((booking) =>
      isCurrentlyInHouse(
        booking.moveInDate,
        booking.moveOutDate
      )
    );
  }, [confirmedBookings]);

  // ──────────────────────────────────────────────────────────────────────────
  // Current list
  // ──────────────────────────────────────────────────────────────────────────

  const lists: Record<Tab, Booking[]> = {
    arrivals,
    departures,
    inhouse,
  };

  const currentBookings = lists[tab];

  // ──────────────────────────────────────────────────────────────────────────
  // Tabs
  // ──────────────────────────────────────────────────────────────────────────

  const tabs: {
    key: Tab;
    label: string;
  }[] = [
    {
      key: "arrivals",
      label: `Arrivals (${arrivals.length})`,
    },
    {
      key: "departures",
      label: `Departures (${departures.length})`,
    },
    {
      key: "inhouse",
      label: `In-house (${inhouse.length})`,
    },
  ];

  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            borderRadius: "10px",
            background: "#1e293b",
            color: "#f8fafc",
            fontSize: "14px",
          },
        }}
      />

      <div className="space-y-6">
        {/* ──────────────────────────────────────────────────────────────── */}
        {/* Header */}
        {/* ──────────────────────────────────────────────────────────────── */}

        <div>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: PRIMARY_LIGHT,
                color: PRIMARY,
              }}
            >
              <svg
                width="20"
                height="20"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z"
                />
              </svg>
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Check-in / Check-out
              </h1>

              <p className="text-slate-500 text-sm mt-1">
                Today —{" "}
                {new Date().toLocaleDateString("en-KE", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────────── */}
        {/* Summary Cards */}
        {/* ──────────────────────────────────────────────────────────────── */}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Arrivals */}
          <button
            type="button"
            onClick={() => setTab("arrivals")}
            className={`text-left rounded-2xl p-5 border transition-all ${
              tab === "arrivals"
                ? "shadow-md"
                : "hover:shadow-sm"
            }`}
            style={{
              backgroundColor:
                tab === "arrivals"
                  ? PRIMARY_LIGHT
                  : "white",

              borderColor:
                tab === "arrivals"
                  ? PRIMARY_BORDER
                  : "#f1f5f9",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className="text-3xl font-bold"
                  style={{ color: PRIMARY }}
                >
                  {loading
                    ? "—"
                    : arrivals.length}
                </p>

                <p className="text-sm text-slate-600 mt-1">
                  Arriving today
                </p>
              </div>

              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  backgroundColor: PRIMARY_LIGHT,
                  color: PRIMARY,
                }}
              >
                <svg
                  width="20"
                  height="20"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M12 19V5" />
                  <path d="M5 12l7-7 7 7" />
                </svg>
              </div>
            </div>
          </button>

          {/* Departures */}
          <button
            type="button"
            onClick={() => setTab("departures")}
            className={`text-left rounded-2xl p-5 border transition-all ${
              tab === "departures"
                ? "shadow-md"
                : "hover:shadow-sm"
            }`}
            style={{
              backgroundColor:
                tab === "departures"
                  ? PRIMARY_LIGHT
                  : "white",

              borderColor:
                tab === "departures"
                  ? PRIMARY_BORDER
                  : "#f1f5f9",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className="text-3xl font-bold"
                  style={{ color: PRIMARY }}
                >
                  {loading
                    ? "—"
                    : departures.length}
                </p>

                <p className="text-sm text-slate-600 mt-1">
                  Departing today
                </p>
              </div>

              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  backgroundColor: PRIMARY_LIGHT,
                  color: PRIMARY,
                }}
              >
                <svg
                  width="20"
                  height="20"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M12 5v14" />
                  <path d="M19 12l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </button>

          {/* In-house */}
          <button
            type="button"
            onClick={() => setTab("inhouse")}
            className={`text-left rounded-2xl p-5 border transition-all ${
              tab === "inhouse"
                ? "shadow-md"
                : "hover:shadow-sm"
            }`}
            style={{
              backgroundColor:
                tab === "inhouse"
                  ? PRIMARY_LIGHT
                  : "white",

              borderColor:
                tab === "inhouse"
                  ? PRIMARY_BORDER
                  : "#f1f5f9",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className="text-3xl font-bold"
                  style={{ color: PRIMARY }}
                >
                  {loading
                    ? "—"
                    : inhouse.length}
                </p>

                <p className="text-sm text-slate-600 mt-1">
                  Currently in-house
                </p>
              </div>

              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  backgroundColor: PRIMARY_LIGHT,
                  color: PRIMARY,
                }}
              >
                <svg
                  width="20"
                  height="20"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M4 19h16" />
                  <path d="M6 19V8a2 2 0 012-2h8a2 2 0 012 2v11" />
                  <path d="M9 6V4h6v2" />
                </svg>
              </div>
            </div>
          </button>
        </div>

        {/* ──────────────────────────────────────────────────────────────── */}
        {/* Tabs */}
        {/* ──────────────────────────────────────────────────────────────── */}

        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit flex-wrap">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === item.key
                  ? "bg-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
              style={
                tab === item.key
                  ? { color: PRIMARY }
                  : undefined
              }
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* ──────────────────────────────────────────────────────────────── */}
        {/* Booking list */}
        {/* ──────────────────────────────────────────────────────────────── */}

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex justify-center py-20">
              <div
                className="w-8 h-8 border-2 rounded-full animate-spin"
                style={{
                  borderColor: PRIMARY,
                  borderTopColor: "transparent",
                }}
              />
            </div>
          </div>
        ) : currentBookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-20 text-center">
            <div
              className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{
                backgroundColor: PRIMARY_LIGHT,
                color: PRIMARY,
              }}
            >
              <svg
                width="22"
                height="22"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622C17.176 19.29 21 14.591 21 9c0-1.077-.142-2.121-.405-3.016z"
                />
              </svg>
            </div>

            <p className="text-slate-600 font-medium">
              {tab === "arrivals" &&
                "No confirmed arrivals today."}

              {tab === "departures" &&
                "No confirmed departures today."}

              {tab === "inhouse" &&
                "No confirmed guests currently in-house."}
            </p>

            <p className="text-slate-400 text-sm mt-1">
              Only confirmed bookings are shown here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {currentBookings.map((booking) => {
              const guestName =
                getGuestName(booking);

              const phone =
                getGuestPhone(booking);

              return (
                <div
                  key={booking._id}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 sm:px-6 py-4"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <Avatar name={guestName} />

                    {/* Guest */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 truncate">
                        {guestName}
                      </p>

                      <p className="text-xs text-slate-400 truncate">
                        {getGuestEmail(booking)}
                      </p>

                      {phone && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {phone}
                        </p>
                      )}
                    </div>

                    {/* Unit / Room */}
                    <div className="hidden sm:block min-w-[150px]">
                      <p className="text-sm font-medium text-slate-700">
                        {getAccommodationName(
                          booking
                        )}
                      </p>

                      <p className="text-xs text-slate-400">
                        {getAccommodationType(
                          booking
                        )}
                      </p>
                    </div>

                    {/* Rental type */}
                    <div className="hidden md:block min-w-[100px]">
                      <span
                        className="inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold"
                        style={{
                          backgroundColor:
                            PRIMARY_LIGHT,
                          color: PRIMARY,
                        }}
                      >
                        {getRentalLabel(
                          booking.rentalType
                        )}
                      </span>
                    </div>

                    {/* Dates */}
                    <div className="hidden lg:block text-right min-w-[190px]">
                      <p className="text-xs text-slate-500">
                        {formatShortDate(
                          booking.moveInDate
                        )}
                        {" → "}
                        {formatShortDate(
                          booking.moveOutDate
                        )}
                      </p>

                      <p className="text-xs font-medium text-slate-700 mt-1">
                        {booking.currency || "USD"}{" "}
                        {Number(
                          booking.price || 0
                        ).toLocaleString()}
                        {" / "}
                        {booking.priceUnit}
                      </p>
                    </div>

                    {/* Status */}
                    <div className="flex-shrink-0">
                      <BookingStatusBadge
                        status={booking.status}
                      />
                    </div>
                  </div>

                  {/* Mobile details */}
                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 sm:hidden">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
                        Accommodation
                      </p>

                      <p className="text-sm text-slate-700 mt-0.5">
                        {getAccommodationName(
                          booking
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
                        Rental type
                      </p>

                      <p className="text-sm text-slate-700 mt-0.5">
                        {getRentalLabel(
                          booking.rentalType
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
                        Move in
                      </p>

                      <p className="text-sm text-slate-700 mt-0.5">
                        {formatDate(
                          booking.moveInDate
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
                        Move out
                      </p>

                      <p className="text-sm text-slate-700 mt-0.5">
                        {formatDate(
                          booking.moveOutDate
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
                        Price
                      </p>

                      <p className="text-sm text-slate-700 mt-0.5">
                        {booking.currency ||
                          "USD"}{" "}
                        {Number(
                          booking.price || 0
                        ).toLocaleString()}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
                        Status
                      </p>

                      <div className="mt-1">
                        <BookingStatusBadge
                          status={booking.status}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Booking context */}
                  <div className="hidden lg:flex mt-3 pt-3 border-t border-slate-100 items-center justify-between">
                    <p className="text-xs text-slate-400">
                      Booking ID:{" "}
                      <span className="font-mono">
                        {booking._id}
                      </span>
                    </p>

                    <p
                      className="text-xs font-semibold"
                      style={{
                        color: PRIMARY,
                      }}
                    >
                      {tab === "arrivals" &&
                        `Expected to move in ${formatDate(
                          booking.moveInDate
                        )}`}

                      {tab === "departures" &&
                        `Expected to move out ${formatDate(
                          booking.moveOutDate
                        )}`}

                      {tab === "inhouse" &&
                        `Staying until ${formatDate(
                          booking.moveOutDate
                        )}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────────── */}
        {/* Information box */}
        {/* ──────────────────────────────────────────────────────────────── */}

        {!loading && (
          <div
            className="rounded-2xl border px-5 py-4"
            style={{
              backgroundColor: PRIMARY_LIGHT,
              borderColor: PRIMARY_BORDER,
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: PRIMARY,
                  color: "white",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                  />

                  <path d="M12 11v5" />

                  <path d="M12 8h.01" />
                </svg>
              </div>

              <div>
                <p
                  className="text-sm font-semibold"
                  style={{
                    color: PRIMARY,
                  }}
                >
                  Check-in / Check-out information
                </p>

                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Arrivals and departures are
                  determined from the booking&apos;s{" "}
                  <strong>move-in</strong> and{" "}
                  <strong>move-out</strong> dates.
                  Only bookings with a{" "}
                  <strong>confirmed</strong> status
                  are included. A guest is considered
                  in-house when their move-in date has
                  started and their move-out date has
                  not yet been reached.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}