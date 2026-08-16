import Image from "next/image";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

interface BuildingPhoto  { src: string; label: string; }
interface Highlight      { icon: string; title: string; description: string; }
interface NearbyPlace    { icon: string; label: string; value: string; }

interface PropertySettings {
  buildingPhotos: BuildingPhoto[];
  highlights:     Highlight[];
  rules:          string[];
  nearbyPlaces:   NearbyPlace[];
  address?: {
    street?:  string;
    estate?:  string;
    city?:    string;
    mapsUrl?: string;
  };
}

// Matches what /api/staff already returns — position + a populated user
// (name/email/phone/photo/role). This is the shape a StaffProfile model
// would naturally produce (a position field alongside a User ref), so
// I'm assuming this endpoint IS backed by StaffProfile already rather
// than switching it to a different route I haven't seen. Flag it if
// that assumption is wrong.
interface StaffMember {
  _id: string;
  position: string;
  user: {
    name:   string;
    email?: string;
    phone?: string;
    photo?: string;
    role?:  string;
  };
}

interface UserApiShape {
  _id: string;
  role?: string;
}

interface Stats { rooms: number; bookings: number; tenants: number; }

async function getStats(): Promise<Stats> {
  try {
    const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const [roomsRes, bookingsRes, usersRes] = await Promise.all([
      fetch(base + "/api/rooms",    { cache: "no-store" }),
      fetch(base + "/api/bookings", { cache: "no-store" }),
      fetch(base + "/api/users",    { cache: "no-store" }),
    ]);
    const rooms    = await roomsRes.json();
    const bookings = await bookingsRes.json();
    const users     = usersRes.ok ? await usersRes.json() : { success: false };

    // "Registered Tenants" means users with role === "tenant" specifically
    // — not admins, not staff. The old version used a precomputed `count`
    // field, which can't be filtered by role, so this now always works
    // from the `data` array and counts matching users itself.
    const tenantCount = users.success
      ? (users.data as UserApiShape[]).filter((u) => u.role === "tenant").length
      : 0;

    return {
      rooms:    rooms.success    ? (rooms.count    ?? rooms.data?.length    ?? 0) : 0,
      bookings: bookings.success ? (bookings.count ?? bookings.data?.length ?? 0) : 0,
      tenants:  tenantCount,
    };
  } catch {
    return { rooms: 0, bookings: 0, tenants: 0 };
  }
}

async function getPropertySettings(): Promise<PropertySettings> {
  try {
    const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const res  = await fetch(base + "/api/property-settings", { cache: "no-store" });
    const data = await res.json();
    return data.success
      ? data.data
      : { buildingPhotos: [], highlights: [], rules: [], nearbyPlaces: [] };
  } catch {
    return { buildingPhotos: [], highlights: [], rules: [], nearbyPlaces: [] };
  }
}

async function getStaff(): Promise<StaffMember[]> {
  try {
    const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const res  = await fetch(base + "/api/staff?activeOnly=true", { cache: "no-store" });
    const data = await res.json();
    return data.success ? data.data : [];
  } catch {
    return [];
  }
}

const FALLBACK_HERO = "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1600";

