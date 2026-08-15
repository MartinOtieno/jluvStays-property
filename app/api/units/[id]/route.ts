// app/api/units/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Unit from "@/models/Unit";
import Booking from "@/models/Booking";
import { isAdminOrStaff } from "@/lib/roles";

// ─── GET /api/units/[id] ────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid unit ID" },
        { status: 400 }
      );
    }

    const unit = await Unit.findById(id);

    if (!unit) {
      return NextResponse.json(
        { success: false, message: "Unit not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: unit });
  } catch (error) {
    console.error("GET /api/units/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch unit" },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/units/[id] ──────────────────────────────────────────────
// Restricted to admin/staff. rentalType is intentionally excluded from
// the updatable fields — it's `immutable: true` on the schema.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const role = token.role as string;
    if (!isAdminOrStaff(role)) {
      return NextResponse.json(
        { success: false, message: "You don't have permission to update units" },
        { status: 403 }
      );
    }

    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid unit ID" },
        { status: 400 }
      );
    }

    const body = await req.json();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { rentalType, owner, ...updatableFields } = body;

    const updated = await Unit.findByIdAndUpdate(id, updatableFields, {
      returnDocument: "after",
      runValidators: true,
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Unit not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Unit updated",
      data: updated,
    });
  } catch (error) {
    console.error("PATCH /api/units/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update unit" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/units/[id] ─────────────────────────────────────────────
// Soft-delete by default: sets status to "archived". Admin-only.
// ?permanent=true does a real hard delete, still admin-only, blocked if
// the unit has any pending/confirmed bookings.
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const role = token.role as string;
    if (role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Only admins can delete units" },
        { status: 403 }
      );
    }

    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid unit ID" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const permanent = searchParams.get("permanent") === "true";

    if (!permanent) {
      const archived = await Unit.findByIdAndUpdate(
        id,
        { status: "archived" },
        { returnDocument: "after" }
      );

      if (!archived) {
        return NextResponse.json(
          { success: false, message: "Unit not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Unit archived",
        data: archived,
      });
    }

    const activeBooking = await Booking.findOne({
      unit: id,
      status: { $in: ["pending", "confirmed"] },
    }).select("_id");

    if (activeBooking) {
      return NextResponse.json(
        {
          success: false,
          message: "Cannot permanently delete a unit with pending or confirmed bookings",
        },
        { status: 409 }
      );
    }

    const deleted = await Unit.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Unit not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Unit permanently deleted",
    });
  } catch (error) {
    console.error("DELETE /api/units/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete unit" },
      { status: 500 }
    );
  }
}