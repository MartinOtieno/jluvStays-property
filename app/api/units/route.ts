// app/api/units/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/db";
import Unit from "@/models/Unit";
import Booking from "@/models/Booking";
import { isAdminOrStaff } from "@/lib/roles";

// -----------------------------------------------
// GET /api/units — list units, with filters
//
// Query params:
//   rentalType  -> "long_term" | "mid_term" | "short_term"
//   minPrice / maxPrice -> against pricePerMonth
//   moveIn / moveOut -> ISO dates; excludes units with an
//                        overlapping non-cancelled booking in that range
//   status -> defaults to "active"; "all" bypasses filtering
//
// NOTE:
// short_term units are still allowed through this API because
// the admin Rooms page may need to fetch short_term units in
// order to assign Rooms to them.
//
// The PUBLIC /listings page is responsible for hiding short_term
// units and displaying Rooms instead.
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

    // -----------------------------------------------
    // Status filter
    // -----------------------------------------------

    if (status !== "all") {
      filter.status = status;
    }

    // -----------------------------------------------
    // Rental type filter
    //
    // Supports:
    //   ?rentalType=long_term
    //   ?rentalType=mid_term
    //   ?rentalType=short_term
    //
    // Also supports multiple types:
    //   ?rentalType=long_term,mid_term
    //
    // This is useful for the public listings page when
    // "All" is selected.
    // -----------------------------------------------

    if (rentalType) {
      const requestedTypes = rentalType
        .split(",")
        .map((type) => type.trim())
        .filter(Boolean);

      const allowedRentalTypes = [
        "long_term",
        "mid_term",
        "short_term",
      ];

      const invalidType = requestedTypes.some(
        (type) => !allowedRentalTypes.includes(type)
      );

      if (
        requestedTypes.length === 0 ||
        invalidType
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid rentalType",
          },
          { status: 400 }
        );
      }

      if (requestedTypes.length === 1) {
        filter.rentalType = requestedTypes[0];
      } else {
        filter.rentalType = {
          $in: requestedTypes,
        };
      }
    }

    // -----------------------------------------------
    // Price filter
    // -----------------------------------------------

    if (minPrice || maxPrice) {
      const priceFilter: Record<string, number> = {};

      if (minPrice) {
        const min = Number(minPrice);

        if (Number.isNaN(min)) {
          return NextResponse.json(
            {
              success: false,
              message: "Invalid minPrice",
            },
            { status: 400 }
          );
        }

        priceFilter.$gte = min;
      }

      if (maxPrice) {
        const max = Number(maxPrice);

        if (Number.isNaN(max)) {
          return NextResponse.json(
            {
              success: false,
              message: "Invalid maxPrice",
            },
            { status: 400 }
          );
        }

        priceFilter.$lte = max;
      }

      filter.pricePerMonth = priceFilter;
    }

    // -----------------------------------------------
    // Fetch units
    // -----------------------------------------------

    let units = await Unit.find(filter).sort({
      createdAt: -1,
    });

    // -----------------------------------------------
    // Availability filtering
    //
    // Only applied when BOTH moveIn and moveOut
    // dates are provided.
    // -----------------------------------------------

    if (moveIn && moveOut) {
      const moveInDate = new Date(moveIn);
      const moveOutDate = new Date(moveOut);

      if (
        Number.isNaN(moveInDate.getTime()) ||
        Number.isNaN(moveOutDate.getTime()) ||
        moveInDate >= moveOutDate
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Invalid moveIn/moveOut date range",
          },
          { status: 400 }
        );
      }

      const unitIds = units.map(
        (unit) => unit._id
      );

      // Find units that have an overlapping
      // pending or confirmed booking.
      const overlapping =
        await Booking.find({
          unit: {
            $in: unitIds,
          },
          status: {
            $in: ["pending", "confirmed"],
          },
          moveInDate: {
            $lt: moveOutDate,
          },
          moveOutDate: {
            $gt: moveInDate,
          },
        }).distinct("unit");

      const bookedIds = new Set(
        overlapping.map((id) =>
          id.toString()
        )
      );

      units = units.filter(
        (unit) =>
          !bookedIds.has(
            unit._id.toString()
          )
      );
    }

    // -----------------------------------------------
    // Response
    // -----------------------------------------------

    return NextResponse.json(
      {
        success: true,
        count: units.length,
        data: units,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "GET /api/units error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch units",
      },
      { status: 500 }
    );
  }
}

// -----------------------------------------------
// POST /api/units — create a new unit listing
//
// Restricted to admin and staff.
// -----------------------------------------------
export async function POST(req: NextRequest) {
  try {
    // -----------------------------------------------
    // Authentication
    // -----------------------------------------------

    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required",
        },
        { status: 401 }
      );
    }

    // -----------------------------------------------
    // Role authorization
    // -----------------------------------------------

    const role = token.role as string;

    if (!isAdminOrStaff(role)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You don't have permission to create units",
        },
        { status: 403 }
      );
    }

    // -----------------------------------------------
    // Database connection
    // -----------------------------------------------

    await connectDB();

    // -----------------------------------------------
    // Request body
    // -----------------------------------------------

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

    // -----------------------------------------------
    // Determine owner from session
    //
    // Owner is NOT accepted from the client.
    // -----------------------------------------------

    const owner =
      (token.id as string | undefined) ??
      (token.sub as string | undefined);

    if (!owner) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Could not determine owner from session",
        },
        { status: 400 }
      );
    }

    // -----------------------------------------------
    // Required fields
    // -----------------------------------------------

    if (
      !title ||
      !description ||
      !rentalType
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "title, description and rentalType are required",
        },
        { status: 400 }
      );
    }

    // -----------------------------------------------
    // Validate rental type
    // -----------------------------------------------

    if (
      ![
        "long_term",
        "mid_term",
        "short_term",
      ].includes(rentalType)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid rentalType",
        },
        { status: 400 }
      );
    }

    // -----------------------------------------------
    // Long-term and mid-term require price
    // -----------------------------------------------

    if (
      (rentalType === "long_term" ||
        rentalType === "mid_term") &&
      !pricePerMonth
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "pricePerMonth is required for long_term/mid_term units",
        },
        { status: 400 }
      );
    }

    // -----------------------------------------------
    // Long-term and mid-term require furnished
    // -----------------------------------------------

    if (
      rentalType !== "short_term" &&
      furnished === undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "furnished is required for long_term/mid_term units",
        },
        { status: 400 }
      );
    }

    // -----------------------------------------------
    // Create unit
    // -----------------------------------------------

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

    // -----------------------------------------------
    // Response
    // -----------------------------------------------

    return NextResponse.json(
      {
        success: true,
        message: "Unit created",
        data: unit,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "POST /api/units error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create unit",
      },
      { status: 500 }
    );
  }
}