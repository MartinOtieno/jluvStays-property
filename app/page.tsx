// room-booking/app/(pages)/(home)/page.tsx

import Image from "next/image";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import RoomFinderModal from "@/app/components/RoomFinderModal";

type RentalType = "long_term" | "mid_term" | "short_term";

interface UnitApiShape {
  _id: string;
  title: string;
  rentalType: RentalType;
  pricePerMonth?: number;
  furnished?: boolean;
  images: string[];
  amenities: string[];
  status: "active" | "inactive" | "archived";
}

interface RoomApiShape {
  _id: string;
  label: string;
  pricePerNight: number;
  furnished: boolean;
  images: string[];
  currentTenant: string | null;
  status: "active" | "inactive";
}

// Normalized shape the UI actually renders — covers both a whole-unit
// Unit listing (long/mid term) and a single-Room listing (short term).
interface FeaturedListing {
  _id: string;
  name: string;
  rentalType: RentalType;
  price: number;
  priceUnit: "month" | "night";
  furnished: boolean;
  images: string[];
  amenities: string[];
  isAvailable: boolean;
  href: string;
}

interface Stats {
  availableListings: number;
  totalBookings: number;
  totalUsers: number;
}

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

function getListingImage(listing: FeaturedListing): string {
  if (listing.images && listing.images.length > 0 && listing.images[0]) {
    return listing.images[0];
  }
  return PLACEHOLDER_IMAGES[listing.rentalType];
}

