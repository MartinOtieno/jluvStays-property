"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// ── Types ────────────────────────────────────────────────────────────────────

type MessageStatus = "unread" | "read" | "resolved";

interface ContactMessage {
  _id:       string;
  name:      string;
  email:     string;
  phone?:    string;
  message:   string;
  status:    MessageStatus;
  createdAt: string;
  updatedAt: string;
}

interface MessagesResponse {
  success:  boolean;
  messages: ContactMessage[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<MessageStatus, { label: string; classes: string; dot: string }> = {
  unread:   { label: "Unread",   classes: "bg-blue-50  text-blue-700  border-blue-200",   dot: "bg-blue-500"   },
  read:     { label: "Read",     classes: "bg-slate-50 text-slate-600 border-slate-200",  dot: "bg-slate-400"  },
  resolved: { label: "Resolved", classes: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-KE", {
    weekday: "short", day: "numeric", month: "short",
    year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: MessageStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.classes}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ filter }: { filter: MessageStatus | "all" }) {
  const msgs: Record<string, { icon: string; heading: string; sub: string }> = {
    all:      { icon: "💬", heading: "No messages yet",       sub: "When visitors submit the contact form, their messages will appear here."       },
    unread:   { icon: "📭", heading: "No unread messages",    sub: "You're all caught up — every message has been opened."                         },
    read:     { icon: "📂", heading: "No read messages",      sub: "Messages you've opened will appear here."                                      },
    resolved: { icon: "✅", heading: "No resolved messages",  sub: "Mark messages as resolved once you've followed up with the sender."            },
  };
  const m = msgs[filter];
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <span className="text-5xl mb-4" aria-hidden="true">{m.icon}</span>
      <h3 className="text-base font-semibold text-slate-800 mb-1">{m.heading}</h3>
      <p className="text-sm text-slate-400 max-w-xs">{m.sub}</p>
    </div>
  );
}

// ── Message Detail Panel ──────────────────────────────────────────────────────

