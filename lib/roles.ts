// lib/roles.ts

/**
 * User roles
 *
 * These are the ONLY values used to determine access level.
 *
 * - admin  = full system access
 * - staff  = staff access
 * - tenant = tenant access
 *
 * A staff member's position is separate from their role and can
 * be freely assigned by the administrator.
 */

export const USER_ROLES = [
  "admin",
  "staff",
  "tenant",
] as const;

export type UserRole = (typeof USER_ROLES)[number];


/**
 * Legacy staff positions.
 *
 * Kept temporarily because some existing parts of the application
 * still import STAFF_POSITIONS.
 *
 * IMPORTANT:
 * These values are NOT used to determine whether somebody is staff.
 * The user's role must be "staff".
 *
 * New/custom positions do not need to be added here.
 */
export const STAFF_POSITIONS = [
  "property_manager",
  "receptionist",
  "caretaker",
  "accountant",
  "security",
  "maintenance",
] as const;

export type StaffPosition = (typeof STAFF_POSITIONS)[number];


/**
 * Check whether a user is staff.
 *
 * Staff position does NOT matter here.
 *
 * Example:
 *
 * role = "staff"
 * position = "Housekeeping Manager"
 *
 * isStaff("staff") === true
 */
export function isStaff(role: string): role is "staff" {
  return role === "staff";
}


/**
 * Check whether a user is an admin or staff member.
 */
export function isAdminOrStaff(role: string): boolean {
  return role === "admin" || role === "staff";
}


/**
 * Check whether a user is an administrator.
 */
export function isAdmin(role: string): boolean {
  return role === "admin";
}


/**
 * Check whether a user is a tenant.
 */
export function isTenant(role: string): boolean {
  return role === "tenant";
}