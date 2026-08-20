// room-booking/app/(pages)/units/[id]/page.tsx

"use client";

import { useEffect, useState, Suspense } from "react";
import Image from "next/image";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import GalleryLightbox from "@/app/components/GalleryLightbox";

type RentalType = "long_term" | "mid_term";

interface Unit {
  _id: string;
  title: string;
  description: string;
  rentalType: RentalType;
  bedrooms: number;
  pricePerMonth: number;
  furnished: boolean;
  images: string[];
  amenities: string[];
  status: "active" | "inactive" | "archived";
}

const RENTAL_TYPE_LABEL: Record<RentalType, string> = {
  long_term: "Long Term",
  mid_term: "Mid Term",
};

function wholeMonthsUp(start: Date, end: Date): number {
  const msPerMonth = 1000 * 60 * 60 * 24 * 30;
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / msPerMonth));
}

function UnitDetailContent() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();

  const [unit, setUnit] = useState<Unit | null>(null);
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

  // Viewing request state
  const [showViewingForm, setShowViewingForm] = useState(false);
  const [viewingDate, setViewingDate] = useState("");
  const [viewingMessage, setViewingMessage] = useState("");
  const [viewingSubmitting, setViewingSubmitting] = useState(false);
  const [viewingError, setViewingError] = useState("");
  const [viewingSuccess, setViewingSuccess] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/units/${id}`);
        const data = await res.json();
        if (data.success) {
          setUnit(data.data);
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

  const months =
    moveIn && moveOut ? wholeMonthsUp(new Date(moveIn), new Date(moveOut)) : 0;
  const estimatedTotal = unit ? months * unit.pricePerMonth : 0;

  const handleBook = async () => {
    setBookingError("");
    setBookingSuccess("");

    if (!session?.user) {
      router.push(`/login?callbackUrl=/units/${id}`);
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
          rentalType: unit?.rentalType,
          unitId: id,
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

  // Viewing mode is determined entirely by rentalType — long_term gets
  // in-person, mid_term gets virtual, short_term never reaches this page's
  // viewing flow at all (that branch is simply never rendered below).
  const viewingMode: "in_person" | "virtual" | null =
    unit?.rentalType === "long_term" ? "in_person" : unit?.rentalType === "mid_term" ? "virtual" : null;

  const handleRequestViewing = async () => {
    setViewingError("");
    setViewingSuccess("");

    if (!session?.user) {
      router.push(`/login?callbackUrl=/units/${id}`);
      return;
    }
    if (!viewingDate) {
      setViewingError("Please choose a preferred date.");
      return;
    }

    setViewingSubmitting(true);
    try {
      const userId = (session.user as { id?: string }).id;
      const res = await fetch("/api/viewing-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          unitId: id,
          preferredDate: viewingDate,
          message: viewingMessage,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setViewingSuccess(data.message || "Viewing request sent!");
        setShowViewingForm(false);
      } else {
        setViewingError(data.message || "Failed to request a viewing");
      }
    } catch {
      setViewingError("Something went wrong. Please try again.");
    } finally {
      setViewingSubmitting(false);
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

  if (notFound || !unit) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-24 text-center">
          <p className="text-5xl mb-4">🏠</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Unit not found</h1>
          <p className="text-gray-500">This listing may have been removed or archived.</p>
        </div>
        <Footer />
      </div>
    );
  }

  const images = unit.images.length > 0 ? unit.images : [];
  const galleryPhotos = images.map((url) => ({ url, caption: unit.title }));

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
                alt={unit.title}
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
              {RENTAL_TYPE_LABEL[unit.rentalType]}
            </span>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{unit.title}</h1>
            <p className="text-gray-500 mb-6">{buildingAddress}</p>

            <div className="flex gap-6 mb-6 text-sm text-gray-600">
              <span>🛏️ {unit.bedrooms} bedrooms</span>
              <span>{unit.furnished ? "🛋️ Furnished" : "📦 Unfurnished — bring your own furniture"}</span>
            </div>

            <p className="text-gray-700 leading-relaxed mb-6 whitespace-pre-line">{unit.description}</p>

            {unit.amenities.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {unit.amenities.map((a) => (
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
          </div>

          {/* ── Booking Widget ── */}
          <div>
            <div className="sticky top-24 border border-gray-200 rounded-2xl p-6 shadow-md">
              <p className="text-2xl font-bold text-[#7A1B0F] mb-1">
                ${unit.pricePerMonth.toLocaleString()}
                <span className="text-gray-400 text-base font-normal">/month</span>
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

              {months > 0 && (
                <p className="text-sm text-gray-500 mt-3">
                  ≈ {months} month{months > 1 ? "s" : ""} · Est. ${estimatedTotal.toLocaleString()} total
                </p>
              )}

              {bookingError && <p className="text-sm text-red-600 mt-3">{bookingError}</p>}
              {bookingSuccess && <p className="text-sm text-green-600 mt-3">{bookingSuccess}</p>}

              {/* Viewing request — long_term gets in-person, mid_term
                  gets virtual. Rendered above the booking button since a
                  viewing typically happens before someone commits to a
                  booking. */}
              {viewingMode && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  {!showViewingForm ? (
                    <button
                      onClick={() => {
                        if (!session?.user) {
                          router.push(`/login?callbackUrl=/units/${id}`);
                          return;
                        }
                        setShowViewingForm(true);
                      }}
                      className="w-full py-2.5 border-2 border-[#7A1B0F] text-[#7A1B0F] hover:bg-[#7A1B0F]/5 font-semibold rounded-xl transition text-sm"
                    >
                      {viewingMode === "in_person" ? "Request In-Person Viewing" : "Request Virtual Viewing"}
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Preferred date
                        </label>
                        <input
                          type="date"
                          value={viewingDate}
                          onChange={(e) => setViewingDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7A1B0F] transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Message (optional)
                        </label>
                        <textarea
                          value={viewingMessage}
                          onChange={(e) => setViewingMessage(e.target.value)}
                          rows={2}
                          placeholder={
                            viewingMode === "in_person"
                              ? "Any particular time that works best for you?"
                              : "Any questions before the call?"
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7A1B0F] resize-none transition"
                        />
                      </div>

                      {viewingError && <p className="text-sm text-red-600">{viewingError}</p>}

                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowViewingForm(false)}
                          className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleRequestViewing}
                          disabled={viewingSubmitting}
                          className="flex-1 py-2 bg-[#7A1B0F] hover:opacity-90 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition"
                        >
                          {viewingSubmitting ? "Sending..." : "Send Request"}
                        </button>
                      </div>
                    </div>
                  )}
                  {viewingSuccess && <p className="text-sm text-green-600 mt-2">{viewingSuccess}</p>}
                </div>
              )}

              <button
                onClick={handleBook}
                disabled={submitting || unit.status !== "active"}
                className="w-full mt-4 py-3 bg-[#7A1B0F] hover:opacity-90 disabled:opacity-50 text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-[#7A1B0F]/20"
              >
                {submitting ? "Requesting..." : "Request Booking"}
              </button>

              {unit.status !== "active" && (
                <p className="text-xs text-gray-400 mt-2 text-center">This unit isn&apos;t currently listed.</p>
              )}

              <p className="text-xs text-gray-400 mt-3 text-center">
                {unit.rentalType === "long_term"
                  ? "You can request an in-person viewing before booking, or book directly."
                  : "You can request a virtual viewing before booking, or book directly."}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default function UnitDetailPage() {
  return (
    <Suspense fallback={null}>
      <UnitDetailContent />
    </Suspense>
  );
}