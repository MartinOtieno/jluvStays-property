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
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor(diff / 3_600_000);
  const mins = Math.floor(diff / 60_000);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;

  return "Just now";
}

// ─── Notification type styling ────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  string,
  {
    accent: string;
    bg: string;
    text: string;
  }
> = {
  booking_confirmed: {
    accent: "border-l-[#7A1B0F]",
    bg: "bg-[#7A1B0F]/10",
    text: "text-[#7A1B0F]",
  },

  booking_cancelled: {
    accent: "border-l-red-400",
    bg: "bg-red-50",
    text: "text-red-600",
  },

  booking_pending: {
    accent: "border-l-amber-400",
    bg: "bg-amber-50",
    text: "text-amber-700",
  },

  checkin_reminder: {
    accent: "border-l-[#7A1B0F]",
    bg: "bg-[#7A1B0F]/10",
    text: "text-[#7A1B0F]",
  },

  checkout_reminder: {
    accent: "border-l-[#7A1B0F]",
    bg: "bg-[#7A1B0F]/10",
    text: "text-[#7A1B0F]",
  },

  viewing_approved: {
    accent: "border-l-[#7A1B0F]",
    bg: "bg-[#7A1B0F]/10",
    text: "text-[#7A1B0F]",
  },

  viewing_rejected: {
    accent: "border-l-red-400",
    bg: "bg-red-50",
    text: "text-red-600",
  },

  viewing_pending: {
    accent: "border-l-amber-400",
    bg: "bg-amber-50",
    text: "text-amber-700",
  },

  welcome: {
    accent: "border-l-[#7A1B0F]",
    bg: "bg-[#7A1B0F]/10",
    text: "text-[#7A1B0F]",
  },

  general: {
    accent: "border-l-gray-400",
    bg: "bg-gray-50",
    text: "text-gray-600",
  },
};

