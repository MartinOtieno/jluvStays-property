"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";

// ─── Types ───────────────────────────────────────────────────────────────────

type StaffPosition =
  | "property_manager"
  | "receptionist"
  | "caretaker"
  | "accountant"
  | "security"
  | "maintenance";

// ─── Icons ───────────────────────────────────────────────────────────────────

const Icon = {
  Overview: () => (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  Bookings: () => (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" strokeLinecap="round" />
    </svg>
  ),
  Rooms: () => (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  ),
  Viewings: () => (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  CheckIn: () => (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" />
    </svg>
  ),
  Profile: () => (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20v-1a8 8 0 0116 0v1" />
    </svg>
  ),
  Notifications: () => (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  ),
  Contacts: () => (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  SignOut: () => (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  ),
  Menu: () => (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M3 12h18M3 6h18M3 18h18" />
    </svg>
  ),
  Close: () => (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),
};

// ─── Navigation config ────────────────────────────────────────────────────────

const NAV_SECTIONS = [
  {
    title: "Main",
    items: [
      {
        label: "Overview",
        href: "/staff",
        icon: <Icon.Overview />,
        allowedPositions: [
          "property_manager", "receptionist", "caretaker",
          "accountant", "security", "maintenance",
        ] as StaffPosition[],
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        label: "Bookings",
        href: "/staff/bookings",
        icon: <Icon.Bookings />,
        allowedPositions: ["property_manager", "receptionist", "accountant"] as StaffPosition[],
      },
      {
        label: "Check-in / Check-out",
        href: "/staff/checkin",
        icon: <Icon.CheckIn />,
        allowedPositions: ["property_manager", "receptionist"] as StaffPosition[],
      },
      {
        label: "Rooms",
        href: "/staff/rooms",
        icon: <Icon.Rooms />,
        allowedPositions: ["property_manager", "caretaker", "maintenance"] as StaffPosition[],
      },
      {
        label: "Viewing Requests",
        href: "/staff/viewings",
        icon: <Icon.Viewings />,
        allowedPositions: ["property_manager", "receptionist"] as StaffPosition[],
      },
    ],
  },
  {
    title: "Communication",
    items: [
      {
        label: "Notifications",
        href: "/staff/notifications",
        icon: <Icon.Notifications />,
        allowedPositions: [
          "property_manager", "receptionist", "caretaker",
          "accountant", "security", "maintenance",
        ] as StaffPosition[],
      },
      {
        label: "Contacts",
        href: "/staff/contacts",
        icon: <Icon.Contacts />,
        allowedPositions: [
          "property_manager", "receptionist", "caretaker",
          "accountant", "security", "maintenance",
        ] as StaffPosition[],
      },
    ],
  },
  {
    title: "Account",
    items: [
      {
        label: "My Profile",
        href: "/staff/profile",
        icon: <Icon.Profile />,
        allowedPositions: [
          "property_manager", "receptionist", "caretaker",
          "accountant", "security", "maintenance",
        ] as StaffPosition[],
      },
    ],
  },
];

// ─── Position display meta ────────────────────────────────────────────────────

const POSITION_META: Record<StaffPosition, { label: string; color: string }> = {
  property_manager: { label: "Property Manager", color: "bg-emerald-500" },
  receptionist:     { label: "Receptionist",     color: "bg-violet-500"  },
  caretaker:        { label: "Caretaker",        color: "bg-amber-500"   },
  accountant:       { label: "Accountant",       color: "bg-rose-500"    },
  security:         { label: "Security",         color: "bg-slate-500"   },
  maintenance:      { label: "Maintenance",      color: "bg-orange-500"  },
};

const STAFF_POSITIONS = Object.keys(POSITION_META) as StaffPosition[];

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router   = useRouter();
  const pathname = usePathname();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCounts, setPendingCounts] = useState({
    bookings: 0,
    viewings: 0,
    notifications: 0,
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const userRole = (session?.user as { role?: string })?.role ?? "";
  const userId   = (session?.user as { id?: string })?.id ?? "";
  const isStaff  = STAFF_POSITIONS.includes(userRole as StaffPosition);
  const position = userRole as StaffPosition;
  const posMeta  = POSITION_META[position] ?? POSITION_META.receptionist;

  // Auth guard
  useEffect(() => {
    if (!mounted) return;
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated" && !isStaff) {
      router.push(userRole === "admin" ? "/admin" : "/");
    }
  }, [mounted, status, isStaff, userRole, router]);

  // ── Fetch pending badge counts (bookings, viewings, notifications) ────────
  useEffect(() => {
    if (status !== "authenticated" || !isStaff || !userId) return;

    const load = async () => {
      try {
        const [bRes, vRes, nRes] = await Promise.all([
          fetch("/api/bookings"),
          fetch("/api/viewing-request"),
          fetch(`/api/notifications?userId=${userId}&unreadOnly=true`),
        ]);
        const b = await bRes.json();
        const v = await vRes.json();
        const n = await nRes.json();

        setPendingCounts({
          bookings: b.success
            ? b.data.filter((x: { status: string }) => x.status === "pending").length
            : 0,
          viewings: v.success
            ? v.data.filter((x: { status: string }) => x.status === "pending").length
            : 0,
          notifications: n.success ? n.unreadCount : 0,
        });
      } catch { /* silent */ }
    };

    load();
    const iv = setInterval(load, 60_000);
    return () => clearInterval(iv);
  }, [status, isStaff, userId]);

  const badges: Record<string, number> = {
    "/staff/bookings":      pendingCounts.bookings,
    "/staff/viewings":      pendingCounts.viewings,
    "/staff/notifications": pendingCounts.notifications,
  };

  // Loading / SSR shell
  if (!mounted || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (!isStaff) return null;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            Jluv
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-none">
              Jluv<span className="text-violet-400">Stays</span>
            </h1>
            <p className="text-slate-500 text-[10px] mt-0.5 uppercase tracking-wider">Staff Portal</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {NAV_SECTIONS.map((section) => {
          const visible = section.items.filter(item =>
            item.allowedPositions.includes(position)
          );
          if (visible.length === 0) return null;
          return (
            <div key={section.title}>
              <p className="text-slate-600 text-[10px] font-semibold uppercase tracking-widest px-3 mb-1.5">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {visible.map((item) => {
                  const isActive = item.href === "/staff"
                    ? pathname === "/staff"
                    : pathname.startsWith(item.href);
                  const badge = badges[item.href];
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                        ${isActive
                          ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20"
                          : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                        }
                      `}
                    >
                      <span className={`flex-shrink-0 ${isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300"}`}>
                        {item.icon}
                      </span>
                      <span className="flex-1 truncate">{item.label}</span>
                      {badge != null && badge > 0 && (
                        <span className={`
                          flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center
                          ${isActive ? "bg-white/20 text-white" : "bg-violet-600 text-white"}
                        `}>
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 transition cursor-default mb-1">
          <div className={`w-8 h-8 ${posMeta.color} rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
            {session?.user?.name?.charAt(0).toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-200 text-sm font-medium truncate">{session?.user?.name}</p>
            <p className="text-slate-500 text-[11px]">{posMeta.label}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-slate-800 transition text-sm"
        >
          <Icon.SignOut />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-slate-950 flex-col fixed top-0 left-0 bottom-0 z-40">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-72 bg-slate-950 flex flex-col h-full z-50 shadow-2xl">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <Icon.Close />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Mobile topbar */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-600 hover:text-slate-900">
            <Icon.Menu />
          </button>
          <span className="font-semibold text-slate-800">
            Jluv<span className="text-violet-600">Stays</span>
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/staff/notifications"
              className="relative text-slate-500 hover:text-slate-800 p-1"
            >
              <Icon.Notifications />
              {pendingCounts.notifications > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {pendingCounts.notifications > 9 ? "9+" : pendingCounts.notifications}
                </span>
              )}
            </Link>
            {(pendingCounts.bookings + pendingCounts.viewings) > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {pendingCounts.bookings + pendingCounts.viewings}
              </span>
            )}
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}