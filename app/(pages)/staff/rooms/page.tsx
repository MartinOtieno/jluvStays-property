"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Image from "next/image";
import toast, { Toaster } from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Room {
  _id: string;
  name: string;
  description?: string;
  type: string;
  pricePerNight: number;
  capacity: number;
  amenities: string[];
  images: { url: string; label: string }[];
  isAvailable: boolean;
}

type FilterType = "all" | "available" | "unavailable";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StaffRoomsPage() {
  const { data: session } = useSession();
  const [rooms,    setRooms]    = useState<Room[]>([]);
  const [filter,   setFilter]   = useState<FilterType>("all");
  const [loading,  setLoading]  = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const position = (session?.user as { role?: string })?.role ?? "";
  // Only caretaker and maintenance can toggle availability
  const canToggle = ["caretaker", "maintenance", "property_manager"].includes(position);

  useEffect(() => {
    fetch("/api/rooms")
      .then(r => r.json())
      .then(d => setRooms(d.data ?? []))
      .catch(() => toast.error("Failed to load rooms"))
      .finally(() => setLoading(false));
  }, []);

  const toggleAvailability = async (room: Room) => {
    setToggling(room._id);
    try {
      const res  = await fetch(`/api/rooms/${room._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: !room.isAvailable }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setRooms(prev => prev.map(r => r._id === room._id ? { ...r, isAvailable: !r.isAvailable } : r));
      toast.success(`${room.name} marked as ${!room.isAvailable ? "available" : "unavailable"}.`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setToggling(null);
    }
  };

  const filtered = rooms.filter(r => {
    if (filter === "available")   return r.isAvailable;
    if (filter === "unavailable") return !r.isAvailable;
    return true;
  });

  const counts = {
    all:         rooms.length,
    available:   rooms.filter(r => r.isAvailable).length,
    unavailable: rooms.filter(r => !r.isAvailable).length,
  };

  const tabs: { key: FilterType; label: string }[] = [
    { key: "all",         label: `All (${counts.all})`                     },
    { key: "available",   label: `Available (${counts.available})`         },
    { key: "unavailable", label: `Unavailable (${counts.unavailable})`     },
  ];

  return (
    <>
      <Toaster position="top-center" toastOptions={{
        style: { borderRadius: "10px", background: "#1e293b", color: "#f8fafc", fontSize: "14px" },
      }} />

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rooms</h1>
          <p className="text-slate-500 text-sm mt-1">
            {canToggle
              ? "Monitor and update room availability status."
              : "View current room status across the property."}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === t.key
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-20 text-center">
            <p className="text-slate-400 text-sm">No rooms match this filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map(room => {
              const img = room.images?.[0]?.url;
              return (
                <div
                  key={room._id}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col"
                >
                  {/* Image */}
                  <div className="relative h-40 bg-slate-100">
                    {img ? (
                      <Image
                        src={img}
                        alt={room.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 33vw"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-300">
                        <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
                          <path d="M9 21V12h6v9" />
                        </svg>
                      </div>
                    )}
                    {/* Availability badge */}
                    <span className={`absolute top-2 right-2 px-2.5 py-1 rounded-lg text-xs font-bold ${
                      room.isAvailable
                        ? "bg-emerald-500 text-white"
                        : "bg-red-500 text-white"
                    }`}>
                      {room.isAvailable ? "Available" : "Unavailable"}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="p-4 flex-1 flex flex-col gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-800">{room.name}</h3>
                      <p className="text-xs text-slate-400 capitalize mt-0.5">{room.type} · {room.capacity} guest{room.capacity > 1 ? "s" : ""}</p>
                    </div>

                    <p className="text-sm font-semibold text-slate-700">
                      Ksh {room.pricePerNight.toLocaleString()} <span className="font-normal text-slate-400">/ night</span>
                    </p>

                    {room.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {room.amenities.slice(0, 3).map(a => (
                          <span key={a} className="bg-slate-100 text-slate-600 text-[11px] px-2 py-0.5 rounded-md">
                            {a}
                          </span>
                        ))}
                        {room.amenities.length > 3 && (
                          <span className="text-[11px] text-slate-400 px-1">+{room.amenities.length - 3} more</span>
                        )}
                      </div>
                    )}

                    {canToggle && (
                      <button
                        disabled={toggling === room._id}
                        onClick={() => toggleAvailability(room)}
                        className={`mt-auto w-full py-2 rounded-xl text-sm font-semibold transition disabled:opacity-50 ${
                          room.isAvailable
                            ? "bg-red-50 hover:bg-red-100 text-red-600"
                            : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {toggling === room._id
                          ? "Updating…"
                          : room.isAvailable
                            ? "Mark Unavailable"
                            : "Mark Available"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}