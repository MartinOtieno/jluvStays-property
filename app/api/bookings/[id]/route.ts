import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Booking from "@/models/Booking";
import User from "@/models/User";
import { createNotification } from "@/lib/createNotification";

// These are staff ACCESS ROLES/positions currently used by your
// notification system.
//
// If your User.role is now simply "staff", change this query to:
// role: "staff"
// and use StaffProfile.position for the actual staff position.
const BOOKING_STAFF_POSITIONS = [
  "property_manager",
  "receptionist",
  "accountant",
];

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type BookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed";

type PopulatedUnit = {
  _id: mongoose.Types.ObjectId;
  title?: string;
  pricePerMonth?: number;
  images?: string[];
  rentalType?: string;
};

type PopulatedRoom = {
  _id: mongoose.Types.ObjectId;
  label?: string;
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
// Helper: notify all admins
// ─────────────────────────────────────────────────────────────────────────────

async function notifyAdmins(payload: {
  type:
    | "booking_confirmed"
    | "booking_cancelled"
    | "booking_pending"
    | "general";
  title: string;
  message: string;
  link: string;
  refId?: mongoose.Types.ObjectId;
}) {
  try {
    const admins = await User.find({
      role: "admin",
    }).select("_id");

    await Promise.all(
      admins.map((admin) =>
        createNotification({
          userId: admin._id,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          link: payload.link,
          refId: payload.refId,
          refModel: "Booking",
        })
      )
    );
  } catch (err) {
    console.error("notifyAdmins error:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: notify relevant staff
// ─────────────────────────────────────────────────────────────────────────────

async function notifyStaff(payload: {
  type:
    | "booking_confirmed"
    | "booking_cancelled"
    | "booking_pending"
    | "general";
  title: string;
  message: string;
  link: string;
  refId?: mongoose.Types.ObjectId;
}) {
  try {
    const staff = await User.find({
      role: {
        $in: BOOKING_STAFF_POSITIONS,
      },
    }).select("_id");

    await Promise.all(
      staff.map((s) =>
        createNotification({
          userId: s._id,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          link: payload.link,
          refId: payload.refId,
          refModel: "Booking",
        })
      )
    );
  } catch (err) {
    console.error("notifyStaff error:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/bookings/[id]
//
// Supported status changes:
//
// pending   -> confirmed
// pending   -> cancelled
// confirmed -> completed
// confirmed -> cancelled
//
// `completed` is used when a guest checks out.
// ─────────────────────────────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  {
    params,
  }: {
    params: { id: string } | Promise<{ id: string }>;
  }
) {
  try {
    await connectDB();

    const { id } = await params;

    // ───────────────────────────────────────────────────────────────────────
    // Validate booking ID
    // ───────────────────────────────────────────────────────────────────────

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid booking ID",
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const status = body.status as BookingStatus;

    // ───────────────────────────────────────────────────────────────────────
    // Validate status
    // ───────────────────────────────────────────────────────────────────────

    const allowedStatuses: BookingStatus[] = [
      "pending",
      "confirmed",
      "cancelled",
      "completed",
    ];

    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid status. Allowed values are pending, confirmed, cancelled, completed.",
        },
        { status: 400 }
      );
    }

    // ───────────────────────────────────────────────────────────────────────
    // First find the booking so we know its current status
    // ───────────────────────────────────────────────────────────────────────

    const existingBooking = await Booking.findById(id);

    if (!existingBooking) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking not found",
        },
        { status: 404 }
      );
    }

    const previousStatus = existingBooking.status;

    // ───────────────────────────────────────────────────────────────────────
    // Prevent invalid status transitions
    // ───────────────────────────────────────────────────────────────────────

    if (
      previousStatus === "cancelled" &&
      status !== "cancelled"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A cancelled booking cannot be changed to another status.",
        },
        { status: 400 }
      );
    }

    if (
      previousStatus === "completed" &&
      status !== "completed"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A completed booking cannot be changed to another status.",
        },
        { status: 400 }
      );
    }

    // A booking must be confirmed before it can be completed.
    if (
      status === "completed" &&
      previousStatus !== "confirmed"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only a confirmed booking can be marked as completed.",
        },
        { status: 400 }
      );
    }

    // ───────────────────────────────────────────────────────────────────────
    // Update booking and populate related documents
    // ───────────────────────────────────────────────────────────────────────

    const updated = await Booking.findByIdAndUpdate(
      id,
      {
        status,
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate<{
        unit: PopulatedUnit | null;
      }>("unit", "title pricePerMonth images rentalType")
      .populate<{
        room: PopulatedRoom | null;
      }>("room", "label pricePerNight images")
      .populate<{
        tenant: PopulatedTenant;
      }>("tenant", "name email phone");

    if (!updated) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking not found",
        },
        { status: 404 }
      );
    }

    // ───────────────────────────────────────────────────────────────────────
    // Update room occupancy
    //
    // confirmed = currently assigned
    // cancelled/completed = no longer assigned
    //
    // IMPORTANT:
    // This does NOT affect the check-in/check-out calculations.
    // Those are based on moveInDate and moveOutDate.
    // ───────────────────────────────────────────────────────────────────────

    if (
      updated.rentalType === "short_term" &&
      updated.room
    ) {
      const Room = (
        await import("@/models/Room")
      ).default;

      if (status === "confirmed") {
        await Room.findByIdAndUpdate(
          updated.room._id,
          {
            currentTenant: updated.tenant._id,
          }
        );
      }

      if (
        status === "cancelled" ||
        status === "completed"
      ) {
        await Room.findByIdAndUpdate(
          updated.room._id,
          {
            currentTenant: null,
          }
        );
      }
    }

    // ───────────────────────────────────────────────────────────────────────
    // Listing information
    // ───────────────────────────────────────────────────────────────────────

    const listingName =
      updated.unit?.title ??
      updated.room?.label ??
      "the listing";

    const guestName =
      updated.tenant?.name ??
      "A guest";

    const moveInFmt = new Date(
      updated.moveInDate
    ).toLocaleDateString("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const moveOutFmt = new Date(
      updated.moveOutDate
    ).toLocaleDateString("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    // ───────────────────────────────────────────────────────────────────────
    // CONFIRMED
    // ───────────────────────────────────────────────────────────────────────

    if (
      status === "confirmed" &&
      previousStatus !== "confirmed"
    ) {
      // Notify the user whose booking was confirmed.
      await createNotification({
        userId: updated.tenant._id,
        type: "booking_confirmed",
        title: "Booking Confirmed ✅",
        message: `Your booking for ${listingName} from ${moveInFmt} to ${moveOutFmt} has been confirmed. We look forward to hosting you!`,
        link: "/trips",
        refId: updated._id,
        refModel: "Booking",
      });

      // Notify admins and staff.
      const staffPayload = {
        type: "booking_confirmed" as const,
        title: "Booking Confirmed ✅",
        message: `${guestName}'s booking for ${listingName} from ${moveInFmt} to ${moveOutFmt} has been confirmed.`,
        refId: updated._id,
      };

      await notifyAdmins({
        ...staffPayload,
        link: "/admin/bookings",
      });

      await notifyStaff({
        ...staffPayload,
        link: "/staff/bookings",
      });
    }

    // ───────────────────────────────────────────────────────────────────────
    // CANCELLED
    // ───────────────────────────────────────────────────────────────────────

    else if (
      status === "cancelled" &&
      previousStatus !== "cancelled"
    ) {
      await createNotification({
        userId: updated.tenant._id,
        type: "booking_cancelled",
        title: "Booking Cancelled ❌",
        message: `Your booking for ${listingName} from ${moveInFmt} to ${moveOutFmt} has been cancelled. Contact us if you have any questions.`,
        link: "/trips",
        refId: updated._id,
        refModel: "Booking",
      });

      const staffPayload = {
        type: "booking_cancelled" as const,
        title: "Booking Cancelled ❌",
        message: `${guestName}'s booking for ${listingName} from ${moveInFmt} to ${moveOutFmt} has been cancelled.`,
        refId: updated._id,
      };

      await notifyAdmins({
        ...staffPayload,
        link: "/admin/bookings",
      });

      await notifyStaff({
        ...staffPayload,
        link: "/staff/bookings",
      });
    }

    // ───────────────────────────────────────────────────────────────────────
    // COMPLETED
    //
    // This is what your Check-out button should eventually call.
    // ───────────────────────────────────────────────────────────────────────

    else if (
      status === "completed" &&
      previousStatus === "confirmed"
    ) {
      // Notify the guest that the stay has been completed.
      await createNotification({
        userId: updated.tenant._id,
        type: "general",
        title: "Stay Completed ✅",
        message: `Your stay at ${listingName} from ${moveInFmt} to ${moveOutFmt} has been completed. Thank you for staying with us!`,
        link: "/trips",
        refId: updated._id,
        refModel: "Booking",
      });

      // Notify admins.
      await notifyAdmins({
        type: "general",
        title: "Guest Checked Out ✅",
        message: `${guestName} has checked out from ${listingName}. Stay: ${moveInFmt} to ${moveOutFmt}.`,
        link: "/admin/bookings",
        refId: updated._id,
      });

      // Notify relevant staff.
      await notifyStaff({
        type: "general",
        title: "Guest Checked Out ✅",
        message: `${guestName} has checked out from ${listingName}. Stay: ${moveInFmt} to ${moveOutFmt}.`,
        link: "/staff/bookings",
        refId: updated._id,
      });
    }

    // ───────────────────────────────────────────────────────────────────────
    // Return updated booking
    // ───────────────────────────────────────────────────────────────────────

    return NextResponse.json({
      success: true,
      message: `Booking ${status} successfully`,
      data: updated,
    });
  } catch (error) {
    console.error(
      "PATCH /api/bookings/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update booking",
      },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/bookings/[id]
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  {
    params,
  }: {
    params: { id: string } | Promise<{ id: string }>;
  }
) {
  try {
    await connectDB();

    const { id } = await params;

    // ───────────────────────────────────────────────────────────────────────
    // Validate booking ID
    // ───────────────────────────────────────────────────────────────────────

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid booking ID",
        },
        { status: 400 }
      );
    }

    // ───────────────────────────────────────────────────────────────────────
    // Fetch booking
    // ───────────────────────────────────────────────────────────────────────

    const booking = await Booking.findById(id)
      .populate<{
        unit: PopulatedUnit | null;
      }>("unit", "title pricePerMonth images rentalType")
      .populate<{
        room: PopulatedRoom | null;
      }>("room", "label pricePerNight images")
      .populate<{
        tenant: PopulatedTenant;
      }>("tenant", "name email phone");

    if (!booking) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error(
      "GET /api/bookings/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch booking",
      },
      { status: 500 }
    );
  }
}