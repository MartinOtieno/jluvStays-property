// room-booking/app/(pages)/trips/page.tsx

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

interface RoomImage {
  url: string;
  label: string;
}

interface Room {
  _id: string;
  name: string;
  type: string;
  pricePerNight: number;
  images: RoomImage[];
}

interface Booking {
  _id: string;
  room: Room;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  status: "pending" | "confirmed" | "cancelled";
  createdAt: string;
}

const STATUS_STYLES = {
  pending: "bg-yellow-100 text-yellow-700 border border-yellow-200",
  confirmed: "bg-green-100 text-green-700 border border-green-200",
  cancelled: "bg-red-100 text-red-700 border border-red-200",
};

const STATUS_ICONS = {
  pending: "⏳",
  confirmed: "✅",
  cancelled: "❌",
};

const PLACEHOLDER_IMAGES: Record<string, string> = {
  single: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800",
  double: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800",
  suite: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800",
  family: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
  default: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800",
};

export default function TripsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "confirmed" | "cancelled">("all");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Fetch bookings
  useEffect(() => {
    const loadBookings = async () => {
      if (!session?.user) return;
      setLoading(true);
      setError("");
      try {
        const userId = (session.user as { id?: string }).id;
        const res = await fetch(`/api/bookings?userId=${userId}`);
        const data = await res.json();
        if (data.success) {
          setBookings(data.data);
        } else {
          setError("Failed to load bookings.");
        }
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (session) loadBookings();
  }, [session]);

  const handleCancel = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;

    setCancellingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      const data = await res.json();
      if (data.success) {
        setBookings((prev) =>
          prev.map((b) =>
            b._id === bookingId ? { ...b, status: "cancelled" } : b
          )
        );
      }
    } catch {
      alert("Failed to cancel booking. Please try again.");
    } finally {
      setCancellingId(null);
    }
  };

  const getRoomImage = (room: Room): string => {
    if (room.images && room.images.length > 0) {
      const first = room.images[0];
      if (typeof first === "object" && first.url) return first.url;
    }
    return PLACEHOLDER_IMAGES[room.type] ?? PLACEHOLDER_IMAGES["default"];
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const calculateNights = (checkIn: string, checkOut: string) => {
    const diff =
      new Date(checkOut).getTime() - new Date(checkIn).getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const filteredBookings =
    activeTab === "all"
      ? bookings
      : bookings.filter((b) => b.status === activeTab);

  const counts = {
    all: bookings.length,
    pending: bookings.filter((b) => b.status === "pending").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
  };

  // Show loading while checking auth
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* ── Page Header ── */}
      <section className="bg-blue-600 py-14 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-2">My Bookings</h1>
          <p className="text-blue-100">
            Welcome back, {session?.user?.name?.split(" ")[0]} 👋 — here are
            all your room bookings.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-10">

        {/* ── Tabs ── */}
        <div className="flex gap-2 mb-8 bg-white rounded-xl p-1.5 shadow-sm border border-gray-100 w-fit">
          {(["all", "pending", "confirmed", "cancelled"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${
                activeTab === tab
                  ? "bg-blue-600 text-white shadow"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "all" ? "All" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                activeTab === tab ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500"
              }`}>
                {counts[tab]}
              </span>
            </button>
          ))}
        </div>

        {/* ── Loading State ── */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse flex gap-4"
              >
                <div className="w-32 h-28 bg-gray-200 rounded-xl flex-shrink-0" />
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

        {/* ── Error State ── */}
        {!loading && error && (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">⚠️</p>
            <p className="text-red-500 text-lg mb-4">{error}</p>
            <button
              onClick={() => router.refresh()}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Try Again
            </button>
          </div>
        )}

        {/* ── Empty State ── */}
        {!loading && !error && filteredBookings.length === 0 && (
          <div className="text-center py-20">
            <p className="text-6xl mb-4">🏠</p>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {activeTab === "all"
                ? "No bookings yet"
                : `No ${activeTab} bookings`}
            </h3>
            <p className="text-gray-500 mb-6">
              {activeTab === "all"
                ? "You haven't made any bookings yet. Browse our rooms to get started."
                : `You don't have any ${activeTab} bookings.`}
            </p>
            {activeTab === "all" && (
              <Link
                href="/rooms"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium"
              >
                Browse Rooms
              </Link>
            )}
          </div>
        )}

        {/* ── Bookings List ── */}
        {!loading && !error && filteredBookings.length > 0 && (
          <div className="space-y-4">
            {filteredBookings.map((booking) => {
              const nights = calculateNights(booking.checkIn, booking.checkOut);
              const isPast = new Date(booking.checkOut) < new Date();
              const isCancellable =
                booking.status === "pending" &&
                new Date(booking.checkIn) > new Date();

              return (
                <div
                  key={booking._id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition duration-300"
                >
                  <div className="flex flex-col sm:flex-row">

                    {/* Room Image */}
                    <div className="relative w-full sm:w-36 h-48 sm:h-auto shrink-0">
                      <Image
                        src={getRoomImage(booking.room)}
                        alt={booking.room.name}
                        fill
                        sizes="144px"
                        className="object-cover"
                      />
                      {isPast && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="text-white text-xs font-semibold bg-black/50 px-2 py-1 rounded-full">
                            Completed
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Booking Info */}
                    <div className="flex-1 p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 mb-0.5">
                            {booking.room.name}
                          </h3>
                          <p className="text-sm text-gray-500 capitalize">
                            {booking.room.type} room
                          </p>
                        </div>
                        {/* Status badge */}
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${STATUS_STYLES[booking.status]}`}>
                          {STATUS_ICONS[booking.status]} {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                      </div>

                      {/* Dates */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-gray-50 rounded-xl p-3 text-center">
                          <p className="text-xs text-gray-400 mb-1">Check-in</p>
                          <p className="text-sm font-semibold text-gray-800">
                            {formatDate(booking.checkIn)}
                          </p>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-3 text-center">
                          <p className="text-xs text-gray-400 mb-1">Nights</p>
                          <p className="text-sm font-semibold text-blue-600">
                            {nights} night{nights !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3 text-center">
                          <p className="text-xs text-gray-400 mb-1">Check-out</p>
                          <p className="text-sm font-semibold text-gray-800">
                            {formatDate(booking.checkOut)}
                          </p>
                        </div>
                      </div>

                      {/* Price and Actions */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-400">Total Price</p>
                          <p className="text-lg font-bold text-blue-600">
                            Ksh {booking.totalPrice.toLocaleString()}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <Link
                            href={`/rooms/${booking.room._id}`}
                            className="px-4 py-2 text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg transition font-medium"
                          >
                            View Room
                          </Link>
                          {isCancellable && (
                            <button
                              onClick={() => handleCancel(booking._id)}
                              disabled={cancellingId === booking._id}
                              className="px-4 py-2 text-sm border border-red-300 text-red-500 hover:bg-red-50 rounded-lg transition font-medium disabled:opacity-50"
                            >
                              {cancellingId === booking._id
                                ? "Cancelling..."
                                : "Cancel"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}