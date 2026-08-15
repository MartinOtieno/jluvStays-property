// lib/roles.ts

// Single source of truth for staff sub-positions. Imported by
// middleware.ts (page-level route protection) and any API route that
// needs the same role check (e.g. app/api/units/route.ts) — update
// this one place rather than the list in multiple files.
export const STAFF_POSITIONS = [
  "property_manager",
  "receptionist",
  "caretaker",
  "accountant",
  "security",
  "maintenance",
] as const;

export type StaffPosition = (typeof STAFF_POSITIONS)[number];

export type UserRole = "admin" | StaffPosition | "tenant";

export function isStaff(role: string): role is StaffPosition {
  return (STAFF_POSITIONS as readonly string[]).includes(role);
}

export function isAdminOrStaff(role: string): boolean {
  return role === "admin" || isStaff(role);
}