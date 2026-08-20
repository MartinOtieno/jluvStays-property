// room-booking/app/(pages)/admin/layout.tsx

"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { STAFF_POSITIONS, type StaffPosition } from "@/lib/roles";

// ─── Types ───────────────────────────────────────────────────────────────────

type StaffRole = "admin" | StaffPosition;

// ─── SVG Icons ───────────────────────────────────────────────────────────────

const Icon = {
  Overview: () => (
    <svg
      width="18"
      height="18"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),

  Units: () => (
    <svg
      width="18"
      height="18"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path d="M4 21V7l8-4 8 4v14" />
      <path d="M9 21v-6h6v6M4 11h16" />
    </svg>
  ),

  Rooms: () => (
    <svg
      width="18"
      height="18"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  ),

  Bookings: () => (
    <svg
      width="18"
      height="18"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <path
        d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"
        strokeLinecap="round"
      />
    </svg>
  ),

  // ─── Check-in / Check-out icon ────────────────────────────────────────────
  CheckInOut: () => (
    <svg
      width="18"
      height="18"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path d="M9 5H5a2 2 0 00-2 2v10a2 2 0 002 2h4" />
      <path d="M13 8l4 4-4 4" />
      <path d="M17 12H9" />
      <path d="M19 3h2a2 2 0 012 2v14a2 2 0 01-2 2h-2" />
    </svg>
  ),

  Viewings: () => (
    <svg
      width="18"
      height="18"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),

  Users: () => (
    <svg
      width="18"
      height="18"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <circle cx="9" cy="7" r="4" />
      <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
      <path d="M16 3.13a4 4 0 010 7.75M21 21v-2a4 4 0 00-3-3.87" />
    </svg>
  ),

  Staff: () => (
    <svg
      width="18"
      height="18"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20v-1a6 6 0 016-6h4a6 6 0 016 6v1" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),

  Reports: () => (
    <svg
      width="18"
      height="18"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  ),

  Settings: () => (
    <svg
      width="18"
      height="18"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 00/9 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),

  Notifications: () => (
    <svg
      width="18"
      height="18"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  ),

  Contacts: () => (
    <svg
      width="18"
      height="18"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  ),

  Profile: () => (
    <svg
      width="18"
      height="18"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20v-1a8 8 0 0116 0v1" />
    </svg>
  ),

  SignOut: () => (
    <svg
      width="16"
      height="16"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  ),

  Menu: () => (
    <svg
      width="20"
      height="20"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M3 12h18M3 6h18M3 18h18" />
    </svg>
  ),

  Close: () => (
    <svg
      width="20"
      height="20"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),
};

// ─── Navigation configuration ────────────────────────────────────────────────

const NAV_SECTIONS = [
  {
    title: "Main",
    items: [
      {
        label: "Overview",
        href: "/admin",
        icon: <Icon.Overview />,
        allowedRoles: ["admin", ...STAFF_POSITIONS] as StaffRole[],
      },
    ],
  },

  {
    title: "Management",
    items: [
      {
        label: "Units",
        href: "/admin/units",
        icon: <Icon.Units />,
        allowedRoles: [
          "admin",
          "property_manager",
          "caretaker",
        ] as StaffRole[],
      },

      {
        label: "Rooms",
        href: "/admin/rooms",
        icon: <Icon.Rooms />,
        allowedRoles: [
          "admin",
          "property_manager",
          "caretaker",
        ] as StaffRole[],
      },

      {
        label: "Bookings",
        href: "/admin/bookings",
        icon: <Icon.Bookings />,
        allowedRoles: [
          "admin",
          "property_manager",
          "receptionist",
          "accountant",
        ] as StaffRole[],
      },

      // ─── NEW: Check-in / Check-out ────────────────────────────────────────
      {
        label: "Check-in / Check-out",
        href: "/admin/check-in-out",
        icon: <Icon.CheckInOut />,
        allowedRoles: [
          "admin",
          "property_manager",
          "receptionist",
        ] as StaffRole[],
      },

      {
        label: "Viewing Requests",
        href: "/admin/viewing-requests",
        icon: <Icon.Viewings />,
        allowedRoles: [
          "admin",
          "property_manager",
          "receptionist",
        ] as StaffRole[],
      },

      {
        label: "Users",
        href: "/admin/users",
        icon: <Icon.Users />,
        allowedRoles: [
          "admin",
          "property_manager",
        ] as StaffRole[],
      },

      {
        label: "Staff",
        href: "/admin/staff",
        icon: <Icon.Staff />,
        allowedRoles: ["admin"] as StaffRole[],
      },
    ],
  },

  {
    title: "System",
    items: [
      {
        label: "Reports",
        href: "/admin/reports",
        icon: <Icon.Reports />,
        allowedRoles: [
          "admin",
          "property_manager",
          "accountant",
        ] as StaffRole[],
      },

      {
        label: "Property Settings",
        href: "/admin/settings",
        icon: <Icon.Settings />,
        allowedRoles: ["admin"] as StaffRole[],
      },

      {
        label: "Contacts",
        href: "/admin/contacts",
        icon: <Icon.Contacts />,
        allowedRoles: [
          "admin",
          "property_manager",
          "receptionist",
        ] as StaffRole[],
      },

      {
        label: "Notifications",
        href: "/admin/notifications",
        icon: <Icon.Notifications />,
        allowedRoles: [
          "admin",
          "property_manager",
          "receptionist",
        ] as StaffRole[],
      },

      {
        label: "My Profile",
        href: "/admin/profile",
        icon: <Icon.Profile />,
        allowedRoles: [
          "admin",
          ...STAFF_POSITIONS,
        ] as StaffRole[],
      },
    ],
  },
];

// ─── Role metadata ───────────────────────────────────────────────────────────

const ROLE_META: Record<
  StaffRole,
  { label: string; color: string }
> = {
  admin: {
    label: "Administrator",
    color: "bg-[#7A1B0F]",
  },

  property_manager: {
    label: "Property Manager",
    color: "bg-emerald-500",
  },

  receptionist: {
    label: "Receptionist",
    color: "bg-violet-500",
  },

  caretaker: {
    label: "Caretaker",
    color: "bg-amber-500",
  },

  accountant: {
    label: "Accountant",
    color: "bg-rose-500",
  },

  security: {
    label: "Security",
    color: "bg-slate-500",
  },

  maintenance: {
    label: "Maintenance",
    color: "bg-orange-500",
  },
};

// ─── Layout ──────────────────────────────────────────────────────────────────

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();

  const router = useRouter();
  const pathname = usePathname();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [pendingCounts, setPendingCounts] = useState({
    bookings: 0,
    viewings: 0,
    notifications: 0,
    contacts: 0,
  });

  // ─── Mounted ──────────────────────────────────────────────────────────────

  useEffect(() => {
    setMounted(true);
  }, []);

  // ─── Current user ─────────────────────────────────────────────────────────

  const userRole =
    (session?.user as { role?: StaffRole })?.role ??
    "receptionist";

  const userId =
    (session?.user as { id?: string })?.id ?? "";

  const userPhoto =
    (session?.user as { photo?: string })?.photo ?? "";

  const roleMeta =
    ROLE_META[userRole] ?? ROLE_META.receptionist;

  // ─── Authentication guard ─────────────────────────────────────────────────

  useEffect(() => {
    if (!mounted) return;

    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (
      status === "authenticated" &&
      !Object.keys(ROLE_META).includes(userRole)
    ) {
      router.push("/");
    }
  }, [
    mounted,
    status,
    session,
    router,
    userRole,
  ]);

  // ─── Fetch badge counts ───────────────────────────────────────────────────

  useEffect(() => {
    if (
      status !== "authenticated" ||
      !userId
    ) {
      return;
    }

    const fetchCounts = async () => {
      try {
        const [
          bookingsRes,
          viewingsRes,
          notifRes,
          contactsRes,
        ] = await Promise.all([
          fetch("/api/bookings"),
          fetch("/api/viewing-request"),
          fetch(
            `/api/notifications?userId=${userId}&unreadOnly=true`
          ),
          fetch("/api/contact?status=unread"),
        ]);

        const bookings = await bookingsRes.json();
        const viewings = await viewingsRes.json();
        const notifs = await notifRes.json();
        const contacts = await contactsRes.json();

        setPendingCounts({
          bookings: bookings.success
            ? bookings.data.filter(
                (b: { status: string }) =>
                  b.status === "pending"
              ).length
            : 0,

          viewings: viewings.success
            ? viewings.data.filter(
                (v: { status: string }) =>
                  v.status === "pending"
              ).length
            : 0,

          notifications: notifs.success
            ? notifs.unreadCount
            : 0,

          contacts: contacts.success
            ? contacts.messages.length
            : 0,
        });
      } catch {
        // Keep previous counts if request fails.
      }
    };

    fetchCounts();

    const interval = setInterval(
      fetchCounts,
      60_000
    );

    return () => clearInterval(interval);
  }, [status, userId]);

  // ─── Badge map ────────────────────────────────────────────────────────────

  const badges: Record<string, number> = {
    "/admin/bookings":
      pendingCounts.bookings,

    "/admin/viewing-requests":
      pendingCounts.viewings,

    "/admin/notifications":
      pendingCounts.notifications,

    "/admin/contacts":
      pendingCounts.contacts,
  };

  // ─── Loading screen ───────────────────────────────────────────────────────

  if (
    !mounted ||
    status === "loading"
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#7A1B0F] border-t-transparent rounded-full animate-spin" />

          <p className="text-slate-400 text-sm">
            Loading dashboard…
          </p>
        </div>
      </div>
    );
  }

  if (
    !Object.keys(ROLE_META).includes(userRole)
  ) {
    return null;
  }

  // ─── Sidebar ──────────────────────────────────────────────────────────────

  const SidebarContent = () => (
    <div className="flex flex-col h-full">

      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">

          <div className="w-8 h-8 bg-[#7A1B0F] rounded-lg flex items-center justify-center text-white font-bold text-sm">
            Jluv
          </div>

          <div>
            <h1 className="text-white font-bold text-base leading-none">
              Jluv
              <span className="text-[#7A1B0F]/70">
                Stays
              </span>
            </h1>

            <p className="text-slate-500 text-[10px] mt-0.5 uppercase tracking-wider">
              Dashboard
            </p>
          </div>

        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">

        {NAV_SECTIONS.map((section) => {

          const visibleItems =
            section.items.filter((item) =>
              item.allowedRoles.includes(
                userRole as StaffRole
              )
            );

          if (visibleItems.length === 0) {
            return null;
          }

          return (
            <div key={section.title}>

              <p className="text-slate-600 text-[10px] font-semibold uppercase tracking-widest px-3 mb-1.5">
                {section.title}
              </p>

              <div className="space-y-0.5">

                {visibleItems.map((item) => {

                  const isActive =
                    item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname.startsWith(
                          item.href
                        );

                  const badge =
                    badges[item.href];

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() =>
                        setSidebarOpen(false)
                      }
                      className={`
                        group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                        ${
                          isActive
                            ? "bg-[#7A1B0F] text-white shadow-lg shadow-[#7A1B0F]/20"
                            : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                        }
                      `}
                    >

                      <span
                        className={`flex-shrink-0 ${
                          isActive
                            ? "text-white"
                            : "text-slate-500 group-hover:text-slate-300"
                        }`}
                      >
                        {item.icon}
                      </span>

                      <span className="flex-1 truncate">
                        {item.label}
                      </span>

                      {badge != null &&
                        badge > 0 && (
                          <span
                            className={`
                              flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center
                              ${
                                isActive
                                  ? "bg-white/20 text-white"
                                  : "bg-[#7A1B0F] text-white"
                              }
                            `}
                          >
                            {badge > 99
                              ? "99+"
                              : badge}
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

        <Link
          href="/admin/profile"
          onClick={() =>
            setSidebarOpen(false)
          }
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 transition mb-1"
        >

          {userPhoto ? (
            <Image
              src={userPhoto}
              alt={
                session?.user?.name ??
                "Profile"
              }
              width={32}
              height={32}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div
              className={`w-8 h-8 ${roleMeta.color} rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
            >
              {session?.user?.name
                ?.charAt(0)
                .toUpperCase() ?? "?"}
            </div>
          )}

          <div className="flex-1 min-w-0">

            <p className="text-slate-200 text-sm font-medium truncate">
              {session?.user?.name}
            </p>

            <p className="text-slate-500 text-[11px]">
              {roleMeta.label}
            </p>

          </div>

        </Link>

        <button
          onClick={() =>
            signOut({
              callbackUrl: "/",
            })
          }
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-slate-800 transition text-sm"
        >
          <Icon.SignOut />
          <span>Sign out</span>
        </button>

      </div>
    </div>
  );

  // ─── Page ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 flex">

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-slate-950 flex-col fixed top-0 left-0 bottom-0 z-40">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">

          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() =>
              setSidebarOpen(false)
            }
          />

          <aside className="relative w-72 bg-slate-950 flex flex-col h-full z-50 shadow-2xl">

            <button
              onClick={() =>
                setSidebarOpen(false)
              }
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <Icon.Close />
            </button>

            <SidebarContent />

          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">

        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">

          <button
            onClick={() =>
              setSidebarOpen(true)
            }
            className="text-slate-600 hover:text-slate-900"
          >
            <Icon.Menu />
          </button>

          <span className="font-semibold text-slate-800">
            Jluv
            <span className="text-[#7A1B0F]">
              Stays
            </span>
          </span>

          {(
            pendingCounts.bookings +
            pendingCounts.viewings +
            pendingCounts.notifications +
            pendingCounts.contacts
          ) > 0 && (
            <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {pendingCounts.bookings +
                pendingCounts.viewings +
                pendingCounts.notifications +
                pendingCounts.contacts}
            </span>
          )}

        </header>

        {/* Main content */}
        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>

      </div>
    </div>
  );
}