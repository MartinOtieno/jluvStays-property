"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

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

// ─── Nav links (single source of truth for desktop + mobile) ─────────────────

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/listings", label: "Listings" },
  { href: "/gallery", label: "Gallery" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return "Just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function notifIcon(type: string) {
  if (type.startsWith("booking_confirmed"))  return "✅";
  if (type.startsWith("booking_cancelled"))  return "❌";
  if (type.startsWith("booking_pending"))    return "⏳";
  if (type.startsWith("viewing_approved"))   return "👁️";
  if (type.startsWith("viewing_rejected"))   return "🚫";
  if (type.startsWith("checkin"))            return "🏠";
  if (type.startsWith("checkout"))           return "🧳";
  if (type === "welcome")                    return "🎉";
  return "🔔";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Navbar() {
  const { data: session }   = useSession();
  const router              = useRouter();
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [bellOpen,     setBellOpen]     = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [notifLoading,  setNotifLoading]  = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellRef     = useRef<HTMLDivElement>(null);

  const userId = (session?.user as { id?: string })?.id;
  const photo  = (session?.user as { photo?: string })?.photo ?? "";
  const name   = session?.user?.name ?? "";

  // ── Close dropdowns on outside click ──────────────────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Fetch notifications ────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    setNotifLoading(true);
    try {
      const res  = await fetch(`/api/notifications?userId=${userId}`);
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data);
        setUnreadCount(data.unreadCount);
      }
    } catch { /* silent */ } finally {
      setNotifLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetchNotifications();
    // Poll every 60 seconds
    const iv = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(iv);
  }, [userId, fetchNotifications]);

  // ── Mark single as read ────────────────────────────────────────────────────
  const markRead = async (notif: Notification) => {
    if (!notif.isRead) {
      await fetch(`/api/notifications/${notif._id}`, { method: "PATCH" });
      setNotifications(prev =>
        prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(c => Math.max(0, c - 1));
    }
    if (notif.link) {
      setBellOpen(false);
      router.push(notif.link);
    }
  };

  // ── Mark all as read ───────────────────────────────────────────────────────
  const markAllRead = async () => {
    if (!userId || unreadCount === 0) return;
    await fetch("/api/notifications/mark-all-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  // ── Delete notification ────────────────────────────────────────────────────
  const deleteNotif = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    setNotifications(prev => prev.filter(n => n._id !== id));
    setUnreadCount(prev =>
      notifications.find(n => n._id === id && !n.isRead) ? Math.max(0, prev - 1) : prev
    );
  };

  const DROPDOWN_ITEMS = [
    {
      href: "/trips",
      label: "My Bookings",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      ),
    },
    {
      href: "/viewing-requests",
      label: "Viewing Requests",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ),
    },
    {
      href: "/profile",
      label: "My Profile",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20v-1a8 8 0 0116 0v1" />
        </svg>
      ),
    },
    {
      href: "/profile#password",
      label: "Change Password",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#7A1B0F] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">Jluv</span>
            </div>
            <span className="text-xl font-bold text-gray-900">
              Jluv<span className="text-[#7A1B0F]">Stays</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-600 hover:text-[#7A1B0F] font-medium transition"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-2">
            {session ? (
              <div className="flex items-center gap-2">

                {/* ── Notification Bell ── */}
                <div className="relative" ref={bellRef}>
                  <button
                    onClick={() => { setBellOpen(v => !v); setDropdownOpen(false); }}
                    className="relative w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:text-[#7A1B0F] hover:bg-[#7A1B0F]/10 transition"
                    aria-label="Notifications"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
                    </svg>
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Bell dropdown */}
                  {bellOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">

                      {/* Header */}
                      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-800 text-sm">Notifications</h3>
                          {unreadCount > 0 && (
                            <p className="text-xs text-gray-400">{unreadCount} unread</p>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllRead}
                            className="text-xs text-[#7A1B0F] hover:opacity-80 font-medium"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      {/* List */}
                      <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                        {notifLoading ? (
                          <div className="flex justify-center py-8">
                            <div className="w-5 h-5 border-2 border-[#7A1B0F] border-t-transparent rounded-full animate-spin" />
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="py-10 text-center">
                            <p className="text-2xl mb-2">🔔</p>
                            <p className="text-gray-400 text-sm">No notifications yet.</p>
                          </div>
                        ) : (
                          notifications.map(n => (
                            <div
                              key={n._id}
                              onClick={() => markRead(n)}
                              className={`flex gap-3 px-4 py-3.5 cursor-pointer hover:bg-gray-50 transition group relative ${
                                !n.isRead ? "bg-[#7A1B0F]/10" : ""
                              }`}
                            >
                              {/* Icon */}
                              <div className="text-xl flex-shrink-0 mt-0.5">
                                {notifIcon(n.type)}
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm leading-snug ${!n.isRead ? "font-semibold text-gray-800" : "font-medium text-gray-700"}`}>
                                  {n.title}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                  {n.message}
                                </p>
                                <p className="text-[11px] text-gray-400 mt-1">
                                  {timeAgo(n.createdAt)}
                                </p>
                              </div>

                              {/* Unread dot */}
                              {!n.isRead && (
                                <div className="w-2 h-2 rounded-full bg-[#7A1B0F] flex-shrink-0 mt-1.5" />
                              )}

                              {/* Delete button */}
                              <button
                                onClick={e => deleteNotif(e, n._id)}
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition p-1 rounded"
                                aria-label="Delete notification"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Footer */}
                      {notifications.length > 0 && (
                        <div className="border-t border-gray-100 px-4 py-2.5 text-center">
                          <Link
                            href="/notifications"
                            onClick={() => setBellOpen(false)}
                            className="text-xs text-[#7A1B0F] hover:opacity-80 font-medium"
                          >
                            View all notifications →
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Avatar + Dropdown ── */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => { setDropdownOpen(v => !v); setBellOpen(false); }}
                    className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-full border border-gray-200 hover:border-[#7A1B0F] hover:shadow-sm transition-all duration-150 bg-white"
                  >
                    {photo ? (
                      <Image src={photo} alt={name} width={32} height={32} className="w-8 h-8 rounded-full object-cover ring-2 ring-[#7A1B0F]/30" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#7A1B0F] flex items-center justify-center text-white text-sm font-bold ring-2 ring-[#7A1B0F]/30">
                        {name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm font-medium text-gray-700 max-w-[100px] truncate">
                      {name.split(" ")[0]}
                    </span>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Avatar dropdown */}
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
                      {/* User info */}
                      <div className="px-4 py-3.5 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
                        {photo ? (
                          <Image src={photo} alt={name} width={36} height={36} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-[#7A1B0F] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                            {name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{name}</p>
                          <p className="text-xs text-gray-400 truncate">{session.user?.email}</p>
                        </div>
                      </div>

                      {/* Menu items */}
                      <div className="py-1.5">
                        {DROPDOWN_ITEMS.map(item => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-[#7A1B0F]/10 hover:text-[#7A1B0F] transition-colors"
                          >
                            <span className="text-gray-400">{item.icon}</span>
                            {item.label}
                          </Link>
                        ))}
                      </div>

                      {/* Sign out */}
                      <div className="border-t border-gray-100 py-1.5">
                        <button
                          onClick={() => signOut({ callbackUrl: "/" })}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <Link href="/login"    className="px-4 py-2 text-sm text-gray-700 hover:text-[#7A1B0F] font-medium transition">Sign In</Link>
                <Link href="/register" className="px-4 py-2 text-sm bg-[#7A1B0F] hover:opacity-90 text-white font-medium rounded-lg transition">My Account</Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* ── Mobile Menu ── */}
        {menuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100 space-y-1">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block text-gray-600 hover:text-[#7A1B0F] py-2.5 px-2 font-medium rounded-lg hover:bg-gray-50 transition"
              >
                {link.label}
              </Link>
            ))}

            {session ? (
              <>
                {/* Mobile user info */}
                <div className="flex items-center gap-3 px-2 py-3 mt-1 border-t border-gray-100">
                  {photo ? (
                    <Image src={photo} alt={name} width={40} height={40} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#7A1B0F] flex items-center justify-center text-white font-bold">
                      {name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{name}</p>
                    <p className="text-xs text-gray-400">{session.user?.email}</p>
                  </div>
                  {/* Mobile notification badge */}
                  {unreadCount > 0 && (
                    <Link
                      href="/notifications"
                      onClick={() => setMenuOpen(false)}
                      className="ml-auto flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-500 rounded-full text-xs font-bold"
                    >
                      🔔 {unreadCount} new
                    </Link>
                  )}
                </div>

                {DROPDOWN_ITEMS.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 text-gray-600 hover:text-[#7A1B0F] py-2.5 px-2 font-medium rounded-lg hover:bg-gray-50 transition"
                  >
                    <span className="text-gray-400">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}

                <Link
                  href="/notifications"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 text-gray-600 hover:text-[#7A1B0F] py-2.5 px-2 font-medium rounded-lg hover:bg-gray-50 transition"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
                  </svg>
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Link>

                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="w-full flex items-center gap-3 text-red-500 py-2.5 px-2 font-medium rounded-lg hover:bg-red-50 transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              </>
            ) : (
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <Link href="/login"    onClick={() => setMenuOpen(false)} className="block text-gray-600 hover:text-[#7A1B0F] py-2.5 px-2 font-medium rounded-lg hover:bg-gray-50 transition">Sign In</Link>
                <Link href="/register" onClick={() => setMenuOpen(false)} className="block py-2.5 px-4 bg-[#7A1B0F] text-white rounded-lg font-medium text-center hover:opacity-90 transition">My Account</Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}