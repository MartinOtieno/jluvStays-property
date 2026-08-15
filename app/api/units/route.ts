// app/api/units/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/db";
import Unit from "@/models/Unit";
import Booking from "@/models/Booking";
import { isAdminOrStaff } from "@/lib/roles";

// -----------------------------------------------
// GET /api/units — list units, with filters
// Query params:
//   rentalType  -> "long_term" | "mid_term" | "short_term"
//   minPrice / maxPrice -> against pricePerMonth
//   moveIn / moveOut    -> ISO dates; excludes units with an
//                          overlapping non-cancelled booking in that range
//   status              -> defaults to "active"; "all" bypasses filtering
// -----------------------------------------------
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const rentalType = searchParams.get("rentalType");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const moveIn = searchParams.get("moveIn");
    const moveOut = searchParams.get("moveOut");
    const status = searchParams.get("status") ?? "active";

    const filter: Record<string, unknown> = {};
    if (status !== "all") {
      filter.status = status;
    }

    // rentalType can be any of the three. short_term units aren't directly
    // bookable (their Rooms are), but they still need to be listable here
    // — e.g. the admin Rooms page needs to fetch short_term units to
    // assign a Room to one.
    if (rentalType) {
      if (!["long_term", "mid_term", "short_term"].includes(rentalType)) {
        return NextResponse.json(
          { success: false, message: "Invalid rentalType" },
          { status: 400 }
        );
      }
      filter.rentalType = rentalType;
    }

    if (minPrice || maxPrice) {
      filter.pricePerMonth = {};
      if (minPrice) (filter.pricePerMonth as Record<string, number>).$gte = Number(minPrice);
      if (maxPrice) (filter.pricePerMonth as Record<string, number>).$lte = Number(maxPrice);
    }

    let units = await Unit.find(filter).sort({ createdAt: -1 });

    // Availability filtering: only applied when both dates are given.
    if (moveIn && moveOut) {
      const moveInDate = new Date(moveIn);
      const moveOutDate = new Date(moveOut);

      if (isNaN(moveInDate.getTime()) || isNaN(moveOutDate.getTime()) || moveInDate >= moveOutDate) {
        return NextResponse.json(
          { success: false, message: "Invalid moveIn/moveOut date range" },
          { status: 400 }
        );
      }

      const unitIds = units.map((u) => u._id);

      const overlapping = await Booking.find({
        unit: { $in: unitIds },
        status: { $in: ["pending", "confirmed"] },
        moveInDate: { $lt: moveOutDate },
        moveOutDate: { $gt: moveInDate },
      }).distinct("unit");

      const bookedIds = new Set(overlapping.map((id) => id.toString()));
      units = units.filter((u) => !bookedIds.has(u._id.toString()));
    }

    return NextResponse.json(
      { success: true, count: units.length, data: units },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/units error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch units" },
      { status: 500 }
    );
  }
}

// -----------------------------------------------
// POST /api/units — create a new unit listing
// Restricted to admin and staff — same role rules as middleware's
// /admin and /staff route protection.
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
        { success: false, message: "You don't have permission to create units" },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await req.json();
    const {
      title,
      description,
      rentalType,
      bedrooms,
      pricePerMonth,
      furnished,
      images,
      amenities,
    } = body;

    // owner is derived from the session, not accepted from the client.
    // NOTE: assuming the JWT carries the user id as token.id (matching
    // the pattern in Navbar.tsx). Falls back to token.sub. Verify this
    // matches your actual JWT callback shape.
    const owner = (token.id as string | undefined) ?? (token.sub as string | undefined);
    if (!owner) {
      return NextResponse.json(
        { success: false, message: "Could not determine owner from session" },
        { status: 400 }
      );
    }

    if (!title || !description || !rentalType) {
      return NextResponse.json(
        {
          success: false,
          message: "title, description and rentalType are required",
        },
        { status: 400 }
      );
    }

    if (!["long_term", "mid_term", "short_term"].includes(rentalType)) {
      return NextResponse.json(
        { success: false, message: "Invalid rentalType" },
        { status: 400 }
      );
    }

    if ((rentalType === "long_term" || rentalType === "mid_term") && !pricePerMonth) {
      return NextResponse.json(
        { success: false, message: "pricePerMonth is required for long_term/mid_term units" },
        { status: 400 }
      );
    }

    if (rentalType !== "short_term" && furnished === undefined) {
      return NextResponse.json(
        { success: false, message: "furnished is required for long_term/mid_term units" },
        { status: 400 }
      );
    }

    const unit = await Unit.create({
      title,
      description,
      rentalType,
      bedrooms,
      pricePerMonth,
      furnished,
      images,
      amenities,
      owner,
    });

    return NextResponse.json(
      { success: true, message: "Unit created", data: unit },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/units error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create unit" },
      { status: 500 }
    );
  }
}