// room-booking/app/(pages)/admin/bookings/page.tsx

"use client";

import { useEffect, useState, Fragment } from "react";

interface Booking {
  _id: string;

  rentalType:
    | "long_term"
    | "mid_term"
    | "short_term";

  unit?: {
    title: string;
  } | null;

  room?: {
    label: string;
  } | null;

  tenant: {
    name: string;
    email: string;
    phone?: string;
  };

  moveInDate: string;
  moveOutDate: string;

  price: number;
  priceUnit: "month" | "night";

  status:
    | "pending"
    | "confirmed"
    | "cancelled";

  createdAt: string;
}

type FilterStatus =
  | "all"
  | "pending"
  | "confirmed"
  | "cancelled";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const PRIMARY_COLOR = "#7A1B0F";

const LIMIT = 10;

const RENTAL_TYPE_LABEL: Record<
  Booking["rentalType"],
  string
> = {
  long_term: "Long Term",
  mid_term: "Mid Term",
  short_term: "Short Term",
};

// ─────────────────────────────────────────────
// Status styles
// ─────────────────────────────────────────────

const STATUS_STYLES: Record<
  Booking["status"],
  string
> = {
  pending:
    "bg-amber-50 text-amber-700 border-amber-200",

  confirmed:
    "bg-emerald-50 text-emerald-700 border-emerald-200",

  cancelled:
    "bg-red-50 text-red-700 border-red-200",
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const formatDate = (date: string) => {
  if (!date) return "—";

  return new Date(date).toLocaleDateString(
    "en-KE",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
};

const listingName = (booking: Booking) =>
  booking.unit?.title ??
  booking.room?.label ??
  "Listing";

const formatPrice = (price: number) =>
  `KSh ${Number(price || 0).toLocaleString()}`;

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default function AdminBookingsPage() {
  const [bookings, setBookings] =
    useState<Booking[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [activeTab, setActiveTab] =
    useState<FilterStatus>("all");

  const [search, setSearch] =
    useState("");

  const [updatingId, setUpdatingId] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState("");

  const [expanded, setExpanded] =
    useState<string | null>(null);

  const [page, setPage] =
    useState(1);

  // ─────────────────────────────────────────
  // Load bookings
  // ─────────────────────────────────────────

  const loadBookings = async () => {
    setLoading(true);

    try {
      const response = await fetch(
        "/api/bookings",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to load bookings"
        );
      }

      setBookings(
        Array.isArray(data.data)
          ? data.data
          : []
      );
    } catch (error) {
      console.error(
        "Failed to load bookings:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  // Reset pagination
  useEffect(() => {
    setPage(1);
  }, [activeTab, search]);

  // ─────────────────────────────────────────
  // Update booking status
  // ─────────────────────────────────────────

  const updateStatus = async (
    id: string,
    status: "confirmed" | "cancelled"
  ) => {
    setUpdatingId(id);

    try {
      const response = await fetch(
        `/api/bookings/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            status,
          }),
        }
      );

      const data = await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Failed to update booking"
        );
      }

      setBookings((previous) =>
        previous.map((booking) =>
          booking._id === id
            ? {
                ...booking,
                status,
              }
            : booking
        )
      );

      setSuccess(
        `Booking ${status} successfully!`
      );

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to update booking"
      );
    } finally {
      setUpdatingId(null);
    }
  };

  // ─────────────────────────────────────────
  // Booking counts
  // ─────────────────────────────────────────

  const counts = {
    all: bookings.length,

    pending: bookings.filter(
      (booking) =>
        booking.status === "pending"
    ).length,

    confirmed: bookings.filter(
      (booking) =>
        booking.status === "confirmed"
    ).length,

    cancelled: bookings.filter(
      (booking) =>
        booking.status === "cancelled"
    ).length,
  };

  // ─────────────────────────────────────────
  // Filter + Search
  // ─────────────────────────────────────────

  const filtered = bookings.filter(
    (booking) => {
      if (
        activeTab !== "all" &&
        booking.status !== activeTab
      ) {
        return false;
      }

      if (search.trim()) {
        const query =
          search
            .toLowerCase()
            .trim();

        return (
          booking.tenant?.name
            ?.toLowerCase()
            .includes(query) ||

          booking.tenant?.email
            ?.toLowerCase()
            .includes(query) ||

          booking.tenant?.phone
            ?.toLowerCase()
            .includes(query) ||

          listingName(booking)
            .toLowerCase()
            .includes(query) ||

          RENTAL_TYPE_LABEL[
            booking.rentalType
          ]
            .toLowerCase()
            .includes(query)
        );
      }

      return true;
    }
  );

  // ─────────────────────────────────────────
  // Pagination
  // ─────────────────────────────────────────

  const totalPages = Math.ceil(
    filtered.length / LIMIT
  );

  const paginated = filtered.slice(
    (page - 1) * LIMIT,
    page * LIMIT
  );

  // ─────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Bookings
          </h1>

          <p className="text-sm text-slate-400 mt-0.5">
            {bookings.length} total bookings
          </p>
        </div>

        {/* Header accent */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
          style={{
            backgroundColor: PRIMARY_COLOR,
          }}
        >
          <svg
            width="19"
            height="19"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <rect
              x="3"
              y="4"
              width="18"
              height="18"
              rx="2"
            />

            <path d="M16 2v4M8 2v4M3 10h18" />

            <path
              d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* Success message */}
      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
            ✓
          </span>

          {success}
        </div>
      )}

      {/* ─────────────────────────────────────
          Filters + Search
      ───────────────────────────────────── */}

      <div className="flex flex-col xl:flex-row gap-3">

        {/* Status tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 flex-wrap">

          {(
            [
              "all",
              "pending",
              "confirmed",
              "cancelled",
            ] as const
          ).map((tab) => {
            const isActive =
              activeTab === tab;

            return (
              <button
                key={tab}
                onClick={() =>
                  setActiveTab(tab)
                }
                className={`
                  px-3
                  py-1.5
                  rounded-lg
                  text-xs
                  font-semibold
                  transition-all
                  capitalize
                  flex
                  items-center
                  gap-1.5

                  ${
                    isActive
                      ? "text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700 hover:bg-white/60"
                  }
                `}
                style={
                  isActive
                    ? {
                        backgroundColor:
                          PRIMARY_COLOR,
                      }
                    : undefined
                }
              >
                {tab}

                <span
                  className={`
                    px-1.5
                    py-0.5
                    rounded-full
                    text-[10px]

                    ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 text-slate-500"
                    }
                  `}
                >
                  {counts[tab]}
                </span>
              </button>
            );
          })}

        </div>

        {/* Search */}
        <div className="relative flex-1 xl:max-w-sm xl:ml-auto">

          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{
              color: PRIMARY_COLOR,
            }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle
              cx="11"
              cy="11"
              r="8"
            />

            <path d="M21 21l-4.35-4.35" />
          </svg>

          <input
            type="text"
            placeholder="Search tenant, listing or phone..."
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            className="
              w-full
              pl-9
              pr-4
              py-2.5
              text-sm
              font-medium
              text-slate-900
              placeholder:text-slate-400
              border
              border-slate-200
              rounded-xl
              bg-white
              focus:outline-none
              transition-all
            "
            style={{
              borderColor:
                search
                  ? PRIMARY_COLOR
                  : undefined,
            }}
            onFocus={(event) => {
              event.currentTarget.style.boxShadow =
                `0 0 0 3px ${PRIMARY_COLOR}20`;
            }}
            onBlur={(event) => {
              event.currentTarget.style.boxShadow =
                "none";
            }}
          />

        </div>

      </div>

      {/* ─────────────────────────────────────
          Table
      ───────────────────────────────────── */}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

        {loading ? (

          <div className="divide-y divide-slate-50">

            {[1, 2, 3, 4, 5].map(
              (item) => (
                <div
                  key={item}
                  className="
                    flex
                    items-center
                    gap-4
                    px-5
                    py-4
                    animate-pulse
                  "
                >
                  <div className="h-3 bg-slate-100 rounded w-1/5" />

                  <div className="h-3 bg-slate-100 rounded w-1/6" />

                  <div className="h-3 bg-slate-100 rounded w-1/6" />

                  <div className="h-6 bg-slate-100 rounded-full w-20 ml-auto" />
                </div>
              )
            )}

          </div>

        ) : filtered.length === 0 ? (

          <div className="py-20 text-center text-slate-400 text-sm">

            <div
              className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center"
              style={{
                backgroundColor:
                  `${PRIMARY_COLOR}10`,
                color: PRIMARY_COLOR,
              }}
            >
              <svg
                width="26"
                height="26"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.7}
              >
                <rect
                  x="3"
                  y="4"
                  width="18"
                  height="18"
                  rx="2"
                />

                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>

            <p>
              {search.trim()
                ? "No bookings match your search."
                : `No ${
                    activeTab === "all"
                      ? ""
                      : activeTab
                  } bookings found.`}
            </p>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              {/* Header */}
              <thead>
                <tr
                  className="border-b border-slate-100"
                  style={{
                    backgroundColor:
                      `${PRIMARY_COLOR}06`,
                  }}
                >

                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Guest
                  </th>

                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                    Listing
                  </th>

                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                    Phone
                  </th>

                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                    Dates
                  </th>

                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                    Total
                  </th>

                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>

                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>

                </tr>
              </thead>

              {/* Body */}
              <tbody className="divide-y divide-slate-50">

                {paginated.map(
                  (booking) => {

                    const isPending =
                      booking.status ===
                      "pending";

                    const isUpdating =
                      updatingId ===
                      booking._id;

                    return (
                      <Fragment
                        key={booking._id}
                      >

                        {/* Main row */}
                        <tr
                          className="
                            hover:bg-slate-50
                            transition-colors
                            cursor-pointer
                          "
                          onClick={() =>
                            setExpanded(
                              expanded ===
                                booking._id
                                ? null
                                : booking._id
                            )
                          }
                        >

                          {/* Guest */}
                          <td className="px-5 py-4">

                            <div className="flex items-center gap-3">

                              <div
                                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                style={{
                                  backgroundColor:
                                    PRIMARY_COLOR,
                                }}
                              >
                                {booking.tenant?.name
                                  ?.charAt(0)
                                  .toUpperCase() ??
                                  "?"}
                              </div>

                              <div className="min-w-0">

                                <p className="font-medium text-slate-800 truncate">
                                  {booking.tenant
                                    ?.name ||
                                    "—"}
                                </p>

                                <p className="text-xs text-slate-400 truncate">
                                  {booking.tenant
                                    ?.email ||
                                    "—"}
                                </p>

                              </div>

                            </div>

                          </td>

                          {/* Listing */}
                          <td className="px-5 py-4 hidden sm:table-cell">

                            <p className="text-slate-700 font-medium">
                              {listingName(
                                booking
                              )}
                            </p>

                            <p className="text-xs text-slate-400">
                              {
                                RENTAL_TYPE_LABEL[
                                  booking.rentalType
                                ]
                              }
                            </p>

                          </td>

                          {/* Phone */}
                          <td className="px-5 py-4 text-slate-500 hidden md:table-cell">
                            {booking.tenant
                              ?.phone ||
                              "—"}
                          </td>

                          {/* Dates */}
                          <td className="px-5 py-4 hidden lg:table-cell">

                            <p className="text-slate-700">
                              {formatDate(
                                booking.moveInDate
                              )}
                            </p>

                            <p className="text-xs text-slate-400">
                              to{" "}
                              {formatDate(
                                booking.moveOutDate
                              )}
                            </p>

                          </td>

                          {/* Total */}
                          <td className="px-5 py-4 font-medium text-slate-800 hidden lg:table-cell">

                            {formatPrice(
                              booking.price
                            )}

                            <span className="text-xs text-slate-400 font-normal">
                              /
                              {
                                booking.priceUnit
                              }
                            </span>

                          </td>

                          {/* Status */}
                          <td className="px-5 py-4">

                            <span
                              className={`
                                inline-flex
                                items-center
                                px-2.5
                                py-1
                                rounded-lg
                                text-xs
                                font-semibold
                                capitalize
                                border
                                ${STATUS_STYLES[booking.status]}
                              `}
                            >
                              <span
                                className={`
                                  w-1.5
                                  h-1.5
                                  rounded-full
                                  mr-1.5

                                  ${
                                    booking.status ===
                                    "pending"
                                      ? "bg-amber-500"
                                      : booking.status ===
                                        "confirmed"
                                      ? "bg-emerald-500"
                                      : "bg-red-500"
                                  }
                                `}
                              />

                              {booking.status}
                            </span>

                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4">

                            <div
                              className="
                                flex
                                items-center
                                justify-end
                                gap-2
                              "
                              onClick={(event) =>
                                event.stopPropagation()
                              }
                            >

                              {/* Confirm */}
                              <button
                                onClick={() =>
                                  isPending &&
                                  updateStatus(
                                    booking._id,
                                    "confirmed"
                                  )
                                }
                                disabled={
                                  !isPending ||
                                  isUpdating
                                }
                                className={`
                                  px-3
                                  py-1.5
                                  text-xs
                                  font-semibold
                                  rounded-lg
                                  border
                                  transition

                                  ${
                                    booking.status ===
                                    "confirmed"
                                      ? "bg-emerald-50 border-emerald-200 text-emerald-400 cursor-not-allowed"
                                      : isPending
                                      ? "bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white"
                                      : "bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed"
                                  }
                                `}
                              >
                                {isUpdating
                                  ? "…"
                                  : "Confirm"}
                              </button>

                              {/* Cancel */}
                              <button
                                onClick={() =>
                                  booking.status !==
                                    "cancelled" &&
                                  updateStatus(
                                    booking._id,
                                    "cancelled"
                                  )
                                }
                                disabled={
                                  booking.status ===
                                    "cancelled" ||
                                  isUpdating
                                }
                                className={`
                                  px-3
                                  py-1.5
                                  text-xs
                                  font-semibold
                                  rounded-lg
                                  border
                                  transition

                                  ${
                                    booking.status ===
                                    "cancelled"
                                      ? "bg-red-50 border-red-200 text-red-300 cursor-not-allowed"
                                      : "bg-red-50 hover:bg-red-100 border-red-200 text-red-600"
                                  }
                                `}
                              >
                                Cancel
                              </button>

                              {/* WhatsApp */}
                              <a
                                href={
                                  booking.tenant
                                    ?.phone
                                    ? `https://wa.me/${booking.tenant.phone.replace(
                                        /\D/g,
                                        ""
                                      )}`
                                    : "#"
                                }
                                target="_blank"
                                rel="noreferrer"
                                title="WhatsApp guest"
                                onClick={(event) =>
                                  event.stopPropagation()
                                }
                                className={`
                                  w-7
                                  h-7
                                  flex
                                  items-center
                                  justify-center
                                  rounded-lg
                                  transition

                                  ${
                                    booking.tenant
                                      ?.phone
                                      ? "bg-green-50 hover:bg-green-100 text-green-600"
                                      : "bg-slate-50 text-slate-300 pointer-events-none"
                                  }
                                `}
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  fill="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                              </a>

                            </div>

                          </td>

                        </tr>

                        {/* Expanded row */}
                        {expanded ===
                          booking._id && (
                          <tr
                            style={{
                              backgroundColor:
                                `${PRIMARY_COLOR}05`,
                            }}
                          >

                            <td
                              colSpan={7}
                              className="px-5 py-5 text-sm text-slate-600"
                            >

                              <div className="flex flex-wrap gap-6">

                                {/* Rental type */}
                                <div>
                                  <span className="text-xs text-slate-400 uppercase tracking-wide font-medium block mb-0.5">
                                    Rental Type
                                  </span>

                                  <span
                                    className="font-medium"
                                    style={{
                                      color:
                                        PRIMARY_COLOR,
                                    }}
                                  >
                                    {
                                      RENTAL_TYPE_LABEL[
                                        booking
                                          .rentalType
                                      ]
                                    }
                                  </span>
                                </div>

                                {/* Move in */}
                                <div>
                                  <span className="text-xs text-slate-400 uppercase tracking-wide font-medium block mb-0.5">
                                    Move-in
                                  </span>

                                  {formatDate(
                                    booking.moveInDate
                                  )}
                                </div>

                                {/* Move out */}
                                <div>
                                  <span className="text-xs text-slate-400 uppercase tracking-wide font-medium block mb-0.5">
                                    Move-out
                                  </span>

                                  {formatDate(
                                    booking.moveOutDate
                                  )}
                                </div>

                                {/* Total */}
                                <div>
                                  <span className="text-xs text-slate-400 uppercase tracking-wide font-medium block mb-0.5">
                                    Total
                                  </span>

                                  <span className="font-semibold text-slate-800">
                                    {formatPrice(
                                      booking.price
                                    )}
                                  </span>

                                  <span className="text-slate-400">
                                    /
                                    {
                                      booking.priceUnit
                                    }
                                  </span>
                                </div>

                                {/* Booking ID */}
                                <div>
                                  <span className="text-xs text-slate-400 uppercase tracking-wide font-medium block mb-0.5">
                                    Booking ID
                                  </span>

                                  <span className="font-mono text-xs text-slate-500">
                                    {booking._id}
                                  </span>
                                </div>

                                {/* Booked On */}
                                <div>
                                  <span className="text-xs text-slate-400 uppercase tracking-wide font-medium block mb-0.5">
                                    Booked On
                                  </span>

                                  {formatDate(
                                    booking.createdAt
                                  )}
                                </div>

                              </div>

                            </td>

                          </tr>
                        )}

                      </Fragment>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* ─────────────────────────────────────
          Pagination
      ───────────────────────────────────── */}

      {totalPages > 1 && (
        <div
          className="
            flex
            flex-col
            sm:flex-row
            sm:items-center
            sm:justify-between
            gap-3
            text-sm
            text-slate-500
          "
        >

          <span>
            Page {page} of {totalPages}
            {" "}— showing{" "}
            {paginated.length} of{" "}
            {filtered.length} bookings
          </span>

          <div className="flex gap-2">

            <button
              onClick={() =>
                setPage((currentPage) =>
                  Math.max(
                    1,
                    currentPage - 1
                  )
                )
              }
              disabled={page === 1}
              className="
                px-4
                py-2
                rounded-xl
                border
                border-slate-200
                bg-white
                text-slate-700
                hover:bg-slate-50
                disabled:opacity-40
                disabled:cursor-not-allowed
                transition
              "
            >
              Previous
            </button>

            <button
              onClick={() =>
                setPage((currentPage) =>
                  Math.min(
                    totalPages,
                    currentPage + 1
                  )
                )
              }
              disabled={
                page === totalPages
              }
              className="
                px-4
                py-2
                rounded-xl
                border
                border-slate-200
                bg-white
                text-slate-700
                hover:bg-slate-50
                disabled:opacity-40
                disabled:cursor-not-allowed
                transition
              "
            >
              Next
            </button>

          </div>

        </div>
      )}

    </div>
  );
}