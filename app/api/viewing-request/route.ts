// app/api/viewing-request/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ViewingRequest from "@/models/ViewingRequest";
import Unit from "@/models/Unit";
import User from "@/models/User";
import { createNotification } from "@/lib/createNotification";

const VIEWING_STAFF_POSITIONS = ["property_manager", "receptionist"];

// mode is never accepted from the client — it's fully determined by the
// unit's rentalType, so there's no way to submit a mismatched pair.
const MODE_BY_RENTAL_TYPE: Record<"long_term" | "mid_term", "in_person" | "virtual"> = {
  long_term: "in_person",
  mid_term: "virtual",
};

const MODE_LABEL: Record<"in_person" | "virtual", string> = {
  in_person: "in-person",
  virtual: "virtual",
};

// ─── Helper: notify all admins ────────────────────────────────────────────────
async function notifyAdmins(payload: {
  type: "viewing_pending" | "viewing_approved" | "viewing_rejected" | "general";
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
  type: "viewing_pending" | "viewing_approved" | "viewing_rejected" | "general";
  title: string;
  message: string;
  link: string;
  refId?: unknown;
  refModel?: "Booking" | "ViewingRequest" | null;
}) {
  try {
    const staff = await User.find({
      role: { $in: VIEWING_STAFF_POSITIONS },
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

// -----------------------------------------------
// POST /api/viewing-request — Submit a viewing request
// Only long_term (in-person) and mid_term (virtual) units support this —
// short_term is rejected outright, since those tenants book a Room
// directly instead.
// -----------------------------------------------
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { userId, unitId, preferredDate, message } = body;

    if (!userId || !unitId || !preferredDate) {
      return NextResponse.json(
        { success: false, message: "userId, unitId and preferredDate are required" },
        { status: 400 }
      );
    }

    const preferred = new Date(preferredDate);
    if (preferred < new Date()) {
      return NextResponse.json(
        { success: false, message: "Preferred date cannot be in the past" },
        { status: 400 }
      );
    }

    const unit = await Unit.findById(unitId);
    if (!unit) {
      return NextResponse.json(
        { success: false, message: "Unit not found" },
        { status: 404 }
      );
    }

    if (unit.rentalType !== "long_term" && unit.rentalType !== "mid_term") {
      return NextResponse.json(
        {
          success: false,
          message: "Viewing requests aren't available for short_term units — book a room directly instead.",
        },
        { status: 400 }
      );
    }

    const mode = MODE_BY_RENTAL_TYPE[unit.rentalType];

    const existingRequest = await ViewingRequest.findOne({
      user:   userId,
      unit:   unitId,
      status: "pending",
    });

    if (existingRequest) {
      return NextResponse.json(
        { success: false, message: "You already have a pending viewing request for this unit" },
        { status: 409 }
      );
    }

    const viewingRequest = await ViewingRequest.create({
      user:          userId,
      unit:          unitId,
      rentalType:    unit.rentalType,
      mode,
      preferredDate: preferred,
      message:       message || "",
      status:        "pending",
    });

    const populated = await viewingRequest.populate([
      { path: "unit", select: "title" },
      { path: "user", select: "name email phone" },
    ]);

    const preferredFmt = preferred.toLocaleDateString("en-US", {
      weekday: "long", day: "numeric", month: "short", year: "numeric",
    });
    const guestName = populated.user?.name ?? "A guest";
    const modeLabel = MODE_LABEL[mode as "in_person" | "virtual"];

    // 🔔 Notify the guest
    await createNotification({
      userId,
      type:     "viewing_pending",
      title:    "Viewing Request Submitted 📅",
      message:  `Your ${modeLabel} viewing request for ${unit.title} on ${preferredFmt} has been submitted and is awaiting review. We'll notify you once it's confirmed.`,
      link:     "/viewing-requests",
      refId:    viewingRequest._id,
      refModel: "ViewingRequest",
    });

    const staffNotifPayload = {
      type:     "viewing_pending" as const,
      title:    "New Viewing Request 👁️",
      message:  `${guestName} has requested a ${modeLabel} viewing of ${unit.title} on ${preferredFmt}. Review and approve or decline.`,
      refId:    viewingRequest._id,
      refModel: "ViewingRequest" as const,
    };

    // 🔔 Notify admins
    await notifyAdmins({ ...staffNotifPayload, link: "/admin/viewing-requests" });

    // 🔔 Notify relevant staff
    await notifyStaff({ ...staffNotifPayload, link: "/staff/viewings" });

    return NextResponse.json(
      {
        success: true,
        message: "Viewing request submitted successfully",
        data:    populated,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/viewing-request error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to submit viewing request" },
      { status: 500 }
    );
  }
}

// -----------------------------------------------
// GET /api/viewing-request — Fetch viewing requests
// -----------------------------------------------
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const unitId = searchParams.get("unitId");
    const status = searchParams.get("status");

    const filter: Record<string, unknown> = {};
    if (userId) filter.user = userId;
    if (unitId) filter.unit = unitId;
    if (status) filter.status = status;

    const requests = await ViewingRequest.find(filter)
      .populate({ path: "unit", select: "title images" })
      .populate({ path: "user", select: "name email phone" })
      .sort({ createdAt: -1 });

    return NextResponse.json(
      { success: true, count: requests.length, data: requests },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/viewing-request error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch viewing requests" },
      { status: 500 }
    );
  }
}