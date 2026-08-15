// room-booking/app/api/staff/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import StaffProfile from "../../../../models/StaffProfile";
import User from "../../../../models/User";
import mongoose from "mongoose";

// PUT /api/staff/[id] — Update staff profile
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid ID",
        },
        { status: 400 }
      );
    }

    const body = await req.json();

    // Prevent changing protected fields
    delete body._id;
    delete body.user;

    const updated = await StaffProfile.findByIdAndUpdate(
      id,
      { $set: body },
      {
        new: true,
        runValidators: true,
      }
    ).populate({
      path: "user",
      select: "name email phone photo gender role",
    });

    if (!updated) {
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
        message: "Staff profile updated",
        data: updated,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("PUT /api/staff/[id] error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update staff profile",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/staff/[id]
// Remove staff profile and convert the user to a guest
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    // Validate staff profile ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid ID",
        },
        { status: 400 }
      );
    }

    // Find the staff profile first
    const profile = await StaffProfile.findById(id);

    if (!profile) {
      return NextResponse.json(
        {
          success: false,
          message: "Staff profile not found",
        },
        { status: 404 }
      );
    }

    // Make sure the staff profile is linked to a user
    if (!profile.user) {
      return NextResponse.json(
        {
          success: false,
          message: "Staff profile has no linked user",
        },
        { status: 400 }
      );
    }

    // Check that the linked user exists
    const user = await User.findById(profile.user);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Linked user account not found",
        },
        { status: 404 }
      );
    }

    /*
     * IMPORTANT:
     * We do NOT delete the User account.
     *
     * We only change their role from "staff"
     * back to "guest".
     *
     * This means:
     *
     * Staff
     *   ↓ Remove staff
     * Guest
     *
     * Their account, email, password, profile,
     * bookings, etc. remain intact.
     */
    user.role = "guest";
    await user.save();

    // Now remove the staff profile
    await StaffProfile.findByIdAndDelete(id);

    return NextResponse.json(
      {
        success: true,
        message:
          "Staff profile deleted and user converted to guest",
        data: {
          userId: user._id,
          role: user.role,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE /api/staff/[id] error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to remove staff profile",
      },
      { status: 500 }
    );
  }
}