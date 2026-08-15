import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { connectDB } from "@/lib/db";
import ContactMessage from "@/models/ContactMessage";
import User from "@/models/User";
import { createNotification } from "@/lib/createNotification";

const resend = new Resend(process.env.RESEND_API_KEY);

const CONTACT_STAFF_POSITIONS = ["property_manager", "receptionist"];

interface ContactFormBody {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}

// ─── Helper: notify all admins in-app ────────────────────────────────────────
async function notifyAdmins(payload: {
  title: string;
  message: string;
  link: string;
  refId?: unknown;
}) {
  try {
    const admins = await User.find({ role: "admin" }).select("_id");
    await Promise.all(
      admins.map(admin =>
        createNotification({
          userId:  admin._id,
          type:    "general",
          title:   payload.title,
          message: payload.message,
          link:    payload.link,
          refId:   payload.refId as string | undefined,
        })
      )
    );
  } catch (err) {
    console.error("notifyAdmins error:", err);
  }
}

// ─── Helper: notify relevant staff in-app ────────────────────────────────────
async function notifyStaff(payload: {
  title: string;
  message: string;
  link: string;
  refId?: unknown;
}) {
  try {
    const staff = await User.find({
      role: { $in: CONTACT_STAFF_POSITIONS },
    }).select("_id");
    await Promise.all(
      staff.map(s =>
        createNotification({
          userId:  s._id,
          type:    "general",
          title:   payload.title,
          message: payload.message,
          link:    payload.link,
          refId:   payload.refId as string | undefined,
        })
      )
    );
  } catch (err) {
    console.error("notifyStaff error:", err);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { name, email, phone, subject, message }: ContactFormBody = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, error: "Name, email, and message are required." },
        { status: 400 }
      );
    }

    await connectDB();

    // 1. Save to MongoDB
    const saved = await ContactMessage.create({ name, email, phone, subject, message });

    // 2. Send email to admin inbox
    // NOTE: Until a custom domain is verified in Resend, you MUST send "from"
    // onboarding@resend.dev — any other domain will be silently rejected.
    const adminEmail = process.env.ADMIN_EMAIL;

    if (!adminEmail) {
      console.error("⚠️ ADMIN_EMAIL is not set in .env.local — skipping admin email.");
    } else {
      try {
        const emailResult = await resend.emails.send({
          from: "JluvStays <onboarding@resend.dev>",
          to: [adminEmail],
          subject: `New Contact: ${subject || "No Subject"} — from ${name}`,
          html: `
            <h2>New Contact Form Submission</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ""}
            <p><strong>Subject:</strong> ${subject ?? "N/A"}</p>
            <p><strong>Message:</strong><br/>${message}</p>
            <hr/>
            <small>Submitted at ${new Date().toISOString()}</small>
          `,
        });

        if (emailResult.error) {
          console.error("❌ Resend email error:", emailResult.error);
        } else {
          console.log("✅ Admin email sent:", emailResult.data?.id);
        }
      } catch (emailErr) {
        // Never fail the whole request just because email failed
        console.error("❌ Failed to send admin email:", emailErr);
      }
    }

    // 3. Notify admins + relevant staff in-app (dashboard bell)
    const notifPayload = {
      title:   "New Contact Message 💬",
      message: `${name} sent a message: "${message.slice(0, 80)}${message.length > 80 ? "…" : ""}"`,
      refId:   saved._id,
    };

    await Promise.all([
      notifyAdmins({ ...notifPayload, link: "/admin/contacts" }),
      notifyStaff({ ...notifPayload, link: "/staff/contacts" }),
    ]);

    return NextResponse.json({ success: true, id: saved._id }, { status: 201 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("Contact form error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── GET /api/contact — fetch messages (admin/staff dashboard) ──────────────
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const filter: Record<string, unknown> = {};
    if (status && status !== "all") filter.status = status;

    const messages = await ContactMessage.find(filter).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, messages });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("GET /api/contact error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}