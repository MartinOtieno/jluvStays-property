// app/api/notifications/mark-all-read/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";

// ─── PATCH /api/notifications/mark-all-read ───────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    await connectDB();

    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "userId is required" },
        { status: 400 }
      );
    }

    await Notification.updateMany(
      { user: userId, isRead: false },
      { isRead: true }
    );

    return NextResponse.json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("PATCH /api/notifications/mark-all-read error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to mark notifications as read" },
      { status: 500 }
    );
  }
}