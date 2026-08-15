import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

async function getSessionUserId() {
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string })?.id ?? null;
}

export async function GET() {
  try {
    await connectDB();
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("GET /api/profile error:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch profile" }, { status: 500 });
  }
}

async function handleUpdate(req: NextRequest) {
  try {
    await connectDB();
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone, photo, gender } = body;

    if (photo && photo.startsWith("data:")) {
      return NextResponse.json(
        { success: false, message: "Photo must be a URL. Upload to Cloudinary first." },
        { status: 400 }
      );
    }

    const updateData: Record<string, string> = {};
    if (name   !== undefined) updateData.name   = String(name).trim();
    if (phone  !== undefined) updateData.phone  = String(phone).trim();
    if (photo  !== undefined) updateData.photo  = photo;
    if (gender !== undefined) updateData.gender = gender;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, message: "No fields provided to update" }, { status: 400 });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Profile updated successfully", data: updatedUser });
  } catch (error: any) {
    console.error("UPDATE /api/profile error:", error);
    if (error.code === 11000) {
      return NextResponse.json({ success: false, message: "Email already in use" }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: "Failed to update profile" }, { status: 500 });
  }
}

// Support both PUT and PATCH from frontend
export const PUT   = handleUpdate;
export const PATCH = handleUpdate;