import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import Booking from "@/models/Booking";
import Unit from "@/models/Unit";
import Room from "@/models/Room";
import User from "@/models/User";
import StaffProfile from "@/models/StaffProfile";
import { createNotification } from "@/lib/createNotification";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type RentalType = "long_term" | "mid_term" | "short_term";

type BookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed";

const BOOKING_STAFF_POSITIONS = [
  "property_manager",
  "receptionist",
  "accountant",
];

// ─────────────────────────────────────────────────────────────────────────────
// Populated types
// ─────────────────────────────────────────────────────────────────────────────

type PopulatedUnit = {
  _id: mongoose.Types.ObjectId;
  title?: string;
  name?: string;
  pricePerMonth?: number;
  images?: string[];
  rentalType?: RentalType;
};

type PopulatedRoom = {
  _id: mongoose.Types.ObjectId;
  label?: string;
  name?: string;
  type?: string;
  pricePerNight?: number;
  images?: string[];
};

type PopulatedTenant = {
  _id: mongoose.Types.ObjectId;
  name?: string;
  email?: string;
  phone?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Notification types
// ─────────────────────────────────────────────────────────────────────────────

type NotificationType =
  | "booking_pending"
  | "booking_confirmed"
  | "booking_cancelled"
  | "general";

type NotificationPayload = {
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  refId?: mongoose.Types.ObjectId | string;
  refModel?: "Booking" | "ViewingRequest" | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: notify all admins
// ─────────────────────────────────────────────────────────────────────────────

async function notifyAdmins(payload: NotificationPayload) {
  try {
    const admins = await User.find({
      role: "admin",
    }).select("_id");

    if (!admins.length) {
      return;
    }

    await Promise.all(
      admins.map((admin) =>
        createNotification({
          userId: admin._id,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          link: payload.link,
          refId: payload.refId,
          refModel: payload.refModel ?? "Booking",
        })
      )
    );
  } catch (error) {
    console.error("notifyAdmins error:", error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: notify relevant staff
//
// IMPORTANT:
// User.role is "staff".
// StaffProfile.position contains:
// property_manager
// receptionist
// accountant
// etc.
//
// Therefore we must query StaffProfile, not User.role.
// ─────────────────────────────────────────────────────────────────────────────

async function notifyStaff(payload: NotificationPayload) {
  try {
    const staffProfiles = await StaffProfile.find({
      position: {
        $in: BOOKING_STAFF_POSITIONS,
      },
      isActive: true,
    }).select("user");

    if (!staffProfiles.length) {
      return;
    }

    await Promise.all(
      staffProfiles
        .filter((profile) => profile.user)
        .map((profile) =>
          createNotification({
            userId: profile.user,
            type: payload.type,
            title: payload.title,
            message: payload.message,
            link: payload.link,
            refId: payload.refId,
            refModel: payload.refModel ?? "Booking",
          })
        )
    );
  } catch (error) {
    console.error("notifyStaff error:", error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: calculate whole months
//
// Uses 30-day month approximation.
// ─────────────────────────────────────────────────────────────────────────────

function wholeMonthsUp(start: Date, end: Date): number {
  const msPerMonth = 1000 * 60 * 60 * 24 * 30;

  return Math.max(
    1,
    Math.ceil(
      (end.getTime() - start.getTime()) / msPerMonth
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: calculate nights
// ─────────────────────────────────────────────────────────────────────────────

function nightsBetween(start: Date, end: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;

  return Math.max(
    1,
    Math.ceil(
      (end.getTime() - start.getTime()) / msPerDay
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: format money
// ─────────────────────────────────────────────────────────────────────────────

function formatMoney(amount: number) {
  return `KES ${Number(amount || 0).toLocaleString("en-KE")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: format date
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(date: Date) {
  return date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: validate ObjectId
// ─────────────────────────────────────────────────────────────────────────────

function isValidObjectId(value?: string | null) {
  return !!value && mongoose.Types.ObjectId.isValid(value);
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/bookings
//
// Create a new booking.
// ─────────────────────────────────────────────────────────────────────────────

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
      viewingRequestId,
    }: {
      userId?: string;
      rentalType?: RentalType;
      unitId?: string;
      roomId?: string;
      moveInDate?: string;
      moveOutDate?: string;
      viewingRequestId?: string;
    } = body;

    // ───────────────────────────────────────────────────────────────────────
    // Validate required fields
    // ───────────────────────────────────────────────────────────────────────

    if (
      !userId ||
      !rentalType ||
      !moveInDate ||
      !moveOutDate
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "userId, rentalType, moveInDate and moveOutDate are required",
        },
        { status: 400 }
      );
    }

    // ───────────────────────────────────────────────────────────────────────
    // Validate user ID
    // ───────────────────────────────────────────────────────────────────────

    if (!isValidObjectId(userId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid user ID",
        },
        { status: 400 }
      );
    }

    // ───────────────────────────────────────────────────────────────────────
    // Validate rental type
    // ───────────────────────────────────────────────────────────────────────

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

    const isShortTerm =
      rentalType === "short_term";

    // ───────────────────────────────────────────────────────────────────────
    // Validate unit / room
    // ───────────────────────────────────────────────────────────────────────

    if (isShortTerm && !roomId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "roomId is required for short_term bookings",
        },
        { status: 400 }
      );
    }

    if (!isShortTerm && !unitId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "unitId is required for long_term/mid_term bookings",
        },
        { status: 400 }
      );
    }

    if (roomId && !isValidObjectId(roomId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid room ID",
        },
        { status: 400 }
      );
    }

    if (unitId && !isValidObjectId(unitId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid unit ID",
        },
        { status: 400 }
      );
    }

    if (
      viewingRequestId &&
      !isValidObjectId(viewingRequestId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid viewing request ID",
        },
        { status: 400 }
      );
    }

    // ───────────────────────────────────────────────────────────────────────
    // Validate dates
    // ───────────────────────────────────────────────────────────────────────

    const moveIn = new Date(moveInDate);
    const moveOut = new Date(moveOutDate);

    if (
      Number.isNaN(moveIn.getTime()) ||
      Number.isNaN(moveOut.getTime())
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid move-in or move-out date",
        },
        { status: 400 }
      );
    }

    if (moveIn >= moveOut) {
      return NextResponse.json(
        {
          success: false,
          message:
            "moveOutDate must be after moveInDate",
        },
        { status: 400 }
      );
    }

    // ───────────────────────────────────────────────────────────────────────
    // Prevent bookings in the past
    // ───────────────────────────────────────────────────────────────────────

    const startOfToday = new Date();

    startOfToday.setHours(
      0,
      0,
      0,
      0
    );

    if (moveIn < startOfToday) {
      return NextResponse.json(
        {
          success: false,
          message:
            "moveInDate cannot be in the past",
        },
        { status: 400 }
      );
    }

    // ───────────────────────────────────────────────────────────────────────
    // Make sure tenant exists
    // ───────────────────────────────────────────────────────────────────────

    const tenant = await User.findById(userId).select(
      "_id name email phone role"
    );

    if (!tenant) {
      return NextResponse.json(
        {
          success: false,
          message: "Tenant not found",
        },
        { status: 404 }
      );
    }

    // ───────────────────────────────────────────────────────────────────────
    // Variables for price
    // ───────────────────────────────────────────────────────────────────────

    let price: number;
    let priceUnit: "month" | "night";
    let durationLabel: string;

    // ───────────────────────────────────────────────────────────────────────
    // SHORT-TERM BOOKING
    // ───────────────────────────────────────────────────────────────────────

    if (isShortTerm) {
      const room = await Room.findById(roomId);

      if (!room) {
        return NextResponse.json(
          {
            success: false,
            message: "Room not found",
          },
          { status: 404 }
        );
      }

      if (room.status !== "active") {
        return NextResponse.json(
          {
            success: false,
            message:
              "Room is not available for booking",
          },
          { status: 400 }
        );
      }

      // Check date overlap
      const conflict = await Booking.hasOverlap({
        room: roomId,
        moveInDate: moveIn,
        moveOutDate: moveOut,
      });

      if (conflict) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Room is already booked for the selected dates",
          },
          { status: 409 }
        );
      }

      const nights = nightsBetween(
        moveIn,
        moveOut
      );

      price =
        nights *
        Number(room.pricePerNight || 0);

      priceUnit = "night";

      durationLabel = `${nights} night${
        nights > 1 ? "s" : ""
      }`;
    }

    // ───────────────────────────────────────────────────────────────────────
    // LONG / MID-TERM BOOKING
    // ───────────────────────────────────────────────────────────────────────

    else {
      const unit = await Unit.findById(unitId);

      if (!unit) {
        return NextResponse.json(
          {
            success: false,
            message: "Unit not found",
          },
          { status: 404 }
        );
      }

      if (unit.status !== "active") {
        return NextResponse.json(
          {
            success: false,
            message:
              "Unit is not available for booking",
          },
          { status: 400 }
        );
      }

      // Check date overlap
      const conflict = await Booking.hasOverlap({
        unit: unitId,
        moveInDate: moveIn,
        moveOutDate: moveOut,
      });

      if (conflict) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Unit is already booked for the selected dates",
          },
          { status: 409 }
        );
      }

      const months = wholeMonthsUp(
        moveIn,
        moveOut
      );

      price =
        months *
        Number(unit.pricePerMonth || 0);

      priceUnit = "month";

      durationLabel = `${months} month${
        months > 1 ? "s" : ""
      }`;
    }

    // ───────────────────────────────────────────────────────────────────────
    // Create booking
    // ───────────────────────────────────────────────────────────────────────

    const booking = await Booking.create({
      tenant: userId,
      rentalType,

      unit: isShortTerm
        ? null
        : unitId,

      room: isShortTerm
        ? roomId
        : null,

      moveInDate: moveIn,
      moveOutDate: moveOut,

      viewingRequest:
        viewingRequestId ?? null,

      price,
      priceUnit,

      status: "pending",
    });

    // ───────────────────────────────────────────────────────────────────────
    // Populate booking
    // ───────────────────────────────────────────────────────────────────────

    const populatedBooking =
      await booking.populate<{
        unit: PopulatedUnit | null;
        room: PopulatedRoom | null;
        tenant: PopulatedTenant;
      }>([
        {
          path: "unit",
          select:
            "title name pricePerMonth images rentalType",
        },
        {
          path: "room",
          select:
            "label name type pricePerNight images",
        },
        {
          path: "tenant",
          select:
            "name email phone",
        },
      ]);

    // ───────────────────────────────────────────────────────────────────────
    // Listing information
    // ───────────────────────────────────────────────────────────────────────

    const listingName =
      populatedBooking.unit?.title ??
      populatedBooking.unit?.name ??
      populatedBooking.room?.label ??
      populatedBooking.room?.name ??
      "the listing";

    const guestName =
      populatedBooking.tenant?.name ??
      "A guest";

    const moveInFmt =
      formatDate(moveIn);

    const moveOutFmt =
      formatDate(moveOut);

    // ───────────────────────────────────────────────────────────────────────
    // Notify tenant
    // ───────────────────────────────────────────────────────────────────────

    await createNotification({
      userId,
      type: "booking_pending",
      title: "Booking Received ⏳",
      message:
        `Your booking for ${listingName} ` +
        `from ${moveInFmt} to ${moveOutFmt} ` +
        `(${durationLabel}) has been received ` +
        `and is awaiting confirmation. ` +
        `Total: ${formatMoney(price)}.`,
      link: "/trips",
      refId: booking._id,
      refModel: "Booking",
    });

    // ───────────────────────────────────────────────────────────────────────
    // Staff notification payload
    // ───────────────────────────────────────────────────────────────────────

    const staffNotifPayload: NotificationPayload = {
      type: "booking_pending",
      title: "New Booking Request 🏠",
      message:
        `${guestName} has requested to book ` +
        `${listingName} from ${moveInFmt} ` +
        `to ${moveOutFmt} for ` +
        `${formatMoney(price)}. Review and confirm.`,
      link: "/staff/bookings",
      refId: booking._id,
      refModel: "Booking",
    };

    // ───────────────────────────────────────────────────────────────────────
    // Notify admins
    // ───────────────────────────────────────────────────────────────────────

    await notifyAdmins({
      ...staffNotifPayload,
      link: "/admin/bookings",
    });

    // ───────────────────────────────────────────────────────────────────────
    // Notify relevant staff
    // ───────────────────────────────────────────────────────────────────────

    await notifyStaff(
      staffNotifPayload
    );

    // ───────────────────────────────────────────────────────────────────────
    // Response
    // ───────────────────────────────────────────────────────────────────────

    return NextResponse.json(
      {
        success: true,
        message:
          `Booking created for ${durationLabel}. ` +
          `Total: ${formatMoney(price)}`,
        data: populatedBooking,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "POST /api/bookings error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create booking",
      },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/bookings
//
// Fetch bookings.
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } =
      new URL(req.url);

    const userId =
      searchParams.get("userId");

    const unitId =
      searchParams.get("unitId");

    const roomId =
      searchParams.get("roomId");

    const rentalType =
      searchParams.get("rentalType");

    const status =
      searchParams.get("status");

    // ───────────────────────────────────────────────────────────────────────
    // Validate query IDs
    // ───────────────────────────────────────────────────────────────────────

    if (
      userId &&
      !isValidObjectId(userId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid user ID",
        },
        { status: 400 }
      );
    }

    if (
      unitId &&
      !isValidObjectId(unitId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid unit ID",
        },
        { status: 400 }
      );
    }

    if (
      roomId &&
      !isValidObjectId(roomId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid room ID",
        },
        { status: 400 }
      );
    }

    // ───────────────────────────────────────────────────────────────────────
    // Validate rental type
    // ───────────────────────────────────────────────────────────────────────

    if (
      rentalType &&
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

    // ───────────────────────────────────────────────────────────────────────
    // Validate status
    // ───────────────────────────────────────────────────────────────────────

    if (
      status &&
      ![
        "pending",
        "confirmed",
        "cancelled",
        "completed",
      ].includes(status)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid booking status",
        },
        { status: 400 }
      );
    }

    // ───────────────────────────────────────────────────────────────────────
    // Build filter
    // ───────────────────────────────────────────────────────────────────────

    const filter: Record<
      string,
      unknown
    > = {};

    if (userId) {
      filter.tenant = userId;
    }

    if (unitId) {
      filter.unit = unitId;
    }

    if (roomId) {
      filter.room = roomId;
    }

    if (rentalType) {
      filter.rentalType = rentalType;
    }

    if (status) {
      filter.status = status;
    }

    // ───────────────────────────────────────────────────────────────────────
    // Fetch bookings
    // ───────────────────────────────────────────────────────────────────────

    const bookings =
      await Booking.find(filter)
        .populate<{
          unit: PopulatedUnit | null;
        }>({
          path: "unit",
          select:
            "title name pricePerMonth images rentalType",
        })
        .populate<{
          room: PopulatedRoom | null;
        }>({
          path: "room",
          select:
            "label name type pricePerNight images",
        })
        .populate<{
          tenant: PopulatedTenant;
        }>({
          path: "tenant",
          select:
            "name email phone",
        })
        .sort({
          createdAt: -1,
        });

    // ───────────────────────────────────────────────────────────────────────
    // Response
    // ───────────────────────────────────────────────────────────────────────

    return NextResponse.json(
      {
        success: true,
        count: bookings.length,
        data: bookings,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "GET /api/bookings error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch bookings",
      },
      { status: 500 }
    );
  }
}