import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ContactMessage from "@/models/ContactMessage";
import mongoose from "mongoose";

// ─── PATCH /api/contact/[id] — update message status ─────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid message ID" },
        { status: 400 }
      );
    }

    const { status } = await req.json();

    if (!["unread", "read", "resolved"].includes(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid status" },
        { status: 400 }
      );
    }

    const updated = await ContactMessage.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Message not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("PATCH /api/contact/[id] error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── DELETE /api/contact/[id] ─────────────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid message ID" },
        { status: 400 }
      );
    }

    await ContactMessage.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "Message deleted" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("DELETE /api/contact/[id] error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}