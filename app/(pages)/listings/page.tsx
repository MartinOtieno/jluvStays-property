// room-booking/app/(pages)/listings/page.tsx

"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { DURATION_RULES, validateDuration } from "@/lib/durationRules";

type RentalType = "long_term" | "mid_term" | "short_term";

interface UnitApiShape {
  _id: string;
  title: string;
  description: string;
  rentalType: RentalType;
  pricePerMonth?: number;
  furnished?: boolean;
  images: string[];
  amenities: string[];
  bedrooms: number;
  status: "active" | "inactive" | "archived";
}

interface RoomApiShape {
  _id: string;
  label: string;
  description: string;
  pricePerNight: number;
  furnished: boolean;
  images: string[];
  currentTenant: string | null;
  status: "active" | "inactive";
}

// Normalized shape the grid actually renders — same pattern as the landing
// page's featured listings, so a Unit (long/mid) and a Room (short)
// can sit side by side in one grid.
interface Listing {
  _id: string;
  name: string;
  description: string;
  rentalType: RentalType;
  price: number;
  priceUnit: "month" | "night";
  furnished: boolean;
  images: string[];
  amenities: string[];
  isAvailable: boolean;
  href: string;
}

const RENTAL_TYPE_TABS: { value: RentalType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "long_term", label: "Long Term" },
  { value: "mid_term", label: "Mid Term" },
  { value: "short_term", label: "Short Term" },
];

const RENTAL_TYPE_LABEL: Record<RentalType, string> = {
  long_term: "Long Term",
  mid_term: "Mid Term",
  short_term: "Short Term",
};

const PLACEHOLDER_IMAGES: Record<RentalType, string> = {
  long_term: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
  mid_term: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800",
  short_term: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800",
};

function getListingImage(listing: Listing): string {
  if (listing.images && listing.images.length > 0 && listing.images[0]) {
    return listing.images[0];
  }
  return PLACEHOLDER_IMAGES[listing.rentalType];
}

function unitToListing(p: UnitApiShape): Listing {
  return {
    _id: p._id,
    name: p.title || "Untitled unit",
    description: p.description,
    rentalType: p.rentalType,
    price: p.pricePerMonth ?? 0,
    priceUnit: "month",
    furnished: Boolean(p.furnished),
    images: p.images ?? [],
    amenities: p.amenities ?? [],
    isAvailable: p.status === "active",
    href: `/units/${p._id}`,
  };
}

function roomToListing(r: RoomApiShape): Listing {
  return {
    _id: r._id,
    name: r.label || "Untitled room",
    description: r.description,
    rentalType: "short_term",
    price: r.pricePerNight,
    priceUnit: "night",
    furnished: r.furnished,
    images: r.images ?? [],
    amenities: [],
    // Point-in-time only. Real date-range availability depends on
    // /api/units and /api/rooms honoring moveIn/moveOut server-side
    // (via Booking.hasOverlap) — not implemented on those routes yet.
    isAvailable: r.currentTenant === null && r.status === "active",
    href: `/rooms/${r._id}`,
  };
}

