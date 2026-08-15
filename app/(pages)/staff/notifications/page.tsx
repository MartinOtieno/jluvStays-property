"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
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

type FilterTab = "all" | "unread" | "booking" | "viewing";

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function getMeta(type: string) {
  if (type.includes("booking")) return { icon: "🏠", bg: "bg-blue-50",    accent: "border-l-blue-500"   };
  if (type.includes("viewing")) return { icon: "👁️", bg: "bg-violet-50",  accent: "border-l-violet-500" };
  return                              { icon: "🔔", bg: "bg-slate-50",   accent: "border-l-slate-400"  };
}

function category(type: string): FilterTab {
  if (type.includes("booking")) return "booking";
  if (type.includes("viewing")) return "viewing";
  return "all";
}

const TABS: { key: FilterTab; label: string }[] = [
  { key: "all",     label: "All"      },
  { key: "unread",  label: "Unread"   },
  { key: "booking", label: "Bookings" },
  { key: "viewing", label: "Viewings" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StaffNotificationsPage() {
  const { data: session } = useSession();
  const userId = (session?.user as { id?: string })?.id;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [filter,        setFilter]        = useState<FilterTab>("all");
  const [deleting,      setDeleting]      = useState<string | null>(null);

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
    const iv = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(iv);
  }, [fetchNotifications]);

  const markRead = async (n: Notification) => {
    if (!n.isRead) {
      await fetch(`/api/notifications/${n._id}`, { method: "PATCH" });
      setNotifications(prev => prev.map(x => x._id === n._id ? { ...x, isRead: true } : x));
    }
    if (n.link) window.location.href = n.link;
  };

  const markAllRead = async () => {
    if (!userId) return;
    const unread = notifications.filter(n => !n.isRead);
    if (unread.length === 0) return;
    try {
      await fetch("/api/notifications/mark-all-read", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userId }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success("All notifications marked as read.");
    } catch {
      toast.error("Failed to mark all as read.");
    }
  };

  const deleteOne = async (id: string) => {
    setDeleting(id);
    try {
      await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch {
      toast.error("Failed to delete notification.");
    } finally {
      setDeleting(null);
    }
  };

  const clearAllRead = async () => {
    const readIds = notifications.filter(n => n.isRead).map(n => n._id);
    if (readIds.length === 0) return;
    if (!confirm(`Clear ${readIds.length} read notification${readIds.length > 1 ? "s" : ""}?`)) return;
    try {
      await Promise.all(readIds.map(id => fetch(`/api/notifications/${id}`, { method: "DELETE" })));
      setNotifications(prev => prev.filter(n => !n.isRead));
      toast.success("Cleared read notifications.");
    } catch {
      toast.error("Failed to clear notifications.");
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const readCount   = notifications.filter(n => n.isRead).length;

  const filtered = notifications.filter(n => {
    if (filter === "all")    return true;
    if (filter === "unread") return !n.isRead;
    return category(n.type) === filter;
  });

  return (
    <>
      <Toaster position="top-center" toastOptions={{
        style: { borderRadius: "10px", background: "#1e293b", color: "#f8fafc", fontSize: "14px" },
      }} />

      <div className="space-y-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              Notifications
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center h-6 min-w-[24px] px-1.5 bg-violet-600 text-white text-xs font-bold rounded-full">
                  {unreadCount}
                </span>
              )}
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}` : "You're all caught up"}
            </p>
          </div>

          <div className="flex gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition"
              >
                Mark all read
              </button>
            )}
            {readCount > 0 && (
              <button
                onClick={clearAllRead}
                className="px-3 py-2 text-sm text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition"
              >
                Clear read
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit flex-wrap">
          {TABS.map(t => {
            const count =
              t.key === "all"    ? notifications.length :
              t.key === "unread" ? unreadCount :
              notifications.filter(n => category(n.type) === t.key).length;
            return (
              <button
                key={t.key}
                onClick={() => setFilter(t.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  filter === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t.label}
                {count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    filter === t.key ? "bg-violet-100 text-violet-600" : "bg-slate-200 text-slate-500"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse flex gap-4">
                <div className="w-10 h-10 bg-slate-200 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                  <div className="h-3 bg-slate-100 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-20 text-center">
            <p className="text-4xl mb-3">🔔</p>
            <p className="text-slate-600 font-semibold">No notifications here</p>
            <p className="text-slate-400 text-sm mt-1">
              {filter === "unread" ? "You're all caught up!" : "Nothing in this category yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(n => {
              const meta = getMeta(n.type);
              return (
                <div
                  key={n._id}
                  className={`relative bg-white rounded-2xl border-l-4 ${meta.accent} border-y border-r border-slate-100 shadow-sm p-5 flex gap-4 transition hover:shadow-md group ${
                    !n.isRead ? "bg-violet-50/30" : ""
                  }`}
                >
                  {!n.isRead && (
                    <span className="absolute top-5 right-5 w-2 h-2 bg-violet-500 rounded-full" />
                  )}

                  <div className={`w-10 h-10 ${meta.bg} rounded-xl flex items-center justify-center text-lg flex-shrink-0`}>
                    {meta.icon}
                  </div>

                  <div className="flex-1 min-w-0 pr-6">
                    <p className={`text-sm ${!n.isRead ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>
                      {n.title}
                    </p>
                    <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-slate-400">{timeAgo(n.createdAt)}</span>
                      {n.link && (
                        <button
                          onClick={() => markRead(n)}
                          className="text-xs text-violet-600 hover:text-violet-700 font-medium"
                        >
                          View →
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    {!n.isRead && (
                      <button
                        onClick={() => markRead(n)}
                        title="Mark as read"
                        className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition"
                      >
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => deleteOne(n._id)}
                      disabled={deleting === n._id}
                      title="Delete"
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                    >
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
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