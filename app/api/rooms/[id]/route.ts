// room-booking/src/app/api/rooms/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Room from "@/models/Room";
import Booking from "@/models/Booking";
import { isAdminOrStaff } from "@/lib/roles";

function isValidId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

// -----------------------------------------------
// GET /api/rooms/[id] — Fetch a single room
// -----------------------------------------------
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    if (!isValidId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid room ID" },
        { status: 400 }
      );
    }

    const room = await Room.findById(id).populate("unit", "title description bedrooms amenities");

    if (!room) {
      return NextResponse.json(
        { success: false, message: "Room not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: room }, { status: 200 });
  } catch (error) {
    console.error("GET /api/rooms/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch room" },
      { status: 500 }
    );
  }
}

// -----------------------------------------------
// PATCH /api/rooms/[id] — Update a room
// Renamed from PUT to PATCH to match /api/units/[id]'s convention —
// both are partial updates in practice (findByIdAndUpdate with $set),
// which is what PATCH means; keeping both routes consistent.
//
// currentTenant is deliberately excluded from the editable fields — it's
// meant to be kept in sync by the booking confirm/cancel flow (see
// /api/bookings/[id]'s PATCH handler), not hand-edited here. If you need a
// manual occupancy override for edge cases, that should be its own
// explicit, more tightly-scoped action.
// -----------------------------------------------
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
        { success: false, message: "You don't have permission to update rooms" },
        { status: 403 }
      );
    }

    await connectDB();
    const { id } = await params;

    if (!isValidId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid room ID" },
        { status: 400 }
      );
    }

    const body = await req.json();
    delete body._id;
    delete body.__v;
    delete body.createdAt;
    delete body.updatedAt;
    delete body.currentTenant; // see note above
    delete body.unit; // reassigning a room to a different unit is a bigger action than a routine edit

    const updatedRoom = await Room.findByIdAndUpdate(
      id,
      { $set: body },
      { returnDocument: "after", runValidators: true }
    );

    if (!updatedRoom) {
      return NextResponse.json(
        { success: false, message: "Room not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updatedRoom }, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/rooms/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update room" },
      { status: 500 }
    );
  }
}

// -----------------------------------------------
// DELETE /api/rooms/[id] — Delete a room
// Soft-delete by default (status: "inactive") since Bookings reference
// rooms by ID — same reasoning as /api/units/[id]. Admin-only.
// ?permanent=true does a real delete, still admin-only, blocked if the
// room has any pending/confirmed bookings.
// -----------------------------------------------
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
        { success: false, message: "Only admins can delete rooms" },
        { status: 403 }
      );
    }

    await connectDB();
    const { id } = await params;

    if (!isValidId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid room ID" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const permanent = searchParams.get("permanent") === "true";

    if (!permanent) {
      const deactivated = await Room.findByIdAndUpdate(
        id,
        { status: "inactive" },
        { returnDocument: "after" }
      );

      if (!deactivated) {
        return NextResponse.json(
          { success: false, message: "Room not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Room deactivated",
        data: deactivated,
      });
    }

    const activeBooking = await Booking.findOne({
      room: id,
      status: { $in: ["pending", "confirmed"] },
    }).select("_id");

    if (activeBooking) {
      return NextResponse.json(
        {
          success: false,
          message: "Cannot permanently delete a room with pending or confirmed bookings",
        },
        { status: 409 }
      );
    }

    const deletedRoom = await Room.findByIdAndDelete(id);

    if (!deletedRoom) {
      return NextResponse.json(
        { success: false, message: "Room not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Room permanently deleted",
    });
  } catch (error) {
    console.error("DELETE /api/rooms/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete room" },
      { status: 500 }
    );
  }
}