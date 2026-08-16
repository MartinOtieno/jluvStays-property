// room-booking/app/api/admin/migrate-staff-roles/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { STAFF_POSITIONS } from "@/lib/roles";

// POST /api/admin/migrate-staff-roles
// One-time fix for accounts created before the role/position refactor.
// Finds every User whose `role` is still one of the old position strings
// ("receptionist", "property_manager", etc.) and updates it to the
// generic "staff" tier, which is what role-based routing now expects.
// Their actual job title is unaffected — that already lives on
// StaffProfile.position and isn't touched by this.
//
// Safe to run more than once: after the first run, no User will still
// have a legacy role value, so subsequent runs just report 0 updated.
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as { role?: string })?.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Admin access required" },
        { status: 403 }
      );
    }

    await connectDB();

    // Find affected users first so we can report exactly who changed —
    // useful for a one-time migration you'll want a record of.
    const affected = await User.find({ role: { $in: STAFF_POSITIONS } })
      .select("_id name email role");

    if (affected.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No legacy staff roles found — nothing to migrate.",
        updated: [],
      });
    }

    const result = await User.updateMany(
      { role: { $in: STAFF_POSITIONS } },
      { $set: { role: "staff" } }
    );

    return NextResponse.json({
      success: true,
      message: `Migrated ${result.modifiedCount} user(s) to role: "staff".`,
      updated: affected.map(u => ({
        id: u._id,
        name: u.name,
        email: u.email,
        oldRole: u.role, // note: reflects value at query time, before update
      })),
    });
  } catch (error) {
    console.error("POST /api/admin/migrate-staff-roles error:", error);
    return NextResponse.json(
      { success: false, message: "Migration failed" },
      { status: 500 }
    );
  }
}