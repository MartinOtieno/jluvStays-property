// room-booking/app/api/users/count/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

// GET /api/users/count?role=tenant
// Deliberately public (no admin session check) — unlike GET /api/users,
// this route only ever returns a bare number, never any user records or
// PII, so it's safe to call from public pages like the homepage stats bar.
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role"); // e.g. "tenant"

    const filter: Record<string, unknown> = {};
    if (role) filter.role = role;

    const count = await User.countDocuments(filter);

    return NextResponse.json({ success: true, count }, { status: 200 });
  } catch (error) {
    console.error("GET /api/users/count error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to count users" },
      { status: 500 }
    );
  }
}