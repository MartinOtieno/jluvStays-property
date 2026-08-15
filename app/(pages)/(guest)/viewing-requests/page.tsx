"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import toast, { Toaster } from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ViewingRequest {
  _id: string;
  room: {
    _id: string;
    name: string;
    type: string;
    pricePerNight: number;
    images: { url: string; label: string }[];
  };
  preferredDate: string;
  message: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

type FilterTab = "all" | "pending" | "approved" | "rejected";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PLACEHOLDER_IMAGES: Record<string, string> = {
  single:  "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800",
  double:  "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800",
  suite:   "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800",
  family:  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
  default: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800",
};

function getRoomImage(room: ViewingRequest["room"]): string {
  if (room.images?.length > 0 && room.images[0].url) return room.images[0].url;
  return PLACEHOLDER_IMAGES[room.type] ?? PLACEHOLDER_IMAGES.default;
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString("en-KE", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

function timeAgo(date: string) {
  const diff  = Date.now() - new Date(date).getTime();
  const days  = Math.floor(diff / 86_400_000);
  const hours = Math.floor(diff / 3_600_000);
  const mins  = Math.floor(diff / 60_000);
  if (days  > 0)  return `${days}d ago`;
  if (hours > 0)  return `${hours}h ago`;
  if (mins  > 0)  return `${mins}m ago`;
  return "Just now";
}

const STATUS_CONFIG = {
  pending:  { label: "Pending",  bg: "bg-amber-100",   text: "text-amber-700",   border: "border-amber-200",   icon: "⏳" },
  approved: { label: "Approved", bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200", icon: "✅" },
  rejected: { label: "Declined", bg: "bg-red-100",     text: "text-red-600",     border: "border-red-200",     icon: "❌" },
};

function StatusBadge({ status }: { status: ViewingRequest["status"] }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GuestViewingRequestsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [requests,    setRequests]    = useState<ViewingRequest[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState<FilterTab>("all");
  const [cancelling,  setCancelling]  = useState<string | null>(null);
  const [expanded,    setExpanded]    = useState<string | null>(null);

  const userId = (session?.user as { id?: string })?.id;

  // Auth guard
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // Fetch requests
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/viewing-request?userId=${userId}`)
      .then(r => r.json())
      .then(d => setRequests(d.data ?? []))
      .catch(() => toast.error("Failed to load viewing requests."))
      .finally(() => setLoading(false));
  }, [userId]);

  // Cancel (delete) a pending request
  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this viewing request?")) return;
    setCancelling(id);
    try {
      const res  = await fetch(`/api/viewing-request/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setRequests(prev => prev.filter(r => r._id !== id));
      toast.success("Viewing request cancelled.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to cancel request.");
    } finally {
      setCancelling(null);
    }
  };

  const counts = {
    all:      requests.length,
    pending:  requests.filter(r => r.status === "pending").length,
    approved: requests.filter(r => r.status === "approved").length,
    rejected: requests.filter(r => r.status === "rejected").length,
  };

  const filtered = activeTab === "all"
    ? requests
    : requests.filter(r => r.status === activeTab);

  const TABS: { key: FilterTab; label: string }[] = [
    { key: "all",      label: `All (${counts.all})`           },
    { key: "pending",  label: `Pending (${counts.pending})`   },
    { key: "approved", label: `Approved (${counts.approved})`  },
    { key: "rejected", label: `Declined (${counts.rejected})`  },
  ];

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-center" toastOptions={{
        style: { borderRadius: "10px", background: "#1e293b", color: "#f8fafc", fontSize: "14px" },
        success: { iconTheme: { primary: "#22c55e", secondary: "#fff" } },
        error:   { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
      }} />

      <Navbar />

      {/* Header */}
      <section className="bg-blue-600 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-1">Viewing Requests</h1>
          <p className="text-blue-100 text-sm">
            Track the status of your room viewing requests.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Pending",  value: counts.pending,  bg: "bg-amber-50",   text: "text-amber-600",   border: "border-amber-100"   },
            { label: "Approved", value: counts.approved, bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100" },
            { label: "Declined", value: counts.rejected, bg: "bg-red-50",     text: "text-red-500",     border: "border-red-100"     },
          ].map(c => (
            <div key={c.label} className={`${c.bg} border ${c.border} rounded-2xl p-4 text-center`}>
              <p className={`text-2xl font-bold ${c.text}`}>{c.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{c.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 w-fit shadow-sm mb-6 flex-wrap">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === t.key
                  ? "bg-blue-600 text-white shadow"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse flex gap-4">
                <div className="w-24 h-24 bg-gray-200 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-5xl mb-4">👁️</p>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {activeTab === "all" ? "No viewing requests yet" : `No ${activeTab} requests`}
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              {activeTab === "all"
                ? "Browse rooms and request a viewing to see a room before booking."
                : `You don't have any ${activeTab} viewing requests.`}
            </p>
            {activeTab === "all" && (
              <Link
                href="/rooms"
                className="inline-block px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
              >
                Browse Rooms
              </Link>
            )}
          </div>
        )}

        {/* List */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-4">
            {filtered.map(req => {
              const isExpanded = expanded === req._id;
              const isPending  = req.status === "pending";
              const isFuture   = new Date(req.preferredDate) > new Date();

              return (
                <div
                  key={req._id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition duration-200"
                >
                  <div className="flex flex-col sm:flex-row">

                    {/* Room image */}
                    <div className="relative w-full sm:w-28 h-40 sm:h-auto flex-shrink-0">
                      <Image
                        src={getRoomImage(req.room)}
                        alt={req.room.name}
                        fill
                        sizes="112px"
                        className="object-cover"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <h3 className="font-bold text-gray-900">{req.room.name}</h3>
                          <p className="text-xs text-gray-400 capitalize mt-0.5">
                            {req.room.type} · Ksh {req.room.pricePerNight.toLocaleString()}/mo
                          </p>
                        </div>
                        <StatusBadge status={req.status} />
                      </div>

                      {/* Date info */}
                      <div className="flex flex-wrap gap-4 mb-4">
                        <div className="bg-gray-50 rounded-xl px-4 py-2.5 text-center">
                          <p className="text-xs text-gray-400 mb-0.5">Preferred Date</p>
                          <p className="text-sm font-semibold text-gray-800">{fmt(req.preferredDate)}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl px-4 py-2.5 text-center">
                          <p className="text-xs text-gray-400 mb-0.5">Submitted</p>
                          <p className="text-sm font-semibold text-gray-800">{timeAgo(req.createdAt)}</p>
                        </div>
                      </div>

                      {/* Status message */}
                      {req.status === "approved" && (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 mb-3">
                          <p className="text-xs text-emerald-700 font-medium">
                            ✅ Your viewing has been approved! Our team will contact you to confirm the time.
                          </p>
                        </div>
                      )}
                      {req.status === "rejected" && (
                        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 mb-3">
                          <p className="text-xs text-red-600 font-medium">
                            ❌ This viewing request was declined. You can request a different date or browse other rooms.
                          </p>
                        </div>
                      )}
                      {req.status === "pending" && (
                        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 mb-3">
                          <p className="text-xs text-amber-700 font-medium">
                            ⏳ Your request is under review. We will notify you once it is confirmed.
                          </p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/rooms/${req.room._id}`}
                          className="px-4 py-2 text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg transition font-medium"
                        >
                          View Room
                        </Link>

                        {req.message && (
                          <button
                            onClick={() => setExpanded(isExpanded ? null : req._id)}
                            className="px-4 py-2 text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg transition font-medium flex items-center gap-1.5"
                          >
                            {isExpanded ? "Hide" : "View"} Message
                            <svg
                              className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        )}

                        {isPending && isFuture && (
                          <button
                            onClick={() => handleCancel(req._id)}
                            disabled={cancelling === req._id}
                            className="px-4 py-2 text-sm border border-red-200 text-red-500 hover:bg-red-50 rounded-lg transition font-medium disabled:opacity-50 ml-auto"
                          >
                            {cancelling === req._id ? "Cancelling…" : "Cancel Request"}
                          </button>
                        )}

                        {req.status === "rejected" && (
                          <Link
                            href="/rooms"
                            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium ml-auto"
                          >
                            Browse Other Rooms
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded message */}
                  {isExpanded && req.message && (
                    <div className="px-5 pb-5 border-t border-gray-50 pt-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Your message
                      </p>
                      <p className="text-sm text-gray-600 bg-gray-50 rounded-xl px-4 py-3 leading-relaxed">
                        {req.message}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* CTA to browse rooms */}
        {!loading && requests.length > 0 && (
          <div className="mt-8 text-center">
            <Link
              href="/rooms"
              className="inline-block px-6 py-2.5 border-2 border-blue-600 text-blue-600 font-semibold rounded-xl hover:bg-blue-600 hover:text-white transition text-sm"
            >
              Browse More Rooms
            </Link>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}