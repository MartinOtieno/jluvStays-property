// room-booking/app/(pages)/rooms/[id]/page.tsx

"use client";

import { useEffect, useState, Suspense } from "react";
import Image from "next/image";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import GalleryLightbox from "@/app/components/GalleryLightbox";

interface Room {
  _id: string;
  unit: { _id: string; title: string; description?: string; bedrooms?: number; amenities?: string[] } | string;
  label: string;
  description: string;
  pricePerNight: number;
  furnished: boolean;
  images: string[];
  status: "active" | "inactive";
}

function nightsBetween(start: Date, end: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / msPerDay));
}

function RoomDetailContent() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const [moveIn, setMoveIn] = useState(searchParams.get("moveIn") ?? "");
  const [moveOut, setMoveOut] = useState(searchParams.get("moveOut") ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState("");
  const [buildingAddress, setBuildingAddress] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/rooms/${id}`);
        const data = await res.json();
        if (data.success) {
          setRoom(data.data);
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  useEffect(() => {
    const loadBuildingAddress = async () => {
      try {
        const res = await fetch("/api/property-settings");
        const data = await res.json();
        // Same assumption/caveat as units/[id]/page.tsx — verify this
        // matches your actual /api/property-settings response shape.
        const address = data?.data?.address ?? data?.address;
        if (address) {
          setBuildingAddress(
            [address.street, address.estate, address.city].filter(Boolean).join(", ")
          );
        }
      } catch {
        // non-fatal
      }
    };
    loadBuildingAddress();
  }, []);

  const nights = moveIn && moveOut ? nightsBetween(new Date(moveIn), new Date(moveOut)) : 0;
  const estimatedTotal = room ? nights * room.pricePerNight : 0;

  const handleBook = async () => {
    setBookingError("");
    setBookingSuccess("");

    if (!session?.user) {
      router.push(`/login?callbackUrl=/rooms/${id}`);
      return;
    }
    if (!moveIn || !moveOut) {
      setBookingError("Please choose both a move-in and move-out date.");
      return;
    }
    if (new Date(moveOut) <= new Date(moveIn)) {
      setBookingError("Move-out date must be after move-in date.");
      return;
    }

    setSubmitting(true);
    try {
      const userId = (session.user as { id?: string }).id;
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          rentalType: "short_term",
          roomId: id,
          moveInDate: moveIn,
          moveOutDate: moveOut,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBookingSuccess(data.message || "Booking request sent!");
      } else {
        setBookingError(data.message || "Failed to create booking");
      }
    } catch {
      setBookingError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 py-16 animate-pulse space-y-4">
          <div className="h-80 bg-gray-200 rounded-2xl" />
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
        <Footer />
      </div>
    );
  }

  if (notFound || !room) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-24 text-center">
          <p className="text-5xl mb-4">🏠</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Room not found</h1>
          <p className="text-gray-500">This listing may have been removed or deactivated.</p>
        </div>
        <Footer />
      </div>
    );
  }

  const images = room.images.length > 0 ? room.images : [];
  const galleryPhotos = images.map((url) => ({ url, caption: room.label || "Room photo" }));
  const unitInfo = typeof room.unit === "string" ? null : room.unit;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* ── Gallery ── */}
        {images.length > 0 ? (
          <div className="mb-8">
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="relative w-full h-96 rounded-3xl overflow-hidden bg-gray-100 shadow-sm group block cursor-zoom-in"
            >
              <Image
                src={images[activeImage]}
                alt={room.label || "Room photo"}
                fill
                sizes="100vw"
                className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-300 flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white font-semibold text-sm flex items-center gap-2 bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full">
                  🔍 View gallery
                </span>
              </div>
              {images.length > 1 && (
                <span className="absolute bottom-3 right-3 px-3 py-1 bg-black/50 backdrop-blur-sm text-white text-xs font-medium rounded-full">
                  📷 {images.length} photo{images.length !== 1 ? "s" : ""}
                </span>
              )}
            </button>

            {images.length > 1 && (
              <div className="flex gap-2.5 mt-3 overflow-x-auto pb-1">
                {images.map((url, i) => (
                  <button
                    key={url + i}
                    onClick={() => setActiveImage(i)}
                    className={`relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                      i === activeImage
                        ? "border-[#7A1B0F] scale-105 shadow-md"
                        : "border-transparent opacity-70 hover:opacity-100 hover:scale-105"
                    }`}
                  >
                    <Image src={url} alt="" fill sizes="80px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}

            <GalleryLightbox
              photos={galleryPhotos}
              showGrid={false}
              open={lightboxOpen}
              startIndex={activeImage}
              onClose={() => setLightboxOpen(false)}
            />
          </div>
        ) : (
          <div className="mb-8 h-64 rounded-3xl bg-gray-100 flex items-center justify-center text-5xl">🏠</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* ── Info ── */}
          <div className="md:col-span-2">
            <span className="inline-block px-3 py-1 bg-[#7A1B0F]/10 text-[#7A1B0F] text-xs font-semibold rounded-full mb-3">
              Short Term
            </span>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{room.label || "Untitled room"}</h1>
            {unitInfo && (
              <p className="text-gray-500 mb-1">
                In {unitInfo.title}
                {unitInfo.bedrooms ? ` · ${unitInfo.bedrooms}-bedroom unit` : ""}
              </p>
            )}
            {buildingAddress && <p className="text-gray-400 text-sm mb-6">{buildingAddress}</p>}

            <div className="flex gap-6 mb-6 text-sm text-gray-600">
              <span>{room.furnished ? "🛋️ Furnished" : "📦 Unfurnished"}</span>
            </div>

            <p className="text-gray-700 leading-relaxed mb-6 whitespace-pre-line">
              {room.description || "No description available."}
            </p>

            {unitInfo?.amenities && unitInfo.amenities.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                  Shared with the unit
                </h3>
                <div className="flex flex-wrap gap-2">
                  {unitInfo.amenities.map((a) => (
                    <span
                      key={a}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-[#7A1B0F]/10 hover:text-[#7A1B0F] text-gray-700 text-sm rounded-lg transition-colors duration-200"
                    >
                      ✓ {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-600">
              This is a private room within a shared unit — other bedrooms may be occupied by
              other tenants. You won&apos;t be shown who else is staying there, for their
              privacy.
            </div>
          </div>

          {/* ── Booking Widget ── */}
          <div>
            <div className="sticky top-24 border border-gray-200 rounded-2xl p-6 shadow-md">
              <p className="text-2xl font-bold text-[#7A1B0F] mb-1">
                ${room.pricePerNight.toLocaleString()}
                <span className="text-gray-400 text-base font-normal">/night</span>
              </p>

              <div className="space-y-3 mt-5">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Move-in</label>
                  <input
                    type="date"
                    value={moveIn}
                    onChange={(e) => setMoveIn(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7A1B0F] transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Move-out</label>
                  <input
                    type="date"
                    value={moveOut}
                    onChange={(e) => setMoveOut(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7A1B0F] transition"
                  />
                </div>
              </div>

              {nights > 0 && (
                <p className="text-sm text-gray-500 mt-3">
                  {nights} night{nights > 1 ? "s" : ""} · Est. ${estimatedTotal.toLocaleString()} total
                </p>
              )}

              {bookingError && <p className="text-sm text-red-600 mt-3">{bookingError}</p>}
              {bookingSuccess && <p className="text-sm text-green-600 mt-3">{bookingSuccess}</p>}

              <button
                onClick={handleBook}
                disabled={submitting || room.status !== "active"}
                className="w-full mt-4 py-3 bg-[#7A1B0F] hover:opacity-90 disabled:opacity-50 text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-[#7A1B0F]/20"
              >
                {submitting ? "Booking..." : "Book Now"}
              </button>

              {room.status !== "active" && (
                <p className="text-xs text-gray-400 mt-2 text-center">This room isn&apos;t currently listed.</p>
              )}

              <p className="text-xs text-gray-400 mt-3 text-center">
                Short Term bookings don&apos;t require a viewing request — you can book directly.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default function RoomDetailPage() {
  return (
    <Suspense fallback={null}>
      <RoomDetailContent />
    </Suspense>
  );
}