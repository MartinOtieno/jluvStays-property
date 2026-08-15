import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const token = new URL(req.url).searchParams.get("token");

    if (!token) {
      return NextResponse.json({ success: false, message: "Token is required" }, { status: 400 });
    }

    const user = await User.findOne({
      resetPasswordToken:   token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: "Token is invalid or has expired" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("GET /api/auth/reset-password/verify error:", error);
    return NextResponse.json({ success: false, message: "Verification failed" }, { status: 500 });
  }
}