export default async function AboutPage() {
  const [stats, settings, staff] = await Promise.all([
    getStats(),
    getPropertySettings(),
    getStaff(),
  ]);

  // ── Derived values from settings ─────────────────────────────────────────────
  const mapsUrl       = settings.address?.mapsUrl ?? "";
  const city          = settings.address?.city    ?? "Chicago";
  const estate        = settings.address?.estate  ?? "";
  const locationLabel = [estate, city].filter(Boolean).join(", ");
  const heroImage     = settings.buildingPhotos?.[0]?.src ?? FALLBACK_HERO;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative h-80 md:h-96">
        <Image
          src={heroImage}
          alt="Our Building"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#7A1B0F]/80 to-black/50" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">About Us</h1>
          <p className="text-white/90 text-lg max-w-2xl">
            Your trusted home away from home in the heart of {city}
          </p>
        </div>
      </section>

      {/* ── Who We Are + Stats ───────────────────────────────────────────────── */}
      <section className="py-16 px-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-[#7A1B0F] font-semibold text-sm uppercase tracking-wide">Who We Are</span>
            <h2 className="text-3xl font-bold text-gray-900 mt-2 mb-4">Quality Living in {city}</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              JluvStays is a premium room rental platform managing a modern residential building
              located in {locationLabel}. We offer comfortable, affordable, and secure accommodation
              for students, working professionals, and families.
            </p>
            <p className="text-gray-600 leading-relaxed mb-6">
              Our building features a variety of room types — from cozy single rooms to spacious
              family suites — all fully furnished and ready to move into.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/listings" className="px-6 py-3 bg-[#7A1B0F] hover:opacity-90 text-white font-semibold rounded-xl transition">
                Browse Listings
              </Link>
              <Link href="/contact" className="px-6 py-3 border-2 border-[#7A1B0F] text-[#7A1B0F] hover:bg-[#7A1B0F]/5 font-semibold rounded-xl transition">
                Contact Us
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: stats.rooms    > 0 ? stats.rooms    + "+" : "20+",  label: "Available Rooms",    icon: "🏠", desc: "Rooms in our building"   },
              { value: stats.bookings > 0 ? stats.bookings + "+" : "50+",  label: "Total Bookings",     icon: "📅", desc: "Successful reservations"  },
              { value: stats.tenants  > 0 ? stats.tenants  + "+" : "100+", label: "Registered Tenants", icon: "😊", desc: "Happy residents"          },
              { value: "5★",                                                label: "Average Rating",     icon: "⭐", desc: "Based on tenant reviews"  },
            ].map((stat) => (
              <div key={stat.label} className="bg-[#7A1B0F]/5 rounded-2xl p-6 text-center hover:bg-[#7A1B0F]/10 transition">
                <p className="text-3xl mb-2">{stat.icon}</p>
                <p className="text-3xl font-bold text-[#7A1B0F]">{stat.value}</p>
                <p className="text-gray-700 text-sm font-medium mt-1">{stat.label}</p>
                <p className="text-gray-400 text-xs mt-0.5">{stat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Choose Us ────────────────────────────────────────────────────── */}
      {settings.highlights.length > 0 && (
        <section className="py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <span className="text-[#7A1B0F] font-semibold text-sm uppercase tracking-wide">Why Choose Us</span>
              <h2 className="text-3xl font-bold text-gray-900 mt-2">Property Highlights</h2>
              <p className="text-gray-500 mt-2">Everything you need for comfortable living</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {settings.highlights.map((item, index) => (
                <div key={index} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition duration-300">
                  <div className="w-12 h-12 bg-[#7A1B0F]/10 rounded-xl flex items-center justify-center text-2xl mb-4">
                    {item.icon}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── House Rules ───────────────────────────────────────────────────────── */}
      {settings.rules.length > 0 && (
        <section className="bg-gray-50 py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <span className="text-[#7A1B0F] font-semibold text-sm uppercase tracking-wide">Important</span>
              <h2 className="text-3xl font-bold text-gray-900 mt-2">House Rules</h2>
              <p className="text-gray-500 mt-2">Please read and respect these rules to ensure a comfortable environment for all tenants.</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {settings.rules.map((rule, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition">
                    <span className="w-6 h-6 bg-[#7A1B0F]/10 text-[#7A1B0F] rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <p className="text-gray-600 text-sm leading-relaxed">{rule}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Meet the Team ────────────────────────────────────────────────────── */}
      {staff.length > 0 && (
        <section className="py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <span className="text-[#7A1B0F] font-semibold text-sm uppercase tracking-wide">Our People</span>
              <h2 className="text-3xl font-bold text-gray-900 mt-2">Meet the Team</h2>
              <p className="text-gray-500 mt-2">The dedicated team behind your comfortable stay</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {staff.map((member) => (
                <div key={member._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
                  <div className="relative h-36 bg-[#7A1B0F]/5 flex items-center justify-center">
                    <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md">
                      {member.user?.photo ? (
                        <Image
                          src={member.user.photo}
                          alt={member.user.name}
                          fill
                          sizes="96px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#7A1B0F]/20 flex items-center justify-center text-3xl">
                          👤
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-5 text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{member.user.name}</h3>
                    <p className="text-[#7A1B0F] text-sm font-medium capitalize mb-3">
                      {member.position || member.user.role}
                    </p>
                    {member.user.phone && (
                      <a href={`tel:${member.user.phone}`} className="text-gray-400 text-sm hover:text-[#7A1B0F] transition">
                        {member.user.phone}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Nearby Places + Map ──────────────────────────────────────────────── */}
      {settings.nearbyPlaces.length > 0 && (
        <section className="bg-gray-50 py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <span className="text-[#7A1B0F] font-semibold text-sm uppercase tracking-wide">Find Us</span>
              <h2 className="text-3xl font-bold text-gray-900 mt-2">Our Location</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">

              {/* Nearby places list */}
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-6">{locationLabel}</h3>
                <div className="space-y-4">
                  {settings.nearbyPlaces.map((item, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <span className="flex items-center gap-2 text-gray-600 text-sm">
                        <span>{item.icon}</span>
                        {item.label}
                      </span>
                      <p className=" text-gray-600 text-sm"><span className="text-[#7A1B0F] text-sm font-medium">{item.value}</span> Minutes Walk</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Map — sourced from PropertySettings.address.mapsUrl */}
              <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100 h-80 bg-gray-100">
                {mapsUrl ? (
                  <iframe
                    src={mapsUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Property location map"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                    <span className="text-4xl">📍</span>
                    <p className="text-sm font-medium">Map not configured yet</p>
                    <p className="text-xs text-gray-300">Add a Google Maps embed URL in Property Settings</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        </section>
      )}

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-[#7A1B0F]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Move In?</h2>
          <p className="text-white/90 mb-8">
            Browse our available listings and find your perfect space in {city} today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/listings" className="px-8 py-3 bg-white text-[#7A1B0F] hover:bg-gray-100 font-semibold rounded-xl transition">
              Browse Listings
            </Link>
            <Link href="/contact" className="px-8 py-3 border-2 border-white text-white hover:bg-white/10 font-semibold rounded-xl transition">
              Get in Touch
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}