function unitToListing(p: UnitApiShape): FeaturedListing {
  return {
    _id: p._id,
    name: p.title || "Untitled unit",
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

function roomToListing(r: RoomApiShape): FeaturedListing {
  return {
    _id: r._id,
    name: r.label || "Untitled room",
    rentalType: "short_term",
    price: r.pricePerNight,
    priceUnit: "night",
    furnished: r.furnished,
    images: r.images ?? [],
    // Rooms don't carry amenities in the schema yet — leave empty rather
    // than guessing at fields that don't exist.
    amenities: [],
    // NOTE: this is a point-in-time snapshot (no tenant currently
    // assigned), not a real date-range availability check. The quiz's
    // /listings results page is where actual date-based availability
    // (Booking.hasOverlap) should be enforced.
    isAvailable: r.currentTenant === null && r.status === "active",
    href: `/rooms/${r._id}`,
  };
}

async function getFeaturedListings(): Promise<FeaturedListing[]> {
  try {
    const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const [unitsRes, roomsRes] = await Promise.all([
      fetch(base + "/api/units", { cache: "no-store" }),
      fetch(base + "/api/rooms", { cache: "no-store" }),
    ]);

    const unitsData = unitsRes.ok ? await unitsRes.json() : { success: false };
    const roomsData = roomsRes.ok ? await roomsRes.json() : { success: false };

    const units: FeaturedListing[] = unitsData.success
      ? unitsData.data
          .filter((p: UnitApiShape) => p.status === "active" && p.rentalType !== "short_term")
          .map(unitToListing)
      : [];

    const rooms: FeaturedListing[] = roomsData.success
      ? roomsData.data
          .filter((r: RoomApiShape) => r.status === "active")
          .map(roomToListing)
      : [];

    // Mix types together so the featured strip isn't dominated by whichever
    // collection happens to have more listings.
    return [...units, ...rooms]
      .filter((listing) => listing.isAvailable)
      .slice(0, 3);
  } catch {
    return [];
  }
}

async function getStats(): Promise<Stats> {
  try {
    const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const [unitsRes, roomsRes, bookingsRes, tenantsRes] = await Promise.all([
      fetch(base + "/api/units", { cache: "no-store" }),
      fetch(base + "/api/rooms", { cache: "no-store" }),
      fetch(base + "/api/bookings", { cache: "no-store" }),
      // "Happy Tenants" should count actual tenants specifically — not
      // every account (admins/staff/guests included) — and this needs to
      // be a public-safe request since the homepage has no admin session.
      // GET /api/users requires admin auth and would 403 here, so this
      // uses the dedicated public count endpoint instead.
      fetch(base + "/api/users/count?role=tenant", { cache: "no-store" }),
    ]);

    const units = unitsRes.ok ? await unitsRes.json() : { success: false };
    const rooms = roomsRes.ok ? await roomsRes.json() : { success: false };
    const bookings = bookingsRes.ok ? await bookingsRes.json() : { success: false };
    const tenants = tenantsRes.ok ? await tenantsRes.json() : { success: false };

    const availableUnits = units.success
      ? units.data.filter((p: UnitApiShape) => p.status === "active" && p.rentalType !== "short_term").length
      : 0;
    const availableRoomsCount = rooms.success
      ? rooms.data.filter((r: RoomApiShape) => r.status === "active" && r.currentTenant === null).length
      : 0;

    return {
      availableListings: availableUnits + availableRoomsCount,
      totalBookings: bookings.success ? bookings.count ?? bookings.data?.length ?? 0 : 0,
      totalUsers: tenants.success ? tenants.count ?? 0 : 0,
    };
  } catch {
    return { availableListings: 0, totalBookings: 0, totalUsers: 0 };
  }
}

// Pulls the WhatsApp number straight from PropertySettings — the same
// record the Footer and Contact page already read from — so the floating
// button always reflects whatever's saved in the admin Property Settings
// page rather than a hardcoded number.
async function getWhatsappNumber(): Promise<string> {
  try {
    const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const res = await fetch(base + "/api/property-settings", { cache: "no-store" });
    const data = res.ok ? await res.json() : { success: false };
    const raw = data.success ? data.data?.whatsapp : "";
    // Strip everything but digits — wa.me links need a bare numeric string.
    const digits = (raw || "").replace(/\D/g, "");
    return digits || "13120000000"; // fallback matches the rest of the site
  } catch {
    return "13120000000";
  }
}

const steps = [
  {
    step: "01",
    title: "Tell Us What You Need",
    description:
      "Answer a couple of quick questions and we'll match you to Long, Mid, or Short Term listings.",
  },
  {
    step: "02",
    title: "Request a Viewing",
    description:
      "For Long and Mid Term units, schedule a visit before you commit. Short Term skips straight to booking.",
  },
  {
    step: "03",
    title: "Book & Move In",
    description:
      "Confirm your booking online and get ready to move into your new home.",
  },
];

export default async function HomePage() {
  const [featuredListings, stats, whatsappNumber] = await Promise.all([
    getFeaturedListings(),
    getStats(),
    getWhatsappNumber(),
  ]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative h-[90vh] flex items-center justify-center">
        <Image
          src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1600"
          alt="Chicago Apartment Building"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r  to-black/50" />
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <span className="inline-block px-4 py-1.5 bg-[#7A1B0F]/20 border border-[#7A1B0F]/30 text-[#7A1B0F] text-sm rounded-full mb-6">
            🏠 Rooms Available in Chicago
          </span>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Find Your Perfect
            <span className="text-[#7A1B0F]"> Room in Chicago</span>
          </h1>
          <p className="text-gray-300 text-xl mb-8 max-w-2xl mx-auto">
            Long term, mid term, or just a few nights — starting from{" "}
            <span className="text-white font-semibold">$45/night</span>.
            Secure, comfortable, and conveniently located.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/listings"
              className="px-8 py-4 bg-[#7A1B0F] hover:opacity-90 text-white font-semibold rounded-xl text-lg transition duration-200 shadow-lg"
            >
              Browse Rooms/Units
            </Link>
            <RoomFinderModal />
          </div>
        </div>
      </section>

      {/* ── Stats Bar from DB ── */}
      <section className="bg-[#7A1B0F] py-8">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            {
              value: stats.availableListings > 0 ? stats.availableListings + "+" : "20+",
              label: "Available Listings",
            },
            {
              value: stats.totalUsers > 0 ? stats.totalUsers + "+" : "100+",
              label: "Happy Tenants",
            },
            {
              value: "5★",
              label: "Average Rating",
            },
            {
              value: "24/7",
              label: "Support & Help",
            },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl font-bold text-white">{stat.value}</p>
              <p className="text-white/80 text-sm mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Featured Listings from DB ── */}
      <section className="py-20 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Featured Listings</h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Handpicked long term, mid term, and short term listings at 6142 S Rhodes
            Ave, Chicago, IL.
          </p>
        </div>

        {featuredListings.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-2xl">
            <p className="text-5xl mb-4">🏠</p>
            <p className="text-gray-500">No listings available right now. Check back soon!</p>
            <Link
              href="/listings"
              className="inline-block mt-4 px-6 py-2.5 bg-[#7A1B0F] text-white rounded-xl hover:opacity-90 transition"
            >
              Browse All Listings
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredListings.map((listing) => (
              <Link
                key={listing._id}
                href={listing.href}
                className="bg-white rounded-2xl shadow-md hover:shadow-xl transition duration-300 overflow-hidden border border-gray-100 group"
              >
                {/* Image */}
                <div className="relative h-52 overflow-hidden">
                  <Image
                    src={getListingImage(listing)}
                    alt={listing.name || "Listing photo"}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover group-hover:scale-105 transition duration-500"
                  />
                  <span className="absolute top-3 left-3 px-3 py-1 bg-[#7A1B0F] text-white text-xs font-semibold rounded-full">
                    {RENTAL_TYPE_LABEL[listing.rentalType]}
                  </span>
                  <span
                    className={
                      "absolute top-3 right-3 px-3 py-1 text-xs font-semibold rounded-full " +
                      (listing.isAvailable ? "bg-green-500 text-white" : "bg-red-500 text-white")
                    }
                  >
                    {listing.isAvailable ? "Available" : "Occupied"}
                  </span>
                </div>

                {/* Info */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-[#7A1B0F] transition">
                    {listing.name}
                  </h3>
                  <p className="text-[#7A1B0F] font-semibold text-lg mb-1">
                    ${listing.price.toLocaleString()}
                    <span className="text-gray-400 text-sm font-normal">
                      /{listing.priceUnit}
                    </span>
                  </p>
                  <p className="text-gray-400 text-xs mb-4">
                    {listing.furnished ? "Furnished" : "Unfurnished — bring your own furniture"}
                  </p>

                  {listing.amenities.length > 0 && (
                    <ul className="space-y-1 mb-6">
                      {listing.amenities.slice(0, 3).map((amenity) => (
                        <li key={amenity} className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="text-[#7A1B0F]">✓</span>
                          {amenity}
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="block text-center py-2.5 px-4 bg-[#7A1B0F] group-hover:opacity-90 text-white font-medium rounded-xl transition duration-200">
                    View Details
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="text-center mt-12">
          <Link
            href="/listings"
            className="inline-block px-8 py-3 border-2 border-[#7A1B0F] text-[#7A1B0F] hover:bg-[#7A1B0F] hover:text-white font-semibold rounded-xl transition duration-200"
          >
            View All Listings
          </Link>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="bg-gray-50 py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-gray-500 text-lg">
              Getting your perfect room is just three simple steps away.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((item, index) => (
              <div key={item.step} className="relative text-center">
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-[#7A1B0F]/40 z-0" />
                )}
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-[#7A1B0F] text-white rounded-2xl flex items-center justify-center text-xl font-bold mx-auto mb-6 shadow-lg">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-gray-500 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-4 bg-[#7A1B0F]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Find Your Room?</h2>
          <p className="text-white/90 text-lg mb-8">
            Join hundreds of tenants who have found their perfect room in
            6142 S Rhodes Ave, Chicago, IL. Start browsing today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/listings"
              className="px-8 py-4 bg-white text-[#7A1B0F] hover:bg-gray-100 font-semibold rounded-xl text-lg transition duration-200"
            >
              Browse Rooms
            </Link>
            <Link
              href="/register"
              className="px-8 py-4 bg-[#7A1B0F] hover:opacity-80 border border-white/40 text-white font-semibold rounded-xl text-lg transition duration-200"
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>

      <Footer />

      {/* ── Floating WhatsApp button ── */}
      <a
        href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
          "Hi! I'm interested in a room at JluvStays."
        )}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat with us on WhatsApp"
        className="fixed bottom-6 right-6 z-50 group"
      >
        {/* Ping ring to draw the eye without being obnoxious */}
        <span className="absolute inset-0 rounded-full bg-[#25d366] opacity-75 animate-ping" />
        <span className="relative flex items-center justify-center w-14 h-14 rounded-full bg-[#25d366] hover:bg-[#1ebe5d] shadow-lg shadow-black/20 transition-colors">
          <svg width="28" height="28" fill="white" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </span>

        {/* Tooltip on hover (desktop) */}
        <span className="pointer-events-none absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap bg-slate-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
          Chat with us
        </span>
      </a>
    </div>
  );
}