export default function ListingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [rentalType, setRentalType] = useState<RentalType | "all">(
    (searchParams.get("type") as RentalType | null) ?? "all"
  );
  const [moveIn, setMoveIn] = useState(searchParams.get("moveIn") ?? "");
  const [moveOut, setMoveOut] = useState(searchParams.get("moveOut") ?? "");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const fetchListings = useCallback(
    async (type = rentalType, min = minPrice, max = maxPrice, moveInVal = moveIn, moveOutVal = moveOut) => {
      setLoading(true);
      setError("");

      const dateParams = new URLSearchParams();
      if (moveInVal) dateParams.set("moveIn", moveInVal);
      if (moveOutVal) dateParams.set("moveOut", moveOutVal);
      if (min) dateParams.set("minPrice", min);
      if (max) dateParams.set("maxPrice", max);

      try {
        const wantUnits = type === "all" || type === "long_term" || type === "mid_term";
        const wantRooms = type === "all" || type === "short_term";

        const unitParams = new URLSearchParams(dateParams);
        if (type === "long_term" || type === "mid_term") unitParams.set("rentalType", type);

        const [unitsRes, roomsRes] = await Promise.all([
          wantUnits
            ? fetch(`/api/units?${unitParams.toString()}`).catch(() => null)
            : Promise.resolve(null),
          wantRooms
            ? fetch(`/api/rooms?${dateParams.toString()}`).catch(() => null)
            : Promise.resolve(null),
        ]);

        const unitsData = unitsRes?.ok ? await unitsRes.json() : { success: false };
        const roomsData = roomsRes?.ok ? await roomsRes.json() : { success: false };

        const units: Listing[] = unitsData.success
          ? unitsData.data
              .filter((p: UnitApiShape) => p.status === "active")
              .map(unitToListing)
          : [];

        const rooms: Listing[] = roomsData.success
          ? roomsData.data.filter((r: RoomApiShape) => r.status === "active").map(roomToListing)
          : [];

        setListings([...units, ...rooms]);

        if (!unitsData.success && wantUnits) {
          setError((prev) => prev || "Long/Mid Term listings aren't available right now.");
        }
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [rentalType, minPrice, maxPrice, moveIn, moveOut]
  );

  useEffect(() => {
    fetchListings();
    // Only run on mount — subsequent fetches are triggered explicitly by Search/Clear.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    // Only enforce the duration rule when a specific type is picked and
    // both dates are set — "All" has no single rule to check against,
    // and a half-filled date range isn't ready to validate yet anyway.
    if (rentalType !== "all" && moveIn && moveOut) {
      const validationError = validateDuration(rentalType, moveIn, moveOut);
      if (validationError) {
        setError(validationError);
        return;
      }
    }
    setError("");

    const params = new URLSearchParams();
    if (rentalType !== "all") params.set("type", rentalType);
    if (moveIn) params.set("moveIn", moveIn);
    if (moveOut) params.set("moveOut", moveOut);
    router.replace(`/listings?${params.toString()}`);
    fetchListings();
  };

  const handleClear = () => {
    setRentalType("all");
    setMoveIn("");
    setMoveOut("");
    setMinPrice("");
    setMaxPrice("");
    setError("");
    router.replace("/listings");
    fetchListings("all", "", "", "", "");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* ── Page Header ── */}
      <section className="bg-[#7A1B0F] py-14 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-white mb-3">Available Listings</h1>
          <p className="text-white/80 text-lg">
            {loading
              ? "Loading listings..."
              : `${listings.length} listing${listings.length !== 1 ? "s" : ""} found`}
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* ── Filters Bar ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          {/* Rental type tabs */}
          <p className="text-sm font-semibold text-gray-700 mb-3">What are you looking for?</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {RENTAL_TYPE_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setRentalType(tab.value)}
                className={
                  "px-4 py-2 rounded-full text-sm font-medium border transition " +
                  (rentalType === tab.value
                    ? "bg-[#7A1B0F] border-[#7A1B0F] text-white"
                    : "border-gray-300 text-gray-600 hover:border-[#7A1B0F] hover:text-[#7A1B0F]")
                }
              >
                {tab.label}
              </button>
            ))}
          </div>

          {rentalType !== "all" && (
            <p className="text-xs text-gray-500 mb-4">ℹ️ {DURATION_RULES[rentalType].helperText}</p>
          )}

          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[140px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Move-in</label>
              <input
                type="date"
                value={moveIn}
                onChange={(e) => setMoveIn(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A1B0F]"
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Move-out</label>
              <input
                type="date"
                value={moveOut}
                onChange={(e) => setMoveOut(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A1B0F]"
              />
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Price ($)</label>
              <input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="e.g. 50"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A1B0F]"
              />
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Price ($)</label>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="e.g. 2000"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A1B0F]"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSearch}
                className="px-5 py-2.5 bg-[#7A1B0F] hover:opacity-90 text-white text-sm font-semibold rounded-lg transition"
              >
                Search
              </button>
              <button
                onClick={handleClear}
                className="px-5 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-600 text-sm font-medium rounded-lg transition"
              >
                Clear
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 mt-3">{error}</p>
          )}
        </div>

        {/* ── Loading Skeleton ── */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 animate-pulse">
                <div className="h-56 bg-gray-200" />
                <div className="p-6 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-10 bg-gray-200 rounded mt-4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Error State ── */}
        {!loading && error && listings.length === 0 && (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">⚠️</p>
            <p className="text-red-500 text-lg mb-4">{error}</p>
            <button
              onClick={() => fetchListings()}
              className="px-6 py-2.5 bg-[#7A1B0F] text-white rounded-lg hover:opacity-90 transition"
            >
              Try Again
            </button>
          </div>
        )}

        {/* ── Empty State ── */}
        {!loading && !error && listings.length === 0 && (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🏠</p>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No listings found</h3>
            <p className="text-gray-500 mb-6">Try adjusting your filters to see more results.</p>
            <button
              onClick={handleClear}
              className="px-6 py-2.5 bg-[#7A1B0F] text-white rounded-lg hover:opacity-90 transition"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* ── Listings Grid ── */}
        {!loading && listings.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <div
                key={listing._id}
                onClick={() => router.push(listing.href)}
                className="bg-white rounded-2xl overflow-hidden border border-gray-100 flex flex-col cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-1 transition duration-300"
              >
                {/* Image */}
                <div className="relative h-56 overflow-hidden">
                  <Image
                    src={getListingImage(listing)}
                    alt={listing.name || "Listing photo"}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                  />

                  <span
                    className={
                      "absolute top-3 right-3 px-3 py-1 text-xs font-semibold rounded-full " +
                      (listing.isAvailable ? "bg-green-500 text-white" : "bg-red-500 text-white")
                    }
                  >
                    {listing.isAvailable ? "Available" : "Occupied"}
                  </span>

                  <span className="absolute top-3 left-3 px-3 py-1 bg-[#7A1B0F] text-white text-xs font-semibold rounded-full">
                    {RENTAL_TYPE_LABEL[listing.rentalType]}
                  </span>
                </div>

                {/* Info */}
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{listing.name}</h3>

                  <p className="text-gray-500 text-sm mb-3 line-clamp-2">
                    {listing.description || "No description available."}
                  </p>

                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[#7A1B0F] font-bold text-lg">
                      ${listing.price.toLocaleString()}
                      <span className="text-gray-400 text-sm font-normal">/{listing.priceUnit}</span>
                    </p>
                    <span className="text-sm text-gray-500">
                      {listing.furnished ? "Furnished" : "Unfurnished"}
                    </span>
                  </div>

                  {listing.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {listing.amenities.slice(0, 3).map((amenity) => (
                        <span key={amenity} className="px-2 py-1 bg-[#7A1B0F]/10 text-[#7A1B0F] text-xs rounded-lg">
                          ✓ {amenity}
                        </span>
                      ))}
                      {listing.amenities.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-lg">
                          +{listing.amenities.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-auto">
                    <div className="block text-center py-2.5 px-4 bg-[#7A1B0F] hover:opacity-90 text-white font-medium rounded-xl text-sm transition">
                      View Details →
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}