import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Booking from "@/models/Booking";
import User from "@/models/User";
import { createNotification } from "@/lib/createNotification";

const BOOKING_STAFF_POSITIONS = [
  "property_manager",
  "receptionist",
  "accountant",
];

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
};

// ─── Helper: notify all admins ────────────────────────────────────────────────

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

// ─── Helper: notify relevant staff positions ─────────────────────────────────

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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid booking ID",
        },
        { status: 400 }
      );
    }

    const { status } = await req.json();

    if (
      !["pending", "confirmed", "cancelled"].includes(status)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid status",
        },
        { status: 400 }
      );
    }

    // ─── Update booking and populate related documents ───────────────────────

    const updated = await Booking.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    )
      .populate<{
        unit: PopulatedUnit | null;
      }>("unit", "title pricePerMonth images rentalType")
      .populate<{
        room: PopulatedRoom | null;
      }>("room", "label pricePerNight images")
      .populate<{
        tenant: PopulatedTenant;
      }>("tenant", "name email");

    if (!updated) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking not found",
        },
        { status: 404 }
      );
    }

    // ─── Update room occupancy pointer ──────────────────────────────────────

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
      } else if (status === "cancelled") {
        await Room.findByIdAndUpdate(
          updated.room._id,
          {
            currentTenant: null,
          }
        );
      }
    }

    // ─── Listing and guest information ──────────────────────────────────────

    const listingName =
      updated.unit?.title ??
      updated.room?.label ??
      "the listing";

    const guestName =
      updated.tenant?.name ??
      "A guest";

    const moveInFmt = new Date(
      updated.moveInDate
    ).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const moveOutFmt = new Date(
      updated.moveOutDate
    ).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    // ─── Confirmed ───────────────────────────────────────────────────────────

    if (status === "confirmed") {
      await createNotification({
        userId: updated.tenant._id,
        type: "booking_confirmed",
        title: "Booking Confirmed ✅",
        message: `Your booking for ${listingName} from ${moveInFmt} to ${moveOutFmt} has been confirmed. We look forward to hosting you!`,
        link: "/trips",
        refId: updated._id,
        refModel: "Booking",
      });

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

    // ─── Cancelled ──────────────────────────────────────────────────────────

    else if (status === "cancelled") {
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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid booking ID",
        },
        { status: 400 }
      );
    }

    const booking = await Booking.findById(id)
      .populate<{
        unit: PopulatedUnit | null;
      }>("unit", "title pricePerMonth images rentalType")
      .populate<{
        room: PopulatedRoom | null;
      }>("room", "label pricePerNight images")
      .populate<{
        tenant: PopulatedTenant;
      }>("tenant", "name email");

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