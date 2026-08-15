// room-booking/app/(pages)/rooms/[id]/page.tsx

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

interface RoomImage {
  url: string;
  label: string;
}

interface Room {
  _id: string;
  name: string;
  description: string;
  pricePerNight: number;
  capacity: number;
  type: string;
  amenities: string[];
  images: RoomImage[];
  isAvailable: boolean;
}

const PLACEHOLDER_IMAGES: Record<string, string> = {
  single:
    "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800",
  double:
    "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800",
  suite:
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800",
  family:
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
  default:
    "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800",
};

export default function RoomDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Booking state
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState("");
  const [bookingError, setBookingError] = useState("");

  // Viewing request state
  const [preferredDate, setPreferredDate] = useState("");
  const [message, setMessage] = useState("");
  const [viewingLoading, setViewingLoading] = useState(false);
  const [viewingSuccess, setViewingSuccess] = useState("");
  const [viewingError, setViewingError] = useState("");

  useEffect(() => {
    const loadRoom = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`/api/rooms/${id}`);
        const data = await res.json();

        if (data.success) {
          setRoom(data.data);
        } else {
          setError("Room not found.");
        }
      } catch {
        setError("Failed to load room details.");
      } finally {
        setLoading(false);
      }
    };

    if (id) loadRoom();
  }, [id]);

  const getRoomImages = (room: Room): RoomImage[] => {
    if (room.images && room.images.length > 0) {
      return room.images.filter((img) => img.url !== "");
    }

    return [
      {
        url: PLACEHOLDER_IMAGES[room.type] ?? PLACEHOLDER_IMAGES["default"],
        label: "Bedroom",
      },
    ];
  };

  /*
   * Keyboard navigation for the lightbox.
   *
   * Right Arrow  → Next photo
   * Left Arrow   → Previous photo
   * Escape       → Close lightbox
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only respond when the lightbox is open
      if (!lightboxOpen || !room) return;

      const images = getRoomImages(room);

      // No need for keyboard navigation if there is only one image
      if (images.length <= 1) {
        if (event.key === "Escape") {
          event.preventDefault();
          setLightboxOpen(false);
        }

        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();

        setActiveImage((prev) =>
          prev === images.length - 1 ? 0 : prev + 1
        );
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();

        setActiveImage((prev) =>
          prev === 0 ? images.length - 1 : prev - 1
        );
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setLightboxOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [lightboxOpen, room]);

  const calculateNights = (): number => {
    if (!checkIn || !checkOut) return 0;

    const diff =
      new Date(checkOut).getTime() - new Date(checkIn).getTime();

    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const handleBooking = async () => {
    if (!session) {
      router.push("/login");
      return;
    }

    if (!checkIn || !checkOut) {
      setBookingError("Please select check-in and check-out dates.");
      return;
    }

    if (calculateNights() <= 0) {
      setBookingError("Check-out must be after check-in.");
      return;
    }

    setBookingLoading(true);
    setBookingError("");
    setBookingSuccess("");

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: (session.user as { id?: string }).id,
          roomId: id,
          checkIn,
          checkOut,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setBookingSuccess(data.message);
        setCheckIn("");
        setCheckOut("");
      } else {
        setBookingError(data.message || "Failed to create booking.");
      }
    } catch {
      setBookingError("Something went wrong. Please try again.");
    } finally {
      setBookingLoading(false);
    }
  };

  const handleViewingRequest = async () => {
    if (!session) {
      router.push("/login");
      return;
    }

    if (!preferredDate) {
      setViewingError("Please select a preferred viewing date.");
      return;
    }

    setViewingLoading(true);
    setViewingError("");
    setViewingSuccess("");

    try {
      const res = await fetch("/api/viewing-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: (session.user as { id?: string }).id,
          roomId: id,
          preferredDate,
          message,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setViewingSuccess(
          "Viewing request submitted! We will contact you soon."
        );
        setPreferredDate("");
        setMessage("");
      } else {
        setViewingError(
          data.message || "Failed to submit viewing request."
        );
      }
    } catch {
      setViewingError("Something went wrong. Please try again.");
    } finally {
      setViewingLoading(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  // ── Loading State ──
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <div className="max-w-7xl mx-auto px-4 py-10 animate-pulse">
          <div className="h-96 bg-gray-200 rounded-2xl mb-4" />

          <div className="flex gap-3 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-20 h-20 bg-gray-200 rounded-xl"
              />
            ))}
          </div>

          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>

        <Footer />
      </div>
    );
  }

  // ── Error State ──
  if (error || !room) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <p className="text-5xl mb-4">🏠</p>

          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Room Not Found
          </h2>

          <p className="text-gray-500 mb-6">{error}</p>

          <Link
            href="/rooms"
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
          >
            Back to Rooms
          </Link>
        </div>

        <Footer />
      </div>
    );
  }

  const nights = calculateNights();
  const totalPrice = nights * room.pricePerNight;
  const roomImages = getRoomImages(room);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* ── Lightbox ── */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Room photo gallery"
        >
          {/* Close button */}
          <button
            type="button"
            className="absolute top-4 right-4 text-white text-4xl font-light hover:text-gray-300 z-10"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close gallery"
          >
            ×
          </button>

          {/* Prev button */}
          {roomImages.length > 1 && (
            <button
              type="button"
              className="absolute left-4 text-white text-5xl font-light hover:text-gray-300 px-4 z-10"
              onClick={(e) => {
                e.stopPropagation();

                setActiveImage((prev) =>
                  prev === 0 ? roomImages.length - 1 : prev - 1
                );
              }}
              aria-label="Previous photo"
            >
              ‹
            </button>
          )}

          {/* Main lightbox image */}
          <div
            className="relative w-full max-w-4xl h-[70vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={roomImages[activeImage].url}
              alt={roomImages[activeImage].label}
              fill
              sizes="100vw"
              className="object-contain"
            />

            {/* Label + counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
              <span className="text-white text-sm bg-black/60 px-4 py-1.5 rounded-full backdrop-blur-sm">
                📷 {roomImages[activeImage].label}
              </span>

              <span className="text-white text-sm bg-black/60 px-4 py-1.5 rounded-full backdrop-blur-sm">
                {activeImage + 1} / {roomImages.length}
              </span>
            </div>
          </div>

          {/* Next button */}
          {roomImages.length > 1 && (
            <button
              type="button"
              className="absolute right-4 text-white text-5xl font-light hover:text-gray-300 px-4 z-10"
              onClick={(e) => {
                e.stopPropagation();

                setActiveImage((prev) =>
                  prev === roomImages.length - 1 ? 0 : prev + 1
                );
              }}
              aria-label="Next photo"
            >
              ›
            </button>
          )}

          {/* Thumbnail strip in lightbox */}
          {roomImages.length > 1 && (
            <div
              className="absolute bottom-4 left-1/2 -translate-x-1/2 mt-16 flex gap-2 overflow-x-auto max-w-lg px-4 pb-2"
              style={{ top: "auto", bottom: "80px" }}
              onClick={(e) => e.stopPropagation()}
            >
              {roomImages.map((img, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImage(index);
                  }}
                  className={`relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition ${
                    activeImage === index
                      ? "border-white"
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                  aria-label={`View ${img.label}`}
                >
                  <Image
                    src={img.url}
                    alt={img.label}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* ── Breadcrumb ── */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-blue-600">
            Home
          </Link>

          <span>›</span>

          <Link href="/rooms" className="hover:text-blue-600">
            Rooms
          </Link>

          <span>›</span>

          <span className="text-gray-900 font-medium">{room.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Left Column ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main Image */}
            <div
              className="relative h-80 md:h-[450px] rounded-2xl overflow-hidden cursor-zoom-in group"
              onClick={() => setLightboxOpen(true)}
            >
              <Image
                src={roomImages[activeImage].url}
                alt={roomImages[activeImage].label}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 66vw"
                className="object-cover transition duration-500 group-hover:scale-105"
              />

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

              {/* Badges */}
              <span
                className={`absolute top-4 right-4 px-4 py-1.5 text-sm font-semibold rounded-full ${
                  room.isAvailable
                    ? "bg-green-500 text-white"
                    : "bg-red-500 text-white"
                }`}
              >
                {room.isAvailable ? "✓ Available" : "✗ Occupied"}
              </span>

              <span className="absolute top-4 left-4 px-4 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-full capitalize">
                {room.type}
              </span>

              {/* Image label from DB */}
              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                <span className="px-3 py-1.5 bg-black/50 text-white text-sm rounded-full backdrop-blur-sm">
                  📷 {roomImages[activeImage].label}
                </span>
              </div>

              {/* Counter */}
              <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-black/50 text-white text-sm rounded-full backdrop-blur-sm">
                {activeImage + 1} / {roomImages.length}
              </div>

              {/* Click to expand hint */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300">
                <span className="text-white text-sm bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">
                  🔍 Click to expand
                </span>
              </div>
            </div>

            {/* ── Thumbnail Gallery ── */}
            {roomImages.length > 1 && (
              <div>
                <p className="text-sm font-medium text-gray-500 mb-3">
                  📷 {roomImages.length} photos — click to switch view
                </p>

                <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                  {roomImages.map((img, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setActiveImage(index)}
                      className={`relative h-20 rounded-xl overflow-hidden border-2 transition group ${
                        activeImage === index
                          ? "border-blue-600 shadow-md"
                          : "border-transparent hover:border-gray-300"
                      }`}
                    >
                      <Image
                        src={img.url}
                        alt={img.label}
                        fill
                        sizes="80px"
                        className="object-cover group-hover:scale-105 transition duration-300"
                      />

                      {/* Label overlay on thumbnail */}
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] text-center py-1 truncate px-1">
                        {img.label}
                      </div>

                      {/* Active indicator */}
                      {activeImage === index && (
                        <div className="absolute inset-0 bg-blue-600/20" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Room Details Card ── */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {room.name}
                  </h1>

                  <div className="flex items-center gap-4 text-gray-500">
                    <span>
                      👤 {room.capacity}{" "}
                      {room.capacity === 1 ? "person" : "people"}
                    </span>

                    <span>
                      🏠 <span className="capitalize">{room.type}</span>
                    </span>

                    <span
                      className={`text-sm font-medium ${
                        room.isAvailable
                          ? "text-green-600"
                          : "text-red-500"
                      }`}
                    >
                      {room.isAvailable ? "✓ Available" : "✗ Occupied"}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-3xl font-bold text-blue-600">
                    Ksh {room.pricePerNight.toLocaleString()}
                  </p>

                  <p className="text-gray-400 text-sm">/month</p>
                </div>
              </div>

              <hr className="my-5 border-gray-100" />

              {/* Description */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  About this room
                </h2>

                <p className="text-gray-600 leading-relaxed">
                  {room.description || "No description available."}
                </p>
              </div>

              {/* Amenities */}
              {room.amenities && room.amenities.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">
                    Amenities
                  </h2>

                  <div className="grid grid-cols-2 gap-3">
                    {room.amenities.map((amenity) => (
                      <div
                        key={amenity}
                        className="flex items-center gap-2 text-gray-600 text-sm bg-gray-50 rounded-lg px-3 py-2"
                      >
                        <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                          ✓
                        </span>

                        {amenity}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* What you'll see — image labels */}
              {roomImages.length > 1 && (
                <div className="mt-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">
                    What you&apos;ll see
                  </h2>

                  <div className="flex flex-wrap gap-2">
                    {roomImages.map((img, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          setActiveImage(index);
                          window.scrollTo({
                            top: 0,
                            behavior: "smooth",
                          });
                        }}
                        className={`px-3 py-1.5 text-sm rounded-full border transition ${
                          activeImage === index
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600"
                        }`}
                      >
                        📷 {img.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Right Column ── */}
          <div className="space-y-6">
            {/* ── Booking Card ── */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-20">
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Book this Room
              </h2>

              <p className="text-gray-500 text-sm mb-5">
                Select your dates to confirm availability
              </p>

              {bookingSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  ✅ {bookingSuccess}
                </div>
              )}

              {bookingError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  ⚠️ {bookingError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Check-in Date
                  </label>

                  <input
                    type="date"
                    value={checkIn}
                    min={today}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Check-out Date
                  </label>

                  <input
                    type="date"
                    value={checkOut}
                    min={checkIn || today}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Price Summary */}
                {nights > 0 && (
                  <div className="bg-blue-50 rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>
                        Ksh {room.pricePerNight.toLocaleString()} × {nights}{" "}
                        night{nights !== 1 ? "s" : ""}
                      </span>

                      <span>Ksh {totalPrice.toLocaleString()}</span>
                    </div>

                    <hr className="border-blue-100" />

                    <div className="flex justify-between font-bold text-gray-900">
                      <span>Total</span>

                      <span className="text-blue-600">
                        Ksh {totalPrice.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {room.isAvailable ? (
                  <button
                    onClick={handleBooking}
                    disabled={bookingLoading}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition"
                  >
                    {bookingLoading
                      ? "Processing..."
                      : session
                        ? "Confirm Booking"
                        : "Sign in to Book"}
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full py-3 bg-gray-200 text-gray-500 font-semibold rounded-xl cursor-not-allowed"
                  >
                    Room Not Available
                  </button>
                )}
              </div>
            </div>

            {/* ── Viewing Request Card ── */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Request a Viewing
              </h2>

              <p className="text-gray-500 text-sm mb-5">
                Want to see the room first? Schedule a visit.
              </p>

              {viewingSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  ✅ {viewingSuccess}
                </div>
              )}

              {viewingError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  ⚠️ {viewingError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred Date
                  </label>

                  <input
                    type="date"
                    value={preferredDate}
                    min={today}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message (optional)
                  </label>

                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Any specific questions or requests..."
                    rows={3}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <button
                  onClick={handleViewingRequest}
                  disabled={viewingLoading}
                  className="w-full py-3 border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white disabled:opacity-50 font-semibold rounded-xl transition"
                >
                  {viewingLoading
                    ? "Submitting..."
                    : session
                      ? "Request Viewing"
                      : "Sign in to Request"}
                </button>
              </div>
            </div>

            <Link
              href="/rooms"
              className="block text-center text-sm text-gray-500 hover:text-blue-600 transition"
            >
              ← Back to all rooms
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}