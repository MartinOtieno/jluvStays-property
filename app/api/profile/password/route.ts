import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import bcrypt from "bcryptjs";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

async function handlePasswordChange(req: NextRequest) {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);
    const userId  = (session?.user as { id?: string })?.id;

    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: "currentPassword and newPassword are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, message: "New password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const strongEnough =
      /[A-Z]/.test(newPassword) &&
      /[a-z]/.test(newPassword) &&
      /[0-9]/.test(newPassword) &&
      /[^A-Za-z0-9]/.test(newPassword);

    if (!strongEnough) {
      return NextResponse.json(
        {
          success: false,
          message: "Password must include uppercase, lowercase, a number, and a special character",
        },
        { status: 400 }
      );
    }

    const user = await User.findById(userId).select("+password");
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return NextResponse.json({ success: false, message: "Current password is incorrect" }, { status: 401 });
    }

    const isSame = await bcrypt.compare(newPassword, user.password);
    if (isSame) {
      return NextResponse.json(
        { success: false, message: "New password must be different from your current password" },
        { status: 400 }
      );
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await User.findByIdAndUpdate(userId, { password: hashed });

    // ── Send confirmation email via Resend ────────────────────────────────────
    const changedAt = new Date().toLocaleString("en-KE", {
      dateStyle: "full",
      timeStyle: "short",
    });

    try {
      await resend.emails.send({
        from:    "JluvStays <onboarding@resend.dev>",
        to:      user.email,
        subject: "Your password was changed",
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1e293b">
            <h2 style="font-size:20px;font-weight:700;margin-bottom:8px">Password changed</h2>
            <p style="color:#64748b;font-size:14px;margin-bottom:24px">
              Hi ${user.name}, your JluvStays account password was changed on <strong>${changedAt}</strong>.
            </p>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin-bottom:24px">
              <p style="margin:0;font-size:14px;color:#475569">
                If you made this change, no further action is needed.
              </p>
            </div>
            <p style="font-size:14px;color:#64748b;margin-bottom:4px">
              If you did <strong>not</strong> make this change, please contact your administrator immediately or reset your password.
            </p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
            <p style="font-size:12px;color:#94a3b8">
              This is an automated message from JluvStays. Please do not reply to this email.
            </p>
          </div>
        `,
      });
    } catch (emailErr) {
      // Don't fail the request if email fails — password is already changed
      console.error("Failed to send password change email:", emailErr);
    }

    return NextResponse.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error("Password change error:", error);
    return NextResponse.json({ success: false, message: "Failed to change password" }, { status: 500 });
  }
}

// Support both POST and PUT from frontend
export const POST = handlePasswordChange;
export const PUT  = handlePasswordChange;