function MessagePanel({
  msg, onClose, onStatusChange, updating,
}: {
  msg:            ContactMessage;
  onClose:        () => void;
  onStatusChange: (id: string, status: MessageStatus) => void;
  updating:       boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm"
         onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 border-b border-slate-100">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
              <h2 className="text-base font-bold text-slate-900 truncate">{msg.name}</h2>
              <StatusBadge status={msg.status} />
            </div>
            <p className="text-xs text-slate-400">{formatDate(msg.createdAt)}</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Close"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Contact info */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-4">
          <a href={`mailto:${msg.email}`}
             className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
            {msg.email}
          </a>
          {msg.phone && (
            <a href={`tel:${msg.phone}`}
               className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
              </svg>
              {msg.phone}
            </a>
          )}
        </div>

        {/* Message body */}
        <div className="px-6 py-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Message</p>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{msg.message}</p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <p className="w-full text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Mark as</p>
          {(["unread", "read", "resolved"] as MessageStatus[]).map(s => (
            <button
              key={s}
              disabled={msg.status === s || updating}
              onClick={() => onStatusChange(msg._id, s)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all disabled:opacity-40 disabled:cursor-not-allowed
                ${msg.status === s
                  ? `${STATUS_CONFIG[s].classes} cursor-default`
                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-400"}`}
            >
              {STATUS_CONFIG[s].label}
            </button>
          ))}

          <a
            href={`mailto:${msg.email}?subject=Re: your message`}
            className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#1a3c6b] hover:bg-[#15325a] text-white transition-colors"
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
            </svg>
            Reply by Email
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function StaffContactMessages() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [messages,    setMessages]    = useState<ContactMessage[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [filter,      setFilter]      = useState<MessageStatus | "all">("all");
  const [search,      setSearch]      = useState("");
  const [selected,    setSelected]    = useState<ContactMessage | null>(null);
  const [updating,    setUpdating]    = useState(false);

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // ── Fetch messages ──────────────────────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const url = filter === "all"
        ? "/api/contact"
        : `/api/contact?status=${filter}`;
      const res  = await fetch(url);
      const data: MessagesResponse = await res.json();
      if (!res.ok) throw new Error("Failed to load messages");
      setMessages(data.messages);
    } catch {
      setError("Could not load messages. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  // ── Auto-mark as read when opened ──────────────────────────────────────────
  const openMessage = async (msg: ContactMessage) => {
    setSelected(msg);
    if (msg.status === "unread") {
      await handleStatusChange(msg._id, "read", false);
    }
  };

  // ── Update status ───────────────────────────────────────────────────────────
  const handleStatusChange = async (
    id: string,
    newStatus: MessageStatus,
    updateSelected = true,
  ) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/contact/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      setMessages(prev =>
        prev.map(m => m._id === id ? { ...m, status: newStatus } : m)
      );
      if (updateSelected && selected?._id === id) {
        setSelected(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch {
      // silently fail — the UI stays consistent
    } finally {
      setUpdating(false);
    }
  };

  // ── Derived counts ──────────────────────────────────────────────────────────
  const counts = {
    all:      messages.length,
    unread:   messages.filter(m => m.status === "unread").length,
    read:     messages.filter(m => m.status === "read").length,
    resolved: messages.filter(m => m.status === "resolved").length,
  };

  // ── Filtered + searched list ────────────────────────────────────────────────
  const visible = messages.filter(m => {
    const matchesFilter = filter === "all" || m.status === filter;
    const q = search.toLowerCase();
    const matchesSearch = !q || [m.name, m.email, m.phone ?? "", m.message]
      .some(v => v.toLowerCase().includes(q));
    return matchesFilter && matchesSearch;
  });

  if (status === "loading") return null;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f8f9fb]">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="bg-[#1a3c6b] px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <p className="text-[#7eb3f5] text-xs font-semibold tracking-widest uppercase mb-1">
            Staff Dashboard
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Contact Messages</h1>
          <p className="text-[#b8d0f0] text-sm mt-1">
            View and respond to enquiries submitted through the contact form.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* ── Stats row ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(["all", "unread", "read", "resolved"] as const).map(key => {
            const labels = { all: "Total", unread: "Unread", read: "Read", resolved: "Resolved" };
            const active = filter === key;
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`rounded-2xl border p-4 text-left transition-all focus:outline-none focus:ring-2 focus:ring-blue-300
                  ${active
                    ? "bg-[#1a3c6b] border-[#1a3c6b] text-white shadow-md"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"}`}
              >
                <p className={`text-2xl font-extrabold ${active ? "text-white" : "text-slate-900"}`}>
                  {loading ? "–" : counts[key]}
                </p>
                <p className={`text-xs font-semibold mt-0.5 ${active ? "text-blue-200" : "text-slate-400"}`}>
                  {labels[key]}
                </p>
                {key === "unread" && counts.unread > 0 && !active && (
                  <span className="mt-1.5 inline-block w-2 h-2 rounded-full bg-blue-500" />
                )}
              </button>
            );
          })}
        </div>

        {/* ── Search + refresh ───────────────────────────────────────────── */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                 width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="search"
              placeholder="Search by name, email, or message…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-slate-900 bg-white border-2 border-slate-200 placeholder:text-slate-400
                         focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition"
            />
          </div>
          <button
            onClick={fetchMessages}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-white border-2 border-slate-200 text-slate-600
                       hover:border-slate-300 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <svg className={loading ? "animate-spin" : ""} width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Refresh
          </button>
        </div>

        {/* ── Message list ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 m-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="shrink-0">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
              <button onClick={fetchMessages} className="ml-auto text-red-600 underline font-semibold text-xs">Retry</button>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && !error && (
            <ul className="divide-y divide-slate-100">
              {[1, 2, 3, 4, 5].map(i => (
                <li key={i} className="px-5 py-4 flex items-start gap-4 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-slate-100 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-3">
                      <div className="h-3 bg-slate-100 rounded w-28" />
                      <div className="h-3 bg-slate-100 rounded w-16" />
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded w-3/4" />
                    <div className="h-2.5 bg-slate-100 rounded w-1/2" />
                  </div>
                  <div className="h-5 w-16 bg-slate-100 rounded-full shrink-0" />
                </li>
              ))}
            </ul>
          )}

          {/* Empty state */}
          {!loading && !error && visible.length === 0 && (
            <EmptyState filter={filter} />
          )}

          {/* Message rows */}
          {!loading && !error && visible.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {visible.map(msg => (
                <li
                  key={msg._id}
                  onClick={() => openMessage(msg)}
                  className={`group flex items-start gap-4 px-5 py-4 cursor-pointer transition-colors
                    hover:bg-slate-50 ${msg.status === "unread" ? "bg-blue-50/40" : ""}`}
                >
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5
                    ${msg.status === "unread"
                      ? "bg-[#1a3c6b] text-white"
                      : "bg-slate-100 text-slate-500"}`}>
                    {msg.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-sm font-semibold truncate ${msg.status === "unread" ? "text-slate-900" : "text-slate-700"}`}>
                        {msg.name}
                      </span>
                      {msg.status === "unread" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" aria-label="Unread" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate mb-1">{msg.email}</p>
                    <p className={`text-sm truncate ${msg.status === "unread" ? "text-slate-700 font-medium" : "text-slate-400"}`}>
                      {msg.message}
                    </p>
                  </div>

                  {/* Right side */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-xs text-slate-400">{timeAgo(msg.createdAt)}</span>
                    <StatusBadge status={msg.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Footer count */}
          {!loading && visible.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400">
              Showing {visible.length} of {messages.length} message{messages.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>

      {/* ── Detail panel ─────────────────────────────────────────────────── */}
      {selected && (
        <MessagePanel
          msg={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
          updating={updating}
        />
      )}
    </div>
  );
}