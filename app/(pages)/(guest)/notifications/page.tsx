"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import toast, { Toaster } from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

type FilterTab = "all" | "unread" | "read";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(date: string) {
  return new Date(date).toLocaleDateString("en-KE", {
    weekday: "short", day: "numeric", month: "short",
    year: "numeric", hour: "2-digit", minute: "2-digit",
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

const TYPE_CONFIG: Record<string, { icon: string; accent: string; bg: string }> = {
  booking_confirmed:  { icon: "✅", accent: "border-l-emerald-500", bg: "bg-emerald-50" },
  booking_cancelled:  { icon: "❌", accent: "border-l-red-400",     bg: "bg-red-50"     },
  booking_pending:    { icon: "⏳", accent: "border-l-amber-400",   bg: "bg-amber-50"   },
  checkin_reminder:   { icon: "🏠", accent: "border-l-blue-500",    bg: "bg-blue-50"    },
  checkout_reminder:  { icon: "🧳", accent: "border-l-violet-500",  bg: "bg-violet-50"  },
  viewing_approved:   { icon: "👁️", accent: "border-l-emerald-500", bg: "bg-emerald-50" },
  viewing_rejected:   { icon: "🚫", accent: "border-l-red-400",     bg: "bg-red-50"     },
  viewing_pending:    { icon: "📅", accent: "border-l-amber-400",   bg: "bg-amber-50"   },
  welcome:            { icon: "🎉", accent: "border-l-blue-500",    bg: "bg-blue-50"    },
  general:            { icon: "🔔", accent: "border-l-gray-400",    bg: "bg-gray-50"    },
};

function getConfig(type: string) {
  return TYPE_CONFIG[type] ?? TYPE_CONFIG.general;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [activeTab,     setActiveTab]     = useState<FilterTab>("all");
  const [deleting,      setDeleting]      = useState<string | null>(null);
  const [clearing,      setClearing]      = useState(false);

  const userId = (session?.user as { id?: string })?.id;

  // Auth guard
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // Fetch all notifications
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const res  = await fetch(`/api/notifications?userId=${userId}`);
      const data = await res.json();
      if (data.success) setNotifications(data.data);
    } catch {
      toast.error("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Mark single as read
  const markRead = async (n: Notification) => {
    if (!n.isRead) {
      await fetch(`/api/notifications/${n._id}`, { method: "PATCH" });
      setNotifications(prev =>
        prev.map(x => x._id === n._id ? { ...x, isRead: true } : x)
      );
    }
    if (n.link) router.push(n.link);
  };

  // Mark all as read
  const markAllRead = async () => {
    if (!userId) return;
    const unread = notifications.filter(n => !n.isRead);
    if (unread.length === 0) return;
    try {
      await fetch("/api/notifications/mark-all-read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success("All notifications marked as read.");
    } catch {
      toast.error("Failed to mark all as read.");
    }
  };

  // Delete single
  const deleteOne = async (id: string) => {
    setDeleting(id);
    try {
      await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      setNotifications(prev => prev.filter(n => n._id !== id));
      toast.success("Notification deleted.");
    } catch {
      toast.error("Failed to delete notification.");
    } finally {
      setDeleting(null);
    }
  };

  // Clear all read notifications
  const clearAllRead = async () => {
    const readIds = notifications.filter(n => n.isRead).map(n => n._id);
    if (readIds.length === 0) { toast.error("No read notifications to clear."); return; }
    if (!confirm(`Clear ${readIds.length} read notification${readIds.length > 1 ? "s" : ""}?`)) return;
    setClearing(true);
    try {
      await Promise.all(readIds.map(id =>
        fetch(`/api/notifications/${id}`, { method: "DELETE" })
      ));
      setNotifications(prev => prev.filter(n => !n.isRead));
      toast.success(`${readIds.length} notification${readIds.length > 1 ? "s" : ""} cleared.`);
    } catch {
      toast.error("Failed to clear notifications.");
    } finally {
      setClearing(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const readCount   = notifications.filter(n => n.isRead).length;

  const filtered = notifications.filter(n => {
    if (activeTab === "unread") return !n.isRead;
    if (activeTab === "read")   return n.isRead;
    return true;
  });

  const TABS: { key: FilterTab; label: string }[] = [
    { key: "all",    label: `All (${notifications.length})` },
    { key: "unread", label: `Unread (${unreadCount})`       },
    { key: "read",   label: `Read (${readCount})`           },
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
        <div className="max-w-3xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Notifications</h1>
            <p className="text-blue-100 text-sm">
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}.`
                : "You're all caught up!"}
            </p>
          </div>

          {/* Header actions */}
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-xl transition"
              >
                Mark all read
              </button>
            )}
            {readCount > 0 && (
              <button
                onClick={clearAllRead}
                disabled={clearing}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-xl transition disabled:opacity-50"
              >
                {clearing ? "Clearing…" : "Clear read"}
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total",  value: notifications.length, bg: "bg-white",       text: "text-gray-800",    border: "border-gray-100"    },
            { label: "Unread", value: unreadCount,          bg: "bg-blue-50",     text: "text-blue-600",    border: "border-blue-100"    },
            { label: "Read",   value: readCount,            bg: "bg-emerald-50",  text: "text-emerald-600", border: "border-emerald-100" },
          ].map(c => (
            <div key={c.label} className={`${c.bg} border ${c.border} rounded-2xl p-4 text-center shadow-sm`}>
              <p className={`text-2xl font-bold ${c.text}`}>{c.value}</p>
              <p className="text-sm text-gray-400 mt-0.5">{c.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 w-fit shadow-sm mb-6">
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

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse flex gap-4">
                <div className="w-10 h-10 bg-gray-200 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-5xl mb-4">🔔</p>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {activeTab === "all"    && "No notifications yet"}
              {activeTab === "unread" && "No unread notifications"}
              {activeTab === "read"   && "No read notifications"}
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              {activeTab === "all"
                ? "Notifications about your bookings and viewings will appear here."
                : "Switch to a different tab to see other notifications."}
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

        {/* Notification list */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map(n => {
              const cfg = getConfig(n.type);
              return (
                <div
                  key={n._id}
                  className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden border-l-4 ${cfg.accent} transition-all hover:shadow-md group`}
                >
                  <div className="flex items-start gap-4 p-5">

                    {/* Icon */}
                    <div className={`w-11 h-11 rounded-xl ${cfg.bg} flex items-center justify-center text-xl flex-shrink-0`}>
                      {cfg.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm leading-snug ${!n.isRead ? "font-bold text-gray-900" : "font-medium text-gray-700"}`}>
                            {n.title}
                          </p>
                          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                            {n.message}
                          </p>
                        </div>

                        {/* Unread dot */}
                        {!n.isRead && (
                          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                        )}
                      </div>

                      {/* Footer row */}
                      <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400" title={fmt(n.createdAt)}>
                            {timeAgo(n.createdAt)}
                          </span>
                          <span className="text-gray-200">·</span>
                          <span className="text-xs text-gray-400">{fmt(n.createdAt)}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Mark as read */}
                          {!n.isRead && (
                            <button
                              onClick={() => markRead(n)}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium transition"
                            >
                              Mark read
                            </button>
                          )}

                          {/* Go to link */}
                          {n.link && (
                            <button
                              onClick={() => markRead(n)}
                              className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                            >
                              View →
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            onClick={() => deleteOne(n._id)}
                            disabled={deleting === n._id}
                            className="text-xs text-gray-300 hover:text-red-400 transition p-1 rounded disabled:opacity-50"
                            aria-label="Delete notification"
                          >
                            {deleting === n._id ? (
                              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
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