// app/api/bookings/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Booking from "@/models/Booking";
import Unit from "@/models/Unit";
import Room from "@/models/Room";
import User from "@/models/User";
import { createNotification } from "@/lib/createNotification";

const BOOKING_STAFF_POSITIONS = ["property_manager", "receptionist", "accountant"];

type RentalType = "long_term" | "mid_term" | "short_term";

// ─── Helper: notify all admins ────────────────────────────────────────────────
async function notifyAdmins(payload: {
  type: "booking_pending" | "booking_confirmed" | "booking_cancelled" | "general";
  title: string;
  message: string;
  link: string;
  refId?: unknown;
  refModel?: "Booking" | "ViewingRequest" | null;
}) {
  try {
    const admins = await User.find({ role: "admin" }).select("_id");
    await Promise.all(
      admins.map(admin =>
        createNotification({
          userId:   admin._id,
          type:     payload.type,
          title:    payload.title,
          message:  payload.message,
          link:     payload.link,
          refId:    payload.refId as string | undefined,
          refModel: payload.refModel,
        })
      )
    );
  } catch (err) {
    console.error("notifyAdmins error:", err);
  }
}

// ─── Helper: notify relevant staff positions ─────────────────────────────────
async function notifyStaff(payload: {
  type: "booking_pending" | "booking_confirmed" | "booking_cancelled" | "general";
  title: string;
  message: string;
  link: string;
  refId?: unknown;
  refModel?: "Booking" | "ViewingRequest" | null;
}) {
  try {
    const staff = await User.find({
      role: { $in: BOOKING_STAFF_POSITIONS },
    }).select("_id");
    await Promise.all(
      staff.map(s =>
        createNotification({
          userId:   s._id,
          type:     payload.type,
          title:    payload.title,
          message:  payload.message,
          link:     payload.link,
          refId:    payload.refId as string | undefined,
          refModel: payload.refModel,
        })
      )
    );
  } catch (err) {
    console.error("notifyStaff error:", err);
  }
}

// Whole months between two dates, rounded up — used to price long/mid term
// stays off the monthly rate. Approximation (30-day months); revisit if you
// want calendar-accurate month counting.
function wholeMonthsUp(start: Date, end: Date): number {
  const msPerMonth = 1000 * 60 * 60 * 24 * 30;
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / msPerMonth));
}

function nightsBetween(start: Date, end: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / msPerDay));
}

