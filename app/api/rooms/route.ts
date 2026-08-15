// room-booking/src/app/api/rooms/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/db";
import Room from "@/models/Room";
import Booking from "@/models/Booking";
import { isAdminOrStaff } from "@/lib/roles";

// -----------------------------------------------
// GET /api/rooms — list rooms, with filters
// Query params:
//   minPrice / maxPrice -> against pricePerNight
//   moveIn / moveOut    -> ISO dates; excludes rooms with an overlapping
//                          non-cancelled booking in that range
//   status              -> defaults to "active" if not provided
//
// NOTE: `type`/`capacity` filters from the old version are gone — Room no
// longer has those fields (type was the old single/double/suite/family
// categorization, replaced by the site-level rentalType concept, which
// for short_term is implicit — every Room IS short_term).
// -----------------------------------------------
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const moveIn = searchParams.get("moveIn");
    const moveOut = searchParams.get("moveOut");
    const status = searchParams.get("status") ?? "active";

    const filter: Record<string, unknown> = { status };

    if (minPrice || maxPrice) {
      filter.pricePerNight = {};
      if (minPrice) (filter.pricePerNight as Record<string, number>).$gte = Number(minPrice);
      if (maxPrice) (filter.pricePerNight as Record<string, number>).$lte = Number(maxPrice);
    }

    let rooms = await Room.find(filter)
      .populate("unit", "title description bedrooms amenities")
      .sort({ createdAt: -1 });

    if (moveIn && moveOut) {
      const moveInDate = new Date(moveIn);
      const moveOutDate = new Date(moveOut);

      if (isNaN(moveInDate.getTime()) || isNaN(moveOutDate.getTime()) || moveInDate >= moveOutDate) {
        return NextResponse.json(
          { success: false, message: "Invalid moveIn/moveOut date range" },
          { status: 400 }
        );
      }

      const roomIds = rooms.map((r) => r._id);

      const overlapping = await Booking.find({
        room: { $in: roomIds },
        status: { $in: ["pending", "confirmed"] },
        moveInDate: { $lt: moveOutDate },
        moveOutDate: { $gt: moveInDate },
      }).distinct("room");

      const bookedIds = new Set(overlapping.map((id) => id.toString()));
      rooms = rooms.filter((r) => !bookedIds.has(r._id.toString()));
    }

    return NextResponse.json(
      { success: true, count: rooms.length, data: rooms },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/rooms error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch rooms" },
      { status: 500 }
    );
  }
}

// -----------------------------------------------
// POST /api/rooms — create a new room
// Restricted to admin/staff, same pattern as /api/units.
// -----------------------------------------------
export async function POST(req: NextRequest) {
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
        { success: false, message: "You don't have permission to create rooms" },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await req.json();
    const { unit, label, description, pricePerNight, furnished, images } = body;

    if (!unit || !label || !pricePerNight) {
      return NextResponse.json(
        { success: false, message: "unit, label, and pricePerNight are required" },
        { status: 400 }
      );
    }

    const room = await Room.create({
      unit,
      label,
      description,
      pricePerNight,
      furnished: furnished ?? true,
      images: images ?? [],
    });

    return NextResponse.json(
      { success: true, message: "Room created", data: room },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/rooms error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create room" },
      { status: 500 }
    );
  }
}