"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const STAFF_POSITIONS = [
  "property_manager",
  "receptionist",
  "caretaker",
  "accountant",
  "security",
  "maintenance",
];

function getHomeRoute(role: string): string {
  if (role === "admin") return "/admin";
  if (STAFF_POSITIONS.includes(role)) return "/staff";
  return "/";
}

export default function UnauthorizedPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const role = (session?.user as { role?: string })?.role ?? "";
  const homeRoute = getHomeRoute(role);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center px-4">
      <div className="text-center max-w-md">

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
        </div>

        {/* Text */}
        <h1 className="text-3xl font-bold text-white mb-3">Access Denied</h1>
        <p className="text-slate-400 text-sm leading-relaxed mb-8">
          You do not have permission to view this page.
          {session?.user?.name && (
            <> This area is not available for your account, <span className="text-slate-300 font-medium">{session.user.name}</span>.</>
          )}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => router.back()}
            className="px-6 py-2.5 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white text-sm font-medium rounded-xl transition-all"
          >
            ← Go back
          </button>
          <button
            onClick={() => router.push(homeRoute)}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all"
          >
            Go to my dashboard
          </button>
        </div>

      </div>
    </div>
  );
}