// -----------------------------------------------
// POST /api/bookings — Create a new booking
// rentalType determines whether `unitId` or `roomId` is expected.
// -----------------------------------------------
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const {
      userId,
      rentalType,
      unitId,
      roomId,
      moveInDate,
      moveOutDate,
      viewingRequestId, // optional — see note below
    }: {
      userId: string;
      rentalType: RentalType;
      unitId?: string;
      roomId?: string;
      moveInDate: string;
      moveOutDate: string;
      viewingRequestId?: string;
    } = body;

    if (!userId || !rentalType || !moveInDate || !moveOutDate) {
      return NextResponse.json(
        { success: false, message: "userId, rentalType, moveInDate and moveOutDate are required" },
        { status: 400 }
      );
    }

    if (!["long_term", "mid_term", "short_term"].includes(rentalType)) {
      return NextResponse.json(
        { success: false, message: "Invalid rentalType" },
        { status: 400 }
      );
    }

    const isShortTerm = rentalType === "short_term";

    if (isShortTerm && !roomId) {
      return NextResponse.json(
        { success: false, message: "roomId is required for short_term bookings" },
        { status: 400 }
      );
    }
    if (!isShortTerm && !unitId) {
      return NextResponse.json(
        { success: false, message: "unitId is required for long_term/mid_term bookings" },
        { status: 400 }
      );
    }

    const moveIn  = new Date(moveInDate);
    const moveOut = new Date(moveOutDate);

    if (moveIn >= moveOut) {
      return NextResponse.json(
        { success: false, message: "moveOutDate must be after moveInDate" },
        { status: 400 }
      );
    }

    // Compare against the start of *today* rather than the exact current
    // instant. A plain "YYYY-MM-DD" input parses as UTC midnight — using
    // `new Date()` (the current instant) as the cutoff meant "today" could
    // register as already in the past for anyone in a timezone behind
    // UTC, since UTC midnight for today has already passed locally by
    // the time they submit. Comparing whole days avoids that.
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if (moveIn < startOfToday) {
      return NextResponse.json(
        { success: false, message: "moveInDate cannot be in the past" },
        { status: 400 }
      );
    }

    // NOTE: no ViewingRequest approval check here yet — viewingRequestId, if
    // provided, is just attached to the booking. If long/mid term bookings
    // should be BLOCKED without an approved viewing request first, that
    // enforcement needs to be added once the ViewingRequest model/status
    // shape is available.

    let price: number;
    let priceUnit: "month" | "night";
    let durationLabel: string;

    if (isShortTerm) {
      const room = await Room.findById(roomId);
      if (!room) {
        return NextResponse.json({ success: false, message: "Room not found" }, { status: 404 });
      }
      if (room.status !== "active") {
        return NextResponse.json(
          { success: false, message: "Room is not available for booking" },
          { status: 400 }
        );
      }

      const conflict = await Booking.hasOverlap({ room: roomId, moveInDate: moveIn, moveOutDate: moveOut });
      if (conflict) {
        return NextResponse.json(
          { success: false, message: "Room is already booked for the selected dates" },
          { status: 409 }
        );
      }

      const nights = nightsBetween(moveIn, moveOut);
      price = nights * room.pricePerNight;
      priceUnit = "night";
      durationLabel = `${nights} night${nights > 1 ? "s" : ""}`;
    } else {
      const unit = await Unit.findById(unitId);
      if (!unit) {
        return NextResponse.json({ success: false, message: "Unit not found" }, { status: 404 });
      }
      if (unit.status !== "active") {
        return NextResponse.json(
          { success: false, message: "Unit is not available for booking" },
          { status: 400 }
        );
      }

      const conflict = await Booking.hasOverlap({
        unit: unitId,
        moveInDate: moveIn,
        moveOutDate: moveOut,
      });
      if (conflict) {
        return NextResponse.json(
          { success: false, message: "Unit is already booked for the selected dates" },
          { status: 409 }
        );
      }

      const months = wholeMonthsUp(moveIn, moveOut);
      price = months * (unit.pricePerMonth ?? 0);
      priceUnit = "month";
      durationLabel = `${months} month${months > 1 ? "s" : ""}`;
    }

    const booking = await Booking.create({
      tenant: userId,
      rentalType,
      unit: isShortTerm ? null : unitId,
      room: isShortTerm ? roomId : null,
      moveInDate: moveIn,
      moveOutDate: moveOut,
      viewingRequest: viewingRequestId ?? null,
      price,
      priceUnit,
      status: "pending",
    });

    const populatedBooking = await booking.populate([
      { path: "unit", select: "title pricePerMonth images rentalType" },
      { path: "room", select: "label pricePerNight images" },
      { path: "tenant", select: "name email" },
    ]);

    const listingName =
      populatedBooking.unit?.title ?? populatedBooking.room?.label ?? "the listing";

    const moveInFmt  = moveIn.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
    const moveOutFmt = moveOut.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
    const guestName  = populatedBooking.tenant?.name ?? "A guest";

    // 🔔 Notify the guest
    await createNotification({
      userId,
      type:     "booking_pending",
      title:    "Booking Received ⏳",
      message:  `Your booking for ${listingName} from ${moveInFmt} to ${moveOutFmt} (${durationLabel}) has been received and is awaiting confirmation. Total: $${price.toLocaleString()}.`,
      link:     "/trips",
      refId:    booking._id,
      refModel: "Booking",
    });

    const staffNotifPayload = {
      type:     "booking_pending" as const,
      title:    "New Booking Request 🏠",
      message:  `${guestName} has requested to book ${listingName} from ${moveInFmt} to ${moveOutFmt} for $${price.toLocaleString()}. Review and confirm.`,
      refId:    booking._id,
      refModel: "Booking" as const,
    };

    // 🔔 Notify admins
    await notifyAdmins({ ...staffNotifPayload, link: "/admin/bookings" });

    // 🔔 Notify relevant staff
    await notifyStaff({ ...staffNotifPayload, link: "/staff/bookings" });

    return NextResponse.json(
      {
        success: true,
        message: `Booking created for ${durationLabel}. Total: $${price.toLocaleString()}`,
        data:    populatedBooking,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/bookings error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create booking" },
      { status: 500 }
    );
  }
}

// -----------------------------------------------
// GET /api/bookings — Fetch bookings
// -----------------------------------------------
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const unitId = searchParams.get("unitId");
    const roomId = searchParams.get("roomId");
    const rentalType = searchParams.get("rentalType");
    const status = searchParams.get("status");

    const filter: Record<string, unknown> = {};
    if (userId) filter.tenant = userId;
    if (unitId) filter.unit = unitId;
    if (roomId) filter.room = roomId;
    if (rentalType) filter.rentalType = rentalType;
    if (status) filter.status = status;

    const bookings = await Booking.find(filter)
      .populate({ path: "unit", select: "title pricePerMonth images rentalType" })
      .populate({ path: "room", select: "label pricePerNight images" })
      .populate({ path: "tenant", select: "name email phone" })
      .sort({ createdAt: -1 });

    return NextResponse.json(
      { success: true, count: bookings.length, data: bookings },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/bookings error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}