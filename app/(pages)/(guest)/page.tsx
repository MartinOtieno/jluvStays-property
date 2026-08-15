"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Room {
  _id: string;
  name: string;
  description: string;
  type: string;
  pricePerNight: number;
  capacity: number;
  amenities: string[];
  images: { url: string; label: string }[];
  isAvailable: boolean;
}

// ─── Placeholder images by room type ─────────────────────────────────────────

const PLACEHOLDER_IMAGES: Record<string, string> = {
  single:  "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800",
  double:  "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800",
  suite:   "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800",
  family:  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
  default: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800",
};

function getRoomImage(room: Room): string {
  if (room.images?.length > 0 && room.images[0].url) return room.images[0].url;
  return PLACEHOLDER_IMAGES[room.type] ?? PLACEHOLDER_IMAGES.default;
}

// ─── Room type pills ──────────────────────────────────────────────────────────

const ROOM_TYPES = ["All", "single", "double", "suite", "family"];

// ─── How it works steps ───────────────────────────────────────────────────────

const STEPS = [
  {
    number: "01",
    title: "Browse Rooms",
    description: "Explore our range of rooms filtered by type, price, and capacity.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Request a Viewing",
    description: "Schedule a visit to see the room in person before committing.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Book & Move In",
    description: "Confirm your booking online and move in on your chosen date.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

// ─── Why choose us ────────────────────────────────────────────────────────────

const PERKS = [
  { emoji: "🔒", title: "Secure Booking",     desc: "Your reservation is protected end-to-end." },
  { emoji: "💳", title: "Transparent Pricing", desc: "No hidden fees. What you see is what you pay." },
  { emoji: "🏠", title: "Quality Rooms",       desc: "Every room is verified and well-maintained." },
  { emoji: "📞", title: "24/7 Support",        desc: "Our team is always available to help you." },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GuestHomePage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [rooms,       setRooms]       = useState<Room[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [activeType,  setActiveType]  = useState("All");
  const [hoveredId,   setHoveredId]   = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/rooms")
      .then(r => r.json())
      .then(d => setRooms(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const featured = rooms
    .filter(r => r.isAvailable)
    .filter(r => activeType === "All" || r.type === activeType)
    .slice(0, 6);

  const firstName = session?.user?.name?.split(" ")[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative bg-blue-600 overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white" />
          <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-white" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-20 lg:py-28">
          <div className="max-w-2xl">
            {session && (
              <p className="text-blue-200 font-medium mb-3">
                Welcome back, {firstName} 👋
              </p>
            )}
            <h1 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-5">
              Find Your Perfect Room in Nairobi
            </h1>
            <p className="text-blue-100 text-lg mb-8 leading-relaxed">
              Browse verified, comfortable rooms across the city. Book instantly, move in on your schedule.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/rooms"
                className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition shadow-md"
              >
                Browse Rooms →
              </Link>
              {session ? (
                <Link
                  href="/trips"
                  className="px-6 py-3 border-2 border-white/40 text-white font-semibold rounded-xl hover:bg-white/10 transition"
                >
                  My Bookings
                </Link>
              ) : (
                <Link
                  href="/register"
                  className="px-6 py-3 border-2 border-white/40 text-white font-semibold rounded-xl hover:bg-white/10 transition"
                >
                  Create Account
                </Link>
              )}
            </div>

            {/* Quick stats */}
            <div className="flex flex-wrap gap-8 mt-12">
              {[
                { value: `${rooms.length}+`,                                      label: "Rooms Listed"     },
                { value: `${rooms.filter(r => r.isAvailable).length}`,            label: "Available Now"    },
                { value: `${[...new Set(rooms.map(r => r.type))].length} types`,  label: "Room Types"       },
              ].map(s => (
                <div key={s.label}>
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-blue-200 text-sm">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured Rooms ───────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Available Rooms</h2>
            <p className="text-gray-500 text-sm mt-1">
              {loading ? "Loading…" : `${featured.length} room${featured.length !== 1 ? "s" : ""} available`}
            </p>
          </div>
          <Link
            href="/rooms"
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition whitespace-nowrap"
          >
            View all rooms →
          </Link>
        </div>

        {/* Type filter pills */}
        <div className="flex gap-2 flex-wrap mb-8">
          {ROOM_TYPES.map(type => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition border ${
                activeType === type
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 animate-pulse">
                <div className="h-52 bg-gray-200" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-9 bg-gray-200 rounded mt-4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && featured.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🏠</p>
            <p className="text-gray-500">No available rooms for this type. Try another filter.</p>
            <button
              onClick={() => setActiveType("All")}
              className="mt-4 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              Show All
            </button>
          </div>
        )}

        {/* Grid */}
        {!loading && featured.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map(room => {
              const isHovered = hoveredId === room._id;
              return (
                <div
                  key={room._id}
                  onClick={() => router.push(`/rooms/${room._id}`)}
                  onMouseEnter={() => setHoveredId(room._id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className="bg-white rounded-2xl overflow-hidden border border-gray-100 flex flex-col cursor-pointer transition-all duration-300"
                  style={{
                    transform:  isHovered ? "scale(1.02)" : "scale(1)",
                    boxShadow:  isHovered ? "0 16px 40px rgba(0,0,0,0.10)" : "0 1px 3px rgba(0,0,0,0.06)",
                  }}
                >
                  {/* Image */}
                  <div className="relative h-52 overflow-hidden">
                    <Image
                      src={getRoomImage(room)}
                      alt={room.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover transition-transform duration-500"
                      style={{ transform: isHovered ? "scale(1.07)" : "scale(1)" }}
                    />
                    {/* Availability */}
                    <span className={`absolute top-3 right-3 px-2.5 py-1 text-xs font-bold rounded-full ${
                      room.isAvailable ? "bg-green-500 text-white" : "bg-red-500 text-white"
                    }`}>
                      {room.isAvailable ? "Available" : "Occupied"}
                    </span>
                    {/* Type */}
                    <span className="absolute top-3 left-3 px-2.5 py-1 bg-blue-600 text-white text-xs font-bold rounded-full capitalize">
                      {room.type}
                    </span>
                    {/* Hover CTA */}
                    <div
                      className="absolute inset-0 flex items-center justify-center transition-opacity duration-300"
                      style={{ opacity: isHovered ? 1 : 0 }}
                    >
                      <span className="px-4 py-2 bg-white text-blue-600 text-sm font-semibold rounded-full shadow-lg">
                        View Details →
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-5 flex flex-col flex-1">
                    <h3
                      className="text-base font-bold mb-1 transition-colors duration-300"
                      style={{ color: isHovered ? "#2563eb" : "#111827" }}
                    >
                      {room.name}
                    </h3>
                    <p className="text-gray-400 text-xs mb-3 line-clamp-2">
                      {room.description || "No description available."}
                    </p>

                    <div className="flex items-center justify-between mb-3">
                      <p className="text-blue-600 font-bold">
                        Ksh {room.pricePerNight.toLocaleString()}
                        <span className="text-gray-400 text-xs font-normal">/mo</span>
                      </p>
                      <span className="text-xs text-gray-400">
                        👤 {room.capacity} {room.capacity === 1 ? "person" : "people"}
                      </span>
                    </div>

                    {room.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {room.amenities.slice(0, 3).map(a => (
                          <span key={a} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-md">
                            ✓ {a}
                          </span>
                        ))}
                        {room.amenities.length > 3 && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-400 text-xs rounded-md">
                            +{room.amenities.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    <div
                      className="mt-auto text-center py-2.5 px-4 rounded-xl text-sm font-semibold text-white transition-colors duration-300"
                      style={{ backgroundColor: isHovered ? "#1d4ed8" : "#2563eb" }}
                    >
                      View Details
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* View all CTA */}
        {!loading && rooms.length > 6 && (
          <div className="text-center mt-10">
            <Link
              href="/rooms"
              className="inline-block px-8 py-3 border-2 border-blue-600 text-blue-600 font-semibold rounded-xl hover:bg-blue-600 hover:text-white transition"
            >
              View All {rooms.filter(r => r.isAvailable).length} Available Rooms
            </Link>
          </div>
        )}
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────────── */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">How It Works</h2>
            <p className="text-gray-500 text-sm">Three simple steps to your new room.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <div key={step.number} className="relative text-center">
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-px bg-blue-100" />
                )}
                <div className="w-20 h-20 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto mb-5">
                  {step.icon}
                </div>
                <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">{step.number}</p>
                <h3 className="text-base font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Choose Us ────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Why JluvStays?</h2>
          <p className="text-gray-500 text-sm">We make finding and booking a room simple and stress-free.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PERKS.map(p => (
            <div
              key={p.title}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center hover:shadow-md hover:-translate-y-1 transition-all duration-300"
            >
              <div className="text-4xl mb-4">{p.emoji}</div>
              <h3 className="font-bold text-gray-900 mb-2">{p.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────────────────── */}
      <section className="bg-blue-600 py-14">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">
            {session ? "Ready to find your next room?" : "Ready to get started?"}
          </h2>
          <p className="text-blue-100 mb-8">
            {session
              ? "Browse all available rooms and book one that suits you."
              : "Create a free account and start browsing rooms in minutes."}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/rooms"
              className="px-7 py-3 bg-white text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition shadow-md"
            >
              Browse Rooms
            </Link>
            {!session && (
              <Link
                href="/register"
                className="px-7 py-3 border-2 border-white/40 text-white font-semibold rounded-xl hover:bg-white/10 transition"
              >
                Create Account
              </Link>
            )}
            {session && (
              <Link
                href="/trips"
                className="px-7 py-3 border-2 border-white/40 text-white font-semibold rounded-xl hover:bg-white/10 transition"
              >
                My Bookings
              </Link>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}