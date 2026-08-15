// lib/createNotification.ts
// ─── Helper used by all API routes to push notifications + send emails ────────

import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import mongoose from "mongoose";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface NotificationPayload {
  userId: string | mongoose.Types.ObjectId;
  type:
    | "booking_confirmed"
    | "booking_cancelled"
    | "booking_pending"
    | "checkin_reminder"
    | "checkout_reminder"
    | "viewing_approved"
    | "viewing_rejected"
    | "viewing_pending"
    | "welcome"
    | "general";
  title: string;
  message: string;
  link?: string;
  refId?: string | mongoose.Types.ObjectId;
  refModel?: "Booking" | "ViewingRequest" | null;
}

// ─── Emoji icon per notification type ────────────────────────────────────────
function typeIcon(type: string): string {
  const map: Record<string, string> = {
    booking_confirmed:  "✅",
    booking_cancelled:  "❌",
    booking_pending:    "⏳",
    checkin_reminder:   "🏠",
    checkout_reminder:  "🧳",
    viewing_approved:   "👁️",
    viewing_rejected:   "🚫",
    viewing_pending:    "📅",
    welcome:            "🎉",
    general:            "🔔",
  };
  return map[type] ?? "🔔";
}

// ─── Send email for a notification ───────────────────────────────────────────
async function sendNotificationEmail({
  toEmail,
  toName,
  title,
  message,
  link,
  type,
}: {
  toEmail: string;
  toName:  string;
  title:   string;
  message: string;
  link?:   string;
  type:    string;
}) {
  try {
    const icon      = typeIcon(type);
    const actionUrl = link ? `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}${link}` : null;

    const result = await resend.emails.send({
      from:    "JluvStays <onboarding@resend.dev>",
      to:      [toEmail],
      subject: `${icon} ${title} — JluvStays`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"/></head>
        <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

            <!-- Header -->
            <div style="background:#1e3a5f;padding:32px 32px 24px;">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                <span style="font-size:24px;">${icon}</span>
                <span style="color:#ffffff;font-size:20px;font-weight:700;">JluvStays</span>
              </div>
              <p style="color:#93c5fd;margin:0;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;">Notification</p>
            </div>

            <!-- Body -->
            <div style="padding:32px;">
              <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0f172a;">${title}</h1>
              <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">Hi ${toName},</p>
              <div style="background:#f1f5f9;border-radius:12px;padding:20px;margin-bottom:28px;">
                <p style="margin:0;font-size:15px;color:#334155;line-height:1.7;">${message}</p>
              </div>

              ${actionUrl ? `
              <a href="${actionUrl}"
                 style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 28px;border-radius:10px;">
                View Details →
              </a>
              ` : ""}
            </div>

            <!-- Footer -->
            <div style="padding:20px 32px;border-top:1px solid #e2e8f0;background:#f8fafc;">
              <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
                This is an automated notification from JluvStays. Please do not reply to this email.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (result.error) {
      console.error("Email send error:", result.error);
    }
  } catch (err) {
    // Never let email failure break anything
    console.error("sendNotificationEmail error:", err);
  }
}

// ─── Create a single notification + send email ────────────────────────────────
export async function createNotification(payload: NotificationPayload) {
  try {
    await connectDB();

    // 1. Save to DB
    await Notification.create({
      user:     payload.userId,
      type:     payload.type,
      title:    payload.title,
      message:  payload.message,
      link:     payload.link     ?? "",
      refId:    payload.refId    ?? null,
      refModel: payload.refModel ?? null,
      isRead:   false,
    });

    // 2. Look up the user's email and name to send the email
    try {
      const User = (await import("@/models/User")).default;
      const user = await User.findById(payload.userId).select("email name");
      if (user?.email) {
        await sendNotificationEmail({
          toEmail: user.email,
          toName:  user.name ?? "there",
          title:   payload.title,
          message: payload.message,
          link:    payload.link,
          type:    payload.type,
        });
      }
    } catch (emailErr) {
      console.error("createNotification email lookup error:", emailErr);
    }

  } catch (err) {
    console.error("createNotification error:", err);
  }
}

// ─── Notify all admins ────────────────────────────────────────────────────────
export async function notifyAdmins(payload: Omit<NotificationPayload, "userId">) {
  try {
    await connectDB();
    const User = (await import("@/models/User")).default;
    const admins = await User.find({ role: "admin" }).select("_id");
    await Promise.all(
      admins.map((admin: { _id: mongoose.Types.ObjectId }) =>
        createNotification({ ...payload, userId: admin._id })
      )
    );
  } catch (err) {
    console.error("notifyAdmins error:", err);
  }
}

// ─── Notify all staff of specific positions ───────────────────────────────────
export async function notifyStaff(
  positions: string[],
  payload: Omit<NotificationPayload, "userId">
) {
  try {
    await connectDB();
    const User = (await import("@/models/User")).default;

    const STAFF_POSITIONS = [
      "property_manager",
      "receptionist",
      "caretaker",
      "accountant",
      "security",
      "maintenance",
    ];

    const targetPositions = positions.length > 0 ? positions : STAFF_POSITIONS;

    const staffUsers = await User.find({
      role: { $in: targetPositions },
    }).select("_id");

    await Promise.all(
      staffUsers.map((staff: { _id: mongoose.Types.ObjectId }) =>
        createNotification({ ...payload, userId: staff._id })
      )
    );
  } catch (err) {
    console.error("notifyStaff error:", err);
  }
}

// ─── Notify both admins and relevant staff ────────────────────────────────────
export async function notifyAdminsAndStaff(
  staffPositions: string[],
  payload: Omit<NotificationPayload, "userId">
) {
  await Promise.all([
    notifyAdmins(payload),
    notifyStaff(staffPositions, payload),
  ]);
}