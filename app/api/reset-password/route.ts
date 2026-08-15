import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// 🔐 Password strength check
const isStrongPassword = (password: string) => {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  );
};

// ─────────────────────────────────────────────
// GET → Verify token
// ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const tokenParam = new URL(req.url).searchParams.get("token");

    if (!tokenParam) {
      return NextResponse.json(
        { success: false, message: "Token is required" },
        { status: 400 }
      );
    }

    // Decode + hash
    const decodedToken = decodeURIComponent(tokenParam);

    const hashedToken = crypto
      .createHash("sha256")
      .update(decodedToken)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Token is invalid or has expired",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Token is valid",
    });
  } catch (error) {
    console.error("GET /api/reset-password error:", error);
    return NextResponse.json(
      { success: false, message: "Verification failed" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────
// POST → Reset password
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Token and password are required",
        },
        { status: 400 }
      );
    }

    // 🔐 Validate password strength
    if (!isStrongPassword(password)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Password must be at least 8 characters and include uppercase, lowercase, and a number",
        },
        { status: 400 }
      );
    }

    // Decode + hash token
    const decodedToken = decodeURIComponent(token);

    const hashedToken = crypto
      .createHash("sha256")
      .update(decodedToken)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    }).select("+password");

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Reset link has expired or is invalid",
        },
        { status: 400 }
      );
    }

    // ❌ Prevent using same password again
    if (user.password) {
      const isSame = await bcrypt.compare(password, user.password);
      if (isSame) {
        return NextResponse.json(
          {
            success: false,
            message: "New password must be different from old password",
          },
          { status: 400 }
        );
      }
    }

    // ✅ Hash and save new password
    const hashedPassword = await bcrypt.hash(password, 12);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    return NextResponse.json({
      success: true,
      message: "Password set successfully. You can now log in.",
    });
  } catch (error) {
    console.error("POST /api/reset-password error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to reset password" },
      { status: 500 }
    );
  }
}