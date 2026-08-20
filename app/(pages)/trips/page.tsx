"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

interface ListingImage {
  url: string;
  label?: string;
  caption?: string;
}

interface Listing {
  _id: string;
  name?: string;
  title?: string;
  description?: string;
  rentalType?: "short_term" | "mid_term" | "long_term" | string;
  type?: string;
  pricePerNight?: number;
  pricePerMonth?: number;
  price?: number;
  images?: ListingImage[] | string[];
  bedrooms?: number | string;
}

interface Booking {
  _id: string;
  room?: Listing;
  unit?: Listing;
  property?: Listing;
  listing?: Listing;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  status: "pending" | "confirmed" | "cancelled";
  createdAt: string;
}

type BookingStatus = Booking["status"];
type Tab = "all" | BookingStatus;

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending:
    "bg-yellow-100 text-yellow-700 border border-yellow-200",
  confirmed:
    "bg-green-100 text-green-700 border border-green-200",
  cancelled:
    "bg-red-100 text-red-700 border border-red-200",
};

const STATUS_ICONS: Record<BookingStatus, string> = {
  pending: "⏳",
  confirmed: "✓",
  cancelled: "✕",
};

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200";

export default function TripsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Redirect unauthenticated users
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  // Load bookings
  const loadBookings = async () => {
    if (!session?.user) return;

    setLoading(true);
    setError("");

    try {
      const userId = (session.user as { id?: string }).id;

      if (!userId) {
        setError("Unable to identify your account.");
        return;
      }

      const response = await fetch(
        `/api/bookings?userId=${encodeURIComponent(userId)}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch bookings.");
      }

      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setBookings(data.data);
      } else {
        setBookings([]);
        setError(data.message || "Failed to load your bookings.");
      }
    } catch (err) {
      console.error("Error loading bookings:", err);
      setError("Something went wrong while loading your bookings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated" && session) {
      loadBookings();
    }
  }, [status, session]);

  // Get the listing associated with a booking.
  // Supports both the newer property/unit structure
  // and the older room-based booking structure.
  const getListing = (booking: Booking): Listing | null => {
    return (
      booking.listing ||
      booking.property ||
      booking.unit ||
      booking.room ||
      null
    );
  };

  const getListingName = (listing: Listing | null) => {
    if (!listing) return "JluvStays Property";

    return listing.name || listing.title || "JluvStays Property";
  };

  const getListingImage = (listing: Listing | null): string => {
    if (!listing?.images || listing.images.length === 0) {
      return PLACEHOLDER_IMAGE;
    }

    const firstImage = listing.images[0];

    if (typeof firstImage === "string") {
      return firstImage;
    }

    if (firstImage?.url) {
      return firstImage.url;
    }

    return PLACEHOLDER_IMAGE;
  };

  const getListingType = (listing: Listing | null) => {
    if (!listing) return "Accommodation";

    if (listing.rentalType) {
      switch (listing.rentalType) {
        case "short_term":
          return "Short-term stay";

        case "mid_term":
          return "Mid-term rental";

        case "long_term":
          return "Long-term rental";

        default:
          return listing.rentalType.replace(/_/g, " ");
      }
    }

    if (listing.type) {
      return listing.type.replace(/_/g, " ");
    }

    return "Accommodation";
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";

    const date = new Date(dateStr);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleDateString("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const calculateNights = (
    checkIn: string,
    checkOut: string
  ) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);

    const diff = end.getTime() - start.getTime();

    if (diff <= 0) return 0;

    return Math.ceil(
      diff / (1000 * 60 * 60 * 24)
    );
  };

  const isBookingPast = (checkOut: string) => {
    const checkout = new Date(checkOut);

    return (
      !Number.isNaN(checkout.getTime()) &&
      checkout < new Date()
    );
  };

  // Cancel booking
  const handleCancel = async (bookingId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this booking?"
    );

    if (!confirmed) return;

    setCancellingId(bookingId);

    try {
      const response = await fetch(
        `/api/bookings/${bookingId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "cancelled",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to cancel booking."
        );
      }

      setBookings((previous) =>
        previous.map((booking) =>
          booking._id === bookingId
            ? {
                ...booking,
                status: "cancelled",
              }
            : booking
        )
      );
    } catch (err) {
      console.error("Cancel booking error:", err);

      alert(
        err instanceof Error
          ? err.message
          : "Failed to cancel booking. Please try again."
      );
    } finally {
      setCancellingId(null);
    }
  };

  const counts = useMemo(
    () => ({
      all: bookings.length,

      pending: bookings.filter(
        (booking) => booking.status === "pending"
      ).length,

      confirmed: bookings.filter(
        (booking) => booking.status === "confirmed"
      ).length,

      cancelled: bookings.filter(
        (booking) => booking.status === "cancelled"
      ).length,
    }),
    [bookings]
  );

  const filteredBookings = useMemo(() => {
    if (activeTab === "all") {
      return bookings;
    }

    return bookings.filter(
      (booking) => booking.status === activeTab
    );
  }, [bookings, activeTab]);

  // Loading / authentication state
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <main className="max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="w-9 h-9 border-4 border-gray-300 border-t-[#7A1B0F] rounded-full animate-spin mx-auto" />

          <p className="mt-4 text-sm text-gray-500">
            Loading your bookings...
          </p>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Page Header */}
      <section className="bg-[#7A1B0F] py-14 px-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-sm font-semibold text-white/80 mb-2">
            JluvStays
          </p>

          <h1 className="text-4xl font-bold text-white mb-2">
            My Bookings
          </h1>

          <p className="text-white/90">
            Welcome back,{" "}
            {session?.user?.name?.split(" ")[0] || "Guest"} 👋
          </p>

          <p className="text-sm text-white/70 mt-1">
            View and manage your stays and rental bookings.
          </p>
        </div>
      </section>

      <main className="max-w-4xl mx-auto px-4 py-10">

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 bg-white rounded-xl p-1.5 shadow-sm border border-gray-100 w-fit">
          {(
            ["all", "pending", "confirmed", "cancelled"] as const
          ).map((tab) => {
            const active = activeTab === tab;

            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  active
                    ? "bg-[#7A1B0F] text-white shadow"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                {tab === "all"
                  ? "All"
                  : tab.charAt(0).toUpperCase() +
                    tab.slice(1)}

                <span
                  className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {counts[tab]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse flex gap-4"
              >
                <div className="w-32 h-28 bg-gray-200 rounded-xl shrink-0" />

                <div className="flex-1 space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-1/2" />
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-8 bg-gray-200 rounded w-24 mt-2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-white rounded-2xl border border-red-100 p-10 text-center">
            <div className="text-5xl mb-4">
              ⚠️
            </div>

            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Unable to load bookings
            </h2>

            <p className="text-red-500 mb-6">
              {error}
            </p>

            <button
              type="button"
              onClick={loadBookings}
              className="px-6 py-2.5 bg-[#7A1B0F] text-white rounded-lg hover:bg-[#64160C] transition"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading &&
          !error &&
          filteredBookings.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <div className="text-6xl mb-5">
                🏠
              </div>

              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {activeTab === "all"
                  ? "No bookings yet"
                  : `No ${activeTab} bookings`}
              </h3>

              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                {activeTab === "all"
                  ? "You haven't made any bookings yet. Explore JluvStays to find your next stay."
                  : `You don't have any ${activeTab} bookings.`}
              </p>

              {activeTab === "all" && (
                <Link
                  href="/rooms"
                  className="inline-flex items-center px-6 py-3 bg-[#7A1B0F] text-white rounded-xl hover:bg-[#64160C] transition font-medium"
                >
                  Explore Available Stays
                </Link>
              )}
            </div>
          )}

        {/* Bookings List */}
        {!loading &&
          !error &&
          filteredBookings.length > 0 && (
            <div className="space-y-4">
              {filteredBookings.map((booking) => {
                const listing = getListing(booking);

                const listingName =
                  getListingName(listing);

                const image =
                  getListingImage(listing);

                const listingType =
                  getListingType(listing);

                const nights = calculateNights(
                  booking.checkIn,
                  booking.checkOut
                );

                const isPast = isBookingPast(
                  booking.checkOut
                );

                const isCancellable =
                  booking.status === "pending" &&
                  new Date(booking.checkIn) >
                    new Date();

                return (
                  <article
                    key={booking._id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition duration-300"
                  >
                    <div className="flex flex-col sm:flex-row">

                      {/* Property Image */}
                      <div className="relative w-full sm:w-40 h-52 sm:h-auto shrink-0 bg-gray-100">
                        <Image
                          src={image}
                          alt={listingName}
                          fill
                          sizes="160px"
                          className="object-cover"
                        />

                        {isPast && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="text-white text-xs font-semibold bg-black/60 px-3 py-1.5 rounded-full">
                              Completed
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Booking Details */}
                      <div className="flex-1 p-5">

                        {/* Title / Status */}
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">
                              {listingName}
                            </h3>

                            <p className="text-sm text-gray-500 capitalize mt-1">
                              {listingType}
                            </p>
                          </div>

                          <span
                            className={`self-start px-3 py-1 text-xs font-semibold rounded-full ${STATUS_STYLES[booking.status]}`}
                          >
                            {STATUS_ICONS[booking.status]}{" "}
                            {booking.status
                              .charAt(0)
                              .toUpperCase() +
                              booking.status.slice(1)}
                          </span>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">

                          <div className="bg-gray-50 rounded-xl p-3 text-center">
                            <p className="text-xs text-gray-400 mb-1">
                              Check-in
                            </p>

                            <p className="text-sm font-semibold text-gray-800">
                              {formatDate(
                                booking.checkIn
                              )}
                            </p>
                          </div>

                          <div className="bg-[#D2CFCD]/30 rounded-xl p-3 text-center">
                            <p className="text-xs text-gray-500 mb-1">
                              Duration
                            </p>

                            <p className="text-sm font-semibold text-[#7A1B0F]">
                              {nights > 0
                                ? `${nights} night${
                                    nights !== 1
                                      ? "s"
                                      : ""
                                  }`
                                : "—"}
                            </p>
                          </div>

                          <div className="bg-gray-50 rounded-xl p-3 text-center">
                            <p className="text-xs text-gray-400 mb-1">
                              Check-out
                            </p>

                            <p className="text-sm font-semibold text-gray-800">
                              {formatDate(
                                booking.checkOut
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Price / Actions */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

                          <div>
                            <p className="text-xs text-gray-400">
                              Total Price
                            </p>

                            <p className="text-lg font-bold text-[#7A1B0F]">
                              Ksh{" "}
                              {Number(
                                booking.totalPrice || 0
                              ).toLocaleString(
                                "en-KE"
                              )}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">

                            {listing?._id && (
                              <Link
                                href={`/rooms/${listing._id}`}
                                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition font-medium"
                              >
                                View Property
                              </Link>
                            )}

                            {isCancellable && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleCancel(
                                    booking._id
                                  )
                                }
                                disabled={
                                  cancellingId ===
                                  booking._id
                                }
                                className="px-4 py-2 text-sm border border-red-300 text-red-500 hover:bg-red-50 rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {cancellingId ===
                                booking._id
                                  ? "Cancelling..."
                                  : "Cancel"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
      </main>

      <Footer />
    </div>
  );
}