function getConfig(type: string) {
  return (
    TYPE_CONFIG[type] ?? {
      accent: "border-l-gray-400",
      bg: "bg-gray-50",
      text: "text-gray-600",
    }
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const userId = (session?.user as { id?: string })?.id;

  // ─── Auth guard ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // ─── Fetch notifications ───────────────────────────────────────────────────

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    try {
      const res = await fetch(`/api/notifications?userId=${userId}`);
      const data = await res.json();

      if (data.success) {
        setNotifications(data.data);
      }
    } catch {
      toast.error("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // ─── Mark single as read ────────────────────────────────────────────────────

  const markRead = async (notification: Notification) => {
    if (!notification.isRead) {
      await fetch(`/api/notifications/${notification._id}`, {
        method: "PATCH",
      });

      setNotifications((prev) =>
        prev.map((item) =>
          item._id === notification._id
            ? { ...item, isRead: true }
            : item
        )
      );
    }

    if (notification.link) {
      router.push(notification.link);
    }
  };

  // ─── Mark all as read ───────────────────────────────────────────────────────

  const markAllRead = async () => {
    if (!userId) return;

    const unread = notifications.filter((n) => !n.isRead);

    if (unread.length === 0) return;

    try {
      await fetch("/api/notifications/mark-all-read", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      setNotifications((prev) =>
        prev.map((notification) => ({
          ...notification,
          isRead: true,
        }))
      );

      toast.success("All notifications marked as read.");
    } catch {
      toast.error("Failed to mark all as read.");
    }
  };

  // ─── Delete single ──────────────────────────────────────────────────────────

  const deleteOne = async (id: string) => {
    setDeleting(id);

    try {
      await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
      });

      setNotifications((prev) =>
        prev.filter((notification) => notification._id !== id)
      );

      toast.success("Notification deleted.");
    } catch {
      toast.error("Failed to delete notification.");
    } finally {
      setDeleting(null);
    }
  };

  // ─── Clear all read notifications ──────────────────────────────────────────

  const clearAllRead = async () => {
    const readIds = notifications
      .filter((notification) => notification.isRead)
      .map((notification) => notification._id);

    if (readIds.length === 0) {
      toast.error("No read notifications to clear.");
      return;
    }

    if (
      !confirm(
        `Clear ${readIds.length} read notification${
          readIds.length > 1 ? "s" : ""
        }?`
      )
    ) {
      return;
    }

    setClearing(true);

    try {
      await Promise.all(
        readIds.map((id) =>
          fetch(`/api/notifications/${id}`, {
            method: "DELETE",
          })
        )
      );

      setNotifications((prev) => prev.filter((n) => !n.isRead));

      toast.success(
        `${readIds.length} notification${
          readIds.length > 1 ? "s" : ""
        } cleared.`
      );
    } catch {
      toast.error("Failed to clear notifications.");
    } finally {
      setClearing(false);
    }
  };

  // ─── Counts ─────────────────────────────────────────────────────────────────

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const readCount = notifications.filter((n) => n.isRead).length;

  const filtered = notifications.filter((notification) => {
    if (activeTab === "unread") return !notification.isRead;
    if (activeTab === "read") return notification.isRead;

    return true;
  });

  const TABS: { key: FilterTab; label: string }[] = [
    {
      key: "all",
      label: `All (${notifications.length})`,
    },
    {
      key: "unread",
      label: `Unread (${unreadCount})`,
    },
    {
      key: "read",
      label: `Read (${readCount})`,
    },
  ];

  // ─── Loading ────────────────────────────────────────────────────────────────

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#7A1B0F] border-t-transparent rounded-full animate-spin" />
        </div>

        <Footer />
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            borderRadius: "10px",
            background: "#1e293b",
            color: "#f8fafc",
            fontSize: "14px",
          },
          success: {
            iconTheme: {
              primary: "#7A1B0F",
              secondary: "#fff",
            },
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: "#fff",
            },
          },
        }}
      />

      <Navbar />

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <section className="bg-[#7A1B0F] py-12 px-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">
              Notifications
            </h1>

            <p className="text-white/75 text-sm">
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${
                    unreadCount > 1 ? "s" : ""
                  }.`
                : "You're all caught up!"}
            </p>
          </div>

          {/* Header actions */}
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="px-4 py-2 bg-white/15 hover:bg-white/25 text-white text-sm font-medium rounded-xl transition"
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
        {/* ── Summary cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            {
              label: "Total",
              value: notifications.length,
              bg: "bg-white",
              text: "text-gray-800",
              border: "border-gray-100",
            },
            {
              label: "Unread",
              value: unreadCount,
              bg: "bg-[#7A1B0F]/5",
              text: "text-[#7A1B0F]",
              border: "border-[#7A1B0F]/15",
            },
            {
              label: "Read",
              value: readCount,
              bg: "bg-emerald-50",
              text: "text-emerald-600",
              border: "border-emerald-100",
            },
          ].map((card) => (
            <div
              key={card.label}
              className={`${card.bg} border ${card.border} rounded-2xl p-4 text-center shadow-sm`}
            >
              <p className={`text-2xl font-bold ${card.text}`}>
                {card.value}
              </p>

              <p className="text-sm text-gray-400 mt-0.5">
                {card.label}
              </p>
            </div>
          ))}
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────────────── */}
        <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 w-fit shadow-sm mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-[#7A1B0F] text-white shadow"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Loading skeleton ─────────────────────────────────────────────── */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse flex gap-4"
              >
                <div className="w-2 h-12 bg-gray-200 rounded-full flex-shrink-0" />

                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Empty ─────────────────────────────────────────────────────────── */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#7A1B0F]/10 flex items-center justify-center">
              <span className="w-3 h-3 rounded-full bg-[#7A1B0F]" />
            </div>

            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {activeTab === "all" && "No notifications yet"}
              {activeTab === "unread" && "No unread notifications"}
              {activeTab === "read" && "No read notifications"}
            </h3>

            <p className="text-gray-400 text-sm mb-6">
              {activeTab === "all"
                ? "Notifications about your bookings and viewings will appear here."
                : "Switch to a different tab to see other notifications."}
            </p>

            {activeTab === "all" && (
              <Link
                href="/rooms"
                className="inline-block px-6 py-2.5 bg-[#7A1B0F] text-white rounded-xl text-sm font-semibold hover:bg-[#64160C] transition"
              >
                Browse Rooms
              </Link>
            )}
          </div>
        )}

        {/* ── Notification list ─────────────────────────────────────────────── */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((notification) => {
              const cfg = getConfig(notification.type);

              return (
                <div
                  key={notification._id}
                  className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden border-l-4 ${cfg.accent} transition-all hover:shadow-md`}
                >
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Notification indicator — no icon */}
                      <div
                        className={`w-2 h-10 rounded-full ${cfg.bg} flex-shrink-0`}
                      />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm leading-snug ${
                                !notification.isRead
                                  ? "font-bold text-gray-900"
                                  : "font-medium text-gray-700"
                              }`}
                            >
                              {notification.title}
                            </p>

                            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                              {notification.message}
                            </p>
                          </div>

                          {/* Unread indicator */}
                          {!notification.isRead && (
                            <div className="w-2.5 h-2.5 rounded-full bg-[#7A1B0F] flex-shrink-0 mt-1" />
                          )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <span
                              className="text-xs text-gray-400"
                              title={fmt(notification.createdAt)}
                            >
                              {timeAgo(notification.createdAt)}
                            </span>

                            <span className="text-gray-200">·</span>

                            <span className="text-xs text-gray-400">
                              {fmt(notification.createdAt)}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-3">
                            {!notification.isRead && (
                              <button
                                onClick={() => markRead(notification)}
                                className="text-xs text-[#7A1B0F] hover:text-[#64160C] font-medium transition"
                              >
                                Mark read
                              </button>
                            )}

                            {notification.link && (
                              <button
                                onClick={() => markRead(notification)}
                                className="text-xs px-3 py-1 bg-[#7A1B0F] hover:bg-[#64160C] text-white rounded-lg font-medium transition"
                              >
                                View →
                              </button>
                            )}

                            {/* Delete */}
                            <button
                              onClick={() => deleteOne(notification._id)}
                              disabled={deleting === notification._id}
                              className="text-xs text-gray-300 hover:text-red-400 transition p-1 rounded disabled:opacity-50"
                              aria-label="Delete notification"
                            >
                              {deleting === notification._id ? (
                                <svg
                                  className="w-3.5 h-3.5 animate-spin"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  />

                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8v8H4z"
                                  />
                                </svg>
                              ) : (
                                <svg
                                  className="w-3.5 h-3.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2.5}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              )}
                            </button>
                          </div>
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