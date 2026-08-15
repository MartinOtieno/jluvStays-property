// room-booking/app/api/staff/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import StaffProfile from "../../../models/StaffProfile";
import User from "../../../models/User";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("activeOnly");
    const filter = activeOnly === "true" ? { isActive: true } : {};

    const staff = await StaffProfile.find(filter)
      .populate({ path: "user", select: "name email phone photo gender role" })
      .sort({ order: 1 });

    return NextResponse.json(
      { success: true, count: staff.length, data: staff },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/staff error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch staff" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { userId, employeeNumber, position, department, hireDate, salary, emergencyContact, order } = body;

    // ── Validate required fields ──────────────────────────────────────────────
    if (!userId || !employeeNumber || !position || !hireDate) {
      return NextResponse.json(
        { success: false, message: "userId, employeeNumber, position and hireDate are required" },
        { status: 400 }
      );
    }

    // position is now free text (a job title the admin types), not a
    // fixed set — see StaffProfile.ts. Just do a basic sanity check on
    // length/shape rather than validating against a whitelist.
    const trimmedPosition = String(position).trim();
    if (trimmedPosition.length === 0) {
      return NextResponse.json(
        { success: false, message: "Position cannot be empty" },
        { status: 400 }
      );
    }
    if (trimmedPosition.length > 80) {
      return NextResponse.json(
        { success: false, message: "Position must be 80 characters or fewer" },
        { status: 400 }
      );
    }

    // ── Check user exists ─────────────────────────────────────────────────────
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // ── Check no existing staff profile ───────────────────────────────────────
    const existing = await StaffProfile.findOne({ user: userId });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "This user already has a staff profile" },
        { status: 409 }
      );
    }

    // ── Check employee number is unique ───────────────────────────────────────
    const existingNumber = await StaffProfile.findOne({ employeeNumber });
    if (existingNumber) {
      return NextResponse.json(
        { success: false, message: "Employee number already in use" },
        { status: 409 }
      );
    }

    // ── Promote user to the generic "staff" access tier ───────────────────────
    // role is ONLY an access-control key now — it must stay one of
    // User's enum values ("admin" | "staff" | "tenant" | "guest"), so it
    // can never be set to a free-typed position string. The actual job
    // title the admin typed is stored below on StaffProfile.position,
    // which is what renders in the UI. Role-based nav/redirects should
    // check `role === "staff"`, not any specific job title.
    await User.findByIdAndUpdate(userId, { role: "staff" });

    // ── Create staff profile ──────────────────────────────────────────────────
    const profile = await StaffProfile.create({
      user:             userId,
      employeeNumber,
      position:         trimmedPosition,
      department:       department       || "",
      hireDate:         new Date(hireDate),
      salary:           salary           || 0,
      emergencyContact: emergencyContact || {},
      order:            order            || 0,
      isActive:         true,
    });

    const populated = await profile.populate({
      path: "user",
      select: "name email phone photo gender role",
    });

    return NextResponse.json(
      {
        success: true,
        message: `${user.name} promoted to ${trimmedPosition} successfully`,
        data: populated,
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error("POST /api/staff error:", error);

    // ── Surface Mongoose validation errors clearly ─────────────────────────
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors)
        .map((e: any) => e.message)
        .join(", ");
      return NextResponse.json(
        { success: false, message: `Validation error: ${messages}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to create staff profile" },
      { status: 500 }
    );
  }
}