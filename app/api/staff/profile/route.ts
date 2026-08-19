import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { connectDB } from "@/lib/db";
import StaffProfile from "@/models/StaffProfile";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const user = session.user as {
      id?: string;
      role?: string;
    };

    if (!user.id) {
      return NextResponse.json(
        {
          success: false,
          message: "User ID not found in session",
        },
        { status: 401 }
      );
    }

    if (user.role !== "staff") {
      return NextResponse.json(
        {
          success: false,
          message: "Access denied",
        },
        { status: 403 }
      );
    }

    const staffProfile = await StaffProfile.findOne({
      user: user.id,
    })
      .populate({
        path: "user",
        select: "name email phone photo gender role",
      })
      .lean();

    if (!staffProfile) {
      return NextResponse.json(
        {
          success: false,
          message: "Staff profile not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: staffProfile,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/staff/profile error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load staff profile",
      },
      { status: 500 }
    );
  }
}