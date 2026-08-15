// room-booking/app/api/users/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "../../../models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import crypto from "crypto";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const STAFF_ROLES = [
  "admin",
  "property_manager",
  "receptionist",
  "caretaker",
  "accountant",
  "security",
  "maintenance",
];

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(req.url);

    const role       = searchParams.get("role");       // single role, e.g. ?role=admin
    const staffOnly  = searchParams.get("staff");      // ?staff=true  → all staff roles
    const search     = searchParams.get("search");     // ?search=jane → name/email match
    const page       = Number(searchParams.get("page"))  || 1;
    const limit      = Number(searchParams.get("limit")) || 20;
    const skip       = (page - 1) * limit;

    // Build filter
    const filter: Record<string, unknown> = {};

    if (staffOnly === "true") {
      // Return all staff roles in one query
      filter.role = { $in: STAFF_ROLES };
    } else if (role) {
      filter.role = role;
    }

    if (search) {
      filter.$or = [
        { name:  { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      count: users.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: users,
    });
  } catch (error) {
    console.error("GET /api/users error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await req.json();
    const { name, email, phone, role, status, photo } = body;

    if (!name || !email) {
      return NextResponse.json(
        { success: false, message: "Name and email are required" },
        { status: 400 }
      );
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "User already exists" },
        { status: 409 }
      );
    }

    const rawToken    = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const tokenExpiry = new Date(Date.now() + 1000 * 60 * 60);

    const user = await User.create({
      name,
      email,
      phone,
      role:    role   || "guest",
      status:  status || "active",
      photo,
      password:             null,
      resetPasswordToken:   hashedToken,
      resetPasswordExpires: tokenExpiry,
    });

    const setupLink = `${process.env.NEXTAUTH_URL}/reset-password?token=${rawToken}&email=${email}`;

    await resend.emails.send({
      from:    "onboarding@resend.dev",
      to:      email,
      subject: "Set Your Password",
      html: `
        <h2>Hello ${name},</h2>
        <p>Your account has been created by an admin.</p>
        <p>Click the button below to set your password:</p>
        <a href="${setupLink}"
           style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:5px;">
           Set Password
        </a>
        <p>This link expires in 1 hour.</p>
      `,
    });

    const created = await User.findById(user._id).select("-password");

    return NextResponse.json(
      { success: true, user: created },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/users error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create user" },
      { status: 500 }
    );
  }
}