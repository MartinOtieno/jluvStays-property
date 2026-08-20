"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface StaffProfile {
  _id: string;
  user: string;
  employeeNumber: string;
  position: string;
  department?: string;
  hireDate?: string;
  salary?: number;
  isActive?: boolean;
}

interface SessionUser {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  photo?: string;
}

interface PendingCounts {
  bookings: number;
  viewings: number;
  notifications: number;
  contacts: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG Icons
// ─────────────────────────────────────────────────────────────────────────────

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

  CheckIn: () => (
    <svg
      width="18"
      height="18"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
      <path d="M10 17l5-5-5-5M15 12H3" />
    </svg>
  ),

  // Users: () => (
  //   <svg
  //     width="18"
  //     height="18"
  //     fill="none"
  //     viewBox="0 0 24 24"
  //     stroke="currentColor"
  //     strokeWidth={1.8}
  //   >
  //     <circle cx="9" cy="7" r="4" />
  //     <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
  //     <path d="M16 3.13a4 4 0 010 7.75M21 21v-2a4 4 0 00-3-3.87" />
  //   </svg>
  // ),

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

  Notifications: () => (
    <svg
      width="18"
      height="18"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
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
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
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

// ─────────────────────────────────────────────────────────────────────────────
// Navigation
// ─────────────────────────────────────────────────────────────────────────────

const NAV_SECTIONS = [
  {
    title: "Main",
    items: [
      {
        label: "Overview",
        href: "/staff",
        icon: <Icon.Overview />,
      },
    ],
  },

  {
    title: "Management",
    items: [
      {
        label: "Units",
        href: "/staff/units",
        icon: <Icon.Units />,
      },
      {
        label: "Rooms",
        href: "/staff/rooms",
        icon: <Icon.Rooms />,
      },
      {
        label: "Bookings",
        href: "/staff/bookings",
        icon: <Icon.Bookings />,
      },
      {
        label: "Check-in / Check-out",
        href: "/staff/checkin",
        icon: <Icon.CheckIn />,
      },
      {
        label: "Viewing Requests",
        href: "/staff/viewings",
        icon: <Icon.Viewings />,
      },
      // {
      //   label: "Users",
      //   href: "/staff/users",
      //   icon: <Icon.Users />,
      // },
    ],
  },

  {
    title: "System",
    items: [
      {
        label: "Reports",
        href: "/staff/reports",
        icon: <Icon.Reports />,
      },
      {
        label: "Contacts",
        href: "/staff/contacts",
        icon: <Icon.Contacts />,
      },
      {
        label: "Notifications",
        href: "/staff/notifications",
        icon: <Icon.Notifications />,
      },
      {
        label: "My Profile",
        href: "/staff/profile",
        icon: <Icon.Profile />,
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Layout
// ─────────────────────────────────────────────────────────────────────────────

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();

  const router = useRouter();
  const pathname = usePathname();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [staffProfile, setStaffProfile] =
    useState<StaffProfile | null>(null);

  const [pendingCounts, setPendingCounts] =
    useState<PendingCounts>({
      bookings: 0,
      viewings: 0,
      notifications: 0,
      contacts: 0,
    });

  // ─────────────────────────────────────────────────────────────────────────
  // Mounted
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    setMounted(true);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Session
  // ─────────────────────────────────────────────────────────────────────────

  const sessionUser =
    (session?.user as SessionUser | undefined) ?? {};

  const userRole = sessionUser.role ?? "";
  const userId = sessionUser.id ?? "";
  const userPhoto = sessionUser.photo ?? "";

  /**
   * IMPORTANT:
   *
   * User.role determines whether the user can enter the staff portal.
   *
   * StaffProfile.position is only the staff member's job title.
   */
  const isStaff = userRole === "staff";

  // ─────────────────────────────────────────────────────────────────────────
  // Load Staff Profile
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (
      status !== "authenticated" ||
      !userId ||
      !isStaff
    ) {
      return;
    }

    let cancelled = false;

    const loadStaffProfile = async () => {
      try {
        const response = await fetch(
          `/api/staff/profile?userId=${encodeURIComponent(userId)}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (
          !cancelled &&
          data?.success &&
          data?.data
        ) {
          setStaffProfile(data.data);
        }
      } catch (error) {
        console.error(
          "Failed to load staff profile:",
          error
        );
      }
    };

    loadStaffProfile();

    return () => {
      cancelled = true;
    };
  }, [status, userId, isStaff]);

  // ─────────────────────────────────────────────────────────────────────────
  // Authentication Guard
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!mounted) return;

    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }

    if (status === "authenticated" && !isStaff) {
      if (userRole === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/");
      }
    }
  }, [
    mounted,
    status,
    isStaff,
    userRole,
    router,
  ]);

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch Badges
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (
      status !== "authenticated" ||
      !isStaff ||
      !userId
    ) {
      return;
    }

    let cancelled = false;

    const fetchCounts = async () => {
      try {
        const [
          bookingsRes,
          viewingsRes,
          notificationsRes,
          contactsRes,
        ] = await Promise.all([
          fetch("/api/bookings", {
            cache: "no-store",
          }),

          fetch("/api/viewing-request", {
            cache: "no-store",
          }),

          fetch(
            `/api/notifications?userId=${encodeURIComponent(
              userId
            )}&unreadOnly=true`,
            {
              cache: "no-store",
            }
          ),

          fetch("/api/contact?status=unread", {
            cache: "no-store",
          }),
        ]);

        const [
          bookings,
          viewings,
          notifications,
          contacts,
        ] = await Promise.all([
          bookingsRes.json(),
          viewingsRes.json(),
          notificationsRes.json(),
          contactsRes.json(),
        ]);

        if (cancelled) return;

        const bookingCount =
          bookings?.success &&
          Array.isArray(bookings?.data)
            ? bookings.data.filter(
                (booking: { status?: string }) =>
                  booking.status === "pending"
              ).length
            : 0;

        const viewingCount =
          viewings?.success &&
          Array.isArray(viewings?.data)
            ? viewings.data.filter(
                (viewing: { status?: string }) =>
                  viewing.status === "pending"
              ).length
            : 0;

        const notificationCount =
          notifications?.success &&
          typeof notifications.unreadCount === "number"
            ? notifications.unreadCount
            : 0;

        const contactCount =
          contacts?.success &&
          Array.isArray(contacts?.messages)
            ? contacts.messages.length
            : 0;

        setPendingCounts({
          bookings: bookingCount,
          viewings: viewingCount,
          notifications: notificationCount,
          contacts: contactCount,
        });
      } catch (error) {
        console.error(
          "Failed to fetch dashboard counts:",
          error
        );
      }
    };

    fetchCounts();

    const interval = setInterval(
      fetchCounts,
      60_000
    );

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [status, isStaff, userId]);

  // ─────────────────────────────────────────────────────────────────────────
  // Badges
  // ─────────────────────────────────────────────────────────────────────────

  const badges: Record<string, number> = {
    "/staff/bookings":
      pendingCounts.bookings,

    "/staff/viewings":
      pendingCounts.viewings,

    "/staff/notifications":
      pendingCounts.notifications,

    "/staff/contacts":
      pendingCounts.contacts,
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Staff Position
  // ─────────────────────────────────────────────────────────────────────────

  const position =
    staffProfile?.position?.trim() ||
    "Staff Member";

  // ─────────────────────────────────────────────────────────────────────────
  // Total Notifications
  // ─────────────────────────────────────────────────────────────────────────

  const totalPending =
    pendingCounts.bookings +
    pendingCounts.viewings +
    pendingCounts.notifications +
    pendingCounts.contacts;

  // ─────────────────────────────────────────────────────────────────────────
  // Loading
  // ─────────────────────────────────────────────────────────────────────────

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

  // Prevent unauthorized content from flashing
  if (!isStaff) {
    return null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Sidebar
  // ─────────────────────────────────────────────────────────────────────────

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
              <span className="text-[#7A1B0F]">
                Stays
              </span>
            </h1>

            <p className="text-slate-500 text-[10px] mt-0.5 uppercase tracking-wider">
              Staff Portal
            </p>
          </div>

        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">

        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>

            <p className="text-slate-600 text-[10px] font-semibold uppercase tracking-widest px-3 mb-1.5">
              {section.title}
            </p>

            <div className="space-y-0.5">

              {section.items.map((item) => {
                const isActive =
                  item.href === "/staff"
                    ? pathname === "/staff"
                    : pathname.startsWith(
                        item.href
                      );

                const badge =
                  badges[item.href] ?? 0;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() =>
                      setSidebarOpen(false)
                    }
                    className={`
                      group flex items-center gap-3
                      px-3 py-2.5 rounded-xl
                      text-sm font-medium
                      transition-all duration-150

                      ${
                        isActive
                          ? "bg-[#7A1B0F] text-white shadow-lg shadow-[#7A1B0F]/20"
                          : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                      }
                    `}
                  >

                    <span
                      className={`
                        flex-shrink-0

                        ${
                          isActive
                            ? "text-white"
                            : "text-slate-500 group-hover:text-slate-300"
                        }
                      `}
                    >
                      {item.icon}
                    </span>

                    <span className="flex-1 truncate">
                      {item.label}
                    </span>

                    {badge > 0 && (
                      <span
                        className={`
                          flex-shrink-0
                          min-w-[20px]
                          h-5
                          px-1.5
                          rounded-full
                          text-[10px]
                          font-bold
                          flex
                          items-center
                          justify-center

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
        ))}

      </nav>

      {/* User Footer */}
      <div className="px-3 py-4 border-t border-slate-800">

        <Link
          href="/staff/profile"
          onClick={() =>
            setSidebarOpen(false)
          }
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 transition mb-1"
        >

          {/* Profile Photo */}
          {userPhoto ? (
            <Image
              src={userPhoto}
              alt={
                sessionUser.name ||
                "Profile"
              }
              width={32}
              height={32}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 bg-[#7A1B0F] rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {sessionUser.name
                ?.charAt(0)
                .toUpperCase() || "?"}
            </div>
          )}

          <div className="flex-1 min-w-0">

            <p className="text-slate-200 text-sm font-medium truncate">
              {sessionUser.name ||
                "Staff Member"}
            </p>

            <p className="text-slate-500 text-[11px] truncate">
              {position}
            </p>

          </div>

        </Link>

        {/* Sign Out */}
        <button
          type="button"
          onClick={() =>
            signOut({
              callbackUrl: "/login",
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

  // ─────────────────────────────────────────────────────────────────────────
  // Layout
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 flex">

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-slate-950 flex-col fixed top-0 left-0 bottom-0 z-40">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">

          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() =>
              setSidebarOpen(false)
            }
          />

          {/* Sidebar */}
          <aside className="relative w-72 bg-slate-950 flex flex-col h-full z-50 shadow-2xl">

            <button
              type="button"
              onClick={() =>
                setSidebarOpen(false)
              }
              className="absolute top-4 right-4 z-10 text-slate-400 hover:text-white"
              aria-label="Close menu"
            >
              <Icon.Close />
            </button>

            <SidebarContent />

          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">

        {/* Mobile Top Bar */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">

          <button
            type="button"
            onClick={() =>
              setSidebarOpen(true)
            }
            className="text-slate-600 hover:text-slate-900"
            aria-label="Open menu"
          >
            <Icon.Menu />
          </button>

          <span className="font-semibold text-slate-800">
            Jluv
            <span className="text-[#7A1B0F]">
              Stays
            </span>
          </span>

          {totalPending > 0 && (
            <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
              {totalPending > 99
                ? "99+"
                : totalPending}
            </span>
          )}

        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>

      </div>
    </div>
  );
}