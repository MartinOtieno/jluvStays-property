"use client";

import { useEffect, useState, Fragment } from "react";
import toast, { Toaster } from "react-hot-toast";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Booking {
  _id: string;

  rentalType: "long_term" | "mid_term" | "short_term";

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

  status: "pending" | "confirmed" | "cancelled";

  createdAt: string;
}

type FilterStatus =
  | "all"
  | "pending"
  | "confirmed"
  | "cancelled";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const LIMIT = 10;

const BRAND_COLOR = "#7A1B0F";

const RENTAL_TYPE_LABEL: Record<
  Booking["rentalType"],
  string
> = {
  long_term: "Long Term",
  mid_term: "Mid Term",
  short_term: "Short Term",
};

const STATUS_STYLES: Record<
  Booking["status"],
  string
> = {
  pending:
    "bg-yellow-100 text-yellow-700 border-yellow-200",

  confirmed:
    "bg-green-100 text-green-700 border-green-200",

  cancelled:
    "bg-red-100 text-red-700 border-red-200",
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(date: string) {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function listingName(booking: Booking) {
  return (
    booking.unit?.title ??
    booking.room?.label ??
    "Listing"
  );
}

function formatPrice(price: number) {
  return `KSh ${Number(price || 0).toLocaleString()}`;
}

function StatusBadge({
  status,
}: {
  status: Booking["status"];
}) {
  return (
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
        ${STATUS_STYLES[status]}
      `}
    >
      {status}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function StaffBookingsPage() {
  const [bookings, setBookings] =
    useState<Booking[]>([]);

  const [filter, setFilter] =
    useState<FilterStatus>("all");

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [updating, setUpdating] =
    useState<string | null>(null);

  const [expanded, setExpanded] =
    useState<string | null>(null);

  const [page, setPage] =
    useState(1);

  // ───────────────────────────────────────────────────────────────────────────
  // Load bookings
  // ───────────────────────────────────────────────────────────────────────────

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
      console.error(error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load bookings"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  // Reset pagination when filters/search change
  useEffect(() => {
    setPage(1);
  }, [filter, search]);

  // ───────────────────────────────────────────────────────────────────────────
  // Update booking status
  // ───────────────────────────────────────────────────────────────────────────

  const updateStatus = async (
    id: string,
    status: "confirmed" | "cancelled"
  ) => {
    setUpdating(id);

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

      if (!response.ok || !data.success) {
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

      toast.success(
        `Booking ${status} successfully.`
      );
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update booking"
      );
    } finally {
      setUpdating(null);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Counts
  // ───────────────────────────────────────────────────────────────────────────

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

  // ───────────────────────────────────────────────────────────────────────────
  // Filter + Search
  // ───────────────────────────────────────────────────────────────────────────

  const filtered = bookings.filter(
    (booking) => {
      if (
        filter !== "all" &&
        booking.status !== filter
      ) {
        return false;
      }

      if (search.trim()) {
        const query =
          search.toLowerCase().trim();

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

  // ───────────────────────────────────────────────────────────────────────────
  // Pagination
  // ───────────────────────────────────────────────────────────────────────────

  const totalPages = Math.ceil(
    filtered.length / LIMIT
  );

  const paginated = filtered.slice(
    (page - 1) * LIMIT,
    page * LIMIT
  );

  // ───────────────────────────────────────────────────────────────────────────
  // Tabs
  // ───────────────────────────────────────────────────────────────────────────

  const tabs: {
    key: FilterStatus;
    label: string;
  }[] = [
    {
      key: "all",
      label: "All",
    },
    {
      key: "pending",
      label: "Pending",
    },
    {
      key: "confirmed",
      label: "Confirmed",
    },
    {
      key: "cancelled",
      label: "Cancelled",
    },
  ];

  // ───────────────────────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────────────────────

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

        {/* Header */}

        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Bookings
          </h1>

          <p className="text-slate-500 text-sm mt-1">
            Review and manage all property bookings.
          </p>
        </div>

        {/* Filters */}

        <div className="flex flex-col xl:flex-row gap-3">

          {/* Status tabs */}

          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 flex-wrap">

            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() =>
                  setFilter(tab.key)
                }
                className={`
                  px-3
                  py-1.5
                  rounded-lg
                  text-xs
                  font-semibold
                  transition-all
                  flex
                  items-center
                  gap-1.5

                  ${
                    filter === tab.key
                      ? "text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }
                `}
                style={
                  filter === tab.key
                    ? {
                        backgroundColor:
                          BRAND_COLOR,
                      }
                    : undefined
                }
              >
                {tab.label}

                <span
                  className={`
                    px-1.5
                    py-0.5
                    rounded-full
                    text-[10px]

                    ${
                      filter === tab.key
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 text-slate-500"
                    }
                  `}
                >
                  {counts[tab.key]}
                </span>
              </button>
            ))}

          </div>

          {/* Search */}

          <div className="relative flex-1 xl:max-w-sm xl:ml-auto">

            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
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
              onChange={(e) =>
                setSearch(e.target.value)
              }
              className="
                w-full
                pl-9
                pr-4
                py-2
                text-sm
                border
                border-slate-200
                rounded-xl
                bg-white
                focus:outline-none
                focus:ring-2
                focus:ring-[#7A1B0F]/20
                focus:border-[#7A1B0F]
              "
            />

          </div>

        </div>

        {/* Table */}

        {loading ? (

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

            <div className="divide-y divide-slate-50">

              {[1, 2, 3, 4, 5].map(
                (item) => (
                  <div
                    key={item}
                    className="flex items-center gap-4 px-5 py-5 animate-pulse"
                  >
                    <div className="h-3 bg-slate-100 rounded w-1/5" />

                    <div className="h-3 bg-slate-100 rounded w-1/6" />

                    <div className="h-3 bg-slate-100 rounded w-1/6" />

                    <div className="h-3 bg-slate-100 rounded w-1/6" />

                    <div className="h-6 bg-slate-100 rounded-full w-20 ml-auto" />
                  </div>
                )
              )}

            </div>

          </div>

        ) : filtered.length === 0 ? (

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-20 text-center">

            <div
              className="w-12 h-12 mx-auto mb-3 rounded-2xl flex items-center justify-center"
              style={{
                backgroundColor: "#7A1B0F12",
                color: BRAND_COLOR,
              }}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <rect
                  x="3"
                  y="4"
                  width="18"
                  height="17"
                  rx="2"
                />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>

            <p className="text-slate-500 text-sm">
              No bookings match your filters.
            </p>

          </div>

        ) : (

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

            <div className="overflow-x-auto">

              <table className="w-full text-sm">

                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">

                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Tenant
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
                      Price
                    </th>

                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Status
                    </th>

                    <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>

                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-50">

                  {paginated.map(
                    (booking) => {

                      const isPending =
                        booking.status ===
                        "pending";

                      const isUpdating =
                        updating ===
                        booking._id;

                      return (
                        <Fragment
                          key={booking._id}
                        >

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

                            {/* Tenant */}

                            <td className="px-5 py-4">

                              <p className="font-medium text-slate-800">
                                {booking.tenant
                                  ?.name ??
                                  "—"}
                              </p>

                              <p className="text-xs text-slate-400">
                                {booking.tenant
                                  ?.email ??
                                  "—"}
                              </p>

                            </td>

                            {/* Listing */}

                            <td className="px-5 py-4 hidden sm:table-cell">

                              <p className="font-medium text-slate-800">
                                {listingName(
                                  booking
                                )}
                              </p>

                              <p className="text-xs text-slate-400">
                                {
                                  RENTAL_TYPE_LABEL[
                                    booking
                                      .rentalType
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

                            {/* Price */}

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
                              <StatusBadge
                                status={
                                  booking.status
                                }
                              />
                            </td>

                            {/* Actions */}

                            <td className="px-5 py-4">

                              <div
                                className="flex items-center justify-end gap-2"
                                onClick={(e) =>
                                  e.stopPropagation()
                                }
                              >

                                {/* Confirm */}

                                <button
                                  disabled={
                                    !isPending ||
                                    isUpdating
                                  }
                                  onClick={() =>
                                    isPending &&
                                    updateStatus(
                                      booking._id,
                                      "confirmed"
                                    )
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
                                        ? "bg-green-50 border-green-200 text-green-400 cursor-not-allowed"
                                        : isPending
                                        ? "bg-green-600 hover:bg-green-700 border-green-600 text-white"
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
                                  disabled={
                                    booking.status ===
                                      "cancelled" ||
                                    isUpdating
                                  }
                                  onClick={() =>
                                    booking.status !==
                                      "cancelled" &&
                                    updateStatus(
                                      booking._id,
                                      "cancelled"
                                    )
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
                                  title="WhatsApp tenant"
                                  onClick={(e) =>
                                    e.stopPropagation()
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
                                      booking
                                        .tenant
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
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.198-.008-.371-.01-.57.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                  </svg>
                                </a>

                              </div>

                            </td>

                          </tr>

                          {/* Expanded row */}

                          {expanded ===
                            booking._id && (
                            <tr className="bg-slate-50">

                              <td
                                colSpan={7}
                                className="px-5 py-4 text-sm text-slate-600"
                              >

                                <div className="flex flex-wrap gap-6">

                                  <div>
                                    <span className="text-xs text-slate-400 uppercase tracking-wide font-medium block mb-0.5">
                                      Rental Type
                                    </span>

                                    {
                                      RENTAL_TYPE_LABEL[
                                        booking
                                          .rentalType
                                      ]
                                    }
                                  </div>

                                  <div>
                                    <span className="text-xs text-slate-400 uppercase tracking-wide font-medium block mb-0.5">
                                      Move-in
                                    </span>

                                    {formatDate(
                                      booking.moveInDate
                                    )}
                                  </div>

                                  <div>
                                    <span className="text-xs text-slate-400 uppercase tracking-wide font-medium block mb-0.5">
                                      Move-out
                                    </span>

                                    {formatDate(
                                      booking.moveOutDate
                                    )}
                                  </div>

                                  <div>
                                    <span className="text-xs text-slate-400 uppercase tracking-wide font-medium block mb-0.5">
                                      Price
                                    </span>

                                    {formatPrice(
                                      booking.price
                                    )}
                                    /
                                    {
                                      booking.priceUnit
                                    }
                                  </div>

                                  <div>
                                    <span className="text-xs text-slate-400 uppercase tracking-wide font-medium block mb-0.5">
                                      Booking ID
                                    </span>

                                    <span className="font-mono text-xs">
                                      {booking._id}
                                    </span>
                                  </div>

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

          </div>
        )}

        {/* Pagination */}

        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-slate-500">

            <span>
              Page {page} of {totalPages}
              {" "}— showing{" "}
              {paginated.length} of{" "}
              {filtered.length} bookings
            </span>

            <div className="flex gap-2">

              <button
                onClick={() =>
                  setPage((p) =>
                    Math.max(1, p - 1)
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
                  setPage((p) =>
                    Math.min(
                      totalPages,
                      p + 1
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
    </>
  );
}