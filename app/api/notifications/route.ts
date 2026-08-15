// app/api/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";

// ─── GET /api/notifications ───────────────────────────────────────────────────
// Query params: userId (required), unreadOnly (optional)
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const userId    = searchParams.get("userId");
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "userId is required" },
        { status: 400 }
      );
    }

    const filter: Record<string, unknown> = { user: userId };
    if (unreadOnly) filter.isRead = false;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(50); // cap at 50 for performance

    const unreadCount = await Notification.countDocuments({
      user: userId,
      isRead: false,
    });

    return NextResponse.json({
      success: true,
      count: notifications.length,
      unreadCount,
      data: notifications,
    });
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// ─── POST /api/notifications ──────────────────────────────────────────────────
// Manually create a notification (used by admin/staff or internal calls)
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { userId, type, title, message, link, refId, refModel } = body;

    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { success: false, message: "userId, type, title and message are required" },
        { status: 400 }
      );
    }

    const notification = await Notification.create({
      user:     userId,
      type,
      title,
      message,
      link:     link     ?? "",
      refId:    refId    ?? null,
      refModel: refModel ?? null,
    });

    return NextResponse.json(
      { success: true, data: notification },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/notifications error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create notification" },
      { status: 500 }
    );
  }
}