import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { createNotification } from "@/lib/createNotification";

// 🔐 Strong password check
const isStrongPassword = (password: string) => {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(password)
  );
};

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const {
      name,
      email,
      password,
      phone,
      photo,
      gender,
    } = body;

    // ✅ Required fields validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: "Name, email and password are required" },
        { status: 400 }
      );
    }

    // 🔐 Password strength validation
    if (!isStrongPassword(password)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Password must be 8+ chars, include uppercase, lowercase, number & special character",
        },
        { status: 400 }
      );
    }

    // 📧 Check duplicate email
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Email already exists" },
        { status: 409 }
      );
    }

    // 🔒 Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // 👤 Create user with ALL fields
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone:    phone  || "",
      photo:    photo  || "",
      gender:   gender || "prefer_not_to_say",
      role:     "guest", // always default for registration
    });

    // 🔔 Welcome notification
    await createNotification({
      userId:  user._id,
      type:    "welcome",
      title:   `Welcome to JluvStays, ${name.split(" ")[0]}! 🎉`,
      message: "Your account has been created successfully. Browse our rooms and book your perfect stay today.",
      link:    "/rooms",
    });

    // 🚫 Never return password
    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully",
        data: {
          id:        user._id,
          name:      user.name,
          email:     user.email,
          phone:     user.phone,
          photo:     user.photo,
          gender:    user.gender,
          role:      user.role,
          createdAt: user.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}