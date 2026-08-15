"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;   // ← correct field name from model
  isRead: boolean;   // ← correct field name from model
  link?: string;
  createdAt: string;
}

type FilterType = "all" | "unread" | "booking" | "viewing" | "system";

// ─── Icons ────────────────────────────────────────────────────────────────────

const Icons = {
  Bell:     () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>,
  Check:    () => <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M20 6L9 17l-5-5"/></svg>,
  CheckAll: () => <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M1.5 12.5L5.57 17 9 13.5M6 12l4-4M11.5 17l8.5-8.5"/></svg>,
  Trash:    () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>,
  Calendar: () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  Eye:      () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>,
  Info:     () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  Link:     () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>,
};

// ─── Notification type metadata ───────────────────────────────────────────────

function getNotificationMeta(type: string): {
  icon: React.ReactNode;
  accent: string;
  bg: string;
  category: FilterType;
} {
  if (type?.includes("booking")) return { icon: <Icons.Calendar />, accent: "text-[#7A1B0F]",   bg: "bg-[#7A1B0F]/10", category: "booking" };
  if (type?.includes("viewing")) return { icon: <Icons.Eye />,      accent: "text-violet-600",  bg: "bg-violet-50",    category: "viewing" };
  if (type === "welcome")        return { icon: <Icons.Info />,     accent: "text-emerald-600", bg: "bg-emerald-50",   category: "system"  };
  return                                { icon: <Icons.Info />,     accent: "text-slate-500",   bg: "bg-slate-100",    category: "system"  };
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d ago`;
  return new Date(date).toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

const FILTER_TABS: { key: FilterType; label: string }[] = [
  { key: "all",     label: "All"      },
  { key: "unread",  label: "Unread"   },
  { key: "booking", label: "Bookings" },
  { key: "viewing", label: "Viewings" },
  { key: "system",  label: "System"   },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminNotificationsPage() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter,        setFilter]        = useState<FilterType>("all");
  const [loading,       setLoading]       = useState(true);
  const [toastMsg,      setToastMsg]      = useState("");
  const [deleting,      setDeleting]      = useState<string | null>(null);

  const userId = (session?.user as { id?: string })?.id;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  // ── Fetch notifications ────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res  = await fetch(`/api/notifications?userId=${userId}`);
      const data = await res.json();
      if (data.success) setNotifications(data.data ?? []);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchNotifications();
    // Poll every 60s for new notifications
    const iv = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(iv);
  }, [fetchNotifications]);

  // ── Mark single as read ────────────────────────────────────────────────────
  const markRead = async (id: string) => {
    // Optimistic update
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    try {
      await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    } catch { /* silent */ }
  };

  // ── Mark all as read ───────────────────────────────────────────────────────
  const markAllRead = async () => {
    if (!userId) return;
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try {
      await fetch("/api/notifications/mark-all-read", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userId }),
      });
      showToast("All notifications marked as read.");
    } catch { /* silent */ }
  };

  // ── Delete single notification ─────────────────────────────────────────────
  const deleteNotification = async (id: string) => {
    setDeleting(id);
    setNotifications(prev => prev.filter(n => n._id !== id));
    try {
      await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      showToast("Notification deleted.");
    } catch { /* silent */ } finally {
      setDeleting(null);
    }
  };

  // ── Clear all read ─────────────────────────────────────────────────────────
  const clearAllRead = async () => {
    const readIds = notifications.filter(n => n.isRead).map(n => n._id);
    if (readIds.length === 0) { showToast("No read notifications to clear."); return; }
    setNotifications(prev => prev.filter(n => !n.isRead));
    try {
      await Promise.all(readIds.map(id =>
        fetch(`/api/notifications/${id}`, { method: "DELETE" })
      ));
      showToast(`${readIds.length} notification${readIds.length > 1 ? "s" : ""} cleared.`);
    } catch { /* silent */ }
  };

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = notifications.filter(n => {
    if (filter === "all")    return true;
    if (filter === "unread") return !n.isRead;
    return getNotificationMeta(n.type).category === filter;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const readCount   = notifications.filter(n => n.isRead).length;

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-sm px-4 py-3 rounded-xl shadow-xl animate-fade-in">
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            Notifications
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center h-6 min-w-[24px] px-1.5 bg-[#7A1B0F] text-white text-xs font-bold rounded-full">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
              : "You're all caught up"}
          </p>
        </div>

        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition"
            >
              <Icons.CheckAll /> Mark all read
            </button>
          )}
          {readCount > 0 && (
            <button
              onClick={clearAllRead}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition"
            >
              <Icons.Trash /> Clear read
            </button>
          )}
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: "Total",  value: notifications.length, color: "bg-slate-100 text-slate-700"    },
          { label: "Unread", value: unreadCount,          color: "bg-[#7A1B0F]/10 text-[#7A1B0F]"  },
          { label: "Read",   value: readCount,            color: "bg-emerald-100 text-emerald-700" },
        ].map(p => (
          <div key={p.label} className={`${p.color} px-4 py-2 rounded-xl text-sm font-medium`}>
            <span className="font-bold">{p.value}</span> {p.label}
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 flex-wrap">
        {FILTER_TABS.map(tab => {
          const count =
            tab.key === "all"    ? notifications.length :
            tab.key === "unread" ? unreadCount :
            notifications.filter(n => getNotificationMeta(n.type).category === tab.key).length;

          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                filter === tab.key
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  filter === tab.key ? "bg-[#7A1B0F]/10 text-[#7A1B0F]" : "bg-slate-200 text-slate-500"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 animate-pulse flex gap-4">
              <div className="w-10 h-10 bg-slate-200 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-48" />
                <div className="h-3 bg-slate-100 rounded w-full" />
                <div className="h-3 bg-slate-100 rounded w-24" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-20 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Icons.Bell />
            </div>
            <p className="text-slate-600 font-semibold">No notifications here</p>
            <p className="text-slate-400 text-sm mt-1">
              {filter === "unread"
                ? "Nothing unread — you're all caught up!"
                : "No notifications in this category yet."}
            </p>
          </div>
        ) : (
          filtered.map(n => {
            const meta = getNotificationMeta(n.type);
            return (
              <div
                key={n._id}
                className={`relative bg-white rounded-2xl border shadow-sm p-5 flex gap-4 transition group ${
                  n.isRead ? "border-slate-100" : "border-[#7A1B0F]/30 bg-[#7A1B0F]/5"
                }`}
              >
                {/* Unread dot */}
                {!n.isRead && (
                  <span className="absolute top-5 right-5 w-2 h-2 bg-[#7A1B0F] rounded-full" />
                )}

                {/* Icon */}
                <div className={`w-10 h-10 ${meta.bg} rounded-xl flex items-center justify-center ${meta.accent} flex-shrink-0 mt-0.5`}>
                  {meta.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-6">
                  <p className={`text-sm font-semibold ${n.isRead ? "text-slate-700" : "text-slate-900"}`}>
                    {n.title}
                  </p>
                  <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">
                    {n.message}
                  </p>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <p className="text-xs text-slate-400">{timeAgo(n.createdAt)}</p>
                    {n.link && (
                      <a
                        href={n.link}
                        className="text-xs text-[#7A1B0F] hover:opacity-80 flex items-center gap-1 font-medium"
                      >
                        <Icons.Link /> View →
                      </a>
                    )}
                  </div>
                </div>

                {/* Actions — visible on hover */}
                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  {!n.isRead && (
                    <button
                      onClick={() => markRead(n._id)}
                      title="Mark as read"
                      className="p-1.5 text-slate-400 hover:text-[#7A1B0F] hover:bg-[#7A1B0F]/10 rounded-lg transition"
                    >
                      <Icons.Check />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(n._id)}
                    disabled={deleting === n._id}
                    title="Delete"
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                  >
                    <Icons.Trash />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}