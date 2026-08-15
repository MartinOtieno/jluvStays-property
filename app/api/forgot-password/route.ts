// app/api/auth/forgot-password/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import crypto from "crypto";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required" },
        { status: 400 }
      );
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    // Always return success — don't reveal whether the email exists
    if (!user) {
      return NextResponse.json({ success: true });
    }

    // 🔐 Generate raw token
    const rawToken = crypto.randomBytes(32).toString("hex");

    // 🔐 Hash token before saving (BEST PRACTICE)
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    // ⏱ Expiry (1 hour)
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    // 💾 Save hashed token
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = expires;
    await user.save();

    // 🔗 Send RAW token in URL
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${encodeURIComponent(rawToken)}`;

    // 📧 Send email via Resend
    await resend.emails.send({
      from: "JluvStays <onboarding@resend.dev>", // update to verified domain
      to: user.email,
      subject: "Reset your password",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
          <h2 style="color:#1e293b;margin-bottom:8px;">Reset your password</h2>
          <p style="color:#64748b;margin-bottom:24px;">
            Hi ${user.name},<br/>
            We received a request to reset your password. Click the button below.
            This link expires in <strong>1 hour</strong>.
          </p>
          <a href="${resetUrl}"
            style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">
            Reset Password
          </a>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px;">
            If you didn't request this, you can safely ignore this email.<br/>
            Or copy this link: ${resetUrl}
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/auth/forgot-password error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to send reset email" },
      { status: 500 }
    );
  }
}